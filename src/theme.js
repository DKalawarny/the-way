export const T = {
  // Surfaces
  cream: '#F5EDD8',
  parchment: '#FAF3E2',
  parchmentDark: '#EDE0C4',
  // Brand accent — clay
  gold: '#A85530',          // clay — primary CTAs, accents (kept as "gold" for compat)
  goldLight: '#C4693C',
  goldDark: '#7C3E22',
  // Joy accent — honey (use sparingly: milestones, verse arrival, completion)
  honey: '#D4A24A',
  honeySoft: '#E8C887',
  // Type
  ink: '#1A1108',
  inkSoft: '#5A4733',
  inkMuted: '#7A6B58',
  line: 'rgba(26,17,8,0.12)',
  white: '#FFFFFF',
  error: '#A53F2B',
  success: '#2E7A48',
  successBg: 'rgba(74,139,90,0.14)',
  resolvedText: '#2F5547',
  resolvedBg: 'rgba(63,107,94,0.10)',
  serif: "'Fraunces', Georgia, serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  display: "'Newsreader', Georgia, serif",
};

// ── Design system tokens ────────────────────────────────────────────
// Editorial-spiritual axis: type that breathes, generous whitespace,
// shadows that feel like candlelight not Material elevation.
//
// Spacing follows a 4pt grid. Radius leans large (12–24) for warmth.
// Motion is slow and intentional — never bouncy.
export const SPACE = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 72 };
export const RADIUS = { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 };
export const SHADOW = {
  whisper: '0 1px 2px rgba(26,17,8,0.04)',
  warm:    '0 2px 8px rgba(26,17,8,0.06), 0 1px 2px rgba(26,17,8,0.04)',
  lift:    '0 8px 24px rgba(26,17,8,0.10), 0 2px 6px rgba(26,17,8,0.06)',
  candle:  '0 12px 40px rgba(26,17,8,0.14), 0 4px 12px rgba(26,17,8,0.08)',
  glow:    '0 0 0 1px rgba(168,85,48,0.20), 0 6px 20px rgba(168,85,48,0.18)',
};
export const MOTION = {
  quick: '0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
  base:  '0.28s cubic-bezier(0.2, 0.8, 0.2, 1)',
  slow:  '0.55s cubic-bezier(0.2, 0.8, 0.2, 1)',
};

// ── Z-index hierarchy (use these everywhere — no magic numbers) ─────
// Inline / sticky            1–49
// Dropdowns / tooltips      50–99
// Sticky headers             100
// Overlapping sheets         150
// Sheets / drawers           200
// Modals / dialogs           300
// Alert / confirm dialogs    400
// Toasts / snackbars         500
// Dev / debug                9000
export const Z = {
  dropdown: 60,
  stickyHeader: 100,
  sheet: 200,
  modal: 300,
  alert: 400,
  toast: 500,
};
// Type scale — display feels editorial; body stays Lora for contemplative reading.
export const TYPE = {
  eyebrow: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: 700 },
  display: { fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 },
  headline:{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.18 },
  title:   { fontFamily: "'Lora', Georgia, serif", fontWeight: 700, letterSpacing: '-0.005em', lineHeight: 1.25 },
  body:    { fontFamily: "'Lora', Georgia, serif", fontSize: 15.5, lineHeight: 1.65, fontWeight: 400 },
  meta:    { fontFamily: "'Inter', sans-serif", fontSize: 12.5, color: '#7A6B58', letterSpacing: 0.1 },
};

// ── Semantic palette ────────────────────────────────────────────────
// Color = meaning, not decoration. Each token names a *moment of the soul*
// the user is in, so the eye learns the room they've walked into.
//
// The hues are warm and desaturated so they coexist with parchment + gold:
//   prayer     — sage    (contemplation, breath, lifting up)
//   scripture  — gold    (divine word — uses existing T.gold tokens)
//   connection — clay    (human, embodied, warm relational)
//   care       — teal    (grounding, pastoral, supportive)
//
// Each token follows the same shape: bg/bgActive/rail/line/text/textSoft.
// `bg` is barely-perceptible (≤6% alpha) — a wash, not a fill.
// `rail` is the 3px accent edge that gives a card its identity.
export const SEMANTIC = {
  prayer: {
    bg:       'rgba(180,130,60,0.15)',
    bgActive: 'rgba(180,130,60,0.28)',
    rail:     '#A87840',
    line:     'rgba(180,130,60,0.50)',
    text:     '#7A4E20',
    textSoft: '#9A6A38',
  },
  connection: {
    bg:       'rgba(166,107,82,0.16)',
    bgActive: 'rgba(166,107,82,0.30)',
    rail:     '#9A5E45',
    line:     'rgba(166,107,82,0.55)',
    text:     '#6F4128',
    textSoft: '#8C5440',
  },
  care: {
    bg:       'rgba(61,140,140,0.15)',
    bgActive: 'rgba(61,140,140,0.28)',
    rail:     '#357676',
    line:     'rgba(61,140,140,0.55)',
    text:     '#1F5252',
    textSoft: '#2E6B6B',
  },
};

