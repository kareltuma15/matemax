// 5. třída, okruh „Obvod a obsah", druhá dávka (P5_OBS_16–30): obvod a obsah složených obrazců, rozdíly obvodů, souvislosti stran, mřížka, řada obrazců.
// Styl podle úloh 5, 6 a 8 oficiálních testů CERMAT pro 5. třídu (2022–2026): složený obrazec ze čtverců / trojúhelníků / obdélníků, „obvody se liší o …“,
// vlastní čísla a obrazce, nic se nekopíruje. L1 = úvod, L2 = přiblížení, L3 = úroveň testu (úvaha o souvislosti stran).
// Spuštění: node scripts/build-5-obsah2.mjs → nakreslí public/obrazky/p5/obs2-*.svg a doplní/přepíše P5_OBS_16–30 v src/data/nahled-batch.json (jiné dávky nechá).
// Obrázky se kreslí ze souřadnic, ze kterých se obvod a obsah nezávisle přepočítají (vzdálenosti vrcholů, Gaussův vzorec, hrubá síla).
import fs from "node:fs";
import { NAVY, BLUE, text, line, makeWriter } from "./lib/svg.mjs";
const N = await import("../src/lib/normalize.ts");

const { write } = makeWriter("p5");
const FILL = "#cfe3f7";
const FILL2 = "#f6d3cc";
const f = (n) => Math.round(n * 100) / 100;
const poly = (pts, o = {}) => `  <polygon points="${pts.map(([x, y]) => `${f(x)},${f(y)}`).join(" ")}" fill="${o.fill ?? "#ffffff"}" stroke="${o.stroke ?? NAVY}" stroke-width="${o.w ?? 2.5}" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>\n`;
const rect = (x, y, w, h, o = {}) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o);
const bg = (w, h) => `  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>\n`;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const perimeterOf = (pts) => pts.reduce((s, p, i) => s + dist(p, pts[(i + 1) % pts.length]), 0);
const shoelace = (pts) => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const eq = (a, b) => Math.abs(a - b) < 1e-9;

// ── data obrázků (v cm; kreslí se v měřítku s koeficientem k) ──
const DOM = { a: 8 };                         // úloha 20: domeček = čtverec o straně 8 cm + rovnostranný trojúhelník
const AB = { a: 9 };                          // úloha 27: A = čtverec, B = domeček se stejnou stranou
const KRIZ = { sq: 4, w: 9 };                 // úloha 21: čtverec 4 cm + dva obdélníky 4 × 9 cm po stranách
const SKL = { velky: 6, maly: 3 };            // úloha 25: velký čtverec a dva malé nad sebou
const ROMB = { a: 6 };                        // úloha 29: čtverec o straně 6 cm a čtverec s vrcholy ve středech stran
const T_ROWS = ["#####", ".###.", "..#.."];   // úloha 17: obrazec ze čtverečků (obrácená pyramida)
const RADA = [1, 2, 3];                       // úloha 30: počet čtverečků v prvních třech obrazcích

const houseVerts = (a, k = 1, ox = 0, oy = 0) => {
  const h = (Math.sqrt(3) / 2) * a;
  return [[0, h], [0, h + a], [a, h + a], [a, h], [a / 2, 0]].map(([x, y]) => [ox + x * k, oy + y * k]);
};

