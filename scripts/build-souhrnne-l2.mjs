// Souhrnné úlohy L2 (CERMAT styl): 46 nových úloh SOU2_01–46 (bez pravděpodobnosti a funkcí — nejsou v CERMATu) — dvě témata najednou, souvislý text místo telegramu,
// část s obrázkem/tabulkou, část A–E nebo ano/ne. Nahrazují 48 starých jednovětých KOM_* L2 (po schválení se vyřadí).
// Spuštění: node scripts/gen-souhrnne2-svg.mjs && node scripts/build-souhrnne-l2.mjs → doplní/přepíše SOU2_* v src/data/nahled-batch.json.
// Každá odpověď se nezávisle přepočítá; psané odpovědi musí jít vyhodnotit (toValue/checkAnswer), A–E má právě jednu správnou možnost.
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const img = (file, width, height, alt) => ({ kind: "static", url: `/obrazky/souhrnne/${file}`, width, height, alt });
const IMG = {
  zahrada: img("l2-zahrada-chodnik.svg", 330, 200, "Kruhová zahrada o průměru 20 m obklopená chodníkem široký 1 m (obrázek není v měřítku)"),
  obdelniky: img("l2-dva-obdelniky.svg", 470, 196, "Obdélník o stranách 9 cm a 6 cm a obdélník, jehož strany jsou o 50 % delší (obrázek není v měřítku)"),
  rovnoramenny: img("l2-rovnoramenny-obvod.svg", 240, 190, "Rovnoramenný trojúhelník s rameny x, základnou x − 3 a obvodem 33 cm (obrázek není v měřítku)"),
  kolo: img("l2-kolo-stesti.svg", 330, 220, "Kolo štěstí rozdělené na 8 shodných výsečí: 3 červené, 2 modré a 3 zelené"),
  ctverec: img("l2-ctverec-uhlopricka.svg", 220, 180, "Čtverec s úhlopříčkou o délce 12 cm (obrázek není v měřítku)"),
  antena: img("l2-antena-lano.svg", 270, 216, "Svislá anténa vysoká 12 m zajištěná lanem dlouhým 13 m; hledá se vzdálenost kotvy od paty antény"),
  akvarium: { kind: "parametric", diagram: { typ: "teleso", tvar: "kvadr", a: "30 cm", b: "20 cm", c: "25 cm" } },
  valec: { kind: "parametric", diagram: { typ: "teleso", tvar: "valec", r: "r = 5 cm", v: "v = 20 cm" } },
  kvadr: { kind: "parametric", diagram: { typ: "teleso", tvar: "kvadr", a: "4 cm", b: "5 cm", c: "h" } },
  tabCeny: { kind: "tabulka", nazev: "Ceny zboží v obchodě", hlavicka: ["Zboží", "Původní cena (Kč)", "Po zdražení o 25 % (Kč)", "Po zlevnění o 20 % (Kč)"], radky: [["Kolo", 8000, 10000, 8000], ["Helma", 600, 750, 600], ["Zvonek", 120, 150, 120]] },
  tabTridy: { kind: "tabulka", nazev: "Žáci 9. ročníku", hlavicka: ["Třída", "Počet žáků", "z toho dívek"], radky: [["9. A", 28, 16], ["9. B", 24, 12], ["9. C", 22, 14], ["9. D", 26, 10]] },
};

