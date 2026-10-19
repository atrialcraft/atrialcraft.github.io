'use client'

import { useState } from 'react'
import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import remarkCodeFilename from 'remark-code-filename'

import { Button } from '@/components/Button'
import {
  checkToken,
  existingFiles,
  loadToken,
  publish,
  repoUrl,
  saveToken,
} from '@/components/studio/github'
import {
  photoVar,
  sectionFor,
  type Draft,
  type PhotoMeta,
} from '@/components/studio/mdx'
import { getPhoto } from '@/components/studio/storage'

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-offset-2 dark:bg-muted'

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'done'; pageUrl: string; commitUrl: string; actionsUrl: string }

/** Mistakes that would break the site build, found before pushing */
async function findBuildErrors(draft: Draft, photos: Array<PhotoMeta>) {
  let known = new Set(photos.map((photo) => photoVar(photo.name)))
  let missing = [
    ...new Set(draft.body.match(/\bphoto\d+[a-zA-Z0-9]*\b/g) ?? []),
  ].filter((name) => !known.has(name))
  if (missing.length) {
    return `В тексте есть ${missing.join(', ')}, но такого фото нет в Верстаке.`
  }
  try {
    await compile(draft.body, {
      remarkPlugins: [remarkGfm, remarkCodeFilename],
    })
  } catch (problem) {
    let message = problem instanceof Error ? problem.message : String(problem)
    let line = (problem as { line?: number }).line
    return `Ошибка в тексте${line ? ` (строка ${line})` : ''}: ${message}`
  }
  return null
}

export function PublishPanel({
  draft,
  photos,
  code,
  problems,
}: {
  draft: Draft
  photos: Array<PhotoMeta>
  code: string
  problems: Array<string>
}) {
  let [token, setToken] = useState(loadToken)
  let [draftToken, setDraftToken] = useState('')
  let [connecting, setConnecting] = useState(false)
  let [status, setStatus] = useState<Status>({ kind: 'idle' })

  let section = sectionFor(draft.type)
  let folder = `src/app/${section}/${draft.slug}`
  let busy = status.kind === 'busy'

  async function connect() {
    let value = draftToken.trim()
    if (!value) return
    setStatus({ kind: 'busy', text: 'Проверяю токен…' })
    try {
      await checkToken(value)
      saveToken(value)
      setToken(value)
      setDraftToken('')
      setConnecting(false)
      setStatus({ kind: 'idle' })
    } catch (error) {
      setStatus({ kind: 'error', text: (error as Error).message })
    }
  }

  function disconnect() {
    if (!window.confirm('Забыть токен в этом браузере?')) return
    saveToken('')
    setToken('')
    setStatus({ kind: 'idle' })
  }

  async function run() {
    setStatus({ kind: 'busy', text: 'Проверяю текст…' })
    let buildError = await findBuildErrors(draft, photos)
    if (buildError) {
      setStatus({ kind: 'error', text: buildError })
      return
    }

    try {
      setStatus({ kind: 'busy', text: 'Смотрю, есть ли уже такая статья…' })
      let existing = await existingFiles(token, folder)
      if (
        existing &&
        !window.confirm(
          `На сайте уже есть запись с адресом /${section}/${draft.slug}. Заменить её этой версией?`,
        )
      ) {
        setStatus({ kind: 'idle' })
        return
      }

      let files = [{ name: 'page.mdx', bytes: new TextEncoder().encode(code) }]
      for (let photo of photos) {
        let blob = await getPhoto(photo.name)
        if (!blob) {
          throw new Error(
            `Фото ${photo.name} не найдено в браузере. Удалите его и добавьте заново.`,
          )
        }
        files.push({
          name: photo.name,
          bytes: new Uint8Array(await blob.arrayBuffer()),
        })
      }
      let names = new Set(files.map((file) => file.name))

      setStatus({ kind: 'busy', text: 'Отправляю на GitHub…' })
      let result = await publish({
        token,
        folder,
        files,
        remove: (existing ?? []).filter((name) => !names.has(name)),
        message: `${existing ? 'Обновление' : 'Новая запись'}: ${draft.title}`,
      })
      setStatus({
        kind: 'done',
        pageUrl: `https://atrial.org/${section}/${draft.slug}`,
        ...result,
      })
    } catch (error) {
      setStatus({ kind: 'error', text: (error as Error).message })
    }
  }

  return (
    <section className="space-y-3 rounded-xl p-4 ring-1 ring-border">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Публикация на сайт
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {token
              ? 'GitHub подключён в этом браузере.'
              : 'Чтобы публиковать прямо отсюда, подключите GitHub токеном — как его создать, написано в инструкции.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {token ? (
            <>
              <Button variant="ghost" onClick={disconnect} disabled={busy}>
                Отключить
              </Button>
              <Button
                onClick={run}
                disabled={busy || problems.length > 0}
                title={problems.length ? problems.join(' · ') : undefined}
              >
                Опубликовать
              </Button>
            </>
          ) : (
            !connecting && (
              <Button variant="secondary" onClick={() => setConnecting(true)}>
                Подключить GitHub
              </Button>
            )
          )}
        </div>
      </div>

      {!token && connecting && (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            connect()
          }}
        >
          <input
            type="password"
            autoComplete="off"
            placeholder="github_pat_…"
            value={draftToken}
            onChange={(event) => setDraftToken(event.target.value)}
            className={`${inputClass} min-w-0 flex-1`}
          />
          <Button type="submit" disabled={busy || !draftToken.trim()}>
            Сохранить
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setConnecting(false)}
          >
            Отмена
          </Button>
        </form>
      )}

      {status.kind === 'busy' && (
        <p className="text-sm text-muted-foreground">{status.text}</p>
      )}
      {status.kind === 'error' && (
        <p className="rounded-md bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
          {status.text}
        </p>
      )}
      {status.kind === 'done' && (
        <div className="space-y-1 rounded-md bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
          <p>
            Отправлено. Сайт пересоберётся за 2–3 минуты, после этого запись
            откроется по адресу{' '}
            <a href={status.pageUrl} className="underline" target="_blank">
              {status.pageUrl.replace('https://', '')}
            </a>
            .
          </p>
          <p>
            <a href={status.commitUrl} className="underline" target="_blank">
              Коммит
            </a>{' '}
            ·{' '}
            <a href={status.actionsUrl} className="underline" target="_blank">
              Ход сборки
            </a>{' '}
            ·{' '}
            <a href={repoUrl} className="underline" target="_blank">
              Репозиторий
            </a>
          </p>
        </div>
      )}
    </section>
  )
}
