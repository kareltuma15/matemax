# Rozbor přijímaček z matematiky pro 5. třídu (CERMAT) a návrh obsahu MateMaxu

Zdroj: 10 čitelných testových sešitů (2025: varianty A–D, 2026: varianty A–D, 2024: C a D). Dva sešity z roku 2024 (A, B) mají poškozené písmo a nešly přečíst. Úlohy se v MateMaxu **nekopírují**, vytváříme vlastní ve stejném stylu. PDF jsou ve složce `docs/cermat-5/` a do gitu nepatří.

## 1. Formát testu (ověřeno z testových sešitů)

- **14 úloh, 50 bodů**, povolené jen psací a rýsovací potřeby (bez kalkulačky).
- Časový limit je v sešitu uveden jen odkazem na záznamový arch, **přesný čas v minutách z podkladů nevyčtu**. Prosím doplň (viz otázky na konci).
- Úlohy **1–6 a 14**: píše se jen výsledek; mají 2–5 podúloh (např. 4.1, 4.2, 4.3).
- Úloha **7**: rýsování (6 bodů), vždy dvě podúlohy 7.1 a 7.2, často „najděte všechna řešení“.
- Úlohy **8–13**: nabídka odpovědí. 8 = tvrzení pravda/nepravda (A/N), 9–12 = výběr A–E (po 2 bodech), 13 = přiřazování tří podúloh k odpovědím A–F (5 bodů).
- Za špatnou odpověď se neodečítají body.

## 2. Co která úloha ověřuje (v každém ročníku stejná kostra)

| Úloha | Body (zhruba) | Téma | Typické zadání (vlastními slovy) |
|---|---|---|---|
| 1 | 4–5 | **Počítání s čísly** | pořadí operací, násobení a dělení větších čísel, doplnit číslo do rámečku |
| 2 | 2–5 | **Jednotky, čas, peníze** | převody délky a hmotnosti, kolik dílů se vejde do času, časový údaj „hodiny:minuty“, tabulka nebo diagram s doplněním čísel |
| 3 | 3 | **Úvaha a logika** | pořadí v seznamu, mince, hmotnosti a ceny podle tempa nebo poměru |
| 4 | 4–5 | **Slovní úloha** | dva a více údajů, které se musí skloubit (kapesné, tempo robotů, kuličky na váze) |
| 5 | 3–4 | **Obsah a obvod** | čtvercová síť, obrazce, přepočet měřítka, rozdíl obsahů |
| 6 | 4–5 | **Obvod a obrazce** | rovnostranné trojúhelníky, čtverce, skládání a přeskládání obrazců, rozdíl obvodů |
| 7 | 6 | **Rýsování** | sestrojit vrcholy obdélníku, čtverce nebo trojúhelníku ze zadaných bodů a přímek, střed strany, shodná vzdálenost |
| 8 | 4 | **Grafy a diagramy** | tři tvrzení A/N podle sloupcového nebo kruhového diagramu, často s chybějícím údajem |
| 9–12 | 4 × 2 | **Smíšené úlohy** | mince a peníze, tělesa z krychliček, osová souměrnost, čas, zlomky („o čtvrtinu více“), úseky a obvody |
| 13 | 5 | **Přiřazování** | tři zadání, ke každému správná hodnota z šesti nabídnutých |
| 14 | 4 | **Vzory a posloupnosti** | obrazce, které přibývají podle pravidla, pravidla hry, výměnné úlohy (desky/prkna), „uveďte všechna řešení“ |

Náročnost je vyšší, než by čekal čtvrťák: téměř každá úloha vyžaduje **úvahu**, ne jen počítání. V MateMaxu to odpovídá úrovni L3.

## 3. Návrh okruhů pro 5. třídu (8 témat)

| # | Okruh | Co v něm je | Pokrývá úlohy |
|---|---|---|---|
| 1 | Počítání s čísly | pořadí operací, násobilka, dělení, doplňování čísel, zaokrouhlování | 1, část 2 |
| 2 | Jednotky, čas a peníze | převody, čas hodiny:minuty, mince, ceny | 2, část 9–12 |
| 3 | Slovní úlohy a úvaha | dva údaje „z hlavy“, tempo, hmotnosti, mince, věk | 3, 4, část 9–12 |
| 4 | Zlomky a části celku | polovina, třetina, čtvrtina, „o třetinu více“ | 13, část 9–12 |
| 5 | Obvod a obsah | čtvercová síť, skládání obrazců, rozdíly obsahů | 5, 6 |
| 6 | Tělesa a souměrnost | krychličky, stavby, osová souměrnost, pohledy | 11–13 |
| 7 | Rýsování | kolmice, střed, kružnice, čtverec a obdélník, trojúhelník | 7 |
| 8 | Grafy, tabulky a vzory | čtení grafů, tvrzení A/N, tabulky s čísly, posloupnosti obrazců | 8, 14 |

**Rozsah:** cílově 300–400 úloh (zhruba 40–50 na okruh), tři úrovně: L1 základ ze 4.–5. třídy, L2 střední, L3 úroveň přijímaček. První balíček do 14. 11.: okruhy 1, 2, 3 a 5 (60–80 úloh); rýsování (okruh 7) hned po nich, protože rýsovací kartu už máme.

