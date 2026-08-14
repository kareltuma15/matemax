# Koncept: těžší a strukturované úlohy (tabulky, logika, těžké úhly/geometrie)

> Rozhodovací podklad pro Karla. Reakce na to, že základní obrázkové typy máme,
> ale CERMAT má i **strukturované a mnohem těžší úlohy**, které dnešní model
> plně nepokrývá. Cíl: **jeden promyšlený rámec**, ne lepení dalších tvarů.
> Navazuje na [OBRAZKOVE_ULOHY_STRATEGIE.md](OBRAZKOVE_ULOHY_STRATEGIE.md).

---

## ✅ Progress
- **[A] Režim výběru A–E — HOTOVO** (`MoznostiCard`): `moznosti[]` + `spravna` na DBExample; napojeno v tréninku (má přednost před ostatními kartami). Vykreslí `image` (parametrický i **statický**) + zadání + tlačítka A–E; po kliku odhalí správnou (zeleně), kroky řešení, Pokračovat. Ověřeno na `/moznosti-test`: parametrický obrázek + výběr, statický SVG (`/obrazky/geometrie/lichobeznik-slozeny.svg`) + výběr, i text + výběr. 3 úlohy v DB (`scripts/add-moznosti-priklady.mjs`). *(dočasná stránka `/moznosti-test` — po schválení smazat)*
- **[B] Tabulky — HOTOVO** (`TaskImage` kind `tabulka`): HTML tabulka v `TaskImageView` (hlavička, řádky, `null` buňka → „?", vodorovný scroll u širokých). 3 úlohy (`scripts/add-tabulka-priklady.mjs`): dopočet chybějící buňky z celku (hodnota), dvourozměrná tabulka psů + výběr A–E, porovnávací tabulka teplot. Funguje i v kombinaci **tabulka + výběr A–E**.
- **[C] Těžké úhly (`paprsky`) + °′ — HOTOVO**: `PaprskyDiagram` (víc přímek/paprsků jedním bodem, oblouky s popiskem α/β/γ nebo „126°30′", značka pravého úhlu). Řeší se přes **výběr A–E** (obchází parsování stupňů a minut). 3 úlohy (`scripts/add-paprsky-priklady.mjs`): vedlejší úhel, vrcholové úhly, úhly na přímce s pravým úhlem — vše ve stupních a minutách.
- **[D] Figurální posloupnosti — HOTOVO**: `FiguralniDiagram` (obrazec z jednotkových čtverečků po řadách, `rady:[1,3,5]`, volitelný titulek). 3 úlohy (`scripts/add-figuralni-priklady.mjs`): přímé spočítání, pokračování vzoru (n² pyramida), rozdíl obrazců A–E.
- **[E] statické SVG** pro nepravidelnou složenou geometrii — kdykoli k dispozici (hybrid), 0 h kódu, jen kreslení.

## ✅ Koncept KOMPLETNÍ
Všechny stavební kameny hotové: **[A] výběr A–E · [B] tabulky · [C] těžké úhly (paprsky, °′) · [D] figurální · [E] statické SVG**. Kombinace *libovolná figura × libovolný režim odpovědi* pokrývá i nejtěžší CERMAT úlohy. Dál už jen **objem obsahu** podle sešitu.

---

## Klíčová myšlenka: rozdělit úlohu na DVĚ nezávislé osy

Dosud jsme míchali „jak vypadá obrázek" a „jak se odpovídá". Perfektní koncept je
oddělit je — pak libovolně těžkou úlohu složíme z kombinace:

### Osa 1 — jak je úloha ZOBRAZENÁ (`image`)
| Druh | Kdy | Stav |
|---|---|---|
| **Parametrický diagram** | opakující se tvar (úhly, obrazce, tělesa, grafy) | ✅ 9 typů hotovo |
| **Tabulka** | data ke slovní úloze (i s chybějícími buňkami) | ⛔ nový typ (návrh níže) |
| **Statické SVG** | nepravidelná/složená figura, unikát (dlouhý ocas) | ✅ hybrid hotový, jen kreslit |

### Osa 2 — jak se ODPOVÍDÁ (režim odpovědi)
| Režim | Kdy | Stav |
|---|---|---|
| **Hodnota** (číslo/jednotka) | výsledek je jednoznačné číslo | ✅ hotovo |
| **Výběr A–E** (multiple choice) | těžké úlohy, kde výsledek není „hezké číslo" nebo se špatně zapisuje | ⛔ **nový režim — největší odemykač** |
| Znaménko (< = >) | porovnávání | ✅ ComparisonCard |
| Postup krok za krokem | konstrukce | ✅ ConstructionCard |

**Nejdůležitější závěr:** většina těžkých CERMAT úloh (tvůj obrázek 3 i 4) je
**s výběrem A–E**. Jakmile přidáme obecný **režim výběru**, umíme zadat *libovolně
těžkou* úlohu — i takovou, jejíž figura je statické SVG a výpočet je na 3 kroky —
protože odpověď je klik na možnost, ne parsování textu. To je jádro „dokonalého
konceptu": **těžká figura (statická/parametrická) + výběr A–E**.

---

## Jak to sedí na tvé 4 příklady

### 1) Tabulky ke slovním úlohám (obrázek 5 a 6 — psi v ulicích, porovnání)
- **Zobrazení:** nový parametrický typ `tabulka` — hlavička + řádky, některé buňky `?` (chybí, dopočítá se). Přesně formát CERMAT.
- **Odpověď:** hodnota (kolik psů…) nebo výběr A–E.
- **Nový kód:** `TabulkaDiagram { typ:"tabulka"; hlavicka:string[]; radky:(string|number|null)[][] }`; `null` → `?`. Vykreslovač ~2–3 h.
- **Autoring:** čistě JSON (mřížka hodnot). Škáluje.

### 2) Logické úlohy s obrázkem (obrázek 2 — pyramidy z kostek)
- **Zobrazení:** dvě cesty:
  - *Pravidelný vzor* (pyramida z n řad, schodiště) → malý parametrický typ `figuralni` (nakreslí n-tou figuru z mřížky čtverečků). Pokryje velkou část „posloupnost z obrázků".
  - *Unikátní obrázek* → statické SVG.
- **Odpověď:** hodnota (kolik kostek/otvorů) nebo A–E.
- **Nový kód:** `figuralni` vykreslovač ~3 h (volitelně; jinby rovnou statické).

### 3) Těžší úhly (obrázek 3 — tři přímky jedním bodem, °′, součet α+β+γ)
- **Zobrazení:** nový parametrický typ `paprsky` — několik přímek/paprsků jedním bodem, označené úhly α/β/γ, pravý úhel. Zvládne i „ilustrační, neměř".
- **Odpověď:** **výběr A–E** (CERMAT to tak má) — navíc obchází problém se zápisem stupňů a minut.
- **Nutné rozšíření:** podpora **stupňů a minut** (126°30′) v zobrazení; u hodnoty i grading °′ (jinak rovnou A–E).
- **Nový kód:** `paprsky` vykreslovač ~3–4 h + režim A–E.

### 4) Těžší geometrie (obrázek 4 — lichoběžník = čtverec + trojúhelník)
- **Zobrazení:** převážně **statické SVG** (složené/nepravidelné figury jsou moc různé na parametrizaci) — přesně dlouhý ocas, na který je hybrid.
- **Odpověď:** **výběr A–E** (tvůj obrázek 4 je A–E: „menší než 48 / 48 / 50 / 52 / větší než 52").
- **Nový kód:** žádný nový vykreslovač — jen režim A–E + Karel nakreslí SVG.

---

## Co tedy postavit (návrh pořadí)

| # | Co | Proč první | Odhad |
|---|---|---|---|
| **A** | **Režim výběru A–E** (obecná karta `MoznostiCard`, `moznosti[]` + `spravna`) | Odemyká VŠECHNY těžké úlohy napříč tématy; nezávislé na figuře | ~3–5 h |
| **B** | **Tabulka** (`tabulka` diagram, buňky `?`) | Celá kategorie slovních úloh z tabulek | ~2–3 h |
| C | `paprsky` (těžké úhly) + °′ | Konkrétní častý CERMAT typ | ~3–4 h |
| D | `figuralni` (pyramidy) nebo rovnou statické | Logické posloupnosti z obrázků | ~3 h / 0 h |
| E | Statické SVG pro složenou geometrii | Dlouhý ocas, jen kreslení | 0 h kódu |

**Doporučení:** začít **A (výběr A–E)** — je to univerzální stavební kámen; bez něj
těžké úlohy neumíme gradovat. Pak **B (tabulky)**. C/D/E podle toho, co budeš chtít
sypat. Statická cesta (E) je vždy k dispozici pro cokoli nepravidelného.

## Rozhodovací strom pro autoring (výsledný „recept")
1. **Figura:** standardní tvar → parametrický typ · data → `tabulka` · nepravidelná → statické SVG.
2. **Odpověď:** jednoznačné hezké číslo → hodnota · jinak (těžké, více tvarů, °′, „porovnej") → **výběr A–E**.
3. Doplnit `zadani`, `reseni_kroky`. Hotovo — bez kódu na úlohu.

---

## Otázky pro Karla
1. **Potvrzuješ režim výběru A–E jako první krok?** (doporučeno — odemyká zbytek)
2. **Tabulky** hned po něm?
3. `paprsky`/`figuralni` chceš jako parametrické, nebo ty těžké figury radši statické (rychlejší, ale kreslíš je ty)?
4. Číselná osa: **vypuštěna** (dle tebe není potřeba) — souhlas?
