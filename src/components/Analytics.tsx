'use client'

import { Suspense, useEffect } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'

const yandexMetrikaId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID
const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_ID
const telegramPixelId = process.env.NEXT_PUBLIC_TELEGRAM_PIXEL_ID

declare global {
  interface Window {
    ym?: (id: number, method: string, ...args: Array<unknown>) => void
  }
}

// Metrika is initialized with `defer: true`, so every page view (including the
// first one) is sent here on client-side navigation.
function YandexMetrikaPageViews({ id }: { id: number }) {
  let pathname = usePathname()
  let searchParams = useSearchParams()

  useEffect(() => {
    window.ym?.(id, 'hit', window.location.href, {
      referer: document.referrer,
    })
  }, [id, pathname, searchParams])

  return null
}

function YandexMetrika({ id }: { id: number }) {
  return (
    <>
      <Script id="yandex-metrika" strategy="afterInteractive">
        {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${id}, "init", { defer: true, clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });`}
      </Script>
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${id}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=""
          />
        </div>
      </noscript>
      <Suspense fallback={null}>
        <YandexMetrikaPageViews id={id} />
      </Suspense>
    </>
  )
}

// GA4 tracks client-side navigations itself via enhanced measurement
// ("Page changes based on browser history events").
function GoogleAnalytics({ id }: { id: string }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  )
}

// Telegram Ads pixel: counts visits that come from Telegram ad campaigns.
function TelegramPixel({ id }: { id: string }) {
  return (
    <Script id="telegram-pixel" strategy="afterInteractive">
      {`(function(t,l,g,r,m){t[g]||(g=t[g]=function(){g.run?g.run.apply(g,arguments):g.queue.push(arguments)},g.queue=[],t=l.createElement(r),t.async=!0,t.src=m,l=l.getElementsByTagName(r)[0],l.parentNode.insertBefore(t,l))})(window,document,'tgp','script','https://telegram.org/js/pixel.js');
tgp('init', ${JSON.stringify(id)});`}
    </Script>
  )
}

export function Analytics() {
  let pathname = usePathname()

  // Private tools — Верстак (/editor-…) and the box generator (/boxes-…):
  // no stats and no Webvisor recordings
  if (pathname.startsWith('/editor-') || pathname.startsWith('/boxes-')) {
    return null
  }

  return (
    <>
      {yandexMetrikaId && <YandexMetrika id={Number(yandexMetrikaId)} />}
      {googleAnalyticsId && <GoogleAnalytics id={googleAnalyticsId} />}
      {telegramPixelId && <TelegramPixel id={telegramPixelId} />}
    </>
  )
}
