import { config as loadEnv } from 'dotenv';
loadEnv({ override: true });
import express from 'express';
import cors from 'cors';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.join(__dirname, 'cache.json');

const app = express();
const PORT = process.env.PORT || 3001;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('\n[the way] Missing ANTHROPIC_API_KEY. Copy .env.example to .env and add your key.\n');
  process.exit(1);
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

let cache = {};
try {
  const raw = await fs.readFile(CACHE_PATH, 'utf8');
  cache = JSON.parse(raw);
  console.log(`[the way] cache loaded — ${Object.keys(cache).length} entries`);
} catch {
  console.log('[the way] cache empty (no cache.json yet — will create on first save)');
}

let saveTimer = null;
function persistCacheSoon() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2));
    } catch (e) {
      console.error('[the way] cache write failed:', e?.message);
    }
  }, 500);
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[''""`]/g, '')
    .replace(/[^\w\s?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cacheKey(personType, question) {
  return `${personType}::${normalize(question)}`;
}

app.use(cors());
app.use(express.json({ limit: '256kb' }));

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
  console.error(`[the way] ${ctx} error:`, err);
  if (!res.headersSent) res.status(500).json({ error: 'something went wrong' });
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, cacheEntries: Object.keys(cache).length });
});

// Voice instructions — personality for each voice character
const VOICE_INSTRUCTIONS = {
  onyx: `You are James — a warm, deep, gravelly narrator with the energy and soul of Morgan Freeman.
You read with weight and wonder, like every word matters. Unhurried but alive.
Never flat or robotic. Let pauses breathe. Speak like you've lived what you're reading.`,
  shimmer: `You are Grace — a warm, clear, and gently energetic narrator.
You read like a trusted friend sharing something meaningful over coffee.
Present and alive, never monotone. Let the emotion in the words come through naturally.`,
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

  try {
    const oaiRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1-hd',
        input: cleaned,
        voice,
        response_format: 'mp3',
        speed: 1.0,            // we'll slow down client-side for pitch effect
      }),
    });

    if (!oaiRes.ok) {
      const err = await oaiRes.text();
      console.error('[the way] TTS error:', err);
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
    pump().catch((e) => { console.error('[the way] TTS pipe error:', e); res.end(); });
  } catch (e) {
    safeError(res, e, 'tts');
  }
});

// ── Bible proxy (keeps API key server-side, avoids CORS) ──────────────────────
app.get('/api/bible/:bibleId/chapters/:chapterId', requireAuth, limitAuthed({ capacity: 60, refillPerSec: 60 / 60 }), async (req, res) => {
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
      console.error('[the way] bible chapter upstream', upstream.status);
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: 'bible upstream error' });
    }
    const json = await upstream.json();
    res.json(json);
  } catch (e) {
    safeError(res, e, 'bible chapter');
  }
});

// ── Bible verse proxy (for version comparison) ───────────────────────────────
app.get('/api/bible/:bibleId/verses/:verseId', requireAuth, limitAuthed({ capacity: 60, refillPerSec: 60 / 60 }), async (req, res) => {
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
      console.error('[the way] bible verse upstream', upstream.status);
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
  if (system.length > 12000) return res.status(413).json({ error: 'system too long' });
  if (messages.some((m) => typeof m?.content !== 'string' || m.content.length > 8000)) {
    return res.status(413).json({ error: 'message too long' });
  }
  if (seekingContext && (typeof seekingContext !== 'string' || seekingContext.length > 4000)) {
    return res.status(413).json({ error: 'seekingContext too long' });
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

  // Cache only the first turn of a conversation, where there's a single user message.
  const isFirstTurn = messages.length === 1 && messages[0].role === 'user';
  const firstQuestion = isFirstTurn ? messages[0].content : null;
  const key = isFirstTurn && personType ? cacheKey(personType, firstQuestion) : null;

  if (key && cache[key]) {
    const cached = cache[key];
    send('cache_hit', { key });
    // Stream the cached answer in small chunks so the UI feels natural.
    for (let i = 0; i < cached.length; i += 24) {
      send('text', { delta: cached.slice(i, i + 24) });
      await new Promise((r) => setTimeout(r, 12));
    }
    send('done', { stop_reason: 'end_turn', cached: true });
    return res.end();
  }

  try {
    // Route to smarter model for complex person types or deep conversations
    const isDeep = ['deeper', 'skeptic'].includes(personType);
    const isLongConversation = messages.length > 10;
    const model = (isDeep || isLongConversation) ? 'claude-sonnet-4-6' : 'claude-haiku-4-5';

    const trimmed = messages.slice(-8);
    const effectiveSystem = seekingContext
      ? system + `\n\n── WHAT THIS PERSON SHARED ABOUT THEMSELVES ──\n${seekingContext}\n\nUse this to meet them exactly where they are. Don't reference these answers directly unless they bring them up — just let them inform how you respond.`
      : system;

    const stream = client.messages.stream({
      model,
      max_tokens: 2048,
      system: effectiveSystem,
      messages: trimmed,
    });
    req.on('close', () => stream.controller?.abort?.());

    stream.on('text', (delta) => send('text', { delta }));
    stream.on('error', (err) => {
      console.error('[the way] stream error:', err);
      send('error', { message: 'stream error' });
    });

    const final = await stream.finalMessage();
    const fullText = final.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    if (key && fullText.length > 0) {
      cache[key] = fullText;
      persistCacheSoon();
    }

    send('done', { stop_reason: final.stop_reason, usage: final.usage });
    res.end();
  } catch (err) {
    console.error('[the way] api error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'something went wrong' });
    } else {
      send('error', { message: 'something went wrong' });
      res.end();
    }
  }
});

