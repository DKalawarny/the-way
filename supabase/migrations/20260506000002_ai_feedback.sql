-- AI feedback table: stores flagged AI responses for manual review
create table if not exists public.ai_feedback (
  id            bigserial primary key,
  user_id       uuid references auth.users(id) on delete set null,
  message_text  text not null,
  created_at    timestamptz not null default now()
);

-- Only the service role writes; users cannot read their own entries
-- (avoids gaming the system by checking what was flagged)
alter table public.ai_feedback enable row level security;

-- No client-side policies intentionally — service role only
comment on table public.ai_feedback is
  'Stores AI responses flagged as inaccurate by users. Reviewed manually.';

-- Index for admin review queries
create index ai_feedback_created_at_idx on public.ai_feedback(created_at desc);
