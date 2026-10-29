// 5. třída, okruh „Grafy, tabulky a vzory", druhá dávka (P5_GRA_16–30): čtení ze sloupcového grafu, chybějící údaj z podmínek, pravdivé tvrzení, pyramidy a posloupnosti.
// Styl podle úloh 8 (grafy a tvrzení) a 14 (vzory a posloupnosti, malé i velké číslo, obrácená otázka) oficiálních testů CERMAT pro 5. třídu 2022–2026 (vlastní data, obrázky a čísla, nic se nekopíruje).
// Spuštění: node scripts/build-5-grafy2.mjs → nakreslí public/obrazky/p5/gra2-*.svg a doplní/přepíše P5_GRA_16–30 v src/data/nahled-batch.json (jiné dávky nechá).
// Obrázky se kreslí ze stejných dat, ze kterých se odpovědi nezávisle počítají; tvrzení u A–E se vyhodnocují programem (musí platit právě jedno).
import fs from "node:fs";
import { NAVY, BLUE, text, line, makeWriter } from "./lib/svg.mjs";
const N = await import("../src/lib/normalize.ts");

const { write } = makeWriter("p5");
const FILL = "#cfe3f7", HEAD = "#e6eef8", GRID = "#cbd5e1";
const f = (n) => Math.round(n * 100) / 100;

