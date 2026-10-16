import type { PostType } from '@/lib/posts'

export const writingPath = '/writing'

export function writingHref(slug?: string) {
  return slug ? `${writingPath}/${slug}` : writingPath
}

export function isWritingPath(pathname: string) {
  return pathname === writingPath || pathname.startsWith(`${writingPath}/`)
}

export const postCtaLabel: Record<PostType, string> = {
  article: 'Читать статью',
  video: 'Смотреть видео',
  instruction: 'Открыть инструкцию',
}
