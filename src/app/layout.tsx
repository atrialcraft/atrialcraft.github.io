import { type Metadata, type Viewport } from 'next'
import { Inter, Source_Serif_4 } from 'next/font/google'

import { Providers } from '@/app/providers'
import { Analytics } from '@/components/Analytics'
import { Layout } from '@/components/Layout'
import {
  siteOpenGraphImages,
  siteTwitterMetadata,
} from '@/lib/metadata'
import { site } from '@/lib/site'

import '@/styles/tailwind.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-inter',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin', 'cyrillic'],
  style: ['normal', 'italic'],
  variable: '--font-source-serif',
})

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

const title = site.title
const description = site.description
const websiteStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: site.brand,
  alternateName: site.domain,
  url: siteUrl,
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: `%s — ${site.brand}`,
    default: title,
  },
  description,
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
  openGraph: {
    title,
    description,
    url: '/',
    siteName: site.brand,
    locale: site.locale,
    type: 'website',
    images: siteOpenGraphImages,
  },
  twitter: {
    ...siteTwitterMetadata,
  },
  // Иконки подключаются сами из файлов src/app/favicon.ico, icon.png,
  // apple-icon.png и манифеста src/app/manifest.ts
}

// Цвет адресной строки в мобильных браузерах — под фон сайта
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#161616' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="ru"
      className={`${inter.className} ${inter.variable} ${sourceSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full bg-card">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData).replace(/</g, '\\u003c'),
          }}
        />
        <Providers>
          <div className="flex w-full">
            <Layout>{children}</Layout>
          </div>
          <Analytics />
        </Providers>
      </body>
    </html>
  )
}
