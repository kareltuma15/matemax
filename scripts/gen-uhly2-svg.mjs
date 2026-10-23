// Další obrázky k úhlům (UHN4_*, CERMAT styl) — nové-2: public/obrazky/uhly/nove2-*.svg
// Spuštění: node scripts/gen-uhly2-svg.mjs
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

// ═════════ Další obrázky k úhlům (UHN4_*): public/obrazky/uhly/nove2-*.svg ═════════
const rad = (d) => (d * Math.PI) / 180;
const ray = (V, deg, r) => P(V.x + r * Math.cos(rad(-deg)), V.y + r * Math.sin(rad(-deg))); // stupně proti směru hodin, y dolů
const vtext = (p, s, dx = 0, dy = 0) => text(p.x + dx, p.y + dy, s, { size: 15, weight: 700, fill: NAVY });

// 1) rovnoramenný trojúhelník, úhel při vrcholu 40° (L1)
{
  const A = P(0, 0), Ls = 150, h = rad(20);
  const B = P(-Ls * Math.sin(h), Ls * Math.cos(h)), C = P(Ls * Math.sin(h), Ls * Math.cos(h));
  const p = fit({ A, B, C }, 240, 200, 30);
  must("rv A", ang(p.A, p.B, p.C), 40); must("rv B", ang(p.B, p.A, p.C), 70);
  must("rv AB=AC", len(sub(p.A, p.B)), len(sub(p.A, p.C)), 0.01);
  const cen = centroid([p.A, p.B, p.C]);
  write("nove2-rovnoramenny-40.svg", 240, 200, [
    poly([p.A, p.B, p.C]), ticks(p.A, p.B, 1), ticks(p.A, p.C, 1),
    angle(p.A, p.B, p.C, 30, "40°"), angle(p.B, p.A, p.C, 30, "?"),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen),
  ].join("\n"), "Rovnoramenný trojúhelník ABC se shodnými stranami AB a AC; úhel při vrcholu A je 40°, hledaný úhel při vrcholu B");
}

// 2) dvě přímky, vedlejší úhly 115° a ? (L1)
{
  const V = P(130, 105), r1 = 105;
  const R1 = ray(V, 0, r1), R2 = ray(V, 65, r1), R3 = ray(V, 180, r1), R4 = ray(V, 245, r1);
  must("pr 115", ang(V, R2, R3), 115); must("pr 65", ang(V, R1, R2), 65);
  write("nove2-dve-primky.svg", 260, 210, [
    L(R1, R3, { w: 2.2 }), L(R2, R4, { w: 2.2 }),
    text(R1.x - 2, R1.y + 20, "p", { size: 15, weight: 700, fill: NAVY, italic: true }), text(R2.x + 14, R2.y + 6, "q", { size: 15, weight: 700, fill: NAVY, italic: true }),
    angle(V, R2, R3, 30, "115°", 0.5), angle(V, R1, R2, 24, "?", 0.5),
    dot(V, 3),
  ].join("\n"), "Dvě protínající se přímky p a q; jeden úhel má 115°, hledaný úhel k němu přiléhá");
}

// 3) pravý úhel rozdělený na tři úhly: 22°, ?, 41° (L1)
{
  const V = P(40, 160), r = 135;
  const X = ray(V, 0, r), U = ray(V, 90, r - 10), R1 = ray(V, 22, r), R2 = ray(V, 49, r);
  must("3u 22", ang(V, X, R1), 22); must("3u ?", ang(V, R1, R2), 27); must("3u 41", ang(V, R2, U), 41);
  write("nove2-pravy-uhel-tri.svg", 200, 190, [
    L(V, X, { w: 2.2 }), L(V, U, { w: 2.2 }), L(V, R1, { w: 2.2 }), L(V, R2, { w: 2.2 }),
    rightMark(V, X, U, 11),
    angle(V, X, R1, 100, "22°", 0.5), angle(V, R1, R2, 74, "?", 0.5), angle(V, R2, U, 100, "41°", 0.5),
    dot(V, 3),
  ].join("\n"), "Pravý úhel rozdělený dvěma polopřímkami na tři úhly 22°, hledaný a 41°");
}

