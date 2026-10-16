import { Feed } from 'feed'

import { getListedPosts } from '@/lib/posts'
import { getSiteUrl } from '@/lib/metadata'
import { site } from '@/lib/site'

export const dynamic = 'force-static'

export async function GET() {
  let siteUrl = getSiteUrl()

  let author = {
    name: site.name,
  }

  let feed = new Feed({
    title: site.title,
    description: site.description,
    language: 'ru',
    author,
    id: siteUrl,
    link: siteUrl,
    image: `${siteUrl}/favicon/favicon.ico`,
    favicon: `${siteUrl}/favicon/favicon.ico`,
    copyright: `© ${new Date().getFullYear()} ${site.name}`,
    feedLinks: {
      rss2: `${siteUrl}/feed.xml`,
    },
  })

  for (let post of await getListedPosts()) {
    let publicUrl = `${siteUrl}${post.href}`

    feed.addItem({
      title: post.title,
      id: publicUrl,
      link: publicUrl,
      description: post.description,
      author: [author],
      date: new Date(post.date),
    })
  }

  return new Response(feed.rss2(), {
    headers: {
      'content-type': 'application/xml',
    },
  })
}
