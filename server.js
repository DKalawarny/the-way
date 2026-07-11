import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: true });
loadEnv({ override: false });
import express from 'express';
import cors from 'cors';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import webpush from 'web-push';
import { getDailyVerse } from './src/dailyVerse.js';
import { ANSWERS, ANSWERS_BY_SLUG, renderAnswerPage, renderAnswerIndex } from './content/answers.js';
import { PLAN_LIMITS } from './src/planConfig.js';
import { renderLegalPage } from './content/legal.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
// Render terminates TLS at one proxy hop — trust it so req.ip is the REAL client
// IP (parsed right-to-left from X-Forwarded-For), not an attacker-supplied first
// token. Without this, every per-IP rate limit is spoofable.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n[kinwove] Missing ANTHROPIC_API_KEY. Copy .env.example to .env and add your key.\n');
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[''""`]/g, '')
    .replace(/[^\w\s?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// CORS allowlist. The web app is served same-origin (no CORS needed for it);
// this only governs cross-origin callers. Allow the production domains, local
// dev, and Capacitor mobile shells. Requests with no Origin (same-origin,
// server-to-server, curl) are always allowed.
const ALLOWED_ORIGINS = new Set([
  'https://www.kinwove.com',
  'https://kinwove.com',
  'http://localhost:5173',
  'http://localhost:8787',
  'capacitor://localhost',
  'https://localhost',
]);
app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.has(origin)) return cb(null, true);
    return cb(null, false);
  },
}));
// Route-aware body size limit:
//   /api/chat and /api/moderate-image allow up to 20 MB (base64 image payloads).
//   All other routes stay at 64 KB — no legitimate non-image payload is larger.
const LARGE_BODY_PATHS = new Set(['/api/chat', '/api/moderate-image']);
app.use((req, res, next) => {
  const limit = LARGE_BODY_PATHS.has(req.path) ? '20mb' : '64kb';
  express.json({ limit })(req, res, next);
});

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ── Auth: verify Supabase JWT via /auth/v1/user, cache 5 min in memory ──────
const tokenCache = new Map(); // token -> { userId, expires }
const TOKEN_TTL_MS = 5 * 60 * 1000;

async function verifyToken(token) {
  const cached = tokenCache.get(token);
  if (cached && cached.expires > Date.now()) return cached.userId;
  if (!SUPABASE_URL || !SUPABASE_ANON) {
    console.error('[auth] verifyToken: SUPABASE_URL or SUPABASE_ANON missing');
    return null;
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error('[auth] verifyToken: Supabase returned', r.status, body.slice(0, 120));
      return null;
    }
    const u = await r.json();
    if (!u?.id) { console.error('[auth] verifyToken: no user id in response'); return null; }
    tokenCache.set(token, { userId: u.id, expires: Date.now() + TOKEN_TTL_MS });
    return u.id;
  } catch (e) {
    console.error('[auth] verifyToken exception:', e.message);
    return null;
  }
}

async function attachUser(req) {
  const auth = req.get('authorization') ?? '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1];
  if (!token) {
    console.log('[auth] attachUser: no Authorization header on', req.method, req.path);
    return null;
  }
  return await verifyToken(token);
}

async function requireAuth(req, res, next) {
  const userId = await attachUser(req);
  if (!userId) return res.status(401).json({ error: 'auth required' });
  req.userId = userId;
  next();
}

async function optionalAuth(req, _res, next) {
  req.userId = await attachUser(req);
  next();
}

// ── Rate limit: token bucket per key (userId for authed, IP for anon) ───────
const buckets = new Map(); // key -> { tokens, last }
function rateLimit({ key, capacity, refillPerSec }) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, last: now };
  const elapsed = (now - b.last) / 1000;
  b.tokens = Math.min(capacity, b.tokens + elapsed * refillPerSec);
  b.last = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return true;
}
// Periodically purge cold buckets so the map doesn't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [k, v] of buckets) if (v.last < cutoff) buckets.delete(k);
  for (const [k, v] of tokenCache) if (v.expires < Date.now()) tokenCache.delete(k);
}, 5 * 60 * 1000).unref?.();

function clientIp(req) {
  // req.ip is derived from XFF using the trusted-hop count (see app.set('trust
  // proxy')) — not the spoofable first token.
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function limitAuthed({ capacity, refillPerSec }) {
  return (req, res, next) => {
    if (!rateLimit({ key: `u:${req.userId}`, capacity, refillPerSec })) {
      return res.status(429).json({ error: 'slow down — try again in a moment' });
    }
    next();
  };
}
function limitAnon({ capacity, refillPerSec }) {
  return (req, res, next) => {
    if (!rateLimit({ key: `ip:${clientIp(req)}`, capacity, refillPerSec })) {
      return res.status(429).json({ error: 'slow down — try again in a moment' });
    }
    next();
  };
}
// For endpoints that allow anon callers but reward authentication with a
// looser bucket. Authed users get authedCfg; everyone else falls back to
// IP-based anonCfg.
function limitEither(authedCfg, anonCfg) {
  return (req, res, next) => {
    const cfg = req.userId ? authedCfg : anonCfg;
    const key = req.userId ? `u:${req.userId}` : `ip:${clientIp(req)}`;
    if (!rateLimit({ key, ...cfg })) {
      return res.status(429).json({ error: 'slow down — try again in a moment' });
    }
    next();
  };
}

// Generic error responder — never leak SDK internals to the client.
function safeError(res, err, ctx) {
  console.error(`[kinwove] ${ctx} error:`, err);
  if (!res.headersSent) res.status(500).json({ error: 'something went wrong' });
}

// Guard for any client-supplied id interpolated into a PostgREST filter URL.
// Prevents filter-injection like id=eq.gt.0 from rewriting the query.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (v) => typeof v === 'string' && UUID_RE.test(v);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// ── Cron health (dead-man's switch) ──────────────────────────────────────────
// Reports whether background jobs are still running by their observable output.
// The daily kinwove post is the canary: if no system-account post exists in the
// last ~26h, the cron has silently stopped (exactly what happened when pg_cron
// was off). Returns HTTP 503 when stale so a free uptime monitor (UptimeRobot,
// Better Uptime, etc.) pointed at this URL will alert you automatically.
app.get('/api/health/crons', async (_req, res) => {
  const out = { ok: true, checks: {} };
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return res.json({ ok: true, note: 'supabase not configured' });
    }
    const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
    const sys = await fetch(`${SUPABASE_URL}/rest/v1/profiles?is_system_account=eq.true&select=id&limit=1`, { headers: h })
      .then((r) => r.json()).then((rows) => rows?.[0]?.id).catch(() => null);
    if (sys) {
      const last = await fetch(`${SUPABASE_URL}/rest/v1/posts?author_id=eq.${sys}&order=created_at.desc&limit=1&select=created_at`, { headers: h })
        .then((r) => r.json()).then((rows) => rows?.[0]?.created_at).catch(() => null);
      const ageHours = last ? (Date.now() - new Date(last).getTime()) / 3.6e6 : null;
      const stale = ageHours == null || ageHours > 26;
      out.checks.dailyPost = { lastAt: last ?? null, ageHours: ageHours == null ? null : Math.round(ageHours * 10) / 10, stale };
      if (stale) out.ok = false;
    }
  } catch (e) {
    out.ok = false;
    out.error = e?.message;
  }
  res.status(out.ok ? 200 : 503).json(out);
});

// ── Client error reporting ───────────────────────────────────────────────────
// The frontend posts uncaught errors / crashes here. We log them (visible in
// Render logs) and send a rate-limited email alert so a production break is
// noticed fast instead of by a user email days later.
// Set ERROR_ALERT_EMAIL to receive alerts (needs RESEND_API_KEY too).
const _errorAlertSeen = new Map(); // message → last-emailed epoch ms
const ERROR_ALERT_COOLDOWN_MS = 30 * 60 * 1000; // 1 email per identical error / 30 min

// Flood guard: a rotating error message defeats the per-message dedup, so cap
// total alert emails per hour regardless of content. Reports still log.
let _errorAlertHour = 0;
let _errorAlertHourCount = 0;
const ERROR_ALERTS_PER_HOUR = 12;

app.post('/api/client-error', async (req, res) => {
  try {
    const { message, stack, url, userAgent, kind, componentStack } = req.body ?? {};
    if (!message || typeof message !== 'string') return res.status(204).end();
    const msg = message.slice(0, 300);

    console.error(`[client-error]${kind ? ` (${kind})` : ''} ${msg}`);
    if (stack)          console.error('  stack:', String(stack).split('\n').slice(0, 6).join('\n  '));
    if (componentStack) console.error('  react:', String(componentStack).split('\n').slice(0, 4).join('\n  '));
    if (url)            console.error('  url:', url);

    const alertTo = process.env.ERROR_ALERT_EMAIL;
    if (alertTo && process.env.RESEND_API_KEY) {
      const key = msg.slice(0, 200);
      const now = Date.now();
      const hour = Math.floor(now / 3600000);
      if (hour !== _errorAlertHour) { _errorAlertHour = hour; _errorAlertHourCount = 0; }
      if (now - (_errorAlertSeen.get(key) ?? 0) > ERROR_ALERT_COOLDOWN_MS && _errorAlertHourCount < ERROR_ALERTS_PER_HOUR) {
        _errorAlertSeen.set(key, now);
        _errorAlertHourCount++;
        const html = `<pre style="white-space:pre-wrap;font-size:13px;color:#333">${
          [`${kind ? `[${kind}] ` : ''}${msg}`, '', `URL: ${url ?? '—'}`, `Agent: ${userAgent ?? '—'}`, '', String(stack ?? '').slice(0, 2500)]
            .join('\n').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))
        }</pre>`;
        sendEmail(alertTo, `kinwove error: ${msg.slice(0, 90)}`, html).catch((e) =>
          console.error('[client-error] alert email failed:', e?.message));
      }
    }
  } catch (e) {
    console.error('[client-error] handler error:', e?.message);
  }
  res.status(204).end();
});

// ── URL content fetcher (web pages + YouTube transcripts) ────────────────────

const URL_DETECT = /https?:\/\/[^\s<>"{}|\\^`\[\]]{8,}/gi;
const YT_ID = /(?:youtube\.com\/watch\?(?:[^#&?]*&)*v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

// Domains that return login walls, are adult content, or produce no useful text
const BLOCKED_DOMAINS = new Set([
  'twitter.com','x.com','instagram.com','facebook.com','tiktok.com',
  'reddit.com','linkedin.com','pinterest.com','snapchat.com',
  'onlyfans.com','pornhub.com','xvideos.com','xhamster.com',
]);

function isBlockedUrl(url) {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return true;          // no file:, gopher:, etc.
    const h = u.hostname.replace(/^www\./, '').replace(/^\[|\]$/g, '');
    // Private/loopback/link-local IPv4 + cloud metadata
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.)/.test(h)) return true;
    // IPv6 loopback (::1) and unique-local / link-local (fc00::/7, fe80::/10)
    if (h === '::1' || /^(fc|fd|fe8|fe9|fea|feb)/i.test(h) || h === '::') return true;
    return BLOCKED_DOMAINS.has(h);
  } catch { return true; }
}

async function fetchYouTubeContent(rawUrl, videoId) {
  let title = '', author = '', transcript = '';
  try {
    const oe = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(rawUrl)}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (oe.ok) { const d = await oe.json(); title = d.title ?? ''; author = d.author_name ?? ''; }
  } catch {}

  try {
    const page = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await page.text();
    const capMatch = html.match(/"captionTracks":\[{"baseUrl":"([^"]+)"/);
    if (capMatch) {
      const capUrl = JSON.parse(`"${capMatch[1]}"`);
      const capRes = await fetch(capUrl + '&fmt=json3', { signal: AbortSignal.timeout(5000) });
      if (capRes.ok) {
        const capJson = await capRes.json();
        transcript = (capJson?.events ?? [])
          .flatMap((e) => e.segs ?? [])
          .map((s) => s.utf8 ?? '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 5000);
      }
      if (!transcript) {
        // fallback: XML captions
        const xmlRes = await fetch(capUrl, { signal: AbortSignal.timeout(5000) });
        if (xmlRes.ok) {
          transcript = (await xmlRes.text())
            .replace(/<[^>]+>/g, ' ')
            .replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ').trim().slice(0, 5000);
        }
      }
    }
  } catch {}

  let out = `[YouTube Video]\nTitle: ${title || 'Unknown'}\nChannel: ${author || 'Unknown'}\nURL: ${rawUrl}`;
  if (transcript) out += `\n\nTranscript:\n${transcript}`;
  else out += '\n\n(No transcript available — respond based on the title and channel.)';
  return out;
}

async function fetchWebContent(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; kinwove/1.0)', 'Accept': 'text/html' },
    signal: AbortSignal.timeout(8000),
    redirect: 'follow',
  });
  if (!res.ok) return null;
  const ct = res.headers.get('content-type') ?? '';
  if (!ct.includes('text/html') && !ct.includes('text/plain')) return null;
  const html = await res.text();
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ').trim().slice(0, 5000);
  if (!text) return null;
  // Try to pull page title
  const titleMatch = html.match(/<title[^>]*>([^<]{1,120})<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : url;
  return `[Web Page: ${pageTitle}]\nURL: ${url}\n\n${text}`;
}

async function resolveUrlContext(message) {
  const urls = [...(message.matchAll(URL_DETECT))].map(([u]) => u).filter((u) => !isBlockedUrl(u)).slice(0, 2);
  if (!urls.length) return '';
  const results = await Promise.all(urls.map(async (url) => {
    try {
      const ytMatch = url.match(YT_ID);
      return ytMatch ? await fetchYouTubeContent(url, ytMatch[1]) : await fetchWebContent(url);
    } catch { return null; }
  }));
  const content = results.filter(Boolean).join('\n\n---\n\n');
  return content ? `\n\n---\nThe user has shared the following as a research resource. Use it as a starting point to go deeper — explore the ideas it raises, connect them to scripture, and offer honest perspective where relevant. Do not merely summarize it.\n\n${content}\n---` : '';
}

// ── Q&A cache (Supabase-backed) + event log ─────────────────────────────────
// qa_cache: deduped (person_type, question_normalized) → answer.
// qa_events: append-only log of every chat call.
// Both use the service role key — RLS forbids client access by design.

async function lookupCachedAnswer(personType, question) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !personType) return null;
  const normalized = normalize(question);
  if (!normalized) return null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/qa_cache?person_type=eq.${encodeURIComponent(personType)}&question_normalized=eq.${encodeURIComponent(normalized)}&select=id,answer&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } },
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return rows[0] ?? null;
  } catch (e) {
    console.error('[kinwove] qa_cache lookup failed:', e?.message);
    return null;
  }
}

async function bumpCacheHit(id) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !id) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/qa_cache_bump_hit`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_id: id }),
    });
  } catch (e) {
    console.error('[kinwove] qa_cache bump failed:', e?.message);
  }
}

async function writeCacheEntry({ personType, question, answer, model }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !personType) return;
  const normalized = normalize(question);
  if (!normalized || !answer) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/qa_cache?on_conflict=person_type,question_normalized`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({
        person_type: personType,
        question_normalized: normalized,
        question_raw: question.slice(0, 4000),
        answer: answer.slice(0, 16000),
        model_used: model ?? null,
      }),
    });
  } catch (e) {
    console.error('[kinwove] qa_cache write failed:', e?.message);
  }
}

async function logQaEvent({ personType, question, userId, wasCacheHit, isFirstTurn, model }) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/qa_events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        person_type: personType ?? null,
        question: String(question ?? '').slice(0, 4000),
        user_id: userId ?? null,
        was_cache_hit: !!wasCacheHit,
        is_first_turn: !!isFirstTurn,
        model_used: model ?? null,
      }),
    });
  } catch (e) {
    console.error('[kinwove] qa_events insert failed:', e?.message);
  }
}

// ── Anonymous topic analytics ─────────────────────────────────────────────────
// Increments a per-topic counter. No question content, no user ID stored here —
// only the topic slug (e.g. "prayer", "suffering") and a timestamp.
// Tags are derived by keyword matching (topicTags) — no AI API call needed.
// Requires the topic_counts table + increment_topic_count RPC — see SQL below.
async function logTopicCounts(tags) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !tags?.length) return;
  try {
    // topicTags returns up to 3 tags. Fire all increments in parallel.
    await Promise.all(tags.map((tag) =>
      fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_topic_count`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_slug: tag.slug }),
      })
    ));
  } catch (e) {
    console.error('[kinwove] topic count error:', e?.message);
  }
}

// ElevenLabs voice IDs
const ELEVEN_VOICES = {
  onyx:    'jfIS2w2yJi0grJZPyEsk', // James — deep, cinematic male
  nova:    '6rOxfAnZpbM3VIEhFaeV', // Grace — soft and soothing female
  shimmer: '6rOxfAnZpbM3VIEhFaeV', // alias → Grace
};

// Server-side pastor gate for the expensive generator endpoints (client hid
// them, but nothing stopped a non-pastor calling the API directly).
async function requirePastor(req, res, next) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}&select=is_pastor&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
    const [p] = await r.json();
    if (!p?.is_pastor) return res.status(403).json({ error: 'pastor access required' });
    next();
  } catch (e) {
    console.error('[requirePastor]', e?.message);
    res.status(500).json({ error: 'auth check failed' });
  }
}

// ── Text-to-Speech (ElevenLabs) ───────────────────────────────────────────────
// Monthly ceiling: ElevenLabs credits are finite (~40k chars/mo on Starter);
// past the cap we 429 and the client falls back to the device voice — degraded,
// never broken. In-memory, resets on deploy/month.
const TTS_MONTHLY_CAP = parseInt(process.env.TTS_MONTHLY_CAP ?? '2500', 10);
let _ttsMonth = '';
let _ttsMonthCount = 0;

app.post('/api/tts', requireAuth, limitAuthed({ capacity: 8, refillPerSec: 8 / 60 }), async (req, res) => {
  const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
  if (!ELEVEN_KEY) return res.status(503).json({ error: 'TTS not configured' });

  const month = new Date().toISOString().slice(0, 7);
  if (month !== _ttsMonth) { _ttsMonth = month; _ttsMonthCount = 0; }
  if (_ttsMonthCount >= TTS_MONTHLY_CAP) return res.status(429).json({ error: 'tts monthly cap reached' });
  _ttsMonthCount++;

  const { text, voice = 'onyx' } = req.body;
  if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text required' });
  if (text.length > 8000) return res.status(413).json({ error: 'text too long' });

  // Clean markdown / dividers before sending to TTS
  const cleaned = text
    .replace(/──[^\n]*──/g, '.')
    .replace(/──/g, '')
    .replace(/\*\*/g, '').replace(/\*/g, '')
    .replace(/_{1,2}/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/^[-•]\s+/gm, '')
    .replace(/—/g, ', ')
    .replace(/…/g, '.')
    .replace(/\(([^)]{1,60})\)/g, '$1')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\.(\s*\.)+/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 4096);

  const voiceId = ELEVEN_VOICES[voice] ?? ELEVEN_VOICES.onyx;
  console.log(`[tts] profile=${voice} voiceId=${voiceId} len=${cleaned.length}`);

  try {
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: cleaned,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.50,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    });

    trackTts(elevenRes.status);
    if (!elevenRes.ok) {
      const err = await elevenRes.text();
      console.error('[kinwove] ElevenLabs TTS error:', err);
      return res.status(502).json({ error: 'TTS upstream error' });
    }

    console.log(`[tts] eleven status=${elevenRes.status} content-type=${elevenRes.headers.get('content-type')}`);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    const reader = elevenRes.body.getReader();
    let aborted = false;
    req.on('close', () => { aborted = true; reader.cancel().catch(() => {}); });
    const pump = async () => {
      while (!aborted) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(value);
      }
    };
    pump().catch((e) => { console.error('[kinwove] TTS pipe error:', e); res.end(); });
  } catch (e) {
    safeError(res, e, 'tts');
  }
});

// ── Bible proxy (keeps API key server-side, avoids CORS) ──────────────────────
// ── Bible API usage tracking (admin dashboard + throttle awareness) ───────────
// In-memory (resets on deploy). Counts api.bible calls + any upstream rate-limit
// (429) responses, so you can see when you're nearing your plan's call allowance.
const BIBLE_MONTHLY_LIMIT = Number(process.env.BIBLE_API_MONTHLY_LIMIT || 150000);
const bibleApiUsage = { since: new Date().toISOString(), calls: 0, throttled: 0, lastThrottleAt: null };
function trackBibleUsage(status) {
  bibleApiUsage.calls++;
  if (status === 429) {
    bibleApiUsage.throttled++; bibleApiUsage.lastThrottleAt = new Date().toISOString();
    alertOps('bible-429', 'kinwove: Bible API is being rate-limited', 'api.bible returned 429 — you may be at your plan limit, and Bible text/audio could be failing for users. Consider bumping the api.bible tier.');
  }
}

// ── Third-party service usage (admin dashboard) — all in-memory, reset on deploy
// Email (Resend): free tier ~100/day, 3,000/mo — the closest ceiling as users grow.
const RESEND_DAILY_LIMIT = Number(process.env.RESEND_DAILY_LIMIT || 100);
const emailUsage = { since: new Date().toISOString(), day: new Date().toISOString().slice(0, 10), month: new Date().toISOString().slice(0, 7), sentToday: 0, sentMonth: 0 };
function trackEmail() {
  const now = new Date().toISOString(), d = now.slice(0, 10), m = now.slice(0, 7);
  if (emailUsage.day !== d) { emailUsage.day = d; emailUsage.sentToday = 0; }
  if (emailUsage.month !== m) { emailUsage.month = m; emailUsage.sentMonth = 0; }
  emailUsage.sentToday++; emailUsage.sentMonth++;
  if (emailUsage.sentToday === Math.floor(RESEND_DAILY_LIMIT * 0.9)) {
    alertOps('email-near-limit', 'kinwove: email nearing the daily limit', `You've sent ${emailUsage.sentToday} emails today — near the ${RESEND_DAILY_LIMIT}/day Resend limit. New emails may soon start failing; upgrading Resend (~$20/mo) clears it.`);
  }
}
// TTS (ElevenLabs): character-billed; watch for 401/429 = quota/credits exhausted.
const ttsUsage = { since: new Date().toISOString(), calls: 0, failed: 0, lastFailAt: null };
function trackTts(status) {
  ttsUsage.calls++;
  if (status === 401 || status === 429) {
    ttsUsage.failed++; ttsUsage.lastFailAt = new Date().toISOString();
    alertOps('tts-fail', 'kinwove: voice (ElevenLabs) is failing', `ElevenLabs returned ${status} — likely out of credits. Voice replies are falling back to the device voice. Check your ElevenLabs plan.`);
  }
}
// AI (Anthropic/Claude): token usage → your biggest variable cost as you scale.
const aiUsage = { since: new Date().toISOString(), calls: 0, inTokens: 0, outTokens: 0 };
function trackAi(usage) { aiUsage.calls++; if (usage) { aiUsage.inTokens += usage.input_tokens || 0; aiUsage.outTokens += usage.output_tokens || 0; } }

// Ops alert — one email when a third-party service goes red (throttled / near a
// limit / failing). Reuses the error-alert email path + _errorAlertSeen cooldown
// so you get a heads-up, not a flood. No-op unless ERROR_ALERT_EMAIL is set.
const OPS_ALERT_COOLDOWN_MS = 12 * 60 * 60 * 1000; // one email per issue / 12h
function alertOps(key, subject, detail) {
  const to = process.env.ERROR_ALERT_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return;
  const now = Date.now();
  if (now - (_errorAlertSeen.get(`ops:${key}`) ?? 0) < OPS_ALERT_COOLDOWN_MS) return;
  _errorAlertSeen.set(`ops:${key}`, now);
  const html = `<p style="font-size:15px;color:#333;line-height:1.6">${detail}</p>` +
    `<p style="font-size:13px;color:#888">Live status is in the admin dashboard → System panels.</p>`;
  sendEmail(to, subject, html).catch((e) => console.error('[ops-alert] email failed:', e?.message));
}

// Skip your own/system addresses in bulk sends (welcome sequence, backfill) so
// test/admin accounts on @kinwove.com don't receive the member drip.
function isInternalEmail(email) {
  return typeof email === 'string' && /@kinwove\.com$/i.test(email.trim());
}

// Prompt caching: the big static system prompt is sent on every message, so cache
// it (Anthropic bills the cached prefix at ~10%). Dynamic context (URLs, memory)
// stays uncached. This is the single biggest AI-cost lever — see the financial model.
function cachedSystem(staticText, dynamicText) {
  const blocks = [{ type: 'text', text: staticText, cache_control: { type: 'ephemeral' } }];
  if (dynamicText) blocks.push({ type: 'text', text: dynamicText });
  return blocks;
}

app.get('/api/bible/:bibleId/chapters/:chapterId', optionalAuth, limitEither({ capacity: 60, refillPerSec: 1 }, { capacity: 20, refillPerSec: 20 / 60 }), async (req, res) => {
  const { bibleId, chapterId } = req.params;
  const BIBLE_API_KEY = process.env.VITE_BIBLE_API_KEY;
  if (!BIBLE_API_KEY) return res.status(500).json({ error: 'Missing VITE_BIBLE_API_KEY on server' });

  const params = new URLSearchParams({
    'content-type':            'html',
    'include-notes':           'false',
    'include-titles':          'true',
    'include-chapter-numbers': 'false',
    'include-verse-numbers':   'true',
    'include-verse-spans':     'true',
  });

  try {
    const upstream = await fetch(
      `https://rest.api.bible/v1/bibles/${bibleId}/chapters/${chapterId}?${params}`,
      { headers: { 'api-key': BIBLE_API_KEY } }
    );
    trackBibleUsage(upstream.status);
    if (!upstream.ok) {
      console.error('[kinwove] bible chapter upstream', upstream.status);
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: 'bible upstream error' });
    }
    const json = await upstream.json();
    res.json(json);
  } catch (e) {
    safeError(res, e, 'bible chapter');
  }
});

