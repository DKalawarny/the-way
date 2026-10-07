import { T, SHADOW } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';
import { KinwoveWordmark } from './components/brand/KinwoveWordmark.jsx';

const TABS = [
  { id: 'overview', label: 'Overview', emoji: <KinwoveStar size={13} /> },
  { id: 'people',   label: 'People',   emoji: '👥' },
  { id: 'ask',      label: 'Study',    emoji: '💬' },
  { id: 'bible',    label: 'Bible',    emoji: '📖' },
  { id: 'sermons',  label: 'Sermons',  emoji: '🎙' },
  { id: 'notes',    label: 'Notes',    emoji: '📝' },
  { id: 'settings', label: 'Settings', emoji: '⚙' },
];

function TabButton({ tab, active, onClick }) {
  return (
    <button
      data-tour-id={`pastor-${tab.id}-tab`}
      onClick={onClick}
      style={{
        background: active ? T.cream : 'transparent',
        color: active ? T.ink : 'rgba(253,248,240,0.60)',
        border: 'none',
        borderRadius: 999,
        padding: '8px 14px',
        fontSize: 13,
        fontWeight: 600,
        fontFamily: T.serif,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        transition: 'color 0.15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'rgba(253,248,240,0.9)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'rgba(253,248,240,0.60)'; }}
    >
      <span style={{ fontSize: 13 }}>{tab.emoji}</span>
      {tab.label}
    </button>
  );
}

export default function ChurchModeShell({
  church,
  tab,
  onTabChange,
  onBack,
  onOpenChurchPage,
  onOpenChurchHub,
  currentSubpage,
  bodyMaxWidth = 760,
  fullBleed = false,
  profile,
  onSwitchToPersonal,
  children,
}) {
  const isVisitorView = currentSubpage === 'public';
  const firstName = (profile?.display_name ?? '').split(' ')[0];

  return (
    <div style={{ height: 'calc(100vh - var(--global-header-h, 0px))', display: 'grid', gridTemplateRows: 'auto 1fr', overflow: 'hidden', background: T.cream }}>
      <div style={{
        zIndex: 20,
        minWidth: 0,
        background: '#1e1208',
        borderBottom: 'none',
        padding: '0 0 0',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        color: T.cream,
      }}>
        {/* Identity row — full-bleed: brand left, switcher right.
            paddingRight reserves the fixed Bell/Messages FAB zone. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 168px 8px 18px', borderBottom: '1px solid rgba(253,248,240,0.07)' }}>
          <KinwoveWordmark size={21} textColor="#f4e9d4" starColor={T.honey} />
          <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: T.honey, opacity: 0.85, whiteSpace: 'nowrap', marginTop: 2 }}>
            for churches
          </span>
          <div style={{ flex: 1 }} />
          {/* Leader / Visitor view toggle */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', whiteSpace: 'nowrap',
          }}>
            <button
              onClick={() => !isVisitorView ? undefined : onOpenChurchHub?.() ?? onBack?.()}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: isVisitorView ? 'pointer' : 'default',
                color: isVisitorView ? 'rgba(253,248,240,0.5)' : T.cream,
                fontWeight: isVisitorView ? 400 : 600, fontSize: 10,
                textTransform: 'uppercase', letterSpacing: '0.14em',
              }}
            >Leader</button>
            <span style={{ color: 'rgba(253,248,240,0.3)' }}>·</span>
            <button
              onClick={isVisitorView ? undefined : onOpenChurchPage}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: isVisitorView ? 'default' : 'pointer',
                color: isVisitorView ? T.cream : 'rgba(253,248,240,0.5)',
                fontWeight: isVisitorView ? 600 : 400, fontSize: 10,
                textTransform: 'uppercase', letterSpacing: '0.14em',
              }}
            >Visitor</button>
          </div>
          {/* Account-style switcher back to the personal space */}
          {(onSwitchToPersonal ?? onBack) && (
            <button
              onClick={onSwitchToPersonal ?? onBack}
              title="Switch to your personal space"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(253,248,240,0.08)',
                border: '1px solid rgba(253,248,240,0.18)',
                borderRadius: 999, padding: '5px 12px',
                fontSize: 11.5, fontWeight: 600, color: 'rgba(253,248,240,0.85)',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(253,248,240,0.16)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(253,248,240,0.08)')}
            >
              <span aria-hidden="true" style={{ fontSize: 12 }}>⇄</span>
              {firstName ? `${firstName} · personal` : 'Personal'}
            </button>
          )}
        </div>

        <div style={{ maxWidth: bodyMaxWidth, margin: '0 auto', padding: '10px 20px 0' }}>
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <h1 style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.cream, letterSpacing: '-0.02em', lineHeight: 1.1, margin: 0 }}>
              {church?.name ?? 'Your church'}
              {church?.city && (
                <span style={{ fontSize: 12.5, fontWeight: 400, color: 'rgba(253,248,240,0.55)', marginLeft: 10, letterSpacing: 0 }}>
                  {church.city}{church.region ? `, ${church.region}` : ''}
                </span>
              )}
            </h1>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 2, overflowX: 'auto', paddingBottom: 8 }}>
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

      {/* Public/visitor view renders full-bleed — ChurchPage owns its own layout */}
      {/* fullBleed is a flex column so a banner above the tab (e.g. TrialBanner)
          takes its own height and the tab flexes into the rest — otherwise the
          tab's height:100% overflows past the clipped container and the bottom
          is unreachable. */}
      {/* Children scroll inside THIS container, not the window — sticky
          offsets tuned to the global header must resolve to 0 in here, or a
          see-through gap opens above them and posts slide past (visitor Feed). */}
      <div style={{ minWidth: 0, minHeight: 0, overflow: fullBleed ? 'hidden' : 'auto', display: fullBleed ? 'flex' : undefined, flexDirection: fullBleed ? 'column' : undefined, paddingBottom: (!fullBleed && isVisitorView) ? 80 : 0, '--global-header-h': '0px' }}>
        {isVisitorView || fullBleed
          ? children
          : <div style={{ maxWidth: bodyMaxWidth, margin: '0 auto', padding: '20px 20px 80px', width: '100%', boxSizing: 'border-box' }}>{children}</div>
        }
      </div>
    </div>
  );
}
