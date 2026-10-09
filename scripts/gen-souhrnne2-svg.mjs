// Vlastní SVG obrázky k souhrnným úlohám L2 (CERMAT styl): public/obrazky/souhrnne/l2-*.svg
// Spuštění: node scripts/gen-souhrnne2-svg.mjs
// Obrázky jsou ILUSTRAČNÍ (rozměry nese popisek); nekopírují žádný CERMAT obrázek.
import { NAVY, BLUE, f, text, line, makeWriter } from "./lib/svg.mjs";

const { write, written } = makeWriter("souhrnne");
const FILL = "#eef4fb";
const dimH = (x1, x2, y, label) => [
  line(x1, y, x2, y, { stroke: BLUE, w: 1.4 }), line(x1, y - 4, x1, y + 4, { stroke: BLUE, w: 1.4 }), line(x2, y - 4, x2, y + 4, { stroke: BLUE, w: 1.4 }),
  text((x1 + x2) / 2, y + 16, label, { size: 14, weight: 700, fill: NAVY }),
].join("\n");
const dimV = (x, y1, y2, label, anchor = "end", dx = -8) => [
  line(x, y1, x, y2, { stroke: BLUE, w: 1.4 }), line(x - 4, y1, x + 4, y1, { stroke: BLUE, w: 1.4 }), line(x - 4, y2, x + 4, y2, { stroke: BLUE, w: 1.4 }),
  text(x + dx, (y1 + y2) / 2 + 5, label, { size: 14, weight: 700, fill: NAVY, anchor }),
].join("\n");

// 1) Kruhová zahrada s chodníkem
{
  const cx = 130, cy = 100, R = 70, w = 12; // 10 m = 70 px → 1 m = 7 px; chodník 1 m ≈ 7 px (zvýrazněno na 12 px kvůli čitelnosti)
  const body = [
    `  <circle cx="${cx}" cy="${cy}" r="${R + w}" fill="#d6d3d1" stroke="${NAVY}" stroke-width="2"/>`,
    `  <circle cx="${cx}" cy="${cy}" r="${R}" fill="#dcfce7" stroke="${NAVY}" stroke-width="2"/>`,
    text(cx, cy + 5, "zahrada", { size: 14, weight: 700, fill: "#166534" }),
    line(cx - R, cy + 26, cx + R, cy + 26, { stroke: BLUE, w: 1.4 }),
    line(cx - R, cy + 22, cx - R, cy + 30, { stroke: BLUE, w: 1.4 }), line(cx + R, cy + 22, cx + R, cy + 30, { stroke: BLUE, w: 1.4 }),
    text(cx, cy + 44, "průměr 20 m", { size: 13, weight: 700, fill: NAVY }),
    line(cx + R, cy - 36, cx + R + w, cy - 36, { stroke: "#b45309", w: 2.4 }),
    text(cx + R + w + 8, cy - 40, "chodník", { size: 13, weight: 700, fill: "#92400e", anchor: "start" }),
    text(cx + R + w + 8, cy - 25, "šířka 1 m", { size: 13, weight: 700, fill: "#92400e", anchor: "start" }),
  ].join("\n");
  write("l2-zahrada-chodnik.svg", 330, 200, body, "Kruhová zahrada o průměru 20 m obklopená chodníkem široký 1 m (obrázek není v měřítku)");
}

// 2) Dva obdélníky: původní 9 × 6 cm a zvětšený (každá strana o 50 %)
{
  const k = 12; // px na cm
  const a = { x: 22, y: 150, w: 9 * k, h: 6 * k }, b = { x: 206, y: 150, w: 13.5 * k, h: 9 * k };
  const body = [
    `  <rect x="${a.x}" y="${a.y - a.h}" width="${a.w}" height="${a.h}" fill="${FILL}" stroke="${NAVY}" stroke-width="2.2"/>`,
    `  <rect x="${b.x}" y="${b.y - b.h}" width="${b.w}" height="${b.h}" fill="#fde68a" stroke="${NAVY}" stroke-width="2.2"/>`,
    text(a.x + a.w / 2, 26, "původní", { size: 13, weight: 700, fill: NAVY }), text(b.x + b.w / 2, 26, "po zvětšení", { size: 13, weight: 700, fill: NAVY }),
    dimH(a.x, a.x + a.w, a.y + 12, "9 cm"), dimV(a.x + a.w + 10, a.y - a.h, a.y, "6 cm", "start", 8),
    dimH(b.x, b.x + b.w, b.y + 12, "o 50 % delší"), dimV(b.x + b.w + 10, b.y - b.h, b.y, "o 50 % delší", "start", 8),
  ].join("\n");
  write("l2-dva-obdelniky.svg", 470, 196, body, "Obdélník o stranách 9 cm a 6 cm a obdélník, jehož strany jsou o 50 % delší (obrázek není v měřítku)");
}

