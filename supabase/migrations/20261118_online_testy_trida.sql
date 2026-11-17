-- Online testy nanečisto i pro 5. třídu: u každého termínu je třída (5 nebo 9).
-- Stávající termíny zůstávají pro 9. třídu (default 9). Spustit v Supabase SQL Editoru.
-- Bezpečné spustit vícekrát.

ALTER TABLE online_test_sessions
  ADD COLUMN IF NOT EXISTS trida SMALLINT NOT NULL DEFAULT 9;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'online_test_sessions_trida_check'
  ) THEN
    ALTER TABLE online_test_sessions
      ADD CONSTRAINT online_test_sessions_trida_check CHECK (trida IN (5, 9));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_online_test_sessions_trida
  ON online_test_sessions (trida, is_published, scheduled_at);
