import { type Metadata } from 'next'

import { ContainerOuter } from '@/components/Container'
import { BoxGeneratorLoader } from '@/components/boxes/BoxGeneratorLoader'

// Box net generator for the workshop: not linked anywhere, not in the sitemap, not indexed
export const metadata: Metadata = {
  title: 'Коробки',
  robots: { index: false, follow: false },
}

export default function BoxesPage() {
  return (
    // Wider than the usual text column: settings, dieline and 3D side by side
    <ContainerOuter className="mt-10 sm:mt-16">
      <div className="px-4 sm:px-6">
        <BoxGeneratorLoader />
      </div>
    </ContainerOuter>
  )
}
