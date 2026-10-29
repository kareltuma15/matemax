// 5. třída, okruh „Grafy, tabulky a vzory", třetí dávka (P5_GRA_31–45): piktogram, sloupcový a dvojitý sloupcový graf, tabulky a pravidla, pravdivé tvrzení, špejle a čtverečky, střídavé posloupnosti.
// Styl podle úloh 8 (grafy a tvrzení) a 14 (vzory a posloupnosti, malé i velké číslo, obrácená otázka) oficiálních testů CERMAT pro 5. třídu 2022–2026 (vlastní data, obrázky a čísla, nic se nekopíruje).
// Spuštění: node scripts/build-5-grafy3.mjs → nakreslí public/obrazky/p5/gra3-*.svg a doplní/přepíše P5_GRA_31–45 v src/data/nahled-batch.json (jiné dávky nechá).
// Obrázky se kreslí ze stejných dat, ze kterých se odpovědi nezávisle počítají; tvrzení u A–E se vyhodnocují programem (musí platit právě jedno).
import fs from "node:fs";
import { NAVY, text, line, makeWriter } from "./lib/svg.mjs";
const N = await import("../src/lib/normalize.ts");

const { write } = makeWriter("p5");
const FILL = "#cfe3f7", FILL2 = "#f6d3cc", HEAD = "#e6eef8", GRID = "#cbd5e1";
const f = (n) => Math.round(n * 100) / 100;
const bg = (w, h) => `  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>\n`;

// ── sloupcový graf ──
function barChart(name, { cats, vals, maxV, step, title, alt }) {
  const n = cats.length, slot = 64, x0 = 46, yTop = title ? 38 : 20, yBase = 178;
  const W = x0 + n * slot + 18, H = yBase + 34;
  const unit = (yBase - yTop) / maxV;
  let body = bg(W, H);
  if (title) body += text(W / 2, 20, title, { size: 13, weight: 700, fill: NAVY }) + "\n";
  for (let v = 0; v <= maxV; v += step) {
    const y = yBase - v * unit;
    body += line(x0, y, W - 10, y, { stroke: v === 0 ? NAVY : GRID, w: v === 0 ? 1.8 : 1 }) + "\n";
    body += text(x0 - 8, y + 4, String(v), { size: 11, weight: 600, fill: NAVY, anchor: "end" }) + "\n";
  }
  body += line(x0, yTop, x0, yBase, { stroke: NAVY, w: 1.8 }) + "\n";
  cats.forEach((c, i) => {
    const cx = x0 + slot * (i + 0.5), bw = 34;
    if (vals[i] === null) {
      body += `  <rect x="${f(cx - bw / 2)}" y="${f(yTop)}" width="${bw}" height="${f(yBase - yTop)}" fill="none" stroke="${NAVY}" stroke-width="1.3" stroke-dasharray="5 4"/>\n` + text(cx, yTop + 20, "?", { size: 17, weight: 800, fill: NAVY }) + "\n";
    } else {
      const h = vals[i] * unit;
      body += `  <rect x="${f(cx - bw / 2)}" y="${f(yBase - h)}" width="${bw}" height="${f(h)}" fill="${FILL}" stroke="${NAVY}" stroke-width="1.6"/>\n`;
    }
    body += text(cx, yBase + 19, c, { size: 12, weight: 700, fill: NAVY }) + "\n";
  });
  write(name, W, H, body, alt);
  return { w: W, h: H };
}

