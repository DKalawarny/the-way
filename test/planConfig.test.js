import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_LIMITS, SERMON_PAID_LIMITS, churchHasAccess, effectivePersonalPlan } from '../src/planConfig.js';

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

// ── Granted plans lapse, bought plans don't (2026-08-19) ─────────────────────
// Promo/gift grants set gift_expires_at and nothing ever read it, so every grant
// was permanent — free forever for beta users, and lost revenue on gift
// subscriptions once those are sold.
const PAST   = new Date(Date.now() - 86400000).toISOString();
const FUTURE = new Date(Date.now() + 86400000).toISOString();

test('a lapsed grant falls back to free', () => {
  assert.equal(effectivePersonalPlan({ plan: 'premium', gift_expires_at: PAST }), 'free');
});

test('a grant still inside its window keeps the plan', () => {
  assert.equal(effectivePersonalPlan({ plan: 'premium', gift_expires_at: FUTURE }), 'premium');
});

test('a paying subscriber is NEVER downgraded by a stale expiry date', () => {
  // The one case that must not regress: their access ends via the Stripe
  // webhook when they cancel, not because an old grant date went by.
  assert.equal(
    effectivePersonalPlan({ plan: 'premium', gift_expires_at: PAST, stripe_subscription_id: 'sub_123' }),
    'premium',
  );
});

test('a granted plan with no end date is left alone', () => {
  assert.equal(effectivePersonalPlan({ plan: 'premium_plus', gift_expires_at: null }), 'premium_plus');
});

test('free stays free, and a missing profile does not throw', () => {
  assert.equal(effectivePersonalPlan({ plan: 'free', gift_expires_at: PAST }), 'free');
  assert.equal(effectivePersonalPlan(null), 'free');
  assert.equal(effectivePersonalPlan({}), 'free');
});

test('a lapsed grant drops to the free weekly cap, not the premium monthly one', () => {
  const plan = effectivePersonalPlan({ plan: 'premium', gift_expires_at: PAST });
  assert.equal(PLAN_LIMITS[plan].limit, 5);
  assert.equal(PLAN_LIMITS[plan].period, 'weekly');
});
