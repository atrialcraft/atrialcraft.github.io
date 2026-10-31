import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Metadata } from 'next'

import { qrPreviewPhoto } from '@/components/qr/preview'
import { generateCardOgImage, readOgPhoto } from '@/lib/og'
import { getAllPosts } from '@/lib/posts'
import { homeHeroTitle, site } from '@/lib/site'

export const dynamic = 'force-static'
export const dynamicParams = false

/**
 * Previews of the site sections, /og/page/<id>.png. Title and description
 * come from the page's own metadata. The photo is src/images/og/<id>.webp
 * (or .jpg, .png); without a file the text takes the whole width
 */
const pages: Record<string, (() => Promise<{ metadata: Metadata }>) | null> = {
  index: null, // home: the site title and description
  about: () => import('@/app/about/page'),
  blog: () => import('@/app/blog/page'),
  projects: () => import('@/app/projects/page'),
  market: () => import('@/app/market/page'),
  instructions: () => import('@/app/instructions/page'),
  privacy: () => import('@/app/privacy/page'),
  qr: () => import('@/app/qr/page'),
  editor: () => import('@/app/editor-k7f3x9q2/page'),
}

const pagePhotosFolder = 'src/images/og'

async function pagePhoto(id: string) {
  let folder = join(/*turbopackIgnore: true*/ process.cwd(), pagePhotosFolder)
  let file = (await readdir(folder)).find((name) =>
    new RegExp(`^${id}\\.(webp|jpe?g|png)$`, 'i').test(name),
  )
  return file ? join(folder, file) : undefined
}

// Article previews: /og/<blog|instructions|projects>/<slug>.png
const postSections = ['blog', 'instructions', 'projects']

export async function generateStaticParams() {
  let posts = await getAllPosts()
  return [
    ...Object.keys(pages).map((id) => ({ section: 'page', file: `${id}.png` })),
    ...posts.map((post) => {
      let [, section, slug] = post.href.split('/')
      return { section, file: `${slug}.png` }
    }),
  ]
}

/** The first photo the article imports from its folder or a neighbour's */
async function firstPhoto(section: string, slug: string) {
  let file = join(
    /*turbopackIgnore: true*/ process.cwd(),
    'src/app',
    section,
    slug,
    'page.mdx',
  )
  let source = await readFile(file, 'utf8')
  let match = source.match(
    /^import \w+ from '(\.{1,2}\/[^']+\.(?:webp|png|jpe?g))'/m,
  )
  return match ? join(dirname(file), match[1]) : undefined
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ section: string; file: string }> },
) {
  let { section, file } = await params
  let id = file.replace(/\.png$/, '')

  if (section === 'page') {
    let load = pages[id]
    let metadata = load ? (await load()).metadata : undefined
    let photo = await pagePhoto(id)
    return generateCardOgImage({
      title: metadata ? String(metadata.title) : homeHeroTitle,
      description: String(metadata?.description ?? site.description),
      // The QR generator shows a code of its own, leading back to it
      photo: id === 'qr' ? await qrPreviewPhoto() : photo ? await readOgPhoto(photo) : undefined,
    })
  }

  if (!postSections.includes(section))
    throw new Error(`Unknown section ${section}`)
  let post = (await getAllPosts()).find((p) => p.href === `/${section}/${id}`)!
  let photo = await firstPhoto(section, id)
  return generateCardOgImage({
    title: post.title,
    description: post.description,
    photo: photo ? await readOgPhoto(photo) : undefined,
  })
}
