// Russian typography rules for site texts (as in Ilyakhov's and Lebedev's
// guides): short prepositions and conjunctions don't hang at the end of a
// line, a dash doesn't start a line, a number stays with its word or unit.
// Plain .mjs so both next.config (the MDX plugin) and components can use it

const nbsp = ' '

// Words of one or two letters plus common three-letter prepositions
const shortWords = '[А-Яа-яЁё]{1,2}|для|без|при|под|над|про|что|как|или'

const rules = [
  // «в мастерской», «и наборы» → the short word sticks to the next one
  [new RegExp(`(^|[\\s«(„])(${shortWords}) (?=\\S)`, 'g'), `$1$2${nbsp}`],
  // A dash stays with the word before it: «Atrial — мастерская»
  [/ (—|–) /g, `${nbsp}$1 `],
  // Thousands don't split: «2 500»
  [/(\d) (?=\d{3}(?!\d))/g, `$1${nbsp}`],
  // «5 мм», «2 500 ₽», «82 %», «2026 г.»
  [/(\d) (?=[А-Яа-яЁё₽%№])/g, `$1${nbsp}`],
]

/** @param {string} text */
export function typograf(text) {
  let result = text
  // Run twice: in «и в доме» the second word is only free after the first pass
  for (let pass = 0; pass < 2; pass++) {
    for (let [pattern, replacement] of rules) {
      result = result.replace(pattern, replacement)
    }
  }
  return result
}
