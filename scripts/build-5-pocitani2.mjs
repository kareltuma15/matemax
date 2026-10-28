// 5. třída, okruh „Počítání s čísly", druhá dávka (P5_POC_13–27): větší čísla, zbytek po dělení, zaokrouhlování, násobky a dělitelé, doplňování čísla.
// Styl podle úlohy 1 oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Spuštění: node scripts/build-5-pocitani2.mjs → doplní/přepíše P5_POC_13–27 v src/data/nahled-batch.json (jiné dávky nechá).
// Každá odpověď se nezávisle přepočítá z textu zadání (vyhodnocení výrazu, hrubá síla); A–E má právě jednu správnou možnost.
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

/** Vyhodnotí výraz zapsaný v LaTeXu pro 5. třídu (čísla, + - \cdot :, závorky, \square jako neznámá) — bez eval cizího kódu. */
function vyhodnot(tex) {
  const s = tex.replace(/\\cdot/g, "*").replace(/:/g, "/").replace(/\\square/g, "(Q)");
  if (!/^[0-9+\-*/().Q\s]+$/.test(s)) throw new Error("nepovolený znak ve výrazu: " + tex);
  return (q) => Function("Q", `"use strict"; return (${s});`)(q);
}

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_pocitani", podtema, obtiznost: level, latex: true, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});

