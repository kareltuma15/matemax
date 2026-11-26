# Plán měření MateMaxu

Platí od 26. 11. 2026 (admin 2.1, fáze A1). Kód plánu je v `src/lib/mereni-plan.ts`. Testy v `e2e/admin-a1.spec.ts` hlídají, že kód a tenhle dokument sedí.

## Pravidla

- **Název události** je předmět_akce v minulém čase, snake_case, anglicky (`page_viewed`, `training_completed`).
- **Z adresy** se ukládá jen šablona trasy (`/admin/testy/:id`) a povolené parametry: `tema`, `dovednost`, `uroven`, `trida`, `rezim`, `vyber` a utm. Ostatní parametry se zahodí. Tokeny (`state`, `code`, `next`, `token`…) se neuloží nikdy.
- **Měřený prvek** má vždy lidský název z plánu:
  - prvek s atributem `data-track` (název v `NAZVY_PRVKU`),
  - odkaz na známou stránku (`NAZVY_ODKAZU`) se sekcí úvodu (`NAZVY_SEKCI`).
  - Prvek bez názvu se neměří a „tlačítko“ nevznikne.
- **Nikdy se neukládá:** psaný text, jméno, e-mail, IP adresa, nahrávka obrazovky ani cookies. Návštěvník bez účtu má jen denní anonymní otisk: hash IP + prohlížeče + denní soli, sůl se neukládá. Otisk platí 1 den.
- **Přihlášení a nepřihlášení** jsou zvlášť (vlastnost `prihlasen`).
- **Kdo se nepočítá** (jedno místo, `src/lib/admin-data.ts`):
  - testovací účty (`app_metadata.testovaci`) a admin,
  - zařízení „Nepočítat“ (nastaví se samo po přihlášení admina),
  - roboti a náhledy odkazů (`BOT` v `src/lib/mereni-server.ts`).
- Lokální vývoj a náhledy Vercelu se neměří.

## Události z prohlížeče (anonymní, přes `/api/t`)

| Událost | Kdy | Vlastnosti |
|---|---|---|
| `page_viewed` | otevření stránky (mimo admin a náhledy) | `cesta`, povolené parametry, `ref` (sloučená doména), utm, `vstup` (první stránka v záložce), `navrat_z_platby`, `prihlasen`, `zarizeni`, `v` |
| `page_left` | odchod z veřejné stránky (úvod, registrace, přihlášení, ceník…) | `cesta`, `sekund`, `scroll` (%), `kliku`, `sekce` (poslední viděná), `posledni_pole` (poslední pole formuláře) |
| `element_clicked` | klik na pojmenovaný prvek | `cil` (lidský název), `cil_cesta` (šablona cíle odkazu) |
| `rage_clicked` | 3 kliky do 1 s na stejné místo | `cil` (název prvku nebo sekce) |
| `sample_answered` | odpověď v ukázkovém příkladu na úvodu | `odpoved` (volba), `spravne`, `trida` |
| `form_started` | první klepnutí do formuláře | `cil` (název pole, nikdy obsah) |
| `form_error_shown` | chyba formuláře (náš text chyby) | `cil` (text chyby) |
| `signup_submitted` | odeslaná registrace e-mailem | `cil` (třída) |
| `signup_google_started` | klik na registraci přes Google | |
| `premium_viewed` | otevření stránky Premium | |
| `checkout_started` | přesměrování na platbu | |
| `checkout_canceled` | návrat ze Stripe bez zaplacení | `cil` (stránka) |
| `recommendation_opened` | otevření doporučení po testu | |

## Události s účtem (server nebo přihlášený žák)

