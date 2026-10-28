// Generátor vlastních SVG obrázků pro těžké (CERMAT-styl) úlohy z geometrie.
// Spuštění: node scripts/gen-geometrie-svg.mjs  → zapíše do public/obrazky/geometrie/
// Obrázky jsou ILUSTRAČNÍ; hodnoty nese popisek/zadání. Nekopírují žádný CERMAT obrázek.
import { NAVY, BLUE, f, text, line, makeWriter } from "./lib/svg.mjs";
import { voxel, place, box } from "./lib/voxel.mjs";

const { write, written } = makeWriter("geometrie");

// Povrch tělesa z voxelů (počet odkrytých stěn) — kontrola správných odpovědí.
function surfaceFaces(cells) {
  const s = new Set(cells.map(([i, j, k]) => `${i},${j},${k}`));
  let n = 0;
  for (const [i, j, k] of cells) {
    for (const [a, b, c] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      if (!s.has(`${i + a},${j + b},${k + c}`)) n++;
    }
  }
  return n;
}

// ── 1) Rovnoramenný trojúhelník (ramena o 3 cm delší než základna; 10 | 13 | 13) ──
{
  const u = 14;
  const A = [90, 205], B = [90 + 10 * u, 205], C = [90 + 5 * u, 205 - 12 * u];
  const tick = (P, Q) => {
    const mx = (P[0] + Q[0]) / 2, my = (P[1] + Q[1]) / 2;
    const dx = Q[0] - P[0], dy = Q[1] - P[1];
    const L = Math.hypot(dx, dy);
    const nx = -dy / L, ny = dx / L;
    return line(mx - nx * 6, my - ny * 6, mx + nx * 6, my + ny * 6, { w: 1.8 });
  };
  const body = [
    `  <polygon points="${A} ${B} ${C}" fill="#eef4fb" stroke="${NAVY}" stroke-width="2" stroke-linejoin="round"/>`,
    tick(A, C),
    tick(B, C),
    text(A[0] - 12, A[1] + 12, "A", { fill: NAVY, weight: 700, size: 14 }),
    text(B[0] + 12, B[1] + 12, "B", { fill: NAVY, weight: 700, size: 14 }),
    text(C[0], C[1] - 9, "C", { fill: NAVY, weight: 700, size: 14 }),
  ].join("\n");
  write("rovnoramenny-trojuhelnik.svg", 320, 230, body, "Rovnoramenný trojúhelník ABC se základnou AB");
}

// ── 2) Dva hranoly se stejnou podstavou (výšky 10 a 4, rozdíl 6) ──
{
  const u = 10;
  const tall = voxel(box(0, 4, 0, 4, 0, 10), { u });
  const short = voxel(box(0, 4, 0, 4, 0, 4), { u });
  const baseY = 178;
  const tx = 62, sx = 210;
  const yTallTop = baseY - 10 * u; // 78
  const yShortTop = baseY - 4 * u; // 138
  const gx = 158; // svislá šipka mezi hranoly
  const body = [
    place(tall, tx, baseY),
    place(short, sx, baseY),
    line(tx + 4 * u, yShortTop, sx, yShortTop, { stroke: "#64748b", w: 1, dash: "4 3" }),
    line(tx + 4 * u, yTallTop, gx + 14, yTallTop, { stroke: "#64748b", w: 1, dash: "4 3" }),
    line(gx, yTallTop + 1, gx, yShortTop - 1, { stroke: BLUE, w: 1.6 }),
    `  <polygon points="${gx},${yTallTop} ${gx - 4},${yTallTop + 9} ${gx + 4},${yTallTop + 9}" fill="${BLUE}"/>`,
    `  <polygon points="${gx},${yShortTop} ${gx - 4},${yShortTop - 9} ${gx + 4},${yShortTop - 9}" fill="${BLUE}"/>`,
    text(gx + 12, (yTallTop + yShortTop) / 2 + 6, "?", { size: 20, weight: 800 }),
    text(tx + 2 * u, baseY + 17, "a", { fill: BLUE, italic: true }),
    text(sx + 2 * u, baseY + 17, "a", { fill: BLUE, italic: true }),
    text(tx + 26, yTallTop - 22, "1. hranol", { fill: NAVY, size: 12 }),
    text(sx + 26, yShortTop - 22, "2. hranol", { fill: NAVY, size: 12 }),
  ].join("\n");
  write("dva-hranoly.svg", 330, 205, body, "Dva pravidelné čtyřboké hranoly se stejnou podstavou, rozdíl jejich výšek je označen otazníkem");
}

