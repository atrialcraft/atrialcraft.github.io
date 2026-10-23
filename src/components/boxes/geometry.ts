// Box designs for the generator: pure geometry, all sizes in millimetres.
// Dieline coordinates: x to the right, y down.
//
// Cardboard boxes are nets of panels joined by hinges. The same panels give
// the dieline (cut and fold lines) and the 3D model that folds up. Laser
// boxes are six (or five) plates with finger joints.

export type Point = [number, number]

/** A dimension arrow on the dieline preview */
export type Dimension = { from: Point; to: Point; label: string }

/** One piece of material on the dieline, drawn from (0, 0) */
export type Part = {
  name: string
  /** Polylines of the cutting lines */
  cut: Point[][]
  /** Polylines of the folding (scoring) lines */
  fold: Point[][]
  dims: Dimension[]
  width: number
  height: number
}

/**
 * A panel of a net. A child panel turns around its hinge (two points on the
 * shared edge) by `angle` degrees; `stage` is the part of the folding
 * animation, 0…1, during which it turns
 */
export type Panel = {
  poly: Point[]
  parent?: number
  hinge?: [Point, Point]
  angle?: number
  stage?: [number, number]
}

export type Net = {
  name: string
  panels: Panel[]
  /** 'standing' — panel 0 is a wall, 'lying' — panel 0 is the bottom */
  base: 'standing' | 'lying'
  /** A lid net is shown upside down above the box net */
  lid?: { lift: number; boxHeight: number; boxCenter: Point; center: Point }
  dims: Dimension[]
}

export type PlateFace = 'bottom' | 'top' | 'front' | 'back' | 'left' | 'right'

export type Model3D =
  | { kind: 'nets'; nets: Net[]; thickness: number }
  | {
      kind: 'plates'
      plates: { face: PlateFace; outline: Point[] }[]
      size: [number, number, number]
      thickness: number
    }

export type Design = {
  parts: Part[]
  model: Model3D
  inner: [number, number, number]
  outer: [number, number, number]
}

const round = (n: number) => Math.round(n * 1000) / 1000
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))
const rect = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]

// ———————————————————— Laser: boxes with finger joints ————————————————————

/**
 * A face edge: straight or with fingers. `endsOut` — the end segments stick
 * out to the outer line; the face on the other side of the edge has the
 * opposite pattern, so the fingers interlock
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
  let sides = [
    { start: [0, 0], dir: [1, 0], inward: [0, 1], length: a },
    { start: [a, 0], dir: [0, 1], inward: [-1, 0], length: b },
    { start: [a, b], dir: [-1, 0], inward: [0, -1], length: a },
    { start: [0, b], dir: [0, -1], inward: [1, 0], length: b },
  ] as const
  let count = (edge: Edge, length: number) =>
    edge.fingers ? fingerCount(length, fingerWidth) : 1
  let depth = (edge: Edge, i: number) =>
    !edge.fingers ? 0 : (i % 2 === 0) === edge.endsOut ? 0 : t

  let points: Point[] = []
  sides.forEach((side, k) => {
    let edge = edges[k]
    let n = count(edge, side.length)
    let previous = sides[(k + 3) % 4]
    let previousEdge = edges[(k + 3) % 4]
    let endDepth = depth(previousEdge, count(previousEdge, previous.length) - 1)
    let startDepth = depth(edge, 0)
    // The corner where the previous edge ends and this one starts
    points.push([
      side.start[0] + previous.inward[0] * endDepth + side.inward[0] * startDepth,
      side.start[1] + previous.inward[1] * endDepth + side.inward[1] * startDepth,
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
 * moves outward by half of it and the joints come out tight. The outline is
 * clockwise on screen and has right angles only
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
    let n1 = normal(points[(i + points.length - 1) % points.length], p)
    let n2 = normal(p, points[(i + 1) % points.length])
    return [p[0] + distance * (n1[0] + n2[0]), p[1] + distance * (n1[1] + n2[1])]
  })
}

export type LaserOptions = {
  closed: boolean
  length: number
  width: number
  height: number
  /** true — the sizes are the inside of the box, false — the outside */
  inner: boolean
  thickness: number
  fingerWidth: number
  kerf: number
}

