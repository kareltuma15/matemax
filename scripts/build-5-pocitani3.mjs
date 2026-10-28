// 5. třída, okruh „Počítání s čísly", třetí dávka (P5_POC_28–42): pořadí operací s „hezkým" dělením dvojciferným číslem, doplňování čísla, úvaha s čísly (palindromy, zpětný výpočet).
// Styl podle úlohy 1 (výpočet, doplnění do rámečku) a úlohy 3 oficiálních testů CERMAT pro 5. třídu 2022–2026 (vlastní čísla a zadání, nic se nekopíruje).
// Pravidla (Karel 29. 10.): v L1 žádné dělení dvojciferným číslem, v L2/L3 jen „hezká" čísla (:12, :15, :25); bez zbytku po dělení a bez dělitelnosti.
// Spuštění: node scripts/build-5-pocitani3.mjs → doplní/přepíše P5_POC_28–42 v src/data/nahled-batch.json (jiné dávky nechá).
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
  // ───────── L1 (úvod) ─────────
  mk("P5_POC_28", "poradi_operaci", 1, "Vypočítej: $(14 + 6) \\cdot 5 - 30$", "70", [
    "Nejdřív spočítáme závorku: $14 + 6 = 20$.",
    "Pak násobíme: $20 \\cdot 5 = 100$ a nakonec odečítáme: $100 - 30 = 70$.",
  ], 75),
  mk("P5_POC_29", "poradi_operaci", 1, "Vypočítej: $45 : 9 + 8 \\cdot 7$", "61", [
    "Násobení a dělení se počítají před sčítáním: $45 : 9 = 5$ a $8 \\cdot 7 = 56$.",
    "Součet je $5 + 56 = 61$.",
  ], 75),
  mk("P5_POC_30", "p5_zaokrouhlovani", 1, "Zaokrouhli číslo 5892 na tisíce.", "6000", [
    "Na místě tisíců je v čísle 5892 pětka. Podíváme se na další číslici, stovky: je to 8.",
    "Osmička je 5 nebo víc, takže zaokrouhlujeme nahoru: z 5000 se stane 6000.",
  ], 60),
  mk("P5_POC_31", "poradi_operaci", 1, "Vypočítej: $6 \\cdot 500 - 450$", "2550", [
    "Nejdřív násobíme: $6 \\cdot 500 = 3000$.",
    "Pak odečítáme: $3000 - 450 = 2550$.",
  ], 75),
  // ───────── L2 (přiblížení testu) ─────────
  mk("P5_POC_32", "poradi_operaci", 2, "Vypočítej: $(2 \\cdot 150 + 60) : 12$", "30", [
    "Nejdřív spočítáme v závorce: $2 \\cdot 150 = 300$ a $300 + 60 = 360$.",
    "Pak dělíme: $360 : 12 = 30$. Zkouška: $30 \\cdot 12 = 360$.",
  ], 120),
  mk("P5_POC_33", "poradi_operaci", 2, "Vypočítej: $5 \\cdot (480 - 300) - 6 \\cdot 120$", "180", [
    "Závorka: $480 - 300 = 180$, takže $5 \\cdot 180 = 900$.",
    "Druhý součin: $6 \\cdot 120 = 720$. Rozdíl je $900 - 720 = 180$.",
  ], 135),
  mk("P5_POC_34", "doplnit_cislo", 2, "Doplň do čtverečku takové číslo, aby platila rovnost: $\\square : 15 + 6 = 14$", "120", [
    "Nejdřív zjistíme, kolik je $\\square : 15$: po přičtení šestky vyjde 14, takže $\\square : 15 = 14 - 6 = 8$.",
    "Číslo, které po dělení patnácti dá 8, je $8 \\cdot 15 = 120$. Zkouška: $120 : 15 + 6 = 8 + 6 = 14$.",
  ], 150),
  mk("P5_POC_35", "poradi_operaci", 2, "Vypočítej: $2000 : 25 - (6 + 3 \\cdot 4)$", "62", [
    "Závorka: nejdřív násobíme $3 \\cdot 4 = 12$, pak $6 + 12 = 18$.",
    "Dělení: $2000 : 25 = 80$ (do sta se pětadvacítka vejde čtyřikrát, ve 2000 je dvacet set, tedy $20 \\cdot 4 = 80$).",
    "Výsledek je $80 - 18 = 62$.",
  ], 150),
  mk("P5_POC_36", "doplnit_cislo", 2, "Které číslo patří do čtverečku, aby platila rovnost? $\\square \\cdot 25 = 3000 : 4$", null, [
    "Pravou stranu spočítáme: $3000 : 4 = 750$.",
    "Rovnost má tvar $\\square \\cdot 25 = 750$, takže $\\square = 750 : 25 = 30$ (do sta se pětadvacítka vejde čtyřikrát, v 750 je sedm set a padesát, tedy $7 \\cdot 4 + 2 = 30$).",
    "Zkouška: $30 \\cdot 25 = 750$. Správně je C).",
  ], 180, { moznosti: ["25", "28", "30", "32", "35"], spravna: 2 }),
  mk("P5_POC_37", "doplnit_cislo", 2, "Které číslo patří do čtverečku, aby platila rovnost? $60 - 4 \\cdot (\\square + 3) = 28$", null, [
    "Od 60 odečítáme nějaký součin a vyjde 28, takže součin je $60 - 28 = 32$.",
    "Platí $4 \\cdot (\\square + 3) = 32$, tedy $\\square + 3 = 32 : 4 = 8$ a $\\square = 5$.",
    "Zkouška: $60 - 4 \\cdot (5 + 3) = 60 - 32 = 28$. Správně je B).",
  ], 180, { moznosti: ["4", "5", "6", "7", "8"], spravna: 1 }),
  // ───────── L3 (úroveň testu) ─────────
  mk("P5_POC_38", "p5_logika", 3, "Neznámé kladné číslo vynásobíme samo sebou a k výsledku přičteme 4. Dostaneme číslo 40. Které je neznámé číslo?", "6", [
    "Po přičtení čtyřky vyšlo 40, takže součin čísla se sebou samým je $40 - 4 = 36$.",
    "Hledáme číslo, které po vynásobení samo sebou dá 36: je to 6, protože $6 \\cdot 6 = 36$.",
    "Zkouška: $6 \\cdot 6 + 4 = 40$.",
  ], 150),
  mk("P5_POC_39", "p5_logika", 3, "Na výletě bylo třikrát více dětí než dospělých. Dospělých bylo o 40 méně než dětí. Kolik dětí bylo na výletě?", "60", [
    "Počet dospělých bereme jako jeden díl, dětí je třikrát tolik, tedy tři díly.",
    "Rozdíl dětí a dospělých jsou 2 díly a to je 40, takže jeden díl (dospělí) je 20.",
    "Dětí bylo $3 \\cdot 20 = 60$. Zkouška: $60 - 20 = 40$.",
  ], 180),
  mk("P5_POC_40", "p5_logika", 3, "Palindromické číslo se čte zleva i zprava stejně, například 73937. Kolik pěticiferných palindromických čísel je větší než 30000 a zároveň menší než 40000?", "100", [
    "Taková čísla začínají trojkou, a tak musí trojkou i končit. Tvar je 3 a b a 3.",
    "Druhou číslici a můžeme zvolit 10 způsoby (0 až 9) a prostřední číslici b také 10 způsoby. Čtvrtá číslice je pak daná.",
    "Palindromických čísel je $10 \\cdot 10 = 100$.",
  ], 240),
  mk("P5_POC_41", "p5_logika", 3, "Vynásobením dvou kladných celých čísel jsme získali součin 240. Jedno z čísel zvětšíme třikrát a druhé zmenšíme šestkrát. Jaký součin získáme vynásobením obou změněných čísel?", "120", [
    "Zvětšení jednoho čísla třikrát znamená násobení třemi a zmenšení druhého šestkrát znamená dělení šesti, takže součin se vynásobí třemi a vydělí šesti.",
    "Vynásobit třemi a vydělit šesti je totéž jako vydělit dvěma. Nový součin je poloviční: $240 : 2 = 120$.",
    "Zkouška: čísla 20 a 12 mají součin 240; po změně jsou 60 a 2 a $60 \\cdot 2 = 120$.",
  ], 210),
  mk("P5_POC_42", "p5_logika", 3, "Myslím si číslo. Vynásobím ho čtyřmi, odečtu 12, výsledek vydělím šesti a dostanu 8. Jaké číslo si myslím?", "15", [
    "Postupujeme pozpátku a každou operaci obrátíme. Poslední bylo dělení šesti s výsledkem 8, takže před ním bylo $8 \\cdot 6 = 48$.",
    "Před tím jsme odečítali 12, takže předtím bylo $48 + 12 = 60$. Před tím jsme násobili čtyřmi, takže myšlené číslo je $60 : 4 = 15$.",
    "Zkouška: $15 \\cdot 4 = 60$, $60 - 12 = 48$, $48 : 6 = 8$.",
  ], 210),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const dolar = (z) => z.match(/\$([^$]+)\$/)[1];
