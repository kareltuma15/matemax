// 5. třída, okruh „Tělesa a souměrnost", druhá dávka (P5_TEL_17–31): obarvené krychličky, pohledy zepředu a zprava, dílky kvádru a nejmenší krychle, osy souměrnosti, odebrání čtverce.
// Styl podle úloh 6, 8, 11–13 oficiálních testů CERMAT pro 5. třídu 2022–2026 (vlastní tělesa, obrazce a čísla, nic se nekopíruje).
// Spuštění: node scripts/build-5-telesa2.mjs → nakreslí public/obrazky/p5/tel2-*.svg a doplní/přepíše P5_TEL_17–31 v src/data/nahled-batch.json (jiné dávky nechá).
// Obrázky se kreslí ze stejných dat (seznam krychliček, vzorek čtverečků), ze kterých se odpovědi nezávisle počítají (osy souměrnosti a odebrání čtverce hrubou silou).
import fs from "node:fs";
import { NAVY, text, line, makeWriter } from "./lib/svg.mjs";
import { voxel, place, box } from "./lib/voxel.mjs";
const N = await import("../src/lib/normalize.ts");

const { write } = makeWriter("p5");
const FILL = "#cfe3f7", GRID = "#c4cfdd";

// ── krychličky ──
function drawVoxel(name, cells, { u = 28, grid = true, dx = 0.55, dy = 0.45, alt }) {
  const v = voxel(cells, { u, grid, dx, dy }), m = 14;
  const W = Math.ceil(v.w + 2 * m), H = Math.ceil(v.h + 2 * m);
  write(name, W, H, `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n` + place(v, m + v.origin[0], m + v.origin[1]), alt);
  return { w: W, h: H };
}
const key = (c) => c.slice(0, 3).join(",");
/** Počet obarvených stěn každé krychličky: stěna, která nesousedí s jinou krychličkou, se obarví zvenku. */
const exposed = (cells) => { const s = new Set(cells.map(key)); return cells.map(([i, j, k]) => [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].filter(([a, b, c]) => !s.has(`${i + a},${j + b},${k + c}`)).length); };
const schody = (h, d) => h.flatMap((v, i) => box(i, i + 1, 0, d, 0, v));
// útvary kreslíme v čelním pohledu (řádky shora dolů, hloubka jedna krychlička)
const F = (rows) => rows.flatMap((row, r) => [...row].flatMap((ch, i) => (ch === "#" ? [[i, 0, rows.length - 1 - r]] : [])));

const S_KVADR = box(0, 4, 0, 2, 0, 2);                      // 4 × 2 × 2
const S_KRYCHLE2 = box(0, 2, 0, 2, 0, 2);                   // 2 × 2 × 2
const S_SCHODY = schody([1, 2, 3, 4], 2);                   // schody výšek 1–4, hloubka 2
const S_L = F(["#", "#", "#", "##"]);                       // písmeno L z 5 krychliček
const S_T = F(["###", ".#.", ".#."]);                       // písmeno T z 5 krychliček
const S_KRYCHLE3 = box(0, 3, 0, 3, 0, 3);                   // 3 × 3 × 3 (stejná jako u úlohy 14 v 1. dávce)
const S_KRYCHLE4 = box(0, 4, 0, 4, 0, 4);                   // 4 × 4 × 4
const dimKv = drawVoxel("tel2-kvader.svg", S_KVADR, { alt: "Kvádr z krychliček: čtyři krychličky na šířku, dvě do hloubky a dvě na výšku" });
const dimK2 = drawVoxel("tel2-krychle2.svg", S_KRYCHLE2, { u: 36, alt: "Krychle 2 × 2 × 2 slepená z osmi malých krychliček" });
const dimSch = drawVoxel("tel2-schody.svg", S_SCHODY, { u: 24, alt: "Stavba ve tvaru schodů: sloupce vysoké 1, 2, 3 a 4 krychličky, každý 2 krychličky hluboký" });
const dimL = drawVoxel("tel2-pismeno-l.svg", S_L, { u: 30, alt: "Písmeno L z pěti krychliček: sloupec čtyř krychliček a jedna krychlička vpravo dole" });
const dimT = drawVoxel("tel2-pismeno-t.svg", S_T, { u: 30, alt: "Písmeno T z pěti krychliček: vodorovná řada tří krychliček a pod prostřední dvě krychličky" });
const dimK3 = drawVoxel("tel2-krychle3.svg", S_KRYCHLE3, { u: 30, alt: "Velká krychle 3 × 3 × 3 slepená z 27 malých krychliček" });
const dimK4 = drawVoxel("tel2-krychle4.svg", S_KRYCHLE4, { u: 24, alt: "Velká krychle 4 × 4 × 4 slepená z 64 malých krychliček" });

