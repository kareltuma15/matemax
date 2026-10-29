// 5. třída, okruh „Jednotky, čas a peníze", třetí dávka (P5_JED_31–45): převody přes víc jednotek, čas hodiny:minuty, ceny, mince.
// Styl podle úloh 2, 3 a 9–12 oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Od 29. 10. 2026: v L2/L3 smí být „hezké“ dělení dvojciferným číslem a převody přes víc jednotek; L1 jen sousední jednotky.
// Spuštění: node scripts/build-5-jednotky3.mjs → doplní/přepíše P5_JED_31–45 v src/data/nahled-batch.json (jiné dávky nechá).
// Každý výsledek se v tomto skriptu nezávisle přepočítá (aritmetika, hrubá síla).
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_jednotky", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const hm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

const ex = [
  // ───────── L1 ─────────
  mk("P5_JED_31", "p5_prevody", 1, "Kolik decimetrů je 4 m 7 dm?", "47", [
    "Jeden metr má 10 decimetrů, takže 4 m je 40 dm.",
    "K tomu přidáme 7 dm: 40 + 7 = 47 dm.",
  ], 60),
  mk("P5_JED_32", "p5_cas", 1, "Kolik minut uplyne od 9:15 do 9:50?", "35", [
    "Oba časy jsou ve stejné hodině, stačí odečíst minuty.",
    "50 − 15 = 35 minut.",
  ], 60),
  mk("P5_JED_33", "p5_ceny", 1, "Za svačinu jsi zaplatil padesátikorunou a vrátili ti 12 korun. Kolik korun stála svačina?", "38", [
    "Zaplatil jsi 50 korun a 12 korun ti vrátili.",
    "Svačina stála 50 − 12 = 38 korun. Zkouška: 38 + 12 = 50.",
  ], 60),
  mk("P5_JED_34", "p5_mince", 1, "Kolik korun je 6 desetikorun a 3 pětikoruny dohromady?", "75", [
    "Desetikoruny: 6 · 10 = 60 Kč.",
    "Pětikoruny: 3 · 5 = 15 Kč.",
    "Dohromady 60 + 15 = 75 Kč.",
  ], 60),
  // ───────── L2 ─────────
  mk("P5_JED_35", "p5_prevody", 2, "Vypočítej a výsledek napiš v centimetrech: 2 m 40 cm − 150 mm.", "225", [
    "2 m 40 cm je 240 cm.",
    "150 mm je 15 cm, protože 1 cm má 10 mm.",
    "240 − 15 = 225 cm.",
  ], 120),
  mk("P5_JED_36", "p5_prevody", 2, "Bedna s jablky váží 12 kg. Samotná jablka mají hmotnost 9 kg 600 g. Kolik gramů váží prázdná bedna?", "2400", [
    "Bedna s jablky váží 12 kg, jablka 9 kg 600 g. Prázdná bedna váží rozdíl: 12 kg − 9 kg 600 g.",
    "12 kg je 12 000 g a 9 kg 600 g je 9 600 g. 12 000 − 9 600 = 2 400 g.",
  ], 120),
  mk("P5_JED_37", "p5_cas", 2, "Vyučování začíná v 8:00. Každá lekce trvá 45 minut a po každé lekci je přestávka 15 minut. V kolik hodin skončí čtvrtá lekce? Napiš čas ve tvaru hodiny:minuty.", "11:45", [
    "Lekce spolu s přestávkou trvá 45 + 15 = 60 minut, tedy hodinu.",
    "Tři první lekce s přestávkami zaberou 3 hodiny: do 11:00.",
    "Čtvrtá lekce začíná v 11:00 a trvá 45 minut, skončí v 11:45.",
  ], 150),
  mk("P5_JED_38", "p5_cas", 2, "Doplň chybějící číslo: 1 hodina = 20 minut + □ sekund.", "2400", [
    "Hodina má 60 minut, takže po odečtení 20 minut zbývá 60 − 20 = 40 minut.",
    "Jedna minuta má 60 sekund: 40 · 60 = 2 400 sekund.",
  ], 120),
  mk("P5_JED_39", "p5_ceny", 2, "Třída zaplatila za 20 stejných bloků 440 korun. Kolik korun zaplatí za 7 takových bloků?", null, [
    "Jeden blok stojí 440 : 20 = 22 korun.",
    "Sedm bloků stojí 7 · 22 = 154 korun. Správně je C).",
  ], 150, { moznosti: ["110", "132", "154", "176", "198"], spravna: 2 }),
  mk("P5_JED_40", "p5_mince", 2, "V peněžence jsou jen pětikorunové a desetikorunové mince, od každého druhu stejný počet. Všechny mince mají dohromady hodnotu 90 korun. Kolik mincí je v peněžence?", "12", [
    "Jedna pětikoruna a jedna desetikoruna mají dohromady 5 + 10 = 15 Kč.",
    "Takových dvojic je 90 : 15 = 6.",
    "Mincí je 6 · 2 = 12 (6 pětikorun a 6 desetikorun). Zkouška: 6 · 5 + 6 · 10 = 30 + 60 = 90 Kč.",
  ], 150),
  // ───────── L3 ─────────
  mk("P5_JED_41", "p5_cas", 3, "Pavel přečte 8 stran knihy za 20 minut. Kniha má 96 stran a on už přečetl 40 stran. Kolik minut mu ještě zbývá do konce knihy, když bude číst stejným tempem?", "140", [
    "Zbývá přečíst 96 − 40 = 56 stran.",
    "Za 20 minut přečte 8 stran, takže 56 stran je 56 : 8 = 7 takových úseků.",
    "Zbývá mu 7 · 20 = 140 minut.",
  ], 210),
  mk("P5_JED_42", "p5_prevody", 3, "Doplň chybějící číslo: 12 m − 35 dm + □ cm = 10 m.", "150", [
    "Převedeme na decimetry: 12 m = 120 dm a 10 m = 100 dm.",
    "120 − 35 = 85 dm. Do 100 dm chybí 100 − 85 = 15 dm.",
    "15 dm je 150 cm (1 dm má 10 cm).",
  ], 210),
  mk("P5_JED_43", "p5_ceny", 3, "Tři kilogramy brambor stojí 54 korun a dva kilogramy mrkve stojí 48 korun. Kolik korun zaplatíš za 1 kg 500 g brambor a 500 g mrkve?", null, [
    "Kilogram brambor stojí 54 : 3 = 18 korun, 1 kg 500 g brambor stojí 18 + 9 = 27 korun.",
    "Kilogram mrkve stojí 48 : 2 = 24 korun, 500 g mrkve stojí polovinu, tedy 12 korun.",
    "Dohromady 27 + 12 = 39 korun. Správně je D).",
  ], 210, { moznosti: ["30", "33", "36", "39", "42"], spravna: 3 }),
  mk("P5_JED_44", "p5_mince", 3, "Anička má jen pětikoruny, Barbora jen desetikoruny. Obě mají stejně korun. Anička má o 6 mincí víc než Barbora. Kolik korun má každá z nich?", "60", [
    "Dvě pětikoruny mají stejnou hodnotu jako jedna desetikoruna, takže Anička má dvakrát víc mincí než Barbora.",
    "Rozdíl v počtu mincí je 6. Je to tolik, kolik mincí má Barbora, takže Barbora má 6 desetikorun a Anička 12 pětikorun.",
    "Barbora má 6 · 10 = 60 Kč. Zkouška: Anička má 12 · 5 = 60 Kč.",
  ], 240),
  mk("P5_JED_45", "p5_cas", 3, "Dva pořady jdou v televizi po sobě. První trvá 48 minut, druhý je o čtvrtinu kratší. První pořad začíná v 18:40. V kolik hodin skončí druhý pořad? Napiš čas ve tvaru hodiny:minuty.", "20:04", [
    "Čtvrtina ze 48 minut je 48 : 4 = 12 minut, druhý pořad trvá 48 − 12 = 36 minut.",
    "Oba pořady spolu trvají 48 + 36 = 84 minut, tedy 1 hodinu a 24 minut.",
    "18:40 + 1 hodina = 19:40, k tomu 24 minut: 19:40 + 20 minut = 20:00 a ještě 4 minuty = 20:04.",
  ], 240),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const A = (id) => by[id].odpoved;
const t = (h, m) => h * 60 + m;

ok("31", 4 * 10 + 7 === 47 && A("P5_JED_31") === "47");
ok("32", 50 - 15 === 35 && A("P5_JED_32") === "35");
ok("33", 50 - 12 === 38 && A("P5_JED_33") === "38");
ok("34", 6 * 10 + 3 * 5 === 75 && A("P5_JED_34") === "75");
ok("35", 240 - 150 / 10 === 225 && A("P5_JED_35") === "225");
ok("36", 12000 - 9600 === 2400 && A("P5_JED_36") === "2400");
{ let end = t(8, 0); for (let i = 1; i <= 4; i++) { end += 45; if (i < 4) end += 15; } ok("37", hm(end) === "11:45" && A("P5_JED_37") === "11:45", hm(end)); }
ok("38", (3600 - 20 * 60) === 2400 && A("P5_JED_38") === "2400");
{ const e = by.P5_JED_39, c = 440 / 20 * 7; ok("39", c === 154 && e.moznosti[e.spravna] === "154" && e.moznosti.filter((m) => Number(m) === c).length === 1); }
{ const s = []; for (let n = 1; n <= 50; n++) if (n * 5 + n * 10 === 90) s.push(n * 2); ok("40", s.length === 1 && String(s[0]) === A("P5_JED_40"), s); }
{ const stran = 96 - 40; ok("41", stran % 8 === 0 && (stran / 8) * 20 === 140 && A("P5_JED_41") === "140"); }
{ // 12 m − 35 dm + x cm = 10 m, v cm
  const x = 1000 - (1200 - 350); ok("42", x === 150 && A("P5_JED_42") === "150"); }
{ const e = by.P5_JED_43, c = 54 / 3 * 1.5 + 48 / 2 * 0.5; ok("43", c === 39 && e.moznosti[e.spravna] === "39" && e.moznosti.filter((m) => Number(m) === c).length === 1); }
{ const s = []; for (let b = 1; b <= 100; b++) { const a = b + 6; if (5 * a === 10 * b) s.push(10 * b); } ok("44", s.length === 1 && String(s[0]) === A("P5_JED_44"), s); }
{ const dr = 48 - 48 / 4; ok("45", dr === 36 && hm(t(18, 40) + 48 + dr) === "20:04" && A("P5_JED_45") === "20:04"); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null || /^\d{1,2}:\d{2}$/.test(e.odpoved), e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
  // L1: jen sousední jednotky a žádné dělení dvojciferným číslem
  if (e.obtiznost === 1) ok(e.id + " L1 bez dvojciferného dělení", !/\d :\s?\d\d/.test(e.zadani + e.reseni_kroky.join(" ")));
}
ok("rozmístění", new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size === 2);
ok("čas 20.04", N.checkAnswer("20.04", "20:04") && N.checkAnswer("11 45", "11:45"));
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
const nazev = others.length ? `${prev.nazev} + 5. třída: Jednotky, čas a peníze, třetí dávka (15 úloh)` : "5. třída — Jednotky, čas a peníze, třetí dávka: převody přes víc jednotek, čas hodiny:minuty, ceny, mince (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
