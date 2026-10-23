import { Suspense } from 'react'

import { PostsList } from '@/components/PostsList'
import { SimpleLayout } from '@/components/SimpleLayout'
import { createPageMetadata } from '@/lib/metadata'
import { getListedPosts } from '@/lib/posts'
import { sectionsContent } from '@/lib/content'

export const metadata = createPageMetadata({
  title: 'Блог',
  description: sectionsContent.blog.description,
  page: 'blog',
})

export default async function Blog() {
  let posts = await getListedPosts()

  return (
    <SimpleLayout
      title={sectionsContent.blog.title}
      intro={sectionsContent.blog.intro}
    >
      <Suspense fallback={null}>
        <PostsList posts={posts} />
      </Suspense>
    </SimpleLayout>
  )
}
