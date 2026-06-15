# Audit databáze příkladů — 2026-06-15

> Snímek stavu 884 příkladů po namapování na 9 sjednocených témat. Vstup pro Fáze 3–5. Skript: `.tmp-pdf-study/audit.js`.

## Rozložení (téma × obtížnost) + KaTeX kandidáti

| téma | ⭐ lehké | ⭐⭐ střední | ⭐⭐⭐ těžké | celkem | KaTeX kandidátů |
|------|--------|-----------|-----------|--------|------|
| zlomky | 26 | 53 | 29 | 108 | **89** |
| vyrazy | 47 | 60 | 56 | 163 | **116** |
| rovnice | 32 | 54 | 22 | 108 | 5 |
| geometrie | 37 | 71 | 22 | 130 | 36 |
| slovni_ulohy | 55 | 108 | 47 | 210 | 18 |
| grafy_logika | 32 | 30 | 23 | 85 | 6 |
| **konstrukce** | 0 | 0 | 0 | **0** ⚠️ | 0 |
| uhly | 10 | 7 | 3 | 20 | 0 |
| souhrnne | 2 | 48 | 10 | 60 | 20 |

`obtiznost` je uložené jako `1/2/3` → mapuje přímo na lehké/střední/těžké (label konvence, data se nemění).

## Slovní úlohy → podtémata (z 210)
procenta 92 · pohyb 36 · **(nezatříděno) 34** · spolecna_prace 21 · pomer_meritko 20 · finance 4 · umera 3

## Akce (priority)
1. **konstrukce: 0 příkladů** — vytvořit od nuly (je v každém CERMAT testu). Varianta (b) = interaktivní výběr postupu.
2. **KaTeX migrace** — primárně `zlomky` (89) + `vyrazy` (116) ≈ 205 příkladů s matematickou notací.
3. **slovni_ulohy podtémata** — zatřídit 34 „nezatříděno", doplnit tenké `finance` (4) a `umera` (3) — v sešitu jsou plné podkapitoly.
4. **uhly** tenké (20, jen 3 těžké) · **souhrnne** skoro bez lehkých (2).
5. **Migrace témat 14→9** + sjednocení chaotického `podtema` (rozbitá diakritika „m_ritko", „pom_r").

## Pozn. k `podtema`
Stávající `podtema` má stovky nekonzistentních hodnot vč. rozbité diakritiky (ě→_). Při migraci sjednotit na čistý číselník per téma.
