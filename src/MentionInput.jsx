import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

const inputCss = {
  width: '100%', boxSizing: 'border-box',
  border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px',
  fontSize: 14.5, fontFamily: 'inherit', background: T.cream, color: T.ink, outline: 'none',
};

/**
 * Textarea wrapper that detects @query patterns and shows an autocomplete
 * dropdown of matching profiles and churches.
 *
 * Props:
 *   value, onChange       – controlled text (same interface as <textarea>)
 *   placeholder           – forwarded to the textarea
 *   rows                  – forwarded to the textarea (default 4)
 *   style                 – merged onto the textarea
 *   mentions              – accumulated [{type, id, name}] array
 *   onMentionsChange(arr) – called when a new mention is confirmed
 */
export default function MentionInput({
  value,
  onChange,
  placeholder,
  rows = 4,
  style,
  onMentionsChange,
  mentions = [],
}) {
  const [results, setResults] = useState([]);
  const [query, setQuery] = useState(null); // null = dropdown hidden
  const [queryStart, setQueryStart] = useState(null); // index of the '@' in value
  const textareaRef = useRef(null);
  const debounceRef = useRef(null);

  // Detect @query on every keystroke
  function handleChange(e) {
    onChange(e);
    const cursor = e.target.selectionStart;
    const before = e.target.value.slice(0, cursor);
    const match = before.match(/@(\w[\w\s]{0,30})$/);
    if (match) {
      setQuery(match[1]);
      setQueryStart(before.lastIndexOf('@'));
    } else {
      // Also catch a bare '@' with nothing yet after it
      const bareMatch = before.match(/@$/);
      if (bareMatch) {
        setQuery('');
        setQueryStart(before.length - 1);
      } else {
        setQuery(null);
        setResults([]);
      }
    }
  }

  // Debounced search when query changes
  useEffect(() => {
    if (query === null) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (query === null) return;
      const [profilesRes, churchesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .ilike('display_name', `%${query}%`)
          .limit(6),
        supabase
          .from('churches')
          .select('id, name')
          .ilike('name', `%${query}%`)
          .limit(3),
      ]);
      const users = (profilesRes.data ?? []).map((p) => ({
        type: 'user',
        id: p.id,
        name: p.display_name ?? p.id,
      }));
      const churches = (churchesRes.data ?? []).map((c) => ({
        type: 'church',
        id: c.id,
        name: c.name ?? c.id,
      }));
      setResults([...users, ...churches]);
    }, 200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  function selectMention(item) {
    if (queryStart === null) return;
    // Find the @query text and replace with @Name
    const before = value.slice(0, queryStart);
    // After queryStart we have '@' + (whatever was typed)
    const afterCursor = value.slice(queryStart); // '@query...'
    // Find how much to consume: '@' + query text (up to next space or end)
    const consumed = afterCursor.match(/^@[\w\s]{0,31}/)?.[0] ?? `@${query}`;
    const after = afterCursor.slice(consumed.length);
    const newValue = `${before}@${item.name}${after ? (after.startsWith(' ') ? after : ` ${after}`) : ' '}`;

    // Fire onChange with a synthetic event shape
    onChange({ target: { value: newValue } });

    // Dedupe and add to mentions list
    const already = mentions.some((m) => m.id === item.id);
    if (!already) onMentionsChange?.([...mentions, item]);

    setQuery(null);
    setResults([]);
    // Refocus textarea after state settles
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  // Close dropdown when clicking outside
  function handleKeyDown(e) {
    if (e.key === 'Escape') { setQuery(null); setResults([]); }
  }

  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        autoFocus
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        style={{ ...inputCss, ...style }}
      />
      {query !== null && results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          right: 0,
          zIndex: 200,
          background: T.white,
          border: `1px solid ${T.line}`,
          borderRadius: 12,
          boxShadow: '0 8px 28px rgba(44,24,16,0.13)',
          maxHeight: 220,
          overflowY: 'auto',
          padding: 4,
        }}>
          {results.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              type="button"
              onMouseDown={(e) => {
                // mouseDown fires before blur, preventing textarea losing focus first
                e.preventDefault();
                selectMention(item);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                color: T.ink,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.parchment; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: T.parchment,
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: item.type === 'church' ? 15 : 13,
                fontWeight: 700, color: T.goldDark, flexShrink: 0,
              }}>
                {item.type === 'church' ? '⛪' : (item.name[0] ?? '·').toUpperCase()}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name}
                </span>
              </span>
              <span style={{ fontSize: 11, color: T.inkMuted, flexShrink: 0 }}>
                {item.type === 'church' ? 'Church' : 'Person'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
