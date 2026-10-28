// 5. třída, okruh „Jednotky, čas a peníze", druhá dávka (P5_JED_16–30): převody, čas hodiny:minuty, ceny, mince.
// Styl podle úloh 2 a 3 oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Bez dělení dvojciferným číslem a bez zbytku po dělení (Karel: do přijímaček nepatří).
// Spuštění: node scripts/build-5-jednotky2.mjs → doplní/přepíše P5_JED_16–30 v src/data/nahled-batch.json (jiné dávky nechá).
// Každý výsledek se v tomto skriptu nezávisle přepočítá (aritmetika, hrubá síla).
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_jednotky", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const hm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

const ex = [
  // ───────── L1 ─────────
  mk("P5_JED_16", "p5_prevody", 1, "Kolik centimetrů je 8 dm 5 cm?", "85", [
    "Jeden decimetr má 10 centimetrů, takže 8 dm je 80 cm.",
    "K tomu přidáme 5 cm: 80 + 5 = 85 cm.",
  ], 60),
  mk("P5_JED_17", "p5_prevody", 1, "Kolik milimetrů je 7 cm?", "70", [
    "Jeden centimetr má 10 milimetrů.",
    "Sedm centimetrů je 7 · 10 = 70 mm.",
  ], 60),
  mk("P5_JED_18", "p5_cas", 1, "Kolik hodin je 180 minut?", "3", [
    "Jedna hodina má 60 minut.",
    "Kolikrát se 60 vejde do 180? 3 · 60 = 180, tedy 3 hodiny.",
  ], 60),
  mk("P5_JED_19", "p5_ceny", 1, "Rohlík stojí 3 koruny. Kolik rohlíků koupíš za 27 korun?", "9", [
    "Zjišťujeme, kolikrát se 3 koruny vejdou do 27 korun: 27 : 3.",
    "27 : 3 = 9, koupíš 9 rohlíků. Zkouška: 9 · 3 = 27.",
  ], 60),
  mk("P5_JED_20", "p5_cas", 1, "Kolik sekund je 4 minuty?", "240", [
    "Jedna minuta má 60 sekund.",
    "Čtyři minuty jsou 4 · 60 = 240 sekund.",
  ], 60),
  // ───────── L2 ─────────
  mk("P5_JED_21", "p5_prevody", 2, "Do cíle zbývá kilometr. Kolik metrů zbývá, když už jsi ušel 650 metrů?", "350", [
    "Kilometr má 1 000 metrů.",
    "Zbývá 1 000 − 650 = 350 metrů.",
  ], 90),
  mk("P5_JED_22", "p5_cas", 2, "Autobus vyjel v 7:50 a jel 45 minut. V kolik hodin dojel? Napiš čas ve tvaru hodiny:minuty.", "8:35", [
    "Do 8:00 zbývá 10 minut: 7:50 + 10 minut = 8:00.",
    "Zbývá přidat 45 − 10 = 35 minut: 8:00 + 35 minut = 8:35.",
    "Autobus dojel v 8:35.",
  ], 120),
  mk("P5_JED_23", "p5_cas", 2, "Přednáška začala ve 13:20 a skončila v 15:05. Kolik minut trvala?", "105", [
    "Od 13:20 do 14:20 je jedna hodina, tedy 60 minut. Od 14:20 do 15:05 je dalších 45 minut.",
    "Dohromady 60 + 45 = 105 minut.",
  ], 120),
  mk("P5_JED_24", "p5_ceny", 2, "Za 5 stejných tužek jsi zaplatil 85 korun. Kolik korun stojí 8 takových tužek?", null, [
    "Jedna tužka stojí 85 : 5 = 17 korun.",
    "Osm tužek stojí 8 · 17 = 136 korun. Správně je D).",
  ], 120, { moznosti: ["102", "119", "128", "136", "144"], spravna: 3 }),
  mk("P5_JED_25", "p5_prevody", 2, "Pytlík cukru váží 250 gramů. Kolik pytlíků cukru je potřeba na 3 kilogramy?", "12", [
    "Tři kilogramy jsou 3 000 gramů.",
    "Čtyři pytlíky po 250 g mají 1 000 g, tedy 1 kg. Na 3 kg je potřeba 3 · 4 = 12 pytlíků.",
  ], 120),
  mk("P5_JED_26", "p5_mince", 2, "V peněžence je 7 pětikorun a 6 dvoukorun. Jakou hodnotu mají všechny tyto mince dohromady (v korunách)?", "47", [
    "Pětikoruny: 7 · 5 = 35 Kč.",
    "Dvoukoruny: 6 · 2 = 12 Kč.",
    "Dohromady 35 + 12 = 47 Kč.",
  ], 120),
  // ───────── L3 ─────────
  mk("P5_JED_27", "p5_mince", 3, "V kasičce jsou jen desetikorunové a dvacetikorunové mince. Je jich dohromady 11 a mají hodnotu 190 korun. Kolik dvacetikorunových mincí je v kasičce?", "8", [
    "Kdyby všech 11 mincí bylo desetikorunových, měly by hodnotu 11 · 10 = 110 Kč. To je o 190 − 110 = 80 Kč méně, než je ve skutečnosti.",
    "Každá výměna desetikoruny za dvacetikorunu přidá 10 Kč. Potřebujeme přidat 80 Kč, tedy 80 : 10 = 8 výměn.",
    "Dvacetikorunových mincí je 8 (a desetikorunové 3). Zkouška: 8 · 20 + 3 · 10 = 160 + 30 = 190 Kč.",
  ], 210),
  mk("P5_JED_28", "p5_cas", 3, "Hodiny předbíhají každou hodinu o 4 minuty. V 6:00 ukazovaly správný čas. Jaký čas budou ukazovat, až bude správně 10:00? Napiš čas ve tvaru hodiny:minuty.", "10:16", [
    "Od 6:00 do 10:00 uplynou 4 hodiny.",
    "Za každou hodinu hodiny předbíhají o 4 minuty, za 4 hodiny tedy o 4 · 4 = 16 minut.",
    "Správný čas je 10:00, hodiny ukazují o 16 minut víc, tedy 10:16.",
  ], 210),
  mk("P5_JED_29", "p5_ceny", 3, "Kilogram jablek stojí 36 korun. Kolik korun zaplatíš za 2 kilogramy 500 gramů jablek?", null, [
    "Dva kilogramy stojí 2 · 36 = 72 Kč.",
    "Půl kilogramu stojí polovinu z 36 Kč, tedy 18 Kč.",
    "Dohromady 72 + 18 = 90 Kč. Správně je C).",
  ], 180, { moznosti: ["72", "81", "90", "96", "108"], spravna: 2 }),
  mk("P5_JED_30", "p5_cas", 3, "Maminka vyšla z domu v 7:45 a vrátila se v 9:10. Z toho 25 minut nakupovala v obchodě. Kolik minut šla celkem na cestě tam a zpátky?", "60", [
    "Od 7:45 do 8:45 je hodina, tedy 60 minut, a od 8:45 do 9:10 je dalších 25 minut. Celá doba mimo domov je 85 minut.",
    "Nakupováním strávila 25 minut, na cestě je tedy 85 − 25 = 60 minut.",
  ], 210),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const A = (id) => by[id].odpoved;
const t = (h, m) => h * 60 + m;

ok("16", 8 * 10 + 5 === 85 && A("P5_JED_16") === "85");
ok("17", 7 * 10 === 70 && A("P5_JED_17") === "70");
ok("18", 180 / 60 === 3 && A("P5_JED_18") === "3");
ok("19", 27 / 3 === 9 && A("P5_JED_19") === "9");
ok("20", 4 * 60 === 240 && A("P5_JED_20") === "240");
ok("21", 1000 - 650 === 350 && A("P5_JED_21") === "350");
ok("22", hm(t(7, 50) + 45) === "8:35" && A("P5_JED_22") === "8:35");
ok("23", t(15, 5) - t(13, 20) === 105 && A("P5_JED_23") === "105");
{ const e = by.P5_JED_24, c = 85 / 5 * 8; ok("24", c === 136 && e.moznosti[e.spravna] === "136" && e.moznosti.filter((m) => Number(m) === c).length === 1); }
ok("25", 3000 / 250 === 12 && A("P5_JED_25") === "12");
ok("26", 7 * 5 + 6 * 2 === 47 && A("P5_JED_26") === "47");
{ const s = []; for (let b = 0; b <= 11; b++) { const a = 11 - b; if (10 * a + 20 * b === 190) s.push(b); } ok("27", s.length === 1 && String(s[0]) === A("P5_JED_27"), s); }
ok("28", hm(t(10, 0) + (10 - 6) * 4) === "10:16" && A("P5_JED_28") === "10:16");
{ const e = by.P5_JED_29, c = 36 * 2.5; ok("29", c === 90 && e.moznosti[e.spravna] === "90" && e.moznosti.filter((m) => Number(m) === c).length === 1); }
ok("30", t(9, 10) - t(7, 45) - 25 === 60 && A("P5_JED_30") === "60");

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null || /^\d{1,2}:\d{2}$/.test(e.odpoved), e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
}
ok("rozmístění", new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size === 2);
ok("čas 8.35", N.checkAnswer("8.35", "8:35") && N.checkAnswer("10 16", "10:16"));
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 15, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; A–E ${ex.filter((e) => e.moznosti).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Jednotky, čas a peníze, druhá dávka (15 úloh)` : "5. třída — Jednotky, čas a peníze, druhá dávka: převody, čas hodiny:minuty, ceny, mince (15 úloh: L1 ×5, L2 ×6, L3 ×4)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