// ── dvousloupcový graf; null = chybějící sloupec (čárkovaný se „?") ──
function groupedBar(name, { cats, series, maxV, step, title, alt }) {
  const n = cats.length, slot = 92, x0 = 46, yTop = 44, yBase = 184, bw = 30;
  const W = x0 + n * slot + 18, H = yBase + 34;
  const unit = (yBase - yTop) / maxV;
  let body = bg(W, H);
  body += text(W / 2, 18, title, { size: 13, weight: 700, fill: NAVY }) + "\n";
  series.forEach((s, k) => {
    const lx = W / 2 - 62 + k * 80;
    body += `  <rect x="${lx}" y="26" width="12" height="12" fill="${s.color}" stroke="${NAVY}" stroke-width="1.2"/>\n` + text(lx + 17, 36, s.name, { size: 12, weight: 600, fill: NAVY, anchor: "start" }) + "\n";
  });
  for (let v = 0; v <= maxV; v += step) {
    const y = yBase - v * unit;
    body += line(x0, y, W - 10, y, { stroke: v === 0 ? NAVY : GRID, w: v === 0 ? 1.8 : 1 }) + "\n";
    body += text(x0 - 8, y + 4, String(v), { size: 11, weight: 600, fill: NAVY, anchor: "end" }) + "\n";
  }
  body += line(x0, yTop, x0, yBase, { stroke: NAVY, w: 1.8 }) + "\n";
  cats.forEach((c, i) => {
    const cx = x0 + slot * (i + 0.5);
    series.forEach((s, k) => {
      const bx = cx + (k - 1) * bw + (k === 0 ? -1 : 1), v = s.vals[i];
      if (v === null) {
        body += `  <rect x="${f(bx)}" y="${f(yTop + 6)}" width="${bw}" height="${f(yBase - yTop - 6)}" fill="none" stroke="${NAVY}" stroke-width="1.3" stroke-dasharray="5 4"/>\n` + text(bx + bw / 2, yTop + 26, "?", { size: 16, weight: 800, fill: NAVY }) + "\n";
      } else {
        const h = v * unit;
        body += `  <rect x="${f(bx)}" y="${f(yBase - h)}" width="${bw}" height="${f(h)}" fill="${s.color}" stroke="${NAVY}" stroke-width="1.6"/>\n`;
      }
    });
    body += text(cx, yBase + 19, c, { size: 12, weight: 700, fill: NAVY }) + "\n";
  });
  write(name, W, H, body, alt);
  return { w: W, h: H };
}

// ── tabulka ──
function table(name, { header, rows, colW = 74, firstW = 110, rowH = 34, alt }) {
  const cols = header.length, m = 10, W = m * 2 + firstW + (cols - 1) * colW, H = m * 2 + (rows.length + 1) * rowH;
  let body = bg(W, H);
  const cx = (c) => m + (c === 0 ? 0 : firstW + (c - 1) * colW), cwid = (c) => (c === 0 ? firstW : colW);
  [header, ...rows].forEach((r, ri) => {
    r.forEach((cell, c) => {
      const x = cx(c), y = m + ri * rowH;
      body += `  <rect x="${x}" y="${y}" width="${cwid(c)}" height="${rowH}" fill="${ri === 0 || c === 0 ? HEAD : "#ffffff"}" stroke="${NAVY}" stroke-width="1.5"/>\n`;
      body += text(x + cwid(c) / 2, y + rowH / 2 + 5, String(cell), { size: 14, weight: ri === 0 || c === 0 || cell === "?" ? 800 : 600, fill: NAVY }) + "\n";
    });
  });
  write(name, W, H, body, alt);
  return { w: W, h: H };
}

// ── piktogram ──
function pikto(name, { title, cats, icons, per, unit = "žáci", alt }) {
  const rowH = 34, labW = 84, ic = 28, W = labW + Math.max(...icons) * ic + 26, top = 44, H = top + cats.length * rowH + 40;
  let body = bg(W, H);
  body += text(W / 2, 22, title, { size: 14, weight: 700, fill: NAVY }) + "\n";
  cats.forEach((cname, i) => {
    const y = top + i * rowH;
    body += text(labW - 10, y + 22, cname, { size: 13, weight: 700, fill: NAVY, anchor: "end" }) + "\n";
    for (let k = 0; k < icons[i]; k++) body += `  <circle cx="${labW + k * ic + 14}" cy="${y + 17}" r="10" fill="${FILL}" stroke="${NAVY}" stroke-width="1.8"/>\n`;
  });
  const ly = top + cats.length * rowH + 14;
  body += `  <circle cx="22" cy="${ly + 6}" r="10" fill="${FILL}" stroke="${NAVY}" stroke-width="1.8"/>\n` + text(40, ly + 11, `= ${per} ${unit}`, { size: 13, weight: 700, fill: NAVY, anchor: "start" }) + "\n";
  write(name, W, H, body, alt);
  return { w: W, h: H };
}

// ── špejle: řada n trojúhelníků má vrcholy V0..V(n+1), hrany Vi–V(i+1) a Vi–V(i+2) ──
const triEdges = (n) => { const e = []; for (let i = 0; i <= n; i++) e.push([i, i + 1]); for (let i = 0; i <= n - 1; i++) e.push([i, i + 2]); return e; };
const triSticks = (n) => triEdges(n).length;
function triFigures(name, ns, alt) {
  const a = 40, hh = 34, m = 14, gap = 36;
  const widths = ns.map((n) => ((n + 1) * a) / 2 + 2 * m);
  const W = widths.reduce((s, x) => s + x, 0) + (ns.length - 1) * gap, H = hh + 2 * m + 22;
  let body = bg(W, H), ox = 0;
  ns.forEach((n, idx) => {
    const v = (i) => [ox + m + (i * a) / 2, i % 2 === 0 ? m + hh : m];
    for (const [i, j] of triEdges(n)) { const [x1, y1] = v(i), [x2, y2] = v(j); body += `  <line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${NAVY}" stroke-width="3.5" stroke-linecap="round"/>\n`; }
    body += text(ox + widths[idx] / 2, H - 6, `${idx + 1}. obrazec`, { size: 12, fill: NAVY }) + "\n";
    ox += widths[idx] + gap;
  });
  write(name, W, H, body, alt);
  return { w: W, h: H };
}

