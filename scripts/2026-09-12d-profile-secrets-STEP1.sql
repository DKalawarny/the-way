-- STEP 1 of 2. Non-destructive: creates a table and copies data. Drops nothing.
--
-- Why a separate table rather than more column grants: three attempts at
-- `revoke select (col)` / `grant select (cols)` on profiles all reported success
-- and changed nothing — `select=*` as an ordinary user still returns all 50
-- columns including ai_memory. Row-level security, by contrast, demonstrably
-- works on this database: conversations, user_notes and dm_messages all
-- correctly return 0 rows to another user.
--
-- So this makes the protection row-level instead of column-level. Even if the
-- table grant is wide open, RLS restricts which ROWS you can see, and the policy
-- is "your own". Nobody can read anyone else's, and `select=*` cannot defeat it.

create table if not exists public.profile_secrets (
  user_id                uuid primary key references public.profiles(id) on delete cascade,
  ai_memory              text,
  research_memory        text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  updated_at             timestamptz not null default now()
);

alter table public.profile_secrets enable row level security;

-- Owner reads their own row. No insert/update/delete policies at all, so writes
-- are service-role only — the server holds the service key and bypasses RLS.
drop policy if exists "read own secrets" on public.profile_secrets;
create policy "read own secrets"
  on public.profile_secrets for select
  using (auth.uid() = user_id);

grant select on public.profile_secrets to authenticated;

-- Copy what exists today. Safe to re-run.
insert into public.profile_secrets (user_id, ai_memory, research_memory, stripe_customer_id, stripe_subscription_id)
select id, ai_memory, research_memory, stripe_customer_id, stripe_subscription_id
from public.profiles
where ai_memory is not null
   or research_memory is not null
   or stripe_customer_id is not null
   or stripe_subscription_id is not null
on conflict (user_id) do update set
  ai_memory              = excluded.ai_memory,
  research_memory        = excluded.research_memory,
  stripe_customer_id     = excluded.stripe_customer_id,
  stripe_subscription_id = excluded.stripe_subscription_id,
  updated_at             = now();

notify pgrst, 'reload schema';

-- Proof the copy landed. Expect one row per person who had any of the four.
select count(*) as rows_copied,
       count(ai_memory) as with_ai_memory,
       count(stripe_customer_id) as with_stripe
from public.profile_secrets;
