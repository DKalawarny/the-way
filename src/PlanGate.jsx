import { useEffect, useState } from 'react';
import { T } from './theme.js';
import { supabase } from './supabase.js';
import { CHURCH_BASE_PRICE, CHURCH_PRO_PRICE, UPGRADE_EMAIL, TRIAL_DAYS, PAYMENTS_LIVE } from './usePlan.js';
import { TRIAL_MSG_LIMIT } from './useSermonAiUsage.js';
import { includedMembers, seatBlocksNeeded, SEAT_BLOCK_SIZE, SEAT_BLOCK_PRICE } from './planConfig.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';
import { isNativeApp } from './native.js';

// Starts a Stripe Checkout for a church plan ('church_base' | 'church_pro').
// Mirrors UpgradeModal.startCheckout — the create-checkout edge function +
// stripe-webhook already handle church plans (sets pastor's profiles.plan and
// marks the church verified). Redirects on success; returns { error } on failure.
export async function startChurchCheckout(session, plan) {
  // Stripe checkout can't round-trip back into the native app shell — church
  // plans are managed on the web until an IAP/native flow exists.
  if (isNativeApp) return { error: "Upgrades aren't available in the app yet." };
  if (!session?.user) return { error: 'Please sign in again.' };
  try {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          price_plan: plan,
          user_id:    session.user.id,
          user_email: session.user.email,
          return_url: window.location.origin,
        }),
      }
    );
    const data = await res.json();
    if (data.url) { window.location.href = data.url; return {}; }
    return { error: data.error ?? 'Something went wrong. Try again.' };
  } catch {
    return { error: 'Could not reach the payment service. Try again.' };
  }
}

/* ── Seat nudge ───────────────────────────────────────────────────────────────
   Shown to the pastor when the congregation has grown past the plan's included
   members. A gentle "you've grown" prompt with one-click add-seats — never a
   wall, and invisible to members. Renders nothing when the church is within its
   limit (or not on a paid/trial church plan). Self-contained: fetches its own
   member count. Note: `seatBlocks` is read as 0 until a churches.seat_blocks
   column + webhook sync exist — wire that at Stripe go-live so the nudge clears
   after a pastor buys seats. */
export function SeatNudge({ churchId, plan, session, seatBlocks = 0 }) {
  const [memberCount, setMemberCount] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState(null);

  useEffect(() => {
    if (!churchId) return;
    let cancelled = false;
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('church_id', churchId)
      .then(({ count }) => { if (!cancelled) setMemberCount(count ?? 0); }, () => {});
    return () => { cancelled = true; };
  }, [churchId]);

  if (memberCount == null) return null;
  const blocks = seatBlocksNeeded(memberCount, plan, seatBlocks);
  if (blocks <= 0) return null;

  const included = includedMembers(plan, seatBlocks);

  async function addSeats() {
    setBusy(true); setErr(null);
    const { error } = await startChurchCheckout(session, 'church_seats');
    if (error) { setErr(error); setBusy(false); }
  }

  return (
    <div style={{
      background: T.parchment,
      border: `1px solid ${T.gold}`,
      borderRadius: 14,
      padding: '16px 18px',
      margin: '16px 16px 0',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <KinwoveStar size={15} />
        <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 600, color: T.ink }}>
          Your congregation has grown past {included} — that's a joy to see.
        </div>
      </div>
      <div style={{ fontFamily: T.display, fontSize: 14.5, color: T.inkSoft, lineHeight: 1.55, marginBottom: 14, maxWidth: '60ch' }}>
        Because every member can lean on the AI companion, and that carries a real cost for us,
        plans grow gently with your church. Adding {SEAT_BLOCK_SIZE} seats keeps it running for
        everyone you're reaching — and helps us keep kinwove within reach for smaller churches too.
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <button
          onClick={addSeats}
          disabled={busy}
          style={{
            background: T.gold, color: T.white, border: 'none', borderRadius: 999,
            padding: '9px 20px', fontSize: 14, fontWeight: 600, cursor: busy ? 'default' : 'pointer',
            opacity: busy ? 0.7 : 1, fontFamily: T.sans,
          }}
        >
          {busy ? 'Opening checkout…' : `Add ${SEAT_BLOCK_SIZE} seats — $${SEAT_BLOCK_PRICE}/month`}
        </button>
        <span style={{ fontSize: 12, color: T.inkMuted }}>Secure checkout through Stripe. Cancel any time.</span>
      </div>
      {err && <div style={{ fontSize: 13, color: '#a53f2b', marginTop: 10 }}>{err}</div>}
    </div>
  );
}

