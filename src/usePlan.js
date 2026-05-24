import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';

export const TRIAL_DAYS               = 35;
export const CHURCH_BASE_PRICE        = '$41.99 CAD/mo';
export const CHURCH_PRO_PRICE         = '$82.99 CAD/mo';
export const PRO_PRICE                = CHURCH_BASE_PRICE; // kept for legacy imports
export const UPGRADE_EMAIL            = 'hello@kinwove.app'; // swap for Stripe link when ready
export const CHURCH_BASE_MEMBER_LIMIT = 150;

export function usePlan(churchId) {
  const [rawData, setRawData] = useState(null);
  const [loading, setLoading]  = useState(true);

  useEffect(() => {
    if (!churchId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('churches')
        .select('plan, trial_started_at')
        .eq('id', churchId)
        .maybeSingle();

      if (cancelled) return;

      // If columns don't exist yet (migration not run), fail open so nothing breaks
      if (error) {
        setRawData({ plan: 'active', trialStartedAt: null });
        setLoading(false);
        return;
      }

      let plan          = data?.plan            ?? 'free';
      let trialStartedAt = data?.trial_started_at ?? null;

      // Auto-start 30-day trial on first access
      if (!trialStartedAt && plan !== 'active') {
        const now = new Date().toISOString();
        const { error: upErr } = await supabase
          .from('churches')
          .update({ trial_started_at: now, plan: 'trial' })
          .eq('id', churchId);
        if (!upErr && !cancelled) {
          trialStartedAt = now;
          plan = 'trial';
        }
      }

      if (!cancelled) {
        setRawData({ plan, trialStartedAt });
        setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [churchId]);

  if (loading || !rawData) {
    return { loading: true, hasAccess: true, daysLeft: TRIAL_DAYS, trialExpired: false, plan: null };
  }

  const { plan, trialStartedAt } = rawData;
  const now      = Date.now();
  const MS_DAY   = 24 * 60 * 60 * 1000;
  const trialEnd = trialStartedAt
    ? new Date(trialStartedAt).getTime() + TRIAL_DAYS * MS_DAY
    : null;
  const daysLeft     = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / MS_DAY)) : 0;
  const trialExpired = plan === 'trial' && daysLeft === 0;
  const hasAccess    = plan === 'active' || (plan === 'trial' && daysLeft > 0);

  return { loading: false, plan, hasAccess, daysLeft, trialExpired, trialStartedAt };
}

// Read-only — never auto-starts a trial. Safe to call for any church member.
// Returns the church's current plan string, or null while loading.
export function useChurchPlanReadOnly(churchId) {
  const [plan, setPlan] = useState(null);
  useEffect(() => {
    if (!churchId) return;
    supabase.from('churches').select('plan').eq('id', churchId).maybeSingle()
      .then(({ data }) => setPlan(data?.plan ?? 'free'));
  }, [churchId]);
  return plan;
}
