import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: true });
loadEnv({ override: false });
import express from 'express';
import cors from 'cors';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
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

app.use(cors());
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
  if (!SUPABASE_URL || !SUPABASE_ANON) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const u = await r.json();
    if (!u?.id) return null;
    tokenCache.set(token, { userId: u.id, expires: Date.now() + TOKEN_TTL_MS });
    return u.id;
  } catch {
    return null;
  }
}

async function attachUser(req) {
  const auth = req.get('authorization') ?? '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1];
  if (!token) return null;
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
  return (req.get('x-forwarded-for')?.split(',')[0].trim()) || req.socket.remoteAddress || 'unknown';
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
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
    const h = new URL(url).hostname.replace(/^www\./, '');
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(h)) return true;
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

// Map profile voice names → actual OpenAI voices.
const VOICE_MAP = {
  onyx:    'fable',   // fable = naturally British male
  nova:    'nova',    // nova = clearly feminine, warm
  shimmer: 'nova',
};

// Voice instructions — kept short and specific for gpt-4o-mini-tts
const VOICE_INSTRUCTIONS = {
  fable: 'An elderly, distinguished British man — wise, measured, and deeply calm. Like a grandfather reading aloud. Slow, resonant, and unhurried. Let every sentence land with quiet weight.',
  nova:  'A warm, gentle woman — soft-spoken, kind, and tender. Speak slowly and quietly, like comforting a friend. Light and feminine, never flat or rushed.',
};

