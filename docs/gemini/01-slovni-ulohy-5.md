# Zadání pro Gemini 01: slovní úlohy pro 5. třídu

Spolupráce: Gemini navrhne úlohy → Karel pošle výstup Claudovi (jako text, ne obrázek) → Claude přepočítá výsledky,
zkontroluje pravidla 5. třídy, doplní postup řešení a vloží úlohy do appky → Karel napíše „nasaď“.

Proč tyhle: slovní úlohy mají v MateMaxu pro 5. třídu nejméně úloh (Kolik za hodinu 6, Kolik dohromady 10, Věk a hmotnost 14)
a v žádné dovednosti 5. třídy zatím není úroveň 3 (skutečná úroveň přijímaček CERMAT).

---

## Text ke zkopírování do Gemini

Připrav 45 slovních úloh z matematiky pro žáky 5. třídy, kteří se připravují na přijímací zkoušky na víceleté gymnázium (CERMAT). Úlohy budou v aplikaci, kde žák napíše jedno číslo jako odpověď.

Rozdělení:
- 15 úloh „Kolik za hodinu, za den“: stejně rychlá práce nebo výroba (pekař, robot, tiskárna, čerpadlo, cyklista), kolik za jednotku času, za kolik hodin, kolik za více dní.
- 15 úloh „Kolik dohromady, kolik víc“: úlohy na dva a více kroků s nákupy, penězi, body, vzdálenostmi, porovnání o kolik víc nebo méně.
- 15 úloh „Věk a hmotnost“: kolik let bude nebo bylo, součet a rozdíl věků, kolik váží jeden kus, když víme součet a rozdíl.

V každé skupině 5 úloh na každou úroveň:
- Úroveň 1 (lehká): jeden až dva kroky, malá čísla, žádné dělení dvojciferným číslem.
- Úroveň 2 (střední): dva až tři kroky, čísla do tisíců, dělení dvojciferným číslem jen když vyjde beze zbytku.
- Úroveň 3 (těžká, úroveň přijímaček CERMAT): úloha na úvahu, ne na dosazení do vzorce. Například součet a rozdíl dvou neznámých, „o tolik víc, kolikrát“, práce dvou strojů současně, zpětný postup od konce, změna o stejný počet let u dvou lidí.

Pravidla:
- Odpověď je vždy jedno celé nezáporné číslo. Napiš i jednotku (korun, kusů, let, gramů, hodin, km).
- Žádné desetinné výsledky, žádné zlomky ve výsledku, žádné zbytky po dělení, žádná dělitelnost.
- Mezivýsledky také celá nezáporná čísla.
- Každá úloha má jen jednu otázku a jednoznačnou odpověď. Žádné „přibližně“.
- Realistický český kontext (koruny, české názvy, škola, sport, výlety), různá jména dívek i chlapců. Žádné stereotypy.
- Krátké a srozumitelné zadání pro 11letého žáka, nejvýš tři věty.
- Úlohy se nesmí opakovat ani lišit jen čísly.

Výstup pošli jako text (ne obrázek), jednu tabulku se sloupci:
č. | skupina | úroveň | zadání | výsledek (číslo a jednotka) | postup (2–4 krátké kroky s výpočty)

---

## Po vložení (Claude)

- Přepočítat všech 45 výsledků a mezivýsledků programem, zkontrolovat pravidla 5. třídy (`feedback_5_trida_rozsah_ucivo`).
- Zařadit do `src/data/databaze-5.json`: téma `p5_slovni`, podtémata `p5_tempo` / `p5_dva_udaje` / `p5_vek` nebo `p5_hmotnosti`.
- `npm run audit:odpovedi`, `node scripts/audit-katex.mjs`, zápis do kroniky (`src/data/kronika-obsahu.json`), testy obsahu.
