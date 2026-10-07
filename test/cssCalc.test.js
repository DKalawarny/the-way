// A calc() with a comma at its top level is invalid CSS, so the browser drops
// the whole declaration without a word. The "no dashes" pass of 7 Oct 2026
// turned every `calc(a - b)` into `calc(a, b)` and the Ask panel lost its
// height (the input fell off the bottom of the window). Commas inside env()
// or var() are fine; only depth-1 commas are caught.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : /\.(jsx?|css)$/.test(e.name) ? [p] : [];
  });
}

export function badCalcs(src) {
  const bad = [];
  let i = 0;
  while ((i = src.indexOf('calc(', i)) >= 0) {
    let k = i + 5, depth = 1;
    while (k < src.length && depth > 0) {
      const c = src[k];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ',' && depth === 1) { bad.push(src.slice(i, src.indexOf(')', k) + 1)); break; }
      k++;
    }
    i = k;
  }
  return bad;
}

test('the detector catches the broken form and passes the valid forms', () => {
  assert.equal(badCalcs("'calc(100vh, 62px)'").length, 1);
  assert.equal(badCalcs('`calc(${h}px, env(safe-area-inset-top, 0px))`').length, 1);
  assert.equal(badCalcs("'calc(100vh - 62px - env(safe-area-inset-top, 0px))'").length, 0);
  assert.equal(badCalcs("'calc(100vh - var(--global-header-h, 0px))'").length, 0);
  assert.equal(badCalcs("'min(calc(100vw - 32px), 420px)'").length, 0);
});

test('no calc() in src has a top-level comma', () => {
  const hits = walk('src').flatMap(f => badCalcs(fs.readFileSync(f, 'utf8')).map(b => `${f}: ${b}`));
  assert.deepEqual(hits, []);
});
