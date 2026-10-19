'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { strToU8, zipSync } from 'fflate'

import { Button } from '@/components/Button'
import { cn } from '@/lib/utils'
import {
  buildPageMdx,
  carouselSnippet,
  emptyDraft,
  photoSnippet,
  photoVar,
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
import { PublishPanel } from '@/components/studio/PublishPanel'

type Tab = 'text' | 'preview' | 'code'

const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-offset-2 dark:bg-muted'

// Toolbar: wrap the selection, prefix lines, or insert a block
type Action =
  | { kind: 'wrap'; before: string; after: string; placeholder: string }
  | { kind: 'line'; prefix: string }
  | { kind: 'block'; text: string }
  | { kind: 'align'; to: 'left' | 'center' | 'right' }
  | { kind: 'quote' }

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
    title: 'Цитата (автора можно вписать в <cite>, пустой не покажется)',
    action: { kind: 'quote' },
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
    label: 'Кнопка',
    title: 'Кнопка-ссылка с иконкой сайта: впишите адрес в href',
    action: {
      kind: 'wrap',
      before: '<OgButton href="https://" variant="secondary">',
      after: '</OgButton>',
      placeholder: 'Текст кнопки',
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
    action: { kind: 'align', to: 'left' },
  },
  {
    label: '↔',
    title: 'Выровнять по центру',
    action: { kind: 'align', to: 'center' },
  },
  {
    label: '⇥',
    title: 'Выровнять по правому краю',
    action: { kind: 'align', to: 'right' },
  },
  { label: '—', title: 'Разделитель', action: { kind: 'block', text: '---' } },
]

/**
 * Quote with an optional author line, like the citation field of a quote
 * block in WordPress: an empty <cite></cite> is not shown on the site.
 */
function quote(text: string, start: number, end: number) {
  let lineStart = text.lastIndexOf('\n', start - 1) + 1
  let lineEnd = text.indexOf('\n', end)
  if (lineEnd === -1) lineEnd = text.length
  let lines = text.slice(lineStart, lineEnd)
  let content = lines.trim() ? lines : 'Текст цитаты'
  let quoted = content
    .split('\n')
    .map((line) => (line.trim() ? `> ${line}` : '>'))
    .join('\n')
  let block = `${quoted}\n>\n> <cite></cite>`
  let next = text.slice(0, lineStart) + block + text.slice(lineEnd)
  if (lines.trim()) {
    // Text was there already: put the cursor into the author tag
    let cursor = lineStart + block.length - '</cite>'.length
    return { text: next, start: cursor, end: cursor }
  }
  return {
    text: next,
    start: lineStart + 2,
    end: lineStart + 2 + content.length,
  }
}

const alignWrap = (to: string) => ({
  kind: 'wrap' as const,
  before: `<Align to="${to}">\n\n`,
  after: '\n\n</Align>',
  placeholder: 'текст',
})

/**
 * Photos have their own align attribute: set it instead of wrapping them in
 * <Align>. An existing <Align> block just gets its direction changed.
 */
function align(text: string, start: number, end: number, to: string) {
  // With no selection, act on the line under the cursor
  let from = start
  let till = end
  if (start === end) {
    from = text.lastIndexOf('\n', start - 1) + 1
    let lineEnd = text.indexOf('\n', end)
    till = lineEnd === -1 ? text.length : lineEnd
  }
  let part = text.slice(from, till)

  let changed: string | null = null
  if (/<Photo\b/.test(part)) {
    changed = part.replace(/<Photo\b[\s\S]*?\/>/g, (tag) =>
      /\balign="[^"]*"/.test(tag)
        ? tag.replace(/\balign="[^"]*"/, `align="${to}"`)
        : tag.replace(/\s*\/>$/, ` align="${to}" />`),
    )
  } else if (/<Align to="[^"]*">/.test(part)) {
    changed = part.replace(/<Align to="[^"]*">/g, `<Align to="${to}">`)
  } else {
    // Cursor or selection inside an <Align> block: change that block
    let open = text.lastIndexOf('<Align to="', start)
    let close = text.indexOf('</Align>', end)
    if (
      open !== -1 &&
      close !== -1 &&
      text.lastIndexOf('</Align>', start) < open
    ) {
      let tag = text.slice(open).match(/^<Align to="[^"]*">/)
      if (tag) {
        let next =
          text.slice(0, open) +
          `<Align to="${to}">` +
          text.slice(open + tag[0].length)
        let shift = `<Align to="${to}">`.length - tag[0].length
        return { text: next, start: start + shift, end: end + shift }
      }
    }
  }
  if (changed !== null) {
    return {
      text: text.slice(0, from) + changed + text.slice(till),
      start: from,
      end: from + changed.length,
    }
  }

  let wrap = alignWrap(to)
  let inner = text.slice(start, end) || wrap.placeholder
  let innerStart = start + wrap.before.length
  return {
    text:
      text.slice(0, start) + wrap.before + inner + wrap.after + text.slice(end),
    start: innerStart,
    end: innerStart + inner.length,
  }
}

