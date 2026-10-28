// 5. třída, okruh „Tělesa a souměrnost" (P5_TEL_01–16): stavby z krychliček, půdorys s čísly, skládání těles z dílků, osová souměrnost.
// Styl podle úloh 9–13 oficiálních testů CERMAT pro 5. třídu (vlastní tělesa, obrazce a čísla, nic se nekopíruje).
// Spuštění: node scripts/build-5-telesa.mjs → nakreslí public/obrazky/p5/tel-*.svg a doplní/přepíše P5_TEL_* v src/data/nahled-batch.json (jiné dávky nechá).
// Obrázky se kreslí ze stejných dat (seznam krychliček, vzorek čtverečků), ze kterých se odpovědi nezávisle počítají.
import fs from "node:fs";
import { NAVY, text, line, makeWriter } from "./lib/svg.mjs";
import { voxel, place, box } from "./lib/voxel.mjs";
import { canBuild, sameShape, allVisible, unambiguous, L } from "./lib/skladani.mjs";
const N = await import("../src/lib/normalize.ts");

const { write } = makeWriter("p5");
const FILL = "#cfe3f7", HEAD = "#e6eef8", GRID = "#c4cfdd";

// ── krychličky ──
function drawVoxel(name, cells, { u = 28, grid = true, dx = 0.55, dy = 0.45, alt }) { // větší sklon než ve 4. třídě: hloubka musí být dobře vidět
  const v = voxel(cells, { u, grid, dx, dy }), m = 14;
  const W = Math.ceil(v.w + 2 * m), H = Math.ceil(v.h + 2 * m);
  write(name, W, H, `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n` + place(v, m + v.origin[0], m + v.origin[1]), alt);
  return { w: W, h: H };
}
const key = (c) => c.slice(0, 3).join(",");
const exposed = (cells) => { const s = new Set(cells.map(key)); return cells.map(([i, j, k]) => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].filter(([a, b, c]) => !s.has(`${i + a},${j + b},${k + c}`)).length); };
const nahoru = (cells) => cells.every(([i, j, k]) => k === 0 || cells.some(([a, b, c]) => a === i && b === j && c === k - 1)); // nic nevisí ve vzduchu

// stavba ze schodů: sloupce (v řadě i) o výškách h, hloubka d
const schody = (h, d) => h.flatMap((v, i) => box(i, i + 1, 0, d, 0, v));
const S_SCHODY = schody([1, 2, 3], 1);                                // 02: 6
const S_KVADR = box(0, 3, 0, 2, 0, 2);                                // 03: 3×2×2
const S_STAVBA = [[1], [2], [4]].flatMap(([h], j) => box(0, 2, j, j + 1, 0, h));  // 05: tři řady za sebou (výšky 1, 2, 4), široké 2 → 14; ze všech stran dohledatelné
const S_DIRA = box(0, 3, 0, 3, 0, 3).filter(([i, , k]) => !(i === 1 && k === 1)); // 11: 3×3×3 bez vodorovného tunelu
const S_DOSTAVBA = schody([3, 2, 1], 3);                              // 12: schody v kvádru 3×3×3
const S_KRYCHLE = box(0, 3, 0, 3, 0, 3);                              // 14: 3×3×3
const dimSch = drawVoxel("tel-schody.svg", S_SCHODY, { alt: "Stavba ze 6 krychliček ve tvaru schodů: sloupce o výšce 1, 2 a 3 krychličky" });
const dimKv = drawVoxel("tel-kvader.svg", S_KVADR, { alt: "Kvádr složený z krychliček, široký 3, hluboký 2 a vysoký 2 krychličky" });
const dimSt = drawVoxel("tel-stavba.svg", S_STAVBA, { alt: "Stavba z krychliček: tři řady za sebou, každá je 2 krychličky široká; přední řada je 1, prostřední 2 a zadní 4 krychličky vysoká" });
const dimDi = drawVoxel("tel-diera.svg", S_DIRA, { u: 30, alt: "Krychle 3 × 3 × 3 z krychliček, ze které je vyjmutý vodorovný tunel uprostřed" });
const dimDo = drawVoxel("tel-doplnit.svg", S_DOSTAVBA, { alt: "Stavba ve tvaru schodů o výškách 3, 2 a 1 krychlička a hloubce 3 krychličky" });
const dimKr = drawVoxel("tel-krychle.svg", S_KRYCHLE, { u: 30, alt: "Velká krychle 3 × 3 × 3 slepená z 27 malých krychliček" });

