import { useEffect, useState } from 'react';
import { T } from './theme.js';

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  delay: Math.random() * 0.8,
  size: 4 + Math.random() * 6,
  color: [T.gold, T.goldLight, '#F5ECD9', '#E8DCC0', T.inkSoft][Math.floor(Math.random() * 5)],
  duration: 1.6 + Math.random() * 1.2,
}));

const particleCss = `
  @keyframes particle-rise {
    0%   { transform: translateY(0) scale(1); opacity: 1; }
    100% { transform: translateY(-120px) scale(0.3); opacity: 0; }
  }
  @keyframes glow-pulse {
    0%, 100% { box-shadow: 0 0 40px 0 rgba(196,129,58,0.3); }
    50%       { box-shadow: 0 0 80px 20px rgba(196,129,58,0.5); }
  }
  @keyframes scale-in {
    from { transform: scale(0.7); opacity: 0; }
    to   { transform: scale(1);   opacity: 1; }
  }
`;

export default function HomeFound({ tradition, name, onContinue }) {
  const [visible, setVisible] = useState(true);

  if (!visible) { onContinue(); return null; }

  return (
    <>
      <style>{particleCss}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: `linear-gradient(180deg, ${T.cream} 0%, ${T.parchment} 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          textAlign: 'center',
          padding: 32,
        }}
      >
        {/* Particles */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {PARTICLES.map((p) => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                bottom: '30%',
                left: `${p.x}%`,
                width: p.size,
                height: p.size,
                borderRadius: '50%',
                background: p.color,
                animation: `particle-rise ${p.duration}s ${p.delay}s ease-out both`,
              }}
            />
          ))}
        </div>

        {/* Candle glow orb */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${T.goldLight} 0%, ${T.gold} 50%, transparent 75%)`,
            animation: 'glow-pulse 2s ease-in-out infinite, scale-in 0.5s ease both',
            marginBottom: 32,
          }}
        />

        <div
          style={{
            fontSize: 12,
            letterSpacing: 3,
            textTransform: 'uppercase',
            color: T.goldDark,
            marginBottom: 16,
            animation: 'scale-in 0.5s 0.2s ease both',
          }}
        >
          Something shifted
        </div>

        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 600,
            color: T.ink,
            margin: '0 0 16px',
            lineHeight: 1.15,
            animation: 'scale-in 0.5s 0.35s ease both',
          }}
        >
          {name ? `${name},` : ''}<br />you found your home.
        </h1>

        <p
          style={{
            fontFamily: T.serif,
            fontSize: 20,
            color: T.goldDark,
            fontStyle: 'italic',
            margin: '0 0 12px',
            animation: 'scale-in 0.5s 0.5s ease both',
          }}
        >
          {tradition}
        </p>

        <p
          style={{
            fontFamily: T.serif,
            fontSize: 17,
            color: T.inkSoft,
            maxWidth: 420,
            lineHeight: 1.7,
            margin: '0 0 36px',
            animation: 'scale-in 0.5s 0.65s ease both',
          }}
        >
          We're glad you're here. This is yours to hold as loosely or as firmly as you need.
        </p>

        <button
          onClick={() => { setVisible(false); onContinue(); }}
          style={{
            background: T.ink,
            color: T.cream,
            border: 'none',
            borderRadius: 999,
            padding: '14px 32px',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            animation: 'scale-in 0.5s 0.8s ease both',
          }}
        >
          Start exploring →
        </button>
      </div>
    </>
  );
}
