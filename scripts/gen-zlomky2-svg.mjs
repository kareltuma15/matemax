// Obrázky k úlohám Zlomky L1 (CERMAT styl): public/obrazky/zlomky/l1-*.svg
// Spuštění: node scripts/gen-zlomky2-svg.mjs
// Počet vybarvených částí se bere ze stejných dat, ze kterých se kreslí — obrázek tedy nemůže nesouhlasit s úlohou (build-zlomky-l1 ho znovu ověřuje).
import { NAVY, BLUE, f, text, line, makeWriter } from "./lib/svg.mjs";

const { write, written } = makeWriter("zlomky");
const GREY = "#9ca3af", LIGHT = "#ffffff";

// obdélníková mřížka r × c, vybarvené buňky podle seznamu indexů (po řádcích)
export function grid(name, rows, cols, shaded, title, o = {}) {
  const cw = o.cw ?? 38, ch = o.ch ?? 38, x0 = 16, y0 = 14;
  let body = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    body += `\n  <rect x="${x0 + c * cw}" y="${y0 + r * ch}" width="${cw}" height="${ch}" fill="${shaded.includes(i) ? GREY : LIGHT}" stroke="${NAVY}" stroke-width="1.6"/>`;
  }
  body += `\n  <rect x="${x0}" y="${y0}" width="${cols * cw}" height="${rows * ch}" fill="none" stroke="${NAVY}" stroke-width="2.6"/>`;
  write(name, cols * cw + 32, rows * ch + 28, body, title);
}

// kruh se shodnými výsečemi
export function pie(name, n, shaded, title) {
  const cx = 90, cy = 90, R = 70;
  let body = "";
  for (let i = 0; i < n; i++) {
    const a1 = ((i / n) * 360 - 90) * Math.PI / 180, a2 = (((i + 1) / n) * 360 - 90) * Math.PI / 180;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1), x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    body += `\n  <path d="M ${cx} ${cy} L ${f(x1)} ${f(y1)} A ${R} ${R} 0 0 1 ${f(x2)} ${f(y2)} Z" fill="${shaded.includes(i) ? GREY : LIGHT}" stroke="${NAVY}" stroke-width="1.8"/>`;
  }
  write(name, 180, 180, body, title);
}

// číselná osa od a do b, rozdělená na dílky; bod X na dané pozici (v dílcích)
function numberLine(name, from, to, parts, pointAt, labels, title) {
  const x0 = 24, x1 = 336, y = 62, step = (x1 - x0) / parts;
  let body = line(x0 - 10, y, x1 + 14, y, { stroke: NAVY, w: 2.4 });
  body += `\n  <polygon points="${x1 + 16},${y} ${x1 + 6},${y - 5} ${x1 + 6},${y + 5}" fill="${NAVY}"/>`;
  for (let i = 0; i <= parts; i++) {
    const major = labels[i] !== undefined;
    body += "\n" + line(x0 + i * step, y - (major ? 9 : 6), x0 + i * step, y + (major ? 9 : 6), { stroke: NAVY, w: major ? 2.2 : 1.5 });
    if (major) body += "\n" + text(x0 + i * step, y + 28, labels[i], { size: 15, weight: 700, fill: NAVY });
  }
  const px = x0 + pointAt * step;
  body += `\n  <circle cx="${f(px)}" cy="${y}" r="5" fill="#d9480f"/>` + "\n" + text(px, y - 16, "X", { size: 16, weight: 800, fill: "#d9480f" });
  write(name, 370, 100, body, title);
}

// pruh o n dílcích, zbarvení podle pole barev
function strip(name, colors, legend, title) {
  const w = 24, h = 36, x0 = 14, y0 = 14;
  let body = "";
  colors.forEach((c, i) => { body += `\n  <rect x="${x0 + i * w}" y="${y0}" width="${w}" height="${h}" fill="${c}" stroke="${NAVY}" stroke-width="1.6"/>`; });
  body += `\n  <rect x="${x0}" y="${y0}" width="${colors.length * w}" height="${h}" fill="none" stroke="${NAVY}" stroke-width="2.6"/>`;
  legend.forEach(([c, label], i) => {
    body += `\n  <rect x="${x0 + i * 100}" y="${y0 + h + 16}" width="16" height="16" fill="${c}" stroke="${NAVY}" stroke-width="1.4"/>` + "\n" + text(x0 + i * 100 + 24, y0 + h + 29, label, { size: 13, weight: 700, fill: NAVY, anchor: "start" });
  });
  write(name, colors.length * w + 28, h + 70, body, title);
}

