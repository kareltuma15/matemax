// 5. třída, nové typy karet — úlohy s více výsledky (podúlohy 4.1–4.3) a přiřazování A–F (úloha 13).
// Dávka P5_VIC_01–15: 8× podúlohy, 7× přiřazování; okruhy jednotky, počítání, slovní, zlomky, obsah, tělesa.
// Styl podle oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Spuštění: node scripts/build-5-vic.mjs → doplní/přepíše P5_VIC_01–15 v src/data/nahled-batch.json (jiné dávky nechá).
// Každý výsledek se v tomto skriptu nezávisle přepočítá.
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const base = (id, tema, podtema, level, zadani, kroky, cas) => ({ id, tema, podtema, obtiznost: level, zadani, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1 });
/** Úloha s podúlohami: odpověď úlohy = výsledky podúloh oddělené „ ; “. */
const pod = (id, tema, podtema, level, zadani, podulohy, kroky, cas) => ({
  ...base(id, tema, podtema, level, zadani, kroky, cas), podulohy, odpoved: podulohy.map((p) => p.odpoved).join(" ; "),
});
const L = ["A", "B", "C", "D", "E", "F"];
/** Přiřazování: odpověď úlohy = „1–C ; 2–A ; 3–F“. */
const pri = (id, tema, podtema, level, zadani, nabidka, polozky, kroky, cas) => ({
  ...base(id, tema, podtema, level, zadani, kroky, cas), prirazeni: { nabidka, polozky }, odpoved: polozky.map((p, i) => `${i + 1}–${L[p.spravna]}`).join(" ; "),
});