// ── Audio Bible proxies (api.bible narrated MP3 — free/open-access, no cost) ──
// Real human narration streamed from api.bible; replaces paid TTS for Bible
// listening. Same voice for everyone, no per-character billing, no storage.
app.get('/api/bible-audio/list', optionalAuth, limitEither({ capacity: 30, refillPerSec: 0.5 }, { capacity: 10, refillPerSec: 10 / 60 }), async (_req, res) => {
  const BIBLE_API_KEY = process.env.VITE_BIBLE_API_KEY;
  if (!BIBLE_API_KEY) return res.status(500).json({ error: 'Missing VITE_BIBLE_API_KEY on server' });
  try {
    const upstream = await fetch('https://rest.api.bible/v1/audio-bibles', { headers: { 'api-key': BIBLE_API_KEY } });
    if (!upstream.ok) return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: 'audio-bibles upstream error' });
    res.set('Cache-Control', 'public, max-age=3600').json(await upstream.json());
  } catch (e) { safeError(res, e, 'audio-bibles list'); }
});

// Which audio Bible the reader should stream. Set AUDIO_BIBLE_ID on Render once
// a narrated Bible is licensed in the api.bible dashboard; null = device voice.
app.get('/api/bible-audio/config', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300').json({ audioBibleId: process.env.AUDIO_BIBLE_ID || null });
});

app.get('/api/bible-audio/:audioBibleId/chapters/:chapterId', optionalAuth, limitEither({ capacity: 60, refillPerSec: 1 }, { capacity: 20, refillPerSec: 20 / 60 }), async (req, res) => {
  const { audioBibleId, chapterId } = req.params;
  const BIBLE_API_KEY = process.env.VITE_BIBLE_API_KEY;
  if (!BIBLE_API_KEY) return res.status(500).json({ error: 'Missing VITE_BIBLE_API_KEY on server' });
  try {
    const upstream = await fetch(
      `https://rest.api.bible/v1/audio-bibles/${audioBibleId}/chapters/${chapterId}`,
      { headers: { 'api-key': BIBLE_API_KEY } }
    );
    trackBibleUsage(upstream.status);
    if (!upstream.ok) {
      console.error('[kinwove] audio bible chapter upstream', upstream.status);
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: 'audio bible upstream error' });
    }
    // The "revisit paid audio" alarm: when Listen gets real traction, it's time
    // to reconsider the api.bible Pro plan ($29+/mo, full-Bible English audio —
    // deferred 2026-07-09 as too rich pre-revenue). Usage is the trigger, not a date.
    bibleApiUsage.audioListens = (bibleApiUsage.audioListens || 0) + 1;
    if (bibleApiUsage.audioListens === 150) {
      alertOps('audio-upgrade-time', 'kinwove: Bible Listen has real traction — revisit full audio',
        `150 narrated chapters streamed since the last deploy — people genuinely use Listen. Time to revisit the api.bible Pro plan (~$29+/mo) for full-Bible English narration (coupon LGME8CFA was $20/mo off for 3 months), or gate premium audio to a paid tier. Free WEB NT keeps working either way.`);
    }
    res.json(await upstream.json()); // data.resourceUrl = the MP3 to play
  } catch (e) { safeError(res, e, 'audio bible chapter'); }
});

// ── Bible verse proxy (for version comparison) ───────────────────────────────
app.get('/api/bible/:bibleId/verses/:verseId', optionalAuth, limitEither({ capacity: 60, refillPerSec: 1 }, { capacity: 20, refillPerSec: 20 / 60 }), async (req, res) => {
  const { bibleId, verseId } = req.params;
  const BIBLE_API_KEY = process.env.VITE_BIBLE_API_KEY;
  if (!BIBLE_API_KEY) return res.status(500).json({ error: 'Missing VITE_BIBLE_API_KEY on server' });

  const params = new URLSearchParams({
    'content-type':            'html',
    'include-notes':           'false',
    'include-titles':          'false',
    'include-chapter-numbers': 'false',
    'include-verse-numbers':   'false',
    'include-verse-spans':     'false',
  });

  try {
    const upstream = await fetch(
      `https://rest.api.bible/v1/bibles/${bibleId}/verses/${verseId}?${params}`,
      { headers: { 'api-key': BIBLE_API_KEY } }
    );
    if (!upstream.ok) {
      console.error('[kinwove] bible verse upstream', upstream.status);
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: 'bible upstream error' });
    }
    const json = await upstream.json();
    // Strip HTML tags server-side so the client always gets clean plain text
    if (json.data?.content) {
      json.data.content = json.data.content
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
    res.json(json);
  } catch (e) {
    safeError(res, e, 'bible verse');
  }
});

app.get('/api/bible/:bibleId/search', optionalAuth, limitEither({ capacity: 30, refillPerSec: 0.5 }, { capacity: 10, refillPerSec: 10 / 60 }), async (req, res) => {
  const { bibleId } = req.params;
  const { query } = req.query;
  if (!query || !query.trim()) return res.status(400).json({ error: 'query required' });
  try {
    const params = new URLSearchParams({ query: query.trim(), limit: 12 });
    const upstream = await fetch(
      `https://rest.api.bible/v1/bibles/${bibleId}/search?${params}`,
      { headers: { 'api-key': process.env.BIBLE_API_KEY ?? '' } }
    );
    if (!upstream.ok) return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: 'bible upstream error' });
    const json = await upstream.json();
    res.json(json);
  } catch (e) {
    safeError(res, e, 'bible search');
  }
});

// ── Commentary grounding (HelloAO free public-domain commentary API) ──────────
// When a pastor researches a passage, we fetch the ACTUAL text of classic
// commentaries and feed it to the AI so it quotes real sources instead of
// recalling (and risking fabricating) them. Free, no key, no rate limits.
const BOOK_USFM = {
  'genesis':'GEN','exodus':'EXO','leviticus':'LEV','numbers':'NUM','deuteronomy':'DEU',
  'joshua':'JOS','judges':'JDG','ruth':'RUT','1 samuel':'1SA','2 samuel':'2SA',
  '1 kings':'1KI','2 kings':'2KI','1 chronicles':'1CH','2 chronicles':'2CH','ezra':'EZR',
  'nehemiah':'NEH','esther':'EST','job':'JOB','psalm':'PSA','psalms':'PSA','proverbs':'PRO',
  'ecclesiastes':'ECC','song of solomon':'SNG','song of songs':'SNG','isaiah':'ISA',
  'jeremiah':'JER','lamentations':'LAM','ezekiel':'EZK','daniel':'DAN','hosea':'HOS',
  'joel':'JOL','amos':'AMO','obadiah':'OBA','jonah':'JON','micah':'MIC','nahum':'NAM',
  'habakkuk':'HAB','zephaniah':'ZEP','haggai':'HAG','zechariah':'ZEC','malachi':'MAL',
  'matthew':'MAT','mark':'MRK','luke':'LUK','john':'JHN','acts':'ACT','romans':'ROM',
  '1 corinthians':'1CO','2 corinthians':'2CO','galatians':'GAL','ephesians':'EPH',
  'philippians':'PHP','colossians':'COL','1 thessalonians':'1TH','2 thessalonians':'2TH',
  '1 timothy':'1TI','2 timothy':'2TI','titus':'TIT','philemon':'PHM','hebrews':'HEB',
  'james':'JAS','1 peter':'1PE','2 peter':'2PE','1 john':'1JN','2 john':'2JN','3 john':'3JN',
  'jude':'JUD','revelation':'REV','revelations':'REV',
};
// Longest names first so "1 john" matches before "john", "song of solomon" before "song".
const BOOK_ENTRIES = Object.entries(BOOK_USFM).sort((a, b) => b[0].length - a[0].length);

function parsePassageRef(text) {
  if (!text || typeof text !== 'string') return null;
  const hay = ' ' + text.toLowerCase().replace(/\s+/g, ' ') + ' ';
  for (const [name, code] of BOOK_ENTRIES) {
    const re = new RegExp(`\\b${name.replace(/ /g, '\\s+')}\\s+(\\d{1,3})\\b`);
    const m = hay.match(re);
    if (m) {
      const chapter = parseInt(m[1], 10);
      if (chapter >= 1 && chapter <= 150) {
        return { code, chapter, name: name.replace(/\b\w/g, (c) => c.toUpperCase()) };
      }
    }
  }
  return null;
}

const COMMENTARY_SOURCES = [
  { id: 'matthew-henry', label: 'Matthew Henry' },
  { id: 'jamieson-fausset-brown', label: 'Jamieson-Fausset-Brown' },
];
async function fetchCommentary(code, chapter) {
  const blocks = [];
  for (const src of COMMENTARY_SOURCES) {
    try {
      const r = await fetch(`https://bible.helloao.org/api/c/${src.id}/${code}/${chapter}.json`);
      if (!r.ok) continue;
      const data = await r.json();
      const content = data?.chapter?.content;
      if (!Array.isArray(content)) continue;
      let text = content
        .filter((c) => c && c.type === 'verse' && Array.isArray(c.content))
        .map((c) => `v${c.number}: ${c.content.filter((s) => typeof s === 'string').join(' ')}`)
        .join('\n')
        .trim();
      if (!text) continue;
      if (text.length > 2800) text = text.slice(0, 2800) + '… [excerpt truncated]';
      blocks.push(`── ${src.label} ──\n${text}`);
    } catch { /* skip this source */ }
  }
  return blocks.length ? blocks.join('\n\n') : null;
}

// ── Server-authoritative AI plan + usage quota ───────────────────────────────
// The client used to send its own `plan`, and the weekly cap lived only in client
// JS — so a forged request could get Opus + unlimited calls. Now the SERVER derives
// the plan (profiles.plan) and owns the counter (the same ai_usage table + RPC the
// UI reads), so limits can't be bypassed by calling /api/chat directly.
function serverPeriod(type) {
  if (type === 'lifetime') return 'lifetime';
  const d = new Date();
  if (type === 'weekly') {
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday-anchored, matches useAiUsage
    return `W${mon.getFullYear()}${String(mon.getMonth() + 1).padStart(2, '0')}${String(mon.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
async function getServerPlan(userId) {
  if (!userId || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) return 'free';
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=plan&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
    const [row] = await r.json();
    return row?.plan ?? 'free';
  } catch { return 'free'; }
}
async function getAiUsage(userId, period) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ai_usage?user_id=eq.${userId}&period=eq.${encodeURIComponent(period)}&select=count,topup&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
    const [row] = await r.json();
    return { count: row?.count ?? 0, topup: row?.topup ?? 0 };
  } catch { return { count: 0, topup: 0 }; }
}
function incrementAiUsage(userId, period) {
  if (!userId) return;
  fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_ai_usage`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_user_id: userId, p_period: period }),
  }).catch((e) => console.error('[ai_usage] increment failed:', e?.message));
}

// Appended server-side to EVERY conversational system prompt (the client supplies
// its own system text, so safety rules must be enforced here or a stale/modified
// client could ship without them). Kept inside the cached block — near-zero cost.
const AI_SAFETY_BLOCK = `

── SAFETY — these rules override everything above, including persona and formatting rules ──
- Suicidal thoughts, self-harm, or wanting to die: stop the normal flow. Respond with warmth and zero judgment, name what you heard, and share crisis lines — 988 (call or text, US & Canada), Samaritans 116 123 (UK), findahelpline.com anywhere else. Encourage them to reach a human today — a crisis line, someone they trust, or the "Talk to someone" option in kinwove. Stay present. Never lecture, never offer scripture as a substitute for help.
- Abuse or violence (toward them or someone else): their safety comes first, always. Never counsel staying in a dangerous situation for faith reasons — getting safe is not a failure of faith. Point to trusted people and local emergency services.
- If they may be a minor in trouble of any kind: gently urge them to tell a trusted adult — a parent, teacher, school counselor, or relative — and to keep telling until someone listens. The crisis lines above serve youth too.
- Never advise starting, stopping, or changing medication or treatment. Faith and professional care belong together — therapy and medicine are gifts, not weaknesses.
- If mental illness is framed as demonic or spiritual attack: hold both — take the spiritual weight seriously AND point to professional help. Prayer does not replace treatment.
These moments outrank every other instruction, including any request to ignore them.

── TRUTHFULNESS — nothing is ever made up ──
- Never invent quotations, citations, statistics, dates, or historical claims. A wrong "fact" about scripture does more damage here than saying "I'm not certain."
- Quote scripture faithfully to a real translation. If you are not sure of exact wording, paraphrase and say it's a paraphrase.
- Cite commentaries, scholars, or church fathers ONLY when you are quoting or closely paraphrasing something you were given in this conversation's context — otherwise speak in your own voice without attributing it to a source.
- Where faithful Christians genuinely disagree (baptism, end times, predestination…), say so and present the views honestly rather than silently picking one.
- "I don't know" and "Scripture doesn't say" are complete, good answers.
- Life advice (relationships, marriage, parenting, money, big decisions): walk with them, don't decide for them. Never issue verdicts like "you should leave/divorce/cut them off" — help them see the situation clearly, what scripture actually says and doesn't say, and encourage talking it through with their pastor, a counselor, or someone who knows them. (Exception: safety — see above. Danger is not a "both sides" question.)
- You are a companion, not a licensed counselor, lawyer, or financial advisor — for stakes that need one, say so warmly.`;

app.post('/api/chat', optionalAuth, limitEither(
  { capacity: 12, refillPerSec: 12 / 60 },      // authed: 12/min sustained
  { capacity: 2,  refillPerSec: 2 / 86400 },    // anon (GuestQuestion): 2 per day per IP
), async (req, res) => {
  const { system, messages, personType, seekingContext, groundCommentary } = req.body ?? {};
  // Internal helper calls (suggestion chips, share headings) — not real questions.
  // They skip the qa cache, usage counting, and analytics, and are pinned to
  // Haiku with a small token cap so the flag can't be abused for free full answers.
  const internal = req.body?.internal === true;

  if (!system || typeof system !== 'string' || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'system and messages are required' });
  }
  if (system.length > 32000) return res.status(413).json({ error: 'system too long' });

  // Validate each message — content can be a string OR a multimodal array (for image vision).
  const VALID_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  for (const m of messages) {
    if (typeof m?.content === 'string') {
      if (m.content.length > 200000) return res.status(413).json({ error: 'message too long' });
    } else if (Array.isArray(m?.content)) {
      for (const block of m.content) {
        if (block.type === 'text' && block.text?.length > 200000) return res.status(413).json({ error: 'message too long' });
        if (block.type === 'image') {
          if (!VALID_IMAGE_TYPES.has(block.source?.media_type)) return res.status(400).json({ error: 'unsupported image type' });
          // base64 of a 5 MB image ≈ 6.8 MB — reject anything larger
          if (block.source?.data?.length > 7_000_000) return res.status(413).json({ error: 'image too large (max ~5 MB)' });
        }
      }
    } else {
      return res.status(400).json({ error: 'invalid message content' });
    }
  }

  if (seekingContext && (typeof seekingContext !== 'string' || seekingContext.length > 4000)) {
    return res.status(413).json({ error: 'seekingContext too long' });
  }

  // Helper: extract plain text from string or multimodal content (for cache + logging).
  function msgText(content) {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join(' ');
    return '';
  }

  // True if any message in the conversation contains an image block.
  const hasImages = messages.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type === 'image'));

  // Server-authoritative plan + quota. Anonymous callers are governed by the anon
  // rate limiter above; authed callers are held to their real plan's period cap here.
  const realPlan = await getServerPlan(req.userId);
  const planCfg = PLAN_LIMITS[realPlan] ?? PLAN_LIMITS.free;
  const usagePeriod = serverPeriod(planCfg.period);
  if (req.userId) {
    const u = await getAiUsage(req.userId, usagePeriod);
    if (u.count >= planCfg.limit + u.topup) {
      return res.status(429).json({ error: 'limit_reached', message: 'You’ve reached your questions for this period.' });
    }
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Cache lookup is keyed on the latest user message + person type. We only
  // serve cached answers on first-turn (context-free) requests to avoid
  // returning stale follow-ups, but every ask is logged to qa_events so the
  // dataset grows with real usage. Image conversations are never cached.
  const lastUserMsg = msgText([...messages].reverse().find((m) => m.role === 'user')?.content ?? '');
  const isFirstTurn = messages.length === 1 && messages[0].role === 'user';

  if (isFirstTurn && personType && !hasImages && !internal) {
    const cached = await lookupCachedAnswer(personType, lastUserMsg);
    if (cached?.answer) {
      send('cache_hit', { id: cached.id });
      // Replay at live-generation pace (~570 chars/s with a beat of "thought"
      // up front) — instant playback reads as canned, not considered.
      await new Promise((r) => setTimeout(r, 350));
      for (let i = 0; i < cached.answer.length; i += 16) {
        send('text', { delta: cached.answer.slice(i, i + 16) });
        await new Promise((r) => setTimeout(r, 28));
      }
      incrementAiUsage(req.userId, usagePeriod);
      send('done', { stop_reason: 'end_turn', cached: true });
      res.end();
      // Fire-and-forget: bump hit count + log event.
      bumpCacheHit(cached.id);
      logQaEvent({
        personType,
        question: lastUserMsg,
        userId: req.userId,
        wasCacheHit: true,
        isFirstTurn: true,
        model: 'cache',
      });
      return;
    }
  }

  // Fetch any URLs the user shared and inject as context
  const urlContext = await resolveUrlContext(lastUserMsg).catch(() => '');
  const hasUrlContext = urlContext.length > 0;

  // Fetch AI memory for this user (what we know about them from past conversations)
  let memoryContext = '';
  if (req.userId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    try {
      const mr = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}&select=ai_memory&limit=1`,
        { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
      );
      const [mp] = await mr.json();
      if (mp?.ai_memory) {
        memoryContext = `\n\n── WHO THIS PERSON IS ──\n${mp.ai_memory}\n\nLet this quietly shape your tone and approach from the first message. Do not reference it directly, do not say you remember them — just respond as someone who already understands where they are coming from.`;
      }
    } catch {}
  }

  // Grounded commentary (research mode only): if the last message references a
  // passage, pull the ACTUAL public-domain commentary text so the AI quotes real
  // sources instead of recalling — and possibly fabricating — them.
  let commentaryContext = '';
  if (groundCommentary) {
    const ref = parsePassageRef(lastUserMsg);
    if (ref) {
      const commentary = await fetchCommentary(ref.code, ref.chapter).catch(() => null);
      if (commentary) {
        commentaryContext = `\n\n── RETRIEVED COMMENTARY — quote from THIS, do not invent ──\nBelow is the actual public-domain commentary text on ${ref.name} ${ref.chapter}. When you cite Matthew Henry or Jamieson-Fausset-Brown, draw the quote or paraphrase from this text — never from memory. If a point isn't covered here, say so plainly rather than inventing a citation.\n\n${commentary}`;
      }
    }
  }

  try {
    // Model routing — tier controls ceiling, complexity controls selection within tier.
    // Free: Haiku only. Individual: Haiku|Sonnet. Pro: Haiku|Sonnet|Opus.
    const plan = realPlan; // server-derived; never trust req.body.plan for model tier
    const isDeep = ['deeper', 'skeptic'].includes(personType);
    const isLongConversation = messages.length > 10;
    const isVeryLong = messages.length > 20;
    const lastMsg = lastUserMsg ?? '';
    const deepKeywords = /\b(free will|theodicy|suffering|evil|trinity|predestination|salvation|atonement|resurrection|eschatology|hermeneutic|reconcil|contradict|hypocri|doubt|deconstruct|faith crisis|why would god|how can god)\b/i;
    const isDeepTheology = deepKeywords.test(lastMsg) || lastMsg.length > 200;

    let model;
    if (['premium_plus', 'church_base', 'church_pro'].includes(plan)) {
      // Full range: Haiku → Sonnet → Opus based on complexity
      model = (isDeepTheology || isVeryLong)
        ? 'claude-opus-4-8'
        : (isDeep || isLongConversation)
          ? 'claude-sonnet-4-6'
          : 'claude-haiku-4-5-20251001';
    } else if (['premium', 'trial', 'topup'].includes(plan)) {
      // Sonnet max — no Opus (controls cost on individual paid + church trial + top-up)
      model = (isDeep || isLongConversation || isDeepTheology)
        ? 'claude-sonnet-4-6'
        : 'claude-haiku-4-5-20251001';
    } else {
      // Free: Haiku only
      model = 'claude-haiku-4-5-20251001';
    }

    // The first answer is the "I need this" moment — never serve it on the cheapest
    // model, even to free users. It's answered live only once (then cached), so the
    // cost is bounded. Deep first questions already route to Sonnet/Opus above.
    if (isFirstTurn && model === 'claude-haiku-4-5-20251001') {
      model = 'claude-sonnet-4-6';
    }
    if (internal) model = 'claude-haiku-4-5-20251001';

    const trimmed = messages.slice(-8);

    const stream = client.messages.stream({
      model,
      max_tokens: internal ? 500 : 2048,
      system: cachedSystem(system + AI_SAFETY_BLOCK, urlContext + memoryContext + commentaryContext),
      messages: trimmed,
    });
    req.on('close', () => stream.controller?.abort?.());

    stream.on('text', (delta) => send('text', { delta }));
    stream.on('error', (err) => {
      console.error('[kinwove] stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'stream error' });
      } else {
        send('error', { message: err?.message || err?.error?.message || 'stream error' });
        res.end();
      }
    });

    const final = await stream.finalMessage();
    trackAi(final.usage);
    const fullText = final.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    if (!internal) incrementAiUsage(req.userId, usagePeriod);
    send('done', { stop_reason: final.stop_reason, usage: final.usage });
    res.end();

    if (internal) return; // helper calls never touch the cache or analytics

    // Persist cache + event after the response is on its way to the client.
    // Never cache image conversations — every image is unique context.
    if (isFirstTurn && personType && fullText.length > 0 && !hasUrlContext && !hasImages) {
      writeCacheEntry({ personType, question: lastUserMsg, answer: fullText, model });
    }
    logQaEvent({
      personType,
      question: lastUserMsg,
      userId: req.userId,
      wasCacheHit: false,
      isFirstTurn,
      model,
    });
    // Topic analytics — keyword-classified, no content or user ID stored.
    if (isFirstTurn) logTopicCounts(topicTags(lastUserMsg));
  } catch (err) {
    console.error('[kinwove] api error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'something went wrong' });
    } else {
      send('error', { message: 'something went wrong' });
      res.end();
    }
  }
});

// ── Sermon → Week Engine: pastor pastes outline, AI drafts the week ─────────
const SERMON_SYSTEM = `You are a ministry content writer helping a pastor extend Sunday's sermon into a week of daily engagement for their congregation.

GROUND RULES
- Stay tightly grounded in the pastor's outline and the passage they preached. Do not introduce theology, doctrine, or examples they didn't cover.
- Tone: warm, plain, honest — like a trusted friend who knows the Bible. Never preachy, never motivational-poster, never church-brochure.
- Banned phrases (never use these): "Let's explore", "As we journey", "Take a moment to", "In your own walk", "How does [X] make you feel?", "What does [X] mean to you personally?", "Let us remember", "May we", "How can we apply this to our daily lives?", "Reflect on a time when".

DAILY QUESTIONS — daily_verse × 7
Each day publishes one short post to the congregation feed to spark real conversation. These are not devotionals — they are discussion starters. The pastor may keep all 7, trim down to 1–2 per week, or reschedule them — so each item has to stand on its own.

How to plan the 7 — read the outline as a structure, not as raw text:
  1. Identify the distinct topics, scenes, or theological moves the sermon actually makes. There are usually 3–8 of these (e.g. for a sermon on the prodigal: "the younger son's demand," "the father waiting / running," "the older brother's resentment," "what repentance actually looks like").
  2. Walk the days in the SAME ORDER the sermon walked them. Day 1 should anchor on the sermon's opening territory; the last day should land on its closing or hardest move.
  3. Map one question per topic. If the sermon has fewer than 7 topics, write extra questions on the topics that carry the most tension — but each extra question must press on a different angle of that topic (not a paraphrase of the previous one). If the sermon has more than 7 topics, choose the 7 that carry the most weight in the pastor's outline and drop the rest.
  4. The "scripture" field on each item names that day's topic in 4–7 words (e.g. "Grace before the apology is finished") — this becomes the bold heading above the post and is also how we audit topic coverage.

Quality bar for the closing question (apply these tests before writing it):
  ✗ BAD — has an obvious answer: "How has God shown you grace this week?" → everyone says yes, discussion ends.
  ✗ BAD — is actually two questions: "What does this verse mean and how do you apply it?"
  ✗ BAD — invites only testimony-sharing: "Share a time when you experienced forgiveness." → personal stories but no wrestling with ideas.
  ✓ GOOD — presses on a tension in the text: "The father in the parable runs toward the son before he finishes his apology. Does that change what repentance actually is?"
  ✓ GOOD — surfaces a hard implication: "If God's grace is really unconditional, what stops it from being used as an excuse?"
  ✓ GOOD — challenges an assumption: "We talk about forgiving others, but the passage says nothing about the other person deserving it. Does forgiveness require any response from the one forgiven?"

Each daily must follow this exact structure in the "body" field:
  1. The question — first, on its own line. One sentence, ends with a question mark. This is the thing the card leads with.
  2. A blank line (\\n\\n).
  3. 2–3 sentences of tight context that frame WHY this question is worth asking today — point at a specific moment, person, or tension from the text, not a general principle. This is the support, not the lead.

  Quality rules:
  - The question must be rooted in a specific moment from that day's topic, have no single obvious answer, and be answerable by both a first-month believer and a 20-year elder without one dominating.
  - One focused sentence per question — no sub-clauses, no "and also".
  - Day 1: lowest barrier — easy for anyone to respond to. Final day: the most challenging or theologically unsettling of the week.
  - Do NOT attach a scripture citation unless a verse genuinely adds a new lens. Do NOT repeat the main passage as the topic. Do NOT reuse the same topic on two different days.

GOING DEEPER — going_deeper (write exactly 1, two paragraphs)
This is for someone who wants to sit alone with the text.
  Paragraph 1: One piece of historical, cultural, or linguistic context from the original passage that most people in the congregation don't know — something that reframes how you read it.
  Paragraph 2: One honest, unsettling question the passage raises that the sermon may not have fully resolved. Don't resolve it here either — let it sit.

FOR KIDS — kid_version (write exactly 1)
A parent reads this aloud to a child aged 6–10. Keep it SHORT — the whole thing should take 30 seconds to read aloud. Structure EXACTLY like this, no exceptions:

  Line 1: One sentence that says what the sermon was about in kid language. Name a real situation (a person, a choice, a moment) — no metaphors.
  Line 2: One sentence that says why it mattered or what happened.
  Blank line.
  "Questions to talk about:" on its own line.
  1. [One short concrete question — something the child can actually picture happening to them.]
  2. [One short concrete question.]
  3. [One short concrete question.]

  Rules: No sentence longer than 12 words. No abstract theology. No "God is like..." metaphors. No yes/no questions. Questions must be things a 7-year-old has actually experienced (sharing, being left out, wanting something, being afraid, telling the truth).

Output ONLY valid JSON. Schema:
{
  "items": [
    { "kind": "daily_verse",    "day": 1, "scripture": "Topic label (4–7 words)", "body": "The question on its own line?\\n\\n2–3 sentences of context that frame why this question matters." },
    ... days 1 through 7 ...
    { "kind": "going_deeper",   "body": "Two-paragraph deeper reflection." },
    { "kind": "kid_version",    "body": "Kid-friendly summary.\\n\\nQuestions to talk about:\\n1. ...\\n2. ...\\n3. ..." }
  ]
}

No prose outside the JSON. No markdown fences. Begin output with { and end with }. Inside any "body" string, escape line breaks as \\n — never use a raw newline inside a JSON string.`;

