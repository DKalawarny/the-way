// Pure, dependency-free source of truth for the plan/billing logic — the
// "money path." Importable by both the React hooks and the test suite (the
// hooks themselves pull in React + Supabase and can't be unit-tested directly).
//
// The bugs fixed on 2026-06-29 all lived here: paid churches must read as
// having access, and an expired trial must gate AI to 0 (not wall the whole
// dashboard). The tests in test/planConfig.test.js lock these invariants.

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
