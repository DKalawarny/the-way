import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import SponsoredCard from './SponsoredCard.jsx';
import { ArrowLeft, Plus, Pencil, Trash2, X, RefreshCw } from 'lucide-react';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

// ── Bar chart with value labels ───────────────────────────────────────────────
function BarChart({ data = [], color = T.gold, labelKey = 'week' }) {
  if (!data.length) return <EmptyNote>No data yet — will populate as the platform grows.</EmptyNote>;
  const counts = data.map((d) => Number(d.count ?? 0));
  const max = Math.max(...counts, 1);
  const total = counts.reduce((s, v) => s + v, 0);
  // Y-axis: pick 4 nice round ticks
  const rawStep = max / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const step = Math.ceil(rawStep / magnitude) * magnitude || 1;
  const yMax = step * 4;
  const ticks = [step * 3, step * 2, step, 0];

  // Format x-axis label: "2026-05-12" → "May 12"
  function fmtLabel(raw) {
    if (!raw) return '';
    try {
      const d = new Date(raw + 'T00:00:00Z');
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    } catch { return raw.slice(5); }
  }

  const CHART_H = 140;
  const BAR_AREA = 100; // px available for bars (leaves room for value label above)

  return (
    <div>
      {/* Total */}
      <div style={{ fontSize: 11, color: T.inkMuted, marginBottom: 6, textAlign: 'right' }}>
        Total: <strong style={{ color: T.ink }}>{total.toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Y-axis */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 6, height: CHART_H, flexShrink: 0 }}>
          {ticks.map((t) => (
            <div key={t} style={{ fontSize: 9, color: T.inkMuted, lineHeight: 1 }}>
              {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
            </div>
          ))}
        </div>
        {/* Chart area */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Grid lines */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', pointerEvents: 'none' }}>
            {ticks.map((t) => (
              <div key={t} style={{ borderTop: `1px dashed rgba(26,17,8,0.08)`, width: '100%' }} />
            ))}
          </div>
          {/* Bars */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: CHART_H, padding: '0 2px', position: 'relative' }}>
            {data.map((d, i) => {
              const val = Number(d.count ?? 0);
              const barH = Math.max((val / yMax) * BAR_AREA, val > 0 ? 3 : 0);
              return (
                <div key={i} title={`${d[labelKey] ?? ''}: ${val.toLocaleString()}`}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  {val > 0 && (
                    <div style={{ fontSize: 9, color: color, fontWeight: 700, marginBottom: 2, lineHeight: 1 }}>
                      {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val}
                    </div>
                  )}
                  <div style={{ width: '100%', background: color, borderRadius: '3px 3px 0 0', height: barH }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {/* X-axis labels */}
      <div style={{ display: 'flex', gap: 3, paddingLeft: 28, marginTop: 5 }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, fontSize: 8.5, color: T.inkMuted, textAlign: 'center', lineHeight: 1.2, overflow: 'hidden' }}>
            {fmtLabel(d[labelKey])}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Horizontal bar ────────────────────────────────────────────────────────────
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
function StatCard({ label, value, weekDelta, color, sub }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ fontSize: 30, fontWeight: 700, color: color ?? T.ink, fontFamily: T.display, letterSpacing: '-0.02em', lineHeight: 1 }}>
        {value != null ? (typeof value === 'string' ? value : Number(value).toLocaleString()) : '—'}
      </div>
      <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 5 }}>{label}</div>
      {weekDelta != null && Number(weekDelta) > 0 && (
        <div style={{ fontSize: 12, color: '#2e7a48', marginTop: 4 }}>↑ {Number(weekDelta).toLocaleString()} this week</div>
      )}
      {sub && <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

// ── Ratio card ────────────────────────────────────────────────────────────────
function RatioCard({ label, value, note, color }) {
  return (
    <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? T.ink, fontFamily: T.display, letterSpacing: '-0.02em' }}>{value ?? '—'}</div>
      <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 4 }}>{label}</div>
      {note && <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>{note}</div>}
    </div>
  );
}

