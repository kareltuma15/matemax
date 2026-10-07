// Generátor konstrukčních úloh „Rýsování" (karta ConstructionMarkCard) → src/data/nahled-batch.json
// Spuštění: node scripts/build-konstrukce.mjs   (potřebuje Node ≥ 23.6 — importuje TypeScript geometrii)
// Každá úloha: zadání v obrázku (ve skutečném měřítku 30 px = 1 cm), pevné poloměry kružítka, správné body a postup po krocích.
// Ověření: správné body se počítají vzorcem (nezávisle) a navíc MUSÍ ležet v průsečíku čar, které postup nakreslí —
// tedy dá se k nim opravdu dojít pravítkem a kružítkem v aplikaci (průsečíky se přichytávají).
import fs from "node:fs";
import { createRequire } from "node:module";
const G = await import("../src/lib/construct-geom.ts");
const { dist, intersections, allIntersections, arcThrough } = G;

const W = 330, H = 250, CM = 30, TOL = 4;
const P = (x, y) => ({ x, y });
const add = (a, b) => P(a.x + b.x, a.y + b.y);
const sub = (a, b) => P(a.x - b.x, a.y - b.y);
const mul = (a, k) => P(a.x * k, a.y * k);
const mid = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2);
const unit = (a) => mul(a, 1 / Math.hypot(a.x, a.y));
const dot = (a, b) => a.x * b.x + a.y * b.y;
const polar = (c, r, deg) => P(c.x + r * Math.cos((deg * Math.PI) / 180), c.y + r * Math.sin((deg * Math.PI) / 180));
const foot = (p, a, b) => { const d = sub(b, a); const t = dot(sub(p, a), d) / dot(d, d); return add(a, mul(d, t)); };

// prvky scény
const pt = (p, label, dx, dy) => ({ t: "point", x: +p.x.toFixed(2), y: +p.y.toFixed(2), ...(label ? { label } : {}), ...(dx !== undefined ? { dx, dy } : {}) });
const seg = (a, b, dashed) => ({ t: "segment", x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...(dashed ? { dashed } : {}) });
const line = (a, b) => ({ t: "line", x1: +a.x.toFixed(2), y1: +a.y.toFixed(2), x2: +b.x.toFixed(2), y2: +b.y.toFixed(2) });
const ray = (a, b) => ({ t: "ray", x1: a.x, y1: a.y, x2: b.x, y2: b.y });
const circ = (c, r) => ({ t: "circle", cx: +c.x.toFixed(2), cy: +c.y.toFixed(2), r: +r.toFixed(2) });
const txt = (x, y, text, anchor) => ({ t: "text", x, y, text, ...(anchor ? { anchor } : {}) });
const arcAt = (c, r, around, margin = 26) => { const { a1, a2 } = arcThrough(c, r, around, margin); return { t: "arc", cx: +c.x.toFixed(2), cy: +c.y.toFixed(2), r: +r.toFixed(2), a1: +a1.toFixed(1), a2: +a2.toFixed(1) }; };
const rightMark = (v, u, w) => ({ t: "right", x: v.x, y: v.y, ux: u.x, uy: u.y, vx: w.x, vy: w.y });

const tasks = [];
const T = (o) => tasks.push(o);

// ───────────── L1 ─────────────
// 1) pata kolmice
{
  const A0 = P(20, 165), B0 = P(310, 155), Pp = P(150, 45);
  const F = foot(Pp, A0, B0);
  const r1 = 150, r2 = 120;
  const KL = intersections({ k: "circ", c: Pp, r: r1 }, { k: "line", a: A0, b: B0 });
  const K = KL[0], L = KL[1];
  const Qs = intersections({ k: "circ", c: K, r: r2 }, { k: "circ", c: L, r: r2 });
  const Q = Qs.reduce((m, q) => (q.y > m.y ? q : m));
  T({
    id: "KONS1_01", podtema: "kolmice", obtiznost: 1, radii: [],
    zadani: "Označ patu kolmice vedené bodem P k přímce p (bod, v němž kolmice protne přímku).",
    given: [line(A0, B0), txt(300, 145, "p"), pt(Pp, "P", 8, -6)],
    targets: [F],
    steps: [
      { text: "Pravítko s pravým úhlem přilož jednou odvěsnou k přímce p a posouvej ho po ní, až druhá odvěsna projde bodem P. V aplikaci: nástroj „Pravý úhel“ → klepni na přímku p a pak na bod P.", draw: [line(Pp, F)] },
      { text: "Narýsovaná kolmice protne přímku p v hledané patě kolmice (pravý úhel je vyznačen).", draw: [rightMark(F, unit(sub(B0, A0)), unit(sub(Pp, F)))] },
      { text: "Jiný postup jen kružítkem: kružnice se středem P protne p v bodech K a L, z nich stejně velkými kružnicemi najdeš bod Q na druhé straně p a přímka PQ je tatáž kolmice.", draw: [arcAt(Pp, r1, [K, L]), pt(K, "K", -4, 18), pt(L, "L", 4, 18), arcAt(K, r2, [Q]), arcAt(L, r2, [Q]), pt(Q, "Q", 8, 14)] },
    ],
    odpoved: "Pata kolmice z bodu P na přímku p.",
    check: (t) => Math.abs(dot(sub(Pp, t[0]), sub(B0, A0))) < 1e-6 && dist(t[0], foot(t[0], A0, B0)) < 1e-6,
    _ops: [line(Pp, F)],
  });
}
// 2) střed úsečky
{
  const A = P(75, 150), B = P(195, 100), S = mid(A, B), r = dist(A, B);
  const Ps = intersections({ k: "circ", c: A, r }, { k: "circ", c: B, r });
  T({
    id: "KONS1_02", podtema: "osa_usecky", obtiznost: 1, radii: [],
    zadani: "Označ střed úsečky AB.",
    given: [seg(A, B), pt(A, "A", -14, 18), pt(B, "B", 8, -8)],
    targets: [S],
    steps: [
      { text: "Narýsuj kružnice o poloměru |AB| se středy A a B. Protnou se ve dvou bodech.", draw: [arcAt(A, r, Ps), arcAt(B, r, Ps), pt(Ps[0]), pt(Ps[1])] },
      { text: "Spoj průsečíky — vznikne osa úsečky AB.", draw: [line(Ps[0], Ps[1])] },
      { text: "Osa protne úsečku AB v jejím středu.", draw: [] },
    ],
    odpoved: "Střed úsečky AB.",
    check: (t) => dist(t[0], P((A.x + B.x) / 2, (A.y + B.y) / 2)) < 1e-9,
  });
}
// 3) kružnice ∩ přímka (pevný poloměr 3 cm)
{
  const A = P(165, 75), A0 = P(15, 150), B0 = P(315, 140);
  const Xs = intersections({ k: "circ", c: A, r: 90 }, { k: "line", a: A0, b: B0 });
  T({
    id: "KONS1_03", podtema: "mnoziny_bodu", obtiznost: 1, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Označ všechny body přímky p, které jsou od bodu A vzdáleny 3 cm.",
    given: [line(A0, B0), txt(305, 130, "p"), pt(A, "A", 8, -6)],
    targets: Xs,
    steps: [
      { text: "Body vzdálené 3 cm od A leží na kružnici se středem A a poloměrem 3 cm.", draw: [circ(A, 90)] },
      { text: "Hledané body jsou společné body této kružnice a přímky p — jsou dva.", draw: [pt(Xs[0], "X", -4, 18), pt(Xs[1], "Y", 6, 18)] },
    ],
    odpoved: "Dva body — průsečíky kružnice k(A; 3 cm) s přímkou p.",
    check: (t) => t.length === 2 && t.every((x) => Math.abs(dist(x, A) - 90) < 1e-6 && Math.abs(dot(sub(x, A0), P(-(B0.y - A0.y), B0.x - A0.x))) < 1e-4),
  });
}
// 4) dvě kružnice 3 cm a 4 cm, |AB| = 5 cm
{
  const A = P(60, 125), B = P(210, 125);
  const Xs = intersections({ k: "circ", c: A, r: 90 }, { k: "circ", c: B, r: 120 });
  T({
    id: "KONS1_04", podtema: "mnoziny_bodu", obtiznost: 1, radii: [{ label: "3 cm", r: 90 }, { label: "4 cm", r: 120 }],
    zadani: "Úsečka AB má délku 5 cm. Označ všechny body, které jsou od bodu A vzdáleny 3 cm a od bodu B 4 cm.",
    given: [seg(A, B), pt(A, "A", -14, 18), pt(B, "B", 6, 18)],
    targets: Xs,
    steps: [
      { text: "Body vzdálené 3 cm od A leží na kružnici k(A; 3 cm), body vzdálené 4 cm od B na kružnici l(B; 4 cm).", draw: [arcAt(A, 90, Xs, 40), arcAt(B, 120, Xs, 40)] },
      { text: "Hledané body jsou společné body obou kružnic — jsou dva (nad a pod úsečkou AB).", draw: [pt(Xs[0], "X", 8, 4), pt(Xs[1], "Y", 8, 4)] },
    ],
    odpoved: "Dva body — průsečíky kružnic k(A; 3 cm) a l(B; 4 cm).",
    check: (t) => t.length === 2 && t.every((x) => Math.abs(dist(x, A) - 90) < 1e-6 && Math.abs(dist(x, B) - 120) < 1e-6),
  });
}

