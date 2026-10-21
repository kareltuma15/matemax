// Rovnice L1 (12 úloh ROV1_01–ROV1_12): jednoduché lineární rovnice, slovní úlohy a soustava „z hlavy“, ověření řešení, Ano/Ne.
// Spuštění: node scripts/build-rovnice-l1.mjs → doplní/přepíše ROV1_01–12 v src/data/nahled-batch.json (jiné dávky nechá).
// Každá odpověď se nezávisle ověří dosazením a hrubou silou přes zlomky (bez postupu z řešení);
// A–E musí mít právě jednu správnou možnost; psané odpovědi musí jít vyhodnotit (toValue).
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const gcd = (a, b) => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const F = (n, d = 1n) => { n = BigInt(n); d = BigInt(d); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => F(a.n * b.n, a.d * b.d);
const div = (a, b) => F(a.n * b.d, a.d * b.n);
const eq = (a, b) => a.n === b.n && a.d === b.d;
const grid = [];
for (let d = 1; d <= 4; d++) for (let n = -60 * d; n <= 60 * d; n++) { const f = F(n, d); if (!grid.some((g) => eq(g, f))) grid.push(f); }
const solutions = (pred) => grid.filter((x) => { try { return pred(x); } catch { return false; } });
const show = (f) => (f.d === 1n ? `${f.n}` : `${f.n}/${f.d}`);
const f2 = (n) => F(n);

const mk = (id, podtema, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "rovnice", podtema, obtiznost: 1, latex: true, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const choice = (id, podtema, zadani, moznosti, spravna, kroky, cas) =>
  mk(id, podtema, zadani, moznosti[spravna], kroky, cas, { moznosti, spravna });

const ex = [
  mk("ROV1_01", "linearni", "Řešte rovnici: $3x - 5 = 16$", "7", [
    "Přičteme 5 k oběma stranám: $3x = 21$.",
    "Vydělíme třemi: $x = 7$.",
    "Zkouška: $3 \\cdot 7 - 5 = 16$.",
  ], 90),
  mk("ROV1_02", "linearni_se_zavorkou", "Řešte rovnici: $2(x + 4) = 18$", "5", [
    "Vydělíme obě strany dvěma: $x + 4 = 9$.",
    "Odečteme 4: $x = 5$.",
    "Zkouška: $2 \\cdot (5 + 4) = 18$.",
  ], 90),
  mk("ROV1_03", "linearni_se_zlomky", "Řešte rovnici: $\\dfrac{x}{4} + 3 = 8$", "20", [
    "Odečteme 3: $\\dfrac{x}{4} = 5$.",
    "Vynásobíme čtyřmi: $x = 20$.",
    "Zkouška: $20 : 4 + 3 = 8$.",
  ], 90),
  mk("ROV1_04", "linearni", "Řešte rovnici: $5x + 2 = 3x + 12$", "5", [
    "Odečteme $3x$ od obou stran: $2x + 2 = 12$.",
    "Odečteme 2: $2x = 10$, tedy $x = 5$.",
    "Zkouška: vlevo $5 \\cdot 5 + 2 = 27$, vpravo $3 \\cdot 5 + 12 = 27$.",
  ], 120),
  choice("ROV1_05", "linearni", "Které z čísel $1$, $2$, $3$, $4$, $5$ je řešením rovnice $4x - 3 = 2x + 5$?",
    ["$1$", "$2$", "$3$", "$4$", "$5$"], 3, [
      "Do rovnice postupně dosazujeme. Pro $x = 4$ je vlevo $4 \\cdot 4 - 3 = 13$ a vpravo $2 \\cdot 4 + 5 = 13$.",
      "Rovnost platí, proto je řešením číslo 4. Správně je D).",
      "Rychleji: $4x - 3 = 2x + 5$ vede na $2x = 8$, tedy $x = 4$.",
    ], 120),
  mk("ROV1_06", "slovni", "Součet čísla a jeho trojnásobku je 36. Které je to číslo?", "9", [
    "Číslo označíme $x$. Jeho trojnásobek je $3x$.",
    "Rovnice: $x + 3x = 36$, tedy $4x = 36$.",
    "Vydělíme čtyřmi: $x = 9$. Zkouška: $9 + 27 = 36$.",
  ], 90),
  mk("ROV1_07", "linearni", "Najděte číslo $x$ tak, aby platilo: $x : 6 = 10 : 4$", "15", [
    "Poměry se rovnají, proto platí $\\dfrac{x}{6} = \\dfrac{10}{4}$.",
    "Vynásobíme šesti: $x = \\dfrac{10 \\cdot 6}{4} = \\dfrac{60}{4}$.",
    "Zkrátíme: $x = 15$. Zkouška: $15 : 6 = 2{,}5$ a $10 : 4 = 2{,}5$.",
  ], 120),
  mk("ROV1_08", "soustava", "Součet dvou čísel je 14 a jejich rozdíl je 4. Které z nich je větší?", "9", [
    "Větší číslo označíme $a$, menší $b$: $a + b = 14$ a $a - b = 4$.",
    "Rovnice sečteme, $b$ se vyruší: $2a = 18$, tedy $a = 9$.",
    "Menší číslo je $14 - 9 = 5$. Zkouška: $9 - 5 = 4$. Větší číslo je 9.",
  ], 120),
  mk("ROV1_09", "linearni", "Rozhodněte, zda je tvrzení pravdivé: Číslo 3 je řešením rovnice $2x + 1 = 7$.", "Ano", [
    "Do rovnice dosadíme $x = 3$: vlevo $2 \\cdot 3 + 1 = 7$.",
    "Vpravo je 7, obě strany se rovnají. Tvrzení je pravdivé.",
  ], 90, { moznosti: ["Ano", "Ne"], spravna: 0 }),
  mk("ROV1_10", "linearni_se_zavorkou", "Řešte rovnici: $4(x - 2) = 2x + 6$", "7", [
    "Roznásobíme závorku: $4x - 8 = 2x + 6$.",
    "Odečteme $2x$ a přičteme 8: $2x = 14$.",
    "Vydělíme dvěma: $x = 7$. Zkouška: vlevo $4 \\cdot 5 = 20$, vpravo $2 \\cdot 7 + 6 = 20$.",
  ], 120),
  mk("ROV1_11", "slovni", "Pavel je o 5 let starší než Eva. Dohromady jim je 31 let. Kolik let je Evě?", "13 let", [
    "Evě je $x$ let, Pavlovi $x + 5$ let.",
    "Rovnice: $x + (x + 5) = 31$, tedy $2x + 5 = 31$.",
    "Odečteme 5: $2x = 26$, tedy $x = 13$. Pavlovi je 18 let, dohromady 31.",
  ], 120),
  mk("ROV1_12", "linearni_se_zlomky", "Řešte rovnici: $\\dfrac{x + 2}{3} = 4$", "10", [
    "Obě strany vynásobíme třemi: $x + 2 = 12$.",
    "Odečteme 2: $x = 10$.",
    "Zkouška: $\\dfrac{10 + 2}{3} = 4$.",
  ], 90),
];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const A = (id) => by[id].odpoved;
const one = (id, pred, label) => { const s = solutions(pred); ok(id, s.length === 1 && show(s[0]) === label, s.map(show)); };

one("ROV1_01", (x) => eq(sub(mul(f2(3), x), f2(5)), f2(16)), A("ROV1_01"));
one("ROV1_02", (x) => eq(mul(f2(2), add(x, f2(4))), f2(18)), A("ROV1_02"));
one("ROV1_03", (x) => eq(add(div(x, f2(4)), f2(3)), f2(8)), A("ROV1_03"));
one("ROV1_04", (x) => eq(add(mul(f2(5), x), f2(2)), add(mul(f2(3), x), f2(12))), A("ROV1_04"));
{ const cand = [1, 2, 3, 4, 5].filter((x) => 4 * x - 3 === 2 * x + 5); ok("ROV1_05", cand.length === 1 && cand[0] === 4 && by.ROV1_05.spravna === 3 && by.ROV1_05.moznosti[3] === "$4$", cand); }
one("ROV1_06", (x) => eq(add(x, mul(f2(3), x)), f2(36)), A("ROV1_06"));
one("ROV1_07", (x) => eq(div(x, f2(6)), div(f2(10), f2(4))), A("ROV1_07"));
{ const sol = []; for (let a = 0; a <= 14; a++) for (let b = 0; b <= 14; b++) if (a + b === 14 && a - b === 4) sol.push([a, b]); ok("ROV1_08", sol.length === 1 && sol[0][0] === 9 && A("ROV1_08") === "9", sol); }
ok("ROV1_09", 2 * 3 + 1 === 7 && A("ROV1_09") === "Ano");
one("ROV1_10", (x) => eq(mul(f2(4), sub(x, f2(2))), add(mul(f2(2), x), f2(6))), A("ROV1_10"));
{ const s = solutions((e) => eq(add(e, add(e, f2(5))), f2(31))); ok("ROV1_11", s.length === 1 && show(s[0]) === "13" && A("ROV1_11") === "13 let", s.map(show)); }
one("ROV1_12", (x) => eq(div(add(x, f2(2)), f2(3)), f2(4)), A("ROV1_12"));

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length >= 2 && new Set(e.moznosti).size === e.moznosti.length && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
}
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 12, ex.length);
const all = ["databaze", "cermat-200", "doplnky-uhly-souhrnne", "konstrukce-interaktivni"].flatMap((f) => { try { return JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples; } catch { return []; } });
ok("id bez kolize s databází", ids.every((id) => !all.some((e) => e.id === id)));
console.log(`úloh: ${ex.length} (A–E ${ex.filter((e) => e.moznosti?.length === 5).length}, Ano/Ne ${ex.filter((e) => e.moznosti?.length === 2).length}, psané ${ex.filter((e) => !e.moznosti).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^ROV1_(0[1-9]|1[0-2])$/.test(e.id));
const nazev = others.length ? `${prev.nazev} + Rovnice L1 (12 úloh)` : "Rovnice L1 — jednoduché lineární rovnice, slovní úlohy a soustava (12 úloh)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} rovnic)`);
