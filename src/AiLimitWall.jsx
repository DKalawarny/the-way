import { useState, useEffect } from 'react';
import { T } from './theme.js';
import { TOPUP_MESSAGES, TOPUP_PRICE, PLAN_LIMITS } from './useAiUsage.js';
import { supabase } from './supabase.js';

// Compute the current billing period string (matches useAiUsage logic)
function currentPeriod(plan) {
  const cfg = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  if (cfg.period === 'lifetime') return 'lifetime';
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Small inline banner shown when user is getting close (≤3 remaining) ──────
export function AiUsageWarning({ remaining }) {
  if (remaining > 3) return null;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: '5px 16px',
      background: 'rgba(165,63,43,0.06)',
      borderBottom: `1px solid rgba(165,63,43,0.18)`,
      flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, color: '#A53F2B', fontWeight: 600 }}>
        {remaining === 0 ? 'No AI messages left' : `${remaining} AI message${remaining === 1 ? '' : 's'} left`}
      </span>
    </div>
  );
}

// ── Full limit wall — replaces the input when at limit ───────────────────────
export default function AiLimitWall({ plan, panelMode, onTopupSuccess }) {
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
      window.open(`mailto:hello@theway.app?subject=Upgrade%20to%20${pricePlan}`);
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
      window.open('mailto:hello@theway.app?subject=AI%20Top-up');
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
            <div style={{ fontSize: 22, marginBottom: 8 }}>✦</div>
            <div style={{
              fontFamily: T.display, fontSize: 18, fontWeight: 600,
              color: T.ink, marginBottom: 6, letterSpacing: '-0.01em',
            }}>
              You've experienced kinwove
            </div>
            <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, maxWidth: 300 }}>
              Unlock unlimited conversations, deeper study, and everything kinwove has to offer.
            </div>
          </div>

          <div style={{
            background: T.parchment, border: `1px solid ${T.goldLight}`,
            borderRadius: 14, padding: '16px 20px', width: '100%', maxWidth: 320,
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PriceRow label="Premium" price="$7.99/mo" detail="150 AI messages/month" />
              <PriceRow label="Premium+" price="$14.99/mo" detail="500 AI messages/month" highlight />
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
        </>
      ) : (
        // ── Paid user hit monthly cap — offer top-up ─────────────────────────
        <>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13.5, color: T.inkSoft, lineHeight: 1.6, maxWidth: 300 }}>
              You've used all your AI messages for this month. They reset on your next billing date — or top up now to keep going.
            </div>
          </div>

          <div style={{
            background: T.parchment, border: `1px solid ${T.goldLight}`,
            borderRadius: 14, padding: '16px 20px', width: '100%', maxWidth: 320,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: T.display, color: T.ink, letterSpacing: '-0.02em' }}>
              {TOPUP_PRICE}
            </div>
            <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 2 }}>
              {TOPUP_MESSAGES} more AI messages · added instantly
            </div>
          </div>

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

          <div style={{ fontSize: 12, color: T.inkMuted, textAlign: 'center' }}>
            Messages reset automatically each month.
          </div>
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
