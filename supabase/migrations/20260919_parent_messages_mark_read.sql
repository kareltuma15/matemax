-- ═══════════════════════════════════════════════════════════════════════
-- Oprava: dítě nemohlo označit zprávu od rodiče za přečtenou (audit 2026-09-19)
--
-- LoggedInDashboard.markMessageRead() dělá UPDATE parent_messages SET read_at = ...,
-- ale tabulka měla jen SELECT politiku. RLS takový UPDATE potichu odmítne (0 řádků,
-- bez chyby), takže se zpráva (načítá se s read_at IS NULL) zobrazovala pořád dokola.
--
-- Řešení: UPDATE povolen jen na vlastní řádky a jen na sloupec read_at
-- (sloupcový grant), takže dítě nemůže přepsat text zprávy ani adresáta.
-- SPUSTIT RUČNĚ v Supabase SQL Editoru. Idempotentní.
-- ═══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "pmsg_mark_read" ON public.parent_messages;
CREATE POLICY "pmsg_mark_read" ON public.parent_messages
  FOR UPDATE TO authenticated
  USING (auth.uid() = child_user_id)
  WITH CHECK (auth.uid() = child_user_id);

REVOKE UPDATE ON public.parent_messages FROM anon, authenticated;
GRANT  UPDATE (read_at) ON public.parent_messages TO authenticated;

-- Kontrola
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'parent_messages';
