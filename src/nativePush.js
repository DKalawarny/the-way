import { isNativeApp } from './native.js';
import { authedFetch } from './supabase.js';

// Registers the native app for APNs push and hands the device token to the
// server, where it rides the existing push_subscriptions pipeline. Safe to
// call on every login: no-op on the web, no-op if permission is denied, and
// the server upserts so repeat registrations are idempotent. Tokens are
// stored even before the server has an APNs key — flipping the key on later
// lights up every device that already registered.
let started = false;
export async function ensureNativePush() {
  if (!isNativeApp || started) return;
  started = true;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    let perm = await PushNotifications.checkPermissions();
    if (perm.receive === 'prompt') perm = await PushNotifications.requestPermissions();
    if (perm.receive !== 'granted') return;

    await PushNotifications.addListener('registration', async ({ value }) => {
      try {
        await authedFetch('/api/push/native-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: value, platform: 'ios' }),
        });
      } catch { /* re-registered next launch */ }
    });
    await PushNotifications.register();
  } catch {
    // Plugin unavailable (old binary) — nothing to do.
  }
}
