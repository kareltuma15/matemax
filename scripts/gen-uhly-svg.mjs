// Generátor vlastních SVG obrázků k úhlům (CERMAT styl): public/obrazky/uhly/nove-*.svg
// Spuštění: node scripts/gen-uhly-svg.mjs
// Obrázky se kreslí ze souřadnic a velikosti úhlů se ZNOVU SPOČÍTAJÍ z nakreslených bodů — když popisek nesedí s obrázkem, skript skončí chybou.
// Obrázky jsou ILUSTRAČNÍ (neměřítkové); nekopírují žádný CERMAT obrázek.
import { NAVY, BLUE, f, text, line, makeWriter } from "./lib/svg.mjs";

const { write, written } = makeWriter("uhly");
const ACC = "#d9480f"; // hledaný úhel
const FILL = "#eef4fb";

// ── geometrie ──
const P = (x, y) => ({ x, y });
const sub = (a, b) => P(a.x - b.x, a.y - b.y);
const add = (a, b) => P(a.x + b.x, a.y + b.y);
const mul = (a, k) => P(a.x * k, a.y * k);
const len = (a) => Math.hypot(a.x, a.y);
const unit = (a) => mul(a, 1 / len(a));
const polar = (c, r, deg) => P(c.x + r * Math.cos((deg * Math.PI) / 180), c.y + r * Math.sin((deg * Math.PI) / 180));
/** Úhel ve vrcholu V mezi polopřímkami VA a VB ve stupních (0–180). */
export const ang = (V, A, B) => {
  const a = sub(A, V), b = sub(B, V);
  return (Math.acos((a.x * b.x + a.y * b.y) / (len(a) * len(b))) * 180) / Math.PI;
};
const near = (a, b, tol = 0.05) => Math.abs(a - b) < tol;
const must = (name, got, want, tol) => {
  if (!near(got, want, tol)) { console.error(`CHYBA obrázku ${name}: vyšlo ${got}, má být ${want}`); process.exit(1); }
};
const inter = (A, B, C, D) => {
  const r = sub(B, A), s = sub(D, C), d = r.x * s.y - r.y * s.x;
  const t = ((C.x - A.x) * s.y - (C.y - A.y) * s.x) / d;
  return add(A, mul(r, t));
};

/** Uniformně přeškáluje a vycentruje body (úhly se nemění). */
function fit(pts, W, H, m = 22) {
  const v = Object.values(pts);
  const x0 = Math.min(...v.map((p) => p.x)), x1 = Math.max(...v.map((p) => p.x));
  const y0 = Math.min(...v.map((p) => p.y)), y1 = Math.max(...v.map((p) => p.y));
  const s = Math.min((W - 2 * m) / (x1 - x0), (H - 2 * m) / (y1 - y0));
  const ox = (W - s * (x1 - x0)) / 2 - s * x0, oy = (H - s * (y1 - y0)) / 2 - s * y0;
  return Object.fromEntries(Object.entries(pts).map(([k, p]) => [k, P(p.x * s + ox, p.y * s + oy)]));
}

// ── kreslení ──
const L = (a, b, o = {}) => line(a.x, a.y, b.x, b.y, o);
const poly = (pts, o = {}) =>
  `  <polygon points="${pts.map((p) => `${f(p.x)},${f(p.y)}`).join(" ")}" fill="${o.fill ?? FILL}" stroke="${NAVY}" stroke-width="${o.w ?? 2.2}" stroke-linejoin="round"/>`;
