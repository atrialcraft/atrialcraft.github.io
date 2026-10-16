import type { Metadata } from 'next'
import glob from 'fast-glob'

import {
  createCoverOpenGraphImages,
  createOpenGraphImages,
  createTwitterMetadata,
} from '@/lib/metadata'

export type PostType = 'article' | 'video' | 'instruction'

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
  /** Показывать ли запись в блоке «Свежее» на главной. По умолчанию true */
  showOnHome?: boolean
}

interface ArticleMeta extends BaseMeta {
  type: 'article'
}

interface InstructionMeta extends BaseMeta {
  type: 'instruction'
}

interface VideoMeta extends BaseMeta {
  type: 'video'
  youtubeId: string
}

export type PostMeta = ArticleMeta | InstructionMeta | VideoMeta

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

export function createPostMetadata(post: PostMeta): Metadata {
  const shareImage = getPostShareImage(post)
  const openGraphImages = shareImage
    ? createCoverOpenGraphImages(shareImage.url, post.title, shareImage.size)
    : createOpenGraphImages(post.title)
  const twitterImage = shareImage?.url

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

async function importPost(postFilename: string): Promise<Post> {
  let { post } = (await import(`../app/writing/${postFilename}`)) as {
    default: React.ComponentType
    post: PostMeta
  }

  let slug = postFilename.replace(/(\/page)?\.mdx$/, '')

  return {
    slug,
    href: `/writing/${slug}`,
    ...post,
  }
}

export async function getAllPosts() {
  let postFilenames = await glob('*/page.mdx', {
    cwd: './src/app/writing',
  })

  let posts = await Promise.all(postFilenames.map(importPost))

  return posts.sort((a, z) => +new Date(z.date) - +new Date(a.date))
}

/** Записи, которые видны в списках, RSS и sitemap */
export async function getListedPosts() {
  return (await getAllPosts()).filter((post) => post.visibility !== 'unlisted')
}

/** Записи для блока «Свежее» на главной */
export async function getHomePosts(limit = 3) {
  return (await getListedPosts())
    .filter((post) => post.showOnHome !== false)
    .slice(0, limit)
}
