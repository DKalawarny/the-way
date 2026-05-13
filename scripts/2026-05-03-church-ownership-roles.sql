-- ============================================================================
-- Church ownership via church_roles — 2026-05-03
--
-- Shifts the "who runs this church" signal from a personal profile flag
-- (profiles.is_pastor + churches.pastor_id) to a row in church_roles with
-- is_owner = true. The church is now an institution — ownership transfers by
-- flipping is_owner, no personal account branding required.
--
-- churches.pastor_id is kept as a DISPLAY convenience (the public page shows
-- "Led by [name]") but is no longer used for authorization decisions.
-- profiles.is_pastor is similarly kept but no longer written by this system —
-- it will be derived from church_roles on the client at load time.
--
-- RLS policies are updated to use church_roles for all write gates.
-- ============================================================================

begin;

-- 1. Add is_owner flag to church_roles
alter table public.church_roles
  add column if not exists is_owner boolean not null default false;

-- Ensure only one owner per church
create unique index if not exists church_roles_one_owner_per_church
  on public.church_roles (church_id)
  where is_owner = true;

-- 2. Backfill: for any church that has a pastor_id, create/update a church_roles
--    row for that person with is_owner = true so existing churches still work.
insert into public.church_roles (church_id, user_id, role_key, role_title, is_owner,
  can_post_sermons, can_post_announcements, can_moderate,
  can_view_prayers, can_manage_staff, can_edit_church)
select
  c.id          as church_id,
  c.pastor_id   as user_id,
  'owner'       as role_key,
  'Lead Pastor' as role_title,
  true          as is_owner,
  true, true, true, true, true, true
from public.churches c
where c.pastor_id is not null
on conflict (church_id, user_id, role_key) do update
  set is_owner             = true,
      can_post_sermons     = true,
      can_post_announcements = true,
      can_moderate         = true,
      can_view_prayers     = true,
      can_manage_staff     = true,
      can_edit_church      = true;

-- 3. Drop old RLS policies that gate on churches.pastor_id
--    (re-created below using church_roles)

drop policy if exists "Pastor manages roles in own church"  on public.church_roles;
drop policy if exists "Anyone in the church reads roles"    on public.church_roles;

-- 4. New RLS: anyone in the same church can read roles
create policy "church_roles: members read own church"
  on public.church_roles for select
  using (
    auth.uid() is not null
    and church_id in (
      select church_id from public.profiles where id = auth.uid()
      union
      select church_id from public.church_roles where user_id = auth.uid()
    )
  );

-- 5. New RLS: only owner or staff with can_manage_staff may write roles
create policy "church_roles: owner or manager writes"
  on public.church_roles for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.church_roles cr
      where cr.church_id = church_roles.church_id
        and cr.user_id   = auth.uid()
        and (cr.is_owner = true or cr.can_manage_staff = true)
    )
  );

create policy "church_roles: owner or manager updates"
  on public.church_roles for update
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.church_roles cr
      where cr.church_id = church_roles.church_id
        and cr.user_id   = auth.uid()
        and (cr.is_owner = true or cr.can_manage_staff = true)
    )
  );

create policy "church_roles: owner or manager deletes"
  on public.church_roles for delete
  using (
    -- Can't delete the owner row via API — ownership transfer is an explicit update
    is_owner = false
    and exists (
      select 1 from public.church_roles cr
      where cr.church_id = church_roles.church_id
        and cr.user_id   = auth.uid()
        and (cr.is_owner = true or cr.can_manage_staff = true)
    )
  );

-- 6. Update sermon write RLS to check church_roles instead of churches.pastor_id
drop policy if exists "Pastor inserts own church sermons"  on public.sermons;
drop policy if exists "Pastor updates own church sermons"  on public.sermons;
drop policy if exists "Pastor deletes own church sermons"  on public.sermons;

create policy "sermons: church owner or sermon-poster inserts"
  on public.sermons for insert
  with check (
    auth.uid() is not null
    and exists (
      select 1 from public.church_roles cr
      where cr.church_id = sermons.church_id
        and cr.user_id   = auth.uid()
        and (cr.is_owner = true or cr.can_post_sermons = true)
    )
  );

create policy "sermons: church owner or sermon-poster updates"
  on public.sermons for update
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.church_roles cr
      where cr.church_id = sermons.church_id
        and cr.user_id   = auth.uid()
        and (cr.is_owner = true or cr.can_post_sermons = true)
    )
  );

create policy "sermons: church owner or sermon-poster deletes"
  on public.sermons for delete
  using (
    auth.uid() is not null
    and exists (
      select 1 from public.church_roles cr
      where cr.church_id = sermons.church_id
        and cr.user_id   = auth.uid()
        and (cr.is_owner = true or cr.can_post_sermons = true)
    )
  );

-- 7. Update church_avatars storage RLS to use church_roles
drop policy if exists "church-avatars: pastor writes"   on storage.objects;
drop policy if exists "church-avatars: pastor updates"  on storage.objects;
drop policy if exists "church-avatars: pastor deletes"  on storage.objects;

create policy "church-avatars: owner writes"
  on storage.objects for insert
  with check (
    bucket_id = 'church-avatars'
    and auth.uid() is not null
    and exists (
      select 1 from public.church_roles cr
      where cr.church_id::text = (storage.foldername(name))[1]
        and cr.user_id = auth.uid()
        and (cr.is_owner = true or cr.can_edit_church = true)
    )
  );

create policy "church-avatars: owner updates"
  on storage.objects for update
  using (
    bucket_id = 'church-avatars'
    and exists (
      select 1 from public.church_roles cr
      where cr.church_id::text = (storage.foldername(name))[1]
        and cr.user_id = auth.uid()
        and (cr.is_owner = true or cr.can_edit_church = true)
    )
  );

create policy "church-avatars: owner deletes"
  on storage.objects for delete
  using (
    bucket_id = 'church-avatars'
    and exists (
      select 1 from public.church_roles cr
      where cr.church_id::text = (storage.foldername(name))[1]
        and cr.user_id = auth.uid()
        and (cr.is_owner = true or cr.can_edit_church = true)
    )
  );

commit;
