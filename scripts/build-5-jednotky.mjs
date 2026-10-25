// 5. třída, okruh „Jednotky, čas a peníze" (P5_JED_01–14): převody, čas hodiny:minuty, mince, ceny a množství.
// Styl podle úloh 2 a 3 oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Spuštění: node scripts/build-5-jednotky.mjs → doplní/přepíše P5_JED_* v src/data/nahled-batch.json (jiné dávky nechá).
// Každý výsledek se v tomto skriptu nezávisle přepočítá (aritmetika, hrubá síla, dynamické programování).
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_jednotky", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const hm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

const ex = [
  // ───────── L1 ─────────
  mk("P5_JED_01", "p5_prevody", 1, "Kolik metrů je 2 km 350 m?", "2350", [
    "Jeden kilometr má 1 000 metrů, takže 2 km je 2 000 m.",
    "K tomu přidáme 350 m: 2 000 + 350 = 2 350 m.",
  ], 60),
  mk("P5_JED_02", "p5_prevody", 1, "Kolik gramů je 3 kg 40 g?", "3040", [
    "Jeden kilogram má 1 000 gramů, takže 3 kg je 3 000 g.",
    "K tomu přidáme 40 g: 3 000 + 40 = 3 040 g.",
  ], 60),
  mk("P5_JED_03", "p5_cas", 1, "Kolik minut je 2 hodiny 15 minut?", "135", [
    "Jedna hodina má 60 minut, takže 2 hodiny je 120 minut.",
    "K tomu přidáme 15 minut: 120 + 15 = 135 minut.",
  ], 60),
  mk("P5_JED_04", "p5_ceny", 1, "Sešit stojí 24 Kč. Kolik korun zaplatíš za 5 takových sešitů?", "120", [
    "Cena se násobí počtem kusů: 5 · 24.",
    "5 · 24 = 120, tedy 120 Kč.",
  ], 60),
  // ───────── L2 ─────────
  mk("P5_JED_05", "p5_prevody", 2, "Kolikrát je jeden metr kratší než jedna dvacetina kilometru?", "50", [
    "Kilometr má 1 000 metrů. Jedna dvacetina z něj je 1 000 : 20 = 50 metrů.",
    "Metr se do 50 metrů vejde 50krát, takže jeden metr je 50krát kratší.",
  ], 120, { latex: false }),
  mk("P5_JED_06", "p5_prevody", 2, "O kolik gramů je čtvrtkilogramové závaží lehčí než závaží o hmotnosti 300 g?", "50", [
    "Čtvrt kilogramu je 1 000 : 4 = 250 g.",
    "Rozdíl: 300 − 250 = 50 g.",
  ], 120),
  mk("P5_JED_07", "p5_cas", 2, "Kolik nejvíce celých 35minutových dílů pořadu lze zhlédnout za 4 hodiny?", "6", [
    "Čtyři hodiny jsou 4 · 60 = 240 minut.",
    "240 : 35 vyjde 6 a zbyde 30 minut (6 · 35 = 210, 7 · 35 = 245 je víc než 240).",
    "Celých dílů se stihne zhlédnout nejvíc 6.",
  ], 150),
  mk("P5_JED_08", "p5_cas", 2, "Film začal v 18:45 a trval 1 hodinu a 50 minut. V kolik hodin skončil? Napiš čas ve tvaru hodiny:minuty.", "20:35", [
    "K 18:45 přidáme nejdřív hodinu: 19:45.",
    "Zbývá přidat 50 minut. Do 20:00 je to 15 minut, zbývajících 35 minut vede na 20:35.",
    "Film skončil ve 20:35.",
  ], 150),
  mk("P5_JED_14", "p5_prevody", 2, "Která z hmotností je největší?", null, [
    "Všechno převedeme na gramy: A) 500 g, B) 0,45 kg = 450 g, C) $\\frac{3}{4}$ kg = 750 g, D) 700 g, E) 0,6 kg = 600 g.",
    "Největší je 750 g, tedy $\\frac{3}{4}$ kg. Správně je C).",
  ], 150, { latex: true, moznosti: ["500 g", "0,45 kg", "$\\frac{3}{4}$ kg", "700 g", "0,6 kg"], spravna: 2 }),
  mk("P5_JED_15", "p5_cas", 2, "Kolik minut je $\\frac{5}{12}$ hodiny?", null, [
    "Hodina má 60 minut. Jedna dvanáctina hodiny je 60 : 12 = 5 minut.",
    "Pět dvanáctin je 5 · 5 = 25 minut. Správně je B).",
  ], 120, { latex: true, moznosti: ["20 minut", "25 minut", "30 minut", "35 minut", "40 minut"], spravna: 1 }),
  // ───────── L3 ─────────
  mk("P5_JED_09", "p5_mince", 3, "V peněžence jsou jen dvoukorunové a pětikorunové mince. Je jich dohromady 9 a mají hodnotu 30 korun. Kolik dvoukorunových mincí je v peněžence?", "5", [
    "Kdyby byly všech 9 mincí pětikorunové, měly by hodnotu 9 · 5 = 45 Kč. To je o 15 Kč víc, než je ve skutečnosti.",
    "Každá výměna pětikoruny za dvoukorunu sníží hodnotu o 3 Kč. Potřebujeme snížit o 15 Kč, tedy 15 : 3 = 5 výměn.",
    "Dvoukorunových mincí je 5 (a pětikorunových 4). Zkouška: 5 · 2 + 4 · 5 = 10 + 20 = 30 Kč.",
  ], 210),
  mk("P5_JED_11", "p5_ceny", 3, "V řeznictví stojí 1 kg šunky 240 korun. Kolik gramů šunky koupíš za 150 korun?", "625", [
    "Za 240 Kč dostaneš 1 000 g. Za 24 Kč tedy 100 g (obojí je desetkrát méně).",
    "Za 150 Kč koupíš 6 dílů po 100 g (6 · 24 = 144 Kč), tedy 600 g, a zbyde ti 6 Kč. Těch 6 Kč je čtvrtina z 24 Kč, takže za ně koupíš čtvrtinu ze 100 g, to je 25 g.",
    "Za 150 korun koupíš 625 g šunky. Zkouška: 625 g je 0,625 kg a 0,625 · 240 = 150.",
  ], 210),
  mk("P5_JED_12", "p5_mince", 3, "K dispozici jsou mince po 1, 2, 5, 10 a 20 Kč, od každého druhu libovolně mnoho. Kolik nejméně mincí je potřeba na zaplacení přesně 37 korun?", "4", [
    "Vybíráme co největší mince. Největší, která se vejde, je 20 Kč: zbývá 37 − 20 = 17 Kč.",
    "Dál 10 Kč: zbývá 7 Kč. Pak 5 Kč: zbývá 2 Kč. Nakonec 2 Kč: zbývá 0.",
    "Použili jsme mince 20, 10, 5 a 2 Kč, tedy 4 mince. Méně to nejde: se třemi mincemi vyjde třeba 35 (20 + 10 + 5) nebo 40 (20 + 10 + 10), ale 37 žádná trojice nedá.",
  ], 210),
  mk("P5_JED_13", "p5_cas", 3, "Janek vyšel z domu v 7:42. Cesta do školy trvá 18 minut. Po 5 minutách chůze si uvědomil, že zapomněl penál, a šel stejně rychle zpátky domů. Doma strávil 4 minuty a pak šel znovu rovnou do školy. V kolik hodin dorazil do školy? Napiš čas ve tvaru hodiny:minuty.", "8:14", [
    "Pět minut šel z domu a pět zpátky: 7:42 + 10 minut = 7:52 je zpátky doma.",
    "Doma strávil 4 minuty, takže znovu vyšel v 7:56.",
    "Cesta do školy trvá 18 minut: 7:56 + 18 minut = 8:14 (do 8:00 jsou 4 minuty a zbývá 14).",
  ], 240),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const A = (id) => by[id].odpoved;

ok("01", 2 * 1000 + 350 === 2350 && A("P5_JED_01") === "2350");
ok("02", 3 * 1000 + 40 === 3040 && A("P5_JED_02") === "3040");
ok("03", 2 * 60 + 15 === 135 && A("P5_JED_03") === "135");
ok("04", 24 * 5 === 120 && A("P5_JED_04") === "120");
ok("05", 1000 / 20 / 1 === 50 && A("P5_JED_05") === "50");
ok("06", 300 - 1000 / 4 === 50 && A("P5_JED_06") === "50");
ok("07", Math.floor((4 * 60) / 35) === 6 && 6 * 35 <= 240 && 7 * 35 > 240 && A("P5_JED_07") === "6");
ok("08", hm(18 * 60 + 45 + 110) === "20:35" && A("P5_JED_08") === "20:35");
{ const sol = []; for (let a = 0; a <= 9; a++) { const b = 9 - a; if (2 * a + 5 * b === 30) sol.push(a); } ok("09", sol.length === 1 && String(sol[0]) === A("P5_JED_09"), sol); }
ok("11", (150 / 240) * 1000 === 625 && A("P5_JED_11") === "625");
{ // nejmenší počet mincí na 37 Kč (dynamické programování)
  const mince = [1, 2, 5, 10, 20], dp = [0];
  for (let i = 1; i <= 37; i++) dp[i] = Math.min(...mince.filter((m) => m <= i).map((m) => dp[i - m] + 1));
  ok("12", dp[37] === 4 && A("P5_JED_12") === "4", dp[37]);
}
ok("13", hm(7 * 60 + 42 + 5 + 5 + 4 + 18) === "8:14" && A("P5_JED_13") === "8:14");
{ const g = [500, 450, 750, 700, 600]; ok("14", g.indexOf(Math.max(...g)) === by.P5_JED_14.spravna && g.filter((x) => x === 750).length === 1); }
ok("15", (5 / 12) * 60 === 25 && by.P5_JED_15.moznosti[by.P5_JED_15.spravna] === "25 minut");

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null || /^\d{1,2}:\d{2}$/.test(e.odpoved), e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
}
// správné možnosti nejsou stále na stejném místě; časové odpovědi uznáme i v jiném zápisu
ok("rozmístění", new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size === 2);
ok("čas 20.35", N.checkAnswer("20.35", "20:35") && N.checkAnswer("08:14", "8:14"));
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 14, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; A–E ${ex.filter((e) => e.moznosti).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^P5_JED_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Jednotky, čas a peníze (14 úloh)` : "5. třída — Jednotky, čas a peníze: převody, čas hodiny:minuty, mince, ceny (14 úloh: L1 ×4, L2 ×6, L3 ×4)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
