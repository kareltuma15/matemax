// 5. třída, okruh „Grafy, tabulky a vzory" (P5_GRA_01–15): čtení ze sloupcového grafu, tabulky, chybějící údaj, pravdivé tvrzení, vzory a posloupnosti.
// Styl podle úloh 8 a 14 oficiálních testů CERMAT pro 5. třídu (vlastní data, obrázky a čísla, nic se nekopíruje).
// Spuštění: node scripts/build-5-grafy.mjs → nakreslí public/obrazky/p5/gra-*.svg a doplní/přepíše P5_GRA_* v src/data/nahled-batch.json (jiné dávky nechá).
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

// ── špejle: řada čtverců, každá hrana je jedna špejle ──
const spejle = (n) => { const e = new Set(); for (let i = 0; i < n; i++) { e.add(`h${i},0`); e.add(`h${i},1`); e.add(`v${i},0`); e.add(`v${i + 1},0`); } return e; };
function drawSpejle(name, ns, alt) {
  const s = 40, gap = 34, m = 14, hgt = s + 2 * m + 24;
  let x = m, body = "";
  const parts = [];
  ns.forEach((n, k) => {
    const w = n * s, slot = Math.max(w, 84), x00 = x; x += (slot - w) / 2;
    for (const e of spejle(n)) {
      const [t, rest] = [e[0], e.slice(1)]; const [a, b] = rest.split(",").map(Number);
      if (t === "h") parts.push(line(x + a * s, m + b * s, x + (a + 1) * s, m + b * s, { stroke: BLUE, w: 5 }));
      else parts.push(line(x + a * s, m, x + a * s, m + s, { stroke: BLUE, w: 5 }));
    }
    parts.push(text(x + w / 2, m + s + 24, `${k + 1}. obrazec`, { size: 12, weight: 700, fill: NAVY }));
    x = x00 + slot + gap;
  });
  const W = x - gap + m;
  write(name, W, hgt, `  <rect x="0" y="0" width="${W}" height="${hgt}" fill="#ffffff"/>\n` + parts.join("\n"), alt);
  return { w: W, h: hgt };
}

// ── schody: n-tý obrazec má sloupce výšky 1…n ──
function drawSchody(name, ns, alt) {
  const s = 26, gap = 40, m = 14, maxN = Math.max(...ns), hgt = maxN * s + 2 * m + 26;
  let x = m; const parts = [];
  ns.forEach((n, k) => {
    const slot = Math.max(n * s, 84), x00 = x; x += (slot - n * s) / 2;
    for (let c = 0; c < n; c++) for (let r = 0; r <= c; r++) parts.push(`  <rect x="${x + c * s}" y="${m + (maxN - 1 - r) * s}" width="${s}" height="${s}" fill="${FILL}" stroke="${NAVY}" stroke-width="1.6"/>`);
    parts.push(text(x + (n * s) / 2, m + maxN * s + 22, `${k + 1}. obrazec`, { size: 12, weight: 700, fill: NAVY }));
    x = x00 + slot + gap;
  });
  const W = x - gap + m;
  write(name, W, hgt, `  <rect x="0" y="0" width="${W}" height="${hgt}" fill="#ffffff"/>\n` + parts.join("\n"), alt);
  return { w: W, h: hgt };
}

