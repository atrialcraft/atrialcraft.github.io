import type { Metadata } from 'next'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import glob from 'fast-glob'

import {
  createCoverOpenGraphImages,
  createOgImageUrl,
  createOpenGraphImages,
  createTwitterMetadata,
} from '@/lib/metadata'

export type PostType = 'article' | 'video' | 'instruction' | 'project'

/**
 * public   — запись видна в списках, RSS и sitemap
 * unlisted — запись открывается только по прямой ссылке и не индексируется
 */
export type PostVisibility = 'public' | 'unlisted'

interface BaseMeta {
  title: string
  description: string
  author: string
  date: string
  coverImage?: string
  ogImage?: string
  /** По умолчанию 'public' */
  visibility?: PostVisibility
  /** Показывать ли запись в блоке «Блог» на главной. По умолчанию true */
  showOnHome?: boolean
}

interface ArticleMeta extends BaseMeta {
  type: 'article'
}

interface InstructionMeta extends BaseMeta {
  type: 'instruction'
}

/** Статья о проекте: живёт в src/app/projects/<slug>, на неё ведёт карточка на /projects */
interface ProjectMeta extends BaseMeta {
  type: 'project'
}

interface VideoMeta extends BaseMeta {
  type: 'video'
  youtubeId: string
}

export type PostMeta = ArticleMeta | InstructionMeta | ProjectMeta | VideoMeta

export type Post = PostMeta & {
  slug: string
  href: string
}

export function getYouTubeThumbnailUrl(youtubeId: string) {
  return `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`
}

function getPostShareImage(post: PostMeta) {
  if (post.ogImage) {
    return { url: post.ogImage, size: undefined }
  }

  if (post.coverImage) {
    return { url: post.coverImage, size: undefined }
  }

  if (post.type === 'video') {
    return {
      url: getYouTubeThumbnailUrl(post.youtubeId),
      size: { width: 1280, height: 720 },
    }
  }

  return null
}

/**
 * 'blog/pechka-burzhujka' for the post with this title. The post object
 * doesn't know its own folder, so it is found among the MDX files
 */
function postPath(title: string) {
  let files = glob.sync('{blog,instructions,projects}/*/page.mdx', {
    cwd: './src/app',
  })
  let escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let titleLine = new RegExp(`^\\s*title:\\s*['"]${escaped}['"]`, 'm')
  let file = files.find((f) =>
    titleLine.test(
      readFileSync(
        join(/*turbopackIgnore: true*/ process.cwd(), 'src/app', f),
        'utf8',
      ),
    ),
  )
  return file?.replace(/\/page\.mdx$/, '')
}

export function createPostMetadata(post: PostMeta): Metadata {
  const shareImage = getPostShareImage(post)
  const path = postPath(post.title)
  const openGraphImages = shareImage
    ? createCoverOpenGraphImages(shareImage.url, post.title, shareImage.size)
    : createOpenGraphImages(post.title, path ?? 'page/index')
  const twitterImage =
    shareImage?.url ?? (path ? createOgImageUrl(path) : undefined)

  return {
    title: post.title,
    description: post.description,
    ...(post.visibility === 'unlisted'
      ? { robots: { index: false, follow: false } }
      : {}),
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.date,
      images: openGraphImages,
    },
    twitter: {
      ...createTwitterMetadata(post.title, twitterImage),
      title: post.title,
      description: post.description,
    },
  }
}

type PostModule = {
  default: React.ComponentType
  post: PostMeta
}

// Записи блога живут в src/app/blog/<slug>, инструкции — в src/app/instructions/<slug>
// (так у инструкций короткий адрес /instructions/<slug> для QR-кодов),
// статьи о проектах — в src/app/projects/<slug>.
// Пути в import() должны быть статическими, иначе сборщик не найдёт файлы.
const postSections = [
  {
    path: 'blog',
    load: (file: string) =>
      import(`../app/blog/${file}`) as Promise<PostModule>,
  },
  {
    path: 'instructions',
    load: (file: string) =>
      import(`../app/instructions/${file}`) as Promise<PostModule>,
  },
  {
    path: 'projects',
    load: (file: string) =>
      import(`../app/projects/${file}`) as Promise<PostModule>,
  },
]

async function getSectionPosts({ path, load }: (typeof postSections)[number]) {
  let postFilenames = await glob('*/page.mdx', {
    cwd: `./src/app/${path}`,
  })

  return Promise.all(
    postFilenames.map(async (postFilename): Promise<Post> => {
      let { post } = await load(postFilename)
      let slug = postFilename.replace(/(\/page)?\.mdx$/, '')

      return {
        slug,
        href: `/${path}/${slug}`,
        ...post,
      }
    }),
  )
}

export async function getAllPosts() {
  let posts = (await Promise.all(postSections.map(getSectionPosts))).flat()

  return posts.sort((a, z) => +new Date(z.date) - +new Date(a.date))
}

/** Записи, которые видны в списках, RSS и sitemap */
export async function getListedPosts() {
  return (await getAllPosts()).filter((post) => post.visibility !== 'unlisted')
}

/** Записи для блока «Блог» на главной */
export async function getHomePosts(limit = 3) {
  return (await getListedPosts())
    .filter((post) => post.showOnHome !== false)
    .slice(0, limit)
}
