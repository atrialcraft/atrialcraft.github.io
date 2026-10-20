// Builds page.mdx for a blog post, instruction or project from the Верстак draft.

export type DraftType = 'article' | 'video' | 'instruction' | 'project'

export type Draft = {
  type: DraftType
  title: string
  description: string
  date: string
  slug: string
  /** true once the slug was edited by hand: stop deriving it from the title */
  slugTouched: boolean
  youtubeId: string
  unlisted: boolean
  showOnHome: boolean
  body: string
}

export type PhotoMeta = {
  /** File name inside the post folder, e.g. 01.jpg */
  name: string
  width: number
  height: number
  size: number
}

export function today() {
  let now = new Date()
  let pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function emptyDraft(): Draft {
  return {
    type: 'article',
    title: '',
    description: '',
    date: today(),
    slug: '',
    slugTouched: false,
    youtubeId: '',
    unlisted: false,
    showOnHome: true,
    body: '',
  }
}

const translit: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'j',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

/** «Печка-буржуйка из стали» → pechka-burzhujka-iz-stali */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .split('')
    .map((char) => translit[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function sectionFor(type: DraftType) {
  return type === 'instruction'
    ? 'instructions'
    : type === 'project'
      ? 'projects'
      : 'blog'
}

/** 01.jpg → photo01 */
export function photoVar(name: string) {
  return 'photo' + name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '')
}

export function photoSnippet(photo: PhotoMeta) {
  return `<Photo src={${photoVar(photo.name)}} alt="" caption="" size="full" align="center" />`
}

export function carouselSnippet(photos: Array<PhotoMeta>) {
  let items = photos
    .map(
      (photo) => `    { src: ${photoVar(photo.name)}, alt: '', caption: '' },`,
    )
    .join('\n')
  return `<ImageCarousel\n  images={[\n${items}\n  ]}\n/>`
}

const carouselImport =
  "import { ImageCarousel } from '@/components/ImageCarousel'"

export function buildPageMdx(draft: Draft, photos: Array<PhotoMeta>) {
  // The carousel needs an import; add it unless the text already has one
  let needsCarousel =
    draft.body.includes('<ImageCarousel') &&
    !draft.body.includes(carouselImport)
  let lines = [
    "import { PostLayout } from '@/components/PostLayout'",
    "import { createPostMetadata } from '@/lib/posts'",
    ...(needsCarousel ? [carouselImport] : []),
    ...photos.map(
      (photo) => `import ${photoVar(photo.name)} from './${photo.name}'`,
    ),
    '',
    'export const post = {',
    `  type: '${draft.type}',`,
    "  author: 'Daniil Kolbunov',",
    `  date: '${draft.date}',`,
    `  title: ${JSON.stringify(draft.title)},`,
    `  description: ${JSON.stringify(draft.description)},`,
  ]
  if (draft.type === 'video') {
    lines.push(`  youtubeId: ${JSON.stringify(draft.youtubeId)},`)
  }
  if (draft.unlisted) {
    lines.push("  visibility: 'unlisted',")
  }
  if (!draft.showOnHome) {
    lines.push('  showOnHome: false,')
  }
  lines.push(
    '}',
    '',
    'export const metadata = createPostMetadata(post)',
    '',
    'export default ({ children }) => <PostLayout post={post}>{children}</PostLayout>',
    '',
    draft.body.trim(),
    '',
  )
  return lines.join('\n')
}

/** What has to be filled in before publishing; `ok` once it's fine */
export function checklist(draft: Draft) {
  return [
    { label: 'Заголовок', ok: Boolean(draft.title.trim()) },
    { label: 'Описание', ok: Boolean(draft.description.trim()) },
    {
      label: 'Адрес: латиница, цифры и дефисы',
      ok: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug),
    },
    {
      label: 'Дата',
      ok: /^\d{4}-\d{2}-\d{2}$/.test(draft.date),
    },
    ...(draft.type === 'video'
      ? [{ label: 'Код ролика YouTube', ok: Boolean(draft.youtubeId.trim()) }]
      : []),
  ]
}

/** Problems that would break the build or the URL */
export function validate(draft: Draft) {
  return checklist(draft)
    .filter((item) => !item.ok)
    .map((item) => item.label)
}
