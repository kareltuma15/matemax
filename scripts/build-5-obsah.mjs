// 5. třída, okruh „Obvod a obsah" (P5_OBS_01–15): obvod a obsah obdélníku a čtverce, obrazce ze čtverečků, přeskládání.
// Styl podle úloh 5 a 6 oficiálních testů CERMAT pro 5. třídu (vlastní obrazce a čísla, nic se nekopíruje).
// Spuštění: node scripts/build-5-obsah.mjs → nakreslí public/obrazky/p5/obs-*.svg a doplní/přepíše P5_OBS_* v src/data/nahled-batch.json.
// Obrázek se kreslí ze stejných dat (řádky ze znaků), ze kterých se obsah a obvod nezávisle spočítají; hodnoty se porovnají s ručním výpočtem.
import fs from "node:fs";
import { NAVY, BLUE, text, line, makeWriter } from "./lib/svg.mjs";
const N = await import("../src/lib/normalize.ts");

const { write } = makeWriter("p5");
const FILL = "#cfe3f7";
const f = (n) => Math.round(n * 100) / 100;

// ── obrazce ze čtverečků: řádky znaků, „#" = vybarvený čtvereček, „." = prázdné místo ──
const cells = (rows) => rows.flatMap((r, y) => [...r].flatMap((c, x) => (c === "#" ? [[x, y]] : [])));
const has = (rows, x, y) => rows[y]?.[x] === "#";
const area = (rows) => cells(rows).length;
/** Obvod ve stranách čtverečků: počet hran, které nesousedí s jiným vybarveným čtverečkem. */
const perim = (rows) => cells(rows).reduce((s, [x, y]) => s + [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => !has(rows, x + dx, y + dy)).length, 0);
const connected = (rows) => {
  const cs = cells(rows), seen = new Set([cs[0].join()]), st = [cs[0]];
  while (st.length) { const [x, y] = st.pop(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = [x + dx, y + dy].join(); if (has(rows, x + dx, y + dy) && !seen.has(k)) { seen.add(k); st.push([x + dx, y + dy]); } } }
  return seen.size === cs.length;
};

/** Nakreslí obrazec; `frame` = čárkovaně celý rámec (pro doplňování), `grid` = mřížka i v prázdných polích rámce. */
function draw(name, rows, { cell = 30, frame = false, title }) {
  const W = Math.max(...rows.map((r) => r.length)), H = rows.length, m = 14;
  const w = W * cell + 2 * m, h = H * cell + 2 * m;
  let body = `  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>\n`;
  if (frame) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!has(rows, x, y)) body += `  <rect x="${m + x * cell}" y="${m + y * cell}" width="${cell}" height="${cell}" fill="#ffffff" stroke="#c4cfdd" stroke-width="1"/>\n`;
  }
  for (const [x, y] of cells(rows)) body += `  <rect x="${m + x * cell}" y="${m + y * cell}" width="${cell}" height="${cell}" fill="${FILL}" stroke="#8fb0d3" stroke-width="1"/>\n`;
  if (!frame) for (const [x, y] of cells(rows)) {
    const X = m + x * cell, Y = m + y * cell;
    if (!has(rows, x, y - 1)) body += line(X, Y, X + cell, Y, { w: 3 }) + "\n";
    if (!has(rows, x, y + 1)) body += line(X, Y + cell, X + cell, Y + cell, { w: 3 }) + "\n";
    if (!has(rows, x - 1, y)) body += line(X, Y, X, Y + cell, { w: 3 }) + "\n";
    if (!has(rows, x + 1, y)) body += line(X + cell, Y, X + cell, Y + cell, { w: 3 }) + "\n";
  }
  if (frame) body += `  <rect x="${m}" y="${m}" width="${W * cell}" height="${H * cell}" fill="none" stroke="${BLUE}" stroke-width="2" stroke-dasharray="6 4"/>\n`;
  write(name, w, h, body.trimEnd(), title);
  return { url: `/obrazky/p5/${name}`, width: w, height: h };
}
const img = (d, alt) => ({ kind: "static", ...d, alt });

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_obsah", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});