export function laserOuter(o: LaserOptions): [number, number, number] {
  let t = o.thickness
  return o.inner
    ? [o.length + 2 * t, o.width + 2 * t, o.height + (o.closed ? 2 : 1) * t]
    : [o.length, o.width, o.height]
}

export function laserBox(o: LaserOptions): Design {
  let t = o.thickness
  let [x, y, z] = laserOuter(o)
  let top = o.closed ? OUT : FLAT

  // Front and back own the box corners, the bottom and the lid sit inside
  // all four walls, the side walls sit between the front and the back
  let faces: { face: PlateFace; name: string; a: number; b: number; edges: [Edge, Edge, Edge, Edge] }[] = [
    { face: 'bottom', name: 'Дно', a: x, b: y, edges: [IN, IN, IN, IN] },
    ...(o.closed
      ? [{ face: 'top' as const, name: 'Крышка', a: x, b: y, edges: [IN, IN, IN, IN] as [Edge, Edge, Edge, Edge] }]
      : []),
    { face: 'front', name: 'Перед', a: x, b: z, edges: [top, OUT, OUT, OUT] },
    { face: 'back', name: 'Зад', a: x, b: z, edges: [top, OUT, OUT, OUT] },
    { face: 'left', name: 'Левый бок', a: y, b: z, edges: [top === OUT ? OUT : FLAT, IN, OUT, IN] },
    { face: 'right', name: 'Правый бок', a: y, b: z, edges: [top === OUT ? OUT : FLAT, IN, OUT, IN] },
  ]

  let plates = faces.map((f) => ({
    face: f.face,
    outline: faceOutline(f.a, f.b, f.edges, t, o.fingerWidth),
  }))
  let parts: Part[] = faces.map((f, i) => {
    let shift = o.kerf / 2
    let outline = offsetOutline(plates[i].outline, shift).map(
      ([px, py]) => [px + shift, py + shift] as Point,
    )
    let dims: Dimension[] =
      f.face === 'bottom'
        ? [
            { from: [0, f.b * 0.3], to: [f.a, f.b * 0.3], label: `${round(f.a)}` },
            { from: [f.a * 0.75, 0], to: [f.a * 0.75, f.b], label: `${round(f.b)}` },
          ]
        : f.face === 'front'
          ? [{ from: [f.a * 0.75, 0], to: [f.a * 0.75, f.b], label: `${round(f.b)}` }]
          : []
    return {
      name: f.name,
      cut: [[...outline, outline[0]]],
      fold: [],
      dims,
      width: f.a + o.kerf,
      height: f.b + o.kerf,
    }
  })

  let inner: [number, number, number] = [x - 2 * t, y - 2 * t, z - (o.closed ? 2 : 1) * t]
  return {
    parts,
    model: { kind: 'plates', plates, size: [x, y, z], thickness: t },
    inner,
    outer: [x, y, z],
  }
}

// ———————————————————— Cardboard nets ————————————————————

export type CardboardOptions = {
  /** Inside sizes */
  length: number
  width: number
  height: number
  thickness: number
}

/** Quadratic curve from a through the control point c to b, as points after a */
function curve(a: Point, c: Point, b: Point, steps = 6): Point[] {
  let points: Point[] = []
  for (let i = 1; i <= steps; i++) {
    let s = i / steps
    points.push([
      (1 - s) ** 2 * a[0] + 2 * (1 - s) * s * c[0] + s ** 2 * b[0],
      (1 - s) ** 2 * a[1] + 2 * (1 - s) * s * c[1] + s ** 2 * b[1],
    ])
  }
  return points
}

/**
 * Tuck flap hinged on (xs, y)–(xe, y), reaching `depth` up (-1) or down (+1),
 * with slightly tapered sides and round corners
 */
function tuckFlap(xs: number, xe: number, y: number, direction: number, depth: number): Point[] {
  let sign = Math.sign(xe - xs)
  let inset = Math.min(2, Math.abs(xe - xs) * 0.05)
  let r = Math.min(depth * 0.6, Math.abs(xe - xs) * 0.2)
  let far = y + direction * depth
  let p1: Point = [xs + sign * inset, far - direction * r]
  let p2: Point = [xe - sign * inset, far - direction * r]
  return [
    [xs, y],
    p1,
    ...curve(p1, [xs + sign * inset, far], [xs + sign * (inset + r), far]),
    [xe - sign * (inset + r), far],
    ...curve([xe - sign * (inset + r), far], [xe - sign * inset, far], p2),
    [xe, y],
  ]
}

