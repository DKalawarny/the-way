import { isNativeApp } from './native.js';
import { authedFetch } from './supabase.js';
import { reportClientError } from './errorReport.js';

// Registers the native app for APNs push and hands the device token to the
// server, where it rides the existing push_subscriptions pipeline. Safe to
// call on every login: no-op on the web, no-op if permission is denied, and
// the server upserts so repeat registrations are idempotent. Tokens are
// stored even before the server has an APNs key — flipping the key on later
// lights up every device that already registered.
//
// This was one try/catch with an empty handler, so when no device token ever
// arrived (8/20) there was no way to tell whether the plugin was unreachable,
// permission was refused, or the POST failed — every case looked identical
// from outside. It now keeps a breadcrumb trail and reports it ONCE at the
// point it stops. Once, deliberately: reportClientError dedupes per message
// and throttles to one send per 8 seconds, so a call per step would have had
// all but the first silently dropped. Look for '[push]' in the Render logs.
let started = false;

export async function ensureNativePush() {
  const trail = [];
  const note = (s) => trail.push(s);
  const flush = (outcome) => {
    const line = `${outcome} :: ${trail.join(' → ')}`;
    reportClientError(`[push] ${line}`, { kind: 'push-stage' });
    // Also park it on the profile — the ops log it lands in is in-memory and is
    // wiped by every deploy, which is why the 8/21 trail was never recoverable.
    authedFetch('/api/push/diagnostic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trail: line }),
    }).catch(() => {});
  };

  if (!isNativeApp) return;          // plain web, nothing to report
  if (started) return;
  started = true;

  try {
    note(`native=${typeof window !== 'undefined' && !!window.Capacitor}`);

    let PushNotifications;
    try {
      ({ PushNotifications } = await import('@capacitor/push-notifications'));
      note('plugin imported');
    } catch (e) {
      return flush(`plugin import FAILED (${e?.message ?? 'no message'})`);
    }
    if (!PushNotifications) return flush('plugin undefined after import');

    let perm = await PushNotifications.checkPermissions();
    note(`perm=${perm?.receive}`);
    if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
      perm = await PushNotifications.requestPermissions();
      note(`afterPrompt=${perm?.receive}`);
    }
    if (perm.receive !== 'granted') return flush(`permission NOT granted (${perm?.receive})`);

    // Both listeners attach before register() so neither event can be missed.
    await PushNotifications.addListener('registration', async ({ value }) => {
      try {
        const r = await authedFetch('/api/push/native-register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: value, platform: 'ios' }),
        });
        reportClientError(`[push] token posted http=${r.status} len=${value?.length ?? 0}`, { kind: 'push-stage' });
      } catch (e) {
        reportClientError(`[push] token POST failed: ${e?.message}`, { kind: 'push-stage' });
      }
    });
    await PushNotifications.addListener('registrationError', (e) => {
      reportClientError(`[push] APNs registrationError: ${JSON.stringify(e)?.slice(0, 200)}`, { kind: 'push-stage' });
    });
    note('listeners attached');

    await PushNotifications.register();
    // Reaching here only means the request went to iOS — the token arrives
    // asynchronously in the listener above, which reports separately.
    flush('register() returned, awaiting token');
  } catch (e) {
    flush(`unexpected: ${e?.message ?? String(e)}`);
  }
}
