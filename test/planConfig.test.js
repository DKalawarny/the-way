import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_LIMITS, SERMON_PAID_LIMITS, churchHasAccess } from '../src/planConfig.js';

// These lock the billing bugs fixed on 2026-06-29 so they can't regress.

test('paid churches always have access — the day-35 lockout bug', () => {
  assert.equal(churchHasAccess('church_base', 0), true);
  assert.equal(churchHasAccess('church_pro', 0), true);
  assert.equal(churchHasAccess('active', 0), true);
});

test('trial has access only while days remain', () => {
  assert.equal(churchHasAccess('trial', 5), true);
  assert.equal(churchHasAccess('trial', 1), true);
  assert.equal(churchHasAccess('trial', 0), false);
});

test('expired / free / unknown plans have no access', () => {
  assert.equal(churchHasAccess('expired', 100), false);
  assert.equal(churchHasAccess('free', 100), false);
  assert.equal(churchHasAccess(undefined, 100), false);
  assert.equal(churchHasAccess(null, 100), false);
});

test('expired plan gates AI to zero — AI-only gating, not full lockout', () => {
  assert.equal(PLAN_LIMITS.expired.limit, 0);
  assert.equal(SERMON_PAID_LIMITS.expired, 0);
});

test('church plans keep their expected caps', () => {
  assert.equal(PLAN_LIMITS.church_base.limit, 250);
  assert.equal(PLAN_LIMITS.church_pro.limit, 600);
  assert.equal(PLAN_LIMITS.trial.limit, 100);
  assert.equal(SERMON_PAID_LIMITS.church_base, 250);
});
