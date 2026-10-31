// Browser only: paper.js, which merges the outline, can't be bundled for the server

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