// 3) Rovnoramenný trojúhelník: ramena x, základna x − 3, obvod 33 cm
{
  const A = [120, 22], B = [40, 150], C = [200, 150];
  const body = [
    `  <polygon points="${A.join(",")} ${B.join(",")} ${C.join(",")}" fill="${FILL}" stroke="${NAVY}" stroke-width="2.2" stroke-linejoin="round"/>`,
    text(66, 80, "x", { size: 17, weight: 800, fill: NAVY, italic: true }), text(176, 80, "x", { size: 17, weight: 800, fill: NAVY, italic: true }),
    text(120, 176, "x − 3", { size: 16, weight: 800, fill: NAVY }),
    text(120, 112, "obvod 33 cm", { size: 14, weight: 700, fill: BLUE }),
  ].join("\n");
  write("l2-rovnoramenny-obvod.svg", 240, 190, body, "Rovnoramenný trojúhelník s rameny x, základnou x − 3 a obvodem 33 cm (obrázek není v měřítku)");
}

// 4) Kolo štěstí: 8 shodných výsečí (3 červené, 2 modré, 3 zelené)
{
  const cx = 110, cy = 110, R = 90;
  const cols = [["č", "#fca5a5"], ["m", "#93c5fd"], ["z", "#86efac"], ["č", "#fca5a5"], ["z", "#86efac"], ["m", "#93c5fd"], ["č", "#fca5a5"], ["z", "#86efac"]];
  const body = [];
  cols.forEach(([l, c], i) => {
    const a1 = (i * 45 - 90) * Math.PI / 180, a2 = ((i + 1) * 45 - 90) * Math.PI / 180;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1), x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    const am = (a1 + a2) / 2;
    body.push(`  <path d="M ${cx} ${cy} L ${f(x1)} ${f(y1)} A ${R} ${R} 0 0 1 ${f(x2)} ${f(y2)} Z" fill="${c}" stroke="${NAVY}" stroke-width="2"/>`);
    body.push(text(cx + R * 0.62 * Math.cos(am), cy + R * 0.62 * Math.sin(am) + 5, l, { size: 16, weight: 800, fill: NAVY }));
  });
  body.push(`  <circle cx="${cx}" cy="${cy}" r="5" fill="${NAVY}"/>`);
  body.push(`  <polygon points="${cx},${cy - R - 2} ${cx - 8},${cy - R - 16} ${cx + 8},${cy - R - 16}" fill="${NAVY}"/>`);
  body.push(text(cx + R + 18, 70, "č – červená", { size: 12, weight: 700, fill: NAVY, anchor: "start" }), text(cx + R + 18, 88, "m – modrá", { size: 12, weight: 700, fill: NAVY, anchor: "start" }), text(cx + R + 18, 106, "z – zelená", { size: 12, weight: 700, fill: NAVY, anchor: "start" }));
  write("l2-kolo-stesti.svg", 330, 220, body.join("\n"), "Kolo štěstí rozdělené na 8 shodných výsečí: 3 červené, 2 modré a 3 zelené");
}

// 5) Čtverec s úhlopříčkou 12 cm
{
  const x = 40, y = 20, s = 140;
  const body = [
    `  <rect x="${x}" y="${y}" width="${s}" height="${s}" fill="${FILL}" stroke="${NAVY}" stroke-width="2.2"/>`,
    line(x, y + s, x + s, y, { stroke: BLUE, w: 2, dash: "7 4" }),
    text(x + s / 2 + 22, y + s / 2 - 6, "12 cm", { size: 14, weight: 800, fill: NAVY, rotate: -45 }),
  ].join("\n");
  write("l2-ctverec-uhlopricka.svg", 220, 180, body, "Čtverec s úhlopříčkou o délce 12 cm (obrázek není v měřítku)");
}

// 6) Anténa 12 m, lano 13 m, vzdálenost kotvy od paty hledaná
{
  const gx1 = 20, gx2 = 250, gy = 172, px = 60, tx = 60, ty = 28, kx = 180;
  const body = [
    line(gx1, gy, gx2, gy, { stroke: "#78716c", w: 3 }),
    line(px, gy, tx, ty, { stroke: NAVY, w: 3.5 }),
    line(tx, ty, kx, gy, { stroke: BLUE, w: 2, dash: "7 4" }),
    `  <circle cx="${kx}" cy="${gy}" r="4" fill="${BLUE}"/>`,
    text(px - 10, 100, "12 m", { size: 14, weight: 800, fill: NAVY, anchor: "end" }),
    text(124, 84, "lano 13 m", { size: 14, weight: 800, fill: NAVY, rotate: 30 }),
    line(px, gy + 14, kx, gy + 14, { stroke: BLUE, w: 1.4 }), line(px, gy + 10, px, gy + 18, { stroke: BLUE, w: 1.4 }), line(kx, gy + 10, kx, gy + 18, { stroke: BLUE, w: 1.4 }),
    text((px + kx) / 2, gy + 34, "?", { size: 18, weight: 800, fill: "#d9480f" }),
  ].join("\n");
  write("l2-antena-lano.svg", 270, 216, body, "Svislá anténa vysoká 12 m zajištěná lanem dlouhým 13 m; hledá se vzdálenost kotvy od paty antény");
}

console.log("Zapsáno:");
for (const w of written.filter((x) => x.name.startsWith("l2-"))) console.log(`  souhrnne/${w.name} (${w.w}×${w.h})`);
