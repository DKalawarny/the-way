import { T } from './theme.js';

// ── URL extraction ────────────────────────────────────────────────────────────
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

function extractFirstUrl(text) {
  if (!text) return null;
  const m = text.match(URL_RE);
  return m ? m[0].replace(/[.,;:!?]+$/, '') : null; // strip trailing punctuation
}

function extractYouTubeId(url) {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
}

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url.slice(0, 40); }
}

// ── YouTube preview ───────────────────────────────────────────────────────────
function YouTubePreview({ url, videoId }) {
  const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block', textDecoration: 'none',
        borderRadius: 10, overflow: 'hidden',
        border: `1px solid ${T.line}`,
        marginTop: 10,
        boxShadow: '0 1px 4px rgba(26,17,8,0.07)',
      }}
    >
      {/* Thumbnail */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
        <img
          src={thumb}
          alt="Video thumbnail"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
          }}
          onError={(e) => {
            // fallback to medium quality if hq 404s
            e.currentTarget.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
          }}
        />
        {/* Play button overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.18)',
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(255,0,0,0.88)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          }}>
            {/* Triangle play icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>
      </div>
      {/* Footer strip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 12px',
        background: T.white,
        borderTop: `1px solid ${T.line}`,
      }}>
        {/* YouTube red icon */}
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <rect width="16" height="11" rx="2.5" fill="#FF0000" />
          <polygon points="6.5,2.5 11.5,5.5 6.5,8.5" fill="white" />
        </svg>
        <span style={{ fontSize: 12, color: T.inkSoft, fontFamily: T.sans }}>
          YouTube
        </span>
        <span style={{ fontSize: 12, color: T.inkMuted, marginLeft: 'auto', fontFamily: T.sans, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
          {url.replace(/https?:\/\/(www\.)?/, '')}
        </span>
      </div>
    </a>
  );
}

// ── Generic URL preview ───────────────────────────────────────────────────────
function GenericPreview({ url }) {
  const domain = getDomain(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        textDecoration: 'none',
        borderRadius: 10, padding: '10px 14px',
        border: `1px solid ${T.line}`,
        background: T.white,
        marginTop: 10,
        boxShadow: '0 1px 4px rgba(26,17,8,0.07)',
      }}
    >
      {/* Globe icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 8,
        background: T.parchment, border: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.goldDark} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: T.ink, fontFamily: T.sans, marginBottom: 1 }}>
          {domain}
        </div>
        <div style={{
          fontSize: 11.5, color: T.inkMuted, fontFamily: T.sans,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {url.replace(/https?:\/\/(www\.)?/, '')}
        </div>
      </div>
      {/* Arrow */}
      <span style={{ color: T.inkMuted, fontSize: 14, flexShrink: 0 }}>↗</span>
    </a>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LinkPreview({ text }) {
  const url = extractFirstUrl(text);
  if (!url) return null;

  const ytId = extractYouTubeId(url);
  if (ytId) return <YouTubePreview url={url} videoId={ytId} />;
  return <GenericPreview url={url} />;
}
