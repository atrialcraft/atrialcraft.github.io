'use client'

// Forms for the parts of the site that aren't posts: the home page, «Обо
// мне», «Проекты», section headers, link previews and settings. Each form
// reads its JSON from src/content and the pictures from the repository,
// and saves everything in one commit.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import { Button } from '@/components/Button'
import {
  commitChanges,
  getTree,
  readBlob,
  readText,
  type Change,
  type TreeEntry,
} from '@/components/editor/github'
import { fitPhoto } from '@/components/editor/images'
import { slugify } from '@/components/editor/mdx'
import type { Place, ProjectItem } from '@/lib/content'
import { cn } from '@/lib/utils'

export const inputClass =
  'w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-offset-2 dark:bg-muted'

/** Size of a picture slot: cropped to width × height, or longest side ≤ width */
type Fit = { width: number; height?: number }

type Pending = Map<string, { bytes: Uint8Array | null; url: string | null }>

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'done'; commitUrl: string; actionsUrl: string }

/**
 * Loads a JSON file from the repository and keeps track of changed
 * pictures; `save` sends the JSON and the pictures in one commit
 */
function useRepoContent<T>(token: string, path: string) {
  let [tree, setTree] = useState<TreeEntry[] | null>(null)
  let [data, setData] = useState<T | null>(null)
  let [pending, setPending] = useState<Pending>(new Map())
  let [status, setStatus] = useState<Status>({ kind: 'idle' })
  let [dirty, setDirty] = useState(false)

  let load = useCallback(async () => {
    setStatus({ kind: 'busy', text: 'Загружаю с сайта…' })
    try {
      let entries = await getTree(token)
      let entry = entries.find((e) => e.path === path)
      if (!entry) throw new Error(`Нет файла ${path}`)
      setTree(entries)
      setData(JSON.parse(await readText(token, entry.sha)) as T)
      setPending(new Map())
      setDirty(false)
      setStatus({ kind: 'idle' })
    } catch (error) {
      setStatus({ kind: 'error', text: (error as Error).message })
    }
  }, [token, path])

  useEffect(() => {
    load()
  }, [load])

  let change = (next: T) => {
    setData(next)
    setDirty(true)
  }

  let setPicture = (
    picturePath: string,
    bytes: Uint8Array | null,
    url: string | null,
  ) => {
    setPending((current) => new Map(current).set(picturePath, { bytes, url }))
    setDirty(true)
  }

  let save = async (message: string, extra: Change[] = []) => {
    if (!data) return
    setStatus({ kind: 'busy', text: 'Отправляю на GitHub…' })
    try {
      let changes: Change[] = [
        {
          path,
          bytes: new TextEncoder().encode(JSON.stringify(data, null, 2) + '\n'),
        },
        ...[...pending].map(([p, { bytes }]) => ({ path: p, bytes })),
        ...extra,
      ]
      let result = await commitChanges(token, changes, message)
      setStatus({ kind: 'done', ...result })
      setDirty(false)
      setPending(new Map())
      setTree(await getTree(token))
    } catch (error) {
      setStatus({ kind: 'error', text: (error as Error).message })
    }
  }

  return {
    tree,
    data,
    change,
    pending,
    setPicture,
    save,
    status,
    dirty,
    reload: load,
  }
}