// ── dílky a tělesa A–E v jednom obrázku (vlevo nahoře dílky, pod nimi tělesa s písmeny) ──
function drawSada(name, { pieces, figs, u = 17, perRow = 3, alt }) {
  const m = 14, gap = 26, dx = 0.55, dy = 0.45;
  const mk1 = (cells) => voxel(cells, { u, grid: true, dx, dy });
  const row = (items) => items.map((it) => ({ ...it, v: mk1(it.cells) }));
  const rows = [];
  const pRow = row(pieces); rows.push({ caption: pieces.length > 1 ? "dílky" : "dílek", items: pRow });
  for (let i = 0; i < figs.length; i += perRow) rows.push({ caption: i === 0 ? "tělesa" : null, items: row(figs.slice(i, i + perRow)) });
  let y = m, maxW = 0; const parts = [];
  for (const r of rows) {
    const h = Math.max(...r.items.map((it) => it.v.h)), top = y + (r.caption ? 18 : 0);
    if (r.caption) parts.push(text(m, y + 12, r.caption, { size: 12, weight: 800, fill: NAVY, anchor: "start" }));
    let x = m;
    for (const it of r.items) {
      parts.push(place(it.v, x + it.v.origin[0], top + (h - it.v.h) + it.v.origin[1]));
      parts.push(text(x + it.v.w / 2, top + h + 18, it.label, { size: 14, weight: 800, fill: NAVY }));
      x += it.v.w + gap;
    }
    maxW = Math.max(maxW, x - gap + m); y = top + h + 30;
  }
  const W = Math.ceil(maxW), H = Math.ceil(y - 6);
  write(name, W, H, `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n` + parts.join("\n"), alt);
  return { w: W, h: H };
}
// Útvary kreslíme v čelním pohledu (řádky shora dolů, hloubka jedna krychlička), aby byl tvar dílku ostrý a dobře čitelný.
const F = (rows) => rows.flatMap((row, r) => [...row].flatMap((ch, i) => (ch === "#" ? [[i, 0, rows.length - 1 - r]] : [])));
const I3 = F(["###"]), L3 = F(["##", "#."]), L4 = F(["###", "#.."]);
const FIG = {
  a_2x3: F(["###", "###"]), b_L4: F(["####", "#...", "#..."]), d_T: F(["###", ".#.", ".#.", ".#."]), e_hreben: F(["#.#.", "####"]),
  f_U: F(["#..#", "####"]), g_schod: F(["#..", "##.", "###"]), h_P: F(["##.", "###", ".#."]),
};
const FIG8 = {
  p: F(["####", "####"]), q: F(["###.", "####", "#..."]), s: F(["#.#.#", "#####"]), u: F(["###", "#.#", "###"]), x: F(["###.", "####", ".#.."]),
};
const lbl = (names) => (cells, i) => ({ cells, label: names[i] });
const ABCDE = "ABCDE".split("");
const SADA1 = { pieces: [{ cells: L3, label: "" }], figs: [F(["###"]), F(["#.", "##"]), F(["#", "#", "#"]), F(["##", ".#"])].map(lbl(ABCDE)) };
const SADA2 = { pieces: [{ cells: I3, label: "1" }, { cells: I3, label: "2" }], figs: [FIG.d_T, FIG.e_hreben, FIG.a_2x3, FIG.g_schod, FIG.b_L4].map(lbl(ABCDE)) };
const SADA3 = { pieces: [{ cells: L3, label: "1" }, { cells: L3, label: "2" }], figs: [FIG.h_P, FIG.d_T, FIG.f_U, FIG.g_schod, FIG.b_L4].map(lbl(ABCDE)) };
const SADA4 = { pieces: [{ cells: I3, label: "1" }, { cells: L3, label: "2" }], figs: [FIG.f_U, FIG.d_T, FIG.h_P, FIG.e_hreben, FIG.g_schod].map(lbl(ABCDE)) };
const SADA5 = { pieces: [{ cells: L4, label: "1" }, { cells: L4, label: "2" }], figs: [FIG8.q, FIG8.p, FIG8.s, FIG8.x, FIG8.u].map(lbl(ABCDE)) };
const dimSa1 = drawSada("tel-sada-1.svg", { ...SADA1, perRow: 4, u: 26, alt: "Dílek ze tří krychliček ve tvaru L a čtyři tělesa A až D" });
const dimSa2 = drawSada("tel-sada-2.svg", { ...SADA2, u: 21, alt: "Dva dílky, každý ze tří krychliček v řadě, a pět těles A až E ze šesti krychliček" });
const dimSa3 = drawSada("tel-sada-3.svg", { ...SADA3, u: 21, alt: "Dva dílky ve tvaru L ze tří krychliček a pět těles A až E ze šesti krychliček" });
const dimSa4 = drawSada("tel-sada-4.svg", { ...SADA4, u: 21, alt: "Dva různé dílky ze tří krychliček, jeden v řadě a jeden ve tvaru L, a pět těles A až E ze šesti krychliček" });
const dimSa5 = drawSada("tel-sada-5.svg", { ...SADA5, u: 19, alt: "Dva stejné dílky ze čtyř krychliček ve tvaru L a pět plochých těles A až E z osmi krychliček" });

