-- Online Testy Nanečisto — kolo 1: tabulky + RLS + Storage
-- Spustit v Supabase SQL Editoru

-- ── 1. Termíny testů ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS online_test_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,                    -- např. "Test nanečisto #3 — duben 2027"
  scheduled_at TIMESTAMPTZ NOT NULL,      -- datum a čas startu (např. sobota 10:00)
  duration_minutes INTEGER DEFAULT 60,    -- délka testu v minutách
  capacity INTEGER DEFAULT 30,            -- max počet žáků
  price_czk INTEGER NOT NULL,             -- cena v Kč
  zadani_pdf_url TEXT,                    -- cesta k zadání testu (Supabase Storage)
  zaznamovy_arch_pdf_url TEXT,            -- cesta k záznamovému archu
  rozbor_pdf_url TEXT,                    -- cesta k rozboru testu (nahraje Karel po testu)
  is_published BOOLEAN DEFAULT false,     -- skryté dokud Karel nezveřejní
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Přihlášky (enrollments) ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS online_test_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES online_test_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  -- žák se na jeden termín přihlásí jen jednou
  UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_session
  ON online_test_enrollments (session_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user
  ON online_test_enrollments (user_id);

-- ── 3. Odevzdané testy (submissions) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS online_test_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES online_test_enrollments(id) ON DELETE CASCADE,
  submitted_at TIMESTAMPTZ,
  photo_urls TEXT[],                      -- pole cest k fotkám záznamového archu

  -- Body per téma (Karel vyplní při opravě)
  body_zlomky DECIMAL(4,1),
  body_vyrazy DECIMAL(4,1),
  body_rovnice DECIMAL(4,1),
  body_geometrie DECIMAL(4,1),
  body_slovni_ulohy DECIMAL(4,1),
  body_grafy DECIMAL(4,1),
  body_uhly DECIMAL(4,1),
  body_konstrukce DECIMAL(4,1),
  body_kombinovane DECIMAL(4,1),
  body_celkem DECIMAL(4,1),               -- z 50

  -- Zpětná vazba
  komentar_celkovy TEXT,
  komentar_temy JSONB,                    -- {"zlomky": "✅ perfektní", "uhly": "❌ ..."}
  silne_stranky TEXT,
  doporuceni TEXT,

  -- Status opravy
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'reviewed', 'sent')),
  reviewed_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,

  -- jedna submission na přihlášku
  UNIQUE (enrollment_id)
);

-- ── 4. Row Level Security ─────────────────────────────────────────────────────
-- Zápisy (vytvoření termínu, enrollment po platbě, oprava) jdou přes
-- service-role klient v API routách, který RLS obchází. Policies níže
-- řeší jen čtení z klienta.

ALTER TABLE online_test_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_test_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE online_test_submissions ENABLE ROW LEVEL SECURITY;

-- Publikované termíny vidí kdokoli (i nepřihlášený — landing page)
DROP POLICY IF EXISTS "published sessions are public" ON online_test_sessions;
CREATE POLICY "published sessions are public"
  ON online_test_sessions FOR SELECT
  USING (is_published = true);

-- Žák vidí jen svoje přihlášky
DROP POLICY IF EXISTS "users read own enrollments" ON online_test_enrollments;
CREATE POLICY "users read own enrollments"
  ON online_test_enrollments FOR SELECT
  USING (auth.uid() = user_id);

-- Žák vidí jen svoje odevzdané testy (přes enrollment)
DROP POLICY IF EXISTS "users read own submissions" ON online_test_submissions;
CREATE POLICY "users read own submissions"
  ON online_test_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM online_test_enrollments e
      WHERE e.id = enrollment_id AND e.user_id = auth.uid()
    )
  );

-- ── 5. Storage buckety ────────────────────────────────────────────────────────
-- Oba privátní: zadání se nesmí dostat ven před startem testu, fotky archů
-- jsou osobní data. Přístup řeší API routy přes service role + signed URLs.

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('test-sessions', 'test-sessions', false),
  ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;
