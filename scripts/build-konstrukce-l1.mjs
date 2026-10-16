// Doplnění konstrukčních úloh (rýsování v aplikaci) o základní úroveň L1 + jednu úlohu L2 → src/data/nahled-batch.json
// Spuštění: node scripts/build-konstrukce-l1.mjs   (Node ≥ 23.6 — importuje TypeScript geometrii)
// Stejná pravidla jako build-konstrukce.mjs: měřítko 30 px = 1 cm, pevné poloměry kružítka, správné body se počítají
// vzorcem a navíc MUSÍ ležet v průsečíku čar, které postup nakreslí (dá se k nim v aplikaci opravdu dojít).
import fs from "node:fs";
const G = await import("../src/lib/construct-geom.ts");
const { dist, intersections, allIntersections, arcThrough } = G;

const W = 330, H = 250, CM = 30, TOL = 4;
const P = (x, y) => ({ x, y });
const add = (a, b) => P(a.x + b.x, a.y + b.y);
const sub = (a, b) => P(a.x - b.x, a.y - b.y);
const mul = (a, k) => P(a.x * k, a.y * k);
const unit = (a) => mul(a, 1 / Math.hypot(a.x, a.y));
const dot = (a, b) => a.x * b.x + a.y * b.y;
const cross = (a, b) => a.x * b.y - a.y * b.x;
const polar = (c, r, deg) => P(c.x + r * Math.cos((deg * Math.PI) / 180), c.y + r * Math.sin((deg * Math.PI) / 180));
const foot = (p, a, b) => { const d = sub(b, a); const t = dot(sub(p, a), d) / dot(d, d); return add(a, mul(d, t)); };
const rot90 = (v) => P(-v.y, v.x);

const pt = (p, label, dx, dy) => ({ t: "point", x: +p.x.toFixed(2), y: +p.y.toFixed(2), ...(label ? { label } : {}), ...(dx !== undefined ? { dx, dy } : {}) });
const seg = (a, b, dashed) => ({ t: "segment", x1: +a.x.toFixed(2), y1: +a.y.toFixed(2), x2: +b.x.toFixed(2), y2: +b.y.toFixed(2), ...(dashed ? { dashed } : {}) });
const line = (a, b) => ({ t: "line", x1: +a.x.toFixed(2), y1: +a.y.toFixed(2), x2: +b.x.toFixed(2), y2: +b.y.toFixed(2) });
const circ = (c, r) => ({ t: "circle", cx: +c.x.toFixed(2), cy: +c.y.toFixed(2), r: +r.toFixed(2) });
const txt = (x, y, text, anchor) => ({ t: "text", x, y, text, ...(anchor ? { anchor } : {}) });
const arcAt = (c, r, around, margin = 26) => { const { a1, a2 } = arcThrough(c, r, around, margin); return { t: "arc", cx: +c.x.toFixed(2), cy: +c.y.toFixed(2), r: +r.toFixed(2), a1: +a1.toFixed(1), a2: +a2.toFixed(1) }; };
const rightMark = (v, u, w) => ({ t: "right", x: +v.x.toFixed(2), y: +v.y.toFixed(2), ux: +u.x.toFixed(4), uy: +u.y.toFixed(4), vx: +w.x.toFixed(4), vy: +w.y.toFixed(4) });
const onLine = (x, a, b) => Math.abs(cross(sub(b, a), sub(x, a))) / dist(a, b);

const tasks = [];
const T = (o) => tasks.push(o);

