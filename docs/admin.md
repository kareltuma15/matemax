# MateMax Admin 2.1: jak funguje

Nový admin běží na `/admin/novy`, vedle starého. Starý admin (`/admin`) zůstává, dokud Karel nový neschválí. Pak se adresy prohodí. Návrh a drátěné modely: `docs/admin-2026-11/navrh-admin.html`.

## Rozvržení a navigace

- Vlastní rozvržení (`src/app/(admin)/admin/novy/`, `src/components/admin2/Shell.tsx`), bez studentské lišty.
  - Na mobilu je spodní lišta Dnes · Žáci · Zprávy · Plán · Více.
  - Na desktopu je levý panel se všemi sekcemi a odznaky.
- Hledání Ctrl+K (`Hledani.tsx`, `hledani-akce.ts`) najde žáky, rodiče, úkoly a úlohy a umí příkazy. Naposledy otevřené si pamatuje jen prohlížeč.
- Filtry v adrese (`obdobi`, `od`, `do`, `trida`, `zdroj`) platí napříč sekcemi. Odkazy z dlaždic nesou `metrika=…`.
- Drobečky „← Žáci“ vrátí na seznam se stejnými filtry (adresu si pamatuje `sessionStorage`).
- Sekce, které zatím nejsou v novém vzhledu (Zprávy, Obsah, Chování, Růst, Testy), vedou na starý admin. Učení a Hlas mají zástupnou stránku s termínem fáze.

## Ochrana (SY-01)

- Proxy (`src/proxy.ts`) pustí na `/admin/novy` jen přihlášeného admina (`ADMIN_EMAILS`). Kdo má zapnutý druhý faktor, musí mít ověřenou relaci (aal2), jinak jde na `/admin/novy/overeni`.
- Layout a každá stránka ověřují znovu (`src/lib/admin2/auth.ts`). Serverové akce volají `vyzadujAdmina()`.
- Rozhraní starého adminu (`requireAdmin`) chtějí aal2, jakmile je druhý faktor zapnutý.
- Druhý faktor: TOTP v Supabase, zapíná se v Systém → Zabezpečení (`/admin/novy/zabezpeceni`).
- Admin se neindexuje a necachuje (proxy, `next.config.ts`, `robots.ts`, metadata).
- Audit: každá akce v adminu se zapíše do `admin_audit` (`src/lib/admin-audit.ts`), včetně otevření karty žáka a exportu.

## Data a metriky (DA-01)

- Jedna definice v databázi:
  - `admin_zaci()`: jeden řádek na žáka,
  - `admin_aktivita(od)`: dny s tréninkem.
  - Obě v migraci `20261127_admin_a2.sql`.
- Jeden výpočet v kódu: `src/lib/admin2/metriky.ts`. Používají ho dlaždice, seznam žáků (`?metrika=`), export CSV i testy.
- Kdo se nepočítá:
  - testovací účty a `admin_role` (v SQL),
  - admin e-mail (v kódu, `src/lib/admin-data.ts`).
- Malá čísla: `src/lib/admin2/mala-cisla.ts`.
- Načtení jednou za požadavek (React `cache`): `src/lib/admin2/stranka.ts`. Layout i stránka tak ukazují stejná čísla.
- Slovník metrik: `docs/metriky.md` a stránka `/admin/novy/metriky` (strom metrik se severkou).

## Režimy

- **Sdílení** (cookie `admin_sdileni`): server místo jmen a e-mailů pošle „Žák A, Žák B…“ (`src/lib/admin2/sdileni.ts`). Pseudonym je stálý podle pořadí registrace.
- **Demo data** (cookie `admin_demo` nebo `?demo=1`): vymyšlení žáci z `src/lib/admin2/demo.ts`. Nic se nečte ani nezapisuje. Obsahuje testovací účet i admina, aby testy ověřily vyloučení.
- **E2E testy**: jen vývojový server s `ADMIN2_E2E=1` (nastavuje `playwright.config.ts`) a cookie `admin2_e2e`. Vždy jde o demo data a akce nic nezapisují.

