# 5. třída: typy úloh z testů CERMAT a karty v appce

Podle rozboru v `docs/CERMAT-5-ROZBOR.md` (18 sešitů v `docs/cermat-5`). Stav k 1. 11. 2026.

| Úlohy v testu | Co je to za typ | Karta v appce | Stav |
|---|---|---|---|
| 1–6, 14 | Píše se jen výsledek, často 2–5 podúloh (4.1, 4.2, 4.3) | jedno políčko: `PracticeCard`; více podúloh: `VicOdpovediCard` (pole `podulohy`) | hotovo, první dávka v náhledu |
| 7 | Rýsování, 7.1 a 7.2 | `ConstructionMarkCard` | hotovo |
| 8 | Tvrzení pravda / nepravda (A/N) | zatím jen jako výběr A–E (`MoznostiCard`) | **mezera**: chybí karta s tvrzeními a ANO/NE u každého |
| 9–12 | Výběr z A–E | `MoznostiCard` | hotovo |
| 13 | Přiřazování tří položek k nabídce A–F | `VicOdpovediCard` (pole `prirazeni`) | hotovo, první dávka v náhledu |

## Jak se to ukládá v databázi

- **Podúlohy:** `zadani` je společný úvod, `podulohy` je seznam `{ otazka, odpoved, jednotka? }`. `odpoved` úlohy = výsledky podúloh oddělené ` ; `. Úloha je správně, jen když jsou správně všechny podúlohy (každá se vyhodnotí stejně jako běžná odpověď).
- **Přiřazování:** `prirazeni` = `{ nabidka: [až 6 hodnot], polozky: [{ text, spravna }] }`, kde `spravna` je pořadí v nabídce od nuly. `odpoved` úlohy = např. `1–C ; 2–A ; 3–F`.
- Obě karty se vykreslí v tréninku, v diagnostice pro 5. třídu i v náhledu. Úlohy s těmito poli nesmí do stránek, které umí jen text a políčko (`isPlainTyped` je vylučuje).

## Co zbývá

1. Schválit a zapsat první dávku (P5_VIC_01–15).
2. Karta pro úlohu 8 (pravda / nepravda u několika tvrzení), pokud ji chceš: dnes by se úloha 8 musela převést na výběr A–E.
3. Další dávky úloh s podúlohami hlavně v okruzích, kde je v testech najdeme nejčastěji (počítání, jednotky, slovní úlohy).
4. Simulace přijímaček pro 5. třídu: použije všechny karty výše (úlohy 1–14, 70 minut, 50 bodů).
