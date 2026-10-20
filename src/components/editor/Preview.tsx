'use client'

import { useEffect, useState, type ComponentType } from 'react'
import * as runtime from 'react/jsx-runtime'
import { evaluate } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import rehypePrism from 'rehype-prism-plus/common'
import remarkCodeFilename from 'remark-code-filename'

import { Align } from '@/components/Align'
import { Button, ogButtonClassName } from '@/components/Button'
import { CodePre } from '@/components/CodePre'
import { CopyPrompt } from '@/components/CopyPrompt'
import { FileTree } from '@/components/FileTree'
import { ImageCarousel } from '@/components/ImageCarousel'
import { Photo } from '@/components/Photo'
import { Prose } from '@/components/Prose'
import { YouTubeEmbed } from '@/components/YouTubeEmbed'
import { formatDate } from '@/lib/formatDate'
import { photoVar, type Draft, type PhotoMeta } from '@/components/editor/mdx'

type Src = string | { src: string }
const srcOf = (src: Src) => (typeof src === 'string' ? src : src.src)

function PreviewLink({
  href,
  url,
  title,
  children,
}: {
  href?: string
  url?: string
  title?: string
  favicon?: boolean
  children?: React.ReactNode
}) {
  let target = href ?? url ?? ''
  let external = /^https?:\/\//.test(target)
  return (
    <a
      href={target}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children ?? title ?? target}
    </a>
  )
}

// Same components as the site's MDX, with client-side stand-ins for the ones
// that fetch link metadata on the server.
const components = {
  a: PreviewLink,
  OgLink: PreviewLink,
  OgButton: ({
    href,
    variant = 'primary',
    children,
  }: {
    href: string
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
    children: React.ReactNode
  }) => (
    <Button
      href={href}
      variant={variant}
      className={ogButtonClassName}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </Button>
  ),
  pre: CodePre,
  Image: ({ src, alt }: { src: Src; alt?: string }) => (
    <img src={srcOf(src)} alt={alt ?? ''} />
  ),
  Photo,
  Align,
  ImageCarousel,
  FileTree,
  CopyPrompt,
  YouTubeEmbed,
}

type Compiled = ComponentType<{ components?: Record<string, unknown> }>

export function Preview({
  draft,
  photos,
  urls,
}: {
  draft: Draft
  photos: Array<PhotoMeta>
  urls: Record<string, string>
}) {
  let [Content, setContent] = useState<Compiled | null>(null)
  let [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let timer = window.setTimeout(async () => {
      // Imports can't be resolved in the browser: drop them, the components
      // are provided above; photos become plain objects with blob URLs.
      let body = draft.body.replace(/^import\s.+from\s+['"].+['"];?\s*$/gm, '')
      let ready = photos.filter((photo) => urls[photo.name])
      let photoExports = ready
        .map(
          (photo) =>
            `export const ${photoVar(photo.name)} = ${JSON.stringify({
              src: urls[photo.name],
              width: photo.width,
              height: photo.height,
            })}`,
        )
        .join('\n')
      try {
        let { default: MDXContent } = await evaluate(
          `${photoExports}\n\n${body}`,
          {
            ...runtime,
            remarkPlugins: [remarkGfm, remarkCodeFilename],
            rehypePlugins: [[rehypePrism, { ignoreMissing: true }]],
          },
        )
        if (!cancelled) {
          setContent(() => MDXContent as Compiled)
          setError(null)
        }
      } catch (problem) {
        if (!cancelled) {
          let message =
            problem instanceof Error ? problem.message : String(problem)
          let place = (problem as { line?: number }).line
          // The body starts after the photo exports and one blank line
          let offset = Math.max(ready.length, 1) + 1
          setError(place ? `Строка ${place - offset}: ${message}` : message)
        }
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [draft.body, photos, urls])

  return (
    <article className="mx-auto max-w-2xl">
      {error && (
        <p className="mb-8 rounded-xl bg-red-500/10 p-4 text-sm text-red-600 dark:text-red-400">
          Ошибка в тексте — так статья не соберётся. {error}
        </p>
      )}
      <header className="flex flex-col">
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl">
          {draft.title || 'Без заголовка'}
        </h1>
        <time className="order-first flex items-center text-base text-muted-foreground">
          <span className="h-4 w-0.5 rounded-full bg-border/50" />
          <span className="ml-3">
            {/^\d{4}-\d{2}-\d{2}$/.test(draft.date)
              ? formatDate(draft.date)
              : draft.date}
          </span>
        </time>
        {draft.description && (
          <p className="mt-6 text-base text-muted-foreground">
            {draft.description}
          </p>
        )}
      </header>
      {draft.type === 'video' && draft.youtubeId && (
        <YouTubeEmbed id={draft.youtubeId} title={draft.title} />
      )}
      <Prose className="mt-8">
        {Content && <Content components={components} />}
      </Prose>
    </article>
  )
}
