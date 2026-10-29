// 5. třída, okruh „Zlomky a části celku", třetí dávka (P5_ZLO_31–45): část z celku, celek z části, zbytek, o zlomek, porovnání, zlomek na kruhu a na ose, kruhový diagram.
// Styl podle úloh 9–13 oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Jen učivo 4.–5. třídy: bez sčítání zlomků s různými jmenovateli v zápise, bez dělení zlomků; počítá se „částmi" celku (Karel).
// Spuštění: node scripts/build-5-zlomky3.mjs → nakreslí public/obrazky/p5/zlo3-*.svg a doplní/přepíše P5_ZLO_31–45 v src/data/nahled-batch.json (jiné dávky nechá).
// Každý výsledek se v tomto skriptu nezávisle přepočítá (zlomky v celých číslech, hrubá síla); obrázky se kreslí ze stejných dat, ze kterých se zlomek spočítá.
import fs from "node:fs";
import { NAVY, text, line, makeWriter } from "./lib/svg.mjs";
const N = await import("../src/lib/normalize.ts");

const { write } = makeWriter("p5");
const BLUE_F = "#cfe3f7";
const RED_F = "#f6d3cc";
const GREEN_F = "#d6ecd0";
const YELL_F = "#f8e8b0";
const W0 = "#ffffff";

// ── kruh rozdělený na n stejných dílů; barvy dílů od 12. hodiny po směru hodinových ručiček ──
const pie = (n, fills, labels = [], r = 86, c = 100) => {
  let body = `  <rect x="0" y="0" width="${2 * c}" height="${2 * c}" fill="#ffffff"/>\n`;
  const pt = (a, rr) => [c + rr * Math.sin(a), c - rr * Math.cos(a)];
  for (let i = 0; i < n; i++) {
    const a0 = (2 * Math.PI * i) / n, a1 = (2 * Math.PI * (i + 1)) / n, [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r);
    body += `  <path d="M ${c} ${c} L ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z" fill="${fills[i]}" stroke="${NAVY}" stroke-width="2" stroke-linejoin="round"/>\n`;
  }
  for (const { at, t } of labels) { const [x, y] = pt(at, r * 0.58); body += text(x, y + 6, t, { size: 18, fill: NAVY }) + "\n"; }
  return body;
};

// ── data obrázků ──
const KRUH8 = { dily: 8, barevne: 3 }; // vybarvené 3 z 8
const KRUH12 = { dily: 12, modre: 5, cervene: 4 }; // zbytek bílé
const OSA2 = { dily: 10, a: 3, b: 7 };

{
  const fills = Array.from({ length: KRUH8.dily }, (_, i) => (i < KRUH8.barevne ? BLUE_F : W0));
  write("zlo3-kruh8.svg", 200, 200, pie(KRUH8.dily, fills), `Kruh rozdělený na ${KRUH8.dily} stejných dílů, vybarvené jsou ${KRUH8.barevne}`);
}
{
  const fills = Array.from({ length: KRUH12.dily }, (_, i) => (i < KRUH12.modre ? BLUE_F : i < KRUH12.modre + KRUH12.cervene ? RED_F : W0));
  const lab = [];
  for (let i = 0; i < KRUH12.modre + KRUH12.cervene; i++) lab.push({ at: (2 * Math.PI * (i + 0.5)) / KRUH12.dily, t: i < KRUH12.modre ? "M" : "Č" });
  write("zlo3-kruh12.svg", 200, 200, pie(KRUH12.dily, fills, lab), `Kruh rozdělený na ${KRUH12.dily} stejných dílů: ${KRUH12.modre} modrých (M), ${KRUH12.cervene} červené (Č), ostatní bílé`);
}
{
  const w = 400, h = 100, x0 = 30, x1 = 370, y = 62, d = (x1 - x0) / OSA2.dily;
  let body = `  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>\n`;
  body += line(x0, y, x1, y, { w: 2.5 }) + "\n";
  for (let i = 0; i <= OSA2.dily; i++) body += line(x0 + i * d, y - 9, x0 + i * d, y + 9, { w: 2 }) + "\n";
  body += text(x0, y + 28, "0", { size: 16, fill: NAVY }) + "\n" + text(x1, y + 28, "1", { size: 16, fill: NAVY }) + "\n";
  for (const [k, l] of [[OSA2.a, "A"], [OSA2.b, "B"]]) {
    const bx = x0 + k * d;
    body += `  <polygon points="${bx},${y - 4} ${bx - 8},${y - 24} ${bx + 8},${y - 24}" fill="#c0392b"/>\n` + text(bx, y - 30, l, { size: 16, fill: "#c0392b" }) + "\n";
  }
  write("zlo3-osa.svg", w, h, body, `Číselná osa od 0 do 1 rozdělená na ${OSA2.dily} stejných dílů, šipka A ukazuje na ${OSA2.a}. dílek a šipka B na ${OSA2.b}. dílek`);
}

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_zlomky", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const img = (url, w, h, alt) => ({ image: { kind: "static", url, width: w, height: h, alt } });