const dot = (p, r = 3) => `  <circle cx="${f(p.x)}" cy="${f(p.y)}" r="${r}" fill="${NAVY}"/>`;
/** Popisek vrcholu mimo útvar (ve směru od středu c). */
const vlabel = (p, s, c, d = 15) => {
  const q = add(p, mul(unit(sub(p, c)), d));
  return text(q.x, q.y + 5, s, { size: 15, weight: 700, fill: NAVY });
};
/** Oblouk úhlu AVB s popiskem; hledaný úhel (s === "?") je oranžový. */
function angle(V, A, B, r, s, t = 0.5) {
  const a = unit(sub(A, V)), b = unit(sub(B, V));
  const S = add(V, mul(a, r)), E = add(V, mul(b, r));
  const sweep = a.x * b.y - a.y * b.x > 0 ? 1 : 0;
  const bis = unit(add(mul(a, 1 - t), mul(b, t)));
  const col = s === "?" ? ACC : BLUE;
  const lp = add(V, mul(bis, r + 13));
  const arc = `  <path d="M ${f(S.x)} ${f(S.y)} A ${r} ${r} 0 0 ${sweep} ${f(E.x)} ${f(E.y)}" fill="none" stroke="${col}" stroke-width="2"/>`;
  return arc + "\n" + text(lp.x, lp.y + 5, s, { size: s === "?" ? 17 : 13, weight: 800, fill: s === "?" ? ACC : NAVY });
}
/** Značky shodnosti úseček (n čárek uprostřed). */
function ticks(A, B, n) {
  const m = mul(add(A, B), 0.5), d = unit(sub(B, A)), nrm = P(-d.y, d.x);
  let out = "";
  for (let i = 0; i < n; i++) {
    const c = add(m, mul(d, (i - (n - 1) / 2) * 6));
    out += "\n" + L(add(c, mul(nrm, 6)), add(c, mul(nrm, -6)), { stroke: NAVY, w: 1.8 });
  }
  return out.trim();
}
const rightMark = (V, A, B, s = 9) => {
  const a = mul(unit(sub(A, V)), s), b = mul(unit(sub(B, V)), s);
  const p1 = add(V, a), p2 = add(add(V, a), b), p3 = add(V, b);
  return `  <polyline points="${[p1, p2, p3].map((p) => `${f(p.x)},${f(p.y)}`).join(" ")}" fill="none" stroke="${BLUE}" stroke-width="1.8"/>`;
};
const dashed = (a, b, c = BLUE) => L(a, b, { stroke: c, w: 1.8, dash: "6 4" });
const centroid = (pts) => P(pts.reduce((s, p) => s + p.x, 0) / pts.length, pts.reduce((s, p) => s + p.y, 0) / pts.length);

// ───────────── 1) pravidelný šestiúhelník (L1) ─────────────
{
  const c = P(0, 0), R = 100;
  const v = [0, 60, 120, 180, 240, 300].map((d) => polar(c, R, d));
  const p = fit(Object.fromEntries(v.map((q, i) => ["V" + i, q])), 230, 200, 26);
  const q = v.map((_, i) => p["V" + i]);
  must("šestiúhelník", ang(q[0], q[1], q[5]), 120);
  write("nove-sestiuhelnik.svg", 230, 200, [
    poly(q), angle(q[0], q[1], q[5], 24, "?"),
  ].join("\n"), "Pravidelný šestiúhelník s vyznačeným vnitřním úhlem");
}

// ───────────── 2) deltoid (L2) ─────────────
{
  const a = 100, A = P(0, 0);
  const B = add(A, P(-a * Math.sin(35 * Math.PI / 180), a * Math.cos(35 * Math.PI / 180)));
  const D = add(A, P(a * Math.sin(35 * Math.PI / 180), a * Math.cos(35 * Math.PI / 180)));
  const c = (a * Math.sin(35 * Math.PI / 180)) / Math.sin(25 * Math.PI / 180);
  const C = add(B, P(c * Math.sin(25 * Math.PI / 180), c * Math.cos(25 * Math.PI / 180)));
  const p = fit({ A, B, C, D }, 260, 250, 30);
  must("deltoid A", ang(p.A, p.B, p.D), 70); must("deltoid C", ang(p.C, p.B, p.D), 50);
  must("deltoid AB=AD", len(sub(p.A, p.B)), len(sub(p.A, p.D)), 0.01); must("deltoid CB=CD", len(sub(p.C, p.B)), len(sub(p.C, p.D)), 0.01);
  const cen = centroid([p.A, p.B, p.C, p.D]);
  write("nove-deltoid.svg", 260, 250, [
    poly([p.A, p.B, p.C, p.D]),
    ticks(p.A, p.B, 1), ticks(p.A, p.D, 1), ticks(p.C, p.B, 2), ticks(p.C, p.D, 2),
    angle(p.A, p.B, p.D, 30, "70°"), angle(p.C, p.B, p.D, 34, "50°"), angle(p.B, p.A, p.C, 24, "?"),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen), vlabel(p.D, "D", cen),
  ].join("\n"), "Deltoid ABCD: AB = AD, CB = CD, úhel u A je 70°, úhel u C je 50°, hledaný úhel u B");
}