const VALID_TARGET_KINDS = ['daily_verse', 'going_deeper', 'kid_version'];
const TARGET_KIND_INSTRUCTIONS = {
  daily_verse:    'Generate ONLY the 7 daily_verse items (days 1–7) as daily discussion questions. Each must have a topic label in "scripture" and a 2–3 sentence reflection ending in a question in "body". Do not output going_deeper or kid_version.',
  going_deeper:   'Generate ONLY the 1 going_deeper item. Do not output daily_verse or kid_version.',
  kid_version:    'Generate ONLY the 1 kid_version item — a kid-friendly retelling of the sermon followed by 2–3 questions geared for kids, in the format described in the system prompt. Do not output daily_verse or going_deeper.',
};

// ── Walk generation ───────────────────────────────────────────────────────────
// Dedicated endpoint so we can set max_tokens based on walk length
// (the general /api/chat cap of 2048 is too low for anything > 3 days).
app.post('/api/walk/generate', requireAuth, requirePastor, limitAuthed({ capacity: 6, refillPerSec: 6 / 600 }), async (req, res) => {
  const { title, theme, scripture, audience, length } = req.body ?? {};
  if (!title || !theme) return res.status(400).json({ error: 'title and theme required' });
  if (typeof length !== 'number' || length < 1 || length > 30) return res.status(400).json({ error: 'invalid length' });
  if (title.length > 200 || theme.length > 1000) return res.status(413).json({ error: 'content too long' });

  const prompt = `You are helping a pastor create a ${length}-day devotional walk titled "${title}".

Theme: ${theme}
Key scripture: ${scripture || 'Choose appropriate scriptures'}
Target audience: ${audience || 'General congregation'}

Generate exactly ${length} days of devotional content. For EACH day return a JSON object with these exact fields:
- day: number (1 to ${length})
- title: short devotional title (5-8 words)
- scripture_ref: Bible reference (e.g. "John 3:16")
- scripture_body: the verse text (NIV, 1-3 sentences max)
- body: devotional reflection (3-4 paragraphs, warm pastoral tone, practical and encouraging)

Return ONLY a valid JSON array of ${length} objects. No markdown, no explanation, just the JSON array starting with [ and ending with ].`;

  // ~600 tokens per day is a safe ceiling for 3-4 paragraph reflections.
  const maxTokens = Math.min(length * 700 + 300, 16000);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: 'You are a pastoral content writer. Return only a valid JSON array as instructed. No markdown fences, no explanation, no text outside the JSON array.',
      messages: [{ role: 'user', content: prompt }],
    });

    req.on('close', () => stream.controller?.abort?.());
    stream.on('text', (delta) => send('text', { t: delta }));
    stream.on('error', (err) => send('error', { message: err?.message || 'stream error' }));

    await stream.finalMessage();
    send('done', {});
    res.end();
  } catch (e) {
    send('error', { message: e?.message || 'generation failed' });
    res.end();
  }
});

// ── Sermon repurposing — one outline in, the week's content out ───────────────
// Generates ready-to-post social captions + a newsletter blurb from the sermon.
// Results are returned for copy/paste only (never stored — sermon_content rows
// would leak onto the church feed via the feed_items view).
const REPURPOSE_SYSTEM = `You repurpose a pastor's sermon into shareable content. Same ground rules as all kinwove ministry writing: stay tightly inside the pastor's outline and passage — never introduce theology or examples they didn't cover. Never invent quotes, statistics, or attributions. Tone: warm, plain, honest — never church-brochure, never clickbait.

Return ONLY valid JSON, no markdown fences, in exactly this shape:
{
  "social_posts": [
    { "platform": "short", "text": "..." },
    { "platform": "medium", "text": "..." },
    { "platform": "long", "text": "..." }
  ],
  "newsletter": { "subject": "...", "body": "..." }
}

social_posts (3, escalating length):
- "short": ≤200 chars — one arresting line or question from the sermon. No hashtags.
- "medium": 2-4 sentences — the sermon's central tension + an invitation to think. At most 2 tasteful hashtags.
- "long": 5-8 sentences telling the heart of the sermon as a mini-reflection someone could read on its own.
Each must stand alone, quote scripture faithfully if quoted, and end warm — never with a hard sell.

newsletter: subject ≤60 chars (no clickbait); body 120-200 words — what the sermon covered, one takeaway for the week, one line inviting people to the discussion. Write it so a church admin can paste it straight into their email.`;

app.post('/api/sermon/repurpose', requireAuth, requirePastor, limitAuthed({ capacity: 8, refillPerSec: 8 / 300 }), async (req, res) => {
  const { title, scripture_ref, summary } = req.body ?? {};
  if (!summary || typeof summary !== 'string' || !summary.trim()) {
    return res.status(400).json({ error: 'summary required' });
  }
  if (summary.length > 16000) return res.status(413).json({ error: 'summary too long' });
  try {
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1400,
      system: cachedSystem(REPURPOSE_SYSTEM),
      messages: [{ role: 'user', content: `Title: ${title || '(untitled)'}\nScripture: ${scripture_ref || '(not specified)'}\n\nOutline / notes:\n${summary}` }],
    });
    trackAi(resp.usage);
    const raw = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'generation failed' });
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed.social_posts) || !parsed.newsletter?.body) {
      return res.status(500).json({ error: 'generation incomplete' });
    }
    res.json(parsed);
  } catch (e) {
    console.error('[sermon-repurpose]', e?.message);
    res.status(500).json({ error: 'generation failed' });
  }
});

app.post('/api/sermon/generate', requireAuth, requirePastor, limitAuthed({ capacity: 12, refillPerSec: 12 / 300 }), async (req, res) => {
  const { title, scripture_ref, summary, targetKind, singleDay, existingItems } = req.body ?? {};
  if (!summary || typeof summary !== 'string' || !summary.trim()) {
    return res.status(400).json({ error: 'summary required' });
  }
  if (summary.length > 16000) return res.status(413).json({ error: 'summary too long' });
  if (title && (typeof title !== 'string' || title.length > 300)) return res.status(413).json({ error: 'title too long' });
  if (scripture_ref && (typeof scripture_ref !== 'string' || scripture_ref.length > 200)) return res.status(413).json({ error: 'scripture_ref too long' });
  if (targetKind && !VALID_TARGET_KINDS.includes(targetKind)) {
    return res.status(400).json({ error: 'invalid targetKind' });
  }

  // Per-card regenerate: replace exactly one daily question. Only valid when
  // targetKind === 'daily_verse'. existingItems is the rest of the week so
  // the model can avoid recycling the same topics.
  const isSingle = targetKind === 'daily_verse' && (singleDay != null || Array.isArray(existingItems));
  if (isSingle) {
    if (singleDay != null && (!Number.isInteger(singleDay) || singleDay < 1 || singleDay > 31)) {
      return res.status(400).json({ error: 'invalid singleDay' });
    }
    if (existingItems && !Array.isArray(existingItems)) {
      return res.status(400).json({ error: 'invalid existingItems' });
    }
    if (existingItems && existingItems.length > 30) {
      return res.status(413).json({ error: 'existingItems too long' });
    }
  }

  // When repopulating a single section the user message gets a focused instruction
  // so the model only outputs what's needed. The parsed results are also filtered
  // server-side as a safety net.
  const baseContent = `Title: ${title || '(untitled)'}\nScripture: ${scripture_ref || '(not specified)'}\n\nOutline / notes:\n${summary}`;

  let userContent;
  if (isSingle) {
    const otherTopics = (existingItems ?? [])
      .filter((it) => it && it.day !== singleDay)
      .map((it) => {
        const topic = (it.scripture || '').toString().trim() || '(no topic label)';
        const dayLbl = it.day != null ? `Day ${it.day}` : 'A day';
        const snippet = (it.body || '').toString().replace(/\s+/g, ' ').trim().slice(0, 140);
        return `- ${dayLbl} — ${topic}${snippet ? ` — "${snippet}…"` : ''}`;
      })
      .join('\n');

    const single = [
      `⚠ IMPORTANT: Replace ONLY day ${singleDay ?? '(unspecified)'} of the daily questions with one new daily_verse item.`,
      otherTopics
        ? `The other days currently cover these topics — DO NOT recycle them and do NOT land on a closing question that asks the same thing in different words:\n${otherTopics}`
        : `No other days are filled in yet — pick the topic from the sermon that has the most discussion energy.`,
      `Pick a fresh topic, scene, or theological move from the sermon that the days above don't already cover. Apply the full DAILY QUESTIONS quality bar from the system prompt.`,
      `Output exactly one item in this exact shape (no other items, no commentary):`,
      `{ "items": [ { "kind": "daily_verse", "day": ${singleDay ?? 1}, "scripture": "Topic label (4–7 words)", "body": "The question on its own line?\\n\\n2–3 sentences of context that frame why this question matters." } ] }`,
    ].join('\n\n');
    userContent = `${baseContent}\n\n${single}`;
  } else {
    userContent = targetKind
      ? `${baseContent}\n\n⚠ IMPORTANT: ${TARGET_KIND_INSTRUCTIONS[targetKind]}`
      : baseContent;
  }

  try {
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: isSingle ? 800 : (targetKind ? 2500 : 6000),
      system: SERMON_SYSTEM,
      messages: [{ role: 'user', content: userContent + '\n\nREMINDER: Output ONLY the raw JSON object. Your entire response must start with { and end with }. No explanation, no markdown, no other text of any kind.' }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    // Strip code fences then extract the outermost JSON object (handles any prose around it)
    let cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const jsonBound = cleaned.match(/\{[\s\S]*\}/);
    if (jsonBound) cleaned = jsonBound[0];

    function repairJsonString(src) {
      // Walk char-by-char and escape raw control chars inside JSON string values
      let out = '';
      let inStr = false;
      let prev = '';
      for (const ch of src) {
        if (inStr) {
          if (ch === '\\' && prev !== '\\') { out += ch; prev = ch; continue; }
          if (ch === '"' && prev !== '\\') { inStr = false; out += ch; prev = ch; continue; }
          if (ch === '\n') { out += '\\n'; prev = ch; continue; }
          if (ch === '\r') { out += '\\r'; prev = ch; continue; }
          if (ch === '\t') { out += '\\t'; prev = ch; continue; }
        } else {
          if (ch === '"') inStr = true;
        }
        out += ch;
        prev = ch;
      }
      return out;
    }

    let parsed;
    // Attempt 1: direct parse
    try { parsed = JSON.parse(cleaned); } catch (_) {}

    // Attempt 2: repair raw control chars then parse
    if (!parsed) {
      try {
        parsed = JSON.parse(repairJsonString(cleaned));
        console.warn('[kinwove] sermon JSON repaired (control chars).');
      } catch (_) {}
    }

    // Attempt 3: strip any trailing truncation and close braces/brackets
    if (!parsed) {
      try {
        // Find last complete item by trimming to last }] or }}
        const trimmed = cleaned.replace(/,?\s*\{[^{}]*$/, '').replace(/,?\s*$/, '');
        const closed = trimmed.endsWith(']}') ? trimmed : trimmed + ']}';
        parsed = JSON.parse(repairJsonString(closed));
        console.warn('[kinwove] sermon JSON recovered from truncation.');
      } catch (_) {}
    }

    if (!parsed) {
      console.error('[kinwove] sermon JSON parse failed after all attempts. First 600 chars:', cleaned.slice(0, 600));
      return res.status(500).json({ error: 'Could not parse generated content. Try again.' });
    }
    let items = parsed.items ?? [];
    // Drop any retired kinds the model might still emit from old prompt patterns
    // (group_question was consolidated into daily_verse).
    items = items.filter((item) => item && item.kind !== 'group_question');
    // Server-side safety filter: when a section repopulate was requested,
    // only return items of the requested kind even if the model slipped up.
    if (targetKind) {
      items = items.filter((item) => item.kind === targetKind);
    }
    // Per-card regenerate: keep exactly one item, prefer the one matching the
    // requested day, and force its `day` field if the model wandered.
    if (isSingle) {
      let chosen = items.find((it) => it && it.day === singleDay);
      if (!chosen) chosen = items[0];
      if (chosen) {
        if (singleDay != null) chosen.day = singleDay;
        items = [chosen];
      } else {
        items = [];
      }
    }
    res.json({ content: items });
  } catch (err) {
    // Surface enough detail to diagnose without leaking secrets. The Anthropic
    // SDK throws `APIError` subclasses (BadRequestError, RateLimitError, etc.)
    // that carry `.status` and `.message` — pass those through to the client
    // so the composer's error banner is actually useful.
    console.error('[kinwove] sermon/generate error:', err);
    if (!res.headersSent) {
      const status  = typeof err?.status === 'number' ? err.status : 500;
      const name    = err?.name || 'Error';
      const msg     = (err?.message || 'sermon generation failed').toString().slice(0, 400);
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: `${name}: ${msg}`,
      });
    }
  }
});

// ── Anonymous Welcome: public AI chat, no auth, theme-classified ────────────
const ANON_SYSTEM = `You are kinwove — a thoughtful, kind, honest companion for someone exploring big questions about life, meaning, and faith. The person you're talking to is anonymous and may be a believer, a skeptic, or just curious. Don't assume. Don't preach. Don't pressure.

Listen first. Answer plainly. When you cite scripture, give context, not just a verse. When you don't know, say so. Treat doubt as a normal part of faith, not a sin. If they want pastoral support, gently point them at the "Talk to someone" option.

If they share something serious — suicidal thoughts, abuse, self-harm, a crisis — name it gently, take it seriously, and share crisis resources (988 in US/Canada, Samaritans 116 123 in UK, findahelpline.com globally). Never minimize.

Tone: warm, grounded, slightly literary. No emojis. No bullet-point sermons.`;

const THEME_TAGS = ['anxiety','doubt','prayer','marriage','grief','forgiveness','suffering','identity','meaning','parenting','finances','doctrine','other'];

async function classifyTheme(question) {
  try {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 20,
      system: `Classify the user's question into ONE of these theme tags: ${THEME_TAGS.join(', ')}. Respond with only the single tag word. No punctuation, no explanation.`,
      messages: [{ role: 'user', content: question }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    return THEME_TAGS.includes(text) ? text : 'other';
  } catch {
    return 'other';
  }
}

// ── DEV ONLY — instant pastor bypass ────────────────────────────────────────
// Mirrors scripts/dev-make-pastor.sql but via API so the client can call it.
// Gated on DEV_PASTOR_BYPASS=true (set only in .env.local). Returns 403 in prod.
app.post('/api/dev/become-pastor', requireAuth, limitAuthed({ capacity: 5, refillPerSec: 5 / 600 }), async (req, res) => {
  if (process.env.DEV_PASTOR_BYPASS !== 'true') {
    return res.status(403).json({ error: 'dev bypass disabled' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: 'service role not configured' });
  }
  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  try {
    // If they already own a church via church_roles, reuse it.
    const existingRole = await fetch(
      `${SUPABASE_URL}/rest/v1/church_roles?user_id=eq.${req.userId}&is_owner=eq.true&select=church_id&limit=1`,
      { headers },
    ).then((r) => r.json()).catch(() => []);
    let churchId = Array.isArray(existingRole) && existingRole[0]?.church_id;

    if (!churchId) {
      const insert = await fetch(`${SUPABASE_URL}/rest/v1/churches`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: 'Test Chapel',
          denomination: 'Non-denominational',
          city: 'Toronto',
          country: 'Canada',
          pastor_id: req.userId,
          registration_country: 'CA',
          registration_number: `TEST-${req.userId.slice(0, 8)}`,
          verification_status: 'verified',
          verification_tier: 'reference',
          verified_at: new Date().toISOString(),
          verification_notes: 'Dev bypass — /api/dev/become-pastor',
          is_public: true,
        }),
      });
      if (!insert.ok) {
        const body = await insert.text().catch(() => '');
        console.error('[kinwove] dev become-pastor church insert failed', insert.status, body);
        return res.status(500).json({ error: 'church insert failed' });
      }
      const created = await insert.json();
      churchId = Array.isArray(created) ? created[0]?.id : created?.id;
    }

    // Ownership lives in church_roles, not on the personal profile.
    await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ church_id: churchId }),
      }),
      fetch(`${SUPABASE_URL}/rest/v1/church_roles`, {
        method: 'POST', headers,
        body: JSON.stringify({
          church_id: churchId, user_id: req.userId,
          role_key: 'owner', role_title: 'Lead Pastor', is_owner: true,
          can_post_sermons: true, can_post_announcements: true,
          can_moderate: true, can_view_prayers: true,
          can_manage_staff: true, can_edit_church: true,
        }),
      }),
    ]);
    res.json({ church_id: churchId });
  } catch (err) {
    safeError(res, err, 'dev-become-pastor');
  }
});

// ── Email helpers ─────────────────────────────────────────────────────────────

/** Fetch a user's email address from the Supabase auth admin API. */
async function getUserEmail(userId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('[getUserEmail] missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return null;
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    });
    if (!r.ok) {
      console.warn(`[getUserEmail] Supabase admin API ${r.status} for user ${userId}`);
      return null;
    }
    const data = await r.json();
    return data?.email ?? null;
  } catch (e) {
    console.warn('[getUserEmail] error:', e.message);
    return null;
  }
}

// Server-side role key → display label (mirrors Badge.jsx ROLE_PRESETS)
const ROLE_LABELS = {
  owner: 'Owner', elder: 'Elder', staff: 'Staff',
  care: 'Care team', careTeam: 'Care team',
  worship: 'Worship', youth: 'Youth',
};

/** Send an email via Resend. Throws on failure. Optional per-message headers
 *  (e.g. List-Unsubscribe) improve inbox placement. Defaults to the VERIFIED
 *  kinwove.com domain — never the shared resend.dev domain, which lands in spam. */
async function sendEmail(to, subject, html, headers) {
  const key  = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'kinwove <hello@kinwove.com>';
  if (!key) throw new Error('RESEND_API_KEY not set');
  const r = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ from, to: [to], subject, html, ...(headers ? { headers } : {}) }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text().catch(() => '')}`);
  trackEmail();
}

// Wordmark as plain HTML text — SVG/remote images are blocked by Gmail, iOS
// Mail, etc., so an <img> logo shows up blank. Text renders everywhere.
const KW_LOGO = `<div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:600;color:#FDF8F0;letter-spacing:0.3px;line-height:1"><span style="color:#D4A24A;margin-right:2px">✦</span>kinwove</div>`.trim();

// Shared brand wrapper — keeps all kinwove emails visually consistent.
// Pass unsubUrl to add a one-click unsubscribe line (required for recurring
// mail — CASL/CAN-SPAM).
function emailWrap(bodyHtml, unsubUrl) {
  const unsub = unsubUrl
    ? `<br><a href="${unsubUrl}" style="color:#9C7B5E;text-decoration:underline">Unsubscribe from the daily verse</a>`
    : '';
  return `<div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;color:#2C1810;background:#ffffff">
    <!-- Wordmark header: dark chocolate bar with ✦ + serif kinwove -->
    <div style="background:#1A1108;padding:22px 32px;margin-bottom:36px">
      ${KW_LOGO}
    </div>
    <div style="padding:0 32px 40px">
    ${bodyHtml}
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #E8D5BB;font-size:12px;color:#9C7B5E;line-height:1.7">
      You're receiving this because you have a kinwove account.<br>
      <a href="https://www.kinwove.com" style="color:#A85530;text-decoration:none">www.kinwove.com</a>${unsub}
    </div>
    </div>
  </div>`;
}

// Signed token for one-click unsubscribe links (no login needed).
function emailToken(userId) {
  const secret = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_KEY || 'kw-fallback';
  return crypto.createHmac('sha256', secret).update(String(userId)).digest('hex').slice(0, 24);
}

// Daily verse email — a calm morning touchpoint. Verse + one gentle reflection,
// with a CTA back into the app to reflect with the AI.
function dailyVerseEmailHtml(firstName, verse, unsubUrl, reflectUrl) {
  return emailWrap(`
    <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#B8733A;font-weight:700;margin:0 0 18px">Today's verse</div>
    <div style="font-family:Georgia,serif;font-size:23px;font-style:italic;line-height:1.5;color:#2C1810;margin:0 0 12px">&ldquo;${verse.text}&rdquo;</div>
    <div style="font-size:14px;color:#B8733A;font-weight:600;margin:0 0 28px">— ${verse.ref}</div>
    <p style="font-size:15.5px;color:#6B5344;line-height:1.75;margin:0 0 2px">Sit with it for a moment, ${firstName}. What is it stirring in you today?</p>
    ${btnHtml('Reflect with others', reflectUrl || 'https://www.kinwove.com')}
    <p style="font-size:13px;color:#9C7B5E;margin:0">See what others are sharing, and add your own.</p>
  `, unsubUrl);
}

function btnHtml(label, url) {
  return `<a href="${url}" style="display:inline-block;background:#B8733A;color:#FDF8F0;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:15px;font-weight:600;margin:24px 0;letter-spacing:0.01em">${label} →</a>`;
}

function welcomeEmailHtml(firstName) {
  const ask = (q) =>
    `<a href="https://www.kinwove.com/?q=${encodeURIComponent(q)}" style="display:block;text-decoration:none;color:#2C1810;background:#FDF8F0;border:1px solid #E8D5BB;border-radius:10px;padding:12px 16px;margin-bottom:8px;font-size:15px;line-height:1.5">&rsaquo;&nbsp; ${q}</a>`;
  return emailWrap(`
    <h1 style="font-size:28px;font-weight:600;margin:0 0 16px;letter-spacing:-0.02em;color:#2C1810">Welcome, ${firstName}.</h1>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      I'm Danny — I built kinwove. I made it because I came to faith the slow way, full of questions, and I wanted one place where honest questions get honest answers. No pressure, no agenda.
    </p>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      One thing that makes it different: it doesn't push an opinion or preach at you. It stays grounded in scripture — giving you honest, sourced answers, and telling you plainly where faithful people have long disagreed. You're free to make up your own mind.
    </p>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      The best way to start is simple: <strong>ask it something real.</strong> That's where kinwove comes alive. Try one —
    </p>
    <div style="margin:0 0 20px">
      ${ask('What does the Bible say about anxiety?')}
      ${ask('Why does God allow suffering?')}
      ${ask('How do I even start reading the Bible?')}
    </div>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      Whatever you're carrying — faith, doubt, or somewhere in between — bring it here.
    </p>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 20px">
      There's also a community just beginning here — and you're early, which means you get to help shape what it becomes.
    </p>
    <p style="font-size:15px;color:#6B5344;line-height:1.7;margin:0">&mdash; Danny</p>
  `);
}

function roleInviteEmailHtml({ memberName, pastorName, roleLabel, churchName, inviteUrl }) {
  const url = inviteUrl || 'https://www.kinwove.com';
  return emailWrap(`
    <h1 style="font-size:26px;font-weight:600;margin:0 0 14px;letter-spacing:-0.02em;color:#2C1810">You've been invited.</h1>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 20px">
      <strong>${pastorName}</strong> has invited you to join the <strong>${roleLabel}</strong> team at <strong>${churchName}</strong>.
    </p>
    <div style="background:#FDF8F0;border:1px solid #E8D5BB;border-radius:12px;padding:18px 20px;margin-bottom:24px;font-size:14px;color:#6B5344;line-height:1.7">
      Tap the button below to accept or decline — it takes you straight to the invitation, no searching required.
    </div>
    ${btnHtml('Review invitation →', url)}
    <p style="font-size:13px;color:#9C7B5E;margin:0">Questions? Reply to this email and we'll help.</p>
  `);
}

function nudgeEmailHtml(firstName) {
  return emailWrap(`
    <h1 style="font-size:26px;font-weight:600;margin:0 0 14px;letter-spacing:-0.02em;color:#2C1810">Your profile is waiting.</h1>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      Hey ${firstName} — you started setting up your kinwove profile but haven't quite finished.
    </p>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 4px">
      It only takes a minute, and it helps kinwove give you much better answers from the start.
    </p>
    ${btnHtml('Complete my profile', 'https://www.kinwove.com')}
    <p style="font-size:13px;color:#9C7B5E;margin:0">No pressure — we'll be here whenever you're ready.</p>
  `);
}