const ex = [
  // ───────── L1 ─────────
  pod("P5_VIC_01", "p5_jednotky", "p5_prevody", 1, "Převeď na zadanou jednotku.", [
    { otazka: "4 m 5 dm = □ dm", odpoved: "45", jednotka: "dm" },
    { otazka: "3 kg 200 g = □ g", odpoved: "3200", jednotka: "g" },
    { otazka: "2 h 30 min = □ min", odpoved: "150", jednotka: "min" },
  ], [
    "4 m je 40 dm, plus 5 dm je 45 dm.",
    "3 kg je 3 000 g, plus 200 g je 3 200 g.",
    "2 hodiny je 120 minut, plus 30 minut je 150 minut.",
  ], 150),
  pod("P5_VIC_02", "p5_pocitani", "poradi_operaci", 1, "Vypočítej. Pozor na pořadí početních operací.", [
    { otazka: "5 + 3 · 4 =", odpoved: "17" },
    { otazka: "(5 + 3) · 4 =", odpoved: "32" },
    { otazka: "20 − 2 · 6 =", odpoved: "8" },
  ], [
    "Násobení se počítá dřív než sčítání: 3 · 4 = 12, 5 + 12 = 17.",
    "Závorka se počítá první: 5 + 3 = 8, 8 · 4 = 32.",
    "Nejdřív násobení: 2 · 6 = 12, potom 20 − 12 = 8.",
  ], 150),
  pri("P5_VIC_09", "p5_jednotky", "p5_prevody", 1,
    "Ke každé délce (1–3) přiřaď stejnou délku z nabídky (A–F).",
    ["25 cm", "205 cm", "250 cm", "2 050 cm", "52 cm", "502 cm"],
    [{ text: "2 m 5 cm", spravna: 1 }, { text: "25 dm", spravna: 2 }, { text: "5 m 2 cm", spravna: 5 }],
    ["2 m 5 cm je 200 cm + 5 cm = 205 cm, to je B.", "25 dm je 25 · 10 = 250 cm, to je C.", "5 m 2 cm je 500 cm + 2 cm = 502 cm, to je F."], 150),
  pri("P5_VIC_10", "p5_zlomky", "p5_o_zlomek", 1,
    "Ke každému zlomku (1–3) přiřaď jeho hodnotu z nabídky (A–F). Všude počítáme se 24 žáky.",
    ["3", "6", "8", "12", "18", "4"],
    [{ text: "Polovina z 24", spravna: 3 }, { text: "Třetina z 24", spravna: 2 }, { text: "Tři čtvrtiny z 24", spravna: 4 }],
    ["Polovina: 24 : 2 = 12, to je D.", "Třetina: 24 : 3 = 8, to je C.", "Čtvrtina je 24 : 4 = 6, tři čtvrtiny 3 · 6 = 18, to je E."], 150),
  // ───────── L2 ─────────
  pod("P5_VIC_03", "p5_slovni", "p5_dva_udaje", 2, "Kuba má 24 kuliček. Eva jich má o 9 víc než Kuba a Tom o 6 méně než Kuba.", [
    { otazka: "Kolik kuliček má Eva?", odpoved: "33" },
    { otazka: "Kolik kuliček má Tom?", odpoved: "18" },
    { otazka: "Kolik kuliček mají všichni tři dohromady?", odpoved: "75" },
  ], [
    "Eva: 24 + 9 = 33 kuliček.",
    "Tom: 24 − 6 = 18 kuliček.",
    "Dohromady: 24 + 33 + 18 = 75 kuliček.",
  ], 180),
  pod("P5_VIC_04", "p5_zlomky", "p5_o_zlomek", 2, "Pizza je rozkrájená na 12 stejných kousků.", [
    { otazka: "Kolik kousků je třetina pizzy?", odpoved: "4" },
    { otazka: "Kolik kousků jsou tři čtvrtiny pizzy?", odpoved: "9" },
    { otazka: "Kolik kousků zbude, když se sní polovina pizzy?", odpoved: "6" },
  ], [
    "Třetina: 12 : 3 = 4 kousky.",
    "Čtvrtina je 12 : 4 = 3 kousky, tři čtvrtiny jsou 3 · 3 = 9 kousků.",
    "Polovina je 12 : 2 = 6 kousků, zbude jich také 6.",
  ], 180),
  pod("P5_VIC_05", "p5_obsah", "p5_obsah", 2, "Obdélníková zahrádka je dlouhá 9 m a široká 4 m.", [
    { otazka: "Jaký je obvod zahrádky?", odpoved: "26", jednotka: "m" },
    { otazka: "Jaký je obsah zahrádky?", odpoved: "36", jednotka: "m²" },
    { otazka: "Jak dlouhá je strana čtverce, který má stejný obsah jako zahrádka?", odpoved: "6", jednotka: "m" },
  ], [
    "Obvod: 2 · (9 + 4) = 2 · 13 = 26 m.",
    "Obsah: 9 · 4 = 36 m².",
    "Čtverec o obsahu 36 m² má stranu 6 m, protože 6 · 6 = 36.",
  ], 180),
  pod("P5_VIC_06", "p5_jednotky", "p5_cas", 2, "Film začal v 17:35 a trval 1 hodinu a 50 minut. Čas zapisuj ve tvaru hodiny:minuty.", [
    { otazka: "V kolik hodin film skončil?", odpoved: "19:25" },
    { otazka: "Kolik minut film trval?", odpoved: "110", jednotka: "min" },
    { otazka: "Za kolik minut po konci filmu je 20:00?", odpoved: "35", jednotka: "min" },
  ], [
    "17:35 + 1 hodina je 18:35, plus 50 minut je 19:25.",
    "1 hodina 50 minut je 60 + 50 = 110 minut.",
    "Od 19:25 do 20:00 je 35 minut (do 19:30 je 5 minut, do 20:00 dalších 30).",
  ], 210),
  pri("P5_VIC_11", "p5_pocitani", "poradi_operaci", 2,
    "Ke každému výrazu (1–3) přiřaď jeho hodnotu z nabídky (A–F).",
    ["14", "20", "26", "32", "40", "48"],
    [{ text: "2 + 3 · 8", spravna: 2 }, { text: "(2 + 3) · 8", spravna: 4 }, { text: "50 − 3 · 10", spravna: 1 }],
    ["Nejdřív násobení: 3 · 8 = 24, 2 + 24 = 26, to je C.", "Nejdřív závorka: 2 + 3 = 5, 5 · 8 = 40, to je E.", "Nejdřív násobení: 3 · 10 = 30, 50 − 30 = 20, to je B."], 180),
  pri("P5_VIC_12", "p5_obsah", "p5_obvod", 2,
    "Ke každému čtyřúhelníku (1–3) přiřaď jeho obvod z nabídky (A–F). Obvod je v centimetrech.",
    ["18 cm", "20 cm", "30 cm", "34 cm", "36 cm", "45 cm"],
    [{ text: "Obdélník o stranách 7 cm a 3 cm", spravna: 1 }, { text: "Obdélník o stranách 12 cm a 5 cm", spravna: 3 }, { text: "Čtverec o straně 9 cm", spravna: 4 }],
    ["Obdélník 7 × 3: 2 · (7 + 3) = 20 cm, to je B.", "Obdélník 12 × 5: 2 · (12 + 5) = 34 cm, to je D.", "Čtverec: 4 · 9 = 36 cm, to je E."], 180),
  pri("P5_VIC_13", "p5_jednotky", "p5_cas", 2,
    "Ke každému zadání (1–3) přiřaď správný čas z nabídky (A–F).",
    ["9:45", "10:15", "10:30", "11:05", "11:15", "12:00"],
    [{ text: "Kolik je hodin za 55 minut po 8:50?", spravna: 0 }, { text: "Kolik bylo hodin před 25 minutami, když je 11:40?", spravna: 4 }, { text: "Kolik je hodin za 1 hodinu a 40 minut po 9:25?", spravna: 3 }],
    ["8:50 + 55 minut: do 9:00 je 10 minut, zbývá 45, tedy 9:45 (A).", "11:40 − 25 minut = 11:15 (E).", "9:25 + 1 hodina = 10:25, plus 40 minut = 11:05 (D)."], 210),
  // ───────── L3 ─────────
  pod("P5_VIC_07", "p5_slovni", "p5_tempo", 3, "Pekař upeče 36 rohlíků za 12 minut. Peče stále stejným tempem.", [
    { otazka: "Kolik rohlíků upeče za 1 minutu?", odpoved: "3" },
    { otazka: "Kolik rohlíků upeče za 20 minut?", odpoved: "60" },
    { otazka: "Za kolik minut upeče 150 rohlíků?", odpoved: "50", jednotka: "min" },
  ], [
    "Za minutu upeče 36 : 12 = 3 rohlíky.",
    "Za 20 minut upeče 20 · 3 = 60 rohlíků.",
    "150 rohlíků upeče za 150 : 3 = 50 minut.",
  ], 240),
  pod("P5_VIC_08", "p5_pocitani", "p5_zaokrouhlovani", 3, "Je dáno číslo 48 725.", [
    { otazka: "Zaokrouhli ho na tisíce.", odpoved: "49000" },
    { otazka: "Zaokrouhli ho na stovky.", odpoved: "48700" },
    { otazka: "O kolik je větší než číslo 40 000?", odpoved: "8725" },
  ], [
    "Na tisíce: za tisícovkou 8 je stovková číslice 7, zaokrouhlujeme nahoru, vyjde 49 000.",
    "Na stovky: za stovkou 7 je desítková číslice 2, zaokrouhlujeme dolů, vyjde 48 700.",
    "Rozdíl: 48 725 − 40 000 = 8 725.",
  ], 240),
  pri("P5_VIC_14", "p5_slovni", "p5_dva_udaje", 3,
    "Cyril našel 21 hub. Bára našla o 5 hub méně než Cyril a Anna o 8 hub více než Bára. Ke každé otázce (1–3) přiřaď správný počet z nabídky (A–F).",
    ["13", "16", "21", "24", "29", "61"],
    [{ text: "Kolik hub našla Bára?", spravna: 1 }, { text: "Kolik hub našla Anna?", spravna: 3 }, { text: "Kolik hub našli všichni tři dohromady?", spravna: 5 }],
    ["Bára: 21 − 5 = 16 hub (B).", "Anna: 16 + 8 = 24 hub (D).", "Všichni dohromady: 21 + 16 + 24 = 61 hub (F)."], 240),
  pri("P5_VIC_15", "p5_telesa", "p5_krychlicky", 3,
    "Z jednotkových krychliček se skládají tělesa. Ke každému tělesu (1–3) přiřaď počet krychliček z nabídky (A–F), které je potřeba na jeho plné složení.",
    ["9", "18", "24", "27", "30", "36"],
    [{ text: "Kvádr o rozměrech 4 × 3 × 2 krychličky", spravna: 2 }, { text: "Krychle o hraně 3 krychličky", spravna: 3 }, { text: "Kvádr o rozměrech 5 × 2 × 3 krychličky", spravna: 4 }],
    ["Kvádr 4 × 3 × 2: 4 · 3 = 12 krychliček ve vrstvě a 2 vrstvy, 12 · 2 = 24 (C).", "Krychle 3 × 3 × 3: 9 krychliček ve vrstvě a 3 vrstvy, 9 · 3 = 27 (D).", "Kvádr 5 × 2 × 3: 5 · 2 = 10 ve vrstvě a 3 vrstvy, 10 · 3 = 30 (E)."], 240),
];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const P = (id) => by[id].podulohy.map((p) => p.odpoved);
const R = (id) => by[id].prirazeni.polozky.map((p) => p.spravna);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const hm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
const t = (h, m) => h * 60 + m;

