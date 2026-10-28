// 5. třída, okruh „Zlomky a části celku", druhá dávka (P5_ZLO_16–30): část z celku, celek z části, zbytek, o zlomek, porovnání, zlomek na ose a na obrazci.
// Styl podle úloh 9–13 oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Jen učivo 4.–5. třídy: bez sčítání zlomků s různými jmenovateli v zápise, bez dělení zlomků; počítá se „částmi" celku (Karel).
// Spuštění: node scripts/build-5-zlomky2.mjs → nakreslí public/obrazky/p5/zlo2-*.svg a doplní/přepíše P5_ZLO_16–30 v src/data/nahled-batch.json (jiné dávky nechá).
// Každý výsledek se v tomto skriptu nezávisle přepočítá (zlomky v celých číslech, hrubá síla); obrázky se kreslí ze stejných dat, ze kterých se zlomek spočítá.
import fs from "node:fs";
import { NAVY, text, line, makeWriter } from "./lib/svg.mjs";
const N = await import("../src/lib/normalize.ts");

const { write } = makeWriter("p5");
const FILL = "#cfe3f7";
const FILL2 = "#f6d3cc";

// ── data obrázků ──
const OSA = { dily: 8, bod: 5 }; // číselná osa od 0 do 1, šipka na 5/8
const MRIZKA = ["#####", "####.", "###..", "#...."]; // „#" = vybarvené políčko
const mrizkaBarevne = MRIZKA.join("").split("#").length - 1;
const mrizkaCelkem = MRIZKA.join("").length;
const PASEK2 = { dily: 12, modre: 5, cervene: 3 }; // zbytek bílé

{
  const w = 400, h = 96, x0 = 30, x1 = 370, y = 56, d = (x1 - x0) / OSA.dily;
  let body = `  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>\n`;
  body += line(x0, y, x1, y, { w: 2.5 }) + "\n";
  for (let i = 0; i <= OSA.dily; i++) body += line(x0 + i * d, y - 9, x0 + i * d, y + 9, { w: 2 }) + "\n";
  body += text(x0, y + 28, "0", { size: 16, fill: NAVY }) + "\n" + text(x1, y + 28, "1", { size: 16, fill: NAVY }) + "\n";
  const bx = x0 + OSA.bod * d;
  body += `  <polygon points="${bx},${y - 4} ${bx - 8},${y - 24} ${bx + 8},${y - 24}" fill="#c0392b"/>\n`;
  body += text(bx, y - 30, "?", { size: 16, fill: "#c0392b" }) + "\n";
  write("zlo2-osa.svg", w, h, body, `Číselná osa od 0 do 1 rozdělená na ${OSA.dily} stejných dílů, šipka ukazuje na ${OSA.bod}. dílek`);
}
{
  const c = 36, m = 14, W = MRIZKA[0].length, H = MRIZKA.length, w = W * c + 2 * m, h = H * c + 2 * m;
  let body = `  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>\n`;
  MRIZKA.forEach((r, y) => [...r].forEach((k, x) => { body += `  <rect x="${m + x * c}" y="${m + y * c}" width="${c}" height="${c}" fill="${k === "#" ? FILL : "#ffffff"}" stroke="${NAVY}" stroke-width="1.6"/>\n`; }));
  write("zlo2-mrizka.svg", w, h, body, `Obdélník ze čtverečků, ${H} řádky po ${W} čtverečcích; vybarvených je ${mrizkaBarevne} z ${mrizkaCelkem}`);
}
{
  const cw = 30, ch = 40, m = 14, w = PASEK2.dily * cw + 2 * m, h = ch + 2 * m;
  let body = `  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>\n`;
  for (let i = 0; i < PASEK2.dily; i++) {
    const modra = i < PASEK2.modre, cerv = !modra && i < PASEK2.modre + PASEK2.cervene;
    body += `  <rect x="${m + i * cw}" y="${m}" width="${cw}" height="${ch}" fill="${modra ? FILL : cerv ? FILL2 : "#ffffff"}" stroke="${NAVY}" stroke-width="2"/>\n`;
    if (modra || cerv) body += text(m + i * cw + cw / 2, m + ch / 2 + 6, modra ? "M" : "Č", { size: 16, fill: NAVY }) + "\n";
  }
  write("zlo2-pasek.svg", w, h, body, `Pásek ze ${PASEK2.dily} stejných dílů: ${PASEK2.modre} modrých (M), ${PASEK2.cervene} červené (Č), ostatní bílé`);
}

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_zlomky", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const img = (url, w, h, alt) => ({ image: { kind: "static", url, width: w, height: h, alt } });

