-- Conversation sync defaults ON for new accounts.
--
-- Why: the server already stores the full text of every question in qa_events,
-- whether or not sync is on. So leaving sync off does not protect anyone's
-- words — they are on the server either way — it only means the PERSON gets
-- nothing back. No history, and an AI that cannot remember what they told it.
--
-- The cost of that landed on 8 Sep. A first-time user spent ten minutes
-- describing church-leadership burnout, a broken friendship and having nobody
-- to talk to. She has 0 saved conversations. If she returns, kinwove asks her
-- to start again from nothing, after she had already said all of it once.
--
-- NEW ACCOUNTS ONLY. Existing users are deliberately untouched: anyone who
-- turned it off chose that, and flipping it for them would be a retroactive
-- change to how their conversations are stored.
alter table profiles
  alter column sync_conversations set default true;

-- Verify:
--   select column_default from information_schema.columns
--    where table_name = 'profiles' and column_name = 'sync_conversations';
--   -> expect: true
