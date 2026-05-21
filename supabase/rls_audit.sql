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
  user_id       UUID REFERENCES auth.users(id),
  rating        INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  liked         TEXT[] DEFAULT '{}',
  suggestion    TEXT,
  session_count INT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id),
  event      TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parent_messages (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  child_user_id  UUID NOT NULL REFERENCES auth.users(id),
  message        TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parent_settings (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  settings   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parent_subscriptions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  endpoint   TEXT NOT NULL,
  keys       JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
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

-- sessions
CREATE POLICY "sessions_select_own" ON sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- sm2_cards
CREATE POLICY "sm2_select_own"  ON sm2_cards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sm2_insert_own"  ON sm2_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sm2_update_own"  ON sm2_cards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_xp
CREATE POLICY "xp_select_own"  ON user_xp FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "xp_insert_own"  ON user_xp FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "xp_update_own"  ON user_xp FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_badges
CREATE POLICY "badges_select_own" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "badges_insert_own" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "badges_update_own" ON user_badges FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- diagnostic_results
CREATE POLICY "diag_select_own"  ON diagnostic_results FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "diag_insert_own"  ON diagnostic_results FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "diag_update_own"  ON diagnostic_results FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_onboarding (read-only for client; writes via service role)
CREATE POLICY "onboarding_select_own" ON user_onboarding FOR SELECT USING (auth.uid() = user_id);

-- user_premium — CRITICAL: clients can only revoke (set is_premium=false), never grant
CREATE POLICY "premium_select_own"    ON user_premium FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "premium_revoke_trial"  ON user_premium FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_premium = false);

-- user_feedback
CREATE POLICY "feedback_insert_own" ON user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- analytics_events
CREATE POLICY "analytics_insert_own" ON analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- push_subscriptions
CREATE POLICY "push_select_own"  ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_insert_own"  ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_delete_own"  ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- parent_child_link (both parent and child can see their link; writes via service role)
CREATE POLICY "pclink_select" ON parent_child_link FOR SELECT
  USING (auth.uid() = parent_user_id OR auth.uid() = child_user_id);

-- parent_messages (child reads; writes via service role only)
CREATE POLICY "pmsg_select_child" ON parent_messages FOR SELECT USING (auth.uid() = child_user_id);

-- parent_settings
CREATE POLICY "psettings_select_own" ON parent_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "psettings_insert_own" ON parent_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "psettings_update_own" ON parent_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- parent_subscriptions
CREATE POLICY "psubs_select_own" ON parent_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "psubs_insert_own" ON parent_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "psubs_delete_own" ON parent_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- referrals — server-only (service role bypasses RLS; no client access)

-- premium_waitlist — public INSERT (no auth needed for waitlist signup)
CREATE POLICY "waitlist_insert_public" ON premium_waitlist FOR INSERT WITH CHECK (true);

-- ── STEP 5: Verify ───────────────────────────────────────────────────────

SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
