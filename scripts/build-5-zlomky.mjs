// 5. třída, okruh „Zlomky a části celku" (P5_ZLO_01–15): část z celku, celek z části, zbytek po částech, o zlomek víc/míň, porovnání, zlomek obrazce.
// Styl podle úloh 9–13 oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Spuštění: node scripts/build-5-zlomky.mjs → nakreslí public/obrazky/p5/zlo-*.svg a doplní/přepíše P5_ZLO_* v src/data/nahled-batch.json (jiné dávky nechá).
// Každý výsledek se v tomto skriptu nezávisle přepočítá (zlomky v celých číslech, hrubá síla); obrázky se kreslí ze stejných dat, ze kterých se zlomek spočítá.
import fs from "node:fs";
import { NAVY, text, line, makeWriter } from "./lib/svg.mjs";
const N = await import("../src/lib/normalize.ts");

const { write } = makeWriter("p5");
const FILL = "#cfe3f7";

// ── obrázky ──
const PASEK = { dily: 10, barevne: 3 };
const MRIZKA = ["######", "#####.", "####..", "###..."]; // „#" = vybarvené políčko
const mrizkaBarevne = MRIZKA.join("").split("#").length - 1;
const mrizkaCelkem = MRIZKA.join("").length;
{
  const cw = 34, ch = 40, m = 14, w = PASEK.dily * cw + 2 * m, h = ch + 2 * m;
  let body = `  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>\n`;
  for (let i = 0; i < PASEK.dily; i++) body += `  <rect x="${m + i * cw}" y="${m}" width="${cw}" height="${ch}" fill="${i < PASEK.barevne ? FILL : "#ffffff"}" stroke="${NAVY}" stroke-width="2"/>\n`;
  write("zlo-pasek.svg", w, h, body, `Pásek rozdělený na ${PASEK.dily} stejných dílů, z nich ${PASEK.barevne} vlevo jsou vybarvené`);
}
{
  const c = 36, m = 14, W = MRIZKA[0].length, H = MRIZKA.length, w = W * c + 2 * m, h = H * c + 2 * m;
  let body = `  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>\n`;
  MRIZKA.forEach((r, y) => [...r].forEach((k, x) => { body += `  <rect x="${m + x * c}" y="${m + y * c}" width="${c}" height="${c}" fill="${k === "#" ? FILL : "#ffffff"}" stroke="${NAVY}" stroke-width="1.6"/>\n`; }));
  write("zlo-mrizka.svg", w, h, body, `Obdélník ze čtverečků, ${H} řádky po ${W} čtverečcích; vybarvených je ${mrizkaBarevne} z ${mrizkaCelkem}`);
}

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_zlomky", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const img = (url, w, h, alt) => ({ image: { kind: "static", url, width: w, height: h, alt } });
const L = { latex: true };

