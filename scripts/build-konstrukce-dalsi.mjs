// Další konstrukční úlohy (rýsování v aplikaci): KONS1_12, KONS2_14–17 → src/data/nahled-batch.json
// Spuštění: node scripts/build-konstrukce-dalsi.mjs   (Node ≥ 23.6 — importuje TypeScript geometrii)
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

const ray = (a, b) => ({ t: "ray", x1: +a.x.toFixed(2), y1: +a.y.toFixed(2), x2: +b.x.toFixed(2), y2: +b.y.toFixed(2) });
const tasks = [];
const T = (o) => tasks.push(o);

// 1) L1: body na kolmici ve vzdálenosti 3 cm od bodu P na přímce
{
  const A0 = P(15, 135), B0 = P(315, 125), Pp = P(150, 130.5);
  const dir = unit(sub(B0, A0)), n = rot90(dir);
  const X1 = add(Pp, mul(n, 90)), X2 = sub(Pp, mul(n, 90));
  T({
    id: "KONS1_12", podtema: "kolmice", obtiznost: 1, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Bod P leží na přímce p. Označ všechny body, které leží na kolmici k přímce p vedené bodem P a jsou od bodu P vzdáleny 3 cm.",
    given: [line(A0, B0), txt(300, 116, "p"), pt(Pp, "P", 8, -6)],
    targets: [X1, X2],
    steps: [
      { text: "Nástrojem „Pravý úhel“ klepni na přímku p a pak na bod P — narýsuje se kolmice k p vedená bodem P.", draw: [line(sub(Pp, mul(n, 110)), add(Pp, mul(n, 110))), rightMark(Pp, dir, n)] },
      { text: "Body vzdálené 3 cm od P leží na kružnici k(P; 3 cm). Protne kolmici ve dvou bodech — oba vyhovují.", draw: [circ(Pp, 90), pt(X2, "X", 8, 4), pt(X1, "Y", 8, 4)] },
    ],
    odpoved: "Dva body — průsečíky kolmice k p vedené bodem P s kružnicí k(P; 3 cm).",
    check: (t) => t.length === 2 && t.every((x) => Math.abs(dist(x, Pp) - 90) < 1e-6 && Math.abs(dot(sub(x, Pp), dir)) < 1e-6),
    _ops: [line(sub(Pp, mul(n, 110)), add(Pp, mul(n, 110))), circ(Pp, 90)],
  });
}
// 2) L2: rovnoběžník ABCD — vrchol C ze tří daných bodů (dvě rovnoběžky)
{
  const A = P(50, 185), B = P(170, 185), D = P(115, 70);
  const C = sub(add(B, D), A);
  T({
    id: "KONS2_14", podtema: "rovnobeznik", obtiznost: 2, radii: [],
    zadani: "ABCD je rovnoběžník, body A, B a D jsou dány. Označ vrchol C.",
    given: [seg(A, B), seg(A, D), pt(A, "A", -14, 16), pt(B, "B", 6, 16), pt(D, "D", -16, -6)],
    targets: [C],
    steps: [
      { text: "Protější strany rovnoběžníku jsou rovnoběžné. Nástrojem „Rovnoběžka“ vyber úsečku AB a klepni na bod D — vznikne přímka bodem D rovnoběžná s AB.", draw: [line(D, add(D, sub(B, A)))] },
      { text: "Stejně vyber úsečku AD a klepni na bod B — vznikne přímka bodem B rovnoběžná s AD.", draw: [line(B, add(B, sub(D, A)))] },
      { text: "Hledaný vrchol C je průsečík obou rovnoběžek.", draw: [pt(C, "C", 8, -6)] },
      { text: "Druhá možnost, jen kružítkem: nástrojem „Nabrat délku“ klepni na A a D, pak klepni na bod B — kružnice se středem B má poloměr |AD|. Potom nabrat délku A a B a klepni na bod D — kružnice se středem D má poloměr |AB|. Kružnice se protínají v bodě C (a v bodě A).", draw: [arcAt(B, dist(A, D), [A, C], 40), arcAt(D, dist(A, B), [A, C], 40)] },
    ],
    odpoved: "Průsečík rovnoběžky s AB vedené bodem D a rovnoběžky s AD vedené bodem B.",
    check: (t) => dist(t[0], sub(add(B, D), A)) < 1e-9,
    _ops: [line(D, add(D, sub(B, A))), line(B, add(B, sub(D, A)))],
  });
}
// 3) L2: kosočtverec ABCD — vrchol C (kružnice)
{
  const A = P(60, 125), B = P(180, 125), D = polar(A, 120, -50);
  const C = sub(add(B, D), A);
  T({
    id: "KONS2_15", podtema: "kosoctverec", obtiznost: 2, radii: [{ label: "4 cm", r: 120 }],
    zadani: "ABCD je kosočtverec se stranou 4 cm, body A, B a D jsou dány. Označ vrchol C.",
    given: [seg(A, B), seg(A, D), pt(A, "A", -14, 16), pt(B, "B", 6, 16), pt(D, "D", -16, -6)],
    targets: [C],
    steps: [
      { text: "Všechny strany kosočtverce mají 4 cm. Bod C je od B vzdálen 4 cm a od D také 4 cm.", draw: [] },
      { text: "Narýsuj kružnice k(B; 4 cm) a l(D; 4 cm). Protínají se ve dvou bodech: v bodě A a v hledaném vrcholu C.", draw: [arcAt(B, 120, [A, C], 40), arcAt(D, 120, [A, C], 40), pt(C, "C", 8, -6)] },
    ],
    odpoved: "Průsečík kružnic k(B; 4 cm) a l(D; 4 cm), který není bodem A.",
    check: (t) => Math.abs(dist(t[0], B) - 120) < 1e-6 && Math.abs(dist(t[0], D) - 120) < 1e-6 && dist(t[0], A) > 1 && dist(A, B) === 120 && Math.abs(dist(A, D) - 120) < 1e-6,
    _ops: [circ(B, 120), circ(D, 120)],
  });
}
// 4) L2: bod uvnitř úhlu na ose, 3 cm od vrcholu
{
  const V = P(60, 170), dirA = -10, dirB = -60, bis = -35;
  const Aend = polar(V, 230, dirA), Bend = polar(V, 170, dirB);
  const K = polar(V, 70, dirA), Lp = polar(V, 70, dirB);
  const Ms = intersections({ k: "circ", c: K, r: 70 }, { k: "circ", c: Lp, r: 70 });
  const M = Ms.find((q) => dist(q, V) > 5);
  const bdir = polar(P(0, 0), 1, bis);
  const X = add(V, mul(bdir, 90));
  T({
    id: "KONS2_16", podtema: "osa_uhlu", obtiznost: 2, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Označ bod X ležící uvnitř úhlu s vrcholem V, který je stejně vzdálený od obou ramen a od vrcholu V je vzdálen 3 cm.",
    given: [ray(V, Aend), ray(V, Bend), pt(V, "V", -16, 16)],
    targets: [X],
    steps: [
      { text: "Body stejně vzdálené od obou ramen leží na ose úhlu. Kružnice se středem V protne ramena v bodech K a L.", draw: [arcAt(V, 70, [K, Lp], 14), pt(K, "K", 2, 16), pt(Lp, "L", 8, -2)] },
      { text: "Z bodů K a L narýsuj stejně velké kružnice — protnou se v bodě M. Přímka VM je osa úhlu.", draw: [arcAt(K, 70, [M], 24), arcAt(Lp, 70, [M], 24), line(V, M)] },
      { text: "Bod X leží na ose a je od V vzdálen 3 cm: průsečík osy s kružnicí k(V; 3 cm), ten uvnitř úhlu.", draw: [circ(V, 90), pt(X, "X", 8, -6)] },
    ],
    odpoved: "Průsečík osy úhlu s kružnicí k(V; 3 cm) uvnitř úhlu.",
    check: (t) => Math.abs(dist(t[0], V) - 90) < 1e-6 && Math.abs(Math.atan2(V.y - t[0].y, t[0].x - V.x) * 180 / Math.PI - 35) < 1e-6,
    _ops: [arcAt(V, 70, [K, Lp], 14), arcAt(K, 70, [M], 24), arcAt(Lp, 70, [M], 24), line(V, M), circ(V, 90)],
  });
}
// 5) L2: pata výšky z vrcholu C
{
  const A = P(40, 195), B = P(270, 180), C = P(125, 45);
  const F = foot(C, A, B);
  const dir = unit(sub(B, A)), n = rot90(dir);
  T({
    id: "KONS2_17", podtema: "trojuhelnik_vyska", obtiznost: 2, radii: [],
    zadani: "Označ patu výšky z vrcholu C v trojúhelníku ABC (bod, v němž výška protíná stranu AB).",
    given: [{ t: "polygon", pts: [[A.x, A.y], [B.x, B.y], [C.x, C.y]] }, pt(A, "A", -14, 16), pt(B, "B", 6, 16), pt(C, "C", 8, -6)],
    targets: [F],
    steps: [
      { text: "Výška z vrcholu C je kolmá na stranu AB. Nástrojem „Pravý úhel“ klepni na úsečku AB a pak na bod C.", draw: [line(C, add(C, mul(n, 100))), rightMark(F, dir, unit(sub(C, F)))] },
      { text: "Narýsovaná kolmice protne stranu AB v hledané patě výšky.", draw: [pt(F, "F", 8, 16)] },
    ],
    odpoved: "Průsečík kolmice vedené bodem C k přímce AB se stranou AB.",
    check: (t) => Math.abs(dot(sub(C, t[0]), sub(B, A))) < 1e-6 && onLine(t[0], A, B) < 1e-6 && dot(sub(t[0], A), sub(B, A)) > 0 && dot(sub(t[0], B), sub(A, B)) > 0,
    _ops: [line(C, add(C, mul(n, 100)))],
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
    givenPts(t.given).forEach((g) => ok(t.id + ` cíl ${i} leží na zadaném bodu`, dist(p, g) > 12 || false, JSON.stringify(p)));
  });
  for (const s of t.steps) for (const e of s.draw) if (e.t === "point") ok(t.id + " bod postupu v obrázku", e.x >= 6 && e.x <= W - 6 && e.y >= 6 && e.y <= H - 6, `${e.label} ${e.x},${e.y}`);
  const givenShapes = t.given.flatMap((e) => e.t === "polygon" ? e.pts.map((p, i) => ({ k: "seg", a: P(p[0], p[1]), b: P(e.pts[(i + 1) % e.pts.length][0], e.pts[(i + 1) % e.pts.length][1]) })) : [toShape(e)].filter(Boolean));
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
const nazev = others.length ? `${prev.nazev} + Konstrukce — další úlohy (${out.length} úloh)` : `Konstrukce — další úlohy (${out.length} úloh: kolmice, rovnoběžník, kosočtverec, osa úhlu, výška)`;
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...out] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${out.length} konstrukcí)`);