// ── čtvercová síť: útvary ──
const CELL = 30;
const cellsOf = (rows) => rows.flatMap((s, r) => [...s].flatMap((ch, c) => (ch === "#" ? [[r, c]] : [])));
const setOfCells = (cs) => new Set(cs.map((c) => c.join(",")));
/** Osy souměrnosti útvaru: svislá, vodorovná a dvě šikmé (šikmé jen u čtvercové opsané mřížky). Vrací počet os. */
function axes(cs) {
  const r0 = Math.min(...cs.map((c) => c[0])), r1 = Math.max(...cs.map((c) => c[0])), c0 = Math.min(...cs.map((c) => c[1])), c1 = Math.max(...cs.map((c) => c[1]));
  const s = setOfCells(cs), h = r1 - r0, w = c1 - c0;
  const refl = {
    svisla: ([r, c]) => [r, c0 + c1 - c],
    vodorovna: ([r, c]) => [r0 + r1 - r, c],
    hlavni: ([r, c]) => [r0 + (c - c0), c0 + (r - r0)],
    vedlejsi: ([r, c]) => [r0 + (c1 - c), c0 + (r1 - r)],
  };
  const ok = (f) => cs.every((p) => s.has(f(p).join(",")));
  return { svisla: ok(refl.svisla), vodorovna: ok(refl.vodorovna), hlavni: h === w && ok(refl.hlavni), vedlejsi: h === w && ok(refl.vedlejsi) };
}
const axesCount = (cs) => Object.values(axes(cs)).filter(Boolean).length;
function gridShape(name, rows, { numbered = false, alt }) {
  const R = rows.length, C = Math.max(...rows.map((r) => r.length)), m = 14, W = C * CELL + 2 * m, H = R * CELL + 2 * m;
  let body = `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n`;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) body += `  <rect x="${m + c * CELL}" y="${m + r * CELL}" width="${CELL}" height="${CELL}" fill="${rows[r][c] === "#" ? FILL : "#ffffff"}" stroke="${GRID}" stroke-width="1"/>\n`;
  let n = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) if (rows[r][c] === "#") {
    n++;
    const X = m + c * CELL, Y = m + r * CELL;
    if (rows[r - 1]?.[c] !== "#") body += line(X, Y, X + CELL, Y, { w: 3 }) + "\n";
    if (rows[r + 1]?.[c] !== "#") body += line(X, Y + CELL, X + CELL, Y + CELL, { w: 3 }) + "\n";
    if (rows[r][c - 1] !== "#") body += line(X, Y, X, Y + CELL, { w: 3 }) + "\n";
    if (rows[r][c + 1] !== "#") body += line(X + CELL, Y, X + CELL, Y + CELL, { w: 3 }) + "\n";
    if (numbered) body += text(X + CELL / 2, Y + CELL / 2 + 6, String(n), { size: 16, weight: 800, fill: NAVY }) + "\n";
  }
  write(name, W, H, body, alt);
  return { w: W, h: H };
}
function gridShapes(name, shapes, alt) {
  const m = 14, gap = 30, cs = shapes.map((rows) => ({ rows, R: rows.length, C: Math.max(...rows.map((r) => r.length)) }));
  const H = Math.max(...cs.map((s) => s.R)) * CELL + 2 * m + 26;
  const W = cs.reduce((a, s) => a + s.C * CELL, 0) + gap * (cs.length - 1) + 2 * m;
  let body = `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n`, x = m;
  cs.forEach((s, k) => {
    for (let r = 0; r < s.R; r++) for (let c = 0; c < s.C; c++) body += `  <rect x="${x + c * CELL}" y="${m + r * CELL}" width="${CELL}" height="${CELL}" fill="${s.rows[r][c] === "#" ? FILL : "#ffffff"}" stroke="${GRID}" stroke-width="1"/>\n`;
    for (let r = 0; r < s.R; r++) for (let c = 0; c < s.C; c++) if (s.rows[r][c] === "#") {
      const X = x + c * CELL, Y = m + r * CELL;
      if (s.rows[r - 1]?.[c] !== "#") body += line(X, Y, X + CELL, Y, { w: 3 }) + "\n";
      if (s.rows[r + 1]?.[c] !== "#") body += line(X, Y + CELL, X + CELL, Y + CELL, { w: 3 }) + "\n";
      if (s.rows[r][c - 1] !== "#") body += line(X, Y, X, Y + CELL, { w: 3 }) + "\n";
      if (s.rows[r][c + 1] !== "#") body += line(X + CELL, Y, X + CELL, Y + CELL, { w: 3 }) + "\n";
    }
    body += text(x + (s.C * CELL) / 2, H - 8, `${k + 1}. útvar`, { size: 13, weight: 700, fill: NAVY }) + "\n";
    x += s.C * CELL + gap;
  });
  write(name, W, H, body, alt);
  return { w: W, h: H };
}
// ── pohledy zepředu a zprava: sloupce čtverečků ──
function drawViews(name, front, right, alt) {
  const s = 30, m = 14, gap = 44, maxH = Math.max(...front, ...right), H = maxH * s + 2 * m + 30;
  const W = (front.length + right.length) * s + gap + 2 * m;
  let body = `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n`, x = m;
  for (const [vals, label] of [[front, "zepředu"], [right, "zprava"]]) {
    vals.forEach((h, c) => { for (let r = 0; r < h; r++) body += `  <rect x="${x + c * s}" y="${m + (maxH - 1 - r) * s}" width="${s}" height="${s}" fill="${FILL}" stroke="${NAVY}" stroke-width="1.8"/>\n`; });
    body += text(x + (vals.length * s) / 2, H - 8, `pohled ${label}`, { size: 13, weight: 700, fill: NAVY }) + "\n";
    x += vals.length * s + gap;
  }
  write(name, W, H, body, alt);
  return { w: W, h: H };
}
// ── půdorys s čísly a šipkou „zepředu" ──
function drawPudorys(name, M, alt) {
  const R = M.length, C = M[0].length, m = 16, W = Math.max(C * CELL + 2 * m, 190), ox = (W - C * CELL) / 2, H = R * CELL + 2 * m + 34;
  let body = `  <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>\n`;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    body += `  <rect x="${ox + c * CELL}" y="${m + r * CELL}" width="${CELL}" height="${CELL}" fill="#ffffff" stroke="${NAVY}" stroke-width="1.8"/>\n`;
    body += text(ox + c * CELL + CELL / 2, m + r * CELL + CELL / 2 + 6, String(M[r][c]), { size: 17, weight: 800, fill: NAVY }) + "\n";
  }
  const cx = W / 2, y0 = m + R * CELL + 8;
  body += `  <polygon points="${cx},${y0} ${cx - 8},${y0 + 13} ${cx + 8},${y0 + 13}" fill="${NAVY}"/>\n` + text(cx, y0 + 29, "pozorovatel (zepředu)", { size: 12, weight: 700, fill: NAVY }) + "\n";
  write(name, W, H, body, alt);
  return { w: W, h: H };
}

