# Diagnostika — revize (audit, NEOPRAVENO)

> Seznam problémů diagnostiky a souvisejících dat. **Nic zatím neopravuju** — Karel
> rozhodne co a v jakém pořadí. Vytvořeno 2026-09-08.

## Jak diagnostika funguje (kontext)
Diagnostika (`src/app/(app)/diagnostika/page.tsx`) má **16 napevno napsaných otázek**
(pole `QUESTIONS`, 2 na každé z 8 témat) — to jsou přesně ty „dva příklady na téma",
co jsi viděl. Renderují se jako **prostý text** (žádný KaTeX, žádné `MathText`).
Po dokončení pro každé slabé téma (skóre < 67 %) **naseeduje 10 NEJLEHČÍCH** úloh
z databáze do tréninku (`seedCardsFromDiag`, řadí podle `obtiznost` vzestupně).

Klíčové zjištění: **problém „zlomky starým způsobem" je v těch 16 otázkách, ne v datech.**
Sken celé DB: zlomky+výrazy = 282 úloh, z toho **0** má zlomek psaný „a/b" bez KaTeX.
Data jsou čistá; špatně je právě diagnostický kvíz.

---

## ČÁST A — 16 diagnostických otázek (problém po problému)

| ID | Téma | Problém | Závažnost |
|----|------|---------|-----------|
| **Q1** | zlomky | Možnosti psané jako „5/12, 4/12, 1/4, 7/12" — **plochý text a/b, ne zlomek**. Navíc zadání používá „¾ − ⅓" (unicode) → **nekonzistentní notace** v jedné otázce. | 🔴 vysoká |
| **Q2** | zlomky | „18/24", možnosti „9/12, 6/8, 3/4, 2/3" — **vše plochý a/b**, ne stackovaný zlomek. | 🔴 vysoká |
| Q3 | výrazy | (x + 3)² — unicode ² místo KaTeX; čitelné, ale nekonzistentní. | 🟡 nízká |
| Q4 | výrazy | a² − 16 — totéž (unicode). | 🟡 nízká |
| Q5 | rovnice | OK. | ✅ |
| Q6 | rovnice | OK (soustava). | ✅ |
| **Q7** | geometrie | Pythagoras 6-8-10 — **nejotřepanější lehký trojúhelník**, a **slovně bez obrázku**. | 🟠 střední |
| Q8 | geometrie | Objem kvádru — **slovně bez obrázku**, jednokrokové. | 🟠 střední |
| **Q9** | slovní | 270 / 90 = 3 — **triviálně lehké** (jeden podíl). | 🟠 střední |
| Q10 | slovní | Společná práce — OK, přiměřeně těžké. | ✅ |
| Q11 | grafy | Koláč 72° → 20 % — obsahově dobré (CERMAT), ale **bez obrázku** koláče. | 🟡 nízká |
| **Q12** | grafy | Číselná posloupnost 1,3,7,13,21 — **posloupnostní hádanka**. Označil jsi posloupnosti jako nepatřičné; navíc CERMAT „grafy" = koláč/sloupce, ne číselné řady. **Placement k rozhodnutí.** | 🟠 střední |
| Q13 | konstrukce | Má SVG ilustraci. OK. | ✅ |
| Q14 | konstrukce | Má SVG ilustraci. OK. | ✅ |
| **Q15** | úhly | „V trojúhelníku dva úhly 55° a 75°, třetí?" — **slovní určování úhlu bez obrázku** (přesně to, cos označil za nesmysl). Máme na to `trojuhelnik` diagram. | 🔴 vysoká |
| **Q16** | úhly | „Střídavé vnitřní úhly jsou: [shodné…]" — **slovní/pojmová bez obrázku**. Máme `uhel_pricka`. | 🔴 vysoká |

### Souhrn otázek
- **Zlomky mimo KaTeX:** Q1, Q2 (2 otázky).
- **Slovní úhly bez obrázku:** Q15, Q16 (2 otázky) — přitom engine na diagramy máme.
- **Geometrie/koláč bez obrázku, ač by měly:** Q7, Q8, Q11 (3 otázky).
- **Moc lehké / jednokrokové:** Q7, Q9, Q15 nejvíc; **celkově všech 16 je ~úroveň L1** — diagnostika nerozliší silnějšího žáka.
- **Posloupnost k rozhodnutí:** Q12.
- **Systémově:** diagnostika **nerenderuje KaTeX ani obrázky** (kromě 2 ručních SVG u konstrukce). Má vlastní jednoduché vykreslení, odtržené od `PracticeCard`/`MoznostiCard`.

---

## ČÁST B — související problémy v datech (co diagnostika seeduje / širší DB)

| Nález | Počet | Pozn. |
|-------|------:|-------|
| Zlomky+výrazy se zlomkem „a/b" **bez** KaTeX | **0 / 282** | ✅ data čistá — problém je jen v kvízu (část A) |
| **Úhly bez obrázku** (slovní určování úhlu) | **25 / 54** | ids `t09_01…` — staré textové úlohy; přesně ten „slovní" typ |
| **Geometrie bez obrázku** | **131 / 145** | velká mezera vůči CERMATu (obrázkový) |
| Posloupnosti | 60, **všechny** v `grafy_logika` | placement konzistentní; otázka je, zda tam patří vůbec |
| Obtížnost zlomků (L1/L2/L3) | 81 / 114 / 87 | spread existuje, ale **seedování bere jen 10 NEJLEHČÍCH** → po diagnostice žák dostává jen L1 |

---

## Rozhodnutí pro Karla (co a v jakém pořadí opravit)
Návrh priorit (ty rozhodneš):

1. **🔴 Slovní úhly na obrázkové** — Q15, Q16 v diagnostice + 25 úloh `t09_*` v DB → nahradit diagramy (engine hotový). Největší kvalitativní zásah.
2. **🔴 Zlomky v diagnostice do KaTeX** — Q1, Q2: přepsat kvíz tak, aby renderoval `MathText`/KaTeX a používal stackované zlomky. (Nutná i technická úprava: diagnostika dnes KaTeX neumí.)
3. **🟠 Obtížnost diagnostiky** — přidat u každého tématu jednu **těžší** otázku (nebo nahradit ty nejlehčí Q7/Q9), ať rozliší úrovně; a/nebo seedovat i L2, ne jen 10 nejlehčích.
4. **🟠 Obrázky do geometrie/koláče v diagnostice** — Q7, Q8, Q11 s figurami.
5. **Posloupnost (Q12)** — rozhodni: nechat, nahradit čtením z grafu (koláč/sloupce), nebo přesunout do samostatné „logika" větve.
6. **🟠 Geometrie v DB** — 131/145 bez obrázku (samostatná velká dávka obsahu, mimo diagnostiku).

**Otázka na tebe:** které z 1–6 a v jakém pořadí? (A jestli u #2/#3 chceš, ať diagnostiku technicky napojím na stejné karty jako trénink — pak by uměla KaTeX i obrázky „zdarma".)
