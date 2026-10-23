// Builds page.mdx for a blog post, instruction, project or product from the
// Верстак draft.

import type { Value } from '@/components/editor/parse'

export type DraftType =
  'article' | 'video' | 'instruction' | 'project' | 'product'

/** Where an opened record lives on the site: src/app/<section>/<slug> */
export type Origin = { section: string; slug: string }

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
  // Products
  /** Price in roubles as typed; empty — «Цена по запросу» */
  price: string
  available: boolean
  /** Link of the instruction, e.g. /instructions/zlynka */
  instruction: string
  /** Place in the shop as typed: smaller is higher */
  order: string
  /** Photos of the product carousel, in order (file names) */
  gallery: Array<string>
  // Editing a published record
  /** Set when the record was opened from the site: saving replaces it */
  origin: Origin | null
  /** Imports of photos from other folders and other imports, kept as they are */
  keptImports: Array<string>
  /** Fields of the record the form doesn't know, written back unchanged */
  extraFields: Record<string, Value>
}

export type PhotoMeta = {
  /** File name inside the post folder, e.g. 01.webp */
  name: string
  /** Variable used in the text; by default photo01 for 01.webp */
  variable?: string
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
    price: '',
    available: true,
    instruction: '',
    order: '',
    gallery: [],
    origin: null,
    keptImports: [],
    extraFields: {},
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
      : type === 'product'
        ? 'market'
        : 'blog'
}

/** 01.webp → photo01 */
export function photoVar(name: string) {
  return 'photo' + name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9]/g, '')
}

/** The variable of a photo in the text: its own or the default one */
export const varOf = (photo: PhotoMeta) =>
  photo.variable ?? photoVar(photo.name)

export function photoSnippet(photo: PhotoMeta) {
  return `<Photo src={${varOf(photo)}} alt="" caption="" size="full" align="center" />`
}

export function carouselSnippet(photos: Array<PhotoMeta>) {
  let items = photos
    .map((photo) => `    { src: ${varOf(photo)}, alt: '', caption: '' },`)
    .join('\n')
  return `<ImageCarousel\n  images={[\n${items}\n  ]}\n/>`
}

/** A string in single quotes, as prettier writes them in the project */
export const quote = (text: string) =>
  `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`

/** A value of a record field as JavaScript: strings quoted, photos by name */
export function serialize(value: Value): string {
  if (value === null) return 'null'
  if (typeof value === 'string') return quote(value)
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value)
  if (Array.isArray(value)) return `[${value.map(serialize).join(', ')}]`
  if ('ref' in value && typeof value.ref === 'string') return value.ref
  return `{ ${Object.entries(value)
    .map(
      ([key, v]) =>
        `${/^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key)}: ${serialize(v as Value)}`,
    )
    .join(', ')} }`
}

// Photo, ImageCarousel and the other components are available in every
// MDX page (mdx-components.tsx), only the photos need imports
function imports(draft: Draft, photos: Array<PhotoMeta>, layout: string[]) {
  return [
    ...layout,
    ...draft.keptImports,
    ...photos.map((photo) => `import ${varOf(photo)} from './${photo.name}'`),
  ]
}

const extraLines = (draft: Draft) =>
  Object.entries(draft.extraFields).map(
    ([key, value]) => `  ${key}: ${serialize(value)},`,
  )

function buildProductMdx(draft: Draft, photos: Array<PhotoMeta>) {
  let gallery = draft.gallery
    .map((name) => photos.find((photo) => photo.name === name))
    .filter((photo) => photo !== undefined)
  let price = parseFloat(draft.price.replace(/\s/g, '').replace(',', '.'))
  let order = parseInt(draft.order, 10)
  let lines = [
    ...imports(draft, photos, [
      "import { ProductLayout } from '@/components/ProductLayout'",
      "import { createProductMetadata } from '@/lib/products'",
    ]),
    '',
    'export const product = {',
    `  name: ${quote(draft.title)},`,
    `  description: ${quote(draft.description)},`,
    ...(Number.isFinite(price) ? [`  price: ${price},`] : []),
    ...(gallery.length
      ? [`  images: [${gallery.map(varOf).join(', ')}],`]
      : []),
    ...(draft.instruction
      ? [`  instruction: ${quote(draft.instruction)},`]
      : []),
    ...(Number.isFinite(order) ? [`  order: ${order},`] : []),
    ...(draft.available ? [] : ['  available: false,']),
    ...extraLines(draft),
    '}',
    '',
    `export const metadata = createProductMetadata(product, ${quote(draft.slug)})`,
    '',
    'export default ({ children }) => (',
    '  <ProductLayout product={product}>{children}</ProductLayout>',
    ')',
    '',
    draft.body.trim(),
    '',
  ]
  return lines.join('\n')
}

export function buildPageMdx(draft: Draft, photos: Array<PhotoMeta>) {
  if (draft.type === 'product') return buildProductMdx(draft, photos)
  let lines = [
    ...imports(draft, photos, [
      "import { PostLayout } from '@/components/PostLayout'",
      "import { createPostMetadata } from '@/lib/posts'",
    ]),
    '',
    'export const post = {',
    `  type: '${draft.type}',`,
    "  author: 'Daniil Kolbunov',",
    `  date: '${draft.date}',`,
    `  title: ${quote(draft.title)},`,
    `  description: ${quote(draft.description)},`,
  ]
  if (draft.type === 'video') {
    lines.push(`  youtubeId: ${quote(draft.youtubeId)},`)
  }
  if (draft.unlisted) {
    lines.push("  visibility: 'unlisted',")
  }
  if (!draft.showOnHome) {
    lines.push('  showOnHome: false,')
  }
  lines.push(
    ...extraLines(draft),
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
  let slug = {
    label: 'Адрес: латиница, цифры и дефисы',
    ok: /^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug),
  }
  if (draft.type === 'product') {
    let price = draft.price.replace(/\s/g, '').replace(',', '.')
    return [
      {
        label: 'Название без точки в конце',
        ok: Boolean(draft.title.trim()) && !/[^.]\.$/.test(draft.title.trim()),
      },
      {
        label: 'Описание до 160 символов',
        ok:
          Boolean(draft.description.trim()) && draft.description.length <= 160,
      },
      slug,
      {
        label: 'Цена числом или пусто',
        ok: !price || Number.isFinite(Number(price)),
      },
    ]
  }
  return [
    // Russian typography: no full stop after a heading
    {
      label: 'Заголовок без точки в конце',
      ok: Boolean(draft.title.trim()) && !/[^.]\.$/.test(draft.title.trim()),
    },
    { label: 'Описание', ok: Boolean(draft.description.trim()) },
    slug,
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
