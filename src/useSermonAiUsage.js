import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

export const FREE_SERMON_LIMIT = 3;
const PERIOD = 'sermon-lifetime';

// Tracks how many times a user has triggered AI sermon generation.
// Free users get FREE_SERMON_LIMIT lifetime generations; paid users are unlimited.
export function useSermonAiUsage(userId, plan = 'free') {
  const [used, setUsed] = useState(null); // null = still loading

  const isFree = !plan || plan === 'free';

  const load = useCallback(async () => {
    if (!userId) { setUsed(0); return; }
    const { data } = await supabase
      .from('ai_usage')
      .select('count')
      .eq('user_id', userId)
      .eq('period', PERIOD)
      .maybeSingle();
    setUsed(data?.count ?? 0);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const loading   = used === null;
  const atLimit   = !loading && isFree && used >= FREE_SERMON_LIMIT;
  const remaining = isFree ? Math.max(0, FREE_SERMON_LIMIT - (used ?? 0)) : Infinity;

  async function increment() {
    if (!userId) return;
    await supabase.rpc('increment_ai_usage', {
      p_user_id: userId,
      p_period:  PERIOD,
    });
    setUsed((u) => (u ?? 0) + 1);
  }

  return { loading, used: used ?? 0, remaining, atLimit, isFree, increment };
}
