import { KinwoveStar } from './KinwoveStar';

export const KinwoveAIButton = ({ size = 48, onClick, ...props }) => (
  <button
    onClick={onClick}
    aria-label="Talk to kinwove"
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: '#1A1108',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: `
        inset 0 1px 0 rgba(255,255,255,0.08),
        0 ${size * 0.08}px ${size * 0.2}px rgba(26,17,8,0.35),
        0 ${size * 0.03}px ${size * 0.08}px rgba(26,17,8,0.2)
      `,
      transition: 'transform 0.18s ease, box-shadow 0.18s ease',
    }}
    {...props}
  >
    <KinwoveStar color="#A85530" size={size * 0.46} />
  </button>
);
