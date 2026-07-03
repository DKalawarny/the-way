import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAILY_VERSES, getDailyVerse } from '../src/dailyVerse.js';

test('verse pool is large enough to drift year to year (>365)', () => {
  assert.ok(DAILY_VERSES.length >= 400, `expected >=400 verses, got ${DAILY_VERSES.length}`);
});

test('no duplicate references', () => {
  const refs = DAILY_VERSES.map((v) => v.ref);
  const dupes = refs.filter((r, i) => refs.indexOf(r) !== i);
  assert.equal(dupes.length, 0, `duplicate refs: ${[...new Set(dupes)].join(', ')}`);
});

test('every verse has non-empty text and ref', () => {
  for (const v of DAILY_VERSES) {
    assert.ok(v.text && v.text.trim().length > 0, `empty text near ref ${v.ref}`);
    assert.ok(v.ref && v.ref.trim().length > 0, 'empty ref');
  }
});

test('getDailyVerse returns a valid verse', () => {
  const v = getDailyVerse();
  assert.ok(v && typeof v.text === 'string' && typeof v.ref === 'string');
});
