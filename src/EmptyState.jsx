import { T } from './theme.js';

// icon can be:
//   - a string/emoji  → rendered as large text
//   - a JSX element   → rendered centred inside a soft gold circle
export default function EmptyState({ icon, title, body, cta, compact = false }) {
  const isJsx = icon && typeof icon !== 'string';
  return (
    <div style={{
      textAlign: 'center',
      padding: compact ? '40px 20px' : '60px 20px',
    }}>
      {icon && (
        isJsx ? (
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'rgba(184,115,58,0.09)',
            border: '1px solid rgba(184,115,58,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 18px',
          }}>
            {icon}
          </div>
        ) : (
          <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.85 }}>{icon}</div>
        )
      )}
      <div style={{
        fontFamily: T.display,
        fontSize: compact ? 20 : 24,
        fontWeight: 600,
        color: T.ink,
        marginBottom: 10,
        letterSpacing: '-0.018em',
        lineHeight: 1.18,
      }}>
        {title}
      </div>
      {body && (
        <div style={{
          fontSize: compact ? 14 : 15,
          color: T.inkMuted,
          lineHeight: 1.6,
          maxWidth: 380,
          margin: '0 auto',
        }}>
          {body}
        </div>
      )}
      {cta && (
        <button
          onClick={cta.onClick}
          style={{
            marginTop: 18,
            background: T.gold,
            color: T.cream,
            border: 'none',
            borderRadius: 999,
            padding: '10px 22px',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(184,115,58,0.30)',
          }}
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}
