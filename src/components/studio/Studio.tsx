'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { strToU8, zipSync } from 'fflate'

import { Button } from '@/components/Button'
import { cn } from '@/lib/utils'
import {
  buildPageMdx,
  emptyDraft,
  photoSnippet,
  sectionFor,
  slugify,
  validate,
  type Draft,
  type PhotoMeta,
} from '@/components/studio/mdx'
import {
  compressPhoto,
  formatSize,
  nextPhotoName,
} from '@/components/studio/images'
import {
  clearPhotos,
  deletePhoto,
  getPhoto,
  loadDraft,
  putPhoto,
  saveDraft,
} from '@/components/studio/storage'
import { Preview } from '@/components/studio/Preview'

type Tab = 'text' | 'preview' | 'code'

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-offset-2 dark:bg-muted'

// Toolbar: wrap the selection, prefix lines, or insert a block
type Action =
  | { kind: 'wrap'; before: string; after: string; placeholder: string }
  | { kind: 'line'; prefix: string }
  | { kind: 'block'; text: string }

const toolbar: Array<{
  label: string
  title: string
  action: Action
  key?: string
}> = [
  {
    label: 'Ж',
    title: 'Жирный (Cmd+B)',
    key: 'b',
    action: { kind: 'wrap', before: '**', after: '**', placeholder: 'жирный' },
  },
  {
    label: 'К',
    title: 'Курсив (Cmd+I)',
    key: 'i',
    action: { kind: 'wrap', before: '_', after: '_', placeholder: 'курсив' },
  },
  {
    label: 'З',
    title: 'Зачёркнутый (Cmd+Shift+X)',
    action: {
      kind: 'wrap',
      before: '~~',
      after: '~~',
      placeholder: 'зачёркнутый',
    },
  },
  {
    label: 'П',
    title: 'Подчёркнутый (Cmd+U)',
    key: 'u',
    action: {
      kind: 'wrap',
      before: '<u>',
      after: '</u>',
      placeholder: 'подчёркнутый',
    },
  },
  {
    label: 'Маркер',
    title: 'Выделение маркером',
    action: {
      kind: 'wrap',
      before: '<mark>',
      after: '</mark>',
      placeholder: 'маркер',
    },
  },
  {
    label: 'H2',
    title: 'Заголовок раздела',
    action: { kind: 'line', prefix: '## ' },
  },
  {
    label: 'H3',
    title: 'Подзаголовок',
    action: { kind: 'line', prefix: '### ' },
  },
  {
    label: '• Список',
    title: 'Маркированный список',
    action: { kind: 'line', prefix: '- ' },
  },
  {
    label: '1. Список',
    title: 'Нумерованный список',
    action: { kind: 'line', prefix: '1. ' },
  },
  {
    label: '☐ Задачи',
    title: 'Чек-лист',
    action: { kind: 'line', prefix: '- [ ] ' },
  },
  {
    label: '❝ Цитата',
    title: 'Цитата',
    action: { kind: 'line', prefix: '> ' },
  },
  {
    label: 'Ссылка',
    title: 'Ссылка (Cmd+K)',
    key: 'k',
    action: {
      kind: 'wrap',
      before: '[',
      after: '](https://)',
      placeholder: 'текст ссылки',
    },
  },
  {
    label: '`код`',
    title: 'Код в строке (Cmd+E)',
    key: 'e',
    action: { kind: 'wrap', before: '`', after: '`', placeholder: 'код' },
  },
  {
    label: 'Блок кода',
    title: 'Блок кода',
    action: {
      kind: 'block',
      text: '```cpp title="sketch.ino"\nvoid setup() {}\n```',
    },
  },
  {
    label: 'Таблица',
    title: 'Таблица',
    action: {
      kind: 'block',
      text: '| Столбец | Столбец |\n| --- | --- |\n| Текст | Текст |',
    },
  },
  {
    label: 'Спойлер',
    title: 'Сворачиваемый блок',
    action: {
      kind: 'block',
      text: '<details>\n  <summary>Заголовок</summary>\n\nТекст внутри.\n\n</details>',
    },
  },
  {
    label: 'Клавиша',
    title: 'Клавиша',
    action: {
      kind: 'wrap',
      before: '<kbd>',
      after: '</kbd>',
      placeholder: 'Cmd',
    },
  },
  {
    label: '⇤',
    title: 'Выровнять по левому краю',
    action: {
      kind: 'wrap',
      before: '<Align to="left">\n\n',
      after: '\n\n</Align>',
      placeholder: 'текст',
    },
  },
  {
    label: '↔',
    title: 'Выровнять по центру',
    action: {
      kind: 'wrap',
      before: '<Align to="center">\n\n',
      after: '\n\n</Align>',
      placeholder: 'текст',
    },
  },
  {
    label: '⇥',
    title: 'Выровнять по правому краю',
    action: {
      kind: 'wrap',
      before: '<Align to="right">\n\n',
      after: '\n\n</Align>',
      placeholder: 'текст',
    },
  },
  { label: '—', title: 'Разделитель', action: { kind: 'block', text: '---' } },
]

