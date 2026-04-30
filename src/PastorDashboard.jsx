import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';

const THEME_LABEL = {
  anxiety:   'Anxiety',
  doubt:     'Doubt',
  prayer:    'Prayer',
  marriage:  'Marriage',
  grief:     'Grief',
  forgiveness: 'Forgiveness',
  suffering: 'Suffering',
  identity:  'Identity',
  meaning:   'Meaning',
  parenting: 'Parenting',
  finances:  'Finances',
  doctrine:  'Doctrine',
  other:     'Other',
};

function StatTile({ label, value, sublabel, accent }) {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
      padding: '16px 18px', flex: 1, minWidth: 0,
    }}>
      <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.inkMuted, fontWeight: 700, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{
        fontFamily: T.display, fontSize: 34, fontWeight: 600, letterSpacing: '-0.02em',
        color: accent ?? T.ink, lineHeight: 1, marginBottom: 4,
      }}>
        {value}
      </div>
      {sublabel && <div style={{ fontSize: 12, color: T.inkMuted }}>{sublabel}</div>}
    </div>
  );
}

function ThemeBar({ theme, count, max }) {
  const pct = Math.max(8, (count / max) * 100);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 500, color: T.ink, textTransform: 'capitalize' }}>
          {THEME_LABEL[theme] ?? theme}
        </span>
        <span style={{ fontSize: 13, color: T.goldDark, fontWeight: 700 }}>{count}</span>
      </div>
      <div style={{ height: 8, background: T.parchment, borderRadius: 999, overflow: 'hidden' }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${T.goldLight}, ${T.gold})`,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

function Section({ title, hint, children, action, actionLabel }) {
  return (
    <div style={{
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 16,
      padding: '20px 22px', marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: T.display, fontSize: 20, fontWeight: 600, color: T.ink, letterSpacing: '-0.015em', lineHeight: 1.2 }}>{title}</div>
          {hint && <div style={{ fontSize: 12.5, color: T.inkMuted, marginTop: 2 }}>{hint}</div>}
        </div>
        {action && (
          <button onClick={action} style={{
            background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '6px 14px', fontSize: 12, color: T.goldDark, cursor: 'pointer', fontWeight: 600,
          }}>{actionLabel}</button>
        )}
      </div>
      <div style={{ marginTop: 14 }}>
        {children}
      </div>
    </div>
  );
}

export default function PastorDashboard({ session, profile, churchId, onBack, onOpenComposer, onOpenCareAdmin, onOpenChurchPage }) {
  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [themes, setThemes] = useState([]);
  const [prayerThemes, setPrayerThemes] = useState([]);
  const [careCount, setCareCount] = useState(0);
  const [careTeamSize, setCareTeamSize] = useState(0);
  const [latestSermon, setLatestSermon] = useState(null);
  const [recentAnonCount, setRecentAnonCount] = useState(0);

  useEffect(() => {
    if (!churchId) return;
    let active = true;
    setLoading(true);
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const [
        { data: c },
        { count: members },
        { data: anonRows, count: anonCount },
        { data: prayers },
        { count: careConvCount },
        { count: careTeam },
        { data: latest },
      ] = await Promise.all([
        supabase.from('churches').select('*').eq('id', churchId).maybeSingle(),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('church_id', churchId),
        supabase
          .from('anonymous_questions')
          .select('theme_tag, created_at', { count: 'exact' })
          .eq('church_id', churchId)
          .gte('created_at', sevenDaysAgo),
        supabase
          .from('personal_prayers')
          .select('category, created_at')
          .gte('created_at', sevenDaysAgo)
          .limit(500),
        supabase
          .from('care_conversations')
          .select('id', { count: 'exact', head: true })
          .eq('church_id', churchId)
          .gte('created_at', sevenDaysAgo),
        supabase
          .from('care_team_members')
          .select('id', { count: 'exact', head: true })
          .eq('church_id', churchId)
          .eq('is_active', true),
        supabase
          .from('sermons')
          .select('*')
          .eq('church_id', churchId)
          .order('week_starts_on', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;

      setChurch(c);
      setMemberCount(members ?? 0);
      setRecentAnonCount(anonCount ?? 0);

      const themeCounts = {};
      (anonRows ?? []).forEach((r) => {
        const k = r.theme_tag ?? 'other';
        themeCounts[k] = (themeCounts[k] ?? 0) + 1;
      });
      const themeArr = Object.entries(themeCounts)
        .map(([k, v]) => ({ theme: k, count: v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setThemes(themeArr);

      const prayerCounts = {};
      (prayers ?? []).forEach((p) => {
        const k = p.category ?? 'other';
        prayerCounts[k] = (prayerCounts[k] ?? 0) + 1;
      });
      const prayerArr = Object.entries(prayerCounts)
        .map(([k, v]) => ({ theme: k, count: v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setPrayerThemes(prayerArr);

      setCareCount(careConvCount ?? 0);
      setCareTeamSize(careTeam ?? 0);
      setLatestSermon(latest);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [churchId]);

  const themeMax = useMemo(() => Math.max(1, ...themes.map((t) => t.count)), [themes]);
  const prayerMax = useMemo(() => Math.max(1, ...prayerThemes.map((t) => t.count)), [prayerThemes]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.cream, padding: '32px 20px 80px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 14,
        }}>← Back</button>

        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
          Pastor dashboard
        </div>
        <h1 style={{ fontFamily: T.display, fontSize: 34, fontWeight: 600, color: T.ink, letterSpacing: '-0.022em', lineHeight: 1.08, margin: '0 0 8px' }}>
          {church?.name ?? 'Your church'} · this week
        </h1>
        <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.65, margin: '0 0 22px' }}>
          The pulse of your congregation — themes only, no individual data. You'll never see who said what.
        </p>

        {/* Top row stats */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <StatTile label="Members" value={memberCount} sublabel="on The Way" />
          <StatTile label="Questions asked" value={recentAnonCount} sublabel="last 7 days" accent={T.goldDark} />
          <StatTile label="Care convos" value={careCount} sublabel="last 7 days" />
          <StatTile label="Care team" value={careTeamSize} sublabel="active" />
        </div>

        {/* Question heatmap */}
        <Section
          title="What your people are wrestling with"
          hint="Anonymous questions to The Way, classified by theme. No identities, ever."
        >
          {themes.length === 0 ? (
            <div style={{ color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', textAlign: 'center', padding: '20px 0', lineHeight: 1.6 }}>
              No questions yet. Share your church's anonymous-ask QR code so visitors can chat without signing up — themes (never names or words) will land here.
            </div>
          ) : (
            themes.map((t) => <ThemeBar key={t.theme} theme={t.theme} count={t.count} max={themeMax} />)
          )}
        </Section>

        {/* Prayer themes */}
        <Section
          title="Prayer pulse"
          hint="What your congregation is praying about (anonymous, public prayers only)."
        >
          {prayerThemes.length === 0 ? (
            <div style={{ color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic', textAlign: 'center', padding: '20px 0' }}>
              No prayer themes yet this week.
            </div>
          ) : (
            prayerThemes.map((t) => <ThemeBar key={t.theme} theme={t.theme} count={t.count} max={prayerMax} />)
          )}
        </Section>

        {/* This week's content */}
        <Section
          title="This week's content"
          hint={latestSermon
            ? `Latest: "${latestSermon.title}" — week of ${new Date(latestSermon.week_starts_on + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            : 'Paste Sunday\u2019s outline. Get a week of daily content for your congregation.'}
          action={onOpenComposer}
          actionLabel={latestSermon ? 'Manage' : 'Compose'}
        >
          {!latestSermon && (
            <button onClick={onOpenComposer} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: T.parchment, border: `1px dashed ${T.goldLight}`, borderRadius: 12,
              padding: '14px 16px', color: T.inkSoft, fontSize: 14, lineHeight: 1.55, fontFamily: T.serif,
            }}>
              <strong style={{ color: T.ink }}>Nothing scheduled this week.</strong> Paste Sunday's outline — we'll turn it into 5 days of devotionals, group questions, and a kid version. <span style={{ color: T.goldDark, fontWeight: 600 }}>Start →</span>
            </button>
          )}
          {latestSermon && (
            <div style={{
              fontFamily: T.serif, fontSize: 14.5, color: T.inkSoft, lineHeight: 1.65,
              padding: '6px 0',
            }}>
              {latestSermon.scripture_ref && <span style={{ color: T.goldDark, fontStyle: 'italic' }}>{latestSermon.scripture_ref}</span>}
              {latestSermon.scripture_ref && latestSermon.summary && ' · '}
              {latestSermon.summary && (latestSermon.summary.length > 200 ? latestSermon.summary.slice(0, 200) + '…' : latestSermon.summary)}
            </div>
          )}
        </Section>

        {/* Care team */}
        <Section
          title="Care team"
          hint={`${careTeamSize} active member${careTeamSize === 1 ? '' : 's'}. ${careCount} conversation${careCount === 1 ? '' : 's'} this week. (Counts only — content is private.)`}
          action={onOpenCareAdmin}
          actionLabel="Manage"
        >
          {careTeamSize === 0 && (
            <button onClick={onOpenCareAdmin} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: T.parchment, border: `1px dashed ${T.goldLight}`, borderRadius: 12,
              padding: '14px 16px', color: T.inkSoft, fontSize: 14, lineHeight: 1.55, fontFamily: T.serif,
            }}>
              <strong style={{ color: T.ink }}>No care team yet.</strong> Add 3–5 trusted people — elders, lay counselors, ministry leads. Members can then reach out anonymously, by topic, or by name. <span style={{ color: T.goldDark, fontWeight: 600 }}>Add people →</span>
            </button>
          )}
          {careTeamSize > 0 && (
            <div style={{ fontSize: 13, color: T.inkSoft, lineHeight: 1.65 }}>
              Your care team is active. Members can reach out anonymously, by topic, or to a specific person.
            </div>
          )}
        </Section>

        {/* Quick links */}
        <div style={{
          background: 'rgba(196,129,58,0.06)', border: `1px solid ${T.goldLight}`,
          borderRadius: 14, padding: '14px 18px',
          fontSize: 13, color: T.inkSoft, lineHeight: 1.65,
        }}>
          <div style={{ fontWeight: 600, color: T.ink, marginBottom: 6 }}>Pastor's promise to your congregation</div>
          You see themes, not people. You see counts, not conversations. No drift detection, no engagement scoring — lurking is part of belonging.
        </div>

        <button onClick={onOpenChurchPage} style={{
          width: '100%', background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
          padding: '12px 20px', fontSize: 14, color: T.inkSoft, cursor: 'pointer',
          marginTop: 14,
        }}>
          View your public church page →
        </button>
      </div>
    </div>
  );
}