/** Dust flap hinged on (x0, y)–(x1, y), with slanted sides */
function dustFlap(x0: number, x1: number, y: number, direction: number, depth: number): Point[] {
  let sign = Math.sign(x1 - x0)
  let slant = Math.min(depth * 0.35, Math.abs(x1 - x0) * 0.25)
  return [
    [x0, y],
    [x0 + sign * slant, y + direction * depth],
    [x1 - sign * slant, y + direction * depth],
    [x1, y],
  ]
}

/** Classic folding carton with tuck flaps on the top and the bottom */
export function tuckEndNet(o: CardboardOptions): Net {
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
  let chamfer = Math.min(glue, h / 4)
  let walls: [number, number] = [0, 0.45]

  let panels: Panel[] = [
    { poly: rect(a0, 0, a1, h) }, // 0 front
    { poly: rect(a1, 0, b1, h), parent: 0, hinge: [[a1, 0], [a1, h]], angle: 90, stage: walls },
    { poly: rect(b1, 0, c1, h), parent: 1, hinge: [[b1, 0], [b1, h]], angle: 90, stage: walls },
    { poly: rect(c1, 0, d1, h), parent: 2, hinge: [[c1, 0], [c1, h]], angle: 90, stage: walls },
    // Glue flap
    {
      poly: [[a0, 0], [0, chamfer], [0, h - chamfer], [a0, h]],
      parent: 0,
      hinge: [[a0, 0], [a0, h]],
      angle: 90,
      stage: walls,
    },
    // Top: dust flaps on the sides, the lid on the back, its tuck flap
    { poly: dustFlap(a1, b1, 0, -1, dust), parent: 1, hinge: [[a1, 0], [b1, 0]], angle: 90, stage: [0.45, 0.6] },
    { poly: dustFlap(c1, d1, 0, -1, dust), parent: 3, hinge: [[c1, 0], [d1, 0]], angle: 90, stage: [0.45, 0.6] },
    { poly: rect(b1, -lid, c1, 0), parent: 2, hinge: [[b1, 0], [c1, 0]], angle: 90, stage: [0.65, 0.85] },
    { poly: tuckFlap(b1, c1, -lid, -1, tuck), parent: 7, hinge: [[b1, -lid], [c1, -lid]], angle: 90, stage: [0.8, 1] },
    // Bottom, the same upside down: the lid is on the front
    { poly: dustFlap(a1, b1, h, 1, dust), parent: 1, hinge: [[a1, h], [b1, h]], angle: 90, stage: [0.45, 0.6] },
    { poly: dustFlap(c1, d1, h, 1, dust), parent: 3, hinge: [[c1, h], [d1, h]], angle: 90, stage: [0.45, 0.6] },
    { poly: rect(a0, h, a1, h + lid), parent: 0, hinge: [[a0, h], [a1, h]], angle: 90, stage: [0.6, 0.8] },
    { poly: tuckFlap(a0, a1, h + lid, 1, tuck), parent: 11, hinge: [[a0, h + lid], [a1, h + lid]], angle: 90, stage: [0.75, 0.95] },
  ]
  return {
    name: 'Развёртка',
    panels,
    base: 'standing',
    dims: [
      { from: [a0, h * 0.5], to: [a1, h * 0.5], label: `${o.length}` },
      { from: [a1, h * 0.5], to: [b1, h * 0.5], label: `${o.width}` },
      { from: [b1 + long * 0.5, 0], to: [b1 + long * 0.5, h], label: `${o.height}` },
    ],
  }
}

/**
 * Tray: a bottom with four walls; the corner flaps on the long walls fold
 * inside the short walls and are glued there
 */
