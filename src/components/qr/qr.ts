import { createQR } from '@vkontakte/vk-qr'

// QR codes in the VK style (VKCOM/vk-qr, MIT), as on vkqr.ru

export type Logo =
  | { kind: 'none' }
  /** Uploaded SVG logo, fitted into the logo box */
  | { kind: 'svg'; svg: string }
  /** Markup already drawn in the 750 × 750 logo box: the Atrial mark */
  | { kind: 'markup'; markup: string }
  /** Uploaded PNG or JPEG, as a data URL */
  | { kind: 'image'; image: string }

export type QrDesign = {
  color: string
  logo: Logo
}

/** The library leaves a 750 × 750 hole in the centre for the logo */
const logoBox = 750

/** SVG logo fitted into the logo box, keeping its proportions */
function svgLogo(markup: string) {
  let doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
  let svg = doc.querySelector('svg')
  if (!svg) return null
  let box = svg.getAttribute('viewBox')?.split(/[\s,]+/).map(Number)
  let [x, y, w, h] =
    box?.length === 4 && box.every(Number.isFinite)
      ? box
      : [0, 0, parseFloat(svg.getAttribute('width') ?? '') || 100, parseFloat(svg.getAttribute('height') ?? '') || 100]
  let scale = logoBox / Math.max(w, h)
  let dx = (logoBox - w * scale) / 2 - x * scale
  let dy = (logoBox - h * scale) / 2 - y * scale
  svg.querySelectorAll('script, foreignObject').forEach((node) => node.remove())
  return `<g transform="translate(${dx} ${dy}) scale(${scale})">${svg.innerHTML}</g>`
}

/** SVG markup of the code; a vector logo replaces the library's picture */
export function createQrSvg(text: string, design: QrDesign) {
  let { logo } = design
  let svg = createQR(text, {
    qrSize: 256,
    isShowLogo: logo.kind !== 'none',
    foregroundColor: design.color,
    // Anything but empty: the library then draws a picture instead of its VK logo
    logoData: logo.kind === 'image' ? logo.image : 'logo',
    suffix: 'atrial',
  })
  if (logo.kind !== 'svg' && logo.kind !== 'markup') return svg
  let inner = logo.kind === 'markup' ? logo.markup : (svgLogo(logo.svg) ?? '')
  // <image … transform="translate(p,p) scale(s)" … /> → the same place, drawn as vector
  return svg.replace(
    /<image[^>]*?transform="([^"]*)"[^>]*\/>/,
    (_, transform) => `<g transform="${transform}">${inner}</g>`,
  )
}

/** Number of modules per side: dense codes are hard to scan from afar */
export function qrModules(svg: string) {
  let size = svg.match(/viewBox="0 0 (\d+)/)
  return size ? Math.round(Number(size[1]) / 99) : 0
}

function withScheme(url: string) {
  let trimmed = url.trim()
  if (!trimmed || /^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

export type Utm = { source: string; medium: string; campaign: string }

export function linkPayload(url: string, utm?: Utm) {
  let full = withScheme(url)
  if (!full || !utm) return full
  let tags = Object.entries({ utm_source: utm.source, utm_medium: utm.medium, utm_campaign: utm.campaign })
    .filter(([, value]) => value.trim())
    .map(([key, value]) => `${key}=${encodeURIComponent(value.trim())}`)
  if (!tags.length) return full
  let [base, hash] = full.split('#')
  return `${base}${base.includes('?') ? '&' : '?'}${tags.join('&')}${hash ? `#${hash}` : ''}`
}

/** Special characters in Wi-Fi fields are escaped with a backslash */
const wifiEscape = (text: string) => text.replace(/([\\;,:"])/g, '\\$1')

export function wifiPayload(w: { ssid: string; password: string; security: 'WPA' | 'WEP' | 'nopass'; hidden: boolean }) {
  if (!w.ssid) return ''
  let password = w.security === 'nopass' ? '' : `P:${wifiEscape(w.password)};`
  return `WIFI:T:${w.security};S:${wifiEscape(w.ssid)};${password}${w.hidden ? 'H:true;' : ''};`
}

const vEscape = (text: string) => text.replace(/([\\;,])/g, '\\$1').replace(/\n/g, '\\n')

export function contactPayload(c: {
  lastName: string
  firstName: string
  middleName: string
  position: string
  company: string
  phone: string
  email: string
  site: string
}) {
  if (!Object.values(c).some((v) => v.trim())) return ''
  let lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${vEscape(c.lastName)};${vEscape(c.firstName)};${vEscape(c.middleName)};;`,
    `FN:${vEscape([c.firstName, c.middleName, c.lastName].filter(Boolean).join(' '))}`,
    c.company && `ORG:${vEscape(c.company)}`,
    c.position && `TITLE:${vEscape(c.position)}`,
    c.phone && `TEL;TYPE=CELL:${c.phone}`,
    c.email && `EMAIL:${c.email}`,
    c.site && `URL:${withScheme(c.site)}`,
    'END:VCARD',
  ]
  return lines.filter(Boolean).join('\n')
}

/** datetime-local value → iCalendar local time, 20261031T1900 → 20261031T190000 */
const icalTime = (value: string) => value.replace(/[-:]/g, '').padEnd(15, '0')

export function eventPayload(e: { title: string; start: string; end: string; place: string; url: string }) {
  if (!e.title || !e.start) return ''
  let lines = [
    'BEGIN:VEVENT',
    `SUMMARY:${vEscape(e.title)}`,
    `DTSTART:${icalTime(e.start)}`,
    e.end && `DTEND:${icalTime(e.end)}`,
    e.place && `LOCATION:${vEscape(e.place)}`,
    e.url && `URL:${withScheme(e.url)}`,
    'END:VEVENT',
  ]
  return lines.filter(Boolean).join('\n')
}

/** «53.2434, 34.3633» as copied from Yandex Maps → geo:53.2434,34.3633 */
export function geoPayload(coordinates: string) {
  let numbers = coordinates.match(/-?\d+(?:[.,]\d+)?/g)?.map((n) => parseFloat(n.replace(',', '.')))
  if (!numbers || numbers.length !== 2) return ''
  let [lat, lng] = numbers
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return ''
  return `geo:${lat},${lng}`
}

/** Renders an SVG document to PNG, `width` pixels wide */
export async function pngBlob(svg: string, width: number, height: number, background: string | null) {
  let url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    let image = new Image()
    image.src = url
    await image.decode()
    let canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    let context = canvas.getContext('2d')!
    if (background) {
      context.fillStyle = background
      context.fillRect(0, 0, width, height)
    }
    context.drawImage(image, 0, 0, width, height)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG'))), 'image/png'),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
