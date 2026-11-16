-- Sbírka MateMax: záloha krystalů a odměn (Hexík, truhly). 1. etapa herního systému.
-- Spustit v Supabase SQL Editoru (projekt MateMax).
--
-- Stav žije v prohlížeči žáka a sem se zálohuje, aby po odhlášení nebo na jiném zařízení nezmizel.
-- Ukládá se celý stav jako JSONB (krystaly získané a utracené, odměny, nasazené věci, pojistka truhel,
-- denní počty odpovědí). Žádné jméno ani e-mail, jen čísla a klíče odměn.

CREATE TABLE IF NOT EXISTS user_sbirka (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_sbirka ENABLE ROW LEVEL SECURITY;

-- Žák čte a zapisuje jen vlastní řádek
DROP POLICY IF EXISTS "sbirka_select_own" ON user_sbirka;
CREATE POLICY "sbirka_select_own" ON user_sbirka
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "sbirka_insert_own" ON user_sbirka;
CREATE POLICY "sbirka_insert_own" ON user_sbirka
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sbirka_update_own" ON user_sbirka;
CREATE POLICY "sbirka_update_own" ON user_sbirka
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