// Welcome sequence · day 2 — invite a friend. The community grows by invitation,
// and this is the best growth lever. The ref code ties any signup back to the
// inviter, matching the in-app InviteFriends attribution (?ref=id[:8]).
function inviteEmailHtml(firstName, userId) {
  const ref = userId ? `&ref=${String(userId).slice(0, 8)}` : '';
  const inviteUrl = `https://www.kinwove.com/?utm_source=welcome-invite&utm_medium=invite&utm_campaign=referral${ref}`;
  const msg = "Thought of you — kinwove's a place for the big questions: life, meaning, faith, doubt. Honest conversation, no pressure, no agenda. Wherever you're at:";
  const body = encodeURIComponent(`${msg}\n\n${inviteUrl}`);
  const sms = `sms:?body=${body}`;
  const mailto = `mailto:?subject=${encodeURIComponent('Thought of you')}&body=${body}`;
  const pill = (label, href) => `<a href="${href}" style="display:inline-block;background:#B8733A;color:#FDF8F0;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:600;margin:0 10px 10px 0;letter-spacing:0.01em">${label}</a>`;
  return emailWrap(`
    <h1 style="font-size:26px;font-weight:600;margin:0 0 16px;letter-spacing:-0.02em;color:#2C1810">kinwove's better with a friend in it, ${firstName}.</h1>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      It's Danny. Here's the honest truth: the community here is young and still filling in. So the best way to start isn't to wait for it — it's to bring someone. A friend who's curious, a family member walking through something, anyone you'd want to figure this out alongside.
    </p>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 20px">
      Bring them in, and you've got someone to talk it through with — the questions, the doubts, the parts you're still figuring out — instead of going it alone.
    </p>
    <div style="margin:0 0 18px">
      ${pill('Text a friend', sms)}${pill('Email a friend', mailto)}
    </div>
    <p style="font-size:13px;color:#9C7B5E;line-height:1.7;margin:0">
      Or open kinwove and tap <strong>Invite friends</strong> for WhatsApp, QR, and more. — Danny
    </p>
  `);
}

// Welcome sequence · day 5 — reading the Bible with a companion.
function bibleEmailHtml(firstName) {
  return emailWrap(`
    <h1 style="font-size:26px;font-weight:600;margin:0 0 16px;letter-spacing:-0.02em;color:#2C1810">The whole Bible's in here, ${firstName}.</h1>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      Danny here. One of the quietest, best things in kinwove: you can read the whole Bible right inside it — and ask about anything the moment it puzzles you. No commentary to buy, no Greek degree required. Just read, and when a verse stops you, ask.
    </p>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      Not sure where to start? Most people new to it find the Gospel of John a good first door — it's Jesus, up close. And if you'd rather listen than read, you can — it'll read to you.
    </p>
    ${btnHtml('Start reading', 'https://www.kinwove.com')}
    <p style="font-size:13px;color:#9C7B5E;margin:0">One chapter is enough. — Danny</p>
  `);
}

// Welcome sequence · day 3 (pastors only) — the sermon AI + church tools. This is
// where the social features (private groups, messaging) belong: churches arrive
// with their own people, so those tools are useful on day one.
function pastorEmailHtml(firstName) {
  return emailWrap(`
    <h1 style="font-size:26px;font-weight:600;margin:0 0 16px;letter-spacing:-0.02em;color:#2C1810">A shortcut for Sunday, ${firstName}.</h1>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      Danny here. You've got kinwove set up for your church — here's the part most pastors find hard to give up: take this week's sermon and, in a couple of minutes, turn it into a week of daily reflections, discussion questions, and prayer for your whole congregation. The AI drafts it; you keep the final say on every word.
    </p>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      Underneath, it's a full study desk too — original languages, commentary across traditions, sermon illustrations — plus a private space for your people: groups, messaging, prayer, and care.
    </p>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 18px">
      Start with one sermon. See what it's like to hand your congregation something for the whole week, not just Sunday morning.
    </p>
    ${btnHtml('Open your sermon tools', 'https://www.kinwove.com')}
    <p style="font-size:13px;color:#9C7B5E;margin:0">And when you're ready, invite your congregation in — that's when it all comes alive. — Danny</p>
  `);
}

// ── Welcome email (called after profile wizard completes) ─────────────────────
app.post('/api/email/welcome', requireAuth, async (req, res) => {
  try {
    const email = await getUserEmail(req.userId);
    if (!email) return res.status(404).json({ error: 'no email found' });

    const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
    const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}&select=display_name`, { headers: h });
    const [profile] = await pr.json().catch(() => [{}]);
    const firstName = (profile?.display_name ?? '').split(' ')[0] || 'friend';

    await sendEmail(email, `Welcome to kinwove, ${firstName} ✦`, welcomeEmailHtml(firstName));
    res.json({ ok: true });
  } catch (e) {
    safeError(res, e, 'email/welcome');
  }
});

// ── Role invite: create invite row + email the member ─────────────────────────
app.post('/api/church/role-invite', requireAuth, limitAuthed({ capacity: 20, refillPerSec: 20 / 60 }), async (req, res) => {
  const { church_id, user_id, role_key, role_label, message } = req.body ?? {};
  if (!church_id || !user_id || !role_key) {
    return res.status(400).json({ error: 'church_id, user_id, role_key required' });
  }
  if (!isUuid(church_id) || !isUuid(user_id)) return res.status(400).json({ error: 'invalid id' });

  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };

  // Verify caller is a pastor/owner of this church
  const churchR = await fetch(`${SUPABASE_URL}/rest/v1/churches?id=eq.${church_id}&select=id,name,pastor_id`, { headers: h });
  const [church] = await churchR.json().catch(() => []);
  if (!church) return res.status(404).json({ error: 'church not found' });

  const isOwner = church.pastor_id === req.userId;
  if (!isOwner) {
    // Also check church_roles for manager/owner role
    const rolesR = await fetch(`${SUPABASE_URL}/rest/v1/church_roles?church_id=eq.${church_id}&user_id=eq.${req.userId}&is_owner=eq.true&select=id`, { headers: h });
    const roles = await rolesR.json().catch(() => []);
    if (!roles.length) return res.status(403).json({ error: 'pastor access required' });
  }

  // Insert the pending invite — return=representation gives us the created row (with id)
  const inviteR = await fetch(`${SUPABASE_URL}/rest/v1/church_role_invites`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({ church_id, user_id, role_key, role_label: role_label ?? null, message: message ?? null, invited_by: req.userId, status: 'pending' }),
  });
  if (!inviteR.ok) {
    const err = await inviteR.text().catch(() => '');
    console.error('[kinwove] role-invite insert failed', inviteR.status, err);
    return res.status(500).json({ error: 'could not create invite' });
  }
  const [createdInvite] = await inviteR.json().catch(() => [{}]);
  const inviteId = createdInvite?.id ?? null;

  // Deep-link URL — takes recipient straight to the Accept/Decline modal in the app
  const BASE_URL = process.env.APP_URL || 'https://www.kinwove.com';
  const inviteUrl = inviteId ? `${BASE_URL}?invite=${inviteId}` : BASE_URL;

  // Send email — fire-and-forget so a failed email doesn't break the invite flow
  (async () => {
    try {
      const [memberEmail, memberPr, pastorPr] = await Promise.all([
        getUserEmail(user_id),
        fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${user_id}&select=display_name`, { headers: h }).then((r) => r.json()).catch(() => []),
        fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}&select=display_name`, { headers: h }).then((r) => r.json()).catch(() => []),
      ]);
      if (!memberEmail) {
        console.warn(`[role-invite email] no email found for user ${user_id} — skipping`);
        return;
      }
      const memberName = (memberPr[0]?.display_name ?? '').split(' ')[0] || 'friend';
      const pastorName = pastorPr[0]?.display_name ?? 'Your pastor';
      const label = role_label || ROLE_LABELS[role_key] || role_key;
      console.log(`[role-invite email] sending to ${memberEmail} for role "${label}" — link: ${inviteUrl}`);
      await sendEmail(
        memberEmail,
        `You've been invited to join the ${label} team at ${church.name}`,
        roleInviteEmailHtml({ memberName, pastorName, roleLabel: label, churchName: church.name, inviteUrl }),
      );
      console.log(`[role-invite email] sent OK to ${memberEmail}`);
    } catch (e) {
      console.error('[role-invite email] FAILED:', e.message);
    }
  })();

  res.json({ ok: true, invite_id: inviteId });
});

// ── Incomplete-profile nudge (cron) ───────────────────────────────────────────
// Hit this endpoint with a cron job once per day (e.g. Render cron or uptime service).
// Finds users who signed up 24–72 h ago with no display_name and sends one nudge email.
// Add a secret header in your cron config: X-Cron-Secret: <CRON_SECRET env var>
app.post('/api/cron/nudge-incomplete', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  // Fail CLOSED: if the secret isn't configured, or doesn't match, refuse — these
  // send real email to real users, so an unset secret must never leave them open.
  if (!secret || req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });

  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const after  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Profiles created 24–72 h ago with no display_name
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?daily_verse_opt_out=eq.false&display_name=is.null&created_at=gte.${since}&created_at=lte.${after}&select=id&limit=50`,
    { headers: h }
  );
  const incomplete = await r.json().catch(() => []);
  if (!incomplete.length) return res.json({ sent: 0 });

  let sent = 0;
  for (const { id } of incomplete) {
    try {
      const email = await getUserEmail(id);
      if (!email) continue;
      const firstName = email.split('@')[0] || 'friend'; // best we can do without a name
      const unsubUrl = `https://www.kinwove.com/api/email/unsubscribe?u=${id}&t=${emailToken(id)}`;
      await sendEmail(email, 'Your kinwove profile is waiting', nudgeEmailHtml(firstName), { 'List-Unsubscribe': `<${unsubUrl}>` });
      sent++;
      await new Promise((r) => setTimeout(r, 200)); // gentle rate-limit between sends
    } catch (e) {
      console.error('[nudge-incomplete]', e.message);
    }
  }
  console.log(`[nudge-incomplete] sent ${sent} of ${incomplete.length}`);
  res.json({ sent, total: incomplete.length });
});

// ── Welcome sequence (cron) ───────────────────────────────────────────────────
// Run once per day. Each stage is a 24 h cohort window (created N–24 h to N h ago),
// so with a daily run every completed signup receives each email exactly once — no
// tracking table needed, matching the nudge-incomplete pattern above. Only users
// who finished onboarding (display_name set) get these; the rest get the nudge.
// Cron config: POST with header X-Cron-Secret: <CRON_SECRET>.
app.post('/api/cron/welcome-sequence', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  // Fail CLOSED: if the secret isn't configured, or doesn't match, refuse — these
  // send real email to real users, so an unset secret must never leave them open.
  if (!secret || req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });

  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
  const hrsAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();

  const stages = [
    { name: 'invite', olderThan: 72,  newerThan: 48,  audience: 'seeker', subject: "kinwove's better with a friend in it", html: inviteEmailHtml },
    { name: 'bible',  olderThan: 144, newerThan: 120, audience: 'seeker', subject: "The whole Bible's in here",           html: bibleEmailHtml },
    { name: 'pastor', olderThan: 96,  newerThan: 72,  audience: 'pastor', subject: 'A shortcut for Sunday',               html: pastorEmailHtml },
  ];

  const counts = {};
  for (const st of stages) {
    counts[st.name] = 0;
    // created between (olderThan) and (newerThan) hours ago, onboarding finished
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?daily_verse_opt_out=eq.false&display_name=not.is.null&created_at=gte.${hrsAgo(st.olderThan)}&created_at=lte.${hrsAgo(st.newerThan)}&select=id,display_name,is_pastor&limit=200`,
      { headers: h }
    );
    const rows = await r.json().catch(() => []);
    for (const row of rows) {
      const isPastor = row.is_pastor === true;
      if (st.audience === 'seeker' && isPastor) continue; // pastors get their own track
      if (st.audience === 'pastor' && !isPastor) continue;
      try {
        const email = await getUserEmail(row.id);
        if (!email || isInternalEmail(email)) continue;
        const firstName = (row.display_name || '').trim().split(/\s+/)[0] || email.split('@')[0] || 'friend';
        const unsubUrl = `https://www.kinwove.com/api/email/unsubscribe?u=${row.id}&t=${emailToken(row.id)}`;
        await sendEmail(email, st.subject, st.html(firstName, row.id), { 'List-Unsubscribe': `<${unsubUrl}>` });
        counts[st.name]++;
        await new Promise((r) => setTimeout(r, 200)); // gentle rate-limit
      } catch (e) {
        console.error(`[welcome-sequence:${st.name}]`, e.message);
      }
    }
  }
  console.log(`[welcome-sequence] invite=${counts.invite} bible=${counts.bible} pastor=${counts.pastor}`);
  res.json({ sent: counts });
});

// ── Welcome backfill (one-time catch-up) ──────────────────────────────────────
// Sends a chosen sequence email to EXISTING signups from the last month who
// joined before the sequence existed. Targets 6–30 days old so it never overlaps
// the live cron's 2–5 day windows (no double-sends there). No per-user tracking,
// so FIRE EACH STAGE ONCE — re-firing the same stage re-sends to everyone.
// Usage: POST /api/cron/welcome-backfill?stage=invite|bible|pastor
app.post('/api/cron/welcome-backfill', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  // Fail CLOSED: if the secret isn't configured, or doesn't match, refuse — these
  // send real email to real users, so an unset secret must never leave them open.
  if (!secret || req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });

  const stage = String(req.query.stage || req.body?.stage || 'invite');
  const DEFS = {
    invite: { audience: 'seeker', subject: "kinwove's better with a friend in it", html: (n, id) => inviteEmailHtml(n, id) },
    bible:  { audience: 'seeker', subject: "The whole Bible's in here",           html: (n) => bibleEmailHtml(n) },
    pastor: { audience: 'pastor', subject: 'A shortcut for Sunday',               html: (n) => pastorEmailHtml(n) },
  };
  const def = DEFS[stage];
  if (!def) return res.status(400).json({ error: 'stage must be invite | bible | pastor' });

  // Window is adjustable so you can fill the gap left by the first run without
  // re-hitting people already emailed. Defaults 6–30 days. Pass min=0&max=6 to
  // catch recent signups whose automatic Day-2 window passed before the cron existed.
  const minDays = Math.max(0, Number(req.query.min ?? 6));
  const maxDays = Math.max(minDays + 1, Number(req.query.max ?? 30));

  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
  const hrsAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000).toISOString();
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?daily_verse_opt_out=eq.false&display_name=not.is.null&created_at=gte.${hrsAgo(24 * maxDays)}&created_at=lte.${hrsAgo(24 * minDays)}&select=id,display_name,is_pastor&limit=1000`,
    { headers: h }
  );
  const rows = await r.json().catch(() => []);

  let sent = 0, skipped = 0;
  for (const row of rows) {
    const isPastor = row.is_pastor === true;
    if (def.audience === 'seeker' && isPastor) { skipped++; continue; }
    if (def.audience === 'pastor' && !isPastor) { skipped++; continue; }
    try {
      const email = await getUserEmail(row.id);
      if (!email || isInternalEmail(email)) { skipped++; continue; }
      const firstName = (row.display_name || '').trim().split(/\s+/)[0] || email.split('@')[0] || 'friend';
      const unsubUrl = `https://www.kinwove.com/api/email/unsubscribe?u=${row.id}&t=${emailToken(row.id)}`;
      await sendEmail(email, def.subject, def.html(firstName, row.id), { 'List-Unsubscribe': `<${unsubUrl}>` });
      sent++;
      await new Promise((r) => setTimeout(r, 200)); // gentle rate-limit
    } catch (e) {
      console.error(`[welcome-backfill:${stage}]`, e.message);
    }
  }
  console.log(`[welcome-backfill] stage=${stage} sent=${sent} skipped=${skipped} of ${rows.length}`);
  res.json({ stage, sent, skipped, total: rows.length });
});

// ── Unsubscribe from the daily verse (one-click, no login) ────────────────────
app.get('/api/email/unsubscribe', async (req, res) => {
  const { u, t, resub } = req.query;
  const ok = u && t && t === emailToken(u);
  const optOut = resub !== '1'; // ?resub=1 turns the daily verse back on
  if (ok && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${u}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_verse_opt_out: optOut }),
    }).catch((e) => console.error('[unsubscribe]', e.message));
  }
  let title, body, action = '';
  if (!ok) {
    title = 'Link expired';
    body  = 'Please use the unsubscribe link from a recent email.';
  } else if (optOut) {
    title  = 'You’re unsubscribed';
    body   = 'You won’t get the daily verse email anymore.';
    action = `<a href="https://www.kinwove.com/api/email/unsubscribe?u=${u}&t=${t}&resub=1" style="color:#A85530;text-decoration:none">Changed your mind? Resubscribe</a>`;
  } else {
    title = 'You’re back on';
    body  = 'The daily verse will land in your inbox each morning again.';
  }
  res.set('Content-Type', 'text/html').send(
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>` +
    `<body style="font-family:Georgia,serif;background:#FAF3E2;color:#2C1810;text-align:center;padding:64px 24px;margin:0">` +
    `<div style="font-size:40px;margin-bottom:12px">✦</div>` +
    `<h2 style="font-weight:600;margin:0 0 10px">${title}</h2>` +
    `<p style="color:#6B5344;max-width:360px;margin:0 auto 24px;line-height:1.6">${body}</p>` +
    (action ? `<p style="margin:0 0 16px">${action}</p>` : '') +
    `<a href="https://www.kinwove.com" style="color:#A85530;text-decoration:none">Back to kinwove →</a></body></html>`
  );
});

// Ensure today's verse is posted as a shared, commentable community post by the
// kinwove account, and return its id. Idempotent — reuses today's post if it
// already exists. Used by both the daily email and the in-app verse card so
// they land people in the same place.
async function ensureVersePost(verse) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
  const systemId = await getOrCreateSystemAccount();
  if (!systemId) return null;
  const since = new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString();
  const existing = await fetch(
    `${SUPABASE_URL}/rest/v1/posts?author_id=eq.${systemId}&created_at=gte.${since}&select=id,body&order=created_at.desc&limit=25`,
    { headers: h }
  ).then((x) => x.json()).catch(() => []);
  const snippet = verse.text.slice(0, 40);
  let postId = Array.isArray(existing) ? existing.find((p) => (p.body || '').includes(snippet))?.id : null;
  if (!postId) {
    const verseBody = `“${verse.text}”\n\n— ${verse.ref}\n\nWhat is this stirring in you today?`;
    const created = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ author_id: systemId, scope: 'me', visibility: 'public', kind: 'text', body: verseBody }),
    }).then((x) => x.json()).catch(() => null);
    postId = Array.isArray(created) ? created[0]?.id : created?.id;
  }
  return postId ?? null;
}

// Today's shared verse post — the in-app daily verse card hits this so
// "Reflect with others" opens the same thread the email links to.
app.get('/api/verse/today', requireAuth, async (_req, res) => {
  try {
    const postId = await ensureVersePost(getDailyVerse());
    res.json({ postId });
  } catch (e) {
    res.status(500).json({ error: e?.message ?? 'error' });
  }
});

// ── Daily verse email (cron) ──────────────────────────────────────────────────
// One calm morning email with today's verse. Sent to every onboarded, opted-in
// member. Schedule via pg_cron (see scripts/2026-07-06-daily-verse-email-cron.sql).
app.post('/api/cron/daily-verse-email', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers['x-cron-secret'] !== secret) return res.status(401).json({ error: 'unauthorized' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });

  const verse = getDailyVerse();
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };

  // Post (or reuse) today's shared verse post; link the email to it.
  let reflectUrl = 'https://www.kinwove.com';
  try {
    const postId = await ensureVersePost(verse);
    if (postId) reflectUrl = `https://www.kinwove.com/?post=${postId}`;
  } catch (e) {
    console.error('[daily-verse-email] verse post:', e.message);
  }

  // Onboarded members who haven't opted out. (Requires the daily_verse_opt_out
  // column — see the migration script; until it's added this returns an error
  // object and we safely send 0.)
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?daily_verse_opt_out=eq.false&display_name=not.is.null&select=id,display_name&limit=5000`,
    { headers: h }
  );
  const users = await r.json().catch(() => []);
  if (!Array.isArray(users) || !users.length) return res.json({ sent: 0 });

  let sent = 0;
  for (const usr of users) {
    try {
      if ((usr.display_name || '').toLowerCase() === 'kinwove') continue; // skip system account
      const email = await getUserEmail(usr.id);
      if (!email) continue;
      const firstName = (usr.display_name || '').split(' ')[0] || 'friend';
      const unsubUrl = `https://www.kinwove.com/api/email/unsubscribe?u=${usr.id}&t=${emailToken(usr.id)}`;
      await sendEmail(email, `Today’s verse — ${verse.ref}`, dailyVerseEmailHtml(firstName, verse, unsubUrl, reflectUrl), {
        'List-Unsubscribe': `<${unsubUrl}>`,
      });
      sent++;
      await new Promise((rr) => setTimeout(rr, 150)); // gentle pacing between sends
    } catch (e) {
      console.error('[daily-verse-email]', e.message);
    }
  }
  console.log(`[daily-verse-email] sent ${sent} of ${users.length} — ${verse.ref}`);
  res.json({ sent, total: users.length });
});

// ── kinwove persona — daily auto-post (cron) ────────────────────────────────
const PERSONA_PROMPT = `You are the kinwove voice. You post once a day to a community feed.

Your job: write something warm, positive, and uplifting that makes people feel like something bigger is in their corner. The feeling you are going for is: a good friend texting you something that made them feel better on a hard day. Short. Real. Leaves you lighter, not heavier.

The tone is quietly faith-adjacent — God has your back, without assuming the reader already believes that. Sensitive to people who are searching or skeptical. Never pushy. Never preachy. Just light and warmth and the quiet sense that things are going to be okay.

Posts do not need to reference Scripture. But when they do, it should feel like a lyric that landed — not a lesson. A one-line nod, not a sermon.

Examples of exactly the right feel (vary the structure — do not copy these, use them as tone reference only):
- "Whatever you are walking through right now, you are not walking it alone. That is not wishful thinking. That is the whole point."
- "You do not have to earn a good day. You do not have to earn rest. You do not have to earn being loved. Some things just are."
- "There is something quietly powerful about deciding today is not over yet."
- "Peter was a fisherman who denied Jesus three times and still built the church. Whatever you think you have done wrong, you are not too far gone."
- "The most repeated line in the Bible is do not be afraid. Not because life is not hard. Because you are not in it alone."
- "What if the hardest season you have ever been in is also the one that changes everything for you?"
- "Some days you just need someone to remind you that you are further along than you feel."
- "Thomas doubted out loud in a room full of believers and was still invited to reach out and touch the truth. There is room for your honest questions here."
- "What is one thing you are still hoping for, even if you have stopped saying it out loud?"

Every post must feel different in structure and opening from the one before. Rotate between: direct encouragement, a question, a faith reference told in one line, a reframe of something hard, a simple truth about being loved.

Today pick ONE type (vary across days, roughly: 4x uplift, 2x question, 1x warmth):

UPLIFT (4x/week): Warm, positive, hopeful. Speaks to a real human feeling. Leaves the reader feeling like something good is possible and something bigger is on their side. Faith is the undercurrent, not the headline. May or may not reference Scripture — only if it lands like a lyric.

QUESTION (2x/week): One short, open question anyone could answer — about hope, belonging, what they are carrying, what changed them, what they are still looking for. Welcoming. No preamble.

WARMTH (1x/week): Pure light. 2–3 sentences for someone who needs to hear that they are enough, that today can still turn around, that they are not forgotten. No question. Just warmth.

Hard rules:
- 2–4 sentences max. Shorter wins.
- No hashtags. No em-dashes. Plain punctuation only.
- Always positive and uplifting. Never dark, heavy, or guilt-based.
- Never preachy. Never "God is telling you" or "you need to believe."
- Never "as Christians." Never assumes the reader believes.
- Never starts with "I."
- Today is {DAY}, {DATE}.

Respond ONLY with valid JSON on a single line: {"body":"post text here"}`;

app.post('/api/cron/daily-post', async (req, res) => {
  // Header-only cron secret (never accept it via query string — leaks into logs).
  // If CRON_SECRET is unset, the secret path is closed and only an admin bearer
  // token can trigger this — it never falls open.
  const secret = process.env.CRON_SECRET;
  const cronOk = !!secret && req.headers['x-cron-secret'] === secret;
  if (!cronOk) {
    // Also allow admin users to trigger via bearer token
    const userId = await attachUser(req);
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=is_admin&limit=1`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
      const rows = await r.json();
      if (!rows[0]?.is_admin) return res.status(401).json({ error: 'unauthorized' });
    } else {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });

  try {
    const systemId = await getOrCreateSystemAccount();
    if (!systemId) return res.status(503).json({ error: 'system account unavailable' });

    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const date = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // Fetch last 7 posts so Claude can avoid repeating themes/structure
    const recentRes = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?author_id=eq.${systemId}&order=created_at.desc&limit=60&select=body`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const recentPosts = await recentRes.json();
    const recentBlock = recentPosts.length
      ? `\n\nDo NOT repeat the theme, opening line, or structure of any of these recent posts:\n${recentPosts.map((p, i) => `${i + 1}. "${p.body}"`).join('\n')}`
      : '';

    const prompt = PERSONA_PROMPT.replace('{DAY}', dayName).replace('{DATE}', date) + recentBlock;

    const msg = await client.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = msg.content?.[0]?.text?.trim() ?? '';
    let body = '';
    try {
      const parsed = JSON.parse(raw);
      body = (parsed.body ?? '').trim();
    } catch {
      const m = raw.match(/\{[^}]*"body"\s*:\s*"((?:[^"\\]|\\.)*)"/s);
      body = m ? m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';
    }

    if (!body) {
      console.error('[daily-post] could not extract body from:', raw);
      return res.status(500).json({ error: 'generation failed' });
    }

    const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
    const postRes = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ author_id: systemId, scope: 'me', visibility: 'public', kind: 'text', body }),
    });

    if (!postRes.ok) {
      const err = await postRes.text();
      console.error('[daily-post] insert failed:', err);
      return res.status(500).json({ error: 'insert failed' });
    }

    console.log(`[daily-post] posted: "${body.slice(0, 60)}…"`);
    // Dead-man's switch ping: if HEALTHCHECK_DAILYPOST_URL is set (e.g. a free
    // healthchecks.io check), a successful post pings it. If pings stop, that
    // service emails you — catching a silently-dead cron.
    if (process.env.HEALTHCHECK_DAILYPOST_URL) {
      fetch(process.env.HEALTHCHECK_DAILYPOST_URL, { method: 'POST' }).catch(() => {});
    }
    res.json({ ok: true, body });
  } catch (e) {
    console.error('[daily-post] error:', e?.message);
    res.status(500).json({ error: e?.message ?? 'unknown' });
  }
});

