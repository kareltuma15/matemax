// Rovnice L3 v CERMAT stylu (11 úloh ROV3_11–13, 16, 18–24): vyjádření neznámé ze vzorce, rovnice se zlomky,
// slovní úlohy a soustavy z kontextu, ověření řešení, tvrzení Ano/Ne.
// Spuštění: node scripts/build-rovnice-l3.mjs → doplní/přepíše ROV3_11–24 v src/data/nahled-batch.json (jiné dávky nechá).
// Každá odpověď se nezávisle ověří: dosazením a hrubou silou přes zlomky (bez použití postupu z řešení);
// A–E musí mít právě jednu správnou možnost; psané odpovědi musí jít vyhodnotit (toValue).
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

// ───────── přesné zlomky (BigInt) pro nezávislé ověření ─────────
const gcd = (a, b) => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
const F = (n, d = 1n) => { n = BigInt(n); d = BigInt(d); if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => F(a.n * b.n, a.d * b.d);
const div = (a, b) => F(a.n * b.d, a.d * b.n);
const eq = (a, b) => a.n === b.n && a.d === b.d;
const isZero = (a) => a.n === 0n;
// všechna racionální čísla n/d s |n| ≤ 80 a 1 ≤ d ≤ 8 (hrubá síla)
const grid = [];
for (let d = 1; d <= 8; d++) for (let n = -80 * d; n <= 80 * d; n++) { const f = F(n, d); if (!grid.some((g) => eq(g, f))) grid.push(f); }
const solutions = (pred) => grid.filter((x) => { try { return pred(x); } catch { return false; } });
const show = (f) => (f.d === 1n ? `${f.n}` : `${f.n}/${f.d}`);

// ───────── tvorba úloh ─────────
const mk = (id, podtema, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "rovnice", podtema, obtiznost: 3, latex: true, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const choice = (id, podtema, zadani, moznosti, spravna, kroky, cas) =>
  mk(id, podtema, zadani, moznosti[spravna], kroky, cas, { moznosti, spravna });

const ex = [];

// ── vyjádření neznámé ze vzorce (možnosti jsou zároveň funkce pro ověření) ──
const vyj = [
  {
    id: "ROV3_11", zadani: "Ze vzorce $S = \\dfrac{(a + c)\\,v}{2}$ vyjádřete neznámou $a$.", spravna: 0,
    opts: [
      ["$a = \\dfrac{2S}{v} - c$", (v) => 2 * v.S / v.v - v.c],
      ["$a = 2S - \\dfrac{c}{v}$", (v) => 2 * v.S - v.c / v.v],
      ["$a = \\dfrac{S}{2v} - c$", (v) => v.S / (2 * v.v) - v.c],
      ["$a = \\dfrac{2S - c}{v}$", (v) => (2 * v.S - v.c) / v.v],
      ["$a = 2Sv - c$", (v) => 2 * v.S * v.v - v.c],
    ],
    forward: (a, c, v) => ({ a, c, v, S: ((a + c) * v) / 2 }), tests: [[7, 3, 4], [1, 5, 2], [9, 2, 6]], target: "a",
    kroky: ["Obě strany vynásobíme dvěma: $2S = (a + c)\\,v$.", "Obě strany vydělíme $v$: $\\dfrac{2S}{v} = a + c$.", "Odečteme $c$: $a = \\dfrac{2S}{v} - c$. Správně je A)."],
  },
  {
    id: "ROV3_12", zadani: "Ze vzorce $V = \\dfrac{1}{3}\\,S\\,v$ vyjádřete neznámou $S$.", spravna: 3,
    opts: [
      ["$S = \\dfrac{V}{3v}$", (v) => v.V / (3 * v.v)],
      ["$S = 3Vv$", (v) => 3 * v.V * v.v],
      ["$S = 3V - v$", (v) => 3 * v.V - v.v],
      ["$S = \\dfrac{3V}{v}$", (v) => (3 * v.V) / v.v],
      ["$S = \\dfrac{v}{3V}$", (v) => v.v / (3 * v.V)],
    ],
    forward: (S, v) => ({ S, v, V: (S * v) / 3 }), tests: [[6, 4], [9, 2], [5, 3]], target: "S",
    kroky: ["Obě strany vynásobíme třemi: $3V = S\\,v$.", "Obě strany vydělíme $v$: $S = \\dfrac{3V}{v}$. Správně je D)."],
  },
  {
    id: "ROV3_13", zadani: "Ze vzorce $c = \\dfrac{3a - b}{2}$ vyjádřete neznámou $a$.", spravna: 1,
    opts: [
      ["$a = \\dfrac{2c - b}{3}$", (v) => (2 * v.c - v.b) / 3],
      ["$a = \\dfrac{2c + b}{3}$", (v) => (2 * v.c + v.b) / 3],
      ["$a = 2c + \\dfrac{b}{3}$", (v) => 2 * v.c + v.b / 3],
      ["$a = \\dfrac{c + b}{6}$", (v) => (v.c + v.b) / 6],
      ["$a = \\dfrac{2c}{3} + b$", (v) => (2 * v.c) / 3 + v.b],
    ],
    forward: (a, b) => ({ a, b, c: (3 * a - b) / 2 }), tests: [[4, 2], [6, 4], [8, 6]], target: "a",
    kroky: ["Obě strany vynásobíme dvěma: $2c = 3a - b$.", "Přičteme $b$: $2c + b = 3a$.", "Vydělíme třemi: $a = \\dfrac{2c + b}{3}$. Správně je B)."],
  },
];
for (const t of vyj) ex.push(choice(t.id, "vyjadreni_neznama", t.zadani, t.opts.map((o) => o[0]), t.spravna, t.kroky, 150));

// ── slovní úlohy a soustavy z kontextu ──
ex.push(mk("ROV3_16", "slovni", "Obdélník má strany o délkách $x + 3$ cm a $2x - 1$ cm. Jeho obvod je 40 cm. Jaký je obsah obdélníku?", "99 cm²", [
  "Obvod obdélníku je $2\\,[(x + 3) + (2x - 1)] = 2(3x + 2) = 40$.",
  "Vydělíme dvěma: $3x + 2 = 20$, tedy $x = 6$.",
  "Strany jsou $6 + 3 = 9$ cm a $2 \\cdot 6 - 1 = 11$ cm.",
  "Obsah je $9 \\cdot 11 = 99$ cm².",
], 180));
ex.push(mk("ROV3_18", "slovni", "Myslím si číslo. Když ho zvětším o 4 a výsledek vynásobím třemi, dostanu o 6 více než pětinásobek původního čísla. Které číslo si myslím?", "3", [
  "Myšlené číslo označíme $x$. Zápis: $3(x + 4) = 5x + 6$.",
  "Roznásobíme: $3x + 12 = 5x + 6$.",
  "Převedeme: $6 = 2x$, tedy $x = 3$.",
  "Zkouška: $3 \\cdot (3 + 4) = 21$ a $5 \\cdot 3 + 6 = 21$.",
], 180));
ex.push(mk("ROV3_19", "slovni", "Smícháme 2 litry 10% roztoku soli a $x$ litrů 40% roztoku soli. Vznikne 30% roztok. Kolik litrů 40% roztoku jsme přilili?", "4 l", [
  "Soli je v prvním roztoku $0{,}1 \\cdot 2 = 0{,}2$ l a ve druhém $0{,}4x$ l. Ve směsi o objemu $2 + x$ litrů je $0{,}3(2 + x)$ l soli.",
  "Rovnice: $0{,}2 + 0{,}4x = 0{,}3(2 + x)$, tedy $0{,}2 + 0{,}4x = 0{,}6 + 0{,}3x$.",
  "Odečteme: $0{,}1x = 0{,}4$, tedy $x = 4$.",
  "Zkouška: soli je $0{,}2 + 1{,}6 = 1{,}8$ l ve 6 l směsi, to je 30 %.",
], 210));
ex.push(mk("ROV3_20", "soustava", "Na statku jsou slepice a ovce. Dohromady mají 30 hlav a 84 nohou. Kolik je na statku ovcí?", "12", [
  "Slepic je $s$, ovcí $o$. Hlav je $s + o = 30$ a nohou $2s + 4o = 84$.",
  "Kdyby byla všechna zvířata slepice, mělo by 30 hlav jen $2 \\cdot 30 = 60$ nohou. Chybí $84 - 60 = 24$ nohou.",
  "Každá ovce má o 2 nohy víc než slepice, proto je ovcí $24 : 2 = 12$.",
  "Zkouška: slepic je 18, nohou $2 \\cdot 18 + 4 \\cdot 12 = 36 + 48 = 84$.",
], 180));
ex.push(choice("ROV3_21", "linearni", "Které z čísel $-2$, $-1$, $0$, $1$, $2$ je řešením rovnice $3(x - 1) = 2x - 4$?",
  ["$-2$", "$-1$", "$0$", "$1$", "$2$"], 1, [
    "Roznásobíme: $3x - 3 = 2x - 4$.",
    "Převedeme neznámou na jednu stranu: $x = -1$.",
    "Zkouška: vlevo $3 \\cdot (-1 - 1) = -6$, vpravo $2 \\cdot (-1) - 4 = -6$. Správně je B).",
  ], 120));
ex.push(mk("ROV3_22", "linearni", "Rozhodněte, zda je tvrzení pravdivé: Rovnice $2(x + 3) = 2x + 5$ má právě jedno řešení.", "Ne", [
  "Levou stranu roznásobíme: $2x + 6 = 2x + 5$.",
  "Po odečtení $2x$ dostaneme $6 = 5$, což nikdy neplatí.",
  "Rovnice nemá žádné řešení, tvrzení je nepravdivé.",
], 120, { moznosti: ["Ano", "Ne"], spravna: 1 }));
ex.push(mk("ROV3_23", "linearni_se_zlomky", "Řešte rovnici: $\\dfrac{2x - 1}{3} - \\dfrac{x + 2}{4} = \\dfrac{1}{2}$", "16/5", [
  "Rovnici vynásobíme společným jmenovatelem 12: $4(2x - 1) - 3(x + 2) = 6$.",
  "Roznásobíme: $8x - 4 - 3x - 6 = 6$, tedy $5x - 10 = 6$.",
  "Upravíme: $5x = 16$, tedy $x = \\dfrac{16}{5}$ (což je $3{,}2$).",
], 180));
ex.push(mk("ROV3_24", "slovni", "Polovina neznámého čísla zvětšená o 7 se rovná dvěma třetinám tohoto čísla zmenšeným o 1. Které číslo to je?", "48", [
  "Číslo označíme $x$: $\\dfrac{x}{2} + 7 = \\dfrac{2x}{3} - 1$.",
  "Vynásobíme šesti: $3x + 42 = 4x - 6$.",
  "Převedeme: $48 = x$.",
  "Zkouška: vlevo $24 + 7 = 31$, vpravo $32 - 1 = 31$.",
], 180));

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const A = (id) => by[id].odpoved;

// vzorce: právě jedna možnost dává správnou hodnotu pro všechna testovací čísla
for (const t of vyj) {
  const good = t.opts.map(([, fn]) => t.tests.every((args) => { const v = t.forward(...args); return Math.abs(fn(v) - v[t.target]) < 1e-9; }));
  ok(t.id + " právě jedna správná možnost", good.filter(Boolean).length === 1 && good[t.spravna] === true, good.join());
}
// ROV3_16: obvod 40, strany x+3 a 2x−1 → obsah
{ const s = solutions((x) => eq(mul(F(2), add(add(x, F(3)), sub(mul(F(2), x), F(1)))), F(40))); const x = s[0]; const a = add(x, F(3)), b = sub(mul(F(2), x), F(1));
  ok("16", s.length === 1 && isZero(sub(mul(a, b), F(99))) && A("ROV3_16") === "99 cm²" && a.n > 0n && b.n > 0n, s.map(show)); }
// ROV3_18: 3(x+4) = 5x + 6
{ const s = solutions((x) => eq(mul(F(3), add(x, F(4))), add(mul(F(5), x), F(6)))); ok("18", s.length === 1 && show(s[0]) === A("ROV3_18"), s.map(show)); }
// ROV3_19: 0,1·2 + 0,4x = 0,3(2+x)
{ const s = solutions((x) => eq(add(mul(F(1, 10), F(2)), mul(F(2, 5), x)), mul(F(3, 10), add(F(2), x)))); ok("19", s.length === 1 && show(s[0]) === "4" && A("ROV3_19") === "4 l", s.map(show)); }
// ROV3_20: s + o = 30, 2s + 4o = 84
{ const sol = []; for (let s = 0; s <= 30; s++) for (let o = 0; o <= 30; o++) if (s + o === 30 && 2 * s + 4 * o === 84) sol.push([s, o]); ok("20", sol.length === 1 && sol[0][1] === 12 && A("ROV3_20") === "12", sol); }
// ROV3_21: řešení z nabízených čísel
{ const cand = [-2, -1, 0, 1, 2].filter((x) => 3 * (x - 1) === 2 * x - 4); ok("21", cand.length === 1 && cand[0] === -1 && by.ROV3_21.spravna === 1 && by.ROV3_21.moznosti[1] === "$-1$", cand); }
// ROV3_22: 2(x+3) = 2x+5 nemá řešení
{ const s = solutions((x) => eq(mul(F(2), add(x, F(3))), add(mul(F(2), x), F(5)))); ok("22", s.length === 0 && A("ROV3_22") === "Ne", s.map(show)); }
// ROV3_23: (2x−1)/3 − (x+2)/4 = 1/2
{ const s = solutions((x) => eq(sub(div(sub(mul(F(2), x), F(1)), F(3)), div(add(x, F(2)), F(4))), F(1, 2))); ok("23", s.length === 1 && show(s[0]) === "16/5" && A("ROV3_23") === "16/5", s.map(show)); }
// ROV3_24: x/2 + 7 = 2x/3 − 1
{ const s = solutions((x) => eq(add(div(x, F(2)), F(7)), sub(div(mul(F(2), x), F(3)), F(1)))); ok("24", s.length === 1 && show(s[0]) === "48" && A("ROV3_24") === "48", s.map(show)); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length >= 2 && new Set(e.moznosti).size === e.moznosti.length && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
    ok(e.id + " zadání bez „Vyřeš:“ návodu k vzorci", !/dosaď/i.test(e.zadani));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
}
// správná možnost není vždy na stejném místě
const pos = ex.filter((e) => e.moznosti && e.moznosti.length === 5).map((e) => e.spravna);
ok("rozmístění správných možností", new Set(pos).size >= 3, pos.join());
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 11, ex.length);
const all = ["databaze", "cermat-200", "doplnky-uhly-souhrnne", "konstrukce-interaktivni"].flatMap((f) => { try { return JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples; } catch { return []; } });
ok("id bez kolize s databází", ids.every((id) => !all.some((e) => e.id === id)));
console.log(`úloh: ${ex.length} (A–E ${ex.filter((e) => e.moznosti?.length === 5).length}, Ano/Ne ${ex.filter((e) => e.moznosti?.length === 2).length}, psané ${ex.filter((e) => !e.moznosti).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^ROV3_(1[1-9]|2[0-4])$/.test(e.id));
const nazev = others.length ? `${prev.nazev} + Rovnice L3 (11 úloh)` : "Rovnice L3 — vyjádření ze vzorce, zlomky, slovní úlohy a soustavy z kontextu (11 úloh)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} rovnic)`);
