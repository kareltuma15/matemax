-- Záloha gamifikace na server (nález #17)
-- Spustit v Supabase SQL Editoru
--
-- Proč: `topicStats` (úspěšnost po tématech) žila jen v localStorage a na server
-- se neposílala vůbec. Odhlášení lokální data maže, takže byla nenávratně pryč —
-- a s ní připravenost, slabá místa i skóre v mapě učení.
--
-- Ukládáme celý GamificationState jako JSONB: struktura se občas mění a nemá
-- smysl kvůli tomu pokaždé měnit schéma. Dotazovat se nad tím nepotřebujeme —
-- pro reporty slouží tabulky `sessions` a `diagnostic_results`.

CREATE TABLE IF NOT EXISTS user_gamification (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

-- Žák čte a zapisuje jen vlastní řádek
DROP POLICY IF EXISTS "gamification_select_own" ON user_gamification;
CREATE POLICY "gamification_select_own" ON user_gamification
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "gamification_insert_own" ON user_gamification;
CREATE POLICY "gamification_insert_own" ON user_gamification
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "gamification_update_own" ON user_gamification;
CREATE POLICY "gamification_update_own" ON user_gamification
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── SM-2 karty: doplnit chybějící stav ───────────────────────────────────────
-- Tabulka držela jen interval/ease/next_review. `repetitions` a `last_quality`
-- se nikam neukládaly, takže po obnovení ze serveru by se ztratila informace
-- o tom, co už žák zvládl — a s ní i odemykání obtížností (unlockedMaxLevel
-- čte právě last_quality).

ALTER TABLE sm2_cards
  ADD COLUMN IF NOT EXISTS repetitions  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_quality INTEGER DEFAULT 0;