// ── čtvercové obrazce n × n ──
function squareFigures(name, ns, alt) {
  const c = 24, m = 14, gap = 34, W = ns.reduce((s, n) => s + n * c, 0) + (ns.length - 1) * gap + 2 * m, mx = Math.max(...ns), H = mx * c + 2 * m + 22;
  let body = bg(W, H), x = m;
  ns.forEach((n, idx) => {
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) body += `  <rect x="${x + i * c}" y="${m + (mx - n) * c + j * c}" width="${c}" height="${c}" fill="${FILL}" stroke="${NAVY}" stroke-width="1.8"/>\n`;
    body += text(x + (n * c) / 2, H - 6, `${idx + 1}. obrazec`, { size: 12, fill: NAVY }) + "\n";
    x += n * c + gap;
  });
  write(name, W, H, body, alt);
  return { w: W, h: H };
}

// ── data ──
const KROUZ_P = { cats: ["kreslení", "šachy", "fotbal", "tanec"], icons: [4, 2, 6, 3], per: 5 };
const PIKTO = { cats: ["pěšky", "kolo", "autobus", "auto"], icons: [3, 5, 4, 2], per: 4 };
const T_TEPLOTY = { header: ["den", "po", "út", "st", "čt", "pá"], rows: [["teplota (°C)", 9, 12, 8, 15, 11]] };
const SKUPINY = { cats: ["šachy", "kreslení", "fotbal", "tanec"], chlapci: [8, 4, 12, 2], divky: [5, 11, 3, 10] };
const T_SRAZKY = { header: ["měsíc", "červen", "červenec", "srpen", "září"], rows: [["srážky (mm)", 40, 60, 20, 30]] };
const T_PRAVIDLO = { header: ["číslo", 2, 5, 8, "?"], rows: [["nové číslo", 7, 16, 25, 40]] };
const ZMRZ = { cats: ["po", "út", "st", "čt", "pá", "so"], vals: [12, 18, 15, 24, 27, 33] };
const SOUTEZ = { cats: ["5. A", "5. B", "5. C", "5. D"], vals: [18, 22, null, 14], celkem: 78 };
const TRIDY3 = { cats: ["5. A", "5. B", "5. C"], chlapci: [12, 14, null], divky: [13, null, 12] };
const KROUZKY = { cats: ["plavání", "tanec", "šachy", "fotbal"], vals: [18, 12, 6, 24] };

