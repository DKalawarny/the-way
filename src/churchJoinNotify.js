import { authedFetch } from './supabase.js';

// Fire-and-forget: tell the server a church join succeeded so the pastor gets
// a "joined your church" notification. Call from EVERY join path.
export function notifyChurchJoined(churchId) {
  if (!churchId) return;
  authedFetch('/api/church/joined-notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ church_id: churchId }),
  }).catch(() => {});
}