## E-maily z adminu

- Výchozí je testovací režim: ukázka přijde na adresu admina s „TEST“ v předmětu, žákům nic.
- Ostrý režim se zapíná v Systém → Nastavení.
  - Každé odeslání chce potvrzení.
  - Najednou jde nejvýš 50 žákům (Resend Free má strop 100 e-mailů denně).
  - Odhlášení žáci se přeskočí.

## Dnes

- Fronta akcí (`src/lib/admin2/doporuceni.ts`), pravidla pro fázi A:
  - bez diagnostiky,
  - diagnostika bez tréninku,
  - aktivní přestal,
  - ruční Premium končí,
  - oblast po limitu čerstvosti,
  - konverze registrace,
  - zpětná vazba.
- Stav doporučení (hotovo, odložit, skrýt, palec) je v `admin_doporuceni_stav`. Vratné akce mají „Zpět“ na 10 s.
- „Od poslední návštěvy“: `admin_nastaveni.navsteva`. Nová návštěva začíná po 30 minutách nečinnosti.
- Cíle sezóny a prahy jsou v `admin_nastaveni.nastaveni` (Systém → Nastavení).

## Zprávy (fáze B1 + B2)

- **Log zpráv** (`src/lib/zpravy-log.ts`): každý e-mail jde přes `posliResend` (Resend + zápis do `zpravy`), push přes `zapisPush`.
  - Štítek `z` v Resendu = ID zprávy v logu, webhook podle něj zprávu najde.
  - Stavy (`zpravy_stav`) z webhooku Resendu a ze service workeru (`/api/push/stav`). Stav zprávy nikdy nespadne na horší, vrácení a spam přepíšou dobrý (`lepsiStav`).
  - Webhooky proti duplicitám: `webhooky` (svix-id / Stripe event.id).
- **Schránka** (`/admin/novy/zpravy`): odpovědi na e-maily (webhook `email.received`, tělo přes API, kopie Karlovi), zpětná vazba (přenese se z `user_feedback` při otevření), nahlášené chyby v úlohách.
  - Odpověď z adminu: testovací režim jde na adresu admina s TEST, ostrý chce potvrzení.
  - Příjem odpovědí začne po nastavení poddomény `odpovedi.matematika-snadno.cz` v Resendu a proměnné `ODPOVEDI_ADRESA` ve Vercelu. Do té doby Reply-To = karel.tuma@matematika-snadno.cz.
- **Odeslané**: tečky odesláno · doručeno · kliknuto · odpověděl, filtr problémů, doručitelnost za 30 dní.
- **Šablony a dopad**: kolik různých žáků po zprávě trénovalo (den zprávy nebo dva další, aktivita je po dnech).
- **Hromadné odeslání** (`/admin/novy/zpravy/hromadne`): segment → šablona → náhled konkrétních zpráv a kdo se přeskočí → test → potvrzení.
  - Na serveru se přeskočí odhlášení, vrácené adresy a kdo stejnou šablonu dostal za 7 dní.
  - Najednou max 50, nikdy přes 100 e-mailů za 24 h (Resend Free), 5 rezerva.
- **Karta žáka → Zprávy**: zprávy žákovi i rodičům s historií stavů a co žák poslal do Schránky. Platby ze Stripe (`invoice_paid`, `charge_refunded` v `analytics_events`).

## Večerní kolečko a upozornění (B2)

- `/admin/novy/kolecko`: nová Schránka → fronta akcí (max 7) → cíle sezóny → plán týdne. Přejetí doprava = hotovo, doleva = odložit. Konec se zapíše do auditu (`kolecko_dokonceno`).
- Zvonek (`src/lib/admin2/upozorneni.ts`): skládá se z dat za 7 dní (Schránka, platby, chyba 3+ za 24 h, selhaný cron nebo webhook, noví žáci). Přečteno = `admin_nastaveni.upozorneni_precteno`.
- Systém → Zdraví systému (základ): chyby za 24 h podle otisku, poslední běh každé automatické úlohy (`behy_cronu`, obal `behCronu`), webhooky za 7 dní, e-maily za 24 h. Limity tarifů a zálohy v B4.