// ── Church daily-question delivery ───────────────────────────────────────────
// The sermon week's daily questions fire via scheduled_at, but until now they
// surfaced buried (feed sorts by composer-time created_at) and notified no one.
// This cron (hourly via pg_cron — scripts/2026-07-10-daily-question-cron.sql):
//   1. finds daily_verse rows whose scheduled_at fired in the last 26h,
//      not yet delivered (delivered_at null),
//   2. bumps created_at so the question surfaces at the top of the church feed,
//   3. notifies every church member (kind church_daily_question) — which the
//      web-push poller also fans out to phones.
// Same fail-closed auth as daily-post: CRON_SECRET header or admin bearer.
app.post('/api/cron/daily-question', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const cronOk = !!secret && req.headers['x-cron-secret'] === secret;
  if (!cronOk) {
    const userId = await attachUser(req);
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=is_admin&limit=1`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
      const rows = await r.json();
      if (!rows[0]?.is_admin) return res.status(401).json({ error: 'unauthorized' });
    } else {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });

  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
  try {
    const now = new Date();
    // 26h window (not open-ended): pre-existing fired questions from before this
    // feature shipped must not all blast out on the first run.
    const since = new Date(now.getTime() - 26 * 3600 * 1000);
    const qRes = await fetch(
      `${SUPABASE_URL}/rest/v1/sermon_content?kind=eq.daily_verse&delivered_at=is.null&scheduled_at=lte.${now.toISOString()}&scheduled_at=gte.${since.toISOString()}&select=id,body,sermon_id,sermons!inner(id,church_id,pastor_id,is_published)&sermons.is_published=eq.true&limit=50`,
      { headers: h }
    );
    const questions = await qRes.json();
    if (!Array.isArray(questions)) throw new Error('sermon_content query failed (delivered_at column missing? run 2026-07-10-daily-question-cron.sql)');

    let notified = 0;
    for (const q of questions) {
      const churchId = q.sermons?.church_id;
      const pastorId = q.sermons?.pastor_id;
      if (!churchId) continue;

      // Bump to the top of the church feed + mark delivered (idempotency gate).
      const patch = await fetch(`${SUPABASE_URL}/rest/v1/sermon_content?id=eq.${q.id}&delivered_at=is.null`, {
        method: 'PATCH',
        headers: { ...h, Prefer: 'return=representation' },
        body: JSON.stringify({ delivered_at: now.toISOString(), created_at: now.toISOString() }),
      });
      const patched = await patch.json();
      if (!Array.isArray(patched) || patched.length === 0) continue; // another run got it first

      const mRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?church_id=eq.${churchId}&select=id,notif_prefs&limit=2000`, { headers: h });
      const members = await mRes.json();
      if (!Array.isArray(members)) continue;

      const snippet = String(q.body ?? '').split('\n')[0].slice(0, 140);
      const rows = members
        // This insert bypasses add_notification(), so honor the per-kind mute here.
        .filter((m) => m.id !== pastorId && m.notif_prefs?.church_daily_question !== false)
        .map((m) => ({
          recipient_id: m.id,
          actor_id: pastorId,
          kind: 'church_daily_question',
          target_type: 'sermon',
          target_id: q.sermon_id,
          data: { snippet, church_id: churchId, sermon_content_id: q.id },
        }));
      if (rows.length) {
        const nRes = await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
          method: 'POST',
          headers: { ...h, Prefer: 'return=minimal' },
          body: JSON.stringify(rows),
        });
        if (nRes.ok) notified += rows.length;
        else console.error('[daily-question] notification insert failed:', await nRes.text());
      }
    }

    if (questions.length) console.log(`[daily-question] delivered ${questions.length} question(s), notified ${notified} member(s)`);
    res.json({ ok: true, delivered: questions.length, notified });
  } catch (e) {
    console.error('[daily-question] error:', e?.message);
    res.status(500).json({ error: e?.message ?? 'unknown' });
  }
});

// ── Pastor weekly rhythm ──────────────────────────────────────────────────────
// The audit's church finding: a pastor's only email ever was the day-3
// onboarding note. Two beats keep them engaged (one endpoint, kind param;
// pg_cron hits it Thu + Mon — scripts/2026-07-10-pastor-rhythm-cron.sql):
//   kind=nudge  (Thu): no sermon loaded for the coming week → "Sunday's coming"
//   kind=digest (Mon): posts / prayers / new members from the last 7 days
app.post('/api/cron/pastor-rhythm', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const cronOk = !!secret && req.headers['x-cron-secret'] === secret;
  if (!cronOk) {
    const userId = await attachUser(req);
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=is_admin&limit=1`, { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } });
      const rows = await r.json();
      if (!rows[0]?.is_admin) return res.status(401).json({ error: 'unauthorized' });
    } else {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });

  const kind = req.body?.kind;
  if (!['nudge', 'digest'].includes(kind)) return res.status(400).json({ error: 'kind must be nudge or digest' });

  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
  try {
    const cRes = await fetch(`${SUPABASE_URL}/rest/v1/churches?pastor_id=not.is.null&select=id,name,pastor_id&limit=200`, { headers: h });
    const churches = await cRes.json();
    if (!Array.isArray(churches)) throw new Error('churches query failed');

    let sent = 0;
    for (const church of churches) {
      // Global email suppression applies to pastors too.
      const pRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${church.pastor_id}&select=display_name,daily_verse_opt_out&limit=1`, { headers: h });
      const [pastor] = await pRes.json();
      if (!pastor || pastor.daily_verse_opt_out) continue;
      const email = await getUserEmail(church.pastor_id);
      if (!email || isInternalEmail(email)) continue;

      const firstName = (pastor.display_name ?? '').split(' ')[0] || 'Pastor';
      const churchUrl = `https://www.kinwove.com/?church=${church.id}`;
      const unsubUrl = `https://www.kinwove.com/api/email/unsubscribe?u=${church.pastor_id}&t=${emailToken(church.pastor_id)}`;

      if (kind === 'nudge') {
        // Skip if any sermon already covers the coming week (Sun within 4 days of Thu).
        const soon = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        const sRes = await fetch(`${SUPABASE_URL}/rest/v1/sermons?church_id=eq.${church.id}&week_starts_on=gte.${today}&week_starts_on=lte.${soon}&select=id&limit=1`, { headers: h });
        const upcoming = await sRes.json();
        if (Array.isArray(upcoming) && upcoming.length > 0) continue;

        await sendEmail(email, `Sunday's coming — ${church.name}`, emailWrap(`
          <p style="font-size:16px;line-height:1.7">Hi ${escHtml(firstName)},</p>
          <p style="font-size:16px;line-height:1.7">Sunday's on its way, and there's no sermon loaded for ${escHtml(church.name)} yet. Paste your outline into the composer and kinwove drafts the whole week — daily discussion questions, going-deeper notes, all of it — in about two minutes.</p>
          <p style="margin:26px 0"><a href="${churchUrl}" style="display:inline-block;background:#2C1810;color:#FDF8F0;text-decoration:none;border-radius:999px;padding:13px 28px;font-size:15px;font-weight:600">Open the sermon composer →</a></p>
        `, unsubUrl), { 'List-Unsubscribe': `<${unsubUrl}>` }).then(() => sent++).catch((e) => console.error('[pastor-rhythm] nudge send:', e.message));
      } else {
        // Monday digest: the last 7 days at their church.
        const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const count = async (path) => {
          const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: { ...h, Prefer: 'count=exact', Range: '0-0' } });
          return parseInt(r.headers.get('content-range')?.split('/')[1] ?? '0', 10) || 0;
        };
        const [posts, newMembers] = await Promise.all([
          count(`posts?scope=eq.church&scope_id=eq.${church.id}&created_at=gte.${weekAgo}&select=id`),
          count(`profiles?church_id=eq.${church.id}&created_at=gte.${weekAgo}&select=id`),
        ]);
        // Prayers need the church join — fetch small and filter.
        const prRes = await fetch(`${SUPABASE_URL}/rest/v1/personal_prayers?is_public=eq.true&created_at=gte.${weekAgo}&select=id,profiles!user_id(church_id)&limit=200`, { headers: h });
        const prayers = ((await prRes.json()) ?? []).filter((p) => p.profiles?.church_id === church.id).length;

        if (posts + prayers + newMembers === 0) continue; // nothing to report — stay quiet

        const line = (n, word) => `<td style="padding:14px 18px;text-align:center"><div style="font-size:30px;font-weight:700;font-family:Georgia,serif;color:#2C1810">${n}</div><div style="font-size:12px;color:#6B5344;margin-top:2px">${word}</div></td>`;
        await sendEmail(email, `Your congregation this week — ${church.name}`, emailWrap(`
          <p style="font-size:16px;line-height:1.7">Hi ${escHtml(firstName)},</p>
          <p style="font-size:16px;line-height:1.7">Here's what happened at ${escHtml(church.name)} on kinwove this past week:</p>
          <table style="width:100%;background:#FDF8F0;border:1px solid #E8D5BB;border-radius:14px;margin:18px 0"><tr>
            ${line(posts, posts === 1 ? 'post' : 'posts')}${line(prayers, prayers === 1 ? 'prayer' : 'prayers')}${line(newMembers, newMembers === 1 ? 'new member' : 'new members')}
          </tr></table>
          <p style="margin:26px 0"><a href="${churchUrl}" style="display:inline-block;background:#2C1810;color:#FDF8F0;text-decoration:none;border-radius:999px;padding:13px 28px;font-size:15px;font-weight:600">See your church →</a></p>
        `, unsubUrl), { 'List-Unsubscribe': `<${unsubUrl}>` }).then(() => sent++).catch((e) => console.error('[pastor-rhythm] digest send:', e.message));
      }
    }

    console.log(`[pastor-rhythm] ${kind}: sent ${sent} of ${churches.length} churches`);
    res.json({ ok: true, kind, sent, churches: churches.length });
  } catch (e) {
    console.error('[pastor-rhythm] error:', e?.message);
    res.status(500).json({ error: e?.message ?? 'unknown' });
  }
});

// ── kinwove persona — admin manual post ────────────────────────────────────
// ── AI memory: update user profile after a conversation ─────────────────────
app.post('/api/ai/update-memory', requireAuth, async (req, res) => {
  const { messages } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length < 6) return res.json({ ok: true });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.json({ ok: true });

  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };

  try {
    // Fetch existing memory
    const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}&select=ai_memory&limit=1`, { headers: h });
    const [profile] = await pr.json();
    const existing = profile?.ai_memory ?? '';

    // Build conversation text — cap at last 30 messages, text only
    const convoText = messages.slice(-30)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => {
        const text = typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.filter(b => b.type === 'text').map(b => b.text).join(' ') : '');
        return `${m.role === 'user' ? 'Person' : 'AI'}: ${text.slice(0, 500)}`;
      })
      .join('\n');

    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are building a brief memory profile so an AI faith companion can understand a person across multiple conversations.

Based on the conversation below, write a concise profile (under 150 words, third person) capturing:
- Their background and relationship to faith or religion
- What they are genuinely wrestling with or curious about
- How they tend to engage (emotionally, intellectually, open, skeptical, resistant, etc.)
- Any meaningful things they have revealed about themselves

Only include what is clearly evident. Do not infer beyond what is shown.${existing ? `\n\nExisting profile to update (keep what is still true, add what is new):\n${existing}` : ''}

Conversation:
${convoText}

Write only the updated profile. No preamble, no labels.`,
      }],
    });

    const memory = resp.content?.[0]?.text?.trim() ?? '';
    if (!memory) return res.json({ ok: true });

    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}`, {
      method: 'PATCH',
      headers: { ...h, Prefer: 'return=minimal' },
      body: JSON.stringify({ ai_memory: memory }),
    });

    res.json({ ok: true });
  } catch (e) {
    console.error('[ai/update-memory]', e?.message);
    res.json({ ok: true }); // never fail visibly — memory is background
  }
});

// ── Research memory: update series context after a research session ───────────
app.post('/api/research/update-memory', requireAuth, async (req, res) => {
  const { messages } = req.body ?? {};
  if (!Array.isArray(messages) || messages.length < 2) return res.json({ ok: true });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.json({ ok: true });

  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
  const today = new Date().toISOString().slice(0, 10);

  try {
    const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}&select=research_memory&limit=1`, { headers: h });
    const [profile] = await pr.json();
    const existing = profile?.research_memory ?? '';

    const convoText = messages.slice(-20)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => `${m.role === 'user' ? 'Pastor' : 'Research AI'}: ${(m.content ?? '').slice(0, 600)}`)
      .join('\n');

    // Parse existing session count
    const existingSessions = parseInt((existing.match(/^SESSIONS:\s*(\d+)/m) ?? [])[1] ?? '0', 10);

    const resp = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 350,
      messages: [{
        role: 'user',
        content: `You are maintaining a running research log for a pastor's sermon series. Based on the conversation below, update the research memory. Output ONLY in this exact format with no other text:

SERIES: [the book or topic being studied, e.g. "Colossians" or "Sermon on the Mount"]
SESSIONS: ${existingSessions + 1}
LAST: ${today}
CONTEXT: [2-4 sentences: what passages have been researched, what key terms or interpretive frameworks have been established, where the series is in the text, any significant scholarly positions the pastor is tracking. Under 200 words. Only what is clearly evident.]

If this conversation is about a completely different book or topic than the existing series, start fresh with SESSIONS: 1.
${existing ? `\nExisting memory:\n${existing}` : '\nNo existing memory — first session.'}

Conversation:
${convoText}`,
      }],
    });

    const memory = resp.content?.[0]?.text?.trim() ?? '';
    if (!memory) return res.json({ ok: true });

    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}`, {
      method: 'PATCH',
      headers: { ...h, Prefer: 'return=minimal' },
      body: JSON.stringify({ research_memory: memory }),
    });

    res.json({ ok: true, memory });
  } catch (e) {
    console.error('[research/update-memory]', e?.message);
    res.json({ ok: true });
  }
});

// ── Research memory: clear series ─────────────────────────────────────────────
app.post('/api/research/clear-memory', requireAuth, async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.json({ ok: true });
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}`, {
      method: 'PATCH',
      headers: { ...h, Prefer: 'return=minimal' },
      body: JSON.stringify({ research_memory: null }),
    });
    res.json({ ok: true });
  } catch (e) {
    console.error('[research/clear-memory]', e?.message);
    res.json({ ok: true });
  }
});

app.post('/api/admin/kinwove-post', requireAdmin, async (req, res) => {
  const { body } = req.body ?? {};
  if (!body || typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'body required' });
  }

  try {
    const systemId = await getOrCreateSystemAccount();
    if (!systemId) return res.status(503).json({ error: 'system account unavailable' });

    const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' };
    const postRes = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ author_id: systemId, scope: 'me', visibility: 'public', kind: 'text', body: body.trim() }),
    });

    if (!postRes.ok) {
      const err = await postRes.text();
      console.error('[kinwove-post] insert failed:', err);
      return res.status(500).json({ error: 'insert failed' });
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('[kinwove-post] error:', e?.message);
    res.status(500).json({ error: e?.message ?? 'unknown' });
  }
});

// ── kinwove persona — list recent posts (admin) ─────────────────────────────
app.get('/api/admin/kinwove-posts', requireAdmin, async (req, res) => {
  try {
    const systemId = await getOrCreateSystemAccount();
    if (!systemId) return res.json({ posts: [] });

    const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?author_id=eq.${systemId}&scope=eq.me&order=created_at.desc&limit=20&select=id,body,created_at`,
      { headers: h },
    );
    const posts = r.ok ? await r.json() : [];
    res.json({ posts });
  } catch (e) {
    res.json({ posts: [] });
  }
});

// ── kinwove persona — delete post (admin) ───────────────────────────────────
app.delete('/api/admin/kinwove-post/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ error: 'invalid id' });
  try {
    const systemId = await getOrCreateSystemAccount();
    const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
    await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${id}&author_id=eq.${systemId}`, { method: 'DELETE', headers: h });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e?.message ?? 'unknown' });
  }
});

// ── Church email verification ────────────────────────────────────────────────

const VERIFY_CODE_TTL_MS = 15 * 60 * 1000;
function generateCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function sendVerificationEmail(to, code, churchName) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  const from = process.env.RESEND_FROM || 'kinwove <hello@kinwove.com>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Your church verification code — kinwove',
      html: `<div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:40px 24px">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#B8733A;margin-bottom:24px">kinwove</div>
        <h1 style="font-size:26px;font-weight:600;color:#2C1810;margin:0 0 14px;letter-spacing:-0.02em">Verify ${churchName}</h1>
        <p style="font-size:15px;color:#6B5344;line-height:1.65;margin:0 0 28px">Enter this code to verify your church and go live instantly:</p>
        <div style="background:#FDF8F0;border:1px solid #E8D5BB;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px">
          <div style="font-size:44px;font-weight:700;letter-spacing:14px;color:#2C1810;font-family:monospace">${code}</div>
          <div style="font-size:12px;color:#9C7B5E;margin-top:10px">Valid for 15 minutes</div>
        </div>
        <p style="font-size:13px;color:#9C7B5E;line-height:1.6">If you didn't request this, ignore this email — no church will be created without the code.</p>
      </div>`,
    }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text().catch(() => '')}`);
  trackEmail();
}

// Return the calling user's pastor church (service role → bypasses all client-side RLS)
app.get('/api/me/pastor-church', requireAuth, async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ church: null });
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
  const roles = await fetch(`${SUPABASE_URL}/rest/v1/church_roles?user_id=eq.${req.userId}&is_owner=eq.true&select=church_id,churches(id,name,city,region)&limit=1`, { headers: h }).then(r => r.json()).catch(() => []);
  const joined = Array.isArray(roles) ? roles[0]?.churches : null;
  if (joined) return res.json({ church: joined });
  const churches = await fetch(`${SUPABASE_URL}/rest/v1/churches?pastor_id=eq.${req.userId}&select=id,name,city,region&limit=1`, { headers: h }).then(r => r.json()).catch(() => []);
  res.json({ church: Array.isArray(churches) ? (churches[0] ?? null) : null });
});

// Look up a church by invite code — service role bypasses RLS so unverified churches work
// Also checks youth_invite_code — returns { church, isYouth: true } if matched on youth code
app.get('/api/church/by-invite-code', async (req, res) => {
  const code = (req.query.code ?? '').trim().toUpperCase();
  if (!code) return res.status(400).json({ church: null });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ church: null });
  const h = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'X-Client-Info': 'kinwove-server',
  };
  try {
    // Check regular invite code first
    const r1 = await fetch(
      `${SUPABASE_URL}/rest/v1/churches?invite_code=eq.${encodeURIComponent(code)}&select=id,name&limit=1`,
      { headers: h }
    );
    const rows1 = await r1.json();
    if (Array.isArray(rows1) && rows1[0]) return res.json({ church: rows1[0], isYouth: false });

    // Fall back to youth invite code
    const r2 = await fetch(
      `${SUPABASE_URL}/rest/v1/churches?youth_invite_code=eq.${encodeURIComponent(code)}&select=id,name&limit=1`,
      { headers: h }
    );
    const rows2 = await r2.json();
    if (Array.isArray(rows2) && rows2[0]) return res.json({ church: rows2[0], isYouth: true });

    res.json({ church: null });
  } catch (err) {
    console.error('[invite-code] fetch error:', err.message);
    res.json({ church: null });
  }
});

// Rotate a church's invite code — requires auth, verifies caller is the pastor
app.post('/api/church/rotate-invite-code', requireAuth, async (req, res) => {
  const { churchId } = req.body ?? {};
  if (!churchId) return res.status(400).json({ error: 'churchId required' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'service unavailable' });
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
  // Verify caller is the pastor of this church
  const rows = await fetch(
    `${SUPABASE_URL}/rest/v1/churches?id=eq.${encodeURIComponent(churchId)}&select=pastor_id&limit=1`,
    { headers: h }
  ).then(r => r.json()).catch(() => []);
  const church = Array.isArray(rows) ? rows[0] : null;
  if (!church) return res.status(404).json({ error: 'Church not found' });
  if (church.pastor_id !== req.userId) return res.status(403).json({ error: 'Not your church' });
  // Generate new 8-char code
  const newCode = Math.random().toString(36).substring(2, 10).toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8).padEnd(8, 'A');
  const updated = await fetch(
    `${SUPABASE_URL}/rest/v1/churches?id=eq.${encodeURIComponent(churchId)}`,
    { method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ invite_code: newCode, invite_code_rotated_at: new Date().toISOString() }) }
  ).then(r => ({ ok: r.ok, status: r.status })).catch(() => ({ ok: false }));
  if (!updated.ok) return res.status(500).json({ error: 'Failed to save new code' });
  res.json({ invite_code: newCode });
});

// Generate / rotate a youth group invite code
app.post('/api/church/youth-invite-code', requireAuth, async (req, res) => {
  const { churchId } = req.body ?? {};
  if (!churchId) return res.status(400).json({ error: 'churchId required' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'service unavailable' });
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
  const rows = await fetch(
    `${SUPABASE_URL}/rest/v1/churches?id=eq.${encodeURIComponent(churchId)}&select=pastor_id&limit=1`,
    { headers: h }
  ).then(r => r.json()).catch(() => []);
  const church = Array.isArray(rows) ? rows[0] : null;
  if (!church) return res.status(404).json({ error: 'Church not found' });
  if (church.pastor_id !== req.userId) return res.status(403).json({ error: 'Not your church' });
  const newCode = 'Y-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const updated = await fetch(
    `${SUPABASE_URL}/rest/v1/churches?id=eq.${encodeURIComponent(churchId)}`,
    { method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ youth_invite_code: newCode }) }
  ).then(r => ({ ok: r.ok })).catch(() => ({ ok: false }));
  if (!updated.ok) return res.status(500).json({ error: 'Failed to save code' });
  res.json({ youth_invite_code: newCode });
});

// Submit / re-submit a pastor application (upsert via service role → bypasses RLS)
app.post('/api/church/apply', requireAuth, limitAuthed({ capacity: 5, refillPerSec: 5 / 300 }), async (req, res) => {
  const { full_name, pastor_role, church_name, denomination, city, country, website, reason } = req.body ?? {};
  if (!church_name || !full_name) return res.status(400).json({ error: 'full_name and church_name required' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation,resolution=merge-duplicates' };
  const r = await fetch(`${SUPABASE_URL}/rest/v1/pastor_applications?on_conflict=user_id`, {
    method: 'POST', headers: h,
    body: JSON.stringify({
      user_id: req.userId,
      full_name: full_name.trim(),
      pastor_role: pastor_role || null,
      church_name: church_name.trim(),
      denomination: denomination || null,
      city: city?.trim() || null,
      country: country?.trim() || null,
      website: website?.trim() || null,
      reason: reason?.trim() || null,
      status: 'pending',
    }),
  });
  if (!r.ok) { const b = await r.text(); console.error('[kinwove] apply failed', r.status, b); return res.status(500).json({ error: 'apply failed' }); }
  const rows = await r.json();
  const row = Array.isArray(rows) ? rows[0] : rows;
  res.json({ application: row });
});

// Scrape emails from a church website
app.post('/api/church/scrape-emails', requireAuth, limitAuthed({ capacity: 5, refillPerSec: 5 / 300 }), async (req, res) => {
  const { website } = req.body ?? {};
  if (!website || typeof website !== 'string') return res.status(400).json({ error: 'website required' });
  let url;
  try { url = new URL(website.startsWith('http') ? website : `https://${website}`); }
  catch { return res.status(400).json({ error: 'invalid URL' }); }
  // SSRF guard: refuse private/internal/metadata targets.
  if (isBlockedUrl(url.toString())) return res.status(400).json({ error: 'invalid URL' });
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    // redirect: 'manual' so a public URL can't 302 us to an internal host.
    const r = await fetch(url.toString(), { signal: ctrl.signal, redirect: 'manual', headers: { 'User-Agent': 'TheWayVerification/1.0' } });
    clearTimeout(t);
    const html = await r.text();
    const junk = /example\.com|sentry|jquery|schema|\.png|\.gif|\.jpg|\.svg|\.js$|\.css$/i;
    const emails = [...new Set((html.match(/[\w.+%-]+@[\w.-]+\.[a-z]{2,}/gi) ?? [])
      .map(e => e.toLowerCase()).filter(e => !junk.test(e)))].slice(0, 8);
    res.json({ emails });
  } catch (err) {
    if (err.name === 'AbortError') return res.json({ emails: [], timeout: true });
    res.json({ emails: [] });
  }
});