const base = (id, podtema, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "souhrnne", podtema, obtiznost: 2, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const typed = base;
const choice = (id, podtema, zadani, moznosti, spravna, kroky, cas, extra = {}) =>
  base(id, podtema, zadani, moznosti[spravna], kroky, cas, { moznosti, spravna, ...extra });
const anoNe = (id, podtema, zadani, pravda, kroky, cas, extra) =>
  base(id, podtema, zadani, pravda ? "Ano" : "Ne", kroky, cas, { moznosti: ["Ano", "Ne"], spravna: pravda ? 0 : 1, ...extra });

const obdStem = "Obdélník má strany 9 cm a 6 cm. Každou jeho stranu prodloužíme o 50 % (viz obrázek). Rozhodněte, zda je tvrzení pravdivé.";
const cenyStem = "V obchodě zdražili všechno zboží o 25 % a pak ho zlevnili o 20 % z nové ceny (viz tabulka). Rozhodněte, zda je tvrzení pravdivé.";

const ex = [
  typed("SOU2_01", "geometrie_procenta", "Obdélník má rozměry 12 cm a 8 cm. Délku zvětšíme o 25 % a šířku zmenšíme o 25 %. O kolik procent se zmenší obsah obdélníku?", "6,25 %", [
    "Původní obsah: 12 · 8 = 96 cm².", "Nové rozměry: 12 · 1,25 = 15 cm a 8 · 0,75 = 6 cm, obsah 15 · 6 = 90 cm².",
    "Rozdíl 96 − 90 = 6 cm², což je 6 : 96 = 0,0625, tedy 6,25 %.",
  ], 150),
  choice("SOU2_02", "geometrie_procenta", "Strana čtverce se zvětší o 20 %. O kolik procent se zvětší jeho obsah?", ["20 %", "40 %", "44 %", "48 %", "120 %"], 2, [
    "Původní strana a, nová strana 1,2a.", "Původní obsah a², nový obsah (1,2a)² = 1,44a².", "Obsah vzroste o 44 %. Správně je C). (20 % je změna strany, 40 % je chyba při sčítání.)",
  ], 120),
  typed("SOU2_03", "geometrie_procenta", "Kruhová zahrada má průměr 20 m a obklopuje ji chodník široký 1 m (viz obrázek). Kolik procent plochy zahrady tvoří plocha chodníku? Výsledek zapište v procentech.", "21 %", [
    "Zahrada má poloměr 10 m a obsah π · 10² = 100π m².", "Zahrada s chodníkem má poloměr 11 m a obsah π · 11² = 121π m².",
    "Chodník: 121π − 100π = 21π m².", "21π : 100π = 0,21, tedy 21 %.",
  ], 180, { image: IMG.zahrada }),
  anoNe("SOU2_04", "geometrie_procenta", `${obdStem} Tvrzení: „Obvod nového obdélníku je o 50 % větší než obvod původního."`, true, [
    "Původní obvod 2 · (9 + 6) = 30 cm, nový 2 · (13,5 + 9) = 45 cm.", "45 : 30 = 1,5, obvod je o 50 % větší — Ano.",
  ], 120, { image: IMG.obdelniky }),
  anoNe("SOU2_05", "geometrie_procenta", `${obdStem} Tvrzení: „Obsah nového obdélníku je o 50 % větší než obsah původního."`, false, [
    "Původní obsah 9 · 6 = 54 cm², nový 13,5 · 9 = 121,5 cm².", "121,5 : 54 = 2,25, obsah je 2,25krát větší, tedy o 125 % — Ne.",
  ], 120, { image: IMG.obdelniky }),
  anoNe("SOU2_06", "geometrie_procenta", `${obdStem} Tvrzení: „Nový obdélník má obsah 121,5 cm²."`, true, [
    "Nové strany jsou 9 · 1,5 = 13,5 cm a 6 · 1,5 = 9 cm.", "Obsah 13,5 · 9 = 121,5 cm² — Ano.",
  ], 120, { image: IMG.obdelniky }),
  choice("SOU2_07", "geometrie_procenta", "Hranu krychle zvětšíme o 20 %. O kolik procent se zvětší její objem?", ["20 %", "60 %", "72 %", "72,8 %", "jiná hodnota"], 3, [
    "Původní objem a³, nový (1,2a)³ = 1,728a³.", "Objem vzroste o 72,8 %. Správně je D). (72 % vznikne chybným zaokrouhlením.)",
  ], 150),
  typed("SOU2_08", "zlomky_procenta", "Pole tvaru obdélníku má rozměry 80 m a 50 m. Na 30 % pole roste kukuřice a na čtvrtině zbytku brambory. Kolik metrů čtverečních pole zbývá?", "2 100 m²", [
    "Obsah pole: 80 · 50 = 4 000 m².", "Kukuřice: 30 % ze 4 000 = 1 200 m², zbývá 2 800 m².", "Brambory: 1/4 z 2 800 = 700 m².", "Zbývá 2 800 − 700 = 2 100 m².",
  ], 180),
  choice("SOU2_09", "zlomky_slovni", "V nádrži je voda do dvou pětin jejího objemu. Když přilijeme 30 litrů vody, bude nádrž naplněná do tří pětin. Jaký je objem nádrže?", ["60 l", "75 l", "90 l", "120 l", "150 l"], 4, [
    "Přibyly 3/5 − 2/5 = 1/5 objemu nádrže.", "1/5 je 30 litrů, celý objem je 5 · 30 = 150 litrů. Správně je E).",
  ], 150),
  choice("SOU2_10", "procenta_slovni", "Kabát nejdříve zlevnili o 20 %, a když se neprodal, zlevnili ho ještě o 10 % z nové ceny. O kolik procent je teď levnější než na začátku?", ["10 %", "28 %", "30 %", "32 %", "72 %"], 1, [
    "Po první slevě stojí 80 % původní ceny, tedy 0,8.", "Po druhé slevě stojí 0,9 · 0,8 = 0,72, tedy 72 % původní ceny.", "Je levnější o 100 % − 72 % = 28 %. Správně je B). (30 % vznikne sečtením slev.)",
  ], 150),
  typed("SOU2_11", "zlomky_procenta", "Ve třídě je 35 žáků. Chlapci tvoří tři sedminy třídy. Brýle nosí 40 % dívek. Kolik dívek brýle nenosí?", "12", [
    "Chlapců je 3/7 z 35 = 15, dívek je 35 − 15 = 20.", "Brýle nosí 40 % z 20 = 8 dívek.", "Bez brýlí je 20 − 8 = 12 dívek.",
  ], 150),
  typed("SOU2_12", "zlomky_slovni", "Turista první den ušel tři osminy trasy a druhý den 40 % zbytku. Zbývá mu ještě 45 km. Kolik kilometrů měří celá trasa?", "120 km", [
    "Po prvním dni zbývá 1 − 3/8 = 5/8 trasy.", "Druhý den ušel 40 % z 5/8, tedy 2/5 · 5/8 = 1/4 trasy.", "Zbývá 5/8 − 1/4 = 3/8 trasy a to je 45 km.",
    "1/8 trasy je 15 km, celá trasa má 8 · 15 = 120 km.",
  ], 210),
  anoNe("SOU2_13", "procenta_tabulka", `${cenyStem} Tvrzení: „Helma po zdražení stála 750 Kč."`, true, [
    "Helma stála původně 600 Kč: 600 · 1,25 = 750 Kč — Ano.",
  ], 90, { image: IMG.tabCeny }),
  anoNe("SOU2_14", "procenta_tabulka", `${cenyStem} Tvrzení: „Kolo zdražilo o 2 500 Kč."`, false, [
    "Kolo stálo 8 000 Kč a po zdražení o 25 % 10 000 Kč.", "Zdražilo o 10 000 − 8 000 = 2 000 Kč, ne o 2 500 Kč — Ne.",
  ], 120, { image: IMG.tabCeny }),
  anoNe("SOU2_15", "procenta_tabulka", `${cenyStem} Tvrzení: „U jakéhokoli zboží platí, že po zdražení o 25 % a zlevnění o 20 % z nové ceny je cena stejná jako na začátku."`, true, [
    "Zdražení násobí cenu číslem 1,25, zlevnění číslem 0,8.", "1,25 · 0,8 = 1, takže cena se vrátí na původní hodnotu — Ano.",
  ], 150, { image: IMG.tabCeny }),
  typed("SOU2_16", "zlomky_procenta", "Obchod smíchal 3 kg oříšků po 240 Kč za kilogram a 2 kg rozinek po 120 Kč za kilogram. Kolik korun stojí jeden kilogram směsi?", "192 Kč", [
    "Cena oříšků: 3 · 240 = 720 Kč, cena rozinek: 2 · 120 = 240 Kč.", "Dohromady 960 Kč za 5 kg.", "Jeden kilogram směsi: 960 : 5 = 192 Kč.",
  ], 120),
  typed("SOU2_17", "geometrie_rovnice", "Obdélník má obvod 50 cm a jeho délka je o 5 cm větší než šířka. Jaký je obsah obdélníku?", "150 cm²", [
    "Polovina obvodu: a + b = 25, a = b + 5.", "b + 5 + b = 25, takže b = 10 cm a a = 15 cm.", "Obsah: 15 · 10 = 150 cm².",
  ], 150),
  typed("SOU2_18", "geometrie_rovnice", "Rovnoramenný trojúhelník má základnu o 3 cm kratší než rameno a obvod 33 cm (viz obrázek). Kolik centimetrů měří rameno?", "12 cm", [
    "Rameno označíme x, základna má x − 3.", "Obvod: x + x + (x − 3) = 33, tedy 3x = 36.", "x = 12 cm. Kontrola: 12 + 12 + 9 = 33.",
  ], 150, { image: IMG.rovnoramenny }),
  typed("SOU2_19", "rovnice_slovni", "Otec je čtyřikrát starší než syn. Za 5 let bude otec třikrát starší než syn. Kolik let je teď otci?", "40", [
    "Synovi je x let, otci 4x let.", "Za 5 let: 4x + 5 = 3 · (x + 5).", "4x + 5 = 3x + 15, takže x = 10.", "Synovi je 10 let, otci 40 let.",
  ], 180),
  typed("SOU2_20", "rovnice_zlomky", "Třetina čísla zvětšená o 7 je stejná jako polovina tohoto čísla zmenšená o 2. Jaké je to číslo?", "54", [
    "x/3 + 7 = x/2 − 2.", "Vynásobíme 6: 2x + 42 = 3x − 12.", "x = 54.", "Kontrola: 54 : 3 + 7 = 25 a 54 : 2 − 2 = 25.",
  ], 150),
  typed("SOU2_21", "soustava_slovni", "V pokladničce je 20 mincí, každá je buď dvoukorunová, nebo pětikorunová. Dohromady mají hodnotu 61 Kč. Kolik je v pokladničce pětikorun?", "7", [
    "Dvoukorun je a, pětikorun b: a + b = 20 a 2a + 5b = 61.", "Z první rovnice a = 20 − b, dosadíme: 40 − 2b + 5b = 61.", "3b = 21, takže b = 7 (a = 13).", "Kontrola: 13 · 2 + 7 · 5 = 26 + 35 = 61.",
  ], 180),
  choice("SOU2_22", "geometrie_pytagoras", "Obdélníkový pozemek má úhlopříčku 10 m a jednu stranu 6 m. Jaký je jeho obvod?", ["24 m", "28 m", "32 m", "48 m", "60 m"], 1, [
    "Druhá strana podle Pythagorovy věty: √(10² − 6²) = √64 = 8 m.", "Obvod: 2 · (6 + 8) = 28 m. Správně je B).",
  ], 150),
  choice("SOU2_23", "geometrie_zlomky", "Kolo je rozděleno na 8 shodných výsečí (viz obrázek). Jaká část obsahu kola je zbarvená zeleně?", ["1/4", "3/8", "1/2", "5/8", "jiná část"], 1, [
    "Zelených výsečí je 3 z 8 shodných.", "Zeleně je zbarvena 3/8 obsahu kola. Správně je B). (1/4 jsou modré výseče.)",
  ], 90, { image: IMG.kolo }),
  typed("SOU2_24", "zlomky_slovni", "V lahvi je 1,5 litru limonády. Naplníme z ní čtyři sklenice a do každé nalijeme jednu pětinu litru. Kolik litrů limonády v lahvi zbyde?", "0,7 l", [
    "Do čtyř sklenic nalijeme 4 · 1/5 = 4/5 l = 0,8 l.", "V lahvi zbyde 1,5 − 0,8 = 0,7 l.",
  ], 120),
  typed("SOU2_25", "zlomky_procenta", "V sadu je 120 stromů. Jabloně tvoří 40 % všech stromů, hrušně čtvrtinu zbytku a ostatní stromy jsou švestky. Kolik švestek je v sadu?", "54", [
    "Jabloní je 40 % ze 120 = 48, zbývá 120 − 48 = 72 stromů.", "Hrušní je čtvrtina zbytku: 72 : 4 = 18.", "Švestek je 72 − 18 = 54.",
  ], 150),
  typed("SOU2_26", "tabulka_procenta", "Tabulka ukazuje počty žáků 9. ročníku. Kolik procent všech žáků ročníku tvoří dívky z 9. A a 9. C dohromady?", "30 %", [
    "Žáků je celkem 28 + 24 + 22 + 26 = 100.", "Dívek z 9. A je 16 a z 9. C je 14, dohromady 30.", "30 ze 100 žáků jsou 30 %.",
  ], 150, { image: IMG.tabTridy }),
  choice("SOU2_27", "geometrie_procenta", "Kolo je rozděleno na 8 shodných výsečí (viz obrázek). Kolik procent obsahu kola tvoří výseče, které nejsou modré?", ["25 %", "37,5 %", "62,5 %", "75 %", "jiná hodnota"], 3, [
    "Modré jsou 2 výseče z 8, tedy 2/8 = 25 % obsahu kola.", "Ostatní výseče tvoří 100 % − 25 % = 75 % (6/8 = 0,75). Správně je D).",
  ], 120, { image: IMG.kolo }),
  typed("SOU2_28", "rovnice_procenta", "Do třídy chodí 25 žáků. Dívek je o 7 víc než chlapců. Kolik procent třídy tvoří chlapci?", "36 %", [
    "Chlapců je b, dívek b + 7: b + b + 7 = 25.", "2b = 18, takže b = 9 chlapců (a 16 dívek).", "9 z 25 žáků je 9 : 25 = 0,36, tedy 36 %.",
  ], 150),
  typed("SOU2_29", "rovnice_slovni", "Taxi si účtuje základní sazbu 30 Kč a za každý ujetý kilometr 22 Kč. Cesta stála 250 Kč. Kolik kilometrů jelo taxi?", "10 km", [
    "Za kilometry zaplatíme 250 − 30 = 220 Kč.", "Jeden kilometr stojí 22 Kč, ujeli jsme 220 : 22 = 10 km.",
  ], 120),
  choice("SOU2_30", "geometrie_pytagoras", "Pravoúhlý trojúhelník má odvěsny 9 cm a 12 cm. Jak dlouhá je výška na přeponu?", ["6 cm", "7,2 cm", "7,5 cm", "9 cm", "jiná hodnota"], 1, [
    "Přepona podle Pythagorovy věty: √(9² + 12²) = √225 = 15 cm.", "Obsah trojúhelníku spočítáme dvakrát: 9 · 12 : 2 = 54 cm² a také 15 · v : 2.", "15v : 2 = 54, takže v = 108 : 15 = 7,2 cm. Správně je B).",
  ], 210),
  typed("SOU2_31", "geometrie_slovni", "Úsek turistické trasy je na mapě s měřítkem 1 : 25 000 dlouhý 8 cm. Za kolik minut ho turista ujde rychlostí 5 km/h?", "24 minut", [
    "Ve skutečnosti: 8 · 25 000 = 200 000 cm = 2 km.", "Čas: 2 km : 5 km/h = 0,4 h.", "0,4 hodiny je 0,4 · 60 = 24 minut.",
  ], 180),
  typed("SOU2_32", "soustava_slovni", "Za 3 stromky a 2 keře zaplatíme 700 Kč, za 2 stromky a 3 keře 650 Kč. Kolik korun stojí jeden keř?", "110 Kč", [
    "Stromek s, keř k: 3s + 2k = 700 a 2s + 3k = 650.", "První rovnici vynásobíme 3 a druhou 2: 9s + 6k = 2 100 a 4s + 6k = 1 300.", "Odečteme: 5s = 800, s = 160. Pak 2k = 700 − 480 = 220, k = 110.",
    "Kontrola: 2 · 160 + 3 · 110 = 320 + 330 = 650.",
  ], 210),
  typed("SOU2_33", "geometrie_pytagoras", "Čtverec má úhlopříčku 12 cm (viz obrázek). Jaký je jeho obsah?", "72 cm²", [
    "Strana a a úhlopříčka tvoří pravoúhlý trojúhelník: a² + a² = 12².", "2a² = 144, takže a² = 72.", "Obsah čtverce je a² = 72 cm².",
  ], 150, { image: IMG.ctverec }),
  typed("SOU2_34", "geometrie_pytagoras", "Svislá anténa vysoká 12 m je zajištěna lanem dlouhým 13 m, které vede od jejího vrcholu k zemi (viz obrázek). Jak daleko od paty antény je lano zakotveno?", "5 m", [
    "Anténa, zem a lano tvoří pravoúhlý trojúhelník s přeponou 13 m a odvěsnou 12 m.", "Vzdálenost x: x² = 13² − 12² = 169 − 144 = 25.", "x = 5 m.",
  ], 120, { image: IMG.antena }),
  typed("SOU2_35", "geometrie_zlomky", "Akvárium tvaru kvádru má rozměry dna 30 cm a 20 cm a výšku 25 cm (viz obrázek). Je naplněné do tří pětin objemu. Kolik litrů vody v něm je?", "9 l", [
    "Objem akvária: 30 · 20 · 25 = 15 000 cm³ = 15 l.", "Voda tvoří 3/5 z 15 l: 15 : 5 · 3 = 9 l.",
  ], 150, { image: IMG.akvarium }),
  typed("SOU2_36", "geometrie_slovni", "Válcová nádoba má poloměr dna 5 cm a výšku 20 cm (viz obrázek). Kolik litrů se do ní vejde? Počítejte s π ≈ 3,14.", "1,57 l", [
    "Obsah dna: π · 5² ≈ 3,14 · 25 = 78,5 cm².", "Objem: 78,5 · 20 = 1 570 cm³.", "1 570 cm³ = 1,57 litru (1 l = 1 000 cm³).",
  ], 150, { image: IMG.valec }),
  choice("SOU2_37", "geometrie_slovni", "Povrch krychle je 150 cm². Jaký je její objem?", ["25 cm³", "100 cm³", "125 cm³", "150 cm³", "jiná hodnota"], 2, [
    "Krychle má 6 shodných stěn, jedna má 150 : 6 = 25 cm².", "Hrana je √25 = 5 cm.", "Objem 5³ = 125 cm³. Správně je C).",
  ], 150),
  typed("SOU2_38", "procenta_slovni", "Jedna nádoba má objem 2,4 litru. Druhá nádoba je o 25 % větší než první. Kolik litrů se vejde do druhé nádoby?", "3 l", [
    "O 25 % větší znamená 1,25 násobek: 2,4 · 1,25 = 3.", "Do druhé nádoby se vejdou 3 litry.",
  ], 90),
  typed("SOU2_39", "geometrie_slovni", "Kvádr má podstavu o rozměrech 4 cm a 5 cm a objem 120 cm³ (viz obrázek). Jaký je povrch kvádru?", "148 cm²", [
    "Výška h: 4 · 5 · h = 120, takže h = 6 cm.", "Povrch: 2 · (4·5 + 4·6 + 5·6) = 2 · (20 + 24 + 30) = 148 cm².",
  ], 180, { image: IMG.kvadr }),
  typed("SOU2_40", "geometrie_procenta", "Bazén tvaru kvádru má dno 8 m × 4 m a hloubku 1,5 m. Voda v něm sahá do 80 % hloubky. Kolik metrů krychlových vody je v bazénu?", "38,4 m³", [
    "Výška hladiny: 80 % z 1,5 m = 1,2 m.", "Objem vody: 8 · 4 · 1,2 = 38,4 m³.",
  ], 120),
  typed("SOU2_41", "procenta_cisla", "Průměr čtyř známek je 2,25. Po páté známce je průměr 2,4. Jakou známku student dostal jako pátou?", "3", [
    "Součet čtyř známek: 4 · 2,25 = 9.", "Součet pěti známek: 5 · 2,4 = 12.", "Pátá známka: 12 − 9 = 3.",
  ], 120),
  typed("SOU2_42", "uhly_rovnice", "V rovnoramenném trojúhelníku je úhel při vrcholu o 30° menší než každý z úhlů při základně. Jak velký je úhel při vrcholu?", "40°", [
    "Úhel při základně je α, při vrcholu α − 30°.", "Součet úhlů: α + α + (α − 30°) = 180°, tedy 3α = 210° a α = 70°.", "Úhel při vrcholu: 70° − 30° = 40°.",
  ], 150),
  typed("SOU2_43", "rovnice_slovni", "Chodec vyšel v 8:00 rychlostí 5 km/h. Ve 10:00 vyjel za ním stejným směrem cyklista rychlostí 15 km/h. Za kolik hodin po vyjetí cyklista chodce dohoní?", "1 hodinu", [
    "Za dvě hodiny ušel chodec 2 · 5 = 10 km.", "Cyklista se k němu přibližuje rychlostí 15 − 5 = 10 km/h.", "Dohoní ho za 10 : 10 = 1 hodinu (tedy v 11:00).",
  ], 180),
  typed("SOU2_44", "cisla_slovni", "V kultuře je 50 bakterií a každou hodinu se jejich počet zdvojnásobí. Kolik bakterií bude v kultuře po pěti hodinách?", "1 600", [
    "Po každé hodině se počet násobí dvěma: 50 · 2⁵.", "2⁵ = 32, takže 50 · 32 = 1 600 bakterií.",
  ], 120),
  typed("SOU2_45", "geometrie_cisla", "Čtvercový pozemek má rozlohu 2,25 hektaru. Kolik metrů měří jeho obvod? (1 ha = 10 000 m²)", "600 m", [
    "2,25 ha = 22 500 m².", "Strana: √22 500 = 150 m.", "Obvod: 4 · 150 = 600 m.",
  ], 150),
  typed("SOU2_46", "cisla_rovnice", "Součet tří po sobě jdoucích lichých čísel je 63. Které z těch tří čísel je nejmenší?", "19", [
    "Prostřední číslo označíme x, sousední lichá jsou x − 2 a x + 2.", "Součet: 3x = 63, takže x = 21.", "Čísla jsou 19, 21, 23. Nejmenší je 19.",
  ], 120),
];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const close = (a, b) => Math.abs(a - b) < 1e-9;
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const opt = (id) => by[id].moznosti[by[id].spravna];
const val = (id) => N.toValue(by[id].odpoved ?? "");
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i; return Math.round(r); };