const ex = [
  // ───────── L1 ─────────
  mk("P5_ZLO_31", "p5_cast_celku", 1, "Na stromě bylo 40 hrušek. Desetina z nich byla červivá. Kolik hrušek bylo červivých?", "4", [
    "Desetina znamená rozdělit na 10 stejných dílů: 40 : 10.",
    "40 : 10 = 4 hrušky.",
  ], 60),
  mk("P5_ZLO_32", "p5_zlomek_obrazku", 1, "Kruh je rozdělený na stejné díly. Jakou část kruhu tvoří vybarvené díly? Odpověď napiš zlomkem.", "3/8", [
    "Kruh je rozdělený na 8 stejných dílů, takže jmenovatel je 8.",
    "Vybarvené jsou 3 díly, tedy 3 osminy: 3/8.",
  ], 75, img("/obrazky/p5/zlo3-kruh8.svg", 200, 200, `Kruh rozdělený na ${KRUH8.dily} stejných dílů, vybarvené jsou ${KRUH8.barevne}`)),
  mk("P5_ZLO_33", "p5_cast_celku", 1, "Třetina cesty do školy měří 400 metrů. Kolik metrů měří celá cesta?", "1200", [
    "Celá cesta má 3 stejné díly a jeden díl (třetina) měří 400 m.",
    "3 · 400 = 1 200 m.",
  ], 75),
  mk("P5_ZLO_34", "p5_o_zlomek", 1, "Karel má 20 korun. Anička má o polovinu víc než Karel. Kolik korun má Anička?", "30", [
    "Polovina z 20 korun je 10 korun.",
    "Anička má o 10 korun víc: 20 + 10 = 30 korun.",
  ], 90),
  // ───────── L2 ─────────
  mk("P5_ZLO_35", "p5_zlomek_obrazku", 2, "Kruh je rozdělený na stejné díly. Pět dílů je modrých, čtyři jsou červené a ostatní jsou bílé. Jakou část kruhu tvoří bílé díly? Napiš zlomek v základním tvaru.", "1/4", [
    "Kruh má 12 stejných dílů. Modrých je 5 a červených 4, dohromady 9 vybarvených dílů.",
    "Bílé jsou 12 − 9 = 3 díly, tedy 3/12. Zlomek zkrátíme třemi: 3/12 = 1/4.",
  ], 120, img("/obrazky/p5/zlo3-kruh12.svg", 200, 200, `Kruh rozdělený na ${KRUH12.dily} stejných dílů: ${KRUH12.modre} modrých (M), ${KRUH12.cervene} červené (Č), ostatní bílé`)),
  mk("P5_ZLO_36", "p5_zbytek", 2, "V obchodě měli 180 kilogramů jablek. První den prodali polovinu jablek a druhý den třetinu toho, co zbylo. Kolik kilogramů jablek prodali druhý den?", "30", [
    "První den prodali polovinu: 180 : 2 = 90 kg, zbylo 90 kg.",
    "Druhý den prodali třetinu zbytku: 90 : 3 = 30 kg.",
  ], 150),
  mk("P5_ZLO_37", "p5_o_zlomek", 2, "Šála stála 360 korun. Cenu zvýšili o desetinu. Kolik korun šála stojí teď?", "396", [
    "Desetina ze 360 Kč je 360 : 10 = 36 Kč.",
    "Nová cena je 360 + 36 = 396 Kč.",
  ], 105),
  mk("P5_ZLO_38", "p5_porovnani", 2, "Který z uvedených zlomků je nejblíže číslu 1?", null, [
    "Každému zlomku chybí do celku: 1/2 chybí polovina, 3/4 chybí čtvrtina, 5/6 chybí šestina, 7/8 chybí osmina a 2/3 chybí třetina.",
    "Nejmenší chybějící díl je osmina, proto je nejblíže jedné 7/8. Správně je D).",
  ], 150, { latex: true, moznosti: ["$\\frac{1}{2}$", "$\\frac{3}{4}$", "$\\frac{5}{6}$", "$\\frac{7}{8}$", "$\\frac{2}{3}$"], spravna: 3 }),
  mk("P5_ZLO_39", "p5_zbytek", 2, "Tři pětiny žáků školy jsou dívky. Chlapců je 80. Kolik žáků má škola?", "200", [
    "Dívky jsou tři pětiny, takže chlapci jsou zbylé dvě pětiny žáků.",
    "Dvě pětiny jsou 80 chlapců, jedna pětina je 80 : 2 = 40 žáků.",
    "Škola má 5 · 40 = 200 žáků. Zkouška: dívek je 3 · 40 = 120 a 120 + 80 = 200.",
  ], 150),
  mk("P5_ZLO_40", "p5_cast_celku", 2, "Film trval dvě třetiny hodiny. Potom následovala pohádka, která trvala čtvrt hodiny. Kolik minut trvaly film a pohádka dohromady?", "55", [
    "Hodina má 60 minut. Dvě třetiny hodiny jsou (60 : 3) · 2 = 20 · 2 = 40 minut.",
    "Čtvrt hodiny je 60 : 4 = 15 minut.",
    "Dohromady 40 + 15 = 55 minut.",
  ], 150),
  // ───────── L3 ─────────
  mk("P5_ZLO_41", "p5_zbytek", 3, "Z nádrže vypustili v pondělí třetinu vody a v úterý čtvrtinu vody, kterou v nádrži původně měli. Zbylo 25 litrů. Kolik litrů vody bylo v nádrži na začátku?", "60", [
    "Třetina a čtvrtina dohromady jsou 4/12 + 3/12 = 7/12 původní vody.",
    "Zbylo 12/12 − 7/12 = 5/12 vody a to je 25 litrů. Jedna dvanáctina je 25 : 5 = 5 litrů.",
    "V nádrži bylo 12 · 5 = 60 litrů. Zkouška: třetina je 20, čtvrtina 15 a 60 − 20 − 15 = 25.",
  ], 240),
  mk("P5_ZLO_42", "p5_o_zlomek", 3, "Honza má o čtvrtinu méně korun než Jirka. Honza má 36 korun. Kolik korun mají oba kluci dohromady?", "84", [
    "Jirkovy peníze rozdělíme na 4 stejné díly. Honza má o čtvrtinu méně, tedy 3 takové díly.",
    "Tři díly jsou 36 korun, jeden díl je 36 : 3 = 12 korun. Jirka má 4 · 12 = 48 korun.",
    "Dohromady 36 + 48 = 84 korun.",
  ], 210),
  mk("P5_ZLO_43", "p5_zlomek_obrazku", 3, "Na číselné ose je úsek od 0 do 1 rozdělený na 10 stejných dílů. Jakou část úseku od 0 do 1 tvoří vzdálenost mezi šipkami A a B? Napiš zlomek v základním tvaru.", "2/5", [
    "Šipka A ukazuje na 3/10 a šipka B na 7/10.",
    "Mezi nimi je 7 − 3 = 4 desetiny, tedy 4/10. Zlomek zkrátíme dvěma: 4/10 = 2/5.",
  ], 150, img("/obrazky/p5/zlo3-osa.svg", 400, 100, `Číselná osa od 0 do 1 rozdělená na ${OSA2.dily} stejných dílů, šipka A ukazuje na ${OSA2.a}. dílek a šipka B na ${OSA2.b}. dílek`)),
  mk("P5_ZLO_44", "p5_o_zlomek", 3, "Aleš má o třetinu víc kuliček než Boris. Dohromady mají 28 kuliček. Kolik kuliček má Boris?", null, [
    "Borisovy kuličky rozdělíme na 3 stejné díly. Aleš má o třetinu víc, tedy 4 takové díly.",
    "Dohromady je to 3 + 4 = 7 dílů a to je 28 kuliček, jeden díl je 28 : 7 = 4 kuličky.",
    "Boris má 3 · 4 = 12 kuliček (Aleš 16). Zkouška: 12 + 16 = 28. Správně je B).",
  ], 240, { moznosti: ["8", "12", "16", "20", "21"], spravna: 1 }),
  mk("P5_ZLO_45", "p5_cast_celku", 3, "Z 48 žáků si vybralo sportovní kroužek. Polovina z nich chodí na fotbal, čtvrtina na florbal, osmina na plavání a ostatní na jiný sport. Kolik žáků chodí na florbal nebo na plavání?", "18", [
    "Florbal navštěvuje čtvrtina z 48 žáků: 48 : 4 = 12. Plavání navštěvuje osmina: 48 : 8 = 6.",
    "Florbal nebo plavání dohromady vybralo 12 + 6 = 18 žáků.",
    "Zkouška: fotbal 24, florbal 12, plavání 6, jiný sport 48 − 24 − 12 − 6 = 6 žáků, a 24 + 12 + 6 + 6 = 48.",
  ], 210),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ── nezávislé ověření výsledků (zlomky přes čitatel a jmenovatel, hrubá síla) ──
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const A = (id) => { const e = ex.find((x) => x.id === id); return e.moznosti ? e.moznosti[e.spravna] : e.odpoved; };
const cmp = (id, v) => ok(id, String(A(id)).replace(/\s/g, "") === String(v).replace(/\s/g, ""), `${A(id)} vs ${v}`);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const frac = (a, b) => { const g = gcd(a, b); return `${a / g}/${b / g}`; };

cmp("P5_ZLO_31", 40 / 10);
cmp("P5_ZLO_32", frac(KRUH8.barevne, KRUH8.dily));
{ const s = []; for (let x = 3; x <= 3000; x += 3) if (x / 3 === 400) s.push(x); ok("P5_ZLO_33", s.length === 1 && String(s[0]) === A("P5_ZLO_33"), s); }
cmp("P5_ZLO_34", 20 + 20 / 2);
{ const bile = KRUH12.dily - KRUH12.modre - KRUH12.cervene; ok("P5_ZLO_35 počet", bile === 3 && KRUH12.dily === 12); cmp("P5_ZLO_35", frac(bile, KRUH12.dily)); }
{ const zb = 180 - 180 / 2; cmp("P5_ZLO_36", zb / 3); ok("P5_ZLO_36 celá čísla", Number.isInteger(zb / 3)); }
cmp("P5_ZLO_37", 360 + 360 / 10);
{
  const e = ex.find((x) => x.id === "P5_ZLO_38"), val = [[1, 2], [3, 4], [5, 6], [7, 8], [2, 3]].map(([a, b]) => 1 - a / b);
  const mn = Math.min(...val), idx = val.map((v, i) => (Math.abs(v - mn) < 1e-12 ? i : -1)).filter((i) => i >= 0);
  ok("P5_ZLO_38", idx.length === 1 && idx[0] === e.spravna, idx);
}
{ const s = []; for (let x = 5; x <= 1000; x += 5) if (x - (3 * x) / 5 === 80) s.push(x); ok("P5_ZLO_39", s.length === 1 && String(s[0]) === A("P5_ZLO_39"), s); }
cmp("P5_ZLO_40", (60 / 3) * 2 + 60 / 4);
{ const s = []; for (let x = 12; x <= 600; x += 12) if (x - x / 3 - x / 4 === 25) s.push(x); ok("P5_ZLO_41", s.length === 1 && String(s[0]) === A("P5_ZLO_41"), s); }
{ const s = []; for (let j = 4; j <= 400; j += 4) { const h = j - j / 4; if (h === 36) s.push(h + j); } ok("P5_ZLO_42", s.length === 1 && String(s[0]) === A("P5_ZLO_42"), s); }
cmp("P5_ZLO_43", frac(OSA2.b - OSA2.a, OSA2.dily));
{ const e = ex.find((x) => x.id === "P5_ZLO_44"), s = []; for (let b = 3; b <= 300; b += 3) if (b + b + b / 3 === 28) s.push(b); ok("P5_ZLO_44", s.length === 1 && e.moznosti[e.spravna] === String(s[0]) && e.moznosti.filter((m) => Number(m) === s[0]).length === 1, s); }
{ const z = 48, f = z / 2, l = z / 4, p = z / 8; ok("P5_ZLO_45 zlomky", Number.isInteger(l) && Number.isInteger(p) && z - f - l - p === p); cmp("P5_ZLO_45", l + p); }

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
ok("zkrácení", N.checkAnswer("3/12", "1/4") && N.checkAnswer("4/10", "2/5") && N.checkAnswer("2/5", "2/5"));
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
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Zlomky a části celku, třetí dávka (15 úloh)` : "5. třída — Zlomky a části celku, třetí dávka: část z celku, zbytek, o zlomek, porovnání, zlomek na kruhu a na ose, kruhový diagram (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
