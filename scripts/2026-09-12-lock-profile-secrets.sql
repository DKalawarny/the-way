-- Take the AI's standing summary (and billing ids) out of the browser's reach.
--
-- THE PROBLEM, found 12 Sep by signing in as an ordinary demo member and
-- querying another user's row: any authenticated account could read ANY user's
-- full profiles row, including ai_memory. Daniel's read:
--
--   "Canadian entrepreneur, 38, on Vancouver Island in 13-year partnership with
--    five children (ages 12, 9, 5, 2, newborn). Major life transition: selling
--    Nanaimo house with ~$600k capital gains... Co-owns demolition company but
--    exiting within months..."
--
-- None of which he typed as profile information — the AI inferred it from his
-- conversations and stored it, invisible to him and readable by anyone with an
-- account and a browser console. For kinwove's users the same field would hold
-- religious doubt and mental-health disclosure.
--
-- Everything else checked out: conversations, notes, DMs, qa_events and push
-- subscriptions all correctly return 0 rows to another user, and prayers return
-- only public ones plus your own.
--
-- RUN ORDER MATTERS. Deploy the app first (it now selects an explicit column
-- list instead of `select('*')`, see src/profileColumns.js) — otherwise every
-- profile load in the browser starts erroring the moment this runs.
revoke select (ai_memory, research_memory, stripe_customer_id, stripe_subscription_id)
  on public.profiles from anon, authenticated;

-- The server keeps full access; it reads these with the service role key, which
-- bypasses both RLS and column grants.

-- Conversation sync defaults ON for new accounts.
-- qa_events already stores every question's full text server-side regardless of
-- this setting, so leaving it off protected nobody's words — it only denied the
-- person their own history and the AI's recall. New accounts only; anyone who
-- turned it off chose that.
alter table profiles
  alter column sync_conversations set default true;

-- Verify:
--   select column_default from information_schema.columns
--    where table_name='profiles' and column_name='sync_conversations';   -- true
--
--   Then, signed in as an ordinary user, this should now ERROR rather than
--   return a row:
--   select ai_memory from profiles limit 1;