const ex = [
  // ───────── L1 ─────────
  mk("P5_POC_13", "p5_velka_cisla", 1, "Vypočítej: $4350 + 2780$", "7130", [
    "Sčítáme po řádech: $4350 + 2000 = 6350$, pak $6350 + 700 = 7050$ a $7050 + 80 = 7130$.",
    "Výsledek je 7130.",
  ], 75),
  mk("P5_POC_14", "p5_velka_cisla", 1, "Vypočítej: $9000 - 3475$", "5525", [
    "Odečítat od 9000 se dá po částech: $9000 - 3000 = 6000$, pak $6000 - 400 = 5600$ a $5600 - 75 = 5525$.",
    "Zkouška sčítáním: $5525 + 3475 = 9000$. Výsledek je 5525.",
  ], 90),
  mk("P5_POC_15", "p5_velka_cisla", 1, "Vypočítej: $24 \\cdot 35$", "840", [
    "Rozložíme: $24 \\cdot 35 = 24 \\cdot 30 + 24 \\cdot 5$.",
    "$24 \\cdot 30 = 720$ a $24 \\cdot 5 = 120$, dohromady $720 + 120 = 840$.",
  ], 90),
  mk("P5_POC_16", "p5_deleni_zbytek", 1, "Jaký je zbytek po dělení $85 : 6$?", "1", [
    "Šestka se do 85 vejde nejvýš 14krát, protože $14 \\cdot 6 = 84$ (a $15 \\cdot 6 = 90$ je už víc).",
    "Zbytek je $85 - 84 = 1$.",
  ], 75),
  mk("P5_POC_17", "p5_zaokrouhlovani", 1, "Zaokrouhli číslo 4678 na stovky.", "4700", [
    "Na místě stovek je v čísle 4678 šestka. Podíváme se na další číslici, desítky: je to 7.",
    "Sedmička je 5 nebo víc, takže zaokrouhlujeme nahoru: z 4600 se stane 4700.",
  ], 75),
  // ───────── L2 ─────────
  mk("P5_POC_18", "p5_velka_cisla", 2, "Vypočítej: $18 \\cdot 125$", "2250", [
    "Číslo 125 je osmina z tisíce, takže se dá počítat po částech: $10 \\cdot 125 = 1250$ a $8 \\cdot 125 = 1000$.",
    "Dohromady $1250 + 1000 = 2250$.",
  ], 100),
  mk("P5_POC_19", "p5_velka_cisla", 2, "Vypočítej: $7200 : 15$", "480", [
    "Zjednodušíme: číslo 7200 i 15 jdou vydělit pěti, takže $7200 : 15 = 1440 : 3$.",
    "$1440 : 3 = 480$. Zkouška: $480 \\cdot 15 = 4800 + 2400 = 7200$.",
  ], 120),
  mk("P5_POC_20", "p5_zaokrouhlovani", 2, "Zaokrouhli čísla 4560 a 2480 na tisíce a vypočítej jejich součet.", "7000", [
    "Číslo 4560 má na místě tisíců 4 a další číslice je 5, takže zaokrouhlíme nahoru na 5000.",
    "Číslo 2480 má na místě tisíců 2 a další číslice je 4, takže zaokrouhlíme dolů na 2000.",
    "Součet zaokrouhlených čísel: $5000 + 2000 = 7000$.",
  ], 120),
  mk("P5_POC_21", "p5_nasobky", 2, "Které je největší dvojciferné číslo dělitelné osmi?", "96", [
    "Největší dvojciferné číslo je 99. Hledáme největší násobek osmi, který není větší.",
    "Násobky osmi: 8, 16, 24, ..., $12 \\cdot 8 = 96$ a $13 \\cdot 8 = 104$ už je trojciferné.",
    "Hledané číslo je 96.",
  ], 120),
  mk("P5_POC_22", "p5_deleni_zbytek", 2, "Které z čísel dává po dělení šesti zbytek 4?", null, [
    "U každého čísla zjistíme zbytek po dělení šesti: $56 = 9 \\cdot 6 + 2$, $59 = 9 \\cdot 6 + 5$, $52 = 8 \\cdot 6 + 4$, $61 = 10 \\cdot 6 + 1$, $63 = 10 \\cdot 6 + 3$.",
    "Zbytek 4 má jen číslo 52. Správně je C).",
  ], 120, { moznosti: ["56", "59", "52", "61", "63"], spravna: 2 }),
  mk("P5_POC_23", "doplnit_cislo", 2, "Doplň do čtverečku takové číslo, aby platila rovnost: $\\square \\cdot 8 = 480 : 2$", "30", [
    "Pravou stranu spočítáme: $480 : 2 = 240$.",
    "Rovnost má tvar $\\square \\cdot 8 = 240$, takže $\\square = 240 : 8 = 30$.",
    "Zkouška: $30 \\cdot 8 = 240$.",
  ], 120),
  // ───────── L3 ─────────
  mk("P5_POC_24", "p5_nasobky", 3, "Kolik dvojciferných čísel je dělitelných dvanácti?", "8", [
    "Hledáme násobky dvanácti, které mají dvě číslice: $1 \\cdot 12 = 12$, $2 \\cdot 12 = 24$, ..., $8 \\cdot 12 = 96$.",
    "Další násobek $9 \\cdot 12 = 108$ už je trojciferné. Dvojciferných násobků dvanácti je tedy 8.",
  ], 150),
  mk("P5_POC_25", "doplnit_cislo", 3, "Doplň do čtverečku takové číslo, aby platila rovnost: $(\\square + 15) : 4 = 3 \\cdot 5 - 7$", "17", [
    "Pravou stranu spočítáme: $3 \\cdot 5 = 15$ a $15 - 7 = 8$.",
    "Rovnost má tvar $(\\square + 15) : 4 = 8$. Něco děleno čtyřmi dá 8, takže závorka je $8 \\cdot 4 = 32$.",
    "Z $\\square + 15 = 32$ vyjde $\\square = 17$. Zkouška: $(17 + 15) : 4 = 32 : 4 = 8$.",
  ], 180),
  mk("P5_POC_26", "p5_velka_cisla", 3, "Součin dvou čísel je 360 a jedno z nich je 24. Jaký je součet obou čísel?", "39", [
    "Druhé číslo zjistíme dělením: $360 : 24 = 15$ (zkouška: $24 \\cdot 15 = 360$).",
    "Součet obou čísel je $24 + 15 = 39$.",
  ], 150),
  mk("P5_POC_27", "p5_deleni_zbytek", 3, "Které číslo dává po dělení sedmi podíl 12 a zbytek 5?", null, [
    "Dělené číslo se dá zpětně složit: podíl krát dělitel plus zbytek, tedy $12 \\cdot 7 + 5$.",
    "$12 \\cdot 7 = 84$ a $84 + 5 = 89$. Správně je B).",
    "Zkouška: $89 : 7 = 12$ a $12 \\cdot 7 = 84$, zbytek $89 - 84 = 5$.",
  ], 180, { moznosti: ["84", "89", "91", "96", "99"], spravna: 1 }),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const dolar = (z) => z.match(/\$([^$]+)\$/)[1];
const A = (id) => by[id].odpoved;

// úlohy „Vypočítej: $…$": výraz ze zadání se vyhodnotí a porovná s odpovědí
for (const e of ex.filter((x) => /^Vypočítej: /.test(x.zadani))) {
  const v = vyhodnot(dolar(e.zadani))();
  ok(e.id + " hodnota výrazu", Number.isInteger(v) && String(v) === e.odpoved, `${v} ≠ ${e.odpoved}`);
}
ok("16 zbytek", 85 % 6 === 1 && Math.floor(85 / 6) === 14 && A("P5_POC_16") === "1");
ok("17 zaokrouhlení", Math.round(4678 / 100) * 100 === 4700 && A("P5_POC_17") === "4700");
ok("20 zaokrouhlení součtu", Math.round(4560 / 1000) * 1000 + Math.round(2480 / 1000) * 1000 === 7000 && A("P5_POC_20") === "7000");
{ let m = 0; for (let n = 10; n <= 99; n++) if (n % 8 === 0) m = n; ok("21", m === 96 && A("P5_POC_21") === "96", m); }
{ const e = by.P5_POC_22, sh = e.moznosti.map((m, i) => (Number(m) % 6 === 4 ? i : -1)).filter((i) => i >= 0); ok("22", sh.length === 1 && sh[0] === e.spravna, sh); }
{ const [l, r] = dolar(by.P5_POC_23.zadani).split("="), f = vyhodnot(l), g = vyhodnot(r), s = []; for (let q = 0; q <= 999; q++) if (f(q) === g(q)) s.push(q); ok("23", s.length === 1 && String(s[0]) === A("P5_POC_23"), s); }
{ let c = 0; for (let n = 10; n <= 99; n++) if (n % 12 === 0) c++; ok("24", c === 8 && A("P5_POC_24") === "8", c); }
{ const [l, r] = dolar(by.P5_POC_25.zadani).split("="), f = vyhodnot(l), g = vyhodnot(r), s = []; for (let q = 0; q <= 999; q++) if (f(q) === g(q)) s.push(q); ok("25", s.length === 1 && String(s[0]) === A("P5_POC_25"), s); }
{ const s = []; for (let a = 1; a < 361; a++) if (360 % a === 0 && a === 24) s.push(a + 360 / a); ok("26", s.length === 1 && String(s[0]) === A("P5_POC_26"), s); }
{ const e = by.P5_POC_27, sh = e.moznosti.map((m, i) => (Math.floor(Number(m) / 7) === 12 && Number(m) % 7 === 5 ? i : -1)).filter((i) => i >= 0); ok("27", sh.length === 1 && sh[0] === e.spravna, sh); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
    ok(e.id + " odpověď v postupu", e.reseni_kroky.join(" ").includes(e.odpoved), e.odpoved);
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
const nazev = others.length ? `${prev.nazev} + 5. třída: Počítání s čísly, druhá dávka (15 úloh)` : "5. třída — Počítání s čísly, druhá dávka: větší čísla, zbytek, zaokrouhlování, násobky a dělitelé, doplň číslo (15 úloh: L1 ×5, L2 ×6, L3 ×4)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
