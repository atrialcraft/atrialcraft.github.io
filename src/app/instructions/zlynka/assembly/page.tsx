import { type Metadata } from 'next'

import { SimpleLayout } from '@/components/SimpleLayout'
import { AssemblyViewerLoader } from '@/components/assembly/AssemblyViewerLoader'

// 3D assembly of the «Злынка» nalichnik: not linked anywhere yet, not in the sitemap, not indexed
export const metadata: Metadata = {
  title: 'Сборка наличника «Злынка» в 3D',
  description: 'Как собирается наличник «Злынка»: все шаги инструкции в 3D, по кнопкам или подряд.',
  robots: { index: false, follow: false },
}

export default function ZlynkaAssemblyPage() {
  return (
    <SimpleLayout
      title="Сборка наличника «Злынка» в 3D"
      intro="Нажмите на воспроизведение, чтобы посмотреть всю сборку подряд, или листайте шаги кнопками. Модель можно крутить мышью или пальцем."
    >
      <AssemblyViewerLoader />
    </SimpleLayout>
  )
}