// ───────────── 3) rovnoramenný lichoběžník (L2) ─────────────
{
  const A = P(0, 0), B = P(200, 0), l = 90, t = (68 * Math.PI) / 180;
  const D = P(l * Math.cos(t), -l * Math.sin(t)), C = P(200 - l * Math.cos(t), -l * Math.sin(t));
  const p = fit({ A, B, C, D }, 270, 170, 30);
  must("lichoběžník A", ang(p.A, p.B, p.D), 68); must("lichoběžník B", ang(p.B, p.A, p.C), 68);
  must("lichoběžník ramena", len(sub(p.A, p.D)), len(sub(p.B, p.C)), 0.01);
  const cen = centroid([p.A, p.B, p.C, p.D]);
  write("nove-lichobeznik.svg", 270, 170, [
    poly([p.A, p.B, p.C, p.D]), ticks(p.A, p.D, 1), ticks(p.B, p.C, 1),
    angle(p.A, p.B, p.D, 28, "68°"), angle(p.D, p.A, p.C, 26, "?"),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen), vlabel(p.D, "D", cen),
  ].join("\n"), "Rovnoramenný lichoběžník ABCD se základnami AB a CD; úhel u A je 68°, hledaný úhel u D");
}

// ───────────── 4) rovnoběžky a lomená čára AXB (L2) ─────────────
{
  const W = 300, H = 170, yp = 45, yq = 135;
  const X = P(205, 90), a = (35 * Math.PI) / 180, b = (50 * Math.PI) / 180;
  const A = P(X.x - (yq - yp) / 2 / Math.tan(a), yp);
  const B = P(X.x - (yq - yp) / 2 / Math.tan(b), yq);
  must("zigzag A", ang(A, P(A.x + 10, A.y), X), 35); must("zigzag B", ang(B, P(B.x + 10, B.y), X), 50);
  must("zigzag AXB", ang(X, A, B), 85);
  write("nove-lomena-cara.svg", W, H, [
    L(P(14, yp), P(W - 14, yp), { w: 2.2 }), L(P(14, yq), P(W - 14, yq), { w: 2.2 }),
    text(W - 24, yp - 8, "p", { size: 15, weight: 700, fill: NAVY, italic: true }), text(W - 24, yq - 8, "q", { size: 15, weight: 700, fill: NAVY, italic: true }),
    L(A, X, { w: 2.2 }), L(X, B, { w: 2.2 }),
    angle(A, P(A.x + 40, A.y), X, 26, "35°", 0.3), angle(B, P(B.x + 40, B.y), X, 26, "50°", 0.3), angle(X, A, B, 22, "?"),
    dot(A), dot(X), dot(B),
    text(A.x - 12, A.y - 10, "A", { size: 15, weight: 700, fill: NAVY }), text(X.x + 14, X.y + 5, "X", { size: 15, weight: 700, fill: NAVY }), text(B.x - 12, B.y + 20, "B", { size: 15, weight: 700, fill: NAVY }),
  ].join("\n"), "Rovnoběžky p a q, bod X mezi nimi; úhly 35° u bodu A a 50° u bodu B, hledaný úhel AXB");
}

// ───────────── 5) trojúhelník s osou úhlu při C (ano/ne) ─────────────
{
  const al = (50 * Math.PI) / 180, be = (70 * Math.PI) / 180, ga = Math.PI - al - be;
  const A = P(0, 0), c = 180, b = (c * Math.sin(be)) / Math.sin(ga), a = (c * Math.sin(al)) / Math.sin(ga);
  const B = P(c, 0), C = P(b * Math.cos(al), -b * Math.sin(al));
  const D = add(A, mul(sub(B, A), b / (a + b)));
  const p = fit({ A, B, C, D }, 280, 200, 30);
  must("tr A", ang(p.A, p.B, p.C), 50); must("tr B", ang(p.B, p.A, p.C), 70);
  must("osa C", ang(p.C, p.A, p.D), 30); must("osa C2", ang(p.C, p.B, p.D), 30);
  const cen = centroid([p.A, p.B, p.C]);
  write("nove-trojuhelnik-osa.svg", 280, 200, [
    poly([p.A, p.B, p.C]), dashed(p.C, p.D),
    angle(p.A, p.B, p.C, 30, "50°"), angle(p.B, p.A, p.C, 28, "70°"),
    dot(p.D, 2.6),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen),
    text(p.D.x, p.D.y + 21, "D", { size: 15, weight: 700, fill: NAVY }),
  ].join("\n"), "Trojúhelník ABC s úhly α = 50° a β = 70°; přerušovaná osa úhlu při vrcholu C protíná stranu AB v bodě D");
}

