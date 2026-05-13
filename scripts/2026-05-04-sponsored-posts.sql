-- sponsored_posts table
-- Stores faith-based sponsored cards that appear in the feed (free users only).
-- Ads are hidden until at least one row has is_active = true.
-- Only app admins (is_admin = true in profiles) can write.

create table if not exists sponsored_posts (
  id           uuid        primary key default gen_random_uuid(),
  sponsor_name text        not null,
  title        text,
  body         text,
  cta_text     text,
  cta_url      text,
  emoji        text        not null default '✦',
  is_active    boolean     not null default false,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now()
);

alter table sponsored_posts enable row level security;

-- Anyone (including anonymous visitors) can read all rows.
-- The React layer filters to is_active = true for the public feed.
create policy "anyone can read sponsors"
  on sponsored_posts
  for select
  using (true);

-- Only users flagged as is_admin in their profile can insert / update / delete.
create policy "admins can manage sponsors"
  on sponsored_posts
  for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and is_admin = true
    )
  )
  with check (
    exists (
      select 1 from profiles
      where id = auth.uid()
        and is_admin = true
    )
  );
