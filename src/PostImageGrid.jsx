import { T } from './theme.js';

const RADIUS = 12;
const GAP = 3;
const MAX_WIDTH = 480;
// Discipline image vertical real estate so the post stays the unit, not
// the photo. Tall portrait images get a sensible cap; the post body is
// the hero, the image is supporting.
const SINGLE_MAX_HEIGHT = 340;

function Tile({ src, height, overlay, fit = 'cover' }) {
  return (
    <div style={{
      position: 'relative', width: '100%', height,
      background: '#F4E9D0', overflow: 'hidden',
    }}>
      <img
        src={src}
        alt=""
        loading="lazy"
        style={{
          width: '100%', height: '100%',
          objectFit: fit, display: 'block',
        }}
      />
      {overlay && (
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
          color: T.cream, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.serif, fontSize: 24, fontWeight: 700, letterSpacing: 0.5,
        }}>+{overlay}</div>
      )}
    </div>
  );
}

export default function PostImageGrid({ urls }) {
  const list = Array.isArray(urls) ? urls.filter(Boolean) : [];
  const n = list.length;
  if (n === 0) return null;

  const wrapStyle = {
    marginTop: 10, marginLeft: 'auto', marginRight: 'auto',
    width: '100%', maxWidth: MAX_WIDTH,
    borderRadius: RADIUS, overflow: 'hidden',
    background: '#F4E9D0',
  };

  if (n === 1) {
    return (
      <div style={{
        marginTop: 10, borderRadius: RADIUS, overflow: 'hidden',
        background: '#F4E9D0',
      }}>
        <img
          src={list[0]}
          alt=""
          loading="lazy"
          style={{
            display: 'block', width: '100%',
            maxHeight: SINGLE_MAX_HEIGHT,
            objectFit: 'cover',
          }}
        />
      </div>
    );
  }

  if (n === 2) {
    return (
      <div style={{ ...wrapStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: GAP }}>
        <Tile src={list[0]} height={200} />
        <Tile src={list[1]} height={200} />
      </div>
    );
  }

  if (n === 3) {
    return (
      <div style={{ ...wrapStyle, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: GAP, height: 250 }}>
        <Tile src={list[0]} height="100%" />
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: GAP }}>
          <Tile src={list[1]} height="100%" />
          <Tile src={list[2]} height="100%" />
        </div>
      </div>
    );
  }

  const cells = list.slice(0, 4);
  const extra = n > 4 ? n - 4 : 0;
  return (
    <div style={{ ...wrapStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: GAP, height: 300 }}>
      {cells.map((src, i) => (
        <Tile
          key={src}
          src={src}
          height="100%"
          overlay={i === 3 && extra > 0 ? extra : null}
        />
      ))}
    </div>
  );
}
