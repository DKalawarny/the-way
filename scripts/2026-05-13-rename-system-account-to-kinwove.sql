-- ============================================================================
-- 2026-05-13 — Rename system account display_name: "The Way" -> "kinwove"
-- ----------------------------------------------------------------------------
-- Part of the kinwove rebrand. The client code in MessagesInbox.jsx and
-- DMConversation.jsx now matches against display_name = 'kinwove' to decide
-- whether a conversation is the system/welcome account. The server in
-- server.js now writes 'kinwove' when creating system DMs.
--
-- Existing production row was inserted with display_name = 'The Way', so
-- without this migration old system conversations would show the wrong
-- sender name (or stop being detected as the system account) until the
-- next message goes through that code path.
--
-- Run once against production AFTER the new client build is deployed.
-- Idempotent — running it twice is harmless.
-- ============================================================================

UPDATE public.profiles
SET    display_name = 'kinwove'
WHERE  id = (
  SELECT id
  FROM   auth.users
  WHERE  email = 'system-theway@theway.internal'
)
AND    display_name <> 'kinwove';

-- Sanity check: confirm the row was updated. Should return exactly one row
-- with display_name = 'kinwove'.
SELECT id, display_name
FROM   public.profiles
WHERE  id = (
  SELECT id
  FROM   auth.users
  WHERE  email = 'system-theway@theway.internal'
);