// ── Alert card ────────────────────────────────────────────────────────────────
function AlertCard({ children, level = 'warn' }) {
  const bg   = level === 'error' ? 'rgba(165,63,43,0.07)' : 'rgba(232,115,26,0.07)';
  const bdr  = level === 'error' ? 'rgba(165,63,43,0.25)' : 'rgba(232,115,26,0.3)';
  const col  = level === 'error' ? '#a53f2b' : '#c06010';
  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: col, marginBottom: 10 }}>
      {children}
    </div>
  );
}

// ── Section title ─────────────────────────────────────────────────────────────
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

// ── Insight card ─────────────────────────────────────────────────────────────
function InsightCard({ type, msg }) {
  const cfg = {
    win:  { bg: 'rgba(46,122,72,0.07)',   border: 'rgba(46,122,72,0.22)',   color: '#2e7a48', prefix: '↑ ' },
    warn: { bg: 'rgba(232,115,26,0.07)',  border: 'rgba(232,115,26,0.25)',  color: '#c06010', prefix: '⚠ ' },
    tip:  { bg: 'rgba(184,115,58,0.06)',  border: 'rgba(184,115,58,0.18)',  color: T.goldDark, prefix: '→ ' },
  }[type] ?? { bg: T.parchment, border: T.line, color: T.inkSoft, prefix: '· ' };
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: '11px 14px', marginBottom: 8, fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
      <span style={{ color: cfg.color, fontWeight: 700 }}>{cfg.prefix}</span>{msg}
    </div>
  );
}

