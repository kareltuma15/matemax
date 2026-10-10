// Zlomky L1 s obrázky (ZLN1_01–10) a Souhrnné L1 (SOU1_10–19) — CERMAT styl, vlastní obrázky.
// Spuštění: node scripts/gen-zlomky2-svg.mjs && node scripts/build-zlomky-l1.mjs → doplní/přepíše tyto úlohy v src/data/nahled-batch.json.
// Každá odpověď se nezávisle přepočítá; A–E má právě jednu správnou možnost. Bez pravděpodobnosti, funkcí, kombinatoriky a obvodových úhlů (nejsou v CERMATu).
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const img = (file, width, height, alt) => ({ kind: "static", url: `/obrazky/zlomky/${file}`, width, height, alt });
const IMG = {
  obdelnik: img("l1-obdelnik-5z8.svg", 184, 104, "Obdélník rozdělený na 8 shodných částí, 5 z nich je šedých"),
  kruh46: img("l1-kruh-4z6.svg", 180, 180, "Kruh rozdělený na 6 shodných výsečí, 4 z nich jsou šedé"),
  ctverec: img("l1-ctverec-3x3.svg", 146, 142, "Čtverec rozdělený na 9 shodných čtverečků, šest z nich je šedých"),
  osaOsminy: img("l1-osa-osminy.svg", 370, 100, "Číselná osa od 0 do 1 rozdělená na osm shodných dílků, bod X je u pátého dílku"),
  osaCtvrtiny: img("l1-osa-ctvrtiny.svg", 370, 100, "Číselná osa od 0 do 2 rozdělená na osm shodných dílků, bod X je u sedmého dílku"),
  porovnani: img("l1-porovnani.svg", 224, 160, "Dva obdélníky stejné délky: první má 4 shodné části a 3 jsou šedé, druhý má 8 shodných částí a 5 je šedých"),
  pruh: img("l1-pruh.svg", 316, 106, "Pruh rozdělený na 12 shodných dílků: 4 červené, 3 modré, zbytek bílý"),
  kolace: img("l1-kolace.svg", 348, 92, "Tři celé koláče rozdělené na poloviny a jedna polovina koláče"),
  mrizka: img("l1-mrizka-15z20.svg", 192, 156, "Mřížka 4 × 5 = 20 shodných polí, 15 z nich je šedých"),
  kruh38: img("l1-kruh-3z8.svg", 180, 180, "Kruh rozdělený na 8 shodných výsečí, 3 z nich jsou šedé"),
  tabKrouzky: { kind: "tabulka", nazev: "Kroužky ve škole", hlavicka: ["Kroužek", "Počet dětí"], radky: [["Fotbal", 12], ["Šachy", 8], ["Kreslení", 5]] },
};

