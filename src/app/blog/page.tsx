import { Suspense } from 'react'

import { PostsList } from '@/components/PostsList'
import { SimpleLayout } from '@/components/SimpleLayout'
import { createPageMetadata } from '@/lib/metadata'
import { getListedPosts } from '@/lib/posts'

const heroTitle = 'Статьи, видео и инструкции из мастерской'

export const metadata = createPageMetadata({
  title: 'Блог',
  description:
    'Статьи, видео и инструкции о лазерной резке, 3D-печати, Arduino и других проектах мастерской Atrial.',
  page: 'blog',
})

export default async function Blog() {
  let posts = await getListedPosts()

  return (
    <SimpleLayout
      title={heroTitle}
      intro="Рассказываю о проектах, показываю процесс и делюсь инструкциями: как что-то сделано и как повторить самому."
    >
      <Suspense fallback={null}>
        <PostsList posts={posts} />
      </Suspense>
    </SimpleLayout>
  )
}
