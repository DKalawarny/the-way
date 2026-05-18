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
          top: '-0.34em',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '0.2em',
          height: '0.2em',
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
