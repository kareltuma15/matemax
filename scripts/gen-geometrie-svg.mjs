// Generátor vlastních SVG obrázků pro těžké (CERMAT-styl) úlohy z geometrie.
// Spuštění: node scripts/gen-geometrie-svg.mjs  → zapíše do public/obrazky/geometrie/
// Obrázky jsou ILUSTRAČNÍ; hodnoty nese popisek/zadání. Nekopírují žádný CERMAT obrázek.
import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "obrazky", "geometrie");
fs.mkdirSync(OUT, { recursive: true });

const NAVY = "#0D1B3E";
const BLUE = "#2E6DA4";
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const f = (n) => Math.round(n * 100) / 100;

function svgWrap(w, h, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONT}">
  <title>${title}</title>
${body}
</svg>
`;
}

function text(x, y, s, o = {}) {
  const { size = 13, weight = 600, anchor = "middle", fill = BLUE, rotate, italic } = o;
  const tr = rotate !== undefined ? ` transform="rotate(${rotate} ${f(x)} ${f(y)})"` : "";
  return `  <text x="${f(x)}" y="${f(y)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${italic ? ' font-style="italic"' : ""}${tr}>${s}</text>`;
}

function line(x1, y1, x2, y2, o = {}) {
  const { stroke = NAVY, w = 1.5, dash } = o;
  return `  <line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
}

// ── Voxelový renderer (kabinetní promítání: vpředu čelo, nahoře a vpravo boky) ──
// buňka [i,j,k,skupina]: i = doprava, j = do hloubky (od diváka), k = nahoru.
const PALETTE = {
  n: { top: "#e9eff6", front: "#f7f9fc", right: "#d3deea" },
  w: { top: "#ffffff", front: "#ffffff", right: "#e9edf2" },
  g: { top: "#d5d9e0", front: "#c3c8d1", right: "#a9b0bb" },
};

function voxel(cells, { u = 14, dx = 0.45, dy = 0.3, grid = false } = {}) {
  const key = (i, j, k) => `${i},${j},${k}`;
  const map = new Map(cells.map(([i, j, k, g]) => [key(i, j, k), g ?? "n"]));
  const has = (i, j, k) => map.has(key(i, j, k));
  const grp = (i, j, k) => map.get(key(i, j, k));
  const P = (i, j, k) => [i * u + j * u * dx, -(k * u) - j * u * dy];

  // bounding box přes všechny rohy buněk
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [i, j, k] of cells) {
    for (const di of [0, 1]) for (const dj of [0, 1]) for (const dk of [0, 1]) {
      const [x, y] = P(i + di, j + dj, k + dk);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const ox = -minX, oy = -minY; // posun do lokálních souřadnic
  const Q = (i, j, k) => { const [x, y] = P(i, j, k); return [x + ox, y + oy]; };
  const origin = Q(0, 0, 0);

  const frontVis = (i, j, k, g) => has(i, j, k) && !has(i, j - 1, k) && grp(i, j, k) === g;
  const topVis = (i, j, k, g) => has(i, j, k) && !has(i, j, k + 1) && grp(i, j, k) === g;
  const rightVis = (i, j, k, g) => has(i, j, k) && !has(i + 1, j, k) && grp(i, j, k) === g;

  // Průchod 1: výplně stěn od nejvzdálenějších (painter). Průchod 2: hrany navrch,
  // bez ukusování sousedními výplněmi; hrana zakrytá bližší stěnou se nekreslí.
  const faces = []; // { pts, fill }
  const edges = []; // { a, b, owner }
  const jMax = Math.max(...cells.map((c) => c[1]));
  const jMin = Math.min(...cells.map((c) => c[1]));
  const iMax = Math.max(...cells.map((c) => c[0]));
  const iMin = Math.min(...cells.map((c) => c[0]));
  const kMax = Math.max(...cells.map((c) => c[2]));
  const kMin = Math.min(...cells.map((c) => c[2]));

  const addFace = (c, fill, nb, vis, g) => {
    const owner = faces.length;
    faces.push({ pts: c, fill });
    for (let e = 0; e < 4; e++) {
      const n = nb[e];
      if (grid || !vis(n[0], n[1], n[2], g)) edges.push({ a: c[e], b: c[(e + 1) % 4], owner });
    }
  };

  for (let j = jMax; j >= jMin; j--) {
    for (let i = iMin; i <= iMax; i++) {
      for (let k = kMin; k <= kMax; k++) {
        if (!has(i, j, k)) continue;
        const g = grp(i, j, k);
        const pal = PALETTE[g] ?? PALETTE.n;
        if (!has(i, j - 1, k)) {
          addFace([Q(i, j, k), Q(i + 1, j, k), Q(i + 1, j, k + 1), Q(i, j, k + 1)], pal.front,
            [[i, j, k - 1], [i + 1, j, k], [i, j, k + 1], [i - 1, j, k]], frontVis, g);
        }
        if (!has(i + 1, j, k)) {
          addFace([Q(i + 1, j, k), Q(i + 1, j + 1, k), Q(i + 1, j + 1, k + 1), Q(i + 1, j, k + 1)], pal.right,
            [[i, j, k - 1], [i, j + 1, k], [i, j, k + 1], [i, j - 1, k]], rightVis, g);
        }
        if (!has(i, j, k + 1)) {
          addFace([Q(i, j, k + 1), Q(i + 1, j, k + 1), Q(i + 1, j + 1, k + 1), Q(i, j + 1, k + 1)], pal.top,
            [[i, j - 1, k], [i + 1, j, k], [i, j + 1, k], [i - 1, j, k]], topVis, g);
        }
      }
    }
  }

  // Cyrus–Beck: interval parametru t, na kterém úsečka a→b leží uvnitř konvexního čtyřúhelníku
  // (s odstupem od jeho hranice, ať se hrana ležící přímo na okraji stěny nepovažuje za zakrytou).
  const insideInterval = (A, B, pts, eps = 0.5) => {
    let area = 0;
    for (let e = 0; e < 4; e++) { const q = pts[e], r = pts[(e + 1) % 4]; area += q[0] * r[1] - r[0] * q[1]; }
    const sig = area >= 0 ? 1 : -1;
    let t0 = 0, t1 = 1;
    const dx = B[0] - A[0], dy = B[1] - A[1];
    for (let e = 0; e < 4; e++) {
      const q = pts[e], r = pts[(e + 1) % 4];
      const ex = r[0] - q[0], ey = r[1] - q[1];
      const len = Math.hypot(ex, ey) || 1;
      const f0 = (sig * (ex * (A[1] - q[1]) - ey * (A[0] - q[0]))) / len - eps;
      const f1 = (sig * (ex * dy - ey * dx)) / len;
      if (Math.abs(f1) < 1e-9) { if (f0 < 0) return null; continue; }
      const t = -f0 / f1;
      if (f1 > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
      if (t0 >= t1) return null;
    }
    return t0 < t1 ? [t0, t1] : null;
  };
  const visiblePieces = (ed) => {
    const hid = [];
    for (let n = ed.owner + 1; n < faces.length; n++) {
      const iv = insideInterval(ed.a, ed.b, faces[n].pts);
      if (iv) hid.push(iv);
    }
    hid.sort((x, y) => x[0] - y[0]);
    const out = [];
    let cur = 0;
    for (const [h0, h1] of hid) {
      if (h0 > cur) out.push([cur, h0]);
      cur = Math.max(cur, h1);
    }
    if (cur < 1) out.push([cur, 1]);
    const L = Math.hypot(ed.b[0] - ed.a[0], ed.b[1] - ed.a[1]);
    return out.filter(([x, y]) => (y - x) * L > 1.6);
  };

  const segs = [];
  for (const ed of edges) {
    for (const [x, y] of visiblePieces(ed)) {
      segs.push({
        a: [ed.a[0] + (ed.b[0] - ed.a[0]) * x, ed.a[1] + (ed.b[1] - ed.a[1]) * x],
        b: [ed.a[0] + (ed.b[0] - ed.a[0]) * y, ed.a[1] + (ed.b[1] - ed.a[1]) * y],
      });
    }
  }

  const fills = faces.map(
    (fc) => `<polygon points="${fc.pts.map((q) => `${f(q[0])},${f(q[1])}`).join(" ")}" fill="${fc.fill}" shape-rendering="crispEdges"/>`
  );
  const d = segs.map((e) => `M${f(e.a[0])} ${f(e.a[1])}L${f(e.b[0])} ${f(e.b[1])}`).join("");
  const parts = [
    ...fills,
    `<path d="${d}" fill="none" stroke="${NAVY}" stroke-width="${grid ? 1.1 : 1.6}" stroke-linecap="round" stroke-linejoin="round"/>`,
  ];
  return { svg: parts.join("\n"), w: maxX - minX, h: maxY - minY, origin, map };
}

// Umístí voxelovou skupinu tak, aby bod (0,0,0) [levý dolní přední roh] padl na (px,py).
function place(v, px, py) {
  return `  <g transform="translate(${f(px - v.origin[0])} ${f(py - v.origin[1])})">\n${v.svg}\n  </g>`;
}

const box = (i0, i1, j0, j1, k0, k1, g = "n") => {
  const out = [];
  for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) for (let k = k0; k < k1; k++) out.push([i, j, k, g]);
  return out;
};

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

const written = [];
function write(name, w, h, body, title) {
  fs.writeFileSync(path.join(OUT, name), svgWrap(w, h, body, title), "utf8");
  written.push({ name, w, h });
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