// ── Insights engine ───────────────────────────────────────────────────────────
function getInsights(tab, s, dash) {
  const add = (type, msg) => ({ type, msg });
  const out = [];
  const n = (v) => Number(v ?? 0);

  if (tab === 'overview') {
    const act = n(s.activation_rate);
    const users = n(s.total_users);
    const dead = n(s.dead_accounts);
    const wau = n(s.weekly_active_users);
    const follows = n(s.avg_follows);
    const wauPct = users > 0 ? Math.round(wau / users * 100) : 0;

    if (act < 40 && users > 1)
      out.push(add('warn', `Only ${act}% of users have tried AI. Add a stronger onboarding prompt or push notification pointing directly to the Ask button — it's your core product.`));
    else if (act >= 80)
      out.push(add('win', `${act}% activation rate is excellent for an early platform. Shift focus to weekly retention now.`));
    else if (act >= 50)
      out.push(add('tip', `${act}% activation is solid. Try surfacing a suggested first question when new users land so they know exactly what to do.`));

    if (wauPct < 20 && users > 3)
      out.push(add('warn', `Only ${wauPct}% of users came back this week. Before spending on growth, fix retention — a leaky bucket wastes every new signup.`));
    else if (wauPct >= 50)
      out.push(add('win', `${wauPct}% weekly return rate — strong sign the core product is sticky. This is the right time to start telling people about kinwove.`));

    if (dead > 2)
      out.push(add('tip', `${dead} users signed up but never engaged. A short "here's what to ask" welcome email could re-activate a few of them at no cost.`));

    if (follows < 1.5 && users > 3)
      out.push(add('tip', `Avg ${follows} follows per user — people aren't connecting yet. A "People from your church" suggestion or a weekly email featuring active members could seed the social graph.`));

    if (n(s.total_shared) > 10)
      out.push(add('win', `${n(s.total_shared)} conversations shared publicly. Each share is a free acquisition channel — make the share button more prominent after every AI answer.`));
  }

  if (tab === 'ai') {
    const hits = n(s.cache_hits);
    const total = n(s.total_ai_events);
    const hitRate = total > 0 ? Math.round(hits / total * 100) : 0;
    const avgTurns = n(s.avg_ai_turns);
    const topics = dash?.topics ?? [];
    const topTopic = topics[0];

    if (hitRate < 15 && total > 30)
      out.push(add('tip', `Cache rate is ${hitRate}% — normal at this scale. It compounds naturally. No action needed yet.`));
    else if (hitRate >= 35)
      out.push(add('win', `${hitRate}% cache hit rate is strong — you're saving real money and answering faster. This number grows as questions repeat.`));

    if (avgTurns < 1.8 && total > 20)
      out.push(add('warn', `Avg ${avgTurns} turns per conversation — users ask one thing and leave. Try ending AI responses with a natural follow-up question to keep them in the conversation.`));
    else if (avgTurns >= 3)
      out.push(add('win', `Avg ${avgTurns} turns — users are having real back-and-forths with the AI. Screenshot a sample exchange and post it. This is your strongest demo.`));

    if (topTopic)
      out.push(add('tip', `"${topTopic.topic_slug}" is your most-asked topic (${topTopic.count} questions). Write a blog post, Twitter thread, or YouTube short answering the top question on this topic — it's what your audience actually wants.`));
  }

  if (tab === 'geo') {
    const countries = (s.country_dist ?? []);
    if (countries.length === 0)
      out.push(add('tip', `No church location data yet. Once pastors register, you'll see exactly where to focus outreach.`));
    else if (countries.length === 1)
      out.push(add('tip', `All churches are in ${countries[0]?.country}. To expand, target English-speaking Christian Facebook groups, Reddit (r/Christianity, r/Reformed, etc.), or Instagram hashtags in other countries.`));
    else
      out.push(add('tip', `You're in ${countries.length} countries already. Lean into your strongest market first — depth beats breadth at this stage.`));
  }

  if (tab === 'churches') {
    const zombies = n(s.zombie_churches);
    const total = n(s.total_churches);
    const verified = n(s.verified_churches);
    const pending = dash?.pendingApps?.length ?? 0;

    if (zombies > 0)
      out.push(add('warn', `${zombies} church${zombies > 1 ? 'es' : ''} registered with 0 members. Email those pastors directly — a single "how to invite your congregation" tip often re-activates them.`));
    if (total === 1)
      out.push(add('tip', `You have 1 church. Focus on making that pastor incredibly successful — their story becomes your best case study for recruiting the next 10.`));
    if (pending > 0)
      out.push(add('warn', `${pending} pastor application${pending > 1 ? 's' : ''} waiting. Fast approval (same day) signals to pastors that kinwove is responsive and worth their investment.`));
    if (total >= 5 && zombies === 0)
      out.push(add('win', `${total} churches with no inactive ones — healthy growth. Consider reaching out to denominations or church networks to get in front of many pastors at once.`));
  }

  if (tab === 'content') {
    const shared = n(s.total_shared);
    const topQ = dash?.topQuestions?.[0];

    if (topQ)
      out.push(add('tip', `"${topQ.question_raw?.slice(0, 80)}…" has been asked ${topQ.hit_count}× — turn this into a social post. Questions your users actually ask outperform generic content every time.`));
    if (shared > 5)
      out.push(add('win', `${shared} conversations have been shared externally. Every share link is a potential new user. Add a "Copy link" prompt more prominently after every AI response.`));
    if (shared === 0)
      out.push(add('tip', `No conversations shared yet. Make sure the share button is visible right after an AI answer — that's the moment of highest satisfaction.`));
  }

  if (tab === 'operations') {
    const reports = dash?.userReports?.length ?? 0;
    const feedback = dash?.recentFeedback?.length ?? 0;
    if (reports > 0)
      out.push(add('warn', `${reports} open user report${reports > 1 ? 's' : ''}. Respond fast — early users who get a personal reply become your most loyal advocates.`));
    if (feedback > 3)
      out.push(add('warn', `${feedback} AI responses flagged as bad. Review them and adjust the system prompt in src/prompts.js to fix recurring patterns.`));
    if (reports === 0 && feedback === 0)
      out.push(add('win', `No open reports or AI flags — all clear. Check back regularly as usage grows.`));
  }

  return out;
}

// ── Category badge ────────────────────────────────────────────────────────────
const REPORT_BADGE = {
  bug:        { label: 'Bug',          bg: 'rgba(165,63,43,0.10)', color: '#a53f2b' },
  ai:         { label: 'Wrong AI',     bg: 'rgba(232,115,26,0.10)', color: '#c06010' },
  complaint:  { label: 'Complaint',    bg: 'rgba(180,100,60,0.10)', color: '#7a4020' },
  suggestion: { label: 'Suggestion',  bg: 'rgba(46,122,72,0.10)', color: '#2e7a48' },
  other:      { label: 'Other',        bg: T.parchment, color: T.inkSoft },
};

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

