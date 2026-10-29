// 5. třída, okruh „Tělesa a souměrnost", třetí dávka (P5_TEL_32–46): stavby z krychliček, obarvené kvádry, půdorys a pohledy, souměrné doplnění podle osy / obou os, písmena, dílky kvádru.
// Styl podle úloh 6, 8, 11–13 oficiálních testů CERMAT pro 5. třídu 2022–2026 (vlastní tělesa, obrazce a čísla, nic se nekopíruje).
// Spuštění: node scripts/build-5-telesa3.mjs → nakreslí public/obrazky/p5/tel3-*.svg a doplní/přepíše P5_TEL_32–46 v src/data/nahled-batch.json (jiné dávky nechá).
// Obrázky se kreslí ze stejných dat (seznam krychliček, vzorek čtverečků), ze kterých se odpovědi nezávisle počítají (obarvení, pohledy a souměrnost hrubou silou).
import fs from "node:fs";
import { NAVY, text, line, makeWriter } from "./lib/svg.mjs";
import { voxel, place, box } from "./lib/voxel.mjs";
const N = await import("../src/lib/normalize.ts");

const { write } = makeWriter("p5");
const FILL = "#cfe3f7", GRID = "#c4cfdd";
const bg = (w, h) => `  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>\n`;

// ── krychličky ──
function drawVoxel(name, cells, { u = 28, grid = true, dx = 0.55, dy = 0.45, alt }) {
  const v = voxel(cells, { u, grid, dx, dy }), m = 14;
  const W = Math.ceil(v.w + 2 * m), H = Math.ceil(v.h + 2 * m);
  write(name, W, H, bg(W, H) + place(v, m + v.origin[0], m + v.origin[1]), alt);
  return { w: W, h: H };
}
const key = (c) => c.slice(0, 3).join(",");
/** Počet obarvených stěn každé krychličky: stěna, která nesousedí s jinou krychličkou, se obarví zvenku. */
const exposed = (cells) => { const s = new Set(cells.map(key)); return cells.map(([i, j, k]) => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].filter(([a, b, c]) => !s.has(`${i + a},${j + b},${k + c}`)).length); };

const S_STAVBA1 = [...box(0, 3, 0, 2, 0, 1), ...box(0, 2, 0, 2, 1, 2)];                             // 6 + 4
const S_KVADR_5_4_3 = box(0, 5, 0, 4, 0, 3);
const S_TRI_VRSTVY = [...box(0, 4, 0, 3, 0, 1), ...box(0, 3, 0, 3, 1, 2), ...box(0, 2, 0, 3, 2, 3)];  // 12 + 9 + 6
const S_KVADR_4_3_2 = box(0, 4, 0, 3, 0, 2);
const S_KVADR_6_4_3 = box(0, 6, 0, 4, 0, 3);
const dimS1 = drawVoxel("tel3-stavba.svg", S_STAVBA1, { u: 34, alt: "Stavba z krychliček: dolní vrstva 3 krychličky na šířku a 2 do hloubky, nad ní horní vrstva 2 krát 2 krychličky" });
const dimK543 = drawVoxel("tel3-kvader-5-4-3.svg", S_KVADR_5_4_3, { u: 26, alt: "Kvádr z krychliček: pět krychliček na šířku, čtyři do hloubky a tři na výšku" });
const dimTv = drawVoxel("tel3-tri-vrstvy.svg", S_TRI_VRSTVY, { u: 26, alt: "Stavba ze tří vrstev: dole 4 krát 3 krychličky, uprostřed 3 krát 3 a nahoře 2 krát 3 krychličky, vrstvy jsou zarovnané vzadu vlevo" });
const dimK432 = drawVoxel("tel3-kvader-4-3-2.svg", S_KVADR_4_3_2, { u: 32, alt: "Kvádr z krychliček: čtyři krychličky na šířku, tři do hloubky a dvě na výšku" });
const dimK643 = drawVoxel("tel3-kvader-6-4-3.svg", S_KVADR_6_4_3, { u: 24, alt: "Kvádr z krychliček: šest krychliček na šířku, čtyři do hloubky a tři na výšku" });