// ── 3) Krychle 10 cm (5×5×5 voxelů po 2 cm) se dvěma vyříznutými krychličkami ──
let krychleVyrezFaces = 0;
{
  const cells = box(0, 5, 0, 5, 0, 5).filter(([i, j, k]) => !(i === 4 && j === 0 && k === 4) && !(i === 2 && j === 0 && k === 4));
  krychleVyrezFaces = surfaceFaces(cells);
  const v = voxel(cells, { u: 26 });
  const body = [
    place(v, 52, 200),
    text(52 + 65, 220, "10 cm", { size: 13 }),
  ].join("\n");
  write("krychle-vyrezy.svg", 300, 232, body, "Krychle o hraně 10 cm se dvěma vyříznutými krychličkami o hraně 2 cm: jednou z rohu a jednou z prostředku hrany");
}

// ── 4) Schodišťová tělesa A (2×3), B (1×5), C (2×4) z krychliček ──
const schody = (w, n) => {
  const out = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < w; i++) for (let k = 0; k <= j; k++) out.push([i, j, k, "n"]);
  return out;
};
const objemSchody = { A: schody(2, 3).length, B: schody(1, 5).length, C: schody(2, 4).length };
{
  const u = 21;
  const A = voxel(schody(2, 3), { u, grid: true });
  const B = voxel(schody(1, 5), { u, grid: true });
  const C = voxel(schody(2, 4), { u, grid: true });
  const baseY = 168;
  const ax = 26, bx = 140, cx = 250;
  const body = [
    place(A, ax, baseY),
    place(B, bx, baseY),
    place(C, cx, baseY),
    text(ax + 38, baseY + 26, "Těleso A", { fill: NAVY }),
    text(bx + 30, baseY + 26, "Těleso B", { fill: NAVY }),
    text(cx + 42, baseY + 26, "Těleso C", { fill: NAVY }),
  ].join("\n");
  write("teles-schody.svg", 370, 206, body, "Tři tělesa A, B, C složená ze shodných krychliček ve tvaru schodů");
}

// ── 5) Šedá krychle 4 cm + bílý hranol 6×4×4 → kvádr 10×4×4 ──
{
  const cells = [...box(0, 6, 0, 4, 0, 4, "w"), ...box(6, 10, 0, 4, 0, 4, "g")];
  const v = voxel(cells, { u: 17 });
  const body = [
    place(v, 60, 118),
    text(60 + 51, 142, "bílý hranol", { fill: NAVY, size: 12 }),
    text(60 + 136, 142, "šedá krychle", { fill: NAVY, size: 12 }),
  ].join("\n");
  write("krychle-hranol-slepeny.svg", 320, 156, body, "Šedá krychle slepená s bílým hranolem tvoří jeden kvádr");
}

// ── 6) Kruh o poloměru 12 cm: 2 bílé výseče po 120° a 4 šedé po 30° ──
{
  const cx = 150, cy = 122, R = 96;
  const seq = [["w", 120], ["g", 30], ["g", 30], ["w", 120], ["g", 30], ["g", 30]];
  const pt = (deg, r = R) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  let a0 = 0;
  const secs = seq.map(([g, ang]) => {
    const a1 = a0 + ang;
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    const large = ang > 180 ? 1 : 0;
    const s = `  <path d="M${f(cx)} ${f(cy)} L${f(x0)} ${f(y0)} A${R} ${R} 0 ${large} 1 ${f(x1)} ${f(y1)} Z" fill="${g === "w" ? "#ffffff" : "#c9ced6"}" stroke="${NAVY}" stroke-width="1.8" stroke-linejoin="round"/>`;
    a0 = a1;
    return s;
  });
  const [ax0, ay0] = pt(0, 30), [ax1, ay1] = pt(120, 30);
  const [lx, ly] = pt(60, 50);
  const body = [
    ...secs,
    `  <path d="M${f(ax0)} ${f(ay0)} A30 30 0 0 1 ${f(ax1)} ${f(ay1)}" fill="none" stroke="${BLUE}" stroke-width="1.6"/>`,
    text(lx, ly + 5, "120°", { size: 13 }),
    text(cx + R / 2, cy - 7, "12 cm", { size: 13 }),
  ].join("\n");
  write("kruh-vysece.svg", 300, 244, body, "Kruh o poloměru 12 cm rozdělený na dvě bílé výseče o úhlu 120° a čtyři šedé shodné výseče");
}