export function Studio() {
  let [saved] = useState(loadDraft)
  let [draft, setDraft] = useState<Draft>(saved.draft)
  let [photos, setPhotos] = useState<Array<PhotoMeta>>(saved.photos)
  let [urls, setUrls] = useState<Record<string, string>>({})
  let [tab, setTab] = useState<Tab>('text')
  let [busy, setBusy] = useState<string | null>(null)
  let [copied, setCopied] = useState(false)
  let [selected, setSelected] = useState<Array<string>>([])
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

  // Where each photo is already used: in a carousel and/or on its own
  let usage = useMemo(() => {
    let carousels = draft.body.match(/<ImageCarousel\b[\s\S]*?\/>/g) ?? []
    let rest = carousels.reduce(
      (text, block) => text.replace(block, ''),
      draft.body,
    )
    return Object.fromEntries(
      photos.map((photo) => {
        let pattern = new RegExp(`\\b${photoVar(photo.name)}\\b`)
        let places = [
          ...(carousels.some((block) => pattern.test(block))
            ? ['в карусели']
            : []),
          ...(pattern.test(rest) ? ['в тексте'] : []),
        ]
        return [photo.name, places]
      }),
    )
  }, [draft.body, photos])
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
    // On the Preview/Code tabs there is no textarea: insert at the end
    let area = textRef.current
    // The textarea holds the latest text even when this runs after an await
    // (photo compression) with an older `draft` in the closure
    let body = area ? area.value : draft.body
    let end = body.length
    let result = transform(
      body,
      area ? area.selectionStart : end,
      area ? area.selectionEnd : end,
    )
    update({ body: result.text })
    if (area) {
      requestAnimationFrame(() => {
        area.focus()
        area.setSelectionRange(result.start, result.end)
      })
    }
  }

  function apply(action: Action) {
    if (action.kind === 'quote') {
      edit(quote)
      return
    }
    if (action.kind === 'align') {
      edit((text, start, end) => align(text, start, end, action.to))
      return
    }
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
    setSelected((current) => current.filter((item) => item !== name))
  }

  function toggleSelected(name: string) {
    setSelected((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    )
  }

  // Photos go into the carousel in the order they were ticked
  function insertCarousel() {
    let chosen = selected
      .map((name) => photos.find((photo) => photo.name === name))
      .filter((photo) => photo !== undefined)
    apply({ kind: 'block', text: carouselSnippet(chosen) })
    setSelected([])
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
    setSelected([])
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
    // Revoking right away cancels the download in Safari
    window.setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Верстак
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Черновик сохраняется в этом браузере. Опубликуйте кнопкой ниже или
            скачайте ZIP и положите папку в{' '}
            <code className="text-foreground">{folder}</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            href="/instructions/kak-pisat-stati"
            target="_blank"
            rel="noopener"
            variant="secondary"
          >
            Инструкция
          </Button>
          <Button variant="secondary" onClick={reset}>
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

      <PublishPanel
        draft={draft}
        photos={photos}
        code={code}
        problems={problems}
      />

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
          <div className="flex flex-wrap items-center gap-4">
            {photos.length > 1 && (
              <button
                type="button"
                disabled={selected.length < 2}
                onClick={insertCarousel}
                className="text-sm font-medium text-accent disabled:text-muted-foreground"
              >
                {selected.length < 2
                  ? 'Отметьте 2+ фото для карусели'
                  : `Карусель из выбранных (${selected.length})`}
              </button>
            )}
            <label
              className={cn(
                'cursor-pointer',
                'text-sm font-medium text-accent',
              )}
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
                className={cn(
                  'relative overflow-hidden rounded-xl ring-1',
                  selected.includes(photo.name)
                    ? 'ring-2 ring-accent'
                    : 'ring-border',
                )}
              >
                <label className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-card/90 px-1.5 py-0.5 text-xs text-foreground shadow dark:bg-muted/90">
                  <input
                    type="checkbox"
                    checked={selected.includes(photo.name)}
                    onChange={() => toggleSelected(photo.name)}
                  />
                  {selected.includes(photo.name)
                    ? selected.indexOf(photo.name) + 1
                    : 'в карусель'}
                </label>
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
                  <p
                    className={
                      usage[photo.name]?.length
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-muted-foreground'
                    }
                  >
                    {usage[photo.name]?.length
                      ? `✓ ${usage[photo.name].join(' и ')}`
                      : 'не вставлено'}
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