// ───────────── L2 ─────────────
// 5) rovnoběžník: bod D
{
  const A = P(60, 190), B = P(180, 190), C = P(234, 118), D = sub(add(A, C), B);
  const Ds = intersections({ k: "circ", c: A, r: 90 }, { k: "circ", c: C, r: 120 });
  const Dother = Ds.find((q) => dist(q, D) > 1);
  T({
    id: "KONS2_01", podtema: "rovnobeznik", obtiznost: 2, radii: [{ label: "3 cm", r: 90 }, { label: "4 cm", r: 120 }],
    zadani: "Je dán trojúhelník ABC, |AB| = 4 cm a |BC| = 3 cm. Označ bod D tak, aby čtyřúhelník ABCD byl rovnoběžník.",
    given: [seg(A, B), seg(B, C), seg(A, C, true), pt(A, "A", -14, 16), pt(B, "B", 6, 16), pt(C, "C", 8, -6)],
    targets: [D],
    steps: [
      { text: "V rovnoběžníku jsou protější strany shodné: |AD| = |BC| = 3 cm a |CD| = |AB| = 4 cm.", draw: [] },
      { text: "Narýsuj kružnici k(A; 3 cm) a kružnici l(C; 4 cm). Protnou se ve dvou bodech.", draw: [arcAt(A, 90, Ds, 36), arcAt(C, 120, Ds, 36), pt(D, "D", -16, -6), pt(Dother)] },
      { text: "Hledaný bod D je ten průsečík, který leží na opačné straně přímky AC než bod B (jen tak vznikne rovnoběžník).", draw: [seg(A, D), seg(D, C)] },
    ],
    odpoved: "Bod D = A + C − B.",
    check: (t) => dist(t[0], P(A.x + C.x - B.x, A.y + C.y - B.y)) < 1e-9 && Math.abs(dist(A, B) - 120) < 1e-9 && Math.abs(dist(B, C) - 90) < 1e-9,
  });
}
// 6) střed kružnice opsané
{
  const A = P(55, 190), B = P(270, 175), C = P(160, 45);
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  const ux = ((A.x ** 2 + A.y ** 2) * (B.y - C.y) + (B.x ** 2 + B.y ** 2) * (C.y - A.y) + (C.x ** 2 + C.y ** 2) * (A.y - B.y)) / d;
  const uy = ((A.x ** 2 + A.y ** 2) * (C.x - B.x) + (B.x ** 2 + B.y ** 2) * (A.x - C.x) + (C.x ** 2 + C.y ** 2) * (B.x - A.x)) / d;
  const S = P(ux, uy);
  const bis = (U, V, r) => { const Ps = intersections({ k: "circ", c: U, r }, { k: "circ", c: V, r }); return { Ps, el: [arcAt(U, r, Ps, 30), arcAt(V, r, Ps, 30), line(Ps[0], Ps[1])] }; };
  const b1 = bis(A, B, 170), b2 = bis(B, C, 150);
  T({
    id: "KONS2_02", podtema: "kruznice_opsana", obtiznost: 2, radii: [],
    zadani: "Označ střed kružnice opsané trojúhelníku ABC.",
    given: [{ t: "polygon", pts: [[A.x, A.y], [B.x, B.y], [C.x, C.y]] }, pt(A, "A", -14, 16), pt(B, "B", 6, 16), pt(C, "C", 8, -6)],
    targets: [S],
    steps: [
      { text: "Střed kružnice opsané je stejně vzdálený od všech vrcholů — leží na osách stran. Sestroj osu strany AB.", draw: b1.el },
      { text: "Sestroj osu strany BC.", draw: b2.el },
      { text: "Průsečík os je střed S kružnice opsané; poloměr je |SA|.", draw: [pt(S, "S", 8, 14), circ(S, dist(S, A))] },
    ],
    odpoved: "Průsečík os stran trojúhelníku ABC.",
    check: (t) => Math.abs(dist(t[0], A) - dist(t[0], B)) < 1e-6 && Math.abs(dist(t[0], B) - dist(t[0], C)) < 1e-6,
    _ops: [...b1.el, ...b2.el],
  });
}
// 7) bod na přímce stejně vzdálený od A a B
{
  const A = P(70, 60), B = P(130, 190), p1 = P(157, 0), p2 = P(325, 220);
  const M = mid(A, B), dir = unit(P(-(B.y - A.y), B.x - A.x));
  const bisLine = { k: "line", a: M, b: add(M, dir) };
  const X = intersections(bisLine, { k: "line", a: p1, b: p2 })[0];
  const r = 95;
  const Ps = intersections({ k: "circ", c: A, r }, { k: "circ", c: B, r });
  T({
    id: "KONS2_03", podtema: "osa_usecky", obtiznost: 2, radii: [],
    zadani: "Označ bod X na přímce p, který je stejně vzdálený od bodů A a B.",
    given: [line(p1, p2), txt(308, 176, "p"), pt(A, "A", -16, 4), pt(B, "B", -16, 6)],
    targets: [X],
    steps: [
      { text: "Body stejně vzdálené od A a B leží na ose úsečky AB. Sestroj ji dvěma stejnými kružnicemi se středy A a B.", draw: [arcAt(A, r, Ps, 30), arcAt(B, r, Ps, 30), line(Ps[0], Ps[1])] },
      { text: "Hledaný bod X je průsečík osy s přímkou p.", draw: [pt(X, "X", 8, 14)] },
    ],
    odpoved: "Průsečík osy úsečky AB s přímkou p.",
    check: (t) => Math.abs(dist(t[0], A) - dist(t[0], B)) < 1e-6,
    _ops: [circ(A, r), circ(B, r), line(Ps[0], Ps[1])],
  });
}
// 8) střed zadané kružnice
{
  const S = P(165, 130), R = 100;
  const Kp = polar(S, R, 200), Lp = polar(S, R, 320), Mp = polar(S, R, 80);
  const bis = (U, V, r) => { const Ps = intersections({ k: "circ", c: U, r }, { k: "circ", c: V, r }); return { Ps, el: [arcAt(U, r, Ps, 30), arcAt(V, r, Ps, 30), line(Ps[0], Ps[1])] }; };
  const b1 = bis(Kp, Lp, 100), b2 = bis(Lp, Mp, 130);
  T({
    id: "KONS2_04", podtema: "stred_kruznice", obtiznost: 2, radii: [],
    zadani: "Je dána kružnice, ale její střed není vyznačen. Označ střed kružnice (jsou vyznačeny tři body K, L, M, které na ní leží).",
    given: [circ(S, R), pt(Kp, "K", -18, 4), pt(Lp, "L", 6, 14), pt(Mp, "M", 6, 16)],
    targets: [S],
    steps: [
      { text: "Střed kružnice je stejně vzdálený od K a L — leží na ose tětivy KL. Sestroj ji.", draw: b1.el },
      { text: "Stejně sestroj osu tětivy LM.", draw: b2.el },
      { text: "Průsečík obou os je střed kružnice.", draw: [pt(S, "S", 8, 14)] },
    ],
    odpoved: "Průsečík os dvou tětiv.",
    check: (t) => Math.abs(dist(t[0], Kp) - R) < 1e-6 && Math.abs(dist(t[0], Lp) - R) < 1e-6 && Math.abs(dist(t[0], Mp) - R) < 1e-6,
    _ops: [...b1.el, ...b2.el],
  });
}
// 9) trojúhelník ABC z tří stran (dva body C)
{
  const A = P(40, 130), B = P(220, 130);
  const Cs = intersections({ k: "circ", c: A, r: 120 }, { k: "circ", c: B, r: 150 });
  T({
    id: "KONS2_05", podtema: "trojuhelnik_sss", obtiznost: 2, radii: [{ label: "4 cm", r: 120 }, { label: "5 cm", r: 150 }],
    zadani: "Úsečka AB má délku 6 cm. Označ všechny body C, pro které je |AC| = 4 cm a |BC| = 5 cm.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: Cs,
    steps: [
      { text: "Bod C leží 4 cm od A a 5 cm od B: je to průsečík kružnic k(A; 4 cm) a l(B; 5 cm).", draw: [arcAt(A, 120, Cs, 30), arcAt(B, 150, Cs, 30)] },
      { text: "Kružnice se protínají ve dvou bodech (nad a pod úsečkou AB), obě řešení jsou správná.", draw: [pt(Cs[0], "C₁", 8, 4), pt(Cs[1], "C₂", 8, 4)] },
    ],
    odpoved: "Dva body C — průsečíky kružnic k(A; 4 cm) a l(B; 5 cm).",
    check: (t) => t.length === 2 && t.every((c) => Math.abs(dist(c, A) - 120) < 1e-6 && Math.abs(dist(c, B) - 150) < 1e-6),
  });
}
// 10) čtverec s danou úhlopříčkou
{
  const A = P(70, 185), C = P(250, 65), S = mid(A, C);
  const half = sub(C, S), w = P(-half.y, half.x); // kolmý vektor stejné délky
  const B = add(S, w), D = sub(S, w);
  const r = 130;
  const Ps = intersections({ k: "circ", c: A, r }, { k: "circ", c: C, r });
  T({
    id: "KONS2_06", podtema: "ctverec", obtiznost: 2, radii: [],
    zadani: "Úsečka AC je úhlopříčka čtverce ABCD. Označ vrcholy B a D.",
    given: [seg(A, C), pt(A, "A", -14, 16), pt(C, "C", 8, -6)],
    targets: [B, D],
    steps: [
      { text: "Úhlopříčky čtverce jsou shodné, kolmé a půlí se. Sestroj osu úsečky AC — její průsečík s AC je střed S.", draw: [arcAt(A, r, Ps, 30), arcAt(C, r, Ps, 30), line(Ps[0], Ps[1]), pt(S, "S", 8, -8)] },
      { text: "Druhá úhlopříčka má stejnou délku, takže B a D leží na kružnici se středem S a poloměrem |SA|.", draw: [circ(S, dist(S, A))] },
      { text: "Průsečíky této kružnice s osou jsou vrcholy B a D.", draw: [pt(B, "B", 8, 4), pt(D, "D", 8, 4)] },
    ],
    odpoved: "Vrcholy B a D leží na ose úsečky AC ve vzdálenosti |SA| od středu S.",
    check: (t) => t.length === 2 && Math.abs(dist(t[0], A) - dist(t[0], C)) < 1e-6 && Math.abs(dist(t[0], A) - dist(t[1], A)) < 1e-6 && Math.abs(dot(sub(t[0], A), sub(t[0], C))) < 1e-6,
    _ops: [circ(A, r), circ(C, r), line(Ps[0], Ps[1]), circ(S, dist(S, A))],
  });
}
// 11) bod na ose úhlu ve vzdálenosti 3 cm od vrcholu
{
  const V = P(60, 200), a1 = P(310, 200), a2 = P(160, 27);
  const dirBis = unit(add(unit(sub(a1, V)), unit(sub(a2, V))));
  const X = add(V, mul(dirBis, 90));
  const r = 80;
  const Kp = add(V, mul(unit(sub(a1, V)), r)), Lp = add(V, mul(unit(sub(a2, V)), r));
  const M = sub(add(Kp, Lp), V);
  T({
    id: "KONS2_07", podtema: "osa_uhlu", obtiznost: 2, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Označ bod X, který leží uvnitř daného úhlu, je stejně vzdálený od obou jeho ramen a od vrcholu V je vzdálen 3 cm.",
    given: [ray(V, a1), ray(V, a2), pt(V, "V", -16, 16)],
    targets: [X],
    steps: [
      { text: "Body stejně vzdálené od ramen leží na ose úhlu. Kružnice se středem V protne obě ramena v bodech K a L.", draw: [arcAt(V, r, [Kp, Lp], 18), pt(Kp, "K", 2, 16), pt(Lp, "L", -16, 4)] },
      { text: "Stejně velké kružnice se středy K a L se protnou v bodě M. Přímka VM je osa úhlu.", draw: [arcAt(Kp, r, [M], 24), arcAt(Lp, r, [M], 24), ray(V, M)] },
      { text: "Bod X leží na ose ve vzdálenosti 3 cm od V: je to průsečík osy s kružnicí k(V; 3 cm).", draw: [circ(V, 90), pt(X, "X", 8, -6)] },
    ],
    odpoved: "Průsečík osy úhlu s kružnicí k(V; 3 cm).",
    check: (t) => Math.abs(dist(t[0], V) - 90) < 1e-6 && Math.abs(dot(sub(t[0], V), unit(sub(a1, V))) - dot(sub(t[0], V), unit(sub(a2, V)))) < 1e-6,
    _ops: [arcAt(V, r, [Kp, Lp]), circ(V, r), circ(Kp, r), circ(Lp, r), ray(V, M), circ(V, 90)],
  });
}

