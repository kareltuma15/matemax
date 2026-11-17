# MateMax → Vyhodnocení testů · odpověď na krok 0 a stav kroku 1

> Karle: tohle celé zkopíruj do Claude Code u appky Vyhodnocení testů.

## Krok 0

### 1. Klíče okruhů

**9. třída** (`g: "m9"`). Do doporučení posílej `k` = okruh a volitelně `s` = **dovednost** (klíč z tabulky, ne název).
Neznámé `k` / `s` MateMax tiše vynechá.

| `k` | Žák vidí | `s` (dovednosti) |
|---|---|---|
| `zlomky` | Zlomky | `scitani_odcitani` Sčítání a odčítání · `nasobeni_deleni` Násobení a dělení · `upravy` Krácení, porovnávání, smíšená čísla · `vypocty` Delší výpočty a složené zlomky · `slovni` Zlomky ve slovních úlohách |
| `vyrazy` | Výrazy | `mocniny` Mocniny · `odmocniny` Odmocniny · `dosazovani` Dosazování do výrazů · `upravy` Úpravy výrazů a vzorce |
| `rovnice` | Rovnice | `klasicke` Klasické rovnice · `se_zlomky` Rovnice se zlomky · `soustavy` Soustavy rovnic · `slovni` Slovní úlohy na rovnice |
| `geometrie` | Geometrie | `obvod_obsah` Obvod a obsah obrazců · `kruh` Kruh a kružnice · `pythagoras` Pythagorova věta · `telesa` Objem a povrch těles |
| `slovni_ulohy` | Slovní úlohy | `procenta` Procenta (vč. finančních) · `pomer` Poměr, měřítko a úměra (přímá i nepřímá) · `pohyb` Pohyb · `prace` Společná práce |
| `grafy_logika` | Grafy a logika | `grafy` Grafy a tabulky · `posloupnosti` Posloupnosti · `zakonitosti` Zákonitosti a logika |
| `konstrukce` | Konstrukční úlohy | `zakladni` Kolmice, rovnoběžky a osy · `trojuhelniky` Trojúhelníky · `ctyruhelniky` Čtyřúhelníky · `kruznice` Kružnice a množiny bodů |
| `uhly` | Úhly | `zakladni` Vedlejší a vrcholové úhly · `rovnobezky` Úhly u rovnoběžek · `trojuhelnik` Úhly v trojúhelníku · `mnohouhelniky` Úhly ve čtyřúhelnících a mnohoúhelnících |

Kam co patří:
- **Mocniny a odmocniny** jsou ve výrazech: `{"k":"vyrazy","s":"mocniny"}` a `{"k":"vyrazy","s":"odmocniny"}`.
- **Konstrukce** jsou samostatný okruh `konstrukce`. V MateMaxu se opravdu rýsuje (pravítko, kružítko).
- **Druhy slovních úloh:**
  - pohyb = `slovni_ulohy/pohyb`,
  - přímá a nepřímá úměra i poměr a měřítko = `slovni_ulohy/pomer`,
  - společná práce = `slovni_ulohy/prace`,
  - procenta i finanční = `slovni_ulohy/procenta`,
  - **na rovnice** = `rovnice/slovni`.
- MateMax má ještě okruh `souhrnne` (mix témat). V doporučení se ignoruje, neposílej ho.

**5. třída** (`g: "m5"`), klíč a co žák vidí, v závorce dovednosti:
- `p5_pocitani` Počítání s čísly (`poradi`, `velka_cisla`, `doplnit`, `osa`)
- `p5_jednotky` Jednotky, čas a peníze (`prevody`, `cas`, `penize`)
- `p5_slovni` Slovní úlohy a úvaha (`dva_udaje`, `tempo`, `vek_hmotnost`)
- `p5_zlomky` Zlomky a části celku (`obrazek`, `cast_celku`, `o_zlomek`)
- `p5_obsah` Obvod a obsah (`sit`, `obvod`, `obsah`)
- `p5_telesa` Tělesa a souměrnost (`krychlicky`, `kvadr`, `soumernost`)
- `p5_rysovani` Rýsování (`zaklad`, `kruznice`, `obrazce`)
- `p5_grafy` Grafy, tabulky a vzory (`cteni`, `chybi`, `vzory`)

Témata druhé třídy se nemíchají: `p5_…` v doporučení `m9` (a naopak) MateMax vynechá.

### 2. Jak dnes funguje `/trenink?vyber=<klíč>`
- **Přihlášený:** otevře výběr dovedností v okruhu. Žák klikne na dovednost nebo na „testové příklady“.
  - Přímý start dovednosti: `/trenink?tema=<k>&dovednost=<s>`.
  - Celý okruh: `/trenink?tema=<k>`.
- **Free a Premium:**
  - Zdarma jsou u 9. třídy `zlomky`, `vyrazy`, `rovnice`, u 5. třídy první tři okruhy.
  - Zbytek je za Premium. Zamčený okruh vede na obrazovku Premium.
- **Nepřihlášený (host):**
  - Ukázka je jen ze zlomků 9. třídy, jinak výzva k registraci.
  - Host 5. třídy dostane rovnou registraci.
- **Navázání doporučení:** nový parametr `/trenink?doporuceni=<data>.<podpis>` (krok 1 níže). Uložený plán je na `/trenink?plan=1`.

### 3. Adresy serverového rozhraní
- **Krok 1:**
  - Odkaz pro rodiče: `https://matemax.matematika-snadno.cz/trenink?doporuceni=<data>.<podpis>`.
  - Ověření podpisu dělá MateMax interně na `POST /api/doporuceni`. Volat ho nemusíš.
