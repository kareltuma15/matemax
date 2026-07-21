# Migrace databáze — co spustit a jak ověřit

> **Stav k 17. 7. 2026: všechny migrace jsou spuštěné. Nemusíš nic dělat.**
> Ověřeno přímo proti databázi — viz „Jak si to ověříš sám" níže.

Supabase migrace se v tomhle projektu pouštějí **ručně** v SQL editoru (nemáme
`DATABASE_URL`, takže je Claude spustit nemůže). Tenhle dokument je jediné místo,
kde se dozvíš co, kam a jak ověřit.

---

## Jak se migrace pouští (obecný postup)

1. [supabase.com](https://supabase.com) → tvůj projekt
2. Levé menu → **SQL Editor** → tlačítko **New query**
3. Vlož obsah příslušného `.sql` souboru
4. **Run** (nebo Ctrl+Enter) → má napsat „Success"

Všechny migrace jsou psané jako **idempotentní** (`IF NOT EXISTS`, `DROP POLICY
IF EXISTS`). Pustit je podruhé nic nerozbije — když si nejsi jistý, prostě to
pusť znovu.

---

## Jak si to ověříš sám

Tohle vlož do SQL editoru a dej Run. Vypíše, co v databázi je:

```sql
-- Kontrola: existují tabulky a sloupce z posledních migrací?
select
  to_regclass('public.user_gamification') is not null            as ma_user_gamification,
  to_regclass('public.online_test_sessions') is not null         as ma_online_testy,
  exists (select 1 from information_schema.columns
          where table_name='sm2_cards' and column_name='repetitions')      as ma_sm2_repetitions,
  exists (select 1 from information_schema.columns
          where table_name='sm2_cards' and column_name='last_quality')     as ma_sm2_last_quality,
  exists (select 1 from information_schema.columns
          where table_name='online_test_enrollments'
            and column_name='reminder_24h_sent_at')                        as ma_notifikace;
```

**Všech pět sloupců musí být `true`.** Když je některý `false`, spusť odpovídající
migraci z tabulky níže.

---

## Přehled migrací

| Soubor | Co dělá | Stav |
|---|---|---|
| `20260519_referral_trial.sql` | Doporučení kamaráda + zkušební období | ✅ |
| `20260525_stripe_columns.sql` | Sloupce pro Stripe předplatné | ✅ |
| `20260527_weekly_leaderboard.sql` | Týdenní žebříček | ✅ |
| `20260528_xp_streak_column.sql` | XP a streak v `user_xp` | ✅ |
| `20260611_online_testy.sql` | Testy nanečisto — tabulky, RLS, úložiště | ✅ |
| `20260716_online_testy_notifikace.sql` | Časy odeslaných připomínek | ✅ |
| `20260717_user_gamification.sql` | **Záloha postupu** (nález #17) | ✅ |

---

## Poslední migrace — `20260717_user_gamification.sql`

Tahle je nejdůležitější, protože bez ní se po odhlášení ztrácel postup.
Kdyby ji bylo potřeba pustit znovu (nebo na jiném prostředí), tady je celá:

```sql
-- Záloha gamifikace na server (nález #17)
CREATE TABLE IF NOT EXISTS user_gamification (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state      JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_gamification ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "gamification_select_own" ON user_gamification;
CREATE POLICY "gamification_select_own" ON user_gamification
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "gamification_insert_own" ON user_gamification;
CREATE POLICY "gamification_insert_own" ON user_gamification
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "gamification_update_own" ON user_gamification;
CREATE POLICY "gamification_update_own" ON user_gamification
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- SM-2 karty: doplnit chybějící stav
ALTER TABLE sm2_cards
  ADD COLUMN IF NOT EXISTS repetitions  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_quality INTEGER DEFAULT 0;
```

---

## ⚠️ Důležité: tabulka je po migraci PRÁZDNÁ

Tohle je nejčastější zdroj zmatku. Migrace vytvoří tabulku, ale **data se do ní
zapíšou až po dokončeném tréninku**. Do té doby je prázdná — a odhlášení tak
pořád vypadá, že postup mizí.

**Správné pořadí testu obnovy postupu:**

1. Přihlaš se
2. **Dokonči jeden trénink** (celých 7 příkladů) — teprve teď se záloha zapíše
3. Zapamatuj si XP, připravenost a odznaky
4. **Odhlas se** (profil → odhlásit)
5. **Přihlas se znovu** → postup musí být zpátky

Když přeskočíš krok 2, test „selže" i s korektně spuštěnou migrací.

**Kontrola, že se záloha zapsala:**

```sql
select user_id,
       state->>'totalSolved'                                        as vyreseno,
       (select count(*) from jsonb_object_keys(state->'topicStats')) as pocet_temat,
       updated_at
from user_gamification;
```

Po prvním tréninku tam má být jeden řádek s nenulovým `vyreseno`.

---

## Co dělat, když se test nepovede

| Příznak | Nejpravděpodobnější příčina |
|---|---|
| Po přihlášení pořád „Vítej + diagnostika" | Starý service worker — DevTools → Application → Service Workers → Unregister, pak Clear site data |
| Postup se nevrátil, tabulka prázdná | Nedokončil se trénink (viz krok 2 výše) |
| Postup se nevrátil, tabulka má řádek | Chyba v obnově — pošli mi výpis z konzole prohlížeče |
| „permission denied for table" | Chybí RLS politika — pusť migraci znovu |
