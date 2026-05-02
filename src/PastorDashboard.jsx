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

// First-run setup state — local to the browser, keyed per church.
// Only two flags need persistence:
//   qrPrinted: pastor tapped the "print QR" item (we can't actually verify
//              they printed it, so we trust the click — pragmatic vs. perfect)
//   dismissed: pastor saw the green "all done" celebrate and clicked Dismiss.
//              If anything later un-completes (e.g. welcome note cleared) the
//              checklist re-emerges automatically.
const SETUP_KEY = (churchId) => `the-way:church-setup:${churchId}`;
function readSetupState(churchId) {
  if (!churchId || typeof localStorage === 'undefined') return { qrPrinted: false, dismissed: false };
  try {
    const raw = localStorage.getItem(SETUP_KEY(churchId));
    return raw ? JSON.parse(raw) : { qrPrinted: false, dismissed: false };
  } catch { return { qrPrinted: false, dismissed: false }; }
}
function writeSetupState(churchId, state) {
  if (!churchId || typeof localStorage === 'undefined') return;
  try { localStorage.setItem(SETUP_KEY(churchId), JSON.stringify(state)); } catch {}
}

function SetupChecklist({ items, allDone, onDismiss }) {
  const completed = items.filter((i) => i.done).length;
  const total = items.length;
  const pct = (completed / total) * 100;
  return (
    <div style={{
      background: T.parchment,
      border: `1px solid ${T.goldLight}`,
      borderLeft: `4px solid ${T.gold}`,
      borderRadius: 14,
      padding: '18px 20px',
      marginBottom: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldDark, fontWeight: 700 }}>
          ✦ Get ready for Sunday
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: T.inkMuted, fontWeight: 600 }}>
          {completed} of {total}
        </div>
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 12 }}>
        {allDone
          ? 'Everything\u2019s in place. Your QR is ready to scan, your welcome note is up, and your sermon is live.'
          : 'A few minutes to set up the basics. Each step deep-links to the right place.'}
      </div>

      {/* Progress rail */}
      <div style={{ height: 4, background: 'rgba(196,129,58,0.18)', borderRadius: 999, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${T.goldLight}, ${T.gold})`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Item rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              background: item.done ? 'rgba(74,139,90,0.06)' : T.white,
              border: `1px solid ${item.done ? 'rgba(74,139,90,0.30)' : T.line}`,
              borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
              textAlign: 'left', fontFamily: 'inherit',
              transition: 'transform 0.12s ease, border-color 0.12s ease',
            }}
            onMouseEnter={(e) => { if (!item.done) e.currentTarget.style.borderColor = T.gold; }}
            onMouseLeave={(e) => { if (!item.done) e.currentTarget.style.borderColor = T.line; }}
          >
            <div style={{
              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
              background: item.done ? '#4a8b5a' : 'transparent',
              border: `1.5px solid ${item.done ? '#4a8b5a' : T.line}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: item.done ? T.cream : 'transparent',
              fontSize: 13, fontWeight: 700,
            }}>
              ✓
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.25,
                textDecoration: item.done ? 'line-through' : 'none',
                opacity: item.done ? 0.6 : 1,
              }}>
                {item.title}
              </div>
              {item.hint && (
                <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2, lineHeight: 1.4 }}>
                  {item.hint}
                </div>
              )}
            </div>
            <span style={{ color: T.goldDark, fontSize: 16, flexShrink: 0 }}>→</span>
          </button>
        ))}
      </div>

      {allDone && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button onClick={onDismiss} style={{
            background: T.ink, color: T.cream, border: 'none', borderRadius: 999,
            padding: '7px 16px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
          }}>
            ✓ Dismiss this card
          </button>
        </div>
      )}
    </div>
  );
}

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

function QuickAction({ emoji, label, hint, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, minWidth: 150,
        background: T.white, border: `1px solid ${T.line}`, borderRadius: 14,
        padding: '16px 14px', cursor: 'pointer', textAlign: 'left',
        transition: 'transform 0.12s ease, border-color 0.12s ease',
        fontFamily: 'inherit',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.transform = 'translateY(-1px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</div>
      <div style={{ fontFamily: T.display, fontSize: 15, fontWeight: 600, color: accent ?? T.ink, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 3 }}>
        {label}
      </div>
      {hint && <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.4 }}>{hint}</div>}
    </button>
  );
}