// Per-persona tints — used to give post cards visual rhythm.
// Each persona contributes a soft warm/cool wash so a feed of 10 posts isn't
// 10 identical rectangles. Backgrounds stay near-white; the accent is the rail.
export const TYPE_TINTS = {
  curious:      { bg: 'rgba(168,85,48,0.14)',  bgChip: 'rgba(168,85,48,0.22)', rail: '#B8733A', text: '#8E5528' },
  seeking:      { bg: 'rgba(74,123,157,0.16)',  bgChip: 'rgba(74,123,157,0.24)', rail: '#4A7B9D', text: '#2E6A8E' },
  skeptic:      { bg: 'rgba(110,110,120,0.14)', bgChip: 'rgba(110,110,120,0.22)', rail: '#7A6B58', text: '#555' },
  'new-faith':  { bg: 'rgba(74,139,90,0.16)',   bgChip: 'rgba(74,139,90,0.24)', rail: '#4A8B5A', text: '#2E7A48' },
  'heard-things': { bg: 'rgba(120,90,150,0.16)', bgChip: 'rgba(120,90,150,0.24)', rail: '#8E6FB8', text: '#6B3FA0' },
  deeper:       { bg: 'rgba(150,90,40,0.16)',   bgChip: 'rgba(150,90,40,0.24)', rail: '#A66A2A', text: '#7A4F1F' },
  group:        { bg: 'rgba(168,85,48,0.14)',  bgChip: 'rgba(168,85,48,0.22)', rail: '#B8733A', text: '#8E5528' },
  'inter-faith':{ bg: 'rgba(45,120,120,0.16)',  bgChip: 'rgba(45,120,120,0.24)', rail: '#3D8C8C', text: '#2A6868' },
  guided:       { bg: 'rgba(180,120,60,0.16)',  bgChip: 'rgba(180,120,60,0.24)', rail: '#B57A3C', text: '#8C5A26' },
};
export const tintFor = (id) => TYPE_TINTS[id] ?? TYPE_TINTS.curious;

