// 5. třída, okruh „Počítání s čísly" (P5_POC_01–12): pořadí operací, doplňování čísla do rovnosti, výběr výrazu.
// Styl podle úlohy 1 oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Spuštění: node scripts/build-5-pocitani.mjs → doplní/přepíše P5_POC_* v src/data/nahled-batch.json (jiné dávky nechá).
// Každá odpověď se nezávisle přepočítá z textu zadání (vyhodnocení výrazu, u „doplň číslo" hrubá síla); A–E má právě jednu správnou možnost.
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

/** Vyhodnotí výraz zapsaný v LaTeXu pro 5. třídu (čísla, + - \cdot :, závorky) — bez eval cizího kódu. */
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
  mk("P5_POC_01", "poradi_operaci", 1, "Vypočítej: $18 + 6 \\cdot 4$", "42", [
    "Nejdřív se počítá násobení: $6 \\cdot 4 = 24$.",
    "Pak sčítání: $18 + 24 = 42$.",
  ], 60),
  mk("P5_POC_02", "poradi_operaci", 1, "Vypočítej: $56 : 7 + 3 \\cdot 5$", "23", [
    "Dělení a násobení se počítají před sčítáním: $56 : 7 = 8$ a $3 \\cdot 5 = 15$.",
    "Teď sečteme: $8 + 15 = 23$.",
  ], 75),
  mk("P5_POC_03", "poradi_operaci", 1, "Vypočítej: $(30 - 12) : 6 + 9$", "12", [
    "Nejdřív závorka: $30 - 12 = 18$.",
    "Pak dělení: $18 : 6 = 3$.",
    "Nakonec sčítání: $3 + 9 = 12$.",
  ], 75),
  mk("P5_POC_04", "poradi_operaci", 1, "Vypočítej: $100 - 4 \\cdot (8 + 7)$", "40", [
    "Nejdřív závorka: $8 + 7 = 15$.",
    "Pak násobení: $4 \\cdot 15 = 60$.",
    "Nakonec odčítání: $100 - 60 = 40$.",
  ], 75),
  // ───────── L2 ─────────
  mk("P5_POC_05", "poradi_operaci", 2, "Vypočítej: $72 : (2 \\cdot 4) + 15 \\cdot 3 - 20$", "34", [
    "Závorka: $2 \\cdot 4 = 8$.",
    "Dělení a násobení: $72 : 8 = 9$ a $15 \\cdot 3 = 45$.",
    "Zbývá zleva doprava sčítání a odčítání: $9 + 45 - 20 = 34$.",
  ], 100),
  mk("P5_POC_06", "poradi_operaci", 2, "Vypočítej: $1200 : 40 + 25 \\cdot 12$", "330", [
    "Dělení: $1200 : 40 = 30$ (12 set děleno 4 desítkami je 30).",
    "Násobení: $25 \\cdot 12 = 300$.",
    "Součet: $30 + 300 = 330$.",
  ], 100),
  mk("P5_POC_07", "poradi_operaci", 2, "Vypočítej: $450 : 9 - (6 + 2 \\cdot 7)$", "30", [
    "V závorce se nejdřív násobí: $2 \\cdot 7 = 14$, pak $6 + 14 = 20$.",
    "Dělení: $450 : 9 = 50$.",
    "Rozdíl: $50 - 20 = 30$.",
  ], 100),
  mk("P5_POC_08", "poradi_operaci", 2, "Vypočítej: $300 - 24 \\cdot 5 + 36 : 4$", "189", [
    "Násobení a dělení před odčítáním a sčítáním: $24 \\cdot 5 = 120$ a $36 : 4 = 9$.",
    "Zleva doprava: $300 - 120 = 180$ a $180 + 9 = 189$.",
  ], 100),
  // ───────── L3 ─────────
  mk("P5_POC_09", "doplnit_cislo", 3, "Doplň do čtverečku takové číslo, aby platila rovnost: $\\square : 6 = (12 + 3 \\cdot 4) - 18$", "36", [
    "Pravou stranu spočítáme: $3 \\cdot 4 = 12$, pak $12 + 12 = 24$ a $24 - 18 = 6$.",
    "Rovnost má tvar $\\square : 6 = 6$. Hledané číslo děleno šesti dá šest.",
    "Proto $\\square = 6 \\cdot 6 = 36$. Zkouška: $36 : 6 = 6$.",
  ], 150),
  mk("P5_POC_10", "doplnit_cislo", 3, "Doplň do čtverečku takové číslo, aby platila rovnost: $100 - 54 : (2 + \\square) = 91$", "4", [
    "Od 100 se odečítá nějaké číslo a vyjde 91. Odčítá se tedy $100 - 91 = 9$, takže $54 : (2 + \\square) = 9$.",
    "Číslo 54 děleno čímsi dá 9, to „cosi“ je $54 : 9 = 6$. Tedy $2 + \\square = 6$.",
    "Proto $\\square = 4$. Zkouška: $54 : 6 = 9$ a $100 - 9 = 91$.",
  ], 180),
  mk("P5_POC_11", "vyber_vyrazu", 2, "Který z výrazů má hodnotu 20?", null, [
    "Každý výraz spočítáme podle pořadí operací.",
    "A) $4 + 4 \\cdot 4 = 4 + 16 = 20$. To vyhovuje.",
    "Ostatní: B) $(4 + 4) \\cdot 4 = 32$, C) $4 \\cdot 4 - 4 = 12$, D) $4 + 4 : 4 = 5$, E) $4 \\cdot (4 + 4) - 4 = 28$. Správně je A).",
  ], 120, { moznosti: ["$4 + 4 \\cdot 4$", "$(4 + 4) \\cdot 4$", "$4 \\cdot 4 - 4$", "$4 + 4 : 4$", "$4 \\cdot (4 + 4) - 4$"], spravna: 0 }),
  mk("P5_POC_12", "poradi_operaci", 3, "O kolik se liší hodnota výrazu $(6 + 4 \\cdot 5) : 2$ od hodnoty výrazu $6 + 4 \\cdot 5 : 2$?", "3", [
    "První výraz: $4 \\cdot 5 = 20$, v závorce $6 + 20 = 26$ a $26 : 2 = 13$.",
    "Druhý výraz bez závorek: nejdřív $4 \\cdot 5 = 20$, pak $20 : 2 = 10$ a nakonec $6 + 10 = 16$.",
    "Rozdíl hodnot: $16 - 13 = 3$.",
  ], 180),
];
// A–E: odpověď = text správné možnosti (jako u ostatních A–E úloh)
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const dolar = (z) => z.match(/\$([^$]+)\$/)[1];

