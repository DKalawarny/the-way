-- ============================================================================
-- 2026-06-03 — personal_prayer_support table + prayer notification trigger
-- ----------------------------------------------------------------------------
-- Run this in the Supabase SQL editor.
--
-- Creates the personal_prayer_support table (if it doesn't already exist),
-- adds RLS policies, and wires up a notification trigger so that when someone
-- taps "Pray" on your church prayer, you get a notification.
-- ============================================================================

-- ── Table ────────────────────────────────────────────────────────────────────
create table if not exists public.personal_prayer_support (
  prayer_id  uuid not null references public.personal_prayers(id) on delete cascade,
  user_id    uuid not null references public.profiles(id)         on delete cascade,
  created_at timestamptz not null default now(),
  primary key (prayer_id, user_id)
);

alter table public.personal_prayer_support enable row level security;

-- ── RLS policies ─────────────────────────────────────────────────────────────
-- Anyone can read counts (needed to show "🙏 3 prayed")
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'personal_prayer_support'
      and policyname = 'Anyone can read prayer support'
  ) then
    create policy "Anyone can read prayer support"
      on public.personal_prayer_support for select using (true);
  end if;
end $$;

-- Authenticated users can add their own pray
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'personal_prayer_support'
      and policyname = 'Users can pray for prayers'
  ) then
    create policy "Users can pray for prayers"
      on public.personal_prayer_support for insert
      with check (auth.uid() = user_id);
  end if;
end $$;

-- Users can remove their own pray
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'personal_prayer_support'
      and policyname = 'Users can remove own prayer support'
  ) then
    create policy "Users can remove own prayer support"
      on public.personal_prayer_support for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- ── Notification trigger ──────────────────────────────────────────────────────
-- When someone prays for a prayer, notify the person who wrote it.
-- Uses the existing add_notification() helper (same pattern as dm notifications).
create or replace function public.notify_prayer_support()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author  uuid;
  v_snippet text;
begin
  -- Get the prayer's author + a short snippet of the prayer body
  select user_id, left(body, 80)
  into   v_author, v_snippet
  from   public.personal_prayers
  where  id = NEW.prayer_id;

  -- Don't notify if the prayer author can't be found,
  -- or if they're praying for their own prayer
  if v_author is null or v_author = NEW.user_id then
    return NEW;
  end if;

  perform public.add_notification(
    v_author,           -- recipient
    NEW.user_id,        -- actor (the person who prayed)
    'prayer_support',   -- kind
    'prayer',           -- target_type
    NEW.prayer_id,      -- target_id
    jsonb_build_object('snippet', v_snippet)
  );

  return NEW;
end;
$$;

drop trigger if exists trg_notify_prayer_support on public.personal_prayer_support;

create trigger trg_notify_prayer_support
  after insert on public.personal_prayer_support
  for each row execute function public.notify_prayer_support();
