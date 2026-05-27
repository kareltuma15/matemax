-- Weekly leaderboard: best score per user per ISO week
-- Run in Supabase SQL editor

CREATE TABLE IF NOT EXISTS weekly_leaderboard (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL,
  week_key      text NOT NULL,           -- e.g. "2026-W22"
  nickname      text NOT NULL DEFAULT 'Anonymní žák',
  avatar_emoji  text NOT NULL DEFAULT '🧑‍💻',
  score         integer NOT NULL,        -- correct answers
  total         integer NOT NULL,        -- total examples
  time_seconds  integer NOT NULL,        -- lower = better (for tie-breaking)
  xp_earned     integer NOT NULL DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, week_key)
);

ALTER TABLE weekly_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_lb_select_all"  ON weekly_leaderboard FOR SELECT USING (true);
CREATE POLICY "weekly_lb_insert_own"  ON weekly_leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_lb_update_own"  ON weekly_leaderboard FOR UPDATE USING (auth.uid() = user_id);
