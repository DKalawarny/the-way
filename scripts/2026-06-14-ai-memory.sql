-- AI conversation memory — stores a short profile of who each user is
-- so the AI companion can pick up where it left off across sessions.
alter table public.profiles
  add column if not exists ai_memory text;
