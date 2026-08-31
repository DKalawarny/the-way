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
// from outside. It now keeps a breadcrumb trail and parks it on the profile at
// every point it can stop, the token listeners included.
//
// Those listeners used to report through reportClientError alone, which dedupes
// and throttles to one send per 8 seconds — and the flush right after register()
// always claimed that slot a second before the token or the error arrived. So
// the two events that actually answer "why didn't the phone register?" were the
// only two guaranteed to be dropped (found 8/30, on a real trail from Daniel's
// phone that stopped dead at 'awaiting token'). They flush like any other stage
// now, and the last flush wins, so the profile ends up holding the outcome.
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
        flush(`token posted http=${r.status} len=${value?.length ?? 0}`);
      } catch (e) {
        flush(`token POST failed: ${e?.message ?? String(e)}`);
      }
    });
    await PushNotifications.addListener('registrationError', (e) => {
      flush(`APNs registrationError: ${JSON.stringify(e)?.slice(0, 200)}`);
    });
    note('listeners attached');

    await PushNotifications.register();
    // Reaching here only means the request went to iOS — the token (or the
    // error) arrives asynchronously in a listener above, and whichever fires
    // flushes over this one.
    note('register() returned');
    flush('awaiting token');
  } catch (e) {
    flush(`unexpected: ${e?.message ?? String(e)}`);
  }
}
