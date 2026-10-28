// 5. třída, okruh „Rýsování", druhá dávka (P5_RYS_13–27): kolmice, rovnoběžka, průsečíky, trojúhelníky, obdélník a čtverec ze středu úhlopříček, „najděte všechna řešení“.
// Styl podle úlohy 7 oficiálních testů CERMAT pro 5. třídu 2022–2026 (vlastní konstrukce a čísla, nic se nekopíruje): vrchol leží na přímce a na kružnici,
// rovnoběžka s přímkou, rovnostranný/rovnoramenný/pravoúhlý trojúhelník, obdélník a čtverec z úhlopříček, více řešení.
// Spuštění: node scripts/build-5-rysovani2.mjs   (Node ≥ 23.6 — importuje TypeScript geometrii)
// Pravidla jako build-5-rysovani.mjs: měřítko 30 px = 1 cm, správné body se počítají vzorcem a navíc MUSÍ ležet v průsečíku čar, které postup nakreslí.
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
const mid = (a, b) => mul(add(a, b), 0.5);

const pt = (p, label, dx, dy) => ({ t: "point", x: +p.x.toFixed(2), y: +p.y.toFixed(2), ...(label ? { label } : {}), ...(dx !== undefined ? { dx, dy } : {}) });
const seg = (a, b, dashed) => ({ t: "segment", x1: +a.x.toFixed(2), y1: +a.y.toFixed(2), x2: +b.x.toFixed(2), y2: +b.y.toFixed(2), ...(dashed ? { dashed } : {}) });
const line = (a, b) => ({ t: "line", x1: +a.x.toFixed(2), y1: +a.y.toFixed(2), x2: +b.x.toFixed(2), y2: +b.y.toFixed(2) });
const circ = (c, r) => ({ t: "circle", cx: +c.x.toFixed(2), cy: +c.y.toFixed(2), r: +r.toFixed(2) });
const txt = (x, y, text, anchor) => ({ t: "text", x, y, text, ...(anchor ? { anchor } : {}) });
const arcAt = (c, r, around, margin = 26) => { const { a1, a2 } = arcThrough(c, r, around, margin); return { t: "arc", cx: +c.x.toFixed(2), cy: +c.y.toFixed(2), r: +r.toFixed(2), a1: +a1.toFixed(1), a2: +a2.toFixed(1) }; };
const rightMark = (v, u, w) => ({ t: "right", x: +v.x.toFixed(2), y: +v.y.toFixed(2), ux: +u.x.toFixed(4), uy: +u.y.toFixed(4), vx: +w.x.toFixed(4), vy: +w.y.toFixed(4) });
const onLine = (x, a, b) => Math.abs(cross(sub(b, a), sub(x, a))) / dist(a, b);
const ext = (a, b, k = 1.6) => [sub(a, mul(sub(b, a), 0.0)), add(a, mul(sub(b, a), k))];

const tasks = [];
const T = (o) => tasks.push(o);
const near = (x, y, tol = 1e-6) => Math.abs(x - y) < tol;

const perpU = (u) => P(u.y, -u.x); // jednotkový kolmý vektor „nahoru“ vůči vodorovnému u (obrazovka: y roste dolů)
const circShape = (c, r) => ({ k: "circ", c, r });
const lineShape = (a, b) => ({ k: "line", a, b });
const cutLC = (c, r, a, b) => intersections(circShape(c, r), lineShape(a, b));
const cutLL = (a1, b1, a2, b2) => intersections(lineShape(a1, b1), lineShape(a2, b2))[0];
const cutCC = (c1, r1, c2, r2) => intersections(circShape(c1, r1), circShape(c2, r2));
const inScene = (p, m = 12) => p.x >= m && p.x <= W - m && p.y >= m && p.y <= H - m;

