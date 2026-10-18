'use client'

import dynamic from 'next/dynamic'

// The studio reads its draft from browser storage, so it renders only in the
// browser — nothing to prerender at build time.
export const StudioLoader = dynamic(
  () => import('@/components/studio/Studio').then((module) => module.Studio),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Загружаю студию…</p>
    ),
  },
)
