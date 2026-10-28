// 5. třída, okruh „Počítání s čísly", druhá dávka (P5_POC_13–27): větší čísla, zaokrouhlování, výběr výrazu, doplňování čísla, úvaha s čísly.
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
  mk("P5_POC_16", "p5_velka_cisla", 1, "Vypočítej: $432 : 6$", "72", [
    "Číslo 432 rozložíme na 420 a 12: $420 : 6 = 70$ a $12 : 6 = 2$.",
    "Dohromady $70 + 2 = 72$. Zkouška: $72 \\cdot 6 = 432$.",
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
  mk("P5_POC_19", "p5_velka_cisla", 2, "Vypočítej: $5600 : 7$", "800", [
    "Číslo 5600 je 56 set a $56 : 7 = 8$, takže 56 set děleno sedmi je 8 set.",
    "$5600 : 7 = 800$. Zkouška: $800 \\cdot 7 = 5600$.",
  ], 90),
  mk("P5_POC_20", "p5_zaokrouhlovani", 2, "Zaokrouhli čísla 4560 a 2480 na tisíce a vypočítej jejich součet.", "7000", [
    "Číslo 4560 má na místě tisíců 4 a další číslice je 5, takže zaokrouhlíme nahoru na 5000.",
    "Číslo 2480 má na místě tisíců 2 a další číslice je 4, takže zaokrouhlíme dolů na 2000.",
    "Součet zaokrouhlených čísel: $5000 + 2000 = 7000$.",
  ], 120),
  mk("P5_POC_21", "p5_velka_cisla", 2, "Vypočítej: $306 \\cdot 5$", "1530", [
    "Rozložíme: $306 \\cdot 5 = 300 \\cdot 5 + 6 \\cdot 5$.",
    "$300 \\cdot 5 = 1500$ a $6 \\cdot 5 = 30$, dohromady $1500 + 30 = 1530$.",
  ], 90),
  mk("P5_POC_22", "vyber_vyrazu", 2, "Který z výrazů má největší hodnotu?", null, [
    "Každý výraz spočítáme podle pořadí operací: A) $8 \\cdot 7 - 5 = 51$, B) $8 + 7 \\cdot 5 = 43$, C) $(8 + 7) \\cdot 5 = 75$, D) $8 \\cdot (7 - 5) = 16$, E) $8 \\cdot 7 + 5 = 61$.",
    "Největší hodnotu má výraz C) s hodnotou 75.",
  ], 150, { moznosti: ["$8 \\cdot 7 - 5$", "$8 + 7 \\cdot 5$", "$(8 + 7) \\cdot 5$", "$8 \\cdot (7 - 5)$", "$8 \\cdot 7 + 5$"], spravna: 2 }),
  mk("P5_POC_23", "doplnit_cislo", 2, "Doplň do čtverečku takové číslo, aby platila rovnost: $\\square \\cdot 8 = 480 : 2$", "30", [
    "Pravou stranu spočítáme: $480 : 2 = 240$.",
    "Rovnost má tvar $\\square \\cdot 8 = 240$, takže $\\square = 240 : 8 = 30$.",
    "Zkouška: $30 \\cdot 8 = 240$.",
  ], 120),
  // ───────── L3 ─────────
  mk("P5_POC_24", "p5_logika", 3, "Součet tří po sobě jdoucích čísel je 87. Které z nich je prostřední?", "29", [
    "U tří po sobě jdoucích čísel je prostřední číslo „uprostřed“: o jedna menší a o jedna větší číslo se při sčítání navzájem vyruší.",
    "Součet je tedy třikrát prostřední číslo: $87 : 3 = 29$.",
    "Zkouška: $28 + 29 + 30 = 87$. Prostřední číslo je 29.",
  ], 150),
  mk("P5_POC_25", "doplnit_cislo", 3, "Doplň do čtverečku takové číslo, aby platila rovnost: $(\\square + 15) : 4 = 3 \\cdot 5 - 7$", "17", [
    "Pravou stranu spočítáme: $3 \\cdot 5 = 15$ a $15 - 7 = 8$.",
    "Rovnost má tvar $(\\square + 15) : 4 = 8$. Něco děleno čtyřmi dá 8, takže závorka je $8 \\cdot 4 = 32$.",
    "Z $\\square + 15 = 32$ vyjde $\\square = 17$. Zkouška: $(17 + 15) : 4 = 32 : 4 = 8$.",
  ], 180),
  mk("P5_POC_26", "doplnit_cislo", 3, "Doplň do čtverečku takové číslo, aby platila rovnost: $(\\square - 14) \\cdot 6 = 108$", "32", [
    "Něco krát šest je 108, takže závorka je $108 : 6 = 18$.",
    "Z $\\square - 14 = 18$ vyjde $\\square = 18 + 14 = 32$.",
    "Zkouška: $(32 - 14) \\cdot 6 = 18 \\cdot 6 = 108$.",
  ], 150),
  mk("P5_POC_27", "vyber_vyrazu", 3, "Který z výrazů má hodnotu 36?", null, [
    "Každý výraz spočítáme podle pořadí operací: A) $4 + 6 \\cdot 12 = 76$, B) $4 \\cdot (6 + 12) = 72$, C) $(4 + 6) \\cdot 12 = 120$, D) $4 \\cdot 6 + 12 = 36$, E) $4 \\cdot 6 \\cdot 12 = 288$.",
    "Hodnotu 36 má jen výraz D).",
  ], 180, { moznosti: ["$4 + 6 \\cdot 12$", "$4 \\cdot (6 + 12)$", "$(4 + 6) \\cdot 12$", "$4 \\cdot 6 + 12$", "$4 \\cdot 6 \\cdot 12$"], spravna: 3 }),
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
ok("16", Math.floor(432 / 6) === 72 && 432 % 6 === 0 && A("P5_POC_16") === "72");
ok("17 zaokrouhlení", Math.round(4678 / 100) * 100 === 4700 && A("P5_POC_17") === "4700");
ok("20 zaokrouhlení součtu", Math.round(4560 / 1000) * 1000 + Math.round(2480 / 1000) * 1000 === 7000 && A("P5_POC_20") === "7000");
ok("21", 306 * 5 === 1530 && A("P5_POC_21") === "1530");
{ const e = by.P5_POC_22, h = e.moznosti.map((m) => vyhodnot(dolar(m))()), mx = Math.max(...h); ok("22", h.filter((x) => x === mx).length === 1 && h.indexOf(mx) === e.spravna && mx === 75, h.join()); }
{ const [l, r] = dolar(by.P5_POC_23.zadani).split("="), f = vyhodnot(l), g = vyhodnot(r), s = []; for (let q = 0; q <= 999; q++) if (f(q) === g(q)) s.push(q); ok("23", s.length === 1 && String(s[0]) === A("P5_POC_23"), s); }
{ const s3 = []; for (let a = 1; a < 100; a++) if (a - 1 + a + (a + 1) === 87) s3.push(a); ok("24", s3.length === 1 && String(s3[0]) === A("P5_POC_24"), s3); }
{ const [l, r] = dolar(by.P5_POC_25.zadani).split("="), f = vyhodnot(l), g = vyhodnot(r), s = []; for (let q = 0; q <= 999; q++) if (f(q) === g(q)) s.push(q); ok("25", s.length === 1 && String(s[0]) === A("P5_POC_25"), s); }
{ const [l, r] = dolar(by.P5_POC_26.zadani).split("="), f = vyhodnot(l), g = vyhodnot(r), q3 = []; for (let q = 0; q <= 999; q++) if (f(q) === g(q)) q3.push(q); ok("26", q3.length === 1 && String(q3[0]) === A("P5_POC_26"), q3); }
{ const e = by.P5_POC_27, h = e.moznosti.map((m) => vyhodnot(dolar(m))()), sh = h.map((x, i) => (x === 36 ? i : -1)).filter((i) => i >= 0); ok("27", sh.length === 1 && sh[0] === e.spravna, h.join()); }

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
const nazev = others.length ? `${prev.nazev} + 5. třída: Počítání s čísly, druhá dávka (15 úloh)` : "5. třída — Počítání s čísly, druhá dávka: větší čísla, zaokrouhlování, výběr výrazu, doplň číslo (15 úloh: L1 ×5, L2 ×6, L3 ×4)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
