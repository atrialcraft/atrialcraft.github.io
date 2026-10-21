import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { Metadata } from 'next'

import { generateCardOgImage, readOgPhoto } from '@/lib/og'
import { getAllPosts } from '@/lib/posts'
import { homeHeroTitle, site } from '@/lib/site'

export const dynamic = 'force-static'
export const dynamicParams = false

/**
 * Previews of the site sections, /og/page/<id>.png. Title and description
 * come from the page's own metadata, the photo is picked here
 */
const pages: Record<
  string,
  { load?: () => Promise<{ metadata: Metadata }>; photo?: string }
> = {
  index: { photo: 'src/images/home/03.webp' },
  about: {
    load: () => import('@/app/about/page'),
    photo: 'src/images/me.webp',
  },
  blog: {
    load: () => import('@/app/blog/page'),
    photo: 'src/images/home/02.webp',
  },
  projects: {
    load: () => import('@/app/projects/page'),
    photo: 'src/images/home/01.webp',
  },
  market: {
    load: () => import('@/app/market/page'),
    photo: 'src/app/market/zlynka/01.webp',
  },
  instructions: {
    load: () => import('@/app/instructions/page'),
    photo: 'src/app/instructions/zlynka/64.webp',
  },
  privacy: { load: () => import('@/app/privacy/page') },
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
    let page = pages[id]
    let metadata = page.load ? (await page.load()).metadata : undefined
    return generateCardOgImage({
      title: metadata ? String(metadata.title) : homeHeroTitle,
      description: String(metadata?.description ?? site.description),
      photo: page.photo
        ? await readOgPhoto(
            join(/*turbopackIgnore: true*/ process.cwd(), page.photo),
          )
        : undefined,
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