// 1) kolmice bodem P protne přímku q
{
  const A0 = P(15, 175), B0 = P(315, 165), Pp = P(105, 45);
  const q1 = P(15, 105), q2 = P(315, 70);
  const dir = unit(sub(B0, A0)), n = rot90(dir);
  const perp = { k: "line", a: Pp, b: add(Pp, mul(n, 100)) };
  const X = intersections(perp, { k: "line", a: q1, b: q2 })[0];
  const F = foot(Pp, A0, B0);
  T({
    id: "KONS1_06", podtema: "kolmice", obtiznost: 1, radii: [],
    zadani: "Bodem P veď kolmici k přímce p. Označ bod X, v němž tato kolmice protne přímku q.",
    given: [line(A0, B0), txt(300, 156, "p"), line(q1, q2), txt(300, 62, "q"), pt(Pp, "P", 8, -6)],
    targets: [X],
    steps: [
      { text: "Nástrojem „Pravý úhel“ klepni na přímku p a pak na bod P — narýsuje se kolmice k p vedená bodem P.", draw: [line(Pp, add(Pp, mul(n, 100))), rightMark(F, dir, unit(sub(Pp, F)))] },
      { text: "Hledaný bod X je průsečík této kolmice s přímkou q.", draw: [pt(X, "X", 8, -6)] },
    ],
    odpoved: "Průsečík kolmice k p vedené bodem P s přímkou q.",
    check: (t) => onLine(t[0], q1, q2) < 1e-6 && Math.abs(dot(sub(t[0], Pp), dir)) < 1e-6,
    _ops: [line(Pp, add(Pp, mul(n, 100)))],
  });
}
// 2) rovnoběžka bodem P protne přímku q
{
  const A0 = P(15, 155), B0 = P(315, 140), Pp = P(75, 60);
  const q1 = P(200, 5), q2 = P(262, 240);
  const dir = unit(sub(B0, A0));
  const par = { k: "line", a: Pp, b: add(Pp, mul(dir, 100)) };
  const X = intersections(par, { k: "line", a: q1, b: q2 })[0];
  T({
    id: "KONS1_07", podtema: "rovnobezka", obtiznost: 1, radii: [],
    zadani: "Bodem P veď rovnoběžku s přímkou p. Označ bod X, v němž tato rovnoběžka protne přímku q.",
    given: [line(A0, B0), txt(300, 134, "p"), line(q1, q2), txt(268, 226, "q"), pt(Pp, "P", -14, -6)],
    targets: [X],
    steps: [
      { text: "Nástrojem „Rovnoběžka“ klepni na přímku p a pak na bod P — narýsuje se přímka bodem P rovnoběžná s p.", draw: [line(Pp, add(Pp, mul(dir, 100)))] },
      { text: "Hledaný bod X je průsečík této rovnoběžky s přímkou q.", draw: [pt(X, "X", 8, -6)] },
    ],
    odpoved: "Průsečík rovnoběžky s p vedené bodem P s přímkou q.",
    check: (t) => onLine(t[0], q1, q2) < 1e-6 && Math.abs(cross(sub(t[0], Pp), dir)) < 1e-6,
    _ops: [line(Pp, add(Pp, mul(dir, 100)))],
  });
}
// 3) bod na úsečce ve vzdálenosti 2 cm od A
{
  const A = P(40, 150), B = polar(A, 150, -8);
  const X = intersections({ k: "circ", c: A, r: 60 }, { k: "line", a: A, b: B }).find((q) => dot(sub(q, A), sub(B, A)) > 0);
  T({
    id: "KONS1_08", podtema: "mnoziny_bodu", obtiznost: 1, radii: [{ label: "2 cm", r: 60 }],
    zadani: "Úsečka AB má délku 5 cm. Označ bod X ležící na úsečce AB, který je od bodu A vzdálen 2 cm.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 8, -6)],
    targets: [X],
    steps: [
      { text: "Body vzdálené 2 cm od A leží na kružnici k(A; 2 cm).", draw: [circ(A, 60)] },
      { text: "Hledaný bod X je průsečík této kružnice s úsečkou AB.", draw: [pt(X, "X", -2, 18)] },
    ],
    odpoved: "Průsečík kružnice k(A; 2 cm) s úsečkou AB.",
    check: (t) => Math.abs(dist(t[0], A) - 60) < 1e-6 && onLine(t[0], A, B) < 1e-6 && dot(sub(t[0], A), sub(B, A)) > 0 && dist(A, B) / CM === 5,
  });
}
// 4) dvě kružnice 2,5 cm, |AB| = 4 cm
{
  const A = P(60, 125), B = P(180, 125);
  const Xs = intersections({ k: "circ", c: A, r: 75 }, { k: "circ", c: B, r: 75 });
  T({
    id: "KONS1_09", podtema: "mnoziny_bodu", obtiznost: 1, radii: [{ label: "2,5 cm", r: 75 }],
    zadani: "Úsečka AB má délku 4 cm. Označ všechny body, které jsou od bodu A i od bodu B vzdáleny 2,5 cm.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: Xs,
    steps: [
      { text: "Body vzdálené 2,5 cm od A leží na kružnici k(A; 2,5 cm), body vzdálené 2,5 cm od B na kružnici l(B; 2,5 cm).", draw: [arcAt(A, 75, Xs, 40), arcAt(B, 75, Xs, 40)] },
      { text: "Hledané body jsou společné body obou kružnic — jsou dva (nad a pod úsečkou AB).", draw: [pt(Xs[0], "X", 8, 4), pt(Xs[1], "Y", 8, 4)] },
    ],
    odpoved: "Dva body — průsečíky kružnic k(A; 2,5 cm) a l(B; 2,5 cm).",
    check: (t) => t.length === 2 && t.every((x) => Math.abs(dist(x, A) - 75) < 1e-6 && Math.abs(dist(x, B) - 75) < 1e-6) && dist(A, B) === 120,
  });
}
// 5) čtverec — vrchol D
{
  const A = P(75, 180), B = polar(A, 120, -8);
  const dir = unit(sub(B, A)), up = P(dir.y, -dir.x);
  const perp = { k: "line", a: A, b: add(A, mul(up, 100)) };
  const Ds = intersections(perp, { k: "circ", c: A, r: 120 });
  const D = Ds.find((q) => q.y < A.y);
  T({
    id: "KONS1_10", podtema: "ctverec", obtiznost: 1, radii: [{ label: "4 cm", r: 120 }],
    zadani: "Úsečka AB je strana čtverce ABCD o straně 4 cm. Označ vrchol D, který leží nad úsečkou AB.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 8, -6)],
    targets: [D],
    steps: [
      { text: "Strana AD je kolmá na AB. Nástrojem „Pravý úhel“ klepni na úsečku AB a pak na bod A.", draw: [line(A, add(A, mul(up, 100))), rightMark(A, dir, up)] },
      { text: "Strana čtverce je 4 cm — kružnice k(A; 4 cm) protne kolmici ve dvou bodech, hledaný vrchol D je ten, který leží nad úsečkou AB.", draw: [circ(A, 120), pt(D, "D", -16, -2)] },
    ],
    odpoved: "Průsečík kolmice k AB vedené bodem A s kružnicí k(A; 4 cm) — ten nad AB.",
    check: (t) => Math.abs(dist(t[0], A) - 120) < 1e-6 && Math.abs(dot(sub(t[0], A), sub(B, A))) < 1e-6 && t[0].y < A.y && dist(A, B) === 120,
    _ops: [line(A, add(A, mul(up, 100))), circ(A, 120)],
  });
}
// 6) rovnoramenný trojúhelník
{
  const A = P(60, 125), B = P(180, 125);
  const Cs = intersections({ k: "circ", c: A, r: 90 }, { k: "circ", c: B, r: 90 });
  T({
    id: "KONS1_11", podtema: "trojuhelnik_sss", obtiznost: 1, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Úsečka AB má délku 4 cm. Označ všechny body C, pro které je trojúhelník ABC rovnoramenný se základnou AB a rameny |AC| = |BC| = 3 cm.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: Cs,
    steps: [
      { text: "Bod C je od A i od B vzdálen 3 cm — leží na kružnicích k(A; 3 cm) a l(B; 3 cm).", draw: [arcAt(A, 90, Cs, 40), arcAt(B, 90, Cs, 40)] },
      { text: "Kružnice se protínají ve dvou bodech (nad a pod úsečkou AB), obě řešení jsou správná.", draw: [pt(Cs[0], "C₁", 8, 4), pt(Cs[1], "C₂", 8, 4)] },
    ],
    odpoved: "Dva body C — průsečíky kružnic k(A; 3 cm) a l(B; 3 cm).",
    check: (t) => t.length === 2 && t.every((c) => Math.abs(dist(c, A) - 90) < 1e-6 && Math.abs(dist(c, B) - 90) < 1e-6) && dist(A, B) === 120,
  });
}
// 7) L2: bod souměrný podle přímky
{
  const A0 = P(15, 150), B0 = P(315, 140), Pp = P(120, 80);
  const dir = unit(sub(B0, A0)), n = rot90(dir);
  const F = foot(Pp, A0, B0), r = dist(Pp, F);
  const Pp2 = sub(mul(F, 2), Pp);
  T({
    id: "KONS2_13", podtema: "kolmice", obtiznost: 2, radii: [],
    zadani: "Označ bod P′, který je souměrný s bodem P podle přímky p.",
    given: [line(A0, B0), txt(300, 134, "p"), pt(Pp, "P", 8, -6)],
    targets: [Pp2],
    steps: [
      { text: "Souměrný bod leží na kolmici k p vedené bodem P, stejně daleko od p na druhé straně. Nástrojem „Pravý úhel“ sestroj tuto kolmici; protne p v bodě F.", draw: [line(Pp, add(Pp, mul(n, 100))), pt(F, "F", 8, -6), rightMark(F, dir, unit(sub(Pp, F)))] },
      { text: "Kružítko zapíchni do F a nastav poloměr |FP| — kružnice k(F; |FP|) protne kolmici v bodě P a v hledaném bodě P′.", draw: [circ(F, r), pt(Pp2, "P′", 8, 14)] },
    ],
    odpoved: "Průsečík kolmice z P na p s kružnicí k(F; |FP|) — druhý než P.",
    check: (t) => dist(t[0], Pp2) < 1e-9 && Math.abs(dist(t[0], F) - dist(Pp, F)) < 1e-6,
    _ops: [line(Pp, add(Pp, mul(n, 100))), circ(F, r)],
  });
}

