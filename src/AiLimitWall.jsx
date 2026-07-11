import { useState, useEffect } from 'react';
import { T } from './theme.js';
import { TOPUP_MESSAGES, TOPUP_PRICE, PLAN_LIMITS } from './useAiUsage.js';
import { supabase } from './supabase.js';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

// ── Promo code redemption ─────────────────────────────────────────────────────
export function PromoCodeInput({ onSuccess }) {
  const [code, setCode]       = useState('');
  const [status, setStatus]   = useState(null); // null | 'loading' | 'ok' | string (error)
  const [open, setOpen]       = useState(false);

  async function handleRedeem() {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setStatus('loading');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setStatus('Sign in to redeem a code.'); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/redeem-promo`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code: trimmed, user_id: session.user.id }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setStatus('ok');
        onSuccess?.();
        // The new plan lives on the profile — a reload is the one sure way
        // every surface (walls, counters, model tier) picks it up.
        setTimeout(() => window.location.reload(), 1600);
      } else {
        setStatus(json.error ?? 'Something went wrong.');
      }
    } catch {
      setStatus('Something went wrong. Try again.');
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: T.inkMuted, textDecoration: 'underline', padding: 0 }}
      >
        Have a promo code?
      </button>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRedeem()}
          placeholder="Enter promo code"
          autoFocus
          style={{
            flex: 1, padding: '10px 12px', borderRadius: 8,
            border: `1px solid ${T.line}`, fontSize: 13,
            fontFamily: 'monospace', background: T.white, color: T.ink,
            outline: 'none',
          }}
        />
        <button
          onClick={handleRedeem}
          disabled={status === 'loading'}
          style={{
            padding: '10px 16px', borderRadius: 8, border: 'none',
            background: T.ink, color: T.cream, fontSize: 13, fontWeight: 600,
            cursor: status === 'loading' ? 'wait' : 'pointer',
            opacity: status === 'loading' ? 0.7 : 1,
          }}
        >
          {status === 'loading' ? '…' : 'Apply'}
        </button>
      </div>
      {status && status !== 'loading' && (
        <div style={{ fontSize: 12, color: status === 'ok' ? '#2d7a2d' : '#A53F2B', textAlign: 'center' }}>
          {status === 'ok' ? '✓ Code applied! 3 months of Individual unlocked.' : status}
        </div>
      )}
    </div>
  );
}

// Compute the current billing period string (matches useAiUsage logic)
function currentPeriod(plan) {
  const cfg = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  if (cfg.period === 'lifetime') return 'lifetime';
  const d = new Date();
  if (cfg.period === 'weekly') {
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `W${mon.getFullYear()}${String(mon.getMonth() + 1).padStart(2, '0')}${String(mon.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Inline usage warning — two tiers:
//    amber at ≥80% used ("X messages left this month")
//    red   at ≤3 remaining ("3 messages left — reset Monday" etc.)
export function AiUsageWarning({ remaining, limit = 0, plan }) {
  if (remaining <= 0) return null;

  const isFree     = plan === 'free' || !plan;
  const pct        = limit > 0 ? remaining / limit : 1;
  const isCritical = remaining <= 3;
  const isWarning  = !isCritical && pct <= 0.2; // ≥80% used

  if (!isCritical && !isWarning) return null;

  const periodLabel = isFree ? 'this week' : 'this month';

  if (isCritical) {
    const label = isFree
      ? (remaining === 0
          ? 'No free questions left this week'
          : `${remaining} free question${remaining === 1 ? '' : 's'} left this week`)
      : `${remaining} message${remaining === 1 ? '' : 's'} left ${periodLabel}`;
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '5px 16px',
        background: 'rgba(165,63,43,0.06)',
        borderBottom: '1px solid rgba(165,63,43,0.18)',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 11, color: '#A53F2B', fontWeight: 600 }}>{label}</span>
      </div>
    );
  }

  // Amber 80% nudge
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '5px 16px',
      background: 'rgba(184,115,58,0.06)',
      borderBottom: `1px solid rgba(184,115,58,0.18)`,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, color: T.goldDark, fontWeight: 600 }}>
        {remaining} messages left {periodLabel}
      </span>
    </div>
  );
}

