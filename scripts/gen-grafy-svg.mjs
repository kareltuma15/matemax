// Generátor vlastních SVG obrázků pro těžké (CERMAT-styl) úlohy z tématu Grafy a logika.
// Spuštění: node scripts/gen-grafy-svg.mjs  → zapíše do public/obrazky/grafy/
// Obrázky jsou VLASTNÍ (jiná pravidla, čísla i kontext než v testech CERMAT); hodnoty nese popisek/zadání.
import { NAVY, BLUE, f, text, line, makeWriter } from "./lib/svg.mjs";

const { write, written } = makeWriter("grafy");
const GRAY = "#c3cad5", LIGHT = "#e6eaf0", DARKBAR = "#5b6472", LIGHTBAR = "#d9dee6";

// ── 1) Čtverce: každý bílý čtverec → 9 shodných, prostřední šedě (obrazce 1–3) ──
{
  const S = 96, gap = 30, x0 = 22, y0 = 18;
  const parts = [];
  const sq = (x, y, s, depth, sw) => {
    if (depth === 0) { parts.push(`  <rect x="${f(x)}" y="${f(y)}" width="${f(s)}" height="${f(s)}" fill="#ffffff" stroke="${NAVY}" stroke-width="${sw}"/>`); return; }
    const t = s / 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (r === 1 && c === 1) parts.push(`  <rect x="${f(x + t)}" y="${f(y + t)}" width="${f(t)}" height="${f(t)}" fill="${GRAY}" stroke="${NAVY}" stroke-width="${sw}"/>`);
      else sq(x + c * t, y + r * t, t, depth - 1, sw);
    }
  };
  const stages = [[0, 2.2], [1, 1.6], [2, 1.0]];
  stages.forEach(([d, sw], i) => {
    const x = x0 + i * (S + gap);
    sq(x, y0, S, d, sw);
    parts.push(text(x + S / 2, y0 + S + 22, `${i + 1}. obrazec`, { size: 13, weight: 700, fill: NAVY }));
  });
  write("ctverce-frakt.svg", x0 * 2 + 3 * S + 2 * gap, y0 + S + 34, parts.join("\n"), "Obrazce 1 až 3: bílý čtverec se dělí na devět shodných čtverců a prostřední z nich je šedý");
}

// ── 2) Skupinový sloupcový graf (obecná funkce) ──
function groupedBars({ name, W, H, groups, maxUnits, axisNumbers, legend, missing, yLabel, title, alt }) {
  const x0 = 50, x1 = W - 128, yTop = title ? 36 : 22, yBase = H - 38;
  const unit = (yBase - yTop) / maxUnits;
  const gw = (x1 - x0) / groups.length, bw = Math.min(30, gw * 0.3);
  const parts = [];
  if (title) parts.push(text((x0 + x1) / 2, 18, title, { size: 13, weight: 700, fill: NAVY }));
  for (let u = 0; u <= maxUnits; u++) {
    const y = yBase - u * unit;
    parts.push(line(x0, y, x1, y, { stroke: u === 0 ? NAVY : "#cbd5e1", w: u === 0 ? 1.6 : 1 }));
    if (axisNumbers) parts.push(text(x0 - 8, y + 4, String(u), { size: 11, weight: 600, fill: NAVY, anchor: "end" }));
    else parts.push(line(x0 - 5, y, x0, y, { stroke: NAVY, w: 1.2 }));
  }
  parts.push(line(x0, yTop, x0, yBase, { stroke: NAVY, w: 1.6 }));
  if (yLabel) parts.push(text(14, (yTop + yBase) / 2, yLabel, { size: 12, weight: 600, fill: NAVY, rotate: -90 }));
  groups.forEach((g, gi) => {
    const cx = x0 + gw * (gi + 0.5);
    g.values.forEach((v, si) => {
      const bx = cx + (si === 0 ? -bw : 0);
      if (v === null) {
        parts.push(`  <rect x="${f(bx)}" y="${f(yTop)}" width="${f(bw)}" height="${f(yBase - yTop)}" fill="none" stroke="${NAVY}" stroke-width="1.2" stroke-dasharray="5 4"/>`);
        parts.push(text(bx + bw / 2, yTop + 18, "?", { size: 16, weight: 800, fill: NAVY }));
      } else {
        const h = v * unit;
        parts.push(`  <rect x="${f(bx)}" y="${f(yBase - h)}" width="${f(bw)}" height="${f(h)}" fill="${si === 0 ? DARKBAR : LIGHTBAR}" stroke="${NAVY}" stroke-width="1.2"/>`);
      }
    });
    parts.push(text(cx, yBase + 18, g.label, { size: 11, weight: 700, fill: NAVY }));
  });
  legend.forEach((l, i) => {
    const ly = yTop + 24 + i * 24;
    parts.push(`  <rect x="${x1 + 18}" y="${ly - 10}" width="14" height="14" fill="${i === 0 ? DARKBAR : LIGHTBAR}" stroke="${NAVY}" stroke-width="1.1"/>`);
    parts.push(text(x1 + 38, ly + 2, l, { size: 12, weight: 600, fill: NAVY, anchor: "start" }));
  });
  write(name, W, H, parts.join("\n"), alt);
}

