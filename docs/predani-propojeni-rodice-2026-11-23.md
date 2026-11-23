# Předání: propojení rodiče s dítětem jen se souhlasem dítěte (23. 11. 2026)

Pro hlavní Claude Code u MateMaxu. Práce je hotová a otestovaná ve větvi `claude/clever-hypatia-5qz3dp`
(commity `560609b`, `3e85fc2` a tento dokument). Zbývá ji dostat do `main`, nasadit a jednou spustit SQL v Supabase.

## Proč

`/api/parent-link` našel účet dítěte podle e-mailu a hned zapsal do `parent_child_link` řádek s `verified: true`.
Kdokoli s jakýmkoli účtem, kdo znal e-mail dítěte, tak viděl rodičovský přehled a u Premium dostával týdenní report.
Navíc `supabaseAdmin.auth.admin.listUsers()` vracel jen první stránku (50 účtů), takže se další děti nenašly.
Při práci se ukázala ještě jedna díra: `/api/parent-message` dovolil komukoli poslat zprávu kterémukoli dítěti, stačilo znát jeho ID.

## Jak to funguje teď

1. Rodič na `/rodice/propojeni` zadá e-mail dítěte → vznikne jen žádost (`verified: false`, náhodný 48znakový hex token).
   Stránka ukáže „Čeká na potvrzení dítětem“. Opakovaná žádost nic nezdvojí a ověřené propojení nikdy neshodí zpět.
2. Dítě po přihlášení vidí na **Domově** kartu „Rodič se chce propojit – Povolit / Odmítnout“ (karta jen když žádost je).
   V **Profilu** vidí čekající žádosti i rodiče, kteří už přehled vidí, a může propojení zrušit.
3. Povolit = `verified: true`, `verified_at`. Odmítnout = čekající řádek se smaže. Zrušit = ověřený řádek se smaže.
   Odpověď musí přijít od přihlášeného dítěte (`child_user_id = user.id`) – token sám nestačí, takže rodič, který token
   ze svého řádku zná (RLS mu ho ukáže), si propojení nepotvrdí.
4. Rodičovský přehled bez ověřeného dítěte vrací jen `{ linked: false, cekajici: [e-maily] }` (e-mail zadal sám rodič),
   žádná data dítěte. Stránka ukáže „Čeká na potvrzení dítětem“ s tlačítky „Zkontrolovat znovu“ a „Zrušit žádost“.
5. Data přehledu, zprávy rodiče i týdenní report jen s ověřeným propojením.
6. Dítě se hledá přes RPC `najdi_ucet_podle_emailu` (service role). Dokud funkce v databázi není, kód projde
   **všechny** stránky `listUsers` po 1 000 účtech (funguje hned po nasazení, jen pomaleji) a zaloguje varování.

Proč souhlas v appce a ne e-mailem dítěti: dítě je přihlášené, takže víme, že odpovídá opravdu ono; nezáleží na tom,
jestli dítě čte e-maily (často je to e-mail rodiče); žádný nový e-mail zákazníkům ke schvalování.

## Soubory

Nové:
- `src/lib/propojeni-rodice.ts` – veškerá logika: `zalozZadost`, `najdiUcetPodleEmailu`, `zadostiDitete`, `odpovedDitete`,
  `stavRodice`, `jeOvereno`, `overenaPropojeni`. Všechny trasy jdou přes ni.
- `src/app/api/parent-link/zadosti/route.ts` – strana dítěte: GET žádosti, POST `{ token, akce: "povolit" | "odmitnout" | "zrusit" }`.
- `src/components/ZadostiRodicu.tsx` – karta pro dítě (`misto="domov"` / `"profil"`).
- `src/components/rodice/PropojitDite.tsx` – formulář rodiče (přesunutý ze stránky, stránka ho jen vykreslí).
- `src/components/rodice/CekaNaPotvrzeni.tsx` – přehled rodiče před potvrzením.
- `supabase/migrations/20261123_propojeni_rodice.sql` – RPC `najdi_ucet_podle_emailu` (SECURITY DEFINER, EXECUTE jen
  `service_role`, odebráno `anon`/`authenticated`) + index na `parent_child_link.token`. Nic nemaže ani nemění.
