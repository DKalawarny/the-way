-- ============================================================================
-- 2026-05-27 — Notify user when they are granted a church role
-- ----------------------------------------------------------------------------
-- When a pastor inserts a row into church_roles, fire a notification to the
-- recipient so they know they have a new role and a place to go.
--
-- Skips:
--   - Owner rows (pastor setting up their own church — no need to ping yourself)
--   - Self-assignments (granted_by = user_id)
-- ============================================================================

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

  -- Resolve church name
  select name into v_church_name from public.churches where id = NEW.church_id;

  -- Resolve a human-readable role label
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
    user_id, type, title, body,
    target_type, target_id, metadata
  ) values (
    NEW.user_id,
    'role_assigned',
    'You''ve been given a role 🎖',
    'You''re now part of the ' || v_role_label
      || ' at ' || coalesce(v_church_name, 'your church') || '.',
    'church',
    NEW.church_id,
    jsonb_build_object(
      'church_id', NEW.church_id,
      'role_key',  NEW.role_key
    )
  );

  return NEW;
end;
$$;

-- Drop old trigger if it exists from a previous attempt
drop trigger if exists trg_notify_role_granted on public.church_roles;

create trigger trg_notify_role_granted
  after insert on public.church_roles
  for each row execute function public.notify_role_granted();
