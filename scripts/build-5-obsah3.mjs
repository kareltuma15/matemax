// 5. třída, okruh „Obvod a obsah", třetí dávka (P5_OBS_31–45): L-tvary, dlaždice a podlahy, plot s bránou, rozdělené obdélníky, schodovitá řada obrazců, balení materiálu.
// Styl podle úloh 5, 6 a 8 oficiálních testů CERMAT pro 5. třídu (2022–2026): obvod/obsah složených útvarů, rozdělený obdélník, řada obrazců, slovní úloha s obsahem;
// vlastní čísla a obrazce, nic se nekopíruje. L1 = úvod, L2 = přiblížení, L3 = úroveň testu (několik navazujících kroků).
// Spuštění: node scripts/build-5-obsah3.mjs → nakreslí public/obrazky/p5/obs3-*.svg a doplní/přepíše P5_OBS_31–45 v src/data/nahled-batch.json (jiné dávky nechá).
// Obrázky se kreslí ze souřadnic, ze kterých se obvod a obsah nezávisle přepočítají (vzdálenosti vrcholů, Gaussův vzorec, hrubá síla).
import fs from "node:fs";
import { NAVY, BLUE, text, line, makeWriter } from "./lib/svg.mjs";
const N = await import("../src/lib/normalize.ts");

const { write } = makeWriter("p5");
const FILL = "#cfe3f7";
const FILL2 = "#f6d3cc";
const f = (n) => Math.round(n * 100) / 100;
const poly = (pts, o = {}) => `  <polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}" fill="${o.fill ?? "#ffffff"}" stroke="${o.stroke ?? NAVY}" stroke-width="${o.w ?? 2.5}" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>\n`;
const rect = (x, y, w, h, o = {}) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o);
const bg = (w, h) => `  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>\n`;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const perimeterOf = (pts) => pts.reduce((s, p, i) => s + dist(p, pts[(i + 1) % pts.length]), 0);
const shoelace = (pts) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const eq = (a, b) => Math.abs(a - b) < 1e-9;

// ── data obrázků ──
const L_ROWS = ["###", "#..", "#.."];          // úloha 33: tvar L ze čtverečků 1 cm
const LZ = { w: 9, h: 7, t: 3 };               // úloha 36: zahrada tvaru L, ramena široká 3 m
const lVerts = ({ w, h, t }) => [[0, 0], [w, 0], [w, t], [t, t], [t, h], [0, h]];
const ROZ = { sq: 6, len: 14 };                // úloha 41: obdélník 14 × 6 cm rozdělený na čtverec 6 × 6 a obdélník 8 × 6
const SCH_N = 3;                               // úloha 44: první tři schodovité obrazce
const schodRows = (n) => Array.from({ length: n }, (_, i) => "#".repeat(i + 1));

const rowsCells = (rows) => rows.flatMap((r, y) => [...r].flatMap((c, x) => (c === "#" ? [[x, y]] : [])));
const rowsHas = (rows, x, y) => rows[y]?.[x] === "#";
const rowsPerim = (rows) => rowsCells(rows).reduce((s, [x, y]) => s + [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !rowsHas(rows, x + dx, y + dy)).length, 0);
const drawCells = (rows, c, mx, my) => {
  let b = "";
  for (const [x, y] of rowsCells(rows)) b += `  <rect x="${mx + x * c}" y="${my + y * c}" width="${c}" height="${c}" fill="${FILL}" stroke="#8fb0d3" stroke-width="1"/>\n`;
  for (const [x, y] of rowsCells(rows)) {
    const X = mx + x * c, Y = my + y * c;
    if (!rowsHas(rows, x, y - 1)) b += line(X, Y, X + c, Y, { w: 3 }) + "\n";
    if (!rowsHas(rows, x, y + 1)) b += line(X, Y + c, X + c, Y + c, { w: 3 }) + "\n";
    if (!rowsHas(rows, x - 1, y)) b += line(X, Y, X, Y + c, { w: 3 }) + "\n";
    if (!rowsHas(rows, x + 1, y)) b += line(X + c, Y, X + c, Y + c, { w: 3 }) + "\n";
  }
  return b;
};

