/**
 * profileShared.jsx
 *
 * Shared building blocks for profile surfaces — the "You" tab (MePanel) and
 * the profile-overlay-modal (UserProfile). Both render the same person-shaped
 * data; the only reason they're separate components is layout (full panel vs
 * overlay) and chrome (composer + settings vs friend buttons).
 *
 * Anything that describes WHAT a profile is (constants, helpers, the church
 * card) lives here so it can't drift between the two. Anything that describes
 * HOW each surface is laid out stays in MePanel.jsx / UserProfile.jsx.
 *
 * This file is also the natural home for the privacy gate when we add it —
 * `loadChurchContext` here, post-fetch privacy filtering in Feed.jsx, prayer
 * filtering in the loader for that tab.
 */

import { supabase } from './supabase.js';
import { T } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

// ── Shared constants ────────────────────────────────────────────────────

export const REACTIONS = [
  { kind: 'resonates', label: 'Love',       emoji: '❤️' },
  { kind: 'amen',      label: 'Amen',       emoji: '🙏' },
  { kind: 'thinking',  label: 'Insightful', emoji: '💡' },
];

// Used to tint the person-type pill on profiles. Matches the colors used in
// onboarding so a "Going Deeper" badge looks the same wherever it appears.
export const TYPE_COLORS = {
  curious:    { bg: 'rgba(184,115,58,0.12)', border: 'rgba(184,115,58,0.4)', text: '#8a5a1a' },
  seeking:    { bg: 'rgba(74,123,157,0.12)', border: 'rgba(74,123,157,0.4)', text: '#2e6a8e' },
  skeptic:    { bg: 'rgba(100,100,100,0.1)', border: 'rgba(100,100,100,0.3)', text: '#555' },
  'new-faith':{ bg: 'rgba(74,139,90,0.12)', border: 'rgba(74,139,90,0.4)',  text: '#2e7a48' },
};

// ── Shared helpers ──────────────────────────────────────────────────────

export function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Used by the "✦ This week · May 1" header on the church card.
// Returns null for invalid input so the caller can do `formatWeekOf(x) ? ` · ${...}` : ''`.
export function formatWeekOf(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
  } catch { return null; }
}

/**
 * Fetch a person's church + this week's published sermon + member count in one
 * round-trip. Returns { church, sermon, memberCount } where any field can be
 * null if the church has no sermon yet, etc.
 *
 * Centralizing this query is the point of this module: it's the data shape
 * the church card on every profile surface depends on, and we want one canonical
 * place to add caching / RLS / privacy filtering when those land.
 */
export async function loadChurchContext(churchId) {
  if (!churchId) return { church: null, sermon: null, memberCount: 0 };
  const [{ data: c }, { data: s }, { count: m }] = await Promise.all([
    supabase.from('churches').select('id, name, city, region').eq('id', churchId).maybeSingle(),
    supabase.from('sermons').select('id, title, scripture_ref, week_starts_on')
      .eq('church_id', churchId).eq('is_published', true)
      .order('week_starts_on', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('church_id', churchId),
  ]);
  return {
    church: c ?? null,
    sermon: s ?? null,
    memberCount: m ?? 0,
  };
}

// ── Shared components ───────────────────────────────────────────────────

/**
 * The "their church" card that lives between the hero and the tabs on a
 * profile. Two tap-targets stacked: top row is the church (→ church page),
 * bottom row is this week's sermon (→ sermon view).
 *
 * Self-mode adjusts copy ("you attend" → "I attend" doesn't read well, so we
 * use "Your church" instead of "Danny attends"). The card auto-hides if there's
 * no church to show.
 *
 * Props:
 *   firstName       — used in "Danny attends" copy. Self-mode ignores this.
 *   isSelf          — true on MePanel (own profile), false on UserProfile (others)
 *   church          — { id, name, city, region } or null
 *   sermon          — { id, title, scripture_ref, week_starts_on } or null
 *   memberCount     — number (0 hides the count fragment)
 *   onOpenChurch(id), onOpenSermon(id) — both optional; rows hide when missing
 */
export function ChurchAttendsCard({
  firstName, isSelf,
  church, sermon, memberCount,
  onOpenChurch, onOpenSermon,
}) {
  if (!church || (!onOpenChurch && !onOpenSermon)) return null;

  const eyebrow = isSelf ? 'Your church' : `${firstName ?? 'They'} attends`;
  const locationLine = [church.city, church.region].filter(Boolean).join(', ');
  const showMemberCount = memberCount > 0;

  return (
    <div style={{
      marginBottom: 12,
      background: T.white,
      border: `1px solid ${T.line}`,
      borderRadius: 14,
      overflow: 'hidden',
    }}>
      {/* Top row — church identity. Whole row tappable when handler exists. */}
      {onOpenChurch ? (
        <button
          onClick={() => onOpenChurch(church.id)}
          style={{
            width: '100%', textAlign: 'left',
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.parchment; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ fontSize: 20, lineHeight: 1 }}>⛪</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.inkMuted, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>
              {eyebrow}
            </div>
            <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {church.name}
            </div>
            {(locationLine || showMemberCount) && (
              <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {locationLine}
                {locationLine && showMemberCount && ' · '}
                {showMemberCount && `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
              </div>
            )}
          </div>
          <span style={{ color: T.goldDark, fontSize: 16, flexShrink: 0 }}>→</span>
        </button>
      ) : (
        // Read-only fallback — happens only when caller omits onOpenChurch
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>⛪</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.inkMuted, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>{eyebrow}</div>
            <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink }}>{church.name}</div>
          </div>
        </div>
      )}

      {/* Bottom row — this week's sermon. Separate tap target so going
          "what are they hearing this Sunday?" is a single tap from any
          profile. Only renders when there's a published sermon + handler. */}
      {sermon && onOpenSermon && (
        <button
          onClick={() => onOpenSermon(sermon.id)}
          style={{
            width: '100%', textAlign: 'left',
            background: 'rgba(184,115,58,0.04)',
            border: 'none', borderTop: `1px solid ${T.line}`,
            cursor: 'pointer', padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,115,58,0.10)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(184,115,58,0.04)'; }}
        >
          <KinwoveStar size={14} style={{ color: T.goldDark, filter: 'drop-shadow(0 0 4px rgba(184,115,58,0.4))', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: T.goldDark, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 2 }}>
              This week{formatWeekOf(sermon.week_starts_on) ? ` · ${formatWeekOf(sermon.week_starts_on)}` : ''}
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.ink, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sermon.title}
            </div>
            {sermon.scripture_ref && (
              <div style={{ fontFamily: T.serif, fontSize: 12, fontStyle: 'italic', color: T.inkMuted, marginTop: 1 }}>
                {sermon.scripture_ref}
              </div>
            )}
          </div>
          <span style={{ color: T.goldDark, fontSize: 14, flexShrink: 0 }}>→</span>
        </button>
      )}
    </div>
  );
}
