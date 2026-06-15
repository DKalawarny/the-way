import { T, SHADOW } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

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
        color: active ? T.ink : 'rgba(253,248,240,0.65)',
        border: active ? 'none' : '1px solid rgba(253,248,240,0.18)',
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
      }}
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
  children,
}) {
  const isVisitorView = currentSubpage === 'public';

  return (
    <div style={{ height: 'calc(100vh - var(--global-header-h, 0px))', display: 'grid', gridTemplateRows: 'auto 1fr', overflow: 'hidden', background: T.cream }}>
      <div style={{
        zIndex: 20,
        background: '#1e1208',
        borderBottom: 'none',
        padding: '14px 20px 0',
        color: T.cream,
      }}>
        <div style={{ maxWidth: bodyMaxWidth, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
            <button onClick={onOpenChurchHub ?? onBack} style={{
              background: 'none', border: 'none', color: T.goldLight, fontSize: 14, cursor: 'pointer', padding: 0,
            }}>← Church page</button>
            <div style={{ flex: 1 }} />
            {/* Leader / Visitor view toggle */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.16em',
            }}>
              <span style={{ color: 'rgba(253,248,240,0.45)' }}>Viewing as</span>
              <button
                onClick={() => !isVisitorView ? undefined : onOpenChurchHub?.() ?? onBack?.()}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: isVisitorView ? 'pointer' : 'default',
                  color: isVisitorView ? 'rgba(253,248,240,0.5)' : T.cream,
                  fontWeight: isVisitorView ? 400 : 600, fontSize: 10.5,
                  textTransform: 'uppercase', letterSpacing: '0.16em',
                }}
              >Leader</button>
              <span style={{ color: 'rgba(253,248,240,0.3)' }}>·</span>
              <button
                onClick={isVisitorView ? undefined : onOpenChurchPage}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: isVisitorView ? 'default' : 'pointer',
                  color: isVisitorView ? T.cream : 'rgba(253,248,240,0.5)',
                  fontWeight: isVisitorView ? 600 : 400, fontSize: 10.5,
                  textTransform: 'uppercase', letterSpacing: '0.16em',
                }}
              >Visitor</button>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <h1 style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.cream, letterSpacing: '-0.02em', lineHeight: 1.1, margin: '0 0 4px' }}>
              {church?.name ?? 'Your church'}
            </h1>
            {church?.city && (
              <span style={{ fontSize: 13, color: 'rgba(253,248,240,0.65)' }}>{church.city}{church.region ? `, ${church.region}` : ''}</span>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, overflowX: 'auto', paddingBottom: 10 }}>
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
      <div style={{ minHeight: 0, overflow: fullBleed ? 'hidden' : 'auto', paddingBottom: (!fullBleed && isVisitorView) ? 80 : 0 }}>
        {isVisitorView || fullBleed
          ? children
          : <div style={{ maxWidth: bodyMaxWidth, margin: '0 auto', padding: '20px 20px 80px', width: '100%', boxSizing: 'border-box' }}>{children}</div>
        }
      </div>
    </div>
  );
}