// ── data ──
const KROUZKY = { cats: ["fotbal", "tanec", "kreslení", "šachy"], vals: [16, 10, 12, 6] };
const KNIHY = { cats: ["leden", "únor", "březen", "duben"], vals: [8, 12, null, 6], celkem: 40 };
const DILKY = { cats: ["A", "B", "C", "D"], vals: [4, 6, 2, 5], celkem: 68 };
const SOUTEZ = { cats: ["Lvi", "Orli", "Vlci", "Medvědi"], vals: [36, 28, 20, 12] };
const dimK = barChart("gra-krouzky.svg", { ...KROUZKY, maxV: 18, step: 2, title: "Počet dětí v kroužcích", alt: `Sloupcový graf počtu dětí v kroužcích: ${KROUZKY.cats.map((c, i) => `${c} ${KROUZKY.vals[i]}`).join(", ")}` });
const dimKn = barChart("gra-knihy.svg", { ...KNIHY, maxV: 16, step: 2, title: "Přečtené knihy za měsíc", alt: `Sloupcový graf přečtených knih za měsíc: leden 8, únor 12, březen chybí, duben 6` });
const dimD = barChart("gra-dilky.svg", { ...DILKY, maxV: 7, step: 1, axisNums: false, title: "Počet žáků v kroužcích", alt: "Sloupcový graf bez čísel na ose: sloupce A, B, C a D mají 4, 6, 2 a 5 dílků" });
const dimS = barChart("gra-soutez.svg", { ...SOUTEZ, maxV: 40, step: 4, title: "Body družstev v soutěži", alt: `Sloupcový graf bodů družstev: ${SOUTEZ.cats.map((c, i) => `${c} ${SOUTEZ.vals[i]}`).join(", ")}` });
const T_VYLET = { header: ["den", "pátek", "sobota", "neděle"], rows: [["kilometry", 12, 18, 9]] };
const T_CENIK = { header: ["zboží", "sešit", "pero", "guma", "pravítko"], rows: [["cena (Kč)", 12, 8, 5, 15]] };
const T_ZOO = { header: ["den", "po", "út", "st", "čt"], rows: [["návštěvníci", 60, "?", 45, "?"]] };
const T_PRAVIDLO = { header: ["číslo", 2, 4, 5, 9], rows: [["nové číslo", 7, 13, 16, "?"]] };
const dimTv = table("gra-vylet.svg", { ...T_VYLET, alt: "Tabulka: v pátek 12 km, v sobotu 18 km, v neděli 9 km" });
const dimTc = table("gra-cenik.svg", { ...T_CENIK, colW: 78, alt: "Ceník: sešit 12 Kč, pero 8 Kč, guma 5 Kč, pravítko 15 Kč" });
const dimTz = table("gra-zoo.svg", { ...T_ZOO, colW: 66, alt: "Tabulka návštěvníků zoo: pondělí 60, úterý chybí, středa 45, čtvrtek chybí" });
const dimTp = table("gra-pravidlo.svg", { ...T_PRAVIDLO, colW: 66, alt: "Tabulka: číslo 2 se změní na 7, 4 na 13, 5 na 16, u čísla 9 nové číslo chybí" });
const dimSp = drawSpejle("gra-spejle.svg", [1, 2, 3], "Obrazce ze špejlí: 1. obrazec je jeden čtverec, 2. obrazec dva čtverce vedle sebe a 3. obrazec tři čtverce vedle sebe; každá strana je jedna špejle");
const dimSch = drawSchody("gra-schody.svg", [1, 2, 3, 4], "Obrazce ze čtverečků ve tvaru schodů: 1. obrazec má 1 čtvereček, 2. obrazec 3, 3. obrazec 6 a 4. obrazec 10");

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_grafy", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const img = (url, dim, alt) => ({ image: { kind: "static", url: "/obrazky/p5/" + url, width: dim.w, height: dim.h, alt } });

// A–E: tvrzení jako dvojice [text, predikát]; platit musí právě jedno
const TV_KROUZKY = [
  ["Na tanec chodí polovina dětí z fotbalu.", (v) => v.tanec * 2 === v.fotbal],
  ["Na kreslení chodí o 2 děti víc než na tanec.", (v) => v.kresleni - v.tanec === 2],
  ["Na šachy chodí třetina dětí z fotbalu.", (v) => v.sachy * 3 === v.fotbal],
  ["Na fotbal chodí víc než polovina všech dětí.", (v) => v.fotbal * 2 > v.tanec + v.fotbal + v.kresleni + v.sachy],
  ["Na kreslení chodí stejně dětí jako na šachy a tanec dohromady.", (v) => v.kresleni === v.sachy + v.tanec],
];
const vK = { fotbal: 16, tanec: 10, kresleni: 12, sachy: 6 };
const TV_SOUTEZ = [
  ["Lvi získali o polovinu víc bodů než Vlci.", (v) => v.lvi === v.vlci * 1.5],
  ["Orli a Medvědi získali dohromady stejně bodů jako Lvi.", (v) => v.orli + v.medvedi === v.lvi],
  ["Medvědi získali třetinu bodů Lvů.", (v) => v.medvedi * 3 === v.lvi],
  ["Vlci získali o 10 bodů míň než Orli.", (v) => v.orli - v.vlci === 10],
  ["Všechna družstva dohromady získala méně než 90 bodů.", (v) => v.lvi + v.orli + v.vlci + v.medvedi < 90],
];
const vS = { lvi: 36, orli: 28, vlci: 20, medvedi: 12 };