// ── Sermon → Week Engine: pastor pastes outline, AI drafts the week ─────────
const SERMON_SYSTEM = `You help a pastor turn one Sunday sermon into a week of daily content for their congregation. Stay grounded in the pastor's outline; don't invent doctrine they didn't preach. Tone: warm, plainspoken, never preachy. Works for both lifelong Christians and people just curious about faith.

Output ONLY valid JSON. Schema:
{
  "items": [
    { "kind": "daily_verse",    "day": 1, "scripture": "Romans 8:28", "body": "Short reflection paragraph (3–5 sentences)." },
    ... days 1 through 7 ...
    { "kind": "group_question", "body": "An open question for small groups." },
    ... 3 group questions ...
    { "kind": "going_deeper",   "body": "A 1–2 paragraph deeper reflection for individual study." },
    { "kind": "kid_version",    "body": "A 3–5 sentence version a parent could read with a 6–10 year old." }
  ]
}

No prose outside the JSON. No markdown fences. Begin output with { and end with }.`;

app.post('/api/sermon/generate', requireAuth, limitAuthed({ capacity: 4, refillPerSec: 4 / 300 }), async (req, res) => {
  const { title, scripture_ref, summary } = req.body ?? {};
  if (!summary || typeof summary !== 'string' || !summary.trim()) {
    return res.status(400).json({ error: 'summary required' });
  }
  if (summary.length > 16000) return res.status(413).json({ error: 'summary too long' });
  if (title && (typeof title !== 'string' || title.length > 300)) return res.status(413).json({ error: 'title too long' });
  if (scripture_ref && (typeof scripture_ref !== 'string' || scripture_ref.length > 200)) return res.status(413).json({ error: 'scripture_ref too long' });
  try {
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      system: SERMON_SYSTEM,
      messages: [{
        role: 'user',
        content: `Title: ${title || '(untitled)'}\nScripture: ${scripture_ref || '(not specified)'}\n\nOutline / notes:\n${summary}`,
      }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    // Strip any accidental code fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```$/i, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('[the way] sermon JSON parse failed:', cleaned.slice(0, 300));
      return res.status(500).json({ error: 'Could not parse generated content. Try again.' });
    }
    res.json({ content: parsed.items ?? [] });
  } catch (err) {
    safeError(res, err, 'sermon/generate');
  }
});