function trayNet(name: string, length: number, width: number, height: number, labels: [number, number, number]): Net {
  let l = length
  let w = width
  let h = height
  let flap = Math.min(h - 1, w / 2 - 1, 30)
  let gap = 1.5
  let long: [number, number] = [0, 0.35]
  let corners: [number, number] = [0.3, 0.6]
  let short: [number, number] = [0.55, 0.9]
  let panels: Panel[] = [
    { poly: rect(h, h, h + l, h + w) }, // 0 bottom
    { poly: rect(h, 0, h + l, h), parent: 0, hinge: [[h, h], [h + l, h]], angle: 90, stage: long },
    { poly: rect(h, h + w, h + l, w + 2 * h), parent: 0, hinge: [[h, h + w], [h + l, h + w]], angle: 90, stage: long },
    { poly: rect(0, h, h, h + w), parent: 0, hinge: [[h, h], [h, h + w]], angle: 90, stage: short },
    { poly: rect(h + l, h, l + 2 * h, h + w), parent: 0, hinge: [[h + l, h], [h + l, h + w]], angle: 90, stage: short },
    // Corner flaps
    {
      poly: [[h, 0], [h, h], [h - gap, h], [h - flap, h - flap * 0.5], [h - flap, gap]],
      parent: 1, hinge: [[h, 0], [h, h]], angle: 90, stage: corners,
    },
    {
      poly: [[h + l, 0], [h + l + flap, gap], [h + l + flap, h - flap * 0.5], [h + l + gap, h], [h + l, h]],
      parent: 1, hinge: [[h + l, 0], [h + l, h]], angle: 90, stage: corners,
    },
    {
      poly: [[h, h + w], [h, w + 2 * h], [h - flap, w + 2 * h - gap], [h - flap, h + w + flap * 0.5], [h - gap, h + w]],
      parent: 2, hinge: [[h, h + w], [h, w + 2 * h]], angle: 90, stage: corners,
    },
    {
      poly: [[h + l, h + w], [h + l + gap, h + w], [h + l + flap, h + w + flap * 0.5], [h + l + flap, w + 2 * h - gap], [h + l, w + 2 * h]],
      parent: 2, hinge: [[h + l, h + w], [h + l, w + 2 * h]], angle: 90, stage: corners,
    },
  ]
  return {
    name,
    panels,
    base: 'lying',
    dims: [
      { from: [h, h + w * 0.3], to: [h + l, h + w * 0.3], label: `${labels[0]}` },
      { from: [h + l * 0.7, h], to: [h + l * 0.7, h + w], label: `${labels[1]}` },
      { from: [h + l * 0.3, 0], to: [h + l * 0.3, h], label: `${labels[2]}` },
    ],
  }
}

export function trayNets(o: CardboardOptions): Net[] {
  let t = o.thickness
  return [trayNet('Лоток', o.length + t, o.width + t, o.height + t, [o.length, o.width, o.height])]
}

/** Two trays: the box and a slightly larger lid that slips over it */
export function trayWithLidNets(o: CardboardOptions & { lidHeight: number }): Net[] {
  let t = o.thickness
  let l = o.length + t
  let w = o.width + t
  let h = o.height + t
  // The lid goes over the walls: two thicknesses plus a millimetre of play
  let ll = l + 2 * t + 1
  let lw = w + 2 * t + 1
  let lh = o.lidHeight + t
  let box = trayNet('Дно', l, w, h, [o.length, o.width, o.height])
  let lid = trayNet('Крышка', ll, lw, lh, [round(ll - t), round(lw - t), o.lidHeight])
  lid.lid = {
    lift: h * 1.2,
    boxHeight: h,
    boxCenter: [h + l / 2, h + w / 2],
    center: [lh + ll / 2, lh + lw / 2],
  }
  return [box, lid]
}

/**
 * Mailer box (self-locking, flip top): double side walls that fold over the
 * corner ears, a double front, the lid on the back with side flaps and a
 * tuck flap that goes inside the front
 */
