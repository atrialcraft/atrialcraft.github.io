// Reads an existing page.mdx of a post or a product back into the Верстак
// form. Only the format that Верстак and the site use is understood:
// imports, `export const post = { … }` (or `product`), then the text.

/** An identifier in the object, e.g. a photo variable: `images: [photo01]` */
export type Reference = { ref: string }
export type Value =
  | string
  | number
  | boolean
  | null
  | Reference
  | Value[]
  | { [key: string]: Value }

/**
 * A tiny parser for JavaScript object literals: strings in any quotes,
 * numbers, true/false/null, identifiers, arrays, nested objects, comments
 * and trailing commas. Nothing is executed
 */
export function parseObjectLiteral(source: string): {
  value: Value
  end: number
} {
  let i = 0
  let skip = () => {
    for (;;) {
      while (i < source.length && /\s/.test(source[i])) i++
      if (source.startsWith('//', i)) {
        while (i < source.length && source[i] !== '\n') i++
      } else if (source.startsWith('/*', i)) {
        let close = source.indexOf('*/', i + 2)
        i = close === -1 ? source.length : close + 2
      } else return
    }
  }
  let fail = (what: string): never => {
    throw new Error(`${what} (символ ${i})`)
  }
  let string = (): string => {
    let quote = source[i++]
    let out = ''
    while (i < source.length && source[i] !== quote) {
      if (source[i] === '\\') {
        let next = source[i + 1]
        let escapes: Record<string, string> = {
          n: '\n',
          t: '\t',
          r: '\r',
          '0': '\0',
        }
        if (next === 'u') {
          out += String.fromCharCode(parseInt(source.slice(i + 2, i + 6), 16))
          i += 6
          continue
        }
        out += escapes[next] ?? next
        i += 2
        continue
      }
      if (quote === '`' && source.startsWith('${', i))
        fail('Шаблонные строки с ${…} не поддерживаются')
      out += source[i++]
    }
    if (source[i] !== quote) fail('Строка не закрыта')
    i++
    return out
  }
  let value = (): Value => {
    skip()
    let c = source[i]
    if (c === '{') {
      i++
      let object: { [key: string]: Value } = {}
      for (;;) {
        skip()
        if (source[i] === '}') {
          i++
          return object
        }
        let key: string
        if (source[i] === '"' || source[i] === "'") key = string()
        else {
          let match = /^[A-Za-z_$][\w$]*/.exec(source.slice(i))
          if (!match) fail('Ожидалось имя поля')
          key = match![0]
          i += key.length
        }
        skip()
        if (source[i] !== ':') fail('Ожидалось «:»')
        i++
        object[key] = value()
        skip()
        if (source[i] === ',') i++
      }
    }
    if (c === '[') {
      i++
      let array: Value[] = []
      for (;;) {
        skip()
        if (source[i] === ']') {
          i++
          return array
        }
        array.push(value())
        skip()
        if (source[i] === ',') i++
      }
    }
    if (c === '"' || c === "'" || c === '`') return string()
    let match = /^-?\d+(\.\d+)?/.exec(source.slice(i))
    if (match) {
      i += match[0].length
      return Number(match[0])
    }
    let word = /^[A-Za-z_$][\w$]*/.exec(source.slice(i))
    if (word) {
      i += word[0].length
      if (word[0] === 'true') return true
      if (word[0] === 'false') return false
      if (word[0] === 'null' || word[0] === 'undefined') return null
      return { ref: word[0] }
    }
    return fail('Непонятное значение')
  }
  let result = value()
  return { value: result, end: i }
}

export type ParsedPage = {
  /** `post` or `product` */
  name: string
  fields: { [key: string]: Value }
  /** Imports of files: variable → path as written ('./01.webp', '../../x.webp') */
  fileImports: { variable: string; path: string }[]
  /** Other import lines, kept as they are */
  otherImports: string[]
  body: string
}

export function parsePage(source: string): ParsedPage {
  let match = /export const (post|product)\s*=\s*/.exec(source)
  if (!match) throw new Error('В файле нет блока export const post или product')
  let start = match.index + match[0].length
  let { value, end } = parseObjectLiteral(source.slice(start))
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    'ref' in value
  ) {
    throw new Error('Блок записи не похож на объект')
  }

  let fileImports: ParsedPage['fileImports'] = []
  let otherImports: string[] = []
  for (let line of source.slice(0, match.index).split('\n')) {
    let file =
      /^import\s+([A-Za-z_$][\w$]*)\s+from\s+['"](\.{1,2}\/[^'"]+\.(?:webp|png|jpe?g|gif|svg))['"]/.exec(
        line,
      )
    if (file) fileImports.push({ variable: file[1], path: file[2] })
    else if (
      /^import\s/.test(line) &&
      !/@\/components\/(PostLayout|ProductLayout)|@\/lib\/(posts|products)/.test(
        line,
      )
    ) {
      otherImports.push(line)
    }
  }

  // The text starts after the line with `export default`
  let rest = source.slice(start + end)
  let defaultExport =
    /export default[\s\S]*?(?:<\/(?:PostLayout|ProductLayout)>\s*\)?|\n\s*\n)/.exec(
      rest,
    )
  let body = defaultExport
    ? rest.slice(defaultExport.index + defaultExport[0].length)
    : ''
  return {
    name: match[1],
    fields: value as { [key: string]: Value },
    fileImports,
    otherImports,
    body: body.replace(/^\s*\n/, '').trimEnd(),
  }
}

export const asString = (v: Value | undefined) =>
  typeof v === 'string' ? v : ''
export const asNumber = (v: Value | undefined) =>
  typeof v === 'number' ? v : undefined
export const isRef = (v: Value | undefined): v is Reference =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && 'ref' in v
