import { KinwoveStar } from './KinwoveStar';

export const KinwoveAppIcon = ({ size = 96 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.23,
      background: '#A85530',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      boxShadow: `
        inset 0 1px 0 rgba(255,255,255,0.15),
        0 ${size * 0.13}px ${size * 0.3}px rgba(124,62,34,0.35),
        0 ${size * 0.04}px ${size * 0.1}px rgba(26,17,8,0.15)
      `,
      overflow: 'hidden',
    }}
    role="img"
    aria-label="kinwove"
  >
    <div
      style={{
        position: 'absolute',
        top: size * 0.1,
        right: size * 0.1,
        width: size * 0.14,
        height: size * 0.14,
      }}
      aria-hidden="true"
    >
      <KinwoveStar color="#F5EDD8" size="100%" />
    </div>
    <span
      style={{
        fontFamily: "'Newsreader', Georgia, serif",
        fontVariationSettings: '"opsz" 72',
        fontWeight: 500,
        fontSize: size * 0.72,
        lineHeight: 1,
        color: '#F5EDD8',
      }}
    >
      k
    </span>
  </div>
);
