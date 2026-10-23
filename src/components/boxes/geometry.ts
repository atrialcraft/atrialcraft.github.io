// Box nets for the generator: pure geometry, all sizes in millimetres.
// SVG coordinates: x to the right, y down. Every part is drawn from (0, 0).

export type Part = {
  name: string
  /** SVG path data of the cutting lines */
  cut: string[]
  /** SVG path data of the folding (scoring) lines */
  fold: string[]
  width: number
  height: number
}

type Point = [number, number]

const round = (n: number) => Math.round(n * 1000) / 1000

function pathOf(points: Point[], closed = true) {
  return (
    points
      .map(([x, y], i) => `${i ? 'L' : 'M'}${round(x)} ${round(y)}`)
      .join(' ') + (closed ? ' Z' : '')
  )
}

// ———————————————————— Laser: boxes with finger joints ————————————————————

/**
 * A face edge: straight (`flat`) or with fingers. `endsOut` — the end
 * segments stick out to the outer line; the face on the other side of the
 * edge has the opposite pattern, so the fingers interlock
 */
type Edge = { fingers: false } | { fingers: true; endsOut: boolean }

const OUT: Edge = { fingers: true, endsOut: true }
const IN: Edge = { fingers: true, endsOut: false }
const FLAT: Edge = { fingers: false }

/** Odd number of segments, so both ends of an edge are alike; at least 3 */
export function fingerCount(length: number, fingerWidth: number) {
  let n = Math.max(3, Math.floor(length / fingerWidth))
  return n % 2 === 0 ? n - 1 : n
}

/**
 * Outline of a face `a` × `b` with its four edges (top, right, bottom,
 * left). A segment sticking out lies on the outer line, a recessed one is
 * `t` inside. Each corner is where the depth lines of its two edges cross,
 * so of the three faces meeting at a box corner exactly one fills it
 */
function faceOutline(
  a: number,
  b: number,
  edges: [Edge, Edge, Edge, Edge],
  t: number,
  fingerWidth: number,
): Point[] {
  // Per edge: start corner, direction, inward normal, length
  let sides = [
    { start: [0, 0], dir: [1, 0], inward: [0, 1], length: a },
    { start: [a, 0], dir: [0, 1], inward: [-1, 0], length: b },
    { start: [a, b], dir: [-1, 0], inward: [0, -1], length: a },
    { start: [0, b], dir: [0, -1], inward: [1, 0], length: b },
  ] as const

  let depth = (edge: Edge, i: number) =>
    !edge.fingers ? 0 : (i % 2 === 0) === edge.endsOut ? 0 : t

  let points: Point[] = []
  sides.forEach((side, k) => {
    let edge = edges[k]
    let n = edge.fingers ? fingerCount(side.length, fingerWidth) : 1
    let previous = sides[(k + 3) % 4]
    let previousEdge = edges[(k + 3) % 4]
    let previousN = previousEdge.fingers
      ? fingerCount(previous.length, fingerWidth)
      : 1
    let endDepth = depth(previousEdge, previousN - 1)
    let startDepth = depth(edge, 0)
    // Corner where the previous edge ends and this one starts
    points.push([
      side.start[0] +
        previous.inward[0] * endDepth +
        side.inward[0] * startDepth,
      side.start[1] +
        previous.inward[1] * endDepth +
        side.inward[1] * startDepth,
    ])
    for (let i = 1; i < n; i++) {
      let s = (i * side.length) / n
      let before = depth(edge, i - 1)
      let after = depth(edge, i)
      if (before === after) continue
      for (let d of [before, after]) {
        points.push([
          side.start[0] + side.dir[0] * s + side.inward[0] * d,
          side.start[1] + side.dir[1] * s + side.inward[1] * d,
        ])
      }
    }
  })
  return simplify(points)
}

