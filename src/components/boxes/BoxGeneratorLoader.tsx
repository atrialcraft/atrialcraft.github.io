'use client'

import dynamic from 'next/dynamic'

// The generator draws with WebGL and reads browser storage: browser only
export const BoxGeneratorLoader = dynamic(
  () => import('@/components/boxes/BoxGenerator').then((module) => module.BoxGenerator),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted-foreground">Загружаю генератор…</p>,
  },
)
