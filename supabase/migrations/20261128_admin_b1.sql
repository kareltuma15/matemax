-- Admin 2.1, fáze B1: sběr dat pro Zprávy, Schránku a Zdraví systému (historie začíná dnem nasazení).
-- Spustit v Supabase SQL Editoru PŘED nasazením kódu. Idempotentní (jde pustit znovu). Nic stávajícího nemění ani nemaže.
--
--   zpravy        = log každé odeslané zprávy (e-mail přes Resend, push, vzkaz): komu, šablona, předmět, ID u služby (ZP-01)
--   zpravy_stav   = historie stavů zprávy z webhooků (doručeno, otevřeno, kliknuto, vráceno…) (ZP-02, ZP-05)
--   webhooky      = příchozí webhooky (Resend, Stripe) s ID události proti duplicitám, stav zpracování (SY-04)
--   schranka      = odpovědi na e-maily, zpětná vazba, nahlášené chyby v úlohách; stav nové / vyřízené (ZP-07)
--   chyby         = chyby z prohlížeče a ze serveru (SY-04)
--   behy_cronu    = každý běh automatické úlohy: kdy, jak dlouho, výsledek (SY-04)
-- Čte a píše jen server (service role). RLS zapnuté bez politik = klient nic nevidí.

CREATE TABLE IF NOT EXISTS zpravy (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kanal         TEXT NOT NULL CHECK (kanal IN ('email', 'push', 'vzkaz')),
  sluzba        TEXT NOT NULL DEFAULT 'resend' CHECK (char_length(sluzba) <= 20),
  sablona       TEXT NOT NULL CHECK (char_length(sablona) <= 60),
  predmet       TEXT CHECK (char_length(predmet) <= 300),
  prijemce_typ  TEXT NOT NULL CHECK (prijemce_typ IN ('zak', 'rodic', 'admin', 'jiny')),
  user_id       UUID,                                        -- žák (u rodiče dítě, ke kterému zpráva patří)
  prijemce      TEXT CHECK (char_length(prijemce) <= 320),   -- e-mail; u push NULL
  sluzba_id     TEXT CHECK (char_length(sluzba_id) <= 120),  -- ID zprávy u Resendu
  stav          TEXT NOT NULL DEFAULT 'odeslano' CHECK (char_length(stav) <= 30),
  testovaci     BOOLEAN NOT NULL DEFAULT FALSE,
  chyba         TEXT CHECK (char_length(chyba) <= 500),
  odeslano_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stav_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS zpravy_sluzba_id_idx ON zpravy (sluzba, sluzba_id) WHERE sluzba_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS zpravy_user_idx ON zpravy (user_id, odeslano_at DESC);
CREATE INDEX IF NOT EXISTS zpravy_cas_idx ON zpravy (odeslano_at DESC);
CREATE INDEX IF NOT EXISTS zpravy_prijemce_idx ON zpravy (lower(prijemce));
ALTER TABLE zpravy ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS zpravy_stav (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zprava_id   UUID NOT NULL REFERENCES zpravy(id) ON DELETE CASCADE,
  stav        TEXT NOT NULL CHECK (char_length(stav) <= 30),
  detail      TEXT CHECK (char_length(detail) <= 300),       -- u kliknutí odkaz (bez parametrů), u vrácení důvod
  cas         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS zpravy_stav_zprava_idx ON zpravy_stav (zprava_id, cas);
ALTER TABLE zpravy_stav ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS webhooky (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zdroj         TEXT NOT NULL CHECK (zdroj IN ('resend', 'stripe', 'jiny')),
  udalost_id    TEXT NOT NULL CHECK (char_length(udalost_id) <= 120),  -- svix-id / Stripe event.id
  typ           TEXT NOT NULL CHECK (char_length(typ) <= 80),
  stav          TEXT NOT NULL DEFAULT 'prijato' CHECK (stav IN ('prijato', 'zpracovano', 'ignorovano', 'chyba')),
  chyba         TEXT CHECK (char_length(chyba) <= 500),
  pokusy        SMALLINT NOT NULL DEFAULT 1,
  telo          JSONB,                                        -- zkrácená data události (bez obsahu e-mailů)
  prijato_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  zpracovano_at TIMESTAMPTZ,
  UNIQUE (zdroj, udalost_id)
);
CREATE INDEX IF NOT EXISTS webhooky_cas_idx ON webhooky (prijato_at DESC);
ALTER TABLE webhooky ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS schranka (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  druh        TEXT NOT NULL CHECK (druh IN ('odpoved', 'zpetna_vazba', 'chyba_ulohy', 'anketa', 'vzkaz')),
  user_id     UUID,
  od          TEXT CHECK (char_length(od) <= 320),           -- odesílatel (e-mail) u odpovědí
  predmet     TEXT CHECK (char_length(predmet) <= 300),
  text        TEXT CHECK (char_length(text) <= 20000),
  zprava_id   UUID REFERENCES zpravy(id) ON DELETE SET NULL, -- na kterou zprávu odpovídá
  uloha_id    TEXT CHECK (char_length(uloha_id) <= 80),      -- u nahlášené chyby
  detail      JSONB,
  stav        TEXT NOT NULL DEFAULT 'nove' CHECK (stav IN ('nove', 'vyrizeno')),
  zdroj_id    TEXT CHECK (char_length(zdroj_id) <= 120),     -- ID u zdroje (přijatý e-mail, user_feedback) proti duplicitám
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  vyrizeno_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS schranka_zdroj_idx ON schranka (druh, zdroj_id) WHERE zdroj_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS schranka_stav_idx ON schranka (stav, created_at DESC);
CREATE INDEX IF NOT EXISTS schranka_user_idx ON schranka (user_id, created_at DESC);
ALTER TABLE schranka ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS chyby (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  zdroj       TEXT NOT NULL CHECK (zdroj IN ('klient', 'server', 'cron', 'webhook')),
  otisk       TEXT NOT NULL CHECK (char_length(otisk) <= 200),   -- stejná chyba = stejný otisk
  zprava      TEXT NOT NULL CHECK (char_length(zprava) <= 500),
  cesta       TEXT CHECK (char_length(cesta) <= 200),            -- šablona trasy, bez parametrů
  user_id     UUID,
  detail      JSONB,
  cas         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS chyby_cas_idx ON chyby (cas DESC);
CREATE INDEX IF NOT EXISTS chyby_otisk_idx ON chyby (otisk, cas DESC);
ALTER TABLE chyby ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS behy_cronu (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  uloha       TEXT NOT NULL CHECK (char_length(uloha) <= 60),
  zacatek     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  konec       TIMESTAMPTZ,
  ok          BOOLEAN,
  vysledek    JSONB,
  chyba       TEXT CHECK (char_length(chyba) <= 500)
);
CREATE INDEX IF NOT EXISTS behy_cronu_idx ON behy_cronu (uloha, zacatek DESC);
ALTER TABLE behy_cronu ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON zpravy, zpravy_stav, webhooky, schranka, chyby, behy_cronu FROM anon, authenticated;

-- Kontrola po spuštění: všech 6 tabulek existuje
SELECT 'zpravy' AS tabulka, count(*) FROM zpravy
UNION ALL SELECT 'zpravy_stav', count(*) FROM zpravy_stav
UNION ALL SELECT 'webhooky', count(*) FROM webhooky
UNION ALL SELECT 'schranka', count(*) FROM schranka
UNION ALL SELECT 'chyby', count(*) FROM chyby
UNION ALL SELECT 'behy_cronu', count(*) FROM behy_cronu;
