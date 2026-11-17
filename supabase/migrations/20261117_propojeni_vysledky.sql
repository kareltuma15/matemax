-- Propojení účtů s appkou Vyhodnocení testů (krok 2)
-- Spustit v Supabase SQL Editoru. Skript je idempotentní (jde pustit znovu).
--
-- vysledky_propojeni  = jedno propojení účtu dítěte s Vyhodnocením testů (link_id je náhodné UUID,
--                       nic jiného o dítěti druhá appka nedostane). Jednorázový kód je uložený jen jako hash.
-- vysledky_testy      = body z testů nanečisto po tématech, které poslalo Vyhodnocení testů.
-- procvicovani        = souhrn každého dokončeného tréninku po tématech (počet, správně, čas),
--                       ze kterého se Vyhodnocení testů posílá souhrn „kolik a co procvičil(a)“.
-- Zapisuje do prvních dvou jen server (service role). Žák vidí jen svoje řádky.

CREATE TABLE IF NOT EXISTS vysledky_propojeni (
  link_id        UUID PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  g              TEXT NOT NULL CHECK (g IN ('m5', 'm9')),
  kod_hash       TEXT UNIQUE,
  kod_plati_do   TIMESTAMPTZ,
  kod_pouzit_at  TIMESTAMPTZ,
  vytvoreno_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  zruseno_at     TIMESTAMPTZ,
  zrusil         TEXT CHECK (zrusil IN ('zak', 'vysledky', 'nove'))
);
CREATE INDEX IF NOT EXISTS vysledky_propojeni_user_idx ON vysledky_propojeni (user_id);

ALTER TABLE vysledky_propojeni ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vysledky_propojeni_select_own" ON vysledky_propojeni;
CREATE POLICY "vysledky_propojeni_select_own" ON vysledky_propojeni FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS vysledky_testy (
  link_id     UUID NOT NULL REFERENCES vysledky_propojeni(link_id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  g           TEXT NOT NULL CHECK (g IN ('m5', 'm9')),
  test_n      INT NOT NULL,
  test_d      DATE NOT NULL,
  dalsi       DATE,
  celkem      JSONB,
  temata      JSONB NOT NULL,
  prijato_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (link_id, test_d)
);
CREATE INDEX IF NOT EXISTS vysledky_testy_user_idx ON vysledky_testy (user_id, test_d DESC);

ALTER TABLE vysledky_testy ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vysledky_testy_select_own" ON vysledky_testy;
CREATE POLICY "vysledky_testy_select_own" ON vysledky_testy FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS procvicovani (
  id       BIGSERIAL PRIMARY KEY,
  user_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  datum    DATE NOT NULL,
  kdy      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sekund   INT NOT NULL DEFAULT 0 CHECK (sekund >= 0 AND sekund <= 86400),
  temata   JSONB NOT NULL
);
CREATE INDEX IF NOT EXISTS procvicovani_user_datum_idx ON procvicovani (user_id, datum);

ALTER TABLE procvicovani ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "procvicovani_select_own" ON procvicovani;
CREATE POLICY "procvicovani_select_own" ON procvicovani FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "procvicovani_insert_own" ON procvicovani;
CREATE POLICY "procvicovani_insert_own" ON procvicovani FOR INSERT WITH CHECK (auth.uid() = user_id);
