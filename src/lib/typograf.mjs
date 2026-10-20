// Russian typography for site texts, following Ilyakhov's and Lebedev's
// guides and the safest rules of the Typograf library: quotes, dashes,
// ellipsis, ranges, the multiplication sign and non-breaking spaces.
// Rules that misfire on technical names («ИН-12Б», «3D-принтер», dates
// like 2026-10-21) are left out or limited to plain numbers.
// Plain .mjs so both next.config (the MDX plugin) and components can use it

const nbsp = ' '

const letter = 'А-Яа-яЁёA-Za-z'

// Prepositions, conjunctions and other short words that shouldn't hang at
// the end of a line: every word of one or two letters plus these
const shortWords = `[${letter}]{1,2}|для|без|при|под|над|про|что|как|или|это|его|она|они|оно|все|всё|уже|ещё|так|там|где|чем`

// Particles that stick to the word before them: «сделал бы», «он же»
const particles = 'ли|ль|же|ж|бы|б'

/** Characters first, so the spacing rules see the final dashes and quotes */
const characterRules = [
  // Three dots → ellipsis
  [/\.\.\./g, '…'],
  // Hyphen or double hyphen between spaces → em dash
  [/(^|\s)--?(?=\s)/g, '$1—'],
  // Ranges of plain numbers: «3-4 часа» → «3–4 часа». Not dates or
  // model names: the numbers mustn't touch letters or other hyphens
  [/(?<![\w.-])(\d+)-(\d+)(?![\w.-])/g, '$1–$2'],
  // Sizes: «20x30», «5 х 3» → «20×30», «5×3»
  [/(\d)\s?[xхXХ]\s?(?=\d)/g, '$1×'],
  // Space before punctuation after a word: «текст ,» → «текст,»
  [new RegExp(`([${letter}\\d»)]) +([,.;:!?])(?!\\.)`, 'g'), '$1$2'],
  // Several spaces → one
  [/ {2,}/g, ' '],
]

const spaceRules = [
  // «в мастерской», «и наборы»: the short word sticks to the next one
  [new RegExp(`(^|[\\s«„(])(${shortWords}) (?=\\S)`, 'gi'), `$1$2${nbsp}`],
  // «сделал бы»: the particle sticks to the word before it
  [new RegExp(`(?<=[${letter}]) (${particles})(?=[\\s.,;:!?…»)]|$)`, 'g'), `${nbsp}$1`],
  // A dash stays with the word before it: «Atrial — мастерская»
  [/ (—|–) /g, `${nbsp}$1 `],
  // Thousands don't split: «2 500»
  [/(\d) (?=\d{3}(?!\d))/g, `$1${nbsp}`],
  // «5 мм», «2 500 ₽», «82 %», «2026 г.»
  [/(\d) (?=[А-Яа-яЁё₽%])/g, `$1${nbsp}`],
  // «№ 5», «§ 2»
  [/([№§]) ?(?=\d)/g, `$1${nbsp}`],
  // Initials stay with the surname: «А. С. Пушкин»
  [/(^|[\s(«])([А-ЯЁ]\.) (?=[А-ЯЁ])/g, `$1$2${nbsp}`],
  // Abbreviations: «т. е.», «т. д.», «т. п.»
  [/(^|[\s(])т\. ?(?=[едп]\.)/g, `$1т.${nbsp}`],
]

/**
 * Straight quotes → «ёлочки», quotes inside quotes → „лапки“. Only when
 * the quotes in the text are paired; otherwise the text is left as is
 */
function quotes(text) {
  let count = (text.match(/"/g) ?? []).length
  if (count === 0 || count % 2 !== 0) return text
  let depth = 0
  return text.replace(/"/g, (_, offset) => {
    let before = text[offset - 1]
    let opening = offset === 0 || /[\s(«„\[—–-]/.test(before)
    if (opening) {
      depth++
      return depth === 1 ? '«' : '„'
    }
    depth = Math.max(0, depth - 1)
    return depth === 0 ? '»' : '“'
  })
}

/** @param {string} text */
export function typograf(text) {
  let result = quotes(text)
  for (let [pattern, replacement] of characterRules) {
    result = result.replace(pattern, replacement)
  }
  // Twice: in «и в доме» the second word is only free after the first pass
  for (let pass = 0; pass < 2; pass++) {
    for (let [pattern, replacement] of spaceRules) {
      result = result.replace(pattern, replacement)
    }
  }
  return result
}
