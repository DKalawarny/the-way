import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import { PERSON_TYPES } from './constants.js';

const TYPE_COLORS = {
  curious:       { bg: 'rgba(196,129,58,0.1)',  border: 'rgba(196,129,58,0.3)',  text: '#8B5E2A' },
  seeking:       { bg: 'rgba(100,149,237,0.1)', border: 'rgba(100,149,237,0.3)', text: '#3A5FA0' },
  skeptic:       { bg: 'rgba(150,150,150,0.1)', border: 'rgba(150,150,150,0.3)', text: '#555' },
  'new-faith':   { bg: 'rgba(72,187,120,0.1)',  border: 'rgba(72,187,120,0.3)',  text: '#276749' },
  deeper:        { bg: 'rgba(128,90,213,0.1)',  border: 'rgba(128,90,213,0.3)',  text: '#553C9A' },
  group:         { bg: 'rgba(237,137,54,0.1)',  border: 'rgba(237,137,54,0.3)',  text: '#9C4221' },
  'inter-faith': { bg: 'rgba(49,130,206,0.1)',  border: 'rgba(49,130,206,0.3)', text: '#2B6CB0' },
  guided:        { bg: 'rgba(56,178,172,0.1)',  border: 'rgba(56,178,172,0.3)',  text: '#285E61' },
  'heard-things':{ bg: 'rgba(159,122,234,0.1)', border: 'rgba(159,122,234,0.3)', text: '#553C9A' },
};

function PersonCard({ person, onViewProfile }) {
  const pt = PERSON_TYPES.find((p) => p.id === person.person_type);
  const tc = TYPE_COLORS[person.person_type] ?? TYPE_COLORS.curious;
  const loc = [person.city, person.country].filter(Boolean).join(', ');

  return (
    <button
      onClick={() => onViewProfile(person.id)}
      style={{
        width: '100%', textAlign: 'left', background: T.white,
        border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '14px 16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.goldLight; e.currentTarget.style.boxShadow = '0 2px 12px rgba(196,129,58,0.1)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <Avatar name={person.display_name} avatarConfig={person.avatar_config} size={46} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15, color: T.ink, marginBottom: 4 }}>{person.display_name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {pt && (
            <span style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text, borderRadius: 999, padding: '2px 9px', fontSize: 11, fontWeight: 600 }}>
              {pt.emoji} {pt.label}
            </span>
          )}
          {loc && <span style={{ fontSize: 12, color: T.inkMuted }}>{loc}</span>}
          {person.tradition && person.tradition !== 'Discovering' && (
            <span style={{ fontSize: 12, color: T.inkMuted }}>· {person.tradition}</span>
          )}
        </div>
      </div>
      <div style={{ color: T.inkMuted, fontSize: 18 }}>›</div>
    </button>
  );
}

export default function PeopleSearch({ session, onClose, onViewProfile }) {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState(null);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const hasFilters = !!typeFilter;

  useEffect(() => {
    inputRef.current?.focus();
    loadSuggestions();
  }, []);

  async function loadSuggestions() {
    const uid = session?.user?.id;
    let q = supabase
      .from('profiles')
      .select('id, display_name, avatar_config, person_type, city, country, tradition')
      .order('created_at', { ascending: false })
      .limit(12);
    if (uid) q = q.neq('id', uid);
    const { data } = await q;
    setSuggestions(data ?? []);
  }

  const runSearch = useCallback(async (q, type) => {
    const hasQuery = q.trim();
    if (!hasQuery && !type) { setResults([]); return; }
    setLoading(true);
    const uid = session?.user?.id;
    let req = supabase
      .from('profiles')
      .select('id, display_name, avatar_config, person_type, city, country, tradition')
      .limit(20);
    if (uid) req = req.neq('id', uid);
    if (hasQuery) req = req.or(`display_name.ilike.%${q.trim()}%,city.ilike.%${q.trim()}%`);
    if (type) req = req.eq('person_type', type);
    const { data } = await req;
    setResults(data ?? []);
    setLoading(false);
  }, [session]);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val, typeFilter), 280);
  }

  function toggleType(id) {
    const next = typeFilter === id ? null : id;
    setTypeFilter(next);
    clearTimeout(debounceRef.current);
    runSearch(query, next);
  }

  function clearFilters() {
    setTypeFilter(null);
    clearTimeout(debounceRef.current);
    runSearch(query, null);
  }

  const isSearching = query.trim() || hasFilters;
  const list = isSearching ? results : suggestions;
  const showEmpty = isSearching && !loading && results.length === 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(44,24,16,0.45)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '64px 20px 20px',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.cream, borderRadius: 20,
          width: '100%', maxWidth: 520,
          maxHeight: 'calc(100vh - 100px)',
          display: 'flex', flexDirection: 'column',
          border: `1px solid ${T.line}`,
          boxShadow: '0 20px 60px rgba(44,24,16,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: `1px solid ${T.line}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em' }}>Find People</div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4 }}>✕</button>
          </div>

          {/* Search row */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                ref={inputRef}
                value={query}
                onChange={handleInput}
                placeholder="Search by name or city…"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: T.parchment, border: `1.5px solid ${T.line}`,
                  borderRadius: 12, padding: '11px 16px 11px 40px',
                  fontSize: 15, color: T.ink, outline: 'none',
                  fontFamily: T.sans, transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = T.gold)}
                onBlur={(e) => (e.currentTarget.style.borderColor = T.line)}
              />
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: T.inkMuted, pointerEvents: 'none' }}>🔍</span>
            </div>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              style={{
                background: filtersOpen || hasFilters ? 'rgba(196,129,58,0.12)' : T.parchment,
                border: `1.5px solid ${filtersOpen || hasFilters ? T.gold : T.line}`,
                color: filtersOpen || hasFilters ? T.goldDark : T.inkMuted,
                borderRadius: 12, padding: '10px 14px',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              ⚙ Filters{hasFilters ? ' ·' : ''}
              {hasFilters && <span style={{ background: T.gold, color: T.cream, borderRadius: 999, width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</span>}
            </button>
          </div>

          {/* Expandable filters */}
          {filtersOpen && (
            <div style={{ marginTop: 12, animation: 'fadeIn 0.15s ease' }}>
              <div style={{ fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 8 }}>
                Faith stage
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PERSON_TYPES.map((pt) => {
                  const active = typeFilter === pt.id;
                  const tc = TYPE_COLORS[pt.id] ?? TYPE_COLORS.curious;
                  return (
                    <button
                      key={pt.id}
                      onClick={() => toggleType(pt.id)}
                      style={{
                        background: active ? tc.bg : 'transparent',
                        border: `1.5px solid ${active ? tc.border : T.line}`,
                        color: active ? tc.text : T.inkMuted,
                        borderRadius: 999, padding: '5px 12px',
                        fontSize: 12, fontWeight: active ? 600 : 400,
                        cursor: 'pointer', transition: 'all 0.12s',
                      }}
                    >
                      {pt.emoji} {pt.label}
                    </button>
                  );
                })}
              </div>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  style={{ marginTop: 10, background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}>
          {!isSearching && (
            <div style={{ fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 12 }}>
              Recently joined
            </div>
          )}
          {loading && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: T.inkMuted, fontSize: 14 }}>Searching…</div>
          )}
          {showEmpty && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
              <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 6 }}>No results found</div>
              <div style={{ fontSize: 14, color: T.inkMuted }}>Try a different name, city, or remove a filter.</div>
            </div>
          )}
          {!loading && list.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map((p) => (
                <PersonCard
                  key={p.id}
                  person={p}
                  onViewProfile={(uid) => { onClose(); onViewProfile(uid); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
