'use client'

// Верстак: the admin of the site. Posts and products are written and
// edited in the editor; the home page, «Обо мне», «Проекты», section texts
// and settings have their own forms. Everything goes straight to the
// repository through GitHub, the site rebuilds itself in 2–3 minutes.

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowPathIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  HomeIcon,
  PencilSquareIcon,
  RectangleGroupIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  UserIcon,
} from '@heroicons/react/24/outline'

import { Button } from '@/components/Button'
import {
  AboutForm,
  HomeForm,
  ProjectsForm,
  SectionsForm,
  SettingsForm,
  inputClass,
} from '@/components/editor/ContentForms'
import { Editor } from '@/components/editor/Editor'
import {
  checkToken,
  loadToken,
  readBlob,
  repoUrl,
  saveToken,
  type TreeEntry,
} from '@/components/editor/github'
import { emptyDraft, type DraftType } from '@/components/editor/mdx'
import {
  listRecords,
  openRecord,
  type RecordItem,
} from '@/components/editor/records'
import { clearPhotos, loadDraft, saveDraft } from '@/components/editor/storage'
import { formatDate } from '@/lib/formatDate'
import { formatPrice } from '@/lib/price'
import { cn } from '@/lib/utils'

const views = [
  { id: 'editor', label: 'Редактор', icon: PencilSquareIcon },
  { id: 'posts', label: 'Статьи', icon: DocumentTextIcon },
  { id: 'products', label: 'Товары', icon: ShoppingBagIcon },
  { id: 'home', label: 'Главная', icon: HomeIcon },
  { id: 'about', label: 'Обо мне', icon: UserIcon },
  { id: 'projects', label: 'Проекты', icon: Squares2X2Icon },
  { id: 'sections', label: 'Разделы', icon: RectangleGroupIcon },
  { id: 'settings', label: 'Настройки', icon: Cog6ToothIcon },
] as const

type View = (typeof views)[number]['id']

const typeNames: Record<DraftType, string> = {
  article: 'Статья',
  video: 'Видео',
  instruction: 'Инструкция',
  project: 'Проект',
  product: 'Товар',
}

const viewKey = 'atrial-editor-view'