// úlohy „Vypočítej: $…$": výraz ze zadání se vyhodnotí a porovná s odpovědí
for (const e of ex.filter((x) => /^Vypočítej: /.test(x.zadani))) {
  const v = vyhodnot(dolar(e.zadani))();
  ok(e.id + " hodnota výrazu", Number.isInteger(v) && String(v) === e.odpoved, `${v} ≠ ${e.odpoved}`);
}
// „doplň do čtverečku": jediné celé číslo 0–999, které rovnost splní (rovnost A = B se řeší jako A − B = 0)
for (const id of ["P5_POC_09", "P5_POC_10"]) {
  const [l, r] = dolar(by[id].zadani).split("=");
  const f = vyhodnot(l), g = vyhodnot(r);
  const reseni = [];
  for (let q = 0; q <= 999; q++) { const a = f(q), b = g(q); if (Number.isFinite(a) && Math.abs(a - b) < 1e-9) reseni.push(q); }
  ok(id, reseni.length === 1 && String(reseni[0]) === by[id].odpoved, reseni.join());
}
// výběr výrazu s hodnotou 20: právě jedna možnost
{
  const e = by.P5_POC_11;
  const hodnoty = e.moznosti.map((m) => vyhodnot(dolar(m))());
  const shody = hodnoty.map((h, i) => (h === 20 ? i : -1)).filter((i) => i >= 0);
  ok("P5_POC_11", shody.length === 1 && shody[0] === e.spravna, hodnoty.join());
}
// rozdíl výrazů
{
  const e = by.P5_POC_12;
  const [a, b] = [...e.zadani.matchAll(/\$([^$]+)\$/g)].map((m) => vyhodnot(m[1])());
  ok("P5_POC_12", Math.abs(a - b) === 3 && e.odpoved === "3", `${a} vs ${b}`);
}

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
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 12, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; A–E ${ex.filter((e) => e.moznosti).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^P5_POC_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Počítání s čísly (12 úloh)` : "5. třída — Počítání s čísly: pořadí operací, doplňování čísla, výběr výrazu (12 úloh: L1 ×4, L2 ×5, L3 ×3)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
