// opentype.js ships no types; only the parser is used, for outlining text
declare module 'opentype.js' {
  export function parse(buffer: ArrayBuffer): import('@/components/qr/layout').OutlineFont
}