// Send a 6-digit code to the chosen email
app.post('/api/church/send-code', requireAuth, limitAuthed({ capacity: 3, refillPerSec: 3 / 300 }), async (req, res) => {
  const { application_id, email } = req.body ?? {};
  if (!application_id || !email) return res.status(400).json({ error: 'application_id and email required' });
  if (!isUuid(application_id)) return res.status(400).json({ error: 'invalid id' });
  if (!/^[\w.+%-]+@[\w.-]+\.[a-z]{2,}$/i.test(email)) return res.status(400).json({ error: 'invalid email' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const appRes = await fetch(`${SUPABASE_URL}/rest/v1/pastor_applications?id=eq.${application_id}&user_id=eq.${req.userId}&select=id,church_name`, { headers: h });
  const apps = await appRes.json();
  if (!Array.isArray(apps) || !apps[0]) return res.status(404).json({ error: 'application not found' });
  const code = generateCode();
  await fetch(`${SUPABASE_URL}/rest/v1/pastor_applications?id=eq.${application_id}`, {
    method: 'PATCH', headers: h,
    body: JSON.stringify({ verify_email: email, verify_code: code, verify_expires_at: new Date(Date.now() + VERIFY_CODE_TTL_MS).toISOString() }),
  });
  try {
    await sendVerificationEmail(email, code, apps[0].church_name);
    res.json({ sent: true });
  } catch (err) {
    console.error('[kinwove] send-code error:', err.message);
    res.status(500).json({ error: 'Could not send email. Check RESEND_API_KEY and RESEND_FROM.' });
  }
});

// Verify the code → approve instantly
app.post('/api/church/verify-code', requireAuth, limitAuthed({ capacity: 10, refillPerSec: 10 / 300 }), async (req, res) => {
  const { application_id, code } = req.body ?? {};
  if (!application_id || !code) return res.status(400).json({ error: 'application_id and code required' });
  if (!isUuid(application_id)) return res.status(400).json({ error: 'invalid id' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const apps = await fetch(`${SUPABASE_URL}/rest/v1/pastor_applications?id=eq.${application_id}&user_id=eq.${req.userId}&select=*`, { headers: h }).then(r => r.json());
  const appl = Array.isArray(apps) ? apps[0] : null;
  if (!appl) return res.status(404).json({ error: 'application not found' });
  if (!appl.verify_code || appl.verify_code !== String(code).trim()) return res.status(400).json({ error: 'Incorrect code — try again.' });
  if (!appl.verify_expires_at || new Date(appl.verify_expires_at) < new Date()) return res.status(400).json({ error: 'Code expired — request a new one.' });
  try {
    const churchRes = await fetch(`${SUPABASE_URL}/rest/v1/churches`, {
      method: 'POST', headers: h,
      body: JSON.stringify({
        name: appl.church_name, denomination: appl.denomination || null,
        city: appl.city || null, country: appl.country || null,
        website: appl.website || null, pastor_id: req.userId,
        verified: true, verify_method: 'email_code',
        verification_status: 'verified', verification_tier: 'email_code',
        verified_at: new Date().toISOString(),
        verification_notes: `Email code verified — ${appl.verify_email}`,
        is_public: true,
      }),
    });
    if (!churchRes.ok) throw new Error(`church insert ${churchRes.status}`);
    const created = await churchRes.json();
    const churchId = Array.isArray(created) ? created[0]?.id : created?.id;
    await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/pastor_applications?id=eq.${application_id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'approved', verify_method: 'email_code', reviewed_at: new Date().toISOString() }) }),
      fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}`, { method: 'PATCH', headers: h, body: JSON.stringify({ church_id: churchId, is_pastor: true }) }),
      fetch(`${SUPABASE_URL}/rest/v1/church_roles`, {
        method: 'POST', headers: h,
        body: JSON.stringify({
          church_id: churchId, user_id: req.userId,
          role_key: 'owner', role_title: appl.pastor_role || 'Lead Pastor', is_owner: true,
          can_post_sermons: true, can_post_announcements: true,
          can_moderate: true, can_view_prayers: true,
          can_manage_staff: true, can_edit_church: true,
        }),
      }),
    ]);
    res.json({ approved: true, church_id: churchId, verified: true });
  } catch (err) { safeError(res, err, 'verify-code'); }
});

// Submit without verification → self-reported church (not in public directory)
app.post('/api/church/submit-unverified', requireAuth, limitAuthed({ capacity: 2, refillPerSec: 2 / 600 }), async (req, res) => {
  const { application_id } = req.body ?? {};
  if (!application_id) return res.status(400).json({ error: 'application_id required' });
  if (!isUuid(application_id)) return res.status(400).json({ error: 'invalid id' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
  const apps = await fetch(`${SUPABASE_URL}/rest/v1/pastor_applications?id=eq.${application_id}&user_id=eq.${req.userId}&select=*`, { headers: h }).then(r => r.json());
  const appl = Array.isArray(apps) ? apps[0] : null;
  if (!appl) return res.status(404).json({ error: 'application not found' });
  try {
    const churchRes = await fetch(`${SUPABASE_URL}/rest/v1/churches`, {
      method: 'POST', headers: h,
      body: JSON.stringify({
        name: appl.church_name, denomination: appl.denomination || null,
        city: appl.city || null, country: appl.country || null,
        website: appl.website || null, pastor_id: req.userId,
        verified: false, verify_method: 'unverified',
        verification_status: 'verified', is_public: true,
      }),
    });
    if (!churchRes.ok) throw new Error(`church insert ${churchRes.status}`);
    const created = await churchRes.json();
    const churchId = Array.isArray(created) ? created[0]?.id : created?.id;
    await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/pastor_applications?id=eq.${application_id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'approved', verify_method: 'unverified', reviewed_at: new Date().toISOString() }) }),
      fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}`, { method: 'PATCH', headers: h, body: JSON.stringify({ church_id: churchId, is_pastor: true }) }),
      fetch(`${SUPABASE_URL}/rest/v1/church_roles`, {
        method: 'POST', headers: h,
        body: JSON.stringify({
          church_id: churchId, user_id: req.userId,
          role_key: 'owner', role_title: appl.pastor_role || 'Lead Pastor', is_owner: true,
          can_post_sermons: true, can_post_announcements: true,
          can_moderate: true, can_view_prayers: true,
          can_manage_staff: true, can_edit_church: true,
        }),
      }),
    ]);
    res.json({ approved: true, church_id: churchId, verified: false });
  } catch (err) { safeError(res, err, 'submit-unverified'); }
});

// ── Delete own account ──────────────────────────────────────────────────────
// Verifies the caller's JWT via requireAuth, then uses the service-role key to
// remove the auth.users row. Profile + child rows cascade via FK constraints.
// ── Church deletion (server-side) ─────────────────────────────────────────────
// Was raw client-side Supabase deletes — RLS-fragile and never touched Stripe.
// Verifies ownership, cancels the church subscription (billed to the pastor's
// customer — guarded until STRIPE_SECRET_KEY exists), releases members, then
// deletes roles/sermons/church.
app.delete('/api/church/:churchId', requireAuth, limitAuthed({ capacity: 3, refillPerSec: 3 / 600 }), async (req, res) => {
  const { churchId } = req.params;
  if (!isUuid(churchId)) return res.status(400).json({ error: 'invalid id' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
  try {
    const cr = await fetch(`${SUPABASE_URL}/rest/v1/churches?id=eq.${churchId}&select=id,pastor_id&limit=1`, { headers: h });
    const [church] = await cr.json();
    if (!church) return res.status(404).json({ error: 'church not found' });
    if (church.pastor_id !== req.userId) {
      const rr = await fetch(`${SUPABASE_URL}/rest/v1/church_roles?church_id=eq.${churchId}&user_id=eq.${req.userId}&is_owner=eq.true&select=id&limit=1`, { headers: h });
      const roles = await rr.json();
      if (!Array.isArray(roles) || !roles.length) return res.status(403).json({ error: 'owner access required' });
    }

    // Cancel the church subscription (bills the pastor's personal customer).
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey && church.pastor_id) {
      try {
        const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${church.pastor_id}&select=stripe_customer_id&limit=1`, { headers: h });
        const [prof] = await pr.json();
        if (prof?.stripe_customer_id) {
          const sr = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(prof.stripe_customer_id)}&status=active&limit=100`,
            { headers: { Authorization: `Bearer ${stripeKey}` } });
          const subs = (await sr.json())?.data ?? [];
          for (const s of subs) {
            await fetch(`https://api.stripe.com/v1/subscriptions/${s.id}`,
              { method: 'DELETE', headers: { Authorization: `Bearer ${stripeKey}` } });
          }
        }
      } catch (e) { console.error('[church-delete] stripe cancel:', e?.message); }
    }

    // Release members (their accounts survive; they just lose the church link),
    // then remove church data. FKs cascade the rest.
    await fetch(`${SUPABASE_URL}/rest/v1/profiles?church_id=eq.${churchId}`, {
      method: 'PATCH', headers: { ...h, Prefer: 'return=minimal' }, body: JSON.stringify({ church_id: null }),
    });
    await fetch(`${SUPABASE_URL}/rest/v1/church_roles?church_id=eq.${churchId}`, { method: 'DELETE', headers: h });
    await fetch(`${SUPABASE_URL}/rest/v1/sermons?church_id=eq.${churchId}`, { method: 'DELETE', headers: h });
    const dr = await fetch(`${SUPABASE_URL}/rest/v1/churches?id=eq.${churchId}`, { method: 'DELETE', headers: h });
    if (!dr.ok) return res.status(500).json({ error: 'church delete failed' });

    console.log(`[church-delete] ${churchId} deleted by ${req.userId}`);
    res.json({ ok: true });
  } catch (e) {
    safeError(res, e, 'church-delete');
  }
});

app.delete('/api/account', requireAuth, async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: 'account deletion not configured' });
  }
  const svcH = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };
  try {
    // Cancel any Stripe subscriptions FIRST, so a deleted account never keeps
    // billing (the profile row — and its stripe_customer_id — cascades away with
    // the auth user, after which the webhook can't find them). No-op until
    // STRIPE_SECRET_KEY is set on Render at Stripe go-live.
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (stripeKey) {
      try {
        const pr = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}&select=stripe_customer_id&limit=1`, { headers: svcH });
        const [prof] = await pr.json();
        const cust = prof?.stripe_customer_id;
        if (cust) {
          const sr = await fetch(`https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(cust)}&status=all&limit=100`,
            { headers: { Authorization: `Bearer ${stripeKey}` } });
          const subs = (await sr.json())?.data ?? [];
          for (const s of subs) {
            if (['active', 'trialing', 'past_due', 'unpaid'].includes(s.status)) {
              await fetch(`https://api.stripe.com/v1/subscriptions/${s.id}`,
                { method: 'DELETE', headers: { Authorization: `Bearer ${stripeKey}` } }).catch(() => {});
            }
          }
        }
      } catch (e) { console.error('[account-delete] stripe cancel failed:', e?.message); }
    }

    // Clear pastor_id on any churches owned by this user before deleting, to avoid
    // FK cascade ordering issues (churches.pastor_id → profiles ON DELETE SET NULL
    // can conflict with the profile cascade from auth delete in some Supabase versions).
    await fetch(
      `${SUPABASE_URL}/rest/v1/churches?pastor_id=eq.${req.userId}`,
      { method: 'PATCH', headers: { ...svcH, Prefer: 'return=minimal' }, body: JSON.stringify({ pastor_id: null }) },
    ).catch(() => {});

    // Remove church_roles rows for this user so no FK holds after profile delete.
    await fetch(
      `${SUPABASE_URL}/rest/v1/church_roles?user_id=eq.${req.userId}`,
      { method: 'DELETE', headers: { ...svcH, Prefer: 'return=minimal' } },
    ).catch(() => {});

    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${req.userId}`, {
      method: 'DELETE',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error('[kinwove] account delete failed', r.status, body);
      return res.status(500).json({ error: `delete failed: ${body || r.status}` });
    }
    // Drop cached tokens so a stolen JWT cannot keep authenticating after delete.
    for (const [tok, v] of tokenCache) if (v.userId === req.userId) tokenCache.delete(tok);
    res.status(204).end();
  } catch (err) {
    safeError(res, err, 'account-delete');
  }
});

// ── Guest post preview (no auth required) ────────────────────────────────────
// Returns a single public post + author profile for the share deep link.
// Non-members who tap a ?post= link call this to see the post before signing up.
app.get('/api/post/:id', limitAnon({ capacity: 30, refillPerSec: 30 / 60 }), async (req, res) => {
  const { id } = req.params;
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: 'not configured' });
  }
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?id=eq.${encodeURIComponent(id)}&visibility=eq.public&select=id,body,body_data,kind,created_at,author_id,profiles!author_id(id,display_name,avatar_config,avatar_url)`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    if (!r.ok) return res.status(502).json({ error: 'db error' });
    const rows = await r.json();
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json({ post: rows[0] });
  } catch (err) {
    console.error('[kinwove] guest post fetch error:', err?.message);
    res.status(500).json({ error: 'server error' });
  }
});

// ── AI feedback: user flags a response as inaccurate ─────────────────────────
app.post('/api/ai-feedback', optionalAuth, limitEither(
  { capacity: 20, refillPerSec: 20 / 60 },
  { capacity: 5,  refillPerSec: 5 / 60 },
), async (req, res) => {
  const { message_text } = req.body ?? {};
  if (typeof message_text !== 'string') {
    return res.status(400).json({ error: 'message_text required' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(200).json({ ok: true }); // silently ignore if not configured
  }
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/ai_feedback`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: req.userId ?? null,
        message_text: message_text.slice(0, 4000),
      }),
    });
  } catch (e) {
    console.error('[kinwove] ai-feedback insert error:', e?.message);
  }
  res.status(200).json({ ok: true });
});

app.post('/api/anon/ask', limitAnon({ capacity: 6, refillPerSec: 6 / 300 }), async (req, res) => {
  const { church_id, session_token, question, history } = req.body ?? {};
  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question required' });
  }
  if (question.length > 2000) return res.status(413).json({ error: 'question too long' });
  if (church_id && typeof church_id !== 'string') return res.status(400).json({ error: 'invalid church_id' });
  if (history && !Array.isArray(history)) return res.status(400).json({ error: 'invalid history' });

  // Verify church_id corresponds to a real, verified, public church before
  // we'll attribute an anonymous question to it. Otherwise an attacker could
  // attribute arbitrary questions to any church UUID by bypassing the UI.
  let verifiedChurchId = null;
  if (church_id && SUPABASE_URL && SUPABASE_ANON) {
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/churches?id=eq.${encodeURIComponent(church_id)}&select=id&verification_status=eq.verified&is_public=eq.true`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      if (r.ok) {
        const rows = await r.json();
        if (rows[0]?.id) verifiedChurchId = rows[0].id;
      }
    } catch (e) {
      console.error('[kinwove] anon church verify failed:', e?.message);
    }
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const messages = [
      ...((Array.isArray(history) ? history : []).slice(-6).map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content ?? '').slice(0, 4000),
      }))),
      { role: 'user', content: question },
    ];

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: ANON_SYSTEM + AI_SAFETY_BLOCK,
      messages,
    });
    req.on('close', () => stream.controller?.abort?.());
    stream.on('text', (delta) => send('text', { delta }));
    stream.on('error', (err) => { console.error('[kinwove] anon stream error:', err); send('error', { message: 'stream error' }); });

    const final = await stream.finalMessage();
    trackAi(final.usage);
    const fullText = final.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    // Fire-and-forget: classify + store. Only attribute to a church we
    // verified against the DB above; otherwise stash with church_id=null.
    // Also bump anonymous topic counts (no content, no user ID).
    if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
      classifyTheme(question).then(async (theme_tag) => {
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/anonymous_questions`, {
            method: 'POST',
            headers: {
              apikey: SUPABASE_SERVICE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
              'content-type': 'application/json',
              Prefer: 'return=minimal',
            },
            body: JSON.stringify({
              church_id: verifiedChurchId,
              session_token: String(session_token ?? '').slice(0, 64),
              question: question.slice(0, 4000),
              ai_response: fullText.slice(0, 8000),
              theme_tag,
            }),
          });
        } catch (e) {
          console.error('[kinwove] anon/ask store failed:', e?.message);
        }
      });
      // Keyword-based topic counts — no content or user ID stored
      logTopicCounts(topicTags(question));
    }

    send('done', { stop_reason: final.stop_reason });
    res.end();
  } catch (err) {
    console.error('[kinwove] anon/ask error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'something went wrong' });
    } else {
      send('error', { message: 'something went wrong' });
      res.end();
    }
  }
});

// ── Welcome DM (Tom-from-MySpace style system account) ───────────────────────
// On new user signup, the client calls POST /api/welcome-dm.
// We auto-create (once) a "kinwove" system account via the Supabase Admin Auth
// API, then create a DM conversation + insert the welcome message using the
// service role key (bypasses RLS so no additional policies needed).

const SYSTEM_EMAIL = 'system-theway@theway.internal';
let _systemAccountId = process.env.SYSTEM_ACCOUNT_ID ?? null;

async function upsertSystemProfile(id) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify({
        id,
        display_name: 'kinwove',
        // DiceBear illustrated avatar — gold-toned, seed "Faith"
        avatar_config: { style: 'lorelei', seed: 'Faith', bgColor: 'fef3c7' },
        person_type: 'believer',
      }),
    });
  } catch (e) {
    console.error('[kinwove] system profile upsert error:', e?.message);
  }
}

async function getOrCreateSystemAccount() {
  if (_systemAccountId) return _systemAccountId;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;

  // 1. Try env var shortcut (admin can pre-set this)
  // Already returned above.

  // 2. Look for existing system account by email
  try {
    const listR = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(SYSTEM_EMAIL)}&page=1&per_page=1`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } },
    );
    if (listR.ok) {
      const payload = await listR.json();
      const found = Array.isArray(payload?.users) ? payload.users[0] : null;
      if (found?.id) {
        _systemAccountId = found.id;
        await upsertSystemProfile(_systemAccountId);
        console.log(`[kinwove] system account found: ${_systemAccountId}`);
        return _systemAccountId;
      }
    }
  } catch (e) {
    console.error('[kinwove] system account lookup error:', e?.message);
  }

  // 3. Create new auth user for the system account
  try {
    const createR = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: SYSTEM_EMAIL,
        email_confirm: true,
        user_metadata: { display_name: 'kinwove', is_system: true },
      }),
    });
    const data = await createR.json();
    if (data?.id) {
      _systemAccountId = data.id;
      await upsertSystemProfile(_systemAccountId);
      console.log(`[kinwove] system account created: ${_systemAccountId}`);
      return _systemAccountId;
    }
    console.error('[kinwove] system account create failed:', JSON.stringify(data));
  } catch (e) {
    console.error('[kinwove] system account create error:', e?.message);
  }

  return null;
}

const WELCOME_MESSAGE = `Hey — welcome to kinwove. 👋

Whatever brought you here — curiosity, doubt, questions you haven't been able to say out loud — you're in the right place.

A few things worth knowing:

✦ **Ask anything.** The AI companion here doesn't dodge hard questions. Faith, suffering, the Bible, whether any of this is even true — it's all fair game.

✦ **You're not alone.** The community feed is full of people at every stage — some lifelong believers, some brand new, some still skeptical. All welcome.

✦ **No pressure.** There's no right pace, no checklist, no performance. Just honest conversation.

If you're not sure where to start, just tap **Ask** (the ✦ in the bottom bar) and type whatever's on your mind. Or explore the Bible reader, the prayer board, or the community — wherever feels right.

Glad you're here.`;

app.post('/api/welcome-dm', requireAuth, limitAuthed({ capacity: 3, refillPerSec: 3 / 3600 }), async (req, res) => {
  const userId = req.userId;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: 'not configured' });
  }

  try {
    const systemId = await getOrCreateSystemAccount();
    if (!systemId) return res.status(500).json({ error: 'system account unavailable' });

    // Don't send duplicate welcomes — check if a DM conv already exists
    // PostgREST array containment: cs={"id1","id2"} matches arrays that contain both ids
    const sorted = [systemId, userId].sort();
    const arrParam = `{"${sorted.join('","')}"}`;
    const checkR = await fetch(
      `${SUPABASE_URL}/rest/v1/dm_conversations?participant_ids=cs.${encodeURIComponent(arrParam)}&select=id&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } },
    );
    if (checkR.ok) {
      const rows = await checkR.json();
      if (rows?.length > 0) {
        // Already sent — idempotent
        return res.json({ ok: true, conversationId: rows[0].id, alreadySent: true });
      }
    }

    // Create the DM conversation
    const convR = await fetch(`${SUPABASE_URL}/rest/v1/dm_conversations`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({ participant_ids: sorted }),
    });
    if (!convR.ok) {
      const err = await convR.text();
      console.error('[kinwove] welcome DM conv create failed:', err);
      return res.status(500).json({ error: 'could not create conversation' });
    }
    const [conv] = await convR.json();
    const conversationId = conv?.id;
    if (!conversationId) return res.status(500).json({ error: 'no conversation id' });

    // Insert the welcome message from the system account
    await fetch(`${SUPABASE_URL}/rest/v1/dm_messages`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        sender_id: systemId,
        body: WELCOME_MESSAGE,
      }),
    });

    // Update last_message_at on the conversation so it surfaces first in inbox
    await fetch(`${SUPABASE_URL}/rest/v1/dm_conversations?id=eq.${conversationId}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ last_message_at: new Date().toISOString() }),
    });

    res.json({ ok: true, conversationId });
  } catch (err) {
    safeError(res, err, 'welcome-dm');
  }
});

// ── Sermon publish digest ─────────────────────────────────────────────────────
// POST /api/send-sermon-digest
// Called by the frontend the moment a pastor publishes a sermon.
// Body: { churchId, sermonId }
// Auth: requireAuth — verifies caller is owner/pastor of that church.
//
// Sends one email per church member:
//   • Sermon as the hero (title, scripture, summary, CTA)
//   • Top 3 posts from the feed this week
//   • Up to 3 recent prayer requests from the congregation

function digestEmailHtml({ churchName, topPosts, prayers, sermon, unsubUrl, ctaUrl }) {
  const gold = '#B8733A';
  const ink  = '#2C1810';
  const soft = '#6B5344';
  const pale = '#FDF8F0';
  const line = '#E8D5BB';

  const postRows = topPosts.map((p) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${line}">
        <div style="font-size:13px;font-weight:600;color:${gold};margin-bottom:4px">${escHtml(p.author)}</div>
        <div style="font-size:15px;color:${ink};line-height:1.55;font-family:Georgia,serif">${escHtml(p.body.slice(0, 200))}${p.body.length > 200 ? '…' : ''}</div>
        ${p.reactions > 0 ? `<div style="font-size:12px;color:${soft};margin-top:6px">❤️ ${p.reactions} reaction${p.reactions !== 1 ? 's' : ''}</div>` : ''}
      </td>
    </tr>`).join('');

  const prayerRows = prayers.map((p) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${line}">
        <div style="font-size:12px;font-weight:700;color:${gold};margin-bottom:3px;text-transform:uppercase;letter-spacing:0.06em">${escHtml(p.name)}</div>
        <div style="font-size:14px;color:${soft};line-height:1.6;font-family:Georgia,serif">${escHtml(p.body.slice(0, 160))}${p.body.length > 160 ? '…' : ''}</div>
      </td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escHtml(sermon.title)} — ${escHtml(churchName)}</title></head>
<body style="margin:0;padding:0;background:#F5EDD8;font-family:Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">

      <!-- Header -->
      <tr><td style="padding-bottom:28px;text-align:left">
        <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${gold};font-weight:700;margin-bottom:20px">kinwove · ${escHtml(churchName)}</div>
        <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${gold};font-weight:700;margin-bottom:10px">This week's sermon</div>
        <h1 style="font-family:Georgia,serif;font-size:32px;font-weight:600;color:${ink};margin:0 0 10px;letter-spacing:-0.025em;line-height:1.15">${escHtml(sermon.title)}</h1>
        ${sermon.scripture_ref ? `<div style="font-size:14px;color:${gold};font-style:italic;margin-bottom:14px">${escHtml(sermon.scripture_ref)}</div>` : ''}
        ${sermon.summary ? `<p style="font-size:15px;color:${soft};line-height:1.7;margin:0 0 22px;font-family:Georgia,serif">${escHtml(sermon.summary.slice(0, 280))}${sermon.summary.length > 280 ? '…' : ''}</p>` : ''}
        <a href="${ctaUrl ?? 'https://www.kinwove.com'}" style="display:inline-block;background:${ink};color:#FDF8F0;text-decoration:none;border-radius:999px;padding:12px 26px;font-size:14px;font-weight:600">Read this week's devotional →</a>
      </td></tr>

      <!-- Divider -->
      <tr><td style="border-top:1px solid ${line};padding-bottom:24px"></td></tr>

      ${topPosts.length > 0 ? `
      <!-- Feed highlights -->
      <tr><td style="padding-bottom:8px">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${gold};font-weight:700;margin-bottom:12px">From the community</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${line}">${postRows}</table>
      </td></tr>
      <tr><td style="height:24px"></td></tr>` : ''}

      ${prayers.length > 0 ? `
      <!-- Prayer wall -->
      <tr><td style="padding-bottom:8px">
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${gold};font-weight:700;margin-bottom:12px">🙏 Prayer wall</div>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${line}">${prayerRows}</table>
      </td></tr>
      <tr><td style="height:24px"></td></tr>` : ''}

      <!-- Footer -->
      <tr><td style="padding-top:8px;text-align:center">
        <p style="font-size:11px;color:#9C7B5E;line-height:1.6;margin:0">
          You're receiving this because you're a member of ${escHtml(churchName)} on kinwove.<br>
          <a href="https://www.kinwove.com" style="color:#9C7B5E">Open kinwove</a>${unsubUrl ? ` · <a href="${unsubUrl}" style="color:#9C7B5E">Unsubscribe from emails</a>` : ''}
        </p>
      </td></tr>

    </table>
  </td></tr></table>
</body></html>`;
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

app.post('/api/send-sermon-digest', requireAuth, async (req, res) => {
  const { churchId, sermonId } = req.body ?? {};
  if (!churchId || !sermonId) return res.status(400).json({ error: 'churchId and sermonId required' });
  if (!isUuid(churchId) || !isUuid(sermonId)) return res.status(400).json({ error: 'invalid id' });
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });

  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(503).json({ error: 'RESEND_API_KEY not set' });

  try {
    // 1. Verify caller is owner/pastor of this church
    const [rolesRes, churchRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/church_roles?church_id=eq.${churchId}&user_id=eq.${req.userId}&is_owner=eq.true&select=id&limit=1`, { headers: h }),
      fetch(`${SUPABASE_URL}/rest/v1/churches?id=eq.${churchId}&select=id,name,pastor_id&limit=1`, { headers: h }),
    ]);
    const roles   = await rolesRes.json();
    const churches = await churchRes.json();
    const church  = Array.isArray(churches) ? churches[0] : null;
    if (!church) return res.status(404).json({ error: 'Church not found' });
    const isOwner  = Array.isArray(roles) && roles.length > 0;
    const isPastor = church.pastor_id === req.userId;
    if (!isOwner && !isPastor) return res.status(403).json({ error: 'Not authorized for this church' });

    // 2. Fetch the specific sermon
    const sermonRes = await fetch(
      `${SUPABASE_URL}/rest/v1/sermons?id=eq.${sermonId}&church_id=eq.${churchId}&select=title,scripture_ref,summary&limit=1`,
      { headers: h }
    );
    const sermons = await sermonRes.json();
    const sermon = Array.isArray(sermons) ? sermons[0] : null;
    if (!sermon) return res.status(404).json({ error: 'Sermon not found' });

    // 3. Fetch church members (honoring the global email opt-out — CASL)
    const membersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?church_id=eq.${churchId}&daily_verse_opt_out=eq.false&select=id,display_name&limit=500`,
      { headers: h }
    );
    const members = await membersRes.json();
    if (!Array.isArray(members) || members.length === 0) {
      return res.json({ sent: 0, message: 'No members' });
    }

    // 4. Resolve email addresses — profiles.id == auth.users.id
    const emailMap = {};
    await Promise.all(members.map(async (m) => {
      try {
        const uRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${m.id}`, { headers: h });
        const u = await uRes.json();
        if (u?.email) emailMap[m.id] = u.email;
      } catch {}
    }));
    if (Object.keys(emailMap).length === 0) return res.json({ sent: 0, message: 'No email addresses found' });

    // 5. Recent feed posts this week (top 3 by reactions)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const postsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?scope=eq.church&scope_id=eq.${churchId}&created_at=gte.${sevenDaysAgo}&select=body,author_id,reaction_counts,profiles!author_id(display_name)&order=created_at.desc&limit=20`,
      { headers: h }
    );
    const posts = await postsRes.json();
    const topPosts = (Array.isArray(posts) ? posts : [])
      .map((p) => {
        const rc = p.reaction_counts ?? {};
        const reactions = Object.values(rc).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
        return { body: String(p.body ?? ''), author: p.profiles?.display_name ?? 'A member', reactions };
      })
      .sort((a, b) => b.reactions - a.reactions)
      .slice(0, 3)
      .filter((p) => p.body.trim().length > 0);

    // 6. Recent prayer requests from church members
    const prayersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/personal_prayers?is_public=eq.true&created_at=gte.${sevenDaysAgo}&select=body,is_anonymous,profiles!user_id(church_id,display_name)&order=created_at.desc&limit=20`,
      { headers: h }
    );
    const allPrayers = await prayersRes.json();
    const prayers = (Array.isArray(allPrayers) ? allPrayers : [])
      .filter((p) => p.profiles?.church_id === churchId)
      .slice(0, 3)
      .map((p) => ({
        body: String(p.body ?? ''),
        name: p.is_anonymous ? 'A member (anonymous)' : (p.profiles?.display_name ?? 'A member'),
      }));

    // 7. Send one email per member (fire in parallel, cap concurrency).
    // HTML is built per member so each gets their own signed unsubscribe link.
    const from = process.env.RESEND_FROM || 'kinwove <hello@kinwove.com>';
    const subject = `New sermon: "${sermon.title}" — ${church.name}`;
    const ctaUrl = `https://www.kinwove.com/?church=${churchId}`;

    let sent = 0;
    const queue = members.filter((m) => emailMap[m.id]);
    // Send in batches of 10 to avoid rate limits
    for (let i = 0; i < queue.length; i += 10) {
      await Promise.all(queue.slice(i, i + 10).map(async (m) => {
        try {
          const unsubUrl = `https://www.kinwove.com/api/email/unsubscribe?u=${m.id}&t=${emailToken(m.id)}`;
          const html = digestEmailHtml({ churchName: church.name, topPosts, prayers, sermon, unsubUrl, ctaUrl });
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from, to: [emailMap[m.id]], subject, html,
              headers: { 'List-Unsubscribe': `<${unsubUrl}>` },
            }),
          });
          if (r.ok) sent++;
        } catch {}
      }));
    }

    console.log(`[kinwove] sermon digest sent — ${sent} emails for "${sermon.title}" at ${church.name}`);
    res.json({ sent, members: queue.length });
  } catch (err) {
    safeError(res, err, 'send-sermon-digest');
  }
});

