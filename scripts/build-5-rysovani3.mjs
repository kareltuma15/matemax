// 5. třída, okruh „Rýsování", třetí dávka (P5_RYS_28–42): kolmice s kružítkem, průsečíky kružnic, rovnoběžník, kosočtverec, osová souměrnost trojúhelníku,
// části úsečky, čtverec z úhlopříčky, šestiúhelník v kružnici, body ve vzdálenosti od přímky a bodu, „najděte všechna řešení“.
// Styl podle úlohy 7 oficiálních testů CERMAT pro 5. třídu 2022–2026 (vlastní konstrukce a čísla, nic se nekopíruje).
// Spuštění: node scripts/build-5-rysovani3.mjs   (Node ≥ 23.6 — importuje TypeScript geometrii)
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

// 1) L1: kolmice v bodě A na přímce p a bod ve vzdálenosti 2 cm
{
  const P1 = P(15, 190), P2 = P(315, 170), d = unit(sub(P2, P1)), A = add(P1, mul(d, 150)), up = perpU(d), X = add(A, mul(up, 60));
  T({
    id: "P5_RYS_28", podtema: "kolmice", obtiznost: 1, radii: [{ label: "2 cm", r: 60 }],
    zadani: "Bod A leží na přímce p. Veď bodem A kolmici k přímce p a označ na ní bod X, který leží nad přímkou p a je od bodu A vzdálen 2 cm.",
    given: [line(P1, P2), txt(296, 168, "p"), pt(A, "A", 8, 18)],
    targets: [X],
    steps: [
      { text: "Nástrojem „Pravý úhel“ klepni na přímku p a pak na bod A — vznikne kolmice k přímce p vedená bodem A.", draw: [line(sub(A, mul(up, 40)), add(A, mul(up, 150))), rightMark(A, d, up)] },
      { text: "Bod X je od A vzdálen 2 cm. Narýsuj kružnici se středem A a poloměrem 2 cm; protne kolmici nad přímkou p v hledaném bodě X.", draw: [circ(A, 60), pt(X, "X", 8, -6)] },
    ],
    odpoved: "Průsečík kolmice k p vedené bodem A (nad přímkou p) s kružnicí se středem A a poloměrem 2 cm.",
    check: (t) => t.length === 1 && near(dist(t[0], A), 60, 1e-6) && near(dot(sub(t[0], A), sub(P2, P1)), 0, 1e-4) && t[0].y < A.y - 30,
    _ops: [line(sub(A, mul(up, 40)), add(A, mul(up, 150))), circ(A, 60)],
  });
}
// 2) L1: průsečíky dvou kružnic
{
  const S1 = P(115, 125), S2 = P(210, 125), R1 = 80, R2 = 75;
  const [X1, X2] = cutCC(S1, R1, S2, R2).sort((a, b) => a.y - b.y);
  T({
    id: "P5_RYS_29", podtema: "p5_pruseciky", obtiznost: 1, radii: [],
    zadani: "Kružnice k a l se protínají. Označ všechny body, které leží na obou kružnicích zároveň.",
    given: [circ(S1, R1), circ(S2, R2), pt(S1, "K", -18, 16), pt(S2, "L", 8, 16), txt(52, 60, "k"), txt(276, 60, "l")],
    targets: [X1, X2],
    steps: [
      { text: "Hledané body leží na kružnici k i na kružnici l, takže jsou to místa, kde se obě kružnice kříží. Jsou dvě.", draw: [] },
      { text: "Oba průsečíky označ nástrojem „Označit bod“. Obě řešení vyhovují.", draw: [pt(X1, "X", 8, -8), pt(X2, "Y", 8, 18)] },
    ],
    odpoved: "Dva body — průsečíky kružnic k a l.",
    check: (t) => t.length === 2 && t.every((x) => near(dist(x, S1), R1, 1e-6) && near(dist(x, S2), R2, 1e-6)) && dist(t[0], t[1]) > 100,
    _ops: [],
  });
}
// 3) L1: rovnoramenný pravoúhlý trojúhelník (pravý úhel u A, |AC| = |AB|)
{
  const A = P(70, 205), B = polar(A, 120, -8), up = perpU(unit(sub(B, A))), C = add(A, mul(up, 120));
  T({
    id: "P5_RYS_30", podtema: "trojuhelnik", obtiznost: 1, radii: [{ label: "4 cm", r: 120 }],
    zadani: "Trojúhelník ABC má pravý úhel u vrcholu A a |AC| = |AB|. Body A a B jsou dány, |AB| = 4 cm. Označ vrchol C, který leží nad úsečkou AB.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [C],
    steps: [
      { text: "Pravý úhel je u vrcholu A, takže strana AC je kolmá k AB. Nástrojem „Pravý úhel“ klepni na úsečku AB a pak na bod A — vznikne kolmice vedená bodem A.", draw: [line(sub(A, mul(up, 20)), add(A, mul(up, 200))), rightMark(A, unit(sub(B, A)), up)] },
      { text: "Strana AC je stejně dlouhá jako AB, tedy 4 cm. Kružnice se středem A a poloměrem 4 cm protne kolmici nad úsečkou AB v hledaném bodě C.", draw: [circ(A, 120), pt(C, "C", -16, -6)] },
    ],
    odpoved: "Průsečík kolmice k AB vedené bodem A (nad úsečkou) s kružnicí se středem A a poloměrem |AB| = 4 cm.",
    check: (t) => t.length === 1 && near(dist(t[0], A), 120, 1e-6) && near(dot(sub(t[0], A), sub(B, A)), 0, 1e-4) && t[0].y < A.y - 50 && near(dist(A, B), 120),
    _ops: [line(sub(A, mul(up, 20)), add(A, mul(up, 200))), circ(A, 120)],
  });
}
// 4) L1: protilehlý bod na kružnici (průměr)
{
  const S = P(165, 125), R0 = 85, A = polar(S, R0, 200), B = sub(mul(S, 2), A), dd = unit(sub(S, A));
  T({
    id: "P5_RYS_31", podtema: "kruznice", obtiznost: 1, radii: [],
    zadani: "Bod S je střed kružnice k a bod A leží na kružnici k. Označ na kružnici k bod B tak, aby úsečka AB byla průměr kružnice.",
    given: [circ(S, R0), pt(S, "S", 8, 18), pt(A, "A", -18, -4), txt(250, 52, "k")],
    targets: [B],
    steps: [
      { text: "Průměr kružnice prochází jejím středem. Pravítkem veď přímku bodem A a středem S.", draw: [line(sub(A, mul(dd, 20)), add(A, mul(dd, 220)))] },
      { text: "Přímka protne kružnici k podruhé na opačné straně od středu. To je hledaný bod B.", draw: [pt(B, "B", 8, -6)] },
    ],
    odpoved: "Druhý průsečík přímky AS s kružnicí k.",
    check: (t) => t.length === 1 && near(dist(t[0], S), R0, 1e-6) && dist(t[0], B) < 1e-9,
    _ops: [line(sub(A, mul(dd, 20)), add(A, mul(dd, 220)))],
  });
}
// 5) L2: rovnoběžník ABCD z bodů A, B, D
{
  const u = polar(P(0, 0), 1, -6), A = P(55, 200), B = add(A, mul(u, 150)), D = add(A, P(45, -80)), C = add(B, sub(D, A));
  T({
    id: "P5_RYS_32", podtema: "rovnobezka", obtiznost: 2, radii: [],
    zadani: "ABCD je rovnoběžník. Body A, B a D jsou dány. Označ vrchol C.",
    given: [seg(A, B), seg(A, D), pt(A, "A", -14, 16), pt(B, "B", 6, 16), pt(D, "D", -16, -6)],
    targets: [C],
    steps: [
      { text: "Protější strany rovnoběžníku jsou rovnoběžné. Nástrojem „Rovnoběžka“ klepni na úsečku AD a pak na bod B — vznikne přímka bodem B rovnoběžná s AD.", draw: [line(B, add(B, sub(D, A)))] },
      { text: "Stejně klepni na úsečku AB a pak na bod D — vznikne přímka bodem D rovnoběžná s AB.", draw: [line(D, add(D, sub(B, A)))] },
      { text: "Obě přímky se protnou ve vrcholu C. Označ ho nástrojem „Označit bod“.", draw: [pt(C, "C", 8, -6)] },
    ],
    odpoved: "Průsečík rovnoběžky s AD vedené bodem B a rovnoběžky s AB vedené bodem D.",
    check: (t) => t.length === 1 && dist(t[0], add(B, sub(D, A))) < 1e-9,
    _ops: [line(B, add(B, sub(D, A))), line(D, add(D, sub(B, A)))],
  });
}
// 6) L2: osová souměrnost — obraz trojúhelníku
{
  const p1 = P(150, 10), p2 = P(180, 240), A = P(55, 55), B = P(115, 115), C = P(60, 185);
  const refl = (X) => { const F = foot(X, p1, p2); return { F, X2: sub(mul(F, 2), X) }; };
  const ra = refl(A), rb = refl(B), rc = refl(C), dir = unit(sub(p2, p1));
  const perp = (X, r) => { const n = unit(sub(r.X2, X)); return line(sub(X, mul(n, 12)), add(r.X2, mul(n, 12))); };
  T({
    id: "P5_RYS_33", podtema: "soumernost", obtiznost: 2, radii: [],
    zadani: "Trojúhelník ABC leží vlevo od osy souměrnosti p. Označ vrcholy A', B' a C' trojúhelníku souměrného s trojúhelníkem ABC podle osy p.",
    given: [{ t: "polygon", pts: [[A.x, A.y], [B.x, B.y], [C.x, C.y]] }, line(p1, p2), txt(194, 28, "p"), pt(A, "A", -16, -6), pt(B, "B", 8, 16), pt(C, "C", -16, 16)],
    targets: [ra.X2, rb.X2, rc.X2],
    steps: [
      { text: "Souměrné body leží na kolmici k ose p a jsou od osy stejně daleko. Začni vrcholem A: nástrojem „Pravý úhel“ klepni na přímku p a pak na bod A — vznikne kolmice k p vedená bodem A.", draw: [perp(A, ra), rightMark(ra.F, dir, unit(sub(ra.X2, A)))] },
      { text: "Kolmice protne osu p v bodě F. Nástrojem „Nabrat délku“ klepni na A a F a narýsuj kružnici se středem F. Podruhé protne kolmici na druhé straně osy — to je bod A'.", draw: [pt(ra.F, "F", 6, -8), arcAt(ra.F, dist(A, ra.F), [A, ra.X2], 28), pt(ra.X2, "A'", 6, -8)] },
      { text: "Stejným postupem najdi bod B' (kolmice bodem B, kružnice se středem v patě kolmice).", draw: [perp(B, rb), arcAt(rb.F, dist(B, rb.F), [B, rb.X2], 28), pt(rb.X2, "B'", 6, -8)] },
      { text: "A nakonec bod C' (kolmice bodem C, kružnice se středem v patě kolmice). Všechny tři body označ.", draw: [perp(C, rc), arcAt(rc.F, dist(C, rc.F), [C, rc.X2], 28), pt(rc.X2, "C'", 6, -8)] },
    ],
    odpoved: "Body A', B' a C' — druhé průsečíky kolmic k ose p vedených vrcholy s kružnicemi se středy v patách kolmic.",
    check: (t) => t.length === 3 && [ra, rb, rc].every((r) => t.some((x) => dist(x, r.X2) < 1e-9)),
    _ops: [perp(A, ra), arcAt(ra.F, dist(A, ra.F), [A, ra.X2], 28), perp(B, rb), arcAt(rb.F, dist(B, rb.F), [B, rb.X2], 28), perp(C, rc), arcAt(rc.F, dist(C, rc.F), [C, rc.X2], 28)],
  });
}
// 7) L2: tři čtvrtiny úsečky
{
  const A = P(35, 150), B = polar(A, 240, -3), S = mid(A, B), X = mid(S, B);
  const dir = unit(sub(B, A)), n = rot90(dir);
  const hS = Math.sqrt(150 * 150 - 120 * 120), P1 = add(S, mul(n, hS)), P2 = sub(S, mul(n, hS));
  const hX = Math.sqrt(90 * 90 - 60 * 60), R1 = add(X, mul(n, hX)), R2 = sub(X, mul(n, hX));
  // R1, R2 jsou body osy úsečky SB — pro kružnice o středech S a B
  const Xm = mid(S, B), Q1 = add(Xm, mul(n, hX)), Q2 = sub(Xm, mul(n, hX));
  T({
    id: "P5_RYS_34", podtema: "p5_cast_usecky", obtiznost: 2, radii: [{ label: "5 cm", r: 150 }, { label: "3 cm", r: 90 }],
    zadani: "Úsečka AB má 8 cm. Označ na úsečce AB bod X, který je od bodu A vzdálen tři čtvrtiny délky úsečky AB, tedy 6 cm.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [X],
    steps: [
      { text: "Tři čtvrtiny jsou polovina plus čtvrtina. Nejdřív najdi střed S úsečky AB: narýsuj kružnice se středy A a B a poloměrem 5 cm. Pravítkem spoj jejich průsečíky.", draw: [arcAt(A, 150, [P1, P2], 24), arcAt(B, 150, [P1, P2], 24), line(P1, P2), pt(S, "S", 8, -8)] },
      { text: "Bod X je uprostřed mezi S a B (od A je to 4 cm + 2 cm). Najdi střed úsečky SB: narýsuj kružnice se středy S a B a poloměrem 3 cm (víc než polovina úsečky SB) a spoj jejich průsečíky.", draw: [arcAt(S, 90, [Q1, Q2], 24), arcAt(B, 90, [Q1, Q2], 24), line(Q1, Q2)] },
      { text: "Tato spojnice protne úsečku AB ve středu úsečky SB. To je hledaný bod X, od A vzdálený 6 cm.", draw: [pt(X, "X", 8, 18)] },
    ],
    odpoved: "Střed úsečky SB, kde S je střed úsečky AB.",
    check: (t) => t.length === 1 && dist(t[0], X) < 1e-9 && near(dist(A, t[0]), dist(A, B) * 3 / 4, 1e-6) && near(dot(sub(t[0], A), n), 0, 1e-6),
    _ops: [circ(A, 150), circ(B, 150), line(P1, P2), circ(S, 90), circ(B, 90), line(Q1, Q2)],
  });
}
// 8) L2: kosočtverec z úhlopříčky AC a strany 3 cm
{
  const A = P(75, 120), C = polar(A, 120, -4), [B1, B2] = cutCC(A, 90, C, 90).sort((a, b) => a.y - b.y);
  T({
    id: "P5_RYS_35", podtema: "kosoctverec", obtiznost: 2, radii: [{ label: "3 cm", r: 90 }],
    zadani: "ABCD je kosočtverec se stranou 3 cm. Body A a C jsou dány a úhlopříčka AC má 4 cm. Označ vrcholy B a D.",
    given: [seg(A, C, true), pt(A, "A", -14, 16), pt(C, "C", 6, 16)],
    targets: [B1, B2],
    steps: [
      { text: "Všechny strany kosočtverce jsou stejně dlouhé, 3 cm. Vrcholy B a D jsou od A vzdáleny 3 cm a od C také 3 cm. Narýsuj kružnici se středem A a kružnici se středem C, obě s poloměrem 3 cm.", draw: [circ(A, 90), circ(C, 90)] },
      { text: "Kružnice se protnou ve dvou bodech — jednom nad úsečkou AC a jednom pod ní. To jsou vrcholy B a D, oba je označ.", draw: [pt(B1, "B", 8, -6), pt(B2, "D", 8, 18)] },
    ],
    odpoved: "Dva body — oba průsečíky kružnic k(A; 3 cm) a l(C; 3 cm).",
    check: (t) => t.length === 2 && t.every((x) => near(dist(x, A), 90, 1e-6) && near(dist(x, C), 90, 1e-6)) && dist(t[0], t[1]) > 100 && near(dist(A, C), 120),
    _ops: [circ(A, 90), circ(C, 90)],
  });
}
// 9) L2: trojnásobek úsečky
{
  const A = P(30, 175), dir = unit(polar(P(0, 0), 1, -20)), B = add(A, mul(dir, 45)), C = add(A, mul(dir, 90)), X = add(A, mul(dir, 135));
  T({
    id: "P5_RYS_36", podtema: "p5_cast_usecky", obtiznost: 2, radii: [{ label: "1,5 cm", r: 45 }],
    zadani: "Úsečka AB má 1,5 cm. Označ na přímce AB bod X, který leží za bodem B a je od bodu A vzdálen třikrát víc než B, tedy 4,5 cm.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [X],
    steps: [
      { text: "Pravítkem veď přímku bodem A a B. Na ni budeš odměřovat.", draw: [line(A, add(A, mul(dir, 260)))] },
      { text: "Nástrojem „Nabrat délku“ klepni na A a B a narýsuj kružnici se středem B. Protne přímku za bodem B v bodě C — ten je od A vzdálen 2 · 1,5 = 3 cm.", draw: [circ(B, 45), pt(C, "C", 6, 16)] },
      { text: "Stejnou délku nanes ještě jednou: kružnice se středem C a poloměrem 1,5 cm protne přímku v hledaném bodě X, od A vzdáleném 3 · 1,5 = 4,5 cm.", draw: [circ(C, 45), pt(X, "X", 6, 16)] },
    ],
    odpoved: "Délka |AB| se nanese na přímku AB třikrát za sebou od bodu A; třetí bod je X.",
    check: (t) => t.length === 1 && dist(t[0], X) < 1e-9 && near(dist(A, t[0]), 3 * dist(A, B), 1e-6) && near(dot(sub(t[0], A), P(-dir.y, dir.x)), 0, 1e-6),
    _ops: [line(A, add(A, mul(dir, 260))), circ(B, 45), circ(C, 45)],
  });
}
// 10) L2: čtverec z úhlopříčky AC
{
  const A = P(55, 185), C = polar(A, 160, -35), S = mid(A, C), n = rot90(unit(sub(C, A))), B1 = add(S, mul(n, 80)), B2 = sub(S, mul(n, 80));
  const hh = Math.sqrt(90 * 90 - 80 * 80), R1 = add(S, mul(n, hh)), R2 = sub(S, mul(n, hh));
  const [Bt, Bb] = B1.y < B2.y ? [B1, B2] : [B2, B1];
  T({
    id: "P5_RYS_37", podtema: "ctverec", obtiznost: 2, radii: [{ label: "3 cm", r: 90 }],
    zadani: "ABCD je čtverec s úhlopříčkou AC. Body A a C jsou dány. Označ vrcholy B a D.",
    given: [seg(A, C, true), pt(A, "A", -14, 16), pt(C, "C", 6, -6)],
    targets: [Bt, Bb],
    steps: [
      { text: "Úhlopříčky čtverce se půlí a jsou na sebe kolmé. Najdi osu úsečky AC: narýsuj kružnice se středy A a C a poloměrem 3 cm (víc než polovina úsečky AC) a spoj jejich průsečíky.", draw: [arcAt(A, 90, [R1, R2], 24), arcAt(C, 90, [R1, R2], 24), line(R1, R2), pt(S, "S", 8, 18)] },
      { text: "Úhlopříčky jsou stejně dlouhé, takže B a D leží na kružnici se středem S, která prochází bodem A. Nástrojem „Nabrat délku“ klepni na S a A a narýsuj ji.", draw: [circ(S, 80)] },
      { text: "Kružnice protne osu úsečky AC ve dvou bodech. To jsou vrcholy B a D, oba je označ.", draw: [pt(Bt, "B", 8, -6), pt(Bb, "D", 8, 18)] },
    ],
    odpoved: "Průsečíky osy úsečky AC s kružnicí se středem ve středu S úsečky AC a poloměrem |SA|.",
    check: (t) => t.length === 2 && t.every((x) => near(dist(x, S), 80, 1e-6) && near(dist(x, A), dist(x, C), 1e-6)) && dist(t[0], t[1]) > 100,
    _ops: [circ(A, 90), circ(C, 90), line(R1, R2), circ(S, 80)],
  });
}
// 11) L3: body ve vzdálenosti 2 cm od přímky p a 3 cm od bodu A (čtyři řešení)
{
  const P1 = P(15, 150), P2 = P(315, 130), d = unit(sub(P2, P1)), nrm = rot90(d);
  const K = add(P1, mul(d, 60)), F0 = add(P1, mul(d, 150)), A = add(F0, mul(perpU(d), 24));
  const U1 = add(K, mul(nrm, 60)), U2 = sub(K, mul(nrm, 60));
  const pts = [U1, U2].flatMap((U) => cutLC(A, 90, U, add(U, d)));
  const sorted = pts.sort((a, b) => a.y - b.y || a.x - b.x);
  T({
    id: "P5_RYS_38", podtema: "p5_vzdalenost", obtiznost: 3, radii: [{ label: "2 cm", r: 60 }, { label: "3 cm", r: 90 }],
    zadani: "Bod K leží na přímce p, bod A na ní neleží. Označ všechny body, které jsou od přímky p vzdáleny 2 cm a od bodu A vzdáleny 3 cm.",
    given: [line(P1, P2), txt(296, 124, "p"), pt(K, "K", 8, 18), pt(A, "A", 8, -8)],
    targets: sorted,
    steps: [
      { text: "Body vzdálené 2 cm od přímky p leží na dvou rovnoběžkách s p, každá na jedné straně. Nástrojem „Pravý úhel“ klepni na přímku p a bod K a narýsuj kružnici se středem K a poloměrem 2 cm. Kolmici protne v bodech U a V.", draw: [line(sub(K, mul(nrm, 90)), add(K, mul(nrm, 90))), circ(K, 60)] },
      { text: "Bodem U a bodem V veď rovnoběžky s přímkou p (nástroj „Rovnoběžka“).", draw: [line(U1, add(U1, d)), line(U2, add(U2, d))] },
      { text: "Body vzdálené 3 cm od A leží na kružnici se středem A a poloměrem 3 cm. Narýsuj ji.", draw: [circ(A, 90)] },
      { text: "Kružnice protne každou rovnoběžku ve dvou bodech, dohromady jsou čtyři řešení. Všechny čtyři označ.", draw: sorted.map((x, i) => pt(x, "XYZW"[i], 8, -6)) },
    ],
    odpoved: "Čtyři body — průsečíky kružnice se středem A a poloměrem 3 cm s oběma rovnoběžkami k p ve vzdálenosti 2 cm.",
    check: (t) => t.length === 4 && t.every((x) => near(dist(x, A), 90, 1e-6) && near(onLine(x, P1, P2), 60, 1e-6)) && t.every((x, i) => t.every((y, j) => j <= i || dist(x, y) > 40)),
    _ops: [line(sub(K, mul(nrm, 90)), add(K, mul(nrm, 90))), circ(K, 60), line(U1, add(U1, d)), line(U2, add(U2, d)), circ(A, 90)],
  });
}
// 12) L3: pravidelný šestiúhelník vepsaný do kružnice
{
  const S = P(165, 125), R0 = 75, V = (k) => polar(S, R0, 180 + 60 * k), A = V(0), [B, C, D, E, F] = [1, 2, 3, 4, 5].map(V);
  T({
    id: "P5_RYS_39", podtema: "kruznice", obtiznost: 3, radii: [{ label: "2,5 cm", r: 75 }],
    zadani: "Bod S je střed kružnice k o poloměru 2,5 cm a bod A leží na kružnici k. Do kružnice k je vepsán pravidelný šestiúhelník ABCDEF. Označ jeho zbylé vrcholy B, C, D, E a F.",
    given: [circ(S, R0), pt(S, "S", 6, 18), pt(A, "A", -18, -4)],
    targets: [B, C, D, E, F],
    steps: [
      { text: "V pravidelném šestiúhelníku vepsaném do kružnice je každá strana stejně dlouhá jako poloměr. Nástrojem „Nabrat délku“ klepni na S a A a narýsuj kružnici se středem A. Protne kružnici k v bodech B a F.", draw: [circ(A, R0), pt(B, "B", -16, -6), pt(F, "F", -16, 16)] },
      { text: "Stejný poloměr nanes ještě třikrát po obvodu: kružnice se středem B protne k v bodě C, kružnice se středem F v bodě E a kružnice se středem C v bodě D.", draw: [circ(B, R0), circ(F, R0), circ(C, R0), pt(C, "C", 8, -8), pt(D, "D", 10, 4), pt(E, "E", 8, 18)] },
      { text: "Všech pět vrcholů označ nástrojem „Označit bod“.", draw: [] },
    ],
    odpoved: "Poloměr kružnice se nanese po obvodu pětkrát za sebou od bodu A: vrcholy B, C, D, E, F.",
    check: (t) => t.length === 5 && [B, C, D, E, F].every((v) => t.some((x) => dist(x, v) < 1e-6)),
    _ops: [circ(A, R0), circ(B, R0), circ(F, R0), circ(C, R0)],
  });
}
// 13) L3: kosočtverec ABCD ze strany AB = 3 cm a úhlopříčky AC = 4 cm
{
  const A = P(80, 190), B = add(A, mul(polar(P(0, 0), 1, -25), 90));
  const cs = cutCC(A, 120, B, 90), C = cross(sub(B, A), sub(cs[0], A)) < 0 ? cs[0] : cs[1], D = sub(add(A, C), B);
  T({
    id: "P5_RYS_40", podtema: "kosoctverec", obtiznost: 3, radii: [{ label: "4 cm", r: 120 }, { label: "3 cm", r: 90 }],
    zadani: "ABCD je kosočtverec se stranou 3 cm. Body A a B jsou dány a úhlopříčka AC má 4 cm. Označ vrcholy C a D, vrchol C leží nad přímkou AB.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 8, 8)],
    targets: [C, D],
    steps: [
      { text: "Vrchol C je od A vzdálen 4 cm (úhlopříčka AC) a od B vzdálen 3 cm (strana BC). Narýsuj kružnici se středem A a poloměrem 4 cm a kružnici se středem B a poloměrem 3 cm. Průsečík nad přímkou AB je vrchol C.", draw: [arcAt(A, 120, [C], 40), arcAt(B, 90, [C], 40), pt(C, "C", 8, -6)] },
      { text: "Vrchol D je od A vzdálen 3 cm (strana AD) a od C také 3 cm (strana CD). Narýsuj kružnice se středy A a C a poloměrem 3 cm. Jedním průsečíkem je B, druhý průsečík je hledaný vrchol D.", draw: [circ(A, 90), circ(C, 90), pt(D, "D", -16, -6)] },
    ],
    odpoved: "C je průsečík kružnic k(A; 4 cm) a l(B; 3 cm) nad přímkou AB; D je druhý průsečík kružnic se středy A a C a poloměrem 3 cm.",
    check: (t) => t.length === 2 && (() => { const [c, d] = dist(t[0], C) < dist(t[1], C) ? t : [t[1], t[0]]; return near(dist(c, A), 120, 1e-6) && near(dist(c, B), 90, 1e-6) && cross(sub(B, A), sub(c, A)) < 0 && dist(d, sub(add(A, c), B)) < 1e-9 && near(dist(A, B), 90); })(),
    _ops: [circ(A, 120), circ(B, 90), circ(A, 90), circ(C, 90)],
  });
}
// 14) L3: obdélník ABCD, dány A, B a střed M strany CD
{
  const u = polar(P(0, 0), 1, -6), up = perpU(u), A = P(50, 205), B = add(A, mul(u, 150)), D = add(A, mul(up, 110)), C = add(B, mul(up, 110)), M = mid(C, D);
  T({
    id: "P5_RYS_41", podtema: "obdelnik", obtiznost: 3, radii: [],
    zadani: "ABCD je obdélník. Bod M je střed strany CD. Body A, B a M jsou dány. Označ vrcholy C a D.",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16), pt(M, "M", 8, -8)],
    targets: [C, D],
    steps: [
      { text: "Strany AD a BC jsou kolmé k AB. Nástrojem „Pravý úhel“ klepni na úsečku AB a bod A, potom znovu na úsečku AB a bod B — vzniknou dvě rovnoběžné kolmice.", draw: [line(sub(A, mul(up, 20)), add(A, mul(up, 220))), line(sub(B, mul(up, 20)), add(B, mul(up, 220))), rightMark(A, u, up), rightMark(B, u, up)] },
      { text: "Strana CD je rovnoběžná s AB a prochází bodem M. Nástrojem „Rovnoběžka“ klepni na úsečku AB a bod M.", draw: [line(sub(M, mul(u, 120)), add(M, mul(u, 120)))] },
      { text: "Rovnoběžka protne kolmici z bodu A ve vrcholu D a kolmici z bodu B ve vrcholu C. Oba vrcholy označ.", draw: [pt(D, "D", -16, -6), pt(C, "C", 8, -6)] },
    ],
    odpoved: "D je průsečík kolmice k AB v bodě A s rovnoběžkou k AB vedenou bodem M; C je průsečík kolmice k AB v bodě B s toutéž rovnoběžkou.",
    check: (t) => t.length === 2 && (() => { const [c, d] = dist(t[0], C) < dist(t[1], C) ? t : [t[1], t[0]]; return dist(c, C) < 1e-9 && dist(d, D) < 1e-9 && dist(mid(c, d), M) < 1e-9; })(),
    _ops: [line(sub(A, mul(up, 20)), add(A, mul(up, 220))), line(sub(B, mul(up, 20)), add(B, mul(up, 220))), line(sub(M, mul(u, 120)), add(M, mul(u, 120)))],
  });
}
// 15) L3: rovnoramenný pravoúhlý trojúhelník ABX s přeponou AB (dvě řešení)
{
  const A = P(60, 150), B = polar(A, 150, -4), M = mid(A, B), n = rot90(unit(sub(B, A))), r = dist(A, M);
  const hh = Math.sqrt(120 * 120 - r * r), Q1 = add(M, mul(n, hh)), Q2 = sub(M, mul(n, hh));
  const X1 = add(M, mul(n, r)), X2 = sub(M, mul(n, r)), [Xt, Xb] = X1.y < X2.y ? [X1, X2] : [X2, X1];
  T({
    id: "P5_RYS_42", podtema: "osa_usecky", obtiznost: 3, radii: [{ label: "4 cm", r: 120 }],
    zadani: "Úsečka AB má 5 cm. Označ všechny body X, pro které je trojúhelník ABX rovnoramenný pravoúhlý trojúhelník s přeponou AB (pravý úhel je u vrcholu X).",
    given: [seg(A, B), pt(A, "A", -14, 16), pt(B, "B", 6, 16)],
    targets: [Xt, Xb],
    steps: [
      { text: "V rovnoramenném trojúhelníku ABX je |XA| = |XB|, takže X leží na ose úsečky AB. Narýsuj kružnice se středy A a B a poloměrem 4 cm a spoj jejich průsečíky. Osa protne AB ve středu M.", draw: [arcAt(A, 120, [Q1, Q2], 24), arcAt(B, 120, [Q1, Q2], 24), line(Q1, Q2), pt(M, "M", 8, 18)] },
      { text: "V rovnoramenném pravoúhlém trojúhelníku je výška k přeponě stejně dlouhá jako polovina přepony, tedy |MX| = |MA| = |MB|. Nástrojem „Nabrat délku“ klepni na M a A a narýsuj kružnici se středem M.", draw: [circ(M, r)] },
      { text: "Kružnice protne osu úsečky AB ve dvou bodech — jednom nad AB a jednom pod ní. Oba vyhovují, proto označ oba.", draw: [pt(Xt, "X", 8, -6), pt(Xb, "Y", 8, 18)] },
    ],
    odpoved: "Dva body — průsečíky osy úsečky AB s kružnicí se středem ve středu M úsečky AB a poloměrem |MA|.",
    check: (t) => t.length === 2 && t.every((x) => near(dist(x, A), dist(x, B), 1e-6) && near(dist(x, M), r, 1e-6) && near(dot(sub(x, A), sub(x, B)), 0, 1e-4)) && dist(t[0], t[1]) > 100,
    _ops: [circ(A, 120), circ(B, 120), line(Q1, Q2), circ(M, r)],
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
const nazev = others.length ? `${prev.nazev} + 5. třída: Rýsování, třetí dávka (15 úloh)` : "5. třída — Rýsování v aplikaci, třetí dávka: kolmice, průsečíky, rovnoběžník, kosočtverec, souměrnost, části úsečky, šestiúhelník, všechna řešení (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...out] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${out.length} konstrukcí)`);
