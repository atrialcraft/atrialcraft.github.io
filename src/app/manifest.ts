import type { MetadataRoute } from 'next'

import { site } from '@/lib/site'

export const dynamic = 'force-static'

// Манифест для Android и «Добавить на главный экран»
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.title,
    short_name: 'Atrial',
    description: site.description,
    lang: 'ru',
    start_url: '/',
    display: 'standalone',
    background_color: '#161616',
    theme_color: '#161616',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