export function mailerNet(o: CardboardOptions): Net {
  let t = o.thickness
  let l = o.length + 2 * t
  let w = o.width + t
  let h = o.height + t
  let tuck = Math.max(8, Math.min(h - t - 2, 40))
  let ear = Math.min(w / 2 - 2, 40)
  let lidFlap = Math.min(h * 0.8, w * 0.45)
  let sx = 2 * h
  let yb0 = tuck + w + h // top of the bottom
  let yb1 = yb0 + w
  let yl0 = yb0 - h - w // far edge of the lid
  let yl1 = yb0 - h
  let walls: [number, number] = [0, 0.25]
  let ears: [number, number] = [0.2, 0.4]
  let sides: [number, number] = [0.35, 0.55]
  let insides: [number, number] = [0.5, 0.7]

  let panels: Panel[] = [
    { poly: rect(sx, yb0, sx + l, yb1) }, // 0 bottom
    { poly: rect(sx, yl1, sx + l, yb0), parent: 0, hinge: [[sx, yb0], [sx + l, yb0]], angle: 90, stage: walls }, // 1 back
    { poly: rect(sx, yl0, sx + l, yl1), parent: 1, hinge: [[sx, yl1], [sx + l, yl1]], angle: 90, stage: [0.72, 0.9] }, // 2 lid
    { poly: tuckFlap(sx, sx + l, yl0, -1, tuck), parent: 2, hinge: [[sx, yl0], [sx + l, yl0]], angle: 90, stage: [0.85, 1] },
    { poly: rect(sx, yb1, sx + l, yb1 + h), parent: 0, hinge: [[sx, yb1], [sx + l, yb1]], angle: 90, stage: walls }, // 4 front
    // Inner front: folds down inside the front
    {
      poly: rect(sx + t, yb1 + h, sx + l - t, yb1 + 2 * h - t),
      parent: 4, hinge: [[sx + t, yb1 + h], [sx + l - t, yb1 + h]], angle: 180, stage: [0.25, 0.45],
    },
    // Ears on the ends of the front and the back
    { poly: [[sx, yb1], [sx, yb1 + h], [sx - ear, yb1 + h - 1.5], [sx - ear, yb1 + ear * 0.4]], parent: 4, hinge: [[sx, yb1], [sx, yb1 + h]], angle: 90, stage: ears },
    { poly: [[sx + l, yb1], [sx + l + ear, yb1 + ear * 0.4], [sx + l + ear, yb1 + h - 1.5], [sx + l, yb1 + h]], parent: 4, hinge: [[sx + l, yb1], [sx + l, yb1 + h]], angle: 90, stage: ears },
    { poly: [[sx, yl1], [sx, yb0], [sx - ear, yb0 - ear * 0.4], [sx - ear, yl1 + 1.5]], parent: 1, hinge: [[sx, yl1], [sx, yb0]], angle: 90, stage: ears },
    { poly: [[sx + l, yl1], [sx + l + ear, yl1 + 1.5], [sx + l + ear, yb0 - ear * 0.4], [sx + l, yb0]], parent: 1, hinge: [[sx + l, yl1], [sx + l, yb0]], angle: 90, stage: ears },
    // Side walls: outer half up over the ears, inner half folds down inside
    { poly: rect(sx - h, yb0, sx, yb1), parent: 0, hinge: [[sx, yb0], [sx, yb1]], angle: 90, stage: sides }, // 10
    { poly: rect(sx + l, yb0, sx + l + h, yb1), parent: 0, hinge: [[sx + l, yb0], [sx + l, yb1]], angle: 90, stage: sides }, // 11
    {
      poly: rect(sx - 2 * h + t, yb0 + 1.5, sx - h, yb1 - 1.5),
      parent: 10, hinge: [[sx - h, yb0 + 1.5], [sx - h, yb1 - 1.5]], angle: 180, stage: insides,
    },
    {
      poly: rect(sx + l + h, yb0 + 1.5, sx + l + 2 * h - t, yb1 - 1.5),
      parent: 11, hinge: [[sx + l + h, yb0 + 1.5], [sx + l + h, yb1 - 1.5]], angle: 180, stage: insides,
    },
    // Lid side flaps go down inside the side walls
    { poly: [[sx, yl0], [sx, yl1], [sx - lidFlap, yl1 - lidFlap * 0.5], [sx - lidFlap, yl0 + lidFlap * 0.3]], parent: 2, hinge: [[sx, yl0], [sx, yl1]], angle: 90, stage: [0.62, 0.75] },
    { poly: [[sx + l, yl0], [sx + l + lidFlap, yl0 + lidFlap * 0.3], [sx + l + lidFlap, yl1 - lidFlap * 0.5], [sx + l, yl1]], parent: 2, hinge: [[sx + l, yl0], [sx + l, yl1]], angle: 90, stage: [0.62, 0.75] },
  ]
  return {
    name: 'Развёртка',
    panels,
    base: 'lying',
    dims: [
      { from: [sx, yb0 + w * 0.3], to: [sx + l, yb0 + w * 0.3], label: `${o.length}` },
      { from: [sx + l * 0.7, yb0], to: [sx + l * 0.7, yb1], label: `${o.width}` },
      { from: [sx + l * 0.7, yb1], to: [sx + l * 0.7, yb1 + h], label: `${o.height}` },
    ],
  }
}