// ── 7) Trojúhelník se stranami a = 9 cm, b = 20 cm a neznámou c (ilustračně c ≈ 17) ──
{
  const a = 9, b = 20, c = 17, s = 14;
  const Cx = (b * b + c * c - a * a) / (2 * c);
  const Cy = Math.sqrt(b * b - Cx * Cx);
  const A = [24, 172], B = [24 + c * s, 172], C = [24 + Cx * s, 172 - Cy * s];
  const ang = (Math.atan2(C[1] - A[1], C[0] - A[0]) * 180) / Math.PI;
  const mAC = [(A[0] + C[0]) / 2, (A[1] + C[1]) / 2];
  const body = [
    `  <polygon points="${f(A[0])},${f(A[1])} ${f(B[0])},${f(B[1])} ${f(C[0])},${f(C[1])}" fill="#eef4fb" stroke="${NAVY}" stroke-width="2" stroke-linejoin="round"/>`,
    text(A[0] - 10, A[1] + 14, "A", { fill: NAVY, weight: 700, size: 14 }),
    text(B[0] - 4, B[1] + 16, "B", { fill: NAVY, weight: 700, size: 14 }),
    text(C[0] + 4, C[1] - 8, "C", { fill: NAVY, weight: 700, size: 14 }),
    text(mAC[0] - 8, mAC[1] - 12, "b = 20 cm", { size: 13, rotate: f(ang) }),
    text(C[0] + 12, (B[1] + C[1]) / 2 + 4, "a = 9 cm", { anchor: "start", size: 13 }),
    text((A[0] + B[0]) / 2, A[1] + 18, "c", { italic: true, size: 14 }),
  ].join("\n");
  write("trojuhelnik-nerovnost.svg", 350, 200, body, "Trojúhelník ABC se stranami a = 9 cm, b = 20 cm a neznámou stranou c");
}