// ───────────── L3 ─────────────
// 12) střed kružnice vepsané
{
  const A = P(45, 205), B = P(285, 210), C = P(170, 40);
  const a = dist(B, C), b = dist(A, C), c = dist(A, B);
  const I = P((a * A.x + b * B.x + c * C.x) / (a + b + c), (a * A.y + b * B.y + c * C.y) / (a + b + c));
  const bisAt = (V, U, W, r) => {
    const K = add(V, mul(unit(sub(U, V)), r)), L = add(V, mul(unit(sub(W, V)), r)); const M = sub(add(K, L), V);
    return { M, el: [arcAt(V, r, [K, L], 16), arcAt(K, r, [M], 24), arcAt(L, r, [M], 24), line(V, M)] };
  };
  const bA = bisAt(A, B, C, 70), bB = bisAt(B, A, C, 70);
  const rho = Math.abs((B.x - A.x) * (A.y - I.y) - (A.x - I.x) * (B.y - A.y)) / c;
  T({
    id: "KONS3_01", podtema: "kruznice_vepsana", obtiznost: 3, radii: [],
    zadani: "Označ střed kružnice vepsané trojúhelníku ABC.",
    given: [{ t: "polygon", pts: [[A.x, A.y], [B.x, B.y], [C.x, C.y]] }, pt(A, "A", -14, 16), pt(B, "B", 6, 16), pt(C, "C", 8, -6)],
    targets: [I],
    steps: [
      { text: "Střed kružnice vepsané je stejně vzdálený od všech tří stran — leží na osách vnitřních úhlů. Sestroj osu úhlu při vrcholu A.", draw: bA.el },
      { text: "Sestroj osu úhlu při vrcholu B.", draw: bB.el },
      { text: "Průsečík os je střed I kružnice vepsané; její poloměr je vzdálenost I od libovolné strany.", draw: [pt(I, "I", 8, 14), circ(I, rho)] },
    ],
    odpoved: "Průsečík os vnitřních úhlů trojúhelníku ABC.",
    check: (t) => { const d1 = Math.abs((B.x - A.x) * (A.y - t[0].y) - (A.x - t[0].x) * (B.y - A.y)) / c; const d2 = Math.abs((C.x - B.x) * (B.y - t[0].y) - (B.x - t[0].x) * (C.y - B.y)) / a; const d3 = Math.abs((A.x - C.x) * (C.y - t[0].y) - (C.x - t[0].x) * (A.y - C.y)) / b; return Math.abs(d1 - d2) < 1e-6 && Math.abs(d2 - d3) < 1e-6; },
    _ops: [...bA.el, ...bB.el],
  });
}
// 13) kružnice dotýkající se přímky v bodě T a procházející bodem A
{
  const p1 = P(15, 200), p2 = P(315, 200), Tp = P(120, 200), A = P(220, 120);
  const sy = (((Tp.x - A.x) ** 2 + A.y ** 2 - Tp.y ** 2) / (2 * (A.y - Tp.y)));
  const S = P(Tp.x, sy);
  const U = P(60, 200), Wp = P(180, 200);
  const Qs = intersections({ k: "circ", c: U, r: 90 }, { k: "circ", c: Wp, r: 90 });
  const Q = Qs.reduce((m, q) => (q.y < m.y ? q : m));
  const Ms = intersections({ k: "circ", c: A, r: 100 }, { k: "circ", c: Tp, r: 100 });
  T({
    id: "KONS3_02", podtema: "kruznice_dotyk", obtiznost: 3, radii: [],
    zadani: "Kružnice k se dotýká přímky p v bodě T a prochází bodem A. Označ střed kružnice k.",
    given: [line(p1, p2), txt(300, 190, "p"), pt(Tp, "T", -6, 18), pt(A, "A", 8, -6)],
    targets: [S],
    steps: [
      { text: "Poloměr kružnice vedený do bodu dotyku je kolmý na tečnu — střed leží na kolmici k p v bodě T. Sestroj ji (pravítkem s pravým úhlem nebo kružítkem).", draw: [arcAt(Tp, 60, [U, Wp], 12), arcAt(U, 90, [Q], 24), arcAt(Wp, 90, [Q], 24), line(Tp, Q)] },
      { text: "Střed je také stejně vzdálený od T a A (obě leží na kružnici) — leží na ose úsečky AT. Sestroj ji.", draw: [arcAt(A, 100, Ms, 30), arcAt(Tp, 100, Ms, 30), line(Ms[0], Ms[1])] },
      { text: "Průsečík kolmice a osy je střed S; kružnice k má poloměr |ST|.", draw: [pt(S, "S", 8, -6), circ(S, dist(S, Tp))] },
    ],
    odpoved: "Průsečík kolmice k p v bodě T s osou úsečky AT.",
    check: (t) => Math.abs(t[0].x - Tp.x) < 1e-6 && Math.abs(dist(t[0], Tp) - dist(t[0], A)) < 1e-6,
    _ops: [circ(Tp, 60), circ(U, 90), circ(Wp, 90), line(Tp, Q), circ(A, 100), circ(Tp, 100), line(Ms[0], Ms[1])],
  });
}
// 14) obdélník s úhlopříčkou AC a stranou |AB| = 3 cm (Thalés)
{
  const A = P(55, 170), C = P(265, 50), S = mid(A, C), R = dist(S, A);
  const Bs = intersections({ k: "circ", c: A, r: 90 }, { k: "circ", c: S, r: R });
  const r = 140;
  const Ps = intersections({ k: "circ", c: A, r }, { k: "circ", c: C, r });
  T({
    id: "KONS3_03", podtema: "obdelnik_thales", obtiznost: 3, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Úsečka AC je úhlopříčka obdélníku ABCD a |AB| = 3 cm. Označ všechny body B, které mohou být vrcholem takového obdélníku.",
    given: [seg(A, C), pt(A, "A", -14, 16), pt(C, "C", 8, -6)],
    targets: Bs,
    steps: [
      { text: "Úhel ABC je pravý, takže B leží na Thaletově kružnici nad průměrem AC. Najdi střed S úsečky AC (osa úsečky).", draw: [arcAt(A, r, Ps, 30), arcAt(C, r, Ps, 30), line(Ps[0], Ps[1]), pt(S, "S", 8, 16)] },
      { text: "Narýsuj Thaletovu kružnici se středem S a poloměrem |SA|.", draw: [circ(S, R)] },
      { text: "Bod B je od A vzdálen 3 cm — průsečík Thaletovy kružnice s kružnicí k(A; 3 cm). Průsečíky jsou dva, oba vyhovují.", draw: [circ(A, 90), pt(Bs[0], "B₁", 8, 4), pt(Bs[1], "B₂", 8, 4)] },
    ],
    odpoved: "Dva body — průsečíky Thaletovy kružnice nad průměrem AC s kružnicí k(A; 3 cm).",
    check: (t) => t.length === 2 && t.every((b) => Math.abs(dist(b, A) - 90) < 1e-6 && Math.abs(dot(sub(b, A), sub(b, C))) < 1e-4),
    _ops: [circ(A, r), circ(C, r), line(Ps[0], Ps[1]), circ(S, R), circ(A, 90)],
  });
}
// 15) ssu — dva různé body C na polopřímce
{
  const A = P(40, 200), B = P(250, 200), ang = 50;
  const dirv = P(Math.cos((ang * Math.PI) / 180), -Math.sin((ang * Math.PI) / 180));
  const X = add(A, mul(dirv, 150));
  const Cs = intersections({ k: "circ", c: B, r: 180 }, { k: "ray", a: A, b: X });
  T({
    id: "KONS3_04", podtema: "trojuhelnik_ssu", obtiznost: 3, radii: [{ label: "6 cm", r: 180 }],
    zadani: "Úsečka AB má délku 7 cm a polopřímka AX svírá s úsečkou AB úhel 50°. Označ všechny body C na polopřímce AX, pro které je |BC| = 6 cm.",
    given: [seg(A, B), ray(A, X), { t: "arc", cx: A.x, cy: A.y, r: 40, a1: -ang, a2: 0 }, txt(A.x + 46, A.y - 12, "50°"), pt(A, "A", -14, 16), pt(B, "B", 6, 16), pt(X, "X", 8, 4)],
    targets: Cs,
    steps: [
      { text: "Bod C leží na polopřímce AX a zároveň 6 cm od B — na kružnici k(B; 6 cm).", draw: [arcAt(B, 180, Cs, 30)] },
      { text: "Kružnice protíná polopřímku AX ve dvou bodech, takže úloha má dvě řešení C₁ a C₂.", draw: [pt(Cs[0], "C₁", 8, 14), pt(Cs[1], "C₂", 8, 4)] },
    ],
    odpoved: "Dva body — průsečíky polopřímky AX s kružnicí k(B; 6 cm).",
    check: (t) => t.length === 2 && t.every((c) => Math.abs(dist(c, B) - 180) < 1e-6 && Math.abs(dot(sub(c, A), P(dirv.y, -dirv.x))) < 1e-4),
  });
}
// 16) čtyři body na osách úhlů křížících se přímek, 3 cm od průsečíku
{
  const V = P(165, 125), th1 = -20, th2 = 50;
  const e1 = P(Math.cos((th1 * Math.PI) / 180), Math.sin((th1 * Math.PI) / 180)), e2 = P(Math.cos((th2 * Math.PI) / 180), Math.sin((th2 * Math.PI) / 180));
  const b1 = unit(add(e1, e2)), b2 = P(-b1.y, b1.x);
  const Ts = [add(V, mul(b1, 90)), sub(V, mul(b1, 90)), add(V, mul(b2, 90)), sub(V, mul(b2, 90))];
  const far = (e, k) => add(V, mul(e, k));
  T({
    id: "KONS3_05", podtema: "mnoziny_bodu", obtiznost: 3, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Přímky p a q se protínají v bodě V. Označ všechny body, které jsou stejně vzdálené od přímek p a q a od bodu V mají vzdálenost 3 cm.",
    given: [line(far(e1, -170), far(e1, 170)), line(far(e2, -170), far(e2, 170)), txt(far(e1, 1).x + 135, far(e1, 1).y - 56, "p"), txt(far(e2, 1).x + 90, far(e2, 1).y + 105, "q"), pt(V, "V", -16, 16)],
    targets: Ts,
    steps: [
      { text: "Body stejně vzdálené od dvou protínajících se přímek leží na osách úhlů, které přímky svírají. Jsou to dvě navzájem kolmé přímky.", draw: [line(far(b1, -170), far(b1, 170)), line(far(b2, -170), far(b2, 170))] },
      { text: "Od V má být vzdálenost 3 cm: body leží na kružnici k(V; 3 cm).", draw: [circ(V, 90)] },
      { text: "Každá osa protne kružnici ve dvou bodech — celkem čtyři hledané body.", draw: Ts.map((t, i) => pt(t, String(i + 1), 8, -4)) },
    ],
    odpoved: "Čtyři body — průsečíky obou os úhlů s kružnicí k(V; 3 cm).",
    check: (t) => t.length === 4 && t.every((x) => Math.abs(dist(x, V) - 90) < 1e-6 && Math.abs(Math.abs(dot(sub(x, V), P(-e1.y, e1.x))) - Math.abs(dot(sub(x, V), P(-e2.y, e2.x)))) < 1e-6),
    _ops: [line(far(b1, -170), far(b1, 170)), line(far(b2, -170), far(b2, 170)), circ(V, 90)],
  });
}
// 17) bod C: výška 3,5 cm a |AC| = 4,5 cm
{
  const A = P(120, 205), B = P(300, 205);
  const x1 = A.x + Math.sqrt(135 ** 2 - 105 ** 2);
  const x2 = A.x - Math.sqrt(135 ** 2 - 105 ** 2);
  const Cs = [P(x1, 100), P(x2, 100)];
  const E = P(A.x, 100);
  const Ps = (() => { const a = intersections({ k: "circ", c: A, r: 60 }, { k: "line", a: A, b: B }); return a; })();
  const U = Ps.find((q) => q.x < A.x), Wp = Ps.find((q) => q.x > A.x);
  const Qs = intersections({ k: "circ", c: U, r: 90 }, { k: "circ", c: Wp, r: 90 });
  const Q = Qs.reduce((m, q) => (q.y < m.y ? q : m));
  T({
    id: "KONS3_06", podtema: "trojuhelnik_vyska", obtiznost: 3, radii: [{ label: "3,5 cm", r: 105 }, { label: "4,5 cm", r: 135 }],
    zadani: "Úsečka AB má délku 6 cm. Označ všechny body C ležící nad přímkou AB, pro které je |AC| = 4,5 cm a vzdálenost bodu C od přímky AB je 3,5 cm.",
    given: [line(P(0, 205), P(330, 205)), pt(A, "A", -14, 18), pt(B, "B", 6, -8), txt(8, 197, "AB")],
    targets: Cs,
    steps: [
      { text: "Body ve vzdálenosti 3,5 cm od přímky AB leží na rovnoběžce s AB. Pravítkem s pravým úhlem (nebo kružítkem) sestroj kolmici k AB v bodě A…", draw: [arcAt(A, 60, [U, Wp], 14), arcAt(U, 90, [Q], 22), arcAt(Wp, 90, [Q], 22), line(A, Q)] },
      { text: "…a na ní vyznač bod E ve vzdálenosti 3,5 cm od A. Rovnoběžka s AB bodem E je množina bodů s výškou 3,5 cm.", draw: [circ(A, 105), pt(E, "E", 6, -8), line(P(0, 100), P(330, 100))] },
      { text: "Bod C je navíc 4,5 cm od A — průsečík rovnoběžky s kružnicí k(A; 4,5 cm). Průsečíky jsou dva, oba vyhovují.", draw: [circ(A, 135), pt(Cs[0], "C₁", 8, -8), pt(Cs[1], "C₂", -22, -8)] },
    ],
    odpoved: "Dva body — průsečíky rovnoběžky s AB (3,5 cm nad ní) a kružnice k(A; 4,5 cm).",
    check: (t) => t.length === 2 && t.every((c) => Math.abs(c.y - (A.y - 105)) < 1e-6 && Math.abs(dist(c, A) - 135) < 1e-6),
    _ops: [circ(A, 60), circ(U, 90), circ(Wp, 90), line(A, Q), circ(A, 105), line(P(0, 100), P(330, 100)), circ(A, 135)],
  });
}


