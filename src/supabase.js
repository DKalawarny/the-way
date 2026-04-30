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
