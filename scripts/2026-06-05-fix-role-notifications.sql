-- ============================================================================
-- 2026-06-05 — Fix role notifications + add accept/decline RPCs
-- ----------------------------------------------------------------------------
-- Fixes:
--   1. notify_role_granted() used wrong column names (metadata→data,
--      user_id→recipient_id, type→kind). Also adds actor_id + church_name
--      to data so the notification displays the pastor name and role correctly.
--   2. Adds notify_role_invited() trigger so an in-app notification fires
--      when a pastor creates a pending invite (before the member accepts).
--   3. Adds accept_role_invite() + decline_role_invite() RPCs — NotificationsBell
--      calls these but they were never created, so Accept was silently failing.
-- ============================================================================

-- ── 1. Fix notify_role_granted ────────────────────────────────────────────────
create or replace function public.notify_role_granted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church_name text;
  v_role_label  text;
begin
  -- Skip owner rows and self-assignments
  if NEW.is_owner = true then return NEW; end if;
  if NEW.granted_by is not null and NEW.granted_by = NEW.user_id then return NEW; end if;

  select name into v_church_name from public.churches where id = NEW.church_id;

  v_role_label := coalesce(
    NEW.role_label,
    case NEW.role_key
      when 'care'    then 'Care team'
      when 'elder'   then 'Elder'
      when 'staff'   then 'Staff'
      when 'worship' then 'Worship team'
      when 'youth'   then 'Youth team'
      when 'owner'   then 'Leadership'
      else initcap(replace(NEW.role_key, '_', ' '))
    end
  );

  insert into public.notifications (
    recipient_id, actor_id, kind,
    target_type, target_id, data
  ) values (
    NEW.user_id,
    NEW.granted_by,          -- pastor who granted the role
    'role_assigned',
    'church',
    NEW.church_id,
    jsonb_build_object(
      'church_id',   NEW.church_id,
      'church_name', coalesce(v_church_name, 'your church'),
      'role_key',    NEW.role_key,
      'role_label',  v_role_label
    )
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_role_granted on public.church_roles;
create trigger trg_notify_role_granted
  after insert on public.church_roles
  for each row execute function public.notify_role_granted();


-- ── 2. Add notify_role_invited (fires when a pending invite is created) ───────
create or replace function public.notify_role_invited()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_church_name text;
  v_role_label  text;
begin
  -- Only fire on fresh pending inserts
  if NEW.status <> 'pending' then return NEW; end if;

  select name into v_church_name from public.churches where id = NEW.church_id;

  v_role_label := coalesce(
    NEW.role_label,
    case NEW.role_key
      when 'care'    then 'Care team'
      when 'elder'   then 'Elder'
      when 'staff'   then 'Staff'
      when 'worship' then 'Worship team'
      when 'youth'   then 'Youth team'
      else initcap(replace(NEW.role_key, '_', ' '))
    end
  );

  insert into public.notifications (
    recipient_id, actor_id, kind,
    target_type, target_id, data
  ) values (
    NEW.user_id,
    NEW.invited_by,          -- pastor who sent the invite
    'role_invited',
    'role_invite',
    NEW.id,                  -- target_id = invite id (for Accept/Decline)
    jsonb_build_object(
      'church_id',   NEW.church_id,
      'church_name', coalesce(v_church_name, 'your church'),
      'role_key',    NEW.role_key,
      'role_label',  v_role_label
    )
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_role_invited on public.church_role_invites;
create trigger trg_notify_role_invited
  after insert on public.church_role_invites
  for each row execute function public.notify_role_invited();


-- ── 3. accept_role_invite + decline_role_invite RPCs ─────────────────────────
-- NotificationsBell calls these via supabase.rpc(). The trigger
-- apply_role_invite_on_accept fires automatically on the status update.

create or replace function public.accept_role_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.church_role_invites
     set status = 'accepted'
   where id      = p_invite_id
     and user_id = auth.uid()
     and status  = 'pending';

  if not found then
    raise exception 'Invite not found, already responded, or not yours.';
  end if;
end;
$$;

create or replace function public.decline_role_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.church_role_invites
     set status = 'declined'
   where id      = p_invite_id
     and user_id = auth.uid()
     and status  = 'pending';

  if not found then
    raise exception 'Invite not found, already responded, or not yours.';
  end if;
end;
$$;
