-- ═══════════════════════════════════════════════════════════════════════
-- MateMax — Supabase RLS Audit & Policy Setup
-- Run in Supabase SQL Editor (project: pkjckadolkoosoblagvr)
-- Idempotent — safe to run multiple times
-- ═══════════════════════════════════════════════════════════════════════

-- ── STEP 1: Create tables that may not exist yet ─────────────────────────

CREATE TABLE IF NOT EXISTS premium_waitlist (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_feedback (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  liked         TEXT[] DEFAULT '{}',
  suggestion    TEXT,
  session_count INT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS analytics_events_user_idx ON analytics_events (user_id, event_name);
CREATE INDEX IF NOT EXISTS analytics_events_time_idx ON analytics_events (created_at);

CREATE TABLE IF NOT EXISTS parent_messages (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- parent_settings uses parent_email (text), not user_id UUID
CREATE TABLE IF NOT EXISTS parent_settings (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_email     TEXT NOT NULL UNIQUE,
  report_frequency TEXT DEFAULT 'weekly',
  send_day         TEXT DEFAULT 'sunday',
  inactive_alert   BOOLEAN DEFAULT true,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- parent_subscriptions: email-based old-style newsletter subscription
CREATE TABLE IF NOT EXISTS parent_subscriptions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_email TEXT NOT NULL,
  child_email  TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (parent_email, child_email)
);

-- ── STEP 2: Enable RLS on all tables ────────────────────────────────────

ALTER TABLE sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sm2_cards             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges           ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_results    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_premium          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback         ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_link     ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_messages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_settings       ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_waitlist      ENABLE ROW LEVEL SECURITY;

-- ── STEP 3: Drop all existing policies (idempotent) ──────────────────────

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ── STEP 4: Create RLS policies ──────────────────────────────────────────

-- sessions: users read/write only their own rows
CREATE POLICY "sessions_select_own" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- sm2_cards: users read/write only their own cards
CREATE POLICY "sm2_select_own" ON sm2_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sm2_insert_own" ON sm2_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sm2_update_own" ON sm2_cards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_xp: users read/write only their own XP
CREATE POLICY "xp_select_own" ON user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "xp_insert_own" ON user_xp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "xp_update_own" ON user_xp FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_badges: users read/write only their own badges
CREATE POLICY "badges_select_own" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "badges_insert_own" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "badges_update_own" ON user_badges FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- diagnostic_results: users read/write only their own results
CREATE POLICY "diag_select_own" ON diagnostic_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "diag_insert_own" ON diagnostic_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "diag_update_own" ON diagnostic_results FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_onboarding: users read their own row; writes are server-side only
CREATE POLICY "onboarding_select_own" ON user_onboarding FOR SELECT USING (auth.uid() = user_id);

-- user_premium — CRITICAL: clients can SELECT and revoke trial (is_premium=false only)
-- Granting premium (is_premium=true) must go through server/service role
CREATE POLICY "premium_select_own"   ON user_premium FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "premium_revoke_trial" ON user_premium FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_premium = false);

-- user_feedback: authenticated users can insert (user_id may be null for anon)
CREATE POLICY "feedback_insert_own" ON user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- analytics_events: users can insert their own events; no client select
CREATE POLICY "analytics_insert_own" ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- push_subscriptions: users manage their own subscriptions
CREATE POLICY "push_select_own"  ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_insert_own"  ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_delete_own"  ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- parent_child_link: parent (by email) and child (by UUID) can see their own link
-- Writes go through service role only (parent-link API)
CREATE POLICY "pclink_select" ON parent_child_link FOR SELECT
  USING (
    (auth.jwt() ->> 'email') = parent_email
    OR auth.uid() = child_user_id
  );

-- parent_messages: child can read messages sent to them; inserts via service role only
CREATE POLICY "pmsg_select_child" ON parent_messages FOR SELECT
  USING (auth.uid() = child_user_id);

-- parent_settings: all access via service role (admin client) — no client policy needed
-- (parent_email-based table; JWT email check possible but all writes are server-side)

-- parent_subscriptions: email-based newsletter table; insert is public (no auth in route)
CREATE POLICY "psubs_insert_public" ON parent_subscriptions FOR INSERT WITH CHECK (true);

-- referrals: server-only table — all via service role, no client access

-- premium_waitlist: public INSERT (unauthenticated waitlist signup)
CREATE POLICY "waitlist_insert_public" ON premium_waitlist FOR INSERT WITH CHECK (true);

-- ── STEP 5: Verify — show all active policies ────────────────────────────

SELECT
  tablename,
  policyname,
  cmd,
  qual AS using_expr,
  with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