// ── čtvercová mřížka: půdorys s čísly a souměrnost ──
const CELL = 30;
function gridFig(name, { rows, cols, shaded = new Set(), numbers = null, axisV = null, axisH = null, alt }) {
  const m = 16, W = cols * CELL + 2 * m, H = rows * CELL + 2 * m;
  let body = `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n`;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    body += `  <rect x="${m + c * CELL}" y="${m + r * CELL}" width="${CELL}" height="${CELL}" fill="${shaded.has(`${r},${c}`) ? FILL : "#ffffff"}" stroke="${numbers ? NAVY : GRID}" stroke-width="${numbers ? 1.8 : 1}"/>\n`;
    if (numbers) body += text(m + c * CELL + CELL / 2, m + r * CELL + CELL / 2 + 6, String(numbers[r][c]), { size: 17, weight: 800, fill: NAVY }) + "\n";
  }
  if (axisV !== null) body += line(m + axisV * CELL, m - 8, m + axisV * CELL, m + rows * CELL + 8, { stroke: NAVY, w: 2, dash: "7 5" }) + "\n" + text(m + axisV * CELL + 11, m - 2, "o", { size: 14, weight: 800, fill: NAVY }) + "\n";
  if (axisH !== null) body += line(m - 8, m + axisH * CELL, m + cols * CELL + 8, m + axisH * CELL, { stroke: NAVY, w: 2, dash: "7 5" }) + "\n" + text(m - 11, m + axisH * CELL - 5, "p", { size: 14, weight: 800, fill: NAVY }) + "\n";
  // vnější rámeček mřížky silněji
  body += `  <rect x="${m}" y="${m}" width="${cols * CELL}" height="${rows * CELL}" fill="none" stroke="${NAVY}" stroke-width="1.8"/>\n`;
  write(name, W, H, body, alt);
  return { w: W, h: H };
}
const setOf = (rows, c0 = 0, r0 = 0) => new Set(rows.flatMap((s, r) => [...s].flatMap((ch, c) => (ch === "#" ? [`${r + r0},${c + c0}`] : []))));
const P_SOUM1 = ["##.", "#..", "###", ".#."];                          // 04: vlevo od osy, 3 sloupce
const P_SOUM2 = ["....", "..##", ".###", "####", "...."];               // 09: vlevo od osy, 4 sloupce
const P_SOUM3 = ["..##", ".###", "##.."];                              // 15: levý horní čtvrtina 4 × 3
const PUDORYS = [[2, 1, 3], [1, 2, 1], [3, 1, 2]];
const dimS1 = gridFig("tel-soum-1.svg", { rows: 4, cols: 6, shaded: setOf(P_SOUM1), axisV: 3, alt: "Mřížka 6 × 4 čtverečků s osou souměrnosti uprostřed; vlevo od osy je vybarveno 7 čtverečků, vpravo nic" });
const dimS2 = gridFig("tel-soum-2.svg", { rows: 5, cols: 8, shaded: setOf(P_SOUM2), axisV: 4, alt: "Mřížka 8 × 5 čtverečků s osou souměrnosti uprostřed; vlevo od osy je vybarvený obrazec z 9 čtverečků, vpravo nic" });
const dimS3 = gridFig("tel-soum-3.svg", { rows: 6, cols: 8, shaded: setOf(P_SOUM3), axisV: 4, axisH: 3, alt: "Mřížka 8 × 6 čtverečků se dvěma osami souměrnosti; v levém horním čtverci jsou vybarvené čtverečky, jinde nic" });
const dimPu = gridFig("tel-pudorys.svg", { rows: 3, cols: 3, numbers: PUDORYS, alt: "Půdorys stavby z krychliček: v poli je číslo, které říká, z kolika krychliček je tam věž; čísla po řádcích 2 1 3, 1 2 1, 3 1 2" });

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_telesa", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const img = (url, dim, alt) => ({ image: { kind: "static", url: "/obrazky/p5/" + url, width: dim.w, height: dim.h, alt } });

