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
function angle(V, A, B, r, s, t = 0.5, unkn = s === "?") {
  const a = unit(sub(A, V)), b = unit(sub(B, V));
  const S = add(V, mul(a, r)), E = add(V, mul(b, r));
  const sweep = a.x * b.y - a.y * b.x > 0 ? 1 : 0;
  const bis = unit(add(mul(a, 1 - t), mul(b, t)));
  const col = unkn ? ACC : BLUE;
  const lp = add(V, mul(bis, r + 13));
  const arc = `  <path d="M ${f(S.x)} ${f(S.y)} A ${r} ${r} 0 0 ${sweep} ${f(E.x)} ${f(E.y)}" fill="none" stroke="${col}" stroke-width="2"/>`;
  const lab = text(lp.x, lp.y + 5, s, { size: unkn ? 17 : 13, weight: 800, fill: unkn ? ACC : NAVY });
  // bílý obrys písma: popisek zůstane čitelný i tam, kde ho kříží čára
  return arc + "\n" + lab.replace("<text ", '<text paint-order="stroke" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round" ');
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

// ───────────── Obrázky pro základní a „textové“ úlohy (CERMAT: úlohy s úhly mají vždy obrázek) ─────────────
const rad = (d) => (d * Math.PI) / 180;
const ray = (V, deg, r) => P(V.x + r * Math.cos(rad(-deg)), V.y + r * Math.sin(rad(-deg))); // stupně proti směru hodin, y dolů
const vtext = (p, s, dx = 0, dy = 0) => text(p.x + dx, p.y + dy, s, { size: 15, weight: 700, fill: NAVY });

// a) doplněk do pravého úhlu: 38° + ?
{
  const V = P(40, 150), X = ray(V, 0, 130), U = ray(V, 90, 120), R = ray(V, 38, 125);
  must("doplněk 38", ang(V, X, R), 38); must("doplněk ?", ang(V, R, U), 52);
  write("nove-doplnek.svg", 200, 180, [
    L(V, X, { w: 2.2 }), L(V, U, { w: 2.2 }), L(V, R, { w: 2.2 }), rightMark(V, X, U, 12),
    angle(V, X, R, 70, "38°", 0.35), angle(V, R, U, 46, "?", 0.5),
    dot(V), vtext(V, "V", -14, 16),
  ].join("\n"), "Pravý úhel rozdělený polopřímkou na úhel 38° a hledaný úhel");
}

// b) dva sousední úhly: 47°30′ a 12°45′, hledaný součet AVC (obrázek ilustrační)
{
  const V = P(30, 210), A = ray(V, 0, 200), B = ray(V, 45, 185), C = ray(V, 76, 175);
  // obrázek je ilustrační (neměřítkový): nakreslené úhly 45° a 31° jen znázorňují sousední úhly 47°30′ a 12°45′
  must("souc", ang(V, A, C), 76);
  write("nove-sousedni-uhly.svg", 250, 240, [
    L(V, A, { w: 2.2 }), L(V, B, { w: 2.2 }), L(V, C, { w: 2.2 }),
    angle(V, A, B, 68, "47°30′", 0.35), angle(V, B, C, 110, "12°45′", 0.5), angle(V, A, C, 150, "?", 0.15),
    dot(V), vtext(V, "V", -12, 16), vtext(A, "A", 12, 5), vtext(B, "B", 12, -4), vtext(C, "C", 6, -10),
  ].join("\n"), "Tři polopřímky z vrcholu V: úhel AVB je 47°30′, úhel BVC je 12°45′, hledaný úhel AVC (obrázek je ilustrační)");
}

// c) přímý úhel a úhel 62°40′
{
  const V = P(130, 150), B = ray(V, 0, 105), A = ray(V, 180, 105), C = ray(V, 62 + 40 / 60, 120);
  must("pr1", ang(V, B, C), 62 + 40 / 60); must("pr2", ang(V, C, A), 180 - 62 - 40 / 60);
  write("nove-primy-uhel.svg", 260, 180, [
    L(A, B, { w: 2.2 }), L(V, C, { w: 2.2 }),
    angle(V, B, C, 42, "62°40′", 0.4), angle(V, C, A, 42, "?", 0.55),
    dot(V), vtext(A, "A", -10, 6), vtext(B, "B", 12, 6), vtext(C, "C", 6, -10), vtext(V, "V", 0, 22),
  ].join("\n"), "Přímka AB a polopřímka VC: úhel BVC je 62°40′, hledaný úhel AVC");
}

// d) pravoúhlý rovnoramenný trojúhelník
{
  const C = P(0, 0), A = P(120, 0), B = P(0, -120);
  const p = fit({ A, B, C }, 200, 190, 30);
  must("pr rovn", len(sub(p.C, p.A)), len(sub(p.C, p.B)), 0.01); must("pr C", ang(p.C, p.A, p.B), 90); must("pr A", ang(p.A, p.B, p.C), 45);
  const cen = centroid([p.A, p.B, p.C]);
  write("nove-pravouhly-rovnoramenny.svg", 200, 190, [
    poly([p.A, p.B, p.C]), rightMark(p.C, p.A, p.B, 12), ticks(p.C, p.A, 1), ticks(p.C, p.B, 1),
    angle(p.A, p.C, p.B, 30, "?"),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen),
  ].join("\n"), "Pravoúhlý trojúhelník ABC s pravým úhlem u C a shodnými odvěsnami CA a CB; hledaný úhel u A");
}

