import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabase.js';

// Account-synced "seen it" flags for tours and coach marks. The done-markers
// used to live only in localStorage, so every new browser or device replayed
// the whole onboarding (Daniel, 7/19: "should only be first login"). Flags now
// mirror into profiles.notif_prefs.ui — nested under "ui" so they can never
// collide with the per-kind mute booleans add_notification() reads, and the
// mute toggle spreads the existing object so this key survives its writes.

// ...but mirroring alone wasn't enough. applyUiFlags runs inside loadProfile,
// i.e. after an async profile fetch, while every tour snapshots localStorage in
// a useState initialiser at mount. On a fresh install the nav mounts first, the
// snapshot is empty, and localStorage filling in 300ms later never reaches React
// state — so a TestFlight reinstall replayed every popup even though the flags
// were sitting in the DB (Daniel, 8/21). Components now subscribe instead of
// snapshotting: useUiFlagState re-reads when the flags land.

let applied = false;
const listeners = new Set();

export function uiFlagsReady() { return applied; }

export function subscribeUiFlags(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Synchronous apply — call with profile.notif_prefs.ui the moment the profile
// loads, BEFORE any tour decides whether to show. Local values always win: a
// flag set on this device is never overwritten by the account copy.
export function applyUiFlags(ui) {
  if (ui) {
    for (const [k, v] of Object.entries(ui)) {
      try { if (localStorage.getItem(k) == null) localStorage.setItem(k, String(v)); } catch {}
    }
  }
  // Fires even with no flags to apply — a brand-new account still needs to tell
  // the subscribers "this is the real answer now, stop waiting".
  applied = true;
  for (const fn of [...listeners]) { try { fn(); } catch {} }
}

// Drop-in replacement for useState(readFromLocalStorage) in anything gated on a
// synced flag. Re-reads when the account flags arrive. Safe for every caller
// because each setter writes localStorage before syncing, so a re-read can only
// ever return what this device already decided — or the account's "already seen
// it", which is the whole point.
export function useUiFlagState(read) {
  const [value, setValue] = useState(read);
  const readRef = useRef(read);
  readRef.current = read;
  useEffect(() => {
    if (applied) setValue(readRef.current());
    return subscribeUiFlags(() => setValue(readRef.current()));
  }, []);
  return [value, setValue];
}

// For gates that live in an effect rather than in state: put this in the dep
// array so the decision is re-made once the account flags land.
export function useUiFlagsVersion() {
  const [v, setV] = useState(0);
  useEffect(() => subscribeUiFlags(() => setV((n) => n + 1)), []);
  return v;
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