// ── půdorys s čísly ──
const CELL = 30;
function drawPudorys(name, M, { viewer = true, alt }) {
  const R = M.length, C = M[0].length, m = 16, W = Math.max(C * CELL + 2 * m, viewer ? 190 : 0), ox = (W - C * CELL) / 2, H = R * CELL + 2 * m + (viewer ? 34 : 0);
  let body = bg(W, H);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    body += `  <rect x="${ox + c * CELL}" y="${m + r * CELL}" width="${CELL}" height="${CELL}" fill="#ffffff" stroke="${NAVY}" stroke-width="1.8"/>\n`;
    body += text(ox + c * CELL + CELL / 2, m + r * CELL + CELL / 2 + 6, String(M[r][c]), { size: 17, weight: 800, fill: NAVY }) + "\n";
  }
  if (viewer) {
    const cx = W / 2, y0 = m + R * CELL + 8;
    body += `  <polygon points="${cx},${y0} ${cx - 8},${y0 + 13} ${cx + 8},${y0 + 13}" fill="${NAVY}"/>\n` + text(cx, y0 + 29, "pozorovatel (zepředu)", { size: 12, weight: 700, fill: NAVY }) + "\n";
  }
  write(name, W, H, body, alt);
  return { w: W, h: H };
}

// ── pohledy zepředu a zprava: sloupce čtverečků ──
function drawViews(name, front, right, alt) {
  const s = 30, m = 14, gap = 44, maxH = Math.max(...front, ...right), H = maxH * s + 2 * m + 30;
  const W = (front.length + right.length) * s + gap + 2 * m;
  let body = bg(W, H), x = m;
  for (const [vals, label] of [[front, "zepředu"], [right, "zprava"]]) {
    vals.forEach((h, c) => { for (let r = 0; r < h; r++) body += `  <rect x="${x + c * s}" y="${m + (maxH - 1 - r) * s}" width="${s}" height="${s}" fill="${FILL}" stroke="${NAVY}" stroke-width="1.8"/>\n`; });
    body += text(x + (vals.length * s) / 2, H - 8, `pohled ${label}`, { size: 13, weight: 700, fill: NAVY }) + "\n";
    x += vals.length * s + gap;
  }
  write(name, W, H, body, alt);
  return { w: W, h: H };
}

// ── čtvercová síť s osou / osami souměrnosti (osa vede po čáře mezi sloupci / řádky) ──
function gridAxes(name, rows, { vertical = null, horizontal = null, alt }) {
  const R = rows.length, C = rows[0].length, m = 26, W = C * CELL + 2 * m, H = R * CELL + 2 * m;
  let body = bg(W, H);
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) body += `  <rect x="${m + c * CELL}" y="${m + r * CELL}" width="${CELL}" height="${CELL}" fill="${rows[r][c] === "#" ? FILL : "#ffffff"}" stroke="${GRID}" stroke-width="1"/>\n`;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (rows[r][c] === "#") {
    const X = m + c * CELL, Y = m + r * CELL;
    if (rows[r - 1]?.[c] !== "#") body += line(X, Y, X + CELL, Y, { w: 3 }) + "\n";
    if (rows[r + 1]?.[c] !== "#") body += line(X, Y + CELL, X + CELL, Y + CELL, { w: 3 }) + "\n";
    if (rows[r][c - 1] !== "#") body += line(X, Y, X, Y + CELL, { w: 3 }) + "\n";
    if (rows[r][c + 1] !== "#") body += line(X + CELL, Y, X + CELL, Y + CELL, { w: 3 }) + "\n";
  }
  if (vertical !== null) { const x = m + vertical * CELL; body += line(x, m - 12, x, m + R * CELL + 12, { stroke: "#c0392b", w: 2, dash: "7 4" }) + "\n" + text(x, m - 16, "o", { size: 16, weight: 800, fill: "#c0392b" }) + "\n"; }
  if (horizontal !== null) { const y = m + horizontal * CELL; body += line(m - 12, y, m + C * CELL + 12, y, { stroke: "#c0392b", w: 2, dash: "7 4" }) + "\n" + text(m - 18, y + 5, "p", { size: 16, weight: 800, fill: "#c0392b" }) + "\n"; }
  write(name, W, H, body, alt);
  return { w: W, h: H };
}

