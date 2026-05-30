import { useRef, useState } from 'react';
import { uploadPostImage } from './supabase.js';
import { T } from './theme.js';

// Small shared toolkit for "attach images" UIs across composers
// (post, sermon, prayer, sermon discussion, chat-share). Each draft holds
// the local File + a previewUrl created by URL.createObjectURL so the user
// can see thumbnails before the actual upload happens on submit.

// Modern phones produce 4–12 MB JPEGs that blow past the storage-bucket cap.
// Downscale the long edge to ~1600 px and re-encode at 0.82 quality before
// upload — files end up well under 1 MB while still looking sharp on a feed.
const MAX_DIMENSION = 1600;
const JPEG_QUALITY  = 0.82;
const SKIP_BELOW    = 700 * 1024; // already small enough to send as-is

async function compressImage(file) {
  if (file.size <= SKIP_BELOW) return file;
  // GIFs/SVGs would lose animation/vectors through canvas — pass through.
  if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) return file;

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload  = () => resolve(i);
    i.onerror = () => reject(new Error('image decode failed'));
    i.src = dataUrl;
  });

  const longEdge = Math.max(img.width, img.height);
  const scale    = longEdge > MAX_DIMENSION ? MAX_DIMENSION / longEdge : 1;
  const w = Math.round(img.width  * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY));
  if (!blob || blob.size >= file.size) return file; // compression didn't help — keep original
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
}

export function useImageDrafts(max = 4) {
  const [drafts, setDrafts] = useState([]);
  const fileInputRef = useRef(null);

  function pick(eventFiles) {
    const incoming = Array.from(eventFiles ?? []);
    if (!incoming.length) return;
    const slotsLeft = max - drafts.length;
    if (slotsLeft <= 0) return;
    const accepted = incoming.slice(0, slotsLeft).filter((f) => f.type.startsWith('image/'));
    if (!accepted.length) return;
    setDrafts((prev) => [
      ...prev,
      ...accepted.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
  }

  function remove(idx) {
    setDrafts((prev) => {
      const next = prev.slice();
      const [removed] = next.splice(idx, 1);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return next;
    });
  }

  function clear() {
    drafts.forEach((d) => { try { URL.revokeObjectURL(d.previewUrl); } catch {} });
    setDrafts([]);
  }

  async function uploadAll(userId) {
    const urls = [];
    for (const d of drafts) {
      // uploadPostImage now handles canvas resize + base64 encoding internally,
      // so we pass the raw file directly — no storage bucket involved.
      const url = await uploadPostImage(d.file, userId);
      urls.push(url);
    }
    return urls;
  }

  return { drafts, fileInputRef, pick, remove, clear, uploadAll, max };
}

export function ImageDraftGrid({ drafts, onRemove, columns = 110 }) {
  if (!drafts.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${columns}px, 1fr))`, gap: 8, marginTop: 10 }}>
      {drafts.map((d, i) => (
        <div key={d.previewUrl} style={{
          position: 'relative', paddingBottom: '100%', borderRadius: 10,
          overflow: 'hidden', background: T.parchment,
        }}>
          <img src={d.previewUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label="Remove image"
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 24, height: 24, borderRadius: '50%',
              background: 'rgba(0,0,0,0.55)', color: T.cream,
              border: 'none', cursor: 'pointer', fontSize: 14, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >×</button>
        </div>
      ))}
    </div>
  );
}

export function ImageAttachButton({ drafts, max, fileInputRef, onPick, label = '📷 Photo', showHint = true, compact = false }) {
  const full = drafts.length >= max;
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => { onPick(e.target.files); e.target.value = ''; }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={full}
        title={full ? `Up to ${max} images` : 'Add photo (up to 10 MB · auto-resized)'}
        style={compact ? {
          background: 'none', border: 'none', cursor: full ? 'not-allowed' : 'pointer',
          padding: '4px 6px', borderRadius: 8, fontSize: 18, lineHeight: 1,
          color: T.inkSoft, opacity: full ? 0.5 : 1,
          display: 'flex', alignItems: 'center',
        } : {
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: T.cream, border: `1px solid ${T.line}`, borderRadius: 999,
          padding: '6px 10px', fontSize: 12.5, color: T.inkSoft,
          cursor: full ? 'not-allowed' : 'pointer',
          opacity: full ? 0.5 : 1,
        }}
      >
        {label}
      </button>
      {showHint && !full && (
        <span style={{ fontSize: 11.5, color: T.inkMuted, alignSelf: 'center' }}>
          Up to 10 MB · auto-resized
        </span>
      )}
    </>
  );
}
