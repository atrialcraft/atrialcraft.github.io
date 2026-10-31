import { createQR } from '@vkontakte/vk-qr'

// QR codes in the VK style (VKCOM/vk-qr, MIT), as on vkqr.ru

export type Logo =
  | { kind: 'none' }
  /** VK logo of the library: in the code colour or VK blue */
  | { kind: 'vk' | 'vk-blue' }
  /** Vector logo: the Atrial mark or an uploaded SVG */
  | { kind: 'svg'; svg: string }
  /** Uploaded PNG or JPEG, as a data URL */
  | { kind: 'image'; image: string }

export type QrDesign = {
  color: string
  background: boolean
  logo: Logo
}

/** The library leaves a 750 × 750 hole in the centre for the logo */
const logoBox = 750

/** Atrial mark (/icon.svg): the dark pieces take the code colour, the light «A» between them is white */
export function recolorMark(markup: string, color: string) {
  return markup.replace(/fill="#111(111)?"/gi, `fill="${color}"`).replace(/fill="#ededed"/gi, 'fill="#ffffff"')
}

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
    isShowBackground: design.background,
    foregroundColor: design.color,
    logoColor: logo.kind === 'vk-blue' ? '#0077ff' : design.color,
    // Anything but empty: the library then draws a picture instead of its VK logo
    logoData: logo.kind === 'image' ? logo.image : logo.kind === 'svg' ? 'logo' : undefined,
    suffix: 'atrial',
  })
  if (logo.kind !== 'svg') return svg
  let inner = svgLogo(logo.svg)
  if (inner === null) return svg
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
  firstName: string
  lastName: string
  phone: string
  email: string
  company: string
  site: string
}) {
  if (!Object.values(c).some((v) => v.trim())) return ''
  let lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${vEscape(c.lastName)};${vEscape(c.firstName)};;;`,
    `FN:${vEscape([c.firstName, c.lastName].filter(Boolean).join(' '))}`,
    c.company && `ORG:${vEscape(c.company)}`,
    c.phone && `TEL;TYPE=CELL:${c.phone}`,
    c.email && `EMAIL:${c.email}`,
    c.site && `URL:${withScheme(c.site)}`,
    'END:VCARD',
  ]
  return lines.filter(Boolean).join('\n')
}

/** datetime-local value → iCalendar local time, 20261031T1900 → 20261031T190000 */
const icalTime = (value: string) => value.replace(/[-:]/g, '').padEnd(15, '0')

export function eventPayload(e: { title: string; start: string; end: string; place: string }) {
  if (!e.title || !e.start) return ''
  let lines = [
    'BEGIN:VEVENT',
    `SUMMARY:${vEscape(e.title)}`,
    `DTSTART:${icalTime(e.start)}`,
    e.end && `DTEND:${icalTime(e.end)}`,
    e.place && `LOCATION:${vEscape(e.place)}`,
    'END:VEVENT',
  ]
  return lines.filter(Boolean).join('\n')
}

export function geoPayload(g: { lat: string; lng: string }) {
  let lat = parseFloat(g.lat.replace(',', '.'))
  let lng = parseFloat(g.lng.replace(',', '.'))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return ''
  return `geo:${lat},${lng}`
}

/**
 * The library builds the code from hundreds of overlapping tiles referenced
 * with <use>, which LightBurn opens as separate pieces. Here the tiles are
 * expanded and merged into one outline, with the white parts of the logo cut
 * out: one closed shape per island, ready for engraving or cutting.
 */
export async function mergedSvg(markup: string, design: QrDesign, sizeMm: number) {
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
  // Background and pictures stay as they are, beside the outline
  let background = root.querySelector(':scope > rect')
  background?.remove()
  let images = [...root.querySelectorAll('image')]
  images.forEach((image) => image.remove())

  // Without the pixel size paper.js keeps the viewBox units, as the outline is written below
  root.removeAttribute('width')
  root.removeAttribute('height')

  let project = new paper.Project(new paper.Size(1, 1))
  let imported = project.importSVG(root as unknown as SVGElement, { expandShapes: true, insert: true })
  // Parts of a compound path come back too, without its colour: only whole shapes count
  let shapes = (imported.getItems({ class: paper.PathItem }) as paper.PathItem[]).filter(
    (item) => !(item.parent instanceof paper.CompoundPath),
  )
  let color = new paper.Color(design.color)

  // Light parts in another colour are holes: the white «VK», the «A» of the Atrial mark
  let isHole = (item: paper.PathItem) => {
    let fill = item.fillColor
    return !fill || fill.alpha === 0 || (!fill.equals(color) && fill.lightness > 0.85)
  }

  let unite = (items: paper.PathItem[]): paper.PathItem | null => {
    if (!items.length) return null
    if (items.length === 1) return items[0]
    let middle = items.length >> 1
    let a = unite(items.slice(0, middle))!
    let b = unite(items.slice(middle))!
    return a.unite(b, { insert: false })
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
    let merged = unite(items)!
    if (hole) result = result ? result.subtract(merged, { insert: false }) : null
    else result = result ? result.unite(merged, { insert: false }) : merged
  }

  let viewBox = root.getAttribute('viewBox') ?? '0 0 100 100'
  let d = result ? (result as paper.PathItem).pathData : ''
  project.remove()

  let serializer = new XMLSerializer()
  let extras = [background, ...images]
    .filter(Boolean)
    .map((node) => serializer.serializeToString(node!))
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}" width="${sizeMm}mm" height="${sizeMm}mm">
${extras}
<path fill="${design.color}" fill-rule="nonzero" d="${d}"/>
</svg>
`
}

/**
 * Raster copy for messengers and print shops. Without the library's own
 * background it gets a white square with a quiet zone: a transparent code
 * turns black on black in a dark chat and scanners need the margin.
 */
export async function pngBlob(markup: string, size: number, background: boolean) {
  let margin = background ? 0 : Math.round(size * 0.06)
  let inner = size - 2 * margin
  let svg = markup.replace(/width="[^"]*px"/, `width="${inner}px"`).replace(/height="[^"]*px"/, `height="${inner}px"`)
  let url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    let image = new Image()
    image.src = url
    await image.decode()
    let canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    let context = canvas.getContext('2d')!
    if (!background) {
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, size, size)
    }
    context.drawImage(image, margin, margin, inner, inner)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG'))), 'image/png'),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