## Učení a rodiny (B3)

- Jediný výpočet: `src/lib/admin2/uceni.ts` (log `odpovedi` od 26. 11. 2026 a karty `sm2_cards`). Používá ho sekce Učení, karta žáka i doporučení.
  - Úspěšnost = první pokus u všech, kdo úlohu začali, mimo opakování (`prvniPokusy`). Přeskočení = neúspěch.
  - Příznaky úloh (`PRAHY_UCENI`):
    - podezřelá: nejčastější špatná odpověď ≥ správná, 8+ pokusů,
    - moc těžká: pod 30 %, 10+ pokusů,
    - moc lehká: nad 95 % a pod polovinou mediánu času tématu,
    - zdlouhavá: přes dvojnásobek mediánu tématu,
    - přeskakovaná: přes 30 %.
  - Obtížnost pro žáka: posledních 20 odpovědí v tématu (od 8). Moc lehké = přes 90 % a rychleji než ostatní. Moc těžké = pod 50 % nebo přes 30 % přeskočeno.
  - Zapomíná: 4+ neúspěchy u stejné úlohy v opakování.
  - Připravenost: odhad bodů (`src/lib/odhad-server.ts`, stejný jako report rodičům).
    - Pozadu = slabá témata (pod 60 %) × 3 dny > zbývající týdny × tempo (dny tréninku za týden, 14 dní).
    - Přijímačky 12. 4. (9. tř.) a 14. 4. 2027 (5. tř.).
- `/admin/novy/uceni`: Témata · Úlohy (filtr příznaků) · Žáci × témata · Opakování.
- `/admin/novy/uceni/uloha/[id]`: detail úlohy. „Zkontrolováno“ (`admin_nastaveni.ulohy_zkontrolovano`) potlačí příznak do 10 nových pokusů (`src/lib/admin2/kontroly.ts`).
- Karta žáka:
  - Učení: odhad, připravenost, témata s obtížností, opakování, posledních 50 odpovědí, Kopírovat pro Clauda, vždy s pseudonymem.
  - Testy: body z Vyhodnocení a jestli trénuje slabá témata.
  - Rodina: rodič, odběr, sourozenci, zprávy rodině.
- `/admin/novy/zaci/rodice`: rodiče z `parent_child_link` + `parent_settings`, poslední report z logu zpráv.
- Doporučení z učení na Dnes: podezřelá, moc těžká nebo přeskakovaná úloha, žák s moc těžkým tématem, zapomínání.
- **Nahlásit chybu** (appka žáka, `src/components/NahlasitChybu.tsx`): pod vyhodnocením ve všech 6 typech karet.
  - Posílá na `/api/nahlasit-chybu` → Schránka (`chyba_ulohy`). Ukládá úlohu, důvod, poznámku do 300 znaků a odpověď (jen číslo nebo volba).
  - IP adresa se neukládá, duplicity se hlídají jen u přihlášených.
- Schránka: vkládá se přes `src/lib/schranka.ts` (`vlozDoSchranky`). Unikátní index je částečný, upsert s `onConflict` na něm v Postgresu nefunguje.

## Tabulky adminu

`admin_nastaveni`, `admin_ukoly`, `admin_doporuceni_stav`, `admin_poznamky`, `admin_stitky`, `admin_pouziti` (které sekce Karel otevírá), `admin_audit`, `admin_role`. Čte a píše jen server (service role).

## Testy

- `e2e/admin2.spec.ts`: demo data, DA-10 (dlaždice = seznam, vyloučení, trychtýř neroste), sdílení, hledání, filtry, mobil 320 a 375 px.
- `e2e/admin-a1.spec.ts`: plán měření, log odpovědí, souhlasy, žebříček.