{ // obs2-domecek.svg
  const k = 12, m = 14, a = DOM.a, h = (Math.sqrt(3) / 2) * a, w = a * k + 2 * m, H = (h + a) * k + 2 * m;
  let b = bg(w, H);
  b += poly(houseVerts(a, k, m, m), { fill: FILL });
  b += line(m, m + h * k, m + a * k, m + h * k, { w: 1.5, dash: "5 4" }) + "\n";
  write("obs2-domecek.svg", w, H, b.trimEnd(), "Domeček: čtverec, na jehož horní straně stojí rovnostranný trojúhelník");
}
{ // obs2-ab.svg
  const k = 11, m = 14, a = AB.a, h = (Math.sqrt(3) / 2) * a, gap = 40, w = 2 * a * k + gap + 2 * m, H = (h + a) * k + 2 * m + 20;
  let b = bg(w, H);
  const y0 = m + h * k;
  b += rect(m, y0, a * k, a * k, { fill: FILL });
  b += poly(houseVerts(a, k, m + a * k + gap, m), { fill: FILL });
  b += line(m + a * k + gap, y0, m + 2 * a * k + gap, y0, { w: 1.5, dash: "5 4" }) + "\n";
  b += text(m + (a * k) / 2, H - 6, "A", { size: 15, fill: NAVY }) + "\n";
  b += text(m + a * k + gap + (a * k) / 2, H - 6, "B", { size: 15, fill: NAVY }) + "\n";
  write("obs2-ab.svg", w, H, b.trimEnd(), "Útvar A je čtverec, útvar B je čtverec s rovnostranným trojúhelníkem na horní straně; oba mají stejnou stranu čtverce");
}
{ // obs2-kriz.svg
  const k = 10, m = 14, { sq, w: ww } = KRIZ, W = (2 * ww + sq) * k + 2 * m, H = sq * k + 2 * m + 18;
  let b = bg(W, H);
  b += rect(m, m, ww * k, sq * k, { fill: FILL2 });
  b += rect(m + ww * k, m, sq * k, sq * k, { fill: FILL });
  b += rect(m + (ww + sq) * k, m, ww * k, sq * k, { fill: FILL2 });
  b += text(m + (ww + sq / 2) * k, m + (sq * k) / 2 + 5, `${sq} cm`, { size: 14, fill: NAVY }) + "\n";
  write("obs2-kriz.svg", W, H, b.trimEnd(), `Obrazec: uprostřed čtverec o straně ${sq} cm, po jeho dvou protilehlých stranách přiléhají dva stejné obdélníky`);
}
{ // obs2-skladani.svg
  const k = 14, m = 14, { velky, maly } = SKL, W = (velky + maly) * k + 2 * m, H = velky * k + 2 * m;
  let b = bg(W, H);
  b += rect(m, m, velky * k, velky * k, { fill: FILL });
  b += rect(m + velky * k, m, maly * k, maly * k, { fill: FILL2 });
  b += rect(m + velky * k, m + maly * k, maly * k, maly * k, { fill: FILL2 });
  b += text(m + (velky * k) / 2, m + (velky * k) / 2 + 5, `${velky} cm`, { size: 14, fill: NAVY }) + "\n";
  b += text(m + (velky + maly / 2) * k, m + (maly * k) / 2 + 5, `${maly} cm`, { size: 13, fill: NAVY }) + "\n";
  b += text(m + (velky + maly / 2) * k, m + (maly * 1.5) * k + 5, `${maly} cm`, { size: 13, fill: NAVY }) + "\n";
  write("obs2-skladani.svg", W, H, b.trimEnd(), `Obdélník složený z velkého čtverce o straně ${velky} cm a dvou malých čtverců o straně ${maly} cm nad sebou`);
}
{ // obs2-ctverec-ve-ctverci.svg
  const k = 28, m = 14, a = ROMB.a, W = a * k + 2 * m + 40, H = a * k + 2 * m;
  let b = bg(W, H);
  b += rect(m, m, a * k, a * k, { fill: "#ffffff" });
  b += poly([[a / 2, 0], [a, a / 2], [a / 2, a], [0, a / 2]].map(([x, y]) => [m + x * k, m + y * k]), { fill: FILL });
  for (const [x, y] of [[a / 2, 0], [a, a / 2], [a / 2, a], [0, a / 2]]) b += `  <circle cx="${f(m + x * k)}" cy="${f(m + y * k)}" r="4" fill="${NAVY}"/>\n`;
  b += text(m + a * k + 8, m + (a * k) / 2 + 5, `${a} cm`, { size: 14, fill: NAVY, anchor: "start" }) + "\n";
  b += line(m + a * k + 4, m, m + a * k + 4, m + a * k, { w: 1.5 }) + "\n";
  write("obs2-ctverec-ve-ctverci.svg", W, H, b.trimEnd(), `Čtverec o straně ${a} cm; vrcholy tmavého čtverce uvnitř leží ve středech stran velkého čtverce`);
}
const rowsCells = (rows) => rows.flatMap((r, y) => [...r].flatMap((c, x) => (c === "#" ? [[x, y]] : [])));
const rowsHas = (rows, x, y) => rows[y]?.[x] === "#";
const rowsPerim = (rows) => rowsCells(rows).reduce((s, [x, y]) => s + [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !rowsHas(rows, x + dx, y + dy)).length, 0);
{ // obs2-tecko.svg
  const c = 30, m = 14, W = T_ROWS[0].length, H = T_ROWS.length, w = W * c + 2 * m, h = H * c + 2 * m;
  let b = bg(w, h);
  for (const [x, y] of rowsCells(T_ROWS)) b += `  <rect x="${m + x * c}" y="${m + y * c}" width="${c}" height="${c}" fill="${FILL}" stroke="#8fb0d3" stroke-width="1"/>\n`;
  for (const [x, y] of rowsCells(T_ROWS)) {
    const X = m + x * c, Y = m + y * c;
    if (!rowsHas(T_ROWS, x, y - 1)) b += line(X, Y, X + c, Y, { w: 3 }) + "\n";
    if (!rowsHas(T_ROWS, x, y + 1)) b += line(X, Y + c, X + c, Y + c, { w: 3 }) + "\n";
    if (!rowsHas(T_ROWS, x - 1, y)) b += line(X, Y, X, Y + c, { w: 3 }) + "\n";
    if (!rowsHas(T_ROWS, x + 1, y)) b += line(X + c, Y, X + c, Y + c, { w: 3 }) + "\n";
  }
  write("obs2-tecko.svg", w, h, b.trimEnd(), `Obrazec ze ${rowsCells(T_ROWS).length} stejných čtverečků ve tvaru obrácené pyramidy`);
}
{ // obs2-rada.svg
  const c = 26, m = 14, gap = 34, n = RADA.length, mx = Math.max(...RADA);
  const w = RADA.reduce((s, r) => s + r * c, 0) + (n - 1) * gap + 2 * m, h = c + 2 * m + 22;
  let b = bg(w, h), x = m;
  RADA.forEach((r, i) => {
    for (let j = 0; j < r; j++) b += `  <rect x="${x + j * c}" y="${m}" width="${c}" height="${c}" fill="${FILL}" stroke="${NAVY}" stroke-width="2"/>\n`;
    b += text(x + (r * c) / 2, m + c + 18, `${i + 1}. obrazec`, { size: 12, fill: NAVY }) + "\n";
    x += r * c + gap;
  });
  write("obs2-rada.svg", w, h, b.trimEnd(), `První tři obrazce řady: ${RADA.join(", ")} čtverečky vedle sebe`);
}

