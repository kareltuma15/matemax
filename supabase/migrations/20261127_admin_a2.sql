-- Admin 2.1, fáze A2: nový admin na /admin/novy (Dnes, Žáci, karta žáka, nastavení, plán týdne)
-- Spustit v Supabase SQL Editoru PŘED nasazením kódu. Idempotentní (jde pustit znovu).
--
-- Jedna definice, jeden výpočet (DA-01):
--   admin_zaci()          = jeden řádek na žáka se vším, co o něm admin potřebuje (bez testovacích účtů a admina)
--   admin_aktivita(od)    = dny, kdy žák trénoval (dokončený trénink, test, diagnostika, výzva…), pražský den
-- Všechny stránky nového adminu, export i dlaždice počítají z těchto dvou funkcí (src/lib/admin2/metriky.ts).
--
-- Tabulky adminu (čte a píše jen server):
--   admin_nastaveni        = cíle sezóny, prahy, názvy kampaní, segmenty, poslední návštěva adminu…
--   admin_ukoly            = úkoly (plán týdne), i z doporučení
--   admin_doporuceni_stav  = vyřízené / odložené / skryté doporučení, palec nahoru a dolů
--   admin_poznamky, admin_stitky = poznámky a štítky u žáka
--   admin_pouziti          = které sekce adminu Karel otevírá (admin se učí)