// ── Full limit wall — replaces the input when at limit ───────────────────────
export default function AiLimitWall({ plan, panelMode, onTopupSuccess }) {
  // Promo codes upgrade the PERSONAL plan — on church-plan walls (Study tab
  // etc.) they can't unlock anything, so offering one there just confuses.
  const isChurchPlan = ['trial', 'church_base', 'church_pro'].includes(plan);
  const isFree = plan === 'free' || !plan;
  const [session, setSession] = useState(null);
  const [upgrading, setUpgrading] = useState(null); // null | 'premium' | 'premium_plus' | 'topup'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
  }, []);

  async function callEdgeFn(fnName, body) {
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${fnName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      }
    );
    return res.json();
  }

  async function handleUpgrade(pricePlan) {
    if (!session?.user) { window.location.href = '/?signin=1'; return; }
    setUpgrading(pricePlan);
    try {
      const { url } = await callEdgeFn('create-checkout', {
        price_plan: pricePlan,
        user_id: session.user.id,
        user_email: session.user.email,
        return_url: window.location.origin,
      });
      if (url) window.location.href = url;
    } catch {
      window.open(`mailto:hello@kinwove.app?subject=Upgrade%20to%20${pricePlan}`);
    } finally {
      setUpgrading(null);
    }
  }

  async function handleTopup() {
    if (!session?.user) { window.location.href = '/?signin=1'; return; }
    setUpgrading('topup');
    try {
      const { url } = await callEdgeFn('create-topup-checkout', {
        user_id: session.user.id,
        user_email: session.user.email,
        period: currentPeriod(plan),
        return_url: window.location.origin,
      });
      if (url) window.location.href = url;
    } catch {
      window.open('mailto:hello@kinwove.app?subject=AI%20Top-up');
    } finally {
      setUpgrading(null);
    }
  }

  return (
    <div style={{
      borderTop: `1px solid ${T.line}`,
      padding: '20px 20px',
      paddingBottom: panelMode ? 20 : 36,
      background: T.white,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
    }}>
      {isFree ? (
        // ── Free user hit lifetime cap ───────────────────────────────────────
        <>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, marginBottom: 8 }}><KinwoveStar size={22} /></div>
            <div style={{
              fontFamily: T.display, fontSize: 18, fontWeight: 600,
              color: T.ink, marginBottom: 6, letterSpacing: '-0.01em',
            }}>
              That's your 5 free questions this week
            </div>
            <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, maxWidth: 300 }}>
              Your free questions reset every Monday.
            </div>
          </div>

          <div style={{
            background: T.parchment, border: `1px solid ${T.goldLight}`,
            borderRadius: 12, padding: '14px 18px', width: '100%', maxWidth: 320,
          }}>
            <div style={{ fontSize: 12.5, color: T.inkSoft, lineHeight: 1.65, fontFamily: T.serif, fontStyle: 'italic', textAlign: 'center' }}>
              Every answer is generated live by one of the world's most advanced AI systems — that has a real cost. Subscribers make it possible to offer free questions to everyone.
            </div>
          </div>

          <div style={{
            background: T.parchment, border: `1px solid ${T.goldLight}`,
            borderRadius: 14, padding: '16px 20px', width: '100%', maxWidth: 320,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PriceRow label="Individual" price="$6.99 CAD/mo" detail="200 msgs/mo · Standard AI" />
              <PriceRow label="Individual Pro" price="$13.99 CAD/mo" detail="270 msgs/mo · Deep Study AI" highlight />
            </div>
          </div>

          <button
            onClick={() => handleUpgrade('premium')}
            disabled={!!upgrading}
            style={{
              ...ctaStyle(T.ink),
              border: 'none',
              cursor: upgrading ? 'wait' : 'pointer',
              opacity: upgrading ? 0.7 : 1,
            }}
          >
            {upgrading === 'premium' ? 'Redirecting\u2026' : 'Upgrade now \u2192'}
          </button>

          {!isChurchPlan && <PromoCodeInput onSuccess={onTopupSuccess ?? (() => window.location.reload())} />}
        </>
      ) : (
        // ── Paid user hit monthly cap — offer top-up ─────────────────────────
        <>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, maxWidth: 300 }}>
              You've used all your AI messages for this month. They reset on your next billing date — or top up now to keep going.
            </div>
            <div style={{ fontSize: 12, color: T.inkMuted, lineHeight: 1.6, maxWidth: 280, marginTop: 8, fontFamily: T.serif, fontStyle: 'italic' }}>
              Thank you for subscribing — your support keeps kinwove open to everyone, no matter where they are or what they can pay.
            </div>
          </div>

          <div style={{
            background: T.parchment, border: `1px solid ${T.goldLight}`,
            borderRadius: 14, padding: '16px 20px', width: '100%', maxWidth: 320,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.serif, color: T.ink, letterSpacing: '-0.02em' }}>
              {TOPUP_PRICE}
            </div>
            <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 2 }}>
              {TOPUP_MESSAGES} more AI messages · added instantly
            </div>
          </div>

          {!isChurchPlan && <PromoCodeInput onSuccess={onTopupSuccess ?? (() => window.location.reload())} />}

          <button
            onClick={handleTopup}
            disabled={!!upgrading}
            style={{
              ...ctaStyle(T.ink),
              border: 'none',
              cursor: upgrading ? 'wait' : 'pointer',
              opacity: upgrading ? 0.7 : 1,
            }}
          >
            {upgrading === 'topup' ? 'Redirecting\u2026' : `Top up ${TOPUP_PRICE} \u2192 ${TOPUP_MESSAGES} messages`}
          </button>
        </>
      )}
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function PriceRow({ label, price, detail, highlight }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      padding: '10px 12px',
      background: highlight ? T.white : 'transparent',
      borderRadius: 10,
      border: highlight ? `1px solid ${T.goldLight}` : 'none',
    }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{label}</div>
        <div style={{ fontSize: 11.5, color: T.inkMuted }}>{detail}</div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: T.goldDark, flexShrink: 0 }}>{price}</div>
    </div>
  );
}

function ctaStyle(bg) {
  return {
    display: 'block',
    width: '100%',
    maxWidth: 320,
    background: bg,
    color: T.cream,
    borderRadius: 999,
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    textAlign: 'center',
    boxSizing: 'border-box',
  };
}