const A = (id) => by[id].odpoved;
const reseni = (tex) => { const [l, r] = tex.split("="), f = vyhodnot(l), g = vyhodnot(r), s = []; for (let q = 0; q <= 9999; q++) if (f(q) === g(q)) s.push(q); return s; };

// úlohy „Vypočítej: $…$": výraz ze zadání se vyhodnotí a porovná s odpovědí
for (const e of ex.filter((x) => /^Vypočítej: /.test(x.zadani))) {
  const v = vyhodnot(dolar(e.zadani))();
  ok(e.id + " hodnota výrazu", Number.isInteger(v) && String(v) === e.odpoved, `${v} ≠ ${e.odpoved}`);
}
ok("30 zaokrouhlení", Math.round(5892 / 1000) * 1000 === 6000 && A("P5_POC_30") === "6000");
{ const s = reseni(dolar(by.P5_POC_34.zadani)); ok("34", s.length === 1 && String(s[0]) === A("P5_POC_34"), s); }
{ const e = by.P5_POC_36, s = reseni(dolar(e.zadani)); ok("36", s.length === 1 && e.moznosti[e.spravna] === String(s[0]) && e.moznosti.filter((m) => Number(m) === s[0]).length === 1, s); }
{ const e = by.P5_POC_37, s = reseni(dolar(e.zadani)); ok("37", s.length === 1 && e.moznosti[e.spravna] === String(s[0]) && e.moznosti.filter((m) => Number(m) === s[0]).length === 1, s); }
{ const s = []; for (let n = 1; n < 1000; n++) if (n * n + 4 === 40) s.push(n); ok("38", s.length === 1 && String(s[0]) === A("P5_POC_38"), s); }
{ const s = []; for (let d = 1; d < 500; d++) if (3 * d - d === 40) s.push(3 * d); ok("39", s.length === 1 && String(s[0]) === A("P5_POC_39"), s); }
{ let c = 0; for (let n = 30001; n < 40000; n++) { const t = String(n); if (t === [...t].reverse().join("")) c++; } ok("40", c === 100 && String(c) === A("P5_POC_40"), c); }
{ const v = new Set(); for (let a = 1; a <= 240; a++) if (240 % a === 0) { const b = 240 / a; if ((b % 6 === 0)) v.add(a * 3 * (b / 6)); } ok("41", v.size === 1 && [...v][0] === 120 && String([...v][0]) === A("P5_POC_41"), [...v]); }
{ const s = []; for (let x = 1; x < 1000; x++) { const y = (x * 4 - 12) / 6; if (y === 8) s.push(x); } ok("42", s.length === 1 && String(s[0]) === A("P5_POC_42"), s); }
// pravidla rozsahu: v L1 žádné dělení dvojciferným číslem
for (const e of ex.filter((x) => x.obtiznost === 1)) ok(e.id + " L1 bez dělení dvojciferným", !/:\s*\(?\d{2,}/.test(e.zadani.replace(/^Vypočítej: /, "").replace(/\$/g, "")), e.zadani);

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
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((fn) => JSON.parse(fs.readFileSync(`src/data/${fn}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; A–E ${ex.filter((e) => e.moznosti).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Počítání s čísly, třetí dávka (15 úloh)` : "5. třída — Počítání s čísly, třetí dávka: pořadí operací, doplňování čísla, úvaha s čísly (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