// ───────────── 6) osy úhlů při A a B, střed I (L3) ─────────────
{
  const al = (52 * Math.PI) / 180, be = (64 * Math.PI) / 180, ga = Math.PI - al - be;
  const A = P(0, 0), c = 200, b = (c * Math.sin(be)) / Math.sin(ga), a = (c * Math.sin(al)) / Math.sin(ga);
  const B = P(c, 0), C = P(b * Math.cos(al), -b * Math.sin(al));
  const I = P((a * A.x + b * B.x + c * C.x) / (a + b + c), (a * A.y + b * B.y + c * C.y) / (a + b + c));
  const p = fit({ A, B, C, I }, 290, 210, 30);
  must("osy A", ang(p.A, p.B, p.C), 52); must("osy B", ang(p.B, p.A, p.C), 64);
  must("osy I-A", ang(p.A, p.B, p.I), 26); must("osy I-B", ang(p.B, p.A, p.I), 32); must("AIB", ang(p.I, p.A, p.B), 122);
  const cen = centroid([p.A, p.B, p.C]);
  write("nove-osy-uhlu.svg", 290, 210, [
    poly([p.A, p.B, p.C]), dashed(p.A, p.I), dashed(p.B, p.I),
    angle(p.A, p.B, p.C, 34, "52°", 0.75), angle(p.B, p.A, p.C, 32, "64°", 0.62), angle(p.I, p.A, p.B, 20, "?"),
    dot(p.I, 2.8),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen),
    text(p.I.x + 4, p.I.y - 28, "I", { size: 15, weight: 700, fill: NAVY }),
  ].join("\n"), "Trojúhelník ABC s úhly 52° a 64°; osy úhlů při vrcholech A a B se protínají v bodě I; hledaný úhel AIB");
}

// ───────────── 7) kružnice se středem S (L3) ─────────────
{
  const S = P(0, 0), R = 100;
  const A = polar(S, R, 200), B = polar(S, R, 330), C = polar(S, R, 80);
  const p = fit({ A, B, C, S, n: P(-R, -R), s: P(R, R) }, 290, 270, 24);
  must("S: SAB", ang(p.A, p.S, p.B), 25); must("S: SBC", ang(p.B, p.S, p.C), 35); must("S: SCA", ang(p.C, p.S, p.A), 30);
  must("S: ACB", ang(p.C, p.A, p.B), 65);
  const r = len(sub(p.A, p.S));
  write("nove-kruznice-opsana.svg", 290, 270, [
    `  <circle cx="${f(p.S.x)}" cy="${f(p.S.y)}" r="${f(r)}" fill="#ffffff" stroke="${BLUE}" stroke-width="1.6"/>`,
    poly([p.A, p.B, p.C], { fill: FILL }),
    dashed(p.S, p.A), dashed(p.S, p.B), dashed(p.S, p.C),
    angle(p.A, p.S, p.B, 30, "25°"), angle(p.B, p.S, p.C, 30, "35°"), angle(p.C, p.A, p.B, 26, "?"),
    dot(p.S, 3),
    text(p.S.x + 12, p.S.y + 18, "S", { size: 15, weight: 700, fill: NAVY }),
    vlabel(p.A, "A", p.S), vlabel(p.B, "B", p.S), vlabel(p.C, "C", p.S),
  ].join("\n"), "Kružnice se středem S, trojúhelník ABC vepsaný do kružnice; úhel SAB je 25°, úhel SBC je 35°, hledaný úhel ACB");
}