{ // obs3-l-mrizka.svg
  const c = 32, m = 14, W = L_ROWS[0].length, H = L_ROWS.length, w = W * c + 2 * m, h = H * c + 2 * m;
  let b = bg(w, h) + drawCells(L_ROWS, c, m, m);
  write("obs3-l-mrizka.svg", w, h, b.trimEnd(), `Tvar L ze ${rowsCells(L_ROWS).length} stejných čtverečků`);
}
{ // obs3-l-zahrada.svg
  const k = 26, mx = 44, my = 30, v = lVerts(LZ), w = LZ.w * k + mx + 50, h = LZ.h * k + my + 34;
  let b = bg(w, h);
  b += poly(v.map(([x, y]) => [mx + x * k, my + y * k]), { fill: FILL });
  b += text(mx + (LZ.w * k) / 2, my - 10, `${LZ.w} m`, { size: 14, fill: NAVY }) + "\n";
  b += text(mx - 10, my + (LZ.h * k) / 2 + 5, `${LZ.h} m`, { size: 14, fill: NAVY, anchor: "end" }) + "\n";
  b += text(mx + LZ.w * k + 10, my + (LZ.t * k) / 2 + 5, `${LZ.t} m`, { size: 14, fill: NAVY, anchor: "start" }) + "\n";
  b += text(mx + (LZ.t * k) / 2, my + LZ.h * k + 22, `${LZ.t} m`, { size: 14, fill: NAVY }) + "\n";
  write("obs3-l-zahrada.svg", w, h, b.trimEnd(), `Zahrada tvaru písmene L: delší rameno ${LZ.w} m a ${LZ.h} m, obě ramena jsou široká ${LZ.t} m`);
}
{ // obs3-rozdeleny.svg
  const k = 22, m = 14, { sq, len } = ROZ, w = len * k + 2 * m, h = sq * k + 2 * m;
  let b = bg(w, h);
  b += rect(m, m, sq * k, sq * k, { fill: FILL });
  b += rect(m + sq * k, m, (len - sq) * k, sq * k, { fill: FILL2 });
  b += text(m + (sq * k) / 2, m + (sq * k) / 2 + 5, "čtverec", { size: 14, fill: NAVY }) + "\n";
  b += text(m + (sq + (len - sq) / 2) * k, m + (sq * k) / 2 + 5, "?", { size: 20, fill: NAVY }) + "\n";
  write("obs3-rozdeleny.svg", w, h, b.trimEnd(), "Obdélník rozdělený jednou úsečkou na čtverec a menší obdélník");
}
{ // obs3-schody.svg
  const c = 24, m = 14, gap = 34, n = SCH_N;
  const widths = Array.from({ length: n }, (_, i) => (i + 1) * c);
  const w = widths.reduce((s, x) => s + x, 0) + (n - 1) * gap + 2 * m, h = n * c + 2 * m + 22;
  let b = bg(w, h), x = m;
  for (let i = 1; i <= n; i++) {
    b += drawCells(schodRows(i), c, x, m + (n - i) * c);
    b += text(x + (i * c) / 2, h - 8, `${i}. obrazec`, { size: 12, fill: NAVY }) + "\n";
    x += i * c + gap;
  }
  write("obs3-schody.svg", w, h, b.trimEnd(), `První tři schodovité obrazce: ${Array.from({ length: n }, (_, i) => rowsCells(schodRows(i + 1)).length).join(", ")} čtverečků`);
}