function SermonRow({ sermon, onEdit, onTogglePublish, busy }) {
  const dateLabel = new Date(sermon.week_starts_on + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const published = sermon.is_published;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: T.white, border: `1px solid ${T.line}`, borderRadius: 12,
      padding: '12px 14px', marginBottom: 8,
    }}>
      <button
        onClick={() => onEdit(sermon)}
        style={{
          flex: 1, minWidth: 0, textAlign: 'left',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
        }}
      >
        <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', lineHeight: 1.2, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sermon.title}
        </div>
        <div style={{ fontSize: 12, color: T.inkMuted, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>Week of {dateLabel}</span>
          {sermon.scripture_ref && <span style={{ color: T.goldDark, fontStyle: 'italic' }}>· {sermon.scripture_ref}</span>}
        </div>
      </button>
      <button
        onClick={() => onTogglePublish(sermon)}
        disabled={busy}
        title={published ? 'Click to unpublish' : 'Click to publish'}
        style={{
          background: published ? 'rgba(74,139,90,0.12)' : 'rgba(165,63,43,0.08)',
          color: published ? '#2e7a48' : '#a53f2b',
          border: `1px solid ${published ? 'rgba(74,139,90,0.35)' : 'rgba(165,63,43,0.3)'}`,
          borderRadius: 999, padding: '5px 12px', fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5,
          textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          opacity: busy ? 0.6 : 1, whiteSpace: 'nowrap',
        }}
      >
        {published ? '✓ Live' : '○ Draft'}
      </button>
    </div>
  );
}