groupedBars({
  name: "oddily-chybi-udaj.svg", W: 400, H: 250, maxUnits: 9, axisNumbers: false, yLabel: "Počet žáků",
  legend: ["6. třídy", "7. třídy"],
  groups: [{ label: "fotbalový", values: [6, 4] }, { label: "volejbalový", values: [3, 6] }, { label: "atletický", values: [3, null] }],
  alt: "Skupinový sloupcový graf: počty žáků 6. a 7. tříd ve třech sportovních oddílech, osa bez čísel, jeden údaj chybí (čárkovaný sloupec)",
});
groupedBars({
  name: "sporty-chlapci-divky.svg", W: 500, H: 250, maxUnits: 9, axisNumbers: true, title: "Nejoblíbenější sporty",
  legend: ["chlapci", "dívky"],
  groups: [{ label: "fotbal", values: [8, 2] }, { label: "plavání", values: [4, 7] }, { label: "tenis", values: [4, 8] }, { label: "atletika", values: [6, 4] }, { label: "gymnastika", values: [2, 3] }],
  alt: "Sloupcový graf nejoblíbenějších sportů žáků 9. ročníku: počty chlapců a dívek u fotbalu, plavání, tenisu, atletiky a gymnastiky",
});

// ── 3) Dva propojené koláče (výlet → hory podle programu) ──
{
  const R = 74, cy = 148;
  const pt = (cx, r, deg) => [cx + r * Math.sin((deg * Math.PI) / 180), cy - r * Math.cos((deg * Math.PI) / 180)];
  const parts = [];
  const pie = (cx, title, slices) => {
    parts.push(text(cx, 30, title, { size: 13, weight: 700, fill: NAVY }));
    let a = 0;
    for (const s of slices) {
      const b = a + (s.pct / 100) * 360;
      const [x1, y1] = pt(cx, R, a), [x2, y2] = pt(cx, R, b);
      parts.push(`  <path d="M${cx} ${cy} L${f(x1)} ${f(y1)} A${R} ${R} 0 ${b - a > 180 ? 1 : 0} 1 ${f(x2)} ${f(y2)} Z" fill="${s.fill}" stroke="${NAVY}" stroke-width="1.6" stroke-linejoin="round"/>`);
      const mid = (a + b) / 2;
      if (s.out) {
        const [lx1, ly1] = pt(cx, R * 0.86, mid), [lx2, ly2] = pt(cx, R * 1.22, mid);
        parts.push(line(lx1, ly1, lx2, ly2, { stroke: NAVY, w: 1.2 }));
        const lxT = lx2 + (mid > 180 ? -4 : 4), anc = mid > 180 ? "end" : "start";
        parts.push(text(lxT, s.val ? ly2 - 16 : ly2 - 2, s.name, { size: 12, weight: 700, fill: NAVY, anchor: anc }));
        if (s.val) parts.push(text(lxT, ly2 - 3, s.val, { size: 12, weight: 600, fill: NAVY, anchor: anc }));
      } else {
        const [tx, ty] = pt(cx, R * 0.6, mid);
        parts.push(text(tx, ty - 2, s.name, { size: 12, weight: 700, fill: NAVY }));
        if (s.val) parts.push(text(tx, ty + 13, s.val, { size: 12, weight: 600, fill: NAVY }));
      }
      a = b;
    }
  };
  pie(108, "Kam chtějí jet na výlet", [
    { pct: 50, fill: GRAY, name: "hory", val: "50 %" },
    { pct: 30, fill: "#ffffff", name: "aquapark", val: "12 žáků" },
    { pct: 20, fill: LIGHT, name: "muzeum", val: "20 %" },
  ]);
  pie(322, "Hory podle programu", [
    { pct: 60, fill: GRAY, name: "turistika" },
    { pct: 25, fill: "#ffffff", name: "lyžování", val: "5 žáků" },
    { pct: 15, fill: LIGHT, name: "snowboarding", val: "3 žáci", out: true },
  ]);
  write("dva-kolace-vylet.svg", 430, 244, parts.join("\n"), "Dva koláčové grafy: kam chtějí jet žáci na výlet (hory 50 %, aquapark 12 žáků, muzeum 20 %) a hory podle programu (lyžování 5 žáků, snowboarding 3 žáci, ostatní turistika)");
}

// ── 4) Trojúhelníkové obrazce z kruhů (obrazce 1–4): tmavý kruh do každé mezery mezi třemi bílými ──
{
  const R = 12, d = 2 * R, h = (d * Math.sqrt(3)) / 2, gap = 54, x0 = 30, y0 = 14;
  const parts = [];
  let cursor = x0;
  for (let n = 1; n <= 4; n++) {
    const w = n * d, cx = cursor + w / 2;
    const C = (i, j) => [cx + (j - i / 2) * d, y0 + R + i * h];
    for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
      const [x, y] = C(i, j);
      parts.push(`  <circle cx="${f(x)}" cy="${f(y)}" r="${R}" fill="#ffffff" stroke="${NAVY}" stroke-width="1.6"/>`);
    }
    const dark = [];
    for (let i = 0; i <= n - 2; i++) {
      for (let j = 0; j <= i; j++) dark.push([C(i, j), C(i + 1, j), C(i + 1, j + 1)]);       // špička nahoru
      for (let j = 0; j < i; j++) dark.push([C(i, j), C(i, j + 1), C(i + 1, j + 1)]);       // špička dolů
    }
    for (const tri of dark) {
      const gx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, gy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
      parts.push(`  <circle cx="${f(gx)}" cy="${f(gy)}" r="3.6" fill="${DARKBAR}" stroke="${NAVY}" stroke-width="1"/>`);
    }
    parts.push(text(cx, y0 + 2 * R + 3 * h + 24, `${n}. obrazec`, { size: 13, weight: 700, fill: NAVY }));
    cursor += w + gap;
  }
  write("trojuhelnik-kruhy.svg", cursor - gap + x0, Math.ceil(y0 + 2 * R + 3 * h + 38), parts.join("\n"), "Obrazce 1 až 4: bílé kruhy uspořádané do trojúhelníku a malý tmavý kruh v každé mezeře mezi třemi sousedními bílými kruhy");
}

console.log("Zapsáno:");
for (const w of written) console.log(`  grafy/${w.name} (${w.w}×${w.h})`);