// 1) L1: pata kolmice z bodu A na přímku p
{
  const P1 = P(15, 190), P2 = P(315, 150), A = P(120, 60), dir = unit(sub(P2, P1)), F = foot(A, P1, P2), nA = unit(sub(F, A));
  T({
    id: "P5_RYS_13", podtema: "kolmice", obtiznost: 1, radii: [],
    zadani: "Bod A neleží na přímce p. Veď bodem A kolmici k přímce p a označ bod, ve kterém kolmice protne přímku p.",
    given: [line(P1, P2), txt(296, 138, "p"), pt(A, "A", 8, -8)],
    targets: [F],
    steps: [
      { text: "Nástrojem „Pravý úhel“ klepni na přímku p a pak na bod A — vznikne kolmice k přímce p vedená bodem A.", draw: [line(sub(A, mul(nA, 20)), add(F, mul(nA, 40))), rightMark(F, dir, nA)] },
      { text: "Kolmice protne přímku p v hledaném bodě F. Označ ho nástrojem „Označit bod“.", draw: [pt(F, "F", 8, -8)] },
    ],
    odpoved: "Průsečík přímky p s kolmicí k p vedenou bodem A.",
    check: (t) => t.length === 1 && onLine(t[0], P1, P2) < 1e-6 && near(dot(sub(t[0], A), sub(P2, P1)), 0, 1e-4),
    _ops: [line(sub(A, mul(nA, 20)), add(F, mul(nA, 40)))],
  });
}
// 2) L1: rovnoběžka bodem A s přímkou p a její průsečík s přímkou q
{
  const P1 = P(15, 200), P2 = P(315, 170), Q1 = P(190, 10), Q2 = P(250, 240), A = P(70, 70), d = unit(sub(P2, P1));
  const X = cutLL(A, add(A, d), Q1, Q2);
  T({
    id: "P5_RYS_14", podtema: "rovnobezka", obtiznost: 1, radii: [],
    zadani: "Veď bodem A rovnoběžku s přímkou p. Označ bod X, ve kterém tato rovnoběžka protne přímku q.",
    given: [line(P1, P2), line(Q1, Q2), txt(296, 160, "p"), txt(206, 26, "q"), pt(A, "A", -16, -6)],
    targets: [X],
    steps: [
      { text: "Nástrojem „Rovnoběžka“ klepni na přímku p a pak na bod A — vznikne přímka bodem A rovnoběžná s p.", draw: [line(A, add(A, d))] },
      { text: "Rovnoběžka protne přímku q v hledaném bodě X. Označ ho nástrojem „Označit bod“.", draw: [pt(X, "X", 8, -8)] },
    ],
    odpoved: "Průsečík přímky q s rovnoběžkou k p vedenou bodem A.",
    check: (t) => t.length === 1 && onLine(t[0], Q1, Q2) < 1e-6 && onLine(t[0], A, add(A, d)) < 1e-6,
    _ops: [line(A, add(A, d))],
  });
}
// 3) L1: průsečíky přímky p s kružnicí k
{
  const S = P(165, 120), R = 75, P1 = P(20, 185), P2 = P(310, 95);
  const [X1, X2] = cutLC(S, R, P1, P2).sort((a, b) => a.x - b.x);
  T({
    id: "P5_RYS_15", podtema: "p5_pruseciky", obtiznost: 1, radii: [],
    zadani: "Přímka p protíná kružnici k. Označ všechny body, které leží na přímce p a zároveň na kružnici k.",
    given: [line(P1, P2), circ(S, R), txt(298, 86, "p"), txt(228, 52, "k"), pt(S, "S", -18, -8)],
    targets: [X1, X2],
    steps: [
      { text: "Hledané body leží na obou čarách najednou, takže jsou to místa, kde se přímka p kříží s kružnicí k. Je jich dvě.", draw: [] },
      { text: "Oba průsečíky označ nástrojem „Označit bod“. Obě řešení vyhovují.", draw: [pt(X1, "X", -6, 18), pt(X2, "Y", 8, -8)] },
    ],
    odpoved: "Dva body — průsečíky přímky p a kružnice k.",
    check: (t) => t.length === 2 && t.every((x) => near(dist(x, S), R, 1e-6) && onLine(x, P1, P2) < 1e-6) && dist(t[0], t[1]) > 100,
    _ops: [],
  });
}
// 4) L1: rovnoramenný trojúhelník se základnou 3 cm a rameny 4 cm
{
  const A = P(95, 200), B = polar(A, 90, -4), [Ca, Cb] = cutCC(A, 120, B, 120), C = Ca.y < Cb.y ? Ca : Cb;
  T({
    id: "P5_RYS_16", podtema: "trojuhelnik", obtiznost: 1, radii: [{ label: "4 cm", r: 120 }],
    zadani: "Rovnoramenný trojúhelník ABC má základnu AB, |AB| = 3 cm, a ramena |AC| = |BC| = 4 cm. Body A a B jsou dány. Označ vrchol C, který leží nad úsečkou AB.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [C],
    steps: [
      { text: "Bod C je od A vzdálen 4 cm a od B také 4 cm. Narýsuj kružnici se středem A a poloměrem 4 cm a kružnici se středem B a stejným poloměrem.", draw: [arcAt(A, 120, [C], 40), arcAt(B, 120, [C], 40)] },
      { text: "Kružnice se protnou ve dvou bodech. Nad úsečkou AB leží hledaný vrchol C.", draw: [pt(C, "C", 8, -6)] },
    ],
    odpoved: "Horní průsečík kružnic k(A; 4 cm) a l(B; 4 cm).",
    check: (t) => near(dist(t[0], A), 120, 1e-3) && near(dist(t[0], B), 120, 1e-3) && t[0].y < A.y - 50 && near(dist(A, B), 90),
    _ops: [circ(A, 120), circ(B, 120)],
  });
}
// 5) L2: pravoúhlý trojúhelník s pravým úhlem u A
{
  const A = P(70, 205), B = polar(A, 120, -8), up = mul(perpU(unit(sub(B, A))), 1), C = add(A, mul(up, 90));
  T({
    id: "P5_RYS_17", podtema: "trojuhelnik", obtiznost: 2, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Trojúhelník ABC má pravý úhel u vrcholu A, |AB| = 4 cm a |AC| = 3 cm. Body A a B jsou dány. Označ vrchol C, který leží nad úsečkou AB.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [C],
    steps: [
      { text: "Pravý úhel je u vrcholu A, takže strana AC je kolmá k AB. Nástrojem „Pravý úhel“ klepni na úsečku AB a pak na bod A — vznikne kolmice vedená bodem A.", draw: [line(sub(A, mul(up, 20)), add(A, mul(up, 200)))] },
      { text: "Bod C je od A vzdálen 3 cm. Kružnice se středem A a poloměrem 3 cm protne kolmici nad úsečkou AB v hledaném bodě C.", draw: [circ(A, 90), pt(C, "C", -16, -6)] },
    ],
    odpoved: "Průsečík kolmice k AB vedené bodem A (nad úsečkou) s kružnicí se středem A a poloměrem 3 cm.",
    check: (t) => near(dist(t[0], A), 90, 1e-6) && near(dot(sub(t[0], A), sub(B, A)), 0, 1e-4) && t[0].y < A.y - 50 && near(dist(A, B), 120),
    _ops: [line(sub(A, mul(up, 20)), add(A, mul(up, 200))), circ(A, 90)],
  });
}
// 6) L2: obdélník ABCD, dány A, B a střed S úhlopříček
{
  const u = polar(P(0, 0), 1, -8), up = perpU(u), A = P(75, 190), B = add(A, mul(u, 120)), D = add(A, mul(up, 80)), C = add(B, mul(up, 80)), S = mid(A, C), r = dist(S, A);
  T({
    id: "P5_RYS_18", podtema: "obdelnik", obtiznost: 2, radii: [],
    zadani: "ABCD je obdélník. Bod S je průsečík jeho úhlopříček. Body A, B a S jsou dány. Označ vrcholy C a D.",
    given: [pt(A, "A", -14, 16), pt(B, "B", 6, 16), pt(S, "S", 8, 16)],
    targets: [C, D],
    steps: [
      { text: "Úhlopříčky obdélníku se v bodě S půlí a jsou stejně dlouhé. Vrchol C leží na přímce AS na druhé straně od S, než je A. Nástrojem „Pravítko“ veď přímku bodem A a S.", draw: [line(A, S)] },
      { text: "Nástrojem „Nabrat délku“ klepni na S a A a narýsuj kružnici se středem S. Protne přímku AS podruhé v bodě C.", draw: [circ(S, r), pt(C, "C", 8, -6)] },
      { text: "Úhlopříčka BD je stejně dlouhá, takže B leží na téže kružnici. Veď přímku bodem B a S; protne kružnici podruhé v bodě D.", draw: [line(B, S), pt(D, "D", -16, -6)] },
    ],
    odpoved: "Body C a D leží na kružnici se středem S a poloměrem |SA|, na přímkách AS a BS na opačné straně od S než A a B.",
    check: (t) => t.length === 2 && (() => { const [c, d] = dist(t[0], C) < dist(t[1], C) ? t : [t[1], t[0]]; return dist(c, sub(mul(S, 2), A)) < 1e-9 && dist(d, sub(mul(S, 2), B)) < 1e-9 && near(dot(sub(B, A), sub(d, A)), 0, 1e-4); })(),
    _ops: [line(A, S), circ(S, r), line(B, S)],
  });
}
// 7) L2: všechna řešení — bod Q na přímce q a na kružnici se středem S procházející bodem P
{
  const S = P(150, 125), Pp = P(150, 35), r = dist(S, Pp), Q1 = P(25, 235), Q2 = P(305, 35);
  const [X1, X2] = cutLC(S, r, Q1, Q2).sort((a, b) => a.x - b.x);
  T({
    id: "P5_RYS_19", podtema: "kruznice", obtiznost: 2, radii: [],
    zadani: "Bod S je střed strany QR trojúhelníku PQR. Vrchol Q leží na přímce q a vrcholy P a Q leží na téže kružnici se středem S. Body P a S jsou dány. Označ všechny možné vrcholy Q.",
    given: [line(Q1, Q2), txt(290, 56, "q"), pt(Pp, "P", 8, 4), pt(S, "S", -20, -8)],
    targets: [X1, X2],
    steps: [
      { text: "Bod Q leží na kružnici se středem S, která prochází bodem P. Nástrojem „Nabrat délku“ klepni na S a P a narýsuj tuto kružnici.", draw: [circ(S, r)] },
      { text: "Bod Q leží také na přímce q. Kružnice protne přímku q ve dvou bodech a oba vyhovují.", draw: [pt(X1, "Q", -18, 14), pt(X2, "Q", 8, 18)] },
    ],
    odpoved: "Dva body — průsečíky přímky q s kružnicí se středem S procházející bodem P.",
    check: (t) => t.length === 2 && t.every((x) => near(dist(x, S), r, 1e-6) && onLine(x, Q1, Q2) < 1e-6) && dist(t[0], t[1]) > 100,
    _ops: [circ(S, r)],
  });
}
// 8) L2: čtvrtina úsečky půlením
{
  const A = P(35, 150), B = polar(A, 240, -3), S = mid(A, B), X = mid(A, S);
  const dir = unit(sub(B, A)), n = rot90(dir);
  const hS = Math.sqrt(150 * 150 - 120 * 120), P1 = add(S, mul(n, hS)), P2 = sub(S, mul(n, hS));
  const hX = Math.sqrt(90 * 90 - 60 * 60), R1 = add(X, mul(n, hX)), R2 = sub(X, mul(n, hX));
  T({
    id: "P5_RYS_20", podtema: "p5_cast_usecky", obtiznost: 2, radii: [{ label: "5 cm", r: 150 }, { label: "3 cm", r: 90 }],
    zadani: "Úsečka AB má 8 cm. Označ na úsečce AB bod X, který je od bodu A vzdálen čtvrtinu délky úsečky AB, tedy 2 cm.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [X],
    steps: [
      { text: "Čtvrtina je polovina z poloviny. Nejdřív najdi střed S úsečky AB: narýsuj kružnice se středy A a B a poloměrem 5 cm. Pravítkem spoj jejich průsečíky.", draw: [arcAt(A, 150, [P1, P2], 24), arcAt(B, 150, [P1, P2], 24), line(P1, P2), pt(S, "S", 8, -8)] },
      { text: "Teď najdi střed úsečky AS: narýsuj kružnice se středy A a S a poloměrem 3 cm (je to víc než polovina úsečky AS) a spoj jejich průsečíky.", draw: [arcAt(A, 90, [R1, R2], 24), arcAt(S, 90, [R1, R2], 24), line(R1, R2)] },
      { text: "Tato spojnice protne úsečku AB ve středu úsečky AS. To je hledaný bod X, od A vzdálený 2 cm.", draw: [pt(X, "X", 8, 18)] },
    ],
    odpoved: "Střed úsečky AS, kde S je střed úsečky AB.",
    check: (t) => t.length === 1 && dist(t[0], X) < 1e-9 && near(dist(A, t[0]), dist(A, B) / 4, 1e-6) && near(dot(sub(t[0], A), n), 0, 1e-6),
    _ops: [circ(A, 150), circ(B, 150), line(P1, P2), circ(A, 90), circ(S, 90), line(R1, R2)],
  });
}
// 9) L2: body na přímce q ve vzdálenosti 2 cm od přímky p
{
  const P1 = P(15, 140), P2 = P(315, 120), K0 = 100, d = unit(sub(P2, P1)), K = add(P1, mul(d, K0)), nrm = rot90(d);
  const Q1 = P(120, 10), Q2 = P(235, 240);
  const U1 = add(K, mul(nrm, 60)), U2 = sub(K, mul(nrm, 60));
  const X1 = cutLL(U1, add(U1, d), Q1, Q2), X2 = cutLL(U2, add(U2, d), Q1, Q2);
  T({
    id: "P5_RYS_21", podtema: "p5_vzdalenost", obtiznost: 2, radii: [{ label: "2 cm", r: 60 }],
    zadani: "Bod K leží na přímce p. Označ všechny body přímky q, které jsou od přímky p vzdáleny 2 cm.",
    given: [line(P1, P2), line(Q1, Q2), txt(296, 110, "p"), txt(244, 226, "q"), pt(K, "K", 8, 18)],
    targets: [X1, X2],
    steps: [
      { text: "Vzdálenost od přímky se měří po kolmici. Nástrojem „Pravý úhel“ klepni na přímku p a bod K — vznikne kolmice k p vedená bodem K.", draw: [line(sub(K, mul(nrm, 90)), add(K, mul(nrm, 90)))] },
      { text: "Kružnice se středem K a poloměrem 2 cm protne kolmici ve dvou bodech — jeden je nad přímkou p a druhý pod ní. Oba jsou od p vzdáleny 2 cm.", draw: [circ(K, 60)] },
      { text: "Těmito body veď rovnoběžky s přímkou p (nástroj „Rovnoběžka“). Všechny body na rovnoběžce jsou od p vzdáleny 2 cm.", draw: [line(U1, add(U1, d)), line(U2, add(U2, d))] },
      { text: "Rovnoběžky protnou přímku q ve dvou bodech. To jsou hledané body — oba označ.", draw: [pt(X1, "X", -16, -6), pt(X2, "Y", 8, 16)] },
    ],
    odpoved: "Dva body — průsečíky přímky q s rovnoběžkami k p vedenými ve vzdálenosti 2 cm na obě strany.",
    check: (t) => t.length === 2 && t.every((x) => onLine(x, Q1, Q2) < 1e-6 && near(onLine(x, P1, P2), 60, 1e-6)) && dist(t[0], t[1]) > 100,
    _ops: [line(sub(K, mul(nrm, 90)), add(K, mul(nrm, 90))), circ(K, 60), line(U1, add(U1, d)), line(U2, add(U2, d))],
  });
}
// 10) L2: rovnostranný trojúhelník — oba možné vrcholy C
{
  const A = P(100, 125), B = polar(A, 90, -5), [Ca, Cb] = cutCC(A, 90, B, 90).sort((a, b) => a.y - b.y);
  T({
    id: "P5_RYS_22", podtema: "trojuhelnik", obtiznost: 2, radii: [{ label: "3 cm", r: 90 }],
    zadani: "ABC je rovnostranný trojúhelník se stranou 3 cm. Body A a B jsou dány. Označ všechny možné vrcholy C.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [Ca, Cb],
    steps: [
      { text: "Bod C je od A vzdálen 3 cm a od B také 3 cm. Narýsuj kružnici se středem A a kružnici se středem B, obě s poloměrem 3 cm.", draw: [circ(A, 90), circ(B, 90)] },
      { text: "Kružnice se protnou ve dvou bodech — jednom nad úsečkou AB a jednom pod ní. Oba vyhovují, proto označ oba.", draw: [pt(Ca, "C", 8, -6), pt(Cb, "C", 8, 18)] },
    ],
    odpoved: "Dva body — oba průsečíky kružnic k(A; 3 cm) a l(B; 3 cm).",
    check: (t) => t.length === 2 && t.every((x) => near(dist(x, A), 90, 1e-3) && near(dist(x, B), 90, 1e-3)) && dist(t[0], t[1]) > 100 && near(dist(A, B), 90),
    _ops: [circ(A, 90), circ(B, 90)],
  });
}
// 11) L3: trojúhelník ABC — A na přímce a s AC ∥ b, B na přímce b a |AB| = |AC|
{
  const B1 = P(20, 210), B2 = P(310, 150), db = unit(sub(B2, B1)), C = P(235, 95);
  const A1 = P(80, 15), A2 = P(160, 235), A = cutLL(C, add(C, db), A1, A2), rAC = dist(A, C);
  const [Ba, Bb] = cutLC(A, rAC, B1, B2).sort((a, b) => a.x - b.x);
  T({
    id: "P5_RYS_23", podtema: "rovnobezka", obtiznost: 3, radii: [],
    zadani: "Bod C je vrchol trojúhelníku ABC. Vrchol A leží na přímce a, vrchol B na přímce b, strana AC je rovnoběžná s přímkou b a strany AB a AC jsou stejně dlouhé. Označ vrchol A a všechny možné vrcholy B.",
    given: [line(A1, A2), line(B1, B2), txt(172, 226, "a"), txt(290, 134, "b"), pt(C, "C", 8, -8)],
    targets: [A, Ba, Bb],
    steps: [
      { text: "Strana AC je rovnoběžná s přímkou b. Nástrojem „Rovnoběžka“ klepni na přímku b a bod C — vznikne přímka bodem C rovnoběžná s b.", draw: [line(C, add(C, db))] },
      { text: "Vrchol A leží na přímce a i na této rovnoběžce, takže je to jejich průsečík. Označ ho.", draw: [pt(A, "A", -16, -6)] },
      { text: "Strany AB a AC jsou stejně dlouhé. Nástrojem „Nabrat délku“ klepni na A a C a narýsuj kružnici se středem A.", draw: [arcAt(A, rAC, [Ba, Bb, C], 24)] },
      { text: "Vrchol B leží na přímce b. Kružnice ji protne ve dvou bodech a oba vyhovují, proto označ oba.", draw: [pt(Ba, "B", -6, 18), pt(Bb, "B", 8, 18)] },
    ],
    odpoved: "Vrchol A je průsečík přímky a s rovnoběžkou k b vedenou bodem C; vrcholy B jsou oba průsečíky přímky b s kružnicí se středem A a poloměrem |AC|.",
    check: (t) => t.length === 3 && dist(t[0], A) < 1e-9 && t.slice(1).every((x) => onLine(x, B1, B2) < 1e-6 && near(dist(x, A), rAC, 1e-6)) && dist(t[1], t[2]) > 100 && rAC > onLine(A, B1, B2),
    _ops: [line(C, add(C, db)), circ(A, rAC)],
  });
}
// 12) L3: čtverec dané středem S a vrcholem A
{
  const S = P(165, 130), A = polar(S, 90, 200), C = sub(mul(S, 2), A), n = rot90(unit(sub(C, A))), B = add(S, mul(n, 90)), D = sub(S, mul(n, 90));
  const lo = B.y > D.y ? B : D, hi = B.y > D.y ? D : B;
  T({
    id: "P5_RYS_24", podtema: "ctverec", obtiznost: 3, radii: [{ label: "3 cm", r: 90 }],
    zadani: "ABCD je čtverec. Bod S je průsečík jeho úhlopříček. Body A a S jsou dány. Označ vrcholy B, C a D.",
    given: [pt(A, "A", -16, -8), pt(S, "S", 8, 18)],
    targets: [C, lo, hi],
    steps: [
      { text: "Úhlopříčky čtverce se v bodě S půlí a jsou stejně dlouhé. Vrchol C leží na přímce AS na druhé straně od S. Pravítkem veď přímku AS a narýsuj kružnici se středem S a poloměrem 3 cm (prochází bodem A) — protne přímku AS v bodě C.", draw: [line(A, S), circ(S, 90), pt(C, "C", 8, -6)] },
      { text: "Úhlopříčky čtverce jsou na sebe kolmé. Nástrojem „Pravý úhel“ klepni na úsečku AC a pak na bod S — vznikne kolmice vedená bodem S.", draw: [line(sub(S, mul(n, 110)), add(S, mul(n, 110)))] },
      { text: "Kolmice protne tutéž kružnici ve dvou bodech. To jsou zbylé vrcholy B a D.", draw: [pt(hi, "B", 8, -6), pt(lo, "D", 8, 18)] },
    ],
    odpoved: "Vrchol C je druhý průsečík přímky AS s kružnicí se středem S; vrcholy B a D jsou průsečíky kolmice k AC vedené bodem S s toutéž kružnicí.",
    check: (t) => t.length === 3 && t.every((x) => near(dist(x, S), 90, 1e-6)) && dist(t.find((x) => dist(x, C) < 1), C) < 1e-9 && t.filter((x) => near(dot(sub(x, S), sub(C, A)), 0, 1e-4)).length === 2,
    _ops: [line(A, S), circ(S, 90), line(sub(S, mul(n, 110)), add(S, mul(n, 110)))],
  });
}
// 13) L3: body kružnice k stejně vzdálené od A a B
{
  const O = P(165, 125), R = 105, A = P(110, 70), B = P(215, 160), SA = mid(A, B), dAB = unit(sub(B, A)), nn = rot90(dAB);
  const ax1 = add(SA, mul(nn, 40)), ax2 = sub(SA, mul(nn, 40));
  const [X1, X2] = cutLC(O, R, ax1, ax2).sort((a, b) => a.y - b.y);
  const hh = Math.sqrt(120 * 120 - (dist(A, B) / 2) ** 2), R1 = add(SA, mul(nn, hh)), R2 = sub(SA, mul(nn, hh));
  T({
    id: "P5_RYS_25", podtema: "osa_usecky", obtiznost: 3, radii: [{ label: "4 cm", r: 120 }],
    zadani: "Označ všechny body kružnice k, které jsou stejně vzdálené od bodu A i od bodu B.",
    given: [circ(O, R), pt(A, "A", 8, 18), pt(B, "B", 8, 16), txt(268, 52, "k")],
    targets: [X1, X2],
    steps: [
      { text: "Body stejně vzdálené od A a B leží na ose úsečky AB. Narýsuj kružnice se středy A a B a poloměrem 4 cm (víc než polovina úsečky AB) a spoj jejich průsečíky — vznikne osa úsečky AB.", draw: [arcAt(A, 120, [R1, R2], 24), arcAt(B, 120, [R1, R2], 24), line(R1, R2)] },
      { text: "Hledané body musí ležet i na kružnici k. Osa ji protne ve dvou bodech a oba vyhovují — označ oba.", draw: [pt(X1, "X", 8, -8), pt(X2, "Y", 8, 18)] },
    ],
    odpoved: "Dva body — průsečíky osy úsečky AB s kružnicí k.",
    check: (t) => t.length === 2 && t.every((x) => near(dist(x, A), dist(x, B), 1e-6) && near(dist(x, O), R, 1e-6)) && dist(t[0], t[1]) > 100 && dist(A, B) / 2 < 120,
    _ops: [circ(A, 120), circ(B, 120), line(R1, R2)],
  });
}
// 14) L3: rovnostranný trojúhelník PQR — Q na přímce m a na kružnici k, R uvnitř k
let rovnostranny = null;
{
  const S = P(165, 125), R0 = 90;
  const angs = [];
  for (let a = 0; a < 360; a += 15) angs.push(a);
  search: for (let px = 30; px <= 300; px += 15) for (let py = 25; py <= 225; py += 15) {
    const Pp = P(px, py);
    if (Math.abs(dist(Pp, S) - R0) < 25) continue;
    for (const a of angs) for (const b of angs) {
      if (b <= a || b - a > 150 || b - a < 60) continue;
      const Q1 = polar(S, R0, a), Q2 = polar(S, R0, b);
      const res = [];
      let bad = false;
      for (const Q of [Q1, Q2]) {
        const rr = dist(Pp, Q);
        if (rr < 50 || rr > 210) { bad = true; break; }
        for (const Rr of cutCC(Pp, rr, Q, rr)) {
          const dS = dist(Rr, S);
          if (Math.abs(dS - R0) < 14) { bad = true; break; }
          if (dS < R0) res.push({ Q, R: Rr });
        }
        if (bad) break;
      }
      if (bad || res.length !== 1) continue;
      const { Q, R } = res[0];
      const others = [Q1, Q2];
      if (!inScene(Q, 14) || !inScene(R, 14) || !inScene(Pp, 14) || !others.every((o) => inScene(o, 14))) continue;
      if (dist(Pp, Q) < 70 || Math.abs(cross(sub(Q2, Q1), sub(Pp, Q1))) / dist(Q1, Q2) < 35) continue;
      rovnostranny = { S, R0, Pp, Q1, Q2, Q, R };
      break search;
    }
  }
}
if (!rovnostranny) throw new Error("nenalezena konfigurace pro úlohu 26");
{
  const { S, R0, Pp, Q1, Q2, Q, R } = rovnostranny, rr = dist(Pp, Q);
  const m1 = sub(Q1, mul(sub(Q2, Q1), 0.5)), m2 = add(Q2, mul(sub(Q2, Q1), 0.5));
  const cands = cutCC(Pp, rr, Q, rr);
  const dm = unit(sub(Q2, Q1)), tm = (30 - Q1.x) / dm.x, mLabel = P(40, Math.max(24, Math.min(236, Q1.y + dm.y * tm - 12)));
  T({
    id: "P5_RYS_26", podtema: "trojuhelnik", obtiznost: 3, radii: [],
    zadani: "Bod S je střed kružnice k. Bod P je vrchol rovnostranného trojúhelníku PQR. Vrchol Q leží na přímce m a zároveň na kružnici k, vrchol R leží uvnitř kružnice k. Označ vrcholy Q a R.",
    given: [circ(S, R0), line(m1, m2), pt(S, "S", 8, 18), pt(Pp, "P", 8, -8), txt(mLabel.x, mLabel.y, "m")],
    targets: [Q, R],
    steps: [
      { text: "Vrchol Q leží na přímce m i na kružnici k, takže je to jeden z jejich průsečíků. Průsečíky jsou dva, zatím oba označ nástrojem „Označit bod“ (zkusíš, který vyhovuje).", draw: [pt(Q1), pt(Q2)] },
      { text: "V rovnostranném trojúhelníku jsou všechny strany stejně dlouhé. Nástrojem „Nabrat délku“ klepni na P a Q a narýsuj kružnice se středy P a Q a tímto poloměrem. Jejich průsečíky jsou možné polohy vrcholu R.", draw: [arcAt(Pp, rr, cands, 24), arcAt(Q, rr, cands, 24)] },
      { text: "Pro jeden z bodů Q leží právě jeden průsečík R uvnitř kružnice k — to je řešení. Pro druhý bod Q leží oba průsečíky mimo kružnici k, ten nevyhovuje.", draw: [pt(Q, "Q", 8, -6), pt(R, "R", 8, 18)] },
    ],
    odpoved: "Q je ten průsečík přímky m s kružnicí k, pro který leží jeden z průsečíků kružnic k(P; |PQ|) a l(Q; |PQ|) uvnitř kružnice k; ten průsečík je vrchol R.",
    check: (t) => t.length === 2 && near(dist(t[0], S), R0, 1e-6) && onLine(t[0], Q1, Q2) < 1e-6 && near(dist(Pp, t[0]), dist(t[0], t[1]), 1e-6) && near(dist(Pp, t[1]), dist(Pp, t[0]), 1e-6) && dist(t[1], S) < R0,
    _ops: [circ(Pp, rr), circ(Q, rr)],
  });
}
// 15) L3: obdélník ABCD z úhlopříčky AC a strany AB = 3 cm
{
  const A = P(40, 160), C = polar(A, 150, -10), S = mid(A, C), r = dist(S, A), dd = unit(sub(C, A)), n = rot90(dd);
  const Bs = cutCC(S, r, A, 90), B = Bs.reduce((a, b) => (a.y < b.y ? a : b)), D = sub(mul(S, 2), B);
  const hS = Math.sqrt(120 * 120 - 75 * 75), Rr1 = add(S, mul(n, hS)), Rr2 = sub(S, mul(n, hS));
  T({
    id: "P5_RYS_27", podtema: "obdelnik", obtiznost: 3, radii: [{ label: "4 cm", r: 120 }, { label: "3 cm", r: 90 }],
    zadani: "ABCD je obdélník s úhlopříčkou AC. Body A a C jsou dány, |AC| = 5 cm a |AB| = 3 cm. Označ vrcholy B a D, vrchol B leží nad přímkou AC.",
    given: [seg(A, C, true), pt(A, "A", -14, 16), pt(C, "C", 6, 16)],
    targets: [B, D],
    steps: [
      { text: "Úhlopříčky obdélníku jsou stejně dlouhé a půlí se, takže všechny čtyři vrcholy leží na kružnici se středem ve středu S úsečky AC. Najdi S: kružnice se středy A a C a poloměrem 4 cm protni a průsečíky spoj pravítkem.", draw: [arcAt(A, 120, [Rr1, Rr2], 24), arcAt(C, 120, [Rr1, Rr2], 24), line(Rr1, Rr2), pt(S, "S", 8, 18)] },
      { text: "Narýsuj kružnici se středem S, která prochází body A a C (nástroj „Nabrat délku“ na S a A).", draw: [circ(S, r)] },
      { text: "Vrchol B je od A vzdálen 3 cm. Kružnice se středem A a poloměrem 3 cm protne tuto kružnici nad přímkou AC v bodě B.", draw: [circ(A, 90), pt(B, "B", 8, -6)] },
      { text: "Úhlopříčka BD prochází středem S. Veď přímku BS — protne kružnici podruhé v bodě D.", draw: [line(B, S), pt(D, "D", -16, 18)] },
    ],
    odpoved: "B je horní průsečík kružnic k(S; |SA|) a l(A; 3 cm); D je druhý průsečík přímky BS s kružnicí k.",
    check: (t) => t.length === 2 && (() => { const [b, d] = t[0].y < t[1].y ? t : [t[1], t[0]]; return near(dist(b, A), 90, 1e-6) && near(dot(sub(b, A), sub(b, C)), 0, 1e-4) && dist(d, sub(mul(S, 2), b)) < 1e-9 && near(dist(A, C), 150); })(),
    _ops: [circ(A, 120), circ(C, 120), line(Rr1, Rr2), circ(S, r), circ(A, 90), line(B, S)],
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
    givenPts(t.given).forEach((g) => ok(t.id + ` cíl ${i} leží na zadaném bodu`, dist(p, g) > 12, JSON.stringify(p)));
  });
  for (const s of t.steps) for (const e of s.draw) if (e.t === "point") ok(t.id + " bod postupu v obrázku", e.x >= 6 && e.x <= W - 6 && e.y >= 6 && e.y <= H - 6, `${e.label} ${e.x},${e.y}`);
  const givenShapes = t.given.flatMap((e) => (e.t === "polygon" ? e.pts.map((p, i) => ({ k: "seg", a: P(p[0], p[1]), b: P(e.pts[(i + 1) % e.pts.length][0], e.pts[(i + 1) % e.pts.length][1]) })) : [toShape(e)].filter(Boolean)));
  const ops = (t._ops ?? t.steps.flatMap((s) => s.draw)).map(toShape).filter(Boolean);
  const cands = [...givenPts(t.given), ...allIntersections([...givenShapes, ...ops])];
  targets.forEach((p, i) => ok(t.id + ` cíl ${i} sestrojitelný`, cands.some((q) => dist(p, q) < 1.5), JSON.stringify(p)));
  (t.radii ?? []).forEach((r) => ok(t.id + " poloměr " + r.label, Math.abs(r.r / CM - parseFloat(r.label.replace(",", "."))) < 1e-9, r.r));
  out.push({
    id: t.id, tema: "p5_rysovani", podtema: t.podtema, obtiznost: t.obtiznost,
    zadani: t.zadani, odpoved: t.odpoved,
    reseni_kroky: t.steps.map((s, i) => `${i + 1}. ${s.text}`),
    cas_sekund: 60 + 60 * t.obtiznost, sm2_interval: 1,
    konstrukce_scena: { width: W, height: H, cm: CM, given: t.given, ...(t.radii?.length ? { radii: t.radii } : {}), targets, tolerance: TOL, steps: t.steps },
  });
}
const ids = out.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && out.length === 15, out.length);
for (const e of out) {
  ok(e.id + " poznámka v řešení", !/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" ")));
}
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => out.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${out.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}), chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }
let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* žádná předchozí dávka */ }
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Rýsování, druhá dávka (15 úloh)` : "5. třída — Rýsování v aplikaci, druhá dávka: kolmice, rovnoběžka, průsečíky, trojúhelníky, obdélník a čtverec ze středu, všechna řešení (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...out] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${out.length} konstrukcí)`);
