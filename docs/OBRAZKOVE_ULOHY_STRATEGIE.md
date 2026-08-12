# Obrázkové úlohy — strategie škálování

> Rozhodovací podklad pro Karla. **Nic se neimplementuje**, dokud Karel nerozhodne.
> Kontext: 943 úloh (většinou textové, 7 s diagramem), sólo autor, deadline **listopad 2026**
> pro plnohodnotný CERMAT trénink, CERMAT úlohy jsou často obrázkové.

---

## ✅ Progress (checklist implementace)

**Rozhodnutí Karla (2026-08-09):** hybrid parametrický-first ANO · hosting `public/obrazky/` (SVG) ·
pořadí typů: 1) rovinné obrazce → 2) souřadnicová síť/graf → 3) úhly rozšíření → 4) prostorová tělesa →
5) sloupcový/koláčový graf → 6) číselná osa. Postup **po jednom typu**, mezi nimi pauza na schválení.

### Fáze 0 — Hybrid `image` pole (základ) ✅ HOTOVO
- [x] Typ `TaskImage = { kind:"parametric"; diagram } | { kind:"static"; url,width,height,alt }` (`src/types/index.ts`)
- [x] `DBExample.diagram` → `DBExample.image`
- [x] Komponenta `TaskImageView.tsx` (přepíná parametric/static; statika = `<img>` z `public/`, bílé pozadí + rámeček kvůli dark mode, `alt` povinné, `loading="lazy"`)
- [x] Napojení v `PracticeCard.tsx`
- [x] Migrace 7 stávajících úloh `diagram` → `image` (`scripts/migrate-diagram-to-image.mjs`, proběhlo)
- [x] Ukázkový statický SVG (`public/obrazky/ukazka/staticka-ukazka.svg`) + ověřeno servírování (200, `image/svg+xml`)

### Fáze 1 — Typ #1: Rovinné obrazce ✅ HOTOVO (čeká schválení Karla)
- [x] `LichobeznikDiagram` (základny a ∥ c, výška v, volitelná ramena b, d) + vykreslovač
- [x] `KruhDiagram` (poloměr **nebo** průměr) + vykreslovač
- [x] Engine už uměl `obdelnik` + `trojuhelnik` — spolu s lichoběžníkem a kruhem pokrývá jádro rovinné geometrie
- [x] **Ověření autoringu:** 5 nových úloh jen přes JSON (`scripts/add-rovinne-priklady.mjs`): obsah/obvod lichoběžníku, obvod/obsah kruhu z r, obvod kruhu z d — hodnocení odpovědí ověřeno (30 cm², 24 cm, 31,4 cm, 28,26 cm²)
- [x] Vizuální ověření: `/diagram-test` renderuje všech 9 parametrických typů + statickou ukázku, konzole bez chyb
- [ ] **⏸ PAUZA — Karel schválí vzhled** (lichoběžník, kruh) na deploym. `/diagram-test`, pak pokračuje typ #2
- [ ] Složené obrazce (Karel zmínil) — **odloženo** na později, není blokující

> Poznámka: `/diagram-test` je **dočasná** stránka — smazat po schválení všech typů.

### ⚠️ Oprava kurzu (Karel, 2026-08-10): „grafy" = koláč/sloupce, NE kartézská soustava
Karel u reálné CERMAT úlohy upozornil, že „grafy" v CERMATu jsou **koláčové a sloupcové grafy
ke slovním úlohám** (např. rozdělení dne z 24 h → kolik hodin v zaměstnání; volný čas → minuty
sportu), **ne čtení souřadnic v kartézské soustavě**. Kartézský typ byl proto **zrušen** (kód,
4 úlohy, ukázky, podtéma `souradnice` odstraněny). Typ #2 = **koláčový graf**.

