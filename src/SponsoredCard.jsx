import { T } from './theme.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

export default function SponsoredCard({ sponsor_name, title, body, cta_text, cta_url, emoji }) {
  return (
    <div style={{
      background: T.white,
      border: `1px solid ${T.line}`,
      borderRadius: 14,
      padding: '14px 16px',
      marginBottom: 12,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {/* Left: emoji avatar + sponsor name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: T.parchment,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            flexShrink: 0,
          }}>
            {emoji ?? <KinwoveStar size={16} />}
          </div>
          <span style={{
            fontFamily: T.sans,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: T.gold,
          }}>
            {sponsor_name}
          </span>
        </div>

        {/* Right: "Sponsored" chip */}
        <span style={{
          fontFamily: T.sans,
          fontSize: 10,
          color: T.inkMuted,
          border: `1px solid ${T.line}`,
          borderRadius: 999,
          padding: '2px 8px',
          letterSpacing: 0.4,
          flexShrink: 0,
        }}>
          Sponsored
        </span>
      </div>

      {/* Title */}
      {title && (
        <div style={{
          fontFamily: T.serif,
          fontSize: 15,
          fontWeight: 600,
          color: T.ink,
          margin: '10px 0 6px',
          lineHeight: 1.3,
        }}>
          {title}
        </div>
      )}

      {/* Body */}
      {body && (
        <div style={{
          fontFamily: T.sans,
          fontSize: 13.5,
          color: T.inkSoft,
          lineHeight: 1.65,
        }}>
          {body}
        </div>
      )}

      {/* CTA button */}
      {cta_text && cta_url && (
        <div style={{ marginTop: 12 }}>
          <a
            href={cta_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              background: 'transparent',
              border: `1px solid ${T.goldDark}`,
              color: T.goldDark,
              borderRadius: 999,
              padding: '7px 16px',
              fontSize: 13,
              fontFamily: T.sans,
              fontWeight: 600,
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            {cta_text}
          </a>
        </div>
      )}
    </div>
  );
}
