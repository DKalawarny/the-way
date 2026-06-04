import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';
import { PERSON_TYPES } from './constants.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

const TYPE_COLORS = {
  curious:       { bg: 'rgba(184,115,58,0.1)',  border: 'rgba(184,115,58,0.3)',  text: '#8B5E2A' },
  seeking:       { bg: 'rgba(100,149,237,0.1)', border: 'rgba(100,149,237,0.3)', text: '#3A5FA0' },
  skeptic:       { bg: 'rgba(150,150,150,0.1)', border: 'rgba(150,150,150,0.3)', text: '#555' },
  'new-faith':   { bg: 'rgba(72,187,120,0.1)',  border: 'rgba(72,187,120,0.3)',  text: '#276749' },
  deeper:        { bg: 'rgba(128,90,213,0.1)',  border: 'rgba(128,90,213,0.3)',  text: '#553C9A' },
  group:         { bg: 'rgba(237,137,54,0.1)',  border: 'rgba(237,137,54,0.3)',  text: '#9C4221' },
  'inter-faith': { bg: 'rgba(49,130,206,0.1)',  border: 'rgba(49,130,206,0.3)', text: '#2B6CB0' },
  guided:        { bg: 'rgba(56,178,172,0.1)',  border: 'rgba(56,178,172,0.3)',  text: '#285E61' },
  'heard-things':{ bg: 'rgba(159,122,234,0.1)', border: 'rgba(159,122,234,0.3)', text: '#553C9A' },
};

const SearchIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const SlidersIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="4" y1="6" x2="14" y2="6" />
    <circle cx="17" cy="6" r="2.5" />
    <line x1="4" y1="12" x2="9" y2="12" />
    <circle cx="12" cy="12" r="2.5" />
    <line x1="4" y1="18" x2="14" y2="18" />
    <circle cx="17" cy="18" r="2.5" />
  </svg>
);

