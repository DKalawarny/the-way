import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import { Avatar } from './ProfilePage.jsx';

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
function MyPrayers({ session }) {
  const [prayers,      setPrayers]      = useState([]);
  const [text,         setText]         = useState('');
  const [newIsPublic,  setNewIsPublic]  = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [praiseTarget, setPraiseTarget] = useState(null);   // prayer awaiting answered-confirmation
  const [praiseText,   setPraiseText]   = useState('');
  const [expandedEnc,  setExpandedEnc]  = useState(new Set()); // prayer ids with enc open
  const [encMap,       setEncMap]       = useState({});          // { prayerId: [...encouragements] }
  const [supportMap,   setSupportMap]   = useState({});          // { prayerId: count }

  useEffect(() => {
    supabase
      .from('personal_prayers')
      .select('*')
      .eq('user_id', session.user.id)
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
        }
      });
  }, [session]);

  async function add(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    const { data } = await supabase.from('personal_prayers').insert({
      user_id: session.user.id, body: text.trim(), is_public: newIsPublic,
    }).select().single();
    setText(''); setNewIsPublic(false); setSubmitting(false);
    if (data) setPrayers(prev => [data, ...prev]);
  }

  async function togglePublic(p) {
    const is_public = !p.is_public;
    await supabase.from('personal_prayers').update({ is_public }).eq('id', p.id);
    setPrayers(prev => prev.map(x => x.id === p.id ? { ...x, is_public } : x));
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
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px', background: '#2A1A0E' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.55)', lineHeight: 1.65, marginBottom: 24 }}>
          Your personal prayer list — just between you and God. Toggle public to let the community pray with you.
        </div>

        {/* Add prayer */}
        <form onSubmit={add} style={{ marginBottom: 24 }}>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder="Add a prayer request…" rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'none',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: '12px 14px', fontSize: 14, color: T.cream,
              fontFamily: T.serif, outline: 'none', lineHeight: 1.6,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = T.gold)}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 8 }}>
            {/* Privacy toggle */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 999, padding: 3, gap: 2 }}>
              <button type="button" onClick={() => setNewIsPublic(false)} style={{
                background: !newIsPublic ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: 'none', borderRadius: 999, padding: '5px 12px', fontSize: 12,
                color: !newIsPublic ? T.cream : 'rgba(253,248,240,0.4)',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                fontWeight: !newIsPublic ? 600 : 400, transition: 'all 0.15s',
              }}>
                🔒 Private
              </button>
              <button type="button" onClick={() => setNewIsPublic(true)} style={{
                background: newIsPublic ? 'rgba(196,129,58,0.25)' : 'transparent',
                border: 'none', borderRadius: 999, padding: '5px 12px', fontSize: 12,
                color: newIsPublic ? T.gold : 'rgba(253,248,240,0.4)',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                fontWeight: newIsPublic ? 600 : 400, transition: 'all 0.15s',
              }}>
                🌐 Public
              </button>
            </div>
            <button type="submit" disabled={submitting || !text.trim()} style={{
              background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
              padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              opacity: submitting || !text.trim() ? 0.5 : 1,
            }}>
              Add
            </button>
          </div>
        </form>

        {prayers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'rgba(253,248,240,0.3)', fontFamily: T.serif, fontSize: 16 }}>
            Your prayer list is empty.
          </div>
        )}

        {prayers.map(p => (
          <div key={p.id} style={{
            background: p.is_answered ? 'rgba(196,129,58,0.10)' : 'rgba(255,255,255,0.08)',
            border: `1px solid ${p.is_answered ? 'rgba(196,129,58,0.45)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: 14, padding: '16px 18px', marginBottom: 10,
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
                background: 'rgba(196,129,58,0.12)', borderRadius: 10,
                padding: '10px 14px', marginBottom: 12,
                borderLeft: `3px solid ${T.gold}`,
              }}>
                <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold, fontWeight: 700, marginBottom: 4 }}>
                  Praise Report ✦
                </div>
                <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: 'rgba(253,248,240,0.85)', lineHeight: 1.6 }}>
                  "{p.praise_report}"
                </div>
              </div>
            )}

            {/* Body */}
            <div style={{
              fontFamily: T.serif, fontSize: 15,
              color: p.is_answered ? 'rgba(253,248,240,0.75)' : 'rgba(253,248,240,0.88)',
              lineHeight: 1.65, marginBottom: 12,
            }}>
              {p.body}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>

              {/* Privacy toggle */}
              <button onClick={() => togglePublic(p)}
                title={p.is_public ? 'Public — tap to make private' : 'Private — tap to share publicly'}
                style={{
                  background: p.is_public ? 'rgba(196,129,58,0.12)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${p.is_public ? 'rgba(196,129,58,0.4)' : 'rgba(255,255,255,0.15)'}`,
                  borderRadius: 999, padding: '5px 10px', fontSize: 11,
                  color: p.is_public ? T.gold : 'rgba(253,248,240,0.45)',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                }}>
                {p.is_public ? '🌐 Public' : '🔒 Private'}
              </button>

              {/* Mark answered / unanswered */}
              <button onClick={() => handleAnswerButton(p)} style={{
                background: p.is_answered ? 'rgba(196,129,58,0.15)' : 'transparent',
                border: `1px solid ${p.is_answered ? T.gold : 'rgba(255,255,255,0.18)'}`,
                borderRadius: 999, padding: '5px 12px', fontSize: 11,
                color: p.is_answered ? T.gold : 'rgba(253,248,240,0.65)', cursor: 'pointer',
              }}>
                {p.is_answered ? 'Mark unanswered' : 'Mark answered'}
              </button>

              {/* Praying count */}
              {p.is_public && (supportMap[p.id] ?? 0) > 0 && (
                <span style={{ fontSize: 11, color: 'rgba(253,248,240,0.45)' }}>
                  🙏 {supportMap[p.id]} praying
                </span>
              )}

              {/* Remove */}
              <button onClick={() => remove(p.id)} style={{
                background: 'none', border: 'none', color: 'rgba(253,248,240,0.35)',
                fontSize: 11, cursor: 'pointer', marginLeft: 'auto', padding: 0,
              }}>
                Remove
              </button>
            </div>

            {/* Encouragements section (public prayers only) */}
            {p.is_public && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                <button onClick={() => toggleEnc(p.id)} style={{
                  background: 'none', border: 'none', padding: 0,
                  color: 'rgba(253,248,240,0.4)', fontSize: 11, cursor: 'pointer',
                }}>
                  💬 {expandedEnc.has(p.id) ? 'Hide encouragements' : 'View encouragements'}
                </button>
                {expandedEnc.has(p.id) && (
                  <div style={{ marginTop: 10 }}>
                    {(encMap[p.id] ?? []).length === 0 ? (
                      <div style={{ fontSize: 12, color: 'rgba(253,248,240,0.28)', fontStyle: 'italic' }}>
                        No encouragements yet.
                      </div>
                    ) : (
                      (encMap[p.id] ?? []).map(enc => (
                        <div key={enc.id} style={{
                          padding: '8px 12px', marginBottom: 6,
                          background: 'rgba(255,255,255,0.05)', borderRadius: 10,
                        }}>
                          <div style={{ fontFamily: T.serif, fontSize: 13, color: 'rgba(253,248,240,0.82)', lineHeight: 1.5 }}>
                            "{enc.body}"
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(253,248,240,0.32)', marginTop: 3 }}>
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
              background: T.ink, border: '1px solid rgba(196,129,58,0.3)', borderRadius: 20,
              padding: '28px 24px', width: '100%', maxWidth: 420, marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <StarburstCheck size={30} animate />
                <div style={{ fontFamily: T.display, fontSize: 19, color: T.cream, fontWeight: 600, letterSpacing: '-0.012em' }}>
                  Prayer Answered!
                </div>
              </div>
              <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 13, color: 'rgba(253,248,240,0.4)', marginBottom: 18, lineHeight: 1.6 }}>
                "{praiseTarget.body}"
              </div>
              <div style={{ fontSize: 12, color: 'rgba(253,248,240,0.55)', marginBottom: 10 }}>
                Want to share what happened?{' '}
                <span style={{ color: 'rgba(253,248,240,0.3)' }}>(optional)</span>
              </div>
              <textarea
                value={praiseText}
                onChange={e => setPraiseText(e.target.value.slice(0, 200))}
                placeholder="Share your testimony…"
                rows={3} autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'none',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(196,129,58,0.2)',
                  borderRadius: 10, padding: '11px 14px', fontSize: 14, color: T.cream,
                  fontFamily: T.serif, outline: 'none', lineHeight: 1.6, marginBottom: 4,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = T.gold)}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(196,129,58,0.2)')}
              />
              <div style={{ fontSize: 10, color: 'rgba(253,248,240,0.28)', textAlign: 'right', marginBottom: 16 }}>
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
                  background: 'none', border: 'none', color: 'rgba(253,248,240,0.35)', fontSize: 13, cursor: 'pointer',
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

// ── Community Prayers ─────────────────────────────────────────────────────────
function CommunityPrayers({ session, profile }) {
  const [prayers,      setPrayers]      = useState([]);
  const [prayedFor,    setPrayedFor]    = useState(new Set());
  const [encouraging,  setEncouraging]  = useState(null);
  const [note,         setNote]         = useState('');
  const [text,         setText]         = useState('');
  const [anon,         setAnon]         = useState(false);
  const [audience,     setAudience]     = useState('public');
  const [audienceOpen, setAudienceOpen] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);

  const PRAYER_AUDIENCE = [
    { value: 'public',  icon: '🌐', label: 'Everyone' },
    { value: 'friends', icon: '👥', label: 'Friends only' },
    { value: 'private', icon: '🔒', label: 'Only me' },
  ];
  const audiencePick = PRAYER_AUDIENCE.find(o => o.value === audience);

  useEffect(() => {
    // Merge community prayers + public personal prayers into one feed
    Promise.all([
      supabase.from('prayers')
        .select('*, profiles(display_name, avatar_config)')
        .eq('is_public', true).is('group_id', null)
        .order('created_at', { ascending: false }).limit(30),
      supabase.from('personal_prayers')
        .select('*, profiles(display_name, avatar_config)')
        .eq('is_public', true)
        .order('created_at', { ascending: false }).limit(30),
    ]).then(([{ data: cp }, { data: pp }]) => {
      const items = [
        ...(cp ?? []).map(p => ({ ...p, _src: 'prayers',          _ownerId: p.author_id })),
        ...(pp ?? []).map(p => ({ ...p, _src: 'personal_prayers', _ownerId: p.user_id   })),
      ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 50);
      setPrayers(items);
    });

    if (session) {
      Promise.all([
        supabase.from('prayer_responses').select('prayer_id').eq('author_id', session.user.id),
        supabase.from('personal_prayer_support').select('prayer_id').eq('user_id', session.user.id),
      ]).then(([{ data: cr }, { data: ps }]) => {
        setPrayedFor(new Set([
          ...(cr ?? []).map(r => r.prayer_id),
          ...(ps ?? []).map(r => r.prayer_id),
        ]));
      });
    }
  }, [session]);

  async function post(e) {
    e.preventDefault();
    if (!text.trim() || !session) return;
    setSubmitting(true);
    const { data } = await supabase.from('prayers').insert({
      author_id: session.user.id, body: text.trim(),
      is_public: audience === 'public', is_anonymous: anon,
      audience, group_id: null,
    }).select('*, profiles(display_name, avatar_config)').single();
    setText(''); setSubmitting(false);
    if (data) setPrayers(prev => [{ ...data, _src: 'prayers', _ownerId: data.author_id }, ...prev]);
  }

  async function pray(p) {
    if (!session || prayedFor.has(p.id)) return;
    const count = (p.prayer_count ?? 0) + 1;
    if (p._src === 'personal_prayers') {
      await supabase.from('personal_prayer_support').insert({ prayer_id: p.id, user_id: session.user.id });
      await supabase.from('personal_prayers').update({ prayer_count: count }).eq('id', p.id);
    } else {
      await supabase.from('prayer_responses').insert({ prayer_id: p.id, author_id: session.user.id });
      await supabase.from('prayers').update({ prayer_count: count }).eq('id', p.id);
    }
    setPrayedFor(prev => new Set([...prev, p.id]));
    setPrayers(prev => prev.map(x => x.id === p.id && x._src === p._src ? { ...x, prayer_count: count } : x));
  }

  async function sendEncouragement() {
    if (!note.trim() || !session) return;
    const body = note.trim().slice(0, 120);
    if (encouraging._src === 'personal_prayers') {
      await supabase.from('personal_prayer_encouragements').insert({
        prayer_id: encouraging.id, user_id: session.user.id, body,
      });
    } else {
      await supabase.from('prayer_responses').insert({
        prayer_id: encouraging.id, author_id: session.user.id, note: body,
      });
    }
    setNote(''); setEncouraging(null);
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px', background: '#2A1A0E' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>

        {/* Post form */}
        {session && (
          <form onSubmit={post} style={{ marginBottom: 24 }}>
            <textarea
              value={text} onChange={e => setText(e.target.value)}
              placeholder="Share a prayer request with the community…" rows={3}
              style={{
                width: '100%', boxSizing: 'border-box', resize: 'none',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, padding: '12px 14px', fontSize: 14, color: T.cream,
                fontFamily: T.serif, outline: 'none', lineHeight: 1.6,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = T.gold)}
              onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'rgba(253,248,240,0.6)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} style={{ accentColor: T.gold }}/>
                  Anonymous
                </label>
                <div style={{ position: 'relative' }}>
                  <button type="button" onClick={() => setAudienceOpen(v => !v)} style={{
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(196,129,58,0.25)',
                    borderRadius: 999, padding: '4px 10px', fontSize: 12,
                    color: 'rgba(253,248,240,0.6)', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                  }}>
                    {audiencePick.icon} {audiencePick.label} ▾
                  </button>
                  {audienceOpen && (
                    <div style={{
                      position: 'absolute', bottom: '110%', left: 0, zIndex: 10,
                      background: T.ink, border: '1px solid rgba(196,129,58,0.3)',
                      borderRadius: 12, overflow: 'hidden', minWidth: 170,
                      boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
                    }}>
                      {PRAYER_AUDIENCE.map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => { setAudience(opt.value); setAudienceOpen(false); }}
                          style={{
                            width: '100%', textAlign: 'left', background: audience === opt.value ? 'rgba(196,129,58,0.1)' : 'transparent',
                            border: 'none', borderBottom: '1px solid rgba(196,129,58,0.1)',
                            padding: '10px 14px', fontSize: 13, color: T.cream, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 8,
                          }}>
                          <span>{opt.icon}</span><span>{opt.label}</span>
                          {audience === opt.value && <span style={{ marginLeft: 'auto', color: T.gold }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button type="submit" disabled={submitting || !text.trim()} style={{
                background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                padding: '9px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                opacity: submitting || !text.trim() ? 0.5 : 1,
              }}>
                Post
              </button>
            </div>
          </form>
        )}

        {prayers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: T.serif, fontSize: 18, color: 'rgba(253,248,240,0.55)' }}>
            No community prayers yet. Be the first to share.
          </div>
        )}

        {prayers.map(p => {
          const hasPrayed = prayedFor.has(p.id);
          const isOwn     = session?.user.id === p._ownerId;
          const name      = p.is_anonymous ? 'Anonymous' : (p.profiles?.display_name ?? 'Anonymous');
          return (
            <div key={`${p._src}-${p.id}`} style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: '18px 20px', marginBottom: 12,
            }}>
              {/* Author */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                {!p.is_anonymous
                  ? <Avatar name={p.profiles?.display_name} avatarConfig={p.profiles?.avatar_config} size={30}/>
                  : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(196,129,58,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🕯️</div>
                }
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.cream }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(253,248,240,0.48)' }}>{timeAgo(p.created_at)}</div>
                </div>
              </div>

              {/* Praise report (if answered personal prayer with a testimony) */}
              {p.is_answered && p.praise_report && (
                <div style={{
                  background: 'rgba(196,129,58,0.12)', borderRadius: 10,
                  padding: '10px 14px', marginBottom: 12,
                  borderLeft: `3px solid ${T.gold}`,
                }}>
                  <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.gold, fontWeight: 700, marginBottom: 4 }}>
                    Praise Report ✦
                  </div>
                  <div style={{ fontFamily: T.serif, fontStyle: 'italic', fontSize: 14, color: 'rgba(253,248,240,0.85)', lineHeight: 1.6 }}>
                    "{p.praise_report}"
                  </div>
                </div>
              )}

              {/* Body */}
              <div style={{ fontFamily: T.serif, fontSize: 15, color: 'rgba(253,248,240,0.88)', lineHeight: 1.7, marginBottom: 14 }}>
                {p.body}
              </div>

              {/* Actions */}
              {session && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {!isOwn && (
                    <>
                      <button onClick={() => pray(p)} style={{
                        background: hasPrayed ? 'rgba(196,129,58,0.15)' : 'transparent',
                        border: `1px solid ${hasPrayed ? T.gold : 'rgba(255,255,255,0.18)'}`,
                        borderRadius: 999, padding: '6px 14px', fontSize: 12,
                        color: hasPrayed ? T.gold : 'rgba(253,248,240,0.68)',
                        cursor: hasPrayed ? 'default' : 'pointer',
                      }}>
                        🙏 {hasPrayed ? 'Prayed' : 'Pray for this'}{(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}` : ''}
                      </button>
                      <button onClick={() => { setEncouraging(p); setNote(''); }} style={{
                        background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 999, padding: '6px 14px', fontSize: 12,
                        color: 'rgba(253,248,240,0.62)', cursor: 'pointer',
                      }}>
                        Send encouragement
                      </button>
                    </>
                  )}
                  {isOwn && (p.prayer_count ?? 0) > 0 && (
                    <span style={{ fontSize: 12, color: 'rgba(253,248,240,0.4)' }}>
                      🙏 {p.prayer_count} praying
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Encouragement sheet */}
        {encouraging && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(44,24,16,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 20 }}
            onClick={() => setEncouraging(null)}
          >
            <div onClick={e => e.stopPropagation()} style={{
              background: T.ink, border: '1px solid rgba(196,129,58,0.3)', borderRadius: 20,
              padding: '24px', width: '100%', maxWidth: 420, marginBottom: 20,
            }}>
              <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.4)', marginBottom: 14, fontFamily: T.serif, fontStyle: 'italic' }}>
                "{encouraging.body}"
              </div>
              <textarea
                value={note} onChange={e => setNote(e.target.value.slice(0, 120))}
                placeholder="A short word of encouragement…"
                rows={3} autoFocus
                style={{
                  width: '100%', boxSizing: 'border-box', resize: 'none',
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(196,129,58,0.2)',
                  borderRadius: 10, padding: '11px 14px', fontSize: 14, color: T.cream,
                  fontFamily: T.serif, outline: 'none', lineHeight: 1.6, marginBottom: 4,
                }}
                onFocus={e => (e.currentTarget.style.borderColor = T.gold)}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(196,129,58,0.2)')}
              />
              <div style={{ fontSize: 10, color: 'rgba(253,248,240,0.28)', textAlign: 'right', marginBottom: 14 }}>
                {note.length}/120
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={sendEncouragement} disabled={!note.trim()} style={{
                  background: T.gold, color: T.cream, border: 'none', borderRadius: 999,
                  padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  opacity: !note.trim() ? 0.5 : 1,
                }}>
                  Send
                </button>
                <button onClick={() => setEncouraging(null)} style={{
                  background: 'none', border: 'none', color: 'rgba(253,248,240,0.35)', fontSize: 13, cursor: 'pointer',
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
function GroupPrayers({ session, userGroup }) {
  const [prayers,    setPrayers]    = useState([]);
  const [prayedFor,  setPrayedFor]  = useState(new Set());
  const [text,       setText]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!userGroup) return;
    supabase.from('prayers')
      .select('*, profiles(display_name, avatar_config)')
      .eq('group_id', userGroup.group.id)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setPrayers(data ?? []));
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
    }).select('*, profiles(display_name, avatar_config)').single();
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

  if (!userGroup) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: T.serif, fontSize: 18, color: 'rgba(253,248,240,0.45)', marginBottom: 8 }}>You're not in a group yet.</div>
        <div style={{ fontSize: 13, color: 'rgba(253,248,240,0.28)' }}>Join or create a group to see group prayers.</div>
      </div>
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 80px', background: '#2A1A0E' }}>
      <div style={{ maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: 12, color: 'rgba(253,248,240,0.55)', marginBottom: 20 }}>
          ⛪ {userGroup.group.name} · visible to group members only
        </div>
        <form onSubmit={post} style={{ marginBottom: 24 }}>
          <textarea
            value={text} onChange={e => setText(e.target.value)}
            placeholder={`Share a prayer with ${userGroup.group.name}…`} rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'none',
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: '12px 14px', fontSize: 14, color: T.cream,
              fontFamily: T.serif, outline: 'none', lineHeight: 1.6,
            }}
            onFocus={e => (e.currentTarget.style.borderColor = T.gold)}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
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
          <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: T.serif, fontSize: 16, color: 'rgba(253,248,240,0.55)' }}>
            No group prayers yet. Be the first to share.
          </div>
        )}
        {prayers.map(p => {
          const hasPrayed = prayedFor.has(p.id);
          const name = p.is_anonymous ? 'Anonymous' : (p.profiles?.display_name ?? 'Anonymous');
          return (
            <div key={p.id} style={{
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: '18px 20px', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                <Avatar name={p.profiles?.display_name} avatarConfig={p.profiles?.avatar_config} size={30}/>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: T.cream }}>{name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(253,248,240,0.48)' }}>{timeAgo(p.created_at)}</div>
                </div>
              </div>
              <div style={{ fontFamily: T.serif, fontSize: 15, color: 'rgba(253,248,240,0.88)', lineHeight: 1.7, marginBottom: 14 }}>
                {p.body}
              </div>
              <button onClick={() => pray(p.id)} style={{
                background: hasPrayed ? 'rgba(196,129,58,0.15)' : 'transparent',
                border: `1px solid ${hasPrayed ? T.gold : 'rgba(255,255,255,0.18)'}`,
                borderRadius: 999, padding: '6px 14px', fontSize: 12,
                color: hasPrayed ? T.gold : 'rgba(253,248,240,0.68)',
                cursor: hasPrayed ? 'default' : 'pointer',
              }}>
                🙏 {hasPrayed ? 'Prayed' : 'Pray for this'}{(p.prayer_count ?? 0) > 0 ? ` · ${p.prayer_count}` : ''}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Prayer({ session, profile, onClose, userGroup, hideHeader }) {
  const tabs = ['My prayers', 'Community', ...(userGroup ? ['Group'] : [])];
  const [tab, setTab] = useState('My prayers');

  return (
    <div style={{ minHeight: '100vh', background: '#0E0906', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${T.gold}, transparent)` }}/>

      {!hideHeader && (
        <header style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(196,129,58,0.15)' }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(253,248,240,0.45)', fontSize: 13, cursor: 'pointer', padding: 0 }}>
            ← Back
          </button>
          <div style={{ fontFamily: T.display, fontSize: 21, fontWeight: 600, color: T.cream, flex: 1, letterSpacing: '-0.012em' }}>Prayer</div>
          {profile && <Avatar name={profile.display_name} avatarConfig={profile.avatar_config} size={28}/>}
        </header>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid rgba(196,129,58,0.12)', background: 'rgba(255,255,255,0.02)' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '13px 8px', background: 'none', border: 'none',
            borderBottom: tab === t ? `2px solid ${T.gold}` : '2px solid transparent',
            color: tab === t ? T.cream : 'rgba(253,248,240,0.38)',
            fontSize: 12, fontWeight: tab === t ? 600 : 400, cursor: 'pointer', marginBottom: -1,
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'My prayers'  && <MyPrayers        session={session} userGroup={userGroup}/>}
      {tab === 'Community'   && <CommunityPrayers session={session} profile={profile}/>}
      {tab === 'Group'       && <GroupPrayers      session={session} userGroup={userGroup}/>}
    </div>
  );
}
