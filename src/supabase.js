import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn('[the way] Supabase env vars missing — profiles/auth will not work.');
}

export const supabase = (url && key)
  ? createClient(url, key)
  : createClient('https://placeholder.supabase.co', 'placeholder-key-not-real');

// Fetch wrapper that attaches the current Supabase session as a Bearer token
// so server.js can authenticate /api/* calls. Falls through with no header if
// the user isn't logged in (server treats that as anonymous).
export async function authedFetch(input, init = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = new Headers(init.headers ?? {});
  if (session?.access_token) headers.set('Authorization', `Bearer ${session.access_token}`);
  return fetch(input, { ...init, headers });
}

// Direct PATCH to PostgREST, bypassing the Supabase JS client entirely.
// Used when the JS client's schema-cache layer rejects valid updates with
// "The database schema is invalid or incompatible."
export async function directProfileUpdate(userId, updates) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  const res = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': key,
      'Authorization': `Bearer ${session.access_token}`,
      'Prefer': 'return=minimal',
      // PostgREST requires these to resolve the schema; the Supabase JS client
      // adds them automatically but a raw fetch must include them explicitly.
      'Accept-Profile': 'public',
      'Content-Profile': 'public',
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const j = await res.json(); msg = `${j.message || j.error || msg}${j.details ? ` — ${j.details}` : ''}`; } catch (_) {}
    throw new Error(msg);
  }
}

// Upload a single image File to the 'post-images' bucket under the user's
// own folder ("<userId>/<timestamp>-<rand>.<ext>") and return its public
// URL. Throws on failure so callers can surface the error to the user.
// The path prefix matters: storage RLS only lets the owner write under their
// own auth.uid() folder (see scripts/2026-05-02-post-images.sql).
// Normalise a File's MIME type to something the storage bucket will accept.
// HEIC/HEIF (iPhone native), image/jpg (vs image/jpeg), or empty strings all
// cause "The database schema is invalid or incompatible" from Supabase Storage
// even when allowed_mime_types is null.  Re-wrapping as a JPEG blob fixes it.
const SAFE_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
function normaliseImageFile(file) {
  const type = file.type && SAFE_IMAGE_TYPES.has(file.type) ? file.type : 'image/jpeg';
  const blob = type !== file.type ? new Blob([file], { type }) : file;
  return { blob, contentType: type };
}

export async function uploadPostImage(file, _userId) {
  if (!file) throw new Error('uploadPostImage: missing file');
  // Bypass Supabase Storage entirely — resize on canvas and return a base64
  // data URL stored directly in posts.body_data.image_urls (jsonb). Maintains
  // the original aspect ratio, max 1000 px on the long edge, ~150–250 KB each.
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1000;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width  * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width  = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not load image')); };
    img.src = objectUrl;
  });
}

// Upload a profile asset (avatar or banner). Reuses the post-images bucket
// (storage RLS only requires the first path segment to equal auth.uid())
// and tucks profile uploads under a `<userId>/profile/...` subfolder so
// they're easy to spot in the dashboard. Returns the public URL.
// Resize a photo to a square, compress it, and return a base64 data-URL.
// This completely bypasses Supabase Storage — the data URL is stored directly
// in profiles.avatar_url (text column).  200 px / 82 % JPEG ≈ 15–30 KB.
export function resizeImageToDataUrl(file, size = 200, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      // Centre-crop to square
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width  - minDim) / 2;
      const sy = (img.height - minDim) / 2;
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not load image')); };
    img.src = objectUrl;
  });
}

export async function uploadProfileImage(file, userId, kind = 'avatar') {
  if (!file || !userId) throw new Error('uploadProfileImage: missing file or userId');
  // 400 px gives the lightbox enough resolution to look sharp at 280 px display
  // size while keeping the base64 payload comfortably under 100 KB.
  return resizeImageToDataUrl(file, 400, 0.82);
}
