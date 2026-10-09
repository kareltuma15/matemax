# Supabase — přehled pro Karla (stav k 9. 10. 2026)

Projekt: `pkjckadolkoosoblagvr` (https://supabase.com/dashboard/project/pkjckadolkoosoblagvr).
Všechna čísla jsou souhrny z čtecího průzkumu (service role, nic se nezměnilo). **Žádné e-maily ani jména zde nejsou.**

## 1. Kde jsou uživatelé a jak se jmenují

| Co | Kde |
|---|---|
| **Účty (e-mail, datum registrace, poslední přihlášení)** | Supabase → **Authentication → Users** (tabulka `auth.users`, v SQL editoru `select * from auth.users`). Tohle je „seznam uživatelů“. |
| **Jméno** | Není ve vlastním sloupci, ale v `raw_user_meta_data` toho účtu: `first_name`, `last_name`, `full_name`. Vyplněné má jen **2 z 9** účtů — aplikace jméno nevyžaduje. |
| **Přehled v appce** | `https://matemax.matematika-snadno.cz/admin` (přihlas se `karel.tuma15@gmail.com`). Od 9. 10. ukazuje jméno, e-mail, plán (Premium / Trial / Zdarma), registraci, poslední trénink a přihlášení, počet odpovědí a úspěšnost. |
| Přezdívka a emoji v žebříčku | `weekly_leaderboard` (nickname, avatar_emoji) a `user_metadata.avatar_emoji` |

**Počty (9. 10. 2026):** celkem **9 účtů** (8 z května 2026, 1 ze září), 8 s potvrzeným e-mailem, všichni přes e-mail+heslo. Za posledních 30 dní se přihlásili **4**, za 7 dní **0**, 1 se nepřihlásil nikdy. Z toho jsou nejméně 2 vaše vlastní/testovací účty — **skutečných cizích uživatelů je zatím jen několik.**

## 2. Jak uživatelé procvičují (kde jsou data o tréninku)

Postup se ukládá nejdřív v prohlížeči (localStorage) a po přihlášení se zrcadlí do Supabase (`ProgressSync` při přihlášení stáhne postup zpět). Co je kde:

| Otázka | Tabulka |
|---|---|
| Kolikrát trénoval, kdy, kolik správně | `sessions` (jeden řádek = jeden trénink: datum, XP, správně, celkem) |
| Které konkrétní příklady umí/neumí a kdy je opakovat | `sm2_cards` (opakovací karta na příklad: interval, ease, další opakování) |
| Výsledek diagnostiky podle témat | `diagnostic_results` (téma, správně, celkem) |
| XP, úroveň, série dní | `user_xp` |
| Získané odznaky | `user_badges`; herní stav (cíle, mise…) `user_gamification` (JSON) |
| Co dělali v appce (událost) | `analytics_events` (dnes jen `session_completed` a `diagnostika_dokoncena`) |
| Kde v onboardingu skončili | `user_onboarding` |

**Realita dat:** v `sessions` jsou celkem jen **3 řádky** (všechny cizího uživatele, 2× 6. 10. a 1× 20. 9., vždy 7/7), v `sm2_cards` 21 karet jednoho uživatele, v `diagnostic_results` 34 řádků (26 vaše, 8 cizí). Důvod nízkých čísel: do 19. 9. se `sessions`/`sm2_cards` kvůli chybnému cizímu klíči tiše nezapisovaly (opraveno migrací), a hlavně — uživatelů je málo.

## 3. Všech 24 tabulek jednou větou

| Tabulka | Řádků | K čemu je | Stav |
|---|---:|---|---|
| `user_xp` | 4 | XP, úroveň, série (streak), „zmrazení“ série | používá se |
| `user_gamification` | 3 | JSON stav her (mise, cíle) | používá se |
| `user_badges` | 18 | které odznaky kdo získal | používá se |
| `sessions` | 3 | jeden trénink = jeden řádek | používá se |
| `sm2_cards` | 21 | opakování (SM-2) po příkladech | používá se |
| `diagnostic_results` | 34 | diagnostika po tématech | používá se |
| `user_onboarding` | 5 | kroky onboardingu (registrace → diagnostika → první trénink → rodič) | používá se (zápisy po migraci z 19. 9.) |
| `user_premium` | 3 | Premium/trial + Stripe ID zákazníka a předplatného | používá se, kritická |
| `referrals` | 0 | doporučení kamaráda → 7 dní trial | nikdy nepoužito, netestováno s reálným uživatelem |
| `push_subscriptions` | 0 | adresy pro push notifikace | nikdo zatím nepovolil (iPhone ověřit) |
| `weekly_leaderboard` | 0 | týdenní výzva — žebříček s přezdívkou | zatím prázdné |
| `parent_child_link` | 4 | propojení rodič (e-mail) ↔ dítě, s ověřovacím tokenem | používá se |
| `parent_settings` | 1 | rodičovy volby reportů (frekvence, den, upozornění na nečinnost) | používá se |
| `parent_messages` | 0 | zprávy od rodiče dítěti | zatím prázdné |
| `parent_subscriptions` | 0 | starší přihláška rodiče k reportům (e-mail rodiče + dítěte) | pravděpodobně nahrazeno `parent_child_link` |
| `premium_waitlist` | 1 | e-maily zájemců o Premium | používá se |
| `user_feedback` | 1 | hodnocení + nápad od žáka | používá se |
| `analytics_events` | 16 | jednoduché události (bez cookies třetích stran) | používá se |
| `online_test_sessions` | 2 | termíny online testů nanečisto | používá se (zatím vaše testovací) |
| `online_test_enrollments` | 2 | kdo se přihlásil / zaplatil | používá se (oba řádky vaše) |
| `online_test_submissions` | 1 | odevzdané fotky řešení + body po tématech + komentář | používá se |
| `users` | 0 | **starý** `public.users` (zbytek po původním FK) | **nepoužívá se** — lze smazat |
| `xp_transactions` | 0 | historie XP (nikde v kódu) | **nepoužívá se** — lze smazat |
| `weekly_report_queue` | 0 | fronta týdenních reportů rodičům | **nepoužívá se** (cron `weekly-parent-report` ji nečte) |

Kód navíc odkazuje na tabulku `user_progress`, která v databázi **neexistuje** (jediné místo: záložní čtení přezdívky v `/api/weekly-challenge/submit`; selže tiše). Úložiště souborů (**Storage**): bucket `submissions` (fotky řešení online testů).

## 4. Zabezpečení (RLS)

- Row Level Security je zapnuté na všech tabulkách (potvrzeno výpisem `pg_policies` 19. 9.). Anonymní návštěvník nevidí nic kromě publikovaných `online_test_sessions`.
- Zápisy z aplikace jdou na citlivá místa přes server (service role): `user_premium`, `referrals`, `push_subscriptions`. Žák si **nemůže sám nastavit Premium** — politika dovoluje jen zrušit vlastní trial (`is_premium=false`).
- Veřejné vkládání (`premium_waitlist`, `parent_subscriptions`, `user_feedback` bez uživatele) nemá rate-limit → viz doporučení v `docs/INTEGRACE-navrhy-2026-10.md`.
- `supabase/rls_audit.sql` **nespouštět** (smaže politiky novějších tabulek).

## 5. Nálezy a doporučení

1. **Skoro žádný reálný provoz.** 9 účtů, 4 aktivní za 30 dní, 3 tréninky u cizích uživatelů. Veřejný text „Již 500+ žáků procvičuje každý den“ je nepravdivý (návrh opravy je ve Schvalování). Nejdůležitější úkol není technika, ale přivést první desítky uživatelů a sledovat, kde odpadají.
2. **Zálohy:** ověřte v Supabase → Project Settings → Database → Backups, jaký plán máte (u bezplatného plánu nejsou denní zálohy pro obnovu). Před prvními platícími zákazníky doporučuji plán Pro (zálohy + možnost obnovy k časovému bodu).
3. **Úklid:** `users`, `xp_transactions`, `weekly_report_queue` jsou nepoužité → po zálohách smazat; odkaz na `user_progress` odstranit z kódu. Nedělat bez schválení.
4. **Jméno uživatele** je dobrovolné → v admin přehledu proto často chybí. Zvažte pole „Jak ti říkat?“ při registraci (osobnější e-maily, push i report rodičům).
5. **Diagnostika** má v `diagnostic_results` stará jména témat (`mocniny`, `pomer_meritko`, `logicke_ulohy`) z doby před sjednocením na 9 témat — nová diagnostika už je zapisuje jinak; staré řádky nevadí.
6. **Supabase Advisors:** v dashboardu Database → Advisors (Security + Performance) spusťte kontrolu a výsledky mi pošlete; je zdarma a najde chybějící indexy a politiky.
