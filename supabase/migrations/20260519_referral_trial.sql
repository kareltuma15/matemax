-- KROK 28: Referral program + 7-day Premium trial
-- Run this against your Supabase project via SQL editor or CLI

ALTER TABLE user_premium ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz;
ALTER TABLE user_premium ADD COLUMN IF NOT EXISTS trial_granted_by text;

CREATE TABLE IF NOT EXISTS referrals (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  referral_code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  reward_granted boolean DEFAULT false,
  UNIQUE(referred_user_id)
);
