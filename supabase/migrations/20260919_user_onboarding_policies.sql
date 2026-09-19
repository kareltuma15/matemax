-- ═══════════════════════════════════════════════════════════════════════
-- user_onboarding: klient zapisuje vlastní stav (audit 2026-09-19)
--
-- Registrace, obrazovka „Vítej" i dokončení první session dělají z prohlížeče
-- UPSERT do user_onboarding (onConflict: "user_id"), ale tabulka měla jen SELECT
-- politiku, takže RLS všechny zápisy potichu odmítala.
--
-- Uživatel smí zapisovat jen svůj vlastní řádek. Nic z toho nerozhoduje o přístupu
-- ani o penězích (jde o stav onboardingu). SPUSTIT RUČNĚ v SQL Editoru. Idempotentní.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "onboarding_insert_own" ON public.user_onboarding;
DROP POLICY IF EXISTS "onboarding_update_own" ON public.user_onboarding;

CREATE POLICY "onboarding_insert_own" ON public.user_onboarding
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "onboarding_update_own" ON public.user_onboarding
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- upsert s onConflict: "user_id" potřebuje unikátní klíč (přeskočí se, když už je
-- nebo když by ho zablokovaly duplicity)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = 'public.user_onboarding'::regclass AND i.indisunique
      AND i.indnatts = 1 AND (SELECT attname FROM pg_attribute
           WHERE attrelid = i.indrelid AND attnum = i.indkey[0]) = 'user_id'
  ) THEN
    RAISE NOTICE 'Unikátní klíč na user_id už existuje.';
  ELSIF EXISTS (SELECT 1 FROM public.user_onboarding GROUP BY user_id HAVING count(*) > 1) THEN
    RAISE NOTICE 'PŘESKOČENO: v user_onboarding jsou duplicitní user_id, nejdřív je je potřeba sloučit.';
  ELSE
    CREATE UNIQUE INDEX user_onboarding_user_uidx ON public.user_onboarding (user_id);
    RAISE NOTICE 'Vytvořen unikátní index user_onboarding_user_uidx.';
  END IF;
END $$;

-- Kontrola
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_onboarding' ORDER BY cmd;