/** Drops repeated points and points in the middle of a straight line */
function simplify(points: Point[]) {
  let unique = points.filter((p, i) => {
    let q = points[(i + points.length - 1) % points.length]
    return Math.abs(p[0] - q[0]) > 1e-9 || Math.abs(p[1] - q[1]) > 1e-9
  })
  return unique.filter((p, i) => {
    let a = unique[(i + unique.length - 1) % unique.length]
    let b = unique[(i + 1) % unique.length]
    let cross = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])
    return Math.abs(cross) > 1e-9
  })
}

/**
 * Kerf compensation: the beam burns away `kerf` of material, so every edge
 * moves outward by half of it and the joints come out tight. The outline
 * is clockwise on screen and has right angles only
 */
function offsetOutline(points: Point[], distance: number): Point[] {
  if (!distance) return points
  let normal = (p: Point, q: Point): Point => {
    let dx = q[0] - p[0]
    let dy = q[1] - p[1]
    let length = Math.hypot(dx, dy)
    return [dy / length, -dx / length]
  }
  return points.map((p, i) => {
    let previous = points[(i + points.length - 1) % points.length]
    let next = points[(i + 1) % points.length]
    let n1 = normal(previous, p)
    let n2 = normal(p, next)
    return [
      p[0] + distance * (n1[0] + n2[0]),
      p[1] + distance * (n1[1] + n2[1]),
    ]
  })
}

export type LaserBoxType = 'closed' | 'open'

export type LaserBoxOptions = {
  type: LaserBoxType
  length: number
  width: number
  height: number
  /** true — the sizes are the inside of the box, false — the outside */
  inner: boolean
  thickness: number
  fingerWidth: number
  kerf: number
}

export function laserBox(o: LaserBoxOptions): Part[] {
  let t = o.thickness
  let closed = o.type === 'closed'
  let x = o.inner ? o.length + 2 * t : o.length
  let y = o.inner ? o.width + 2 * t : o.width
  let z = o.inner ? o.height + (closed ? 2 * t : t) : o.height
  let top = closed ? OUT : FLAT

  let face = (
    name: string,
    a: number,
    b: number,
    edges: [Edge, Edge, Edge, Edge],
  ) => {
    let outline = offsetOutline(
      faceOutline(a, b, edges, t, o.fingerWidth),
      o.kerf / 2,
    )
    let shift = o.kerf / 2
    return {
      name,
      cut: [
        pathOf(outline.map(([px, py]) => [px + shift, py + shift] as Point)),
      ],
      fold: [],
      width: a + o.kerf,
      height: b + o.kerf,
    }
  }

  // Front and back own the box corners, the bottom and the lid sit inside
  // all four walls, the side walls sit between the front and the back
  let parts = [
    face('Дно', x, y, [IN, IN, IN, IN]),
    face('Перед', x, z, [top, OUT, OUT, OUT]),
    face('Зад', x, z, [top, OUT, OUT, OUT]),
    face('Левый бок', y, z, [closed ? OUT : FLAT, IN, OUT, IN]),
    face('Правый бок', y, z, [closed ? OUT : FLAT, IN, OUT, IN]),
  ]
  if (closed) parts.splice(1, 0, face('Крышка', x, y, [IN, IN, IN, IN]))
  return parts
}

/** Outside size of a finished laser box */
export function laserBoxOuter(o: LaserBoxOptions) {
  let t = o.thickness
  return o.inner
    ? {
        length: o.length + 2 * t,
        width: o.width + 2 * t,
        height: o.height + (o.type === 'closed' ? 2 * t : t),
      }
    : { length: o.length, width: o.width, height: o.height }
}

// ———————————————————— Cardboard: folding boxes ————————————————————

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export type CardboardOptions = {
  /** Inside sizes */
  length: number
  width: number
  height: number
  thickness: number
}

/**
 * Tuck end box (the classic folding carton): four walls in a row with a
 * glue flap, a lid with a tuck flap on top of the back wall and another
 * on the bottom of the front wall, dust flaps on the side walls
 */