// ── Anonymous Welcome: public AI chat, no auth, theme-classified ────────────
const ANON_SYSTEM = `You are The Way — a thoughtful, kind, honest companion for someone exploring big questions about life, meaning, and faith. The person you're talking to is anonymous and may be a believer, a skeptic, or just curious. Don't assume. Don't preach. Don't pressure.

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
      console.error('[the way] anon church verify failed:', e?.message);
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
    stream.on('error', (err) => { console.error('[the way] anon stream error:', err); send('error', { message: 'stream error' }); });

    const final = await stream.finalMessage();
    const fullText = final.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    // Fire-and-forget: classify + store. Only attribute to a church we
    // verified against the DB above; otherwise stash with church_id=null.
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
          console.error('[the way] anon/ask store failed:', e?.message);
        }
      });
    }

    send('done', { stop_reason: final.stop_reason });
    res.end();
  } catch (err) {
    console.error('[the way] anon/ask error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'something went wrong' });
    } else {
      send('error', { message: 'something went wrong' });
      res.end();
    }
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
    console.error('[the way] supabase fetch error:', e?.message);
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

  // /share/:id — pre-render OG meta + body content for crawlers
  app.get('/share/:id', async (req, res, next) => {
    try {
      const row = await fetchSharedConversation(req.params.id);
      if (!row) return next();

      const messages = Array.isArray(row.messages) ? row.messages : [];
      const firstUser = messages.find((m) => m.role === 'user')?.content ?? '';
      const firstAssistant = messages.find((m) => m.role === 'assistant')?.content ?? '';
      const rawTitle = (row.title || firstUser || 'A conversation about faith, doubt, and the Bible').trim();
      const title = rawTitle.length > 70 ? rawTitle.slice(0, 67) + '…' : rawTitle;
      const descSource = firstAssistant || firstUser || rawTitle;
      const description = descSource.replace(/\s+/g, ' ').slice(0, 200);
      const url = `${req.protocol}://${req.get('host')}/share/${req.params.id}`;

      const template = await getIndexTemplate();

      const bodyContent = `
    <div data-prerender hidden aria-hidden="true">
      <article>
        <h1>${escapeHtml(rawTitle)}</h1>
        ${messages.map((m) => `<section><h2>${m.role === 'user' ? 'Question' : 'Answer'}</h2><p>${escapeHtml(m.content)}</p></section>`).join('')}
        <p><a href="/">Ask your own question on The Way</a></p>
      </article>
    </div>`;

      const tEsc = escapeHtml(title);
      const dEsc = escapeHtml(description);
      const uEsc = escapeHtml(url);

      const html = template
        .replace(/<title>[^<]*<\/title>/, `<title>${tEsc} — The Way</title>`)
        .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${dEsc}" />`)
        .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${tEsc}" />`)
        .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${dEsc}" />`)
        .replace(/<meta property="og:type"[^>]*>/, `<meta property="og:type" content="article" />\n    <meta property="og:url" content="${uEsc}" />`)
        .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${tEsc}" />`)
        .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${dEsc}" />`)
        .replace('</body>', `${bodyContent}\n  </body>`);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      res.send(html);
    } catch (e) {
      console.error('[the way] /share/:id error:', e?.message);
      next();
    }
  });

  // /sitemap.xml — lists every shared conversation as an indexable URL
  app.get('/sitemap.xml', async (req, res) => {
    const host = `${req.protocol}://${req.get('host')}`;
    const entries = [
      `<url><loc>${escapeXml(host)}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ];

    if (SUPABASE_URL && SUPABASE_ANON) {
      try {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/shared_conversations?select=id,created_at&order=created_at.desc&limit=10000`,
          { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
        );
        if (r.ok) {
          const rows = await r.json();
          for (const row of rows) {
            const lastmod = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString();
            entries.push(`<url><loc>${escapeXml(host)}/share/${escapeXml(row.id)}</loc><lastmod>${lastmod}</lastmod></url>`);
          }
        }
      } catch (e) {
        console.error('[the way] /sitemap.xml error:', e?.message);
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

  // /robots.txt — points crawlers at the sitemap
  app.get('/robots.txt', (req, res) => {
    const host = `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(`User-agent: *\nAllow: /\nSitemap: ${host}/sitemap.xml\n`);
  });

  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[the way] api listening on http://localhost:${PORT}`);
});