// ───────────── ověření ─────────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const toShape = (e) => {
  if (e.t === "circle" || e.t === "arc") return { k: "circ", c: P(e.cx, e.cy), r: e.r };
  if (e.t === "line") return { k: "line", a: P(e.x1, e.y1), b: P(e.x2, e.y2) };
  if (e.t === "ray") return { k: "ray", a: P(e.x1, e.y1), b: P(e.x2, e.y2) };
  if (e.t === "segment") return { k: "seg", a: P(e.x1, e.y1), b: P(e.x2, e.y2) };
  return null;
};
const givenPts = (given) => given.filter((e) => e.t === "point").map((e) => P(e.x, e.y));
const labelBoxes = (els) => els.flatMap((e) => {
  if (e.t === "point" && e.label) { const w = 9 * e.label.length, x = e.x + (e.dx ?? 7); return [{ n: e.label, x0: x, x1: x + w, y0: e.y + (e.dy ?? -7) - 11, y1: e.y + (e.dy ?? -7) + 3 }]; }
  if (e.t === "text") { const w = 9 * e.text.length, x = e.anchor === "end" ? e.x - w : e.anchor === "middle" ? e.x - w / 2 : e.x; return [{ n: e.text, x0: x, x1: x + w, y0: e.y - 11, y1: e.y + 3 }]; }
  return [];
});
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const out = [];
for (const t of tasks) {
  const all = [...t.given, ...t.steps.flatMap((s) => s.draw)];
  const boxes = labelBoxes(all);
  const dots = all.filter((e) => e.t === "point");
  boxes.forEach((a, i) => {
    boxes.forEach((b, j) => { if (j > i) ok(t.id + ` překryv popisků ${a.n}/${b.n}`, !overlap(a, b)); });
    dots.forEach((d) => ok(t.id + ` popisek ${a.n} zakrývá bod`, !overlap(a, { x0: d.x - 4, x1: d.x + 4, y0: d.y - 4, y1: d.y + 4 })));
    ok(t.id + ` popisek ${a.n} uvnitř obrázku`, a.x0 >= 0 && a.x1 <= W && a.y0 >= 0 && a.y1 <= H, JSON.stringify(a));
  });
  const targets = t.targets.map((p) => P(+p.x.toFixed(3), +p.y.toFixed(3)));
  ok(t.id + " vzorec", t.check(t.targets), "nezávislý výpočet nesedí");
  targets.forEach((p, i) => {
    ok(t.id + ` cíl ${i} v obrázku`, p.x >= 12 && p.x <= W - 12 && p.y >= 12 && p.y <= H - 12, JSON.stringify(p));
    targets.forEach((q, j) => { if (j > i) ok(t.id + ` cíle ${i}/${j} odděleny`, dist(p, q) >= 40, dist(p, q).toFixed(1)); });
    givenPts(t.given).forEach((g) => ok(t.id + ` cíl ${i} leží na zadaném bodu`, dist(p, g) > 12 || t.id === "KONS1_10", JSON.stringify(p)));
  });
  for (const s of t.steps) for (const e of s.draw) if (e.t === "point") ok(t.id + " bod postupu v obrázku", e.x >= 6 && e.x <= W - 6 && e.y >= 6 && e.y <= H - 6, `${e.label} ${e.x},${e.y}`);
  const givenShapes = t.given.map(toShape).filter(Boolean);
  const ops = (t._ops ?? t.steps.flatMap((s) => s.draw)).map(toShape).filter(Boolean);
  const cands = [...givenPts(t.given), ...allIntersections([...givenShapes, ...ops])];
  targets.forEach((p, i) => ok(t.id + ` cíl ${i} sestrojitelný`, cands.some((q) => dist(p, q) < 1.5), JSON.stringify(p)));
  (t.radii ?? []).forEach((r) => ok(t.id + " poloměr " + r.label, Math.abs(r.r / CM - parseFloat(r.label.replace(",", "."))) < 1e-9, r.r));
  out.push({
    id: t.id, tema: "konstrukce", podtema: t.podtema, obtiznost: t.obtiznost,
    zadani: t.zadani, odpoved: t.odpoved,
    reseni_kroky: t.steps.map((s, i) => `${i + 1}. ${s.text}`),
    cas_sekund: 60 + 60 * t.obtiznost, sm2_interval: 1,
    konstrukce_scena: { width: W, height: H, cm: CM, given: t.given, ...(t.radii?.length ? { radii: t.radii } : {}), targets, tolerance: TOL, steps: t.steps },
  });
}
const ids = out.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length);
const db = JSON.parse(fs.readFileSync("src/data/databaze.json", "utf8")).examples;
ok("id bez kolize", ids.every((id) => !db.some((e) => e.id === id)));
console.log(`úloh: ${out.length}, chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }
let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* žádná předchozí dávka */ }
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = others.length ? `${prev.nazev} + Konstrukce L1 (${out.length} úloh)` : `Konstrukce — doplnění základní úrovně (${out.length} úloh: kolmice, rovnoběžka, kružnice, čtverec, souměrnost)`;
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...out] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${out.length} konstrukcí)`);
