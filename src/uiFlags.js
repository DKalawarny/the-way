import { supabase } from './supabase.js';

// Account-synced "seen it" flags for tours and coach marks. The done-markers
// used to live only in localStorage, so every new browser or device replayed
// the whole onboarding (Daniel, 7/19: "should only be first login"). Flags now
// mirror into profiles.notif_prefs.ui — nested under "ui" so they can never
// collide with the per-kind mute booleans add_notification() reads, and the
// mute toggle spreads the existing object so this key survives its writes.

// Synchronous apply — call with profile.notif_prefs.ui the moment the profile
// loads, BEFORE any tour decides whether to show.
export function applyUiFlags(ui) {
  if (!ui) return;
  for (const [k, v] of Object.entries(ui)) {
    try { if (localStorage.getItem(k) == null) localStorage.setItem(k, String(v)); } catch {}
  }
}

export async function syncUiFlag(key, value) {
  try { localStorage.setItem(key, String(value)); } catch {}
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const uid = session?.user?.id;
    if (!uid) return;
    const { data } = await supabase.from('profiles').select('notif_prefs').eq('id', uid).single();
    const prefs = data?.notif_prefs ?? {};
    const ui = { ...(prefs.ui ?? {}), [key]: String(value) };
    await supabase.from('profiles').update({ notif_prefs: { ...prefs, ui } }).eq('id', uid).then(null, () => {});
  } catch { /* best effort — next completion syncs */ }
}
