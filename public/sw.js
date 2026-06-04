// Cache version — bump this string when you deploy a breaking change
// so all clients immediately drop the old cache and fetch fresh assets.
const CACHE = 'kinwove-v2';

// ── Web Push (VAPID) ──────────────────────────────────────────────────────────
// Handles push events when the app is closed (requires VAPID keys on server +
// a push subscription stored in the DB). The usePushNotifications hook covers
// the background-tab case without VAPID — this is for full "app closed" push.
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data?.json() ?? {}; } catch { data = { title: 'kinwove', body: e.data?.text() ?? '' }; }

  const title = data.title ?? 'kinwove';
  const options = {
    body:   data.body   ?? '',
    icon:   data.icon   ?? '/icon-192.png',
    badge:  data.badge  ?? '/icon-192.png',
    tag:    data.tag    ?? 'kinwove-notif',
    data:   data.url    ? { url: data.url } : {},
    silent: false,
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

// Open / focus the app when the user taps a push notification
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url ?? '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.startsWith(self.location.origin) && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

// RECOVERY BUILD: this SW wipes all old caches and then becomes a no-op
// while in development mode. The fetch handler only runs on production
// (hashed /assets/ paths). Vite source files are never cached.

self.addEventListener('install', (e) => {
  self.skipWaiting(); // take over immediately
});

self.addEventListener('activate', (e) => {
  // Nuke every cache so no stale Vite source files remain
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept Vite dev server files (src/, @vite/, @react-refresh, etc.)
  // or anything on localhost — let them go straight to the network.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // Skip Supabase, analytics, and external API requests — always fresh
  if (url.hostname.includes('supabase.co')) return;
  if (url.hostname.includes('googleapis.com')) return;
  if (url.hostname.includes('quickchart.io')) return;
  if (url.pathname.startsWith('/api/')) return;

  // Production only: cache hashed build assets (/assets/*.js, /assets/*.css).
  // These filenames change on every build so stale reads are never an issue.
  if (url.pathname.startsWith('/assets/')) {
    e.respondWith(
      caches.open(CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // All other production requests — stale-while-revalidate.
  // Never returns undefined: if both cache and network fail, fall through
  // so the browser shows its own error rather than a silent blank page.
  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const networkFetch = fetch(request).then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        });
        // Only use cache as fallback if it's a real Response, not undefined
        return cached
          ? Promise.race([networkFetch.catch(() => cached), Promise.resolve(cached)])
          : networkFetch;
      })
    )
  );
});