// ── sloupcový graf ──
// vals: číslo, nebo null = chybějící sloupec (čárkovaný se „?"). axisNums = čísla na svislé ose; jinak jen dílky.
function barChart(name, { cats, vals, maxV, step, axisNums = true, title, yLabel, alt }) {
  const n = cats.length, slot = 64, x0 = 46, yTop = title ? 38 : 20, yBase = 178;
  const W = x0 + n * slot + 18, H = yBase + 34;
  const unit = (yBase - yTop) / maxV;
  let body = `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n`;
  if (title) body += text(W / 2, 20, title, { size: 13, weight: 700, fill: NAVY }) + "\n";
  for (let v = 0; v <= maxV; v += step) {
    const y = yBase - v * unit;
    body += line(x0, y, W - 10, y, { stroke: v === 0 ? NAVY : GRID, w: v === 0 ? 1.8 : 1 }) + "\n";
    body += axisNums ? text(x0 - 8, y + 4, String(v), { size: 11, weight: 600, fill: NAVY, anchor: "end" }) + "\n" : line(x0 - 5, y, x0, y, { stroke: NAVY, w: 1.2 }) + "\n";
  }
  body += line(x0, yTop, x0, yBase, { stroke: NAVY, w: 1.8 }) + "\n";
  if (yLabel) body += text(12, (yTop + yBase) / 2, yLabel, { size: 11, weight: 600, fill: NAVY, rotate: -90 }) + "\n";
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

// ── tabulka ──
function table(name, { header, rows, colW = 74, firstW = 110, rowH = 34, alt }) {
  const cols = header.length, m = 10, W = m * 2 + firstW + (cols - 1) * colW, H = m * 2 + (rows.length + 1) * rowH;
  let body = `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n`;
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


// ── dvousloupcový graf (např. chlapci a dívky); null = chybějící sloupec ──
const FILL2 = "#f6d3cc";
function groupedBar(name, { cats, series, maxV, step, title, alt }) {
  const n = cats.length, slot = 92, x0 = 46, yTop = 44, yBase = 184, bw = 30;
  const W = x0 + n * slot + 18, H = yBase + 34;
  const unit = (yBase - yTop) / maxV;
  let body = `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n`;
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
      const bx = cx + (k - 1) * bw + (k === 0 ? -1 : 1);
      const v = s.vals[i];
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

// ── pyramida: v i-té řadě 2i − 1 čtverečků, řady se střídají tmavá / bílá (horní je tmavá) ──
const DARK = "#7aa0d1";
function drawPyramid(name, rows, alt) {
  const s = 26, m = 14, W = (2 * rows - 1) * s + 2 * m, H = rows * s + 2 * m;
  let body = `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n`;
  for (let i = 1; i <= rows; i++) {
    const cnt = 2 * i - 1, x0 = m + ((2 * rows - 1 - cnt) / 2) * s;
    for (let c = 0; c < cnt; c++) body += `  <rect x="${f(x0 + c * s)}" y="${m + (i - 1) * s}" width="${s}" height="${s}" fill="${i % 2 === 1 ? DARK : "#ffffff"}" stroke="${NAVY}" stroke-width="1.6"/>\n`;
  }
  write(name, W, H, body, alt);
  return { w: W, h: H };
}
const rowCount = (i) => 2 * i - 1;
const darkOf = (n) => { let t = 0; for (let i = 1; i <= n; i += 2) t += rowCount(i); return t; };
const whiteOf = (n) => { let t = 0; for (let i = 2; i <= n; i += 2) t += rowCount(i); return t; };

// ── data ──
const TRIDY = { cats: ["5. A", "5. B", "5. C", "5. D"], vals: [24, 22, 26, 20] };
const NEHODY = { cats: ["1. čtvrt.", "2. čtvrt.", "3. čtvrt.", "4. čtvrt."], vals: [8, 12, 6, null], celkem: 36 };
const ODPAD = { cats: ["papír", "plast", "sklo", "kovy"], vals: [24, 18, 12, 6] };
const KARTY = { cats: ["Alena", "Bára", "Cyril", "David"], vals: [15, null, null, 9] };
const ODDILY = { cats: ["A", "B", "C"], chlapci: [10, 6, 4], divky: [8, 9, null] };
const T_POTRAVINY = { header: ["zboží", "rohlík", "jogurt", "jablko", "mléko"], rows: [["cena (Kč)", 4, 12, 7, 18]] };
const T_MUZEUM = { header: ["den", "po", "út", "st", "čt"], rows: [["návštěvníci", 80, "?", 120, "?"]] };
const T_CTVEREC = { header: ["číslo", 2, 3, 5, 6], rows: [["nové číslo", 5, 10, 26, "?"]] };
const dimTr = barChart("gra2-tridy.svg", { ...TRIDY, maxV: 28, step: 4, title: "Počet žáků ve třídách", alt: `Sloupcový graf počtu žáků ve třídách: ${TRIDY.cats.map((c, i) => `${c} ${TRIDY.vals[i]}`).join(", ")}` });
const dimNe = barChart("gra2-nehody.svg", { ...NEHODY, maxV: 14, step: 2, title: "Dopravní nehody v obci", alt: "Sloupcový graf nehod po čtvrtletích: 1. čtvrtletí 8, 2. čtvrtletí 12, 3. čtvrtletí 6, 4. čtvrtletí chybí" });
const dimOd = barChart("gra2-odpad.svg", { ...ODPAD, maxV: 28, step: 4, title: "Vytříděný odpad (kg)", alt: `Sloupcový graf vytříděného odpadu v kg: ${ODPAD.cats.map((c, i) => `${c} ${ODPAD.vals[i]}`).join(", ")}` });
const dimKa = barChart("gra2-karty.svg", { ...KARTY, maxV: 24, step: 3, title: "Počet sběratelských karet", alt: "Sloupcový graf počtu karet: Alena 15, Bára chybí, Cyril chybí, David 9" });
const dimOdd = groupedBar("gra2-oddily.svg", {
  cats: ODDILY.cats, maxV: 12, step: 2, title: "Děti v oddílech na táboře",
  series: [{ name: "chlapci", color: FILL, vals: ODDILY.chlapci }, { name: "dívky", color: FILL2, vals: ODDILY.divky }],
  alt: "Sloupcový graf dětí v oddílech: oddíl A 10 chlapců a 8 dívek, oddíl B 6 chlapců a 9 dívek, oddíl C 4 chlapci a chybějící počet dívek",
});
const dimTp = table("gra2-potraviny.svg", { ...T_POTRAVINY, colW: 78, alt: "Ceník: rohlík 4 Kč, jogurt 12 Kč, jablko 7 Kč, mléko 18 Kč" });
const dimTm = table("gra2-muzeum.svg", { ...T_MUZEUM, colW: 66, alt: "Tabulka návštěvníků muzea: pondělí 80, úterý chybí, středa 120, čtvrtek chybí" });
const dimTq = table("gra2-ctverec.svg", { ...T_CTVEREC, colW: 66, alt: "Tabulka: číslo 2 se změní na 5, 3 na 10, 5 na 26, u čísla 6 nové číslo chybí" });
const dimPy = drawPyramid("gra2-pyramida.svg", 4, "Pyramida ze čtverečků: 1. řada má 1 čtvereček, 2. řada 3, 3. řada 5 a 4. řada 7; řady se střídají tmavá a bílá, horní je tmavá");

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_grafy", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const img = (url, dim, alt) => ({ image: { kind: "static", url: "/obrazky/p5/" + url, width: dim.w, height: dim.h, alt } });

// A–E: tvrzení jako dvojice [text, predikát]; platit musí právě jedno
const vO = { papir: 24, plast: 18, sklo: 12, kovy: 6 };
const TV_ODPAD = [
  ["Plastu je o třetinu méně než papíru.", (v) => v.plast === v.papir - v.papir / 3],
  ["Skla je o polovinu víc než kovů.", (v) => v.sklo === v.kovy * 1.5],
  ["Papíru je dvakrát víc než plastu.", (v) => v.papir === 2 * v.plast],
  ["Kovů je čtvrtina z množství papíru.", (v) => v.kovy * 4 === v.papir],
  ["Plast a kovy dohromady tvoří polovinu všeho odpadu.", (v) => (v.plast + v.kovy) * 2 === v.papir + v.plast + v.sklo + v.kovy],
];

const ex = [
  // ───────── L1 (úvod) ─────────
  mk("P5_GRA_16", "p5_sloupcovy", 1, "Graf ukazuje počet žáků ve čtyřech pátých třídách. Kolik žáků je dohromady ve třídách 5. B a 5. C?", "48", [
    "Z grafu přečteme: ve třídě 5. B je 22 žáků a ve třídě 5. C je 26 žáků.",
    "Dohromady je to 22 + 26 = 48 žáků.",
  ], 75, img("gra2-tridy.svg", dimTr, `Sloupcový graf počtu žáků ve třídách: ${TRIDY.cats.map((c, i) => `${c} ${TRIDY.vals[i]}`).join(", ")}`)),
  mk("P5_GRA_17", "p5_tabulka", 1, "V tabulce jsou ceny potravin. Kolik korun zaplatíš za 3 rohlíky a 1 jogurt?", "24", [
    "Rohlík stojí 4 Kč, tři rohlíky stojí 3 · 4 = 12 Kč. Jogurt stojí 12 Kč.",
    "Dohromady zaplatíš 12 + 12 = 24 Kč.",
  ], 90, img("gra2-potraviny.svg", dimTp, "Ceník: rohlík 4 Kč, jogurt 12 Kč, jablko 7 Kč, mléko 18 Kč")),
  mk("P5_GRA_18", "p5_vzory", 1, "Čísla jsou řazena podle stejného pravidla: 2, 5, 8, 11, … Které číslo bude na 6. místě?", "17", [
    "Každé číslo je o 3 větší než předchozí: 5 − 2 = 3, 8 − 5 = 3, 11 − 8 = 3.",
    "Pokračujeme: 11, pak 14 (5. místo), pak 17 (6. místo).",
  ], 90),
  mk("P5_GRA_19", "p5_vzory", 1, "Pyramida se skládá z řad čtverečků. V 1. řadě je 1 čtvereček a každá další řada má o 2 čtverečky víc než řada nad ní. Kolik čtverečků je v 5. řadě?", "9", [
    "Na obrázku jsou řady po 1, 3, 5 a 7 čtverečcích, takže každá další řada má o 2 víc.",
    "5. řada má 7 + 2 = 9 čtverečků.",
  ], 75, img("gra2-pyramida.svg", dimPy, "Pyramida ze čtverečků: řady po 1, 3, 5 a 7 čtverečcích, tmavá a bílá řada se střídají")),
  // ───────── L2 (přiblížení testu) ─────────
  mk("P5_GRA_20", "p5_chybi_udaj", 2, "Graf ukazuje počty dopravních nehod v obci v jednotlivých čtvrtletích loňského roku. Sloupec za 4. čtvrtletí chybí. Za celý rok bylo v obci 36 nehod. Kolik nehod se stalo ve 4. čtvrtletí?", "10", [
    "Ze tří známých sloupců přečteme 8, 12 a 6 nehod, dohromady 8 + 12 + 6 = 26.",
    "Za celý rok bylo 36 nehod, takže ve 4. čtvrtletí jich bylo 36 − 26 = 10.",
  ], 120, img("gra2-nehody.svg", dimNe, "Sloupcový graf nehod po čtvrtletích: 1. čtvrtletí 8, 2. čtvrtletí 12, 3. čtvrtletí 6, 4. čtvrtletí chybí")),
  mk("P5_GRA_21", "p5_tvrzeni", 2, "Graf ukazuje, kolik kilogramů odpadu vytřídili žáci školy. Které z následujících tvrzení je pravdivé?", null, [
    "Z grafu přečteme: papír 24 kg, plast 18 kg, sklo 12 kg, kovy 6 kg. Každé tvrzení ověříme.",
    "A) Třetina z 24 je 8, o třetinu méně je 16, ale plast má 18 kg, takže to neplatí. B) Polovina z 6 je 3 a 6 + 3 = 9, ne 12. C) Dvakrát 18 je 36, ne 24. E) Plast a kovy mají 24 kg, všeho dohromady je 60 kg, polovina je 30.",
    "D) Čtvrtina z 24 kg je 6 kg, to platí. Správně je D).",
  ], 180, { ...img("gra2-odpad.svg", dimOd, `Sloupcový graf vytříděného odpadu v kg: ${ODPAD.cats.map((c, i) => `${c} ${ODPAD.vals[i]}`).join(", ")}`), moznosti: TV_ODPAD.map((t) => t[0]), spravna: 3 }),
  mk("P5_GRA_22", "p5_chybi_udaj", 2, "V tabulce je počet návštěvníků muzea ve čtyřech dnech, údaje za úterý a čtvrtek chybí. V úterý přišlo o čtvrtinu víc návštěvníků než v pondělí. Ve čtvrtek přišlo třikrát méně návštěvníků než ve středu. Kolik návštěvníků přišlo za všechny čtyři dny dohromady?", "340", [
    "Čtvrtina z pondělních 80 návštěvníků je 80 : 4 = 20, takže v úterý jich bylo 80 + 20 = 100.",
    "Třikrát méně než ve středu je 120 : 3 = 40 návštěvníků ve čtvrtek.",
    "Dohromady 80 + 100 + 120 + 40 = 340 návštěvníků.",
  ], 210, img("gra2-muzeum.svg", dimTm, "Tabulka návštěvníků muzea: pondělí 80, úterý chybí, středa 120, čtvrtek chybí")),
  mk("P5_GRA_23", "p5_vzory", 2, "Pyramida se skládá z řad čtverečků. V 1. řadě je 1 čtvereček a každá další řada má o 2 čtverečky víc než řada nad ní. Kolik čtverečků má celá pyramida o 6 řadách?", "36", [
    "Řady mají postupně 1, 3, 5, 7, 9 a 11 čtverečků.",
    "Dohromady 1 + 3 + 5 + 7 + 9 + 11 = 36 čtverečků. (Je to 6 · 6, součet prvních šesti lichých čísel.)",
  ], 150, img("gra2-pyramida.svg", dimPy, "Pyramida ze čtverečků: řady po 1, 3, 5 a 7 čtverečcích, tmavá a bílá řada se střídají")),
  mk("P5_GRA_24", "p5_vzory", 2, "Čísla jsou řazena podle pravidla: 7, 10, 14, 19, … (každé číslo je větší o jedna víc než minule). Které číslo bude na 8. místě?", null, [
    "Rozdíly mezi sousedními čísly jsou 3, 4, 5, takže každý další rozdíl je o 1 větší.",
    "Řada pokračuje: 19, 25 (+6), 32 (+7), 40 (+8), 49 (+9). Číslo 49 je na 8. místě.",
    "Správně je C).",
  ], 180, { moznosti: ["40", "45", "49", "52", "56"], spravna: 2 }),
  mk("P5_GRA_25", "p5_vzory", 2, "V tabulce se každé číslo v horním řádku změní na číslo v dolním řádku podle stejného pravidla. Jaké číslo patří místo otazníku?", "37", [
    "Hledáme pravidlo: 2 → 5, 3 → 10, 5 → 26. Číslo se vynásobí samo sebou a přičte se 1: 2 · 2 + 1 = 5, 3 · 3 + 1 = 10, 5 · 5 + 1 = 26.",
    "Pro 6 je to 6 · 6 + 1 = 37.",
  ], 180, img("gra2-ctverec.svg", dimTq, "Tabulka: číslo 2 se změní na 5, 3 na 10, 5 na 26, u čísla 6 nové číslo chybí")),
  // ───────── L3 (úroveň testu) ─────────
  mk("P5_GRA_26", "p5_chybi_udaj", 3, "Na táboře je každé dítě zařazeno do jednoho z oddílů A, B a C. V oddíle A je dvakrát víc dětí než v oddíle C. Graf ukazuje počty chlapců a dívek v oddílech, počet dívek v oddíle C chybí. Kolik dívek je v oddíle C?", "5", [
    "V oddíle A je 10 chlapců a 8 dívek, dohromady 18 dětí.",
    "V oddíle C je dvakrát méně dětí než v A, tedy 18 : 2 = 9 dětí.",
    "Chlapců je v oddíle C 4, takže dívek je 9 − 4 = 5.",
  ], 210, img("gra2-oddily.svg", dimOdd, "Sloupcový graf dětí v oddílech: oddíl A 10 chlapců a 8 dívek, oddíl B 6 chlapců a 9 dívek, oddíl C 4 chlapci a chybějící počet dívek")),
  mk("P5_GRA_27", "p5_chybi_udaj", 3, "Graf ukazuje počty sběratelských karet čtyř kamarádů, u Báry a Cyrila sloupce chybí. Cyril má o třetinu méně karet než Bára a oba dohromady mají 35 karet. Kolik karet mají všichni čtyři kamarádi dohromady?", null, [
    "Bára má 3 díly (třetiny), Cyril o třetinu méně, tedy 2 díly. Dohromady mají 5 dílů a to je 35 karet.",
    "Jeden díl je 35 : 5 = 7 karet. Bára má 3 · 7 = 21 karet, Cyril 2 · 7 = 14 karet.",
    "Všichni dohromady: 15 + 21 + 14 + 9 = 59 karet. Správně je C).",
  ], 270, { ...img("gra2-karty.svg", dimKa, "Sloupcový graf počtu karet: Alena 15, Bára chybí, Cyril chybí, David 9"), moznosti: ["47", "55", "59", "63", "71"], spravna: 2 }),
  mk("P5_GRA_28", "p5_vzory", 3, "Pyramida se skládá z řad čtverečků. V 1. řadě je 1 čtvereček a každá další řada má o 2 čtverečky víc. Řady se pravidelně střídají: tmavá, bílá, tmavá, … (horní řada je tmavá). Pyramida má 41 řad. O kolik se liší počet tmavých a bílých čtverečků?", "41", [
    "Tmavé jsou řady s lichým číslem (1., 3., …, 41.), bílé řady se sudým číslem (2., 4., …, 40.). Tmavých řad je 21 a bílých 20.",
    "Řada s číslem n má 2n − 1 čtverečků. Tmavé řady mají 1, 5, 9, …, 81 čtverečků a bílé řady 3, 7, 11, …, 79 čtverečků.",
    "První tmavou řadu (1 čtvereček) si dáme stranou. Zbylých 20 tmavých řad (5, 9, …, 81) a 20 bílých řad (3, 7, …, 79) tvoří dvojice, v nichž má tmavá řada vždy o 2 čtverečky víc, dohromady o 20 · 2 = 40. S první řadou je rozdíl 1 + 40 = 41. (Součty: tmavých je 861, bílých 820.)",
  ], 300, img("gra2-pyramida.svg", dimPy, "Pyramida ze čtverečků: řady po 1, 3, 5 a 7 čtverečcích, tmavá a bílá řada se střídají")),
  mk("P5_GRA_29", "p5_vzory", 3, "Pyramida se skládá z řad čtverečků. V 1. řadě je 1 čtvereček a každá další řada má o 2 čtverečky víc. Řady se střídají: tmavá, bílá, tmavá, … (horní řada je tmavá). V pyramidě je o 59 tmavých čtverečků víc než bílých. Kolik řad má pyramida?", "59", [
    "Zkusíme malé pyramidy: 1 řada má rozdíl 1 (tmavý 1, bílý 0), 3 řady mají 1 + 5 = 6 tmavých a 3 bílé, rozdíl 3, 5 řad mají 1 + 5 + 9 = 15 tmavých a 3 + 7 = 10 bílých, rozdíl 5.",
    "Rozdíl tmavých a bílých se rovná počtu řad, pokud je počet řad lichý (tmavých je pak víc).",
    "Rozdíl 59 tedy znamená 59 řad. Zkouška: tmavé řady 1, 3, …, 59 mají 30 řad, bílé 29 řad, a tmavých je o 59 víc.",
  ], 330, img("gra2-pyramida.svg", dimPy, "Pyramida ze čtverečků: řady po 1, 3, 5 a 7 čtverečcích, tmavá a bílá řada se střídají")),
  mk("P5_GRA_30", "p5_vzory", 3, "Řada čísel vzniká z trojic. První trojice je 1, 2, 3. Každá další trojice vznikne tak, že čísla předchozí trojice zvětšíme o 2. Řada začíná: 1, 2, 3, 3, 4, 5, 5, 6, 7, … Které číslo je v řadě na 40. místě?", "27", [
    "Každá trojice zabírá 3 místa. 40. místo leží ve 14. trojici, protože 13 · 3 = 39 a 40. místo je první místo v další trojici.",
    "První číslo n-té trojice je 1 + 2 · (n − 1). Pro 14. trojici je to 1 + 2 · 13 = 27.",
    "Zkouška: 13. trojice začíná na 25, takže končí na 27 (25, 26, 27), a 14. trojice začíná na 27 (27, 28, 29). Na 40. místě je 27.",
  ], 330),
];
for (const e of ex) if (e.moznosti && e.odpoved == null) e.odpoved = e.moznosti[e.spravna];

// ── nezávislé ověření ──
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const cmp = (id, v) => ok(id, String(by[id].odpoved).replace(/\s/g, "") === String(v), `${by[id].odpoved} vs ${v}`);
const sum = (a) => a.reduce((s, x) => s + x, 0);

cmp("P5_GRA_16", TRIDY.vals[1] + TRIDY.vals[2]);
cmp("P5_GRA_17", 3 * T_POTRAVINY.rows[0][1] + T_POTRAVINY.rows[0][2]);
{ const s = [2, 5, 8, 11]; const d = s[1] - s[0]; ok("18 pravidlo", s.every((x, i) => i === 0 || x - s[i - 1] === d)); cmp("P5_GRA_18", s[0] + 5 * d); }
cmp("P5_GRA_19", rowCount(5)); ok("19 obrázek", [1, 2, 3, 4].map(rowCount).join() === "1,3,5,7");
cmp("P5_GRA_20", NEHODY.celkem - sum(NEHODY.vals.filter((v) => v !== null)));
{ const true_ = TV_ODPAD.map((t, i) => (t[1](vO) ? i : -1)).filter((i) => i >= 0); ok("21 právě jedno pravdivé", true_.length === 1 && true_[0] === by.P5_GRA_21.spravna, true_);
  ok("21 data = graf", vO.papir === ODPAD.vals[0] && vO.plast === ODPAD.vals[1] && vO.sklo === ODPAD.vals[2] && vO.kovy === ODPAD.vals[3]); }
{ const po = T_MUZEUM.rows[0][1], st = T_MUZEUM.rows[0][3], ut = po + po / 4, ct = st / 3; ok("22 celá čísla", Number.isInteger(ut) && Number.isInteger(ct)); cmp("P5_GRA_22", po + ut + st + ct); }
cmp("P5_GRA_23", sum([1, 2, 3, 4, 5, 6].map(rowCount))); ok("23 = n²", darkOf(6) + whiteOf(6) === 36);
{ const s = [7, 10, 14, 19]; for (let i = 4; i < 8; i++) s.push(s[i - 1] + (i + 2)); const e = by.P5_GRA_24; ok("24", e.moznosti[e.spravna] === String(s[7]) && e.moznosti.filter((m) => Number(m) === s[7]).length === 1, s); }
{ const h = T_CTVEREC.header.slice(1), d = T_CTVEREC.rows[0].slice(1, 4); ok("25 pravidlo n²+1", h.slice(0, 3).every((x, i) => x * x + 1 === d[i])); cmp("P5_GRA_25", h[3] * h[3] + 1); }
{ const cel = (a, b) => a + b; const A = ODDILY.chlapci[0] + ODDILY.divky[0], Cc = A / 2; ok("26 celé", Number.isInteger(Cc)); cmp("P5_GRA_26", Cc - ODDILY.chlapci[2]); void cel; }
{ const e = by.P5_GRA_27, s = []; for (let b = 3; b <= 90; b += 3) { const c = b - b / 3; if (b + c === 35) s.push([b, c]); } ok("27", s.length === 1 && e.moznosti[e.spravna] === String(KARTY.vals[0] + KARTY.vals[3] + s[0][0] + s[0][1]) && e.moznosti.filter((m) => Number(m) === KARTY.vals[0] + KARTY.vals[3] + 35).length === 1, s); }
{ const d = Math.abs(darkOf(41) - whiteOf(41)); ok("28 směr", darkOf(41) > whiteOf(41)); cmp("P5_GRA_28", d); ok("28 součty", darkOf(41) === 861 && whiteOf(41) === 820); }
{ const s = []; for (let n = 1; n <= 300; n++) if (darkOf(n) - whiteOf(n) === 59) s.push(n); ok("29", s.length === 1 && String(s[0]) === by.P5_GRA_29.odpoved, s); }
{ const seq = []; for (let t = 0; t < 20; t++) for (let k = 0; k < 3; k++) seq.push(1 + k + 2 * t); ok("30 začátek", seq.slice(0, 9).join() === "1,2,3,3,4,5,5,6,7"); cmp("P5_GRA_30", seq[39]); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else { ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved); ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved)); }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
  if (e.image) ok(e.id + " soubor obrázku", fs.existsSync("public" + e.image.url));
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
const nazev = others.length ? `${prev.nazev} + 5. třída: Grafy, tabulky a vzory, druhá dávka (15 úloh)` : "5. třída — Grafy, tabulky a vzory, druhá dávka: čtení grafů, chybějící údaj z podmínek, pravdivé tvrzení, pyramidy a posloupnosti (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