// e) ciferník
function clock(name, h, m, title) {
  const c = P(105, 105), R = 86;
  const hourDeg = (h % 12) * 30 + m * 0.5, minDeg = m * 6;
  const at = (deg, r) => P(c.x + r * Math.sin(rad(deg)), c.y - r * Math.cos(rad(deg)));
  const H = at(hourDeg, 36), M = at(minDeg, 54);
  const diff = Math.abs(hourDeg - minDeg), want = Math.min(diff, 360 - diff);
  must(name, ang(c, H, M), want);
  let body = `  <circle cx="${c.x}" cy="${c.y}" r="${R}" fill="#ffffff" stroke="${NAVY}" stroke-width="2.4"/>`;
  for (let i = 0; i < 12; i++) {
    const a = at(i * 30, R - 3), b = at(i * 30, R - 10), n = at(i * 30, R - 20);
    body += "\n" + L(a, b, { w: 2 }) + "\n" + text(n.x, n.y + 5, String(i === 0 ? 12 : i), { size: 13, weight: 700, fill: NAVY });
  }
  body += "\n" + angle(c, H, M, 20, "?", 0.5) + "\n" + L(c, H, { w: 5 }) + "\n" + L(c, M, { w: 3 }) + "\n" + dot(c, 4);
  write(name, 210, 210, body, title);
  return want;
}
clock("nove-hodiny-4-00.svg", 4, 0, "Ciferník hodin: hodinová ručička na 4, minutová na 12; hledaný menší úhel mezi ručičkami");
clock("nove-hodiny-2-30.svg", 2, 30, "Ciferník hodin ve 2:30; hledaný menší úhel mezi ručičkami");
clock("nove-hodiny-14-40.svg", 14, 40, "Ciferník hodin ve 14:40 (2:40); hledaný menší úhel mezi ručičkami");

// f) osa úhlu 84°
{
  const V = P(30, 170), A = ray(V, 0, 175), B = ray(V, 84, 170), O = ray(V, 42, 180);
  must("osa1", ang(V, A, B), 84); must("osa2", ang(V, A, O), 42); must("osa3", ang(V, O, B), 42);
  write("nove-osa-uhlu-84.svg", 250, 200, [
    L(V, A, { w: 2.2 }), L(V, B, { w: 2.2 }), dashed(V, O),
    angle(V, A, B, 84, "84°", 0.78), angle(V, A, O, 48, "?", 0.3),
    dot(V), vtext(V, "V", -12, 16), vtext(A, "A", 10, 5), vtext(B, "B", 4, -10), vtext(O, "O", 12, -2),
  ].join("\n"), "Úhel AVB o velikosti 84° s osou VO; hledaný úhel AVO");
}

// g) rovnoběžník 65°
{
  const t = rad(65), A = P(0, 0), B = P(150, 0), D = P(100 * Math.cos(t), -100 * Math.sin(t)), C = add(D, P(150, 0));
  const p = fit({ A, B, C, D }, 260, 160, 30);
  must("rb A", ang(p.A, p.B, p.D), 65); must("rb B", ang(p.B, p.A, p.C), 115);
  const cen = centroid([p.A, p.B, p.C, p.D]);
  write("nove-rovnobeznik.svg", 260, 160, [
    poly([p.A, p.B, p.C, p.D]), angle(p.A, p.B, p.D, 30, "65°", 0.3), angle(p.B, p.A, p.C, 28, "?", 0.55),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen), vlabel(p.D, "D", cen),
  ].join("\n"), "Rovnoběžník ABCD s úhlem 65° u vrcholu A; hledaný úhel u B");
}