// ———————————————————— Net → dieline ————————————————————

type Segment = [Point, Point]

/**
 * Cut and fold lines of a net: hinges are folds; every other panel edge is a
 * cut, counted once even where two panels touch
 */
export function netToPart(net: Net): Part {
  let eps = 1e-6
  // Segments grouped by the straight line they lie on
  type Line = { d: Point; origin: Point; cut: [number, number][]; fold: [number, number][] }
  let lines = new Map<string, Line>()
  let add = ([a, b]: Segment, kind: 'cut' | 'fold') => {
    let dx = b[0] - a[0]
    let dy = b[1] - a[1]
    let length = Math.hypot(dx, dy)
    if (length < eps) return
    let d: Point = [dx / length, dy / length]
    if (d[0] < -eps || (Math.abs(d[0]) <= eps && d[1] < 0)) d = [-d[0], -d[1]]
    let offset = d[0] * a[1] - d[1] * a[0]
    let key = `${Math.round(d[0] * 1e5)}:${Math.round(d[1] * 1e5)}:${Math.round(offset * 1e3)}`
    let line = lines.get(key)
    if (!line) {
      // A point on the line closest to the origin, to measure positions from
      let origin: Point = [-offset * d[1], offset * d[0]]
      line = { d, origin, cut: [], fold: [] }
      lines.set(key, line)
    }
    let s = (p: Point) => (p[0] - line!.origin[0]) * line!.d[0] + (p[1] - line!.origin[1]) * line!.d[1]
    let [s0, s1] = [s(a), s(b)].sort((x, y) => x - y)
    line[kind].push([s0, s1])
  }

  for (let panel of net.panels) {
    panel.poly.forEach((p, i) => add([p, panel.poly[(i + 1) % panel.poly.length]], 'cut'))
    if (panel.hinge) add(panel.hinge, 'fold')
  }

  let union = (intervals: [number, number][]) => {
    let sorted = [...intervals].sort((x, y) => x[0] - y[0])
    let out: [number, number][] = []
    for (let [a, b] of sorted) {
      let last = out[out.length - 1]
      if (last && a <= last[1] + eps) last[1] = Math.max(last[1], b)
      else out.push([a, b])
    }
    return out
  }
  let subtract = (from: [number, number][], minus: [number, number][]) => {
    let out: [number, number][] = []
    for (let [a, b] of from) {
      let pieces: [number, number][] = [[a, b]]
      for (let [c, d] of minus) {
        pieces = pieces.flatMap(([x, y]) => {
          if (d <= x + eps || c >= y - eps) return [[x, y]]
          let rest: [number, number][] = []
          if (c > x + eps) rest.push([x, c])
          if (d < y - eps) rest.push([d, y])
          return rest
        })
      }
      out.push(...pieces)
    }
    return out
  }

  let cuts: Segment[] = []
  let folds: Segment[] = []
  for (let line of lines.values()) {
    let at = (s: number): Point => [line.origin[0] + line.d[0] * s, line.origin[1] + line.d[1] * s]
    let fold = union(line.fold)
    for (let [a, b] of subtract(union(line.cut), fold)) cuts.push([at(a), at(b)])
    for (let [a, b] of fold) folds.push([at(a), at(b)])
  }

  // Bounding box → move the drawing to (0, 0)
  let all = net.panels.flatMap((p) => p.poly)
  let minX = Math.min(...all.map((p) => p[0]))
  let minY = Math.min(...all.map((p) => p[1]))
  let maxX = Math.max(...all.map((p) => p[0]))
  let maxY = Math.max(...all.map((p) => p[1]))
  let move = (p: Point): Point => [p[0] - minX, p[1] - minY]

  return {
    name: net.name,
    cut: chain(cuts).map((line) => line.map(move)),
    fold: folds.map((s) => s.map(move)),
    dims: net.dims.map((d) => ({ ...d, from: move(d.from), to: move(d.to) })),
    width: maxX - minX,
    height: maxY - minY,
  }
}

