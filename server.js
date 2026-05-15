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
  console.error('\n[the way] Missing ANTHROPIC_API_KEY. Copy .env.example to .env and add your key.\n');
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
  res.json({ ok: true });
});

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
    console.error('[the way] qa_cache lookup failed:', e?.message);
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
    console.error('[the way] qa_cache bump failed:', e?.message);
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
    console.error('[the way] qa_cache write failed:', e?.message);
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
    console.error('[the way] qa_events insert failed:', e?.message);
  }
}

// Voice instructions — sent to gpt-4o-mini-tts which supports expressive narration
const VOICE_INSTRUCTIONS = {
  onyx: `Speak like Morgan Freeman narrating a documentary — deep, warm, unhurried, and gravelly. \
Every word carries weight. Let pauses breathe. Pace is slow and deliberate, never flat or robotic. \
Convey quiet wonder and earned wisdom. No cheerfulness, no announcer energy — just soul.`,
  shimmer: `Speak like a warm, clear, and grounded woman reading aloud to a close friend. \
Gentle but present — not soft to the point of sleepy. Pace is calm and measured. \
Convey sincerity and care. Never monotone, never performative. Just real.`,
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
        model: 'gpt-4o-mini-tts',  // supports instructions + far more natural than tts-1-hd
        input: cleaned,
        voice,
        instructions: VOICE_INSTRUCTIONS[voice] ?? undefined,
        response_format: 'mp3',
        speed: 0.95,               // just slightly slower — the model handles expressiveness
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
  if (system.length > 32000) return res.status(413).json({ error: 'system too long' });
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

  // Cache lookup is keyed on the latest user message + person type. We only
  // serve cached answers on first-turn (context-free) requests to avoid
  // returning stale follow-ups, but every ask is logged to qa_events so the
  // dataset grows with real usage.
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
  const isFirstTurn = messages.length === 1 && messages[0].role === 'user';

  if (isFirstTurn && personType) {
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
    if (plan === 'premium_plus') {
      // Pro tier: full range
      model = (isDeepTheology || isVeryLong)
        ? 'claude-opus-4-7'
        : (isDeep || isLongConversation)
          ? 'claude-sonnet-4-6'
          : 'claude-haiku-4-5-20251001';
    } else if (plan === 'premium') {
      // Individual tier: Haiku or Sonnet
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
      system,   // seekingContext already appended by getSystemPrompt() on the client
      messages: trimmed,
    });
    req.on('close', () => stream.controller?.abort?.());

    stream.on('text', (delta) => send('text', { delta }));
    stream.on('error', (err) => {
      console.error('[the way] stream error:', err);
      send('error', { message: err?.message || err?.error?.message || 'stream error' });
    });

    const final = await stream.finalMessage();
    const fullText = final.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    send('done', { stop_reason: final.stop_reason, usage: final.usage });
    res.end();

    // Persist cache + event after the response is on its way to the client.
    if (isFirstTurn && personType && fullText.length > 0) {
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

Each daily must:
  - Be 2–3 sentences of tight context or reflection that set up the question (concrete and specific — point at a real situation, person, or tension from the text, not a general principle), then one closing question on a new line.
  - The closing question must be rooted in a specific moment from the topic for that day, have no single obvious answer, and be answerable by both a first-month believer and a 20-year elder without one dominating.
  - Be one focused sentence per question — no sub-clauses, no "and also".
  - Day 1: lowest barrier — easy for anyone to respond to. Final day: the most challenging or theologically unsettling of the week.
  - Do NOT attach a scripture citation unless a verse genuinely adds a new lens. Do NOT repeat the main passage as the topic. Do NOT reuse the same topic on two different days.

GOING DEEPER — going_deeper (write exactly 1, two paragraphs)
This is for someone who wants to sit alone with the text.
  Paragraph 1: One piece of historical, cultural, or linguistic context from the original passage that most people in the congregation don't know — something that reframes how you read it.
  Paragraph 2: One honest, unsettling question the passage raises that the sermon may not have fully resolved. Don't resolve it here either — let it sit.

FOR KIDS — kid_version (write exactly 1)
A parent reads this aloud to a 6–10 year old. It must do TWO things in this exact order, separated by a blank line:
  1) A 3–5 sentence kid-friendly retelling of what the sermon was about. Use a real-world analogy a child can picture (a person, a situation, a choice). No abstract theology, no "God is like a light in the darkness" metaphors. Plain words a kid actually uses.
  2) A blank line, then "Questions to talk about:" on its own line, then 2–3 numbered questions geared for that age range. Questions should be concrete and openable (e.g. "When was a time you wanted to share but didn't?" not "Why is sharing important?"). One short sentence each. No yes/no questions.

