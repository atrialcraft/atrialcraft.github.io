import type { Metadata } from 'next'

import { ogSize } from '@/lib/ogSize'
import { homeHeroTitle, site } from '@/lib/site'

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
}

/**
 * Preview picture drawn at build time (src/app/og): 'page/market' for a
 * section, 'blog/pechka-burzhujka' for an article
 */
export function createOgImageUrl(path: string) {
  return `${getSiteUrl()}/og/${path}.png`
}

export function createOpenGraphImages(title: string, path = 'page/index') {
  return [
    {
      url: createOgImageUrl(path),
      width: ogSize.width,
      height: ogSize.height,
      alt: title,
    },
  ]
}

export function createCoverOpenGraphImages(
  coverImage: string,
  alt: string,
  size?: { width: number; height: number },
) {
  return [
    {
      url: coverImage,
      alt,
      ...(size ? { width: size.width, height: size.height } : {}),
    },
  ]
}

export function createTwitterMetadata(
  title: string,
  imageUrl?: string,
): NonNullable<Metadata['twitter']> {
  return {
    card: 'summary_large_image',
    images: [imageUrl ?? createOgImageUrl('page/index')],
  }
}

export function createPageMetadata({
  title,
  description,
  page,
}: {
  title: string
  description: string
  /** Preview id, see `pages` in src/app/og/[section]/[file]/route.tsx */
  page: string
}): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: createOpenGraphImages(title, `page/${page}`),
    },
    twitter: {
      ...createTwitterMetadata(title, createOgImageUrl(`page/${page}`)),
      description,
    },
  }
}

export const siteOpenGraphImages = createOpenGraphImages(homeHeroTitle)

export const siteTwitterMetadata = createTwitterMetadata(
  site.title,
  createOgImageUrl('page/index'),
)