// ───────────── Rozšíření: rovnostranný trojúhelník, úhly bez úhloměru, tečny, množiny bodů ─────────────
// 18) rovnostranný trojúhelník
{
  const A = P(60, 150), B = P(150, 150);
  const Cs = intersections({ k: "circ", c: A, r: 90 }, { k: "circ", c: B, r: 90 });
  T({
    id: "KONS1_05", podtema: "trojuhelnik_sss", obtiznost: 1, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Úsečka AB má délku 3 cm. Označ všechny body C, pro které je trojúhelník ABC rovnostranný.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: Cs,
    steps: [
      { text: "V rovnostranném trojúhelníku jsou všechny strany 3 cm: bod C je 3 cm od A a zároveň 3 cm od B.", draw: [] },
      { text: "Narýsuj kružnice k(A; 3 cm) a l(B; 3 cm). Průsečíky jsou dva (nad a pod úsečkou AB) a oba vyhovují.", draw: [arcAt(A, 90, Cs, 36), arcAt(B, 90, Cs, 36), pt(Cs[0], "C₁", 8, 4), pt(Cs[1], "C₂", 8, 4)] },
    ],
    odpoved: "Dva body — průsečíky kružnic k(A; 3 cm) a l(B; 3 cm).",
    check: (t) => t.length === 2 && t.every((c) => Math.abs(dist(c, A) - 90) < 1e-6 && Math.abs(dist(c, B) - 90) < 1e-6),
  });
}
// 19) úhel 60° bez úhloměru
{
  const A = P(60, 190), X = P(300, 190), r = 90, D = P(A.x + r, A.y);
  const C = intersections({ k: "circ", c: A, r }, { k: "circ", c: D, r }).reduce((m, q) => (q.y < m.y ? q : m));
  T({
    id: "KONS2_08", podtema: "uhel_bez_uhlomeru", obtiznost: 2, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Úhel 60° bez úhloměru: označ bod C ležící nad polopřímkou AX, pro který je úhel XAC roven 60° a |AC| = 3 cm.",
    given: [ray(A, X), pt(A, "A", -14, 16), pt(X, "X", -4, -9)],
    targets: [C],
    steps: [
      { text: "Narýsuj kružnici k(A; 3 cm); protne polopřímku AX v bodě D.", draw: [arcAt(A, r, [D, C], 30), pt(D, "D", 2, 18)] },
      { text: "Kružnice l(D; 3 cm) protne k v bodě C. Trojúhelník ADC je rovnostranný, proto je úhel DAC (tedy XAC) roven 60°.", draw: [arcAt(D, r, [C], 30), pt(C, "C", 8, -6), seg(A, C)] },
    ],
    odpoved: "Bod C, pro který je trojúhelník ADC rovnostranný (průsečík k(A; 3 cm) a l(D; 3 cm)).",
    check: (t) => Math.abs(dist(t[0], A) - 90) < 1e-6 && Math.abs(Math.atan2(A.y - t[0].y, t[0].x - A.x) * 180 / Math.PI - 60) < 1e-6,
  });
}
// 20) pravý úhel (pravítko s pravým úhlem)
{
  const A = P(60, 190), X = P(300, 190), C = P(60, 70);
  T({
    id: "KONS2_09", podtema: "uhel_bez_uhlomeru", obtiznost: 2, radii: [{ label: "4 cm", r: 120 }],
    zadani: "Označ bod C ležící nad polopřímkou AX, pro který je úhel XAC pravý a |AC| = 4 cm.",
    given: [ray(A, X), pt(A, "A", -14, 16), pt(X, "X", -4, -9)],
    targets: [C],
    steps: [
      { text: "Pravý úhel sestroj pravítkem s pravým úhlem: nástroj „Pravý úhel“ → klepni na polopřímku AX a potom na bod A. Vznikne kolmice k AX v bodě A.", draw: [line(A, P(60, 60))] },
      { text: "Bod C leží na kolmici ve vzdálenosti 4 cm od A: je to průsečík kolmice s kružnicí k(A; 4 cm).", draw: [circ(A, 120), pt(C, "C", 8, -6)] },
    ],
    odpoved: "Průsečík kolmice k AX v bodě A s kružnicí k(A; 4 cm).",
    check: (t) => Math.abs(t[0].x - A.x) < 1e-6 && Math.abs(dist(t[0], A) - 120) < 1e-6 && t[0].y < A.y,
  });
}
// 21) úhel 45°
{
  const A = P(60, 190), X = P(300, 190), len = 120;
  const C = P(A.x + len * Math.cos(Math.PI / 4), A.y - len * Math.sin(Math.PI / 4));
  const r2 = 70, K = P(A.x + r2, A.y), L = P(A.x, A.y - r2), M = sub(add(K, L), A);
  T({
    id: "KONS2_10", podtema: "uhel_bez_uhlomeru", obtiznost: 2, radii: [{ label: "4 cm", r: 120 }],
    zadani: "Označ bod C ležící nad polopřímkou AX, pro který je úhel XAC roven 45° a |AC| = 4 cm.",
    given: [ray(A, X), pt(A, "A", -14, 16), pt(X, "X", -4, -9)],
    targets: [C],
    steps: [
      { text: "Úhel 45° je polovina pravého úhlu. Nejdřív sestroj pravý úhel — kolmici k AX v bodě A (nástrojem „Pravý úhel“).", draw: [line(A, P(60, 60))] },
      { text: "Osu pravého úhlu sestroj kružítkem: kružnice se středem A protne obě ramena v K a L, stejné kružnice se středy K a L se protnou v M. Polopřímka AM je osa.", draw: [arcAt(A, r2, [K, L], 14), pt(K, "K", 0, 16), pt(L, "L", -16, 4), arcAt(K, r2, [M], 24), arcAt(L, r2, [M], 24), ray(A, M)] },
      { text: "Bod C leží na ose AM ve vzdálenosti 4 cm od A: průsečík osy s kružnicí k(A; 4 cm).", draw: [circ(A, 120), pt(C, "C", 8, -6)] },
    ],
    odpoved: "Průsečík osy pravého úhlu s kružnicí k(A; 4 cm).",
    check: (t) => Math.abs(dist(t[0], A) - 120) < 1e-6 && Math.abs(Math.atan2(A.y - t[0].y, t[0].x - A.x) * 180 / Math.PI - 45) < 1e-6,
  });
}
// 22) úhel 30°
{
  const A = P(60, 190), X = P(300, 190), len = 150;
  const C = P(A.x + len * Math.cos(Math.PI / 6), A.y - len * Math.sin(Math.PI / 6));
  const r = 90, D = P(A.x + r, A.y), E = P(A.x + r * Math.cos(Math.PI / 3), A.y - r * Math.sin(Math.PI / 3));
  const r2 = 70, K = P(A.x + r2, A.y), L = P(A.x + r2 * Math.cos(Math.PI / 3), A.y - r2 * Math.sin(Math.PI / 3)), M = sub(add(K, L), A);
  T({
    id: "KONS3_07", podtema: "uhel_bez_uhlomeru", obtiznost: 3, radii: [{ label: "5 cm", r: 150 }],
    zadani: "Označ bod C ležící nad polopřímkou AX, pro který je úhel XAC roven 30° a |AC| = 5 cm.",
    given: [ray(A, X), pt(A, "A", -14, 16), pt(X, "X", -4, -9)],
    targets: [C],
    steps: [
      { text: "Úhel 30° je polovina úhlu 60°. Nejdřív sestroj úhel 60°: kružnice k(A; r) protne AX v D, kružnice se středem D a stejným poloměrem protne k v E. Trojúhelník ADE je rovnostranný, takže úhel XAE = 60°.", draw: [arcAt(A, r, [D, E], 24), pt(D, "D", 2, 18), arcAt(D, r, [E], 26), pt(E, "E", -16, -6), ray(A, E)] },
      { text: "Osu úhlu XAE sestroj kružítkem: kružnice se středem A protne ramena v K a L, stejné kružnice se středy K a L se protnou v M. Polopřímka AM svírá s AX úhel 30°.", draw: [arcAt(A, r2, [K, L], 14), pt(K, "K", -2, 16), pt(L, "L", -18, 6), arcAt(K, r2, [M], 24), arcAt(L, r2, [M], 24), ray(A, M)] },
      { text: "Bod C leží na polopřímce AM ve vzdálenosti 5 cm od A: průsečík s kružnicí k(A; 5 cm).", draw: [circ(A, 150), pt(C, "C", 8, -6)] },
    ],
    odpoved: "Průsečík osy úhlu 60° s kružnicí k(A; 5 cm).",
    check: (t) => Math.abs(dist(t[0], A) - 150) < 1e-6 && Math.abs(Math.atan2(A.y - t[0].y, t[0].x - A.x) * 180 / Math.PI - 30) < 1e-6,
  });
}
// 23) tečny z bodu ke kružnici (Thaletova kružnice)
{
  const S = P(110, 125), Pp = P(270, 125), R = 60, Mm = mid(S, Pp);
  const Ts = intersections({ k: "circ", c: S, r: R }, { k: "circ", c: Mm, r: dist(S, Mm) });
  const Ps = intersections({ k: "circ", c: S, r: 100 }, { k: "circ", c: Pp, r: 100 });
  T({
    id: "KONS3_08", podtema: "tecna", obtiznost: 3, radii: [],
    zadani: "Kružnice k má střed S a bod P leží vně kružnice. Z bodu P vedeme ke kružnici k dvě tečny. Označ oba body dotyku.",
    given: [circ(S, R), pt(S, "S", -16, 16), pt(Pp, "P", 8, -6)],
    targets: Ts,
    steps: [
      { text: "Tečna je kolmá na poloměr do bodu dotyku T, takže úhel STP je pravý. Podle Thaletovy věty leží T na kružnici nad průměrem SP.", draw: [] },
      { text: "Najdi střed M úsečky SP (osa úsečky) a narýsuj Thaletovu kružnici se středem M a poloměrem |MS|.", draw: [arcAt(S, 100, Ps, 30), arcAt(Pp, 100, Ps, 30), line(Ps[0], Ps[1]), pt(Mm, "M", 8, 16), circ(Mm, dist(S, Mm))] },
      { text: "Průsečíky Thaletovy kružnice s kružnicí k jsou body dotyku T₁ a T₂; tečny jsou přímky PT₁ a PT₂.", draw: [pt(Ts[0], "T₁", 8, -8), pt(Ts[1], "T₂", 8, 14), seg(Pp, Ts[0]), seg(Pp, Ts[1])] },
    ],
    odpoved: "Dva body — průsečíky kružnice k s Thaletovou kružnicí nad průměrem SP.",
    check: (t) => t.length === 2 && t.every((x) => Math.abs(dist(x, S) - R) < 1e-6 && Math.abs(dot(sub(x, S), sub(x, Pp))) < 1e-4),
    _ops: [arcAt(S, 100, Ps, 30), arcAt(Pp, 100, Ps, 30), line(Ps[0], Ps[1]), circ(Mm, dist(S, Mm))],
  });
}
// 24) tečna v bodě dotyku
{
  const S = P(110, 140), R = 60, Tp = polar(S, R, 330);
  const dir = unit(sub(Tp, S)), n = P(-dir.y, dir.x);
  const X1 = add(Tp, mul(n, 90)), X2 = sub(Tp, mul(n, 90));
  T({
    id: "KONS3_09", podtema: "tecna", obtiznost: 3, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Bod T leží na kružnici k se středem S. Označ všechny body X tečny kružnice k v bodě T, které jsou od bodu T vzdáleny 3 cm.",
    given: [circ(S, R), seg(S, Tp), pt(S, "S", -16, 16), pt(Tp, "T", 8, -6)],
    targets: [X1, X2],
    steps: [
      { text: "Tečna v bodě T je kolmá na poloměr ST. Nástrojem „Pravý úhel“ vyber úsečku ST a klepni na bod T.", draw: [line(X2, X1)] },
      { text: "Body tečny vzdálené 3 cm od T leží na kružnici l(T; 3 cm). Průsečíky jsou dva a oba vyhovují.", draw: [circ(Tp, 90), pt(X1, "X₁", 8, 4), pt(X2, "X₂", 8, 4)] },
    ],
    odpoved: "Dva body — průsečíky tečny v bodě T s kružnicí l(T; 3 cm).",
    check: (t) => t.length === 2 && t.every((x) => Math.abs(dist(x, Tp) - 90) < 1e-6 && Math.abs(dot(sub(x, Tp), sub(Tp, S))) < 1e-4),
  });
}
// 25) množina bodů: osa úsečky — libovolné dva body
{
  const A = P(70, 125), B = P(190, 125);
  const Ps = intersections({ k: "circ", c: A, r: 100 }, { k: "circ", c: B, r: 100 });
  const axis = line(P(130, 0), P(130, 250));
  T({
    id: "KONS2_11", podtema: "mnoziny_bodu", obtiznost: 2, radii: [],
    zadani: "Označ dva různé body, které jsou stejně vzdálené od bodů A a B.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [], locus: { shapes: [axis], count: 2 },
    steps: [
      { text: "Body stejně vzdálené od A a B leží na ose úsečky AB. Sestroj ji dvěma stejnými kružnicemi se středy A a B.", draw: [arcAt(A, 100, Ps, 30), arcAt(B, 100, Ps, 30), line(Ps[0], Ps[1])] },
      { text: "Správným řešením jsou libovolné dva různé body osy (aspoň 1,3 cm od sebe) — nástrojem „Označit bod“ je polož přímo na sestrojenou osu.", draw: [pt(P(130, 70), "X", 8, 4), pt(P(130, 180), "Y", 8, 4)] },
    ],
    odpoved: "Libovolné dva různé body osy úsečky AB.",
    check: () => true,
    _ops: [arcAt(A, 100, Ps, 30), arcAt(B, 100, Ps, 30), line(Ps[0], Ps[1])],
  });
}
// 26) množina bodů: dvě rovnoběžky ve vzdálenosti 2 cm
{
  const p1 = P(15, 130), p2 = P(315, 120), F0 = P(165, 125);
  const n = unit(P(-(p2.y - p1.y), p2.x - p1.x));
  const E1 = add(F0, mul(n, 60)), E2 = sub(F0, mul(n, 60));
  const L1 = [add(p1, mul(n, 60)), add(p2, mul(n, 60))], L2 = [sub(p1, mul(n, 60)), sub(p2, mul(n, 60))];
  T({
    id: "KONS2_12", podtema: "mnoziny_bodu", obtiznost: 2, radii: [{ label: "2 cm", r: 60 }],
    zadani: "Označ dva různé body, jejichž vzdálenost od přímky p je 2 cm.",
    given: [line(p1, p2), txt(296, 108, "p")],
    targets: [], locus: { shapes: [line(L1[0], L1[1]), line(L2[0], L2[1])], count: 2 },
    steps: [
      { text: "Body ve vzdálenosti 2 cm od přímky p leží na dvou rovnoběžkách s p, po každé straně jedné. Sestroj kolmici k p (nástrojem „Pravý úhel“).", draw: [line(F0, add(F0, mul(n, 100)))] },
      { text: "Na kolmici najdi body E₁ a E₂ ve vzdálenosti 2 cm od paty kolmice — kružnice k(F; 2 cm).", draw: [circ(F0, 60), pt(F0, "F", 8, 16), pt(E1, "E₁", 8, 4), pt(E2, "E₂", 8, 4)] },
      { text: "Rovnoběžkami s p vedenými body E₁ a E₂ (nástroj „Rovnoběžka“) dostaneš hledané čáry. Libovolné dva různé body na nich vyhovují.", draw: [line(L1[0], L1[1]), line(L2[0], L2[1])] },
    ],
    odpoved: "Libovolné dva různé body dvou rovnoběžek s p ve vzdálenosti 2 cm.",
    check: () => true,
    _ops: [line(F0, add(F0, mul(n, 100))), circ(F0, 60), line(L1[0], L1[1]), line(L2[0], L2[1])],
  });
}
// 27) množina bodů: osy úhlů dvou přímek
{
  const V = P(165, 125), th1 = -20, th2 = 50;
  const e1 = P(Math.cos((th1 * Math.PI) / 180), Math.sin((th1 * Math.PI) / 180)), e2 = P(Math.cos((th2 * Math.PI) / 180), Math.sin((th2 * Math.PI) / 180));
  const b1 = unit(add(e1, e2)), b2 = P(-b1.y, b1.x);
  const far = (e, k) => add(V, mul(e, k));
  const K1 = add(V, mul(e1, 60)), L1 = add(V, mul(e2, 60)), M1 = sub(add(K1, L1), V);
  T({
    id: "KONS3_10", podtema: "mnoziny_bodu", obtiznost: 3, radii: [],
    zadani: "Přímky p a q se protínají v bodě V. Označ dva různé body, které jsou od přímek p a q stejně vzdálené.",
    given: [line(far(e1, -170), far(e1, 170)), line(far(e2, -170), far(e2, 170)), txt(far(e1, 1).x + 135, far(e1, 1).y - 56, "p"), txt(far(e2, 1).x + 90, far(e2, 1).y + 105, "q"), pt(V, "V", -16, 16)],
    targets: [], locus: { shapes: [line(far(b1, -170), far(b1, 170)), line(far(b2, -170), far(b2, 170))], count: 2 },
    steps: [
      { text: "Body stejně vzdálené od dvou protínajících se přímek leží na osách úhlů, které přímky svírají. Osu jednoho úhlu sestroj kružítkem: kružnice se středem V protne p a q v K a L, stejné kružnice z K a L se protnou v M, osa je přímka VM.", draw: [arcAt(V, 60, [K1, L1], 16), arcAt(K1, 60, [M1], 24), arcAt(L1, 60, [M1], 24), line(V, M1)] },
      { text: "Druhá osa (osa vedlejšího úhlu) je kolmá na první a prochází bodem V — nástroj „Pravý úhel“. Libovolné dva různé body na obou osách vyhovují.", draw: [line(far(b2, -170), far(b2, 170))] },
    ],
    odpoved: "Libovolné dva různé body na osách úhlů přímek p a q.",
    check: () => true,
    _ops: [arcAt(V, 60, [K1, L1], 16), arcAt(K1, 60, [M1], 24), arcAt(L1, 60, [M1], 24), line(V, M1), line(far(b2, -170), far(b2, 170))],
  });
}