// koláče: celé a půlka
function pizzas(name, whole, title) {
  const r = 34, gap = 14, y = 44;
  let body = "";
  for (let i = 0; i < whole; i++) {
    const cx = 44 + i * (2 * r + gap);
    body += `\n  <circle cx="${cx}" cy="${y}" r="${r}" fill="#fde68a" stroke="${NAVY}" stroke-width="2"/>` + `\n  <line x1="${cx - r}" y1="${y}" x2="${cx + r}" y2="${y}" stroke="${NAVY}" stroke-width="1.2"/>`;
  }
  const cx = 44 + whole * (2 * r + gap);
  body += `\n  <path d="M ${cx - r} ${y} A ${r} ${r} 0 0 1 ${cx + r} ${y} Z" fill="#fde68a" stroke="${NAVY}" stroke-width="2"/>`;
  write(name, cx + r + 24, 92, body, title);
}

// 1) obdélník 2 × 4, 5 vybarvených
grid("l1-obdelnik-5z8.svg", 2, 4, [0, 1, 2, 4, 5], "Obdélník rozdělený na 8 shodných částí, 5 z nich je šedých");
// 2) kruh 6 výsečí, 4 šedé
pie("l1-kruh-4z6.svg", 6, [0, 1, 2, 3], "Kruh rozdělený na 6 shodných výsečí, 4 z nich jsou šedé");
// 3) čtverec 3 × 3, dva sloupce šedé
grid("l1-ctverec-3x3.svg", 3, 3, [0, 1, 3, 4, 6, 7], "Čtverec rozdělený na 9 shodných čtverečků, šest z nich je šedých");
// 4) číselná osa 0 až 1 po osminách, X = 5/8
numberLine("l1-osa-osminy.svg", 0, 1, 8, 5, { 0: "0", 8: "1" }, "Číselná osa od 0 do 1 rozdělená na osm shodných dílků, bod X je u pátého dílku");
// 5) číselná osa 0 až 2 po čtvrtinách, X = 7/4
numberLine("l1-osa-ctvrtiny.svg", 0, 2, 8, 7, { 0: "0", 4: "1", 8: "2" }, "Číselná osa od 0 do 2 rozdělená na osm shodných dílků, bod X je u sedmého dílku");
// 6) dva obdélníky pod sebou: 3/4 a 5/8
{
  const NL = String.fromCharCode(10);
  const rect = (x, y, cw, n, shadedN) => Array.from({ length: n }, (_, i) => `  <rect x="${x + i * cw}" y="${y}" width="${cw}" height="38" fill="${i < shadedN ? GREY : LIGHT}" stroke="${NAVY}" stroke-width="1.6"/>`).join(NL) + NL + `  <rect x="${x}" y="${y}" width="${cw * n}" height="38" fill="none" stroke="${NAVY}" stroke-width="2.6"/>`;
  const body = [text(16, 22, "první obdélník", { size: 13, weight: 700, fill: NAVY, anchor: "start" }), rect(16, 30, 48, 4, 3), text(16, 100, "druhý obdélník", { size: 13, weight: 700, fill: NAVY, anchor: "start" }), rect(16, 108, 24, 8, 5)].join(NL);
  write("l1-porovnani.svg", 224, 160, body, "Dva obdélníky stejné délky: první má 4 shodné části a 3 jsou šedé, druhý má 8 shodných částí a 5 je šedých");
}
// 7) pruh 12 dílků: 4 červené, 3 modré, 5 bílých
strip("l1-pruh.svg", ["#fca5a5", "#fca5a5", "#fca5a5", "#fca5a5", "#93c5fd", "#93c5fd", "#93c5fd", "#ffffff", "#ffffff", "#ffffff", "#ffffff", "#ffffff"], [["#fca5a5", "červená"], ["#93c5fd", "modrá"], ["#ffffff", "bílá"]], "Pruh rozdělený na 12 shodných dílků: 4 červené, 3 modré, zbytek bílý");
// 8) tři celé koláče a půlka
pizzas("l1-kolace.svg", 3, "Tři celé koláče rozdělené na poloviny a jedna polovina koláče");
// 9) mřížka 5 × 4 (20 polí), 15 šedých
grid("l1-mrizka-15z20.svg", 4, 5, Array.from({ length: 15 }, (_, i) => i), "Mřížka 4 × 5 = 20 shodných polí, 15 z nich je šedých", { cw: 32, ch: 32 });
// 10) kruh 8 výsečí, 3 šedé
pie("l1-kruh-3z8.svg", 8, [0, 1, 2], "Kruh rozdělený na 8 shodných výsečí, 3 z nich jsou šedé");

console.log("Zapsáno:");
for (const w of written.filter((x) => x.name.startsWith("l1-"))) console.log(`  zlomky/${w.name} (${w.w}×${w.h})`);
