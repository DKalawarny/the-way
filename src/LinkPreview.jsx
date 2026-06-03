import { useState } from 'react';
import { T } from './theme.js';

// ── URL extraction ────────────────────────────────────────────────────────────
const URL_RE = /https?:\/\/[^\s<>"')\]]+/g;

export function extractFirstUrl(text) {
  if (!text) return null;
  const m = text.match(URL_RE);
  return m ? m[0].replace(/[.,;:!?]+$/, '') : null; // strip trailing punctuation
}

/** Remove the first URL from text so it isn't shown raw below the preview card */
export function stripFirstUrl(text) {
  if (!text) return text;
  const url = extractFirstUrl(text);
  if (!url) return text;
  return text.replace(url, '').trim();
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

// ── Compact YouTube preview ───────────────────────────────────────────────────
function YouTubePreview({ url, videoId }) {
  const [playing, setPlaying] = useState(false);
  const thumb = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;

  if (playing) {
    return (
      <div style={{
        marginTop: 10,
        borderRadius: 9, overflow: 'hidden',
        border: `1px solid ${T.line}`,
        background: '#000',
        aspectRatio: '16/9',
        width: '100%',
      }}>
        <iframe
          src={embedUrl}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setPlaying(true)}
      role="button"
      style={{
        display: 'flex', alignItems: 'stretch',
        textDecoration: 'none',
        borderRadius: 9, overflow: 'hidden',
        border: `1px solid ${T.line}`,
        marginTop: 10,
        background: T.white,
        boxShadow: '0 1px 3px rgba(26,17,8,0.06)',
        maxHeight: 72,
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Thumbnail — narrow left strip */}
      <div style={{ width: 96, flexShrink: 0, background: '#000', overflow: 'hidden', position: 'relative' }}>
        <img
          src={thumb}
          alt="Video thumbnail"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={(e) => {
            e.currentTarget.src = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
          }}
        />
        {/* Play icon overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.22)',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,0,0,0.9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21" />
            </svg>
          </div>
        </div>
      </div>

      {/* Right-side info */}
      <div style={{
        flex: 1, minWidth: 0,
        padding: '9px 12px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {/* YouTube logo */}
          <svg width="14" height="10" viewBox="0 0 16 11" fill="none">
            <rect width="16" height="11" rx="2.5" fill="#FF0000" />
            <polygon points="6.5,2.5 11.5,5.5 6.5,8.5" fill="white" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.inkSoft, fontFamily: T.sans }}>
            YouTube
          </span>
        </div>
        <div style={{
          fontSize: 11, color: T.inkMuted, fontFamily: T.sans,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {url.replace(/https?:\/\/(www\.)?/, '')}
        </div>
      </div>

      {/* Play hint */}
      <div style={{ display: 'flex', alignItems: 'center', paddingRight: 12, color: T.inkMuted, fontSize: 13, flexShrink: 0 }}>
        ▶
      </div>
    </div>
  );
}

// ── Compact generic URL preview ───────────────────────────────────────────────
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
        borderRadius: 9, padding: '9px 12px',
        border: `1px solid ${T.line}`,
        background: T.white,
        marginTop: 10,
        boxShadow: '0 1px 3px rgba(26,17,8,0.06)',
      }}
    >
      {/* Globe icon */}
      <div style={{
        width: 30, height: 30, borderRadius: 7,
        background: T.parchment, border: `1px solid ${T.line}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.goldDark} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
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
          fontSize: 11, color: T.inkMuted, fontFamily: T.sans,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {url.replace(/https?:\/\/(www\.)?/, '')}
        </div>
      </div>
      <span style={{ color: T.inkMuted, fontSize: 13, flexShrink: 0 }}>↗</span>
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
