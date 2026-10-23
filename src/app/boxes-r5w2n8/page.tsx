import { type Metadata } from 'next'

import { BoxGenerator } from '@/components/boxes/BoxGenerator'
import { Container } from '@/components/Container'

// Box net generator for the workshop: not linked anywhere, not in the sitemap, not indexed
export const metadata: Metadata = {
  title: 'Коробки',
  robots: { index: false, follow: false },
}

export default function BoxesPage() {
  return (
    <Container className="mt-16 sm:mt-32">
      <BoxGenerator />
    </Container>
  )
}
