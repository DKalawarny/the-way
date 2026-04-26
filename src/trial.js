const TRIAL_DAYS = 7;

export function trialStatus(profile) {
  if (!profile?.created_at) return { active: false, daysLeft: 0, expired: false };
  const start = new Date(profile.created_at);
  const now = new Date();
  const msLeft = start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000 - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  return {
    active: daysLeft > 0,
    daysLeft,
    expired: daysLeft === 0 && !!profile.created_at,
  };
}