// ───────────── ověření ─────────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const toShape = (e) => {
  if (e.t === "circle") return { k: "circ", c: P(e.cx, e.cy), r: e.r };
  if (e.t === "arc") return { k: "circ", c: P(e.cx, e.cy), r: e.r };
  if (e.t === "line") return { k: "line", a: P(e.x1, e.y1), b: P(e.x2, e.y2) };
  if (e.t === "ray") return { k: "ray", a: P(e.x1, e.y1), b: P(e.x2, e.y2) };
  if (e.t === "segment") return { k: "seg", a: P(e.x1, e.y1), b: P(e.x2, e.y2) };
  if (e.t === "polygon") return null;
  return null;
};
const givenShapes = (given) => given.flatMap((e) => e.t === "polygon" ? e.pts.map((p, i) => ({ k: "seg", a: P(p[0], p[1]), b: P(e.pts[(i + 1) % e.pts.length][0], e.pts[(i + 1) % e.pts.length][1]) })) : [toShape(e)].filter(Boolean));
const givenPts = (given) => given.filter((e) => e.t === "point").map((e) => P(e.x, e.y));

// popisky (bodů i textů) se nesmí překrývat navzájem ani s bodem — odhad rámečku z délky textu
const labelBoxes = (els) => els.flatMap((e) => {
  if (e.t === "point" && e.label) { const w = 9 * e.label.length, x = e.x + (e.dx ?? 7); return [{ n: e.label, x0: x, x1: x + w, y0: e.y + (e.dy ?? -7) - 11, y1: e.y + (e.dy ?? -7) + 3 }]; }
  if (e.t === "text") { const w = 9 * e.text.length, x = e.anchor === "end" ? e.x - w : e.anchor === "middle" ? e.x - w / 2 : e.x; return [{ n: e.text, x0: x, x1: x + w, y0: e.y - 11, y1: e.y + 3 }]; }
  return [];
});
const overlap = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;