function PersonCard({ person, onViewProfile }) {
  const pt = PERSON_TYPES.find((p) => p.id === person.person_type);
  const tc = TYPE_COLORS[person.person_type] ?? TYPE_COLORS.curious;
  const loc = [person.city, person.country].filter(Boolean).join(', ');

  return (
    <button
      onClick={() => onViewProfile(person.id)}
      style={{
        width: '100%', textAlign: 'left', background: T.white,
        border: `1px solid ${T.line}`, borderRadius: 12,
        padding: '11px 14px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.goldLight; e.currentTarget.style.background = T.parchment; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.white; }}
    >
      <Avatar name={person.display_name} avatarConfig={person.avatar_config} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14.5, color: T.ink, marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{person.display_name}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {pt && (
            <span style={{ background: tc.bg, border: `1px solid ${tc.border}`, color: tc.text, borderRadius: 999, padding: '1px 8px', fontSize: 11, fontWeight: 600 }}>
              {pt.label}
            </span>
          )}
          {loc && <span style={{ fontSize: 12, color: T.inkMuted }}>{loc}</span>}
          {person.tradition && person.tradition !== 'Discovering' && (
            <span style={{ fontSize: 12, color: T.inkMuted }}>· {person.tradition}</span>
          )}
        </div>
      </div>
      <div style={{ color: T.inkMuted, fontSize: 16, flexShrink: 0 }}>›</div>
    </button>
  );
}

function ChurchCard({ church, memberCount, isMine, onOpen }) {
  return (
    <button
      onClick={() => onOpen(church.id)}
      style={{
        width: '100%', textAlign: 'left', background: T.white,
        border: `1px solid ${isMine ? T.gold : T.line}`, borderRadius: 12,
        padding: '11px 14px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => { if (!isMine) e.currentTarget.style.borderColor = T.goldLight; e.currentTarget.style.background = T.parchment; }}
      onMouseLeave={(e) => { if (!isMine) e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.white; }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: T.parchment, border: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>⛪</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {church.name}
          </div>
          {isMine && (
            <span style={{ fontSize: 10, fontWeight: 700, color: T.goldDark, background: 'rgba(184,115,58,0.12)', padding: '2px 7px', borderRadius: 999, letterSpacing: 0.4, textTransform: 'uppercase' }}>
              Yours
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: T.inkMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[church.denomination, [church.city, church.country].filter(Boolean).join(', ')].filter(Boolean).join(' · ') || '—'}
          {memberCount > 0 && <span style={{ color: T.goldDark }}> · {memberCount} member{memberCount !== 1 ? 's' : ''}</span>}
        </div>
      </div>
      <div style={{ color: T.inkMuted, fontSize: 16, flexShrink: 0 }}>›</div>
    </button>
  );
}

function PastorCard({ pastor, onViewProfile, onStartDM }) {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 12,
      padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12,
      transition: 'border-color 0.15s',
    }}>
      <button
        onClick={() => onViewProfile(pastor.id)}
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, flex: 1, textAlign: 'left', minWidth: 0 }}
      >
        <Avatar name={pastor.display_name} avatarConfig={pastor.avatar_config} photoUrl={pastor.avatar_url} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14.5, color: T.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {pastor.display_name}
          </div>
          <div style={{ fontSize: 12, color: T.inkMuted, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <KinwoveStar size={9} color={T.goldDark} style={{ flexShrink: 0 }} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {pastor.church.name}{pastor.church.city ? ` · ${pastor.church.city}` : ''}
            </span>
          </div>
        </div>
      </button>
      {onStartDM && (
        <button
          onClick={() => onStartDM(pastor.id)}
          style={{
            background: 'transparent', color: T.ink,
            border: `1.5px solid ${T.ink}`,
            borderRadius: 999, padding: '6px 12px',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            flexShrink: 0, whiteSpace: 'nowrap',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.ink; e.currentTarget.style.color = T.cream; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.ink; }}
        >✉ Message</button>
      )}
    </div>
  );
}

export default function PeopleSearch({ session, profile, onClose, onViewProfile, onOpenChurch, onApplyAsPastor, onStartDM }) {
  const [tab, setTab] = useState('people');

  // People state
  const [query, setQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Church state
  const [churchQuery, setChurchQuery] = useState('');
  const [churchResults, setChurchResults] = useState([]);
  const [memberCounts, setMemberCounts] = useState({});
  const [churchesLoading, setChurchesLoading] = useState(false);
  const churchDebounceRef = useRef(null);

  // Pastors state
  const [pastorResults, setPastorResults] = useState([]);
  const [pastorsLoading, setPastorsLoading] = useState(false);

  const hasFilters = !!cityFilter.trim();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (tab === 'churches') {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [tab]);

  const runSearch = useCallback(async (q, city) => {
    const hasQuery = q.trim();
    const hasCity = (city || '').trim();
    if (!hasQuery && !hasCity) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const uid = session?.user?.id;
    let req = supabase
      .from('profiles')
      .select('id, display_name, avatar_config, avatar_url, person_type, city, country, tradition')
      .limit(20);
    if (uid) req = req.neq('id', uid);
    if (hasQuery) {
      const term = hasQuery.replace(/[%,()]/g, '');
      req = req.ilike('display_name', `%${term}%`);
    }
    if (hasCity) {
      const c = hasCity.replace(/[%,()]/g, '');
      req = req.or(`city.ilike.%${c}%,country.ilike.%${c}%`);
    }
    const { data } = await req;
    setResults(data ?? []);
    setLoading(false);
  }, [session]);

  const runChurchSearch = useCallback(async (q) => {
    const term = q.trim();
    if (!term) { setChurchResults([]); setMemberCounts({}); setChurchesLoading(false); return; }
    setChurchesLoading(true);
    const safe = term.replace(/[%,()]/g, '');
    const { data } = await supabase
      .from('churches')
      .select('id, name, denomination, city, country, pastor_id, verification_status, is_public')
      .eq('is_public', true)
      .eq('verification_status', 'verified')
      .or(`name.ilike.%${safe}%,denomination.ilike.%${safe}%,city.ilike.%${safe}%,country.ilike.%${safe}%`)
      .limit(20);
    const list = data ?? [];
    setChurchResults(list);
    if (list.length) {
      const ids = list.map((c) => c.id);
      const { data: members } = await supabase
        .from('profiles')
        .select('church_id')
        .in('church_id', ids);
      const counts = {};
      for (const m of members ?? []) counts[m.church_id] = (counts[m.church_id] ?? 0) + 1;
      setMemberCounts(counts);
    } else {
      setMemberCounts({});
    }
    setChurchesLoading(false);
  }, []);

  function handleInput(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim() && !cityFilter.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(val, cityFilter), 280);
  }

  function handleCityFilter(e) {
    const val = e.target.value;
    setCityFilter(val);
    clearTimeout(debounceRef.current);
    if (!query.trim() && !val.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => runSearch(query, val), 280);
  }

  function handleChurchInput(e) {
    const val = e.target.value;
    setChurchQuery(val);
    clearTimeout(churchDebounceRef.current);
    if (!val.trim()) {
      setChurchResults([]);
      setMemberCounts({});
      setChurchesLoading(false);
      return;
    }
    setChurchesLoading(true);
    churchDebounceRef.current = setTimeout(() => runChurchSearch(val), 280);
  }

  function clearFilters() {
    setCityFilter('');
    clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
    } else {
      runSearch(query, '');
    }
  }

  const loadPastors = useCallback(async () => {
    setPastorsLoading(true);
    // Get verified public churches that have a pastor assigned
    const { data: churches } = await supabase
      .from('churches')
      .select('id, name, city, country, denomination, pastor_id')
      .eq('verification_status', 'verified')
      .eq('is_public', true)
      .not('pastor_id', 'is', null)
      .limit(60);
    const list = churches ?? [];
    const pastorIds = [...new Set(list.map((c) => c.pastor_id).filter(Boolean))];
    if (!pastorIds.length) { setPastorResults([]); setPastorsLoading(false); return; }
    const uid = session?.user?.id;
    let req = supabase
      .from('profiles')
      .select('id, display_name, avatar_config, avatar_url')
      .in('id', pastorIds);
    if (uid) req = req.neq('id', uid);
    const { data: profs } = await req;
    const profileMap = {};
    (profs ?? []).forEach((p) => { profileMap[p.id] = p; });
    const combined = list
      .filter((c) => profileMap[c.pastor_id])
      .map((c) => ({ ...profileMap[c.pastor_id], church: c }));
    setPastorResults(combined);
    setPastorsLoading(false);
  }, [session]);

  useEffect(() => {
    if (tab === 'pastors') loadPastors();
  }, [tab, loadPastors]);

  const isSearching = !!(query.trim() || hasFilters);
  const showPeopleEmpty = isSearching && !loading && results.length === 0;
  const showChurchEmpty = !!churchQuery.trim() && !churchesLoading && churchResults.length === 0;

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
        {/* Header — close button + segmented tabs, no redundant title */}
        <div style={{ padding: '14px 16px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                flex: 1,
                display: 'inline-flex',
                background: T.parchment,
                border: `1px solid ${T.line}`,
                borderRadius: 999,
                padding: 3,
              }}
            >
              {[
                { id: 'people', label: 'People' },
                { id: 'churches', label: 'Churches' },
                { id: 'pastors', label: 'Pastors' },
              ].map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{
                      flex: 1,
                      background: active ? T.white : 'transparent',
                      border: 'none',
                      padding: '7px 12px',
                      fontSize: 13.5, fontWeight: active ? 700 : 500,
                      color: active ? T.ink : T.inkMuted,
                      cursor: 'pointer',
                      borderRadius: 999,
                      boxShadow: active ? '0 1px 3px rgba(44,24,16,0.08)' : 'none',
                      transition: 'color 0.12s, background 0.12s',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none', border: 'none',
                color: T.inkMuted, fontSize: 18, cursor: 'pointer',
                lineHeight: 1, padding: 6,
                width: 32, height: 32, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Per-tab search controls */}
        {tab === 'people' && (
          <div style={{ padding: '12px 16px 12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={handleInput}
                  placeholder="Search by name"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: T.parchment, border: `1px solid ${T.line}`,
                    borderRadius: 999, padding: '10px 16px 10px 38px',
                    fontSize: 14.5, color: T.ink, outline: 'none',
                    fontFamily: T.sans, transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = T.goldLight; e.currentTarget.style.background = T.white; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.parchment; }}
                />
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.inkMuted, pointerEvents: 'none', display: 'flex' }}>
                  <SearchIcon size={15} />
                </span>
              </div>
              <button
                onClick={() => setFiltersOpen((o) => !o)}
                aria-label="Filters"
                style={{
                  background: filtersOpen || hasFilters ? 'rgba(184,115,58,0.12)' : T.parchment,
                  border: `1px solid ${filtersOpen || hasFilters ? T.gold : T.line}`,
                  color: filtersOpen || hasFilters ? T.goldDark : T.inkSoft,
                  borderRadius: 999, padding: '8px 12px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <SlidersIcon />
                {hasFilters && <span style={{ background: T.gold, color: T.cream, borderRadius: 999, width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>1</span>}
              </button>
            </div>

            {filtersOpen && (
              <div style={{ marginTop: 12, animation: 'fadeIn 0.15s ease' }}>
                <div style={{ fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', color: T.inkMuted, fontWeight: 600, marginBottom: 8 }}>
                  City or country
                </div>
                <input
                  value={cityFilter}
                  onChange={handleCityFilter}
                  placeholder="e.g. Nanaimo, Canada"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: T.parchment, border: `1px solid ${T.line}`,
                    borderRadius: 999, padding: '9px 14px',
                    fontSize: 14, color: T.ink, outline: 'none',
                    fontFamily: T.sans, transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = T.goldLight; e.currentTarget.style.background = T.white; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.parchment; }}
                />
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    style={{ marginTop: 10, background: 'none', border: 'none', color: T.inkMuted, fontSize: 12, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'churches' && (
          <div style={{ padding: '12px 16px 12px', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <input
                value={churchQuery}
                onChange={handleChurchInput}
                placeholder="Search by name, city, or denomination"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: T.parchment, border: `1px solid ${T.line}`,
                  borderRadius: 999, padding: '10px 16px 10px 38px',
                  fontSize: 14.5, color: T.ink, outline: 'none',
                  fontFamily: T.sans, transition: 'border-color 0.15s, background 0.15s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = T.goldLight; e.currentTarget.style.background = T.white; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.background = T.parchment; }}
              />
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.inkMuted, pointerEvents: 'none', display: 'flex' }}>
                <SearchIcon size={15} />
              </span>
            </div>
          </div>
        )}

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 20px' }}>
          {tab === 'people' && (
            <>
              {!isSearching && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: T.inkMuted, fontSize: 14 }}>
                  Start typing to find people by name.
                </div>
              )}
              {isSearching && loading && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: T.inkMuted, fontSize: 14 }}>Searching…</div>
              )}
              {showPeopleEmpty && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%',
                    background: 'rgba(184,115,58,0.09)', border: '1px solid rgba(184,115,58,0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                  }}>
                    <svg width={30} height={30} viewBox="0 0 36 36" fill="none" aria-hidden>
                      {/* Magnifying glass */}
                      <circle cx="16" cy="16" r="9" fill="none" stroke={T.gold} strokeWidth="1.8"/>
                      <line x1="22" y1="22" x2="30" y2="30" stroke={T.gold} strokeWidth="2.2" strokeLinecap="round"/>
                      <path d="M13 12 Q13 10 16 10 Q19 10 19 13 Q19 15 16 16" stroke={T.gold} strokeWidth="1.6" fill="none" strokeLinecap="round"/>
                      <circle cx="16" cy="19" r="1.2" fill={T.gold}/>
                    </svg>
                  </div>
                  <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 6 }}>No results found</div>
                  <div style={{ fontSize: 14, color: T.inkMuted }}>Try a different name or city.</div>
                </div>
              )}
              {isSearching && !loading && results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {results.map((p) => (
                    <PersonCard
                      key={p.id}
                      person={p}
                      onViewProfile={(uid) => { onClose(); onViewProfile(uid); }}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'pastors' && (
            <>
              {pastorsLoading && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: T.inkMuted, fontSize: 14 }}>Loading…</div>
              )}
              {!pastorsLoading && pastorResults.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🙏</div>
                  <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.ink, marginBottom: 6 }}>
                    No pastors yet
                  </div>
                  <div style={{ fontSize: 13.5, color: T.inkMuted, lineHeight: 1.6 }}>
                    Pastors from verified churches will appear here.
                  </div>
                </div>
              )}
              {!pastorsLoading && pastorResults.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 10, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
                    {pastorResults.length} verified pastor{pastorResults.length !== 1 ? 's' : ''}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pastorResults.map((p) => (
                      <PastorCard
                        key={p.id}
                        pastor={p}
                        onViewProfile={(uid) => { onClose(); onViewProfile(uid); }}
                        onStartDM={onStartDM ? (uid) => { onClose(); onStartDM(uid); } : null}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {tab === 'churches' && (
            <>
              {!churchQuery.trim() && (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: T.inkMuted, fontSize: 14 }}>
                  Start typing to find a church by name, city, or denomination.
                </div>
              )}
              {churchQuery.trim() && churchesLoading && (
                <div style={{ textAlign: 'center', padding: '32px 0', color: T.inkMuted, fontSize: 14 }}>Searching…</div>
              )}
              {showChurchEmpty && (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>⛪</div>
                  <div style={{ fontFamily: T.display, fontSize: 22, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.15, marginBottom: 6 }}>No churches match.</div>
                  <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>Try a different search.</div>
                  {onApplyAsPastor && !profile?.is_pastor && (
                    <button
                      onClick={() => { onClose(); onApplyAsPastor(); }}
                      style={{
                        marginTop: 18, background: T.ink, color: T.cream, border: 'none',
                        borderRadius: 999, padding: '11px 22px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      }}
                    >
                      <KinwoveStar size={12} style={{ verticalAlign: 'middle', marginRight: 5, flexShrink: 0 }} /> Apply as a pastor
                    </button>
                  )}
                </div>
              )}
              {churchQuery.trim() && !churchesLoading && churchResults.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {churchResults.map((c) => (
                    <ChurchCard
                      key={c.id}
                      church={c}
                      memberCount={memberCounts[c.id] ?? 0}
                      isMine={profile?.church_id === c.id}
                      onOpen={(id) => { onClose(); onOpenChurch?.(id); }}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
