// Geometrie pro interaktivní konstrukce (karta „Rýsování"): průsečíky, přichytávání, ověření výsledku.
// Čistě matematické funkce bez závislosti na Reactu — používá je karta i skript, který úlohy generuje a ověřuje.

export type Pt = { x: number; y: number };

/** Útvar, který se může s jiným protínat. `seg` = úsečka, `ray` = polopřímka z `a` přes `b`, `line` = přímka, `circ` = kružnice. */
export type Shape =
  | { k: "seg"; a: Pt; b: Pt }
  | { k: "ray"; a: Pt; b: Pt }
  | { k: "line"; a: Pt; b: Pt }
  | { k: "circ"; c: Pt; r: number };

const EPS = 1e-6;

export const dist = (p: Pt, q: Pt) => Math.hypot(p.x - q.x, p.y - q.y);

function paramOk(k: "seg" | "ray" | "line", t: number): boolean {
  if (k === "line") return true;
  if (k === "ray") return t >= -EPS;
  return t >= -EPS && t <= 1 + EPS;
}

function lineLine(s1: Shape & { k: "seg" | "ray" | "line" }, s2: Shape & { k: "seg" | "ray" | "line" }): Pt[] {
  const d1 = { x: s1.b.x - s1.a.x, y: s1.b.y - s1.a.y };
  const d2 = { x: s2.b.x - s2.a.x, y: s2.b.y - s2.a.y };
  const den = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(den) < EPS) return []; // rovnoběžné (nebo splývající) — žádný izolovaný průsečík
  const w = { x: s2.a.x - s1.a.x, y: s2.a.y - s1.a.y };
  const t = (w.x * d2.y - w.y * d2.x) / den;
  const u = (w.x * d1.y - w.y * d1.x) / den;
  if (!paramOk(s1.k, t) || !paramOk(s2.k, u)) return [];
  return [{ x: s1.a.x + t * d1.x, y: s1.a.y + t * d1.y }];
}

function lineCircle(l: Shape & { k: "seg" | "ray" | "line" }, c: Shape & { k: "circ" }): Pt[] {
  const d = { x: l.b.x - l.a.x, y: l.b.y - l.a.y };
  const f = { x: l.a.x - c.c.x, y: l.a.y - c.c.y };
  const A = d.x * d.x + d.y * d.y;
  if (A < EPS) return [];
  const B = 2 * (f.x * d.x + f.y * d.y);
  const C = f.x * f.x + f.y * f.y - c.r * c.r;
  const disc = B * B - 4 * A * C;
  if (disc < -EPS) return [];
  const sq = Math.sqrt(Math.max(0, disc));
  const ts = disc < EPS ? [-B / (2 * A)] : [(-B - sq) / (2 * A), (-B + sq) / (2 * A)];
  return ts.filter((t) => paramOk(l.k, t)).map((t) => ({ x: l.a.x + t * d.x, y: l.a.y + t * d.y }));
}

function circleCircle(a: Shape & { k: "circ" }, b: Shape & { k: "circ" }): Pt[] {
  const d = dist(a.c, b.c);
  if (d < EPS) return [];
  if (d > a.r + b.r + EPS || d < Math.abs(a.r - b.r) - EPS) return [];
  const x = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
  const h2 = a.r * a.r - x * x;
  const ux = (b.c.x - a.c.x) / d, uy = (b.c.y - a.c.y) / d;
  const mx = a.c.x + x * ux, my = a.c.y + x * uy;
  if (h2 < EPS) return [{ x: mx, y: my }];
  const h = Math.sqrt(h2);
  return [{ x: mx - h * uy, y: my + h * ux }, { x: mx + h * uy, y: my - h * ux }];
}

export function intersections(s1: Shape, s2: Shape): Pt[] {
  if (s1.k === "circ" && s2.k === "circ") return circleCircle(s1, s2);
  if (s1.k === "circ") return lineCircle(s2 as Shape & { k: "seg" | "ray" | "line" }, s1);
  if (s2.k === "circ") return lineCircle(s1, s2);
  return lineLine(s1, s2);
}

/** Všechny průsečíky dvojic útvarů; body bližší než `merge` se sloučí. */
export function allIntersections(shapes: Shape[], merge = 0.75): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      for (const p of intersections(shapes[i], shapes[j])) {
        if (!out.some((q) => dist(p, q) < merge)) out.push(p);
      }
    }
  }
  return out;
}