const dimPi = pikto("gra3-piktogram.svg", { title: "Jak chodíme do školy", ...PIKTO, alt: `Obrázkový graf: ${PIKTO.cats.map((c, i) => `${c} ${PIKTO.icons[i]} obrázků`).join(", ")}; jeden obrázek znamená ${PIKTO.per} žáky` });
const dimTe = table("gra3-teploty.svg", { ...T_TEPLOTY, colW: 56, alt: "Teploty v poledne: pondělí 9 °C, úterý 12 °C, středa 8 °C, čtvrtek 15 °C, pátek 11 °C" });
const dimTri = triFigures("gra3-trojuhelniky.svg", [1, 2, 3], "Obrazce ze špejlí: 1. obrazec je jeden trojúhelník ze 3 špejlí, 2. obrazec jsou dva trojúhelníky vedle sebe z 5 špejlí, 3. obrazec jsou tři trojúhelníky vedle sebe ze 7 špejlí");
const dimKp = pikto("gra3-krouzky-obrazky.svg", { title: "Děti v kroužcích", ...KROUZ_P, unit: "dětí", alt: `Obrázkový graf: ${KROUZ_P.cats.map((c, i) => `${c} ${KROUZ_P.icons[i]} obrázků`).join(", ")}; jeden obrázek znamená ${KROUZ_P.per} dětí` });
const dimSk = groupedBar("gra3-skupiny.svg", { cats: SKUPINY.cats, maxV: 14, step: 2, title: "Děti v kroužcích", series: [{ name: "chlapci", color: FILL, vals: SKUPINY.chlapci }, { name: "dívky", color: FILL2, vals: SKUPINY.divky }], alt: `Sloupcový graf chlapců a dívek v kroužcích: ${SKUPINY.cats.map((c, i) => `${c} ${SKUPINY.chlapci[i]} chlapců a ${SKUPINY.divky[i]} dívek`).join(", ")}` });
const dimSr = table("gra3-srazky.svg", { ...T_SRAZKY, colW: 78, alt: "Srážky: červen 40 mm, červenec 60 mm, srpen 20 mm, září 30 mm" });
const dimPr = table("gra3-pravidlo.svg", { ...T_PRAVIDLO, colW: 62, alt: "Tabulka: číslo 2 se změní na 7, číslo 5 na 16, číslo 8 na 25, a z otazníku vznikne 40" });
const dimCt = squareFigures("gra3-ctverce.svg", [1, 2, 3], "Obrazce z čtverečků: 1. obrazec má 1 čtvereček, 2. obrazec 2 × 2 čtverečky, 3. obrazec 3 × 3 čtverečky");
const dimZm = barChart("gra3-zmrzliny.svg", { ...ZMRZ, maxV: 36, step: 6, title: "Prodané zmrzliny", alt: `Sloupcový graf prodaných zmrzlin: ${ZMRZ.cats.map((c, i) => `${c} ${ZMRZ.vals[i]}`).join(", ")}` });
const dimSo = barChart("gra3-soutez.svg", { ...SOUTEZ, maxV: 28, step: 4, title: "Žáci na soutěži", alt: "Sloupcový graf žáků na soutěži: 5. A 18, 5. B 22, 5. C chybí, 5. D 14" });
const dimT3 = groupedBar("gra3-tridy.svg", { cats: TRIDY3.cats, maxV: 16, step: 2, title: "Žáci ve třídách", series: [{ name: "chlapci", color: FILL, vals: TRIDY3.chlapci }, { name: "dívky", color: FILL2, vals: TRIDY3.divky }], alt: "Sloupcový graf: 5. A 12 chlapců a 13 dívek, 5. B 14 chlapců a chybějící počet dívek, 5. C chybějící počet chlapců a 12 dívek" });
const dimKr = barChart("gra3-krouzky.svg", { ...KROUZKY, maxV: 28, step: 4, title: "Děti v kroužcích", alt: `Sloupcový graf dětí v kroužcích: ${KROUZKY.cats.map((c, i) => `${c} ${KROUZKY.vals[i]}`).join(", ")}` });

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_grafy", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const img = (url, dim, alt) => ({ image: { kind: "static", url: "/obrazky/p5/" + url, width: dim.w, height: dim.h, alt } });

// A–E: tvrzení jako dvojice [text, predikát]; platit musí právě jedno
const vS = { cer: 40, cvc: 60, srp: 20, zar: 30 };
const TV_SRAZKY = [
  ["V září pršelo o třetinu méně než v červenci.", (v) => 3 * v.zar === 2 * v.cvc],
  ["V srpnu pršelo čtvrtinu toho, co v červnu.", (v) => 4 * v.srp === v.cer],
  ["V červnu a srpnu dohromady pršelo stejně jako v červenci.", (v) => v.cer + v.srp === v.cvc],
  ["Za všechny čtyři měsíce dohromady pršelo méně než 140 mm.", (v) => v.cer + v.cvc + v.srp + v.zar < 140],
  ["V červenci pršelo třikrát víc než v září.", (v) => v.cvc === 3 * v.zar],
];
const vK = { pla: 18, tan: 12, sac: 6, fot: 24 };
const TV_KROUZKY = [
  ["Na plavání chodí o čtvrtinu víc dětí než na tanec.", (v) => 4 * v.pla === 5 * v.tan],
  ["Na fotbal chodí o polovinu víc dětí než na plavání.", (v) => 2 * v.fot === 3 * v.pla],
  ["Na fotbal chodí o třetinu víc dětí než na tanec.", (v) => 3 * v.fot === 4 * v.tan],
  ["Na šachy chodí pětina všech dětí z těchto kroužků.", (v) => 5 * v.sac === v.pla + v.tan + v.sac + v.fot],
  ["Na tanec a šachy dohromady chodí stejně dětí jako na plavání.", (v) => v.tan + v.sac === v.pla],
];