export function tuckEndBox(o: CardboardOptions): Part[] {
  let t = o.thickness
  let long = o.length + t
  let short = o.width + t
  let h = o.height + t
  let glue = clamp(Math.min(o.length, o.width) * 0.3, 8, 15)
  let tuck = clamp(o.width * 0.45, 8, 25)
  let dust = clamp(o.width * 0.45, 6, 40)
  let lid = short

  let a0 = glue
  let a1 = a0 + long
  let b1 = a1 + short
  let c1 = b1 + long
  let d1 = c1 + short
  let shift = lid + tuck

  let path: string[] = []
  let at = (x: number, y: number) => `${round(x)} ${round(y + shift)}`
  let line = (x: number, y: number) => path.push(`L${at(x, y)}`)

  // Dust flap from x0 to x1 hinged on the line y, pointing up (-1) or down (+1)
  let dustFlap = (x0: number, x1: number, y: number, direction: number) => {
    let sign = Math.sign(x1 - x0)
    let slant = Math.min(dust * 0.35, Math.abs(x1 - x0) * 0.25)
    line(x0 + sign * slant, y + direction * dust)
    line(x1 - sign * slant, y + direction * dust)
    line(x1, y)
  }
  // Tuck flap along the free edge of a lid, from xs to xe, with round corners
  let tuckFlap = (xs: number, xe: number, y: number, direction: number) => {
    let sign = Math.sign(xe - xs)
    let inset = Math.min(2, Math.abs(xe - xs) * 0.05)
    let r = Math.min(tuck * 0.6, Math.abs(xe - xs) * 0.2)
    let far = y + direction * tuck
    line(xs + sign * inset, far - direction * r)
    path.push(
      `Q${at(xs + sign * inset, far)} ${at(xs + sign * (inset + r), far)}`,
    )
    line(xe - sign * (inset + r), far)
    path.push(
      `Q${at(xe - sign * inset, far)} ${at(xe - sign * inset, far - direction * r)}`,
    )
    line(xe, y)
  }

  path.push(`M${at(a0, 0)}`)
  line(a1, 0)
  dustFlap(a1, b1, 0, -1)
  line(b1, -lid)
  tuckFlap(b1, c1, -lid, -1)
  line(c1, 0)
  dustFlap(c1, d1, 0, -1)
  line(d1, h)
  dustFlap(d1, c1, h, 1)
  line(b1, h)
  dustFlap(b1, a1, h, 1)
  line(a1, h + lid)
  tuckFlap(a1, a0, h + lid, 1)
  line(a0, h)
  let chamfer = Math.min(glue, h / 4)
  line(0, h - chamfer)
  line(0, chamfer)
  path.push('Z')

  let fold = (x1: number, y1: number, x2: number, y2: number) =>
    `M${at(x1, y1)} L${at(x2, y2)}`

  return [
    {
      name: 'Развёртка',
      cut: [path.join(' ')],
      fold: [
        // Wall edges and the glue flap
        ...[a0, a1, b1, c1].map((x) => fold(x, 0, x, h)),
        // Lid hinges, dust flap hinges
        fold(a1, 0, d1, 0),
        fold(a0, h, a1, h),
        fold(a1, h, b1, h),
        fold(c1, h, d1, h),
        // Tuck flap hinges
        fold(b1, -lid, c1, -lid),
        fold(a0, h + lid, a1, h + lid),
      ],
      width: d1,
      height: h + 2 * shift,
    },
  ]
}

/**
 * Tray: a bottom with four walls; the corner flaps on the long walls fold
 * inside the short walls and are glued there
 */
