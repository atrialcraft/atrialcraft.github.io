// Parts of the nalichnik model, colours and ready schemes of the colour picker.
// The model is public/models/nalichnik-1.glb: one mesh per part, named by its id
// (made from the Kompas STEP with tools/convert.py of the «nalichnik» project)

export type ZoneId =
  | 'kokoshnik'
  | 'friz'
  | 'karniz'
  | 'nadokonnik'
  | 'bokoviny'
  | 'rama'
  | 'podlozhka'
  | 'podokonnik'
  | 'stavni'
  | 'nakladki'

export const zones: { id: ZoneId; name: string }[] = [
  { id: 'kokoshnik', name: 'Кокошник' },
  { id: 'friz', name: 'Фриз' },
  { id: 'karniz', name: 'Карниз' },
  { id: 'nadokonnik', name: 'Резьба над окном' },
  { id: 'bokoviny', name: 'Боковины' },
  { id: 'rama', name: 'Рама' },
  { id: 'podlozhka', name: 'Подложка резьбы' },
  { id: 'podokonnik', name: 'Подоконник' },
  { id: 'stavni', name: 'Ставни' },
  { id: 'nakladki', name: 'Рамки ставен' },
]

export const colors: [hex: string, name: string][] = [
  ['F4F1EA', 'Белый'],
  ['EDE3C8', 'Слоновая кость'],
  ['E3B53C', 'Жёлтый'],
  ['C68B3E', 'Охра'],
  ['B23A30', 'Красный'],
  ['6E2430', 'Бордо'],
  ['A9C8DE', 'Светло-голубой'],
  ['6E9FC9', 'Голубой'],
  ['2F5D8C', 'Синий'],
  ['24427A', 'Ультрамарин'],
  ['3E9A97', 'Бирюзовый'],
  ['A8D5BA', 'Мятный'],
  ['4F7F4A', 'Зелёный'],
  ['2E4A33', 'Тёмно-зелёный'],
  ['C9A26B', 'Натуральное дерево'],
  ['8A5A34', 'Орех'],
  ['5A3B28', 'Коричневый'],
  ['8D8F8C', 'Серый'],
  ['3A3C3E', 'Графит'],
  ['1E1E1E', 'Чёрный'],
]

export const colorName = (hex: string) => colors.find((c) => c[0] === hex)?.[1] ?? 'Свой цвет'

// Carving takes the first colour, the backing and shutters the second,
// the shutter frames the third if there is one
const carved: ZoneId[] = ['kokoshnik', 'friz', 'karniz', 'nadokonnik', 'bokoviny', 'rama', 'podokonnik']

export type Preset = [name: string, carved: string, back: string, accent?: string]

export const presets: Preset[] = [
  ['Классика', 'F4F1EA', '2F5D8C'],
  ['Небесный', 'F4F1EA', '6E9FC9'],
  ['Бирюза', 'F4F1EA', '3E9A97'],
  ['Зелёный', 'F4F1EA', '4F7F4A'],
  ['Северный', 'EDE3C8', '6E2430'],
  ['Солнечный', 'F4F1EA', 'E3B53C', '2F5D8C'],
  ['Строгий', 'F4F1EA', '3A3C3E'],
  ['Дерево', 'C9A26B', '5A3B28'],
]

export type Colors = Record<ZoneId, string>

export function presetColors([, carvedColor, back, accent]: Preset): Colors {
  let result = {} as Colors
  for (let zone of zones) result[zone.id] = carved.includes(zone.id) ? carvedColor : back
  result.nakladki = accent ?? carvedColor
  return result
}

export type WallId = 'log' | 'beam' | 'board' | 'brick' | 'plaster'

export const walls: { id: WallId; name: string; color: string }[] = [
  { id: 'log', name: 'Бревно', color: 'A98256' },
  { id: 'beam', name: 'Брус', color: 'B8956A' },
  { id: 'board', name: 'Вагонка', color: 'D9C6A0' },
  { id: 'brick', name: 'Кирпич', color: 'A4553A' },
  { id: 'plaster', name: 'Штукатурка', color: 'E8E1D3' },
]

export const wallColors: [hex: string, name: string][] = [
  ['A98256', 'Натуральное дерево'],
  ['7A5434', 'Тёмное дерево'],
  ['8E8A80', 'Серое старое дерево'],
  ['E2C36B', 'Жёлтый'],
  ['6F8E6A', 'Зелёный'],
  ['9DB8C9', 'Голубой'],
  ['A4553A', 'Красный кирпич'],
  ['EEEAE0', 'Белый'],
]

export type Scheme = { colors: Colors; wall: WallId; wallColor: string }

export const defaultScheme: Scheme = { colors: presetColors(presets[0]), wall: 'log', wallColor: 'A98256' }

/** The scheme lives in the address, #c=<part colours>&w=<wall>.<colour>, so a link opens the same colours */
export function writeHash(s: Scheme) {
  return `c=${zones.map((z) => s.colors[z.id]).join('.')}&w=${s.wall}.${s.wallColor}`
}

export function readHash(hash: string): Scheme | null {
  let params = new URLSearchParams(hash.replace(/^#/, ''))
  let parts = params.get('c')?.split('.')
  let [wall, wallColor] = params.get('w')?.split('.') ?? []
  let ok = (h?: string) => !!h && /^[0-9A-F]{6}$/i.test(h)
  if (!parts || parts.length !== zones.length || !parts.every(ok) || !ok(wallColor)) return null
  if (!walls.some((w) => w.id === wall)) return null
  let result = {} as Colors
  zones.forEach((z, i) => (result[z.id] = parts[i].toUpperCase()))
  return { colors: result, wall: wall as WallId, wallColor: wallColor.toUpperCase() }
}
