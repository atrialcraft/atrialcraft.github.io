import type { PostType } from '@/lib/posts'

export const blogPath = '/blog'

export function blogHref(slug?: string) {
  return slug ? `${blogPath}/${slug}` : blogPath
}

export const instructionsPath = '/instructions'

/** Инструкции тоже относятся к разделу «Блог» в меню */
export function isBlogPath(pathname: string) {
  return [blogPath, instructionsPath].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

export const postCtaLabel: Record<PostType, string> = {
  article: 'Читать статью',
  video: 'Смотреть видео',
  instruction: 'Открыть инструкцию',
}
