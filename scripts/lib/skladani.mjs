// Skládání těles z dílků (krychličky): otáčení ve 3D, bez překrytí. Pro úlohy typu „Kolik z těles A–E lze složit z těchto dílků?"
// L(vrstvy) zapíše útvar z řetězců: vrstvy[k][j] je řádek, znak „#" = krychlička (i = sloupec, j = řada do hloubky, k = patro).

// 24 otočení krychle (permutace os se znaménky a determinantem +1; zrcadlení mezi nimi není)
const rotations = (() => {
  const out = [];
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  const parity = (p) => { let s = 0; for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) if (p[i] > p[j]) s++; return s % 2 ? -1 : 1; };
  for (const p of perms) for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
    if (parity(p) * sx * sy * sz === 1) out.push((c) => [sx * c[p[0]], sy * c[p[1]], sz * c[p[2]]]);
  }
  return out;
})();
const cmp3 = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const norm = (cells) => { const m = [0, 1, 2].map((a) => Math.min(...cells.map((c) => c[a]))); return cells.map((c) => c.map((v, a) => v - m[a])).sort(cmp3); };
export const orientations = (cells) => { const seen = new Map(); for (const r of rotations) { const n = norm(cells.map(r)); seen.set(n.join("|"), n); } return [...seen.values()]; };
const keyOf = (c) => c.join(",");

/** Dá se těleso `fig` složit přesně z daných dílků (každý použitý právě jednou, libovolně otočený)? */
export function canBuild(fig, pieces) {
  const ors = pieces.map(orientations);
  const solve = (remaining, used) => {
    if (remaining.size === 0) return used.every(Boolean);
    const first = [...remaining].map((k) => k.split(",").map(Number)).sort(cmp3)[0];
    for (let p = 0; p < pieces.length; p++) {
      if (used[p]) continue;
      for (const o of ors[p]) for (const anchor of o) {
        const t = [first[0] - anchor[0], first[1] - anchor[1], first[2] - anchor[2]];
        const placed = o.map((c) => keyOf([c[0] + t[0], c[1] + t[1], c[2] + t[2]]));
        if (placed.every((k) => remaining.has(k))) {
          const rem = new Set(remaining); placed.forEach((k) => rem.delete(k));
          const u = [...used]; u[p] = true;
          if (solve(rem, u)) return true;
        }
      }
    }
    return false;
  };
  return solve(new Set(fig.map(keyOf)), pieces.map(() => false));
}

/** Mají oba útvary stejný tvar (až na otočení)? */
export const sameShape = (a, b) => a.length === b.length && orientations(a).some((o) => o.join("|") === norm(b).join("|"));

export const L = (layers) => layers.flatMap((rows, k) => rows.flatMap((r, j) => [...r].flatMap((ch, i) => (ch === "#" ? [[i, j, k]] : []))));

/** Každá krychlička má aspoň jednu viditelnou stěnu (zepředu, shora nebo zprava) — na obrázku se nic neschová. */
export function allVisible(cells) {
  const s = new Set(cells.map(keyOf));
  const has = (i, j, k) => s.has(`${i},${j},${k}`);
  return cells.every(([i, j, k]) => !has(i, j - 1, k) || !has(i, j, k + 1) || !has(i + 1, j, k));
}
/** Bez zakrytých dutin: žádné prázdné místo, kam by se dala „schovat" krychlička, aniž by se obrázek změnil (kontrola jednoznačnosti). */
export function unambiguous(cells) {
  const s = new Set(cells.map(keyOf));
  const has = (i, j, k) => s.has(`${i},${j},${k}`);
  const lo = [0, 1, 2].map((a) => Math.min(...cells.map((c) => c[a]))), hi = [0, 1, 2].map((a) => Math.max(...cells.map((c) => c[a])));
  for (let i = lo[0]; i <= hi[0]; i++) for (let j = lo[1]; j <= hi[1]; j++) for (let k = lo[2]; k <= hi[2]; k++) {
    if (has(i, j, k)) continue;
    // prázdné místo je zakryté, když je ze tří viditelných směrů obklopené krychličkami (zepředu, shora, zprava)
    if (has(i, j - 1, k) && has(i, j, k + 1) && has(i + 1, j, k)) return false;
  }
  return true;
}
