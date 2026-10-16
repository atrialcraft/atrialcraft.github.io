// Simplified outline of the Zlynka window surround (наличник «Злынка»), drawn
// from the photos of the finished piece. Each entry is one cut for the laser
// easter egg; they are cut in this order.

export const nalichnikViewBox = '0 0 320 390'

function rect(x: number, y: number, w: number, h: number) {
  return `M${x} ${y}h${w}v${h}h${-w}Z`
}

function circle(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`
}

/** A row of half-circles hanging down from y, like carved lace */
function scallops(x: number, y: number, count: number, width: number) {
  let r = width / 2
  return `M${x} ${y}` + `a${r} ${r} 0 0 0 ${width} 0`.repeat(count)
}

/** Triangular teeth pointing down */
function teeth(
  x: number,
  y: number,
  count: number,
  width: number,
  depth: number,
) {
  let half = width / 2
  return `M${x} ${y}` + `l${half} ${depth}l${half} ${-depth}`.repeat(count)
}

/** A carved curl: a spiral of shrinking half-turns */
function curl(cx: number, cy: number, r: number, direction: 1 | -1) {
  let sweep = direction === 1 ? 1 : 0
  let d = `M${cx - r} ${cy}`
  let radius = r
  for (let turn = 0; turn < 4; turn++) {
    let next = radius * 0.7
    let dx = (turn % 2 === 0 ? 1 : -1) * (radius + next)
    d += `a${(radius + next) / 2} ${(radius + next) / 2} 0 0 ${sweep} ${dx} 0`
    radius = next
  }
  return d
}

/** Open shutter with three recessed panels */
function shutter(x: number) {
  return [
    rect(x, 128, 62, 198),
    rect(x + 8, 138, 46, 52),
    rect(x + 8, 198, 46, 60),
    rect(x + 8, 266, 46, 50),
  ]
}

export const nalichnikSegments: Array<string> = [
  // Frame and mirror opening
  rect(92, 124, 136, 206),
  rect(106, 146, 108, 170),
  // Toothed strip under the crown
  teeth(106, 146, 12, 9, 8),
  // Crown base, cornice and the stepped shelf above
  rect(84, 90, 152, 34),
  rect(76, 82, 168, 8),
  // Lace crest on top
  'M80 82C92 64 104 70 114 62C126 52 140 44 160 34C180 44 194 52 206 62C216 70 228 64 240 82',
  circle(160, 54, 6),
  circle(124, 68, 4),
  circle(196, 68, 4),
  // Ornament on the crown: centre square and two curls
  rect(150, 97, 20, 20),
  curl(128, 107, 10, 1),
  curl(192, 107, 10, -1),
  // Bottom shelf and the carved lace below it
  rect(84, 330, 152, 8),
  rect(78, 338, 164, 7),
  scallops(84, 345, 8, 19),
  circle(160, 368, 5),
  // Shutters
  ...shutter(24),
  ...shutter(234),
]