const ex = [
  // ───────── L1 ─────────
  mk("P5_TEL_02", "p5_krychlicky", 1, "Stavba je postavená z krychliček. Z kolika krychliček se skládá?", "6", [
    "Stavba má tři sloupce vedle sebe: první z 1 krychličky, druhý ze 2 a třetí ze 3 krychliček.",
    "1 + 2 + 3 = 6 krychliček.",
  ], 60, img("tel-schody.svg", dimSch, "Stavba ze 6 krychliček ve tvaru schodů: sloupce o výšce 1, 2 a 3 krychličky")),
  mk("P5_TEL_03", "p5_kvadr", 1, "Kvádr je slepený z malých krychliček. Z kolika krychliček se skládá?", "12", [
    "Spodní vrstva má 3 · 2 = 6 krychliček (3 vedle sebe a 2 za sebou).",
    "Kvádr má dvě stejné vrstvy nad sebou: 2 · 6 = 12 krychliček.",
  ], 90, img("tel-kvader.svg", dimKv, "Kvádr složený z krychliček, široký 3, hluboký 2 a vysoký 2 krychličky")),
  mk("P5_TEL_04", "p5_soumernost", 1, "Obrazec vlevo od osy o doplň souměrně podle osy o. Kolik čtverečků je třeba vybarvit vpravo od osy?", "7", [
    "Souměrný obraz má stejný počet čtverečků jako původní obrazec.",
    "Vlevo jsou vybarvené čtverečky po řádcích 2 + 1 + 3 + 1 = 7, vpravo je tedy třeba vybarvit také 7 čtverečků.",
  ], 90, img("tel-soum-1.svg", dimS1, "Mřížka 6 × 4 čtverečků s osou souměrnosti uprostřed; vlevo od osy je vybarveno 7 čtverečků, vpravo nic")),
  // ───────── L2 ─────────
  mk("P5_TEL_05", "p5_krychlicky", 2, "Stavba je postavená z krychliček a žádná krychlička nevisí ve vzduchu. Z kolika krychliček se skládá?", "14", [
    "Stavba má tři řady za sebou a každá řada je 2 krychličky široká.",
    "Přední řada je vysoká 1 krychličku, prostřední 2 a zadní 4 krychličky: 2 · 1 + 2 · 2 + 2 · 4 = 2 + 4 + 8.",
    "Celkem 2 + 4 + 8 = 14 krychliček.",
  ], 150, img("tel-stavba.svg", dimSt, "Stavba z krychliček: tři řady za sebou, každá je 2 krychličky široká; přední řada je 1, prostřední 2 a zadní 4 krychličky vysoká")),
  mk("P5_TEL_06", "p5_pudorys", 2, "Stavbu z krychliček jsme nakreslili shora. Číslo v políčku říká, z kolika krychliček je na tomto místě věž. Kolik krychliček má celá stavba?", "16", [
    "Sečteme čísla v prvním řádku: 2 + 1 + 3 = 6, ve druhém: 1 + 2 + 1 = 4 a ve třetím: 3 + 1 + 2 = 6.",
    "Celá stavba má 6 + 4 + 6 = 16 krychliček.",
  ], 120, img("tel-pudorys.svg", dimPu, "Půdorys stavby z krychliček: čísla po řádcích 2 1 3, 1 2 1, 3 1 2")),
  mk("P5_TEL_09", "p5_soumernost", 2, "Obrazec vlevo od osy o doplníme souměrně podle osy o. Kolik čtverečků bude mít celý obrazec (původní i jeho souměrný obraz)?", "18", [
    "Původní obrazec vlevo má 2 + 3 + 4 = 9 čtverečků.",
    "Souměrný obraz vpravo má také 9 čtverečků. Celý obrazec má 9 + 9 = 18 čtverečků.",
  ], 120, img("tel-soum-2.svg", dimS2, "Mřížka 8 × 5 čtverečků s osou souměrnosti uprostřed; vlevo od osy je vybarvený obrazec z 9 čtverečků, vpravo nic")),
  mk("P5_TEL_10", "p5_kvadr", 2, "Kvádr má rozměry 4 cm, 3 cm a 2 cm. Kolik krychliček o hraně 1 cm se do něj vejde?", "24", [
    "Na dně kvádru je 4 · 3 = 12 krychliček.",
    "Kvádr je vysoký 2 cm, takže vrstvy jsou dvě: 2 · 12 = 24 krychliček.",
  ], 105),
  // ───────── L3 ─────────
  mk("P5_TEL_11", "p5_krychlicky", 3, "Velká krychle 3 × 3 × 3 byla slepená z malých krychliček. Potom z ní vyjmuli vodorovný tunel uprostřed, který vede skrz celou krychli. Kolik malých krychliček zbylo?", "24", [
    "Celá krychle měla 3 · 3 · 3 = 27 malých krychliček.",
    "Tunel vede ve středu skrz tři krychličky (je dlouhý jako krychle, tedy 3 krychličky).",
    "Zbylo 27 − 3 = 24 krychliček.",
  ], 150, img("tel-diera.svg", dimDi, "Krychle 3 × 3 × 3 z krychliček, ze které je vyjmutý vodorovný tunel uprostřed")),
  mk("P5_TEL_12", "p5_krychlicky", 3, "Stavba ve tvaru schodů má hloubku 3 krychličky. Kolik krychliček je třeba ještě přidat, aby vznikla krychle 3 × 3 × 3?", "9", [
    "Schody mají tři sloupce vysoké 3, 2 a 1 krychličku a každý je 3 krychličky hluboký: 3 · (3 + 2 + 1) = 18 krychliček.",
    "Krychle 3 × 3 × 3 má 27 krychliček, chybí tedy 27 − 18 = 9 krychliček.",
  ], 180, img("tel-doplnit.svg", dimDo, "Stavba ve tvaru schodů o výškách 3, 2 a 1 krychlička a hloubce 3 krychličky")),
  mk("P5_TEL_14", "p5_krychlicky", 3, "Velká krychle 3 × 3 × 3 je slepená z 27 malých krychliček. Celou ji z vnějšku obarvíme (i dno). Kolik malých krychliček má obarvené právě dvě stěny?", null, [
    "Dvě obarvené stěny mají jen krychličky uprostřed hran velké krychle (v rozích jsou tři obarvené stěny, uprostřed stěn jen jedna).",
    "Velká krychle má 12 hran a na každé hraně je jedna taková krychlička. Správně je C) 12.",
  ], 210, { ...img("tel-krychle.svg", dimKr, "Velká krychle 3 × 3 × 3 slepená z 27 malých krychliček"), moznosti: ["6", "8", "12", "24", "27"], spravna: 2 }),
  mk("P5_TEL_15", "p5_soumernost", 3, "Obrazec je souměrný podle obou os, osy o a p. Vybarveno je jen v levé horní části. Kolik čtverečků bude mít celý obrazec, až ho doplníme souměrně podle obou os?", "28", [
    "Ve vybarvené části (levý horní čtverec) je 2 + 3 + 2 = 7 čtverečků.",
    "Zrcadlením podle svislé osy dostaneme 2 · 7 = 14 čtverečků v horní půlce a zrcadlením podle vodorovné osy ještě jednou tolik.",
    "Celý obrazec má 4 · 7 = 28 čtverečků.",
  ], 210, img("tel-soum-3.svg", dimS3, "Mřížka 8 × 6 čtverečků se dvěma osami souměrnosti; v levém horním čtverci jsou vybarvené čtverečky, jinde nic")),
  // ── skládání z dílků (nové) ──
  mk("NEW_1", "p5_skladani", 1, "Dílek je slepený ze tří krychliček (viz obrázek). Dílek smíš libovolně otáčet. Kolik z těles A až D má stejný tvar jako dílek?", "2", [
    "Dílek má tvar písmene L: dvě krychličky vedle sebe a třetí je připojená k jedné z nich do pravého úhlu.",
    "Těleso B je tentýž dílek otočený o čtvrt otáčky a těleso D je dílek otočený o další čtvrt otáčky. Těleso A (tři v řadě) a těleso C (tři nad sebou) mají jiný tvar.",
    "Stejný tvar mají dvě tělesa, B a D.",
  ], 120, img("tel-sada-1.svg", dimSa1, "Dílek ze tří krychliček ve tvaru L a čtyři tělesa A až D")),
  mk("NEW_2", "p5_skladani", 2, "Máme dva stejné dílky, každý je ze tří krychliček v řadě (viz obrázek). Dílky smíš libovolně otáčet, ale nesmí se překrývat. Kolik z těles A až E se dá složit přesně z těchto dvou dílků?", "3", [
    "Každé těleso má 6 krychliček a dva dílky mají dohromady také 6 krychliček. Zkoušíme, jestli se těleso dá rozdělit na dvě řady po třech krychličkách.",
    "A) vodorovná řada tří krychliček a pod ní svislý sloupec tří: ano. B) hřeben: ne, nedají se v něm najít dvě rovné řady po třech krychličkách. C) obdélník 2 × 3: ano (dvě řady po třech). D) schody: ne. E) velké L: ano (svislý sloupec tří a vodorovná řada tří).",
    "Dá se složit 3 těles: A, C a E.",
  ], 210, img("tel-sada-2.svg", dimSa2, "Dva dílky z řady tří krychliček a pět těles A až E")),
  mk("NEW_3", "p5_skladani", 2, "Máme dva stejné dílky ve tvaru L, každý ze tří krychliček (viz obrázek). Dílky smíš libovolně otáčet, ale nesmí se překrývat. Kolik z těles A až E se dá složit přesně z těchto dvou dílků?", "2", [
    "Každé těleso má 6 krychliček. Zkoušíme, jestli se dá rozdělit na dva dílky ve tvaru L, každý ze tří krychliček.",
    "A) ano (dvě L do sebe zapadnou). B) tvar T s dlouhým sloupcem: ne. C) ano (dvě L tvoří písmeno U se dvěma sloupky). D) schody: ne. E) velké L: ne.",
    "Dá se složit 2 těles: A a C.",
  ], 210, img("tel-sada-3.svg", dimSa3, "Dva dílky ve tvaru L a pět těles A až E")),
  mk("NEW_4", "p5_skladani", 3, "Máme dva dílky z krychliček: dílek 1 je řada tří krychliček a dílek 2 je dílek ve tvaru L ze tří krychliček (viz obrázek). Dílky smíš libovolně otáčet, ale nesmí se překrývat. Které z těles A až E se dá složit přesně z těchto dvou dílků?", null, [
    "Každé těleso má 6 krychliček. Hledáme způsob, jak z něj vybrat jednu řadu tří krychliček a zbytek ve tvaru L.",
    "A) ne. B) ne. C) ne. D) ne. E) ano: spodní řada tří krychliček je dílek 1 a zbylé tři krychličky nahoře mají tvar L, tedy dílek 2.",
    "Z obou dílků se dá složit jen těleso E, správně je E).",
  ], 270, { ...img("tel-sada-4.svg", dimSa4, "Dva různé dílky ze tří krychliček a pět těles A až E"), moznosti: ["A", "B", "C", "D", "E"], spravna: 4 }),
  mk("NEW_5", "p5_skladani", 3, "Máme dva stejné dílky, každý je ze čtyř krychliček ve tvaru písmene L (viz obrázek). Dílky smíš libovolně otáčet, ale nesmí se překrývat. Kolik z těles A až E, každé z osmi krychliček, se dá složit přesně z těchto dvou dílků?", "3", [
    "Každé těleso má 8 krychliček a dva dílky mají dohromady také 8 krychliček. Hledáme, jestli se těleso dá rozdělit na dva dílky tvaru L ze čtyř krychliček.",
    "A) ne. B) obdélník 2 × 4: ano (dva dílky L složené k sobě). C) hřeben: ne. D) ano. E) rámeček 3 × 3 bez prostředku: ano.",
    "Dají se složit 3 tělesa: B, D a E.",
  ], 300, img("tel-sada-5.svg", dimSa5, "Dva dílky ve tvaru L ze čtyř krychliček a pět těles A až E z osmi krychliček")),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ── nezávislé ověření ──
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const cmp = (id, v) => ok(id, String(by[id].odpoved).replace(/\s/g, "") === String(v), `${by[id].odpoved} vs ${v}`);
const cnt = (rows) => rows.join("").split("#").length - 1;

cmp("P5_TEL_02", S_SCHODY.length); ok("02 nic nevisí", nahoru(S_SCHODY));
cmp("P5_TEL_03", S_KVADR.length);
cmp("P5_TEL_04", cnt(P_SOUM1));
cmp("P5_TEL_05", S_STAVBA.length); ok("05 nic nevisí", nahoru(S_STAVBA)); ok("05 součet řad", 2 * 1 + 2 * 2 + 2 * 4 === S_STAVBA.length);
cmp("P5_TEL_06", PUDORYS.flat().reduce((a, b) => a + b, 0));
cmp("P5_TEL_09", cnt(P_SOUM2) * 2);
ok("09 vlevo od osy", P_SOUM2.every((r) => r.length === 4)); ok("04 vlevo od osy", P_SOUM1.every((r) => r.length === 3)); ok("15 čtvrtina", P_SOUM3.every((r) => r.length === 4) && P_SOUM3.length === 3);
cmp("P5_TEL_10", 4 * 3 * 2);
cmp("P5_TEL_11", S_DIRA.length); ok("11 tunel skrz", 27 - S_DIRA.length === 3 && !S_DIRA.some(([i, , k]) => i === 1 && k === 1));
cmp("P5_TEL_12", 27 - S_DOSTAVBA.length); ok("12 schody 18", S_DOSTAVBA.length === 18 && nahoru(S_DOSTAVBA));
{ const e = exposed(S_KRYCHLE); const dvě = e.filter((x) => x === 2).length; ok("14 právě dvě stěny", dvě === 12 && by.P5_TEL_14.odpoved === "12"); ok("14 rohy a střed", e.filter((x) => x === 3).length === 8 && e.filter((x) => x === 1).length === 6); }
cmp("P5_TEL_15", cnt(P_SOUM3) * 4);

// skládání z dílků: odpovědi se počítají hrubou silou (všech 24 otočení, bez překrytí); obrázky musí být jednoznačné
{
  const count = (sada) => sada.figs.filter((f) => canBuild(f.cells, sada.pieces.map((p) => p.cells))).length;
  const which = (sada) => sada.figs.map((f, i) => (canBuild(f.cells, sada.pieces.map((p) => p.cells)) ? "ABCDE"[i] : null)).filter(Boolean);
  const sameAsPiece = SADA1.figs.filter((f) => sameShape(f.cells, SADA1.pieces[0].cells)).length;
  cmp("NEW_1", sameAsPiece);
  cmp("NEW_2", count(SADA2)); cmp("NEW_3", count(SADA3));
  const w4 = which(SADA4); ok("NEW_4 právě jedno těleso", w4.length === 1 && w4[0] === "ABCDE"[by.NEW_4.spravna], w4);
  cmp("NEW_5", count(SADA5));
  console.log("skládání: NEW_2", which(SADA2).join(""), "| NEW_3", which(SADA3).join(""), "| NEW_4", w4.join(""), "| NEW_5", which(SADA5).join(""), "| NEW_1 stejný tvar", SADA1.figs.map((f, i) => (sameShape(f.cells, SADA1.pieces[0].cells) ? "ABCDE"[i] : null)).filter(Boolean).join(""));
  for (const [n, sada] of Object.entries({ SADA1, SADA2, SADA3, SADA4, SADA5 })) {
    const total = sada.pieces.reduce((a, pc) => a + pc.cells.length, 0);
    sada.figs.forEach((f, i) => { ok(`${n} těleso ${"ABCDE"[i]} viditelné`, allVisible(f.cells)); ok(`${n} těleso ${"ABCDE"[i]} jednoznačné`, unambiguous(f.cells)); if (n !== "SADA1") ok(`${n} těleso ${"ABCDE"[i]} má ${total} krychliček`, f.cells.length === total, f.cells.length); });
  }
}
// pořadí podle obtížnosti a průběžné číslování
{ const order = [...ex].sort((a, b) => a.obtiznost - b.obtiznost); order.forEach((e, i) => { e.id = `P5_TEL_${String(i + 1).padStart(2, "0")}`; }); ex.splice(0, ex.length, ...order); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else { ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved); ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved)); }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
  if (e.image) ok(e.id + " soubor obrázku", fs.existsSync("public" + e.image.url));
}
ok("rozmístění A–E", new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size === 2);
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 16, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((fl) => JSON.parse(fs.readFileSync(`src/data/${fl}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; A–E ${ex.filter((e) => e.moznosti).length}; s obrázkem ${ex.filter((e) => e.image).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^P5_TEL_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Tělesa a souměrnost (16 úloh)` : "5. třída — Tělesa a souměrnost: stavby z krychliček, půdorys, skládání z dílků, kvádr, osová souměrnost (16 úloh: L1 ×4, L2 ×6, L3 ×6)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
