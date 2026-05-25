-- Přidá Stripe sloupce do user_premium tabulky
-- Spustit v Supabase SQL Editoru

ALTER TABLE user_premium
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Index pro rychlé vyhledání zákazníka z webhooku
CREATE INDEX IF NOT EXISTS idx_user_premium_stripe_customer
  ON user_premium (stripe_customer_id);
