// Designs around the code, as on vkqr.ru: only the code, with a frame, on a
// background, or a card with a photo. Sizes are in SVG units; the code itself
// comes in as markup placed by `code(x, y, size)`.

export type Frame = 'code' | 'frame' | 'background' | 'card'

export type Look = {
  frame: Frame
  color: string
  /** Line under the code in the frame and background designs */
  label: string
  title: string
  subtitle: string
  /** Photo of the card, as a data URL */
  photo: string | null
}

/** Text drawn as outlines, so files do not depend on installed fonts */
export type Fonts = {
  regular: OutlineFont
  bold: OutlineFont
}

export type OutlineFont = {
  getPath: (text: string, x: number, y: number, size: number, options?: { letterSpacing?: number }) => {
    toPathData: (decimals?: number) => string
  }
  getAdvanceWidth: (text: string, size: number, options?: { letterSpacing?: number }) => number
  ascender: number
  descender: number
  unitsPerEm: number
}

export const brandColors = ['#111111', '#ededed', '#ffcc00']

function luminance(hex: string) {
  let value = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  let [r, g, b] = [value >> 16, (value >> 8) & 255, value & 255].map((c) => {
    let s = c / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const isLight = (hex: string) => luminance(hex) > 0.4

/** Text on a coloured strip: dark on light colours, white on dark */
const textOn = (hex: string) => (isLight(hex) ? '#111111' : '#ffffff')

/** In the framed designs the code sits on white, so a light colour can't be its colour */
export function codeColor(look: Look) {
  if (look.frame === 'code') return look.color
  return isLight(look.color) ? '#111111' : look.color
}

const escapeXml = (text: string) =>
  text.replace(/[&<>"]/g, (c) => `&${{ '&': 'amp', '<': 'lt', '>': 'gt', '"': 'quot' }[c]};`)

type Text = { text: string; x: number; y: number; size: number; bold: boolean; color: string; spacing?: number; maxWidth: number }

/** One centred line, shrunk to fit; outlines when the fonts are loaded */
function textMarkup(t: Text, fonts: Fonts | null) {
  if (!t.text.trim()) return ''
  let font = fonts && (t.bold ? fonts.bold : fonts.regular)
  if (!font) {
    return `<text x="${t.x}" y="${t.y}" text-anchor="middle" dominant-baseline="central" font-family="Golos Text, sans-serif" font-size="${t.size}" font-weight="${t.bold ? 700 : 400}" letter-spacing="${(t.spacing ?? 0) * t.size}" fill="${t.color}">${escapeXml(t.text)}</text>`
  }
  let options = { letterSpacing: t.spacing ?? 0 }
  let size = t.size
  let width = font.getAdvanceWidth(t.text, size, options)
  if (width > t.maxWidth) {
    size *= t.maxWidth / width
    width = t.maxWidth
  }
  // Centre on the cap height of Cyrillic and Latin capitals, about 0.7 em
  let baseline = t.y + size * 0.35
  let d = font.getPath(t.text, t.x - width / 2, baseline, size, options).toPathData(2)
  return `<path fill="${t.color}" d="${d}"/>`
}

export type Composition = { width: number; height: number; body: string }

/**
 * Builds the design. `code(x, y, size)` returns the code markup for that square.
 */
export function compose(look: Look, code: (x: number, y: number, size: number) => string, fonts: Fonts | null): Composition {
  let text = (t: Text) => textMarkup(t, fonts)
  let label = look.label.toLocaleUpperCase('ru-RU')

  if (look.frame === 'frame') {
    let w = 280
    let h = 340
    return {
      width: w,
      height: h,
      body: `<rect width="${w}" height="${h}" rx="20" fill="${look.color}"/>
<rect x="6" y="6" width="${w - 12}" height="${w - 12}" rx="15" fill="#ffffff"/>
${code(22, 22, w - 44)}
${text({ text: label, x: w / 2, y: w + (h - w) / 2 - 3, size: 16, bold: true, color: textOn(look.color), spacing: 0.04, maxWidth: w - 36 })}`,
    }
  }

  if (look.frame === 'background') {
    let w = 300
    let h = 372
    return {
      width: w,
      height: h,
      body: `<rect width="${w}" height="${h}" rx="24" fill="${look.color}"/>
<rect x="28" y="28" width="${w - 56}" height="${w - 56}" rx="28" fill="#ffffff"/>
${code(48, 48, w - 96)}
${text({ text: label, x: w / 2, y: w + (h - w) / 2 - 6, size: 16, bold: true, color: textOn(look.color), spacing: 0.04, maxWidth: w - 48 })}`,
    }
  }

  if (look.frame === 'card') {
    let w = 300
    let h = 460
    let photoHeight = 270
    let box = 168
    let boxY = photoHeight - box / 2 - 10
    let photo = look.photo
      ? `<image href="${look.photo}" width="${w}" height="${photoHeight}" preserveAspectRatio="xMidYMid slice" clip-path="url(#qr-card-photo)"/>`
      : `<rect width="${w}" height="${photoHeight}" fill="#d9d9d9" clip-path="url(#qr-card-photo)"/>`
    return {
      width: w,
      height: h,
      body: `<defs><clipPath id="qr-card-photo"><path d="M0 24a24 24 0 0 1 24-24h${w - 48}a24 24 0 0 1 24 24v${photoHeight - 24}h-${w}z"/></clipPath></defs>
<rect width="${w}" height="${h}" rx="24" fill="#ededed"/>
${photo}
<rect x="${(w - box) / 2}" y="${boxY}" width="${box}" height="${box}" rx="24" fill="#ffffff"/>
${code((w - box) / 2 + 14, boxY + 14, box - 28)}
${text({ text: look.title, x: w / 2, y: boxY + box + 34, size: 22, bold: true, color: '#111111', maxWidth: w - 40 })}
${text({ text: look.subtitle, x: w / 2, y: boxY + box + 64, size: 14, bold: false, color: '#555555', maxWidth: w - 40 })}`,
    }
  }

  return { width: 256, height: 256, body: code(0, 0, 256) }
}

/** The library's own SVG nested into the design */
export function nestedCode(markup: string) {
  return (x: number, y: number, size: number) =>
    markup
      .replace(/^\s*<svg/, `<svg x="${x}" y="${y}"`)
      .replace(/width="[^"]*px"/, `width="${size}"`)
      .replace(/height="[^"]*px"/, `height="${size}"`)
}

export function svgDocument(c: Composition, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${c.width} ${c.height}" ${extra}>
${c.body}
</svg>`
}