**Zdarma / Premium:** stejné pravidlo jako u 9. třídy (první tři okruhy zdarma), pokud rozhodneš jinak, řekni.

## 4. Co je potřeba vyvinout navíc (v aplikaci)

1. **Třída při registraci** (5 nebo 9) a úlohy podle třídy. Základ pro všechno ostatní.
2. **Karta s více odpověďmi:** úlohy 1–6 a 14 mají podúlohy (4.1, 4.2, 4.3) s vlastním výsledkem. Dnes umíme jen jednu odpověď. Na začátek můžeme podúlohy rozdělit na samostatné úlohy, plnohodnotná karta přijde ve druhé vlně.
3. **Karta „přiřaď A–F“** pro úlohu typu 13 (druhá vlna).
4. **Rýsování pro 5. třídu:** stávající karta stačí, přibudou jen nové scény (čtverec, obdélník, trojúhelník podle zadaných bodů).
5. **Grafy a diagramy:** generátor sloupcových a kruhových grafů už máme; přibudou grafy s chybějícím údajem.

## 5. Úrovně náročnosti pro 5. třídu

- **L1:** jednokrokové úlohy s jedním údajem (např. převod, jednoduchý výpočet, čtení jednoho údaje z grafu).
- **L2:** dva kroky, dva údaje, obrázek (čtvercová síť, tabulka).
- **L3:** slovní a logické úlohy ve stylu přijímaček (více podúloh, „najděte všechna řešení“, skládání informací).

## 6. Otázky na Karla

1. **Časový limit** testu pro 5. třídu v minutách (fakt `cermat_format` je jen pro 9. třídu).
2. Souhlasíš s osmi okruhy a s pořadím pro první balíček (1, 2, 3, 5)?
3. Mají mít žáci 5. třídy stejné rozdělení zdarma/Premium?
4. Souhlasíš, že úlohy pro 5. třídu píšeme na tykání a v jednodušší češtině než pro 9. třídu?
5. Souhlasíš, že fakt „sešit, MateMax a videolekce jsou jen pro 9. třídu“ upravím na „MateMax je pro 5. i 9. třídu“ až ve chvíli, kdy bude první balíček hotový?

## 7. Kalibrace obtížnosti podle dalších osmi testů (2022 a 2023, varianty A–D; doplněno 29. 10. 2026)

Celkem jsme rozebrali 18 sešitů (2022–2026). Dodatečné testy potvrzují kostru z oddílu 2 a upřesňují, **jak těžké úlohy jsou**.

**Co určuje obtížnost L3 (úroveň přijímaček):**
- Každá úloha má 2–4 podúlohy, které na sebe často navazují (6.1 → 6.2 → 6.3). Poslední podúloha je nejtěžší.
- Úvaha místo vzorce: soustava dvou podmínek (dvouhlaví a tříhlaví draci, 5 a 10 Kč mince se stejnou hodnotou), součet dvou údajů a rozdíl (Venn: kroužky, palindromy), „najděte všechna řešení“.
- Zlomky: nejčastěji **o polovinu, o třetinu, o pětinu, o čtvrtinu**, dále šestina a desetina; většinou jako „o zlomek víc/míň“ nebo „zlomek z celku, zbytek je dané číslo“.
- Obrazce: obvod složeného obrazce ze čtverců, trojúhelníků a obdélníků, kde strany spolu souvisí (rozdíl obvodů, „obvod čtverce = obvod trojúhelníku“); čtvercová síť (osová souměrnost, obsah mřížového obrazce).
- Vzory a posloupnosti (úloha 14): pyramida z řad, rostoucí obrazce, opakující se řada čísel; ptají se na malé číslo, na velké (73. řada) i obráceně („kolik řad má pyramida“).
- Diagramy se šipkami a písmeny (úloha 13): dosazení stejného čísla za symbol, výpočet po šipkách.

**Úroveň L1 a L2 v MateMaxu:** L1 je úvod (jeden krok, jedno číslo, procvičení základu), L2 se přibližuje (dva kroky, dva údaje, obrázek), L3 odpovídá skutečné úloze testu včetně podúloh.

**Rozpor s dřívějším pravidlem (nutno odsouhlasit s Karlem):**
- **Dělení dvouciferným číslem** je v testech vždy, ale jen s „hezkými“ čísly: 440 : 20, 2 000 : 40, 1 600 : 40, 384 : 16, : 11, : 12, : 21. Zbytek po dělení se objevil v 2022 C („213 : □ = 14, zbytek 3“).
- **Převody přes více jednotek** se také objevují: „2 m 72 cm − 520 mm + 100 cm“, „18 m − 15 dm + □ cm = 20 m“, „20 km + 34 000 cm v metrech“, „1 hodina = 20 minut + □ sekund“.
- Dělitelnost a „násobky a dělitele“ jako samostatné téma v testech nejsou (potvrzeno).

Úlohy MateMaxu zůstávají vlastní (nekopírujeme zadání ani čísla).
