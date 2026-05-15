import { useEffect, useState } from 'react';
import { Users, Building2 } from 'lucide-react';
import { T } from './theme.js';

// ── FindButton ─────────────────────────────────────────────────────────────
// Fixed-position FAB that lives in the top-right icon row beside
// MessagesButton and NotificationsBell. Clicking opens a small dropdown
// with "Find a friend" and "Find a church" options.
//
// Slot positions (button = 44px wide, gap = 8px):
//   Desktop  (TopRightMenu lives in sidebar, not rendered as FAB)
//     slot 0 (rightmost) = Messages      right = rightOffset + 12
//     slot 1             = Notifications right = rightOffset + 64
//     slot 2             = Find          right = rightOffset + 116   ← this component
//
//   Mobile   (TopRightMenu ⋮ FAB is rendered)
//     slot 0 (rightmost) = ⋮             right = rightOffset + 12
//     slot 1             = Messages      right = rightOffset + 64
//     slot 2             = Notifications right = rightOffset + 116
//     slot 3             = Find          right = rightOffset + 168   ← this component

export default function FindButton({
  isDesktop = false,
  rightOffset = 0,
  onFindPeople,
  onFindChurches,
}) {
  const [open, setOpen] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // On mobile these options live in the ⋮ TopRightMenu to avoid 4-FAB overflow
  if (!isDesktop) return null;

  const right = isDesktop
    ? rightOffset + 12 + 2 * (44 + 8)   // 116
    : rightOffset + 12 + 3 * (44 + 8);  // 168

  const fabStyle = {
    position: 'fixed',
    top: isDesktop ? 6 : 'calc(env(safe-area-inset-top, 0px) + 10px)',
    right,
    width: 44, height: 44, borderRadius: '50%',
    background: T.white, border: `1px solid ${T.line}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', zIndex: 160,
    boxShadow: '0 2px 8px rgba(44,24,16,0.10)',
    color: T.inkSoft, padding: 0,
    transition: 'background 0.15s, color 0.15s',
  };

  const menuItems = [
    onFindPeople    && { Icon: Users,      label: 'Find a friend',  onClick: onFindPeople },
    onFindChurches  && { Icon: Building2,  label: 'Find a church',  onClick: onFindChurches },
  ].filter(Boolean);

  if (!menuItems.length) return null;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Find a friend or church"
        title="Find a friend or church"
        style={fabStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(184,115,58,0.08)'; e.currentTarget.style.color = T.goldDark; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = T.white; e.currentTarget.style.color = T.inkSoft; }}
      >
        {/* People + magnifying glass composite icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <circle cx="19" cy="11" r="3"/>
          <line x1="21.5" y1="13.5" x2="23" y2="15"/>
        </svg>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 299 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: isDesktop ? 56 : 'calc(env(safe-area-inset-top, 0px) + 56px)',
              right,
              background: T.white,
              borderRadius: 14,
              border: `1px solid ${T.line}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
              overflow: 'hidden',
              minWidth: 192,
              zIndex: 300,
            }}
          >
            {menuItems.map((item, i) => (
              <button
                key={item.label}
                onClick={() => { setOpen(false); item.onClick?.(); }}
                style={{
                  width: '100%', textAlign: 'left', background: 'none', border: 'none',
                  padding: '14px 18px', fontSize: 14,
                  color: T.ink, cursor: 'pointer',
                  borderBottom: i < menuItems.length - 1 ? `1px solid ${T.line}` : 'none',
                  display: 'flex', alignItems: 'center', gap: 12,
                  transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(44,24,16,0.04)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <item.Icon size={16} strokeWidth={1.75} style={{ flexShrink: 0, opacity: 0.6, color: T.goldDark }} />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