// h) část pravidelného mnohoúhelníku (vnější / vnitřní úhel)
function partialPolygon(name, n, mode, label, title) {
  const R = 110, c = P(0, 0);
  const step = 360 / n, base = 270; // vrcholy při horní části kružnice
  const V = [-1, 0, 1, 2, 3].map((k) => polar(c, R, base + (k - 1.5) * step));
  const p = fit(Object.fromEntries(V.map((q, i) => ["V" + i, q])), 300, 175, 42);
  const [v0, v1, v2, v3, v4] = V.map((_, i) => p["V" + i]);
  const ext = 360 / n, inn = 180 - ext;
  must(name + " vnitřní", ang(v2, v1, v3), inn);
  const extend = (a, b, k) => add(b, mul(sub(b, a), k)); // prodloužení úsečky ab za b
  const through = extend(v1, v2, 0.55);
  let body = [
    L(v0, v1, { stroke: NAVY, w: 2.2, dash: "2 6" }), L(v1, v2, { w: 2.4 }), L(v2, v3, { w: 2.4 }), L(v3, v4, { stroke: NAVY, w: 2.2, dash: "2 6" }),
    dot(v1, 3), dot(v2, 3), dot(v3, 3),
  ];
  if (mode === "ext") {
    body.push(L(v2, through, { stroke: BLUE, w: 1.8, dash: "6 4" }), angle(v2, through, v3, 30, label, 0.5, false));
    must(name + " vnější", ang(v2, through, v3), ext);
  } else {
    body.push(angle(v2, v1, v3, 30, label, 0.5, false));
  }
  write(name, 300, 175, body.join("\n"), title);
}
partialPolygon("nove-mnohouhelnik-vnejsi-40.svg", 9, "ext", "40°", "Část pravidelného mnohoúhelníku; vnější úhel při jednom vrcholu má 40°");
partialPolygon("nove-mnohouhelnik-vnitrni-150.svg", 12, "int", "150°", "Část pravidelného mnohoúhelníku; vnitřní úhel při jednom vrcholu má 150°");

// i) pravý úhel rozdělený na 8 shodných částí, 3 zbarvené
{
  const V = P(30, 170), step = 90 / 8, R = 150;
  let body = [];
  const sec = (a1, a2, r) => {
    const s = ray(V, a1, r), e = ray(V, a2, r);
    return `  <path d="M ${f(V.x)} ${f(V.y)} L ${f(s.x)} ${f(s.y)} A ${r} ${r} 0 0 0 ${f(e.x)} ${f(e.y)} Z" fill="#dbeafe" stroke="none"/>`;
  };
  body.push(sec(0, 3 * step, R));
  for (let i = 0; i <= 8; i++) body.push(L(V, ray(V, i * step, R + 10), { stroke: NAVY, w: i === 0 || i === 8 ? 2.4 : 1.4 }));
  body.push(rightMark(V, ray(V, 0, 1), ray(V, 90, 1), 14), angle(V, ray(V, 0, 1), ray(V, 3 * step, 1), 100, "?", 0.5), dot(V), vtext(V, "V", -12, 16));
  must("osm1", ang(V, ray(V, 0, 1), ray(V, 3 * step, 1)), 33.75);
  write("nove-osminy-pravy-uhel.svg", 220, 200, body.join("\n"), "Pravý úhel rozdělený na osm shodných úhlů; zbarvené jsou tři z nich, hledaná velikost zbarveného úhlu");
}

// j) pravý úhel rozdělený na α a β
{
  const V = P(40, 150), X = ray(V, 0, 130), U = ray(V, 90, 120), R2 = ray(V, 27, 125);
  must("ab1", ang(V, X, R2), 27); must("ab2", ang(V, R2, U), 63);
  write("nove-alfa-beta.svg", 200, 180, [
    L(V, X, { w: 2.2 }), L(V, U, { w: 2.2 }), L(V, R2, { w: 2.2 }), rightMark(V, X, U, 12),
    angle(V, X, R2, 76, "β", 0.3, false), angle(V, R2, U, 50, "α", 0.5, true),
    dot(V), vtext(V, "V", -14, 16),
  ].join("\n"), "Pravý úhel rozdělený polopřímkou na úhly α a β; α je o 36° větší než β");
}