function Field({
  label,
  hint,
  value,
  onChange,
  multiline,
  rows = 3,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  multiline?: boolean
  rows?: number
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {multiline ? (
        <textarea
          className={cn(inputClass, 'resize-y')}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && (
        <span className="block text-xs text-muted-foreground">{hint}</span>
      )}
    </label>
  )
}

/**
 * A picture from the repository (`path`) that can be replaced or removed.
 * The new one is cropped to `fit` right away; it is saved with the form
 */
function PictureSlot({
  token,
  tree,
  path,
  fit,
  pending,
  onPick,
  removable,
  className,
  label,
}: {
  token: string
  tree: TreeEntry[] | null
  path: string
  fit: Fit
  pending: Pending
  onPick: (path: string, bytes: Uint8Array | null, url: string | null) => void
  removable?: boolean
  className?: string
  label?: string
}) {
  let [current, setCurrent] = useState<string | null>(null)
  let [busy, setBusy] = useState(false)
  let input = useRef<HTMLInputElement>(null)
  let changed = pending.get(path)
  let entry = tree?.find((e) => e.path === path)

  useEffect(() => {
    if (!entry) {
      setCurrent(null)
      return
    }
    let url: string | null = null
    let cancelled = false
    readBlob(token, entry.sha).then((bytes) => {
      if (cancelled) return
      url = URL.createObjectURL(new Blob([bytes as BlobPart]))
      setCurrent(url)
    })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [token, entry])

  let shown = changed ? changed.url : current

  async function pick(file: File) {
    setBusy(true)
    try {
      let { blob } = await fitPhoto(file, fit.width, fit.height)
      onPick(
        path,
        new Uint8Array(await blob.arrayBuffer()),
        URL.createObjectURL(blob),
      )
    } catch {
      window.alert(
        `Браузер не смог прочитать ${file.name}. Сохраните фото в JPG и попробуйте снова.`,
      )
    }
    setBusy(false)
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative block w-full overflow-hidden rounded-lg bg-muted ring-1 ring-border"
        style={{
          aspectRatio: fit.height ? `${fit.width} / ${fit.height}` : '4 / 3',
        }}
        title="Заменить фото"
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shown}
            alt=""
            className={cn(
              'size-full',
              fit.height ? 'object-cover' : 'object-contain',
            )}
          />
        ) : (
          <PhotoIcon className="absolute inset-0 m-auto size-6 text-muted-foreground" />
        )}
        <span className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-xs text-white opacity-0 transition group-hover:opacity-100">
          {busy ? 'Сжимаю…' : shown ? 'Заменить' : 'Добавить'}
        </span>
        {changed && (
          <span className="absolute top-1 right-1 rounded bg-amber-400 px-1 text-[0.625rem] font-medium text-black">
            новое
          </span>
        )}
      </button>
      {(label || (removable && shown)) && (
        <div className="flex items-center justify-between gap-2 text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {removable && shown && (
            <button
              type="button"
              className="text-muted-foreground hover:text-red-600"
              onClick={() => onPick(path, null, null)}
            >
              Убрать
            </button>
          )}
        </div>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*,.heic,.heif"
        className="sr-only"
        onChange={(e) => {
          let file = e.target.files?.[0]
          if (file) pick(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function SaveBar({
  status,
  dirty,
  onSave,
  onReload,
}: {
  status: Status
  dirty: boolean
  onSave: () => void
  onReload: () => void
}) {
  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card/95 p-3 shadow-lg ring-1 ring-border backdrop-blur dark:bg-muted/95">
      <div className="min-w-0 text-sm">
        {status.kind === 'busy' && (
          <span className="text-muted-foreground">{status.text}</span>
        )}
        {status.kind === 'error' && (
          <span className="text-red-600 dark:text-red-400">{status.text}</span>
        )}
        {status.kind === 'done' && (
          <span className="text-green-700 dark:text-green-400">
            Сохранено. Сайт обновится через 2–3 минуты ·{' '}
            <a href={status.commitUrl} target="_blank" className="underline">
              коммит
            </a>{' '}
            ·{' '}
            <a href={status.actionsUrl} target="_blank" className="underline">
              сборка
            </a>
          </span>
        )}
        {status.kind === 'idle' && (
          <span className="text-muted-foreground">
            {dirty ? 'Есть несохранённые изменения' : 'Всё сохранено'}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          onClick={() =>
            (!dirty || window.confirm('Отменить несохранённые изменения?')) &&
            onReload()
          }
          disabled={status.kind === 'busy'}
        >
          Отменить
        </Button>
        <Button onClick={onSave} disabled={!dirty || status.kind === 'busy'}>
          Сохранить на сайте
        </Button>
      </div>
    </div>
  )
}

function Loading({ status }: { status: Status }) {
  return (
    <p
      className={cn(
        'text-sm',
        status.kind === 'error' ? 'text-red-600' : 'text-muted-foreground',
      )}
    >
      {status.kind === 'error' ? status.text : 'Загружаю с сайта…'}
    </p>
  )
}

/** Buttons to move an item of a list up or down and to delete it */
function ItemTools({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  onMove: (to: number) => void
  onRemove: () => void
}) {
  let tool =
    'flex size-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30'
  return (
    <div className="flex gap-1">
      <button
        type="button"
        className={tool}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
        aria-label="Выше"
      >
        <ArrowUpIcon className="size-4" />
      </button>
      <button
        type="button"
        className={tool}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
        aria-label="Ниже"
      >
        <ArrowDownIcon className="size-4" />
      </button>
      <button
        type="button"
        className={cn(tool, 'hover:text-red-600')}
        onClick={onRemove}
        aria-label="Удалить"
      >
        <TrashIcon className="size-4" />
      </button>
    </div>
  )
}

function move<T>(list: T[], from: number, to: number) {
  let next = [...list]
  let [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

/** A file name for a new logo that isn't taken yet */
function freeName(base: string, taken: string[]) {
  let stem = slugify(base) || 'logo'
  let name = `${stem}.webp`
  for (let i = 2; taken.includes(name); i++) name = `${stem}-${i}.webp`
  return name
}

const linksHint =
  'Ссылки в тексте: [текст](https://адрес). Новый абзац — пустая строка.'

// ———————————————————— Home ————————————————————

type HomeData = {
  title: string
  intro: string
  gallery: string[]
  places: Place[]
}

export function HomeForm({ token }: { token: string }) {
  let c = useRepoContent<HomeData>(token, 'src/content/home.json')
  if (!c.data) return <Loading status={c.status} />
  let data = c.data
  let set = (patch: Partial<HomeData>) => c.change({ ...data, ...patch })
  let setPlace = (i: number, patch: Partial<Place>) =>
    set({
      places: data.places.map((p, j) => (j === i ? { ...p, ...patch } : p)),
    })

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Шапка</h2>
        <Field
          label="Заголовок"
          value={data.title}
          onChange={(title) => set({ title })}
        />
        <Field
          label="Текст под заголовком"
          value={data.intro}
          onChange={(intro) => set({ intro })}
          multiline
          hint={linksHint}
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Лента фото</h2>
          <p className="text-xs text-muted-foreground">
            Пять фото, обрезаются под 4:5. Подпись читают незрячие и поисковики.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {data.gallery.map((alt, i) => (
            <div key={i} className="space-y-2">
              <PictureSlot
                token={token}
                tree={c.tree}
                path={`src/images/home/0${i + 1}.webp`}
                fit={{ width: 880, height: 1100 }}
                pending={c.pending}
                onPick={c.setPicture}
              />
              <textarea
                className={cn(inputClass, 'resize-y text-xs')}
                rows={2}
                value={alt}
                placeholder="Что на фото"
                onChange={(e) =>
                  set({
                    gallery: data.gallery.map((a, j) =>
                      j === i ? e.target.value : a,
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Где купить
            </h2>
            <p className="text-xs text-muted-foreground">
              Логотип и название ведут на сайт места, адрес — на Яндекс Карты.
              Логотип обрезается в квадрат.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              set({
                places: [
                  ...data.places,
                  {
                    name: '',
                    description: '',
                    href: '',
                    map: '',
                    logo: freeName(
                      `place-${data.places.length + 1}`,
                      data.places.map((p) => p.logo),
                    ),
                  },
                ],
              })
            }
          >
            <PlusIcon className="size-4" /> Место
          </Button>
        </div>
        <ul className="space-y-3">
          {data.places.map((place, i) => (
            <li
              key={i}
              className="grid gap-3 rounded-xl p-3 ring-1 ring-border sm:grid-cols-[5rem_1fr_auto]"
            >
              <PictureSlot
                token={token}
                tree={c.tree}
                path={`public/images/places/${place.logo}`}
                fit={{ width: 128, height: 128 }}
                pending={c.pending}
                onPick={c.setPicture}
                className="w-20"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <Field
                  label="Название"
                  value={place.name}
                  onChange={(name) => setPlace(i, { name })}
                />
                <Field
                  label="Адрес или описание"
                  value={place.description}
                  onChange={(description) => setPlace(i, { description })}
                />
                <Field
                  label="Сайт или канал"
                  value={place.href}
                  onChange={(href) => setPlace(i, { href })}
                />
                <Field
                  label="Яндекс Карты (если есть адрес)"
                  value={place.map}
                  onChange={(map) => setPlace(i, { map })}
                />
              </div>
              <ItemTools
                index={i}
                count={data.places.length}
                onMove={(to) => set({ places: move(data.places, i, to) })}
                onRemove={() => {
                  if (!window.confirm(`Убрать «${place.name || 'место'}»?`))
                    return
                  if (
                    c.tree?.some(
                      (e) => e.path === `public/images/places/${place.logo}`,
                    )
                  ) {
                    c.setPicture(
                      `public/images/places/${place.logo}`,
                      null,
                      null,
                    )
                  }
                  set({ places: data.places.filter((_, j) => j !== i) })
                }}
              />
            </li>
          ))}
        </ul>
      </section>

      <SaveBar
        status={c.status}
        dirty={c.dirty}
        onReload={c.reload}
        onSave={() => {
          // A place without a logo file would show a broken picture
          let missing = data.places.filter((p) => {
            let path = `public/images/places/${p.logo}`
            let picked = c.pending.get(path)
            return picked
              ? !picked.bytes
              : !c.tree?.some((e) => e.path === path)
          })
          if (missing.length) {
            window.alert(
              `Добавьте логотип: ${missing.map((p) => p.name || 'новое место').join(', ')}`,
            )
            return
          }
          c.save('Админка: главная')
        }}
      />
    </div>
  )
}

// ———————————————————— About ————————————————————

type AboutData = { title: string; description: string; text: string }

export function AboutForm({ token }: { token: string }) {
  let c = useRepoContent<AboutData>(token, 'src/content/about.json')
  if (!c.data) return <Loading status={c.status} />
  let data = c.data
  let set = (patch: Partial<AboutData>) => c.change({ ...data, ...patch })
  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_16rem]">
        <div className="space-y-4">
          <Field
            label="Заголовок"
            value={data.title}
            onChange={(title) => set({ title })}
          />
          <Field
            label="Текст"
            value={data.text}
            onChange={(text) => set({ text })}
            multiline
            rows={16}
            hint={linksHint}
          />
          <Field
            label="Описание для поисковиков и превью ссылки"
            value={data.description}
            onChange={(description) => set({ description })}
            multiline
            rows={2}
          />
        </div>
        <PictureSlot
          token={token}
          tree={c.tree}
          path="src/images/me.webp"
          fit={{ width: 1024, height: 1280 }}
          pending={c.pending}
          onPick={c.setPicture}
          label="Портрет, 4:5"
        />
      </div>
      <SaveBar
        status={c.status}
        dirty={c.dirty}
        onReload={c.reload}
        onSave={() => c.save('Админка: обо мне')}
      />
    </div>
  )
}

// ———————————————————— Projects ————————————————————

type ProjectsData = {
  title: string
  intro: string
  description: string
  items: ProjectItem[]
}

export function ProjectsForm({ token }: { token: string }) {
  let c = useRepoContent<ProjectsData>(token, 'src/content/projects.json')
  if (!c.data) return <Loading status={c.status} />
  let data = c.data
  let set = (patch: Partial<ProjectsData>) => c.change({ ...data, ...patch })
  let setItem = (i: number, patch: Partial<ProjectItem>) =>
    set({ items: data.items.map((p, j) => (j === i ? { ...p, ...patch } : p)) })
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <Field
          label="Заголовок"
          value={data.title}
          onChange={(title) => set({ title })}
        />
        <Field
          label="Текст под заголовком"
          value={data.intro}
          onChange={(intro) => set({ intro })}
          multiline
          hint={linksHint}
        />
        <Field
          label="Описание для поисковиков"
          value={data.description}
          onChange={(description) => set({ description })}
        />
      </section>
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Карточки</h2>
            <p className="text-xs text-muted-foreground">
              Без логотипа в кружке будут первые буквы названия. Ссылка — на
              статью о проекте (/projects/…) или внешний сайт.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              set({
                items: [
                  ...data.items,
                  { name: '', description: '', href: '', label: '', logo: '' },
                ],
              })
            }
          >
            <PlusIcon className="size-4" /> Проект
          </Button>
        </div>
        <ul className="space-y-3">
          {data.items.map((item, i) => {
            let logoName =
              item.logo ||
              freeName(
                item.name || `project-${i + 1}`,
                data.items.map((p) => p.logo),
              )
            return (
              <li
                key={i}
                className="grid gap-3 rounded-xl p-3 ring-1 ring-border sm:grid-cols-[5rem_1fr_auto]"
              >
                <PictureSlot
                  token={token}
                  tree={c.tree}
                  path={`public/images/projects/${logoName}`}
                  fit={{ width: 128, height: 128 }}
                  pending={c.pending}
                  onPick={(path, bytes, url) => {
                    c.setPicture(path, bytes, url)
                    setItem(i, { logo: bytes ? logoName : '' })
                  }}
                  removable
                  className="w-20"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field
                    label="Название"
                    value={item.name}
                    onChange={(name) => setItem(i, { name })}
                  />
                  <Field
                    label="Подпись ссылки"
                    value={item.label}
                    onChange={(label) => setItem(i, { label })}
                  />
                  <div className="sm:col-span-2">
                    <Field
                      label="Описание"
                      value={item.description}
                      onChange={(description) => setItem(i, { description })}
                      multiline
                      rows={2}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Field
                      label="Ссылка"
                      value={item.href}
                      onChange={(href) => setItem(i, { href })}
                    />
                  </div>
                </div>
                <ItemTools
                  index={i}
                  count={data.items.length}
                  onMove={(to) => set({ items: move(data.items, i, to) })}
                  onRemove={() => {
                    if (!window.confirm(`Убрать «${item.name || 'проект'}»?`))
                      return
                    if (
                      item.logo &&
                      c.tree?.some(
                        (e) => e.path === `public/images/projects/${item.logo}`,
                      )
                    ) {
                      c.setPicture(
                        `public/images/projects/${item.logo}`,
                        null,
                        null,
                      )
                    }
                    set({ items: data.items.filter((_, j) => j !== i) })
                  }}
                />
              </li>
            )
          })}
        </ul>
      </section>
      <SaveBar
        status={c.status}
        dirty={c.dirty}
        onReload={c.reload}
        onSave={() => c.save('Админка: проекты')}
      />
    </div>
  )
}

// ———————————————————— Sections and link previews ————————————————————

type SectionData = { title: string; intro: string; description: string }
type SectionsData = {
  blog: SectionData
  instructions: SectionData
  market: SectionData
}

const sectionNames: Record<keyof SectionsData, string> = {
  blog: 'Блог',
  instructions: 'Инструкции',
  market: 'Магазин',
}

const previews = [
  ['index', 'Главная'],
  ['about', 'Обо мне'],
  ['blog', 'Блог'],
  ['projects', 'Проекты'],
  ['market', 'Магазин'],
  ['instructions', 'Инструкции'],
  ['privacy', 'Политика'],
  ['editor', 'Верстак'],
] as const

export function SectionsForm({ token }: { token: string }) {
  let c = useRepoContent<SectionsData>(token, 'src/content/sections.json')
  if (!c.data) return <Loading status={c.status} />
  let data = c.data
  return (
    <div className="space-y-10">
      {(Object.keys(sectionNames) as (keyof SectionsData)[]).map((key) => (
        <section key={key} className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            {sectionNames[key]}
          </h2>
          <Field
            label="Заголовок"
            value={data[key].title}
            onChange={(title) =>
              c.change({ ...data, [key]: { ...data[key], title } })
            }
          />
          <Field
            label="Текст под заголовком"
            value={data[key].intro}
            onChange={(intro) =>
              c.change({ ...data, [key]: { ...data[key], intro } })
            }
            multiline
            rows={2}
          />
          <Field
            label="Описание для поисковиков и превью ссылки"
            value={data[key].description}
            onChange={(description) =>
              c.change({ ...data, [key]: { ...data[key], description } })
            }
          />
        </section>
      ))}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Фото в превью ссылок
          </h2>
          <p className="text-xs text-muted-foreground">
            Картинка, которую показывают Telegram и ВКонтакте, когда отправляешь
            ссылку на раздел. Фото слева, обрезается под 3:4. Без фото — только
            текст. У статей и товаров берётся их первое фото.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {previews.map(([id, name]) => (
            <PictureSlot
              key={id}
              token={token}
              tree={c.tree}
              path={`src/images/og/${id}.webp`}
              fit={{ width: 900, height: 1200 }}
              pending={c.pending}
              onPick={c.setPicture}
              removable
              label={name}
            />
          ))}
        </div>
      </section>
      <SaveBar
        status={c.status}
        dirty={c.dirty}
        onReload={c.reload}
        onSave={() => c.save('Админка: разделы и превью')}
      />
    </div>
  )
}

// ———————————————————— Settings ————————————————————

type SettingsData = {
  testBanner: boolean
  buyLinks: { telegram: string; vk: string }
  social: { telegram: string; instagram: string; vk: string }
}

export function SettingsForm({ token }: { token: string }) {
  let c = useRepoContent<SettingsData>(token, 'src/content/site.json')
  if (!c.data) return <Loading status={c.status} />
  let data = c.data
  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Кнопка «Купить»
        </h2>
        <p className="text-xs text-muted-foreground">
          Куда она предлагает написать — одинаково для всех товаров.
        </p>
        <Field
          label="Telegram"
          value={data.buyLinks.telegram}
          onChange={(telegram) =>
            c.change({ ...data, buyLinks: { ...data.buyLinks, telegram } })
          }
        />
        <Field
          label="ВКонтакте"
          value={data.buyLinks.vk}
          onChange={(vk) =>
            c.change({ ...data, buyLinks: { ...data.buyLinks, vk } })
          }
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Соцсети</h2>
        <p className="text-xs text-muted-foreground">
          Иконки на главной и в «Обо мне».
        </p>
        <Field
          label="Telegram-канал"
          value={data.social.telegram}
          onChange={(telegram) =>
            c.change({ ...data, social: { ...data.social, telegram } })
          }
        />
        <Field
          label="Instagram"
          value={data.social.instagram}
          onChange={(instagram) =>
            c.change({ ...data, social: { ...data.social, instagram } })
          }
        />
        <Field
          label="ВКонтакте"
          value={data.social.vk}
          onChange={(vk) =>
            c.change({ ...data, social: { ...data.social, vk } })
          }
        />
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">
          Плашка «тестовая версия»
        </h2>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={data.testBanner}
            onChange={(e) =>
              c.change({ ...data, testBanner: e.target.checked })
            }
          />
          Показывать жёлтую плашку вверху всех страниц
        </label>
      </section>
      <SaveBar
        status={c.status}
        dirty={c.dirty}
        onReload={c.reload}
        onSave={() => c.save('Админка: настройки')}
      />
    </div>
  )
}