| Událost | Kde | Vlastnosti |
|---|---|---|
| `app_heartbeat` | `/api/zive`, jednou za minutu, když je appka vidět | `cesta`, `zarizeni`, `v`. Je technická: na časovou osu žáka nepatří, jen se z ní počítá čas v appce a kdo je online. Admin se neukládá. |
| `training_completed` | konec tréninku (klient) | `total`, `correct`, `accuracy`, `topics`, `u` (úlohy a výsledek) |
| `diagnostic_completed` | konec diagnostiky (klient) | výsledky po tématech |
| `diagnostic_training_started` | první trénink z výsledků diagnostiky | `tema`, `zdroj` |
| `mock_test_completed` | konec cvičného testu (klient) | body |
| `video_lesson_opened` | otevření videolekce po chybě | `lekce`, `tema`, `podtema` |
| `feature_used` | herní funkce, nejvýš 1× denně na funkci a zařízení | `f` (truhla, šatník, obchůdek, boss, mise, pokojíček, sady, kalendář) |
| `email_sent` | odeslaný e-mail žákovi (server) | `e` (který e-mail) |
| `email_status_received` | webhook Resendu | `typ` (delivered, bounced, complained, opened), `e` |
| `email_unsubscribed` | odhlášení e-mailů | |
| `client_error_reported` | chyba v prohlížeči (server) | |
| `weekly_report_created`, `ad_spend_saved`, `chart_note_added` | admin | interní |

## Log odpovědí (tabulka `odpovedi`, ne událost)

Každá odpověď na úlohu v tréninku, opakování, chybách, diagnostice (5. i 9. třída), cvičném testu 9. třídy, rychlém režimu, výzvě a u Bosse. Zapisuje karta úlohy přes `useZaznamOdpovedi` (`src/lib/odpovedi-log.ts`), režim nastavuje stránka.

| Sloupec | Co |
|---|---|
| `uloha_id`, `tema`, `dovednost`, `uroven`, `trida` | úloha |
| `rezim`, `sada_id`, `poradi` | kde a kolikátá v sadě |
| `pokus` | kolikrát žák úlohu řešil (doplní databáze) |
| `spravne`, `spravne_napoprve`, `odeslani` | konečný výsledek, výsledek prvního odeslání, počet odeslání v kartě |
| `odpoved` | jen číslo, zlomek, jednotka nebo písmeno volby. Psaný text (slovo od 6 písmen) se neukládá. |
| `cas_ms` | od zobrazení úlohy po odpověď |
| `napoveda`, `postup`, `preskoceno` | otevřel nápovědu, otevřel postup, přeskočil |

Zatím se nezapisuje: cvičný test 5. třídy. Má vlastní skládané úlohy, přijde ve fázi B.

## Registrace

| Kam | Co |
|---|---|
| `souhlasy` | podmínky a zásady (povinné, verze `VERZE_PODMINEK`), novinky e-mailem (nepovinné) |
| `user_metadata.odkud` | „Odkud ses o nás dozvěděl?“ (nepovinné): facebook, kamarad, skola, letak, test, web, jinde |
| `user_metadata.zdroj` | zdroj návštěvy (utm, doména), jako dosud |
| `navstevy_ucet` | dnešní anonymní otisk zařízení ↔ nový účet. Karta žáka díky tomu ukáže cestu před registrací. |

## Staré názvy (do 26. 11. 2026)

Migrace `20261126_admin_a1_udalosti.sql` je přejmenuje v databázi a `/api/t` je ještě přijímá ze starých verzí appky:

| Starý | Nový | Starý | Nový |
|---|---|---|---|
| navsteva | page_viewed | odchod | page_left |
| klik | element_clicked | zive | app_heartbeat |
| session_completed | training_completed | diagnostika_dokoncena | diagnostic_completed |
| diagnostika_prvni_trenink | diagnostic_training_started | registrace_odeslana | signup_submitted |
| registrace_google | signup_google_started | premium_zobrazeno | premium_viewed |
| platba_start | checkout_started | platba_zrusena | checkout_canceled |
| formular_start | form_started | formular_chyba | form_error_shown |
| funkce | feature_used | email_odeslan | email_sent |
| email_dorucitelnost | email_status_received | email_odhlaseni | email_unsubscribed |
| cermat_test_dokoncen | mock_test_completed | videolekce_klik | video_lesson_opened |
| doporuceni_otevreno | recommendation_opened | tydenni_report | weekly_report_created |
| admin_utrata | ad_spend_saved | admin_poznamka | chart_note_added |
| error_client | client_error_reported | | |

Události pro Loops (`session_completed` a další v `/api/loops-event`) jsou názvy v Loops, ne v naší databázi, a zůstávají.
