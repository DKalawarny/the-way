import { useState } from 'react';
import { T } from './theme.js';
import { isNativeApp } from './native.js';

const PLANS = [
  {
    id: 'premium',
    label: 'Premium',
    price: '$6.99',
    period: 'CAD / month',
    limit: '200 AI messages / month',
    features: [
      'Full Bible reading & notes',
      '200 AI faith conversations / month',
      'Full sermon discussion threads',
      'Prayer wall & walks',
      'Cancel anytime',
    ],
  },
  {
    id: 'premium_plus',
    label: 'Premium+',
    price: '$13.99',
    period: 'CAD / month',
    limit: '270 AI messages / month',
    featured: true,
    features: [
      'Everything in Premium',
      '270 AI faith conversations / month',
      'Priority response quality',
      'Early access to new features',
      'Cancel anytime',
    ],
  },
];

export default function UpgradeModal({ session, onClose }) {
  const [loading, setLoading] = useState(null); // plan id while loading
  const [error, setError] = useState(null);

  // Stripe checkout can't round-trip back into the app shell, and App Store
  // rules don't allow selling subscriptions outside IAP — no plans in native.
  if (isNativeApp) {
    return (
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 450,
          background: 'rgba(26,17,8,0.55)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: T.parchment, borderRadius: '20px 20px 0 0',
            padding: '28px 22px calc(40px + env(safe-area-inset-bottom, 0px))',
            width: '100%', maxWidth: 480, textAlign: 'center',
          }}
        >
          <div style={{ width: 36, height: 4, background: T.line, borderRadius: 999, margin: '0 auto 24px' }} />
          <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 600, color: T.ink, marginBottom: 8 }}>
            Upgrades aren't available in the app yet
          </div>
          <div style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.6, marginBottom: 22 }}>
            Everything you already have keeps working right here.
          </div>
          <button
            onClick={onClose}
            style={{ background: T.ink, color: T.cream, border: 'none', borderRadius: 999, padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  async function startCheckout(planId) {
    if (!session?.user) return;
    setLoading(planId);
    setError(null);
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
            price_plan: planId,
            user_id:    session.user.id,
            user_email: session.user.email,
            return_url: window.location.origin,
          }),
        }
      );
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Something went wrong. Try again.');
        setLoading(null);
      }
    } catch {
      setError('Could not reach payment service. Try again.');
      setLoading(null);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 450,
        background: 'rgba(26,17,8,0.55)',
        display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.parchment,
          borderRadius: '20px 20px 0 0',
          padding: '28px 22px 40px',
          width: '100%',
          maxWidth: 480,
          maxHeight: '92vh',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: T.line, borderRadius: 999, margin: '0 auto 24px' }} />

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.ink, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 6 }}>
            Unlock more of kinwove
          </div>
          <div style={{ fontSize: 14, color: T.inkMuted, lineHeight: 1.6 }}>
            Deeper conversations and higher weekly limits.
          </div>
        </div>

        {/* Plan cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          {PLANS.map((p) => (
            <div
              key={p.id}
              style={{
                background: p.featured ? 'rgba(184,115,58,0.08)' : '#fff',
                border: `1.5px solid ${p.featured ? T.gold : T.line}`,
                borderRadius: 16,
                padding: '18px 20px',
                position: 'relative',
              }}
            >
              {p.featured && (
                <div style={{
                  position: 'absolute', top: -11, left: 18,
                  background: T.gold, color: T.cream,
                  fontSize: 10, fontWeight: 700, letterSpacing: 2,
                  textTransform: 'uppercase', padding: '3px 12px', borderRadius: 999,
                }}>
                  Best value
                </div>
              )}

              {/* Price row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 2 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: T.inkMuted }}>{p.limit}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 600, color: T.gold, letterSpacing: '-0.02em' }}>{p.price}</div>
                  <div style={{ fontSize: 11, color: T.inkMuted }}>{p.period}</div>
                </div>
              </div>

              {/* Features */}
              <ul style={{ margin: '0 0 16px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {p.features.map((f) => (
                  <li key={f} style={{ fontSize: 13, color: T.inkSoft, display: 'flex', alignItems: 'flex-start', gap: 7 }}>
                    <span style={{ color: T.gold, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => startCheckout(p.id)}
                disabled={!!loading}
                style={{
                  width: '100%',
                  background: loading === p.id || !loading
                    ? (p.featured
                        ? `linear-gradient(135deg, ${T.gold} 0%, #c47020 100%)`
                        : 'transparent')
                    : 'transparent',
                  border: p.featured ? 'none' : `1.5px solid ${T.gold}`,
                  borderRadius: 999,
                  padding: '13px',
                  fontSize: 14, fontWeight: 600,
                  color: p.featured ? T.cream : T.gold,
                  cursor: loading ? 'wait' : 'pointer',
                  opacity: loading && loading !== p.id ? 0.45 : 1,
                  boxShadow: p.featured && !loading ? '0 4px 16px rgba(184,115,58,0.3)' : 'none',
                  transition: 'opacity 0.15s',
                }}
              >
                {loading === p.id ? 'Opening checkout…' : `Get ${p.label} →`}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ textAlign: 'center', fontSize: 13, color: '#A53F2B', marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: 12, color: T.inkMuted, lineHeight: 1.6 }}>
          Secure payment via Stripe · Cancel anytime
          <br />
          <span style={{ fontStyle: 'italic' }}>Your plan helps keep kinwove free for those who can't afford it.</span>
        </div>

        <button
          onClick={onClose}
          style={{
            display: 'block', margin: '18px auto 0',
            background: 'none', border: 'none',
            fontSize: 13, color: T.inkMuted,
            cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
