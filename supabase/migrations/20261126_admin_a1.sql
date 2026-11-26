-- Admin 2.1, fáze A1: sběr dat (Karel schválil 26. 11. 2026)
-- Spustit v Supabase SQL Editoru PŘED nasazením kódu. Skript je idempotentní (jde pustit znovu).
--
-- odpovedi       = každá odpověď žáka (čas, zvolená odpověď, nápověda, přeskočení, číslo pokusu). Historie začíná dnem nasazení.
-- souhlasy       = souhlasy s verzí textu a datem (podmínky a zásady, novinky e-mailem). Zapisuje jen server.
-- admin_audit    = co admin v adminu udělal (kdy, co, u koho). Jen přidávání, měnit ani mazat nejde.
-- admin_role     = role v adminu (admin; pomocník a editor až ve fázi D). Plní ji server při přihlášení admina.
-- navstevy_ucet  = spojení dnešních anonymních návštěv zařízení (denní otisk) s novým účtem při registraci.
-- weekly_leaderboard = žebříček už nejde číst přímo z prohlížeče (bylo vidět ID účtů ostatních), píše a čte jen server.

-- ═════════ odpovedi ═════════
CREATE TABLE IF NOT EXISTS odpovedi (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  uloha_id         TEXT NOT NULL CHECK (char_length(uloha_id) <= 60),
  tema             TEXT CHECK (char_length(tema) <= 40),
  dovednost        TEXT CHECK (char_length(dovednost) <= 60),
  uroven           SMALLINT,
  trida            SMALLINT CHECK (trida IN (5, 9)),
  rezim            TEXT NOT NULL CHECK (rezim IN ('trenink', 'opakovani', 'chyby', 'diagnostika', 'rychly', 'vyzva', 'test', 'boss')),
  sada_id          UUID,
  poradi           SMALLINT,
  pokus            SMALLINT,                -- kolikrát žák tuhle úlohu řešil (1 = poprvé), doplní trigger
  spravne          BOOLEAN,                 -- konečný výsledek (NULL u přeskočení)
  spravne_napoprve BOOLEAN,                 -- výsledek prvního odeslání v kartě
  odeslani         SMALLINT,                -- kolikrát odeslal odpověď v kartě
  odpoved          TEXT CHECK (char_length(odpoved) <= 40), -- jen číslo nebo volba, psaný text se neukládá
  cas_ms           INTEGER CHECK (cas_ms >= 0),
  napoveda         BOOLEAN NOT NULL DEFAULT FALSE,
  postup           BOOLEAN NOT NULL DEFAULT FALSE,           -- otevřel řešení / postup
  preskoceno       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS odpovedi_user_idx  ON odpovedi (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS odpovedi_uloha_idx ON odpovedi (uloha_id, created_at DESC);
CREATE INDEX IF NOT EXISTS odpovedi_cas_idx   ON odpovedi (created_at DESC);

CREATE OR REPLACE FUNCTION odpovedi_pokus() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  SELECT COUNT(*) + 1 INTO NEW.pokus FROM odpovedi WHERE user_id = NEW.user_id AND uloha_id = NEW.uloha_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS odpovedi_pokus_trg ON odpovedi;
CREATE TRIGGER odpovedi_pokus_trg BEFORE INSERT ON odpovedi FOR EACH ROW EXECUTE FUNCTION odpovedi_pokus();

ALTER TABLE odpovedi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "odpovedi_insert_own" ON odpovedi;
CREATE POLICY "odpovedi_insert_own" ON odpovedi FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "odpovedi_select_own" ON odpovedi;
CREATE POLICY "odpovedi_select_own" ON odpovedi FOR SELECT USING (auth.uid() = user_id);

-- ═════════ souhlasy ═════════
CREATE TABLE IF NOT EXISTS souhlasy (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  druh        TEXT NOT NULL CHECK (druh IN ('podminky', 'novinky_email', 'rodic')),
  verze       TEXT NOT NULL CHECK (char_length(verze) <= 40),
  udelen      BOOLEAN NOT NULL,
  udelil      TEXT NOT NULL DEFAULT 'zak' CHECK (udelil IN ('zak', 'rodic', 'admin')),
  zdroj       TEXT CHECK (char_length(zdroj) <= 40),   -- registrace, profil, e-mail…
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS souhlasy_user_idx ON souhlasy (user_id, druh, created_at DESC);
ALTER TABLE souhlasy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "souhlasy_select_own" ON souhlasy;
CREATE POLICY "souhlasy_select_own" ON souhlasy FOR SELECT USING (auth.uid() = user_id);

-- ═════════ admin_audit ═════════
CREATE TABLE IF NOT EXISTS admin_audit (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  akce        TEXT NOT NULL CHECK (char_length(akce) <= 60),
  cil_user_id UUID,                        -- u koho (bez cizího klíče: záznam zůstane i po smazání účtu)
  detail      JSONB NOT NULL DEFAULT '{}',
  vysledek    TEXT NOT NULL DEFAULT 'ok' CHECK (vysledek IN ('ok', 'chyba')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_audit_cas_idx ON admin_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_cil_idx ON admin_audit (cil_user_id, created_at DESC);
ALTER TABLE admin_audit ENABLE ROW LEVEL SECURITY;  -- bez politik: jen server (service role)
CREATE OR REPLACE FUNCTION admin_audit_jen_pridavat() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'admin_audit: záznamy nejde měnit ani mazat'; END $$;
DROP TRIGGER IF EXISTS admin_audit_jen_pridavat_trg ON admin_audit;
CREATE TRIGGER admin_audit_jen_pridavat_trg BEFORE UPDATE OR DELETE ON admin_audit FOR EACH ROW EXECUTE FUNCTION admin_audit_jen_pridavat();

-- ═════════ admin_role ═════════
CREATE TABLE IF NOT EXISTS admin_role (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'pomocnik', 'editor')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE admin_role ENABLE ROW LEVEL SECURITY;  -- bez politik: jen server

-- ═════════ navstevy_ucet ═════════
CREATE TABLE IF NOT EXISTS navstevy_ucet (
  v           TEXT NOT NULL CHECK (char_length(v) <= 32),
  den         DATE NOT NULL,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kdy         TEXT NOT NULL DEFAULT 'registrace' CHECK (kdy IN ('registrace', 'prihlaseni')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (v, den)
);
CREATE INDEX IF NOT EXISTS navstevy_ucet_user_idx ON navstevy_ucet (user_id);
ALTER TABLE navstevy_ucet ENABLE ROW LEVEL SECURITY;  -- bez politik: jen server

-- ═════════ žebříček: jen přes server ═════════
ALTER TABLE weekly_leaderboard ADD COLUMN IF NOT EXISTS skryty BOOLEAN NOT NULL DEFAULT FALSE;
DROP POLICY IF EXISTS "weekly_lb_select_all" ON weekly_leaderboard;
DROP POLICY IF EXISTS "weekly_lb_insert_own" ON weekly_leaderboard;
DROP POLICY IF EXISTS "weekly_lb_update_own" ON weekly_leaderboard;
DROP POLICY IF EXISTS "weekly_lb_select_own" ON weekly_leaderboard;
CREATE POLICY "weekly_lb_select_own" ON weekly_leaderboard FOR SELECT USING (auth.uid() = user_id);

-- ═════════ kontrola ═════════
SELECT
  to_regclass('public.odpovedi')      IS NOT NULL AS ma_odpovedi,
  to_regclass('public.souhlasy')      IS NOT NULL AS ma_souhlasy,
  to_regclass('public.admin_audit')   IS NOT NULL AS ma_audit,
  to_regclass('public.admin_role')    IS NOT NULL AS ma_role,
  to_regclass('public.navstevy_ucet') IS NOT NULL AS ma_navstevy_ucet;