// 4) přímý úhel rozdělený na tři úhly: 50°, 75°, ? (L1)
{
  const V = P(150, 140), r = 125;
  const A = ray(V, 180, r), B = ray(V, 0, r), R1 = ray(V, 50, r - 5), R2 = ray(V, 125, r - 5);
  must("pm 50", ang(V, B, R1), 50); must("pm 75", ang(V, R1, R2), 75); must("pm ?", ang(V, R2, A), 55);
  write("nove2-primy-uhel-tri.svg", 300, 175, [
    L(A, B, { w: 2.2 }), L(V, R1, { w: 2.2 }), L(V, R2, { w: 2.2 }),
    angle(V, B, R1, 90, "50°", 0.5), angle(V, R1, R2, 52, "75°", 0.5), angle(V, R2, A, 90, "?", 0.5),
    vtext(A, "A", -4, 20), vtext(B, "B", 0, 20), vtext(V, "V", 0, 22),
    dot(V, 3),
  ].join("\n"), "Body A, V a B leží na přímce; polopřímky z bodu V ji dělí na tři úhly 50°, 75° a hledaný úhel");
}

// 5) rovnoběžky a příčka: střídavé úhly 65° a ? (L1)
{
  const W = 300, H = 170, yp = 40, yq = 130, t = rad(65);
  const A = P(120, yp), B = P(120 + (yq - yp) / Math.tan(t), yq);
  must("st A", ang(A, P(A.x + 10, A.y), B), 65); must("st B", ang(B, A, P(B.x - 10, B.y)), 65);
  write("nove2-stridave.svg", W, H, [
    L(P(14, yp), P(W - 14, yp), { w: 2.2 }), L(P(14, yq), P(W - 14, yq), { w: 2.2 }),
    text(W - 24, yp - 8, "p", { size: 15, weight: 700, fill: NAVY, italic: true }), text(W - 24, yq - 8, "q", { size: 15, weight: 700, fill: NAVY, italic: true }),
    L(add(A, mul(unit(sub(A, B)), 24)), add(B, mul(unit(sub(B, A)), 24)), { w: 2.2 }),
    angle(A, P(A.x + 40, A.y), B, 28, "65°", 0.3), angle(B, A, P(B.x - 40, B.y), 28, "?", 0.3),
    dot(A), dot(B),
    text(A.x - 14, A.y - 9, "A", { size: 15, weight: 700, fill: NAVY }), text(B.x + 14, B.y + 20, "B", { size: 15, weight: 700, fill: NAVY }),
  ].join("\n"), "Rovnoběžky p a q protnuté příčkou AB; úhel 65° u bodu A pod přímkou p, hledaný úhel u bodu B nad přímkou q na opačné straně příčky");
}

// 6) vnější úhel trojúhelníku při C (L2): α = 55°, β = 70°
{
  const al = rad(55), be = rad(70), ga = Math.PI - al - be;
  const A = P(0, 0), c = 200, b = (c * Math.sin(be)) / Math.sin(ga);
  const B = P(c, 0), C = P(b * Math.cos(al), -b * Math.sin(al));
  const E = add(C, mul(unit(sub(C, A)), 90));
  const p = fit({ A, B, C, E }, 300, 230, 32);
  must("ex A", ang(p.A, p.B, p.C), 55); must("ex B", ang(p.B, p.A, p.C), 70); must("ex ?", ang(p.C, p.B, p.E), 125);
  const cen = centroid([p.A, p.B, p.C]);
  write("nove2-vnejsi-uhel.svg", 300, 230, [
    poly([p.A, p.B, p.C]), L(p.C, p.E, { w: 2.2 }),
    angle(p.A, p.B, p.C, 34, "55°"), angle(p.B, p.A, p.C, 32, "70°"), angle(p.C, p.B, p.E, 26, "?", 0.5),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen),
  ].join("\n"), "Trojúhelník ABC s úhly 55° při A a 70° při B; strana AC je prodloužena za bod C; hledaný vnější úhel při vrcholu C");
}

