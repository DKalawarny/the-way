import { KinwoveStar } from './KinwoveStar';

export const KinwoveWordmark = ({
  size = 48,
  starColor = '#A85530',
  textColor = 'currentColor',
}) => (
  <span
    style={{
      fontFamily: "'Newsreader', Georgia, serif",
      fontVariationSettings: '"opsz" 72',
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: '-0.018em',
      color: textColor,
      display: 'inline-block',
      position: 'relative',
    }}
    aria-label="kinwove"
  >
    k
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {'ı'}
      <span
        style={{
          position: 'absolute',
          top: '-0.72em',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '0.28em',
          height: '0.28em',
          display: 'block',
          filter: `drop-shadow(0 0 3px ${starColor}) drop-shadow(0 0 6px ${starColor}88)`,
        }}
        aria-hidden="true"
      >
        <KinwoveStar color={starColor} size="100%" />
      </span>
    </span>
    nwove
  </span>
);
