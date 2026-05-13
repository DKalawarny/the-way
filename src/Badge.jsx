import { T, SEMANTIC } from './theme.js';

// ── Role presets ─────────────────────────────────────────────────────
//
// Each role gets its own emoji + palette so a name in a feed reads at a
// glance: who's the pastor? who's care team? Two design rules govern this:
//
//   1. NO emoji collision between any two presets. The audit caught
//      staff and elder both using ✦; that's been split (staff → ✚).
//   2. The "elevated" palettes (pastor, elder) get rich, saturated text
//      colors. Helper presets (worship, youth) get cooler, less-loud hues
//      so they don't compete with the pastor's pill.
//
// `pastor` and `careTeam` are sourced differently from the others
// — `pastor` comes from profiles.is_pastor (not church_roles), and
// `careTeam` is the legacy alias for the care role retained for any older
// call site that hard-codes the key. Both are presets so callers can use
// the same Badge component everywhere.
export const ROLE_PRESETS = [
  { key: 'pastor',  label: 'Pastor',      emoji: '✦',
    palette: { bg: 'rgba(184,115,58,0.22)', text: T.goldDark, line: T.gold },
    blurb: 'The pastor of this church.' },
  { key: 'elder',   label: 'Elder',       emoji: '◆',
    palette: { bg: 'rgba(110,90,140,0.18)', text: '#5A3F8C', line: 'rgba(110,90,140,0.55)' },
    blurb: 'Spiritual oversight — extra moderation gets shown to elders.' },
  { key: 'staff',   label: 'Staff',       emoji: '✚',
    palette: { bg: 'rgba(184,115,58,0.14)', text: T.goldDark, line: T.goldLight },
    blurb: 'Generic staff badge — for trusted leaders without a more specific role.' },
  { key: 'care',    label: 'Care team',   emoji: '☎', palette: SEMANTIC.care,
    blurb: "They'll show up in the care inbox and members can reach them." },
  { key: 'careTeam', label: 'Care team',  emoji: '☎', palette: SEMANTIC.care,
    blurb: "Alias of 'care' — kept so legacy code that uses careTeam keeps working." },
  { key: 'worship', label: 'Worship',     emoji: '♬',
    palette: { bg: 'rgba(74,123,157,0.18)', text: '#2E6A8E', line: 'rgba(74,123,157,0.55)' },
    blurb: 'For worship team leads.' },
  { key: 'youth',   label: 'Youth',       emoji: '✶',
    palette: { bg: 'rgba(74,139,90,0.18)', text: '#2E7A48', line: 'rgba(74,139,90,0.55)' },
    blurb: 'Youth ministry leaders.' },
];

const OTHER_PALETTE = { bg: T.parchment, text: T.inkSoft, line: T.line };

export function presetForRole(role_key) {
  return ROLE_PRESETS.find((r) => r.key === role_key) ?? null;
}

/**
 * Subset of ROLE_PRESETS that appears in the "invite to a role" picker.
 * Excludes:
 *   - `pastor`        — granted by an out-of-band claim, not an invite.
 *   - `careTeam`      — alias for `care`; only the canonical key shows up.
 */
export const INVITABLE_ROLES = ROLE_PRESETS.filter(
  (r) => r.key !== 'pastor' && r.key !== 'careTeam'
);

/**
 * Single role badge. Use anywhere a person's name appears in a church context.
 * <Badge role={{ role_key: 'care', role_label: 'Care team' }} />
 */
export default function Badge({ role, size = 'sm' }) {
  if (!role) return null;
  const preset = presetForRole(role.role_key);
  const palette = preset?.palette ?? OTHER_PALETTE;
  const text = role.role_label ?? preset?.label ?? role.role_key;
  const emoji = preset?.emoji ?? '✦';

  const fontSize = size === 'md' ? 11.5 : 10.5;
  const padX = size === 'md' ? 8 : 7;
  const padY = size === 'md' ? 3 : 2;

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: palette.bg,
      color: palette.text,
      border: `1px solid ${palette.line}`,
      borderRadius: 999,
      padding: `${padY}px ${padX}px`,
      fontSize, fontWeight: 600, letterSpacing: 0.2,
      whiteSpace: 'nowrap',
      lineHeight: 1.1,
    }}>
      <span style={{ fontSize: fontSize - 0.5 }}>{emoji}</span>
      {text}
    </span>
  );
}

/**
 * Renders a list of role badges for a single user.
 * Pastor flag is rendered separately at the call site.
 */
export function BadgeList({ roles, size = 'sm', max = 3 }) {
  if (!roles || roles.length === 0) return null;
  const visible = roles.slice(0, max);
  const overflow = roles.length - visible.length;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {visible.map((r) => (
        <Badge key={`${r.role_key}-${r.id ?? ''}`} role={r} size={size} />
      ))}
      {overflow > 0 && (
        <span style={{ fontSize: 10.5, color: T.inkMuted, fontWeight: 600 }}>
          +{overflow}
        </span>
      )}
    </span>
  );
}