const fig = (url, w, h, alt) => ({ image: { kind: "static", url, width: w, height: h, alt } });
const sz = (name) => { const s = fs.readFileSync(`public/obrazky/p5/${name}`, "utf8"); return [Number(/width="(\d+(?:\.\d+)?)"/.exec(s)[1]), Number(/height="(\d+(?:\.\d+)?)"/.exec(s)[1])]; };
const FIGS = {
  domecek: ["obs2-domecek.svg", "Domeček: čtverec, na jehož horní straně stojí rovnostranný trojúhelník"],
  ab: ["obs2-ab.svg", "Útvar A je čtverec, útvar B je čtverec s rovnostranným trojúhelníkem na horní straně"],
  kriz: ["obs2-kriz.svg", `Čtverec o straně ${KRIZ.sq} cm se dvěma stejnými obdélníky po stranách`],
  skladani: ["obs2-skladani.svg", `Velký čtverec o straně ${SKL.velky} cm a dva malé čtverce o straně ${SKL.maly} cm nad sebou`],
  ctverec: ["obs2-ctverec-ve-ctverci.svg", `Čtverec o straně ${ROMB.a} cm s tmavým čtvercem, jehož vrcholy leží ve středech stran`],
  tecko: ["obs2-tecko.svg", `Obrazec ve tvaru obrácené pyramidy ze ${rowsCells(T_ROWS).length} čtverečků`],
  rada: ["obs2-rada.svg", `První tři obrazce řady: ${RADA.join(", ")} čtverečky vedle sebe`],
};
const im = (key) => { const [file, alt] = FIGS[key]; const [w, h] = sz(file); return fig(`/obrazky/p5/${file}`, w, h, alt); };

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_obsah", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});

