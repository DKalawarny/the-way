import { useEffect, useState } from 'react';
import { Lock, Globe, Building2, ArrowLeft } from 'lucide-react';
import { supabase } from './supabase.js';
import { T, SEMANTIC } from './theme.js';
import { churchBannerBg } from './ChurchAdmin.jsx';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';
import { Avatar } from './ProfilePage.jsx';
import EmptyState from './EmptyState.jsx';
import { useDraft } from './useDraft.js';

// Candle — personal prayer list empty state
const CandleIcon = (
  <svg width={30} height={30} viewBox="0 0 36 36" fill="none" aria-hidden>
    <rect x="15" y="20" width="6" height="12" rx="2" fill="none" stroke={T.gold} strokeWidth="1.8"/>
    <path d="M18 20 Q14 15 16 8 Q18 13 18 17 Q18 13 20 8 Q22 15 18 20" fill={T.gold} opacity="0.85"/>
    <path d="M18 18 Q17 14 17.5 11 Q18 13 18 16 Q18 13 18.5 11 Q19 14 18 18" fill="rgba(255,220,100,0.5)"/>
    <line x1="10" y1="32" x2="26" y2="32" stroke={T.gold} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
  </svg>
);

// Three flames — group prayer empty state (Pentecost: Acts 2)
const FlamesIcon = (
  <svg width={30} height={30} viewBox="0 0 36 36" fill="none" aria-hidden>
    <path d="M18 28 Q13 23 15 15 Q18 20 18 25 Q18 20 21 15 Q23 23 18 28" fill={T.gold} opacity="0.9"/>
    <path d="M10 25 Q7 20 9 12 Q12 17 12 22 Q12 17 14 12 Q15 20 10 25" fill={T.gold} opacity="0.6"/>
    <path d="M26 25 Q22 20 24 12 Q27 17 27 22 Q27 17 29 12 Q30 20 26 25" fill={T.gold} opacity="0.6"/>
  </svg>
);

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Reusable starburst checkmark ──────────────────────────────────────────────
function StarburstCheck({ size = 34, animate = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34"
      style={{ flexShrink: 0, ...(animate ? { animation: 'badgePop 0.55s cubic-bezier(0.34,1.56,0.64,1) both' } : {}) }}>
      <line x1="17" y1="1"  x2="17" y2="6"  stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="17" y1="28" x2="17" y2="33" stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="1"  y1="17" x2="6"  y2="17" stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="28" y1="17" x2="33" y2="17" stroke={T.gold} strokeWidth="2"   strokeLinecap="round"/>
      <line x1="5.5"  y1="5.5"  x2="8.8"  y2="8.8"  stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="25.2" y1="25.2" x2="28.5" y2="28.5" stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="28.5" y1="5.5"  x2="25.2" y2="8.8"  stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="8.8"  y1="25.2" x2="5.5"  y2="28.5" stroke={T.gold} strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="17" cy="17" r="10" fill={T.gold}/>
      <ellipse cx="15" cy="13.5" rx="4" ry="2" fill="rgba(255,255,255,0.22)"/>
      <polyline points="11,17 15,21 23,12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── My Prayers ────────────────────────────────────────────────────────────────
function MyPrayers({ session, profile }) {
  const [prayers,      setPrayers]      = useState([]);
  const [text,         setText]         = useState('');
  const [newIsAnonymous, setNewIsAnonymous] = useState(false); // false = named, true = anonymous
  const [submitting,   setSubmitting]   = useState(false);
  const clearDraft = useDraft('personal-prayer', text, setText, session?.user?.id);
  const [submitError,  setSubmitError]  = useState(null);
  const [composeOpen,  setComposeOpen]  = useState(false);
  const [praiseTarget, setPraiseTarget] = useState(null);   // prayer awaiting answered-confirmation
  const [praiseText,   setPraiseText]   = useState('');
  const [expandedEnc,  setExpandedEnc]  = useState(new Set()); // prayer ids with enc open
  const [encMap,       setEncMap]       = useState({});          // { prayerId: [...encouragements] }
  const [encCounts,    setEncCounts]    = useState({});          // { prayerId: count }
  const [supportMap,   setSupportMap]   = useState({});          // { prayerId: count }

  useEffect(() => {
    supabase
      .from('personal_prayers')
      .select('*')
      .eq('user_id', session.user.id)
      .is('church_id', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPrayers(data ?? []);
        const pubIds = (data ?? []).filter(p => p.is_public).map(p => p.id);
        if (pubIds.length > 0) {
          supabase.from('personal_prayer_support')
            .select('prayer_id')
            .in('prayer_id', pubIds)
            .then(({ data: sd }) => {
              const counts = {};
              for (const r of sd ?? []) counts[r.prayer_id] = (counts[r.prayer_id] ?? 0) + 1;
              setSupportMap(counts);
            });
          // Encouragement counts so the expand button reads "💬 N encouragements"
          // even before it's opened.
          supabase.from('personal_prayer_encouragements')
            .select('prayer_id')
            .in('prayer_id', pubIds)
            .then(({ data: ed }) => {
              const counts = {};
              for (const r of ed ?? []) counts[r.prayer_id] = (counts[r.prayer_id] ?? 0) + 1;
              setEncCounts(counts);
            });
        }
      });
  }, [session]);

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    const { data, error } = await supabase.from('personal_prayers').insert({
      user_id: session.user.id, body: text.trim(), is_public: false,
    }).select().single();
    setSubmitting(false);
    if (error) {
      console.error('[Prayer.add] insert failed', error);
      setSubmitError('Couldn\'t save — try again.');
      return;
    }
    setSubmitError(null);
    setText(''); clearDraft(); setNewIsAnonymous(false); setComposeOpen(false);
    if (data) setPrayers(prev => [data, ...prev]);
  }

  async function toggleAnonymous(p) {
    // Always keep is_public: true — just flip is_anonymous
    const is_anonymous = !(p.is_anonymous || !p.is_public); // treat old private as anonymous
    await supabase.from('personal_prayers').update({ is_public: true, is_anonymous }).eq('id', p.id);
    setPrayers(prev => prev.map(x => x.id === p.id ? { ...x, is_public: true, is_anonymous } : x));
  }

  // Unanswering is instant; answering opens the praise-report sheet
  function handleAnswerButton(p) {
    if (p.is_answered) {
      applyAnswered(p, false, null);
    } else {
      setPraiseTarget(p);
      setPraiseText('');
    }
  }

  async function applyAnswered(p, answered, report) {
    const updates = {
      is_answered: answered,
      answered_at: answered ? new Date().toISOString() : null,
      praise_report: answered ? (report?.trim() || null) : null,
    };
    await supabase.from('personal_prayers').update(updates).eq('id', p.id);
    setPrayers(prev => prev.map(x => x.id === p.id ? { ...x, ...updates } : x));
    setPraiseTarget(null);
    setPraiseText('');
  }

  async function remove(id) {
    await supabase.from('personal_prayers').delete().eq('id', id);
    setPrayers(prev => prev.filter(x => x.id !== id));
  }

  async function toggleEnc(prayerId) {
    if (expandedEnc.has(prayerId)) {
      setExpandedEnc(prev => { const s = new Set(prev); s.delete(prayerId); return s; });
      return;
    }
    const { data } = await supabase
      .from('personal_prayer_encouragements')
      .select('*, profiles(display_name)')
      .eq('prayer_id', prayerId)
      .order('created_at', { ascending: true });
    setEncMap(prev => ({ ...prev, [prayerId]: data ?? [] }));
    setExpandedEnc(prev => new Set([...prev, prayerId]));
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px', background: T.cream }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        {/* Private journal notice */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 11.5, color: '#5a6b58', fontWeight: 600,
          letterSpacing: '0.04em', textTransform: 'uppercase',
          marginBottom: 16,
          background: 'rgba(90,128,100,0.10)',
          border: '1px solid rgba(90,128,100,0.20)',
          borderRadius: 999, padding: '4px 10px',
        }}>
          <Lock size={10} strokeWidth={2.5} /> Just between you and God
        </div>
        {/* Prayer compose — sage pill, expands inline */}
        <div style={{ marginBottom: 20 }}>
          {!composeOpen ? (
            <button
              onClick={() => setComposeOpen(true)}
              style={{
                width: '100%', display: 'flex', gap: 12, alignItems: 'center',
                background: 'transparent', border: 'none',
                cursor: 'pointer', padding: 0, textAlign: 'left',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <div style={{
                borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(44,24,16,0.14), 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 3px rgba(90,128,100,0.22)',
                flexShrink: 0,
              }}>
                <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url} size={40} />
              </div>
              <div style={{
                flex: 1, minWidth: 0,
                background: 'linear-gradient(180deg, #F4F8F0 0%, #E5EFD9 100%)',
                border: `1px solid ${SEMANTIC.prayer.line}`,
                borderRadius: 999, padding: '11px 16px',
                fontSize: 14.5, fontFamily: T.serif, fontStyle: 'italic',
                color: '#5a6b58',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                boxShadow: 'inset 0 2px 4px rgba(90,128,100,0.10), inset 0 -1px 0 rgba(255,255,255,0.6)',
              }}>
                <span>Add a prayer request…</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 26, height: 26, marginLeft: 12, borderRadius: '50%',
                  background: SEMANTIC.prayer.rail,
                  color: T.cream, fontSize: 14,
                  boxShadow: '0 2px 6px rgba(90,128,100,0.30)',
                }}>🙏</span>
              </div>
            </button>
          ) : (
            <form onSubmit={add} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              background: 'linear-gradient(180deg, #F4F8F0 0%, #E5EFD9 100%)',
              border: `1px solid ${SEMANTIC.prayer.line}`,
              borderRadius: 14, padding: '14px',
              boxShadow: 'inset 0 2px 4px rgba(90,128,100,0.08), inset 0 -1px 0 rgba(255,255,255,0.6)',
            }}>
              <div style={{
                borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(44,24,16,0.14), 0 0 0 2px rgba(255,255,255,0.95), 0 0 0 3px rgba(90,128,100,0.22)',
                flexShrink: 0, marginTop: 2,
              }}>
                <Avatar name={profile?.display_name} avatarConfig={profile?.avatar_config} photoUrl={profile?.avatar_url} size={40} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <textarea
                  autoFocus
                  value={text} onChange={e => setText(e.target.value)}
                  placeholder="Add a prayer request…" rows={4}
                  style={{
                    width: '100%', boxSizing: 'border-box', resize: 'none',
                    background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 15, color: T.ink, fontFamily: T.serif, lineHeight: 1.65,
                  }}
                />
                <div style={{ marginTop: 10, borderTop: `1px solid rgba(90,128,100,0.2)`, paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: '#5a6b58', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <Lock size={10} strokeWidth={2.5} /> Private
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => { setComposeOpen(false); setText(''); }}
                      style={{ background: 'none', border: 'none', color: T.inkMuted, fontSize: 13, cursor: 'pointer', padding: '6px 10px' }}>
                      Cancel
                    </button>
                    <button type="submit" disabled={submitting || !text.trim()} style={{
                      background: text.trim() ? `linear-gradient(135deg, ${SEMANTIC.prayer.rail} 0%, #7A4E20 100%)` : T.line,
                      color: T.cream, border: 'none', borderRadius: 999,
                      padding: '8px 22px', fontSize: 13, fontWeight: 600,
                      cursor: text.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s',
                    }}>
                      {submitting ? 'Adding…' : 'Add'}
                    </button>
                    {submitError && <span style={{ fontSize: 12, color: '#a53f2b', marginLeft: 8 }}>{submitError}</span>}
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {prayers.length === 0 && (
          <EmptyState
            icon={CandleIcon}
            title="Your prayer list is empty."
            body="Add your first prayer above — just between you and God."
          />
        )}

        {prayers.map(p => (
          <div key={p.id} style={{
            background: p.is_answered
              ? 'rgba(184,115,58,0.10)'
              : (p.is_anonymous || !p.is_public)
                ? 'rgba(44,24,16,0.03)'
                : '#FFFFFF',
            border: p.is_answered
              ? `1px solid rgba(184,115,58,0.45)`
              : (p.is_anonymous || !p.is_public)
                ? `1px dashed rgba(44,24,16,0.18)`
                : `1px solid #D9C9A8`,
            borderRadius: 14, padding: '16px 18px', marginBottom: 12,
          }}>

            {/* Answered header */}
            {p.is_answered && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <StarburstCheck size={34} animate />
                <span style={{ fontSize: 14, fontWeight: 700, color: T.gold, fontFamily: T.serif }}>
                  Prayer Answered
                </span>
              </div>
            )}

            {/* Praise report */}
            {p.is_answered && p.praise_report && (
              <div style={{
                background: 'rgba(184,115,58,0.12)', borderRadius: 10,
                padding: '10px 14px', marginBottom: 12,
                borderLeft: `3px solid ${T.gold}`,
              }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold, fontWeight: 700, marginBottom: 4 }}>
                  Praise Report <KinwoveStar size={10} style={{ verticalAlign: 'middle', marginLeft: 3, flexShrink: 0 }} />
                </div>
                <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: '#2C1810', lineHeight: 1.6 }}>
                  "{p.praise_report}"
                </div>
              </div>
            )}

            {/* Body */}
            <div style={{
              fontFamily: T.serif, fontSize: 15,
              color: p.is_answered ? '#4A3828' : '#2C1810',
              lineHeight: 1.65, marginBottom: 12,
            }}>
              {p.body}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Privacy toggle */}
              <button onClick={() => toggleAnonymous(p)}
                title={(p.is_anonymous || !p.is_public) ? 'Anonymous — tap to show your name' : 'Public — tap to post anonymously'}
                style={{
                  background: (p.is_anonymous || !p.is_public) ? 'rgba(44,24,16,0.08)' : 'rgba(184,115,58,0.12)',
                  border: `1px solid ${(p.is_anonymous || !p.is_public) ? 'rgba(44,24,16,0.22)' : 'rgba(184,115,58,0.4)'}`,
                  borderRadius: 999, padding: '5px 12px', fontSize: 11, fontWeight: 600,
                  color: (p.is_anonymous || !p.is_public) ? T.ink : T.goldDark,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                {(p.is_anonymous || !p.is_public)
                  ? <><Lock size={11} strokeWidth={2} /> Anonymous</>
                  : <><Globe size={11} strokeWidth={2} /> Public</>}
              </button>

              {/* Mark answered / unanswered */}
              <button onClick={() => handleAnswerButton(p)} style={{
                background: p.is_answered ? 'rgba(184,115,58,0.15)' : 'transparent',
                border: `1px solid ${p.is_answered ? T.gold : '#D9C9A8'}`,
                borderRadius: 999, padding: '5px 12px', fontSize: 11,
                color: p.is_answered ? T.gold : '#4A3828', cursor: 'pointer',
              }}>
                {p.is_answered ? 'Mark unanswered' : 'Mark answered'}
              </button>

              {/* Praying count */}
              {(supportMap[p.id] ?? 0) > 0 && (
                <span style={{ fontSize: 11, color: T.inkMuted }}>
                  🙏 {supportMap[p.id]} praying
                </span>
              )}

              {/* Remove */}
              <button onClick={() => remove(p.id)} style={{
                background: 'none', border: 'none', color: '#9B8C73',
                fontSize: 11, cursor: 'pointer', marginLeft: 'auto', padding: 0,
              }}>
                Remove
              </button>
            </div>

            {/* Encouragements section */}
            {p.is_public && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
                <button onClick={() => toggleEnc(p.id)} style={{
                  background: 'none', border: 'none', padding: 0,
                  color: T.inkMuted, fontSize: 11, cursor: 'pointer',
                }}>
                  💬 {expandedEnc.has(p.id)
                    ? 'Hide encouragements'
                    : ((encCounts[p.id] ?? 0) > 0
                        ? `${encCounts[p.id]} encouragement${encCounts[p.id] === 1 ? '' : 's'}`
                        : 'View encouragements')}
                </button>
                {expandedEnc.has(p.id) && (
                  <div style={{ marginTop: 10 }}>
                    {(encMap[p.id] ?? []).length === 0 ? (
                      <div style={{ fontSize: 12, color: '#B0A28A', fontStyle: 'italic' }}>
                        No encouragements yet.
                      </div>
                    ) : (
                      (encMap[p.id] ?? []).map(enc => (
                        <div key={enc.id} style={{
                          padding: '8px 12px', marginBottom: 6,
                          background: '#F5ECD9', borderRadius: 10,
                        }}>
                          <div style={{ fontFamily: T.serif, fontSize: 13, color: '#2C1810', lineHeight: 1.5 }}>
                            "{enc.body}"
                          </div>
                          <div style={{ fontSize: 10, color: '#9B8C73', marginTop: 3 }}>
                            {enc.profiles?.display_name ?? 'Someone'} · {timeAgo(enc.created_at)}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Praise report sheet */}
        {praiseTarget && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(44,24,16,0.75)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 20 }}
            onClick={() => setPraiseTarget(null)}
          >
            <div onClick={e => e.stopPropagation()} style={{
              background: T.cream, border: `1px solid ${T.line}`, borderRadius: 20,
              padding: '28px 24px', width: '100%', maxWidth: 420, marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <StarburstCheck size={30} animate />
                <div style={{ fontFamily: T.display, fontSize: 19, color: T.ink, fontWeight: 600, letterSpacing: '-0.012em' }}>
                  Prayer Answered!
                </div>
              </div>
              <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: T.inkMuted, marginBottom: 18, lineHeight: 1.6 }}>
                "{praiseTarget.body}"
              </div>
              <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 10 }}>
                Want to share what happened?{' '}
                <span style={{ color: '#B0A28A' }}>(optional)</span>
              </div>
              <textarea
                value={praiseText}
                onChange={e => setPraiseText(e.target.value.slice(0, 200))}
                placeholder="Share your testimony…"
                rows={3} autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'none',
                  background: '#F5ECD9', border: '1px solid rgba(184,115,58,0.2)',
                  borderRadius: 10, padding: '11px 14px', fontSize: 14, color: T.ink,
                  fontFamily: T.serif, outline: 'none', lineHeight: 1.6, marginBottom: 4,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = T.gold)}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(184,115,58,0.2)')}
              />
              <div style={{ fontSize: 10, color: '#B0A28A', textAlign: 'right', marginBottom: 16 }}>
                {praiseText.length}/200
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => applyAnswered(praiseTarget, true, praiseText)}
                  style={{
                    background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                    padding: '10px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1,
                  }}
                >
                  {praiseText.trim() ? 'Save testimony' : 'Mark answered'}
                </button>
                <button onClick={() => setPraiseTarget(null)} style={{
                  background: 'none', border: 'none', color: '#9B8C73', fontSize: 13, cursor: 'pointer',
                }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Group Prayers ─────────────────────────────────────────────────────────────
function GroupPrayers({ session, profile, userGroup }) {
  const [prayers,    setPrayers]    = useState([]);
  const [prayedFor,  setPrayedFor]  = useState(new Set());
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [expandedEnc, setExpandedEnc] = useState(new Set());
  const [encMap,      setEncMap]      = useState({});   // { prayerId: [{ id, body, created_at, profiles }] }
  const [encCounts,   setEncCounts]   = useState({});   // { prayerId: number }
  const [encNote,     setEncNote]     = useState({});   // { prayerId: string }
  const [encSending,  setEncSending]  = useState(null); // prayerId currently posting

  useEffect(() => {
    if (!userGroup) return;
    supabase.from('prayers')
      .select('*, profiles(display_name, avatar_config, avatar_url)')
      .eq('group_id', userGroup.group.id)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => {
        setPrayers(data ?? []);
        const ids = (data ?? []).map(p => p.id);
        if (ids.length > 0) {
          // Encouragement counts: prayer_responses rows with a non-null note.
          supabase.from('prayer_responses')
            .select('prayer_id')
            .in('prayer_id', ids)
            .not('note', 'is', null)
            .then(({ data: er }) => {
              const counts = {};
              for (const r of er ?? []) counts[r.prayer_id] = (counts[r.prayer_id] ?? 0) + 1;
              setEncCounts(counts);
            });
        }
      });
    if (session) {
      supabase.from('prayer_responses').select('prayer_id').eq('author_id', session.user.id)
        .then(({ data }) => setPrayedFor(new Set(data?.map(r => r.prayer_id) ?? [])));
    }
  }, [session, userGroup]);

  async function post(e) {
    e.preventDefault();
    if (!text.trim() || !session || !userGroup) return;
    setSubmitting(true);
    const { data } = await supabase.from('prayers').insert({
      author_id: session.user.id, body: text.trim(),
      is_public: false, is_anonymous: false, group_id: userGroup.group.id,
    }).select('*, profiles(display_name, avatar_config, avatar_url)').single();
    setText(''); setSubmitting(false);
    if (data) setPrayers(prev => [data, ...prev]);
  }

  async function pray(prayerId) {
    if (!session || prayedFor.has(prayerId)) return;
    const count = (prayers.find(p => p.id === prayerId)?.prayer_count ?? 0) + 1;
    await supabase.from('prayer_responses').insert({ prayer_id: prayerId, author_id: session.user.id });
    await supabase.from('prayers').update({ prayer_count: count }).eq('id', prayerId);
    setPrayedFor(prev => new Set([...prev, prayerId]));
    setPrayers(prev => prev.map(p => p.id === prayerId ? { ...p, prayer_count: count } : p));
  }

  async function toggleEnc(prayerId) {
    if (expandedEnc.has(prayerId)) {
      setExpandedEnc(prev => { const s = new Set(prev); s.delete(prayerId); return s; });
      return;
    }
    if (!encMap[prayerId]) {
      const { data } = await supabase
        .from('prayer_responses')
        .select('id, note, created_at, profiles:author_id(display_name)')
        .eq('prayer_id', prayerId)
        .not('note', 'is', null)
        .order('created_at', { ascending: true });
      const rows = (data ?? []).map(r => ({
        id: r.id, body: r.note, created_at: r.created_at, profiles: r.profiles,
      }));
      setEncMap(prev => ({ ...prev, [prayerId]: rows }));
    }
    setExpandedEnc(prev => new Set([...prev, prayerId]));
  }

  async function sendInlineEnc(prayerId) {
    if (!session) return;
    const body = (encNote[prayerId] ?? '').trim().slice(0, 120);
    if (!body) return;
    setEncSending(prayerId);
    const { data } = await supabase
      .from('prayer_responses')
      .insert({ prayer_id: prayerId, author_id: session.user.id, note: body })
      .select('id, note, created_at')
      .single();
    if (data) {
      const inserted = {
        id: data.id, body: data.note, created_at: data.created_at,
        profiles: { display_name: profile?.display_name ?? 'You' },
      };
      setEncMap(prev => ({ ...prev, [prayerId]: [...(prev[prayerId] ?? []), inserted] }));
      setEncCounts(prev => ({ ...prev, [prayerId]: (prev[prayerId] ?? 0) + 1 }));
    }
    setEncNote(prev => ({ ...prev, [prayerId]: '' }));
    setEncSending(null);
  }

  if (!userGroup) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: T.serif, fontSize: 18, color: T.inkMuted, marginBottom: 8 }}>You're not in a group yet.</div>
        <div style={{ fontSize: 13, color: '#B0A28A' }}>Join or create a group to see group prayers.</div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px', background: T.cream }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 20 }}>
          <Building2 size={13} strokeWidth={1.75} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{userGroup.group.name} · visible to group members only
        </div>
        <form onSubmit={post} style={{ marginBottom: 24 }}>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder={`Share a prayer with ${userGroup.group.name}…`} rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'none',
              background: '#FFFFFF', border: `1px solid ${T.line}`,
              borderRadius: 12, padding: '12px 14px', fontSize: 14, color: T.ink,
              fontFamily: T.serif, outline: 'none', lineHeight: 1.6,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = T.gold)}
            onBlur={e => (e.currentTarget.style.borderColor = '#D9C9A8')}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 8, gap: 8 }}>
            <button type="submit" disabled={submitting || !text.trim()} style={{
              background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
              padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              opacity: submitting || !text.trim() ? 0.5 : 1,
            }}>
              Post
            </button>
          </div>
        </form>
        {prayers.length === 0 && (
          <EmptyState
            icon={FlamesIcon}
            title="No group prayers yet."
            body="Be the first to share — your group is here with you."
          />
        )}
        {prayers.map(p => {
          const hasPrayed = prayedFor.has(p.id);
          const isOwn = session?.user.id === p.author_id;
          const name = p.is_anonymous ? 'Anonymous' : (p.profiles?.display_name ?? 'Anonymous');
          const expanded = expandedEnc.has(p.id);
          const count = encCounts[p.id] ?? 0;
          return (
            <div key={p.id} style={{
              background: '#FFFFFF', border: `1px solid ${T.line}`,
              borderRadius: 14, padding: '16px 18px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <Avatar name={p.profiles?.display_name} avatarConfig={p.profiles?.avatar_config} photoUrl={p.profiles?.avatar_url} size={32}/>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{name}</div>
                  <div style={{ fontSize: 11, color: T.inkMuted }}>{timeAgo(p.created_at)}</div>
                </div>
              </div>
              <div style={{ fontFamily: T.serif, fontSize: 15, color: '#2C1810', lineHeight: 1.7, marginBottom: 14 }}>
                {p.body}
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {!isOwn && (
                  <button onClick={() => pray(p.id)} style={{
                    background: hasPrayed ? 'rgba(184,115,58,0.15)' : 'transparent',
                    border: `1px solid ${hasPrayed ? T.gold : '#D9C9A8'}`,
                    borderRadius: 999, padding: '6px 14px', fontSize: 12,
                    color: hasPrayed ? T.gold : '#4A3828',
                    cursor: hasPrayed ? 'default' : 'pointer',
                  }}>
                    🙏 {hasPrayed ? 'Prayed' : 'Pray for this'}{(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}` : ''}
                  </button>
                )}
                <button onClick={() => toggleEnc(p.id)} style={{
                  background: expanded ? '#F5ECD9' : 'transparent',
                  border: `1px solid ${T.line}`,
                  borderRadius: 999, padding: '6px 14px', fontSize: 12,
                  color: '#4A3828', cursor: 'pointer',
                }}>
                  💬 {count > 0
                    ? `${count} encouragement${count === 1 ? '' : 's'}`
                    : (isOwn ? 'No encouragements yet' : 'Encourage')}
                </button>
                {isOwn && (p.prayer_count ?? 0) > 0 && (
                  <span style={{ fontSize: 12, color: T.inkMuted }}>
                    🙏 {p.prayer_count} praying
                  </span>
                )}
              </div>

              {/* Inline encouragements thread */}
              {expanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
                  {(encMap[p.id] ?? []).length === 0 ? (
                    <div style={{ fontSize: 12, color: '#9B8C73', fontStyle: 'italic', marginBottom: 12 }}>
                      No encouragements yet. {!isOwn && 'Be the first.'}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 12 }}>
                      {(encMap[p.id] ?? []).map(enc => (
                        <div key={enc.id} style={{
                          padding: '8px 12px', marginBottom: 6,
                          background: '#F5ECD9', borderRadius: 10,
                        }}>
                          <div style={{ fontFamily: T.serif, fontSize: 13.5, color: '#2C1810', lineHeight: 1.55 }}>
                            "{enc.body}"
                          </div>
                          <div style={{ fontSize: 10.5, color: '#9B8C73', marginTop: 3 }}>
                            {enc.profiles?.display_name ?? 'Someone'} · {timeAgo(enc.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!isOwn && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <textarea
                        value={encNote[p.id] ?? ''}
                        onChange={(e) => {
                          const v = e.target.value.slice(0, 120);
                          setEncNote(prev => ({ ...prev, [p.id]: v }));
                        }}
                        placeholder="A short word of encouragement…"
                        rows={2}
                        style={{
                          flex: 1, boxSizing: 'border-box', resize: 'none',
                          background: '#F5ECD9', border: '1px solid rgba(184,115,58,0.2)',
                          borderRadius: 10, padding: '8px 12px', fontSize: 13, color: T.ink,
                          fontFamily: T.serif, outline: 'none', lineHeight: 1.5,
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = T.gold)}
                        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(184,115,58,0.2)')}
                      />
                      <button
                        onClick={() => sendInlineEnc(p.id)}
                        disabled={!((encNote[p.id] ?? '').trim()) || encSending === p.id}
                        style={{
                          background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                          padding: '8px 16px', fontSize: 12, fontWeight: 600,
                          cursor: ((encNote[p.id] ?? '').trim() && encSending !== p.id) ? 'pointer' : 'not-allowed',
                          opacity: ((encNote[p.id] ?? '').trim() && encSending !== p.id) ? 1 : 0.4,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {encSending === p.id ? '…' : 'Send'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Prayer({ session, profile, onClose, userGroup, hideHeader }) {
  // Community prayers now surface in the main Feed (Prayers tab). Prayer is
  // purely personal — your list with God, plus optional Group sharing if you
  // belong to one.
  const tabs = userGroup ? ['My prayers', 'Group'] : ['My prayers'];
  const [tab, setTab] = useState('My prayers');
  const [church, setChurch] = useState(null);

  useEffect(() => {
    if (!profile?.church_id) return;
    supabase
      .from('churches')
      .select('id, name, avatar_url, banner_preset')
      .eq('id', profile.church_id)
      .maybeSingle()
      .then(({ data }) => setChurch(data ?? null));
  }, [profile?.church_id]);

  return (
    <div style={{ minHeight: '100vh', background: T.parchment, display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }}/>

      {!hideHeader && (
        <header style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(184,115,58,0.15)' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.inkMuted, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5, fontSize: 13 }}>
            <ArrowLeft size={15} strokeWidth={2} /> Back
          </button>
          <div style={{ fontFamily: T.serif, fontSize: 21, fontWeight: 600, color: T.ink, flex: 1, letterSpacing: '-0.012em' }}>Prayer Journal</div>
          {/* Reserved space for fixed FAB cluster (bell + messages + search + menu ≈ 200px from right) */}
          <div style={{ width: 204, flexShrink: 0 }} aria-hidden="true" />
        </header>
      )}

      {church && (
        <div style={{
          height: 160,
          background: churchBannerBg(church),
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: '3px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 42, overflow: 'hidden',
          }}>
            {church.avatar_url
              ? <img src={church.avatar_url} alt={church.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : '⛪'}
          </div>
          <div style={{ fontFamily: T.serif, fontSize: 13, fontWeight: 600, color: 'rgba(253,248,240,0.8)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {church.name}
          </div>
        </div>
      )}

      {tabs.length > 1 && (
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(184,115,58,0.12)', background: '#FDF8F0' }}>
          {tabs.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '13px 8px', background: 'none', border: 'none',
              borderBottom: tab === t ? `2px solid ${T.gold}` : '2px solid transparent',
              color: tab === t ? T.ink : '#9B8C73',
              fontSize: 12, fontWeight: tab === t ? 600 : 400, cursor: 'pointer', marginBottom: -1,
            }}>
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === 'My prayers'  && <MyPrayers        session={session} profile={profile} userGroup={userGroup}/>}
      {tab === 'Group'       && <GroupPrayers      session={session} profile={profile} userGroup={userGroup}/>}
    </div>
  );
}