// ── data ──
const PUD1 = [[2, 1], [1, 3]];
const PUD2 = [[1, 3, 2], [2, 1, 1], [3, 2, 1]];                       // horní řádek je vzadu, dolní vpředu
const PUD3 = [[1, 2, 1, 3], [1, 1, 2, 1], [2, 1, 1, 1]];
const FRONT = [2, 3, 1, 2], RIGHT = [3, 1, 2];
const ONE_AXIS_ROWS = [".##.#.", "#..#..", "..#...", "....#."];          // osa o vede mezi 3. a 4. sloupcem; vybarvené čtverečky (0,1),(0,2),(0,4),(1,0),(1,3),(2,2),(3,4)
const TWO_AXES_ROWS = [".#....", "#.....", "..#...", "....#.", ".#....", "...#.."];
const LETTERS = [["A", 1], ["H", 2], ["E", 1], ["F", 0], ["O", 2]];     // počet os souměrnosti velkého tiskacího písmene

const dimP1 = drawPudorys("tel3-pudorys-2x2.svg", PUD1, { viewer: false, alt: "Půdorys stavby z krychliček: čísla po řádcích 2 1 a 1 3" });
const dimP2 = drawPudorys("tel3-pudorys-3x3.svg", PUD2, { alt: "Půdorys stavby z krychliček: čísla po řádcích 1 3 2, 2 1 1, 3 2 1; pozorovatel stojí pod dolním řádkem" });
const dimP3 = drawPudorys("tel3-pudorys-3x4.svg", PUD3, { alt: "Půdorys stavby z krychliček o 3 řádcích a 4 sloupcích: čísla 1 2 1 3, 1 1 2 1, 2 1 1 1; pozorovatel stojí pod dolním řádkem" });
const dimPohl = drawViews("tel3-pohledy.svg", FRONT, RIGHT, "Dva pohledy na stavbu z krychliček: zepředu sloupce vysoké 2, 3, 1 a 2 krychličky, zprava (zepředu dozadu) sloupce vysoké 3, 1 a 2 krychličky");
const dimO1 = gridAxes("tel3-osa.svg", ONE_AXIS_ROWS, { vertical: 3, alt: "Čtvercová síť 6 × 4 se svislou osou o uprostřed a vybarvenými čtverečky: v horním řádku 2. 3. a 5., v druhém 1. a 4., ve třetím 3. a ve čtvrtém 5. čtvereček" });
const dimO2 = gridAxes("tel3-dve-osy.svg", TWO_AXES_ROWS, { vertical: 3, horizontal: 3, alt: "Čtvercová síť 6 × 6 se svislou osou o a vodorovnou osou p, vybarveno je šest čtverečků v různých čtvrtinách" });

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_telesa", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const img = (url, dim, alt) => ({ image: { kind: "static", url: "/obrazky/p5/" + url, width: dim.w, height: dim.h, alt } });
const PUD_TEXT = "Stavbu z krychliček jsme nakreslili shora. Číslo v políčku říká, z kolika krychliček je na tomto místě věž.";

