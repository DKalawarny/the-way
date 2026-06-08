import { KinwoveStar } from './KinwoveStar';

export const KinwoveWordmark = ({
  size = 48,
  starColor = '#A85530',
  textColor = 'currentColor',
  starEm = 0.28,
}) => (
  <span
    style={{
      fontFamily: "'Fraunces', Georgia, serif",
      fontVariationSettings: `"opsz" ${Math.min(144, Math.max(9, size * 2.5))}`,
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1,
      letterSpacing: '-0.022em',
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
          width: `${starEm}em`,
          height: `${starEm}em`,
          display: 'block',
        }}
        aria-hidden="true"
      >
        <KinwoveStar color={starColor} size="100%" />
      </span>
    </span>
    nwove
  </span>
);