const SHAPES = {
  plocha: ["###.", "####", "####"],                     // obsah 11
  obvod1: ["###", "###", "#.."],                        // obvod 12
  schody: ["#....", "##...", "###..", "####."],        // obvod 16
  rameckDoplnit: ["#.##", "##..", "####"],              // chybí 3 čtverečky do obdélníku 4×3
  trojice: ["###"],                                     // tři čtverce vedle sebe
  dvojice: ["##"],                                      // dva čtverce vedle sebe
  hrebinek: ["#.#.#", "#####"],                         // obvod 18 stran = 36 cm při straně 2 cm
  zkoseny: ["##########", "##########", "##########", "#######...", "#######...", "#######..."], // 10×6 bez rohu 3×3
};
const I = {
  plocha: img(draw("obs-plocha.svg", SHAPES.plocha, { title: "Obrazek ze ctvercku" }), "Obrazec ze čtverečkové sítě složený z 11 vybarvených čtverečků: nahoře tři, uprostřed čtyři a dole čtyři"),
  obvod1: img(draw("obs-obvod1.svg", SHAPES.obvod1, { title: "Obrazek ze ctvercku" }), "Obrazec ze čtverečkové sítě: dva řádky po třech čtverečcích a pod nimi jediný čtvereček vlevo"),
  schody: img(draw("obs-schody.svg", SHAPES.schody, { title: "Schody ze ctvercku" }), "Schodovitý obrazec ze čtverečků: řádky o délce 1, 2, 3 a 4 čtverečků zarovnané vlevo"),
  doplnit: img(draw("obs-doplnit.svg", SHAPES.rameckDoplnit, { frame: true, title: "Doplneni do obdelniku" }), "Vybarvené čtverečky uvnitř čárkovaného obdélníku 4 čtverečky široký a 3 čtverečky vysoký; tři políčka obdélníku zůstávají prázdná"),
  trojice: img(draw("obs-trojice.svg", SHAPES.trojice, { cell: 56, title: "Tri stejne ctverce" }), "Obdélník složený ze tří stejných čtverců vedle sebe"),
  dvojice: img(draw("obs-dvojice.svg", SHAPES.dvojice, { cell: 64, title: "Dva stejne ctverce" }), "Obdélník složený ze dvou stejných čtverců vedle sebe"),
  hrebinek: img(draw("obs-hrebinek.svg", SHAPES.hrebinek, { cell: 36, title: "Hrebinek ze ctvercku" }), "Obrazec ve tvaru hřebínku: dole řada pěti čtverců a nad ní tři zuby, první, třetí a pátý čtverec"),
  zkoseny: img(draw("obs-zkoseny.svg", SHAPES.zkoseny, { cell: 24, title: "Obdelnik s vystrizenym rohem" }), "Obdélník 10 čtverečků široký a 6 vysoký s vystřiženým čtvercem 3 × 3 čtverečky v pravém dolním rohu"),
};