const TABS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'ai',         label: 'AI & Topics' },
  { id: 'geo',        label: 'Geography' },
  { id: 'churches',   label: 'Churches' },
  { id: 'content',    label: 'Content' },
  { id: 'operations', label: 'Operations' },
  { id: 'sponsors',   label: 'Sponsors' },
];

const EMPTY_FORM = {
  sponsor_name: '', title: '', body: '', cta_text: '', cta_url: '',
  emoji: '✦', is_active: false, sort_order: 0,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function AdminPage({ onBack }) {
  const [tab, setTab] = useState('overview');
  const [verifyBusy, setVerifyBusy] = useState(null);
  const [approveBusy, setApproveBusy] = useState(null);
  const [reportBusy, setReportBusy] = useState(null);

  const [dash, setDash] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  const [sponsors, setSponsors] = useState([]);
  const [sponsorsLoading, setSponsorsLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sponsorError, setSponsorError] = useState(null);

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

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => { if (tab === 'sponsors') loadSponsors(); }, [tab]);

  // ── Church verify ───────────────────────────────────────────────────────────
  async function toggleChurchVerify(churchId, currentStatus) {
    setVerifyBusy(churchId);
    const newStatus = currentStatus === 'verified' ? 'self_reported' : 'verified';
    const { error } = await supabase.from('churches').update({ verification_status: newStatus }).eq('id', churchId);
    if (!error) {
      setDash((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          top_churches: (prev.stats?.top_churches ?? []).map((c) =>
            c.id === churchId ? { ...c, status: newStatus } : c
          ),
        },
      }));
    }
    setVerifyBusy(null);
  }

  // ── Pastor app ──────────────────────────────────────────────────────────────
  async function handlePastorApp(appId, approve) {
    setApproveBusy(appId);
    const { error } = await supabase
      .from('pastor_applications')
      .update({ status: approve ? 'approved' : 'declined', reviewed_at: new Date().toISOString() })
      .eq('id', appId);
    if (!error) setDash((prev) => ({ ...prev, pendingApps: prev.pendingApps.filter((a) => a.id !== appId) }));
    setApproveBusy(null);
  }

  // ── Reports ─────────────────────────────────────────────────────────────────
  async function handleReport(reportId, status) {
    setReportBusy(reportId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const r = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (r.ok) setDash((prev) => ({ ...prev, userReports: (prev.userReports ?? []).filter((rp) => rp.id !== reportId) }));
    } finally {
      setReportBusy(null);
    }
  }

  // ── Sponsors ────────────────────────────────────────────────────────────────
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
  function openEdit(sp) {
    setForm({ sponsor_name: sp.sponsor_name ?? '', title: sp.title ?? '', body: sp.body ?? '', cta_text: sp.cta_text ?? '', cta_url: sp.cta_url ?? '', emoji: sp.emoji ?? '✦', is_active: sp.is_active ?? false, sort_order: sp.sort_order ?? 0 });
    setEditingId(sp.id); setSponsorError(null); setFormOpen(true);
  }
  function closeForm() { setFormOpen(false); setEditingId(null); setForm(EMPTY_FORM); setSponsorError(null); }

  // ── Derived data ────────────────────────────────────────────────────────────
  const s = dash?.stats ?? {};

  const topics = (dash?.topics ?? []).map((t) => ({ ...t, count: Number(t.count ?? 0) }));
  const topicTotal = topics.reduce((sum, t) => sum + t.count, 0);
  const topicsWithPct = topics.map((t) => ({ ...t, pct: topicTotal > 0 ? Math.round((t.count / topicTotal) * 100) : 0 }));

  const modelDist = (s.model_dist ?? []).map((m) => ({ ...m, count: Number(m.count ?? 0) }));
  const modelTotal = modelDist.reduce((sum, m) => sum + m.count, 0);

  const personTypeDist = (s.person_type_dist ?? []).map((p) => ({ ...p, count: Number(p.count ?? 0) }));
  const personTotal = personTypeDist.reduce((sum, p) => sum + p.count, 0);

  const traditionDist = (s.tradition_dist ?? []).map((t) => ({ ...t, count: Number(t.count ?? 0) }));
  const traditionTotal = traditionDist.reduce((sum, t) => sum + t.count, 0);

  const countryDist = (s.country_dist ?? []).map((c) => ({ ...c, count: Number(c.count ?? 0) }));
  const countryTotal = countryDist.reduce((sum, c) => sum + c.count, 0);

  const topChurches = s.top_churches ?? [];
  const userSignupsWeekly = s.user_signups_weekly ?? [];
  const aiEventsWeekly = s.ai_events_weekly ?? [];

  const cacheHitRate = Number(s.total_ai_events) > 0
    ? Math.round((Number(s.cache_hits) / Number(s.total_ai_events)) * 100) : 0;

  const avgPostsPerUser = Number(s.total_users) > 0
    ? (Number(s.total_posts) / Number(s.total_users)).toFixed(1) : '—';

  const thumbsDownRate = Number(s.total_ai_events) > 0
    ? ((Number(s.thumbs_down_count ?? 0) / Number(s.total_ai_events)) * 100).toFixed(2) : '0';

  const hasAlerts = Number(s.dead_accounts) > 0 || Number(s.zombie_churches) > 0 || Number(s.pending_apps) > 0;
  const openReports = dash?.userReports ?? [];
  const operationsBadge = (dash?.pendingApps?.length ?? 0) + (dash?.recentFeedback?.length ?? 0) + openReports.length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: T.cream, fontFamily: T.sans, paddingBottom: 80 }}>

      {/* Header */}
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

      {/* Tabs */}
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
            {id === 'operations' && operationsBadge > 0 && (
              <span style={{ marginLeft: 5, background: T.gold, color: '#fff', borderRadius: 999, fontSize: 10, padding: '1px 5px', fontWeight: 700 }}>
                {operationsBadge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '24px 20px', maxWidth: 820, margin: '0 auto' }}>

        {/* Loading / error */}
        {tab !== 'sponsors' && dashLoading && (
          <div style={{ color: T.inkMuted, textAlign: 'center', padding: 60, fontFamily: T.serif, fontStyle: 'italic' }}>Loading platform data…</div>
        )}
        {tab !== 'sponsors' && !dashLoading && dashError && (
          <div style={{ background: 'rgba(165,63,43,0.08)', border: `1px solid rgba(165,63,43,0.2)`, borderRadius: 12, padding: '16px 20px', color: '#a53f2b', fontSize: 14 }}>
            {dashError}
            <button onClick={fetchDashboard} style={{ marginLeft: 12, background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Retry</button>
          </div>
        )}

        {/* ── OVERVIEW ──────────────────────────────────────────────────────── */}
        {tab === 'overview' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('overview', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('overview', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}

            {/* Health alerts */}
            {hasAlerts && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Needs attention</SectionTitle>
                {Number(s.pending_apps) > 0 && (
                  <AlertCard level="warn">{Number(s.pending_apps)} pastor application{Number(s.pending_apps) > 1 ? 's' : ''} waiting for review → go to Churches tab</AlertCard>
                )}
                {Number(s.dead_accounts) > 0 && (
                  <AlertCard level="warn">{Number(s.dead_accounts)} user{Number(s.dead_accounts) > 1 ? 's' : ''} signed up but never posted or used AI — onboarding may need work</AlertCard>
                )}
                {Number(s.zombie_churches) > 0 && (
                  <AlertCard level="warn">{Number(s.zombie_churches)} church{Number(s.zombie_churches) > 1 ? 'es' : ''} registered with 0 members — pastor may have dropped off after sign-up</AlertCard>
                )}
              </div>
            )}

            <SectionTitle>Platform overview</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 32 }}>
              <StatCard label="Total users" value={s.total_users} weekDelta={s.new_users_week} />
              <StatCard label="Weekly active" value={s.weekly_active_users} sub="used AI last 7 days" />
              <StatCard label="Activation rate" value={`${s.activation_rate ?? 0}%`} color={Number(s.activation_rate) >= 60 ? '#2e7a48' : Number(s.activation_rate) >= 30 ? T.goldDark : '#a53f2b'} sub="ever used AI" />
              <StatCard label="AI conversations" value={s.first_turn_events} />
              <StatCard label="Verified churches" value={s.verified_churches} color={T.goldDark} />
              <StatCard label="Community posts" value={s.total_posts} sub={`${s.posts_this_week ?? 0} this week`} />
              <StatCard label="Prayers" value={s.total_prayers} sub={`${s.prayers_this_week ?? 0} this week`} />
              <StatCard label="Shared conversations" value={s.total_shared} />
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

            <SectionTitle>Engagement & health</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
              <RatioCard label="Profile completion" value={`${s.profile_completion_rate ?? 0}%`} note="tradition + type set" />
              <RatioCard label="Avg AI turns" value={s.avg_ai_turns ?? '—'} note="turns per conversation" />
              <RatioCard label="Cache hit rate" value={`${cacheHitRate}%`} note="answers from cache" />
              <RatioCard label="Avg posts/user" value={avgPostsPerUser} note="across all members" />
              <RatioCard label="Avg follows/user" value={s.avg_follows ?? '—'} note="social graph density" />
              <RatioCard label="New users (30d)" value={Number(s.new_users_month ?? 0).toLocaleString()} note="joined last 30 days" />
              <RatioCard label="Total churches" value={Number(s.total_churches ?? 0).toLocaleString()} note={`${s.verified_churches ?? 0} verified`} />
              <RatioCard label="AI feedback (30d)" value={s.thumbs_down_count ?? 0} note="thumbs-down flags" color={Number(s.thumbs_down_count) > 5 ? '#a53f2b' : T.ink} />
            </div>
          </div>
        )}

        {/* ── AI & TOPICS ───────────────────────────────────────────────────── */}
        {tab === 'ai' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('ai', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('ai', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}
            {/* AI quality stats */}
            <SectionTitle>AI quality</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
              <RatioCard label="Total conversations" value={Number(s.first_turn_events ?? 0).toLocaleString()} note="unique first turns" />
              <RatioCard label="Total AI turns" value={Number(s.total_ai_events ?? 0).toLocaleString()} note="questions answered" />
              <RatioCard label="Avg turns / convo" value={s.avg_ai_turns ?? '—'} note="depth of engagement" />
              <RatioCard label="Thumbs-down rate" value={`${thumbsDownRate}%`} note="last 30 days" color={parseFloat(thumbsDownRate) > 2 ? '#a53f2b' : T.ink} />
            </div>

            {/* Cache efficiency + cost savings */}
            {(() => {
              const hits = Number(s.cache_hits ?? 0);
              const total = Number(s.total_ai_events ?? 0);
              const live = total - hits;
              const hitPct = total > 0 ? Math.round((hits / total) * 100) : 0;
              const livePct = 100 - hitPct;
              // Cost estimate: ~$0.004 per avoided call (Haiku pricing, typical kinwove prompt ~2500 tok in / 600 tok out)
              const COST_PER_CALL = 0.004;
              const saved = (hits * COST_PER_CALL).toFixed(2);
              return (
                <div style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 14, padding: '18px 20px', marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: T.inkMuted, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cache efficiency</div>
                    <div style={{ fontSize: 12, color: T.inkMuted }}>
                      Est. <strong style={{ color: '#2e7a48', fontSize: 14 }}>${saved} saved</strong> by reusing cached answers
                      <span style={{ fontSize: 10, color: T.inkMuted, marginLeft: 4 }}>~$0.004/call</span>
                    </div>
                  </div>

                  {/* Split bar */}
                  <div style={{ height: 28, borderRadius: 8, overflow: 'hidden', display: 'flex', marginBottom: 10 }}>
                    {hitPct > 0 && (
                      <div style={{ width: `${hitPct}%`, background: T.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {hitPct >= 12 && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{hitPct}%</span>}
                      </div>
                    )}
                    {livePct > 0 && (
                      <div style={{ width: `${livePct}%`, background: '#8E5528', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {livePct >= 12 && <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{livePct}%</span>}
                      </div>
                    )}
                  </div>

                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: T.gold, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.display }}>{hits.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: T.inkMuted }}>Served from cache — no API call</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: '#8E5528', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, fontFamily: T.display }}>{live.toLocaleString()}</div>
                        <div style={{ fontSize: 11, color: T.inkMuted }}>Sent to Claude — billed to Anthropic</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <SectionTitle>What people are asking about</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>
              Keyword-classified from first questions. No question content stored — just category counts. Use this for content marketing.
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
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>Which Claude model answered — indicates plan mix and cost distribution.</div>
            {modelDist.length === 0
              ? <EmptyNote>No model data yet.</EmptyNote>
              : modelDist.map((m) => {
                  const pct = modelTotal > 0 ? Math.round((m.count / modelTotal) * 100) : 0;
                  return <HorizBar key={m.model} label={MODEL_LABELS[m.model] ?? m.model} count={m.count} pct={pct} color="#8E5528" />;
                })
            }

            <div style={{ height: 32 }} />
            <SectionTitle>Person types</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>How users describe their faith journey — shapes messaging and onboarding.</div>
            {personTypeDist.length === 0
              ? <EmptyNote>No person type data yet.</EmptyNote>
              : personTypeDist.map((p) => {
                  const pct = personTotal > 0 ? Math.round((p.count / personTotal) * 100) : 0;
                  return <HorizBar key={p.type} label={PERSON_LABELS[p.type] ?? p.type} count={p.count} pct={pct} color="#6B5344" />;
                })
            }

            <div style={{ height: 32 }} />
            <SectionTitle>Traditions</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>Which Christian traditions are on kinwove — informs which denominations to market toward.</div>
            {traditionDist.length === 0
              ? <EmptyNote>No tradition data yet — fills as users complete their profiles.</EmptyNote>
              : traditionDist.map((t) => {
                  const pct = traditionTotal > 0 ? Math.round((t.count / traditionTotal) * 100) : 0;
                  return <HorizBar key={t.type} label={t.type} count={t.count} pct={pct} color={T.gold} />;
                })
            }
          </div>
        )}

        {/* ── GEOGRAPHY ─────────────────────────────────────────────────────── */}
        {tab === 'geo' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('geo', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('geo', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}
            <SectionTitle>Countries</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 16 }}>
              Based on church registrations. Where are your churches — and therefore your congregation users — located?
            </div>
            {countryDist.length === 0
              ? (
                <div style={{ background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14, padding: '28px 20px', textAlign: 'center', color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic' }}>
                  No church location data yet. As churches are registered, countries will appear here.
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 24 }}>
                    {countryDist.map((c) => {
                      const pct = countryTotal > 0 ? Math.round((c.count / countryTotal) * 100) : 0;
                      return <HorizBar key={c.country} label={c.country} count={c.count} pct={pct} color={T.gold} />;
                    })}
                  </div>
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

        {/* ── CHURCHES ──────────────────────────────────────────────────────── */}
        {tab === 'churches' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('churches', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('churches', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}
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
                        {c.status !== 'verified' && (
                          <span style={{
                            fontSize: 10, fontWeight: 600,
                            color: T.inkMuted,
                            background: T.parchment,
                            borderRadius: 999, padding: '2px 8px',
                            border: `1px solid ${T.line}`,
                          }}>
                            {c.status ?? 'pending'}
                          </span>
                        )}
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
                        <button onClick={() => handlePastorApp(a.id, true)} disabled={approveBusy === a.id}
                          style={{ background: '#2e7a48', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: approveBusy === a.id ? 0.5 : 1 }}>
                          {approveBusy === a.id ? '…' : 'Approve ✓'}
                        </button>
                        <button onClick={() => handlePastorApp(a.id, false)} disabled={approveBusy === a.id}
                          style={{ background: 'transparent', color: '#b43c3c', border: '1px solid rgba(180,60,60,0.3)', borderRadius: 999, padding: '7px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: approveBusy === a.id ? 0.5 : 1 }}>
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

        {/* ── CONTENT ───────────────────────────────────────────────────────── */}
        {tab === 'content' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('content', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('content', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}
            <SectionTitle>Most asked questions (by cache hits)</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
              Questions asked multiple times — use these for social posts, blog content, or FAQ pages.
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

        {/* ── OPERATIONS ────────────────────────────────────────────────────── */}
        {tab === 'operations' && !dashLoading && !dashError && dash && (
          <div>
            {getInsights('operations', s, dash).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <SectionTitle>Insights</SectionTitle>
                {getInsights('operations', s, dash).map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}

            {/* User Reports */}
            <SectionTitle>User reports {openReports.length > 0 && <span style={{ background: '#a53f2b', color: '#fff', borderRadius: 999, fontSize: 10, padding: '1px 6px', marginLeft: 6, fontWeight: 700 }}>{openReports.length}</span>}</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
              Submitted via "Report an issue" in the app menu. Resolve or dismiss once handled.
            </div>
            {openReports.length === 0
              ? <EmptyNote style={{ marginBottom: 32 }}>No open reports — all clear ✓</EmptyNote>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                  {openReports.map((rp) => {
                    const badge = REPORT_BADGE[rp.category] ?? REPORT_BADGE.other;
                    return (
                      <div key={rp.id} style={{ background: T.white, border: `1px solid ${T.line}`, borderRadius: 12, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color, borderRadius: 999, padding: '2px 9px' }}>{badge.label}</span>
                          {rp.profiles?.display_name && (
                            <span style={{ fontSize: 12, color: T.inkMuted }}>from {rp.profiles.display_name}</span>
                          )}
                          <span style={{ fontSize: 11, color: T.inkMuted, marginLeft: 'auto' }}>
                            {rp.created_at ? new Date(rp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: T.ink, marginBottom: 4 }}>{rp.subject}</div>
                        <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>{rp.body}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => handleReport(rp.id, 'resolved')} disabled={reportBusy === rp.id}
                            style={{ background: 'rgba(46,122,72,0.1)', color: '#2e7a48', border: '1px solid rgba(46,122,72,0.25)', borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: reportBusy === rp.id ? 0.5 : 1 }}>
                            {reportBusy === rp.id ? '…' : 'Resolve ✓'}
                          </button>
                          <button onClick={() => handleReport(rp.id, 'dismissed')} disabled={reportBusy === rp.id}
                            style={{ background: 'transparent', color: T.inkMuted, border: `1px solid ${T.line}`, borderRadius: 999, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: reportBusy === rp.id ? 0.5 : 1 }}>
                            Dismiss
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            }

            {/* AI feedback */}
            <SectionTitle>AI feedback flags</SectionTitle>
            <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 14 }}>
              AI responses users flagged as inaccurate or unhelpful. Use these to catch edge cases in the prompt.
            </div>
            {dash.recentFeedback.length === 0
              ? <EmptyNote>No feedback flagged yet.</EmptyNote>
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

            {/* Pending apps (duplicate from Churches for visibility) */}
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
                  <div style={{ fontSize: 12, color: T.inkMuted }}>Go to Churches tab to approve or decline.</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── SPONSORS ──────────────────────────────────────────────────────── */}
        {tab === 'sponsors' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
              <div>
                <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink }}>Sponsored cards</div>
                <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 3, lineHeight: 1.5 }}>
                  {sponsors.filter((sp) => sp.is_active).length > 0
                    ? `${sponsors.filter((sp) => sp.is_active).length} live — shown in feed after every 10 posts (free users only).`
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
                No sponsors yet.<br /><span style={{ fontSize: 13 }}>Add one above once you've made a deal.</span>
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
                      <button onClick={() => deleteSponsor(sp.id, sp.sponsor_name)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b43c3c', padding: 5, display: 'flex', borderRadius: 6 }}>
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

      {/* Sponsor add / edit sheet */}
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
              <div style={{ background: 'rgba(165,63,43,0.08)', border: '1px solid rgba(165,63,43,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#a53f2b', marginBottom: 14 }}>{sponsorError}</div>
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