// ── Text-to-Speech (OpenAI TTS API) ──────────────────────────────────────────
app.post('/api/tts', requireAuth, limitAuthed({ capacity: 8, refillPerSec: 8 / 60 }), async (req, res) => {
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return res.status(503).json({ error: 'TTS not configured' });

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

  const oaiVoice = VOICE_MAP[voice] ?? voice;
  const instr    = VOICE_INSTRUCTIONS[oaiVoice];
  console.log(`[tts] profile=${voice} oaiVoice=${oaiVoice} len=${cleaned.length}`);
  try {
    const oaiRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        input: cleaned,
        voice: oaiVoice,
        instructions: instr ?? undefined,
        response_format: 'mp3',
        speed: 0.92,               // slightly slower for clarity and warmth
      }),
    });

    if (!oaiRes.ok) {
      const err = await oaiRes.text();
      console.error('[kinwove] TTS error:', err);
      return res.status(502).json({ error: 'TTS upstream error' });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    const reader = oaiRes.body.getReader();
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

app.post('/api/chat', optionalAuth, limitEither(
  { capacity: 12, refillPerSec: 12 / 60 },     // authed: 12/min sustained
  { capacity: 4,  refillPerSec: 4 / 600 },     // anon (GuestQuestion): 4 per 10 min
), async (req, res) => {
  const { system, messages, personType, seekingContext } = req.body ?? {};

  if (!system || typeof system !== 'string' || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'system and messages are required' });
  }
  if (system.length > 32000) return res.status(413).json({ error: 'system too long' });

  // Validate each message — content can be a string OR a multimodal array (for image vision).
  const VALID_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
  for (const m of messages) {
    if (typeof m?.content === 'string') {
      if (m.content.length > 8000) return res.status(413).json({ error: 'message too long' });
    } else if (Array.isArray(m?.content)) {
      for (const block of m.content) {
        if (block.type === 'text' && block.text?.length > 8000) return res.status(413).json({ error: 'message too long' });
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

  if (isFirstTurn && personType && !hasImages) {
    const cached = await lookupCachedAnswer(personType, lastUserMsg);
    if (cached?.answer) {
      send('cache_hit', { id: cached.id });
      for (let i = 0; i < cached.answer.length; i += 24) {
        send('text', { delta: cached.answer.slice(i, i + 24) });
        await new Promise((r) => setTimeout(r, 12));
      }
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

  try {
    // Model routing — tier controls ceiling, complexity controls selection within tier.
    // Free: Haiku only. Individual: Haiku|Sonnet. Pro: Haiku|Sonnet|Opus.
    const plan = req.body?.plan ?? 'free';
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
        ? 'claude-opus-4-7'
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

    const trimmed = messages.slice(-8);

    const stream = client.messages.stream({
      model,
      max_tokens: 2048,
      system: system + urlContext,
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
    const fullText = final.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    send('done', { stop_reason: final.stop_reason, usage: final.usage });
    res.end();

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
app.post('/api/walk/generate', requireAuth, limitAuthed({ capacity: 6, refillPerSec: 6 / 600 }), async (req, res) => {
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

app.post('/api/sermon/generate', requireAuth, limitAuthed({ capacity: 12, refillPerSec: 12 / 300 }), async (req, res) => {
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

/** Send an email via Resend. Throws on failure. */
async function sendEmail(to, subject, html) {
  const key  = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'kinwove <onboarding@resend.dev>';
  if (!key) throw new Error('RESEND_API_KEY not set');
  const r = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text().catch(() => '')}`);
}

// Kinwove wordmark safe for all email clients including Gmail.
// Gmail strips position:absolute/relative, so we stack the star above the
// dotless-ı using display:block spans inside an inline-block container.
// ✦ (U+2726) is the same 4-pointed star shape as our SVG logo.
const KW = [
  'k',
  '<span style="display:inline-block;vertical-align:baseline;line-height:1.15;text-align:center">',
    '<span style="display:block;font-size:0.48em;color:#A85530;line-height:1;margin-bottom:1px">&#10022;</span>',
    '<span style="display:block;line-height:1">&#305;</span>',  // dotless ı
  '</span>',
  'nwove',
].join('');

// Shared brand wrapper — keeps all kinwove emails visually consistent.
function emailWrap(bodyHtml) {
  return `<div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:40px 24px;color:#2C1810;background:#ffffff">
    <!-- Logo: app icon (dark rounded square + star) + wordmark below -->
    <div style="text-align:center;margin-bottom:36px">
      <div style="display:inline-block;background:#1A1108;border-radius:18px;width:60px;height:60px;line-height:60px;text-align:center;margin-bottom:12px">
        <span style="font-size:30px;color:#C17B45;line-height:60px;display:inline-block;vertical-align:middle">&#10022;</span>
      </div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:500;color:#1A1108;letter-spacing:-0.02em">kinwove</div>
    </div>
    ${bodyHtml}
    <div style="margin-top:40px;padding-top:20px;border-top:1px solid #E8D5BB;font-size:12px;color:#9C7B5E;line-height:1.7">
      You're receiving this because you have a ${KW} account.<br>
      <a href="https://www.kinwove.com" style="color:#A85530;text-decoration:none">www.kinwove.com</a>
    </div>
  </div>`;
}

function btnHtml(label, url) {
  return `<a href="${url}" style="display:inline-block;background:#B8733A;color:#FDF8F0;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:15px;font-weight:600;margin:24px 0;letter-spacing:0.01em">${label} →</a>`;
}

function welcomeEmailHtml(firstName) {
  return emailWrap(`
    <h1 style="font-size:28px;font-weight:600;margin:0 0 16px;letter-spacing:-0.02em;color:#2C1810">Welcome, ${firstName}.</h1>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      You've joined a space to explore the Bible honestly — whether you're full of faith, full of questions, or somewhere in between.
    </p>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 4px">
      Ask anything. Read deeply. Save what matters.
    </p>
    ${btnHtml('Open ' + KW, 'https://www.kinwove.com')}
    <p style="font-size:13px;color:#9C7B5E;margin:0">No pressure. No agenda. Just honest answers.</p>
  `);
}

function roleInviteEmailHtml({ memberName, pastorName, roleLabel, churchName }) {
  return emailWrap(`
    <h1 style="font-size:26px;font-weight:600;margin:0 0 14px;letter-spacing:-0.02em;color:#2C1810">You've been invited.</h1>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 20px">
      <strong>${pastorName}</strong> has invited you to join the <strong>${roleLabel}</strong> team at <strong>${churchName}</strong> on ${KW}.
    </p>
    <div style="background:#FDF8F0;border:1px solid #E8D5BB;border-radius:12px;padding:18px 20px;margin-bottom:24px;font-size:14px;color:#6B5344;line-height:1.7">
      Open ${KW} to accept or decline — the invitation is waiting in your notifications 🔔
    </div>
    ${btnHtml('Open ' + KW, 'https://www.kinwove.com')}
    <p style="font-size:13px;color:#9C7B5E;margin:0">Questions? Reply to this email and we'll help.</p>
  `);
}

function nudgeEmailHtml(firstName) {
  return emailWrap(`
    <h1 style="font-size:26px;font-weight:600;margin:0 0 14px;letter-spacing:-0.02em;color:#2C1810">Your profile is waiting.</h1>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 14px">
      Hey ${firstName} — you started setting up your ${KW} profile but haven't quite finished.
    </p>
    <p style="font-size:16px;color:#6B5344;line-height:1.75;margin:0 0 4px">
      It only takes a minute, and it helps ${KW} give you much better answers from the start.
    </p>
    ${btnHtml('Complete my profile', 'https://www.kinwove.com')}
    <p style="font-size:13px;color:#9C7B5E;margin:0">No pressure — we'll be here whenever you're ready.</p>
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
    console.error('[email/welcome]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Role invite: create invite row + email the member ─────────────────────────
app.post('/api/church/role-invite', requireAuth, limitAuthed({ capacity: 20, refillPerSec: 20 / 60 }), async (req, res) => {
  const { church_id, user_id, role_key, role_label, message } = req.body ?? {};
  if (!church_id || !user_id || !role_key) {
    return res.status(400).json({ error: 'church_id, user_id, role_key required' });
  }

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

  // Insert the pending invite
  const inviteR = await fetch(`${SUPABASE_URL}/rest/v1/church_role_invites`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=representation' },
    body: JSON.stringify({ church_id, user_id, role_key, role_label: role_label ?? null, message: message ?? null, granted_by: req.userId, status: 'pending' }),
  });
  if (!inviteR.ok) {
    const err = await inviteR.text().catch(() => '');
    return res.status(500).json({ error: err });
  }

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
      // Use human-readable label: custom label → preset lookup → raw key
      const label = role_label || ROLE_LABELS[role_key] || role_key;
      console.log(`[role-invite email] sending to ${memberEmail} for role "${label}"`);
      await sendEmail(
        memberEmail,
        `You've been invited to join the ${label} team at ${church.name}`,
        roleInviteEmailHtml({ memberName, pastorName, roleLabel: label, churchName: church.name }),
      );
      console.log(`[role-invite email] sent OK to ${memberEmail}`);
    } catch (e) {
      console.error('[role-invite email] FAILED:', e.message);
    }
  })();

  res.json({ ok: true });
});

// ── Incomplete-profile nudge (cron) ───────────────────────────────────────────
// Hit this endpoint with a cron job once per day (e.g. Render cron or uptime service).
// Finds users who signed up 24–72 h ago with no display_name and sends one nudge email.
// Add a secret header in your cron config: X-Cron-Secret: <CRON_SECRET env var>
app.post('/api/cron/nudge-incomplete', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers['x-cron-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return res.status(503).json({ error: 'not configured' });

  const h = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
  const since = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const after  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Profiles created 24–72 h ago with no display_name
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?display_name=is.null&created_at=gte.${since}&created_at=lte.${after}&select=id&limit=50`,
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
      await sendEmail(email, 'Your kinwove profile is waiting', nudgeEmailHtml(firstName));
      sent++;
      await new Promise((r) => setTimeout(r, 200)); // gentle rate-limit between sends
    } catch (e) {
      console.error('[nudge-incomplete]', e.message);
    }
  }
  console.log(`[nudge-incomplete] sent ${sent} of ${incomplete.length}`);
  res.json({ sent, total: incomplete.length });
});

// ── Church email verification ────────────────────────────────────────────────

const VERIFY_CODE_TTL_MS = 15 * 60 * 1000;
function generateCode() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function sendVerificationEmail(to, code, churchName) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY not set');
  const from = process.env.RESEND_FROM || 'kinwove <onboarding@resend.dev>';
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
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/churches?invite_code=eq.${encodeURIComponent(code)}&select=id,name&limit=1`,
      { headers: h }
    );
    const rows = await r.json();
    if (!Array.isArray(rows)) {
      console.error('[invite-code] unexpected response:', JSON.stringify(rows).slice(0, 300));
      return res.json({ church: null });
    }
    const church = rows[0] ?? null;
    res.json({ church });
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
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url.toString(), { signal: ctrl.signal, headers: { 'User-Agent': 'TheWayVerification/1.0' } });
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
        verification_status: 'pending', is_public: true,
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
      system: ANON_SYSTEM,
      messages,
    });
    req.on('close', () => stream.controller?.abort?.());
    stream.on('text', (delta) => send('text', { delta }));
    stream.on('error', (err) => { console.error('[kinwove] anon stream error:', err); send('error', { message: 'stream error' }); });

    const final = await stream.finalMessage();
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
        user_metadata: { display_name: 'The Way', is_system: true },
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

app.post('/api/welcome-dm', requireAuth, async (req, res) => {
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

function digestEmailHtml({ churchName, topPosts, prayers, sermon, unsubUrl }) {
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
        <a href="https://www.kinwove.com" style="display:inline-block;background:${ink};color:#FDF8F0;text-decoration:none;border-radius:999px;padding:12px 26px;font-size:14px;font-weight:600">Read this week's devotional →</a>
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
          <a href="https://www.kinwove.com" style="color:#9C7B5E">Open kinwove</a>
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

    // 3. Fetch church members
    const membersRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?church_id=eq.${churchId}&select=id,display_name&limit=500`,
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

    // 7. Send one email per member (fire in parallel, cap concurrency)
    const from = process.env.RESEND_FROM || 'kinwove <hello@kinwove.com>';
    const subject = `New sermon: "${sermon.title}" — ${church.name}`;
    const html = digestEmailHtml({ churchName: church.name, topPosts, prayers, sermon });

    let sent = 0;
    const queue = members.filter((m) => emailMap[m.id]);
    // Send in batches of 10 to avoid rate limits
    for (let i = 0; i < queue.length; i += 10) {
      await Promise.all(queue.slice(i, i + 10).map(async (m) => {
        try {
          const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: [emailMap[m.id]], subject, html }),
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
    const msg = await anthropic.messages.create({
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

// ── Platform admin dashboard ──────────────────────────────────────────────────
// Single endpoint that returns everything the AdminPage needs.
// Calls the get_platform_stats() Supabase RPC for aggregate counts + trends,
// then fetches content/operations rows in parallel.
// SQL to run in Supabase to create get_platform_stats() — see MEMORY / README.
app.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const [platformStats, topicRows, topQuestions, recentShared, pendingApps, recentFeedback] = await Promise.all([
      adminRpc('get_platform_stats'),
      adminFetch('topic_counts', 'order=count.desc'),
      adminFetch('qa_cache', 'select=question_raw,hit_count&order=hit_count.desc&limit=15'),
      adminFetch('shared_conversations', 'select=id,title,created_at&order=created_at.desc&limit=15'),
      adminFetch('pastor_applications', 'select=id,full_name,church_name,denomination,city,country,reason,status,created_at&status=eq.pending&order=created_at.desc'),
      adminFetch('ai_feedback', 'select=message_text,created_at&order=created_at.desc&limit=30'),
    ]);

    res.json({
      stats: platformStats ?? {},
      topics: Array.isArray(topicRows) ? topicRows : [],
      topQuestions: Array.isArray(topQuestions) ? topQuestions : [],
      recentShared: Array.isArray(recentShared) ? recentShared : [],
      pendingApps: Array.isArray(pendingApps) ? pendingApps : [],
      recentFeedback: Array.isArray(recentFeedback) ? recentFeedback : [],
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
  <meta property="og:image" content="https://www.kinwove.com/og-image.png" />
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
        : 'https://www.kinwove.com/og-image.png';
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

  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[kinwove] api listening on http://localhost:${PORT}`);
});

