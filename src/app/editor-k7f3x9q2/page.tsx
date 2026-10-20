import { type Metadata } from 'next'

import { Container } from '@/components/Container'
import { EditorLoader } from '@/components/editor/EditorLoader'

// Верстак, the private article editor: not linked anywhere, not in the sitemap, not indexed.
export const metadata: Metadata = {
  title: 'Верстак',
  robots: { index: false, follow: false },
}

export default function EditorPage() {
  return (
    <Container className="mt-16 sm:mt-32">
      <EditorLoader />
    </Container>
  )
}
