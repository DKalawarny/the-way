import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

// ── Plan configuration ────────────────────────────────────────────────────────
export const PLAN_LIMITS = {
  free:              { period: 'weekly',   limit: 5   },  // 5 free questions/week
  premium:           { period: 'monthly',  limit: 200 },  // Individual $6.99 CAD — Haiku+Sonnet
  premium_plus:      { period: 'monthly',  limit: 270 },  // Individual Pro $13.99 CAD — Haiku+Sonnet+Opus
  church_base:       { period: 'monthly',  limit: 0   },  // Church — no AI cap (pastor tools only)
  church_pro:        { period: 'monthly',  limit: 0   },  // Church Pro — no AI cap
};

export const TOPUP_MESSAGES = 150;
export const TOPUP_PRICE    = '$5';

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

  // Atomically increment — relies on the DB function below
  async function increment() {
    if (!userId) return;
    await supabase.rpc('increment_ai_usage', {
      p_user_id: userId,
      p_period:  period,
    });
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
