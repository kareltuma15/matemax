-- Plán po testu nanečisto (propojení s appkou Vyhodnocení testů, krok 1)
-- Spustit v Supabase SQL Editoru.
--
-- Žák si doporučení z odkazu po testu uloží „do plánu“. Jeden plán na účet: novější doporučení
-- přepíše starší. `doporuceni` = ověřená data z odkazu (jen témata a čísla, žádné jméno ani e-mail),
-- `zaklad` = kolik měl žák v doporučených tématech správně v okamžiku uložení (pro splnění plánu).

CREATE TABLE IF NOT EXISTS plan_po_testu (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  zdroj       TEXT NOT NULL DEFAULT 'nanecisto',
  doporuceni  JSONB NOT NULL,
  zaklad      JSONB NOT NULL DEFAULT '{}'::jsonb,
  ulozeno_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  splneno_at  TIMESTAMPTZ
);

ALTER TABLE plan_po_testu ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_po_testu_select_own" ON plan_po_testu;
CREATE POLICY "plan_po_testu_select_own" ON plan_po_testu FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "plan_po_testu_insert_own" ON plan_po_testu;
CREATE POLICY "plan_po_testu_insert_own" ON plan_po_testu FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "plan_po_testu_update_own" ON plan_po_testu;
CREATE POLICY "plan_po_testu_update_own" ON plan_po_testu FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "plan_po_testu_delete_own" ON plan_po_testu;
CREATE POLICY "plan_po_testu_delete_own" ON plan_po_testu FOR DELETE USING (auth.uid() = user_id);