export default function PastorDashboard({ session, profile, churchId, onBack, onOpenComposer, onOpenCareAdmin, onOpenChurchPage, onOpenSettings, onOpenPeople, embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [church, setChurch] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [themes, setThemes] = useState([]);
  const [prayerThemes, setPrayerThemes] = useState([]);
  const [careCount, setCareCount] = useState(0);
  const [careTeamSize, setCareTeamSize] = useState(0);
  const [sermons, setSermons] = useState([]);
  const [sermonBusy, setSermonBusy] = useState(null); // id currently toggling
  const [recentAnonCount, setRecentAnonCount] = useState(0);

  // First-run setup card — localStorage-backed, keyed per church.
  // Re-read when churchId changes (covers the rare case of swapping churches
  // without a full unmount, e.g. in dev / future multi-church support).
  const [setupState, setSetupState] = useState(() => readSetupState(churchId));
  useEffect(() => { setSetupState(readSetupState(churchId)); }, [churchId]);

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
        { data: sermonRows },
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
          .order('week_starts_on', { ascending: false }),
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
      setSermons(sermonRows ?? []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [churchId]);

  const themeMax = useMemo(() => Math.max(1, ...themes.map((t) => t.count)), [themes]);
  const prayerMax = useMemo(() => Math.max(1, ...prayerThemes.map((t) => t.count)), [prayerThemes]);

  // Setup checklist — derived state. Re-runs whenever church/sermons/members
  // change, so checking off "Add service times" in Settings and coming back
  // to Overview reflects immediately (the tab remount also helps).
  const hasPublishedSermon = sermons.some((s) => s.is_published);
  const hasVisitInfo = !!(church?.service_info || church?.street_address);
  const hasWelcomeNote = !!(church?.pinned_post && String(church.pinned_post).trim());
  const setupItems = useMemo(() => ([
    {
      id: 'visit',
      title: 'Add service times & location',
      hint: 'So first-time visitors know when and where to show up.',
      done: hasVisitInfo,
      onClick: () => onOpenSettings?.(),
    },
    {
      id: 'welcome',
      title: 'Write a welcome note',
      hint: 'A sentence or two — the first thing visitors read on your page.',
      done: hasWelcomeNote,
      onClick: () => onOpenSettings?.(),
    },
    {
      id: 'sermon',
      title: 'Publish your first sermon',
      hint: 'Paste an outline — we turn Sunday into a week of devotionals.',
      done: hasPublishedSermon,
      onClick: () => onOpenComposer?.(),
    },
    {
      id: 'qr',
      title: 'Print your QR code',
      hint: 'Tape it in the bulletin so people can join in five seconds.',
      done: setupState.qrPrinted,
      onClick: () => {
        // Click counts as "printed" — we can't actually verify, so we trust
        // the tap. Pragmatic vs. perfect. Then deep-link into settings AND
        // ask the panel to pop the QR modal directly — saves a second click
        // at the moment that matters most (sharing on Sunday).
        const next = { ...setupState, qrPrinted: true };
        setSetupState(next);
        writeSetupState(churchId, next);
        onOpenSettings?.('open-qr');
      },
    },
    {
      id: 'invite',
      title: 'Invite 5 members',
      hint: memberCount >= 5
        ? '5+ joined — your church is moving.'
        : `${memberCount} of 5 so far — share the QR or your invite code.`,
      done: memberCount >= 5,
      onClick: () => onOpenPeople?.(),
    },
  ]), [hasVisitInfo, hasWelcomeNote, hasPublishedSermon, setupState, memberCount, churchId, onOpenSettings, onOpenComposer, onOpenPeople]);

  const allSetupDone = setupItems.every((i) => i.done);
  // Visibility rule: hide once dismissed AND still all-done. If anything
  // un-completes (sermon unpublished, welcome cleared) the card returns.
  const showChecklist = !(setupState.dismissed && allSetupDone);

  function dismissSetup() {
    const next = { ...setupState, dismissed: true };
    setSetupState(next);
    writeSetupState(churchId, next);
  }

  async function togglePublish(sermon) {
    setSermonBusy(sermon.id);
    const next = !sermon.is_published;
    const { error: err } = await supabase
      .from('sermons')
      .update({ is_published: next })
      .eq('id', sermon.id);
    setSermonBusy(null);
    if (err) {
      console.error('toggle publish failed', err.message);
      return;
    }
    setSermons((rows) => rows.map((s) => s.id === sermon.id ? { ...s, is_published: next } : s));
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: T.inkMuted, fontFamily: T.serif }}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: embedded ? 'auto' : '100vh', background: T.cream, padding: embedded ? 0 : '32px 20px 80px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* First-run setup checklist — shows until pastor explicitly dismisses
            with all five items done. Sits at the top of Overview so a brand-
            new pastor lands on a guided punch list, not a blank dashboard. */}
        {showChecklist && (
          <SetupChecklist
            items={setupItems}
            allDone={allSetupDone}
            onDismiss={dismissSetup}
          />
        )}

        {!embedded && (
          <>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: T.goldDark, fontSize: 14, cursor: 'pointer', padding: 0, marginBottom: 14,
            }}>← Back</button>

            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 8 }}>
              Pastor dashboard
            </div>
            <h1 style={{ fontFamily: T.display, fontSize: 34, fontWeight: 600, color: T.ink, letterSpacing: '-0.022em', lineHeight: 1.08, margin: '0 0 8px' }}>
              {church?.name ?? 'Your church'} · this week
            </h1>
            <p style={{ color: T.inkSoft, fontSize: 14.5, lineHeight: 1.65, margin: '0 0 18px' }}>
              The pulse of your congregation — themes only, no individual data. You'll never see who said what.
            </p>

            {/* Quick actions */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <QuickAction emoji="✦" label="New sermon"        hint="Turn Sunday into a week"    onClick={onOpenComposer}    accent={T.goldDark} />
              <QuickAction emoji="👥" label="People & roles"    hint="Invite, badge, and manage" onClick={onOpenCareAdmin} />
              <QuickAction emoji="⛪" label="Public church page" hint="See what visitors see"     onClick={onOpenChurchPage} />
            </div>
          </>
        )}

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

        {/* Sermons (hidden in embedded mode — handled by parent tab) */}
        {!embedded && (
        <Section
          title="Sermons"
          hint={sermons.length === 0
            ? 'Paste Sunday\u2019s outline. Get a week of daily content for your congregation.'
            : `${sermons.filter((s) => s.is_published).length} live · ${sermons.filter((s) => !s.is_published).length} draft`}
          action={onOpenComposer}
          actionLabel="+ New"
        >
          {sermons.length === 0 ? (
            <button onClick={onOpenComposer} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: T.parchment, border: `1px dashed ${T.goldLight}`, borderRadius: 12,
              padding: '14px 16px', color: T.inkSoft, fontSize: 14, lineHeight: 1.55, fontFamily: T.serif,
            }}>
              <strong style={{ color: T.ink }}>Nothing scheduled yet.</strong> Paste this Sunday's outline — we'll turn it into 5 days of devotionals, group questions, and a kid version. <span style={{ color: T.goldDark, fontWeight: 600 }}>Start →</span>
            </button>
          ) : (
            sermons.map((s) => (
              <SermonRow
                key={s.id}
                sermon={s}
                onEdit={(sermon) => onOpenComposer(sermon.id)}
                onTogglePublish={togglePublish}
                busy={sermonBusy === s.id}
              />
            ))
          )}
        </Section>
        )}

        {/* Care team (hidden in embedded mode — Care tab handles it) */}
        {!embedded && (
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
        )}

        {/* Quick links */}
        <div style={{
          background: 'rgba(196,129,58,0.06)', border: `1px solid ${T.goldLight}`,
          borderRadius: 14, padding: '14px 18px',
          fontSize: 13, color: T.inkSoft, lineHeight: 1.65,
        }}>
          <div style={{ fontWeight: 600, color: T.ink, marginBottom: 6 }}>Pastor's promise to your congregation</div>
          You see themes, not people. You see counts, not conversations. No drift detection, no engagement scoring — lurking is part of belonging.
        </div>

        {!embedded && (
          <button onClick={onOpenChurchPage} style={{
            width: '100%', background: 'transparent', border: `1px solid ${T.line}`, borderRadius: 999,
            padding: '12px 20px', fontSize: 14, color: T.inkSoft, cursor: 'pointer',
            marginTop: 14,
          }}>
            View your public church page →
          </button>
        )}
      </div>
    </div>
  );
}