// ───────────── 8) pravidelný šestiúhelník ABCDEF s úhlopříčkami AC, AE (L3) ─────────────
{
  const c = P(0, 0), R = 100;
  const v = [180, 240, 300, 0, 60, 120].map((d) => polar(c, R, d));
  const names = ["A", "B", "C", "D", "E", "F"];
  const p = fit(Object.fromEntries(v.map((q, i) => [names[i], q])), 280, 230, 34);
  must("6: BAC", ang(p.A, p.B, p.C), 30); must("6: CAE", ang(p.A, p.C, p.E), 60);
  const cen = centroid(Object.values(p));
  write("nove-sestiuhelnik-uhlopricky.svg", 280, 230, [
    poly(names.map((n) => p[n])), L(p.A, p.C, { stroke: BLUE, w: 2 }), L(p.A, p.E, { stroke: BLUE, w: 2 }),
    angle(p.A, p.C, p.E, 34, "?"),
    ...names.map((n) => vlabel(p[n], n, cen)),
  ].join("\n"), "Pravidelný šestiúhelník ABCDEF s úhlopříčkami AC a AE; hledaný úhel CAE");
}

// ───────────── 9) výška a osa úhlu při C (L3) ─────────────
{
  const al = (48 * Math.PI) / 180, be = (72 * Math.PI) / 180, ga = Math.PI - al - be;
  const A = P(0, 0), c = 220, b = (c * Math.sin(be)) / Math.sin(ga), a = (c * Math.sin(al)) / Math.sin(ga);
  const B = P(c, 0), C = P(b * Math.cos(al), -b * Math.sin(al));
  const V = P(C.x, 0), D = add(A, mul(sub(B, A), b / (a + b)));
  const p = fit({ A, B, C, V, D }, 300, 230, 32);
  must("vo A", ang(p.A, p.B, p.C), 48); must("vo B", ang(p.B, p.A, p.C), 72);
  must("vo V", ang(p.V, p.C, p.A), 90); must("vo VCD", ang(p.C, p.V, p.D), 12);
  const cen = centroid([p.A, p.B, p.C]);
  write("nove-vyska-osa.svg", 300, 230, [
    poly([p.A, p.B, p.C]), dashed(p.C, p.V), dashed(p.C, p.D), rightMark(p.V, p.C, p.B),
    angle(p.A, p.B, p.C, 34, "48°"), angle(p.B, p.A, p.C, 32, "72°"), angle(p.C, p.V, p.D, 70, "?"),
    dot(p.V, 2.4), dot(p.D, 2.4),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen),
    text(p.V.x - 1, p.V.y + 22, "V", { size: 15, weight: 700, fill: NAVY }), text(p.D.x + 3, p.D.y + 22, "D", { size: 15, weight: 700, fill: NAVY }),
  ].join("\n"), "Trojúhelník ABC s úhly 48° a 72°; výška CV a osa úhlu CD; hledaný úhel VCD");
}

// ───────────── 10) rovnoramenný trojúhelník s bodem D (L3) ─────────────
{
  const A = P(0, 0), Ls = 200, h = (18 * Math.PI) / 180;
  const B = P(-Ls * Math.sin(h), Ls * Math.cos(h)), C = P(Ls * Math.sin(h), Ls * Math.cos(h));
  const bc = len(sub(C, B)), D = add(A, mul(unit(sub(C, A)), bc));
  const p = fit({ A, B, C, D }, 250, 250, 30);
  must("zl BD=BC", len(sub(p.B, p.D)), len(sub(p.B, p.C)), 0.01); must("zl AD=BD", len(sub(p.A, p.D)), len(sub(p.B, p.D)), 0.01);
  must("zl AB=AC", len(sub(p.A, p.B)), len(sub(p.A, p.C)), 0.01); must("zl A", ang(p.A, p.B, p.C), 36);
  const cen = centroid([p.A, p.B, p.C]);
  write("nove-rovnoramenny-bod-d.svg", 250, 250, [
    poly([p.A, p.B, p.C]), L(p.B, p.D, { stroke: NAVY, w: 2.2 }),
    ticks(p.A, p.D, 1), ticks(p.B, p.D, 1), ticks(p.B, p.C, 1),
    angle(p.A, p.B, p.C, 36, "?"),
    dot(p.D, 2.8),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen),
    text(p.D.x + 15, p.D.y + 4, "D", { size: 15, weight: 700, fill: NAVY }),
  ].join("\n"), "Rovnoramenný trojúhelník ABC se základnou BC a bodem D na straně AC; úseky AD, BD a BC jsou shodné; hledaný úhel u vrcholu A");
}

