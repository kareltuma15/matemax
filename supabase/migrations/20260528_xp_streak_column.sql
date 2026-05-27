-- Add streak column to user_xp so server-side features (push notifications) can read it
ALTER TABLE user_xp ADD COLUMN IF NOT EXISTS streak integer NOT NULL DEFAULT 0;
