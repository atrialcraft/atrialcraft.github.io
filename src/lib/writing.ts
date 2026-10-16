import type { PostType } from '@/lib/posts'

export const writingPath = '/writing'

export function writingHref(slug?: string) {
  return slug ? `${writingPath}/${slug}` : writingPath
}

export const instructionsPath = '/instructions'

/** Инструкции тоже относятся к разделу «Записи» в меню */
export function isWritingPath(pathname: string) {
  return [writingPath, instructionsPath].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  )
}

export const postCtaLabel: Record<PostType, string> = {
  article: 'Читать статью',
  video: 'Смотреть видео',
  instruction: 'Открыть инструкцию',
}
