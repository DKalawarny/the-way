import { T } from './theme.js';
import { CHURCH_BASE_PRICE, CHURCH_PRO_PRICE, UPGRADE_EMAIL, TRIAL_DAYS } from './usePlan.js';
import { TRIAL_MSG_LIMIT } from './useSermonAiUsage.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

const subject = encodeURIComponent('kinwove — Church Pro upgrade');
const body    = encodeURIComponent('Hi, I would like to upgrade my church to kinwove Pro.');
const href    = `mailto:${UPGRADE_EMAIL}?subject=${subject}&body=${body}`;

/* ── Trial banner ────────────────────────────────────────────────────────────
   Shown at the top of ChurchAdmin while the trial is active.
   Designed to be noticed without nagging — progress bar communicates urgency
   visually, copy frames it around the congregation (not the product).
── */
export function TrialBanner({ daysLeft }) {
  const urgent  = daysLeft <= 7;
  const pct     = Math.max(0, Math.min(100, ((TRIAL_DAYS - daysLeft) / TRIAL_DAYS) * 100));

  const bg      = urgent
    ? 'linear-gradient(135deg, rgba(165,63,43,0.1) 0%, rgba(184,115,58,0.08) 100%)'
    : 'linear-gradient(135deg, rgba(184,115,58,0.1) 0%, rgba(184,115,58,0.05) 100%)';
  const borderColor = urgent ? 'rgba(165,63,43,0.35)' : 'rgba(184,115,58,0.3)';
  const accentColor = urgent ? '#A53F2B' : T.gold;

  const dayLabel = daysLeft === 0
    ? 'Trial ends today'
    : daysLeft === 1
      ? '1 day left in your trial'
      : `${daysLeft} days left in your 5-week trial`;

  return (
    <div style={{
      background: bg,
      border: `1px solid ${borderColor}`,
      borderRadius: 14,
      padding: '16px 18px',
      marginBottom: 24,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle left accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
        background: `linear-gradient(180deg, ${accentColor} 0%, rgba(184,115,58,0.3) 100%)`,
        borderRadius: '14px 0 0 14px',
      }} />

      <div style={{ paddingLeft: 10 }}>
        {/* Top row: label + CTA */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div>
            <div style={{
              fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase',
              fontWeight: 700, color: accentColor, marginBottom: 3,
            }}>
              {dayLabel}
            </div>
            <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5, maxWidth: 340 }}>
              {urgent
                ? "Your congregation's tools are about to go offline. Keep them running — upgrade before your trial ends."
                : 'Your first 30 days are on us. Upgrade anytime to keep your pastor tools and congregation features running.'}
            </div>
          </div>

          <a
            href={href}
            style={{
              background: urgent
                ? 'linear-gradient(135deg, #A53F2B 0%, #7d2e1e 100%)'
                : `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
              color: '#FDF8EE',
              borderRadius: 999,
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              flexShrink: 0,
              display: 'inline-block',
              boxShadow: urgent
                ? '0 3px 12px rgba(165,63,43,0.3)'
                : '0 3px 12px rgba(184,115,58,0.3)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {urgent ? 'Upgrade now' : `Keep my tools · from ${CHURCH_BASE_PRICE}`}
          </a>
        </div>

        {/* Progress bar: shows how much of the trial has elapsed */}
        <div style={{
          height: 4, borderRadius: 2,
          background: 'rgba(44,24,16,0.08)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 2,
            background: urgent
              ? 'linear-gradient(90deg, #A53F2B, rgba(184,115,58,0.7))'
              : `linear-gradient(90deg, ${T.gold}, rgba(184,115,58,0.5))`,
            transition: 'width 0.4s ease',
          }} />
        </div>
      </div>
    </div>
  );
}

/* ── UpgradeWall ─────────────────────────────────────────────────────────────
   Full-page shown when trial has expired. Two-panel card design:
   dark editorial header (mission/emotional) → light pricing section (rational).
   CTA is gold and prominent. Copy frames around the congregation, not the plan.
── */
export function UpgradeWall({ onBack }) {
  const features = [
    { icon: '📊', text: 'Pastor dashboard & congregation insights' },
    { icon: '✍️', text: 'AI sermon composer — draft a full sermon in minutes' },
    { icon: '🤝', text: 'Care team — follow up personally with your flock' },
    { icon: '🗺️', text: 'Custom discipleship journeys & walk announcements' },
    { icon: '👥', text: 'Unlimited church members & congregation feed' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, #1A0E07 0%, #2C1810 40%, ${T.cream} 100%)`,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px 60px',
    }}>
      <div style={{
        maxWidth: 460,
        width: '100%',
      }}>

        {/* ── Dark hero card ── */}
        <div style={{
          background: 'linear-gradient(150deg, #1E1008 0%, #2C1810 60%, #1A0E07 100%)',
          borderRadius: '20px 20px 0 0',
          padding: '36px 32px 32px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(184,115,58,0.2)',
          borderBottom: 'none',
        }}>
          {/* Decorative gold rings */}
          <div style={{ position: 'absolute', top: -50, right: -50, width: 160, height: 160, borderRadius: '50%', border: '1px solid rgba(184,115,58,0.1)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: -25, right: -25, width: 100, height: 100, borderRadius: '50%', border: '1px solid rgba(184,115,58,0.08)', pointerEvents: 'none' }} />

          {/* Gold top accent */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent 0%, ${T.gold} 40%, rgba(184,115,58,0.4) 100%)`,
          }} />

          {/* Icon */}
          <div style={{
            width: 60, height: 60, borderRadius: '50%',
            background: 'rgba(184,115,58,0.15)',
            border: '1px solid rgba(184,115,58,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 22px',
            boxShadow: '0 0 32px rgba(184,115,58,0.2)',
          }}>
            <KinwoveStar size={26} style={{ filter: 'drop-shadow(0 0 8px rgba(184,115,58,0.6))' }} />
          </div>

          <div style={{
            fontSize: 10, letterSpacing: 2.5, textTransform: 'uppercase',
            color: 'rgba(184,115,58,0.7)', fontWeight: 700, marginBottom: 12,
          }}>
            Church Pro
          </div>

          <h2 style={{
            fontFamily: T.display,
            fontSize: 30,
            fontWeight: 600,
            color: 'rgba(253,248,240,0.95)',
            margin: '0 0 14px',
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
          }}>
            Your congregation<br />is still here.
          </h2>

          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 15,
            color: 'rgba(253,248,240,0.55)',
            lineHeight: 1.7,
            margin: 0,
          }}>
            Your 5-week trial is up — but the people depending on your tools aren't going anywhere.
            Upgrade to keep your dashboard, care team, sermon tools, and congregation running.
          </p>
        </div>

        {/* ── Light pricing card ── */}
        <div style={{
          background: T.white,
          border: '1px solid rgba(184,115,58,0.18)',
          borderTop: 'none',
          borderRadius: '0 0 20px 20px',
          padding: '28px 32px 32px',
        }}>
          {/* Pricing tiers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {[
              { label: 'Church Base', price: CHURCH_BASE_PRICE, detail: 'Up to 150 members' },
              { label: 'Church Pro',  price: CHURCH_PRO_PRICE,  detail: 'Unlimited congregation' },
            ].map((tier) => (
              <div key={tier.label} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(184,115,58,0.04)',
                border: '1px solid rgba(184,115,58,0.12)',
                borderRadius: 10,
              }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{tier.label}</div>
                  <div style={{ fontSize: 12, color: T.inkMuted }}>{tier.detail}</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.goldDark, flexShrink: 0 }}>{tier.price}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: T.inkMuted, marginBottom: 22 }}>
            Cancel any time. No contracts. No lock-in.
          </div>

          {/* Features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
            {features.map((f) => (
              <div key={f.text} style={{
                display: 'flex', alignItems: 'flex-start', gap: 11,
                padding: '10px 14px',
                background: 'rgba(184,115,58,0.04)',
                border: '1px solid rgba(184,115,58,0.1)',
                borderRadius: 10,
              }}>
                <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1.4 }}>{f.icon}</span>
                <span style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.5 }}>{f.text}</span>
              </div>
            ))}
          </div>

          {/* CTA */}
          <a
            href={href}
            style={{
              display: 'block',
              width: '100%',
              background: `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
              color: '#FDF8EE',
              border: 'none',
              borderRadius: 999,
              padding: '16px 20px',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
              boxSizing: 'border-box',
              textAlign: 'center',
              boxShadow: '0 6px 24px rgba(184,115,58,0.4)',
              letterSpacing: '-0.01em',
              marginBottom: 8,
            }}
          >
            Keep my church active →
          </a>

          {/* Reassurance */}
          <div style={{
            textAlign: 'center',
            fontSize: 12,
            color: T.inkMuted,
            lineHeight: 1.6,
            marginBottom: 16,
          }}>
            We'll confirm by email. Usually live within minutes.
          </div>

          <button
            onClick={onBack}
            style={{
              width: '100%',
              background: 'none',
              color: T.inkMuted,
              border: 'none',
              padding: '8px',
              fontSize: 13,
              cursor: 'pointer',
              letterSpacing: 0.1,
            }}
          >
            ← Go back
          </button>
        </div>

        {/* Support note */}
        <p style={{
          marginTop: 18, fontSize: 12, color: 'rgba(253,248,240,0.45)',
          textAlign: 'center', lineHeight: 1.6,
        }}>
          Questions?{' '}
          <a href={`mailto:${UPGRADE_EMAIL}`} style={{ color: 'rgba(184,115,58,0.8)', textDecoration: 'none' }}>
            {UPGRADE_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}

/* ── SermonAiNudge ───────────────────────────────────────────────────────────
   Quiet inline counter shown next to the sermon composer generate button.
   - Trial users: shows "X of 100 AI uses remaining"
   - Free users: shows "X of 3 free AI sermons remaining"
   - At limit: nothing — the gate replaces the button upstream
   - Paid: nothing — unlimited
── */
export function SermonAiNudge({ remaining, isTrial, isFree }) {
  if (!isFree && !isTrial) return null;
  if (remaining <= 0) return null;

  // Only show when running low — no need to show the count when plenty remain
  const lowThreshold = isTrial ? 10 : 1;
  if (remaining > lowThreshold) return null;

  const label = isTrial
    ? `${remaining} AI uses left in your trial`
    : `${remaining} free ${remaining === 1 ? 'sermon' : 'sermons'} left`;

  return (
    <span style={{
      fontSize: 12,
      color: '#A53F2B',
      fontStyle: 'italic',
      marginLeft: 12,
    }}>
      {label}
    </span>
  );
}
