import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import { ImageResponse } from 'next/og'
import sharp from 'sharp'

import { typograf } from '@/lib/typograf.mjs'

export const ogSize = {
  width: 1200,
  height: 630,
} as const

// Light theme of the site (src/styles/tailwind.css) on the #ededed brand grey
const ogTheme = {
  background: '#ededed',
  foreground: '#252525',
  mutedForeground: '#737373',
  // A shade darker than the background, so the photo placeholder stands out
  muted: '#e0e0e0',
} as const

const brandLabel = 'atrial.org'
const logoPath = join(process.cwd(), 'public/icons/icon-512.png')
const titleLetterSpacing = '-0.025em'

type Weight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
type FontStyle = 'normal' | 'italic'

async function loadGoogleFont(font: string, text: string, weight?: Weight) {
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

async function getLogoDataUrl() {
  const logo = await readFile(logoPath)
  return `data:image/png;base64,${logo.toString('base64')}`
}

/**
 * A photo from the repository ready for the preview. The renderer doesn't
 * read WebP, so it goes in as a JPEG, already scaled down
 */
export async function readOgPhoto(path: string) {
  const data = await sharp(path)
    .rotate()
    .resize({ width: 900, withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
  return `data:image/jpeg;base64,${data.toString('base64')}`
}

/** No full stop at the end of a caption-like text, as on product cards */
function withoutFinalDot(text: string) {
  return text.trim().replace(/([^.])\.$/, '$1')
}

// Heroicons PhotoIcon (outline), as on the market card without a photo
const photoIconPath =
  'm2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z'

/**
 * Preview for messengers and social networks, one per page: a 3:4 photo on
 * the left, the site logo, the title and a short description on the right.
 * Without a photo the text takes the whole width, or, with `placeholder`
 * (products), the photo place shows the same placeholder as on the site.
 * No prices on purpose: messengers cache previews and an old price would stay
 */
export async function generateCardOgImage({
  title,
  description,
  photo,
  placeholder = false,
}: {
  title: string
  description: string
  /** Data URL from readOgPhoto */
  photo?: string
  placeholder?: boolean
}) {
  const [boldFont, regularFont, logoDataUrl] = await Promise.all([
    loadGoogleFont('Golos+Text', title, 700),
    loadGoogleFont('Golos+Text', description + brandLabel, 400),
    getLogoDataUrl(),
  ])

  const fonts = []
  if (boldFont) {
    fonts.push({
      name: 'Golos Text',
      data: boldFont,
      style: 'normal' as FontStyle,
      weight: 700 as Weight,
    })
  }
  if (regularFont) {
    fonts.push({
      name: 'Golos Text',
      data: regularFont,
      style: 'normal' as FontStyle,
      weight: 400 as Weight,
    })
  }

  const padding = 45
  const photoHeight = ogSize.height - padding * 2
  const photoWidth = Math.round((photoHeight * 3) / 4)
  const hasPhotoColumn = Boolean(photo) || placeholder
  // Long article titles get a smaller size so they fit in three lines
  const titleSize = title.length > 40 ? 48 : 60

  return new ImageResponse(
    (
      <div
        style={{
          background: ogTheme.background,
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
            src={photo}
            width={photoWidth}
            height={photoHeight}
            alt=""
            style={{ objectFit: 'cover', borderRadius: 28 }}
          />
        ) : (
          placeholder && (
            <div
              style={{
                width: photoWidth,
                height: photoHeight,
                borderRadius: 28,
                background: ogTheme.muted,
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
                stroke={ogTheme.mutedForeground}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={photoIconPath} />
              </svg>
            </div>
          )
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            paddingTop: 15,
            paddingBottom: 15,
            paddingLeft: hasPhotoColumn ? 0 : 75,
            paddingRight: hasPhotoColumn ? 0 : 75,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <img src={logoDataUrl} width={48} height={48} alt="" />
            <div style={{ fontSize: 30, color: ogTheme.mutedForeground }}>
              {brandLabel}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                marginTop: 56,
                fontSize: titleSize,
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: titleLetterSpacing,
                color: ogTheme.foreground,
                maxHeight: titleSize * 1.15 * 3,
                overflow: 'hidden',
              }}
            >
              {typograf(withoutFinalDot(title))}
            </div>
            <div
              style={{
                marginTop: 28,
                fontSize: 30,
                lineHeight: 1.45,
                color: ogTheme.mutedForeground,
                // 160 characters fit in five lines at this size
                maxHeight: 30 * 1.45 * 5,
                overflow: 'hidden',
              }}
            >
              {typograf(withoutFinalDot(description))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...ogSize, fonts },
  )
}
