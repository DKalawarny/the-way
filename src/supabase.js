import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.warn('[the way] Supabase env vars missing — profiles/auth will not work.');
}

export const supabase = (url && key)
  ? createClient(url, key)
  : createClient('https://placeholder.supabase.co', 'placeholder-key-not-real');