const ex = [
  // ───────── L1 ─────────
  mk("P5_GRA_01", "p5_sloupcovy", 1, "Graf ukazuje, kolik dětí chodí do jednotlivých kroužků. Kolik dětí chodí na kreslení?", "12", [
    "V grafu najdeme sloupec s popiskem „kreslení“.",
    "Horní okraj sloupce je na čáře s číslem 12, na kreslení tedy chodí 12 dětí.",
  ], 60, img("gra-krouzky.svg", dimK, "Sloupcový graf počtu dětí v kroužcích: " + KROUZKY.cats.map((c, i) => `${c} ${KROUZKY.vals[i]}`).join(", "))),
  mk("P5_GRA_02", "p5_sloupcovy", 1, "Každé dítě chodí jen do jednoho kroužku. Kolik dětí chodí do všech čtyř kroužků dohromady?", "44", [
    "Z grafu přečteme počty: fotbal 16, tanec 10, kreslení 12 a šachy 6.",
    "Sečteme je: 16 + 10 + 12 + 6 = 44 dětí.",
  ], 90, img("gra-krouzky.svg", dimK, "Sloupcový graf počtu dětí v kroužcích: " + KROUZKY.cats.map((c, i) => `${c} ${KROUZKY.vals[i]}`).join(", "))),
  mk("P5_GRA_03", "p5_tabulka", 1, "Pavel šel na třídenní výlet. V tabulce je, kolik kilometrů ušel každý den. Kolik kilometrů ušel za celý výlet?", "39", [
    "Z tabulky přečteme: v pátek 12 km, v sobotu 18 km, v neděli 9 km.",
    "12 + 18 + 9 = 39 km.",
  ], 75, img("gra-vylet.svg", dimTv, "Tabulka: v pátek 12 km, v sobotu 18 km, v neděli 9 km")),
  mk("P5_GRA_04", "p5_vzory", 1, "Čísla jsou řazena podle stejného pravidla: 3, 7, 11, 15, … Které číslo je na dalším místě?", "19", [
    "Každé další číslo je o 4 větší než předchozí: 7 − 3 = 4, 11 − 7 = 4, 15 − 11 = 4.",
    "Další číslo je 15 + 4 = 19.",
  ], 60),
  // ───────── L2 ─────────
  mk("P5_GRA_05", "p5_sloupcovy", 2, "Podle grafu určete, o kolik dětí víc chodí na fotbal než na šachy.", "10", [
    "Na fotbal chodí 16 dětí a na šachy 6 dětí.",
    "Rozdíl je 16 − 6 = 10 dětí.",
  ], 90, img("gra-krouzky.svg", dimK, "Sloupcový graf počtu dětí v kroužcích: " + KROUZKY.cats.map((c, i) => `${c} ${KROUZKY.vals[i]}`).join(", "))),
  mk("P5_GRA_06", "p5_chybi_udaj", 2, "Graf ukazuje, kolik knih přečetli žáci třídy v jednotlivých měsících. Sloupec za březen chybí. Za všechny čtyři měsíce přečetli žáci dohromady 40 knih. Kolik knih přečetli v březnu?", "14", [
    "Z grafu přečteme: leden 8, únor 12 a duben 6 knih, dohromady 8 + 12 + 6 = 26 knih.",
    "V březnu přečetli zbytek: 40 − 26 = 14 knih.",
  ], 120, img("gra-knihy.svg", dimKn, "Sloupcový graf přečtených knih za měsíc: leden 8, únor 12, březen chybí, duben 6")),
  mk("P5_GRA_07", "p5_tvrzeni", 2, "Které tvrzení o grafu s kroužky je pravdivé?", null, [
    "Z grafu přečteme počty: fotbal 16, tanec 10, kreslení 12, šachy 6 (dohromady 44).",
    "A) Polovina z 16 je 8, ne 10. B) 12 − 10 = 2, tvrzení platí. C) Třetina z 16 není 6. D) Polovina ze 44 je 22 a 16 je méně. E) 6 + 10 = 16, ne 12. Správně je B).",
  ], 150, { ...img("gra-krouzky.svg", dimK, "Sloupcový graf počtu dětí v kroužcích: " + KROUZKY.cats.map((c, i) => `${c} ${KROUZKY.vals[i]}`).join(", ")), moznosti: TV_KROUZKY.map((t) => t[0]), spravna: 1 }),
  mk("P5_GRA_08", "p5_tabulka", 2, "V tabulce jsou ceny školních potřeb. Kolik korun zaplatíš za 3 sešity a 2 pera?", "52", [
    "Sešit stojí 12 Kč, tři sešity stojí 3 · 12 = 36 Kč.",
    "Pero stojí 8 Kč, dvě pera stojí 2 · 8 = 16 Kč. Dohromady zaplatíš 36 + 16 = 52 Kč.",
  ], 105, img("gra-cenik.svg", dimTc, "Ceník: sešit 12 Kč, pero 8 Kč, guma 5 Kč, pravítko 15 Kč")),
  mk("P5_GRA_09", "p5_vzory", 2, "Obrazce jsou postavené ze špejlí, každá strana čtverce je jedna špejle. Kolik špejlí je potřeba na 8. obrazec?", "25", [
    "Spočítáme špejle v prvních obrazcích: 1. obrazec 4, 2. obrazec 7, 3. obrazec 10.",
    "Každý další čtverec přidá 3 špejle. 8. obrazec má 8 čtverců: 4 + 7 · 3 = 25 špejlí.",
  ], 150, img("gra-spejle.svg", dimSp, "Obrazce ze špejlí: 1, 2 a 3 čtverce vedle sebe")),
  mk("P5_GRA_10", "p5_vzory", 2, "Čísla jsou řazena podle pravidla: 1, 2, 4, 7, 11, … Které číslo bude na 7. místě?", "22", [
    "Rozdíly mezi sousedními čísly jsou 1, 2, 3, 4, takže každý rozdíl je o 1 větší.",
    "Další čísla: 11 + 5 = 16 (6. místo) a 16 + 6 = 22 (7. místo).",
  ], 120),
  // ───────── L3 ─────────
  mk("P5_GRA_11", "p5_chybi_udaj", 3, "Na svislé ose chybí čísla, jeden dílek osy ale znamená vždy stejný počet žáků. Do všech čtyř kroužků dohromady chodí 68 žáků. Kolik žáků chodí do kroužku B?", "24", [
    "Spočítáme dílky: sloupec A má 4, B má 6, C má 2 a D má 5 dílků, dohromady 4 + 6 + 2 + 5 = 17 dílků.",
    "17 dílků odpovídá 68 žákům, jeden dílek je 68 : 17 = 4 žáci.",
    "Kroužek B má 6 dílků, tedy 6 · 4 = 24 žáků.",
  ], 210, img("gra-dilky.svg", dimD, "Sloupcový graf bez čísel na ose: sloupce A, B, C a D mají 4, 6, 2 a 5 dílků")),
  mk("P5_GRA_12", "p5_tabulka", 3, "V tabulce je počet návštěvníků zoo ve čtyřech dnech, údaje za úterý a čtvrtek chybí. V úterý přišlo o 25 návštěvníků víc než v pondělí. Ve čtvrtek přišlo dvakrát víc návštěvníků než ve středu. Kolik návštěvníků přišlo za všechny čtyři dny dohromady?", "280", [
    "V úterý přišlo 60 + 25 = 85 návštěvníků.",
    "Ve čtvrtek přišlo 2 · 45 = 90 návštěvníků.",
    "Za čtyři dny dohromady: 60 + 85 + 45 + 90 = 280 návštěvníků.",
  ], 210, img("gra-zoo.svg", dimTz, "Tabulka návštěvníků zoo: pondělí 60, úterý chybí, středa 45, čtvrtek chybí")),
  mk("P5_GRA_13", "p5_vzory", 3, "Obrazce jsou složené z čtverečků do tvaru schodů. Z kolika čtverečků se skládá 8. obrazec?", "36", [
    "Počty čtverečků: 1. obrazec 1, 2. obrazec 3, 3. obrazec 6, 4. obrazec 10. Přibývá postupně 2, 3, 4 čtverečky.",
    "Každý další obrazec přidá jeden nový sloupec, který je o 1 vyšší než předchozí. 5. obrazec 15, 6. obrazec 21, 7. obrazec 28, 8. obrazec 36.",
    "Kontrola: 1 + 2 + 3 + 4 + 5 + 6 + 7 + 8 = 36.",
  ], 210, img("gra-schody.svg", dimSch, "Obrazce ze čtverečků ve tvaru schodů: 1. obrazec má 1 čtvereček, 2. obrazec 3, 3. obrazec 6 a 4. obrazec 10")),
  mk("P5_GRA_14", "p5_tvrzeni", 3, "Graf ukazuje body čtyř družstev v soutěži. Které tvrzení je pravdivé?", null, [
    "Z grafu přečteme: Lvi 36, Orli 28, Vlci 20, Medvědi 12 bodů (dohromady 96).",
    "A) Polovina z 20 je 10 a 20 + 10 = 30, ne 36. B) 28 + 12 = 40, ne 36. C) Třetina z 36 je 12, tvrzení platí. D) 28 − 20 = 8, ne 10. E) 96 není méně než 90. Správně je C).",
  ], 210, { ...img("gra-soutez.svg", dimS, "Sloupcový graf bodů družstev: " + SOUTEZ.cats.map((c, i) => `${c} ${SOUTEZ.vals[i]}`).join(", ")), moznosti: TV_SOUTEZ.map((t) => t[0]), spravna: 2 }),
  mk("P5_GRA_15", "p5_vzory", 3, "V tabulce se každé číslo v horním řádku změní na číslo v dolním řádku podle stejného pravidla. Jaké číslo patří místo otazníku?", "28", [
    "Hledáme pravidlo: 2 → 7, 4 → 13, 5 → 16. Když se číslo zvětší o 1, nové číslo vzroste o 3 (např. 4 → 5 je 13 → 16).",
    "Číslo se tedy nejdřív vynásobí třemi: 3 · 2 = 6 a pak se přičte 1, vznikne 7. Zkouška: 3 · 4 + 1 = 13, 3 · 5 + 1 = 16.",
    "Pro 9 platí 3 · 9 + 1 = 28.",
  ], 240, img("gra-pravidlo.svg", dimTp, "Tabulka: číslo 2 se změní na 7, 4 na 13, 5 na 16, u čísla 9 nové číslo chybí")),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ── nezávislé ověření ──
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const cmp = (id, v) => ok(id, String(by[id].odpoved).replace(/\s/g, "") === String(v), `${by[id].odpoved} vs ${v}`);
const sum = (a) => a.reduce((s, x) => s + x, 0);

cmp("P5_GRA_01", KROUZKY.vals[2]);
cmp("P5_GRA_02", sum(KROUZKY.vals));
cmp("P5_GRA_03", sum(T_VYLET.rows[0].slice(1)));
{ const s = [3, 7, 11, 15]; const d = s[1] - s[0]; ok("04 pravidlo", s.every((x, i) => i === 0 || x - s[i - 1] === d)); cmp("P5_GRA_04", s[3] + d); }
cmp("P5_GRA_05", KROUZKY.vals[0] - KROUZKY.vals[3]);
cmp("P5_GRA_06", KNIHY.celkem - sum(KNIHY.vals.filter((v) => v !== null)));
{ const true_ = TV_KROUZKY.map((t, i) => (t[1](vK) ? i : -1)).filter((i) => i >= 0); ok("07 právě jedno pravdivé", true_.length === 1 && true_[0] === by.P5_GRA_07.spravna, true_);
  ok("07 data = graf", vK.fotbal === KROUZKY.vals[0] && vK.tanec === KROUZKY.vals[1] && vK.kresleni === KROUZKY.vals[2] && vK.sachy === KROUZKY.vals[3]); }
cmp("P5_GRA_08", 3 * T_CENIK.rows[0][1] + 2 * T_CENIK.rows[0][2]);
ok("09 špejle = 3n+1", [1, 2, 3, 8].every((n) => spejle(n).size === 3 * n + 1)); cmp("P5_GRA_09", spejle(8).size);
{ const s = [1, 2, 4, 7, 11]; for (let i = 5; i < 7; i++) s.push(s[i - 1] + i); cmp("P5_GRA_10", s[6]); }
{ const cel = sum(DILKY.vals); ok("11 dělitelnost", DILKY.celkem % cel === 0); cmp("P5_GRA_11", DILKY.vals[1] * (DILKY.celkem / cel)); }
{ const po = 60, ut = po + 25, st = 45, ct = 2 * st; cmp("P5_GRA_12", po + ut + st + ct); ok("12 tabulka", T_ZOO.rows[0][1] === po && T_ZOO.rows[0][3] === st); }
{ let c = 0; for (let n = 1; n <= 8; n++) c += n; cmp("P5_GRA_13", c); ok("13 obrázek 1,3,6,10", [1, 2, 3, 4].map((n) => (n * (n + 1)) / 2).join() === "1,3,6,10"); }
{ const true_ = TV_SOUTEZ.map((t, i) => (t[1](vS) ? i : -1)).filter((i) => i >= 0); ok("14 právě jedno pravdivé", true_.length === 1 && true_[0] === by.P5_GRA_14.spravna, true_);
  ok("14 data = graf", vS.lvi === SOUTEZ.vals[0] && vS.orli === SOUTEZ.vals[1] && vS.vlci === SOUTEZ.vals[2] && vS.medvedi === SOUTEZ.vals[3]); }
{ const h = T_PRAVIDLO.header.slice(1), d = T_PRAVIDLO.rows[0].slice(1, 4); ok("15 pravidlo 3n+1", h.slice(0, 3).every((x, i) => 3 * x + 1 === d[i])); cmp("P5_GRA_15", 3 * h[3] + 1); }

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
const others = (prev.examples ?? []).filter((e) => !/^P5_GRA_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Grafy, tabulky a vzory (15 úloh)` : "5. třída — Grafy, tabulky a vzory: sloupcový graf, tabulka, chybějící údaj, pravdivé tvrzení, vzory (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