const ex = [
  // ───────── L1 ─────────
  mk("P5_OBS_01", "p5_obvod", 1, "Obdélník má strany 7 cm a 4 cm. Jaký je jeho obvod v centimetrech?", "22", [
    "Obvod je součet všech čtyř stran: 7 + 4 + 7 + 4.",
    "Nebo dvakrát součet sousedních stran: 2 · (7 + 4) = 2 · 11 = 22 cm.",
  ], 60),
  mk("P5_OBS_02", "p5_obsah", 1, "Čtverec má stranu 9 cm. Jaký je jeho obsah v cm²?", "81", [
    "Obsah čtverce je strana krát strana: 9 · 9.",
    "9 · 9 = 81 cm².",
  ], 60),
  mk("P5_OBS_03", "p5_obsah", 1, "Každý čtvereček má stranu 1 cm. Jaký je obsah vybarveného obrazce v cm²?", "11", [
    "Jeden čtvereček má obsah 1 cm². Stačí spočítat čtverečky po řádcích.",
    "Nahoře jsou 3, uprostřed 4 a dole 4: 3 + 4 + 4 = 11 čtverečků, tedy 11 cm².",
  ], 75, { image: I.plocha }),
  mk("P5_OBS_04", "p5_obvod", 1, "Každý čtvereček má stranu 1 cm. Jaký je obvod vybarveného obrazce v centimetrech?", "12", [
    "Obvod je délka čáry kolem celého obrazce. Obejdeme ho a počítáme strany čtverečků.",
    "Schody v pravém dolním rohu obvod nezvětšují: obrazec je stejně dlouhý a široký jako čtverec 3 × 3, a ten má obvod 4 · 3 = 12 cm.",
  ], 90, { image: I.obvod1 }),
  // ───────── L2 ─────────
  mk("P5_OBS_05", "p5_obvod", 2, "Obdélník má obvod 30 cm a jedna jeho strana měří 9 cm. Jaký je jeho obsah v cm²?", "54", [
    "Dvě strany po 9 cm mají dohromady 18 cm, zbývá 30 − 18 = 12 cm pro druhé dvě strany.",
    "Druhá strana měří 12 : 2 = 6 cm. Obsah je 9 · 6 = 54 cm².",
  ], 120),
  mk("P5_OBS_06", "p5_obvod", 2, "Čtverec má obvod 48 cm. Jaký je jeho obsah v cm²?", "144", [
    "Čtverec má čtyři stejné strany, jedna měří 48 : 4 = 12 cm.",
    "Obsah je 12 · 12 = 144 cm².",
  ], 90),
  mk("P5_OBS_07", "p5_obvod", 2, "Každý čtvereček má stranu 1 cm. Jaký je obvod schodovitého obrazce v centimetrech?", "16", [
    "Všechny vodorovné úseky dohromady dají stejnou délku jako dolní strana: 4 cm nahoře i dole, tedy 2 · 4 = 8 cm.",
    "Všechny svislé úseky dohromady dají stejnou délku jako levá strana: 2 · 4 = 8 cm.",
    "Obvod je jako u čtverce 4 × 4: 8 + 8 = 16 cm.",
  ], 150, { image: I.schody }),
  mk("P5_OBS_08", "p5_obsah", 2, "Dvůr má tvar obdélníku 12 m × 8 m. Uprostřed je čtvercový záhon o straně 4 m. Kolik metrů čtverečních dvora zůstane bez záhonu?", "80", [
    "Obsah dvora: 12 · 8 = 96 m².",
    "Obsah záhonu: 4 · 4 = 16 m².",
    "Bez záhonu zůstane 96 − 16 = 80 m².",
  ], 150),
  mk("P5_OBS_09", "p5_obsah", 2, "Kolik dalších čtverečků musíš vybarvit, aby vybarvený obrazec vyplnil celý čárkovaný obdélník?", null, [
    "Obdélník je 4 čtverečky široký a 3 vysoký, takže má 4 · 3 = 12 čtverečků.",
    "Vybarvených je 3 + 2 + 4 = 9 čtverečků, chybí 12 − 9 = 3. Správně je B).",
  ], 120, { image: I.doplnit, moznosti: ["2", "3", "4", "5", "6"], spravna: 1 }),
  mk("P5_OBS_10", "p5_obvod", 2, "Obdélník má obvod 28 cm a kratší strana měří 5 cm. Jaký je jeho obsah v cm²?", null, [
    "Dvě kratší strany mají 2 · 5 = 10 cm, na dvě delší zbývá 28 − 10 = 18 cm.",
    "Delší strana měří 18 : 2 = 9 cm. Obsah je 5 · 9 = 45 cm². Správně je D).",
  ], 150, { moznosti: ["28", "35", "40", "45", "56"], spravna: 3 }),
  // ───────── L3 ─────────
  mk("P5_OBS_11", "p5_obvod", 3, "Obdélník je složený ze tří stejných čtverců. Jeho obvod je 56 cm. Jaký je jeho obsah v cm²?", "147", [
    "Strana čtverce je a. Delší strana obdélníku měří 3a, kratší a, obvod je 3a + a + 3a + a = 8a.",
    "8a = 56, takže a = 7 cm.",
    "Obdélník má strany 21 cm a 7 cm, obsah 21 · 7 = 147 cm². (Nebo: tři čtverce po 7 · 7 = 49 cm², 3 · 49 = 147 cm².)",
  ], 240, { image: I.trojice }),
  mk("P5_OBS_12", "p5_obvod", 3, "Obrazec je složený z osmi čtverců, každý má stranu 2 cm. Jaký je obvod obrazce v centimetrech?", "36", [
    "Obvod počítáme ve stranách čtverců. Kdyby obrazec neměl žádné zářezy, byl by to obdélník 5 × 2 čtverce s obvodem 2 · (5 + 2) = 14 stran.",
    "Každý ze dvou zářezů mezi zuby přidá dvě boční strany a dno nahradí odstraněnou horní stranu, takže obvod roste o 2. Dohromady 14 + 2 + 2 = 18 stran.",
    "Každá strana měří 2 cm: 18 · 2 = 36 cm.",
  ], 270, { image: I.hrebinek }),
  mk("P5_OBS_13", "p5_obvod", 3, "Z obdélníku 10 cm × 6 cm vystřihli v rohu čtverec 3 cm × 3 cm. Každý čtvereček v obrázku má stranu 1 cm. Jaký je obvod zbylého obrazce v centimetrech?", "32", [
    "Vystřižení čtverce z rohu obvod nezmění: čára, která šla po dvou stranách rohu, vede teď po dvou stranách vystřiženého čtverce, a ty jsou stejně dlouhé.",
    "Obvod je stejný jako u celého obdélníku: 2 · (10 + 6) = 32 cm.",
  ], 210, { image: I.zkoseny }),
  mk("P5_OBS_14", "p5_obvod", 3, "Čtverec má stranu 6 cm. Rovnostranný trojúhelník má stejný obvod jako tento čtverec. Kolik centimetrů měří strana trojúhelníku?", "8", [
    "Obvod čtverce je 4 · 6 = 24 cm.",
    "Trojúhelník má tři stejné strany a obvod 24 cm, jedna strana měří 24 : 3 = 8 cm.",
  ], 150),
  mk("P5_OBS_15", "p5_obsah", 3, "Obdélník je rozdělený jednou úsečkou na dva stejné čtverce. Obvod obdélníku je 36 cm. Jaký je obsah obdélníku v cm²?", "72", [
    "Strana čtverce je a. Obdélník má strany 2a a a, obvod 2a + a + 2a + a = 6a.",
    "6a = 36, takže a = 6 cm.",
    "Jeden čtverec má 6 · 6 = 36 cm², dva čtverce mají 2 · 36 = 72 cm².",
  ], 210, { image: I.dvojice }),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const A = (id) => by[id].odpoved;

ok("01", 2 * (7 + 4) === 22 && A("P5_OBS_01") === "22");
ok("02", 9 * 9 === 81 && A("P5_OBS_02") === "81");
ok("03", area(SHAPES.plocha) === 11 && A("P5_OBS_03") === "11");
ok("04", perim(SHAPES.obvod1) === 12 && 2 * (3 + 3) === 12 && A("P5_OBS_04") === "12");
{ const s = []; for (let b = 1; b < 15; b++) if (2 * (9 + b) === 30) s.push(9 * b); ok("05", s.length === 1 && String(s[0]) === A("P5_OBS_05"), s); }
ok("06", (48 / 4) ** 2 === 144 && A("P5_OBS_06") === "144");
ok("07", perim(SHAPES.schody) === 16 && 2 * (4 + 4) === 16 && A("P5_OBS_07") === "16");
ok("08", 12 * 8 - 4 * 4 === 80 && A("P5_OBS_08") === "80");
{ const w = 4, h = 3; ok("09", w * h - area(SHAPES.rameckDoplnit) === 3 && by.P5_OBS_09.moznosti[by.P5_OBS_09.spravna] === "3"); }
{ const s = []; for (let b = 5; b < 30; b++) if (2 * (5 + b) === 28) s.push(5 * b); ok("10", s.length === 1 && String(s[0]) === A("P5_OBS_10"), s); }
{ const s = []; for (let a = 1; a < 50; a++) if (2 * (3 * a + a) === 56) s.push(3 * a * a); ok("11", s.length === 1 && String(s[0]) === A("P5_OBS_11"), s); }
ok("12 čtverce", area(SHAPES.hrebinek) === 8);
ok("12 obvod", perim(SHAPES.hrebinek) * 2 === 36 && A("P5_OBS_12") === "36", perim(SHAPES.hrebinek));
ok("13", perim(SHAPES.zkoseny) === 32 && 2 * (10 + 6) === 32 && area(SHAPES.zkoseny) === 60 - 9 && A("P5_OBS_13") === "32", perim(SHAPES.zkoseny));
ok("14", (4 * 6) / 3 === 8 && A("P5_OBS_14") === "8");
{ const s = []; for (let a = 1; a < 50; a++) if (2 * (2 * a + a) === 36) s.push(2 * a * a); ok("15", s.length === 1 && String(s[0]) === A("P5_OBS_15"), s); }
for (const [k, r] of Object.entries(SHAPES)) if (k !== "rameckDoplnit") ok("souvislý " + k, connected(r)); // rámeček k doplnění souvislý být nemusí

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
  if (e.image) ok(e.id + " obrázek", e.image.alt.length > 20 && fs.existsSync("public" + e.image.url));
}
ok("rozmístění", new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size === 2);
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 15, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; A–E ${ex.filter((e) => e.moznosti).length}; s obrázkem ${ex.filter((e) => e.image).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^P5_OBS_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Obvod a obsah (15 úloh)` : "5. třída — Obvod a obsah: obdélník, čtverec, obrazce ze čtverečků, přeskládání (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
