# Podklad pro týdenní plán — MateMax (předat Claude chatu)

> Toto je shrnutí aktuálního stavu projektu MateMax (Next.js appka na přípravu na
> přijímačky z matematiky, CERMAT). Vývoj probíhá přes Claude Code (terminálový
> nástroj), Karel pracuje **sólo, po večerech / ve volném čase**. Potřebuje od tebe
> **týdenní plán s jasnými milníky a odškrtávacími položkami** (checklist), na
> minimálně tento týden, ideálně i výhled na další. Prosím rozvrhni práci do
> večerních bloků (počítej ~1–2 h na večer, ne každý večer nutně) a u každé položky
> označ, zda je to (a) čistě rozhodnutí Karla, (b) práce, kterou provede Claude Code
> po zadání, nebo (c) něco, co musí Karel udělat sám mimo appku (Stripe dashboard,
> Supabase dashboard apod.).

## Kontext appky
- **MateMax** — Next.js 16 / React 19 / Supabase / Stripe. Příprava na jednotné
  přijímačky z matematiky (CERMAT), 9. třída. **Cíl: plná připravenost do listopadu.**
- Obsah = databáze úloh (9 témat dle CERMAT/sešitu), SM-2 opakování, diagnostika,
  online testy nanečisto (placené, s ruční opravou).
- Nedávno postaven **parametrický SVG engine** pro obrázkové úlohy (13 typů: úhly,
  geometrie, grafy, tělesa...) + **hybridní model** (parametrický/statický obrázek/
  tabulka) + **režim výběru A–E** pro těžké CERMAT-style úlohy.

## Pracovní smyčka na obsah (zavedená, funguje dobře)
Pro každou dávku úloh: **domluva (téma+počet) → Claude přečte předlohu (sešit/CERMAT)
→ postaví úlohy → ukáže na `/nahled` (vypadá přesně jako v tréninku) → Karel schválí
nebo žádá úpravy → zapsání do ostré databáze → commit/deploy.** Tohle funguje a mělo
by pokračovat.

---

## STAV JEDNOTLIVÝCH VĚTVÍ (k 2026-09-08)

### 1) Obsah — Úhly (probíhá, téměř hotovo)
- **L1 (8 úloh):** ✅ HOTOVO, zapsáno v produkci.
- **L2 (8 úloh):** ✅ HOTOVO, zapsáno v produkci.
- **L3 (8 úloh, CERMAT úroveň):** ⏸ **POSTAVENO, ale ČEKÁ na finální schválení a zápis.**
  Obsahuje repliky reálných CERMAT úloh (rovnoběžník s neznámou 4α, Thaletova věta/
  kružnice opsaná, soustava rovnoběžky+kolmice se 3 podotázkami, úhly ve stupních
  a minutách). Vizuální drobnosti (překryv popisků) byly opraveny a Karel je
  spokojený s posledními úpravami obrázku. **Chybí:** Karel řekne "zapiš to" →
  spustí se merge skript → commit → Úhly budou HOTOVÉ ve všech 3 úrovních (první
  kompletní téma).
- **Další témata čekají ve frontě** (viz `docs/OBSAH-plan.md`): geometrie, grafy a
  logika, konstrukce, slovní úlohy — stejnou smyčkou přes `/nahled`.

**Milník návrh:** "Dokončit Úhly L1–L3 a spustit Geometrii L1" tento týden.

### 2) Diagnostika — REVIZE POTŘEBNÁ (audit hotový, oprava NEZAČATA)
Diagnostika = 16 napevno napsaných otázek v kódu (2 na každé z 8 CERMAT témat),
oddělené od zbytku appky (vlastní rendering, ŽÁDNÝ KaTeX, žádné obrázky kromě
2 ručních SVG). Po vyplnění diagnostika naseeduje do tréninku 10 NEJLEHČÍCH úloh
z každého slabého tématu.

**Nálezy (viz `docs/DIAGNOSTIKA_REVIZE.md`):**
| Priorita | Problém | Kde |
|---|---|---|
| 🔴 vysoká | Zlomky psané plochým textem "5/12" místo KaTeX zlomku | otázky Q1, Q2 |
| 🔴 vysoká | Určování úhlu čistě slovně, bez obrázku (ačkoliv teď máme obrázkový engine) | otázky Q15, Q16 |
| 🟠 střední | Geometrie/koláčový graf řešené slovně, měly by mít obrázek | otázky Q7, Q8, Q11 |
| 🟠 střední | Otázky jsou celkově moc lehké (úroveň L1), nerozliší silnějšího žáka | napříč, nejvíc Q7, Q9, Q15 |
| 🟠 k rozhodnutí | Číselná posloupnost (1,3,7,13,21,...) — je to "logika", ale CERMAT "grafy" = koláč/sloupce, ne řady čísel | otázka Q12 |
| 🟠 širší dopad | V celé databázi: **úhly bez obrázku 25/54 úloh**, **geometrie bez obrázku 131/145 úloh** — diagnostika z toho seeduje | celá DB |

