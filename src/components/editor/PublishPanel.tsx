'use client'

import { useState } from 'react'
import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import remarkCodeFilename from 'remark-code-filename'

import { Button } from '@/components/Button'
import { existingFiles, publish } from '@/components/editor/github'
import {
  sectionFor,
  varOf,
  type Draft,
  type Origin,
  type PhotoMeta,
} from '@/components/editor/mdx'
import { deleteRecord } from '@/components/editor/records'
import { getPhoto } from '@/components/editor/storage'

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; text: string }
  | { kind: 'error'; text: string }
  | {
      kind: 'done'
      text: string
      pageUrl?: string
      commitUrl: string
      actionsUrl: string
    }

/** Mistakes that would break the site build, found before pushing */
async function findBuildErrors(draft: Draft, photos: Array<PhotoMeta>) {
  let known = new Set(photos.map(varOf))
  for (let line of draft.keptImports) {
    let match = /^import\s+([A-Za-z_$][\w$]*)\s+from/.exec(line)
    if (match) known.add(match[1])
  }
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
  token,
  draft,
  photos,
  code,
  problems,
  onPublished,
  onDeleted,
}: {
  token: string
  draft: Draft
  photos: Array<PhotoMeta>
  code: string
  problems: Array<string>
  /** The record now lives here on the site */
  onPublished: (origin: Origin) => void
  onDeleted: () => void
}) {
  let [status, setStatus] = useState<Status>({ kind: 'idle' })

  let section = sectionFor(draft.type)
  let folder = `src/app/${section}/${draft.slug}`
  let busy = status.kind === 'busy'
  let origin = draft.origin
  let moved =
    origin && (origin.section !== section || origin.slug !== draft.slug)

  async function run() {
    setStatus({ kind: 'busy', text: 'Проверяю текст…' })
    let buildError = await findBuildErrors(draft, photos)
    if (buildError) {
      setStatus({ kind: 'error', text: buildError })
      return
    }

    try {
      setStatus({ kind: 'busy', text: 'Сверяюсь с сайтом…' })
      let existing = await existingFiles(token, folder)
      let sameRecord = origin && !moved
      if (
        existing &&
        !sameRecord &&
        !window.confirm(
          `На сайте уже есть запись с адресом /${section}/${draft.slug}. Заменить её этой?`,
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
      let remove = (existing ?? [])
        .filter((name) => !names.has(name))
        .map((name) => `${folder}/${name}`)
      // The address or the type changed: the old folder goes away
      if (moved && origin) {
        let oldFolder = `src/app/${origin.section}/${origin.slug}`
        let old = await existingFiles(token, oldFolder)
        remove.push(...(old ?? []).map((name) => `${oldFolder}/${name}`))
      }

      setStatus({ kind: 'busy', text: 'Отправляю на GitHub…' })
      let result = await publish({
        token,
        folder,
        files,
        remove,
        message: `${existing || origin ? 'Обновление' : 'Новая запись'}: ${draft.title}`,
      })
      onPublished({ section, slug: draft.slug })
      setStatus({
        kind: 'done',
        text: 'Отправлено. Сайт пересоберётся за 2–3 минуты, после этого запись откроется по адресу',
        pageUrl: `https://atrial.org/${section}/${draft.slug}`,
        ...result,
      })
    } catch (error) {
      setStatus({ kind: 'error', text: (error as Error).message })
    }
  }

  async function remove() {
    if (!origin) return
    if (
      !window.confirm(
        `Удалить «${draft.title || origin.slug}» с сайта? Страница /${origin.section}/${origin.slug} и её фото пропадут. Черновик в этом браузере останется.`,
      )
    )
      return
    setStatus({ kind: 'busy', text: 'Удаляю…' })
    try {
      let result = await deleteRecord(
        token,
        origin.section,
        origin.slug,
        draft.title || origin.slug,
      )
      onDeleted()
      setStatus({
        kind: 'done',
        text: 'Удалено. Через 2–3 минуты страницы не будет на сайте.',
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
            {!token
              ? 'Подключите GitHub вверху страницы, чтобы публиковать отсюда.'
              : origin
                ? moved
                  ? `Запись переедет с /${origin.section}/${origin.slug} на /${section}/${draft.slug}.`
                  : `Правка опубликованной записи /${origin.section}/${origin.slug}.`
                : 'Новая запись.'}
          </p>
        </div>
        {token && (
          <div className="flex flex-wrap gap-2">
            {origin && (
              <Button variant="ghost" onClick={remove} disabled={busy}>
                Удалить с сайта
              </Button>
            )}
            <Button
              onClick={run}
              disabled={busy || problems.length > 0}
              title={problems.length ? problems.join(' · ') : undefined}
            >
              {origin ? 'Сохранить на сайте' : 'Опубликовать'}
            </Button>
          </div>
        )}
      </div>

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
            {status.text}
            {status.pageUrl && (
              <>
                {' '}
                <a href={status.pageUrl} className="underline" target="_blank">
                  {status.pageUrl.replace('https://', '')}
                </a>
              </>
            )}
            .
          </p>
          <p>
            <a href={status.commitUrl} className="underline" target="_blank">
              Коммит
            </a>{' '}
            ·{' '}
            <a href={status.actionsUrl} className="underline" target="_blank">
              Ход сборки
            </a>
          </p>
        </div>
      )}
    </section>
  )
}
