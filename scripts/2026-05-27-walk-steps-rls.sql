-- Walk steps write policies (2026-05-27)
-- walk_steps previously had SELECT only. Pastors couldn't save AI-generated
-- steps because there were no INSERT/UPDATE/DELETE policies.
-- Linked to walk ownership via walks.created_by.

create policy "Walk creators can insert steps"
  on public.walk_steps for insert
  with check (
    exists (
      select 1 from public.walks
      where id = walk_id and created_by = auth.uid()
    )
  );

create policy "Walk creators can update steps"
  on public.walk_steps for update
  using (
    exists (
      select 1 from public.walks
      where id = walk_id and created_by = auth.uid()
    )
  );

create policy "Walk creators can delete steps"
  on public.walk_steps for delete
  using (
    exists (
      select 1 from public.walks
      where id = walk_id and created_by = auth.uid()
    )
  );
