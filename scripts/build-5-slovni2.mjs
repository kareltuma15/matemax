// 5. třída, okruh „Slovní úlohy a úvaha", druhá dávka (P5_SLO_16–30): dva údaje, tempo, hmotnosti, věk, logika.
// Styl podle úloh 3 a 4 oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Bez dělení dvojciferným číslem, bez zbytku po dělení a dělitelnosti; převody jen mezi sousedními jednotkami (Karel).
// Spuštění: node scripts/build-5-slovni2.mjs → doplní/přepíše P5_SLO_16–30 v src/data/nahled-batch.json (jiné dávky nechá).
// Každý výsledek se v tomto skriptu nezávisle přepočítá (aritmetika, hrubá síla).
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_slovni", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});

const ex = [
  // ───────── L1 ─────────
  mk("P5_SLO_16", "p5_dva_udaje", 1, "V autobuse jelo 28 lidí. Na zastávce 9 lidí vystoupilo a 14 nastoupilo. Kolik lidí jede v autobuse teď?", "33", [
    "Po vystoupení zůstalo 28 − 9 = 19 lidí.",
    "Po nastoupení je jich 19 + 14 = 33.",
  ], 75),
  mk("P5_SLO_17", "p5_tempo", 1, "Truhlář vyrobí za jeden den 4 židle. Kolik židlí vyrobí za 7 dní?", "28", [
    "Za každý den přibudou 4 židle, dní je 7.",
    "7 · 4 = 28 židlí.",
  ], 60),
  mk("P5_SLO_18", "p5_hmotnosti", 1, "Pět stejných pomerančů váží dohromady 1 kilogram. Kolik gramů váží jeden pomeranč?", "200", [
    "Jeden kilogram má 1 000 gramů.",
    "Rozdělíme na pět stejných dílů: 1 000 : 5 = 200 g.",
  ], 75),
  mk("P5_SLO_19", "p5_vek", 1, "Tomášovi je 11 let a jeho sestře je o 4 roky méně. Kolik let bude sestře za 3 roky?", "10", [
    "Sestře je dnes 11 − 4 = 7 let.",
    "Za 3 roky jí bude 7 + 3 = 10 let.",
  ], 90),
  // ───────── L2 ─────────
  mk("P5_SLO_20", "p5_dva_udaje", 2, "Kamila koupila 3 sešity po 18 korunách a pastelky za 25 korun. Zaplatila stokorunou. Kolik korun jí vrátili?", "21", [
    "Sešity stojí 3 · 18 = 54 Kč.",
    "Spolu s pastelkami je to 54 + 25 = 79 Kč.",
    "Vrátili jí 100 − 79 = 21 Kč.",
  ], 120),
  mk("P5_SLO_21", "p5_tempo", 2, "Kamion odveze při jedné jízdě 8 palet. Kolik jízd musí udělat, aby odvezl 72 palet?", "9", [
    "Zjišťujeme, kolikrát se 8 palet vejde do 72 palet: 72 : 8.",
    "72 : 8 = 9. Zkouška: 9 · 8 = 72, takže kamion musí udělat 9 jízd.",
  ], 90),
  mk("P5_SLO_22", "p5_hmotnosti", 2, "Krabice se 6 stejnými knihami váží 5 kilogramů. Prázdná krabice váží 800 gramů. Kolik gramů váží jedna kniha?", "700", [
    "Pět kilogramů je 5 000 gramů.",
    "Samotné knihy váží 5 000 − 800 = 4 200 g.",
    "Jedna kniha váží 4 200 : 6 = 700 g. Zkouška: 6 · 700 + 800 = 4 200 + 800 = 5 000 g.",
  ], 150),
  mk("P5_SLO_23", "p5_vek", 2, "Otec je čtyřikrát starší než jeho syn. Dohromady mají 50 let. Kolik let je synovi?", "10", [
    "Věk syna vezmeme jako jeden díl, otec má čtyři takové díly. Dohromady je to 5 dílů.",
    "Pět dílů je 50 let, jeden díl je 50 : 5 = 10 let.",
    "Synovi je 10 let (otci 40). Zkouška: 10 + 40 = 50.",
  ], 150),
  mk("P5_SLO_24", "p5_logika", 2, "Karel, Jana a Petr mají dohromady 65 korun. Jana má o 10 korun víc než Petr a Karel má o 5 korun míň než Petr. Kolik korun má Petr?", null, [
    "Porovnáme všechny s Petrem: Jana má o 10 Kč víc a Karel o 5 Kč míň. Dohromady mají tedy o 10 − 5 = 5 Kč víc, než kdyby měli všichni tři stejně jako Petr.",
    "Třikrát Petrova částka je 65 − 5 = 60 Kč, takže Petr má 60 : 3 = 20 Kč.",
    "Zkouška: Petr 20, Jana 30, Karel 15 a 20 + 30 + 15 = 65. Správně je B).",
  ], 180, { moznosti: ["15", "20", "25", "30", "35"], spravna: 1 }),
  mk("P5_SLO_25", "p5_dva_udaje", 2, "Ve třídě je 24 žáků. Dívek je o 4 víc než chlapců. Kolik je ve třídě chlapců?", null, [
    "Kdyby dívek bylo stejně jako chlapců, bylo by ve třídě o 4 žáky méně: 24 − 4 = 20.",
    "Pak by chlapců i dívek bylo stejně, každých 20 : 2 = 10.",
    "Chlapců je 10 (a dívek 14). Správně je C).",
  ], 150, { moznosti: ["8", "9", "10", "11", "12"], spravna: 2 }),
  // ───────── L3 ─────────
  mk("P5_SLO_26", "p5_tempo", 3, "Jana přečte za den 4 strany a Petr 3 strany. Začali číst společně jednu knihu, každý od svého konce, ve stejný den. Kniha má 56 stran. Za kolik dní ji společně dočtou?", "8", [
    "Oba dohromady přečtou za jeden den 4 + 3 = 7 stran.",
    "Na 56 stran potřebují 56 : 7 = 8 dní.",
    "Zkouška: Jana přečte za 8 dní 32 stran, Petr 24 stran a 32 + 24 = 56.",
  ], 180),
  mk("P5_SLO_27", "p5_hmotnosti", 3, "Na jedné misce vah leží 2 stejná závaží a kostka o hmotnosti 300 gramů. Na druhé misce leží 5 stejných závaží. Váhy jsou v rovnováze. Kolik gramů váží jedno závaží?", "100", [
    "Na obou miskách je stejná hmotnost. Odebereme z každé misky 2 závaží.",
    "Na jedné misce zůstane jen kostka 300 g a na druhé 3 závaží, takže 3 závaží váží 300 g.",
    "Jedno závaží váží 300 : 3 = 100 g. Zkouška: 2 · 100 + 300 = 500 a 5 · 100 = 500.",
  ], 210),
  mk("P5_SLO_28", "p5_vek", 3, "Před 5 lety byla matka třikrát starší než dcera. Matce je dnes 38 let. Kolik let je dceři dnes?", "16", [
    "Před 5 lety bylo matce 38 − 5 = 33 let.",
    "Tehdy byla třikrát starší než dcera, takže dceři bylo 33 : 3 = 11 let.",
    "Od té doby uplynulo 5 let, takže dceři je dnes 11 + 5 = 16 let.",
  ], 210),
  mk("P5_SLO_29", "p5_dva_udaje", 3, "Pavel měl o 30 korun víc než Jirka. Pak dal Pavel Jirkovi 20 korun. O kolik korun má teď Jirka víc než Pavel?", "10", [
    "Na začátku měl Pavel o 30 Kč víc. Když dal Jirkovi 20 Kč, ubylo to Pavlovi a přibylo Jirkovi.",
    "Rozdíl se tedy změnil o dvojnásobek: 2 · 20 = 40 Kč. Pavlův náskok 30 Kč zmizel a Jirka je napřed.",
    "Jirka má teď víc o 40 − 30 = 10 Kč. (Například Jirka 50 a Pavel 80: po výměně Jirka 70 a Pavel 60.)",
  ], 240),
  mk("P5_SLO_30", "p5_logika", 3, "Kolika způsoby můžeš zaplatit přesně 16 korun, když máš dost dvoukorunových a pětikorunových mincí? Způsoby se liší počtem mincí každého druhu.", "2", [
    "Počet pětikorun musí být takový, aby zbytek šel zaplatit dvoukorunami, tedy zbylá částka musí být sudá. Zkusíme 0, 1, 2 a 3 pětikoruny.",
    "0 pětikorun: zbývá 16 Kč, to je 8 dvoukorun. 1 pětikoruna: zbývá 11 Kč, to dvoukorunami nejde. 2 pětikoruny: zbývá 6 Kč, to jsou 3 dvoukoruny. 3 pětikoruny: zbývá 1 Kč, to nejde.",
    "Jdou jen dva způsoby: 8 dvoukorun, nebo 2 pětikoruny a 3 dvoukoruny.",
  ], 270),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const A = (id) => by[id].odpoved;

ok("16", 28 - 9 + 14 === 33 && A("P5_SLO_16") === "33");
ok("17", 7 * 4 === 28 && A("P5_SLO_17") === "28");
ok("18", 1000 / 5 === 200 && A("P5_SLO_18") === "200");
ok("19", (11 - 4) + 3 === 10 && A("P5_SLO_19") === "10");
ok("20", 100 - (3 * 18 + 25) === 21 && A("P5_SLO_20") === "21");
{ let j = 0; while (8 * j < 72) j++; ok("21", j === 9 && 8 * j === 72 && A("P5_SLO_21") === "9"); }
{ const s = []; for (let k = 1; k < 2000; k++) if (6 * k + 800 === 5000) s.push(k); ok("22", s.length === 1 && String(s[0]) === A("P5_SLO_22"), s); }
{ const s = []; for (let sy = 1; sy < 50; sy++) if (sy + 4 * sy === 50) s.push(sy); ok("23", s.length === 1 && String(s[0]) === A("P5_SLO_23"), s); }
{ const e = by.P5_SLO_24, s = []; for (let p = 1; p < 65; p++) if (p + (p + 10) + (p - 5) === 65) s.push(p); ok("24", s.length === 1 && e.moznosti[e.spravna] === String(s[0]) && e.moznosti.filter((m) => Number(m) === s[0]).length === 1, s); }
{ const e = by.P5_SLO_25, s = []; for (let c = 1; c < 24; c++) if (c + (c + 4) === 24) s.push(c); ok("25", s.length === 1 && e.moznosti[e.spravna] === String(s[0]) && e.moznosti.filter((m) => Number(m) === s[0]).length === 1, s); }
{ let d = 0; while (7 * d < 56) d++; ok("26", d === 8 && 4 * d + 3 * d === 56 && A("P5_SLO_26") === "8"); }
{ const s = []; for (let w = 1; w < 1000; w++) if (2 * w + 300 === 5 * w) s.push(w); ok("27", s.length === 1 && String(s[0]) === A("P5_SLO_27"), s); }
{ const s = []; for (let d = 1; d < 50; d++) if (d + 5 > 0 && 38 - 5 === 3 * (d + 5 - 5)) s.push(d); ok("28", s.length === 1 && String(s[0] + 5) === A("P5_SLO_28") && s[0] + 5 === 16, s); }
{ const s = []; for (let j = 0; j < 200; j++) { const p = j + 30; if (j + 20 - (p - 20) > 0) s.push(j + 20 - (p - 20)); } ok("29", s.every((v) => v === 10) && s.length > 0 && A("P5_SLO_29") === "10", s.slice(0, 3)); }
{ let c = 0; for (let b = 0; 5 * b <= 16; b++) if ((16 - 5 * b) % 2 === 0) c++; ok("30", c === 2 && A("P5_SLO_30") === "2", c); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
}
ok("rozmístění", new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size === 2);
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
const nazev = others.length ? `${prev.nazev} + 5. třída: Slovní úlohy a úvaha, druhá dávka (15 úloh)` : "5. třída — Slovní úlohy a úvaha, druhá dávka: dva údaje, tempo, hmotnosti, věk, logika (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