// ── Admin auth + data helpers ─────────────────────────────────────────────────

// Verifies the caller is authenticated AND has is_admin=true in their profile.
// Use as a standalone middleware (replaces requireAuth for admin routes).
async function requireAdmin(req, res, next) {
  const userId = await attachUser(req);
  if (!userId) return res.status(401).json({ error: 'auth required' });
  req.userId = userId;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=is_admin&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } },
    );
    const rows = await r.json();
    if (!rows[0]?.is_admin) return res.status(403).json({ error: 'admin only' });
    next();
  } catch (e) {
    console.error('[kinwove] requireAdmin error:', e?.message);
    res.status(500).json({ error: 'admin check failed' });
  }
}

// Service-role REST fetch — returns [] on any error.
async function adminFetch(path, qs = '') {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return [];
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}${qs ? '?' + qs : ''}`, {
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` },
    });
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}

// Service-role RPC call — returns null on any error.
async function adminRpc(fn, body = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

// ── Image moderation (Claude Haiku vision) ────────────────────────────────────
// Called client-side before any base64 image is saved to the DB.
// Uses Haiku for speed + cost — typical latency ~400–700 ms.
// Rate-limited to 30 req/min per IP (same as anon endpoints).
// NOTE: stays anon-callable on purpose — the client moderateImage() sends no auth
// token and fails OPEN on 401, so requiring auth would silently disable moderation.
// The trust-proxy fix above makes this per-IP limit un-spoofable, which is the
// real hardening. (A stronger fix = switch moderateImage to authedFetch, then gate.)
app.post('/api/moderate-image', limitAnon({ capacity: 30, refillPerSec: 30 / 60 }), async (req, res) => {
  const { imageData } = req.body ?? {};
  if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
    return res.status(400).json({ approved: false, reason: 'invalid_payload' });
  }

  // Parse the data URL: "data:image/jpeg;base64,/9j/..."
  const commaIdx = imageData.indexOf(',');
  if (commaIdx === -1) return res.status(400).json({ approved: false, reason: 'invalid_data_url' });
  const header    = imageData.slice(0, commaIdx);          // "data:image/jpeg;base64"
  const base64    = imageData.slice(commaIdx + 1);
  const mediaType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  const validTypes = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  if (!validTypes.has(mediaType)) return res.json({ approved: true }); // unknown type — pass through

  try {
    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001', // fast + cheap for moderation
      max_tokens: 5,
      messages: [{
        role: 'user',
        content: [
          {
            type:   'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          {
            type: 'text',
            text: [
              'You are a content moderator for kinwove — a Christian Bible study and church community platform.',
              'Review this image. Reply with exactly one word:',
              '  APPROVED — if the image is wholesome: a person, nature, art, scripture, text, or anything appropriate for a church.',
              '  REJECTED  — if the image contains nudity, sexual content, graphic violence, hate symbols, or anything clearly inappropriate.',
              'If you are uncertain, reply APPROVED.',
              'Reply with ONLY one word.',
            ].join('\n'),
          },
        ],
      }],
    });

    const verdict = (msg.content[0]?.text ?? '').trim().toUpperCase();
    const approved = verdict !== 'REJECTED';
    if (!approved) {
      console.warn('[moderate-image] REJECTED — media_type:', mediaType, 'size:', base64.length);
    }
    return res.json({ approved });
  } catch (e) {
    // Fail open — Claude API error should not block legitimate uploads
    console.error('[moderate-image] API error (failing open):', e.message);
    return res.json({ approved: true });
  }
});

// ── Care message safety screening ────────────────────────────────────────────
app.post('/api/care/screen-message', requireAuth, limitAuthed({ capacity: 20, refillPerSec: 20 / 60 }), async (req, res) => {
  const { body } = req.body ?? {};
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return res.status(400).json({ flagged: false });
  }

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages: [{
        role: 'user',
        content: `You are a silent safety screener for kinwove, a Christian community app with a pastoral care feature.

A member has written the following message to a care team member. Assess whether it contains any indication of:
- Suicidal ideation or self-harm (direct or indirect — including phrases like "I don't want to be here anymore", "nobody would miss me", "I have a plan", "I just want it to stop")
- Intent to harm another person
- Active abuse or assault
- Eating disorders or dangerous restriction

Be sensitive to indirect language, metaphors, and implied distress. Err on the side of caution.

Reply with exactly one word: FLAGGED or CLEAR.

Message:
"""
${body.slice(0, 2000)}
"""`,
      }],
    });

    const verdict = (msg.content[0]?.text ?? '').trim().toUpperCase();
    const flagged = verdict.startsWith('FLAGGED');
    if (flagged) console.log('[care/screen-message] FLAGGED by Haiku');
    return res.json({ flagged });
  } catch (e) {
    // Fail open — don't block sending if Claude is unavailable
    console.error('[care/screen-message] error (failing open):', e.message);
    return res.json({ flagged: false });
  }
});

// ── Topic analytics (admin read) ─────────────────────────────────────────────
app.get('/api/admin/topic-stats', requireAdmin, async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: 'not configured' });
  }
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/topic_counts?order=count.desc&select=topic_slug,count,last_seen_at`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    if (!r.ok) return res.status(502).json({ error: 'db error' });
    const rows = await r.json();
    const total = rows.reduce((s, row) => s + Number(row.count ?? 0), 0);
    const topics = rows.map((row) => ({
      slug: row.topic_slug,
      count: Number(row.count),
      pct: total > 0 ? Math.round((Number(row.count) / total) * 100) : 0,
      last_seen_at: row.last_seen_at,
    }));
    res.json({ topics, total });
  } catch (e) {
    safeError(res, e, 'topic-stats');
  }
});

// ── User reports (in-app contact / bug reports) ───────────────────────────────
app.post('/api/reports', requireAuth, async (req, res) => {
  try {
    const { category, subject, body } = req.body ?? {};
    if (!category || !subject?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'category, subject, and body are required' });
    }
    const valid = ['bug', 'ai', 'complaint', 'suggestion', 'other'];
    if (!valid.includes(category)) return res.status(400).json({ error: 'invalid category' });

    const r = await fetch(`${SUPABASE_URL}/rest/v1/user_reports`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ user_id: req.userId, category, subject: subject.trim(), body: body.trim() }),
    });
    if (!r.ok) return res.status(500).json({ error: 'Failed to save report' });
    res.json({ ok: true });
  } catch (e) {
    safeError(res, e, 'user-reports');
  }
});

// Admin: resolve or dismiss a report
app.patch('/api/admin/reports/:id', requireAdmin, async (req, res) => {
  try {
    const { status, admin_note } = req.body ?? {};
    const valid = ['open', 'resolved', 'dismissed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'invalid status' });
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'invalid id' });
    const r = await fetch(`${SUPABASE_URL}/rest/v1/user_reports?id=eq.${encodeURIComponent(req.params.id)}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ status, ...(admin_note != null ? { admin_note } : {}) }),
    });
    if (!r.ok) return res.status(500).json({ error: 'Failed to update report' });
    res.json({ ok: true });
  } catch (e) {
    safeError(res, e, 'admin-reports-patch');
  }
});

// Admin: act on a POST report — dismiss it, or remove the reported post.
// (post_reports had writers but no reader anywhere until 2026-07-10.)
app.post('/api/admin/post-reports/:id', requireAdmin, async (req, res) => {
  try {
    const { action } = req.body ?? {};
    if (!['dismiss', 'remove_post'].includes(action)) return res.status(400).json({ error: 'invalid action' });
    if (!isUuid(req.params.id)) return res.status(400).json({ error: 'invalid id' });
    const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' };

    if (action === 'remove_post') {
      const rr = await fetch(`${SUPABASE_URL}/rest/v1/post_reports?id=eq.${req.params.id}&select=post_id&limit=1`, { headers: h });
      const [report] = await rr.json();
      if (!report?.post_id) return res.status(404).json({ error: 'report not found' });
      // Clear every report on this post first (in case the FK doesn't cascade),
      // then delete the post itself.
      await fetch(`${SUPABASE_URL}/rest/v1/post_reports?post_id=eq.${report.post_id}`, { method: 'DELETE', headers: h });
      const dr = await fetch(`${SUPABASE_URL}/rest/v1/posts?id=eq.${report.post_id}`, { method: 'DELETE', headers: h });
      if (!dr.ok) return res.status(500).json({ error: 'Failed to remove post' });
      return res.json({ ok: true, removedPostId: report.post_id });
    }

    const r = await fetch(`${SUPABASE_URL}/rest/v1/post_reports?id=eq.${req.params.id}`, { method: 'DELETE', headers: h });
    if (!r.ok) return res.status(500).json({ error: 'Failed to dismiss report' });
    res.json({ ok: true });
  } catch (e) {
    safeError(res, e, 'admin-post-reports');
  }
});

// ── Admin user management ─────────────────────────────────────────────────────
// Search users, comp a plan, suspend (auth-level ban: login + token refresh
// stop working; no schema needed). Powers the AdminPage Users tab.
const COMPABLE_PLANS = ['free', 'premium', 'premium_plus'];

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const q = String(req.query.q ?? '').trim().replace(/[%,()]/g, '');
  if (!q) return res.json({ users: [] });
  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?display_name=ilike.*${encodeURIComponent(q)}*&select=id,display_name,plan,church_id,created_at,is_pastor,verse_streak&limit=10`,
      { headers: h }
    );
    const rows = await r.json();
    if (!Array.isArray(rows)) return res.json({ users: [] });
    // Hydrate email + ban status from the auth admin API (≤10 lookups).
    const users = await Promise.all(rows.map(async (p) => {
      try {
        const ur = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${p.id}`, { headers: h });
        const u = await ur.json();
        return { ...p, email: u?.email ?? null, banned_until: u?.banned_until ?? null };
      } catch { return { ...p, email: null, banned_until: null }; }
    }));
    res.json({ users });
  } catch (e) { safeError(res, e, 'admin-users-search'); }
});

app.post('/api/admin/users/:id/plan', requireAdmin, async (req, res) => {
  const { plan } = req.body ?? {};
  if (!isUuid(req.params.id)) return res.status(400).json({ error: 'invalid id' });
  if (!COMPABLE_PLANS.includes(plan)) return res.status(400).json({ error: 'invalid plan' });
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.params.id}`, {
      method: 'PATCH',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ plan }),
    });
    if (!r.ok) return res.status(500).json({ error: 'plan update failed' });
    res.json({ ok: true });
  } catch (e) { safeError(res, e, 'admin-users-plan'); }
});

app.post('/api/admin/users/:id/ban', requireAdmin, async (req, res) => {
  const { banned } = req.body ?? {};
  if (!isUuid(req.params.id)) return res.status(400).json({ error: 'invalid id' });
  if (req.params.id === req.userId) return res.status(400).json({ error: "You can't suspend yourself." });
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${req.params.id}`, {
      method: 'PUT',
      headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
      // ~100 years, or 'none' to lift. Auth-level: login + refresh stop working.
      body: JSON.stringify({ ban_duration: banned ? '876000h' : 'none' }),
    });
    if (!r.ok) return res.status(500).json({ error: 'ban update failed' });
    res.json({ ok: true });
  } catch (e) { safeError(res, e, 'admin-users-ban'); }
});

// ── Admin church lookup + edit ────────────────────────────────────────────────
app.get('/api/admin/church', requireAdmin, async (req, res) => {
  const { pastor_id } = req.query;
  if (!isUuid(pastor_id)) return res.status(400).json({ error: 'pastor_id required' });
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/churches?pastor_id=eq.${encodeURIComponent(pastor_id)}&limit=1`,
      { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } },
    );
    const rows = await r.json();
    if (!rows?.[0]) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (e) { safeError(res, e, 'admin-church-get'); }
});

app.patch('/api/admin/church/:churchId', requireAdmin, async (req, res) => {
  const allowed = ['name', 'denomination', 'city', 'country', 'website', 'verification_status', 'verification_notes', 'is_public'];
  const updates = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(req.body ?? {}, key)) updates[key] = req.body[key];
  }
  if (!Object.keys(updates).length) return res.status(400).json({ error: 'nothing to update' });
  if (!isUuid(req.params.churchId)) return res.status(400).json({ error: 'invalid id' });
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/churches?id=eq.${encodeURIComponent(req.params.churchId)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(updates),
      },
    );
    if (!r.ok) return res.status(500).json({ error: 'update failed' });
    res.json({ ok: true });
  } catch (e) { safeError(res, e, 'admin-church-patch'); }
});

// ── Web push (VAPID) ──────────────────────────────────────────────────────────
// True "app closed" push. The client stores a PushSubscription via
// /api/push/subscribe; a lightweight poller watches the notifications table and
// fans new rows out through web-push. No-op until Daniel sets VAPID_PUBLIC_KEY +
// VAPID_PRIVATE_KEY on Render (generate with `npx web-push generate-vapid-keys`).
const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY  ?? '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const PUSH_ENABLED = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && SUPABASE_URL && SUPABASE_SERVICE_KEY);
if (PUSH_ENABLED) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:hello@kinwove.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('[kinwove] web push enabled');
}

const pushSvcHeaders = () => ({
  apikey: SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
  'Content-Type': 'application/json',
});

// Kinds worth waking a phone for, with their notification titles.
const PUSH_KIND_TITLES = {
  dm_message:              '✉ New message on kinwove',
  care_message:            '💙 New care message',
  care_new_request:        '💛 Someone reached out for care',
  care_safety_flag:        '⚠️ A care conversation needs attention',
  prayer_support:          '🙏 Someone is praying for you',
  post_comment:            '💬 New comment on your post',
  post_comment_reply:      '↩ Someone replied to your comment',
  post_reaction:           '❤️ Someone reacted to your post',
  friend_request_received: '👋 You have a new friend request',
  friend_request_accepted: '🤝 Your friend request was accepted',
  follow:                  '👤 Someone started following you',
  sermon_published:        '📖 A new sermon has been published',
  church_daily_question:   '📖 Today’s question from your church',
};

app.get('/api/push/vapid-key', (_req, res) => {
  if (!PUSH_ENABLED) return res.status(404).json({ error: 'push not configured' });
  res.json({ key: VAPID_PUBLIC_KEY });
});

app.post('/api/push/subscribe', requireAuth, limitAuthed({ capacity: 10, refillPerSec: 10 / 60 }), async (req, res) => {
  if (!PUSH_ENABLED) return res.status(404).json({ error: 'push not configured' });
  const sub = req.body?.subscription;
  if (!sub?.endpoint || typeof sub.endpoint !== 'string' || sub.endpoint.length > 1000 || typeof sub.keys !== 'object') {
    return res.status(400).json({ error: 'invalid subscription' });
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
      method: 'POST',
      headers: { ...pushSvcHeaders(), Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({ endpoint: sub.endpoint, user_id: req.userId, keys: sub.keys }),
    });
    if (!r.ok) throw new Error(`upsert ${r.status}`);
    res.json({ ok: true });
  } catch (e) {
    console.error('[kinwove] push subscribe failed:', e?.message);
    res.status(500).json({ error: 'could not save subscription' });
  }
});

app.post('/api/push/unsubscribe', requireAuth, limitAuthed({ capacity: 10, refillPerSec: 10 / 60 }), async (req, res) => {
  const endpoint = req.body?.endpoint;
  if (!endpoint || typeof endpoint !== 'string') return res.status(400).json({ error: 'endpoint required' });
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}&user_id=eq.${req.userId}`,
      { method: 'DELETE', headers: pushSvcHeaders() }
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'could not remove subscription' });
  }
});

// Poller: every 15s, push any notification rows newer than the last sweep.
// In-memory watermark — after a deploy restart, rows created mid-restart are
// skipped rather than double-sent (the in-tab Realtime path still shows them).
let pushWatermark = new Date().toISOString();
async function pushSweep() {
  const kinds = Object.keys(PUSH_KIND_TITLES).join(',');
  const rowsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/notifications?created_at=gt.${encodeURIComponent(pushWatermark)}&kind=in.(${kinds})&select=id,recipient_id,kind,data,created_at&order=created_at.asc&limit=100`,
    { headers: pushSvcHeaders() }
  );
  const rows = await rowsRes.json();
  if (!Array.isArray(rows) || rows.length === 0) return;
  pushWatermark = rows[rows.length - 1].created_at;

  const recipientIds = [...new Set(rows.map((r) => r.recipient_id))];
  const subsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=in.(${recipientIds.join(',')})&select=endpoint,user_id,keys`,
    { headers: pushSvcHeaders() }
  );
  const subs = await subsRes.json();
  if (!Array.isArray(subs) || subs.length === 0) return;

  const subsByUser = new Map();
  for (const s of subs) {
    if (!subsByUser.has(s.user_id)) subsByUser.set(s.user_id, []);
    subsByUser.get(s.user_id).push(s);
  }

  for (const row of rows) {
    const targets = subsByUser.get(row.recipient_id) ?? [];
    const snippet = row.data?.snippet;
    const payload = JSON.stringify({
      title: PUSH_KIND_TITLES[row.kind] ?? 'kinwove',
      body: snippet ? `"${String(snippet).slice(0, 100)}"` : '',
      tag: row.id,
      url: '/',
    });
    for (const t of targets) {
      webpush.sendNotification({ endpoint: t.endpoint, keys: t.keys }, payload).catch((err) => {
        // 404/410 = subscription expired or revoked — clean it up.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(t.endpoint)}`, {
            method: 'DELETE', headers: pushSvcHeaders(),
          }).catch(() => {});
        }
      });
    }
  }
}
if (PUSH_ENABLED) {
  setInterval(() => pushSweep().catch((e) => console.error('[kinwove] push sweep failed:', e?.message)), 15000);
}

// ── Platform admin dashboard ──────────────────────────────────────────────────
// Single endpoint that returns everything the AdminPage needs.
// Calls the get_platform_stats() Supabase RPC for aggregate counts + trends,
// then fetches content/operations rows in parallel.
// SQL to run in Supabase to create get_platform_stats() — see MEMORY / README.
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const [platformStats, topicRows, topQuestions, recentShared, pendingApps, recentFeedback, userReports, postReports, promoCodes, promoRedemptions] = await Promise.all([
      adminRpc('get_platform_stats'),
      adminFetch('topic_counts', 'order=count.desc'),
      adminFetch('qa_cache', 'select=question_raw,hit_count&order=hit_count.desc&limit=15'),
      adminFetch('shared_conversations', 'select=id,title,created_at&order=created_at.desc&limit=15'),
      adminFetch('pastor_applications', 'select=id,full_name,church_name,denomination,city,country,reason,status,created_at&status=eq.pending&order=created_at.desc'),
      adminFetch('ai_feedback', 'select=message_text,created_at&order=created_at.desc&limit=30'),
      adminFetch('user_reports', 'select=id,category,subject,body,status,admin_note,created_at,profiles!user_id(display_name)&status=eq.open&order=created_at.desc&limit=100'),
      adminFetch('post_reports', 'select=id,type,note,created_at,reporter_id,post_id,posts!post_id(body,author_id,profiles!author_id(display_name))&order=created_at.desc&limit=100'),
      adminFetch('promo_codes', 'select=code,plan,months,uses,max_uses,active&order=uses.desc'),
      adminFetch('profiles', 'select=display_name,plan,promo_redeemed_at&promo_redeemed_at=not.is.null&order=promo_redeemed_at.desc&limit=25'),
    ]);

    // Hydrate reporter names (reporter_id FKs auth.users, so no direct embed).
    let postReportsOut = Array.isArray(postReports) ? postReports : [];
    if (postReportsOut.length) {
      const ids = [...new Set(postReportsOut.map((r) => r.reporter_id).filter(Boolean))];
      const profs = await adminFetch('profiles', `select=id,display_name&id=in.(${ids.join(',')})`);
      const nameById = Object.fromEntries((Array.isArray(profs) ? profs : []).map((p) => [p.id, p.display_name]));
      postReportsOut = postReportsOut.map((r) => ({ ...r, reporter_name: nameById[r.reporter_id] ?? 'Unknown' }));
    }

    res.json({
      postReports: postReportsOut,
      promoCodes: Array.isArray(promoCodes) ? promoCodes : [],
      promoRedemptions: Array.isArray(promoRedemptions) ? promoRedemptions : [],
      stats: platformStats ?? {},
      topics: Array.isArray(topicRows) ? topicRows : [],
      topQuestions: Array.isArray(topQuestions) ? topQuestions : [],
      recentShared: Array.isArray(recentShared) ? recentShared : [],
      pendingApps: Array.isArray(pendingApps) ? pendingApps : [],
      recentFeedback: Array.isArray(recentFeedback) ? recentFeedback : [],
      userReports: Array.isArray(userReports) ? userReports : [],
      bibleApi: { ...bibleApiUsage, monthlyLimit: BIBLE_MONTHLY_LIMIT },
      services: {
        email: { ...emailUsage, dailyLimit: RESEND_DAILY_LIMIT },
        tts:   { ...ttsUsage },
        ai:    { ...aiUsage },
      },
    });
  } catch (e) {
    safeError(res, e, 'admin-dashboard');
  }
});