const ex = [
  // ───────── L1 (úvod) ─────────
  mk("P5_OBS_16", "p5_obvod", 1, "Obvod obdélníku je 26 cm. Jedna jeho strana měří 8 cm. Kolik centimetrů měří druhá strana?", "5", [
    "Obvod obdélníku jsou dvě délky a dvě šířky, takže součet dvou sousedních stran je 26 : 2 = 13 cm.",
    "Druhá strana měří 13 − 8 = 5 cm. Zkouška: 2 · (8 + 5) = 26.",
  ], 90),
  mk("P5_OBS_17", "p5_obsah", 1, "Každý čtvereček má stranu 1 cm. Jaký je obsah vybarveného obrazce v cm²?", "9", [
    "Obsah obrazce ze čtverečků o straně 1 cm spočítáme tak, že čtverečky spočítáme: každý má obsah 1 cm².",
    "V horní řadě je 5 čtverečků, v prostřední 3 a v dolní 1, dohromady 5 + 3 + 1 = 9 čtverečků, tedy 9 cm².",
  ], 60, im("tecko")),
  mk("P5_OBS_18", "p5_obvod", 1, "Zahrada tvaru čtverce má obvod 36 m. Kolik metrů měří její strana?", "9", [
    "Čtverec má čtyři stejně dlouhé strany, takže jedna strana je 36 : 4 = 9 m.",
    "Zkouška: 4 · 9 = 36.",
  ], 60),
  mk("P5_OBS_19", "p5_obvod", 1, "Rovnostranný trojúhelník má obvod 27 cm. Kolik centimetrů měří jedna jeho strana?", "9", [
    "Rovnostranný trojúhelník má tři stejně dlouhé strany.",
    "Jedna strana měří 27 : 3 = 9 cm.",
  ], 60),
  // ───────── L2 ─────────
  mk("P5_OBS_20", "p5_obvod", 2, "Domeček na obrázku se skládá ze čtverce a rovnostranného trojúhelníku, které mají společnou jednu stranu. Obvod čtverce je 32 cm. Jaký je obvod domečku v centimetrech?", String(5 * 8), [
    "Strana čtverce je 32 : 4 = 8 cm. Trojúhelník je rovnostranný a má stejnou stranu 8 cm.",
    "Obvod domečku tvoří tři strany čtverce a dvě strany trojúhelníku (společná strana je uvnitř a do obvodu se nepočítá).",
    "5 · 8 = 40 cm.",
  ], 150, im("domecek")),
  mk("P5_OBS_21", "p5_obvod", 2, "Obrazec se skládá ze čtverce o straně 4 cm a dvou stejných obdélníků, které přiléhají k protilehlým stranám čtverce. Obvod celého obrazce je 52 cm. Jaký je obvod jednoho obdélníku v centimetrech?", "26", [
    "Celý obrazec je velký obdélník s kratší stranou 4 cm. Jeho obvod je 52 cm, takže součet dvou sousedních stran je 52 : 2 = 26 cm.",
    "Delší strana celého obrazce je 26 − 4 = 22 cm. Z toho čtverec zabírá 4 cm a oba obdélníky dohromady 22 − 4 = 18 cm, takže každý obdélník je dlouhý 9 cm.",
    "Jeden obdélník má strany 4 cm a 9 cm, jeho obvod je 2 · (4 + 9) = 26 cm.",
  ], 210, im("kriz")),
  mk("P5_OBS_22", "p5_obsah", 2, "Čtverec má stranu 9 cm. Obdélník má stejný obvod jako tento čtverec a jedna jeho strana měří 11 cm. O kolik cm² je obsah čtverce větší než obsah obdélníku?", "4", [
    "Obvod čtverce je 4 · 9 = 36 cm. Obdélník má obvod také 36 cm, takže součet jeho dvou sousedních stran je 18 cm.",
    "Druhá strana obdélníku měří 18 − 11 = 7 cm. Obsah obdélníku je 11 · 7 = 77 cm², obsah čtverce 9 · 9 = 81 cm².",
    "Obsah čtverce je větší o 81 − 77 = 4 cm².",
  ], 180),
  mk("P5_OBS_23", "p5_obvod", 2, "Z 24 čtverečků o straně 1 cm skládáme obdélníky, které mají vždy obsah 24 cm². Strany obdélníků jsou v celých centimetrech. Který z nich má nejmenší obvod?", null, [
    "Obdélníků s obsahem 24 cm² je několik: 1 cm × 24 cm, 2 cm × 12 cm, 3 cm × 8 cm a 4 cm × 6 cm.",
    "Obvody jsou 2 · (1 + 24) = 50 cm, 2 · (2 + 12) = 28 cm, 2 · (3 + 8) = 22 cm a 2 · (4 + 6) = 20 cm.",
    "Nejmenší obvod 20 cm má obdélník 4 cm × 6 cm (nejvíc se podobá čtverci). Správně je D).",
  ], 180, { moznosti: ["1 cm × 24 cm", "2 cm × 12 cm", "3 cm × 8 cm", "4 cm × 6 cm", "všechny mají stejný obvod"], spravna: 3 }),
  mk("P5_OBS_24", "p5_obvod", 2, "Dva stejné čtverce o straně 5 cm přiložíme k sobě celými stranami a vznikne obdélník. O kolik centimetrů je součet obvodů obou čtverců větší než obvod vzniklého obdélníku?", "10", [
    "Obvod jednoho čtverce je 4 · 5 = 20 cm, oba čtverce mají dohromady 40 cm.",
    "Obdélník má strany 10 cm a 5 cm, jeho obvod je 2 · (10 + 5) = 30 cm.",
    "Rozdíl je 40 − 30 = 10 cm. (Přiložené strany se do obvodu už nepočítají: 2 · 5 = 10 cm.)",
  ], 150),
  mk("P5_OBS_25", "p5_obvod", 2, "Obdélník je složený z velkého čtverce o straně 6 cm a dvou malých čtverců o straně 3 cm, které jsou nad sebou. Jaký je obvod obdélníku v centimetrech?", "30", [
    "Velký čtverec má stranu 6 cm a dva malé nad sebou mají výšku 3 + 3 = 6 cm, takže výška obdélníku je 6 cm.",
    "Šířka obdélníku je 6 + 3 = 9 cm.",
    "Obvod je 2 · (9 + 6) = 30 cm.",
  ], 150, im("skladani")),
  // ───────── L3 (úroveň testu) ─────────
  mk("P5_OBS_26", "p5_obvod", 3, "Čtverec a rovnostranný trojúhelník mají stejný obvod. Strana trojúhelníku je o 2 cm delší než strana čtverce. Jaký je obvod čtverce v centimetrech?", "24", [
    "Strana čtverce nazveme jedna část. Čtverec má obvod čtyři takové části, trojúhelník tři části a k tomu třikrát 2 cm (každá jeho strana je o 2 cm delší).",
    "Čtyři části se rovnají třem částem a 6 cm, takže jedna část (strana čtverce) je 6 cm.",
    "Obvod čtverce je 4 · 6 = 24 cm. Zkouška: strana trojúhelníku je 8 cm a 3 · 8 = 24.",
  ], 240),
  mk("P5_OBS_27", "p5_obvod", 3, "Útvar A je čtverec. Útvar B vznikne tak, že na horní stranu čtverce A (stejné velikosti) přiložíme rovnostranný trojúhelník se stejnou stranou. Obvod útvaru B je o 9 cm větší než obvod útvaru A. Jaký je obvod útvaru B v centimetrech?", "45", [
    "Trojúhelník přidá k obvodu dvě své strany, ale přiložená strana čtverce z obvodu zmizí. Obvod se tedy zvětší o 2 strany − 1 strana = 1 stranu.",
    "Strana čtverce má proto 9 cm.",
    "Útvar B má obvod tři strany čtverce a dvě strany trojúhelníku, dohromady 5 · 9 = 45 cm. Zkouška: obvod A je 4 · 9 = 36 cm a 45 − 36 = 9.",
  ], 270, im("ab")),
  mk("P5_OBS_28", "p5_obsah", 3, "Zahrada tvaru obdélníku měří 12 m a 8 m. Uvnitř podél celého plotu vede pěšina široká 1 metr. Kolik metrů čtverečních zabírá pěšina?", null, [
    "Celá zahrada má obsah 12 · 8 = 96 m².",
    "Zbylá plocha uvnitř pěšiny je obdélník, který je z každé strany o 1 m užší, tedy o 2 m kratší v obou rozměrech: 10 m a 6 m, obsah 60 m².",
    "Pěšina zabírá 96 − 60 = 36 m². Správně je C).",
  ], 240, { moznosti: ["24", "32", "36", "40", "48"], spravna: 2 }),
  mk("P5_OBS_29", "p5_obsah", 3, "Velký čtverec má stranu 6 cm. Vrcholy tmavého čtverce uvnitř leží přesně ve středech stran velkého čtverce. Jaký je obsah tmavého čtverce v cm²?", "18", [
    "Velký čtverec má obsah 6 · 6 = 36 cm². Po odříznutí tmavého čtverce zbydou v rozích čtyři stejné pravoúhlé trojúhelníky.",
    "Každý trojúhelník je polovinou čtverce o straně 3 cm: 3 · 3 : 2 = 4,5 cm². Čtyři trojúhelníky mají 4 · 4,5 = 18 cm².",
    "Tmavý čtverec má obsah 36 − 18 = 18 cm², tedy přesně polovinu velkého čtverce.",
  ], 270, im("ctverec")),
  mk("P5_OBS_30", "p5_obvod", 3, "Obrazce se tvoří z čtverečků o straně 1 cm, které leží vedle sebe v jedné řadě. Každý další obrazec má o 1 čtvereček více než předchozí. Který obrazec v řadě má obvod 40 cm? (Napiš jeho pořadové číslo.)", "19", [
    "Řada čtverečků vedle sebe je obdélník 1 cm × n cm, jeho obvod je 2 · (n + 1) = 2n + 2 cm.",
    "Z 2n + 2 = 40 vyjde 2n = 38, takže n = 19. Zkouška: 1. obrazec má obvod 4 cm a každý další o 2 cm víc, 19. obrazec má 4 + 18 · 2 = 40 cm.",
    "Je to 19. obrazec (má 19 čtverečků).",
  ], 240, im("rada")),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ── nezávislé ověření ──
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const A = (id) => ex.find((x) => x.id === id).odpoved;
const cmp = (id, v) => ok(id, String(A(id)).replace(/\s/g, "") === String(v).replace(/\s/g, ""), `${A(id)} vs ${v}`);

{ const s = []; for (let b = 1; b < 13; b++) if (2 * (8 + b) === 26) s.push(b); ok("16", s.length === 1 && String(s[0]) === A("P5_OBS_16"), s); }
cmp("P5_OBS_17", rowsCells(T_ROWS).length);
{ const s = []; for (let a = 1; a < 100; a++) if (4 * a === 36) s.push(a); ok("18", s.length === 1 && String(s[0]) === A("P5_OBS_18"), s); }
{ const s = []; for (let a = 1; a < 100; a++) if (3 * a === 27) s.push(a); ok("19", s.length === 1 && String(s[0]) === A("P5_OBS_19"), s); }
{ // 20: obvod domečku z vrcholů (kreslených v obrázku)
  const a = DOM.a; ok("20 čtverec 32", 4 * a === 32); ok("20", eq(perimeterOf(houseVerts(a)), 40) && String(Math.round(perimeterOf(houseVerts(a)))) === A("P5_OBS_20"), perimeterOf(houseVerts(a)));
}
{ // 21: obrazec je obdélník 4 × (2w + 4); obvod 52
  const { sq, w } = KRIZ, celek = 2 * (sq + (2 * w + sq)); ok("21 celek", celek === 52, celek);
  const s = []; for (let ww = 1; ww < 40; ww++) if (2 * (sq + (2 * ww + sq)) === 52) s.push(ww);
  ok("21", s.length === 1 && s[0] === w && String(2 * (sq + w)) === A("P5_OBS_21"), s);
}
{ const s = []; for (let b = 1; b < 18; b++) if (2 * (11 + b) === 36) s.push(b); ok("22", s.length === 1 && 81 - 11 * s[0] === 4 && String(81 - 11 * s[0]) === A("P5_OBS_22"), s); }
{
  const e = ex.find((x) => x.id === "P5_OBS_23"), pairs = [];
  for (let d = 1; d <= 24; d++) if (24 % d === 0 && d <= 24 / d) pairs.push([d, 24 / d]);
  const per = pairs.map(([x, y]) => 2 * (x + y)), min = Math.min(...per);
  ok("23", pairs.length === 4 && per.filter((p) => p === min).length === 1 && e.moznosti[e.spravna] === `${pairs[per.indexOf(min)][0]} cm × ${pairs[per.indexOf(min)][1]} cm`, [pairs, per]);
}
cmp("P5_OBS_24", (4 * 5 + 4 * 5) - 2 * (10 + 5));
{ const rows = ["###", "###"]; cmp("P5_OBS_25", rowsPerim(rows) * SKL.maly); ok("25 rozměry", SKL.velky === 2 * SKL.maly && rowsCells(rows).length === 6); }
{ const s = []; for (let a = 1; a < 100; a++) if (4 * a === 3 * (a + 2)) s.push(a); ok("26", s.length === 1 && String(4 * s[0]) === A("P5_OBS_26"), s); }
{ const s = []; for (let a = 1; a < 100; a++) if (eq(perimeterOf(houseVerts(a)) - 4 * a, 9)) s.push(a); ok("27", s.length === 1 && s[0] === AB.a && String(Math.round(perimeterOf(houseVerts(s[0])))) === A("P5_OBS_27"), s); }
{ const outer = 12 * 8, inner = (12 - 2) * (8 - 2), e = ex.find((x) => x.id === "P5_OBS_28"); ok("28", outer - inner === 36 && e.moznosti[e.spravna] === "36" && e.moznosti.filter((m) => Number(m) === 36).length === 1); }
{ const a = ROMB.a, v = [[a / 2, 0], [a, a / 2], [a / 2, a], [0, a / 2]]; ok("29", eq(shoelace(v), 18) && String(shoelace(v)) === A("P5_OBS_29") && eq(dist(v[0], v[1]) ** 2, 18), shoelace(v)); }
{ const s = []; for (let n = 1; n < 100; n++) if (rowsPerim(["#".repeat(n)]) === 40) s.push(n); ok("30", s.length === 1 && String(s[0]) === A("P5_OBS_30"), s); ok("30 řada", RADA.every((r, i) => r === i + 1 && rowsPerim(["#".repeat(r)]) === 2 * r + 2)); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
  if (e.image) ok(e.id + " soubor obrázku", fs.existsSync("public" + e.image.url));
}
ok("rozmístění", new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size === 2);
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 15, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((fn) => JSON.parse(fs.readFileSync(`src/data/${fn}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; A–E ${ex.filter((e) => e.moznosti).length}; s obrázkem ${ex.filter((e) => e.image).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Obvod a obsah, druhá dávka (15 úloh)` : "5. třída — Obvod a obsah, druhá dávka: složené obrazce, rozdíly obvodů, souvislosti stran, mřížka, řada obrazců (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
