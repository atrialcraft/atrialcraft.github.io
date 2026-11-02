'use client'

import dynamic from 'next/dynamic'

// The assembly is drawn with WebGL: browser only
export const AssemblyViewerLoader = dynamic(
  () => import('@/components/assembly/AssemblyViewer').then((module) => module.AssemblyViewer),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted-foreground">Загружаю наличник…</p>,
  },
)