// ───────────── 11) rovnoběžník s osou úhlu při A (L3) ─────────────
{
  const t = (70 * Math.PI) / 180, A = P(0, 0), B = P(100, 0), AD = 140;
  const D = P(AD * Math.cos(t), -AD * Math.sin(t)), C = add(D, P(100, 0));
  const E = add(B, mul(unit(sub(C, B)), 100));
  const p = fit({ A, B, C, D, E }, 270, 230, 30);
  must("rb A", ang(p.A, p.B, p.D), 70); must("rb DAE", ang(p.A, p.D, p.E), 35); must("rb AEB", ang(p.E, p.A, p.B), 35);
  must("rb AEC", ang(p.E, p.A, p.C), 145);
  const cen = centroid([p.A, p.B, p.C, p.D]);
  write("nove-rovnobeznik-osa.svg", 270, 230, [
    poly([p.A, p.B, p.C, p.D]), dashed(p.A, p.E),
    angle(p.A, p.B, p.D, 30, "70°", 0.25), angle(p.E, p.A, p.C, 22, "?"),
    dot(p.E, 2.6),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen), vlabel(p.D, "D", cen),
    text(p.E.x + 16, p.E.y + 5, "E", { size: 15, weight: 700, fill: NAVY }),
  ].join("\n"), "Rovnoběžník ABCD s úhlem 70° u vrcholu A; osa úhlu při A protíná stranu BC v bodě E; hledaný úhel AEC");
}

// ───────────── 12) osy jednostranných úhlů u rovnoběžek (L3) ─────────────
{
  const W = 300, H = 190, yp = 40, yq = 150, t = (70 * Math.PI) / 180;
  const A = P(110, yp), B = P(110 + (yq - yp) / Math.tan(t), yq);
  const dA = P(Math.cos(t / 2), Math.sin(t / 2));
  const dB = P(Math.cos((Math.PI - t) / 2), -Math.sin((Math.PI - t) / 2));
  const O = inter(A, add(A, dA), B, add(B, dB));
  must("os A", ang(A, P(A.x + 10, A.y), B), 70); must("os B", ang(B, A, P(B.x + 10, B.y)), 110);
  must("AOB", ang(O, A, B), 90);
  write("nove-rovnobezky-osy.svg", W, H, [
    L(P(14, yp), P(W - 14, yp), { w: 2.2 }), L(P(14, yq), P(W - 14, yq), { w: 2.2 }),
    text(W - 24, yp - 8, "p", { size: 15, weight: 700, fill: NAVY, italic: true }), text(W - 24, yq - 8, "q", { size: 15, weight: 700, fill: NAVY, italic: true }),
    L(add(A, mul(unit(sub(A, B)), 26)), add(B, mul(unit(sub(B, A)), 26)), { w: 2.2 }),
    dashed(A, O), dashed(B, O),
    angle(A, P(A.x + 40, A.y), B, 26, "70°", 0.25), angle(O, A, B, 20, "?"),
    dot(A), dot(B), dot(O, 3),
    text(A.x + 14, A.y - 9, "A", { size: 15, weight: 700, fill: NAVY }), text(B.x - 14, B.y + 20, "B", { size: 15, weight: 700, fill: NAVY }),
    text(O.x + 14, O.y + 5, "O", { size: 15, weight: 700, fill: NAVY }),
  ].join("\n"), "Rovnoběžky p a q protnuté příčkou AB; úhel 70° u bodu A; osy úhlů na téže straně příčky se protínají v bodě O; hledaný úhel AOB");
}

// ───────────── 13) pravidelný osmiúhelník (L2) ─────────────
{
  const c = P(0, 0), R = 100;
  const names = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const v = names.map((_, i) => polar(c, R, 202.5 + 45 * i));
  const p = fit(Object.fromEntries(v.map((q, i) => [names[i], q])), 270, 250, 34);
  must("8: ABC", ang(p.B, p.A, p.C), 135); must("8: BAC", ang(p.A, p.B, p.C), 22.5);
  const cen = centroid(Object.values(p));
  write("nove-osmiuhelnik.svg", 270, 250, [
    poly(names.map((n) => p[n])), L(p.A, p.C, { stroke: BLUE, w: 2 }),
    angle(p.A, p.B, p.C, 40, "?"),
    ...names.map((n) => vlabel(p[n], n, cen)),
  ].join("\n"), "Pravidelný osmiúhelník ABCDEFGH s úhlopříčkou AC; hledaný úhel BAC");
}

console.log("Zapsáno:");
for (const w of written) console.log(`  uhly/${w.name} (${w.w}×${w.h})`);
