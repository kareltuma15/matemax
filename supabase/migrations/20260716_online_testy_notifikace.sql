-- Online Testy Nanečisto — kolo 2: notifikace
-- Spustit v Supabase SQL Editoru
--
-- Časy odeslaných notifikací drží idempotenci: cron běží každou hodinu
-- a okna jsou schválně široká, takže bez těchto sloupců by žák dostal
-- stejnou připomínku několikrát.

ALTER TABLE online_test_enrollments
  ADD COLUMN IF NOT EXISTS confirm_sent_at      TIMESTAMPTZ,  -- potvrzení po zaplacení
  ADD COLUMN IF NOT EXISTS reminder_24h_sent_at TIMESTAMPTZ,  -- „vytiskni si arch"
  ADD COLUMN IF NOT EXISTS reminder_1h_sent_at  TIMESTAMPTZ;  -- „za hodinu začínáme"

-- Cron hledá zaplacené přihlášky, kterým ještě nějaká připomínka chybí.
CREATE INDEX IF NOT EXISTS idx_enrollments_reminders
  ON online_test_enrollments (payment_status, reminder_24h_sent_at, reminder_1h_sent_at);