Poznámka: **samotná databáze úloh (mimo těch 16 diagnostických otázek) NEMÁ problém
se zlomky mimo KaTeX** — to bylo mylné podezření, ověřeno skenem 282 úloh (0 chyb).
Problém je jen v těch 16 pevných otázkách diagnostiky.

**Karel zatím nerozhodl pořadí oprav.** Navrhované kroky (k potvrzení/seřazení):
1. Nahradit slovní úhlové otázky (Q15, Q16) obrázkovými diagramy — engine na to už je hotový, jde jen o přepsání otázek.
2. Přepsat zlomkové otázky (Q1, Q2) do KaTeX — vyžaduje i technickou úpravu (diagnostika dnes KaTeX vůbec neumí renderovat).
3. Zvýšit obtížnost/rozlišovací schopnost diagnostiky (přidat těžší otázku na téma, nebo seedovat i střední úroveň, ne jen nejlehčí).
4. Doplnit obrázky do geometrie/koláče (Q7, Q8, Q11).
5. Rozhodnout osud posloupnostní otázky (Q12).
6. (Samostatná velká úloha, nesouvisí přímo s diagnostikou) Doplnit obrázky do zbytku databáze geometrie (131/145 bez obrázku).

**Milník návrh:** "Rozhodnout pořadí + opravit body 1–2 (nejvyšší priorita) tento týden."

### 3) Online testy nanečisto — E2E (statický audit hotový, živý test NEPROBĚHL)
Celý flow (registrace → přihláška+platba → potvrzení → PDF od admina → žák nahraje
foto vyplněného archu → **ruční oprava adminem** → e-mail s výsledky → automatické
připomínky 24h/1h) **má hotový kód pro všech 8 kroků** (viz
`docs/E2E-ONLINE-TESTY-STATICKY.md`). Ale:
- Nikdy neproběhl žádný ostrý/testovací průchod → 0 ověřených důkazů, že to
  funguje dohromady.
- Existuje řada věcí, které nejdou ověřit z kódu a musí zkontrolovat/nastavit
  Karel ručně: existence a oprávnění Supabase Storage bucketů (`test-sessions`,
  `submissions`), Stripe webhook zaregistrovaný a správný `STRIPE_WEBHOOK_SECRET`,
  `RESEND_API_KEY` nastavený, Stripe live/test režim, aspoň jeden testovací
  termín založený a publikovaný s nahranými PDF.
- E-maily při chybějícím API klíči **tiše selžou** (jen warning v logu) — snadno
  přehlédnutelné.
- Oprava testů je čistě manuální (žádná automatizace) — bude to časová zátěž při
  víc žácích.

**Další krok:** Claude má připravit **checklist pro živý test (varianta b)** — krok
za krokem, co má Karel provést sám (potřebuje Stripe test mode + reálnou e-mailovou
schránku). Tento checklist ještě NEBYL dodán, čeká se na něj.

**Milník návrh:** "Získat od Claude Code checklist živého E2E testu + provést ho
alespoň jednou v Stripe test-mode" — může být spíš úkol na příští týden, protože
vyžaduje soustředěný blok (ne jen pár minut večer).

---

## CO OD TEBE (Claude chat) POTŘEBUJI
Vytvoř **týdenní plán** (tento týden, případně náznak dalšího) ve formě, kterou
můžu odškrtávat:
1. Rozděl práci do **večerních bloků** (Karel má čas nepravidelně, po večerech).
2. Ke každé položce napiš, **kdo ji dělá** — (K) = Karel sám mimo appku, (C) = zadání
   pro Claude Code, které Karel jen odsouhlasí/spustí.
3. **Vyznač závislosti** — např. diagnostiku nejde opravit, dokud Karel neurčí
   pořadí; E2E live test čeká na checklist.
4. Navrhni **2–3 jasné milníky** na konec týdne (co by mělo být hotové), aby bylo
   znát, že se pokročilo.
5. Zvaž priority: (a) dokončit Úhly (rychlé, skoro hotové), (b) rozhodnout a
   spustit opravu diagnostiky (má prioritu — je to znatelná kvalitativní chyba
   viditelná uživatelům hned na začátku), (c) E2E live test (důležité, ale
   časově náročnější, možná spíš na víkend / další týden).

Pracuj v češtině, drž to stručné a akční — Karel chce vědět **co dělá dnes večer**,
ne obecnou strategii.
