import type { MetadataRoute } from 'next'

import { getListedPosts } from '@/lib/posts'

export const dynamic = 'force-static'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts = await getListedPosts()

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/about`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/writing`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/projects`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/gear`,
      lastModified: new Date(),
    },
    ...posts.map((post) => ({
      url: `${siteUrl}${post.href}`,
      lastModified: new Date(post.date),
    })),
  ]
}