const ex = [
  // ───────── L1 (úvod) ─────────
  mk("A1", "p5_krychlicky", 1, "Stavba je postavená z krychliček a žádná krychlička nevisí ve vzduchu. Z kolika krychliček se skládá?", "10", [
    "Dolní vrstva má 3 krychličky na šířku a 2 do hloubky, tedy 3 · 2 = 6 krychliček.",
    "Horní vrstva má 2 · 2 = 4 krychličky.",
    "Celá stavba má 6 + 4 = 10 krychliček.",
  ], 90, img("tel3-stavba.svg", dimS1, "Stavba z krychliček: dolní vrstva 3 krát 2 krychličky, horní vrstva 2 krát 2 krychličky")),
  mk("A2", "p5_kvadr", 1, "Kvádr je slepený z krychliček: 5 krychliček na délku, 3 krychličky na šířku a 4 vrstvy nad sebou. Z kolika krychliček se skládá?", "60", [
    "Jedna vrstva má 5 · 3 = 15 krychliček.",
    "Vrstvy jsou čtyři, takže kvádr má 4 · 15 = 60 krychliček.",
  ], 90),
  mk("A3", "p5_soumernost", 1, "Kolik os souměrnosti má rovnostranný trojúhelník?", "3", [
    "Rovnostranný trojúhelník se dá přeložit na sebe podle přímky, která vede z vrcholu do středu protější strany.",
    "Takové přímky jsou tři, jedna z každého vrcholu. Trojúhelník má 3 osy souměrnosti.",
  ], 75),
  mk("A4", "p5_pudorys", 1, `${PUD_TEXT} Z kolika krychliček se stavba skládá?`, "7", [
    "Každé políčko půdorysu říká, kolik krychliček stojí na tomto místě na sobě.",
    "Dohromady 2 + 1 + 1 + 3 = 7 krychliček.",
  ], 75, img("tel3-pudorys-2x2.svg", dimP1, "Půdorys stavby z krychliček: čísla po řádcích 2 1 a 1 3")),
  // ───────── L2 (přiblížení testu) ─────────
  mk("A5", "p5_krychlicky", 2, "Kvádr slepený z malých krychliček jsme celý zvenku obarvili (i dno). Kolik malých krychliček nemá obarvenou žádnou stěnu?", "6", [
    "Neobarvené jsou jen krychličky, které nejsou vidět zvenku. Uvnitř kvádru jsou všechny, kromě vnější vrstvy na každé straně.",
    "Z rozměrů 5, 4 a 3 krychličky zbývá po odebrání vnější vrstvy z obou stran 5 − 2 = 3, 4 − 2 = 2 a 3 − 2 = 1.",
    "Uvnitř je kvádr 3 · 2 · 1 = 6 neobarvených krychliček.",
  ], 210, img("tel3-kvader-5-4-3.svg", dimK543, "Kvádr z krychliček: pět na šířku, čtyři do hloubky a tři na výšku")),
  mk("A6", "p5_pudorys", 2, `${PUD_TEXT} Kolik krychliček je třeba ještě přidat, aby vznikl kvádr s podstavou 3 × 3 krychličky, jehož výška je stejná jako nejvyšší věž?`, "11", [
    "Nejvyšší věž má 3 krychličky, takže kvádr má podstavu 3 · 3 = 9 míst a výšku 3 krychličky: 9 · 3 = 27 krychliček.",
    "Stavba má teď 1 + 3 + 2 + 2 + 1 + 1 + 3 + 2 + 1 = 16 krychliček.",
    "Je potřeba přidat 27 − 16 = 11 krychliček.",
  ], 240, img("tel3-pudorys-3x3.svg", dimP2, "Půdorys stavby z krychliček: čísla po řádcích 1 3 2, 2 1 1, 3 2 1")),
  mk("A7", "p5_soumernost", 2, "Které z velkých tiskacích písmen není osově souměrné?", null, [
    "U každého písmene hledáme osu, podle které se dá přeložit na sebe. A má svislou osu, H svislou i vodorovnou, E vodorovnou a O svislou i vodorovnou.",
    "Písmeno F se na sebe nepřeloží podle žádné osy, protože má obě vodorovné čárky jen na pravé straně svislé čáry a dole nemá nic. Správně je D).",
  ], 120, { moznosti: LETTERS.map((l) => l[0]), spravna: 3 }),
  mk("A8", "p5_soumernost", 2, "Obrazec ve čtvercové síti má být osově souměrný podle osy o. Kolik čtverečků je ještě třeba vybarvit?", "5", [
    "Každý vybarvený čtvereček musí mít souměrný protějšek na druhé straně osy. Osa vede mezi 3. a 4. sloupcem, takže sloupec 1 odpovídá sloupci 6, sloupec 2 sloupci 5 a sloupec 3 sloupci 4.",
    "V 1. řádku jsou vybarvené sloupce 2, 3 a 5, jejich protějšky jsou sloupce 5, 4 a 2, takže chybí jen sloupec 4. Ve 2. řádku jsou vybarvené sloupce 1 a 4 s protějšky 6 a 3, takže chybí oba. Ve 3. řádku je vybarvený sloupec 3 a chybí jeho protějšek 4. Ve 4. řádku je vybarvený sloupec 5 a chybí jeho protějšek 2.",
    "Dohromady chybí 1 + 2 + 1 + 1 = 5 čtverečků.",
  ], 240, img("tel3-osa.svg", dimO1, "Čtvercová síť 6 × 4 se svislou osou o uprostřed a vybarvenými čtverečky")),
  mk("A9", "p5_krychlicky", 2, "Stavba ze tří vrstev krychliček je na obrázku. Kolik krychliček je potřeba přidat, aby vznikl kvádr 4 × 3 × 3 krychličky?", "9", [
    "Dolní vrstva má 4 · 3 = 12 krychliček, prostřední 3 · 3 = 9 a horní 2 · 3 = 6. Stavba má 12 + 9 + 6 = 27 krychliček.",
    "Kvádr 4 × 3 × 3 má 4 · 3 · 3 = 36 krychliček.",
    "Přidat je potřeba 36 − 27 = 9 krychliček.",
  ], 210, img("tel3-tri-vrstvy.svg", dimTv, "Stavba ze tří vrstev: dole 4 krát 3 krychličky, uprostřed 3 krát 3 a nahoře 2 krát 3")),
  mk("A10", "p5_krychlicky", 2, "Kvádr slepený z malých krychliček jsme celý zvenku obarvili (i dno). Kolik malých krychliček má obarvenou právě jednu stěnu?", "4", [
    "Kvádr je vysoký jen dvě krychličky, takže každá krychlička leží buď na dně, nebo nahoře a má aspoň jednu stěnu obarvenou. Právě jednu stěnu mají jen ty krychličky, které nejsou na žádné boční hraně.",
    "Na horní stěně je 4 · 3 krychliček. Bez okrajového pásu zbývá 2 · 1 = 2 krychličky, stejně tak na spodní stěně.",
    "Dohromady jsou 2 + 2 = 4 krychličky.",
  ], 240, img("tel3-kvader-4-3-2.svg", dimK432, "Kvádr z krychliček: čtyři na šířku, tři do hloubky a dvě na výšku")),
  // ───────── L3 (úroveň testu) ─────────
  mk("A11", "p5_krychlicky", 3, "Podle návodu se lepí stavba z krychliček. Návod ukazuje pohled zepředu a pohled zprava. Stavbu lze podle téhož návodu slepit z různého počtu krychliček. Kolik nejméně krychliček je potřeba?", "8", [
    "Pohled zepředu říká, jak vysoké jsou 4 sloupce zleva doprava (2, 3, 1, 2). Pohled zprava říká, jak vysoké jsou 3 řady zepředu dozadu (3, 1, 2).",
    "Každý sloupec musí mít aspoň jednu věž tak vysokou, jak ukazuje pohled zepředu, a to je dohromady 2 + 3 + 1 + 2 = 8 krychliček. Věže se dají rozmístit tak, aby splnily i pohled zprava: věž výšky 3 stojí v řadě s výškou 3, jedna věž výšky 2 v řadě s výškou 2 a věž výšky 1 v řadě s výškou 1; zbývající věž výšky 2 může stát v řadě s výškou 3.",
    "Méně než 8 krychliček nestačí, takže nejmenší stavba má 8 krychliček.",
  ], 330, img("tel3-pohledy.svg", dimPohl, "Dva pohledy na stavbu z krychliček: zepředu sloupce vysoké 2, 3, 1 a 2, zprava sloupce vysoké 3, 1 a 2")),
  mk("A12", "p5_krychlicky", 3, "Kvádr slepený z malých krychliček jsme celý zvenku obarvili (i dno). Kolik malých krychliček má obarvené právě dvě stěny?", null, [
    "Právě dvě obarvené stěny mají krychličky na hranách kvádru, ale ne v rozích. Rohy mají tři obarvené stěny.",
    "Kvádr má 4 hrany délky 6 krychliček, 4 hrany délky 4 a 4 hrany délky 3. Na každé hraně jsou bez dvou rohů 6 − 2 = 4, 4 − 2 = 2 a 3 − 2 = 1 krychlička.",
    "Dohromady 4 · 4 + 4 · 2 + 4 · 1 = 16 + 8 + 4 = 28 krychliček. Správně je B).",
  ], 300, { ...img("tel3-kvader-6-4-3.svg", dimK643, "Kvádr z krychliček: šest na šířku, čtyři do hloubky a tři na výšku"), moznosti: ["24", "28", "32", "36", "40"], spravna: 1 }),
  mk("A13", "p5_soumernost", 3, "Ve čtvercové síti je vybarveno 6 čtverečků. Obrazec má být osově souměrný podle obou os, osy o a p. Kolik čtverečků je ještě třeba vybarvit?", "18", [
    "Každý vybarvený čtvereček má tři další souměrné protějšky: přes osu o, přes osu p a přes obě osy. Osy vedou mezi řádky a sloupci, takže čtverečky na ose neleží.",
    "Pro každý vybarvený čtvereček tedy musí být vybarveno celkem 4 čtverečky (jeden z každé čtvrtiny). Šest čtverečků leží v různých čtvrtinách a nepokrývají se žádné protějšky.",
    "Obrazec bude mít 6 skupin po 4 čtverečcích, tedy 24 čtverečků. Vybarveno je 6, takže zbývá 24 − 6 = 18.",
  ], 330, img("tel3-dve-osy.svg", dimO2, "Čtvercová síť 6 × 6 se svislou osou o a vodorovnou osou p, vybarveno je šest čtverečků")),
  mk("A14", "p5_kvadr", 3, "Dílek stavebnice má tvar kvádru s rozměry 3 cm, 4 cm a 6 cm. Kolik dílků je třeba ke složení nejmenší možné krychle?", "24", [
    "Hrana krychle se musí dát složit z hran dílků, takže musí být dělitelná 3, 4 i 6. Nejmenší takové číslo je 12, hrana krychle je 12 cm.",
    "Objem krychle je 12 · 12 · 12 = 1728 cm³ a objem dílku 3 · 4 · 6 = 72 cm³.",
    "Potřeba je 1728 : 72 = 24 dílků.",
  ], 300),
  mk("A15", "p5_pudorys", 3, `${PUD_TEXT} Pozorovatel stojí pod dolním řádkem. Kolik čtverečků mají dohromady pohled zepředu a pohled zprava?`, "16", [
    "Při pohledu zepředu vidíme každý sloupec tak vysoký, jak je v něm nejvyšší věž. Nejvyšší věže ve sloupcích zleva doprava jsou 2, 2, 2 a 3, dohromady 9 čtverečků.",
    "Při pohledu zprava vidíme každý řádek tak vysoký, jak je v něm nejvyšší věž. Nejvyšší věže v řádcích jsou 3, 2 a 2, dohromady 7 čtverečků.",
    "Oba pohledy mají dohromady 9 + 7 = 16 čtverečků.",
  ], 300, img("tel3-pudorys-3x4.svg", dimP3, "Půdorys stavby z krychliček o 3 řádcích a 4 sloupcích: čísla 1 2 1 3, 1 1 2 1, 2 1 1 1")),
];
for (const e of ex) if (e.moznosti && e.odpoved == null) e.odpoved = e.moznosti[e.spravna];

