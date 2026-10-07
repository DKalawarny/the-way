-- 🔴🔴 6 Oct 2026: ANY SIGNED-UP USER COULD SET THEIR OWN is_admin=true.
-- The profiles UPDATE policy is `auth.uid() = id` with no column limits, and
-- `authenticated` holds UPDATE on every column. Proven with a throwaway
-- account: is_admin, is_premium, is_verified and plan all took. is_admin gates
-- the platform admin endpoints (server reads profiles.is_admin via service
-- role), so this was a path to full platform admin for anyone who signed up.
--
-- Fix: a trigger that refuses changes to the authority columns from the
-- browser roles (authenticated / anon). The service role connects as
-- `service_role`, not these, so the Stripe/gift/admin server writes are
-- unaffected. On INSERT, force the authority columns to safe values for
-- browser roles so a new profile cannot be created pre-elevated.
-- church_id is NOT locked: the app legitimately writes it (join a church),
-- and guard_profile_church_join already guards re-joining a church you were
-- blocked from.

create or replace function public.profiles_lock_authority()
returns trigger language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    if TG_OP = 'INSERT' then
      -- a fresh profile may never arrive already elevated
      new.is_admin    := false;
      new.is_premium  := coalesce(new.is_premium, false);  -- default, not caller-chosen
      new.is_premium  := false;
      new.is_verified := false;
      new.is_pastor   := false;
      new.plan        := 'free';
    elsif TG_OP = 'UPDATE' then
      if new.is_admin    is distinct from old.is_admin
      or new.is_premium  is distinct from old.is_premium
      or new.is_verified is distinct from old.is_verified
      or new.is_pastor   is distinct from old.is_pastor
      or new.plan        is distinct from old.plan
      then
        raise exception 'These account fields cannot be changed from the app'
          using errcode = '42501';
      end if;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_lock_authority on public.profiles;
create trigger trg_profiles_lock_authority
  before insert or update on public.profiles
  for each row execute function public.profiles_lock_authority();