ok("01", close(12 * 1.25 * 8 * 0.75, 90) && close((96 - 90) / 96 * 100, 6.25) && val("SOU2_01") === 6.25);
ok("02", close((1.2 ** 2 - 1) * 100, 44) && opt("SOU2_02") === "44 %");
{ const zahr = Math.PI * 100, celek = Math.PI * 121; ok("03", close((celek - zahr) / zahr * 100, 21) && val("SOU2_03") === 21); }
{ const o0 = 2 * (9 + 6), o1 = 2 * 13.5 + 2 * 9, s0 = 54, s1 = 13.5 * 9; ok("04-06", close(o1 / o0, 1.5) && close(s1 / s0, 2.25) && s1 === 121.5 && by.SOU2_04.odpoved === "Ano" && by.SOU2_05.odpoved === "Ne" && by.SOU2_06.odpoved === "Ano"); }
ok("07", close((1.2 ** 3 - 1) * 100, 72.8) && opt("SOU2_07") === "72,8 %");
{ const S = 4000, k = 0.3 * S, zb = S - k, br = zb / 4; ok("08", S - k - br === 2100 && val("SOU2_08") === 2100); }
{ const lit = 30 / (3 / 5 - 2 / 5); ok("09", close(lit, 150) && opt("SOU2_09") === "150 l"); }
ok("10", close((1 - 0.9 * 0.8) * 100, 28) && opt("SOU2_10") === "28 %");
{ const ch = (3 / 7) * 35, di = 35 - ch, br = 0.4 * di; ok("11", ch === 15 && di === 20 && br === 8 && di - br === 12 && val("SOU2_11") === 12); }
{ let sol = []; for (let L = 1; L <= 500; L++) { const zb = L * (1 - 3 / 8) - 0.4 * (L * (1 - 3 / 8)); if (close(zb, 45)) sol.push(L); } ok("12", sol.length === 1 && sol[0] === 120 && val("SOU2_12") === 120, sol); }
{ const p = 600, k = 8000, z = 120; ok("13-15", close(p * 1.25, 750) && close(k * 1.25, 10000) && close(k * 1.25 - k, 2000) && close(1.25 * 0.8, 1) && close(z * 1.25, 150) && close(z * 1.25 * 0.8, z) && by.SOU2_13.odpoved === "Ano" && by.SOU2_14.odpoved === "Ne" && by.SOU2_15.odpoved === "Ano"); }
ok("16", close((3 * 240 + 2 * 120) / 5, 192) && val("SOU2_16") === 192);
{ let sol = []; for (let b = 1; b < 25; b++) { const a = b + 5; if (2 * (a + b) === 50) sol.push(a * b); } ok("17", sol.length === 1 && sol[0] === 150 && val("SOU2_17") === 150, sol); }
{ let sol = []; for (let x = 4; x < 40; x++) if (x + x + (x - 3) === 33) sol.push(x); ok("18", sol.length === 1 && sol[0] === 12 && val("SOU2_18") === 12, sol); }
{ let sol = []; for (let x = 1; x < 60; x++) if (4 * x + 5 === 3 * (x + 5)) sol.push(4 * x); ok("19", sol.length === 1 && sol[0] === 40 && val("SOU2_19") === 40, sol); }
{ let sol = []; for (let x = 1; x < 300; x++) if (close(x / 3 + 7, x / 2 - 2)) sol.push(x); ok("20", sol.length === 1 && sol[0] === 54 && val("SOU2_20") === 54, sol); }
{ let sol = []; for (let b = 0; b <= 20; b++) { const a = 20 - b; if (2 * a + 5 * b === 61) sol.push(b); } ok("21", sol.length === 1 && sol[0] === 7 && val("SOU2_21") === 7, sol); }
ok("22", close(Math.sqrt(100 - 36), 8) && 2 * (6 + 8) === 28 && opt("SOU2_22") === "28 m");
ok("23", 3 / 8 === 0.375 && opt("SOU2_23") === "3/8");
ok("24", close(1.5 - 4 / 5, 0.7) && val("SOU2_24") === 0.7);
{ const jab = 0.4 * 120, zb = 120 - jab, hr = zb / 4; ok("25", jab === 48 && zb === 72 && hr === 18 && zb - hr === 54 && val("SOU2_25") === 54); }
{ const rows = [[28, 16], [24, 12], [22, 14], [26, 10]]; const tot = rows.reduce((s, r) => s + r[0], 0); ok("26", tot === 100 && rows[0][1] + rows[2][1] === 30 && val("SOU2_26") === 30); }
ok("27", close((1 - 2 / 8) * 100, 75) && opt("SOU2_27") === "75 %");
{ let sol = []; for (let b = 1; b < 25; b++) if (b + (b + 7) === 25) sol.push((b / 25) * 100); ok("28", sol.length === 1 && close(sol[0], 36) && val("SOU2_28") === 36, sol); }
ok("29", (250 - 30) / 22 === 10 && val("SOU2_29") === 10);
{ const p = Math.hypot(9, 12), v = (9 * 12) / p; ok("30", close(p, 15) && close(v, 7.2) && opt("SOU2_30") === "7,2 cm"); }
ok("31", close(((8 * 25000) / 100000 / 5) * 60, 24) && val("SOU2_31") === 24);
{ let sol = []; for (let s = 1; s <= 500; s++) for (let k = 1; k <= 500; k++) if (3 * s + 2 * k === 700 && 2 * s + 3 * k === 650) sol.push(k); ok("32", sol.length === 1 && sol[0] === 110 && val("SOU2_32") === 110, sol); }
ok("33", close(144 / 2, 72) && val("SOU2_33") === 72);
ok("34", close(Math.sqrt(169 - 144), 5) && val("SOU2_34") === 5);
ok("35", 30 * 20 * 25 / 1000 === 15 && close(15 * 3 / 5, 9) && val("SOU2_35") === 9);
ok("36", close(3.14 * 25 * 20 / 1000, 1.57) && val("SOU2_36") === 1.57);
ok("37", close(Math.sqrt(150 / 6) ** 3, 125) && opt("SOU2_37") === "125 cm³");
ok("38", close(2.4 * 1.25, 3) && val("SOU2_38") === 3);
{ const h = 120 / (4 * 5); ok("39", h === 6 && 2 * (20 + 24 + 30) === 148 && val("SOU2_39") === 148); }
ok("40", close(8 * 4 * 0.8 * 1.5, 38.4) && val("SOU2_40") === 38.4);
ok("41", close(5 * 2.4 - 4 * 2.25, 3) && val("SOU2_41") === 3);
{ let sol = []; for (let a = 1; a < 90; a++) if (a + a + (a - 30) === 180) sol.push(a - 30); ok("42", sol.length === 1 && sol[0] === 40 && val("SOU2_42") === 40, sol); }
ok("43", close((2 * 5) / (15 - 5), 1) && val("SOU2_43") === 1);
ok("44", 50 * 2 ** 5 === 1600 && val("SOU2_44") === 1600);
ok("45", close(4 * Math.sqrt(2.25 * 10000), 600) && val("SOU2_45") === 600);
{ let sol = []; for (let x = 1; x < 60; x += 2) if (3 * x === 63) sol.push(x - 2); ok("46", sol.length === 1 && sol[0] === 19 && val("SOU2_46") === 19, sol); }
// struktura
for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length >= 2 && new Set(e.moznosti).size === e.moznosti.length && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null || N.checkAnswer(e.odpoved, e.odpoved) && /\//.test(e.odpoved), e.odpoved);
    ok(e.id + " sama sebe uzná", N.checkAnswer(e.odpoved, e.odpoved));
    const num = (e.odpoved.replace(/\s/g, "").match(/[\d,/]+/) ?? [""])[0].replace(",", ".");
    ok(e.id + " odpověď v krocích", e.reseni_kroky.join(" ").replace(/\s/g, "").replace(/,/g, ".").includes(num.replace(/^(\d)\.(\d+)$/, "$1.$2")) || num.includes("/"), num);
  }
  if (e.image?.kind === "static") ok(e.id + " soubor", fs.existsSync("public" + e.image.url), e.image.url);
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|přeprač|Jiný postup|Pozor: výsledek/i.test(e.reseni_kroky.join(" ") + e.odpoved)) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " obsah kroků", e.reseni_kroky.length >= 1 && e.reseni_kroky.every((s) => s.length > 3));
}
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 46);
const all = ["databaze", "cermat-200", "doplnky-uhly-souhrnne", "konstrukce-interaktivni"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize s databází", ids.every((id) => !all.some((e) => e.id === id)));
// přesné duplicity zadání s databází
ok("bez duplicit zadání", ex.every((e) => !all.some((x) => x.id !== e.id && x.zadani === e.zadani)));
const nA = ex.filter((e) => e.moznosti && e.moznosti.length > 2).length, nAN = ex.filter((e) => e.moznosti && e.moznosti.length === 2).length, nImg = ex.filter((e) => e.image).length;
console.log(`úloh: ${ex.length} (A–E ${nA}, ano/ne ${nAN}, s obrázkem/tabulkou ${nImg}), chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^SOU2_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + Souhrnné L2 (${ex.length} úloh)` : `Souhrnné L2 — dvě témata najednou (${ex.length} úloh: ${ex.length - nA - nAN} psaných, ${nA} A–E, ${nAN} ano/ne; ${nImg} s obrázkem nebo tabulkou) — nahradí staré jednovětné úlohy`;
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} souhrnných L2)`);