// ── data ──
const FRONT = [3, 1, 2], RIGHT = [2, 3, 1];                    // pohled zepředu (zleva doprava) a zprava (zepředu dozadu)
const PUDORYS = [[2, 1, 3], [1, 3, 1], [2, 1, 2]];             // horní řádek je vzadu, dolní vpředu
const SHAPE_H = ["#.#", "###", "#.#"];                          // 2 osy (svislá a vodorovná)
const SHAPE_A = ["#.#", "###", "#.#"];
const SHAPE_B = ["##.", "##.", "#.#"];                          // žádná osa
const SHAPE_C = ["#..", "##.", "###"];                          // jedna šikmá osa
const SHAPE_ODEBRANI = [".#.#", "####", ".#.."];               // odebráním čtverce 2 vznikne souměrný útvar
const dimPohl = drawViews("tel2-pohledy.svg", FRONT, RIGHT, "Dva pohledy na stavbu z krychliček: zepředu sloupce vysoké 3, 1 a 2 krychličky, zprava (zepředu dozadu) sloupce vysoké 2, 3 a 1 krychlička");
const dimPud = drawPudorys("tel2-pudorys.svg", PUDORYS, "Půdorys stavby z krychliček: čísla po řádcích 2 1 3, 1 3 1, 2 1 2; pozorovatel stojí pod dolním řádkem");
const dimOsy = gridShape("tel2-osy.svg", SHAPE_H, { alt: "Vybarvený obrazec ve čtvercové síti 3 × 3: čtyři rohové čtverečky, prostřední řádek a prostřední sloupec" });
const dimTri = gridShapes("tel2-tri-utvary.svg", [SHAPE_A, SHAPE_B, SHAPE_C], "Tři útvary ve čtvercové síti 3 × 3: 1. útvar má čtyři rohy a kříž, 2. útvar je nesouměrný, 3. útvar je schodovitý trojúhelník");
const dimOdeb = gridShape("tel2-odebrani.svg", SHAPE_ODEBRANI, { numbered: true, alt: "Útvar ze sedmi očíslovaných čtverečků ve čtvercové síti 3 × 4: v horním řádku čísla 1 a 2, uprostřed čtyři čtverečky 3 až 6 v řadě a dole číslo 7" });

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_telesa", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const img = (url, dim, alt) => ({ image: { kind: "static", url: "/obrazky/p5/" + url, width: dim.w, height: dim.h, alt } });

