import { T, SHADOW } from './theme.js';

// Sticky church-mode header reused across every page a pastor sees while
// managing their church (admin tabs, public-page preview, congregation feed,
// individual sermon view). Keeps the wayfinding consistent so the pastor never
// loses context after clicking "Public page →" or "Congregation feed →".
//
// Tab strip behaviour:
// - Inside ChurchAdmin: clicking a tab swaps the body inline.
// - On wrapped non-admin pages: clicking a tab navigates back to ChurchAdmin
//   with that tab pre-selected (parent owns the navigation).
//
// `currentSubpage` tells the shell which outbound link is the page you're
// currently viewing — that one gets a "current" treatment (filled) and the
// other stays as a normal outbound link, so the pastor can see at a glance
// which preview they're in.

const TABS = [
  { id: 'overview', label: 'Overview', emoji: '✦' },
  { id: 'sermons',  label: 'Sermons',  emoji: '📖' },
  { id: 'people',   label: 'People',   emoji: '👥' },
  { id: 'settings', label: 'Settings', emoji: '⚙' },
];

function TabButton({ tab, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? T.cream : 'transparent',
        color: active ? T.ink : 'rgba(253,248,240,0.65)',
        border: active ? 'none' : '1px solid rgba(253,248,240,0.18)',
        borderRadius: 999,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <span style={{ fontSize: 13 }}>{tab.emoji}</span>
      {tab.label}
    </button>
  );
}

function OutboundLink({ label, current, onClick }) {
  if (!onClick) return null;
  return (
    <button onClick={onClick} disabled={current} style={{
      background: current ? T.cream : 'rgba(253,248,240,0.10)',
      color:      current ? T.ink   : T.cream,
      border:     current ? 'none'  : '1px solid rgba(253,248,240,0.25)',
      borderRadius: 999,
      padding: '5px 12px',
      fontSize: 12,
      fontWeight: 600,
      cursor: current ? 'default' : 'pointer',
    }}>{label}</button>
  );
}

export default function ChurchModeShell({
  church,
  tab,                  // active admin tab id, or null when on a wrapped sub-page
  onTabChange,          // (tabId) => void
  onBack,               // "← My page" handler — required
  onOpenChurchPage,     // optional — hidden when not provided
  onOpenChurchHub,      // optional — hidden when not provided
  currentSubpage,       // 'public' | 'hub' | 'sermon' | null
  bodyMaxWidth = 760,
  children,
}) {
  return (
    <div style={{ minHeight: '100vh', background: T.cream, overflowY: 'auto' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: `linear-gradient(135deg, ${T.ink} 0%, #1A0F08 55%, #3A2516 100%)`,
        borderBottom: '1px solid rgba(184,115,58,0.35)',
        boxShadow: SHADOW.candle,
        padding: '14px 20px 0',
        color: T.cream,
      }}>
        <div style={{ maxWidth: bodyMaxWidth, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={onBack} style={{
              background: 'none', border: 'none', color: T.goldLight, fontSize: 14, cursor: 'pointer', padding: 0,
            }}>← My page</button>
            <div style={{ flex: 1 }} />
            <OutboundLink
              label={currentSubpage === 'hub' ? 'Congregation feed' : 'Congregation feed →'}
              current={currentSubpage === 'hub'}
              onClick={onOpenChurchHub}
            />
            <OutboundLink
              label={currentSubpage === 'public' ? 'Public page' : 'Public page →'}
              current={currentSubpage === 'public'}
              onClick={onOpenChurchPage}
            />
            <div style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: T.goldLight, fontWeight: 700 }}>
              Church mode
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontFamily: T.display, fontSize: 26, fontWeight: 600, color: T.cream, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
              {church?.name ?? 'Your church'}
            </h1>
            {church?.city && (
              <span style={{ fontSize: 13, color: 'rgba(253,248,240,0.65)' }}>{church.city}{church.region ? `, ${church.region}` : ''}</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10 }}>
            {TABS.map((t) => (
              <TabButton
                key={t.id}
                tab={t}
                active={tab === t.id}
                onClick={() => onTabChange?.(t.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: bodyMaxWidth, margin: '0 auto', padding: '20px 20px 80px' }}>
        {children}
      </div>
    </div>
  );
}