/** Joins segments that share ends into polylines */
function chain(segments: Segment[]): Point[][] {
  let key = (p: Point) => `${Math.round(p[0] * 1000)}:${Math.round(p[1] * 1000)}`
  let rest = [...segments]
  let lines: Point[][] = []
  while (rest.length) {
    let line = [...rest.pop()!]
    let grown = true
    while (grown) {
      grown = false
      for (let i = 0; i < rest.length; i++) {
        let [a, b] = rest[i]
        let head = key(line[0])
        let tail = key(line[line.length - 1])
        if (key(a) === tail) line.push(b)
        else if (key(b) === tail) line.push(a)
        else if (key(b) === head) line.unshift(a)
        else if (key(a) === head) line.unshift(b)
        else continue
        rest.splice(i, 1)
        grown = true
        break
      }
    }
    lines.push(line)
  }
  return lines
}

export function cardboardDesign(
  nets: Net[],
  o: CardboardOptions,
  outer: [number, number, number],
): Design {
  return {
    parts: nets.map(netToPart),
    model: { kind: 'nets', nets, thickness: o.thickness },
    inner: [o.length, o.width, o.height],
    outer,
  }
}

// ———————————————————— Layout and export ————————————————————

export type Placed = Part & { x: number; y: number }

/** Parts in rows on a sheet no wider than `maxWidth` (or the widest part) */
export function layout(parts: Part[], gap = 8, maxWidth = 600) {
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

export const polyline = (points: Point[]) =>
  points.map(([x, y], i) => `${i ? 'L' : 'M'}${round(x)} ${round(y)}`).join(' ')

/**
 * SVG in millimetres for LightBurn and other laser software: cuts in red,
 * folds in blue (a separate layer, e.g. low power for scoring)
 */
export function toSvg(parts: Part[]) {
  let { placed, width, height } = layout(parts)
  let m = 2
  let w = round(width + 2 * m)
  let h = round(height + 2 * m)
  let body = placed
    .map(
      (p) =>
        `  <g transform="translate(${round(p.x + m)} ${round(p.y + m)})">\n` +
        p.cut.map((line) => `    <path d="${polyline(line)}" stroke="#ff0000" />\n`).join('') +
        p.fold.map((line) => `    <path d="${polyline(line)}" stroke="#0000ff" stroke-dasharray="2 1.5" />\n`).join('') +
        '  </g>\n',
    )
    .join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}" fill="none" stroke-width="0.1">\n` +
    body +
    '</svg>\n'
  )
}

/** DXF (R12) in millimetres: layer CUT in red, FOLD in blue */
export function toDxf(parts: Part[]) {
  let { placed, height } = layout(parts)
  let out = [
    '0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '4', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '2',
    '0', 'LAYER', '2', 'CUT', '70', '0', '62', '1', '6', 'CONTINUOUS',
    '0', 'LAYER', '2', 'FOLD', '70', '0', '62', '5', '6', 'CONTINUOUS',
    '0', 'ENDTAB', '0', 'ENDSEC',
    '0', 'SECTION', '2', 'ENTITIES',
  ]
  for (let p of placed) {
    // DXF has y up
    let at = ([x, y]: Point) => [round(p.x + x), round(height - (p.y + y))]
    for (let [layer, lines] of [['CUT', p.cut], ['FOLD', p.fold]] as const) {
      for (let line of lines) {
        for (let i = 1; i < line.length; i++) {
          let [x1, y1] = at(line[i - 1])
          let [x2, y2] = at(line[i])
          out.push('0', 'LINE', '8', layer, '10', `${x1}`, '20', `${y1}`, '30', '0', '11', `${x2}`, '21', `${y2}`, '31', '0')
        }
      }
    }
  }
  out.push('0', 'ENDSEC', '0', 'EOF')
  return out.join('\n') + '\n'
}
