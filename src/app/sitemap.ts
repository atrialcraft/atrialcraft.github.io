import type { MetadataRoute } from 'next'

import { getListedPosts } from '@/lib/posts'
import { getAllProducts } from '@/lib/products'

export const dynamic = 'force-static'

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let posts = await getListedPosts()
  let products = await getAllProducts()

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
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/instructions`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/projects`,
      lastModified: new Date(),
    },
    {
      url: `${siteUrl}/market`,
      lastModified: new Date(),
    },
    ...products.map((product) => ({
      url: `${siteUrl}${product.href}`,
      lastModified: new Date(),
    })),
    ...posts.map((post) => ({
      url: `${siteUrl}${post.href}`,
      lastModified: new Date(post.date),
    })),
  ]
}