/** Nejbližší bod z `pts` do vzdálenosti `maxDist`, jinak null. */
export function nearest(pts: Pt[], p: Pt, maxDist: number): Pt | null {
  let best: Pt | null = null;
  let bd = maxDist;
  for (const q of pts) {
    const d = dist(p, q);
    if (d <= bd) { bd = d; best = q; }
  }
  return best;
}

/** Vzdálenost bodu od přímky / polopřímky / úsečky (kružnice se nepočítá — vrací Infinity). */
export function distToShape(p: Pt, s: Shape): number {
  if (s.k === "circ") return Infinity;
  const dx = s.b.x - s.a.x, dy = s.b.y - s.a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 < EPS) return dist(p, s.a);
  let t = ((p.x - s.a.x) * dx + (p.y - s.a.y) * dy) / len2;
  if (s.k === "seg") t = Math.min(1, Math.max(0, t));
  else if (s.k === "ray") t = Math.max(0, t);
  return dist(p, { x: s.a.x + t * dx, y: s.a.y + t * dy });
}

/**
 * Pravítko s pravým úhlem (trojúhelník s ryskou): přímka procházející bodem `through` kolmo k přímce/úsečce `ref`.
 * Vrací dva body výsledné přímky (`through` a bod o 100 jednotek dál); null, pokud `ref` je kružnice.
 */
export function perpendicularThrough(ref: Shape, through: Pt): { a: Pt; b: Pt } | null {
  if (ref.k === "circ") return null;
  const dx = ref.b.x - ref.a.x, dy = ref.b.y - ref.a.y;
  const len = Math.hypot(dx, dy);
  if (len < EPS) return null;
  return { a: through, b: { x: through.x - (100 * dy) / len, y: through.y + (100 * dx) / len } };
}

/** Přímka (a,b) oříznutá obdélníkem 0..w × 0..h — pro vykreslení. */
export function clipLine(a: Pt, b: Pt, w: number, h: number, onlyForward = false): [Pt, Pt] | null {
  const dx = b.x - a.x, dy = b.y - a.y;
  let t0 = onlyForward ? 0 : -1e6, t1 = 1e6;
  const edges: [number, number][] = [[-dx, a.x], [dx, w - a.x], [-dy, a.y], [dy, h - a.y]];
  for (const [p, q] of edges) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  if (t1 < t0) return null;
  return [{ x: a.x + t0 * dx, y: a.y + t0 * dy }, { x: a.x + t1 * dx, y: a.y + t1 * dy }];
}

/**
 * Ověření výsledku: každý hledaný bod musí mít vlastní značku do vzdálenosti `tol`,
 * a nesmí být víc značek než hledaných bodů (jinak by šlo vyhrát tím, že se označí půlka obrázku).
 */
export function matchMarkers(markers: Pt[], targets: Pt[], tol: number) {
  const used = new Set<number>();
  const matchedMarker = new Array<boolean>(markers.length).fill(false);
  const matchedTarget = new Array<boolean>(targets.length).fill(false);
  targets.forEach((t, ti) => {
    let bi = -1, bd = tol;
    markers.forEach((m, mi) => {
      if (used.has(mi)) return;
      const d = dist(m, t);
      if (d <= bd) { bd = d; bi = mi; }
    });
    if (bi >= 0) { used.add(bi); matchedMarker[bi] = true; matchedTarget[ti] = true; }
  });
  const matched = matchedTarget.filter(Boolean).length;
  const extra = markers.length - matched;
  return { ok: matched === targets.length && extra === 0, matched, extra, matchedMarker, matchedTarget };
}

/** Oblouk kružnice (c, r) pokrývající směry k bodům `pts` + okraj `margin` stupňů; úhly v souřadnicích SVG (y dolů). */
export function arcThrough(c: Pt, r: number, pts: Pt[], margin = 28): { a1: number; a2: number } {
  const norm = (a: number) => ((a % 360) + 360) % 360;
  const angs = pts.map((p) => norm((Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI)).sort((x, y) => x - y);
  if (angs.length === 1) return { a1: angs[0] - margin, a2: angs[0] + margin };
  // vynecháme největší mezeru mezi sousedními směry
  let gapStart = 0, gapSize = -1;
  for (let i = 0; i < angs.length; i++) {
    const next = i + 1 < angs.length ? angs[i + 1] : angs[0] + 360;
    const gap = next - angs[i];
    if (gap > gapSize) { gapSize = gap; gapStart = i; }
  }
  const start = angs[(gapStart + 1) % angs.length];
  const end = angs[gapStart] + (gapStart + 1 < angs.length ? 360 : 0);
  void r;
  return { a1: start - margin, a2: (end < start ? end + 360 : end) + margin };
}