// ── 8) Obdélník 14 × 9 cm s výřezy: čtverec 3 cm v rohu a čtverec 3 cm uprostřed delší strany ──
{
  const s = 16, x0 = 46, y0 = 34;
  const X = (v) => x0 + v * s, Y = (v) => y0 + v * s;
  const d = `M${X(0)} ${Y(0)} L${X(5.5)} ${Y(0)} L${X(5.5)} ${Y(3)} L${X(8.5)} ${Y(3)} L${X(8.5)} ${Y(0)} L${X(14)} ${Y(0)} L${X(14)} ${Y(6)} L${X(11)} ${Y(6)} L${X(11)} ${Y(9)} L${X(0)} ${Y(9)} Z`;
  const yd = Y(9) + 24;
  const body = [
    `  <path d="${d}" fill="#eef4fb" stroke="${NAVY}" stroke-width="2" stroke-linejoin="round"/>`,
    // kóta 14 cm (dole)
    line(X(14), Y(6) + 4, X(14), yd + 5, { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    line(X(0), Y(9) + 4, X(0), yd + 5, { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    line(X(0), yd, X(14), yd, { stroke: BLUE, w: 1.4 }),
    line(X(0), yd - 4, X(0), yd + 4, { stroke: BLUE, w: 1.4 }),
    line(X(14), yd - 4, X(14), yd + 4, { stroke: BLUE, w: 1.4 }),
    text((X(0) + X(14)) / 2, yd - 6, "14 cm"),
    // kóta 9 cm (vlevo)
    line(x0 - 4, Y(0), x0 - 26, Y(0), { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    line(x0 - 4, Y(9), x0 - 26, Y(9), { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    line(x0 - 22, Y(0), x0 - 22, Y(9), { stroke: BLUE, w: 1.4 }),
    line(x0 - 26, Y(0), x0 - 18, Y(0), { stroke: BLUE, w: 1.4 }),
    line(x0 - 26, Y(9), x0 - 18, Y(9), { stroke: BLUE, w: 1.4 }),
    text(x0 - 28, (Y(0) + Y(9)) / 2 + 4, "9 cm", { rotate: -90 }),
    // výřezy
    text(X(7), Y(1.7) + 4, "3 cm", { size: 12 }),
    text(X(12.5), Y(7.5) + 4, "3 cm", { size: 12 }),
  ].join("\n");
  write("obdelnik-vystrizky.svg", 320, 226, body, "Obdélník 14 cm krát 9 cm s čtvercovým výřezem 3 cm v rohu a čtvercovým výřezem 3 cm uprostřed delší strany");
}

// ── 9) Zahrada 25 × 16 m s bazénem 15 × 6 m a dlážděným chodníkem šířky 1,5 m ──
{
  const s = 10, x0 = 52, y0 = 28;
  const X = (v) => x0 + v * s, Y = (v) => y0 + v * s;
  const yd = Y(16) + 22;
  const body = [
    `  <rect x="${X(0)}" y="${Y(0)}" width="${25 * s}" height="${16 * s}" fill="#dcfce7" stroke="#15803d" stroke-width="2"/>`,
    `  <rect x="${X(3.5)}" y="${Y(3.5)}" width="${18 * s}" height="${9 * s}" fill="#e5e7eb" stroke="#6b7280" stroke-width="1.4"/>`,
    `  <rect x="${X(5)}" y="${Y(5)}" width="${15 * s}" height="${6 * s}" fill="#bfdbfe" stroke="${BLUE}" stroke-width="1.8"/>`,
    text(X(12.5), Y(8) - 3, "bazén", { fill: NAVY, size: 12 }),
    text(X(12.5), Y(8) + 13, "15 m × 6 m", { fill: NAVY, size: 12 }),
    text(X(12.5), Y(4.25) + 4, "chodník 1,5 m", { fill: "#374151", size: 11, weight: 600 }),
    text(X(12.5), Y(13.75) + 4, "chodník 1,5 m", { fill: "#374151", size: 11, weight: 600 }),
    // kóta 25 m
    line(X(0), Y(16) + 4, X(0), yd + 5, { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    line(X(25), Y(16) + 4, X(25), yd + 5, { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    line(X(0), yd, X(25), yd, { stroke: BLUE, w: 1.4 }),
    line(X(0), yd - 4, X(0), yd + 4, { stroke: BLUE, w: 1.4 }),
    line(X(25), yd - 4, X(25), yd + 4, { stroke: BLUE, w: 1.4 }),
    text((X(0) + X(25)) / 2, yd + 16, "25 m"),
    // kóta 16 m
    line(X(0) - 4, Y(0), X(0) - 26, Y(0), { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    line(X(0) - 4, Y(16), X(0) - 26, Y(16), { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    line(X(0) - 22, Y(0), X(0) - 22, Y(16), { stroke: BLUE, w: 1.4 }),
    line(X(0) - 26, Y(0), X(0) - 18, Y(0), { stroke: BLUE, w: 1.4 }),
    line(X(0) - 26, Y(16), X(0) - 18, Y(16), { stroke: BLUE, w: 1.4 }),
    text(X(0) - 28, (Y(0) + Y(16)) / 2 + 4, "16 m", { rotate: -90 }),
  ].join("\n");
  write("zahrada-bazen.svg", 350, 246, body, "Obdélníková zahrada 25 m krát 16 m, uprostřed bazén 15 m krát 6 m obklopený chodníkem širokým 1,5 m");
}

// ── 10) Čtverec o straně 20 m se čtyřmi shodnými kruhy dotýkajícími se stran i sebe ──
{
  const s = 9, x0 = 60, y0 = 16;
  const X = (v) => x0 + v * s, Y = (v) => y0 + v * s;
  const yd = Y(20) + 22;
  const circles = [[5, 5], [15, 5], [5, 15], [15, 15]].map(
    ([cx, cy]) => `  <circle cx="${X(cx)}" cy="${Y(cy)}" r="${5 * s}" fill="#bfdbfe" stroke="${BLUE}" stroke-width="1.8"/>`
  );
  const body = [
    `  <rect x="${X(0)}" y="${Y(0)}" width="${20 * s}" height="${20 * s}" fill="#f1f5f9" stroke="${NAVY}" stroke-width="2"/>`,
    ...circles,
    line(X(0), Y(20) + 4, X(0), yd + 5, { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    line(X(20), Y(20) + 4, X(20), yd + 5, { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    line(X(0), yd, X(20), yd, { stroke: BLUE, w: 1.4 }),
    line(X(0), yd - 4, X(0), yd + 4, { stroke: BLUE, w: 1.4 }),
    line(X(20), yd - 4, X(20), yd + 4, { stroke: BLUE, w: 1.4 }),
    text((X(0) + X(20)) / 2, yd + 16, "20 m"),
  ].join("\n");
  write("ctverec-ctyri-kruhy.svg", 300, 246, body, "Čtverec o straně 20 m se čtyřmi shodnými kruhy, které se dotýkají stran čtverce i sebe navzájem");
}

console.log("Zapsáno:");
for (const w of written) console.log(`  ${w.name}  ${w.w}×${w.h}`);
console.log("\nKontrola odpovědí:");
console.log("  krychle s výřezy: odkrytých stěn", krychleVyrezFaces, "→ povrch", krychleVyrezFaces * 4, "cm² (2×2 cm stěny)");
console.log("  objemy schodišť:", objemSchody);