const mk = (id, tema, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({ id, tema, podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1 });
const typed = mk;
const choice = (id, tema, podtema, level, zadani, moznosti, spravna, kroky, cas, extra = {}) => mk(id, tema, podtema, level, zadani, moznosti[spravna], kroky, cas, { moznosti, spravna, ...extra });
const Z = (id, podtema, zadani, odpoved, kroky, cas, extra) => typed(id, "zlomky", podtema, 1, zadani, odpoved, kroky, cas, extra);
const S = (id, podtema, zadani, odpoved, kroky, cas, extra) => typed(id, "souhrnne", podtema, 1, zadani, odpoved, kroky, cas, extra);

const ZAP = " Výsledek zapište zlomkem v základním tvaru.";
const ex = [
  // ───────── Zlomky L1 s obrázky ─────────
  Z("ZLN1_01", "cast_obrazce", "Jaká část obdélníku je šedá (viz obrázek)? Výsledek zapište zlomkem.", "5/8", ["Obdélník je rozdělen na 8 shodných částí.", "Šedých částí je 5, šedá je tedy 5/8 obdélníku."], 45, { image: IMG.obdelnik }),
  Z("ZLN1_02", "cast_obrazce", "Jakou část kruhu tvoří šedé výseče (viz obrázek)?" + ZAP, "2/3", ["Kruh má 6 shodných výsečí, šedé jsou 4.", "4/6 zkrátíme dvěma: 2/3."], 60, { image: IMG.kruh46 }),
  Z("ZLN1_03", "cast_obrazce", "Jaká část čtverce není šedá (viz obrázek)?" + ZAP, "1/3", ["Čtverec je rozdělen na 9 shodných čtverečků, šedých je 6, bílé jsou 3.", "Bílá část je 3/9 = 1/3."], 60, { image: IMG.ctverec }),
  Z("ZLN1_04", "ciselna_osa", "Který zlomek odpovídá bodu X na číselné ose (viz obrázek)?", "5/8", ["Úsek od 0 do 1 je rozdělen na 8 shodných dílků, jeden dílek je 1/8.", "Bod X leží u pátého dílku, odpovídá mu tedy 5/8."], 60, { image: IMG.osaOsminy }),
  Z("ZLN1_05", "ciselna_osa", "Které číslo odpovídá bodu X na číselné ose (viz obrázek)? Zapište ho nevlastním zlomkem.", "7/4", ["Mezi 0 a 1 jsou 4 shodné dílky, jeden dílek je 1/4.", "Bod X leží u sedmého dílku, odpovídá mu tedy 7/4 (což je 1 3/4)."], 75, { image: IMG.osaCtvrtiny }),
  choice("ZLN1_06", "zlomky", "porovnavani", 1, "Oba obdélníky na obrázku mají stejnou délku i šířku. Ve kterém z nich je šedá část větší?", ["v prvním obdélníku", "ve druhém obdélníku", "v obou je šedá část stejně velká"], 0, [
    "První obdélník: šedé jsou 3 ze 4 částí, tedy 3/4 = 6/8.", "Druhý obdélník: šedých je 5 z 8 částí, tedy 5/8.", "6/8 > 5/8, šedá část je větší v prvním obdélníku.",
  ], 90, { image: IMG.porovnani }),
  Z("ZLN1_07", "cast_obrazce", "Jaká část pruhu je bílá (viz obrázek)?" + ZAP, "5/12", ["Pruh má 12 shodných dílků: 4 červené, 3 modré.", "Bílých dílků je 12 − 4 − 3 = 5, bílá část je 5/12."], 75, { image: IMG.pruh }),
  Z("ZLN1_08", "smisena_cisla", "Kolik koláčů je na obrázku? Výsledek zapište nevlastním zlomkem se jmenovatelem 2.", "7/2", ["Každý celý koláč jsou 2 poloviny: 3 celé koláče je 3 · 2 = 6 polovin.", "K tomu ještě 1 polovina: celkem 7 polovin, tedy 7/2 koláče (3 1/2)."], 75, { image: IMG.kolace }),
  Z("ZLN1_09", "cast_obrazce", "Kolik procent mřížky je šedých (viz obrázek)?", "75 %", ["Mřížka má 4 · 5 = 20 polí, šedých je 15.", "15/20 = 3/4 = 75 %."], 75, { image: IMG.mrizka }),
  choice("ZLN1_10", "zlomky", "cast_obrazce", 1, "Jaká část kruhu není šedá (viz obrázek)?", ["3/8", "1/2", "5/8", "3/5", "jiná část"], 2, ["Kruh má 8 shodných výsečí, šedé jsou 3, bílých je 5.", "Bílá část je 5/8. Správně je C). (3/8 je šedá část.)"], 60, { image: IMG.kruh38 }),

  // ───────── Souhrnné L1 ─────────
  S("SOU1_10", "zlomky_geometrie", "Strana čtverce měří 12 cm. Kolik centimetrů je jedna třetina jeho obvodu?", "16 cm", ["Obvod čtverce: 4 · 12 = 48 cm.", "Třetina obvodu: 48 : 3 = 16 cm."], 75),
  S("SOU1_11", "procenta_geometrie", "Obdélník má rozměry 20 cm a 10 cm. Kratší stranu zmenšíme na polovinu. Jaký bude obsah nového obdélníku?", "100 cm²", ["Kratší strana je 10 cm, polovina je 5 cm.", "Nový obdélník má rozměry 20 cm a 5 cm, obsah 20 · 5 = 100 cm²."], 75),
  S("SOU1_12", "rovnice_geometrie", "Strana čtverce měří x + 3 cm a obvod čtverce je 28 cm. Určete x.", "4", ["Obvod: 4 · (x + 3) = 28.", "x + 3 = 7, takže x = 4.", "Kontrola: strana 7 cm, obvod 28 cm."], 90),
  S("SOU1_13", "zlomky_slovni", "Karel přečetl tři pětiny knihy, což je 90 stran. Kolik stran má celá kniha?", "150", ["Tři pětiny knihy jsou 90 stran, jedna pětina je 90 : 3 = 30 stran.", "Celá kniha (5 pětin): 5 · 30 = 150 stran."], 90),
  S("SOU1_14", "procenta_slovni", "Jízdenka stála 40 Kč a zdražila o 25 %. Kolik korun stojí teď?", "50 Kč", ["25 % ze 40 Kč je 40 : 4 = 10 Kč.", "Nová cena: 40 + 10 = 50 Kč."], 75),
  S("SOU1_15", "geometrie_pytagoras", "Pravoúhlý trojúhelník má odvěsny 9 cm a 12 cm. Jaký je jeho obvod?", "36 cm", ["Přepona: √(9² + 12²) = √225 = 15 cm.", "Obvod: 9 + 12 + 15 = 36 cm."], 90),
  S("SOU1_16", "zlomky_procenta", "Kolik procent hodiny tvoří 15 minut?", "25 %", ["Hodina má 60 minut.", "15/60 = 1/4 = 25 %."], 60),
  S("SOU1_17", "rovnice_slovni", "Myslím si číslo. Když ho vynásobím třemi a přičtu 5, dostanu 26. Které číslo si myslím?", "7", ["3x + 5 = 26.", "3x = 21, takže x = 7.", "Kontrola: 3 · 7 + 5 = 26."], 75),
  S("SOU1_18", "geometrie_slovni", "Obdélníkový pozemek měří 30 m × 20 m. Kolik metrů pletiva je potřeba na oplocení celého pozemku?", "100 m", ["Obvod obdélníku: 2 · (30 + 20) = 2 · 50 = 100 m."], 60),
  S("SOU1_19", "tabulka_procenta", "Tabulka ukazuje, kolik dětí chodí do kroužků. Kolik procent všech dětí v tabulce chodí na fotbal?", "48 %", ["Dětí je celkem 12 + 8 + 5 = 25.", "Na fotbal chodí 12 z 25 dětí: 12/25 = 48/100 = 48 %."], 90, { image: IMG.tabKrouzky }),
];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const close = (a, b) => Math.abs(a - b) < 1e-9;
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const val = (id) => N.toValue(by[id].odpoved ?? "");
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const red = (n, d) => `${n / gcd(n, d)}/${d / gcd(n, d)}`;
// počty se berou ze stejných dat, ze kterých jsou kresleny obrázky v gen-zlomky2-svg.mjs
ok("01", red(5, 8) === "5/8" && by.ZLN1_01.odpoved === "5/8");
ok("02", red(4, 6) === "2/3" && by.ZLN1_02.odpoved === "2/3");
ok("03", red(9 - 6, 9) === "1/3" && by.ZLN1_03.odpoved === "1/3");
ok("04", by.ZLN1_04.odpoved === "5/8" && close(5 / 8, val("ZLN1_04")));
ok("05", close(7 / 4, val("ZLN1_05")) && N.checkAnswer("1 3/4", "7/4") && N.checkAnswer("1,75", "7/4"));
ok("06", 3 / 4 > 5 / 8 && by.ZLN1_06.odpoved === "v prvním obdélníku");
ok("07", 12 - 4 - 3 === 5 && by.ZLN1_07.odpoved === "5/12");
ok("08", 3 * 2 + 1 === 7 && close(val("ZLN1_08"), 3.5) && N.checkAnswer("3,5", "7/2"));
ok("09", close((15 / 20) * 100, 75) && val("ZLN1_09") === 75);
ok("10", 8 - 3 === 5 && by.ZLN1_10.odpoved === "5/8");
ok("S10", 4 * 12 / 3 === 16 && val("SOU1_10") === 16);
ok("S11", 20 * (10 / 2) === 100 && val("SOU1_11") === 100);
{ let sol = []; for (let x = 0; x < 50; x++) if (4 * (x + 3) === 28) sol.push(x); ok("S12", sol.length === 1 && sol[0] === 4 && val("SOU1_12") === 4, sol); }
ok("S13", (90 / 3) * 5 === 150 && val("SOU1_13") === 150);
ok("S14", close(40 * 1.25, 50) && val("SOU1_14") === 50);
ok("S15", close(Math.hypot(9, 12), 15) && 9 + 12 + 15 === 36 && val("SOU1_15") === 36);
ok("S16", close((15 / 60) * 100, 25) && val("SOU1_16") === 25);
{ let sol = []; for (let x = 0; x < 100; x++) if (3 * x + 5 === 26) sol.push(x); ok("S17", sol.length === 1 && sol[0] === 7 && val("SOU1_17") === 7, sol); }
ok("S18", 2 * (30 + 20) === 100 && val("SOU1_18") === 100);
{ const t = IMG.tabKrouzky.radky.reduce((s, r) => s + r[1], 0); ok("S19", t === 25 && close((12 / t) * 100, 48) && val("SOU1_19") === 48); }
for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", new Set(e.moznosti).size === e.moznosti.length && e.odpoved === e.moznosti[e.spravna]);
  else ok(e.id + " vyhodnotitelná odpověď", (N.toValue(e.odpoved) !== null) && N.checkAnswer(e.odpoved, e.odpoved), e.odpoved);
  if (e.image?.kind === "static") ok(e.id + " soubor", fs.existsSync("public" + e.image.url), e.image.url);
  if (/pravděpodob|náhodně|funkc|kombinat|středový|obvodový|absolutn/i.test(e.zadani)) ok(e.id + " téma mimo CERMAT", false);
}
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 20);
const all = ["databaze", "cermat-200", "doplnky-uhly-souhrnne", "konstrukce-interaktivni"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
ok("bez duplicit zadání", ex.every((e) => !all.some((x) => x.zadani === e.zadani)));
console.log(`úloh: ${ex.length} (zlomky ${ex.filter((e) => e.tema === "zlomky").length}, souhrnné ${ex.filter((e) => e.tema === "souhrnne").length}), chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^(ZLN1_|SOU1_1\d)/.test(e.id));
const nazev = others.length ? `${prev.nazev} + Zlomky L1 a Souhrnné L1 (20 úloh)` : "Zlomky L1 s obrázky (10) a Souhrnné L1 (10) — 20 úloh";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length})`);
