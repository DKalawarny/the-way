-- Post view tracking: unique per user per post, denormalized count on posts row.
-- Run once in Supabase SQL editor.

-- 1. Add view_count column to posts
ALTER TABLE posts ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

-- 2. Tracking table (prevents duplicate counts from same user)
CREATE TABLE IF NOT EXISTS post_views (
  post_id   uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, viewer_id)
);

ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON post_views FOR SELECT USING (true);
CREATE POLICY "Auth insert own"  ON post_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- 3. RPC — call from client; increments count only on first view per user
CREATE OR REPLACE FUNCTION record_post_view(p_post_id uuid, p_viewer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO post_views (post_id, viewer_id)
  VALUES (p_post_id, p_viewer_id)
  ON CONFLICT (post_id, viewer_id) DO NOTHING;

  IF FOUND THEN
    UPDATE posts SET view_count = view_count + 1 WHERE id = p_post_id;
  END IF;
END;
$$;