const ex = [
  // ───────── L1 ─────────
  mk("P5_ZLO_01", "p5_cast_celku", 1, "Ve třídě je 24 žáků. Čtvrtina z nich jde na plavání. Kolik žáků jde na plavání?", "6", [
    "Čtvrtina znamená rozdělit na 4 stejné díly: 24 : 4.",
    "24 : 4 = 6 žáků.",
  ], 60),
  mk("P5_ZLO_02", "p5_cast_celku", 1, "Pětina knihy má 14 stran. Kolik stran má celá kniha?", "70", [
    "Celá kniha má 5 stejných dílů a jeden díl (pětina) má 14 stran.",
    "5 · 14 = 70 stran.",
  ], 75),
  mk("P5_ZLO_03", "p5_zlomek_obrazku", 1, "Pásek je rozdělený na stejné díly. Jakou část pásku tvoří vybarvené díly? Odpověď napiš zlomkem.", "3/10", [
    "Pásek má 10 stejných dílů, vybarvené jsou 3.",
    "Vybarvené díly tvoří tři desetiny pásku, tedy 3/10.",
  ], 60, img("/obrazky/p5/zlo-pasek.svg", 368, 68, `Pásek rozdělený na ${PASEK.dily} stejných dílů, z nich ${PASEK.barevne} vlevo jsou vybarvené`)),
  mk("P5_ZLO_04", "p5_porovnani", 1, "Dort rozdělíme na stejné díly a vezmeme si jen jeden díl. Který díl je největší?", null, [
    "Čím na víc stejných dílů dort rozdělíme, tím je každý díl menší.",
    "Polovina je z nabízených částí největší (dělíme jen na 2 díly). Správně je B).",
  ], 75, { moznosti: ["třetina", "polovina", "čtvrtina", "pětina", "desetina"], spravna: 1 }),
  // ───────── L2 ─────────
  mk("P5_ZLO_05", "p5_cast_celku", 2, "Pavel má 36 samolepek. Dvě třetiny z nich jsou zvířátka. Kolik samolepek zvířátek má Pavel?", "24", [
    "Nejdřív najdeme jednu třetinu: 36 : 3 = 12.",
    "Dvě třetiny jsou dvakrát tolik: 2 · 12 = 24 samolepek.",
  ], 90),
  mk("P5_ZLO_06", "p5_zbytek", 2, "Eva měla 120 korun. Třetinu z nich utratila za sešity a čtvrtinu za pití. Kolik korun jí zbylo?", "50", [
    "Za sešity utratila 120 : 3 = 40 Kč a za pití 120 : 4 = 30 Kč.",
    "Dohromady utratila 40 + 30 = 70 Kč, zbylo jí 120 − 70 = 50 Kč.",
  ], 120),
  mk("P5_ZLO_07", "p5_o_zlomek", 2, "V nádrži bylo 60 litrů vody. Do nádrže přilili ještě třetinu původního množství. Kolik litrů vody je v nádrži teď?", "80", [
    "Třetina původního množství je 60 : 3 = 20 litrů.",
    "Teď je v nádrži 60 + 20 = 80 litrů.",
  ], 90),
  mk("P5_ZLO_08", "p5_cast_celku", 2, "Tři čtvrtiny cesty mají 18 kilometrů. Kolik kilometrů má celá cesta?", "24", [
    "Tři čtvrtiny jsou 18 km, takže jedna čtvrtina je 18 : 3 = 6 km.",
    "Celá cesta má čtyři čtvrtiny: 4 · 6 = 24 km.",
  ], 120),
  mk("P5_ZLO_09", "p5_zlomek_obrazku", 2, "Obdélník je rozdělený na stejné čtverečky. Jakou část obdélníku tvoří vybarvené čtverečky? Napiš zlomek v základním tvaru.", "3/4", [
    "Spočítáme čtverečky: celkem je jich 4 · 6 = 24, vybarvených je 6 + 5 + 4 + 3 = 18.",
    "Vybarvená část je 18/24. Zlomek zkrátíme šesti: 18/24 = 3/4.",
  ], 120, img("/obrazky/p5/zlo-mrizka.svg", 244, 172, `Obdélník ze čtverečků, ${MRIZKA.length} řádky po ${MRIZKA[0].length} čtverečcích; vybarvených je ${mrizkaBarevne} z ${mrizkaCelkem}`)),
  mk("P5_ZLO_10", "p5_porovnani", 2, "Který z uvedených zlomků je větší než polovina?", null, [
    "Zlomek je větší než polovina, když čitatel je víc než polovina jmenovatele.",
    "A) 4/9: polovina z 9 je 4,5, takže 4 je málo. B) 3/7: polovina ze 7 je 3,5, málo. C) 5/8: polovina z 8 je 4 a 5 je víc. D) 2/5 a E) 7/15 jsou menší než polovina. Správně je C).",
  ], 120, { ...L, moznosti: ["$\\frac{4}{9}$", "$\\frac{3}{7}$", "$\\frac{5}{8}$", "$\\frac{2}{5}$", "$\\frac{7}{15}$"], spravna: 2 }),
  // ───────── L3 ─────────
  mk("P5_ZLO_11", "p5_zbytek", 3, "Tomáš utratil první den polovinu kapesného a druhý den třetinu toho, co mu zbylo. Potom mu zůstalo 40 korun. Kolik korun měl na začátku?", "120", [
    "Po prvním dni mu zbyla polovina kapesného. Druhý den utratil třetinu zbytku, tedy mu zůstaly dvě třetiny zbytku.",
    "Dvě třetiny z poloviny jsou třetina celku (2/3 · 1/2 = 1/3). Jedna třetina kapesného je 40 Kč.",
    "Celé kapesné bylo 3 · 40 = 120 Kč. Zkouška: polovina je 60, třetina ze 60 je 20, zbude 60 − 20 = 40.",
  ], 210),
  mk("P5_ZLO_12", "p5_o_zlomek", 3, "Cenu kola nejdřív snížili o pětinu a potom ještě o 200 korun. Nová cena je 2 680 korun. Jaká byla původní cena kola?", "3 600", [
    "Před posledním snížením o 200 Kč stálo kolo 2 680 + 200 = 2 880 Kč.",
    "Po snížení o pětinu zbyly čtyři pětiny původní ceny. Čtyři pětiny jsou 2 880 Kč, jedna pětina je 2 880 : 4 = 720 Kč.",
    "Původní cena byla 5 · 720 = 3 600 Kč. Zkouška: pětina z 3 600 je 720, 3 600 − 720 = 2 880 a 2 880 − 200 = 2 680.",
  ], 240),
  mk("P5_ZLO_13", "p5_o_zlomek", 3, "Pavel nasbíral 48 hub. Jirka nasbíral o čtvrtinu víc než Pavel. Kolik hub nasbírali oba kluci dohromady?", "108", [
    "Čtvrtina z Pavlových 48 hub je 48 : 4 = 12 hub.",
    "Jirka nasbíral 48 + 12 = 60 hub.",
    "Dohromady nasbírali 48 + 60 = 108 hub.",
  ], 150),
  mk("P5_ZLO_14", "p5_zbytek", 3, "Kniha má 240 stran. Karel přečetl první den pětinu knihy a druhý den třetinu toho, co mu zbývalo. Kolik stran mu ještě zbývá přečíst?", "128", [
    "První den přečetl 240 : 5 = 48 stran, zbývá mu 240 − 48 = 192 stran.",
    "Druhý den přečetl třetinu zbytku: 192 : 3 = 64 stran.",
    "Zbývá mu 192 − 64 = 128 stran.",
  ], 180),
  mk("P5_ZLO_15", "p5_o_zlomek", 3, "Nádoba je z jedné třetiny plná vody. Když do ní přilijeme 4 litry vody, bude plná z poloviny. Kolik litrů vody se do celé nádoby vejde?", null, [
    "Rozdíl mezi polovinou a třetinou nádoby jsou právě přilité 4 litry.",
    "Polovina je 3/6 a třetina je 2/6 nádoby, rozdíl je jedna šestina nádoby. Šestina nádoby je 4 litry.",
    "Celá nádoba má 6 · 4 = 24 litrů. Správně je C).",
  ], 210, { moznosti: ["12", "18", "24", "30", "36"], spravna: 2 }),
];

