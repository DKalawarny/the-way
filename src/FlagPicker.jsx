import { COUNTRIES, codeToFlag } from './countries.js';
import { T } from './theme.js';

/**
 * Inline country-flag picker — up to `max` ISO codes.
 * Props: value (string[]), onChange (fn), max (number, default 2)
 */
export default function FlagPicker({ value = [], onChange, max = 2 }) {
  const atMax = value.length >= max;

  function remove(code) {
    onChange(value.filter((c) => c !== code));
  }

  function handleSelect(e) {
    const code = e.target.value;
    if (!code || atMax || value.includes(code)) return;
    onChange([...value, code]);
    e.target.value = '';
  }

  const available = COUNTRIES.filter(([code]) => !value.includes(code));

  return (
    <div>
      {/* Selected flags as removable pills */}
      {value.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {value.map((code) => {
            const country = COUNTRIES.find(([c]) => c === code);
            const name = country ? country[1] : code;
            return (
              <div
                key={code}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: T.cream,
                  border: `1px solid ${T.gold}`,
                  borderRadius: 999,
                  padding: '5px 10px',
                  fontSize: 13,
                  color: T.ink,
                }}
              >
                <span style={{ fontSize: 16 }}>{codeToFlag(code)}</span>
                <span>{name}</span>
                <button
                  type="button"
                  onClick={() => remove(code)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: T.inkMuted, fontSize: 14, lineHeight: 1,
                    padding: '0 0 0 2px', display: 'flex', alignItems: 'center',
                  }}
                  aria-label={`Remove ${name}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Dropdown to add more */}
      <select
        disabled={atMax}
        onChange={handleSelect}
        defaultValue=""
        style={{
          width: '100%',
          border: `1px solid ${T.line}`,
          borderRadius: 10,
          padding: '10px 12px',
          fontSize: 15,
          background: T.cream,
          color: atMax ? T.inkMuted : T.ink,
          outline: 'none',
          fontFamily: 'inherit',
          boxSizing: 'border-box',
          cursor: atMax ? 'not-allowed' : 'pointer',
          opacity: atMax ? 0.6 : 1,
        }}
      >
        <option value="" disabled>
          {atMax ? `${max} countries selected` : 'Add a country\u2026'}
        </option>
        {available.map(([code, name]) => (
          <option key={code} value={code}>
            {codeToFlag(code)} {name}
          </option>
        ))}
      </select>
    </div>
  );
}