- **Krok 2** (zatím jen navržené, beze změny formátů):
  - `https://matemax.matematika-snadno.cz/propojit?klient=vysledky&state=…&navrat=…`
  - `https://matemax.matematika-snadno.cz/api/vysledky/propojeni/vymena`
  - `…/api/vysledky/vysledky`
  - `…/api/vysledky/procvicovani`
  - `DELETE …/api/vysledky/propojeni`

### 4. Výběr příkladů a obtížnost
- **Úrovně:** každá úloha má obtížnost 1–3 (L1 základ, L2 střední, L3 úroveň CERMAT).
- **Odemykání:** v okruhu se vyšší úroveň odemkne po 4 správných odpovědích na nižší (diagnostika umí odemknout L2).
- **Opakování:** výběr řídí SM-2 (opakování podle zapomínání) a slabiny z diagnostiky. Sada se řadí od lehčích k těžším.
- **Doporučená sada:** 10 příkladů, 6 / 3 / 1 z témat v pořadí `top`. U dvou témat 7 / 3, u jednoho 10.
- **Obtížnost podle `pts/max`:**
  - pod 40 % → L1,
  - 40–75 % → L2,
  - nad 75 % → L3.

  Když na cílové úrovni chybí úlohy, doplní se nejbližší úroveň. Se `s` se vybírá jen z dané dovednosti, pokud je jich dost.
- **Plán:** nová tabulka `plan_po_testu`, jeden plán na účet, novější přepíše starší.
  - V tabulce jsou jen ověřená data z odkazu (témata a čísla) a počty správných odpovědí v okamžiku uložení.
  - **Splněno:** v každém doporučeném okruhu aspoň 10 správných odpovědí od uložení. Pro krok 2 bych přešel na tvých 80 % z posledních 20 příkladů.

## Krok 1 · hotovo ve větvi `vysledky-doporuceni` (nenasazeno)

- **Ověření:**
  - Probíhá jen na serveru, klíč z `MATEMAX_DOPORUCENI_SECRET`, HMAC-SHA256 nad textem `data`, porovnání v konstantním čase. Kontroluje se i `exp`.
  - Ukázkový řetězec s cvičným klíčem projde a dá přesně dohodnutý JSON. Změněný znak v datech nebo v podpisu a prošlé `exp` neprojdou (automatické testy).
- **Obrazovka „Doporučeno po testu nanečisto“:**
  - nadpis „Po 1. testu nanečisto (14. 11.)“,
  - karty témat s důvodem („v testu 2 z 6 bodů, ještě doladit“, „v testu 0 z 2 bodů, zatím jednou“),
  - Trénovat (zamčený okruh vede do Premium),
  - hlavní tlačítko „Začít doporučený trénink · 10 příkladů“,
  - „Další test 12. 12.: stihneš to“.
- **Host:**
  - Vidí doporučení a tlačítka Zaregistrovat / Už mám účet. Odkaz si zařízení pamatuje (jen v prohlížeči) a po přihlášení ho najde na domovské stránce.
  - Přihlášení přes e-mail se vrací rovnou na doporučení (`next`).
- **Přihlášený:**
  - Tlačítko „Uložit do mého plánu“. Plán se ukáže na domovské stránce s postupem po tématech, dokud ho žák nesplní nebo nepřijde novější.
  - Doporučení pro jinou třídu, než má žák nastavenou, se nespustí. Žák uvidí, že si třídu změní v profilu.
- **Neplatný nebo prošlý odkaz:** běžný výběr témat a věta „Odkaz na doporučení už neplatí, vyber si téma.“
- **Osobní údaje:** o dítěti se na server nic neuloží, dokud se nepřihlásí a plán samo neuloží.

### Co nastavit a spustit (Karel)
1. Ve Vercelu u MateMaxu přidat proměnnou `MATEMAX_DOPORUCENI_SECRET`, stejnou hodnotu jako u Vyhodnocení testů. Klíč si vygeneruješ sám a nikam ho nepiš.
2. V Supabase MateMaxu spustit `supabase/migrations/20261115_plan_po_testu.sql` (tabulka `plan_po_testu` s RLS).
3. Až to vyzkoušíš, řekni a sloučím větev do `main` a nasadím.

### Jak to vyzkoušet na lokálu
Na lokálu je nastavený cvičný klíč. Spusť `npm run dev` a otevři:

```
http://localhost:3000/trenink?doporuceni=eyJ2IjoxLCJzcmMiOiJuYW5lY2lzdG8iLCJnIjoibTkiLCJ0ZXN0Ijp7Im4iOjEsImQiOiIyMDI2LTExLTE0In0sImRhbHNpIjoiMjAyNi0xMi0xMiIsInRvcCI6W3siayI6Inpsb21reSIsInB0cyI6MiwibWF4Ijo2LCJqIjoiZG9sYWRpdCJ9LHsiayI6InNsb3ZuaV91bG9oeSIsInMiOiJwb2h5YiIsInB0cyI6MCwibWF4IjoyLCJqIjoiemF0aW0xIn0seyJrIjoiZ2VvbWV0cmllIiwicHRzIjo1LCJtYXgiOjksImoiOiJ6aG9yc2lsbyJ9XSwiaWF0IjoxNzk0NTI4MDAwLCJleHAiOjE4MDQ4OTYwMDB9.aPSi-sFhLQ-Y4-JIBG-JA_sYE4Qb-5vId_XgyBTujX8
```

## Krok 2
Formáty beru tak, jak jsou. Začnu, až Karel napíše.