for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ── nezávislé ověření výsledků (zlomky přes čitatel a jmenovatel, hrubá síla) ──
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const A = (id) => { const e = ex.find((x) => x.id === id); return e.moznosti ? e.moznosti[e.spravna] : e.odpoved; };
const cmp = (id, v) => ok(id, String(A(id)).replace(/\s/g, "") === String(v).replace(/\s/g, ""), `${A(id)} vs ${v}`);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

cmp("P5_ZLO_01", 24 / 4);
cmp("P5_ZLO_02", 14 * 5);
{ const g = gcd(PASEK.barevne, PASEK.dily); cmp("P5_ZLO_03", `${PASEK.barevne / g}/${PASEK.dily / g}`); }
{ const val = { třetina: 1 / 3, polovina: 1 / 2, čtvrtina: 1 / 4, pětina: 1 / 5, desetina: 1 / 10 }; const m = ex.find((e) => e.id === "P5_ZLO_04"); const best = m.moznosti.reduce((a, b) => (val[b] > val[a] ? b : a)); ok("P5_ZLO_04", best === A("P5_ZLO_04")); }
cmp("P5_ZLO_05", (36 / 3) * 2);
cmp("P5_ZLO_06", 120 - 120 / 3 - 120 / 4);
cmp("P5_ZLO_07", 60 + 60 / 3);
{ const s = []; for (let t = 1; t <= 500; t++) if (t * 3 / 4 === 18) s.push(t); ok("P5_ZLO_08", s.length === 1 && String(s[0]) === A("P5_ZLO_08"), s); }
{ const g = gcd(mrizkaBarevne, mrizkaCelkem); ok("P5_ZLO_09 sloupce", MRIZKA.every((r) => r.length === MRIZKA[0].length)); cmp("P5_ZLO_09", `${mrizkaBarevne / g}/${mrizkaCelkem / g}`); ok("P5_ZLO_09 počet", mrizkaBarevne === 18 && mrizkaCelkem === 24); }
{ const v = [[4, 9], [3, 7], [5, 8], [2, 5], [7, 15]]; const vetsi = v.filter(([c, j]) => 2 * c > j); ok("P5_ZLO_10", vetsi.length === 1 && vetsi[0][0] === 5 && A("P5_ZLO_10") === "$\\frac{5}{8}$"); }
{ const s = []; for (let x = 6; x <= 1200; x += 6) { const po1 = x - x / 2; if (po1 % 3 === 0 && po1 - po1 / 3 === 40) s.push(x); } ok("P5_ZLO_11", s.length === 1 && String(s[0]) === A("P5_ZLO_11"), s); }
{ const s = []; for (let x = 5; x <= 20000; x += 5) if (x - x / 5 - 200 === 2680) s.push(x); ok("P5_ZLO_12", s.length === 1 && String(s[0]) === A("P5_ZLO_12").replace(/\s/g, ""), s); }
cmp("P5_ZLO_13", 48 + (48 + 48 / 4));
{ const po1 = 240 - 240 / 5; cmp("P5_ZLO_14", po1 - po1 / 3); }
{ const s = []; for (let v = 6; v <= 120; v += 6) if (v / 3 + 4 === v / 2) s.push(v); ok("P5_ZLO_15", s.length === 1 && String(s[0]) === A("P5_ZLO_15"), s); }

for (const e of ex) {
  if (e.moznosti) {
    ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  } else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
  if (e.image) ok(e.id + " soubor obrázku", fs.existsSync("public" + e.image.url));
}
// zlomek 6/8 (nezkrácený) se musí uznat jako 3/4 — jinak by žák za správný zlomek dostal křížek
ok("zkrácení 18/24", N.checkAnswer("18/24", "3/4") && N.checkAnswer("3/4", "3/4"));
ok("rozmístění", new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size === 2 || new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size === 3);
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 15, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; A–E ${ex.filter((e) => e.moznosti).length}; s obrázkem ${ex.filter((e) => e.image).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^P5_ZLO_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Zlomky a části celku (15 úloh)` : "5. třída — Zlomky a části celku: část z celku, celek z části, zbytek, o zlomek víc nebo míň, porovnání (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
