# Plán tvorby obsahu MateMax (cesta k plnému CERMAT pokrytí)

> Jak systematicky naplnit databázi úloh do listopadu 2026. Navazuje na
> [STRUKTURA-cermat-sesit-matemax.md](STRUKTURA-cermat-sesit-matemax.md) (co CERMAT vyžaduje)
> a [KONCEPT-tezsi-ulohy.md](KONCEPT-tezsi-ulohy.md) (engine typů úloh — hotový).

---

## 1. Zdroje (od čeho stavíme)
- **Pracovní sešit_08_2026.pdf** (Downloads) — hlavní předloha, 9 kapitol, 3 úrovně. Čtu strany podle tématu.
- **src/data/cermat-200.json** — 200 reálných CERMAT úloh (kontrola formátu a obtížnosti).
- **6 oficiálních CERMAT testů + 10 testů nanečisto** (shrnuto ve STRUKTURA dokumentu).
- **Od Karla podle potřeby:** foto konkrétní strany/obrázku, když je figura v PDF nejasná nebo chceš přesně replikovat zadání. Jinak nic posílat nemusíš.

## 2. Kde jsme (pokrytí k 2026-08-14, 979 úloh)

| Téma | L1 | L2 | L3 | Celkem | S obrázkem | Priorita doplnění |
|---|--:|--:|--:|--:|--:|---|
| zlomky | 34 | 54 | 31 | 119 | 0 | nízká (KaTeX, hotové) |
| vyrazy | 47 | 60 | 56 | 163 | 0 | nízká |
| rovnice | 32 | 54 | 22 | 108 | 0 | L3 doplnit |
| **geometrie** | 42 | 80 | 23 | 145 | **14** | **VYSOKÁ** — obrázkové úlohy + L3 |
| slovni_ulohy | 55 | 108 | 47 | 210 | 0 | úměra (3), finance (8), spol. práce (21) |
| **grafy_logika** | 37 | 41 | 25 | 103 | 18 | **VYSOKÁ** — grafy/tabulky/figurální |
| **konstrukce** | 10 | 11 | 7 | 28 | 0 | **VYSOKÁ** — CERMAT má 2/test (10 %!) |
| **uhly** | 13 | 18 | 9 | 40 | 10 | **VYSOKÁ** — celé obrázkové, tenké |
| souhrnne | 5 | 48 | 10 | 63 | 0 | L1 (5) a L3 (10) doplnit |

**Hlavní mezera:** jen ~40 z 979 úloh má obrázek, přitom CERMAT je z velké části obrázkový. Teď na to máme engine → doháníme.

## 3. Cílové pokrytí (co znamená „hotové téma")
Orientační minimum na téma pro smysluplný SM-2 trénink a rozlišení úrovní:
- **L1 ≥ 20 · L2 ≥ 25 · L3 ≥ 18** (u slovních úloh na každé podtéma).
- U obrázkových témat (geometrie, úhly, grafy) **většina úloh s obrázkem**.
- Každá úloha: `zadani`, `reseni_kroky` (postup jako v sešitu), správný `image`/režim odpovědi, kalibrovaná `obtiznost`.

## 4. Pracovní smyčka (na tom jsme se domluvili)
Pro **každou dávku (téma × úroveň)**:
1. **Domluva** — řekneme si téma, úroveň(-ně) a **počet úloh** dávky (např. „úhly L2, 8 úloh").
2. **Podklad** — přečtu odpovídající strany sešitu (+ cermat-200) k tématu.
3. **Stavba** — vytvořím úlohy (parametrický/statický obrázek nebo tabulka + režim odpovědi hodnota/A–E).
4. **Náhled** — postavím **náhledovou stránku `/nahled`**, kde uvidíš úlohy **přesně jako žák** (karta s obrázkem, možnostmi, řešením) — ne jen figuru.
5. **Souhlas** — projdeš, řekneš úpravy; doladím.
6. **Implementace** — dávku zapíšu do `databaze.json` (skript), commit + deploy.
7. Další dávka.

> **Vylepšení oproti dosavadním test-stránkám:** `/nahled` renderuje reálné DBExample karty (PracticeCard / MoznostiCard / …), takže schvaluješ skutečný zážitek žáka. `/diagram-test` a `/moznosti-test` pak smažeme.

## 5. Navržené pořadí témat (dávky)
Podle priority (mezera × CERMAT váha × hotový engine):

1. **Úhly** — celé obrázkové, jen 40 úloh → rychle na plné pokrytí (trojúhelník, rovnoběžky, vrcholové/vedlejší, mnohoúhelník, paprsky °′). *Rychlá výhra — dokončíme celé téma.*
2. **Geometrie** — obrazce s kótami (obvod/obsah), tělesa (objem/povrch), složené obrazce (statické SVG + A–E). Doplnit L3.
3. **Grafy a logika** — koláč/sloupce/tabulky (i s chybějícím údajem), figurální posloupnosti, čtení dat.
4. **Konstrukce** — dorovnat na ~2/test váhu (interaktivní výběr postupu — máme ConstructionCard).
5. **Slovní úlohy** — dorovnat tenká podtémata (úměra, finance, společná práce); přidat tabulkové zadání.
6. **Souhrnné** — doplnit L1 a L3 (složené úlohy přes témata, i A–E).
7. **Rovnice L3**, průběžně zlomky/výrazy dle potřeby.

## 6. Kvalitní brány (u každé dávky)
- `tsc` + `eslint` čisté, konzole bez chyb.
- Hodnocení odpovědí ověřené (`checkAnswer`).
- Obrázky bez překryvů a přetoků (měřím vzdálenosti popisků).
- KaTeX próza neuniká do math módu (`scripts/audit-katex.mjs`).
- Obtížnost kalibrovaná na sešit (L1 začátek, L3 vícekrokové).

---

## Progress
- [ ] `/nahled` náhledová stránka (reálné karty dávky)
- [ ] Dávka 1 — Úhly …
- (doplňuje se, jak jdeme)