function GitHubBar({
  token,
  onToken,
}: {
  token: string
  onToken: (token: string) => void
}) {
  let [value, setValue] = useState('')
  let [open, setOpen] = useState(false)
  let [state, setState] = useState<{ busy?: boolean; error?: string }>({})

  async function connect() {
    setState({ busy: true })
    try {
      await checkToken(value.trim())
      saveToken(value.trim())
      onToken(value.trim())
      setValue('')
      setOpen(false)
      setState({})
    } catch (error) {
      setState({ error: (error as Error).message })
    }
  }

  if (token) {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-green-500" /> GitHub подключён
        </span>
        <button
          type="button"
          className="underline-offset-2 hover:underline"
          onClick={() => {
            if (!window.confirm('Забыть токен в этом браузере?')) return
            saveToken('')
            onToken('')
          }}
        >
          Отключить
        </button>
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {open ? (
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
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={cn(inputClass, 'w-64')}
          />
          <Button type="submit" disabled={state.busy || !value.trim()}>
            Подключить
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Button>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Подключить GitHub
        </Button>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  )
}

function Thumbnail({
  token,
  tree,
  path,
}: {
  token: string
  tree: TreeEntry[]
  path?: string
}) {
  let [url, setUrl] = useState<string | null>(null)
  let entry = path ? tree.find((e) => e.path === path) : undefined
  useEffect(() => {
    if (!entry) return
    let created: string | null = null
    let cancelled = false
    readBlob(token, entry.sha).then((bytes) => {
      if (cancelled) return
      created = URL.createObjectURL(new Blob([bytes as BlobPart]))
      setUrl(created)
    })
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [token, entry])
  return (
    <div className="aspect-square w-14 flex-none overflow-hidden rounded-lg bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url && <img src={url} alt="" className="size-full object-cover" />}
    </div>
  )
}

function RecordList({
  token,
  kind,
  data,
  loading,
  error,
  onReload,
  onOpen,
  onNew,
}: {
  token: string
  kind: 'posts' | 'products'
  data: { tree: TreeEntry[]; records: RecordItem[] } | null
  loading: boolean
  error: string | null
  onReload: () => void
  onOpen: (record: RecordItem) => void
  onNew: (type: DraftType) => void
}) {
  let [filter, setFilter] = useState<
    'all' | 'blog' | 'instructions' | 'projects'
  >('all')
  let [query, setQuery] = useState('')
  let records = (data?.records ?? [])
    .filter((r) =>
      kind === 'products' ? r.section === 'market' : r.section !== 'market',
    )
    .filter(
      (r) => kind === 'products' || filter === 'all' || r.section === filter,
    )
    .filter(
      (r) =>
        !query ||
        `${r.title} ${r.slug}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      kind === 'products'
        ? (a.order ?? 1e9) - (b.order ?? 1e9)
        : b.date.localeCompare(a.date),
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {kind === 'posts' ? (
            <>
              <Button onClick={() => onNew('article')}>Новая статья</Button>
              <Button variant="secondary" onClick={() => onNew('instruction')}>
                Новая инструкция
              </Button>
              <Button variant="secondary" onClick={() => onNew('project')}>
                Статья о проекте
              </Button>
            </>
          ) : (
            <Button onClick={() => onNew('product')}>Новый товар</Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            className={cn(inputClass, 'w-48')}
            placeholder="Поиск"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            variant="ghost"
            onClick={onReload}
            disabled={loading}
            aria-label="Обновить список"
          >
            <ArrowPathIcon
              className={cn('size-4', loading && 'animate-spin')}
            />
          </Button>
        </div>
      </div>
      {kind === 'posts' && (
        <div className="flex flex-wrap gap-1">
          {(
            [
              ['all', 'Все'],
              ['blog', 'Блог'],
              ['instructions', 'Инструкции'],
              ['projects', 'Проекты'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition',
                filter === id
                  ? 'bg-foreground text-background'
                  : 'bg-muted text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && loading && (
        <p className="text-sm text-muted-foreground">Загружаю с сайта…</p>
      )}
      {data && (
        <ul className="divide-y divide-border rounded-xl ring-1 ring-border">
          {records.map((r) => (
            <li key={`${r.section}/${r.slug}`}>
              <button
                type="button"
                disabled={Boolean(r.error)}
                onClick={() => onOpen(r)}
                className="flex w-full items-center gap-4 p-3 text-left transition hover:bg-muted/60 disabled:cursor-not-allowed"
              >
                <Thumbnail token={token} tree={data.tree} path={r.cover} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {r.title || r.slug}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.error
                      ? `Не открывается: ${r.error}`
                      : kind === 'products'
                        ? `${formatPrice(r.price)}${r.available ? '' : ' · не в продаже'} · /market/${r.slug}`
                        : `${typeNames[r.type]} · ${r.date ? formatDate(r.date) : 'без даты'}${r.unlisted ? ' · по ссылке' : ''} · /${r.section}/${r.slug}`}
                  </p>
                </div>
                <span className="text-sm text-accent">Открыть</span>
              </button>
            </li>
          ))}
          {!records.length && (
            <li className="p-4 text-sm text-muted-foreground">
              Ничего не найдено
            </li>
          )}
        </ul>
      )}
    </div>
  )
}

export function Admin() {
  let [token, setToken] = useState('')
  let [view, setView] = useState<View>('editor')
  let [editorKey, setEditorKey] = useState(0)
  let [records, setRecords] = useState<{
    tree: TreeEntry[]
    records: RecordItem[]
  } | null>(null)
  let [loading, setLoading] = useState(false)
  let [error, setError] = useState<string | null>(null)
  let [opening, setOpening] = useState<string | null>(null)

  useEffect(() => {
    setToken(loadToken())
    try {
      let saved = window.localStorage.getItem(viewKey) as View | null
      if (saved && views.some((v) => v.id === saved)) setView(saved)
    } catch {}
  }, [])

  let go = (next: View) => {
    setView(next)
    try {
      window.localStorage.setItem(viewKey, next)
    } catch {}
  }

  let reload = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError(null)
    try {
      setRecords(await listRecords(token))
    } catch (problem) {
      setError((problem as Error).message)
    }
    setLoading(false)
  }, [token])

  // The lists are needed in the editor too: instructions for products
  useEffect(() => {
    if (token) reload()
  }, [token, reload])

  let instructions = (records?.records ?? [])
    .filter((r) => r.section === 'instructions' && !r.error)
    .map((r) => ({ href: `/instructions/${r.slug}`, title: r.title }))

  /** The current draft has something worth keeping */
  let draftHasWork = () => {
    let { draft } = loadDraft()
    return Boolean(draft.title.trim() || draft.body.trim())
  }

  async function open(record: RecordItem) {
    if (!records) return
    let { draft } = loadDraft()
    let same =
      draft.origin?.section === record.section &&
      draft.origin?.slug === record.slug
    if (same) {
      go('editor')
      return
    }
    if (
      draftHasWork() &&
      !window.confirm(
        'В редакторе есть черновик. Открыть эту запись вместо него? Несохранённый черновик пропадёт.',
      )
    )
      return
    setOpening(record.title)
    try {
      await openRecord(token, records.tree, record.section, record.slug)
      setEditorKey((k) => k + 1)
      go('editor')
    } catch (problem) {
      window.alert((problem as Error).message)
    }
    setOpening(null)
  }

  async function startNew(type: DraftType) {
    if (
      draftHasWork() &&
      !window.confirm(
        'В редакторе есть черновик. Начать новую запись вместо него? Несохранённый черновик пропадёт.',
      )
    )
      return
    await clearPhotos()
    saveDraft({
      draft: { ...emptyDraft(), type, showOnHome: type === 'article' },
      photos: [],
    })
    setEditorKey((k) => k + 1)
    go('editor')
  }

  let needsToken = view !== 'editor' && !token

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Верстак
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Управление сайтом. Изменения уходят в{' '}
            <a
              href={repoUrl}
              target="_blank"
              className="underline-offset-2 hover:underline"
            >
              репозиторий
            </a>{' '}
            и появляются на сайте через 2–3 минуты.
          </p>
        </div>
        <GitHubBar token={token} onToken={setToken} />
      </div>

      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {views.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => go(id)}
            aria-current={view === id ? 'page' : undefined}
            className={cn(
              'flex flex-none items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition',
              view === id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      {opening && (
        <p className="text-sm text-muted-foreground">
          Открываю «{opening}», загружаю фото…
        </p>
      )}

      {needsToken ? (
        <p className="rounded-xl bg-muted/60 p-6 text-sm text-muted-foreground">
          Чтобы открыть этот раздел, подключите GitHub вверху: Верстак читает и
          сохраняет сайт прямо в репозитории. Как создать токен — в{' '}
          <a
            href="/instructions/kak-pisat-stati"
            target="_blank"
            className="underline"
          >
            инструкции
          </a>
          .
        </p>
      ) : (
        <>
          {view === 'editor' && (
            <Editor key={editorKey} token={token} instructions={instructions} />
          )}
          {(view === 'posts' || view === 'products') && (
            <RecordList
              token={token}
              kind={view}
              data={records}
              loading={loading}
              error={error}
              onReload={reload}
              onOpen={open}
              onNew={startNew}
            />
          )}
          {view === 'home' && <HomeForm token={token} />}
          {view === 'about' && <AboutForm token={token} />}
          {view === 'projects' && <ProjectsForm token={token} />}
          {view === 'sections' && <SectionsForm token={token} />}
          {view === 'settings' && <SettingsForm token={token} />}
        </>
      )}
    </div>
  )
}
