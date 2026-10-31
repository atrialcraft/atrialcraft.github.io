'use client'

import dynamic from 'next/dynamic'

// paper.js, which merges the code into one outline, runs in the browser only
export const QrGeneratorLoader = dynamic(
  () => import('@/components/qr/QrGenerator').then((module) => module.QrGenerator),
  {
    ssr: false,
    loading: () => <p className="text-sm text-muted-foreground">Загружаю генератор…</p>,
  },
)
