-- ═══════════════════════════════════════════════════════════════════════
-- MateMax — Supabase RLS Audit & Policy Setup
-- Run this in Supabase SQL Editor (project: pkjckadolkoosoblagvr)
-- Safe to run multiple times (DROP POLICY IF EXISTS + CREATE)
-- ═══════════════════════════════════════════════════════════════════════

-- ── STEP 1: Enable RLS on all tables ────────────────────────────────────

ALTER TABLE sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sm2_cards          ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp            ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_onboarding    ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_premium       ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback      ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_link  ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_messages    ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_settings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE premium_waitlist   ENABLE ROW LEVEL SECURITY;

-- ── STEP 2: Drop existing policies (idempotent) ──────────────────────────

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════
-- sessions — users insert/read their own rows; no client delete/update
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "sessions_select_own"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- sm2_cards — users upsert/read their own cards
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "sm2_cards_select_own"
  ON sm2_cards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "sm2_cards_insert_own"
  ON sm2_cards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sm2_cards_update_own"
  ON sm2_cards FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- user_xp — users upsert/read their own XP
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "user_xp_select_own"
  ON user_xp FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_xp_insert_own"
  ON user_xp FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_xp_update_own"
  ON user_xp FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- user_badges — users upsert/read their own badges
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "user_badges_select_own"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_badges_insert_own"
  ON user_badges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_badges_update_own"
  ON user_badges FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- diagnostic_results — users upsert/read their own results
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "diagnostic_results_select_own"
  ON diagnostic_results FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "diagnostic_results_insert_own"
  ON diagnostic_results FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "diagnostic_results_update_own"
  ON diagnostic_results FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- user_onboarding — users read their own row; admin writes via service role
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "user_onboarding_select_own"
  ON user_onboarding FOR SELECT
  USING (auth.uid() = user_id);

-- Insert/update is done server-side (service role bypasses RLS)

-- ═══════════════════════════════════════════════════════════════════════
-- user_premium — CRITICAL: users can READ own row and revoke own trial
--   but CANNOT grant themselves is_premium = true via direct API call.
--   INSERT (granting premium) only via service role (admin/referral/stripe).
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "user_premium_select_own"
  ON user_premium FOR SELECT
  USING (auth.uid() = user_id);

-- Allow client to revoke expired trial (set is_premium = false only)
CREATE POLICY "user_premium_revoke_trial"
  ON user_premium FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_premium = false);

-- INSERT is server-only (service role key bypasses RLS — no client policy needed)

-- ═══════════════════════════════════════════════════════════════════════
-- user_feedback — users insert; no client select (admin reads via service role)
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "user_feedback_insert_own"
  ON user_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ═══════════════════════════════════════════════════════════════════════
-- analytics_events — users insert own events; no client select
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "analytics_events_insert_own"
  ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- push_subscriptions — users manage their own subscriptions
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "push_subscriptions_select_own"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_insert_own"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_subscriptions_delete_own"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- parent_child_link — parent and child can see their own links
--   INSERT/UPDATE done server-side (parent-link API uses service role)
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "parent_child_link_select"
  ON parent_child_link FOR SELECT
  USING (auth.uid() = parent_user_id OR auth.uid() = child_user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- parent_messages — child can read messages addressed to them;
--   INSERT done server-side only (parent-message API uses service role)
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "parent_messages_select_own_child"
  ON parent_messages FOR SELECT
  USING (auth.uid() = child_user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- parent_settings — parents manage their own settings
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "parent_settings_select_own"
  ON parent_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "parent_settings_insert_own"
  ON parent_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "parent_settings_update_own"
  ON parent_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- parent_subscriptions — parents manage their own push subscriptions
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "parent_subscriptions_select_own"
  ON parent_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "parent_subscriptions_insert_own"
  ON parent_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "parent_subscriptions_delete_own"
  ON parent_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════
-- referrals — server-only table; no direct client access
-- ═══════════════════════════════════════════════════════════════════════

-- No client policies — all operations via service role (referral API)

-- ═══════════════════════════════════════════════════════════════════════
-- premium_waitlist — public INSERT (email only, no auth required)
-- ═══════════════════════════════════════════════════════════════════════

CREATE POLICY "premium_waitlist_insert_public"
  ON premium_waitlist FOR INSERT
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════
-- STEP 3: Verify — list all active policies
-- ═══════════════════════════════════════════════════════════════════════

SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;
