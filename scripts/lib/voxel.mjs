// Sdílený voxelový renderer pro generátory vlastních SVG obrázků (tělesa z krychliček, kabinetní promítání).
// Používá ho scripts/gen-geometrie-svg.mjs (9. třída) i scripts/build-5-telesa.mjs (5. třída).
import { NAVY, f } from "./svg.mjs";

// ── Voxelový renderer (kabinetní promítání: vpředu čelo, nahoře a vpravo boky) ──
// buňka [i,j,k,skupina]: i = doprava, j = do hloubky (od diváka), k = nahoru.
export const PALETTE = {
  n: { top: "#e9eff6", front: "#f7f9fc", right: "#d3deea" },
  w: { top: "#ffffff", front: "#ffffff", right: "#e9edf2" },
  g: { top: "#d5d9e0", front: "#c3c8d1", right: "#a9b0bb" },
};

export function voxel(cells, { u = 14, dx = 0.45, dy = 0.3, grid = false } = {}) {
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
export function place(v, px, py) {
  return `  <g transform="translate(${f(px - v.origin[0])} ${f(py - v.origin[1])})">\n${v.svg}\n  </g>`;
}

export const box = (i0, i1, j0, j1, k0, k1, g = "n") => {
  const out = [];
  for (let i = i0; i < i1; i++) for (let j = j0; j < j1; j++) for (let k = k0; k < k1; k++) out.push([i, j, k, g]);
  return out;
};