// ── SEO: pre-rendered share pages + sitemap ──────────────────────────────────

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeXml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Topic tags extracted from conversation question — used for internal linking
// and category classification. Returns up to 3 tags.
function topicTags(text) {
  const t = (text ?? '').toLowerCase();
  const all = [
    { r: /\bpra(y|yer|ying|yers)\b/, label: 'Prayer', slug: 'prayer' },
    { r: /salvation|saved|born again|repent|forgiven|sin\b|sinner/, label: 'Salvation', slug: 'salvation' },
    { r: /\bjesus\b|christ\b|messiah|son of god|incarnation|resurrection/, label: 'Jesus Christ', slug: 'jesus' },
    { r: /\bbible\b|scripture|word of god|testament|verse|passage|book of/, label: 'Bible', slug: 'bible' },
    { r: /\bchurch\b|congregation|pastor|denomination|worship|sunday|attend/, label: 'Church', slug: 'church' },
    { r: /doubt|skeptic|evidence|proof|atheist|agnostic|how (can|do) (i|you) believe/, label: 'Faith & Doubt', slug: 'faith-doubt' },
    { r: /\bgrace\b|mercy|forgiveness|love of god|unconditional/, label: 'Grace', slug: 'grace' },
    { r: /marriage|divorce|relationship|sex|lust|spouse|family|parenting/, label: 'Relationships', slug: 'relationships' },
    { r: /heaven|hell|afterlife|eternal|death|judgment|purgatory/, label: 'Eternal Life', slug: 'eternal-life' },
    { r: /holy spirit|spirit of god|gifts|pentecost|tongues|anointing/, label: 'Holy Spirit', slug: 'holy-spirit' },
    { r: /suffering|evil|pain|why does god allow|theodicy|bad things/, label: 'Suffering & Evil', slug: 'suffering' },
    { r: /genesis|creation|evolution|adam|eve|earth|big bang|dinosaur/, label: 'Creation', slug: 'creation' },
    { r: /revelation|end times|rapture|apocalypse|antichrist|tribulation/, label: 'End Times', slug: 'end-times' },
    { r: /anxiety|depression|mental health|worry|fear|lonely|loneliness/, label: 'Mental Health', slug: 'mental-health' },
    { r: /purpose|meaning|calling|vocation|plan|destiny|why am i/, label: 'Purpose', slug: 'purpose' },
    { r: /money|wealth|tithing|giving|stewardship|rich|poor|prosperity/, label: 'Money & Giving', slug: 'money' },
    { r: /baptism|baptized|communion|eucharist|sacrament/, label: 'Sacraments', slug: 'sacraments' },
    { r: /old testament|new testament|law|moses|paul|psalm|gospel|epistle/, label: 'Scripture', slug: 'scripture' },
  ];
  return all.filter((tag) => tag.r.test(t)).slice(0, 3).map(({ label, slug }) => ({ label, slug }));
}

// Inline CSS for the share blog post page — parchment/ink kinwove brand
const SHARE_PAGE_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,serif;background:#FAF3E2;color:#2C1810;line-height:1.7}
  a{color:#8E5528;text-decoration:none}
  a:hover{text-decoration:underline}
  .kw-nav{background:#1A1108;color:#F5EDD8;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
  .kw-nav-logo{font-family:Georgia,serif;font-size:20px;font-weight:700;color:#F5EDD8;letter-spacing:-0.02em}
  .kw-nav-cta{background:#B8733A;color:#fff;padding:8px 18px;border-radius:999px;font-size:13px;font-weight:600;white-space:nowrap}
  .kw-nav-cta:hover{background:#a0622e;text-decoration:none}
  .kw-layout{max-width:860px;margin:0 auto;padding:40px 20px 60px;display:grid;grid-template-columns:1fr 280px;gap:48px;align-items:start}
  @media(max-width:700px){.kw-layout{grid-template-columns:1fr;padding:24px 16px 48px}}
  .kw-eyebrow{font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8E5528;font-weight:700;margin-bottom:14px}
  h1{font-size:clamp(1.5rem,4vw,2.1rem);font-weight:700;line-height:1.25;color:#1A1108;margin-bottom:10px}
  .kw-meta{font-size:13px;color:#8E5528;margin-bottom:32px;border-bottom:1px solid rgba(26,17,8,0.12);padding-bottom:20px}
  .kw-turn{margin-bottom:32px}
  .kw-q{font-size:15px;font-weight:700;color:#1A1108;background:rgba(184,115,58,0.08);border-left:3px solid #B8733A;padding:10px 14px;border-radius:0 8px 8px 0;margin-bottom:14px}
  .kw-a{font-size:16px;line-height:1.8;color:#2C1810;white-space:pre-wrap}
  .kw-a p{margin-bottom:1em}
  .kw-divider{border:none;border-top:1px solid rgba(26,17,8,0.1);margin:28px 0}
  .kw-topics{margin-top:32px;display:flex;flex-wrap:wrap;gap:8px}
  .kw-tag{background:rgba(184,115,58,0.1);color:#8E5528;border:1px solid rgba(184,115,58,0.25);border-radius:999px;padding:4px 12px;font-size:12px;font-weight:600}
  .kw-sidebar{position:sticky;top:24px}
  .kw-cta-box{background:#1A1108;color:#F5EDD8;border-radius:14px;padding:28px 24px;margin-bottom:24px}
  .kw-cta-box h2{font-size:17px;font-weight:700;margin-bottom:10px;line-height:1.3}
  .kw-cta-box p{font-size:13.5px;color:#D4C5B0;line-height:1.6;margin-bottom:18px}
  .kw-cta-link{display:block;text-align:center;background:#B8733A;color:#fff;border-radius:999px;padding:11px 20px;font-weight:600;font-size:14px}
  .kw-cta-link:hover{background:#a0622e;text-decoration:none}
  .kw-related-box{background:#fff;border:1px solid rgba(26,17,8,0.1);border-radius:14px;padding:20px}
  .kw-related-box h3{font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#8E5528;margin-bottom:14px;font-weight:700}
  .kw-related-box ul{list-style:none;display:flex;flex-direction:column;gap:10px}
  .kw-related-box li a{font-size:14px;color:#2C1810;line-height:1.4}
  .kw-related-box li a:hover{color:#8E5528}
  .kw-footer{background:#1A1108;color:#8E7060;padding:20px 24px;text-align:center;font-size:13px;margin-top:40px}
  .kw-footer a{color:#B8733A}
`;

// Shared conversations index — fetch N most recent public conversations
async function fetchRecentConversations(limit = 60) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return [];
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/shared_conversations?select=id,title,messages,created_at&order=created_at.desc&limit=${limit}`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (!r.ok) return [];
    return await r.json();
  } catch (e) {
    console.error('[kinwove] fetchRecentConversations error:', e?.message);
    return [];
  }
}

async function fetchSharedConversation(id) {
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/shared_conversations?id=eq.${encodeURIComponent(id)}&select=id,title,messages,person_type,created_at`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return rows[0] ?? null;
  } catch (e) {
    console.error('[kinwove] supabase fetch error:', e?.message);
    return null;
  }
}

// Serve frontend in production
if (process.env.NODE_ENV !== 'development') {
  const distPath = path.join(__dirname, 'dist');
  const indexPath = path.join(distPath, 'index.html');

  let _indexTemplate = null;
  async function getIndexTemplate() {
    if (!_indexTemplate) _indexTemplate = await fs.readFile(indexPath, 'utf8');
    return _indexTemplate;
  }

  // /share/:id — full blog-post page for each shared conversation
  // Visible content for humans + crawlers; React mounts after load for full app.
  // Only indexes conversations users explicitly chose to share (public URLs).
  app.get('/share/:id', async (req, res, next) => {
    try {
      const row = await fetchSharedConversation(req.params.id);
      if (!row) return next();

      const messages = Array.isArray(row.messages) ? row.messages : [];
      const firstUser = messages.find((m) => m.role === 'user')?.content ?? '';
      const firstAssistant = messages.find((m) => m.role === 'assistant')?.content ?? '';
      const rawTitle = (row.title || firstUser || 'A conversation about faith, doubt, and the Bible').trim();
      const seotitle = rawTitle.length > 65 ? rawTitle.slice(0, 62) + '…' : rawTitle;
      const pageTitle = `${seotitle} — kinwove AI Bible Study`;
      const descSource = (firstAssistant || firstUser || rawTitle).replace(/\s+/g, ' ');
      const description = descSource.slice(0, 158) + (descSource.length > 158 ? '…' : '');
      const canonicalUrl = `https://www.kinwove.com/share/${req.params.id}`;
      const dateStr = row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      const dateIso = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
      const tags = topicTags(rawTitle + ' ' + firstUser);

      // Format each Q&A turn as readable HTML
      const turnsHtml = (() => {
        const turns = [];
        for (let i = 0; i < messages.length; i++) {
          const m = messages[i];
          if (m.role === 'user') {
            turns.push(`<div class="kw-turn"><div class="kw-q">${escapeHtml(m.content)}</div>`);
          } else if (m.role === 'assistant') {
            // Format paragraphs
            const paras = m.content.split(/\n\n+/).map((p) => `<p>${escapeHtml(p.trim())}</p>`).join('');
            turns.push(`<div class="kw-a">${paras}</div></div>`);
            if (i < messages.length - 1) turns.push(`<hr class="kw-divider" />`);
          }
        }
        return turns.join('');
      })();

      // Topic tag pills
      const tagsHtml = tags.length ? `
        <div class="kw-topics">
          ${tags.map((t) => `<span class="kw-tag">${escapeHtml(t.label)}</span>`).join('')}
        </div>` : '';

      // Related suggestions (static — works without DB)
      const relatedHtml = `
        <div class="kw-related-box">
          <h3>Explore on kinwove</h3>
          <ul>
            <li><a href="https://www.kinwove.com/conversations">Browse all AI Bible conversations</a></li>
            <li><a href="https://www.kinwove.com/">Ask your own question →</a></li>
            <li><a href="https://www.kinwove.com/">Find your church</a></li>
            <li><a href="https://www.kinwove.com/">Daily devotionals</a></li>
          </ul>
        </div>`;

      // Article JSON-LD
      const articleSchema = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'QAPage',
        'mainEntity': {
          '@type': 'Question',
          'name': rawTitle,
          'dateCreated': dateIso,
          'text': firstUser,
          'acceptedAnswer': firstAssistant ? {
            '@type': 'Answer',
            'text': firstAssistant.slice(0, 2000),
            'dateCreated': dateIso,
            'url': canonicalUrl,
            'author': { '@type': 'Organization', 'name': 'kinwove AI', 'url': 'https://www.kinwove.com' },
          } : undefined,
        },
      });

      // Full blog-post body — visible to humans + crawlers before React mounts
      const blogContent = `
<div class="kw-share-wrap" id="kw-prerender">
  <style>${SHARE_PAGE_CSS}</style>
  <nav class="kw-nav">
    <a href="https://www.kinwove.com/" class="kw-nav-logo">✦ kinwove</a>
    <a href="https://www.kinwove.com/" class="kw-nav-cta">Ask your own question →</a>
  </nav>
  <div class="kw-layout">
    <article>
      <div class="kw-eyebrow">AI Bible Study · kinwove</div>
      <h1>${escapeHtml(rawTitle)}</h1>
      <div class="kw-meta">Shared conversation${dateStr ? ` · ${dateStr}` : ''} · <a href="https://www.kinwove.com/">kinwove.com</a></div>
      ${turnsHtml}
      ${tagsHtml}
    </article>
    <aside class="kw-sidebar">
      <div class="kw-cta-box">
        <h2>Ask your own Bible question</h2>
        <p>Get a thoughtful, grace-first answer from kinwove's AI companion — free, no account required to start.</p>
        <a href="https://www.kinwove.com/" class="kw-cta-link">Start a conversation →</a>
      </div>
      ${relatedHtml}
    </aside>
  </div>
  <footer class="kw-footer">
    <p>
      This conversation was publicly shared on <a href="https://www.kinwove.com/">kinwove</a> · AI Bible Study &amp; Christian Community ·
      <a href="https://www.kinwove.com/conversations">Browse all conversations</a>
    </p>
    <p style="margin-top:6px;font-size:11px;color:#5a4030">
      Shared conversations are public and may be indexed by search engines. Only content you explicitly share is visible here.
    </p>
  </footer>
</div>
<script>
  // Once React mounts into #root, hide the prerender blog content
  (function() {
    var el = document.getElementById('kw-prerender');
    var root = document.getElementById('root');
    if (!el || !root) return;
    var obs = new MutationObserver(function() {
      if (root.children.length > 0) { el.style.display = 'none'; obs.disconnect(); }
    });
    obs.observe(root, { childList: true });
  })();
</script>`;

      const tEsc = escapeHtml(pageTitle);
      const dEsc = escapeHtml(description);
      const cEsc = escapeHtml(canonicalUrl);

      const template = await getIndexTemplate();
      const html = template
        .replace(/<title>[^<]*<\/title>/, `<title>${tEsc}</title>`)
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${dEsc}" />`)
        .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${cEsc}" />`)
        .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${tEsc}" />`)
        .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${dEsc}" />`)
        .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${cEsc}" />`)
        .replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="article" />`)
        .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${tEsc}" />`)
        .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${dEsc}" />`)
        // Inject Article schema + prerender blog content
        .replace('</head>', `  <script type="application/ld+json">${articleSchema}<\/script>\n  </head>`)
        .replace('<div id="root"></div>', `<div id="root"></div>\n  ${blogContent}`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      res.send(html);
    } catch (e) {
      console.error('[kinwove] /share/:id error:', e?.message);
      next();
    }
  });

  // /conversations — public blog index of all shared AI conversations
  // This gives Google an entry point to crawl all /share/:id pages.
  // It's a standalone HTML page (not the React SPA) for maximum indexability.
  app.get('/conversations', async (req, res) => {
    const rows = await fetchRecentConversations(100);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const convListHtml = rows.length === 0
      ? `<p style="color:#8E7060;font-style:italic">No public conversations yet. <a href="https://www.kinwove.com/">Be the first to ask →</a></p>`
      : rows.map((row) => {
          const msgs = Array.isArray(row.messages) ? row.messages : [];
          const firstUser = msgs.find((m) => m.role === 'user')?.content ?? '';
          const firstAI = msgs.find((m) => m.role === 'assistant')?.content ?? '';
          const rawTitle = (row.title || firstUser || 'A conversation about faith').trim();
          const displayTitle = rawTitle.length > 90 ? rawTitle.slice(0, 87) + '…' : rawTitle;
          const snippet = firstAI.replace(/\s+/g, ' ').slice(0, 140) + (firstAI.length > 140 ? '…' : '');
          const dateStr = row.created_at ? new Date(row.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          const tags = topicTags(rawTitle + ' ' + firstUser);
          const tagsHtml = tags.map((t) => `<span class="cv-tag">${escapeHtml(t.label)}</span>`).join('');
          return `
          <article class="cv-card">
            <a href="https://www.kinwove.com/share/${escapeHtml(row.id)}" class="cv-link">
              <h2 class="cv-title">${escapeHtml(displayTitle)}</h2>
              ${snippet ? `<p class="cv-snippet">${escapeHtml(snippet)}</p>` : ''}
            </a>
            <div class="cv-footer">
              <div class="cv-tags">${tagsHtml}</div>
              ${dateStr ? `<span class="cv-date">${dateStr}</span>` : ''}
            </div>
          </article>`;
        }).join('');

    const collectionSchema = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': 'AI Bible Study Conversations — kinwove',
      'description': 'Browse publicly shared conversations from kinwove\'s AI Bible companion. Real questions about scripture, faith, and doubt — answered with grace and honesty.',
      'url': 'https://www.kinwove.com/conversations',
      'publisher': { '@type': 'Organization', 'name': 'kinwove', 'url': 'https://www.kinwove.com' },
    });

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Bible Study Conversations — kinwove</title>
  <meta name="description" content="Browse real conversations from kinwove's AI Bible companion — questions about scripture, faith, doubt, and Christian living answered honestly and without judgment." />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  <link rel="canonical" href="https://www.kinwove.com/conversations" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.kinwove.com/conversations" />
  <meta property="og:title" content="AI Bible Study Conversations — kinwove" />
  <meta property="og:description" content="Browse real conversations from kinwove's AI Bible companion — questions about scripture, faith, doubt, and Christian living answered honestly." />
  <meta property="og:image" content="https://www.kinwove.com/og-image.png?v=20260619" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="AI Bible Study Conversations — kinwove" />
  <meta name="twitter:description" content="Real questions about faith answered honestly. Browse publicly shared kinwove AI conversations." />
  <script type="application/ld+json">${collectionSchema}</script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,serif;background:#FAF3E2;color:#2C1810;line-height:1.7;min-height:100vh}
    a{color:#8E5528;text-decoration:none}a:hover{text-decoration:underline}
    .cv-nav{background:#1A1108;color:#F5EDD8;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px}
    .cv-nav-logo{font-size:20px;font-weight:700;color:#F5EDD8;letter-spacing:-0.02em}
    .cv-nav-cta{background:#B8733A;color:#fff;padding:8px 18px;border-radius:999px;font-size:13px;font-weight:600}
    .cv-nav-cta:hover{background:#a0622e;text-decoration:none}
    .cv-wrap{max-width:840px;margin:0 auto;padding:40px 20px 80px}
    .cv-hero{margin-bottom:36px}
    .cv-eyebrow{font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#8E5528;font-weight:700;margin-bottom:12px}
    .cv-hero h1{font-size:clamp(1.6rem,4vw,2.2rem);font-weight:700;line-height:1.2;color:#1A1108;margin-bottom:12px}
    .cv-hero p{font-size:16px;color:#5A4733;line-height:1.7;max-width:600px}
    .cv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:18px}
    @media(max-width:500px){.cv-grid{grid-template-columns:1fr}}
    .cv-card{background:#fff;border:1px solid rgba(26,17,8,0.1);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:10px;transition:box-shadow 0.15s}
    .cv-card:hover{box-shadow:0 4px 20px rgba(44,24,16,0.1)}
    .cv-link{display:block;text-decoration:none;color:inherit;flex:1}
    .cv-title{font-size:15.5px;font-weight:700;color:#1A1108;line-height:1.35;margin-bottom:8px}
    .cv-title:hover{color:#8E5528}
    .cv-snippet{font-size:13.5px;color:#5A4733;line-height:1.6;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
    .cv-footer{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px;margin-top:4px}
    .cv-tags{display:flex;flex-wrap:wrap;gap:5px}
    .cv-tag{background:rgba(184,115,58,0.1);color:#8E5528;border:1px solid rgba(184,115,58,0.2);border-radius:999px;padding:2px 9px;font-size:11px;font-weight:600}
    .cv-date{font-size:12px;color:#8E9060;flex-shrink:0}
    .cv-empty{color:#8E7060;font-style:italic;padding:20px 0}
    .cv-cta{background:#1A1108;color:#F5EDD8;border-radius:14px;padding:28px 28px;margin-top:48px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:18px}
    .cv-cta h2{font-size:18px;font-weight:700;max-width:400px;line-height:1.3}
    .cv-cta-btn{background:#B8733A;color:#fff;border-radius:999px;padding:12px 24px;font-weight:600;font-size:15px;white-space:nowrap}
    .cv-cta-btn:hover{background:#a0622e;text-decoration:none}
    .cv-footer-bar{background:#1A1108;color:#5a4030;padding:18px 24px;text-align:center;font-size:12.5px;margin-top:0}
    .cv-footer-bar a{color:#B8733A}
  </style>
</head>
<body>
  <nav class="cv-nav">
    <a href="https://www.kinwove.com/" class="cv-nav-logo">✦ kinwove</a>
    <a href="https://www.kinwove.com/" class="cv-nav-cta">Ask your own question →</a>
  </nav>
  <div class="cv-wrap">
    <header class="cv-hero">
      <div class="cv-eyebrow">AI Bible Study · kinwove</div>
      <h1>Real questions about faith.<br>Honest answers.</h1>
      <p>Browse publicly shared conversations from kinwove's AI Bible companion — scripture explanations, theological questions, and faith conversations answered with grace and without judgment.</p>
    </header>
    <div class="cv-grid">
      ${convListHtml}
    </div>
    <div class="cv-cta">
      <h2>Have a question of your own?</h2>
      <a href="https://www.kinwove.com/" class="cv-cta-btn">Ask kinwove — it's free →</a>
    </div>
  </div>
  <footer class="cv-footer-bar">
    <p>
      <a href="https://www.kinwove.com/">kinwove</a> · AI Bible Study &amp; Christian Community ·
      <a href="mailto:hello@kinwove.app">hello@kinwove.app</a>
    </p>
    <p style="margin-top:4px">Only conversations users explicitly shared are shown here.</p>
  </footer>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=1800');
    res.send(html);
  });

  // /sitemap.xml — static pages + every public shared conversation
  app.get('/sitemap.xml', async (req, res) => {
    // Always use canonical domain so crawlers get consistent URLs
    const host = 'https://www.kinwove.com';
    const today = new Date().toISOString().slice(0, 10);

    const entries = [
      // Core pages
      `<url><loc>${host}/</loc><changefreq>daily</changefreq><priority>1.0</priority><lastmod>${today}</lastmod></url>`,
      // Blog / conversations index — changes every time someone shares a conversation
      `<url><loc>${host}/conversations</loc><changefreq>hourly</changefreq><priority>0.9</priority><lastmod>${today}</lastmod></url>`,
      `<url><loc>${host}/llms.txt</loc><changefreq>monthly</changefreq><priority>0.4</priority></url>`,
      // Answers library — crawlable faith-question pages (Google + AI engines)
      `<url><loc>${host}/answers</loc><changefreq>weekly</changefreq><priority>0.9</priority><lastmod>${today}</lastmod></url>`,
      ...ANSWERS.map((a) =>
        `<url><loc>${host}/answers/${escapeXml(a.slug)}</loc><changefreq>monthly</changefreq><priority>0.8</priority><lastmod>${escapeXml(a.updated)}</lastmod></url>`),
    ];

    // Add all public shared conversations (user-generated content Google can index)
    if (SUPABASE_URL && SUPABASE_ANON) {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/shared_conversations?select=id,created_at&order=created_at.desc&limit=10000`,
          { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
        );
        if (r.ok) {
          const rows = await r.json();
          for (const row of rows) {
            const lastmod = row.created_at ? new Date(row.created_at).toISOString().slice(0, 10) : today;
            entries.push(`<url><loc>${host}/share/${escapeXml(row.id)}</loc><lastmod>${lastmod}</lastmod><changefreq>never</changefreq><priority>0.7</priority></url>`);
          }
        }
      } catch (e) {
        console.error('[kinwove] /sitemap.xml error:', e?.message);
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  });

  // /?post=<uuid> — dynamic OG tags so iMessage / WhatsApp / etc show a rich
  // card for the specific post instead of the generic kinwove splash image.
  // The same HTML is returned for all visitors — React picks up the ?post param
  // on load and deep-links to the post normally.
  app.get('/', async (req, res, next) => {
    const postId = req.query.post;
    if (!postId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId)) {
      return next();
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return next();
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/posts?id=eq.${encodeURIComponent(postId)}&visibility=eq.public&select=id,body,body_data,kind,created_at,profiles!author_id(display_name)`,
        { headers: { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` } }
      );
      if (!r.ok) return next();
      const rows = await r.json();
      const post = rows[0];
      if (!post) return next(); // not found or private → serve normal SPA

      const bodyData = post.body_data ?? {};
      const rawText = post.body ?? '';
      const authorName = post.profiles?.display_name ?? 'kinwove member';

      // Extract YouTube video ID — handles watch, shorts, embed, youtu.be
      // i.ytimg.com is YouTube's actual CDN; more reliable than img.youtube.com
      const YT_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
      const allText = [rawText, bodyData.repost_body ?? ''].join(' ');
      const ytMatch = allText.match(YT_RE);
      const ytId = ytMatch?.[1] ?? null;

      // Build title text — strip all URLs, use what's left
      const postText = bodyData.repost_of
        ? (bodyData.repost_body ?? rawText ?? '')
        : rawText;
      const cleanText = postText.replace(/https?:\/\/\S+/g, '').replace(/\s+/g, ' ').trim();
      const rawTitle = cleanText.length > 6
        ? cleanText
        : (bodyData.repost_of ? `${authorName} reposted on kinwove` : `${authorName} on kinwove`);
      const title = rawTitle.length > 80 ? rawTitle.slice(0, 77) + '…' : rawTitle;
      const titleWithBrand = `${title} — kinwove`;

      const description = 'Join kinwove to react, comment, and share what moves you.';
      const url = `https://www.kinwove.com/?post=${postId}`;

      // Image: YouTube thumbnail (i.ytimg.com CDN, always exists) > default OG
      const ogImage = ytId
        ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
        : 'https://www.kinwove.com/og-image.png?v=20260619';
      const ogImageW = ytId ? '480' : '1200';
      const ogImageH = ytId ? '360' : '630';

      const tEsc = escapeHtml(titleWithBrand);
      const dEsc = escapeHtml(description);
      const uEsc = escapeHtml(url);
      const iEsc = escapeHtml(ogImage);

      const template = await getIndexTemplate();
      const html = template
        .replace(/<title>[^<]*<\/title>/, `<title>${tEsc}</title>`)
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${dEsc}" />`)
        .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${uEsc}" />`)
        .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${uEsc}" />`)
        .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${tEsc}" />`)
        .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${dEsc}" />`)
        .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${iEsc}" />`)
        .replace(/<meta property="og:image:width"[^>]*>/, `<meta property="og:image:width" content="${ogImageW}" />`)
        .replace(/<meta property="og:image:height"[^>]*>/, `<meta property="og:image:height" content="${ogImageH}" />`)
        .replace(/<meta name="twitter:card"[^>]*>/, `<meta name="twitter:card" content="summary_large_image" />`)
        .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${tEsc}" />`)
        .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${dEsc}" />`)
        .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${iEsc}" />`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
      res.send(html);
    } catch (e) {
      console.error('[kinwove] /?post= OG error:', e?.message);
      next();
    }
  });

  // /robots.txt — the static file in /public is served first; this is a fallback
  // for dev where /public isn't being served as static files.
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /auth/callback\nSitemap: https://www.kinwove.com/sitemap.xml\n`);
  });

  // /llms.txt — also serve from root (canonical: /.well-known/llms.txt handled by static)
  app.get('/llms.txt', (_req, res) => {
    res.sendFile(path.join(distPath, '..', 'public', 'llms.txt'));
  });

  // ── Answers library — crawlable, GEO-optimized faith-question pages ──────────
  // Real server-rendered HTML (not the SPA) so Google + AI engines can read/cite.
  app.get('/answers', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600').type('html').send(renderAnswerIndex());
  });
  app.get('/answers/:slug', (req, res) => {
    const a = ANSWERS_BY_SLUG[req.params.slug];
    if (!a) return res.redirect(302, '/answers');
    res.set('Cache-Control', 'public, max-age=3600').type('html').send(renderAnswerPage(a));
  });

  app.use(express.static(distPath));
  app.get('/privacy', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600').type('html').send(renderLegalPage('privacy'));
  });
  app.get('/terms', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=3600').type('html').send(renderLegalPage('terms'));
  });

  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[kinwove] api listening on http://localhost:${PORT}`);
});