const ex = [
  // ───────── L1 ─────────
  mk("P5_ZLO_16", "p5_cast_celku", 1, "Škola má 90 žáků. Třetina z nich jede na výlet. Kolik žáků jede na výlet?", "30", [
    "Třetina znamená rozdělit na 3 stejné díly: 90 : 3.",
    "90 : 3 = 30 žáků.",
  ], 60),
  mk("P5_ZLO_17", "p5_cast_celku", 1, "Šestina cesty měří 7 kilometrů. Kolik kilometrů měří celá cesta?", "42", [
    "Celá cesta má 6 stejných dílů a jeden díl (šestina) měří 7 km.",
    "6 · 7 = 42 km.",
  ], 75),
  mk("P5_ZLO_18", "p5_zlomek_obrazku", 1, "Na číselné ose je mezi 0 a 1 vyznačeno 8 stejných dílů. Jaké číslo ukazuje šipka? Odpověď napiš zlomkem.", "5/8", [
    "Úsek od 0 do 1 je rozdělený na 8 stejných dílů, takže každý díl je jedna osmina.",
    "Šipka ukazuje na konec pátého dílu, tedy 5 osmin: 5/8.",
  ], 75, img("/obrazky/p5/zlo2-osa.svg", 400, 96, `Číselná osa od 0 do 1 rozdělená na ${OSA.dily} stejných dílů, šipka ukazuje na ${OSA.bod}. dílek`)),
  mk("P5_ZLO_19", "p5_porovnani", 1, "Kolik osmin je dohromady stejně jako jedna čtvrtina?", "2", [
    "Čtvrtina je celek rozdělený na 4 díly, osmina je celek rozdělený na 8 dílů, takže jedna čtvrtina se skládá ze 2 osmin.",
    "Jedna čtvrtina je tedy 2 osminy (1/4 = 2/8).",
  ], 90),
  // ───────── L2 ─────────
  mk("P5_ZLO_20", "p5_zbytek", 2, "V košíku bylo 48 jablek. Tři osminy z nich byly nahnilé. Kolik jablek v košíku zůstalo dobrých?", "30", [
    "Jedna osmina je 48 : 8 = 6 jablek, tři osminy jsou 3 · 6 = 18 nahnilých jablek.",
    "Dobrých zůstalo 48 − 18 = 30 jablek. Zkouška: dobrých je pět osmin, 5 · 6 = 30.",
  ], 120),
  mk("P5_ZLO_21", "p5_zlomek_obrazku", 2, "Obdélník je rozdělený na stejné čtverečky. Jakou část obdélníku tvoří nevybarvené čtverečky? Napiš zlomek v základním tvaru.", "7/20", [
    "Čtverečků je celkem 4 · 5 = 20. Vybarvených je 5 + 4 + 3 + 1 = 13, nevybarvených je tedy 20 − 13 = 7.",
    "Nevybarvená část je 7/20. Zlomek už nejde zkrátit, protože 7 a 20 nemají společného dělitele.",
  ], 120, img("/obrazky/p5/zlo2-mrizka.svg", 208, 172, `Obdélník ze čtverečků, ${MRIZKA.length} řádky po ${MRIZKA[0].length} čtverečcích; vybarvených je ${mrizkaBarevne} z ${mrizkaCelkem}`)),
  mk("P5_ZLO_22", "p5_o_zlomek", 2, "Tričko stálo 240 korun. Cenu snížili o čtvrtinu. Kolik korun tričko stojí teď?", "180", [
    "Čtvrtina ze 240 Kč je 240 : 4 = 60 Kč.",
    "Nová cena je 240 − 60 = 180 Kč. Zkouška: zbyly tři čtvrtiny, 3 · 60 = 180.",
  ], 105),
  mk("P5_ZLO_23", "p5_zbytek", 2, "V krabici bylo 36 sušenek. Ondra snědl třetinu sušenek a Eva čtvrtinu. Kolik sušenek zbylo?", "15", [
    "Ondra snědl 36 : 3 = 12 sušenek a Eva 36 : 4 = 9 sušenek.",
    "Dohromady snědli 12 + 9 = 21 sušenek, zbylo 36 − 21 = 15.",
  ], 120),
  mk("P5_ZLO_24", "p5_porovnani", 2, "Který z uvedených údajů je největší?", null, [
    "Každou část vypočítáme: polovina z 18 je 9, třetina z 36 je 12, čtvrtina z 60 je 15, pětina z 50 je 10 a desetina z 80 je 8.",
    "Největší číslo je 15, tedy čtvrtina z 60. Správně je C).",
  ], 150, { moznosti: ["polovina z 18", "třetina z 36", "čtvrtina z 60", "pětina z 50", "desetina z 80"], spravna: 2 }),
  mk("P5_ZLO_25", "p5_cast_celku", 2, "Dvě pětiny knih v knihovně jsou pohádky. Pohádek je 36. Kolik knih je v knihovně celkem?", "90", [
    "Dvě pětiny knih je 36, takže jedna pětina je 36 : 2 = 18 knih.",
    "Všech knih je pět pětin: 5 · 18 = 90. Zkouška: dvě pětiny z 90 je 2 · 18 = 36.",
  ], 135),
  // ───────── L3 ─────────
  mk("P5_ZLO_26", "p5_zbytek", 3, "První hodinu ušel Petr pětinu cesty, druhou hodinu dvě pětiny cesty. Do cíle mu zbývá ještě 12 kilometrů. Jak dlouhá je celá cesta?", "30", [
    "Za dvě hodiny ušel jednu a dvě pětiny, tedy 3 pětiny cesty. Zbývají mu 2 pětiny cesty.",
    "Dvě pětiny cesty jsou 12 km, takže jedna pětina je 6 km.",
    "Celá cesta měří 5 · 6 = 30 km. Zkouška: za dvě hodiny ušel 3 · 6 = 18 km a 18 + 12 = 30.",
  ], 210),
  mk("P5_ZLO_27", "p5_o_zlomek", 3, "Eva ve středu přečetla třetinu knihy a ve čtvrtek dalších 20 stran. Teď jí zbývá přečíst přesně polovinu knihy. Kolik stran má kniha?", "120", [
    "Přečetla třetinu a 20 stran a zbývá jí polovina, takže přečetla také polovinu knihy.",
    "Půl knihy je o třetinu knihy víc než jedna třetina. Polovina je 3/6 a třetina 2/6, rozdíl je jedna šestina knihy, a to je 20 stran.",
    "Celá kniha má 6 · 20 = 120 stran. Zkouška: třetina je 40, přečetla 40 + 20 = 60 stran a zbývá 120 − 60 = 60, což je polovina.",
  ], 240),
  mk("P5_ZLO_28", "p5_zlomek_obrazku", 3, "Pásek je rozdělený na stejné díly. Modrých dílů je pět, červené jsou tři a ostatní jsou bílé. Jakou část pásku tvoří bílé díly? Napiš zlomek v základním tvaru.", "1/3", [
    "Pásek má 12 stejných dílů. Modrých je 5 a červených 3, dohromady 8 vybarvených dílů.",
    "Bílých je 12 − 8 = 4 díly, tedy 4/12. Zlomek zkrátíme čtyřmi: 4/12 = 1/3.",
  ], 150, img("/obrazky/p5/zlo2-pasek.svg", 388, 68, `Pásek ze ${PASEK2.dily} stejných dílů: ${PASEK2.modre} modrých (M), ${PASEK2.cervene} červené (Č), ostatní bílé`)),
  mk("P5_ZLO_29", "p5_zbytek", 3, "Vodu z barelu nalili do tří nádob. Do první třetinu vody, do druhé polovinu vody a do třetí zbylých 5 litrů. Kolik litrů vody bylo v barelu?", null, [
    "Třetina a polovina dohromady jsou 2/6 + 3/6 = 5/6 vody.",
    "Do třetí nádoby zbyla jedna šestina vody a to je 5 litrů.",
    "V barelu bylo 6 · 5 = 30 litrů. Zkouška: třetina je 10, polovina je 15 a 10 + 15 + 5 = 30. Správně je B).",
  ], 240, { moznosti: ["15", "30", "45", "60", "75"], spravna: 1 }),
  mk("P5_ZLO_30", "p5_o_zlomek", 3, "Polovina neznámého čísla je o 12 větší než jeho čtvrtina. Které je to číslo?", "48", [
    "Polovina čísla se od jeho čtvrtiny liší o čtvrtinu čísla (2/4 − 1/4 = 1/4).",
    "Jedna čtvrtina čísla je tedy 12, celé číslo je 4 · 12 = 48.",
    "Zkouška: polovina z 48 je 24, čtvrtina je 12 a 24 − 12 = 12.",
  ], 210),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ── nezávislé ověření výsledků (zlomky přes čitatel a jmenovatel, hrubá síla) ──
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const A = (id) => { const e = ex.find((x) => x.id === id); return e.moznosti ? e.moznosti[e.spravna] : e.odpoved; };
const cmp = (id, v) => ok(id, String(A(id)).replace(/\s/g, "") === String(v).replace(/\s/g, ""), `${A(id)} vs ${v}`);
const gcd = (a, b) => (b ? gcd(b, a % b) : a);

cmp("P5_ZLO_16", 90 / 3);
cmp("P5_ZLO_17", 7 * 6);
{ const g = gcd(OSA.bod, OSA.dily); cmp("P5_ZLO_18", `${OSA.bod / g}/${OSA.dily / g}`); }
{ const s = []; for (let k = 1; k <= 20; k++) if (k * 4 === 8) s.push(k); ok("P5_ZLO_19", s.length === 1 && String(s[0]) === A("P5_ZLO_19"), s); }
cmp("P5_ZLO_20", 48 - (48 / 8) * 3);
{ ok("P5_ZLO_21 sloupce", MRIZKA.every((r) => r.length === MRIZKA[0].length)); const nev = mrizkaCelkem - mrizkaBarevne; const g = gcd(nev, mrizkaCelkem); ok("P5_ZLO_21 počet", mrizkaBarevne === 13 && mrizkaCelkem === 20); cmp("P5_ZLO_21", `${nev / g}/${mrizkaCelkem / g}`); }
cmp("P5_ZLO_22", 240 - 240 / 4);
cmp("P5_ZLO_23", 36 - 36 / 3 - 36 / 4);
{
  const e = ex.find((x) => x.id === "P5_ZLO_24"), val = [18 / 2, 36 / 3, 60 / 4, 50 / 5, 80 / 10];
  const mx = Math.max(...val), idx = val.map((v, i) => (v === mx ? i : -1)).filter((i) => i >= 0);
  ok("P5_ZLO_24", idx.length === 1 && idx[0] === e.spravna && Number.isInteger(18 / 2 + 36 / 3 + 60 / 4 + 50 / 5 + 80 / 10), idx);
}
{ const s = []; for (let x = 5; x <= 1000; x += 5) if (x * 2 / 5 === 36) s.push(x); ok("P5_ZLO_25", s.length === 1 && String(s[0]) === A("P5_ZLO_25"), s); }
{ const s = []; for (let x = 5; x <= 1000; x += 5) if (x - x / 5 - 2 * x / 5 === 12) s.push(x); ok("P5_ZLO_26", s.length === 1 && String(s[0]) === A("P5_ZLO_26"), s); }
{ const s = []; for (let x = 6; x <= 1000; x += 6) if (x - x / 3 - 20 === x / 2) s.push(x); ok("P5_ZLO_27", s.length === 1 && String(s[0]) === A("P5_ZLO_27"), s); }
{ const bile = PASEK2.dily - PASEK2.modre - PASEK2.cervene, g = gcd(bile, PASEK2.dily); ok("P5_ZLO_28 počet", bile === 4 && PASEK2.dily === 12); cmp("P5_ZLO_28", `${bile / g}/${PASEK2.dily / g}`); }
{ const e = ex.find((x) => x.id === "P5_ZLO_29"), s = []; for (let x = 6; x <= 300; x += 6) if (x - x / 3 - x / 2 === 5) s.push(x); ok("P5_ZLO_29", s.length === 1 && e.moznosti[e.spravna] === String(s[0]) && e.moznosti.filter((m) => Number(m) === s[0]).length === 1, s); }
{ const s = []; for (let x = 4; x <= 1000; x += 4) if (x / 2 - x / 4 === 12) s.push(x); ok("P5_ZLO_30", s.length === 1 && String(s[0]) === A("P5_ZLO_30"), s); }

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
ok("zkrácení 4/12", N.checkAnswer("4/12", "1/3") && N.checkAnswer("1/3", "1/3") && N.checkAnswer("10/16", "5/8"));
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
const nazev = others.length ? `${prev.nazev} + 5. třída: Zlomky a části celku, druhá dávka (15 úloh)` : "5. třída — Zlomky a části celku, druhá dávka: část z celku, celek z části, zbytek, o zlomek, porovnání, zlomek na ose a na obrazci (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
