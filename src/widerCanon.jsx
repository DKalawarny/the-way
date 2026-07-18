import { T } from './theme.js';

// Detects assistant messages that draw on Ethiopian-canon books (1 Enoch,
// Jubilees, Meqabyan) so chat surfaces can show the "Wider canon" tag — these
// should never be mistaken for the 66-book canon. Deliberately narrower than
// the server's grounding trigger: the tag marks the books themselves, not any
// passing mention of "apocrypha".
const TAG_RE = /\b(book of enoch|1 ?enoch|first enoch|jubilees|meqabyan|ethiopian (orthodox )?(bible|canon|tewahedo))\b/i;

export function isWiderCanonText(text) {
  return typeof text === 'string' && TAG_RE.test(text);
}

export function WiderCanonTag({ dark }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
      fontFamily: T.sans,
      color: dark ? T.honey : T.goldDark,
      background: 'rgba(184,115,58,0.12)',
      border: '1px solid rgba(184,115,58,0.25)',
      borderRadius: 999, padding: '3px 10px', marginBottom: 7,
    }}>
      <span aria-hidden="true">📜</span> Wider canon · outside the 66 books
    </span>
  );
}
