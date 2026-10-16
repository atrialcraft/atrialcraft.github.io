import { Feed } from 'feed'

import { getAllPosts } from '@/lib/posts'
import { getSiteUrl } from '@/lib/metadata'

export const dynamic = 'force-static'

export async function GET() {
  let siteUrl = getSiteUrl()

  let author = {
    name: 'Brian Ruiz',
    email: 'brian@b-r.io',
  }

  let feed = new Feed({
    title: author.name,
    description:
      'Writing about software engineering, technology, design, and productivity.',
    author,
    id: siteUrl,
    link: siteUrl,
    image: `${siteUrl}/favicon/favicon.ico`,
    favicon: `${siteUrl}/favicon/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}`,
    feedLinks: {
      rss2: `${siteUrl}/feed.xml`,
    },
  })

  for (let post of await getAllPosts()) {
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
