// Generátor vlastních SVG obrázků pro těžké (CERMAT-styl) slovní úlohy.
// Spuštění: node scripts/gen-slovni-svg.mjs  → zapíše do public/obrazky/slovni/
// Obrázky jsou ILUSTRAČNÍ (nejsou v měřítku); hodnoty nese popisek. Nekopírují žádný CERMAT obrázek.
import { NAVY, BLUE, f, text, line, makeWriter } from "./lib/svg.mjs";

const { write, written } = makeWriter("slovni");

// ── 1) Mapa: dvě obce, vzdálenost 12 cm na mapě, měřítko 1 : 25 000 ──
{
  const A = [64, 158], B = [286, 72];
  const ang = (Math.atan2(B[1] - A[1], B[0] - A[0]) * 180) / Math.PI;
  const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
  const body = [
    `  <rect x="8" y="8" width="344" height="204" rx="10" fill="#eef6e8" stroke="#a3b18a" stroke-width="1.5"/>`,
    // řeka
    `  <path d="M8 198 C70 176 110 212 176 196 S290 168 352 190" fill="none" stroke="#9ec9ea" stroke-width="9" stroke-linecap="round"/>`,
    // les (kolečka)
    ...[[214, 132, 10], [232, 142, 8], [200, 146, 7], [246, 126, 7]].map(([x, y, r]) => `  <circle cx="${x}" cy="${y}" r="${r}" fill="#b7d3a0" stroke="#8fb079" stroke-width="1"/>`),
    // spojnice obcí
    line(A[0], A[1], B[0], B[1], { stroke: NAVY, w: 2 }),
    // kóta vedle spojnice
    text(mx - 6, my - 12, "12 cm", { size: 14, weight: 700, fill: NAVY, rotate: f(ang) }),
    // obce
    `  <circle cx="${A[0]}" cy="${A[1]}" r="6" fill="${NAVY}"/>`,
    `  <circle cx="${B[0]}" cy="${B[1]}" r="6" fill="${NAVY}"/>`,
    text(A[0] - 6, A[1] + 22, "Lipová", { size: 14, weight: 700, fill: NAVY, anchor: "start" }),
    text(B[0] - 6, B[1] - 12, "Dubnice", { size: 14, weight: 700, fill: NAVY, anchor: "end" }),
    // měřítko
    `  <rect x="20" y="20" width="118" height="30" rx="6" fill="#ffffff" stroke="${BLUE}" stroke-width="1.4"/>`,
    text(79, 40, "1 : 25 000", { size: 15, weight: 800, fill: NAVY }),
  ].join("\n");
  write("mapa-obce.svg", 360, 220, body, "Mapa v měřítku 1 : 25 000: obce Lipová a Dubnice ve vzdálenosti 12 cm na mapě");
}

// ── 2) Setkání dvou vozidel: auto z A (60 km/h, 8:00), motorka z B (90 km/h, 8:30), 270 km ──
{
  const y = 104, xa = 44, xb = 316;
  const arrow = (x1, x2, yy, col) => {
    const dir = x2 > x1 ? 1 : -1;
    return [
      line(x1, yy, x2, yy, { stroke: col, w: 3 }),
      `  <polygon points="${x2},${yy} ${x2 - dir * 10},${yy - 6} ${x2 - dir * 10},${yy + 6}" fill="${col}"/>`,
    ].join("\n");
  };
  const body = [
    // silnice
    `  <rect x="${xa}" y="${y - 7}" width="${xb - xa}" height="14" rx="7" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.2"/>`,
    line(xa + 10, y, xb - 10, y, { stroke: "#ffffff", w: 2, dash: "10 8" }),
    // města
    `  <circle cx="${xa}" cy="${y}" r="9" fill="${NAVY}"/>`,
    `  <circle cx="${xb}" cy="${y}" r="9" fill="${NAVY}"/>`,
    text(xa, y + 32, "A", { size: 17, weight: 800, fill: NAVY }),
    text(xb, y + 32, "B", { size: 17, weight: 800, fill: NAVY }),
    // vzdálenost
    line(xa, 44, xb, 44, { stroke: BLUE, w: 1.6 }),
    line(xa, 38, xa, 50, { stroke: BLUE, w: 1.6 }),
    line(xb, 38, xb, 50, { stroke: BLUE, w: 1.6 }),
    text((xa + xb) / 2, 34, "270 km", { size: 15, weight: 800, fill: NAVY }),
    // šipky vozidel
    arrow(xa + 16, xa + 96, y - 24, "#2E6DA4"),
    arrow(xb - 16, xb - 96, y - 24, "#c2410c"),
    // popisky
    text(xa, y + 56, "auto: 60 km/h", { size: 13, weight: 700, fill: "#2E6DA4", anchor: "start" }),
    text(xa, y + 74, "výjezd v 8:00", { size: 13, weight: 600, fill: NAVY, anchor: "start" }),
    text(xb, y + 56, "motorka: 90 km/h", { size: 13, weight: 700, fill: "#c2410c", anchor: "end" }),
    text(xb, y + 74, "výjezd v 8:30", { size: 13, weight: 600, fill: NAVY, anchor: "end" }),
  ].join("\n");
  write("setkani-vozidel.svg", 360, 200, body, "Města A a B ve vzdálenosti 270 km; z A vyjíždí auto rychlostí 60 km/h v 8:00, z B motorka rychlostí 90 km/h v 8:30");
}

console.log("Zapsáno:");
for (const w of written) console.log(`  slovni/${w.name} (${w.w}×${w.h})`);