export function Studio() {
  let [saved] = useState(loadDraft)
  let [draft, setDraft] = useState<Draft>(saved.draft)
  let [photos, setPhotos] = useState<Array<PhotoMeta>>(saved.photos)
  let [urls, setUrls] = useState<Record<string, string>>({})
  let [tab, setTab] = useState<Tab>('text')
  let [busy, setBusy] = useState<string | null>(null)
  let [copied, setCopied] = useState(false)
  let textRef = useRef<HTMLTextAreaElement>(null)

  // Photo blobs → object URLs for the editor list and the preview
  useEffect(() => {
    let created: Array<string> = []
    Promise.all(
      saved.photos.map(async (photo) => {
        let blob = await getPhoto(photo.name)
        if (!blob) return null
        let url = URL.createObjectURL(blob)
        created.push(url)
        return [photo.name, url] as const
      }),
    ).then((entries) =>
      setUrls(Object.fromEntries(entries.filter((entry) => entry !== null))),
    )
    return () => created.forEach((url) => URL.revokeObjectURL(url))
  }, [saved])

  useEffect(() => {
    saveDraft({ draft, photos })
  }, [draft, photos])

  let code = useMemo(() => buildPageMdx(draft, photos), [draft, photos])
  let problems = validate(draft)
  let folder = `src/app/${sectionFor(draft.type)}/${draft.slug || '…'}`

  function update(patch: Partial<Draft>) {
    setDraft((current) => {
      let next = { ...current, ...patch }
      if (patch.title !== undefined && !current.slugTouched) {
        next.slug = slugify(patch.title)
      }
      return next
    })
  }

  // Replace the selection in the textarea and keep the cursor sensible
  function edit(
    transform: (
      text: string,
      start: number,
      end: number,
    ) => { text: string; start: number; end: number },
  ) {
    let area = textRef.current
    if (!area) return
    let result = transform(draft.body, area.selectionStart, area.selectionEnd)
    update({ body: result.text })
    requestAnimationFrame(() => {
      area.focus()
      area.setSelectionRange(result.start, result.end)
    })
  }

  function apply(action: Action) {
    edit((text, start, end) => {
      let selected = text.slice(start, end)
      if (action.kind === 'wrap') {
        let inner = selected || action.placeholder
        let next =
          text.slice(0, start) +
          action.before +
          inner +
          action.after +
          text.slice(end)
        let innerStart = start + action.before.length
        return { text: next, start: innerStart, end: innerStart + inner.length }
      }
      if (action.kind === 'line') {
        let lineStart = text.lastIndexOf('\n', start - 1) + 1
        let block = text.slice(lineStart, end)
        let prefixed = block
          .split('\n')
          .map((line, i) =>
            action.prefix === '1. '
              ? `${i + 1}. ${line}`
              : action.prefix + line,
          )
          .join('\n')
        let next = text.slice(0, lineStart) + prefixed + text.slice(end)
        return {
          text: next,
          start: lineStart + prefixed.length,
          end: lineStart + prefixed.length,
        }
      }
      let before = text.slice(0, start)
      let gap =
        before === '' || before.endsWith('\n\n')
          ? ''
          : before.endsWith('\n')
            ? '\n'
            : '\n\n'
      let insert = gap + action.text + '\n\n'
      let next = before + insert + text.slice(end)
      return {
        text: next,
        start: start + insert.length,
        end: start + insert.length,
      }
    })
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return
    let key = event.key.toLowerCase()
    if (event.shiftKey && key === 'x') {
      event.preventDefault()
      apply(toolbar[2].action)
      return
    }
    let item = toolbar.find((entry) => entry.key === key)
    if (item && !event.shiftKey) {
      event.preventDefault()
      apply(item.action)
    }
  }

  async function addPhotos(files: Array<File>) {
    let images = files.filter(
      (file) =>
        file.type.startsWith('image/') || /\.(heic|heif)$/i.test(file.name),
    )
    let names = photos.map((photo) => photo.name)
    let added: Array<PhotoMeta> = []
    for (let file of images) {
      setBusy(`Сжимаю ${file.name}…`)
      try {
        let { blob, width, height } = await compressPhoto(file)
        let name = nextPhotoName([
          ...names,
          ...added.map((photo) => photo.name),
        ])
        await putPhoto(name, blob)
        added.push({ name, width, height, size: blob.size })
        setUrls((current) => ({
          ...current,
          [name]: URL.createObjectURL(blob),
        }))
      } catch {
        window.alert(
          `Браузер не смог прочитать ${file.name}. Сохраните фото в JPG и попробуйте снова.`,
        )
      }
    }
    setBusy(null)
    if (added.length) {
      setPhotos((current) => [...current, ...added])
      apply({ kind: 'block', text: added.map(photoSnippet).join('\n\n') })
    }
  }

  async function removePhoto(name: string) {
    await deletePhoto(name)
    setPhotos((current) => current.filter((photo) => photo.name !== name))
  }

  function reset() {
    if (
      !window.confirm(
        'Начать новую статью? Текущий черновик и его фото будут удалены.',
      )
    )
      return
    clearPhotos()
    setPhotos([])
    setUrls({})
    setDraft(emptyDraft())
    setTab('text')
  }

  async function copyCode() {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  async function downloadZip() {
    let slug = draft.slug || 'statya'
    let files: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {
      [`${slug}/page.mdx`]: strToU8(code),
    }
    for (let photo of photos) {
      let blob = await getPhoto(photo.name)
      if (blob) {
        // Photos are already compressed: store them as is
        files[`${slug}/${photo.name}`] = [
          new Uint8Array(await blob.arrayBuffer()),
          { level: 0 },
        ]
      }
    }
    let zip = zipSync(files)
    let link = document.createElement('a')
    link.href = URL.createObjectURL(
      new Blob([zip as BlobPart], { type: 'application/zip' }),
    )
    link.download = `${slug}.zip`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Студия
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Черновик сохраняется в этом браузере. Готовую папку положите в{' '}
            <code className="text-foreground">{folder}</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={reset}>
            Новая статья
          </Button>
          <Button variant="secondary" onClick={copyCode}>
            {copied ? 'Скопировано' : 'Скопировать код'}
          </Button>
          <Button onClick={downloadZip}>Скачать ZIP</Button>
        </div>
      </div>

      {problems.length > 0 && (
        <p className="rounded-xl bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
          Перед публикацией: {problems.join(' · ')}
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">Заголовок</span>
          <input
            className={inputClass}
            value={draft.title}
            onChange={(e) => update({ title: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-muted-foreground">
            Описание — для списка записей и превью ссылки
          </span>
          <textarea
            className={cn(inputClass, 'resize-y')}
            rows={2}
            value={draft.description}
            onChange={(e) => update({ description: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Тип</span>
          <select
            className={inputClass}
            value={draft.type}
            onChange={(e) => update({ type: e.target.value as Draft['type'] })}
          >
            <option value="article">Статья</option>
            <option value="video">Видео</option>
            <option value="instruction">Инструкция</option>
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Дата</span>
          <input
            type="date"
            className={inputClass}
            value={draft.date}
            onChange={(e) => update({ date: e.target.value })}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">
            Адрес (латиница, через дефис)
          </span>
          <input
            className={inputClass}
            value={draft.slug}
            onChange={(e) =>
              update({ slug: e.target.value, slugTouched: true })
            }
          />
        </label>
        {draft.type === 'video' ? (
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Код ролика YouTube</span>
            <input
              className={inputClass}
              placeholder="dQw4w9WgXcQ"
              value={draft.youtubeId}
              onChange={(e) => update({ youtubeId: e.target.value })}
            />
          </label>
        ) : (
          <div />
        )}
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={draft.unlisted}
            onChange={(e) => update({ unlisted: e.target.checked })}
          />
          Только по прямой ссылке (не показывать в списках)
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={draft.showOnHome}
            onChange={(e) => update({ showOnHome: e.target.checked })}
          />
          Показывать на главной
        </label>
      </section>

      <section>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">Фото</h2>
          <label
            className={cn('cursor-pointer', 'text-sm font-medium text-accent')}
          >
            {busy ?? '+ Добавить фото'}
            <input
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              className="sr-only"
              onChange={(e) => {
                addPhotos(Array.from(e.target.files ?? []))
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Фото сами уменьшаются до 1600 px и сохраняются в JPG. Размер и
          положение меняются в тексте: size — small, medium, full; align — left,
          center, right; wrap — текст обтекает фото. Можно перетащить их прямо в
          текст.
        </p>
        {photos.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {photos.map((photo) => (
              <li
                key={photo.name}
                className="overflow-hidden rounded-xl ring-1 ring-border"
              >
                {urls[photo.name] && (
                  <img
                    src={urls[photo.name]}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                )}
                <div className="space-y-1 p-2 text-xs">
                  <p className="text-foreground">
                    {photo.name} · {formatSize(photo.size)}
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="text-accent"
                      onClick={() =>
                        apply({ kind: 'block', text: photoSnippet(photo) })
                      }
                    >
                      Вставить
                    </button>
                    <button
                      type="button"
                      className="text-muted-foreground"
                      onClick={() => removePhoto(photo.name)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex gap-1 border-b border-border">
          {(
            [
              ['text', 'Текст'],
              ['preview', 'Превью'],
              ['code', 'Код'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={cn(
                '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                tab === value
                  ? 'border-accent text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'text' && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-1">
              {toolbar.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  title={item.title}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => apply(item.action)}
                  className="rounded-md px-2.5 py-1.5 text-sm text-foreground ring-1 ring-border transition-colors hover:bg-muted"
                >
                  {item.label}
                </button>
              ))}
            </div>
            <textarea
              ref={textRef}
              value={draft.body}
              onChange={(e) => update({ body: e.target.value })}
              onKeyDown={onKeyDown}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                let files = Array.from(event.dataTransfer.files)
                if (files.length) {
                  event.preventDefault()
                  addPhotos(files)
                }
              }}
              placeholder="Пишите текст статьи. Форматирование — кнопками выше или Markdown, как в инструкции."
              spellCheck
              className={cn(
                inputClass,
                'min-h-[60vh] resize-y font-mono leading-relaxed',
              )}
            />
          </div>
        )}

        {tab === 'preview' && (
          <div className="mt-8">
            <Preview draft={draft} photos={photos} urls={urls} />
          </div>
        )}

        {tab === 'code' && (
          <pre className="mt-4 max-h-[70vh] overflow-auto rounded-2xl bg-muted p-4 text-sm whitespace-pre-wrap text-foreground">
            {code}
          </pre>
        )}
      </section>
    </div>
  )
}