const fig = (url, w, h, alt) => ({ image: { kind: "static", url, width: w, height: h, alt } });
const sz = (name) => { const s = fs.readFileSync(`public/obrazky/p5/${name}`, "utf8"); return [Number(/width="(\d+(?:\.\d+)?)"/.exec(s)[1]), Number(/height="(\d+(?:\.\d+)?)"/.exec(s)[1])]; };
const FIGS = {
  lmrizka: ["obs3-l-mrizka.svg", `Tvar písmene L ze ${rowsCells(L_ROWS).length} čtverečků`],
  lzahrada: ["obs3-l-zahrada.svg", `Zahrada tvaru L: rozměry ${LZ.w} m a ${LZ.h} m, ramena široká ${LZ.t} m`],
  rozdeleny: ["obs3-rozdeleny.svg", "Obdélník rozdělený na čtverec a menší obdélník"],
  schody: ["obs3-schody.svg", "První tři schodovité obrazce ze čtverečků"],
};
const im = (key) => { const [file, alt] = FIGS[key]; const [w, h] = sz(file); return fig(`/obrazky/p5/${file}`, w, h, alt); };

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_obsah", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});

const ex = [
  // ───────── L1 (úvod) ─────────
  mk("P5_OBS_31", "p5_obvod", 1, "Pozemek tvaru obdélníku měří 25 m a 12 m. Kolik metrů plotu je potřeba na oplocení celého pozemku?", "74", [
    "Plot vede kolem dokola, takže hledáme obvod obdélníku.",
    "Obvod je 2 · (25 + 12) = 2 · 37 = 74 m.",
  ], 75),
  mk("P5_OBS_32", "p5_obsah", 1, "Podlaha obdélníkového pokoje měří 6 m a 5 m. Kolik metrů čtverečních má podlaha?", "30", [
    "Obsah obdélníku spočítáme jako délka krát šířka.",
    "6 · 5 = 30 m².",
  ], 60),
  mk("P5_OBS_33", "p5_obvod", 1, "Každý čtvereček má stranu 1 cm. Jaký je obvod vybarveného obrazce ve tvaru písmene L v centimetrech?", String(rowsPerim(L_ROWS)), [
    "Obvod je délka čáry kolem celého obrazce. Vodorovných úseček je nahoře 3, ve výřezu 2 a dole 1, dohromady 6 cm.",
    "Svislých úseček je vlevo 3, vpravo nahoře 1 a ve výřezu 2, dohromady 6 cm. Obvod je 6 + 6 = 12 cm. (Je stejný jako obvod čtverce 3 cm × 3 cm: výřez v rohu obvod nezmění.)",
  ], 90, im("lmrizka")),
  mk("P5_OBS_34", "p5_obsah", 1, "Obsah čtverce je 36 cm². Kolik centimetrů měří jeho strana?", "6", [
    "Obsah čtverce je strana krát strana, hledáme tedy číslo, které vynásobené samo sebou dá 36.",
    "6 · 6 = 36, takže strana měří 6 cm.",
  ], 60),
  // ───────── L2 ─────────
  mk("P5_OBS_35", "p5_obsah", 2, "Podlaha v kuchyni měří 4 m a 3 m. Chceme ji vydláždit čtvercovými dlaždicemi o straně 50 cm. Kolik dlaždic je potřeba?", "48", [
    "Převedeme rozměry na centimetry: 4 m = 400 cm a 3 m = 300 cm.",
    "Po délce se vejde 400 : 50 = 8 dlaždic a po šířce 300 : 50 = 6 dlaždic.",
    "Celkem 8 · 6 = 48 dlaždic.",
  ], 150),
  mk("P5_OBS_36", "p5_obsah", 2, "Zahrada má tvar písmene L (viz obrázek), obě její ramena jsou široká 3 m. Jaký je obsah zahrady v metrech čtverečních?", String(shoelace(lVerts(LZ))), [
    "Zahradu rozdělíme na dva obdélníky. Horní rameno měří 9 m krát 3 m, jeho obsah je 9 · 3 = 27 m².",
    "Svislé rameno pod ním je široké 3 m a vysoké 7 − 3 = 4 m, jeho obsah je 3 · 4 = 12 m².",
    "Celá zahrada má 27 + 12 = 39 m².",
  ], 210, im("lzahrada")),
  mk("P5_OBS_37", "p5_obsah", 2, "Obdélník má obvod 34 cm. Jeho delší strana je o 3 cm delší než kratší strana. Jaký je obsah obdélníku v cm²?", "70", [
    "Součet dvou sousedních stran je 34 : 2 = 17 cm.",
    "Kdyby byly obě strany stejně dlouhé jako kratší, měly by dohromady 17 − 3 = 14 cm, takže kratší strana je 14 : 2 = 7 cm a delší 10 cm.",
    "Obsah je 7 · 10 = 70 cm². Zkouška: 2 · (7 + 10) = 34.",
  ], 210),
  mk("P5_OBS_38", "p5_obvod", 2, "Který z obdélníků (strany jsou v celých centimetrech) má obvod 20 cm a zároveň obsah 24 cm²?", null, [
    "Součet dvou sousedních stran musí být 20 : 2 = 10 cm.",
    "Obsahy dvojic se součtem 10: 1 · 9 = 9, 2 · 8 = 16, 3 · 7 = 21, 4 · 6 = 24 a 5 · 5 = 25.",
    "Obsah 24 cm² má obdélník 4 cm × 6 cm. Správně je D).",
  ], 180, { moznosti: ["1 cm × 9 cm", "2 cm × 8 cm", "3 cm × 7 cm", "4 cm × 6 cm", "5 cm × 5 cm"], spravna: 3 }),
  mk("P5_OBS_39", "p5_obvod", 2, "Kolem zahrady tvaru obdélníku 18 m × 12 m chceme postavit plot. Uprostřed jedné strany bude brána široká 4 m, tam plot nebude. Jeden metr plotu stojí 250 Kč. Kolik korun zaplatíme za plot?", "14000", [
    "Obvod zahrady je 2 · (18 + 12) = 60 m.",
    "Plot bude dlouhý 60 − 4 = 56 m, protože v místě brány se plot nestaví.",
    "Cena je 56 · 250 = 14 000 Kč.",
  ], 210),
  mk("P5_OBS_40", "p5_obvod", 2, "Čtverec o straně 8 cm rozstříhneme na dva stejné obdélníky. O kolik centimetrů je součet obvodů obou obdélníků větší než obvod čtverce?", "16", [
    "Obvod čtverce je 4 · 8 = 32 cm. Obdélníky mají strany 8 cm a 4 cm, každý má obvod 2 · (8 + 4) = 24 cm, oba dohromady 48 cm.",
    "Rozdíl je 48 − 32 = 16 cm.",
    "Střih přidal dvě nové strany dlouhé 8 cm (jednu u každého obdélníku), a to je 2 · 8 = 16 cm.",
  ], 180),
  // ───────── L3 (úroveň testu) ─────────
  mk("P5_OBS_41", "p5_obvod", 3, "Obdélník je rozdělený jednou úsečkou na čtverec a menší obdélník. Obvod čtverce je 24 cm a obvod celého velkého obdélníku je 40 cm. Jaký je obvod menšího obdélníku v centimetrech?", String(2 * (ROZ.len - ROZ.sq + ROZ.sq)), [
    "Strana čtverce je 24 : 4 = 6 cm, tedy výška celého obdélníku je 6 cm.",
    "Součet dvou sousedních stran velkého obdélníku je 40 : 2 = 20 cm, takže jeho délka je 20 − 6 = 14 cm.",
    "Menší obdélník má jednu stranu 6 cm a druhou 14 − 6 = 8 cm. Jeho obvod je 2 · (8 + 6) = 28 cm.",
  ], 270, im("rozdeleny")),
  mk("P5_OBS_42", "p5_obvod", 3, "Kolik různých obdélníků s obvodem 24 cm existuje, když jejich strany jsou v celých centimetrech? (Čtverec se také počítá za obdélník, obdélníky 3 × 9 a 9 × 3 jsou stejné.)", null, [
    "Součet dvou sousedních stran musí být 24 : 2 = 12 cm.",
    "Dvojice (kratší, delší): 1 + 11, 2 + 10, 3 + 9, 4 + 8, 5 + 7 a 6 + 6.",
    "Je jich 6 (poslední je čtverec). Správně je C).",
  ], 210, { moznosti: ["4", "5", "6", "7", "8"], spravna: 2 }),
  mk("P5_OBS_43", "p5_obsah", 3, "Obdélníkový bazén měří 10 m a 6 m. Kolem dokola je dlažba široká 2 m. Kolik metrů čtverečních dlažby je kolem bazénu?", null, [
    "Bazén spolu s dlažbou je obdélník, který je z každé strany o 2 m delší, tedy o 4 m delší v obou rozměrech: 14 m a 10 m.",
    "Obsah bazénu s dlažbou je 14 · 10 = 140 m², obsah samotného bazénu je 10 · 6 = 60 m².",
    "Dlažba má 140 − 60 = 80 m². Správně je D).",
  ], 240, { moznosti: ["48", "64", "72", "80", "120"], spravna: 3 }),
  mk("P5_OBS_44", "p5_obvod", 3, "Obrazce se skládají ze čtverečků o straně 1 cm do tvaru schodů (viz obrázek). Obvod každého obrazce se mění podle stejného pravidla. Jaký je obsah obrazce, jehož obvod je 28 cm?", "28", [
    "Obvod 1. obrazce je 4 cm, 2. obrazce 8 cm, 3. obrazce 12 cm. Každý další schod přidá 4 cm, takže obvod n-tého obrazce je 4 · n cm.",
    "Obvod 28 cm má obrazec s pořadovým číslem 28 : 4 = 7.",
    "Sedmý obrazec má řady 1, 2, 3, 4, 5, 6 a 7 čtverečků, dohromady 1 + 2 + 3 + 4 + 5 + 6 + 7 = 28 čtverečků, tedy 28 cm².",
  ], 300, im("schody")),
  mk("P5_OBS_45", "p5_obsah", 3, "Podlaha pokoje tvaru obdélníku měří 6 m a 3 m. Parkety se prodávají v balíčcích po 4 m², jeden balíček stojí 780 Kč. Parkety se prodávají jen v celých balíčcích. Kolik korun zaplatíme za parkety?", "3900", [
    "Obsah podlahy je 6 · 3 = 18 m².",
    "Potřebujeme 18 : 4 = 4,5 balíčku, ale prodávají se jen celé balíčky, takže musíme koupit 5 balíčků.",
    "Cena je 5 · 780 = 3 900 Kč.",
  ], 240),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ── nezávislé ověření ──
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const A = (id) => ex.find((x) => x.id === id).odpoved;
const cmp = (id, v) => ok(id, String(A(id)).replace(/\s/g, "") === String(v).replace(/\s/g, ""), `${A(id)} vs ${v}`);

cmp("P5_OBS_31", 2 * (25 + 12));
cmp("P5_OBS_32", 6 * 5);
{ ok("33 obvod L", rowsPerim(L_ROWS) === 12 && rowsCells(L_ROWS).length === 5 && String(rowsPerim(L_ROWS)) === A("P5_OBS_33")); }
{ const s = []; for (let a = 1; a < 100; a++) if (a * a === 36) s.push(a); ok("34", s.length === 1 && String(s[0]) === A("P5_OBS_34"), s); }
cmp("P5_OBS_35", (4 * 100 / 50) * (3 * 100 / 50));
{
  const v = lVerts(LZ); ok("36 Gauss", eq(shoelace(v), 39), shoelace(v));
  // hrubá síla po jednotkových čtvercích
  let cnt = 0; for (let x = 0; x < LZ.w; x++) for (let y = 0; y < LZ.h; y++) if (y < LZ.t || x < LZ.t) cnt++;
  ok("36 hrubá síla", cnt === 39 && String(cnt) === A("P5_OBS_36"), cnt);
  ok("36 obvod", eq(perimeterOf(v), 2 * (LZ.w + LZ.h)));
}
{ const s = []; for (let a = 1; a < 17; a++) { const b = a + 3; if (2 * (a + b) === 34) s.push(a * b); } ok("37", s.length === 1 && String(s[0]) === A("P5_OBS_37"), s); }
{
  const e = ex.find((x) => x.id === "P5_OBS_38"), hit = [];
  for (let a = 1; a <= 10; a++) for (let b = a; b <= 24; b++) if (2 * (a + b) === 20 && a * b === 24) hit.push(`${a} cm × ${b} cm`);
  ok("38", hit.length === 1 && e.moznosti[e.spravna] === hit[0], hit);
  ok("38 jen jeden vyhovuje", e.moznosti.filter((m) => { const [x, y] = m.split(" cm × ").map((t) => parseInt(t, 10)); return 2 * (x + y) === 20 && x * y === 24; }).length === 1);
}
cmp("P5_OBS_39", (2 * (18 + 12) - 4) * 250);
{ const a = 8, sum = 2 * (2 * (a + a / 2)), sq = 4 * a; cmp("P5_OBS_40", sum - sq); }
{
  const sq = 24 / 4, celekSum = 40 / 2, len = celekSum - sq;
  ok("41 data", sq === ROZ.sq && len === ROZ.len, [sq, len]);
  cmp("P5_OBS_41", 2 * ((len - sq) + sq));
}
{
  const e = ex.find((x) => x.id === "P5_OBS_42"), pairs = [];
  for (let a = 1; a <= 12; a++) for (let b = a; b <= 12; b++) if (2 * (a + b) === 24) pairs.push([a, b]);
  ok("42", pairs.length === 6 && e.moznosti[e.spravna] === String(pairs.length) && e.moznosti.filter((m) => Number(m) === pairs.length).length === 1, pairs);
}
{ const e = ex.find((x) => x.id === "P5_OBS_43"); const o = (10 + 4) * (6 + 4) - 10 * 6; ok("43", o === 80 && e.moznosti[e.spravna] === "80" && e.moznosti.filter((m) => Number(m) === 80).length === 1); }
{
  const s = []; for (let n = 1; n < 100; n++) if (rowsPerim(schodRows(n)) === 28) s.push(n);
  ok("44", s.length === 1 && String(rowsCells(schodRows(s[0])).length) === A("P5_OBS_44"), s);
  ok("44 pravidlo", [1, 2, 3, 7].every((n) => rowsPerim(schodRows(n)) === 4 * n));
  ok("44 řada", [1, 2, 3].map((n) => rowsCells(schodRows(n)).length).join() === "1,3,6");
}
cmp("P5_OBS_45", Math.ceil((6 * 3) / 4) * 780);

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
  if (e.image) ok(e.id + " soubor obrázku", fs.existsSync("public" + e.image.url));
  if (e.obtiznost === 1 && /\d\s?:\s?\d\d/.test(e.zadani)) ok(e.id + " L1 bez dělení dvojciferným", false);
}
ok("rozmístění", new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size >= 2);
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 15, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((fn) => JSON.parse(fs.readFileSync(`src/data/${fn}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; A–E ${ex.filter((e) => e.moznosti).length}; s obrázkem ${ex.filter((e) => e.image).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Obvod a obsah, třetí dávka (15 úloh)` : "5. třída — Obvod a obsah, třetí dávka: L-tvary, dlaždice, plot s bránou, rozdělený obdélník, schodovitá řada, balení materiálu (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