// 7) rovnoramenný trojúhelník, vnější úhel při základně 110° (L2)
{
  const A = P(0, 0), Ls = 160, h = rad(20);
  const B = P(-Ls * Math.sin(h), Ls * Math.cos(h)), C = P(Ls * Math.sin(h), Ls * Math.cos(h));
  const D = add(B, mul(unit(sub(B, C)), 70));
  const p = fit({ A, B, C, D }, 300, 200, 30);
  must("rvx ext", ang(p.B, p.A, p.D), 110); must("rvx A", ang(p.A, p.B, p.C), 40);
  must("rvx AB=AC", len(sub(p.A, p.B)), len(sub(p.A, p.C)), 0.01);
  const cen = centroid([p.A, p.B, p.C]);
  write("nove2-rovnoramenny-vnejsi.svg", 300, 200, [
    poly([p.A, p.B, p.C]), L(p.B, p.D, { w: 2.2 }), ticks(p.A, p.B, 1), ticks(p.A, p.C, 1),
    angle(p.B, p.A, p.D, 30, "110°", 0.5), angle(p.A, p.B, p.C, 30, "?"),
    vlabel(p.A, "A", cen), vlabel(p.B, "B", cen), vlabel(p.C, "C", cen),
  ].join("\n"), "Rovnoramenný trojúhelník ABC se základnou BC (AB = AC); základna je prodloužena za bod B; vnější úhel při B má 110°, hledaný úhel při vrcholu A");
}

// 8) pravidelný pětiúhelník (L2)
{
  const c = P(0, 0), R = 100;
  const names = ["A", "B", "C", "D", "E"];
  const v = names.map((_, i) => polar(c, R, 90 + 72 * i));
  const p = fit(Object.fromEntries(v.map((q, i) => [names[i], q])), 250, 230, 34);
  must("5: vnitřní", ang(p.A, p.B, p.E), 108);
  const cen = centroid(Object.values(p));
  write("nove2-petiuhelnik.svg", 250, 230, [
    poly(names.map((n) => p[n])), angle(p.A, p.B, p.E, 26, "?"),
    ...names.map((n) => vlabel(p[n], n, cen)),
  ].join("\n"), "Pravidelný pětiúhelník ABCDE s vyznačeným vnitřním úhlem při vrcholu A");
}

// 9) rovnoběžky a příčka: jednostranné úhly 115° a ? (L2)
{
  const W = 300, H = 170, yp = 40, yq = 130, t = rad(115);
  const A = P(180, yp), B = P(180 + (yq - yp) / Math.tan(t), yq);
  must("js A", ang(A, P(A.x + 10, A.y), B), 115); must("js B", ang(B, A, P(B.x + 10, B.y)), 65);
  write("nove2-jednostranne.svg", W, H, [
    L(P(14, yp), P(W - 14, yp), { w: 2.2 }), L(P(14, yq), P(W - 14, yq), { w: 2.2 }),
    text(W - 24, yp - 8, "p", { size: 15, weight: 700, fill: NAVY, italic: true }), text(W - 24, yq - 8, "q", { size: 15, weight: 700, fill: NAVY, italic: true }),
    L(add(A, mul(unit(sub(A, B)), 24)), add(B, mul(unit(sub(B, A)), 24)), { w: 2.2 }),
    angle(A, P(A.x + 40, A.y), B, 28, "115°", 0.4), angle(B, A, P(B.x + 40, B.y), 28, "?", 0.4),
    dot(A), dot(B),
    text(A.x + 14, A.y - 9, "A", { size: 15, weight: 700, fill: NAVY }), text(B.x - 14, B.y + 20, "B", { size: 15, weight: 700, fill: NAVY }),
  ].join("\n"), "Rovnoběžky p a q protnuté příčkou AB; úhel 115° u bodu A a hledaný úhel u bodu B jsou na téže straně příčky mezi rovnoběžkami");
}

// 10) pravý úhel rozdělený na α a β, α je čtyřnásobek β (L2)
{
  const V = P(40, 160), r = 135;
  const X = ray(V, 0, r), U = ray(V, 90, r - 10), R1 = ray(V, 72, r);
  must("αβ α", ang(V, X, R1), 72); must("αβ β", ang(V, R1, U), 18);
  write("nove2-alfa-ctyrnasobek.svg", 200, 190, [
    L(V, X, { w: 2.2 }), L(V, U, { w: 2.2 }), L(V, R1, { w: 2.2 }),
    rightMark(V, X, U, 11),
    angle(V, X, R1, 70, "α", 0.5, false), angle(V, R1, U, 95, "β", 0.5, true),
    dot(V, 3),
  ].join("\n"), "Pravý úhel rozdělený polopřímkou na úhly α a β; α je čtyřikrát větší než β");
}

console.log("Zapsáno (nove2-*):");
for (const w of written.filter((x) => x.name.startsWith("nove2-"))) console.log(`  uhly/${w.name} (${w.w}×${w.h})`);