### Fáze 2 — Typ #2: Koláčový graf (formát CERMAT) ✅ HOTOVO (čeká schválení Karla)
- [x] `KolacovyGrafDiagram` (`typ:"kolac"`, `nazev`, `casti:[{label,procenta}]`) + vykreslovač: výseče s bílým oddělením, **procenta uvnitř výsečí s automatickým kontrastem** (bílá/tmavá dle výplně), legenda vpravo, titulek
- [x] Podtéma `cteni_grafu` („Čtení z grafu") — figura ukazuje jen %, absolutní celek (24 h, 30 žáků) nese text zadání
- [x] **Ověření autoringu:** 4 nové úlohy jen přes JSON (`scripts/add-kolac-priklady.mjs`): hodiny v zaměstnání (25 % z 24 h = 6 h), hodiny spánku (8,4 h), minuty sportu se zaokrouhlením (50 min), počet žáků (12) — hodnocení odpovědí ověřeno
- [x] Vizuální ověření na `/diagram-test`: 4 výseče, žádný přetok mimo rámeček, kontrast popisků OK, konzole bez chyb
- [ ] **⏸ PAUZA — Karel schválí vzhled koláče**, pak pokračuje typ #3

### Fáze 3 — Typ #3: Sloupcový graf ✅ HOTOVO (čeká schválení Karla)
- [x] `SloupcovyGrafDiagram` (`typ:"sloupce"`, `nazev`, `jednotka`, `sloupce:[{label,hodnota}]`) + vykreslovač: osa y s **automatickou „hezkou" škálou** (kroky 1/2/2,5/5/10), dělící čáry, hodnota nad každým sloupcem, barevné sloupce, popisky kategorií
- [x] **Ověření autoringu:** 4 nové úlohy jen přes JSON (`scripts/add-sloupce-priklady.mjs`): přímé čtení, rozdíl dvou sloupců, součet, druhý graf (počet sourozenců) — hodnocení odpovědí ověřeno
- [x] Vizuální ověření na `/diagram-test`: 5 sloupců, škála 0–40 po 10, výšky sedí, nic nepřetéká, konzole bez chyb
- [ ] **⏸ PAUZA — Karel schválí vzhled sloupce**, pak pokračuje typ #4

> **Cache hardening (2026-08-11):** `sw.js` navigace teď `cache:"no-store"` + `CACHE v4→v5` —
> po deployi se stránka nebude držet ze staré cache (projeví se po první aktualizaci SW).

### Fáze 4+ — další typy (⏳ čeká na zelenou po fázi 3)
- [ ] #4 Úhly — rozšíření (v mnohoúhelníku, obecně v trojúhelníku)
- [ ] #5 Prostorová tělesa + sítě
- [ ] #6 Číselná osa
- [ ] Tabulka dat (volitelně) + složené obrazce (odloženo z #1)

**Stav obrázkových úloh:** 7 → **20** (7 migrovaných + 5 rovinných + 4 koláčové + 4 sloupcové). Nové typy engine: 3 → **7** (obdélník, trojúhelník, úhly-příčka, lichoběžník, kruh, koláč, sloupce).

---

## 1. Audit současného engine

### 1.1 Co engine umí (`src/components/DiagramView.tsx` + typ `Diagram` v `src/types/index.ts`)
Parametrický SVG vykreslovač, 3 typy:

| Typ | Co kreslí | Použito v úlohách |
|---|---|---|
| `uhel_pricka` | dvě rovnoběžky p ∥ q + příčka, vyznačený daný a hledaný úhel (souhlasný/střídavý/vedlejší/vrcholový) | 3 |
| `trojuhelnik` | trojúhelník ABC s popisky úhlů (α/β/γ) a stran, jeden „?" | 2 |
| `obdelnik` | obdélník s kótami šířky a výšky | 2 |

**Celkem 7 úloh z 943.** Vlastnosti enginu: ostré (SVG), **dark-mode aware** (dědí `currentColor`), zdarma, bez copyright rizika, **autoring instance = jen JSON parametry** (bez kódu).

**Zásadní vlastnost pro rozhodování:** engine škáluje *instance* zadarmo (nová úloha = pár čísel v JSON), ale každý **nový TYP figury vyžaduje kód** (nová větev ve vykreslovači + varianta v typu). Limit není počet úloh, ale počet *typů*.

### 1.2 Nejčastější typy figur v CERMAT (a v pracovním sešitu)
Podle formátu CERMAT (didaktický test 9. tříd) a struktury sešitu jsou obrázkové úlohy zhruba v těchto kategoriích (sestupně dle četnosti — orientační, ne z oficiální statistiky):

1. **Rovinná geometrie s kótami** — obdélník, čtverec, trojúhelník, lichoběžník, kruh/kružnice, složené obrazce (obvod, obsah). *Nejčastější.*
2. **Úhly** — u rovnoběžek s příčkou, v trojúhelníku/mnohoúhelníku, vedlejší/vrcholové.
3. **Souřadnicová rovina / grafy** — body, přímka, čtení z grafu, jednoduché funkce, posloupnosti v tabulce/obrázku.
4. **Prostorová tělesa** — kvádr, krychle, válec; sítě těles; povrch/objem.
5. **Čtení z tabulek a diagramů** — sloupcový/koláčový graf, tabulka dat.
6. **Nepravidelné / kombinované** — plánky, mapy, dlaždice, „obrázkové" slovní úlohy (dlouhý ocas jedinečných figur).

### 1.3 Největší mezery enginu vs. CERMAT
- **Pokrytí typů:** engine má 3 z ~6 hlavních kategorií (a i v nich jen dílčí případy — chybí lichoběžník, kruh, složené obrazce).
- **Chybí úplně:** souřadnicová síť/grafy, prostorová tělesa a sítě, sloupcové/koláčové grafy a tabulky, obecný mnohoúhelník, číselná osa.
- **Dlouhý ocas:** nepravidelné figury (plánky, mapy, netypické obrázky), které se nevyplatí parametrizovat — každá je unikát.

**Závěr auditu:** engine je správný základ pro *opakující se* typy, ale sám o sobě nikdy nepokryje nepravidelný dlouhý ocas. To je přesně důvod pro hybrid.

---

## 2. Návrh hybridního přístupu (parametrický + statický)

### 2.1 Fungovalo by to technicky? **Ano.**
Návrh sjednotit do jednoho pole `image` s diskriminovanou unií je čistý a sedí do současné architektury (už teď máme `diagram?: Diagram` a `DiagramView` větvící podle `typ`).

Doporučená podoba schématu (mírná úprava tvého návrhu — sjednotit pod jedno pole):
```jsonc
// varianta A — parametrický (beze změny logiky, jen zabalené)
"image": { "kind": "parametric", "diagram": { "typ": "trojuhelnik", "alfa": 60, ... } }

// varianta B — statický
"image": {
  "kind": "static",
  "url": "/obrazky/uhly/stridave-01.svg",   // nebo Supabase Storage URL
  "width": 320, "height": 210,
  "alt": "Dvě rovnoběžky proťaté příčkou, vyznačený úhel 65°"  // POVINNÉ (a11y)
}
```

### 2.2 Změny v kódu a JSON schema
- **Typ (`src/types/index.ts`):** nová unie `TaskImage = { kind:"parametric"; diagram: Diagram } | { kind:"static"; url; width; height; alt }`. Ponechat `diagram?` jako deprecated alias, nebo migrovat 7 stávajících úloh na `image`.
- **Vykreslovač (`DiagramView.tsx` → `TaskImage`):** přidat větev `static` = `<img>` (nebo inline `<svg>` pro SVG soubory) v rámečku s `alt`, `loading="lazy"`, `max-width:100%`. Parametrická větev zůstává.
- **Napojení:** `PracticeCard` už `example.diagram` vykresluje; přejmenovat na `example.image`. Diagnostika a `ComparisonCard`/`ConstructionCard` — doplnit stejné napojení (dnes obrázek umí jen PracticeCard).
- **Statické soubory:** buď `public/obrazky/...` (verzované v repu, součást buildu — nejjednodušší) nebo Supabase Storage (nutný upload flow + signed/public URL).

### 2.3 Odhad práce (implementace hybridu, ne obsahu)
| Část | Odhad |
|---|---|
| Sjednocení `image` pole + typ + migrace 7 úloh | 1–2 h |
| Statická větev ve vykreslovači (`<img>`/inline SVG, a11y, lazy) | 1–2 h |
| Napojení do diagnostiky + Comparison/Construction karet | 2–3 h |
| (volitelně) Storage upload flow místo `public/` | +3–5 h |
| **Celkem hybrid (bez Storage)** | **~4–7 h** |

> Toto je jen *infrastruktura*. Skutečná práce je **obsah** (viz §4) — a tam je rozdíl mezi přístupy zásadní.

### 2.4 Rizika
- **Performance:** statické PNG bez optimalizace nabobtnají bundle/přenos. Mitigace: preferovat **SVG** (malé, ostré), u PNG `next/image` + lazy. V `public/` rostou i repo/build.
- **UX — dark mode:** statické obrázky **nereagují na téma** (bílé pozadí v tmavém režimu = jasný obdélník). Mitigace: SVG s `currentColor`, nebo transparentní pozadí + rámeček; PNG raději s neutrálním pozadím.
- **Konzistence:** statické figury od různých zdrojů = vizuální roztříštěnost vs. jednotný parametrický styl.
- **A11y:** `alt` musí být povinné, jinak nevidomí/čtečky nic nedostanou.
- **Copyright:** **nekopírovat obrázky z reálných CERMAT testů** — nutno kreslit vlastní. (Platí pro statické; parametrické jsou z principu vlastní.)
- **Údržba:** statický obrázek s chybou = re-export a re-upload; parametrický = oprava jednou v kódu pro všechny instance.

---

## 3. Alternativy

### 3.1 Zvažené a zamítnuté
- **Jen statické obrázky (bez parametrického enginu):** zamítnuto. Každá úloha by vyžadovala ruční nakreslení a export — u sólo autora a stovek úloh je to největší bottleneck. Navíc žádný dark mode, riziko nekonzistence, správa souborů.
- **Jen parametrický engine (bez statiky):** nestačí — nikdy nepokryje nepravidelný dlouhý ocas bez nekonečného přidávání typů (a tedy kódu).
- **LaTeX/TikZ → obrázek při buildu:** silné pro geometrii, ale těžký toolchain (LaTeX v CI), pomalé, overkill pro sólo projekt.
- **HTML5 Canvas / knihovna (JSXGraph, GeoGebra embed):** GeoGebra je mocná, ale těžká (iframe, závislost na cizí službě, pomalé, horší kontrola vzhledu a dark mode). Pro pár typů je vlastní lehké SVG lepší.
- **AI generování obrázků (DALL·E apod.):** nevhodné — matematické figury musí být přesné, AI rastr je nespolehlivý a needitovatelný.

### 3.2 Co dělají podobné platformy
- **Khan Academy:** má vlastní **widget/renderer systém (Perseus)** — programaticky vykreslované interaktivní grafy, geometrie, číselné osy — *plus* statické obrázky pro netypické úlohy. Přesně **hybrid**, s velkou investicí do rendereru pro časté typy.
- **IXL:** převážně **staticky generované obrázky** (mají obří produkční pipeline na tvorbu obsahu) + část interaktivních.
- **Poučení:** kdo má **inženýrskou kapacitu**, staví renderer pro časté typy (Khan). Kdo má **obsahovou pipeline/tým**, jede na statice (IXL). MateMax je sólo → renderer pro časté typy šetří ruční kreslení, statika slouží jako záchranná brzda.

---

## 4. Doporučení pro NÁŠ kontext

### Ano hybridu — ale **parametrický-first, statika jako záchranná brzda.**

**Proč ne statika-first:** cíl je „přidávat obrázkové úlohy bez kódování každé". Statika to sice splní (žádný kód), ale přesune bottleneck na **ruční kreslení + export + hosting každé úlohy** — což je pro sólo autora do listopadu ještě pomalejší než napsat pár typů a pak sypat JSON. A ztratí dark mode + konzistenci.

**Proč parametrický-first:** jakmile typ existuje, autoring instance = **napsat pár čísel do JSON** (žádný kód, žádné kreslení). To je nejrychlejší cesta k objemu pro sólo autora. Odhaduji, že **6–8 typů pokryje 70–85 % obrázkových úloh CERMATu** čistě přes JSON.

### Konkrétní plán (návrh, ne implementace)

**Fáze A — dostavět parametrické typy (priorita dle četnosti):**
1. Souřadnicová síť / graf (body, přímka, čtení) — odemyká grafy, funkce, posloupnosti.
2. Obecný rovinný obrazec s kótami (čtverec, lichoběžník, kruh, složené) — nejčastější geometrie.
3. Mnohoúhelník / úhly v mnohoúhelníku.
4. Prostorové těleso (kvádr, krychle, válec) + síť tělesa.
5. Sloupcový / koláčový graf + tabulka dat.
6. Číselná osa.
> Odhad: **~2–4 h na typ** (vykreslovač + varianty + pár ukázek) → celá fáze **~15–25 h** rozložených.

**Fáze B — hybrid escape hatch:** přidat `image: { kind:"static" }` (dle §2, ~4–7 h) pro **dlouhý ocas** — nepravidelné figury, které se nevyplatí parametrizovat. Karel je nakreslí (Excalidraw/Figma → **SVG export**, kvůli dark mode a ostrosti) a hodí do `public/obrazky/`.

**Fáze C — objem obsahu:** Karel sype JSON úlohy (parametrické pro časté, statické pro výjimky) podle sešitu a CERMAT témat.

### Proč tohle sedí na naše zadání
- **Sólo autor, bez kódu na instanci:** parametrické typy jednou naprogramuju já, pak Karel tvoří jen JSON. Statika je bez kódu vždy (jen kresba pro výjimky).
- **Deadline listopad:** fáze A/B jsou ~20–30 h vývoje rozložených; souběžně může Karel tvořit obsah pro už hotové typy (úhly, trojúhelník, obdélník máme hned).
- **CERMAT = obrázkový:** parametrické pokryjí jádro (geometrie, úhly, grafy), statika zbytek → plnohodnotný obrázkový trénink.

### Shrnutí doporučení
| | Doporučení |
|---|---|
| Hybrid `image` pole? | **Ano** (sjednotit pod jedno pole, `alt` povinné, preferovat SVG) |
| Pořadí | **Parametrické typy nejdřív** (fáze A), statika jako brzda (fáze B) |
| Statika hosting | `public/obrazky/` (jednodušší, verzované) — Storage až kdyby bylo potřeba nahrávat za běhu |
| Formát statiky | **SVG** (dark mode, ostrost); PNG jen výjimečně |
| Copyright | Nikdy nekopírovat CERMAT obrázky — kreslit vlastní |

---

## Rozhodnutí pro Karla
1. **Schválit hybrid parametrický-first?** (doporučeno)
2. **Kolik parametrických typů** chceš dostavět jako první — a v jakém pořadí? (návrh: graf/souřadnice → rovinné obrazce → prostorová tělesa)
3. **Hosting statiky:** `public/` vs. Supabase Storage?
4. Teprve pak začnu kódovat.

*Sestaveno z analýzy současného kódu (`DiagramView.tsx`, `src/types`, `src/data`). Neimplementováno.*
