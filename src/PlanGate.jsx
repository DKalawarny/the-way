import { T } from './theme.js';
import { PRO_PRICE, UPGRADE_EMAIL } from './usePlan.js';

/* ── Trial banner shown at top of ChurchAdmin while trial is active ── */
export function TrialBanner({ daysLeft }) {
  const urgent  = daysLeft <= 7;
  const subject = encodeURIComponent('kinwove — Church Pro upgrade');
  const body    = encodeURIComponent('Hi, I would like to upgrade my church to kinwove Pro.');
  const href    = `mailto:${UPGRADE_EMAIL}?subject=${subject}&body=${body}`;

  return (
    <div style={{
      background : urgent ? 'rgba(165,63,43,0.07)' : 'rgba(184,115,58,0.06)',
      border     : `1px solid ${urgent ? '#A53F2B55' : T.goldLight}`,
      borderRadius: 10, padding: '10px 16px', marginBottom: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{ fontSize: 13, color: T.ink, lineHeight: 1.45 }}>
        <strong style={{ color: urgent ? '#A53F2B' : T.goldDark }}>
          {daysLeft === 0
            ? 'Your free trial ends today.'
            : `Free trial · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left.`}
        </strong>
        {' '}Your first month is on us — upgrade before it ends to keep all pastor tools.
      </div>
      <a
        href={href}
        style={{
          background  : urgent ? '#A53F2B' : T.ink,
          color       : T.cream,
          borderRadius: 999,
          padding     : '7px 18px',
          fontSize    : 13,
          fontWeight  : 600,
          textDecoration: 'none',
          flexShrink  : 0,
          display     : 'inline-block',
        }}
      >
        Upgrade → {PRO_PRICE}
      </a>
    </div>
  );
}

/* ── Full-screen upgrade wall shown when trial has expired ── */
export function UpgradeWall({ onBack }) {
  const subject = encodeURIComponent('kinwove — Church Pro upgrade');
  const body    = encodeURIComponent('Hi, I would like to upgrade my church to kinwove Pro.');
  const href    = `mailto:${UPGRADE_EMAIL}?subject=${subject}&body=${body}`;

  const features = [
    'Full pastor dashboard & analytics',
    'AI-powered sermon composer',
    'Care team management',
    'Walk announcements & custom journeys',
    'Unlimited church members',
  ];

  return (
    <div style={{
      minHeight : '100vh',
      background: T.cream,
      display   : 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding   : '40px 20px',
    }}>
      <div style={{
        maxWidth    : 440,
        width       : '100%',
        background  : T.white,
        border      : `1px solid ${T.line}`,
        borderRadius: 20,
        padding     : '36px 32px',
        textAlign   : 'center',
      }}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: T.parchment, border: `1px solid ${T.goldLight}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, margin: '0 auto 20px',
        }}>✦</div>

        <h2 style={{
          fontFamily  : T.display,
          fontSize    : 26,
          fontWeight  : 600,
          color       : T.ink,
          margin      : '0 0 10px',
          letterSpacing: '-0.02em',
          lineHeight  : 1.2,
        }}>
          Your free trial has ended
        </h2>

        <p style={{
          color     : T.inkSoft,
          fontSize  : 14,
          lineHeight: 1.65,
          margin    : '0 0 26px',
        }}>
          Upgrade to keep access to your pastor dashboard, sermon tools,
          care team, and everything your congregation relies on.
        </p>

        {/* Pricing card */}
        <div style={{
          background  : T.parchment,
          border      : `1px solid ${T.goldLight}`,
          borderRadius: 14,
          padding     : '20px 22px',
          marginBottom: 22,
          textAlign   : 'left',
        }}>
          <div style={{
            fontSize     : 11,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            color        : T.goldDark,
            fontWeight   : 700,
            marginBottom : 8,
          }}>
            Church Pro
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
            <span style={{ fontFamily: T.display, fontSize: 38, fontWeight: 700, color: T.ink, letterSpacing: '-0.03em' }}>
              $19
            </span>
            <span style={{ fontSize: 15, color: T.inkSoft }}>/mo per church</span>
          </div>
          <div style={{ fontSize: 12.5, color: T.inkMuted, marginBottom: 16 }}>Cancel any time</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {features.map((f) => (
              <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: T.ink }}>
                <span style={{ color: T.gold, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>

        <a
          href={href}
          style={{
            display     : 'block',
            width       : '100%',
            background  : T.ink,
            color       : T.cream,
            border      : 'none',
            borderRadius: 999,
            padding     : '14px 20px',
            fontSize    : 15,
            fontWeight  : 600,
            cursor      : 'pointer',
            marginBottom: 10,
            textDecoration: 'none',
            boxSizing   : 'border-box',
            textAlign   : 'center',
          }}
        >
          Upgrade now → {PRO_PRICE}
        </a>

        <button
          onClick={onBack}
          style={{
            width     : '100%',
            background: 'none',
            color     : T.inkMuted,
            border    : 'none',
            padding   : '8px',
            fontSize  : 13,
            cursor    : 'pointer',
          }}
        >
          ← Go back
        </button>
      </div>

      <p style={{ marginTop: 20, fontSize: 12, color: T.inkMuted, textAlign: 'center', lineHeight: 1.6 }}>
        Questions? Email <a href={`mailto:${UPGRADE_EMAIL}`} style={{ color: T.goldDark }}>{UPGRADE_EMAIL}</a>
      </p>
    </div>
  );
}
