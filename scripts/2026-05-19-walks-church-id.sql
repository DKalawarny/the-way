-- Add church ownership columns to walks so pastor-created walks
-- are scoped to their church and distinguishable from the global library.
alter table public.walks add column if not exists church_id  uuid references public.churches(id) on delete set null;
alter table public.walks add column if not exists created_by uuid references public.profiles(id)  on delete set null;

-- Pastors can insert/update/delete walks they created
drop policy if exists "Pastor manages own walks" on public.walks;
create policy "Pastor manages own walks"
  on public.walks for all
  using  (auth.uid() = created_by)
  with check (auth.uid() = created_by);