const ex = [
  // ───────── L1 (úvod) ─────────
  mk("P5_GRA_31", "p5_sloupcovy", 1, "Obrázkový graf ukazuje, jak žáci chodí do školy. Jeden obrázek znamená 4 žáky. Kolik žáků jezdí do školy na kole?", "20", [
    "U kola je v grafu 5 obrázků a každý obrázek znamená 4 žáky.",
    "Na kole jezdí 5 · 4 = 20 žáků.",
  ], 75, img("gra3-piktogram.svg", dimPi, `Obrázkový graf: ${PIKTO.cats.map((c, i) => `${c} ${PIKTO.icons[i]} obrázků`).join(", ")}; jeden obrázek znamená ${PIKTO.per} žáky`)),
  mk("P5_GRA_32", "p5_tabulka", 1, "V tabulce jsou teploty naměřené každý den v poledne. O kolik stupňů bylo v pátek tepleji než ve středu?", "3", [
    "V pátek bylo 11 °C a ve středu 8 °C.",
    "Rozdíl je 11 − 8 = 3 stupně.",
  ], 75, img("gra3-teploty.svg", dimTe, "Teploty v poledne: pondělí 9 °C, úterý 12 °C, středa 8 °C, čtvrtek 15 °C, pátek 11 °C")),
  mk("P5_GRA_33", "p5_vzory", 1, "Čísla jsou řazena podle stejného pravidla: 5, 9, 13, 17, … Které číslo bude na 7. místě?", "29", [
    "Každé číslo je o 4 větší než předchozí: 9 − 5 = 4, 13 − 9 = 4, 17 − 13 = 4.",
    "Pokračujeme: 17, 21 (5. místo), 25 (6. místo), 29 (7. místo).",
  ], 90),
  mk("P5_GRA_34", "p5_vzory", 1, "Obrazce jsou postavené ze špejlí. Kolik špejlí je potřeba na obrazec z 5 trojúhelníků postavených vedle sebe stejným způsobem?", "11", [
    "Na obrázku je v 1. obrazci 1 trojúhelník ze 3 špejlí, ve 2. obrazci 5 špejlí a ve 3. obrazci 7 špejlí. Každý další trojúhelník přidá 2 špejle.",
    "4. obrazec má 7 + 2 = 9 špejlí a 5. obrazec 9 + 2 = 11 špejlí.",
  ], 120, img("gra3-trojuhelniky.svg", dimTri, "Obrazce ze špejlí: řada 1, 2 a 3 trojúhelníků vedle sebe z 3, 5 a 7 špejlí")),
  // ───────── L2 (přiblížení testu) ─────────
  mk("P5_GRA_35", "p5_sloupcovy", 2, "Obrázkový graf ukazuje, kolik dětí chodí do jednotlivých kroužků. Jeden obrázek znamená 5 dětí, každé dítě chodí jen do jednoho kroužku. O kolik dětí víc chodí na fotbal než na šachy a tanec dohromady?", "5", [
    "Jeden obrázek znamená 5 dětí. Na fotbal chodí 6 · 5 = 30 dětí, na šachy 2 · 5 = 10 dětí a na tanec 3 · 5 = 15 dětí.",
    "Šachy a tanec dohromady mají 10 + 15 = 25 dětí.",
    "Na fotbal chodí o 30 − 25 = 5 dětí víc.",
  ], 150, img("gra3-krouzky-obrazky.svg", dimKp, `Obrázkový graf: ${KROUZ_P.cats.map((c, i) => `${c} ${KROUZ_P.icons[i]} obrázků`).join(", ")}; jeden obrázek znamená ${KROUZ_P.per} dětí`)),
  mk("P5_GRA_36", "p5_sloupcovy", 2, "Graf ukazuje, kolik chlapců a kolik dívek chodí do čtyř kroužků. V kterém kroužku je největší rozdíl mezi počtem chlapců a počtem dívek? Napiš, o kolik je tam jedněch víc než druhých.", "9", [
    "Z grafu přečteme: šachy 8 chlapců a 5 dívek (rozdíl 3), kreslení 4 a 11 (rozdíl 7), fotbal 12 a 3 (rozdíl 9), tanec 2 a 10 (rozdíl 8).",
    "Největší rozdíl je u fotbalu: 12 − 3 = 9.",
  ], 180, img("gra3-skupiny.svg", dimSk, `Sloupcový graf chlapců a dívek v kroužcích: ${SKUPINY.cats.map((c, i) => `${c} ${SKUPINY.chlapci[i]} chlapců a ${SKUPINY.divky[i]} dívek`).join(", ")}`)),
  mk("P5_GRA_37", "p5_tvrzeni", 2, "V tabulce jsou naměřené srážky ve čtyřech měsících. Které z následujících tvrzení je pravdivé?", null, [
    "Z tabulky přečteme: červen 40 mm, červenec 60 mm, srpen 20 mm, září 30 mm. Každé tvrzení ověříme.",
    "A) Třetina ze 60 je 20 a o třetinu méně je 40, ale v září pršelo 30 mm. B) Čtvrtina ze 40 je 10, ne 20. D) Za všechny měsíce je 40 + 60 + 20 + 30 = 150 mm, to není méně než 140. E) Třikrát 30 je 90, ne 60.",
    "C) V červnu a srpnu dohromady pršelo 40 + 20 = 60 mm, a to je stejně jako v červenci. Správně je C).",
  ], 180, { ...img("gra3-srazky.svg", dimSr, "Srážky: červen 40 mm, červenec 60 mm, srpen 20 mm, září 30 mm"), moznosti: TV_SRAZKY.map((t) => t[0]), spravna: 2 }),
  mk("P5_GRA_38", "p5_vzory", 2, "V tabulce se každé číslo v horním řádku změní na číslo v dolním řádku podle stejného pravidla. Které číslo patří na místo otazníku v horním řádku?", "13", [
    "Hledáme pravidlo: 2 → 7, 5 → 16, 8 → 25. Číslo se vynásobí třemi a přičte se 1: 2 · 3 + 1 = 7, 5 · 3 + 1 = 16, 8 · 3 + 1 = 25.",
    "Hledáme číslo, ze kterého vznikne 40. Pravidlo obrátíme: 40 − 1 = 39 a 39 : 3 = 13.",
    "Zkouška: 13 · 3 + 1 = 40.",
  ], 210, img("gra3-pravidlo.svg", dimPr, "Tabulka: číslo 2 se změní na 7, číslo 5 na 16, číslo 8 na 25, a z otazníku vznikne 40")),
  mk("P5_GRA_39", "p5_vzory", 2, "Obrazce jsou složené z čtverečků (viz obrázek). Kolik čtverečků přibude při přechodu ze 7. obrazce na 8. obrazec?", "15", [
    "1. obrazec má 1 čtvereček, 2. obrazec 2 · 2 = 4 čtverečky, 3. obrazec 3 · 3 = 9 čtverečků. Obrazec s pořadovým číslem n má n · n čtverečků.",
    "7. obrazec má 7 · 7 = 49 čtverečků a 8. obrazec 8 · 8 = 64 čtverečků.",
    "Přibude jich 64 − 49 = 15.",
  ], 180, img("gra3-ctverce.svg", dimCt, "Obrazce z čtverečků: 1 čtvereček, 2 × 2 čtverečky, 3 × 3 čtverečky")),
  mk("P5_GRA_40", "p5_sloupcovy", 2, "Graf ukazuje, kolik zmrzlin se v kiosku prodalo od pondělí do soboty. Jeden den se prodalo o 9 zmrzlin víc než předchozí den. Kolik zmrzlin se prodalo ten den?", "24", [
    "Porovnáme každý den s předchozím: úterý 18 − 12 = 6, ve středu se prodalo méně než v úterý, čtvrtek 24 − 15 = 9, pátek 27 − 24 = 3, sobota 33 − 27 = 6.",
    "O 9 víc než předchozí den se prodalo ve čtvrtek, a to 24 zmrzlin.",
  ], 150, img("gra3-zmrzliny.svg", dimZm, `Sloupcový graf prodaných zmrzlin: ${ZMRZ.cats.map((c, i) => `${c} ${ZMRZ.vals[i]}`).join(", ")}`)),
  // ───────── L3 (úroveň testu) ─────────
  mk("P5_GRA_41", "p5_chybi_udaj", 3, "Graf ukazuje, kolik žáků ze čtyř tříd se přihlásilo na školní soutěž, sloupec 5. C chybí. Na soutěž se přihlásilo celkem 78 žáků. Kolik žáků se přihlásilo z 5. C a o kolik jich je víc než z 5. D?", "10", [
    "Ze tří známých sloupců přečteme 18, 22 a 14 žáků, dohromady 18 + 22 + 14 = 54.",
    "Z 5. C se přihlásilo 78 − 54 = 24 žáků.",
    "Z 5. D se přihlásilo 14 žáků, takže z 5. C jich je víc o 24 − 14 = 10.",
  ], 240, img("gra3-soutez.svg", dimSo, "Sloupcový graf žáků na soutěži: 5. A 18, 5. B 22, 5. C chybí, 5. D 14")),
  mk("P5_GRA_42", "p5_chybi_udaj", 3, "Graf ukazuje počty chlapců a dívek v pátých třídách, u některých sloupců chybí. V 5. B je celkem 27 žáků. V 5. C je o 2 chlapce méně než dívek. Kolik žáků je ve všech třech třídách dohromady?", "74", [
    "V 5. A je 12 + 13 = 25 žáků.",
    "V 5. B je podle zadání 27 žáků. (Chlapců je 14, takže dívek je 27 − 14 = 13, ale pro výsledek stačí těch 27.)",
    "V 5. C je 12 dívek a o 2 chlapce méně, tedy 10 chlapců, dohromady 12 + 10 = 22 žáků.",
    "Ve všech třídách je 25 + 27 + 22 = 74 žáků.",
  ], 270, img("gra3-tridy.svg", dimT3, "Sloupcový graf: 5. A 12 chlapců a 13 dívek, 5. B 14 chlapců a chybějící počet dívek, 5. C chybějící počet chlapců a 12 dívek")),
  mk("P5_GRA_43", "p5_vzory", 3, "Obrazce jsou postavené ze špejlí (viz obrázek). Řada trojúhelníků vedle sebe se prodlužuje stále stejným způsobem. Kolik nejvíc trojúhelníků v řadě můžeš postavit ze 100 špejlí? Nemusíš použít všechny špejle.", "49", [
    "Obrazec z jednoho trojúhelníku má 3 špejle a každý další trojúhelník přidá 2 špejle. Řada z n trojúhelníků potřebuje 2 · n + 1 špejlí (n = 1: 3, n = 2: 5, n = 3: 7).",
    "Musí platit 2 · n + 1 ≤ 100, tedy 2 · n ≤ 99 a n ≤ 49,5.",
    "Největší celé n je 49. Řada ze 49 trojúhelníků potřebuje 2 · 49 + 1 = 99 špejlí a jedna špejle zbude.",
  ], 270, img("gra3-trojuhelniky.svg", dimTri, "Obrazce ze špejlí: řada 1, 2 a 3 trojúhelníků vedle sebe z 3, 5 a 7 špejlí")),
  mk("P5_GRA_44", "p5_vzory", 3, "Čísla jsou řazena podle pravidla: 2, 10, 4, 20, 6, 30, 8, … Jaký je součet čísel, která jsou v řadě na 14. a 15. místě?", "86", [
    "Čísla na lichých místech tvoří řadu 2, 4, 6, 8, …, čísla na sudých místech řadu 10, 20, 30, 40, …",
    "14. místo je sudé, je to 7. číslo řady 10, 20, 30, …, tedy 70. 15. místo je liché, je to 8. číslo řady 2, 4, 6, …, tedy 16.",
    "Součet je 70 + 16 = 86.",
  ], 270),
  mk("P5_GRA_45", "p5_tvrzeni", 3, "Graf ukazuje, kolik dětí chodí do jednotlivých kroužků (každé dítě chodí jen do jednoho). Které z následujících tvrzení je pravdivé?", null, [
    "Z grafu přečteme: plavání 18, tanec 12, šachy 6, fotbal 24 dětí. Každé tvrzení ověříme.",
    "A) Čtvrtina z 12 je 3, 12 + 3 = 15, ale na plavání chodí 18. B) Polovina z 18 je 9, 18 + 9 = 27, ne 24. C) Třetina z 12 je 4, 12 + 4 = 16, ne 24. D) Všech dětí je 18 + 12 + 6 + 24 = 60, pětina je 12, ne 6.",
    "E) Tanec a šachy dohromady mají 12 + 6 = 18 dětí, a to je stejně jako plavání. Správně je E).",
  ], 240, { ...img("gra3-krouzky.svg", dimKr, `Sloupcový graf dětí v kroužcích: ${KROUZKY.cats.map((c, i) => `${c} ${KROUZKY.vals[i]}`).join(", ")}`), moznosti: TV_KROUZKY.map((t) => t[0]), spravna: 4 }),
];
for (const e of ex) if (e.moznosti && e.odpoved == null) e.odpoved = e.moznosti[e.spravna];

