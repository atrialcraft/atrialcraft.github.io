'use client'

import dynamic from 'next/dynamic'

// The picker draws with WebGL and reads the address: browser only
export const NalichnikColorsLoader = dynamic(
  () => import('@/components/nalichnik/NalichnikColors').then((module) => module.NalichnikColors),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted-foreground">Загружаю наличник…</p>,
  },
)