Output ONLY valid JSON. Schema:
{
  "items": [
    { "kind": "daily_verse",    "day": 1, "scripture": "Topic label (4–7 words)", "body": "2–3 sentence context + closing question." },
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
      `{ "items": [ { "kind": "daily_verse", "day": ${singleDay ?? 1}, "scripture": "Topic label (4–7 words)", "body": "2–3 sentence context + closing question." } ] }`,
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
      max_tokens: isSingle ? 700 : (targetKind ? 2000 : 5000),
      system: SERMON_SYSTEM,
      messages: [{ role: 'user', content: userContent }],
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
      // Most common failure: the model slipped a raw newline / tab inside a
      // string value instead of \n / \t. Try a one-shot repair before giving
      // up — walk the text, escape control characters that appear inside
      // double-quoted runs only.
      try {
        let repaired = '';
        let inString = false;
        let prevBackslash = false;
        for (const ch of cleaned) {
          if (inString) {
            if (ch === '\\' && !prevBackslash) {
              repaired += ch;
              prevBackslash = true;
              continue;
            }
            if (ch === '"' && !prevBackslash) {
              inString = false;
              repaired += ch;
            } else if (ch === '\n') repaired += '\\n';
            else if (ch === '\r') repaired += '\\r';
            else if (ch === '\t') repaired += '\\t';
            else repaired += ch;
            prevBackslash = false;
          } else {
            if (ch === '"') inString = true;
            repaired += ch;
            prevBackslash = false;
          }
        }
        parsed = JSON.parse(repaired);
        console.warn('[the way] sermon JSON repaired (escaped raw control chars).');
      } catch (e2) {
        console.error('[the way] sermon JSON parse failed:', cleaned.slice(0, 500));
        return res.status(500).json({ error: 'Could not parse generated content. Try again.' });
      }
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
    console.error('[the way] sermon/generate error:', err);
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
        console.error('[the way] dev become-pastor church insert failed', insert.status, body);
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
    console.error('[the way] send-code error:', err.message);
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
      fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}`, { method: 'PATCH', headers: h, body: JSON.stringify({ church_id: churchId }) }),
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
        verification_status: 'pending', is_public: false,
      }),
    });
    if (!churchRes.ok) throw new Error(`church insert ${churchRes.status}`);
    const created = await churchRes.json();
    const churchId = Array.isArray(created) ? created[0]?.id : created?.id;
    await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/pastor_applications?id=eq.${application_id}`, { method: 'PATCH', headers: h, body: JSON.stringify({ status: 'approved', verify_method: 'unverified', reviewed_at: new Date().toISOString() }) }),
      fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${req.userId}`, { method: 'PATCH', headers: h, body: JSON.stringify({ church_id: churchId }) }),
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
app.delete('/api/account', requireAuth, limitAuthed({ capacity: 3, refillPerSec: 3 / 3600 }), async (req, res) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(503).json({ error: 'account deletion not configured' });
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${req.userId}`, {
      method: 'DELETE',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error('[the way] account delete failed', r.status, body);
      return res.status(500).json({ error: 'delete failed' });
    }
    // Drop the cached token so a stolen JWT cannot keep authenticating after delete.
    for (const [tok, v] of tokenCache) if (v.userId === req.userId) tokenCache.delete(tok);
    res.status(204).end();
  } catch (err) {
    safeError(res, err, 'account-delete');
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
    console.error('[the way] ai-feedback insert error:', e?.message);
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
    console.error('[the way] system profile upsert error:', e?.message);
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
        console.log(`[the way] system account found: ${_systemAccountId}`);
        return _systemAccountId;
      }
    }
  } catch (e) {
    console.error('[the way] system account lookup error:', e?.message);
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
      console.log(`[the way] system account created: ${_systemAccountId}`);
      return _systemAccountId;
    }
    console.error('[the way] system account create failed:', JSON.stringify(data));
  } catch (e) {
    console.error('[the way] system account create error:', e?.message);
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
      console.error('[the way] welcome DM conv create failed:', err);
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
        <p><a href="/">Ask your own question on kinwove</a></p>
      </article>
    </div>`;

      const tEsc = escapeHtml(title);
      const dEsc = escapeHtml(description);
      const uEsc = escapeHtml(url);

      const html = template
        .replace(/<title>[^<]*<\/title>/, `<title>${tEsc} — kinwove</title>`)
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