// ── nezávislé ověření ──
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const cmp = (id, v) => ok(id, String(by[id].odpoved).replace(/\s/g, "") === String(v), `${by[id].odpoved} vs ${v}`);
const sum = (a) => a.reduce((s, x) => s + x, 0);

cmp("P5_GRA_31", PIKTO.icons[1] * PIKTO.per);
{ const t = T_TEPLOTY.rows[0]; cmp("P5_GRA_32", t[5] - t[3]); }
{ const s = [5, 9, 13, 17]; const d = s[1] - s[0]; ok("33 pravidlo", s.every((x, i) => i === 0 || x - s[i - 1] === d)); cmp("P5_GRA_33", s[0] + 6 * d); }
{ ok("34 obrázek", [1, 2, 3].map(triSticks).join() === "3,5,7"); cmp("P5_GRA_34", triSticks(5)); }
{ const ic = KROUZ_P.icons, per = KROUZ_P.per; cmp("P5_GRA_35", (ic[2] - ic[1] - ic[3]) * per); ok("35 data", ic.join() === "4,2,6,3" && per === 5 && ic[2] * per > (ic[1] + ic[3]) * per); }
{ const d = SKUPINY.chlapci.map((c, i) => Math.abs(c - SKUPINY.divky[i])), mx = Math.max(...d); ok("36 jednoznačné", d.filter((x) => x === mx).length === 1, d); cmp("P5_GRA_36", mx); }
{ const t = TV_SRAZKY.map((x, i) => (x[1](vS) ? i : -1)).filter((i) => i >= 0); ok("37 právě jedno", t.length === 1 && t[0] === by.P5_GRA_37.spravna, t);
  const r = T_SRAZKY.rows[0]; ok("37 data = tabulka", vS.cer === r[1] && vS.cvc === r[2] && vS.srp === r[3] && vS.zar === r[4]); }
{ const r = T_PRAVIDLO.rows[0], h = T_PRAVIDLO.header; const s = []; for (let a = 1; a <= 5; a++) for (let b = -5; b <= 5; b++) if ([1, 2, 3].every((i) => a * h[i] + b === r[i])) s.push([a, b]);
  ok("38 pravidlo", s.length === 1 && s[0][0] === 3 && s[0][1] === 1, s); const q = []; for (let n = 1; n < 100; n++) if (3 * n + 1 === r[4]) q.push(n); ok("38", q.length === 1 && String(q[0]) === by.P5_GRA_38.odpoved, q); }
