export const T = {
  cream: '#FDF8F0',
  parchment: '#F5ECD9',
  parchmentDark: '#E8DCC0',
  gold: '#C4813A',
  goldLight: '#D89B52',
  goldDark: '#9A6328',
  ink: '#2C1810',
  inkSoft: '#4A3828',
  inkMuted: '#7A6B58',
  line: '#D9C9A8',
  white: '#FFFFFF',
  error: '#A53F2B',
  serif: "'Lora', Georgia, serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
};

export const globalCss = `
  @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap');

  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    font-family: ${T.sans};
    background: ${T.cream};
    color: ${T.ink};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  button { font-family: inherit; cursor: pointer; }
  input, textarea { font-family: inherit; }
  ::selection { background: ${T.gold}; color: ${T.cream}; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes bounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
    40% { transform: translateY(-6px); opacity: 1; }
  }
  @keyframes glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(196, 129, 58, 0.0); }
    50% { box-shadow: 0 0 24px 0 rgba(196, 129, 58, 0.25); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  .fade-up { animation: fadeUp 0.4s ease both; }
  .fade-in { animation: fadeIn 0.3s ease both; }

  .ref-inline {
    display: inline-block;
    padding: 1px 6px;
    margin: 0 1px;
    border-radius: 4px;
    background: rgba(196, 129, 58, 0.12);
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

  .card-raised {
    box-shadow: 0 4px 20px rgba(44,24,16,0.10), 0 1px 4px rgba(44,24,16,0.06);
  }
  .card-sunken {
    box-shadow: inset 0 2px 8px rgba(44,24,16,0.07);
  }

  .texture-bg {
    background-image:
      radial-gradient(circle, rgba(196,129,58,0.10) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  @keyframes goldPulse {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }
`;
