import { createQR } from '@vkontakte/vk-qr'

// QR codes in the VK style (VKCOM/vk-qr, MIT), as on vkqr.ru

export type Logo =
  | { kind: 'none' }
  /** Vector logo: the Atrial mark or an uploaded SVG */
  | { kind: 'svg'; svg: string }
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
  if (logo.kind !== 'svg') return svg
  let inner = svgLogo(logo.svg) ?? ''
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

/**
 * The library builds the code from hundreds of overlapping tiles referenced
 * with <use>, which LightBurn opens as separate pieces. Here the tiles are
 * expanded and merged into one outline, with the empty parts of the logo cut
 * out: one closed shape per island, ready for engraving or cutting.
 * Returns a function that places the outline into a square of the design.
 */
export async function mergedCode(markup: string, color: string) {
  let { default: paper } = await import('paper/dist/paper-core')
  let doc = new DOMParser().parseFromString(markup, 'image/svg+xml')
  let root = doc.documentElement

  // <use> → copy of the referenced element; the first with that id wins, as in a browser
  doc.querySelectorAll('use').forEach((use) => {
    let id = (use.getAttribute('xlink:href') ?? use.getAttribute('href') ?? '').slice(1)
    let source = doc.getElementById(id)
    if (!source) return use.remove()
    let copy = source.cloneNode(true) as Element
    copy.removeAttribute('id')
    // The <use> keeps its own transform and fill-rule (the finder eyes are evenodd)
    let group = doc.createElementNS('http://www.w3.org/2000/svg', 'g')
    for (let { name, value } of [...use.attributes]) {
      if (!['href', 'xlink:href', 'x', 'y', 'width', 'height'].includes(name)) group.setAttribute(name, value)
    }
    let x = parseFloat(use.getAttribute('x') ?? '0') || 0
    let y = parseFloat(use.getAttribute('y') ?? '0') || 0
    if (x || y) group.setAttribute('transform', `${group.getAttribute('transform') ?? ''} translate(${x} ${y})`)
    group.append(copy)
    use.replaceWith(group)
  })
  root.querySelector('defs')?.remove()
  // Boolean operations read the fill rule of each path, not of its group
  root.querySelectorAll('[fill-rule]').forEach((node) => {
    node.querySelectorAll('path:not([fill-rule])').forEach((path) => path.setAttribute('fill-rule', node.getAttribute('fill-rule')!))
  })
  // An uploaded picture logo stays a picture, beside the outline
  let images = [...root.querySelectorAll('image')]
  images.forEach((image) => image.remove())

  // Without the pixel size paper.js keeps the viewBox units
  root.removeAttribute('width')
  root.removeAttribute('height')

  let project = new paper.Project(new paper.Size(1, 1))
  let imported = project.importSVG(root as unknown as SVGElement, { expandShapes: true, insert: true })
  // Parts of a compound path come back too, without its colour: only whole shapes count
  let shapes = (imported.getItems({ class: paper.PathItem }) as paper.PathItem[]).filter(
    (item) => !(item.parent instanceof paper.CompoundPath),
  )
  let solid = new paper.Color(color)

  // Empty or light parts in another colour are holes, as white details of an uploaded logo
  let isHole = (item: paper.PathItem) => {
    let fill = item.fillColor
    return !fill || fill.alpha === 0 || (!fill.equals(solid) && fill.lightness > 0.85)
  }

  let unite = (items: paper.PathItem[]): paper.PathItem => {
    if (items.length === 1) return items[0]
    let middle = items.length >> 1
    return unite(items.slice(0, middle)).unite(unite(items.slice(middle)), { insert: false })
  }

  // Runs of solid shapes are merged together, then the holes drawn over them are cut out
  let runs: { hole: boolean; items: paper.PathItem[] }[] = []
  for (let shape of shapes) {
    let hole = isHole(shape)
    let last = runs.at(-1)
    if (last && last.hole === hole) last.items.push(shape)
    else runs.push({ hole, items: [shape] })
  }
  let result: paper.PathItem | null = null
  for (let { hole, items } of runs) {
    let merged = unite(items)
    if (hole) result = result ? result.subtract(merged, { insert: false }) : null
    else result = result ? result.unite(merged, { insert: false }) : merged
  }

  let units = Number(root.getAttribute('viewBox')?.split(/\s+/)[2]) || 256
  let d = result ? (result as paper.PathItem).pathData : ''
  project.remove()
  let serializer = new XMLSerializer()
  let pictures = images.map((node) => serializer.serializeToString(node)).join('\n')

  return (x: number, y: number, size: number) =>
    `<g transform="translate(${x} ${y}) scale(${size / units})">${pictures}<path fill="${color}" d="${d}"/></g>`
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
