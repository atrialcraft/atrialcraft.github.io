import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'

export const ogSize = {
  width: 1200,
  height: 630,
} as const

// Matches :root tokens in src/styles/tailwind.css
const ogTheme = {
  background: '#fafafa',
  foreground: '#252525',
  mutedForeground: '#737373',
} as const

const brandLabel = 'atrial.org'
const logoPath = join(
  process.cwd(),
  'public/icons/icon-512.png',
)
const logoDisplaySize = 48
const brandLabelFontSize = 40

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
type FontStyle = 'normal' | 'italic'

export async function loadGoogleFont(font: string, text: string, weight?: Weight) {
  try {
    const weightParam = weight ? `:wght@${weight}` : ''
    const url = `https://fonts.googleapis.com/css2?family=${font}${weightParam}&text=${encodeURIComponent(text)}`
    const css = await (await fetch(url)).text()
    const resource = css.match(
      /src: url\((.+)\) format\('(opentype|truetype)'\)/,
    )

    if (resource) {
      const response = await fetch(resource[1])
      if (response.status === 200) {
        return await response.arrayBuffer()
      }
    }
  } catch (error) {
    console.error(`Failed to load font ${font}:`, error)
  }

  return null
}

// Line height uses text-4xl ratio (2.5rem / 2rem = 1.25), slightly airier at OG size.
const titleFontSize = 64
const titleLineHeight = 1.25
const titleLetterSpacing = '-0.025em'
const titleMaxLines = 3
// ~64 chars fits 3 lines at 64px within 900px (Satori line-clamp is unsupported).
const titleMaxLength = 72

export async function getLogoDataUrl() {
  const logo = await readFile(logoPath)
  return `data:image/png;base64,${logo.toString('base64')}`
}

function formatOgTitle(title: string) {
  const trimmed = title.trim()

  if (trimmed.length <= titleMaxLength) {
    return trimmed
  }

  const slice = trimmed.slice(0, titleMaxLength)
  const lastSpace = slice.lastIndexOf(' ')

  if (lastSpace > 0) {
    return `${slice.slice(0, lastSpace).trimEnd()}…`
  }

  return `${slice.trimEnd()}…`
}

export async function generateOgImage({ title }: { title: string }) {
  const displayTitle = formatOgTitle(title)

  const [interBoldFont, interRegularFont, logoDataUrl] = await Promise.all([
    loadGoogleFont('Golos+Text', displayTitle, 700),
    loadGoogleFont('Golos+Text', brandLabel, 400),
    getLogoDataUrl(),
  ])

  const fonts = []

  if (interBoldFont) {
    fonts.push({
      name: 'Golos Text',
      data: interBoldFont,
      style: 'normal' as FontStyle,
      weight: 700 as Weight,
    })
  }

  if (interRegularFont) {
    fonts.push({
      name: 'Golos Text',
      data: interRegularFont,
      style: 'normal' as FontStyle,
      weight: 400 as Weight,
    })
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: ogTheme.background,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          padding: '120px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <img
            src={logoDataUrl}
            width={logoDisplaySize}
            height={logoDisplaySize}
            alt=""
          />
          <div
            style={{
              fontSize: brandLabelFontSize,
              color: ogTheme.mutedForeground,
              fontFamily: '"Golos Text", system-ui, sans-serif',
              fontWeight: 400,
            }}
          >
            {brandLabel}
          </div>
        </div>
        <div
          style={{
            marginTop: '64px',
            fontSize: titleFontSize,
            color: ogTheme.foreground,
            textAlign: 'left',
            maxWidth: '900px',
            maxHeight: titleFontSize * titleLineHeight * titleMaxLines,
            overflow: 'hidden',
            letterSpacing: titleLetterSpacing,
            lineHeight: titleLineHeight,
            fontFamily: '"Golos Text", system-ui, sans-serif',
            fontWeight: 700,
          }}
        >
          {displayTitle}
        </div>
      </div>
    ),
    {
      ...ogSize,
      fonts,
    },
  )
}

// Product preview: photo on the left, name and short description on the right.
// No price on purpose — messengers cache previews, a changed price would stay old
const productOgTheme = {
  background: '#ededed',
  // Text colours of the light theme (src/styles/tailwind.css)
  foreground: ogTheme.foreground,
  mutedForeground: ogTheme.mutedForeground,
  // A shade darker than the background, so the photo placeholder stands out
  muted: '#e0e0e0',
} as const

// Heroicons PhotoIcon (outline), as on the market card without a photo
const photoIconPath =
  'm2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z'

export async function generateProductOgImage({
  name,
  description,
  photo,
}: {
  name: string
  description: string
  /** JPEG or PNG file contents */
  photo?: { data: Buffer; type: string }
}) {
  const [boldFont, regularFont, logoDataUrl] = await Promise.all([
    loadGoogleFont('Golos+Text', name, 700),
    loadGoogleFont('Golos+Text', description + brandLabel, 400),
    getLogoDataUrl(),
  ])

  const fonts = []
  if (boldFont) {
    fonts.push({ name: 'Golos Text', data: boldFont, style: 'normal' as FontStyle, weight: 700 as Weight })
  }
  if (regularFont) {
    fonts.push({ name: 'Golos Text', data: regularFont, style: 'normal' as FontStyle, weight: 400 as Weight })
  }

  const padding = 45
  const photoHeight = ogSize.height - padding * 2
  const photoWidth = Math.round((photoHeight * 3) / 4)

  return new ImageResponse(
    (
      <div
        style={{
          background: productOgTheme.background,
          width: '100%',
          height: '100%',
          display: 'flex',
          padding,
          gap: 60,
          fontFamily: '"Golos Text", system-ui, sans-serif',
        }}
      >
        {photo ? (
          <img
            src={`data:${photo.type};base64,${photo.data.toString('base64')}`}
            width={photoWidth}
            height={photoHeight}
            alt=""
            style={{ objectFit: 'cover', borderRadius: 28 }}
          />
        ) : (
          <div
            style={{
              width: photoWidth,
              height: photoHeight,
              borderRadius: 28,
              background: productOgTheme.muted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width={72}
              height={72}
              viewBox="0 0 24 24"
              fill="none"
              stroke={productOgTheme.mutedForeground}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={photoIconPath} />
            </svg>
          </div>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingTop: 15,
            paddingBottom: 15,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <img src={logoDataUrl} width={48} height={48} alt="" />
            <div style={{ fontSize: 30, color: productOgTheme.mutedForeground }}>
              {brandLabel}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                marginTop: 56,
                fontSize: 60,
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: titleLetterSpacing,
                color: productOgTheme.foreground,
              }}
            >
              {name}
            </div>
            <div
              style={{
                marginTop: 28,
                fontSize: 30,
                lineHeight: 1.45,
                color: productOgTheme.mutedForeground,
                // 160 characters fit in five lines at this size
                maxHeight: 30 * 1.45 * 5,
                overflow: 'hidden',
              }}
            >
              {description}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...ogSize, fonts },
  )
}
