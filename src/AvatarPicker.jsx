import { useState } from 'react';
import { T } from './theme.js';

export const AVATAR_STYLES = [
  { id: 'lorelei',            label: 'Portrait',    preview: 'Ruth' },
  { id: 'notionists-neutral', label: 'Line',        preview: 'Samuel' },
  { id: 'personas',           label: 'Friendly',    preview: 'Hannah' },
  { id: 'micah',              label: 'Modern',      preview: 'Caleb' },
  { id: 'open-peeps',         label: 'Hand-drawn',  preview: 'Naomi' },
  { id: 'big-ears-neutral',   label: 'Soft',        preview: 'Levi' },
];

export const AVATAR_COLORS = [
  { id: 'fdf8f0', label: 'Parchment' },
  { id: 'f5e6d3', label: 'Linen' },
  { id: 'fef3c7', label: 'Amber' },
  { id: 'ffedd5', label: 'Peach' },
  { id: 'f4dac4', label: 'Clay' },
  { id: 'e8e6cd', label: 'Olive' },
  { id: 'd1fae5', label: 'Sage' },
  { id: 'e5e0d8', label: 'Stone' },
];

const SEEDS = [
  'Lily','James','Grace','Noah','Faith','Elijah','Hope','Miriam',
  'Aaron','Ruth','Caleb','Esther','Levi','Naomi','Seth','Priya',
  'Tobias','Lydia','Samuel','Deborah','Ezra','Hannah','Joel','Rachel',
];

export function avatarUrl({ style = 'lorelei', seed = 'friend', bgColor = 'fdf8f0' } = {}) {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bgColor}&radius=50`;
}

export default function AvatarPicker({ current, onSave, onCancel }) {
  const [style, setStyle] = useState(current?.style ?? 'lorelei');
  const [seed, setSeed] = useState(current?.seed ?? 'Grace');
  const [bgColor, setBgColor] = useState(current?.bgColor ?? 'fdf8f0');
  const [seedPage, setSeedPage] = useState(0);

  const visibleSeeds = SEEDS.slice(seedPage * 8, seedPage * 8 + 8);
  const hasMore = (seedPage + 1) * 8 < SEEDS.length;

  const preview = avatarUrl({ style, seed, bgColor });

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(44,24,16,0.55)',
      zIndex: 70,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      animation: 'fadeIn 0.15s ease',
    }}>
      <div
        className="fade-up"
        style={{
          background: T.cream,
          borderRadius: 20,
          maxWidth: 500,
          width: '100%',
          overflow: 'hidden',
          border: `1px solid ${T.line}`,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Header + preview */}
        <div style={{
          background: T.parchment,
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderBottom: `1px solid ${T.line}`,
        }}>
          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.goldDark, marginBottom: 16 }}>
            Design your avatar
          </div>
          <img
            src={preview}
            alt="preview"
            width={110}
            height={110}
            style={{ borderRadius: '50%', border: `3px solid ${T.gold}`, background: `#${bgColor}` }}
          />
        </div>

        <div style={{ padding: 24 }}>

          {/* Style picker */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 10 }}>
              Style
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {AVATAR_STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyle(s.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '10px 8px',
                    borderRadius: 12,
                    border: `2px solid ${style === s.id ? T.gold : T.line}`,
                    background: style === s.id ? 'rgba(196,129,58,0.08)' : T.white,
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={avatarUrl({ style: s.id, seed: s.preview, bgColor })}
                    width={44}
                    height={44}
                    style={{ borderRadius: '50%' }}
                    alt={s.label}
                  />
                  <span style={{ fontSize: 11, color: style === s.id ? T.goldDark : T.inkMuted, fontWeight: style === s.id ? 600 : 400 }}>
                    {s.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Face picker */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 10 }}>
              Face
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6 }}>
              {visibleSeeds.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeed(s)}
                  style={{
                    padding: 2,
                    borderRadius: '50%',
                    border: `2px solid ${seed === s ? T.gold : 'transparent'}`,
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={avatarUrl({ style, seed: s, bgColor })}
                    width={40}
                    height={40}
                    style={{ borderRadius: '50%', display: 'block' }}
                    alt={s}
                  />
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 10 }}>
              {seedPage > 0 && (
                <button onClick={() => setSeedPage(p => p - 1)} style={{ background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', fontSize: 13 }}>
                  ← Previous
                </button>
              )}
              {hasMore && (
                <button onClick={() => setSeedPage(p => p + 1)} style={{ background: 'none', border: 'none', color: T.goldDark, cursor: 'pointer', fontSize: 13 }}>
                  More faces →
                </button>
              )}
            </div>
          </div>

          {/* Background color */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: T.inkMuted, marginBottom: 10 }}>
              Background
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setBgColor(c.id)}
                  title={c.label}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: `#${c.id}`,
                    border: `2px solid ${bgColor === c.id ? T.gold : T.line}`,
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => onSave({ style, seed, bgColor })}
              style={{
                flex: 1,
                background: T.ink,
                color: T.cream,
                border: 'none',
                borderRadius: 999,
                padding: '13px 20px',
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Save avatar
            </button>
            <button
              onClick={onCancel}
              style={{
                background: 'transparent',
                color: T.inkMuted,
                border: `1px solid ${T.line}`,
                borderRadius: 999,
                padding: '13px 20px',
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
