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
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, cacheEntries: Object.keys(cache).length });
});

app.post('/api/chat', async (req, res) => {
  const { system, messages, personType } = req.body ?? {};

  if (!system || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'system and messages are required' });
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
    const trimmed = messages.slice(-8);
    const stream = client.messages.stream({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system,
      messages: trimmed,
    });

    stream.on('text', (delta) => send('text', { delta }));
    stream.on('error', (err) => {
      console.error('[the way] stream error:', err);
      send('error', { message: err?.message ?? 'stream error' });
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
      res.status(500).json({ error: err?.message ?? 'unknown error' });
    } else {
      send('error', { message: err?.message ?? 'unknown error' });
      res.end();
    }
  }
});

// Serve frontend in production
if (process.env.NODE_ENV !== 'development') {
  const distPath = path.join(__dirname, 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[the way] api listening on http://localhost:${PORT}`);
});
