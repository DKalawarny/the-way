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

  const inner = (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 10, color: T.goldDark, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3,
      }}>
        {eyebrow}
      </div>
      <div style={{
        fontFamily: T.serif, fontSize: 15.5, fontWeight: 600, color: T.ink,
        letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
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
  );

  return (
    <div style={{ marginBottom: 16 }}>
      {onOpenChurch ? (
        <button
          onClick={() => onOpenChurch(church.id)}
          style={{
            width: '100%', textAlign: 'left',
            background: T.parchment,
            border: `1px solid rgba(184,115,58,0.2)`,
            borderRadius: 12,
            cursor: 'pointer',
            padding: '13px 16px',
            display: 'flex', alignItems: 'center', gap: 10,
            transition: 'border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F5EDD8'; e.currentTarget.style.borderColor = 'rgba(184,115,58,0.38)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = T.parchment; e.currentTarget.style.borderColor = 'rgba(184,115,58,0.2)'; }}
        >
          {inner}
          <span style={{ color: T.goldDark, fontSize: 13, flexShrink: 0, opacity: 0.65 }}>→</span>
        </button>
      ) : (
        <div style={{
          background: T.parchment, border: `1px solid rgba(184,115,58,0.2)`,
          borderRadius: 12, padding: '13px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {inner}
        </div>
      )}
    </div>
  );
}
