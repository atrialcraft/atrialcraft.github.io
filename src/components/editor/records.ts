// Published posts and products: listing them from the repository, opening
// one into the Верстак form and deleting it.

import {
  commitChanges,
  getTree,
  readBlob,
  readText,
  type TreeEntry,
} from '@/components/editor/github'
import {
  emptyDraft,
  type Draft,
  type DraftType,
  type PhotoMeta,
} from '@/components/editor/mdx'
import {
  asNumber,
  asString,
  isRef,
  parsePage,
  type Value,
} from '@/components/editor/parse'
import { clearPhotos, putPhoto, saveDraft } from '@/components/editor/storage'

export const sections = ['blog', 'instructions', 'projects', 'market'] as const
export type Section = (typeof sections)[number]

export type RecordItem = {
  section: Section
  slug: string
  type: DraftType
  title: string
  description: string
  date: string
  unlisted: boolean
  price?: number
  order?: number
  available: boolean
  /** Path of the first photo, for a thumbnail */
  cover?: string
  /** Set when the file couldn't be read: Верстак can't open it */
  error?: string
}

/** Repository path of a file imported in a page: './01.webp', '../../x/02.webp' */
const resolve = (section: string, slug: string, path: string) =>
  new URL(path, `https://repo/src/app/${section}/${slug}/`).pathname.slice(1)

const pagePath =
  /^src\/app\/(blog|instructions|projects|market)\/([^/]+)\/page\.mdx$/

/** Runs the jobs a few at a time: GitHub doesn't like a burst of requests */
async function inBatches<T, R>(
  items: T[],
  size: number,
  job: (item: T) => Promise<R>,
) {
  let results: R[] = []
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(job))))
  }
  return results
}

export async function listRecords(token: string) {
  let tree = await getTree(token)
  let pages = tree.filter((entry) => pagePath.test(entry.path))
  let records = await inBatches(
    pages,
    6,
    async (entry): Promise<RecordItem> => {
      let [, section, slug] = pagePath.exec(entry.path)! as unknown as [
        string,
        Section,
        string,
      ]
      let base = {
        section,
        slug,
        unlisted: false,
        available: true,
        description: '',
        date: '',
      }
      try {
        let page = parsePage(await readText(token, entry.sha))
        let f = page.fields
        let firstImage = page.fileImports[0]
        let cover = firstImage
          ? resolve(section, slug, firstImage.path)
          : undefined
        if (page.name === 'product') {
          let images = Array.isArray(f.images)
            ? f.images
            : f.image
              ? [f.image]
              : []
          let coverVar = images.find(isRef)?.ref
          let coverImport = page.fileImports.find(
            (i) => i.variable === coverVar,
          )
          return {
            ...base,
            type: 'product',
            title: asString(f.name),
            description: asString(f.description),
            price: asNumber(f.price),
            order: asNumber(f.order),
            available: f.available !== false,
            cover: coverImport
              ? resolve(section, slug, coverImport.path)
              : undefined,
          }
        }
        return {
          ...base,
          type: (asString(f.type) || 'article') as DraftType,
          title: asString(f.title),
          description: asString(f.description),
          date: asString(f.date),
          unlisted: f.visibility === 'unlisted',
          cover,
        }
      } catch (error) {
        return {
          ...base,
          type: section === 'market' ? 'product' : 'article',
          title: slug,
          error: (error as Error).message,
        }
      }
    },
  )
  return { tree, records }
}

const imageFile = /\.(webp|png|jpe?g|gif)$/i

/** Size of a picture without drawing it */
async function dimensions(blob: Blob) {
  try {
    let bitmap = await createImageBitmap(blob)
    let size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return { width: 1600, height: 1067 }
  }
}

const postFields = [
  'type',
  'author',
  'date',
  'title',
  'description',
  'youtubeId',
  'visibility',
  'showOnHome',
]
const productFields = [
  'name',
  'description',
  'price',
  'images',
  'image',
  'instruction',
  'order',
  'available',
]

/**
 * Reads a record into the draft storage of this browser: the form fields,
 * the text and every photo of its folder
 */
export async function openRecord(
  token: string,
  tree: TreeEntry[],
  section: Section,
  slug: string,
) {
  let folder = `src/app/${section}/${slug}/`
  let page = tree.find((e) => e.path === `${folder}page.mdx`)
  if (!page) throw new Error('Запись не найдена: возможно, её уже удалили')
  let parsed = parsePage(await readText(token, page.sha))
  let f = parsed.fields

  // Photos of the folder go to the browser storage under their own names
  await clearPhotos()
  let photos: PhotoMeta[] = []
  let files = tree.filter(
    (e) =>
      e.type === 'blob' &&
      e.path.startsWith(folder) &&
      !e.path.slice(folder.length).includes('/') &&
      imageFile.test(e.path),
  )
  await inBatches(files, 4, async (entry) => {
    let name = entry.path.slice(folder.length)
    let bytes = await readBlob(token, entry.sha)
    let type = name.endsWith('.png')
      ? 'image/png'
      : name.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg'
    let blob = new Blob([bytes as BlobPart], { type })
    await putPhoto(name, blob)
    let variable = parsed.fileImports.find(
      (i) => i.path === `./${name}`,
    )?.variable
    photos.push({
      name,
      variable,
      ...(await dimensions(blob)),
      size: blob.size,
    })
  })
  photos.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  )

  // Imports from other folders and other modules stay as they are
  let keptImports = [
    ...parsed.otherImports,
    ...parsed.fileImports
      .filter((i) => !i.path.startsWith('./'))
      .map((i) => `import ${i.variable} from '${i.path}'`),
  ]
  let known = parsed.name === 'product' ? productFields : postFields
  let extraFields = Object.fromEntries(
    Object.entries(f).filter(([key]) => !known.includes(key)),
  ) as Record<string, Value>

  let draft: Draft = {
    ...emptyDraft(),
    slug,
    slugTouched: true,
    body: parsed.body,
    keptImports,
    extraFields,
    origin: { section, slug },
  }
  if (parsed.name === 'product') {
    let images = Array.isArray(f.images) ? f.images : f.image ? [f.image] : []
    let byVariable = (ref: string) =>
      photos.find((p) => p.variable === ref)?.name
    Object.assign(draft, {
      type: 'product',
      title: asString(f.name),
      description: asString(f.description),
      price: asNumber(f.price)?.toString() ?? '',
      available: f.available !== false,
      instruction: asString(f.instruction),
      order: asNumber(f.order)?.toString() ?? '',
      gallery: images
        .filter(isRef)
        .map((r) => byVariable(r.ref))
        .filter((n): n is string => Boolean(n)),
    })
  } else {
    Object.assign(draft, {
      type: (asString(f.type) || 'article') as DraftType,
      title: asString(f.title),
      description: asString(f.description),
      date: asString(f.date) || draft.date,
      youtubeId: asString(f.youtubeId),
      unlisted: f.visibility === 'unlisted',
      showOnHome: f.showOnHome !== false,
    })
  }
  saveDraft({ draft, photos })
}

/** Deletes the folder of a record from the site */
export async function deleteRecord(
  token: string,
  section: string,
  slug: string,
  title: string,
) {
  let tree = await getTree(token)
  let folder = `src/app/${section}/${slug}/`
  let files = tree.filter((e) => e.type === 'blob' && e.path.startsWith(folder))
  if (!files.length) throw new Error('Запись уже удалена')
  return commitChanges(
    token,
    files.map((e) => ({ path: e.path, bytes: null })),
    `Удаление: ${title}`,
  )
}
