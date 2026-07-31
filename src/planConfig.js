// Pure, dependency-free source of truth for the plan/billing logic — the
// "money path." Importable by both the React hooks and the test suite (the
// hooks themselves pull in React + Supabase and can't be unit-tested directly).
//
// The bugs fixed on 2026-06-29 all lived here: paid churches must read as
// having access, and an expired trial must gate AI to 0 (not wall the whole
// dashboard). The tests in test/planConfig.test.js lock these invariants.

// Church trial length. Lives here (not usePlan.js) so the server can import
// it — server.js resolves pastors to their church plan for AI quotas.
export const TRIAL_DAYS = 35;

// Monthly AI question caps by plan (church chat / Bible AI).
// 'expired' = trial ended + unpaid → AI off, rest of dashboard still usable.
export const PLAN_LIMITS = {
  free:              { period: 'weekly',        limit: 5   },  // 5 free questions/week
  trial:             { period: 'church-trial',  limit: 100 },  // church 5-week trial taste
  premium:           { period: 'monthly',       limit: 200 },  // Individual
  premium_plus:      { period: 'monthly',       limit: 270 },  // Individual Pro
  church_base:       { period: 'monthly',       limit: 250 },  // Church Base
  church_pro:        { period: 'monthly',       limit: 600 },  // Church Pro
  expired:           { period: 'monthly',       limit: 0   },  // gated
};

// Monthly AI sermon-generation caps.
export const SERMON_PAID_LIMITS = {
  church_base: 250,
  church_pro:  250,
  active:      250, // legacy 'active' rows
  expired:     0,   // gated
};

// Does a church plan currently grant full (paid or in-trial) access?
// Paid church plans always count; trial only while days remain.
export function churchHasAccess(plan, daysLeft) {
  return plan === 'active'
    || plan === 'church_base'
    || plan === 'church_pro'
    || (plan === 'trial' && daysLeft > 0);
}

// ── Church member seats ──────────────────────────────────────────────────────
// Each church plan includes a member count. Growth beyond it is covered by seat
// blocks — a gentle nudge to the pastor, never a wall in a member's face. Pricing
// scales with size because every member can use the AI, which carries a real cost.
export const CHURCH_MEMBER_LIMITS = {
  church_base: 150,
  church_pro:  400,
  trial:       150,  // trial tastes the Base tier
  active:      400,  // legacy paid rows
};
export const SEAT_BLOCK_SIZE  = 100;  // members per add-on block
export const SEAT_BLOCK_PRICE = 29;   // CAD/mo per block

// Members included in a plan (plus any seat blocks already purchased). 0 = no seats.
export function includedMembers(plan, seatBlocks = 0) {
  const base = CHURCH_MEMBER_LIMITS[plan] ?? 0;
  return base ? base + seatBlocks * SEAT_BLOCK_SIZE : 0;
}

// How many seat blocks the church must add to cover its current size (0 = fine).
export function seatBlocksNeeded(memberCount, plan, seatBlocks = 0) {
  const included = includedMembers(plan, seatBlocks);
  if (!included || memberCount <= included) return 0;
  return Math.ceil((memberCount - included) / SEAT_BLOCK_SIZE);
}