// k) trojúhelník s vnějšími úhly
{
  const al = rad(80), be = rad(60), ga = rad(40);
  const A = P(0, 0), c = 200, b = (c * Math.sin(be)) / Math.sin(ga), C = P(b * Math.cos(al), -b * Math.sin(al)), B = P(c, 0);
  const ex = (a, b2, k) => add(b2, mul(sub(b2, a), k)); // prodloužení ab za b2
  const A2 = ex(C, A, 0.28), B2 = ex(A, B, 0.28), C2 = ex(B, C, 0.28);
  const p = fit({ A, B, C, A2, B2, C2 }, 300, 230, 28);
  must("vnA", ang(p.A, p.A2, p.B), 100); must("vnB", ang(p.B, p.B2, p.C), 120); must("vnC", ang(p.C, p.C2, p.A), 140);
  const cen = centroid([p.A, p.B, p.C]);
  write("nove-vnejsi-uhly.svg", 300, 230, [
    poly([p.A, p.B, p.C]),
    L(p.A, p.A2, { stroke: BLUE, w: 1.8, dash: "6 4" }), L(p.B, p.B2, { stroke: BLUE, w: 1.8, dash: "6 4" }), L(p.C, p.C2, { stroke: BLUE, w: 1.8, dash: "6 4" }),
    angle(p.A, p.A2, p.B, 24, "α′", 0.5, false), angle(p.B, p.B2, p.C, 24, "β′", 0.5, false), angle(p.C, p.C2, p.A, 24, "140°", 0.5, false),
    vlabel(p.A, "A", cen, 24), vlabel(p.B, "B", cen, 24), vtext(p.C, "C", 16, -4),
  ].join("\n"), "Trojúhelník ABC s prodlouženými stranami; vnější úhly α′ při A, β′ při B a 140° při C");
}

// l) Thaletova kružnice s kolmicí q a osou o (vlastní čísla, CERMAT vzor)
{
  const R = 100, be = rad(26);
  const A = P(-R, 0), B = P(R, 0), S = P(0, 0), BC = 2 * R * Math.cos(be);
  const C = add(B, P(-BC * Math.cos(be), -BC * Math.sin(be)));
  const hq = Math.sqrt(R * R - C.x * C.x);
  const Qt = P(C.x, -hq - 12), Qb = P(C.x, hq + 12), Pf = P(C.x, 0);
  const O = P(B.x - 1.12 * 2 * R * Math.cos(be / 2), B.y - 1.12 * 2 * R * Math.sin(be / 2));
  const p = fit({ A, B, S, C, Qt, Qb, O, n: P(-R, -R), s: P(R, R) }, 420, 330, 30);
  const Pp = P(p.C.x, p.A.y);
  const qUp = P(p.C.x, p.C.y - 60);
  must("th C", ang(p.C, p.A, p.B), 90); must("th 116", ang(p.C, qUp, p.B), 116); must("th alfa", ang(p.A, p.B, p.C), 64);
  must("th phi", ang(p.B, p.A, p.O), 13);
  const r = len(sub(p.A, p.S));
  write("nove-thales-kolmice.svg", 420, 330, [
    `  <circle cx="${f(p.S.x)}" cy="${f(p.S.y)}" r="${f(r)}" fill="#ffffff" stroke="${BLUE}" stroke-width="1.6"/>`,
    poly([p.A, p.B, p.C], { fill: FILL }),
    L(p.Qt, p.Qb, { w: 1.8 }), dashed(p.B, p.O), rightMark(Pp, p.B, p.C, 9),
    angle(p.C, qUp, p.B, 40, "116°", 0.62, false), angle(p.A, p.B, p.C, 28, "α", 0.5, true), angle(p.B, p.A, p.O, 100, "φ", 0.5, true),
    dot(p.S, 3), dot(Pp, 2.6),
    text(p.S.x, p.S.y + 18, "S", { size: 15, weight: 700, fill: NAVY }),
    vtext(p.A, "A", -14, 16), vtext(p.B, "B", 14, 16), vtext(p.C, "C", -16, -6),
    text(p.Qb.x + 14, p.Qb.y - 2, "q", { size: 15, weight: 700, fill: NAVY, italic: true }),
    text(p.O.x - 4, p.O.y - 10, "o", { size: 15, weight: 700, fill: NAVY, italic: true }),
  ].join("\n"), "Trojúhelník ABC vepsaný do kružnice se středem S na straně AB; přímka q prochází bodem C kolmo na AB; osa o úhlu při B; úhel 116° u C; hledané úhly α a φ");
}

console.log("Zapsáno:");
for (const w of written) console.log(`  uhly/${w.name} (${w.w}×${w.h})`);
