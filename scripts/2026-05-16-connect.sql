-- Connect feature: mentor_open + connect_open flags on profiles.
-- Run once in Supabase SQL editor.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS mentor_open  boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS connect_open boolean NOT NULL DEFAULT false;

-- mentor_open:  "I'm open to mentoring someone further behind me on the journey"
-- connect_open: "I'm open to honest faith conversations — as seeker, new believer, or anyone"