cmp("P5_GRA_39", 8 * 8 - 7 * 7);
{ const v = ZMRZ.vals, hit = []; for (let i = 1; i < v.length; i++) if (v[i] - v[i - 1] === 9) hit.push(v[i]); ok("40", hit.length === 1 && String(hit[0]) === by.P5_GRA_40.odpoved, hit); }
{ const v = SOUTEZ.vals, known = v.filter((x) => x !== null), c = SOUTEZ.celkem - sum(known); ok("41 data", v[2] === null && known.join() === "18,22,14" && c === 24); cmp("P5_GRA_41", c - v[3]); }
{
  const [a1, b1, c1] = TRIDY3.chlapci, [a2, b2, c2] = TRIDY3.divky; const A = a1 + a2, B = 27, d2 = B - b1, c1v = c2 - 2;
  ok("42 data", a1 === 12 && a2 === 13 && b1 === 14 && c2 === 12 && b2 === null && c1 === null && d2 === 13 && c1v === 10);
  cmp("P5_GRA_42", A + B + (c1v + c2));
}
{ const s = []; for (let n = 1; n <= 200; n++) if (triSticks(n) <= 100) s.push(n); ok("43", Math.max(...s) === 49 && triSticks(49) === 99 && triSticks(50) === 101 && String(Math.max(...s)) === by.P5_GRA_43.odpoved, s.length); }
{ const seq = []; for (let k = 1; k <= 20; k++) { seq.push(2 * k); seq.push(10 * k); } ok("44 začátek", seq.slice(0, 7).join() === "2,10,4,20,6,30,8"); cmp("P5_GRA_44", seq[13] + seq[14]); }
{ const t = TV_KROUZKY.map((x, i) => (x[1](vK) ? i : -1)).filter((i) => i >= 0); ok("45 právě jedno", t.length === 1 && t[0] === by.P5_GRA_45.spravna, t);
  ok("45 data = graf", vK.pla === KROUZKY.vals[0] && vK.tan === KROUZKY.vals[1] && vK.sac === KROUZKY.vals[2] && vK.fot === KROUZKY.vals[3]); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else { ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved); ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved)); }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
  if (e.image) ok(e.id + " soubor obrázku", fs.existsSync("public" + e.image.url));
  if (e.obtiznost === 1 && /\d\s?:\s?\d\d/.test(e.zadani)) ok(e.id + " L1 bez dělení dvojciferným", false);
}
ok("rozmístění A–E", new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size === 2);
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 15, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((fl) => JSON.parse(fs.readFileSync(`src/data/${fl}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; A–E ${ex.filter((e) => e.moznosti).length}; s obrázkem ${ex.filter((e) => e.image).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Grafy, tabulky a vzory, třetí dávka (15 úloh)` : "5. třída — Grafy, tabulky a vzory, třetí dávka: piktogram, sloupcový a dvojitý sloupcový graf, tabulky a pravidla, pravdivé tvrzení, špejle a čtverečky, střídavé posloupnosti (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
