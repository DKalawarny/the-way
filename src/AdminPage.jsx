import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import SponsoredCard from './SponsoredCard.jsx';
import { ArrowLeft, Plus, Pencil, Trash2, X, RefreshCw } from 'lucide-react';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

// ── Mini chart: vertical bar chart ───────────────────────────────────────────
function BarChart({ data = [], color = T.gold, labelKey = 'week' }) {
  if (!data.length) return <EmptyNote>No data yet — will populate as the platform grows.</EmptyNote>;
  const max = Math.max(...data.map((d) => Number(d.count ?? 0)), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, padding: '0 2px' }}>
      {data.map((d, i) => {
        const h = Math.max((Number(d.count ?? 0) / max) * 64, Number(d.count) > 0 ? 2 : 0);
        return (
          <div key={i} title={`${d[labelKey] ?? ''}: ${Number(d.count ?? 0).toLocaleString()}`}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
            <div style={{ width: '100%', background: color, borderRadius: '3px 3px 0 0', height: h }} />
          </div>
        );
      })}
    </div>
  );
}

// ── Horizontal bar (topics, model dist, etc.) ─────────────────────────────────
function HorizBar({ label, count, pct, color = T.gold }) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
        <span style={{ fontWeight: 600, color: T.ink }}>{label}</span>
        <span style={{ color: T.inkMuted }}>{Number(count ?? 0).toLocaleString()} · {pct ?? 0}%</span>
      </div>
      <div style={{ background: T.parchment, borderRadius: 999, height: 7, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct ?? 0, 100)}%`, height: '100%', background: color, borderRadius: 999, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ── Big stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, weekDelta, color }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: color ?? T.ink, fontFamily: T.display, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value != null ? (typeof value === 'string' ? value : Number(value).toLocaleString()) : '—'}
      </div>
      <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 5 }}>{label}</div>
      {weekDelta != null && Number(weekDelta) > 0 && (
        <div style={{ fontSize: 12, color: T.success, marginTop: 4 }}>↑ {Number(weekDelta).toLocaleString()} this week</div>
      )}
    </div>
  );
}

// ── Small ratio card ──────────────────────────────────────────────────────────
function RatioCard({ label, value, note }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.ink, fontFamily: T.display, letterSpacing: '-0.02em' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>{label}</div>
      {note && <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{note}</div>}
    </div>
  );
}

// ── Layout helpers ────────────────────────────────────────────────────────────
function SectionTitle({ children, style }) {
  return (
    <div style={{ fontSize: 11, letterSpacing: '0.10em', textTransform: 'uppercase', color: T.goldDark, fontWeight: 700, marginBottom: 14, ...style }}>
      {children}
    </div>
  );
}

function Card({ label, children }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 12, color: T.inkMuted, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      {children}
    </div>
  );
}

function EmptyNote({ children }) {
  return (
    <div style={{ color: T.inkMuted, fontStyle: 'italic', fontSize: 14, padding: '16px 0', fontFamily: T.serif }}>{children}</div>
  );
}

// ── Label maps ────────────────────────────────────────────────────────────────
const TOPIC_LABELS = {
  prayer: 'Prayer', salvation: 'Salvation', jesus: 'Jesus Christ',
  bible: 'Bible', church: 'Church', 'faith-doubt': 'Faith & Doubt',
  grace: 'Grace', relationships: 'Relationships', 'eternal-life': 'Eternal Life',
  'holy-spirit': 'Holy Spirit', suffering: 'Suffering & Evil', creation: 'Creation',
  'end-times': 'End Times', 'mental-health': 'Mental Health', purpose: 'Purpose',
  money: 'Money & Giving', sacraments: 'Sacraments', scripture: 'Scripture',
};

const MODEL_LABELS = {
  'claude-opus-4-7': 'Opus (premium+)',
  'claude-sonnet-4-6': 'Sonnet (premium)',
  'claude-haiku-4-5-20251001': 'Haiku (free)',
  'claude-haiku-4-5': 'Haiku (free)',
  cache: 'Answered from cache',
};

const PERSON_LABELS = {
  believer: 'Believer', skeptic: 'Skeptic', seeker: 'Seeker',
  'new-faith': 'New to faith', deeper: 'Going deeper', guided: 'Guided journey',
  kids: 'For kids', relationships: 'Relationships', 'inter-faith': 'Inter-faith',
};

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'ai',         label: 'AI & Topics' },
  { id: 'geo',        label: 'Geography' },
  { id: 'churches',   label: 'Churches' },
  { id: 'content',    label: 'Content' },
  { id: 'operations', label: 'Operations' },
  { id: 'sponsors',   label: 'Sponsors' },
];

// ── Sponsor form defaults ─────────────────────────────────────────────────────
const EMPTY_FORM = {
  sponsor_name: '', title: '', body: '', cta_text: '', cta_url: '',
  emoji: '✦', is_active: false, sort_order: 0,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPage({ onBack }) {
  const [tab, setTab] = useState('overview');
  const [verifyBusy, setVerifyBusy] = useState(null); // church id being toggled
  const [approveBusy, setApproveBusy] = useState(null); // app id being actioned

  // Dashboard data
  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  // Sponsors
  const [sponsors, setSponsors] = useState([]);
  const [sponsorsLoading, setSponsorsLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sponsorError, setSponsorError] = useState(null);

  // ── Fetch dashboard ─────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const r = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (r.status === 403) throw new Error('Admin access required');
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      setDash(await r.json());
    } catch (e) {
      setDashError(e.message ?? 'Load failed');
    } finally {
      setDashLoading(false);
    }
  }, []);

  // Fetch dashboard once on mount; fetch sponsors when that tab opens
  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { if (tab === 'sponsors') loadSponsors(); }, [tab]);

  // ── Sponsors CRUD ───────────────────────────────────────────────────────
  async function toggleChurchVerify(churchId, currentStatus) {
    setVerifyBusy(churchId);
    const newStatus = currentStatus === 'verified' ? 'self_reported' : 'verified';
    const { error } = await supabase.from('churches').update({ verification_status: newStatus }).eq('id', churchId);
    if (!error) {
      setDash((prev) => ({
        ...prev,
        topChurches: prev.topChurches.map((c) =>
          c.id === churchId ? { ...c, status: newStatus } : c
        ),
      }));
    }
    setVerifyBusy(null);
  }

  async function handlePastorApp(appId, approve) {
    setApproveBusy(appId);
    const { error } = await supabase
      .from('pastor_applications')
      .update({ status: approve ? 'approved' : 'declined', reviewed_at: new Date().toISOString() })
      .eq('id', appId);
    if (!error) {
      setDash((prev) => ({
        ...prev,
        pendingApps: prev.pendingApps.filter((a) => a.id !== appId),
      }));
    }
    setApproveBusy(null);
  }

  async function loadSponsors() {
    setSponsorsLoading(true);
    const { data } = await supabase.from('sponsored_posts').select('*')
      .order('sort_order', { ascending: true }).order('created_at', { ascending: false });
    setSponsors(data ?? []);
    setSponsorsLoading(false);
  }

  async function toggleActive(id, current) {
    await supabase.from('sponsored_posts').update({ is_active: !current }).eq('id', id);
    setSponsors((s) => s.map((x) => x.id === id ? { ...x, is_active: !current } : x));
  }

  async function deleteSponsor(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await supabase.from('sponsored_posts').delete().eq('id', id);
    setSponsors((s) => s.filter((x) => x.id !== id));
  }

  async function saveSponsor() {
    if (!form.sponsor_name.trim()) return;
    setSaving(true); setSponsorError(null);
    try {
      if (editingId) {
        const { error: err } = await supabase.from('sponsored_posts').update(form).eq('id', editingId);
        if (err) throw err;
        setSponsors((s) => s.map((x) => x.id === editingId ? { ...x, ...form } : x));
      } else {
        const { data, error: err } = await supabase.from('sponsored_posts').insert(form).select().single();
        if (err) throw err;
        if (data) setSponsors((s) => [...s, data]);
      }
      closeForm();
    } catch (e) { setSponsorError(e.message ?? 'Something went wrong.'); }
    finally { setSaving(false); }
  }

  function openNew() { setForm(EMPTY_FORM); setEditingId(null); setSponsorError(null); setFormOpen(true); }
  function openEdit(s) {
    setForm({ sponsor_name: s.sponsor_name ?? '', title: s.title ?? '', body: s.body ?? '', cta_text: s.cta_text ?? '', cta_url: s.cta_url ?? '', emoji: s.emoji ?? '✦', is_active: s.is_active ?? false, sort_order: s.sort_order ?? 0 });
    setEditingId(s.id); setSponsorError(null); setFormOpen(true);
  }
  function closeForm() { setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM); setSponsorError(null); }

  // ── Derived data ────────────────────────────────────────────────────────
  const s = dash?.stats ?? {};

  const topics = (dash?.topics ?? []).map((t) => ({ ...t, count: Number(t.count ?? 0) }));
  const topicTotal = topics.reduce((sum, t) => sum + t.count, 0);
  const topicsWithPct = topics.map((t) => ({ ...t, pct: topicTotal > 0 ? Math.round((t.count / topicTotal) * 100) : 0 }));

  const modelDist = (s.model_dist ?? []).map((m) => ({ ...m, count: Number(m.count ?? 0) }));
  const modelTotal = modelDist.reduce((sum, m) => sum + m.count, 0);

  const personTypeDist = (s.person_type_dist ?? []).map((p) => ({ ...p, count: Number(p.count ?? 0) }));
  const personTotal = personTypeDist.reduce((sum, p) => sum + p.count, 0);

  const countryDist = (s.country_dist ?? []).map((c) => ({ ...c, count: Number(c.count ?? 0) }));
  const countryTotal = countryDist.reduce((sum, c) => sum + c.count, 0);

  const topChurches = s.top_churches ?? [];
  const userSignupsWeekly = s.user_signups_weekly ?? [];
  const aiEventsWeekly = s.ai_events_weekly ?? [];

  const cacheHitRate = Number(s.total_ai_events) > 0
    ? Math.round((Number(s.cache_hits) / Number(s.total_ai_events)) * 100) : 0;

  const avgPostsPerUser = Number(s.total_users) > 0
    ? (Number(s.total_posts) / Number(s.total_users)).toFixed(1) : '—';

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: T.cream, fontFamily: T.sans, paddingBottom: 80 }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: T.white, borderBottom: `1px solid ${T.line}`, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft, padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1, fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <KinwoveStar size={16} style={{ flexShrink: 0 }} /> kinwove — Platform Admin
        </div>
        {tab !== 'sponsors' && (
          <button onClick={fetchDashboard} disabled={dashLoading} title="Refresh data"
            style={{ background: 'none', border: 'none', cursor: dashLoading ? 'default' : 'pointer', color: T.inkSoft, padding: 4, display: 'flex', opacity: dashLoading ? 0.4 : 1 }}>
            <RefreshCw size={16} style={{ animation: dashLoading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, background: T.white, paddingLeft: 4, overflowX: 'auto' }}>
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '12px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap',
            color: tab === id ? T.goldDark : T.inkSoft,
            borderBottom: tab === id ? `2px solid ${T.goldDark}` : '2px solid transparent',
            marginBottom: -1,
          }}>
            {label}
            {id === 'operations' && (dash?.pendingApps?.length > 0 || dash?.recentFeedback?.length > 0) && (
              <span style={{ marginLeft: 5, background: T.gold, color: '#fff', borderRadius: 999, fontSize: 10, padding: '1px 5px', fontWeight: 700 }}>
                {(dash.pendingApps?.length ?? 0) + (dash.recentFeedback?.length ?? 0)}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 820, margin: '0 auto' }}>

        {/* ── Loading / error ──────────────────────────────────────────────── */}
        {tab !== 'sponsors' && dashLoading && (
          <div style={{ color: T.inkMuted, textAlign: 'center', padding: 60, fontFamily: T.serif, fontStyle: 'italic' }}>Loading platform data…</div>
        )}
        {tab !== 'sponsors' && !dashLoading && dashError && (
          <div style={{ background: 'rgba(165,63,43,0.08)', border: `1px solid rgba(165,63,43,0.2)`, borderRadius: 12, padding: '16px 20px', color: T.error, fontSize: 14 }}>
            {dashError}
            <button onClick={fetchDashboard} style={{ marginLeft: 12, background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              Retry
            </button>
          </div>
        )}

        {/* ── OVERVIEW ────────────────────────────────────────────────────── */}
        {tab === 'overview' && !dashLoading && !dashError && dash && (
          <div>
            <SectionTitle>Platform overview</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
              <StatCard label="Total users" value={s.total_users} weekDelta={s.new_users_week} />
              <StatCard label="Verified churches" value={s.verified_churches} color={T.goldDark} />
              <StatCard label="Pending applications" value={s.pending_apps} color={Number(s.pending_apps) > 0 ? '#E8731A' : T.ink} />
              <StatCard label="AI conversations" value={s.first_turn_events} />
              <StatCard label="Community posts" value={s.total_posts} />
              <StatCard label="Prayers" value={s.total_prayers} />
              <StatCard label="Shared conversations" value={s.total_shared} />
              <StatCard label="Cache hit rate" value={`${cacheHitRate}%`} />
            </div>

            <SectionTitle style={{ marginTop: 8 }}>Growth (last 10 weeks)</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 32 }}>
              <Card label="New users / week">
                <BarChart data={userSignupsWeekly} color={T.gold} labelKey="week" />
                {userSignupsWeekly.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: T.inkMuted }}>
                    <span>{userSignupsWeekly[0]?.week?.slice(0, 7) ?? ''}</span>
                    <span>{userSignupsWeekly[userSignupsWeekly.length - 1]?.week?.slice(0, 7) ?? ''}</span>
                  </div>
                )}
              </Card>
              <Card label="AI conversations / week">
                <BarChart data={aiEventsWeekly} color="#8E5528" labelKey="week" />
                {aiEventsWeekly.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: T.inkMuted }}>
                    <span>{aiEventsWeekly[0]?.week?.slice(0, 7) ?? ''}</span>
                    <span>{aiEventsWeekly[aiEventsWeekly.length - 1]?.week?.slice(0, 7) ?? ''}</span>
                  </div>
                )}
              </Card>
            </div>

            <SectionTitle>Key ratios</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              <RatioCard label="Cache hit rate" value={`${cacheHitRate}%`} note="answers served from cache" />
              <RatioCard label="New users (30d)" value={Number(s.new_users_month ?? 0).toLocaleString()} note="joined last 30 days" />
              <RatioCard label="Avg posts/user" value={avgPostsPerUser} note="across all members" />
              <RatioCard label="Total churches" value={Number(s.total_churches ?? 0).toLocaleString()} note={`${s.verified_churches ?? 0} verified`} />
            </div>
          </div>
        )}

        {/* ── AI & TOPICS ─────────────────────────────────────────────────── */}
        {tab === 'ai' && !dashLoading && !dashError && dash && (
          <div>
            <SectionTitle>What people are asking about</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>
              Keyword-classified from first questions. No question content stored — just category counts.
            </div>
            {topicsWithPct.length === 0
              ? <EmptyNote>No topic data yet — starts filling as conversations happen.</EmptyNote>
              : topicsWithPct.map((t) => (
                  <HorizBar key={t.topic_slug} label={TOPIC_LABELS[t.topic_slug] ?? t.topic_slug}
                    count={t.count} pct={t.pct} color={T.gold} />
                ))
            }

            <div style={{ height: 32 }} />
            <SectionTitle>AI model usage</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>Which Claude model answered each conversation — indicates plan mix.</div>
            {modelDist.length === 0
              ? <EmptyNote>No model data yet.</EmptyNote>
              : modelDist.map((m) => {
                  const pct = modelTotal > 0 ? Math.round((m.count / modelTotal) * 100) : 0;
                  return <HorizBar key={m.model} label={MODEL_LABELS[m.model] ?? m.model} count={m.count} pct={pct} color="#8E5528" />;
                })
            }

            <div style={{ height: 32 }} />
            <SectionTitle>Person types</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>How users describe themselves when they start a conversation.</div>
            {personTypeDist.length === 0
              ? <EmptyNote>No person type data yet.</EmptyNote>
              : personTypeDist.map((p) => {
                  const pct = personTotal > 0 ? Math.round((p.count / personTotal) * 100) : 0;
                  return <HorizBar key={p.type} label={PERSON_LABELS[p.type] ?? p.type} count={p.count} pct={pct} color="#6B5344" />;
                })
            }
          </div>
        )}

        {/* ── GEOGRAPHY ───────────────────────────────────────────────────── */}
        {tab === 'geo' && !dashLoading && !dashError && dash && (
          <div>
            <SectionTitle>Countries</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>
              Based on verified church registrations. Shows where your churches — and therefore your congregation users — are located.
              Anonymous users without a church affiliation aren't included here.
            </div>
            {countryDist.length === 0
              ? (
                <div style={{ background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14, padding: '28px 20px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic' }}>
                  No church location data yet. As churches are verified, countries will appear here.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 24 }}>
                    {countryDist.map((c) => {
                      const pct = countryTotal > 0 ? Math.round((c.count / countryTotal) * 100) : 0;
                      return <HorizBar key={c.country} label={c.country} count={c.count} pct={pct} color={T.gold} />;
                    })}
                  </div>

                  {/* Country bar chart */}
                  <Card label={`Top ${Math.min(countryDist.length, 10)} countries`}>
                    <BarChart data={countryDist.slice(0, 10)} color={T.gold} labelKey="country" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: T.inkMuted }}>
                      <span>{countryDist[0]?.country ?? ''}</span>
                      <span>{countryDist[Math.min(9, countryDist.length - 1)]?.country ?? ''}</span>
                    </div>
                  </Card>
                </>
              )
            }
          </div>
        )}

        {/* ── CHURCHES ────────────────────────────────────────────────────── */}
        {tab === 'churches' && !dashLoading && !dashError && dash && (
          <div>
            <SectionTitle>Top churches by member count</SectionTitle>
            {topChurches.length === 0
              ? <EmptyNote>No church data yet.</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                  {topChurches.map((c) => (
                    <div key={c.id} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{c.name}</div>
                        {c.city && <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2 }}>{c.city}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: T.goldDark }}>
                          {Number(c.member_count ?? 0).toLocaleString()} members
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          color: c.status === 'verified' ? T.success : T.inkMuted,
                          background: c.status === 'verified' ? T.successBg : T.parchment,
                          borderRadius: 999, padding: '2px 8px',
                          border: `1px solid ${c.status === 'verified' ? 'rgba(46,122,72,0.25)' : T.line}`,
                        }}>
                          {c.status ?? 'pending'}
                        </span>
                        <button
                          onClick={() => toggleChurchVerify(c.id, c.status)}
                          disabled={verifyBusy === c.id}
                          style={{
                            fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '3px 10px', cursor: 'pointer',
                            border: 'none',
                            background: c.status === 'verified' ? 'rgba(180,60,60,0.08)' : 'rgba(46,122,72,0.10)',
                            color: c.status === 'verified' ? '#b43c3c' : T.success,
                            opacity: verifyBusy === c.id ? 0.5 : 1,
                          }}
                        >
                          {verifyBusy === c.id ? '…' : c.status === 'verified' ? 'Unverify' : 'Verify ✓'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }

            <SectionTitle>Pending pastor applications</SectionTitle>
            {dash.pendingApps.length === 0
              ? <EmptyNote>No pending applications — all clear ✓</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {dash.pendingApps.map((a) => (
                    <div key={a.id} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: T.ink, marginBottom: 3 }}>{a.church_name}</div>
                      <div style={{ fontSize: 13, color: T.inkSoft, marginBottom: a.reason ? 8 : 0 }}>
                        {a.full_name}
                        {a.denomination && ` · ${a.denomination}`}
                        {(a.city || a.country) && ` · ${[a.city, a.country].filter(Boolean).join(', ')}`}
                      </div>
                      {a.reason && (
                        <div style={{ fontSize: 13, color: T.inkMuted, fontStyle: 'italic', background: T.parchment, borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
                          "{a.reason.slice(0, 240)}{a.reason.length > 240 ? '…' : ''}"
                        </div>
                      )}
                      <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 10 }}>
                        Applied {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => handlePastorApp(a.id, true)}
                          disabled={approveBusy === a.id}
                          style={{ background: T.success, color: '#fff', border: 'none', borderRadius: 999, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: approveBusy === a.id ? 0.5 : 1 }}
                        >
                          {approveBusy === a.id ? '…' : 'Approve ✓'}
                        </button>
                        <button
                          onClick={() => handlePastorApp(a.id, false)}
                          disabled={approveBusy === a.id}
                          style={{ background: 'transparent', color: '#b43c3c', border: '1px solid rgba(180,60,60,0.3)', borderRadius: 999, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: approveBusy === a.id ? 0.5 : 1 }}
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── CONTENT ─────────────────────────────────────────────────────── */}
        {tab === 'content' && !dashLoading && !dashError && dash && (
          <div>
            <SectionTitle>Most asked questions (by cache hits)</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
              Questions asked multiple times — useful for FAQ pages, social content, and marketing.
            </div>
            {dash.topQuestions.length === 0
              ? <EmptyNote>No cached questions yet — will populate as the same questions get asked repeatedly.</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                  {dash.topQuestions.map((q, i) => (
                    <div key={i} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ fontSize: 14, color: T.ink, flex: 1, lineHeight: 1.45 }}>{q.question_raw}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.goldDark, flexShrink: 0 }}>{Number(q.hit_count ?? 0).toLocaleString()}×</div>
                    </div>
                  ))}
                </div>
              )
            }

            <SectionTitle>Recently shared conversations</SectionTitle>
            {dash.recentShared.length === 0
              ? <EmptyNote>No shared conversations yet.</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dash.recentShared.map((conv) => (
                    <a key={conv.id} href={`/share/${conv.id}`} target="_blank" rel="noreferrer"
                      style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ fontSize: 14, color: T.ink, flex: 1, lineHeight: 1.4 }}>{conv.title ?? '(untitled)'}</div>
                      <div style={{ fontSize: 12, color: T.inkMuted, flexShrink: 0 }}>
                        {conv.created_at ? new Date(conv.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </div>
                    </a>
                  ))}
                </div>
              )
            }
          </div>
        )}

        {/* ── OPERATIONS ──────────────────────────────────────────────────── */}
        {tab === 'operations' && !dashLoading && !dashError && dash && (
          <div>
            <SectionTitle>AI feedback flags</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
              AI responses users flagged as inaccurate or unhelpful. Review these to catch edge cases in the prompt.
            </div>
            {dash.recentFeedback.length === 0
              ? <EmptyNote>No feedback flagged yet — great sign.</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 32 }}>
                  {dash.recentFeedback.map((f, i) => (
                    <div key={i} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '13px 16px' }}>
                      <div style={{ fontSize: 14, color: T.ink, lineHeight: 1.55, marginBottom: 6 }}>{f.message_text}</div>
                      <div style={{ fontSize: 11, color: T.inkMuted }}>
                        {f.created_at ? new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }

            {dash.pendingApps.length > 0 && (
              <>
                <SectionTitle style={{ marginTop: 8 }}>Pending pastor applications</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {dash.pendingApps.map((a) => (
                    <div key={a.id} style={{ background: T.white, border: `1px solid rgba(232,115,26,0.3)`, borderRadius: 12, padding: '13px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: T.ink, marginBottom: 2 }}>{a.church_name}</div>
                      <div style={{ fontSize: 13, color: T.inkSoft }}>
                        {a.full_name}{(a.city || a.country) && ` · ${[a.city, a.country].filter(Boolean).join(', ')}`}
                      </div>
                      <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 4 }}>
                        Applied {a.created_at ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SPONSORS ────────────────────────────────────────────────────── */}
        {tab === 'sponsors' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
              <div>
                <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink }}>Sponsored cards</div>
                <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 3, lineHeight: 1.5 }}>
                  {sponsors.filter((s) => s.is_active).length > 0
                    ? `${sponsors.filter((s) => s.is_active).length} live — shown in feed after every 10 posts (free users only).`
                    : 'No live sponsors yet — cards are hidden from the feed until you activate one.'}
                </div>
              </div>
              <button onClick={openNew} style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Plus size={14} /> Add
              </button>
            </div>

            {sponsorsLoading ? (
              <div style={{ color: T.inkMuted, textAlign: 'center', padding: 48, fontFamily: T.serif }}>Loading…</div>
            ) : sponsors.length === 0 ? (
              <div style={{ background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14, padding: '36px 20px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic' }}>
                No sponsors yet.<br />
                <span style={{ fontSize: 13 }}>Add one above once you've made a deal.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sponsors.map((sp) => (
                  <div key={sp.id} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: sp.is_active ? 1 : 0.55 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: T.parchment, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {sp.emoji ?? '✦'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{sp.sponsor_name}</div>
                      {sp.title && <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sp.title}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => toggleActive(sp.id, sp.is_active)} style={{ background: sp.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.05)', border: `1px solid ${sp.is_active ? 'rgba(34,197,94,0.35)' : T.line}`, borderRadius: 999, padding: '4px 11px', fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: sp.is_active ? '#16a34a' : T.inkMuted, cursor: 'pointer' }}>
                        {sp.is_active ? 'LIVE' : 'OFF'}
                      </button>
                      <button onClick={() => openEdit(sp)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft, padding: 5, display: 'flex', borderRadius: 6 }}>
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => deleteSponsor(sp.id, sp.sponsor_name)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.error, padding: 5, display: 'flex', borderRadius: 6 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sponsor add / edit bottom sheet ─────────────────────────────────── */}
      {formOpen && (
        <div onClick={closeForm} style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.52)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '92vh', overflowY: 'auto', background: T.cream, borderRadius: '20px 20px 0 0', padding: '24px 20px 48px', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink }}>{editingId ? 'Edit sponsor' : 'Add sponsor'}</div>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft, padding: 4, display: 'flex' }}><X size={20} /></button>
            </div>

            {[
              { key: 'sponsor_name', label: 'Sponsor name *', placeholder: 'e.g. Crossway Books' },
              { key: 'title',        label: 'Title',           placeholder: 'e.g. Deepen your study with the ESV Study Bible' },
              { key: 'body',         label: 'Body text',       placeholder: 'Short description…', multiline: true },
              { key: 'cta_text',     label: 'Button label',    placeholder: 'e.g. Shop now' },
              { key: 'cta_url',      label: 'Button URL',      placeholder: 'https://…' },
              { key: 'emoji',        label: 'Emoji / icon',    placeholder: '✦' },
            ].map(({ key, label, placeholder, multiline }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 5, letterSpacing: 0.2 }}>{label}</label>
                {multiline ? (
                  <textarea value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} rows={3}
                    style={{ width: '100%', border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, background: T.white, color: T.ink, fontFamily: T.sans, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }} />
                ) : (
                  <input type="text" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                    style={{ width: '100%', border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, background: T.white, color: T.ink, fontFamily: T.sans, boxSizing: 'border-box', outline: 'none' }} />
                )}
              </div>
            ))}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 5 }}>Sort order (lower = first)</label>
              <input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                style={{ width: 100, border: `1px solid ${T.line}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, background: T.white, color: T.ink, fontFamily: T.sans, outline: 'none' }} />
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <span style={{ fontSize: 14, color: T.ink }}>Make live immediately <span style={{ color: T.inkMuted }}>(shows in feed for free users)</span></span>
            </label>

            {(form.sponsor_name || form.title) && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>Preview</div>
                <SponsoredCard {...form} />
              </div>
            )}

            {sponsorError && (
              <div style={{ background: 'rgba(165,63,43,0.08)', border: '1px solid rgba(165,63,43,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: T.error, marginBottom: 14 }}>{sponsorError}</div>
            )}

            <button onClick={saveSponsor} disabled={!form.sponsor_name.trim() || saving} style={{ width: '100%', background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '14px 20px', fontSize: 15, fontWeight: 600, cursor: form.sponsor_name.trim() && !saving ? 'pointer' : 'not-allowed', opacity: form.sponsor_name.trim() && !saving ? 1 : 0.45, transition: 'opacity 0.15s' }}>
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add sponsor'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
