// Generátor vlastních SVG obrázků pro souhrnné úlohy (CERMAT styl).
// Spuštění: node scripts/gen-souhrnne-svg.mjs  → zapíše do public/obrazky/souhrnne/
// Obrázky jsou ILUSTRAČNÍ (rozměry nese popisek); nekopírují žádný CERMAT obrázek.
import { NAVY, BLUE, f, text, line, makeWriter } from "./lib/svg.mjs";

const { write, written } = makeWriter("souhrnne");

// dimenzní čára vodorovně / svisle
const dimH = (x1, x2, y, label) => [
  line(x1, y, x2, y, { stroke: BLUE, w: 1.4 }), line(x1, y - 4, x1, y + 4, { stroke: BLUE, w: 1.4 }), line(x2, y - 4, x2, y + 4, { stroke: BLUE, w: 1.4 }),
  text((x1 + x2) / 2, y + 16, label, { size: 14, weight: 700, fill: NAVY }),
].join("\n");
const dimV = (x, y1, y2, label) => [
  line(x, y1, x, y2, { stroke: BLUE, w: 1.4 }), line(x - 4, y1, x + 4, y1, { stroke: BLUE, w: 1.4 }), line(x - 4, y2, x + 4, y2, { stroke: BLUE, w: 1.4 }),
  text(x - 8, (y1 + y2) / 2 + 5, label, { size: 14, weight: 700, fill: NAVY, anchor: "end" }),
].join("\n");

// ── 1) Čtvercový a obdélníkový pozemek: a × a  a  0,8a × (a + 12) ──
{
  const sq = { x: 16, y: 40, s: 100 };
  const rc = { x: 144, w: 120, h: 80 };
  const base = sq.y + sq.s;
  const body = [
    text(sq.x + sq.s / 2, 24, "čtvercový pozemek", { size: 12, weight: 700, fill: NAVY }),
    text(rc.x + rc.w / 2, 24, "obdélníkový pozemek", { size: 12, weight: 700, fill: NAVY }),
    `  <rect x="${sq.x}" y="${sq.y}" width="${sq.s}" height="${sq.s}" fill="#eef4fb" stroke="${NAVY}" stroke-width="2.2"/>`,
    `  <rect x="${rc.x}" y="${base - rc.h}" width="${rc.w}" height="${rc.h}" fill="#eef4fb" stroke="${NAVY}" stroke-width="2.2"/>`,
    dimH(sq.x, sq.x + sq.s, base + 12, "a"),
    dimH(rc.x, rc.x + rc.w, base + 12, "a + 12"),
    line(rc.x + rc.w + 12, base - rc.h, rc.x + rc.w + 12, base, { stroke: BLUE, w: 1.4 }),
    line(rc.x + rc.w + 8, base - rc.h, rc.x + rc.w + 16, base - rc.h, { stroke: BLUE, w: 1.4 }),
    line(rc.x + rc.w + 8, base, rc.x + rc.w + 16, base, { stroke: BLUE, w: 1.4 }),
    text(rc.x + rc.w + 22, base - rc.h / 2 + 5, "0,8a", { size: 14, weight: 700, fill: NAVY, anchor: "start" }),
  ].join("\n");
  write("pozemky.svg", 330, 176, body, "Čtvercový pozemek o straně a a obdélníkový pozemek o stranách 0,8a a a + 12 (obrázek není v měřítku)");
}

// ── 2) Čtverec 10 cm s vepsaným kruhem; šedé jsou rohy mimo kruh ──
{
  const x = 30, y = 14, s = 160, cx = x + s / 2, cy = y + s / 2;
  const body = [
    `  <rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#c3cad5" stroke="${NAVY}" stroke-width="2.2"/>`,
    `  <circle cx="${cx}" cy="${cy}" r="${s / 2}" fill="#ffffff" stroke="${NAVY}" stroke-width="2.2"/>`,
    dimH(x, x + s, y + s + 12, "10 cm"),
  ].join("\n");
  write("kruh-ve-ctverci.svg", 220, 214, body, "Čtverec o straně 10 cm s vepsaným kruhem; šedé jsou části čtverce mimo kruh");
}

// ── 3) Zahrada 20 m × 12 m se čtvercovým záhonem 4 m × 4 m ──
{
  const k = 12, gx = 56, gy = 20, gw = 20 * k, gh = 12 * k;
  const zx = gx + 34, zy = gy + gh - 4 * k - 22;
  const body = [
    `  <rect x="${gx}" y="${gy}" width="${gw}" height="${gh}" fill="#dcfce7" stroke="${NAVY}" stroke-width="2.2"/>`,
    `  <rect x="${zx}" y="${zy}" width="${4 * k}" height="${4 * k}" fill="#fde68a" stroke="${NAVY}" stroke-width="2"/>`,
    text(zx + 2 * k, zy + 2 * k + 5, "záhon", { size: 12, weight: 700, fill: NAVY }),
    text(zx + 2 * k, zy + 4 * k + 15, "4 m", { size: 13, weight: 700, fill: NAVY }),
    text(gx + gw - 70, gy + 28, "trávník", { size: 13, weight: 700, fill: "#166534" }),
    dimH(gx, gx + gw, gy + gh + 14, "20 m"),
    dimV(gx - 12, gy, gy + gh, "12 m"),
  ].join("\n");
  write("zahrada.svg", 330, 196, body, "Obdélníková zahrada 20 m × 12 m, uvnitř čtvercový záhon o straně 4 m, zbytek je trávník");
}

console.log("Zapsáno:");
for (const w of written) console.log(`  souhrnne/${w.name} (${w.w}×${w.h})`);
