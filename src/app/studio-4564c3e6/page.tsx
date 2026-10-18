import { type Metadata } from 'next'

import { Container } from '@/components/Container'
import { StudioLoader } from '@/components/studio/StudioLoader'

// Private writing studio: not linked anywhere, not in the sitemap, not indexed.
export const metadata: Metadata = {
  title: 'Студия',
  robots: { index: false, follow: false },
}

export default function StudioPage() {
  return (
    <Container className="mt-16 sm:mt-32">
      <StudioLoader />
    </Container>
  )
}
