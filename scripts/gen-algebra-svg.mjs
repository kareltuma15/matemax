// Generátor vlastních SVG obrázků pro těžké (CERMAT-styl) úlohy z výrazů a rovnic.
// Spuštění: node scripts/gen-algebra-svg.mjs  → public/obrazky/vyrazy/
// Obrázky jsou ILUSTRAČNÍ (nejsou v měřítku); hodnoty nese popisek. Nekopírují žádný CERMAT obrázek.
import { NAVY, BLUE, f, text, line, makeWriter } from "./lib/svg.mjs";

const vyr = makeWriter("vyrazy");

const dimH = (x1, x2, y, label, o = {}) => [
  line(x1, y, x2, y, { stroke: BLUE, w: 1.4 }),
  line(x1, y - 4, x1, y + 4, { stroke: BLUE, w: 1.4 }),
  line(x2, y - 4, x2, y + 4, { stroke: BLUE, w: 1.4 }),
  text((x1 + x2) / 2, y + 17, label, o),
].join("\n");
const dimV = (x, y1, y2, label, o = {}) => [
  line(x, y1, x, y2, { stroke: BLUE, w: 1.4 }),
  line(x - 4, y1, x + 4, y1, { stroke: BLUE, w: 1.4 }),
  line(x - 4, y2, x + 4, y2, { stroke: BLUE, w: 1.4 }),
  text(x - 8, (y1 + y2) / 2 + 5, label, { anchor: "end", ...o }),
].join("\n");

// ── výrazy 1) obdélník (x + 4) × (x − 1), ke každé straně se přidají 2 cm ──
{
  const x0 = 60, y0 = 66, w = 170, h = 96, e = 26;
  const body = [
    // přírůstek (vpravo a nahoře) — L-tvar
    `  <path d="M${x0} ${y0} L${x0} ${y0 - e} L${x0 + w + e} ${y0 - e} L${x0 + w + e} ${y0 + h} L${x0 + w} ${y0 + h} L${x0 + w} ${y0} Z" fill="#dbeafe" stroke="${BLUE}" stroke-width="1.6" stroke-dasharray="5 3" stroke-linejoin="round"/>`,
    `  <rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#f1f5f9" stroke="${NAVY}" stroke-width="2.2"/>`,
    dimH(x0, x0 + w, y0 + h + 16, "x + 4", { size: 14 }),
    dimH(x0 + w, x0 + w + e, y0 + h + 16, "2", { size: 14 }),
    dimV(x0 - 14, y0, y0 + h, "x − 1", { size: 14 }),
    dimV(x0 - 14, y0 - e, y0, "2", { size: 14 }),
  ].join("\n");
  vyr.write("obdelnik-zvetseni.svg", 320, 230, body, "Obdélník se stranami x + 4 a x − 1, ke každé straně se přidají 2 cm (přidané části jsou čárkovaně)");
}

// ── výrazy 2) trojúhelník se stranami x, x + 2, 2x − 1 (není v měřítku) ──
{
  const A = [40, 168], B = [260, 168], C = [156, 46];
  const body = [
    `  <polygon points="${A} ${B} ${C}" fill="#eef4fb" stroke="${NAVY}" stroke-width="2.2" stroke-linejoin="round"/>`,
    text((A[0] + C[0]) / 2 - 22, (A[1] + C[1]) / 2 - 6, "x + 2", { size: 15, anchor: "end" }),
    text((B[0] + C[0]) / 2 + 22, (B[1] + C[1]) / 2 - 6, "x", { size: 15, anchor: "start", italic: true }),
    text((A[0] + B[0]) / 2, A[1] + 22, "2x − 1", { size: 15 }),
    text(A[0] - 10, A[1] + 14, "A", { fill: NAVY, weight: 700, size: 14 }),
    text(B[0] + 12, B[1] + 14, "B", { fill: NAVY, weight: 700, size: 14 }),
    text(C[0], C[1] - 8, "C", { fill: NAVY, weight: 700, size: 14 }),
  ].join("\n");
  vyr.write("trojuhelnik-vyrazy.svg", 320, 206, body, "Trojúhelník ABC se stranami x + 2, x a 2x − 1 (obrázek není v měřítku)");
}

console.log("Zapsáno:");
for (const w of vyr.written.map((x) => "vyrazy/" + x.name)) console.log("  " + w);