- `e2e/propojeni-rodice.spec.ts` – 12 testů × 2 projekty (desktop, mobile) = 24.

Změněné:
- `src/app/api/parent-link/route.ts` – jen žádost přes `zalozZadost`, české chybové hlášky (neexistuje / vlastní účet / neplatný e-mail).
- `src/app/api/parent-dashboard/route.ts` – `stavRodice` (service role + filtr `parent_email`) místo RLS dotazu; bez ověřeného dítěte vrací jen čekající e-maily, ještě před čtením jakýchkoli dat.
- `src/app/api/parent-message/route.ts` – 403 bez ověřeného propojení (`jeOvereno`).
- `src/app/api/cron/weekly-parent-report/route.ts` – propojení přes `overenaPropojeni`.
- `src/app/(app)/rodice/propojeni/page.tsx` – vykreslí `PropojitDite`.
- `src/app/(app)/rodice/dashboard/page.tsx` – stav „čeká na potvrzení“ (+ malý pruh, když má rodič ověřené dítě a další žádost čeká).
- `src/components/Domov.tsx` – `<ZadostiRodicu misto="domov" />` pod vzkazem od rodiče.
- `src/app/(app)/profil/page.tsx` – `<ZadostiRodicu misto="profil" />` nad Rodičovským portálem.
- `src/app/nahled/page.tsx` – `?propojit=1`, `?rodic=ceka`, `?zadosti=profil` (pro e2e: `/rodice/*` a `/profil` hlídá `src/proxy.ts` proti skutečnému Supabase, falešná relace v testu je neotevře).

## Rozhodnutí Karla

- **Stará propojení s `verified = true` zůstávají, jak jsou** (Karel 23. 11.: „vím, že jsou v pořádku“). Nic na nich neměnit.
- Žádné texty pro zákazníky (e-maily, web) se neměnily.

## Co udělat (v tomto pořadí)

1. Sloučit `claude/clever-hypatia-5qz3dp` do `main` (pull request) a nechat Vercel nasadit.
2. V Supabase → SQL Editor spustit `supabase/migrations/20261123_propojeni_rodice.sql`.
   Kontrola: `select public.najdi_ucet_podle_emailu('existujici@email');` jako service role vrátí uuid;
   z prohlížeče (anon/authenticated) volání selže na oprávnění.
3. Zkouška na produkci: rodičovský účet pošle žádost na testovací dítě → rodič vidí „Čeká na potvrzení dítětem“ →
   dítě na Domově klikne Povolit → rodič vidí přehled. Pak v Profilu dítěte Zrušit → rodič zase nevidí nic.
4. V MS Dashboardu: návrh `089ae3b8` („MateMax: co se starými propojeními rodičů…“) uzavře Karel variantou C.
   Úkol `3d798cf1` („Nasadit potvrzování propojení dítětem a spustit SQL…“) po zkoušce označit hotový.

## Testy

- `npx playwright test e2e/propojeni-rodice.spec.ts` → 24 passed. Serverová logika běží proti in-memory náhradě Supabase;
  že trasy přehledu, zpráv a reportu tu logiku používají, hlídá kontrola jejich zdrojového kódu; obrazovky s podvrženým API.
- `npx tsc --noEmit` čisté. ESLint: žádný nový problém (16 starších v dotčených souborech, hlavně `set-state-in-effect`).
- V prostředí bez skutečného Supabase padá 8 starších testů v `smoke.spec.ts` a `ochutnavka.spec.ts` i na kódu před změnou – nesouvisí.
- Pozor: `next dev` sám přepisuje blok v `AGENTS.md`; do commitu nepatří.

## Navazující nález (mimo tuto práci)

Stará stránka `src/app/(app)/rodice/page.tsx` + `/api/parent-subscribe` slibuje týdenní report za zadání dvou e-mailů,
ale cron tabulku `parent_subscriptions` nečte, takže report nikdy nepřijde. Nepřihlášený navíc může nechat poslat
potvrzovací e-mail na libovolnou adresu. Doporučení: stránku přesměrovat na `/rodice/prihlaseni` (nebo rozcestník),
trasu vypnout; text pro zákazníky jen přes `propose_change`.
