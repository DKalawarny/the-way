/**
 * Plausible analytics — safe fire-and-forget wrapper.
 * Silently no-ops when Plausible hasn't loaded (localhost, ad-blockers, etc.)
 *
 * Usage:
 *   import { track } from './analytics.js';
 *   track('post_created');
 *   track('walk_started', { title: 'Psalms 23' });
 */
export function track(event, props) {
  try {
    window.plausible?.(event, props ? { props } : undefined);
  } catch {}
}