const out = [];
for (const t of tasks) {
  // překryv popisků: zadání + všechny kroky postupu najednou (nejhorší případ)
  const boxes = labelBoxes([...t.given, ...t.steps.flatMap((s) => s.draw)]);
  const dots = [...t.given, ...t.steps.flatMap((s) => s.draw)].filter((e) => e.t === "point");
  boxes.forEach((a, i) => {
    boxes.forEach((b, j) => { if (j > i) ok(t.id + ` překryv popisků ${a.n}/${b.n}`, !overlap(a, b)); });
    dots.forEach((d) => ok(t.id + ` popisek ${a.n} zakrývá bod`, !overlap(a, { x0: d.x - 4, x1: d.x + 4, y0: d.y - 4, y1: d.y + 4 })));
  });
  const targets = t.targets.map((p) => P(+p.x.toFixed(3), +p.y.toFixed(3)));
  ok(t.id + " vzorec", t.check(t.targets), "nezávislý výpočet nesedí");
  // v obrázku a dost daleko od sebe
  targets.forEach((p, i) => {
    ok(t.id + ` cíl ${i} v obrázku`, p.x >= 12 && p.x <= W - 12 && p.y >= 12 && p.y <= H - 12, JSON.stringify(p));
    targets.forEach((q, j) => { if (j > i) ok(t.id + ` cíle ${i}/${j} odděleny`, dist(p, q) >= 40, dist(p, q).toFixed(1)); });
  });
  // postup: všechny nakreslené body uvnitř obrázku
  for (const s of t.steps) for (const e of s.draw) if (e.t === "point") ok(t.id + " bod postupu v obrázku", e.x >= 6 && e.x <= W - 6 && e.y >= 6 && e.y <= H - 6, `${e.label} ${e.x},${e.y}`);
  // lze ke správným bodům dojít v aplikaci: cíl leží v průsečíku čar postupu (nebo je zadaným bodem)
  const ops = (t._ops ?? t.steps.flatMap((s) => s.draw)).map(toShape).filter(Boolean);
  const cands = [...givenPts(t.given), ...allIntersections([...givenShapes(t.given), ...ops])];
  targets.forEach((p, i) => ok(t.id + ` cíl ${i} sestrojitelný`, cands.some((q) => dist(p, q) < 1.5), JSON.stringify(p)));
  // množina bodů: hledaná čára musí ležet mezi čarami postupu (aby šla sestrojit)
  if (t.locus) {
    const opLines = ops.filter((o) => o.k === "line");
    t.locus.shapes.forEach((sh, i) => {
      const a2 = P(sh.x1, sh.y1), b2 = P(sh.x2, sh.y2);
      ok(t.id + ` hledaná čára ${i} sestrojitelná`, opLines.some((o) => G.distToShape(a2, o) < 0.6 && G.distToShape(b2, o) < 0.6));
    });
    ok(t.id + " počet bodů", t.locus.count >= 2);
  }
  // pevné poloměry musí odpovídat cm
  (t.radii ?? []).forEach((r) => ok(t.id + " poloměr " + r.label, Math.abs(r.r / CM - parseFloat(r.label.replace(",", "."))) < 1e-9, r.r));
  out.push({
    id: t.id, tema: "konstrukce", podtema: t.podtema, obtiznost: t.obtiznost,
    zadani: t.zadani, odpoved: t.odpoved,
    reseni_kroky: t.steps.map((s, i) => `${i + 1}. ${s.text}`),
    cas_sekund: 60 + 60 * t.obtiznost, sm2_interval: 1,
    konstrukce_scena: { width: W, height: H, cm: CM, given: t.given, ...(t.radii?.length ? { radii: t.radii } : {}), targets, ...(t.locus ? { locus: t.locus } : {}), tolerance: TOL, steps: t.steps },
  });
}
const ids = out.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length);
const db = JSON.parse(fs.readFileSync("src/data/databaze.json", "utf8")).examples;
ok("id bez kolize", ids.every((id) => !db.some((e) => e.id === id)));
console.log(`úloh: ${out.length} (L1 ${out.filter((e) => e.obtiznost === 1).length}, L2 ${out.filter((e) => e.obtiznost === 2).length}, L3 ${out.filter((e) => e.obtiznost === 3).length}), chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }
// Dávka se přidá vedle ostatních neschválených úloh (dřívější KONS* se přepíšou, ostatní zůstanou).
let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* žádná předchozí dávka */ }
const others = (prev.examples ?? []).filter((e) => !e.id.startsWith("KONS"));
const base = (prev.nazev ?? "").replace(/ \+ Konstrukce.*$/, "");
const nazev = others.length ? `${base} + Konstrukce — rýsování v aplikaci (27 úloh)` : "Konstrukce — rýsování v aplikaci (27 úloh: pravítko, kružítko, označení výsledku)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...out] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${out.length} konstrukcí)`);
