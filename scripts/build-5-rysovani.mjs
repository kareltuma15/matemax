// 5. třída, okruh „Rýsování" (P5_RYS_01–12): rýsování přímo v aplikaci (pravítko, kružítko, kolmice, rovnoběžka, označení bodu).
// Styl podle úlohy 7 oficiálních testů CERMAT pro 5. třídu (sestrojit vrcholy obdélníku, čtverce, trojúhelníku, střed úsečky, shodná vzdálenost).
// Spuštění: node scripts/build-5-rysovani.mjs   (Node ≥ 23.6 — importuje TypeScript geometrii)
// Pravidla jako build-konstrukce-dalsi.mjs: měřítko 30 px = 1 cm, pevné poloměry kružítka, správné body se počítají vzorcem a navíc
// MUSÍ ležet v průsečíku čar, které postup nakreslí (dá se k nim v aplikaci opravdu dojít).
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

// 1) L1: body na přímce p ve vzdálenosti 3 cm od bodu A na přímce
{
  const A0 = P(15, 140), B0 = P(315, 120), A = P(165, 130), dir = unit(sub(B0, A0));
  const X1 = add(A, mul(dir, 90)), X2 = sub(A, mul(dir, 90));
  T({
    id: "P5_RYS_01", podtema: "kruznice", obtiznost: 1, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Bod A leží na přímce p. Označ všechny body na přímce p, které jsou od bodu A vzdáleny 3 cm.",
    given: [line(A0, B0), txt(300, 108, "p"), pt(A, "A", 6, 18)],
    targets: [X1, X2],
    steps: [
      { text: "Body vzdálené 3 cm od bodu A leží na kružnici se středem A a poloměrem 3 cm. Nástrojem „Kružítko“ ji narýsuj.", draw: [circ(A, 90)] },
      { text: "Kružnice protne přímku p ve dvou bodech. Oba jsou od A vzdáleny 3 cm, takže vyhovují oba.", draw: [pt(X2, "X", -4, -10), pt(X1, "Y", 6, -10)] },
    ],
    odpoved: "Dva body — průsečíky přímky p s kružnicí se středem A a poloměrem 3 cm.",
    check: (t) => t.length === 2 && t.every((x) => near(dist(x, A), 90) && onLine(x, A0, B0) < 1e-6) && dist(t[0], t[1]) > 100,
    _ops: [circ(A, 90)],
  });
}
// 2) L1: obdélník ABCD — vrchol C
{
  const A = P(60, 180), B = P(210, 180), D = P(60, 90), C = sub(add(B, D), A);
  T({
    id: "P5_RYS_02", podtema: "obdelnik", obtiznost: 1, radii: [],
    zadani: "ABCD je obdélník. Body A, B a D jsou dány. Označ vrchol C.",
    given: [seg(A, B), seg(A, D), pt(A, "A", -14, 16), pt(B, "B", 6, 16), pt(D, "D", -16, -6)],
    targets: [C],
    steps: [
      { text: "Protější strany obdélníku jsou rovnoběžné. Nástrojem „Rovnoběžka“ vyber úsečku AB a klepni na bod D — vznikne přímka bodem D rovnoběžná s AB.", draw: [line(D, add(D, sub(B, A)))] },
      { text: "Stejně vyber úsečku AD a klepni na bod B — vznikne přímka bodem B rovnoběžná s AD.", draw: [line(B, add(B, sub(D, A)))] },
      { text: "Hledaný vrchol C je průsečík obou rovnoběžek.", draw: [pt(C, "C", 8, -6)] },
    ],
    odpoved: "Průsečík rovnoběžky s AB vedené bodem D a rovnoběžky s AD vedené bodem B.",
    check: (t) => dist(t[0], sub(add(B, D), A)) < 1e-9 && near(dot(sub(B, A), sub(D, A)), 0),
    _ops: [line(D, add(D, sub(B, A))), line(B, add(B, sub(D, A)))],
  });
}
// 3) L1: střed úsečky AB
{
  const A = P(100, 131), B = polar(A, 120, -6), S = mid(A, B);
  const dir = unit(sub(B, A)), n = rot90(dir), h = Math.sqrt(120 * 120 - 60 * 60);
  const P1 = add(S, mul(n, h)), P2 = sub(S, mul(n, h));
  T({
    id: "P5_RYS_03", podtema: "stred_usecky", obtiznost: 1, radii: [],
    zadani: "Označ střed úsečky AB.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [S],
    steps: [
      { text: "Nástrojem „Nabrat délku“ klepni na A a na B — kružítko se rozevře na délku úsečky AB. Klepni na bod A: narýsuje se kružnice se středem A.", draw: [arcAt(A, 120, [P1, P2], 24)] },
      { text: "Stejně narýsuj kružnici se středem B a stejným poloměrem. Obě kružnice se protnou ve dvou bodech nad a pod úsečkou.", draw: [arcAt(B, 120, [P1, P2], 24)] },
      { text: "Pravítkem spoj oba průsečíky. Spojnice protne úsečku AB přesně v jejím středu.", draw: [line(P1, P2), pt(S, "S", 8, -8)] },
    ],
    odpoved: "Průsečík úsečky AB se spojnicí průsečíků kružnic k(A; |AB|) a l(B; |AB|).",
    check: (t) => dist(t[0], mid(A, B)) < 1e-9,
    _ops: [arcAt(A, 120, [P1, P2], 24), arcAt(B, 120, [P1, P2], 24), line(P1, P2)],
  });
}
// 4) L2: čtverec ABCD — vrcholy C a D
{
  const A = P(55, 185), B = polar(A, 90, -8), n = mul(unit(rot90(unit(sub(B, A)))), -90);
  const D = add(A, n), C = add(B, n);
  T({
    id: "P5_RYS_04", podtema: "ctverec", obtiznost: 2, radii: [{ label: "3 cm", r: 90 }],
    zadani: "ABCD je čtverec. Body A a B jsou dány, strana AB má 3 cm. Označ vrcholy C a D.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [C, D],
    steps: [
      { text: "Strany čtverce jsou na sebe kolmé. Nástrojem „Pravý úhel“ klepni na úsečku AB a pak na bod A — vznikne kolmice k AB vedená bodem A. Totéž udělej pro bod B.", draw: [line(sub(A, mul(n, 0.2)), add(A, mul(n, 1.4))), line(sub(B, mul(n, 0.2)), add(B, mul(n, 1.4)))] },
      { text: "Všechny strany čtverce mají 3 cm. Kružnice se středem A a poloměrem 3 cm protne kolmici vedenou bodem A v bodě D.", draw: [circ(A, 90), pt(D, "D", -16, -6)] },
      { text: "Stejně kružnice se středem B a poloměrem 3 cm protne kolmici vedenou bodem B v bodě C.", draw: [circ(B, 90), pt(C, "C", 8, -6)] },
    ],
    odpoved: "Body C a D leží na kolmicích k AB vedených body B a A, ve vzdálenosti 3 cm od úsečky AB (na stejné straně).",
    check: (t) => t.length === 2 && (() => { const [c, d] = dist(t[0], B) < dist(t[1], B) ? t : [t[1], t[0]]; return near(dist(c, B), 90) && near(dist(d, A), 90) && near(dot(sub(c, B), sub(B, A)), 0) && near(dot(sub(d, A), sub(B, A)), 0) && dot(sub(c, B), sub(d, A)) > 0; })(),
    _ops: [line(sub(A, mul(n, 0.2)), add(A, mul(n, 1.4))), line(sub(B, mul(n, 0.2)), add(B, mul(n, 1.4))), circ(A, 90), circ(B, 90)],
  });
}
// 5) L2: všechna řešení — body na přímce p ve vzdálenosti 3 cm od bodu A mimo přímku
{
  const A0 = P(15, 185), B0 = P(315, 175), A = P(150, 125), dir = unit(sub(B0, A0));
  const F = foot(A, A0, B0), d = dist(A, F), hh = Math.sqrt(90 * 90 - d * d);
  const X1 = add(F, mul(dir, hh)), X2 = sub(F, mul(dir, hh));
  T({
    id: "P5_RYS_05", podtema: "kruznice", obtiznost: 2, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Bod A neleží na přímce p. Označ všechny body na přímce p, které jsou od bodu A vzdáleny 3 cm.",
    given: [line(A0, B0), txt(300, 163, "p"), pt(A, "A", 6, -10)],
    targets: [X1, X2],
    steps: [
      { text: "Body vzdálené 3 cm od bodu A leží na kružnici se středem A a poloměrem 3 cm. Nástrojem „Kružítko“ ji narýsuj.", draw: [circ(A, 90)] },
      { text: "Kružnice protne přímku p ve dvou bodech. Obě řešení vyhovují, proto označ oba body.", draw: [pt(X2, "X", -4, 18), pt(X1, "Y", 6, 18)] },
    ],
    odpoved: "Dva body — průsečíky přímky p s kružnicí se středem A a poloměrem 3 cm.",
    check: (t) => t.length === 2 && t.every((x) => near(dist(x, A), 90) && onLine(x, A0, B0) < 1e-6) && dist(t[0], t[1]) > 100 && d < 90,
    _ops: [circ(A, 90)],
  });
}
// 6) L2: rovnostranný trojúhelník — vrchol C nad úsečkou AB
{
  const A = P(70, 190), B = polar(A, 120, -4), C = polar(A, 120, -64);
  T({
    id: "P5_RYS_06", podtema: "trojuhelnik", obtiznost: 2, radii: [{ label: "4 cm", r: 120 }],
    zadani: "ABC je rovnostranný trojúhelník se stranou 4 cm. Body A a B jsou dány. Označ vrchol C, který leží nad úsečkou AB.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [C],
    steps: [
      { text: "Všechny strany rovnostranného trojúhelníku mají 4 cm. Bod C je od A vzdálen 4 cm a od B také 4 cm.", draw: [] },
      { text: "Narýsuj kružnici se středem A a poloměrem 4 cm a kružnici se středem B a stejným poloměrem. Protnou se ve dvou bodech, nad úsečkou AB leží hledaný bod C.", draw: [arcAt(A, 120, [C], 40), arcAt(B, 120, [C], 40), pt(C, "C", 8, -6)] },
    ],
    odpoved: "Horní průsečík kružnic k(A; 4 cm) a l(B; 4 cm).",
    check: (t) => near(dist(t[0], A), 120, 1e-3) && near(dist(t[0], B), 120, 1e-3) && t[0].y < A.y - 50 && near(dist(A, B), 120),
    _ops: [circ(A, 120), circ(B, 120)],
  });
}
// 7) L2: trojúhelník o stranách 3, 4 a 5 cm — vrchol C
{
  const A = P(60, 190), B = polar(A, 150, -3);
  const Cs = intersections({ k: "circ", c: A, r: 90 }, { k: "circ", c: B, r: 120 });
  const C = Cs.reduce((a, b) => (a.y < b.y ? a : b));
  T({
    id: "P5_RYS_07", podtema: "trojuhelnik", obtiznost: 2, radii: [{ label: "3 cm", r: 90 }, { label: "4 cm", r: 120 }],
    zadani: "Trojúhelník ABC má strany |AB| = 5 cm, |AC| = 3 cm a |BC| = 4 cm. Body A a B jsou dány. Označ vrchol C, který leží nad úsečkou AB.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [C],
    steps: [
      { text: "Bod C je od A vzdálen 3 cm, takže leží na kružnici se středem A a poloměrem 3 cm.", draw: [arcAt(A, 90, [C], 40)] },
      { text: "Bod C je od B vzdálen 4 cm, takže leží i na kružnici se středem B a poloměrem 4 cm.", draw: [arcAt(B, 120, [C], 40)] },
      { text: "Kružnice se protnou ve dvou bodech. Nad úsečkou AB leží hledaný vrchol C.", draw: [pt(C, "C", -4, -10)] },
    ],
    odpoved: "Horní průsečík kružnic k(A; 3 cm) a l(B; 4 cm).",
    check: (t) => near(dist(t[0], A), 90, 1e-3) && near(dist(t[0], B), 120, 1e-3) && t[0].y < A.y - 30,
    _ops: [circ(A, 90), circ(B, 120)],
  });
}
// 8) L2: osová souměrnost — obraz bodu A v souměrnosti podle přímky p
{
  const p1 = P(205, 12), p2 = P(195, 238), A = P(100, 88), F = foot(A, p1, p2);
  const A2 = sub(mul(F, 2), A), dir = unit(sub(p2, p1)), nA = unit(sub(A2, A)), r = dist(A, F);
  T({
    id: "P5_RYS_08", podtema: "soumernost", obtiznost: 2, radii: [],
    zadani: "Označ bod A', který je souměrný s bodem A podle osy souměrnosti p.",
    given: [line(p1, p2), txt(222, 28, "p"), pt(A, "A", -16, -6)],
    targets: [A2],
    steps: [
      { text: "Souměrné body leží na kolmici k ose p a jsou od osy stejně daleko. Nástrojem „Pravý úhel“ klepni na přímku p a pak na bod A — vznikne kolmice k p vedená bodem A.", draw: [line(sub(A, mul(nA, 30)), add(A, mul(nA, 250))), rightMark(F, dir, nA)] },
      { text: "Kolmice protne osu p v bodě F. Nástrojem „Nabrat délku“ klepni na A a F a narýsuj kružnici se středem F — vznikne kružnice, která prochází bodem A.", draw: [pt(F, "F", 6, -8), arcAt(F, r, [A, A2], 28)] },
      { text: "Kružnice protne kolmici podruhé na druhé straně osy. To je hledaný bod A'.", draw: [pt(A2, "A'", 6, -8)] },
    ],
    odpoved: "Druhý průsečík kolmice k p vedené bodem A s kružnicí se středem v patě kolmice a poloměrem |AF|.",
    check: (t) => near(dist(t[0], F), r, 1e-6) && onLine(t[0], A, F) < 1e-6 && dot(sub(t[0], F), sub(A, F)) < 0 && near(dot(sub(t[0], A), sub(p2, p1)), 0, 1e-4),
    _ops: [line(sub(A, mul(nA, 30)), add(A, mul(nA, 250))), arcAt(F, r, [A, A2], 28)],
  });
}
// 9) L2: obdélník 4 cm × 2 cm — vrcholy C a D
{
  const A = P(65, 175), B = polar(A, 120, -5), n = mul(unit(rot90(unit(sub(B, A)))), -60);
  const D = add(A, n), C = add(B, n);
  T({
    id: "P5_RYS_09", podtema: "obdelnik", obtiznost: 2, radii: [{ label: "2 cm", r: 60 }],
    zadani: "ABCD je obdélník se stranami |AB| = 4 cm a |AD| = 2 cm. Body A a B jsou dány a obdélník leží nad úsečkou AB. Označ vrcholy C a D.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [C, D],
    steps: [
      { text: "Strany obdélníku jsou na sebe kolmé. Nástrojem „Pravý úhel“ klepni na úsečku AB a pak na bod A, potom stejně na bod B — vzniknou dvě kolmice k AB.", draw: [line(sub(A, mul(n, 0.4)), add(A, mul(n, 2.6))), line(sub(B, mul(n, 0.4)), add(B, mul(n, 2.6)))] },
      { text: "Strana AD má 2 cm. Kružnice se středem A a poloměrem 2 cm protne kolmici vedenou bodem A v bodě D.", draw: [circ(A, 60), pt(D, "D", -16, -6)] },
      { text: "Stejně kružnice se středem B a poloměrem 2 cm protne kolmici vedenou bodem B v bodě C.", draw: [circ(B, 60), pt(C, "C", 8, -6)] },
    ],
    odpoved: "Body C a D leží na kolmicích k AB vedených body B a A, ve vzdálenosti 2 cm od úsečky AB (nad ní).",
    check: (t) => t.length === 2 && (() => { const [c, d] = dist(t[0], B) < dist(t[1], B) ? t : [t[1], t[0]]; return near(dist(c, B), 60) && near(dist(d, A), 60) && near(dot(sub(c, B), sub(B, A)), 0) && near(dot(sub(d, A), sub(B, A)), 0) && dot(sub(c, B), sub(d, A)) > 0 && c.y < B.y && d.y < A.y; })(),
    _ops: [line(sub(A, mul(n, 0.4)), add(A, mul(n, 2.6))), line(sub(B, mul(n, 0.4)), add(B, mul(n, 2.6))), circ(A, 60), circ(B, 60)],
  });
}
// 10) L3: bod X na přímce p stejně vzdálený od bodů A a B
{
  const A = P(150, 70), B = P(150, 190), Q1 = P(190, 230), Q2 = P(290, 30);
  const X = P(240, 130), h = Math.sqrt(90 * 90 - 60 * 60);
  const R1 = P(150 - h, 130), R2 = P(150 + h, 130);
  T({
    id: "P5_RYS_10", podtema: "osa_usecky", obtiznost: 3, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Označ bod X, který leží na přímce p a je stejně vzdálený od bodu A i od bodu B.",
    given: [line(Q1, Q2), txt(300, 24, "p"), pt(A, "A", 8, 4), pt(B, "B", 8, 4)],
    targets: [X],
    steps: [
      { text: "Body stejně vzdálené od A a B leží na ose úsečky AB. Narýsuj kružnici se středem A a poloměrem 3 cm a kružnici se středem B a stejným poloměrem.", draw: [circ(A, 90), circ(B, 90)] },
      { text: "Kružnice se protnou ve dvou bodech. Pravítkem je spoj — vznikne osa úsečky AB.", draw: [line(R1, R2)] },
      { text: "Osa úsečky AB protne přímku p v hledaném bodě X.", draw: [pt(X, "X", 8, -8)] },
    ],
    odpoved: "Průsečík přímky p s osou úsečky AB.",
    check: (t) => near(dist(t[0], A), dist(t[0], B), 1e-6) && onLine(t[0], Q1, Q2) < 1e-6,
    _ops: [circ(A, 90), circ(B, 90), line(R1, R2)],
  });
}
// 11) L3: rovnoramenný trojúhelník se základnou AB a výškou 3 cm — vrchol C
{
  const A = P(70, 150), B = polar(A, 120, -4), S = mid(A, B);
  const dir = unit(sub(B, A)), n = rot90(dir), h = Math.sqrt(90 * 90 - 60 * 60);
  const R1 = add(S, mul(n, h)), R2 = sub(S, mul(n, h));
  const C = sub(S, mul(n, 90));
  const up = R1.y < R2.y ? R1 : R2, dn = R1.y < R2.y ? R2 : R1;
  T({
    id: "P5_RYS_11", podtema: "trojuhelnik", obtiznost: 3, radii: [{ label: "3 cm", r: 90 }],
    zadani: "Rovnoramenný trojúhelník ABC má základnu AB a výšku 3 cm. Body A a B jsou dány. Označ vrchol C, který leží nad úsečkou AB.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [C],
    steps: [
      { text: "Vrchol C rovnoramenného trojúhelníku leží na ose základny AB. Narýsuj kružnici se středem A a poloměrem 3 cm a kružnici se středem B a stejným poloměrem. Pravítkem spoj jejich průsečíky — vznikne osa úsečky AB.", draw: [circ(A, 90), circ(B, 90), line(up, dn)] },
      { text: "Osa protne úsečku AB v jejím středu S. Označ ho nástrojem „Označit bod“.", draw: [pt(S, "S", 8, 16)] },
      { text: "Výška trojúhelníku je kolmá k základně a má 3 cm: kružnice se středem S a poloměrem 3 cm protne osu nad úsečkou AB v hledaném bodě C.", draw: [circ(S, 90), pt(C, "C", 8, -6)] },
    ],
    odpoved: "Horní průsečík osy úsečky AB s kružnicí se středem ve středu úsečky AB a poloměrem 3 cm.",
    check: (t) => dist(t[0], C) < 1e-9 && near(dist(t[0], A), dist(t[0], B), 1e-6) && t[0].y < S.y,
    _ops: [circ(A, 90), circ(B, 90), line(up, dn), circ(S, 90)],
  });
}
// 12) L3: čtverec dané úhlopříčky AC — vrcholy B a D
{
  const A = P(75, 135), C = polar(A, 120, -5), S = mid(A, C);
  const dir = unit(sub(C, A)), n = rot90(dir), h = Math.sqrt(90 * 90 - 60 * 60);
  const R1 = add(S, mul(n, h)), R2 = sub(S, mul(n, h));
  const D = add(S, mul(n, 60)), B = sub(S, mul(n, 60));
  T({
    id: "P5_RYS_12", podtema: "ctverec", obtiznost: 3, radii: [{ label: "3 cm", r: 90 }, { label: "2 cm", r: 60 }],
    zadani: "ABCD je čtverec, jehož úhlopříčka AC má 4 cm. Body A a C jsou dány. Označ zbylé dva vrcholy B a D.",
    given: [seg(A, C, true), pt(A, "A", -14, 16), pt(C, "C", 6, 16)],
    targets: [B, D],
    steps: [
      { text: "Úhlopříčky čtverce jsou na sebe kolmé a navzájem se půlí. Druhá úhlopříčka BD leží na ose úsečky AC. Narýsuj kružnice se středy A a C a poloměrem 3 cm a pravítkem spoj jejich průsečíky.", draw: [circ(A, 90), circ(C, 90), line(R1, R2)] },
      { text: "Osa protne úsečku AC v jejím středu S. Obě úhlopříčky jsou stejně dlouhé, takže S je od B i od D vzdálen 2 cm (polovina ze 4 cm).", draw: [pt(S, "S", 8, 16)] },
      { text: "Kružnice se středem S a poloměrem 2 cm protne osu ve dvou bodech. To jsou vrcholy B a D.", draw: [circ(S, 60), pt(D, "D", 8, -6), pt(B, "B", 8, 16)] },
    ],
    odpoved: "Dva průsečíky osy úsečky AC s kružnicí se středem ve středu úsečky AC a poloměrem 2 cm.",
    check: (t) => t.length === 2 && t.every((x) => near(dist(x, S), 60, 1e-6) && near(dot(sub(x, S), sub(C, A)), 0, 1e-4)) && dist(t[0], t[1]) > 100,
    _ops: [circ(A, 90), circ(C, 90), line(R1, R2), circ(S, 60)],
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
ok("unikátní id", new Set(ids).size === ids.length && out.length === 12, out.length);
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
const others = (prev.examples ?? []).filter((e) => !/^P5_RYS_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Rýsování (12 úloh)` : "5. třída — Rýsování v aplikaci: obdélník, čtverec, trojúhelník, střed a osa úsečky, souměrnost (12 úloh: L1 ×3, L2 ×6, L3 ×3)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...out] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${out.length} konstrukcí)`);
