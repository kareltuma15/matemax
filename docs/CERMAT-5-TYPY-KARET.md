# 5. třída: typy úloh z testů CERMAT a karty v appce

Podle rozboru v `docs/CERMAT-5-ROZBOR.md` (18 sešitů v `docs/cermat-5`). Stav k 1. 11. 2026.

| Úlohy v testu | Co je to za typ | Karta v appce | Stav |
|---|---|---|---|
| 1–6, 14 | Píše se jen výsledek, často 2–5 podúloh (4.1, 4.2, 4.3) | jedno políčko: `PracticeCard`; více podúloh: `VicOdpovediCard` (pole `podulohy`) | hotovo, první dávka v náhledu |
| 7 | Rýsování, 7.1 a 7.2 | `ConstructionMarkCard` | hotovo |
| 8 | Tvrzení pravda / nepravda (A/N) | `VicOdpovediCard` (pole `tvrzeni`, u každého tvrzení ANO / NE) | hotovo, první dávka (10 úloh) v náhledu |
| 9–12 | Výběr z A–E | `MoznostiCard` | hotovo |
| 13 | Přiřazování tří položek k nabídce A–F | `VicOdpovediCard` (pole `prirazeni`) | hotovo, první dávka v náhledu |

## Jak se to ukládá v databázi

- **Podúlohy:** `zadani` je společný úvod, `podulohy` je seznam `{ otazka, odpoved, jednotka? }`. `odpoved` úlohy = výsledky podúloh oddělené ` ; `. Úloha je správně, jen když jsou správně všechny podúlohy (každá se vyhodnotí stejně jako běžná odpověď).
- **Přiřazování:** `prirazeni` = `{ nabidka: [až 6 hodnot], polozky: [{ text, spravna }] }`, kde `spravna` je pořadí v nabídce od nuly. `odpoved` úlohy = např. `1–C ; 2–A ; 3–F`.
- **Pravda / nepravda:** `tvrzeni` = seznam `{ text, pravda }`, 3–4 tvrzení. `odpoved` úlohy = `A ; N ; N ; A`. Řešení má jeden krok na tvrzení a začíná „Platí:“ / „Neplatí:“. V dávce má být zhruba polovina tvrzení pravdivých, aby se nedalo tipovat.
- Všechny tři tvary se vykreslí v tréninku, v diagnostice pro 5. třídu i v náhledu. Úlohy s těmito poli nesmí do stránek, které umí jen text a políčko (`isPlainTyped` je vylučuje).

## Co zbývá

1. Schválit a zapsat dávku pravda / nepravda (P5_VIC_16–25). Dávka podúloh a přiřazování (P5_VIC_01–15) je schválená a zapsaná.
2. Další dávky úloh s podúlohami hlavně v okruzích, kde je v testech najdeme nejčastěji (počítání, jednotky, slovní úlohy).
3. Simulace přijímaček pro 5. třídu: použije všechny karty výše (úlohy 1–14, 70 minut, 50 bodů).
