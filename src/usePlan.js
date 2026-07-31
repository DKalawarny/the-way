import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { churchHasAccess, TRIAL_DAYS } from './planConfig.js';
import { isNativeApp } from './native.js';

export { TRIAL_DAYS }; // moved to planConfig.js (server needs it); re-exported for PlanGate

// Payments go-live switch. Until Stripe is live, real users CANNOT pay —
// so expired trials must not lock anyone out, and walls must not sell.
// At Stripe go-live: set VITE_PAYMENTS_LIVE=true on Render and redeploy.
// Always off in the native app: Stripe can't round-trip back into the app
// shell, and App Store rules require IAP for digital subscriptions.
export const PAYMENTS_LIVE = import.meta.env.VITE_PAYMENTS_LIVE === 'true' && !isNativeApp;
export const CHURCH_BASE_PRICE        = '$79 CAD/mo';
export const CHURCH_PRO_PRICE         = '$149 CAD/mo';
export const PRO_PRICE                = CHURCH_BASE_PRICE; // kept for legacy imports
export const UPGRADE_EMAIL            = 'hello@kinwove.com'; // swap for Stripe link when ready
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
  let daysLeft     = trialEnd ? Math.max(0, Math.ceil((trialEnd - now) / MS_DAY)) : 0;
  let trialExpired = plan === 'trial' && daysLeft === 0;
  let hasAccess    = churchHasAccess(plan, daysLeft);

  // No payment path exists yet — an "expired" trial would be a dead end with
  // an Upgrade button nobody can complete. Keep church tools open (and the
  // countdown banners calm) until payments go live.
  if (!PAYMENTS_LIVE && plan === 'trial') {
    trialExpired = false;
    hasAccess    = true;
    daysLeft     = Math.max(daysLeft, 14);
  }

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
