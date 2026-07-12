import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

// ── Plan configuration ────────────────────────────────────────────────────────
// Single source of truth lives in planConfig.js (pure + unit-tested).
import { PLAN_LIMITS } from './planConfig.js';
export { PLAN_LIMITS };

// Must match TOPUP_MESSAGES in supabase/functions/stripe-webhook (what the
// webhook actually grants) — costing OK'd at 150/$6.99 on 2026-07-11.
export const TOPUP_MESSAGES = 150;
export const TOPUP_PRICE    = '$6.99 CAD';

function currentPeriod(type) {
  if (type === 'lifetime') return 'lifetime';
  const d = new Date();
  if (type === 'weekly') {
    // Monday-anchored ISO week key: W-YYYY-MM-DD of that Monday
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return `W${mon.getFullYear()}${String(mon.getMonth() + 1).padStart(2, '0')}${String(mon.getDate()).padStart(2, '0')}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function useAiUsage(userId, plan = 'free') {
  const [row,     setRow]     = useState(null);   // { count, topup }
  const [loading, setLoading] = useState(true);

  const cfg    = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
  const period = currentPeriod(cfg.period);

  const load = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    const { data } = await supabase
      .from('ai_usage')
      .select('count, topup')
      .eq('user_id', userId)
      .eq('period', period)
      .maybeSingle();
    setRow({ count: data?.count ?? 0, topup: data?.topup ?? 0 });
    setLoading(false);
  }, [userId, period]);

  useEffect(() => { load(); }, [load]);

  const used      = row?.count  ?? 0;
  const topup     = row?.topup  ?? 0;
  const limit     = cfg.limit;
  const remaining = Math.max(0, limit + topup - used);
  const atLimit   = !loading && row !== null && remaining <= 0;

  // Optimistic local bump only. The SERVER now owns the write (server.js
  // incrementAiUsage on every successful /api/chat answer) so limits can't be
  // bypassed by a forged client — writing here too would double-count.
  function increment() {
    if (!userId) return;
    setRow((r) => r ? { ...r, count: r.count + 1 } : r);
  }

  // Called after a successful Stripe top-up (Stripe webhook updates DB;
  // this refreshes local state so UI unlocks immediately)
  async function refreshAfterTopup() {
    await load();
  }

  return {
    loading,
    plan,
    used,
    topup,
    limit,
    remaining,
    atLimit,
    increment,
    refreshAfterTopup,
  };
}
