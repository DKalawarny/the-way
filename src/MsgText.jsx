import { useMemo } from 'react';
import { testamentOf } from './bibleRefUtils.js';

const REF_REGEX =
  /(\([1-3]?\s?[A-Za-z][A-Za-z ]+\s\d+:\d+(?:[–\-]\d+)?(?:,\s*[A-Za-z]+)?\)|\[Extended Canon[^\]]*\]|\[Historical Text[^\]]*\])/g;

// Lines/paragraphs that start with these are paraphrase markers —
// styled differently so readers know they are summaries, not direct quotes.
const PARAPHRASE_RE = /^\s*(paraphrasing\s+|the idea in\s+)/i;

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
    return paragraphs.map((para) => {
      const isParaphrase = PARAPHRASE_RE.test(para);
      // Apply ref regex within this paragraph
      const parts = [];
      let last = 0;
      let m;
      const re = new RegExp(REF_REGEX.source, 'g');
      while ((m = re.exec(para)) !== null) {
        if (m.index > last) parts.push({ t: 'text', v: para.slice(last, m.index) });
        const v = m[0];
        let kind = 'ref-inline';
        if (v.startsWith('[Extended')) kind = 'ref-inline ref-extended';
        else if (v.startsWith('[Historical')) kind = 'ref-inline ref-historical';
        parts.push({ t: 'ref', v, kind });
        last = m.index + v.length;
      }
      if (last < para.length) parts.push({ t: 'text', v: para.slice(last) });
      return { isParaphrase, parts };
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
            const testament = isCanonical ? testamentOf(p.v) : null;
            const isNT = testament === 'NT';
            return (
              <span
                key={i}
                className={p.kind}
                style={{
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
                {p.v}
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
          return (
            <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{p.v}</span>
          );
        });

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
