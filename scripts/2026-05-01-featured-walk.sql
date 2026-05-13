-- Featured walk per church
-- Lets a pastor pick one walk from the library to highlight on their
-- ChurchHub. Pastor can change it anytime; null clears.
-- Member walk_progress remains private (no schema change there).

alter table public.churches
  add column if not exists featured_walk_id uuid
    references public.walks(id) on delete set null;
