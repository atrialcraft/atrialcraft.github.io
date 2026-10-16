import { type Metadata } from 'next'
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
  name: site.name,
  alternateName: site.domain,
  url: siteUrl,
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    template: `%s — ${site.name}`,
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
    siteName: site.name,
    locale: site.locale,
    type: 'website',
    images: siteOpenGraphImages,
  },
  twitter: {
    ...siteTwitterMetadata,
  },
  icons: {
    icon: [
      { url: '/favicon/favicon.ico' },
      { url: '/favicon/favicon.svg', type: 'image/svg+xml' },
      {
        url: '/favicon/favicon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
    ],
    apple: '/favicon/apple-touch-icon.png',
  },
  manifest: '/favicon/site.webmanifest',
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
