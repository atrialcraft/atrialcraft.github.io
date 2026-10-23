'use client'

import dynamic from 'next/dynamic'

// Верстак reads its draft from browser storage, so it renders only in the
// browser — nothing to prerender at build time.
export const EditorLoader = dynamic(
  () => import('@/components/editor/Admin').then((module) => module.Admin),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-muted-foreground">Загружаю Верстак…</p>
    ),
  },
)
