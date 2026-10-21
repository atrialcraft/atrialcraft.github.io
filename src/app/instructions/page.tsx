import {
  ContentCard,
  ContentCardCta,
  ContentCardDescription,
  ContentCardTitle,
} from '@/components/ContentCard'
import { SimpleLayout } from '@/components/SimpleLayout'
import { createPageMetadata } from '@/lib/metadata'
import { getListedPosts } from '@/lib/posts'
import { postCtaLabel } from '@/lib/blog'

const heroTitle = 'Инструкции к изделиям мастерской'

export const metadata = createPageMetadata({
  title: 'Инструкции',
  description: 'Инструкции к изделиям мастерской Atrial.',
  page: 'instructions',
})

export default async function Instructions() {
  let instructions = (await getListedPosts()).filter(
    (post) => post.type === 'instruction',
  )

  return (
    <SimpleLayout
      title={heroTitle}
      intro="Как собрать, настроить и ухаживать. На изделиях есть QR-код, который ведёт прямо на нужную инструкцию."
    >
      <div className="flex max-w-3xl flex-col space-y-16">
        {instructions.length === 0 && (
          <p className="text-base text-muted-foreground">Пока здесь пусто.</p>
        )}
        {instructions.map((post) => (
          <ContentCard key={post.href} as="article">
            <ContentCardTitle href={post.href}>{post.title}</ContentCardTitle>
            <ContentCardDescription className="text-pretty">
              {post.description}
            </ContentCardDescription>
            <ContentCardCta>{postCtaLabel[post.type]}</ContentCardCta>
          </ContentCard>
        ))}
      </div>
    </SimpleLayout>
  )
}