CREATE TABLE IF NOT EXISTS admin_nastaveni (
  klic        TEXT PRIMARY KEY CHECK (char_length(klic) <= 60),
  hodnota     JSONB NOT NULL,
  upraveno_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE admin_nastaveni ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS admin_ukoly (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nazev       TEXT NOT NULL CHECK (char_length(nazev) BETWEEN 1 AND 200),
  popis       TEXT CHECK (char_length(popis) <= 4000),
  zaci        UUID[] NOT NULL DEFAULT '{}',
  priorita    SMALLINT NOT NULL DEFAULT 2 CHECK (priorita BETWEEN 1 AND 3),
  termin      DATE,
  stav        TEXT NOT NULL DEFAULT 'novy' CHECK (stav IN ('novy', 'delam', 'hotovo', 'odlozeno')),
  tento_tyden BOOLEAN NOT NULL DEFAULT TRUE,
  zdroj       TEXT CHECK (char_length(zdroj) <= 80),      -- ručně / klíč doporučení
  poznamka    TEXT CHECK (char_length(poznamka) <= 2000), -- výsledek
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hotovo_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS admin_ukoly_stav_idx ON admin_ukoly (stav, created_at DESC);
ALTER TABLE admin_ukoly ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS admin_doporuceni_stav (
  klic        TEXT PRIMARY KEY CHECK (char_length(klic) <= 200),  -- pravidlo:dotčení žáci
  pravidlo    TEXT NOT NULL CHECK (char_length(pravidlo) <= 60),
  stav        TEXT CHECK (stav IN ('hotovo', 'odlozeno', 'skryto')),
  do_kdy      TIMESTAMPTZ,                                       -- odloženo do / vrátí se po
  duvod       TEXT CHECK (char_length(duvod) <= 300),
  palec       SMALLINT CHECK (palec IN (-1, 1)),
  upraveno_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE admin_doporuceni_stav ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS admin_poznamky (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text        TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 2000),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS admin_poznamky_user_idx ON admin_poznamky (user_id, created_at DESC);
ALTER TABLE admin_poznamky ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS admin_stitky (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stitek      TEXT NOT NULL CHECK (char_length(stitek) BETWEEN 1 AND 40),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, stitek)
);
ALTER TABLE admin_stitky ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS admin_pouziti (
  den    DATE NOT NULL,
  sekce  TEXT NOT NULL CHECK (char_length(sekce) <= 40),
  pocet  INT NOT NULL DEFAULT 1,
  PRIMARY KEY (den, sekce)
);
ALTER TABLE admin_pouziti ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION admin_pouziti_pricti(p_sekce TEXT) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO admin_pouziti (den, sekce, pocet) VALUES ((NOW() AT TIME ZONE 'Europe/Prague')::date, left(p_sekce, 40), 1)
  ON CONFLICT (den, sekce) DO UPDATE SET pocet = admin_pouziti.pocet + 1;
$$;

-- ═════════ admin_aktivita: dny, kdy žák trénoval ═════════
-- Trénoval = dokončil aspoň 1 trénink (sessions, procvicovani, training_completed), test (mock_test_completed),
-- diagnostiku nebo odpověděl na úlohu (odpovedi). Otevřená stránka nestačí.
CREATE OR REPLACE FUNCTION admin_aktivita(p_od DATE)
RETURNS TABLE (user_id UUID, den DATE, druh TEXT, pocet INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT x.user_id, x.den, x.druh, SUM(x.n)::int
  FROM (
    SELECT s.user_id, s.date AS den, 'trenink'::text AS druh, 1 AS n FROM sessions s WHERE s.date >= p_od
    UNION ALL
    SELECT p.user_id, p.datum, 'trenink', 1 FROM procvicovani p WHERE p.datum >= p_od
    UNION ALL
    SELECT o.user_id, (o.created_at AT TIME ZONE 'Europe/Prague')::date,
           CASE WHEN o.rezim IN ('diagnostika') THEN 'diagnostika' WHEN o.rezim = 'test' THEN 'test' ELSE 'trenink' END, 1
    FROM odpovedi o WHERE o.created_at >= (p_od::timestamp AT TIME ZONE 'Europe/Prague')
    UNION ALL
    SELECT e.user_id, (e.created_at AT TIME ZONE 'Europe/Prague')::date,
           CASE e.event_name WHEN 'diagnostic_completed' THEN 'diagnostika' WHEN 'mock_test_completed' THEN 'test' ELSE 'trenink' END, 1
    FROM analytics_events e
    WHERE e.user_id IS NOT NULL AND e.event_name IN ('training_completed', 'diagnostic_completed', 'mock_test_completed')
      AND e.created_at >= (p_od::timestamp AT TIME ZONE 'Europe/Prague')
  ) x
  GROUP BY x.user_id, x.den, x.druh;
$$;

-- ═════════ admin_zaci: jeden řádek na žáka ═════════
-- Vylučuje testovací účty (app_metadata.testovaci) a admina (admin_role). Rodičovské účty bez třídy a bez aktivity taky.
CREATE OR REPLACE FUNCTION admin_zaci()
RETURNS TABLE (
  id UUID, email TEXT, jmeno TEXT, trida SMALLINT, registrace TIMESTAMPTZ, zdroj TEXT, odkud TEXT,
  email_overen TIMESTAMPTZ, posledni_prihlaseni TIMESTAMPTZ,
  diagnostika TIMESTAMPTZ, prvni_trenink TIMESTAMPTZ, posledni_aktivita DATE,
  dny_7 INT, dny_celkem INT, odpovedi INT, spravne INT,
  vratil_2den BOOLEAN, premium TEXT, premium_do TIMESTAMPTZ,
  souhlas_podminky TIMESTAMPTZ, souhlas_novinky BOOLEAN, prezdivka TEXT, rodic_email TEXT,
  propojeno_vysledky TIMESTAMPTZ, odhlasen_emaily BOOLEAN
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  WITH u AS (
    SELECT au.* FROM auth.users au
    WHERE COALESCE((au.raw_app_meta_data->>'testovaci')::boolean, FALSE) = FALSE
      AND NOT EXISTS (SELECT 1 FROM admin_role r WHERE r.user_id = au.id)
  ),
  akt AS (SELECT a.user_id, a.den FROM admin_aktivita('2026-01-01') a GROUP BY a.user_id, a.den),
  dnes AS (SELECT (NOW() AT TIME ZONE 'Europe/Prague')::date AS d),
  trenink AS (
    SELECT t.user_id, MIN(t.kdy) AS prvni FROM (
      SELECT p.user_id, p.kdy FROM procvicovani p
      UNION ALL SELECT e.user_id, e.created_at FROM analytics_events e WHERE e.event_name = 'training_completed' AND e.user_id IS NOT NULL
      UNION ALL SELECT o.user_id, o.created_at FROM odpovedi o WHERE o.rezim IN ('trenink', 'opakovani', 'chyby')
    ) t GROUP BY t.user_id
  ),
  diag AS (
    SELECT d.user_id, MIN(d.kdy) AS kdy FROM (
      SELECT e.user_id, e.created_at AS kdy FROM analytics_events e WHERE e.event_name = 'diagnostic_completed' AND e.user_id IS NOT NULL
      UNION ALL SELECT uo.user_id, uo.diagnostic_completed_at FROM user_onboarding uo WHERE uo.diagnostic_completed_at IS NOT NULL
      UNION ALL SELECT dr.user_id, MIN(dr.updated_at) FROM diagnostic_results dr GROUP BY dr.user_id
    ) d GROUP BY d.user_id
  ),
  odp AS (
    SELECT p.user_id, SUM((t->>'n')::int) AS n, SUM((t->>'ok')::int) AS ok
    FROM procvicovani p, jsonb_array_elements(COALESCE(p.temata::jsonb, '[]'::jsonb)) t GROUP BY p.user_id
  ),
  souhl AS (
    SELECT s.user_id,
      MAX(s.created_at) FILTER (WHERE s.druh = 'podminky' AND s.udelen) AS podminky,
      (ARRAY_AGG(s.udelen ORDER BY s.created_at DESC) FILTER (WHERE s.druh = 'novinky_email'))[1] AS novinky
    FROM souhlasy s GROUP BY s.user_id
  )
  SELECT
    u.id, u.email::text,
    NULLIF(COALESCE(u.raw_user_meta_data->>'first_name', u.raw_user_meta_data->>'full_name', ''), ''),
    CASE WHEN u.raw_user_meta_data->>'trida' = '5' THEN 5 ELSE 9 END::smallint,
    u.created_at,
    u.raw_user_meta_data->>'zdroj',
    u.raw_user_meta_data->>'odkud',
    u.email_confirmed_at, u.last_sign_in_at,
    diag.kdy, trenink.prvni,
    (SELECT MAX(a.den) FROM akt a WHERE a.user_id = u.id),
    (SELECT COUNT(*) FROM akt a, dnes WHERE a.user_id = u.id AND a.den > dnes.d - 7)::int,
    (SELECT COUNT(*) FROM akt a WHERE a.user_id = u.id)::int,
    COALESCE(odp.n, 0)::int, COALESCE(odp.ok, 0)::int,
    EXISTS (SELECT 1 FROM akt a WHERE a.user_id = u.id AND a.den = (u.created_at AT TIME ZONE 'Europe/Prague')::date + 1),
    CASE
      WHEN up.is_premium AND (up.trial_expires_at IS NULL OR up.trial_expires_at > NOW()) AND up.stripe_subscription_id IS NOT NULL THEN 'stripe'
      WHEN up.is_premium AND (up.trial_expires_at IS NULL OR up.trial_expires_at > NOW()) AND up.trial_granted_by LIKE 'admin%' THEN 'rucne'
      WHEN up.is_premium AND (up.trial_expires_at IS NULL OR up.trial_expires_at > NOW()) THEN 'zkusebni'
      ELSE 'zdarma' END,
    CASE WHEN up.is_premium THEN up.trial_expires_at END,
    souhl.podminky, souhl.novinky,
    u.raw_user_meta_data->>'prezdivka',
    (SELECT pcl.parent_email FROM parent_child_link pcl WHERE pcl.child_user_id = u.id AND pcl.verified ORDER BY pcl.verified_at DESC NULLS LAST LIMIT 1),
    (SELECT MIN(vp.vytvoreno_at) FROM vysledky_propojeni vp WHERE vp.user_id = u.id AND vp.zruseno_at IS NULL),
    COALESCE((u.raw_app_meta_data->'emaily'->>'odhlaseno')::boolean, FALSE)
  FROM u
  LEFT JOIN trenink ON trenink.user_id = u.id
  LEFT JOIN diag ON diag.user_id = u.id
  LEFT JOIN odp ON odp.user_id = u.id
  LEFT JOIN souhl ON souhl.user_id = u.id
  LEFT JOIN user_premium up ON up.user_id = u.id;
$$;

-- Jen server (service role) smí funkce volat
REVOKE ALL ON FUNCTION admin_zaci() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION admin_aktivita(DATE) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION admin_pouziti_pricti(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_zaci() TO service_role;
GRANT EXECUTE ON FUNCTION admin_aktivita(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION admin_pouziti_pricti(TEXT) TO service_role;

-- Kontrola: počet žáků a dnů aktivity
SELECT (SELECT COUNT(*) FROM admin_zaci()) AS zaku, (SELECT COUNT(*) FROM admin_aktivita('2026-01-01')) AS radku_aktivity;