/* ── Trial banner ────────────────────────────────────────────────────────────
   Shown at the top of ChurchAdmin while the trial is active.
   Designed to be noticed without nagging — progress bar communicates urgency
   visually, copy frames it around the congregation (not the product).
── */
export function TrialBanner({ daysLeft, session }) {
  const [busy, setBusy] = useState(false);
  const urgent  = daysLeft <= 7;
  const pct     = Math.max(0, Math.min(100, ((TRIAL_DAYS - daysLeft) / TRIAL_DAYS) * 100));

  const bg      = urgent
    ? 'linear-gradient(135deg, rgba(165,63,43,0.1) 0%, rgba(184,115,58,0.08) 100%)'
    : 'linear-gradient(135deg, rgba(184,115,58,0.1) 0%, rgba(184,115,58,0.05) 100%)';
  const borderColor = urgent ? 'rgba(165,63,43,0.35)' : 'rgba(184,115,58,0.3)';
  const accentColor = urgent ? '#A53F2B' : T.gold;

  // While payments are off, usePlan floors daysLeft at 14 so the tools stay
  // unlocked — but printing "14 days left" invents a countdown that isn't real
  // (this church's 35 days actually ran out on Aug 16). Say the true thing
  // instead; the honest version is also the better beta message.
  const dayLabel = !PAYMENTS_LIVE
    ? 'Free while we’re in beta'
    : daysLeft === 0
      ? 'Trial ends today'
      : daysLeft === 1
        ? '1 day left in your trial'
        : `${daysLeft} days left in your 5-week trial`;

  return (
    <div style={{
      background: bg,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: '10px 16px',
      marginBottom: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle left accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 3,
        background: `linear-gradient(180deg, ${accentColor} 0%, rgba(184,115,58,0.3) 100%)`,
        borderRadius: '12px 0 0 12px',
      }} />

      <div style={{ paddingLeft: 10 }}>
        {/* Single row: label + short copy + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 0 }}>
            <span style={{
              fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase',
              fontWeight: 700, color: accentColor,
            }}>
              {dayLabel}
            </span>
            <span style={{ fontSize: 12.5, color: T.inkSoft, marginLeft: 8 }}>
              {!PAYMENTS_LIVE
                ? '— every tool is open while we build this with you.'
                : urgent
                  ? '— upgrade before your tools go offline.'
                  : '— your first 30 days are on us.'}
            </span>
          </div>

          {/* Every other upgrade CTA is hidden while payments are off — this one
              wasn't, so it opened a SANDBOX checkout: test cards, no real
              purchase, a dead end for a pastor who actually wanted to pay. */}
          {PAYMENTS_LIVE && <button
            onClick={async () => {
              if (busy) return;
              setBusy(true);
              const { error } = await startChurchCheckout(session, 'church_base');
              if (error) setBusy(false); // redirect happens on success; reset to allow retry
            }}
            disabled={busy}
            style={{
              background: urgent
                ? 'linear-gradient(135deg, #A53F2B 0%, #7d2e1e 100%)'
                : `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`,
              color: '#FDF8EE',
              border: 'none',
              borderRadius: 999,
              padding: '6px 15px',
              fontSize: 12.5,
              fontWeight: 600,
              fontFamily: 'inherit',
              textDecoration: 'none',
              flexShrink: 0,
              display: 'inline-block',
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.7 : 1,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            {busy ? 'Opening…' : urgent ? 'Upgrade now' : `Keep my tools · from ${CHURCH_BASE_PRICE}`}
          </button>}
        </div>

        {/* Progress bar: shows how much of the trial has elapsed */}
        <div style={{
          height: 3, borderRadius: 2, marginTop: 8,
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
export function UpgradeWall({ onBack, session }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('church_base');
  const features = [
    { icon: '📊', text: 'Pastor dashboard & congregation insights' },
    { icon: '✍️', text: 'AI sermon composer — draft a full sermon in minutes' },
    { icon: '🤝', text: 'Care team — follow up personally with your flock' },
    { icon: '🗺️', text: 'Custom discipleship journeys & walk announcements' },
    { icon: '👥', text: 'Full congregation access & feed' },
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
            margin: '0 0 14px',
          }}>
            Your 5-week trial is up — but the people depending on your tools aren't going anywhere.
            Upgrade to keep your dashboard, care team, sermon tools, and congregation running.
          </p>
          <p style={{
            fontFamily: "'Lora', Georgia, serif",
            fontSize: 13,
            color: 'rgba(253,248,240,0.35)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Your subscription also helps keep kinwove free for individuals and churches who can't afford it.
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
          {/* Pricing tiers — tap to choose which plan to buy */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {[
              { plan: 'church_base', label: 'Church Base', price: CHURCH_BASE_PRICE, detail: 'Up to 150 members' },
              { plan: 'church_pro',  label: 'Church Pro',  price: CHURCH_PRO_PRICE,  detail: 'Unlimited congregation' },
            ].map((tier) => {
              const selected = selectedPlan === tier.plan;
              return (
                <button
                  key={tier.label}
                  onClick={() => setSelectedPlan(tier.plan)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                    width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                    padding: '12px 14px',
                    background: selected ? 'rgba(184,115,58,0.1)' : 'rgba(184,115,58,0.04)',
                    border: `1.5px solid ${selected ? T.gold : 'rgba(184,115,58,0.12)'}`,
                    borderRadius: 10,
                    transition: 'border-color 0.12s ease, background 0.12s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                    {/* Radio */}
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                      border: `1.5px solid ${selected ? T.gold : T.line}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selected && <div style={{ width: 9, height: 9, borderRadius: '50%', background: T.gold }} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: T.ink }}>{tier.label}</div>
                      <div style={{ fontSize: 12, color: T.inkMuted }}>{tier.detail}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.goldDark, flexShrink: 0 }}>{tier.price}</div>
                </button>
              );
            })}
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

          {/* CTA — buys the selected tier */}
          <button
            onClick={async () => {
              if (busy) return;
              setErr(null);
              setBusy(true);
              const { error } = await startChurchCheckout(session, selectedPlan);
              if (error) { setErr(error); setBusy(false); }
            }}
            disabled={busy}
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
              fontFamily: 'inherit',
              cursor: busy ? 'default' : 'pointer',
              opacity: busy ? 0.7 : 1,
              textDecoration: 'none',
              boxSizing: 'border-box',
              textAlign: 'center',
              boxShadow: '0 6px 24px rgba(184,115,58,0.4)',
              letterSpacing: '-0.01em',
              marginBottom: 8,
            }}
          >
            {busy
              ? 'Opening checkout…'
              : `Continue with ${selectedPlan === 'church_pro' ? 'Church Pro' : 'Church Base'} →`}
          </button>

          {/* Reassurance */}
          <div style={{
            textAlign: 'center',
            fontSize: 12,
            color: err ? T.error : T.inkMuted,
            lineHeight: 1.6,
            marginBottom: 16,
          }}>
            {err ?? 'Secure checkout through Stripe. Cancel any time.'}
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
