// Boot smoke test — catches crash-on-start regressions (like the 7/9 TDZ bug)
// before they ship. Starts server.js with no external services configured and
// verifies it binds and answers /api/health. Anything that throws at module
// load (bad import, use-before-declaration, syntax slip) fails this test.
import { test } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';

test('server boots and answers /api/health', async () => {
  const PORT = 8971;
  const child = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      SUPABASE_URL: '',
      VITE_SUPABASE_URL: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      VAPID_PUBLIC_KEY: '',
      VAPID_PRIVATE_KEY: '',
      NODE_ENV: 'test',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d; });

  try {
    // Poll for readiness for up to 8s.
    let ok = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 200));
      if (child.exitCode !== null) break; // crashed — fail below with stderr
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/api/health`);
        if (res.ok) { ok = true; break; }
      } catch { /* not up yet */ }
    }
    assert.ok(
      ok,
      `server did not become healthy. exitCode=${child.exitCode}\n${stderr.slice(0, 1500)}`
    );
  } finally {
    child.kill('SIGKILL');
  }
});
