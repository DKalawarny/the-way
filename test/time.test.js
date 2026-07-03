import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relativeTime, exactTime } from '../src/time.js';

test('relativeTime buckets recent times', () => {
  const now = Date.now();
  assert.equal(relativeTime(new Date(now - 30_000).toISOString()), 'just now');
  assert.equal(relativeTime(new Date(now - 5 * 60_000).toISOString()), '5m');
  assert.equal(relativeTime(new Date(now - 3 * 3_600_000).toISOString()), '3h');
  assert.equal(relativeTime(new Date(now - 2 * 86_400_000).toISOString()), '2d');
});

test('relativeTime is empty for bad input', () => {
  assert.equal(relativeTime(''), '');
  assert.equal(relativeTime('not-a-date'), '');
});

test('exactTime returns a full string for valid input, empty otherwise', () => {
  assert.ok(exactTime(new Date().toISOString()).length > 0);
  assert.equal(exactTime(''), '');
  assert.equal(exactTime('not-a-date'), '');
});