ok("01", eq(P("P5_VIC_01"), [String(4 * 10 + 5), String(3 * 1000 + 200), String(2 * 60 + 30)]));
ok("02", eq(P("P5_VIC_02"), [String(5 + 3 * 4), String((5 + 3) * 4), String(20 - 2 * 6)]));
ok("03", eq(P("P5_VIC_03"), [String(24 + 9), String(24 - 6), String(24 + (24 + 9) + (24 - 6))]));
ok("04", eq(P("P5_VIC_04"), [String(12 / 3), String(3 * (12 / 4)), String(12 - 12 / 2)]));
ok("05", eq(P("P5_VIC_05"), [String(2 * (9 + 4)), String(9 * 4), String(Math.sqrt(9 * 4))]));
ok("06", eq(P("P5_VIC_06"), [hm(t(17, 35) + 110), String(60 + 50), String(t(20, 0) - (t(17, 35) + 110))]));
ok("07", eq(P("P5_VIC_07"), [String(36 / 12), String(20 * (36 / 12)), String(150 / (36 / 12))]));
ok("08", eq(P("P5_VIC_08"), [String(Math.round(48725 / 1000) * 1000), String(Math.round(48725 / 100) * 100), String(48725 - 40000)]));
// přiřazování: hodnoty vypočtené znovu a hledané v nabídce
const idx = (id, vals, unit = "") => vals.map((v) => by[id].prirazeni.nabidka.findIndex((n) => n === `${v}${unit}`));
ok("09", eq(R("P5_VIC_09"), idx("P5_VIC_09", [2 * 100 + 5, 25 * 10, 5 * 100 + 2], " cm").map((i) => i)) );
ok("10", eq(R("P5_VIC_10"), idx("P5_VIC_10", [24 / 2, 24 / 3, 3 * (24 / 4)])));
ok("11", eq(R("P5_VIC_11"), idx("P5_VIC_11", [2 + 3 * 8, (2 + 3) * 8, 50 - 3 * 10])));
ok("12", eq(R("P5_VIC_12"), idx("P5_VIC_12", [2 * (7 + 3), 2 * (12 + 5), 4 * 9], " cm")));
{ const s = [t(8, 50) + 55, t(11, 40) - 25, t(9, 25) + 100].map(hm); ok("13", eq(R("P5_VIC_13"), idx("P5_VIC_13", s)), s); }
{ const c = 21, b = c - 5, a = b + 8; ok("14", eq(R("P5_VIC_14"), idx("P5_VIC_14", [b, a, a + b + c])) && b === 16 && a === 24); }
ok("15", eq(R("P5_VIC_15"), idx("P5_VIC_15", [4 * 3 * 2, 3 ** 3, 5 * 2 * 3])));

