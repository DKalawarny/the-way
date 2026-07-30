import { useMemo } from 'react';
import { testamentOf } from './bibleRefUtils.js';

// Matches: (Book Ch:v) parenthesised refs, **Book Ch:v** bold refs, and extended/historical tags
const REF_REGEX =
  /(\*\*[1-3]?\s?[A-Za-z][A-Za-z ]+\s\d+:\d+(?:[–\-]\d+)?\*\*|\([1-3]?\s?[A-Za-z][A-Za-z ]+\s\d+:\d+(?:[–\-]\d+)?(?:,\s*[A-Za-z]+)?\)|\[Extended Canon[^\]]*\]|\[Historical Text[^\]]*\])/g;

// Lines/paragraphs that start with these are paraphrase markers —
// styled differently so readers know they are summaries, not direct quotes.
const PARAPHRASE_RE = /^\s*(paraphrasing\s+|the idea in\s+)/i;

// Commentary / scholar source names — styled as slate chips so "where this
// came from" is scannable at a glance (gold chip = scripture, slate = source).
// One escaped-name list beats a heroic regex: research mode cites a wide but
// finite set of scholars, church fathers, and commentary series. Possessives
// ("Schreiner's") are matched too. Add names here as new ones show up.
const SOURCE_NAMES = [
  // Classic commentaries + church fathers + reformers
  'Matthew Henry', 'Jamieson-Fausset-Brown', 'Jamieson–Fausset–Brown', 'JFB',
  'John Calvin', 'Calvin', 'John Wesley', 'Wesley', 'Martin Luther', 'Luther',
  'Chrysostom', 'Augustine', 'Aquinas', 'Athanasius', 'Origen', 'Jerome',
  'Irenaeus', 'Tertullian', 'Eusebius', 'Ambrose', 'Basil', 'Jonathan Edwards',
  'Charles Spurgeon', 'Spurgeon', 'Zwingli', 'John Knox',
  // Modern scholars the research prompt actually surfaces
  'N.T. Wright', 'N. T. Wright', 'Thomas Schreiner', 'Schreiner',
  'Köstenberger', 'Kostenberger', 'Gordon Fee', 'D.A. Carson', 'D. A. Carson',
  'Carson', 'Douglas Moo', 'Craig Keener', 'Keener', 'F.F. Bruce', 'F. F. Bruce',
  'C.K. Barrett', 'Ben Witherington', 'Witherington', 'Anthony Thiselton',
  'Thiselton', 'David Garland', 'Richard Hays', 'James Dunn', 'Richard Bauckham',
  'John Stott', 'Stott', 'J.I. Packer', 'Packer', 'Walter Brueggemann',
  'Brueggemann', 'John Goldingay', 'Goldingay', 'John Walton', 'Tremper Longman',
  'Longman', 'Bruce Waltke', 'Waltke', 'Derek Kidner', 'Kidner', 'Alec Motyer',
  'Motyer', 'Craig Blomberg', 'Blomberg', 'Grant Osborne', 'Cranfield',
  'Käsemann', 'Kasemann', 'Karl Barth', 'Bonhoeffer', 'C.S. Lewis', 'C. S. Lewis',
  'Bruce Metzger', 'Metzger', 'Timothy Keller', 'Tim Keller', 'Keller',
  'John Piper', 'Piper', 'A.W. Tozer', 'Tozer', 'William Barclay', 'Barclay',
  // Commentary series / study resources
  'Word Biblical Commentary', 'WBC', 'NICNT', 'NICOT', 'BECNT', 'NIGTC',
  'Pillar New Testament Commentary', 'Pillar', 'Tyndale Commentary', 'Tyndale',
  'Anchor Bible', 'Hermeneia', 'ICC', 'IVP',
];
const SOURCE_RE = new RegExp(
  '\\b(' + SOURCE_NAMES
    .sort((a, b) => b.length - a.length)
    .map((n) => n.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'))
    .join('|') + ")(?:['\u2019]s)?\\b",
  'g'
);

// Splits a plain-text run into text + source-name chips, rendering **bold**
// markdown spans along the way (research answers use it heavily).
function splitInline(s, keyBase) {
  const out = [];
  const boldRe = /\*\*([^*\n][^*]*?)\*\*/g;
  let last = 0, mb;
  while ((mb = boldRe.exec(s)) !== null) {
    if (mb.index > last) out.push(...splitSources(s.slice(last, mb.index), `${keyBase}-p${last}`));
    out.push(<strong key={`${keyBase}-b${mb.index}`} style={{ fontWeight: 700 }}>{splitSources(mb[1], `${keyBase}-bi${mb.index}`)}</strong>);
    last = mb.index + mb[0].length;
  }
  if (last < s.length) out.push(...splitSources(s.slice(last), `${keyBase}-p${last}`));
  return out;
}

// Splits a plain-text run into text + source-name chips.
function splitSources(s, keyBase) {
  const out = [];
  let last = 0, m2;
  const re = new RegExp(SOURCE_RE.source, 'g');
  while ((m2 = re.exec(s)) !== null) {
    if (m2.index > last) out.push(<span key={`${keyBase}-t${m2.index}`} style={{ whiteSpace: 'pre-wrap' }}>{s.slice(last, m2.index)}</span>);
    out.push(<span key={`${keyBase}-s${m2.index}`} className="src-inline">{m2[0]}</span>);
    last = m2.index + m2[0].length;
  }
  if (last < s.length) out.push(<span key={`${keyBase}-end`} style={{ whiteSpace: 'pre-wrap' }}>{s.slice(last)}</span>);
  return out;
}

/**
 * Renders AI message text with:
 * - Scripture refs highlighted and optionally clickable
 * - Verification badges (✓ / ⚠) when refStatus is provided
 * - Paraphrase lines styled with a left-border italic treatment
 *
 * Props:
 *   text       — the raw message string
 *   onRefClick — optional (refRaw: string) => void called on canonical ref click
 *   refStatus  — optional Map<refRaw, 'ok' | 'invalid' | 'loading'>
 */
export default function MsgText({ text, onRefClick, refStatus }) {
  // Split into paragraphs, then within each paragraph apply the ref regex.
  // This lets us detect paraphrase paragraphs as a whole unit.
  const segments = useMemo(() => {
    // Split on paragraph breaks (2+ newlines) but keep the separator
    const paragraphs = text.split(/(\n\n+)/);
    return paragraphs.map((rawPara) => {
      // "### Heading" markdown from research answers → styled heading, not literal hashes
      const headingMatch = rawPara.match(/^(#{1,6})\s+/);
      // Research answers wrap outlines in ``` fences and use --- separators —
      // fences render as noise, so drop fence-only lines; --- becomes a rule.
      const stripped = rawPara.replace(/^\s*```[a-z]*\s*$/gm, '').replace(/\n{3,}/g, '\n\n');
      if (/^\s*(---+|\*\*\*+)\s*$/.test(stripped)) {
        return { isDivider: true, isParaphrase: false, isHeading: false, parts: [] };
      }
      const para = headingMatch ? stripped.slice(headingMatch[0].length) : stripped;
      const isHeading = !!headingMatch;
      const isParaphrase = PARAPHRASE_RE.test(para);
      // Apply ref regex within this paragraph
      const parts = [];
      let last = 0;
      let m;
      const re = new RegExp(REF_REGEX.source, 'g');
      while ((m = re.exec(para)) !== null) {
        if (m.index > last) parts.push({ t: 'text', v: para.slice(last, m.index) });
        const v = m[0];
        const isBold = v.startsWith('**');
        let kind = 'ref-inline';
        if (v.startsWith('[Extended')) kind = 'ref-inline ref-extended';
        else if (v.startsWith('[Historical')) kind = 'ref-inline ref-historical';
        // For bold refs strip the ** so we have the bare "Book Ch:v" for display + lookup
        const display = isBold ? v.slice(2, -2) : v;
        parts.push({ t: 'ref', v, display, isBold, kind });
        last = m.index + v.length;
      }
      if (last < para.length) parts.push({ t: 'text', v: para.slice(last) });
      return { isParaphrase, isHeading, parts };
    });
  }, [text]);

  return (
    <>
      {segments.map((seg, si) => {
        const inner = seg.parts.map((p, i) => {
          if (p.t === 'ref') {
            const status = refStatus?.get(p.v);
            const isCanonical = !p.v.startsWith('[');
            const clickable = !!onRefClick && isCanonical;
            const testament = isCanonical ? testamentOf(p.display) : null;
            const isNT = testament === 'NT';
            return (
              <span
                key={i}
                className={p.kind}
                style={{
                  fontWeight: p.isBold ? 700 : undefined,
                  cursor: clickable ? 'pointer' : undefined,
                  borderBottom: status === 'ok'
                    ? '1.5px solid rgba(80,160,80,0.55)'
                    : status === 'invalid'
                    ? '1.5px solid rgba(200,60,60,0.5)'
                    : undefined,
                  opacity: status === 'invalid' ? 0.75 : undefined,
                  transition: 'opacity 0.2s',
                }}
                title={
                  status === 'ok'      ? 'Verified ✓'                            :
                  status === 'invalid' ? 'Could not verify — please check this reference' :
                  status === 'loading' ? 'Checking…'                              :
                  clickable            ? 'Tap to preview this verse'              : undefined
                }
                onClick={clickable ? () => onRefClick(p.v) : undefined}
              >
                {p.display}
                {testament && (
                  <span style={{
                    display: 'inline-block',
                    fontSize: 8.5,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    fontFamily: 'system-ui, sans-serif',
                    color: isNT ? '#3a6b8a' : '#8E5528',
                    background: isNT ? 'rgba(58,107,138,0.10)' : 'rgba(142,85,40,0.10)',
                    borderRadius: 3,
                    padding: '1px 3px',
                    marginLeft: 3,
                    verticalAlign: 'middle',
                    lineHeight: 1.4,
                    userSelect: 'none',
                  }}>
                    {testament}
                  </span>
                )}
                {status === 'ok' && (
                  <sup style={{ fontSize: '0.7em', color: 'rgba(60,140,60,0.85)', marginLeft: 1 }}>✓</sup>
                )}
                {status === 'invalid' && (
                  <sup style={{ fontSize: '0.7em', color: 'rgba(200,60,60,0.8)', marginLeft: 1 }}>⚠</sup>
                )}
              </span>
            );
          }
          return <span key={i}>{splitInline(p.v, `${si}-${i}`)}</span>;
        });

        if (seg.isDivider) {
          return <span key={si} style={{ display: 'block', borderTop: '1px solid rgba(26,17,8,0.12)', margin: '10px 0' }} />;
        }
        if (seg.isHeading) {
          return (
            <span key={si} style={{ display: 'block', fontWeight: 700, fontSize: '1.06em', letterSpacing: '-0.01em', margin: '4px 0 2px' }}>
              {inner}
            </span>
          );
        }
        if (seg.isParaphrase) {
          return (
            <span
              key={si}
              style={{
                display: 'block',
                borderLeft: '2.5px solid rgba(184,115,58,0.35)',
                paddingLeft: 10,
                marginLeft: 2,
                fontStyle: 'italic',
                color: 'inherit',
                opacity: 0.82,
              }}
            >
              {inner}
            </span>
          );
        }
        return <span key={si}>{inner}</span>;
      })}
    </>
  );
}
