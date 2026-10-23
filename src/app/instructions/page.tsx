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
import { sectionsContent } from '@/lib/content'

export const metadata = createPageMetadata({
  title: 'Инструкции',
  description: sectionsContent.instructions.description,
  page: 'instructions',
})

export default async function Instructions() {
  let instructions = (await getListedPosts()).filter(
    (post) => post.type === 'instruction',
  )

  return (
    <SimpleLayout
      title={sectionsContent.instructions.title}
      intro={sectionsContent.instructions.intro}
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