function trayPart(
  name: string,
  length: number,
  width: number,
  height: number,
): Part {
  let l = length
  let w = width
  let h = height
  let flap = Math.min(h - 1, w / 2 - 1, 30)
  let gap = 1.5
  let p: Point[] = [
    [h, 0],
    [h + l, 0],
    // Right top corner flap
    [h + l + flap, gap],
    [h + l + flap, h - flap * 0.5],
    [h + l + gap, h],
    [l + 2 * h, h],
    [l + 2 * h, h + w],
    [h + l + gap, h + w],
    // Right bottom corner flap
    [h + l + flap, h + w + flap * 0.5],
    [h + l + flap, w + 2 * h - gap],
    [h + l, w + 2 * h],
    [h, w + 2 * h],
    // Left bottom corner flap
    [h - flap, w + 2 * h - gap],
    [h - flap, h + w + flap * 0.5],
    [h - gap, h + w],
    [0, h + w],
    [0, h],
    [h - gap, h],
    // Left top corner flap
    [h - flap, h - flap * 0.5],
    [h - flap, gap],
  ]
  let fold = (x1: number, y1: number, x2: number, y2: number) =>
    `M${round(x1)} ${round(y1)} L${round(x2)} ${round(y2)}`
  return {
    name,
    cut: [pathOf(p)],
    fold: [
      // Bottom edges
      fold(h, h, h + l, h),
      fold(h, h + w, h + l, h + w),
      fold(h, h, h, h + w),
      fold(h + l, h, h + l, h + w),
      // Corner flap hinges
      fold(h, 0, h, h),
      fold(h + l, 0, h + l, h),
      fold(h, h + w, h, w + 2 * h),
      fold(h + l, h + w, h + l, w + 2 * h),
    ],
    width: l + 2 * h,
    height: w + 2 * h,
  }
}

export function tray(o: CardboardOptions): Part[] {
  let t = o.thickness
  return [trayPart('Лоток', o.length + t, o.width + t, o.height + t)]
}

/** Two trays: the box and a slightly larger lid that slips over it */
export function trayWithLid(
  o: CardboardOptions & { lidHeight: number },
): Part[] {
  let t = o.thickness
  let length = o.length + t
  let width = o.width + t
  return [
    trayPart('Дно', length, width, o.height + t),
    // The lid goes over the walls: two thicknesses plus a millimetre of play
    trayPart('Крышка', length + 2 * t + 1, width + 2 * t + 1, o.lidHeight + t),
  ]
}

// ———————————————————— Layout and export ————————————————————

export type Placed = Part & { x: number; y: number }

/** Parts in rows on a sheet no wider than `maxWidth` (or the widest part) */
export function layout(parts: Part[], gap = 5, maxWidth = 600) {
  let limit = Math.max(maxWidth, ...parts.map((p) => p.width))
  let placed: Placed[] = []
  let x = 0
  let y = 0
  let rowHeight = 0
  for (let part of parts) {
    if (x > 0 && x + part.width > limit) {
      x = 0
      y += rowHeight + gap
      rowHeight = 0
    }
    placed.push({ ...part, x, y })
    x += part.width + gap
    rowHeight = Math.max(rowHeight, part.height)
  }
  let width = Math.max(...placed.map((p) => p.x + p.width))
  let height = Math.max(...placed.map((p) => p.y + p.height))
  return { placed, width, height }
}

/**
 * SVG in millimetres for LightBurn and other laser software: cuts in red,
 * folds in blue (a separate layer, e.g. low power for scoring)
 */
export function toSvg(parts: Part[]) {
  let { placed, width, height } = layout(parts)
  let margin = 2
  let w = round(width + 2 * margin)
  let h = round(height + 2 * margin)
  let groups = placed
    .map(
      (p) =>
        `  <g transform="translate(${round(p.x + margin)} ${round(p.y + margin)})">\n` +
        p.cut.map((d) => `    <path d="${d}" stroke="#ff0000" />\n`).join('') +
        p.fold
          .map(
            (d) =>
              `    <path d="${d}" stroke="#0000ff" stroke-dasharray="2 1.5" />\n`,
          )
          .join('') +
        '  </g>\n',
    )
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" fill="none" stroke-width="0.1">\n` +
    groups +
    '</svg>\n'
  )
}