const ex = [
  // ───────── L1 (úvod) ─────────
  mk("A1", "p5_kvadr", 1, "Kvádr je slepený z malých krychliček. Z kolika krychliček se skládá?", "16", [
    "Spodní vrstva má 4 · 2 = 8 krychliček (4 vedle sebe a 2 za sebou).",
    "Kvádr má dvě stejné vrstvy nad sebou: 2 · 8 = 16 krychliček.",
  ], 75, img("tel2-kvader.svg", dimKv, "Kvádr z krychliček: čtyři na šířku, dvě do hloubky a dvě na výšku")),
  mk("A2", "p5_krychlicky", 1, "Velkou krychli 2 × 2 × 2 slepenou z osmi malých krychliček celou zvenku obarvíme. Kolik malých krychliček má obarvené tři stěny?", "8", [
    "Každá malá krychlička je v rohu velké krychle a v rohu se setkávají tři stěny, které jsou vidět zvenku.",
    "Všech 8 malých krychliček má obarvené tři stěny.",
  ], 90, img("tel2-krychle2.svg", dimK2, "Krychle 2 × 2 × 2 slepená z osmi malých krychliček")),
  mk("A3", "p5_krychlicky", 1, "Stavba ve tvaru schodů je postavená z krychliček. Z kolika krychliček se skládá?", "20", [
    "Schody mají čtyři sloupce o výškách 1, 2, 3 a 4 krychličky: 1 + 2 + 3 + 4 = 10 krychliček v jedné řadě.",
    "Stavba je 2 krychličky hluboká, takže má 2 · 10 = 20 krychliček.",
  ], 105, img("tel2-schody.svg", dimSch, "Stavba ve tvaru schodů: sloupce vysoké 1, 2, 3 a 4 krychličky, každý 2 krychličky hluboký")),
  mk("A4", "p5_soumernost", 1, "Kolik os souměrnosti má čtverec?", "4", [
    "Čtverec se dá přeložit na sebe podle svislé a vodorovné osy, které vedou středy protilehlých stran.",
    "Dále podle obou úhlopříček. Dohromady má čtverec 4 osy souměrnosti.",
  ], 75),
  // ───────── L2 (přiblížení testu) ─────────
  mk("A5", "p5_krychlicky", 2, "Písmeno L slepené z pěti stejných bílých krychliček jsme celé zvenku obarvili modře (i zespodu). Potom se písmeno rozpadlo na jednotlivé krychličky. Původně slepené stěny zůstaly bílé. Kolik krychliček má právě 4 stěny modré?", "3", [
    "Krychlička má 6 stěn. Modré jsou ty stěny, které nesousedily s jinou krychličkou, takže modrých stěn je 6 minus počet sousedů.",
    "Obě krajní krychličky L mají jednoho souseda, tedy 5 modrých stěn. Zbylé tři krychličky (dvě uprostřed svislého sloupce a ta v rohu) mají dva sousedy, tedy 4 modré stěny.",
    "Právě 4 modré stěny mají 3 krychličky.",
  ], 180, img("tel2-pismeno-l.svg", dimL, "Písmeno L z pěti krychliček: sloupec čtyř krychliček a jedna krychlička vpravo dole")),
  mk("A6", "p5_krychlicky", 2, "Písmeno T slepené z pěti stejných bílých krychliček jsme celé zvenku obarvili modře (i zespodu). Potom se písmeno rozpadlo na jednotlivé krychličky. Původně slepené stěny zůstaly bílé. Kolik krychliček má stejný počet modrých a bílých stěn?", "1", [
    "Stejný počet modrých a bílých stěn znamená 3 modré a 3 bílé stěny, tedy krychlička má 3 sousedy.",
    "Tři sousedy má jen prostřední krychlička horní řady (vlevo, vpravo a dole). Ostatní mají jednoho nebo dva sousedy.",
    "Taková krychlička je jedna.",
  ], 180, img("tel2-pismeno-t.svg", dimT, "Písmeno T z pěti krychliček: vodorovná řada tří krychliček a pod prostřední dvě krychličky")),
  mk("A7", "p5_kvadr", 2, "Dílek stavebnice má tvar kvádru s rozměry 2 cm, 3 cm a 4 cm. Kolik dílků je třeba ke složení kvádru s rozměry 6 cm, 6 cm a 8 cm?", "12", [
    "Objem dílku je 2 · 3 · 4 = 24 cm³ a objem velkého kvádru je 6 · 6 · 8 = 288 cm³.",
    "Dílky se dají poskládat bez mezer: jednu stranu 6 cm vyplní dva dílky po 3 cm, druhou stranu 6 cm tři dílky po 2 cm a stranu 8 cm dva dílky po 4 cm. Potřeba je 2 · 3 · 2 = 12 dílků, stejně jako 288 : 24 = 12.",
  ], 210),
  mk("A8", "p5_soumernost", 2, "Kolik os souměrnosti má vybarvený obrazec ve čtvercové síti? Počítej i šikmé osy.", "2", [
    "Obrazec se dá přeložit na sebe podle svislé osy (vede prostředním sloupcem) a podle vodorovné osy (vede prostředním řádkem).",
    "Podle šikmých os (úhlopříček) se na sebe nepřeloží. Obrazec má 2 osy souměrnosti.",
  ], 150, img("tel2-osy.svg", dimOsy, "Vybarvený obrazec ve čtvercové síti 3 × 3: čtyři rohové čtverečky, prostřední řádek a prostřední sloupec")),
  mk("A9", "p5_soumernost", 2, "Ve čtvercové síti jsou zakresleny tři útvary. Kolik z nich je osově souměrných? Osa může být i šikmá.", "2", [
    "1. útvar: svislá i vodorovná osa vede prostředkem, je souměrný. 2. útvar: nepřeloží se na sebe podle žádné osy, souměrný není.",
    "3. útvar je schodovitý trojúhelník a přeloží se na sebe podle šikmé osy vedoucí z levého dolního do pravého horního rohu.",
    "Osově souměrné jsou 2 útvary (1. a 3.).",
  ], 180, img("tel2-tri-utvary.svg", dimTri, "Tři útvary ve čtvercové síti 3 × 3: 1. útvar má čtyři rohy a kříž, 2. útvar je nesouměrný, 3. útvar je schodovitý trojúhelník")),
  mk("A10", "p5_krychlicky", 2, "Velká krychle 3 × 3 × 3 je slepená z 27 malých krychliček. Celou ji z vnějšku obarvíme (i dno). Kolik malých krychliček nemá obarvenou žádnou stěnu?", null, [
    "Žádnou stěnu nemá obarvenou jen krychlička, která není vidět zvenku, tedy ta uprostřed celé velké krychle.",
    "Taková krychlička je jedna. Správně je A).",
  ], 150, { ...img("tel2-krychle3.svg", dimK3, "Velká krychle 3 × 3 × 3 slepená z 27 malých krychliček"), moznosti: ["1", "6", "8", "12", "27"], spravna: 0 }),
  // ───────── L3 (úroveň testu) ─────────
  mk("A11", "p5_krychlicky", 3, "Ze stejných krychliček se lepí stavba podle návodu. Návod ukazuje pohled zepředu a pohled zprava. Podle téhož návodu se dá stavba slepit z různého počtu krychliček (některé krychličky lze vynechat). Kolik krychliček má největší možná stavba?", "14", [
    "Pohled zepředu říká, jak vysoké jsou 3 sloupce zleva doprava (3, 1, 2). Pohled zprava říká, jak vysoké jsou 3 řady zepředu dozadu (2, 3, 1).",
    "Na každém místě stavby smí být nejvýš tolik krychliček, kolik dovolují oba pohledy, tedy menší z obou čísel. Řada 1: 2, 1, 2 (součet 5), řada 2: 3, 1, 2 (6), řada 3: 1, 1, 1 (3).",
    "Největší stavba má 5 + 6 + 3 = 14 krychliček.",
  ], 300, img("tel2-pohledy.svg", dimPohl, "Dva pohledy na stavbu z krychliček: zepředu sloupce vysoké 3, 1 a 2, zprava sloupce vysoké 2, 3 a 1")),
  mk("A12", "p5_soumernost", 3, "Útvar ze sedmi čtverečků je ve čtvercové síti, čtverečky jsou očíslované. Odebráním jediného čtverečku vznikne útvar, který je osově souměrný. Kterého čtverečku (číslo) se to týká?", "2", [
    "Zkoušíme odebírat čtverečky po jednom. Útvar bez čtverečku 2 má řádky „.#..“, „####“ a „.#..“ a je souměrný podle vodorovné osy, která vede prostředním řádkem.",
    "Po odebrání kteréhokoli jiného čtverečku souměrný útvar nevznikne.",
    "Je to čtvereček číslo 2.",
  ], 330, img("tel2-odebrani.svg", dimOdeb, "Útvar ze sedmi očíslovaných čtverečků ve čtvercové síti")),
  mk("A13", "p5_kvadr", 3, "Dílek stavebnice má tvar kvádru s rozměry 2 cm, 4 cm a 6 cm. Kolik dílků je třeba ke složení nejmenší možné krychle?", "36", [
    "Hrana krychle musí jít složit z hran dílků, takže se musí dát zapsat pomocí 2 cm, 4 cm i 6 cm. Nejmenší číslo dělitelné 2, 4 i 6 je 12, hrana krychle je 12 cm.",
    "Objem krychle je 12 · 12 · 12 = 1728 cm³ a objem dílku 2 · 4 · 6 = 48 cm³.",
    "Potřeba je 1728 : 48 = 36 dílků.",
  ], 300),
  mk("A14", "p5_krychlicky", 3, "Velká krychle 4 × 4 × 4 je slepená z 64 malých krychliček. Celou ji z vnějšku obarvíme (i dno). Kolik malých krychliček má obarvenou právě jednu stěnu?", null, [
    "Právě jednu stěnu mají krychličky uprostřed stěn velké krychle (ne na hranách a ne v rozích). Na každé stěně velké krychle je takových krychliček 2 · 2 = 4.",
    "Velká krychle má 6 stěn, takže jich je 6 · 4 = 24. Správně je C).",
  ], 270, { ...img("tel2-krychle4.svg", dimK4, "Velká krychle 4 × 4 × 4 slepená z 64 malých krychliček"), moznosti: ["12", "18", "24", "30", "36"], spravna: 2 }),
  mk("A15", "p5_pudorys", 3, "Stavbu z krychliček jsme nakreslili shora. Číslo v políčku říká, z kolika krychliček je na tomto místě věž. Pozorovatel stojí pod dolním řádkem a dívá se na stavbu zepředu. Z kolika čtverečků se skládá pohled na stavbu zepředu?", "8", [
    "Při pohledu zepředu vidíme každý sloupec stavby jen tak vysoký, jak je v něm nejvyšší věž (nižší věže vzadu zakryje vyšší věž).",
    "Nejvyšší věže ve sloupcích zleva doprava jsou 2, 3 a 3. Pohled zepředu tvoří 2 + 3 + 3 = 8 čtverečků.",
  ], 240, img("tel2-pudorys.svg", dimPud, "Půdorys stavby z krychliček: čísla po řádcích 2 1 3, 1 3 1, 2 1 2; pozorovatel stojí pod dolním řádkem")),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ── nezávislé ověření ──
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const cmp = (id, v) => ok(id, String(by[id].odpoved).replace(/\s/g, "") === String(v), `${by[id].odpoved} vs ${v}`);

cmp("A1", S_KVADR.length);
cmp("A2", exposed(S_KRYCHLE2).filter((x) => x === 3).length);
cmp("A3", S_SCHODY.length); ok("A3 počet", S_SCHODY.length === 2 * (1 + 2 + 3 + 4));
{ const sq = cellsOf(["##", "##"]); const a = axes(sq); cmp("A4", Object.values(a).filter(Boolean).length); }
{ const e = exposed(S_L); ok("A5 počet krychliček", S_L.length === 5); cmp("A5", e.filter((x) => x === 4).length); }
{ const e = exposed(S_T); ok("A6 počet krychliček", S_T.length === 5); cmp("A6", e.filter((x) => x === 3).length); ok("A6 stejný počet", e.every((x) => x + (6 - x) === 6)); }
{ // dílky: nejdřív objem, pak existence skladby (některé přiřazení rozměrů dílku do rozměrů kvádru, vše dělitelné)
  const perm = (a) => (a.length < 2 ? [a] : a.flatMap((x, i) => perm([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])));
  const fits = (piece, big) => perm(piece).some((p) => big.every((b, i) => b % p[i] === 0));
  const piece7 = [2, 3, 4], big7 = [6, 6, 8];
  ok("A7 skladba existuje", fits(piece7, big7)); cmp("A7", (big7[0] * big7[1] * big7[2]) / (piece7[0] * piece7[1] * piece7[2]));
  const piece13 = [2, 4, 6]; let e = 1; while (!(e ** 3 % (piece13[0] * piece13[1] * piece13[2]) === 0 && fits(piece13, [e, e, e]))) e++;
  ok("A13 nejmenší hrana", e === 12, e); cmp("A13", (e ** 3) / (piece13[0] * piece13[1] * piece13[2]));
}
{ const a = axes(cellsOf(SHAPE_H)); ok("A8 osy", a.svisla && a.vodorovna && !a.hlavni && !a.vedlejsi); cmp("A8", axesCount(cellsOf(SHAPE_H))); }
{ const cnt = [SHAPE_A, SHAPE_B, SHAPE_C].map((r) => axesCount(cellsOf(r))); ok("A9 osy útvarů", cnt[0] === 2 && cnt[1] === 0 && cnt[2] === 1, cnt); cmp("A9", cnt.filter((c) => c > 0).length); }
{ const e = exposed(S_KRYCHLE3), none = e.filter((x) => x === 0).length, o = by.A10; ok("A10", none === 1 && o.moznosti[o.spravna] === String(none) && o.moznosti.filter((m) => Number(m) === none).length === 1); }
{ // pohledy: největší stavba = součet min(zepředu[x], zprava[y]); musí dávat přesně stejné pohledy
  let s = 0; const h = FRONT.map((f) => RIGHT.map((r) => Math.min(f, r)));
  h.forEach((col) => col.forEach((v) => { s += v; }));
  ok("A11 pohled zepředu", FRONT.every((f, x) => Math.max(...h[x]) === f)); ok("A11 pohled zprava", RIGHT.every((r, y) => Math.max(...h.map((c) => c[y])) === r)); cmp("A11", s);
}
{ // odebrání čtverce: právě jedno číslo dává souměrný útvar
  const cs = cellsOf(SHAPE_ODEBRANI), good = [];
  cs.forEach((_, i) => { const rest = cs.filter((_, j) => j !== i); if (axesCount(rest) > 0) good.push(i + 1); });
  ok("A12 právě jedno řešení", good.length === 1 && String(good[0]) === by.A12.odpoved, good); ok("A12 původně nesouměrný", axesCount(cs) === 0);
}
{ const e = exposed(S_KRYCHLE4), one = e.filter((x) => x === 1).length, o = by.A14; ok("A14", one === 24 && o.moznosti[o.spravna] === String(one) && o.moznosti.filter((m) => Number(m) === one).length === 1, one); }
{ const colMax = PUDORYS[0].map((_, c) => Math.max(...PUDORYS.map((r) => r[c]))); cmp("A15", colMax.reduce((a, b) => a + b, 0)); }

// pořadí podle obtížnosti a průběžné číslování (navazuje na P5_TEL_01–16)
{ const order = [...ex].sort((a, b) => a.obtiznost - b.obtiznost); order.forEach((e, i) => { e.id = `P5_TEL_${String(i + 17).padStart(2, "0")}`; }); ex.splice(0, ex.length, ...order); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else { ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved); ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved)); }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\.|přesněji/i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
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
const nazev = others.length ? `${prev.nazev} + 5. třída: Tělesa a souměrnost, druhá dávka (15 úloh)` : "5. třída — Tělesa a souměrnost, druhá dávka: obarvené krychličky, pohledy, dílky kvádru, osy souměrnosti, odebrání čtverce (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
