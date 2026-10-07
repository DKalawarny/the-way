/**
 * ⭐ NO DASHES IN ANYTHING A PERSON READS — both products. Daniel, 5 Oct: "no one
 * writes like that, it looks AI." A dash before a new sentence becomes a full stop,
 * before a list a colon, around an aside two commas, otherwise a comma. Number
 * and money ranges (5–11, $500k – $15M) and a lone dash used as a value are kept.
 * Tested on real sentences in plainDashes.test.js.
 */
const CLAUSE = new Set(('it it’s it\'s its they they’re they\'re you you’re you\'re we we’re he she i that’s that\'s this these those there here ' +
  'say ask check keep write read put do don’t don\'t get use call try start stop pay file make take give tell look find ' +
  'not no nothing everything most many some all both each either neither tax returns one'
  ).split(' '))
const VERB = /\b(is|are|was|were|has|have|had|can|can’t|will|won’t|would|should|could|does|doesn’t|do|did|vary|varies|means|matters|costs|takes|makes|works|helps|changes|needs|falls|goes|comes|says|shows|tells|decides|depends|keeps|gets|gives|pays|beats|holds|leaves|stays|runs|buys|sells|saves|cuts|adds|wins|loses)\b/i
const CONJ = new Set('and but or so yet nor which who whom'.split(' '))
const SUBORDINATE = new Set('whether if when because while although though as since unless until before after where why how what whatever wherever'.split(' '))
const LIST = s => (s.match(/,\s/g) ?? []).length >= 2 || /,\s[^,]*\b(and|or)\b/.test(s)
const RELATIVE = /\b(that|which|who|whose|where|when|what|whatever)\b/i
function isClause(sentence, first) {
  if (SUBORDINATE.has(first) || CONJ.has(first)) return false
  if (CLAUSE.has(first)) return true
  const v = VERB.exec(sentence)
  if (!v) return false
  return !RELATIVE.test(sentence.slice(0, v.index))
}
const DASH = /\s*[—–]\s*|\s+-\s+/
export function plainDashes(text) {
  if (typeof text !== 'string' || !/[—–]|\s-\s/.test(text)) return text
  if (/^\s*[—–-]\s*$/.test(text)) return text
  let t = text.replace(/(\d[\d.,]*[kKmMbB%+]?)(\s*)[–—](\s*)(\$?\d)/g, '$1$2\u0000$3$4')
  t = t.replace(/\s*[—–]\s*([.!?]|$)/g, '$1')                      // dash at the very end of a clause
       .replace(/(^|\s[(\["“‘]|^[(\["“‘]|\()\s*[—–]\s*/g, '$1')      // dash right after an OPENING bracket/quote
  for (let guard = 0; guard < 50; guard++) {
    const m = DASH.exec(t)
    if (!m) break
    const before = t.slice(0, m.index).replace(/[,;:]\s*$/, '')
    const after = t.slice(m.index + m[0].length)
    const end = after.search(/[.!?](\s|$)|$/)
    const sentence = after.slice(0, end)
    const next = DASH.exec(sentence)
    if (next) {                                                     // a pair around an aside
      const aside = sentence.slice(0, next.index)
      const rest = after.slice(next.index + next[0].length)
      t = `${before}, ${aside}, ${rest}`
      continue
    }
    const first = (sentence.match(/^[“"‘']?([A-Za-z’']+)/)?.[1] ?? '').toLowerCase()
    if (CONJ.has(first)) {
      t = `${before}, ${after}`
    } else if (!CLAUSE.has(first) && LIST(sentence)) {
      t = `${before}: ${after}`
    } else if (isClause(sentence, first)) {
      t = `${before}. ${after.replace(/^([“"‘']?)([a-z])/, (_, q, c) => q + c.toUpperCase())}`
    } else if (LIST(sentence)) {
      t = `${before}: ${after}`
    } else {
      t = `${before}, ${after}`
    }
  }
  return t.replace(/,\s*,/g, ',').replace(/(?<!\.)\.\s+\.(?!\.)/g, '.').replace(/\u0000/g, '–')
}
