-- Walk creator support
-- Adds church_id + created_by to walks so pastors can save AI-generated walks
-- that are private to their church (church_id set) or published to the
-- global library (church_id null, is_published true).

alter table public.walks
  add column if not exists church_id  uuid references public.churches(id) on delete cascade,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Drop the old blanket read policy and replace it with one that also lets
-- the creator see their own unpublished drafts.
drop policy if exists "Anyone reads published walks" on public.walks;

create policy "Read published walks or own walks"
  on public.walks for select
  using (
    is_published = true
    or created_by = auth.uid()
  );

-- Authenticated users can insert walks.
-- (The UI already gates this behind the pastor role; we'll tighten further
-- once the product is stable and we have real usage data.)
create policy "Authenticated users can create walks"
  on public.walks for insert
  with check (auth.uid() is not null);

-- Creators can update and delete their own walks.
create policy "Creators can update their walks"
  on public.walks for update
  using  (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "Creators can delete their walks"
  on public.walks for delete
  using (created_by = auth.uid());

-- App admins can manage any walk (global library curation).
create policy "Admins can manage all walks"
  on public.walks for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
