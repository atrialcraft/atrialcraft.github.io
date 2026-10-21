import { type Metadata } from 'next'

import { Container } from '@/components/Container'
import { EditorLoader } from '@/components/editor/EditorLoader'
import { createPageMetadata } from '@/lib/metadata'

// Верстак, the private article editor: not linked anywhere, not in the sitemap, not indexed.
// The preview is for sending the link to yourself or to a co-author
export const metadata: Metadata = {
  ...createPageMetadata({
    title: 'Верстак',
    description: 'Редактор статей atrial.org: текст, фото и публикация на сайт',
    page: 'editor',
  }),
  robots: { index: false, follow: false },
}

export default function EditorPage() {
  return (
    <Container className="mt-16 sm:mt-32">
      <EditorLoader />
    </Container>
  )
}