export const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..600&family=Fraunces:opsz,wght@9..144,300..500&display=swap');

  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  html { overflow-x: hidden; }
  body {
    margin: 0;
    font-family: ${T.sans};
    background: ${T.cream};
    color: ${T.ink};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    overflow-x: hidden;
  }
  button { font-family: inherit; cursor: pointer; }
  input, textarea { font-family: inherit; }
  ::selection { background: ${T.ink}; color: ${T.cream}; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40% { transform: translateY(-6px); opacity: 1; }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,48, 0.0); }
    50% { box-shadow: 0 0 24px 0 rgba(168,85,48, 0.25); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-6px); }
    40%       { transform: translateX(6px); }
    60%       { transform: translateX(-4px); }
    80%       { transform: translateX(4px); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .fade-up { animation: fadeUp 0.4s ease both; }
  .fade-in { animation: fadeIn 0.3s ease both; }

  /* ── Design vocabulary ──────────────────────────────────────────── */
  /* Stagger entrance: set --i (0,1,2...) on each child, wrap in .stagger-in */
  .stagger-in > * {
    animation: fadeUp 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: calc(var(--i, 0) * 80ms);
  }

  /* Subtle warmth across the page — replaces flat cream with depth */
  .scene {
    background:
      radial-gradient(ellipse 80% 60% at 50% -10%, rgba(168,85,48,0.10), transparent 70%),
      radial-gradient(ellipse 60% 40% at 50% 110%, rgba(168,85,48,0.06), transparent 70%),
      ${T.cream};
  }

  /* Halo behind hero icons / wordmarks */
  .halo {
    position: relative;
    isolation: isolate;
  }
  .halo::before {
    content: '';
    position: absolute;
    inset: -40%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(168,85,48,0.22) 0%, rgba(168,85,48,0.06) 40%, transparent 70%);
    z-index: -1;
    animation: haloPulse 4.5s ease-in-out infinite;
    pointer-events: none;
  }
  @keyframes haloPulse {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50%      { opacity: 1;   transform: scale(1.08); }
  }

  /* Cards that lift on intent */
  .lift {
    transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1),
                box-shadow 0.22s ease,
                border-color 0.22s ease;
    will-change: transform;
  }
  .lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(26,17,8,0.10), 0 2px 6px rgba(26,17,8,0.06);
    border-color: ${T.gold} !important;
  }
  .lift:active { transform: translateY(0); transition-duration: 0.08s; }

  /* The single magnet — primary CTA on a screen */
  .magnet {
    position: relative;
    box-shadow: 0 6px 20px rgba(168,85,48,0.20), 0 1px 4px rgba(26,17,8,0.08);
  }
  .magnet::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    pointer-events: none;
    box-shadow: 0 0 0 0 rgba(168,85,48,0);
    animation: magnetPulse 2.6s ease-in-out infinite;
  }
  @keyframes magnetPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(168,85,48,0.0); }
    50%      { box-shadow: 0 0 0 6px rgba(168,85,48,0.14); }
  }

  .ref-inline {
    display: inline-block;
    padding: 1px 6px;
    margin: 0 1px;
    border-radius: 4px;
    background: rgba(168,85,48, 0.12);
    color: ${T.goldDark};
    font-weight: 500;
    font-size: 0.92em;
  }
  .ref-extended {
    background: rgba(138, 90, 184, 0.12);
    color: #6B3FA0;
  }
  .ref-historical {
    background: rgba(120, 120, 120, 0.14);
    color: ${T.inkSoft};
    font-style: italic;
  }

  .scroll::-webkit-scrollbar { width: 8px; }
  .scroll::-webkit-scrollbar-track { background: transparent; }
  .scroll::-webkit-scrollbar-thumb {
    background: ${T.line};
    border-radius: 4px;
  }

  .hide-scroll::-webkit-scrollbar { display: none; }
  .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }

  .card-raised {
    box-shadow: 0 4px 20px rgba(26,17,8,0.10), 0 1px 4px rgba(26,17,8,0.06);
  }
  .card-sunken {
    box-shadow: inset 0 2px 8px rgba(26,17,8,0.07);
  }

  .texture-bg {
    background-image:
      radial-gradient(circle, rgba(168,85,48,0.10) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  @keyframes goldPulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes micPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.0); }
    50%       { box-shadow: 0 0 0 6px rgba(220,38,38,0.18); }
  }
  @keyframes badgeSlideUp {
    from { transform: translateX(-50%) translateY(24px); opacity: 0; }
    to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
  }
  @keyframes badgePop {
    0%   { transform: scale(0.4) rotate(-8deg); opacity: 0; }
    60%  { transform: scale(1.25) rotate(4deg); opacity: 1; }
    80%  { transform: scale(0.92) rotate(-2deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes bookBadgeSpin {
    0%   { transform: scale(0) rotate(-720deg); opacity: 0; }
    50%  { transform: scale(1.32) rotate(24deg); opacity: 1; }
    66%  { transform: scale(0.87) rotate(-8deg); }
    78%  { transform: scale(1.08) rotate(3deg); }
    88%  { transform: scale(0.97) rotate(-1deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes bookCompleteIn {
    0%   { opacity: 0; transform: scale(0.38) translateY(70px); }
    12%  { opacity: 1; transform: scale(1.14) translateY(-16px); }
    22%  { transform: scale(0.93) translateY(4px); }
    30%  { transform: scale(1.05); }
    40%  { transform: scale(1); }
    74%  { opacity: 1; transform: scale(1); }
    88%  { opacity: 0; transform: scale(0.86) translateY(-32px); }
    100% { opacity: 0; transform: scale(0.78) translateY(-48px); }
  }
  @keyframes backdropFade {
    0%   { opacity: 0; }
    12%  { opacity: 1; }
    74%  { opacity: 1; }
    100% { opacity: 0; }
  }
  @keyframes burstRing {
    0%   { transform: scale(0.2); opacity: 1; }
    100% { transform: scale(4); opacity: 0; }
  }
  @keyframes textSlideIn {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes questionReveal {
    0%   { opacity: 0; transform: translateY(-6px) scaleY(0.85); transform-origin: top; max-height: 0; }
    40%  { opacity: 1; }
    100% { opacity: 1; transform: translateY(0) scaleY(1); max-height: 200px; }
  }

  /* ── Editorial layout utilities ─────────────────────────────────── */
  .section-eyebrow {
    font-family: ${T.sans};
    font-size: 11px;
    letter-spacing: 1.6px;
    text-transform: uppercase;
    font-weight: 700;
    color: ${T.goldDark};
  }
  .editorial-h1 {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 600;
    letter-spacing: -0.022em;
    line-height: 1.05;
    color: ${T.ink};
  }
  .editorial-h2 {
    font-family: 'Fraunces', Georgia, serif;
    font-weight: 600;
    letter-spacing: -0.015em;
    line-height: 1.15;
    color: ${T.ink};
  }
  .rule-gold {
    height: 1px;
    background: linear-gradient(90deg, transparent, ${T.gold}, transparent);
    opacity: 0.5;
  }

  @keyframes floatIn {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .float-in { animation: floatIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both; }

  @keyframes askPulse {
    0%, 100% { box-shadow: 0 6px 20px rgba(168,85,48,0.30), 0 0 0 0 rgba(168,85,48,0); }
    50%      { box-shadow: 0 6px 20px rgba(168,85,48,0.30), 0 0 0 10px rgba(168,85,48,0.12); }
  }

  /* ── Mobile base fixes ─────────────────────────────────────────── */
  /* iOS Safari zooms the viewport on focus when input font-size < 16px.
     Clamping to max(16px, 1em) prevents the zoom while preserving theme size. */
  input, textarea, select { font-size: max(16px, 1em); }

  /* Prevent rubber-band overscroll on iOS — the app is SPA-modal, not a
     traditional document, so native bounce feels wrong. */
  html { overscroll-behavior: none; }

  /* Smooth momentum scrolling on iOS for any overflow-y: auto container. */
  .scroll { -webkit-overflow-scrolling: touch; touch-action: pan-y; }

  /* ── Responsive system ──────────────────────────────────────────── */

  /* Touch-friendly minimum tap target — apply to any interactive element
     that's smaller than 44px in either dimension. */
  .touch-target {
    min-height: 44px;
    min-width: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  /* Content clearance for fixed bottom nav (mobile/tablet) */
  .pb-nav {
    padding-bottom: calc(62px + env(safe-area-inset-bottom, 0px));
  }

  /* ── Small phones (<480px): tighten editorial display type ── */
  @media (max-width: 479px) {
    .editorial-h1 { font-size: clamp(26px, 7.5vw, 36px) !important; }
    .editorial-h2 { font-size: clamp(20px, 5.5vw, 28px) !important; }
  }

  /* ── Mobile (<640px): bottom-sheet modals ── */
  /* Add class="modal-sheet" to a modal's inner panel to slide it up from the
     bottom on small screens. The outer backdrop can stay as-is (fixed inset-0
     flex center) — the sheet's position:fixed escapes the flex context. */
  @media (max-width: 639px) {
    .modal-sheet {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
      top: auto !important;
      border-radius: 20px 20px 0 0 !important;
      max-width: 100% !important;
      width: 100% !important;
      margin: 0 !important;
      max-height: 92vh !important;
      overflow-y: auto !important;
      -webkit-overflow-scrolling: touch !important;
      padding-bottom: max(20px, env(safe-area-inset-bottom, 20px)) !important;
      animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1) both !important;
    }
  }

  /* ── Mobile (<640px): full-screen takeover for rich content dialogs ── */
  /* Use on tall scrollable dialogs (post detail, comment threads) that have
     their own internal header — these work better as full-screen overlays
     than bottom sheets. */
  @media (max-width: 639px) {
    .full-screen-mobile {
      position: fixed !important;
      inset: 0 !important;
      border-radius: 0 !important;
      max-width: 100% !important;
      max-height: 100% !important;
      height: 100dvh !important;
      width: 100% !important;
      margin: 0 !important;
      padding-bottom: env(safe-area-inset-bottom, 0px) !important;
      animation: fadeIn 0.2s ease both !important;
    }
  }

  /* ── Church page header responsive right padding ── */
  /* Reserves space for the fixed top-right action cluster on wide screens;
     collapses to normal padding on mobile where those buttons float above. */
  .church-header-right { padding-right: 16px; }
  @media (min-width: 640px) {
    .church-header-right { padding-right: 208px; }
  }

  /* ── Desktop (≥1024px): sidebar nav ── */
  /* The JS layout shifts content with marginLeft: 240px inline — these
     classes are helpers for one-off spacing needs inside component trees. */
  @media (min-width: 1024px) {
    /* Ensure no accidental content hides behind the sidebar */
    .sidebar-clear { margin-left: 240px; }

    /* Slightly larger body text on wide screens for reading comfort */
    body { font-size: 16px; }
  }
`;

