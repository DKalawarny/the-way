// One guided overlay at a time, app-wide. FeatureTour, PageTour, CoachMark,
// and the daily-verse card all compete for the same first minutes of a
// session — without a mutex they visibly stack (tour over coach mark over
// verse card). Priority is by acquisition order with FeatureTour mounting
// first and CoachMark deliberately waiting out the initial race.
let active = null;
const listeners = new Set();

function notify() { listeners.forEach((f) => { try { f(); } catch {} }); }

export function acquireOverlay(id) {
  if (active && active !== id) return false;
  active = id;
  notify();
  return true;
}

export function releaseOverlay(id) {
  if (active === id) {
    active = null;
    notify();
  }
}

export function overlayHolder() { return active; }

export function subscribeOverlay(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
