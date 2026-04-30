import { useMemo } from 'react';

const REF_REGEX =
  /(\([1-3]?\s?[A-Za-z][A-Za-z ]+\s\d+:\d+(?:[–\-]\d+)?(?:,\s*[A-Za-z]+)?\)|\[Extended Canon[^\]]*\]|\[Historical Text[^\]]*\])/g;

export default function MsgText({ text }) {
  const parts = useMemo(() => {
    const result = [];
    let last = 0;
    let m;
    const re = new RegExp(REF_REGEX.source, 'g');
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) result.push({ t: 'text', v: text.slice(last, m.index) });
      const v = m[0];
      let kind = 'ref-inline';
      if (v.startsWith('[Extended')) kind = 'ref-inline ref-extended';
      else if (v.startsWith('[Historical')) kind = 'ref-inline ref-historical';
      result.push({ t: 'ref', v, kind });
      last = m.index + v.length;
    }
    if (last < text.length) result.push({ t: 'text', v: text.slice(last) });
    return result;
  }, [text]);

  return (
    <>
      {parts.map((p, i) =>
        p.t === 'ref' ? (
          <span key={i} className={p.kind}>
            {p.v}
          </span>
        ) : (
          <span key={i}>{p.v}</span>
        )
      )}
    </>
  );
}