// ── nezávislé ověření ──
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const cmp = (id, v) => ok(id, String(by[id].odpoved).replace(/\s/g, "") === String(v), `${by[id].odpoved} vs ${v}`);
const sum = (a) => a.reduce((s, x) => s + x, 0);
const cellsOf = (rows) => rows.flatMap((s, r) => [...s].flatMap((ch, c) => (ch === "#" ? [[r, c]] : [])));
/** Doplnění množiny buněk o souměrné protějšky podle zadaných zrcadlení; vrací uzávěr. */
const closure = (cs, maps) => { const s = new Set(cs.map((c) => c.join(","))); let ch = true; while (ch) { ch = false; for (const k of [...s]) { const p = k.split(",").map(Number); for (const f of maps) { const q = f(p).join(","); if (!s.has(q)) { s.add(q); ch = true; } } } } return s; };

cmp("A1", S_STAVBA1.length); ok("A1 vrstvy", S_STAVBA1.length === 3 * 2 + 2 * 2);
cmp("A2", 5 * 3 * 4);
{ // A3: osy rovnostranného trojúhelníku — kontrola souřadnicemi: přeložení podle přímky z každého vrcholu do středu protější strany
  const V = [[0, 0], [2, 0], [1, Math.sqrt(3)]], d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const reflect = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy), fx = a[0] + t * dx, fy = a[1] + t * dy; return [2 * fx - p[0], 2 * fy - p[1]]; };
  let n = 0; for (let i = 0; i < 3; i++) { const a = V[i], o = [V[(i + 1) % 3], V[(i + 2) % 3]], mid = [(o[0][0] + o[1][0]) / 2, (o[0][1] + o[1][1]) / 2]; const img1 = V.map((p) => reflect(p, a, mid)); if (img1.every((q) => V.some((p) => d(p, q) < 1e-9))) n++; }
  cmp("A3", n);
}
cmp("A4", sum(PUD1.flat()));
{ const e = exposed(S_KVADR_5_4_3).filter((x) => x === 0).length; cmp("A5", e); ok("A5 rozměry", S_KVADR_5_4_3.length === 60 && (5 - 2) * (4 - 2) * (3 - 2) === e); }
{ const n = PUD2.length * PUD2[0].length, h = Math.max(...PUD2.flat()); cmp("A6", n * h - sum(PUD2.flat())); ok("A6 rozměry", n === 9 && h === 3); }
{ const o = by.A7; ok("A7 právě jedno nesouměrné", LETTERS.filter((l) => l[1] === 0).length === 1 && o.moznosti[o.spravna] === LETTERS.find((l) => l[1] === 0)[0]); }
{ // A8: uzávěr podle svislé osy mezi sloupci 2 a 3 (6 sloupců → c ↦ 5 − c)
  const cs = cellsOf(ONE_AXIS_ROWS), cl = closure(cs, [([r, c]) => [r, 5 - c]]);
  ok("A8 data", cs.length === 7 && ONE_AXIS_ROWS.every((r) => r.length === 6) && ONE_AXIS_ROWS.length === 4); cmp("A8", cl.size - cs.length);
}
{ ok("A9 vrstvy", S_TRI_VRSTVY.length === 27); cmp("A9", 4 * 3 * 3 - S_TRI_VRSTVY.length); }
{ const e = exposed(S_KVADR_4_3_2).filter((x) => x === 1).length; cmp("A10", e); }
{ // A11: nejmenší stavba hrubou silou přes všechny výšky 0–3 v mřížce 4 sloupce × 3 řady
  const C = FRONT.length, R = RIGHT.length, maxH = Math.max(...FRONT, ...RIGHT); let best = Infinity, cnt = 0;
  const g = new Array(C * R).fill(0);
  const rec = (i, tot) => {
    if (tot >= best) return;
    if (i === C * R) {
      for (let x = 0; x < C; x++) { let m = 0; for (let y = 0; y < R; y++) m = Math.max(m, g[y * C + x]); if (m !== FRONT[x]) return; }
      for (let y = 0; y < R; y++) { let m = 0; for (let x = 0; x < C; x++) m = Math.max(m, g[y * C + x]); if (m !== RIGHT[y]) return; }
      best = tot; cnt++; return;
    }
    const x = i % C, y = Math.floor(i / C), lim = Math.min(FRONT[x], RIGHT[y]);
    for (let h = 0; h <= lim; h++) { g[i] = h; rec(i + 1, tot + h); }
    g[i] = 0;
  };
  rec(0, 0); ok("A11 existuje", best < Infinity); cmp("A11", best); ok("A11 součet pohledu", best === Math.max(sum(FRONT), sum(RIGHT)), best);
}
{ const o = by.A12, e = exposed(S_KVADR_6_4_3).filter((x) => x === 2).length; ok("A12", e === 28 && o.moznosti[o.spravna] === String(e) && o.moznosti.filter((m) => Number(m) === e).length === 1, e); }
{ const cs = cellsOf(TWO_AXES_ROWS), cl = closure(cs, [([r, c]) => [r, 5 - c], ([r, c]) => [5 - r, c]]);
  ok("A13 data", cs.length === 6 && cl.size === 24, [cs.length, cl.size]); cmp("A13", cl.size - cs.length); }
{ const perm = (a) => (a.length < 2 ? [a] : a.flatMap((x, i) => perm([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])));
  const fits = (piece, big) => perm(piece).some((p) => big.every((b, i) => b % p[i] === 0)); const piece = [3, 4, 6]; let e = 1; while (!((e ** 3) % (piece[0] * piece[1] * piece[2]) === 0 && fits(piece, [e, e, e]))) e++;
  ok("A14 hrana", e === 12, e); cmp("A14", (e ** 3) / (piece[0] * piece[1] * piece[2])); }
{ const colMax = PUD3[0].map((_, c) => Math.max(...PUD3.map((r) => r[c]))), rowMax = PUD3.map((r) => Math.max(...r)); ok("A15 pohledy", colMax.join() === "2,2,2,3" && rowMax.join() === "3,2,2"); cmp("A15", sum(colMax) + sum(rowMax)); }

// pořadí podle obtížnosti a průběžné číslování (navazuje na P5_TEL_01–31)
{ const order = [...ex].sort((a, b) => a.obtiznost - b.obtiznost); order.forEach((e, i) => { e.id = `P5_TEL_${String(i + 32).padStart(2, "0")}`; }); ex.splice(0, ex.length, ...order); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else { ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved); ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved)); }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\.|přesněji/i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
  if (e.image) ok(e.id + " soubor obrázku", fs.existsSync("public" + e.image.url));
  if (e.obtiznost === 1 && /\d\s?:\s?\d\d/.test(e.zadani)) ok(e.id + " L1 bez dělení dvojciferným", false);
  if (/kruhov|koláč/i.test(e.zadani + " " + (e.image?.alt ?? ""))) ok(e.id + " bez kruhových diagramů", false);
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
const nazev = others.length ? `${prev.nazev} + 5. třída: Tělesa a souměrnost, třetí dávka (15 úloh)` : "5. třída — Tělesa a souměrnost, třetí dávka: stavby z krychliček, obarvené kvádry, půdorys a pohledy, souměrné doplnění podle osy a obou os, písmena, dílky kvádru (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
