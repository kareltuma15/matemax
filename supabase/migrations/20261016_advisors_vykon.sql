-- Oprava varování z Supabase Performance Advisor (16. 10. 2026):
--   37× „Auth RLS Initialization Plan“ — politiky volají auth.uid() pro KAŽDÝ řádek; zabalené do (select auth.uid())
--      se vyhodnotí jednou za dotaz. Chování politik se nemění, jen rychlost.
--   5× „Unindexed foreign keys“ — chybí indexy na sloupcích s cizím klíčem.
-- Bezpečné: politiky se jen přepíšou, původní znění se předem uloží do tabulky _policy_backup_20261016.
-- Spustit v Supabase → SQL Editor → New query → vložit celé → Run. Potom Advisors → Refresh.

-- 1) Záloha všech současných politik (zůstává jako „pojistka“, klientům je skrytá — RLS bez politiky)
CREATE TABLE IF NOT EXISTS public._policy_backup_20261016 AS
  SELECT now() AS saved_at, * FROM pg_policies WHERE schemaname = 'public';
ALTER TABLE public._policy_backup_20261016 ENABLE ROW LEVEL SECURITY;

-- 2) Přepsání politik: auth.uid() → (select auth.uid()), totéž pro auth.jwt() a auth.role()
DO $$
DECLARE
  p record;
  new_qual text;
  new_chk  text;
  stmt     text;
  n        int := 0;
BEGIN
  FOR p IN SELECT * FROM pg_policies WHERE schemaname = 'public' LOOP
    new_qual := p.qual;
    new_chk  := p.with_check;

    IF new_qual IS NOT NULL AND new_qual ~ 'auth\.(uid|jwt|role)\(\)' AND new_qual !~* 'select\s+auth\.' THEN
      new_qual := regexp_replace(new_qual, 'auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g');
    END IF;
    IF new_chk IS NOT NULL AND new_chk ~ 'auth\.(uid|jwt|role)\(\)' AND new_chk !~* 'select\s+auth\.' THEN
      new_chk := regexp_replace(new_chk, 'auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'g');
    END IF;

    IF new_qual IS DISTINCT FROM p.qual OR new_chk IS DISTINCT FROM p.with_check THEN
      stmt := format('ALTER POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
      IF new_qual IS NOT NULL THEN stmt := stmt || ' USING (' || new_qual || ')'; END IF;
      IF new_chk  IS NOT NULL THEN stmt := stmt || ' WITH CHECK (' || new_chk || ')'; END IF;
      EXECUTE stmt;
      n := n + 1;
    END IF;
  END LOOP;
  RAISE NOTICE 'Přepsáno politik: %', n;
END $$;

-- 3) Chybějící indexy na cizích klíčích
CREATE INDEX IF NOT EXISTS idx_parent_child_link_child_user_id ON public.parent_child_link (child_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_messages_child_user_id   ON public.parent_messages (child_user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id      ON public.push_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id                ON public.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id           ON public.user_feedback (user_id);

-- Návrat (kdyby něco nesedělo): původní znění politiky je ve sloupcích qual a with_check tabulky
-- public._policy_backup_20261016 — stačí ho pro danou politiku vrátit příkazem ALTER POLICY ... USING (...) WITH CHECK (...).