for (const e of ex) {
  if (e.podulohy) {
    ok(e.id + " podúlohy 2–3", e.podulohy.length >= 2 && e.podulohy.length <= 3);
    for (const p of e.podulohy) ok(e.id + " odpověď projde", N.checkAnswer(p.odpoved, p.odpoved) && (N.toValue(p.odpoved) !== null || /^\d{1,2}:\d{2}$/.test(p.odpoved)), p.odpoved);
    ok(e.id + " kroky = podúlohy", e.reseni_kroky.length === e.podulohy.length);
  } else {
    const q = e.prirazeni;
    ok(e.id + " nabídka 6 různých", q.nabidka.length === 6 && new Set(q.nabidka).size === 6);
    ok(e.id + " položky 3 různé správné", q.polozky.length === 3 && new Set(q.polozky.map((p) => p.spravna)).size === 3 && q.polozky.every((p) => p.spravna >= 0 && p.spravna < 6));
    ok(e.id + " kroky = položky", e.reseni_kroky.length === 3);
  }
  ok(e.id + " odpoved neprázdná", typeof e.odpoved === "string" && e.odpoved.length > 0);
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  if (e.obtiznost === 1) ok(e.id + " L1 bez dvojciferného dělení", !/\d :\s?\d\d/.test(e.zadani + e.reseni_kroky.join(" ")));
}
// rozmístění správných písmen: ať se nedá hádat
const pozice = new Set(ex.filter((e) => e.prirazeni).flatMap((e) => e.prirazeni.polozky.map((p) => p.spravna)));
ok("rozmístění písmen", pozice.size >= 5, [...pozice]);
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 15, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; podúlohy ${ex.filter((e) => e.podulohy).length}, přiřazování ${ex.filter((e) => e.prirazeni).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: úlohy s více výsledky a přiřazování (15 úloh)` : "5. třída — nové typy karet: podúlohy (4.1–4.3) a přiřazování A–F, 15 úloh (L1 ×4, L2 ×7, L3 ×4)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
