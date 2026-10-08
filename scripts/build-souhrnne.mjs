// Souhrnné úlohy (CERMAT styl): L1 ×6 (dvě témata najednou, základ) a L3 ×13 (složené úlohy z více kapitol, obrázky, tabulka, ano/ne).
// Spuštění: node scripts/build-souhrnne.mjs  → doplní/přepíše SOU1_* a SOU3_* v src/data/nahled-batch.json (ostatní dávky nechá).
// Každá odpověď se nezávisle přepočítá; psané odpovědi musí jít vyhodnotit (toValue), A–E musí mít právě jednu správnou možnost.
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const img = (file, width, height, alt) => ({ kind: "static", url: `/obrazky/souhrnne/${file}`, width, height, alt });
const IMG = {
  pozemky: img("pozemky.svg", 330, 176, "Čtvercový pozemek o straně a a obdélníkový pozemek o stranách 0,8a a a + 12 (obrázek není v měřítku)"),
  kruh: img("kruh-ve-ctverci.svg", 220, 214, "Čtverec o straně 10 cm s vepsaným kruhem; šedé jsou části čtverce mimo kruh"),
  zahrada: img("zahrada.svg", 330, 196, "Obdélníková zahrada 20 m × 12 m, uvnitř čtvercový záhon o straně 4 m, zbytek je trávník"),
};

const base = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "souhrnne", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const typed = (id, podtema, level, zadani, odpoved, kroky, cas, extra) => base(id, podtema, level, zadani, odpoved, kroky, cas, extra);
const choice = (id, podtema, level, zadani, moznosti, spravna, kroky, cas, extra = {}) =>
  base(id, podtema, level, zadani, moznosti[spravna], kroky, cas, { moznosti, spravna, ...extra });
const anoNe = (id, podtema, level, zadani, pravda, kroky, cas, extra) =>
  base(id, podtema, level, zadani, pravda ? "Ano" : "Ne", kroky, cas, { moznosti: ["Ano", "Ne"], spravna: pravda ? 0 : 1, ...extra });

const zahradaStem = "Zahrada má tvar obdélníku o rozměrech 20 m × 12 m. Uvnitř je čtvercový záhon o straně 4 m, zbytek zahrady je trávník (viz obrázek). Rozhodněte, zda je tvrzení pravdivé.";
const pozemekStem = "Čtvercový pozemek má stejný obvod jako obdélníkový pozemek. Jedna strana obdélníkového pozemku je o 20 % kratší než strana čtvercového pozemku a druhá strana je o 12 m delší než strana čtvercového pozemku (viz obrázek).";

const ex = [
  // ───────── L1 ─────────
  typed("SOU1_04", "rovnice_geometrie", 1, "Vyřešte rovnici 2x − 3 = 9. Číslo x je délka strany čtverce v centimetrech. Jaký je obsah tohoto čtverce?", "36 cm²", [
    "Rovnice: 2x = 12, takže x = 6.", "Čtverec o straně 6 cm má obsah 6 · 6 = 36 cm².",
  ], 90),
  typed("SOU1_05", "zlomky_procenta", 1, "Tři čtvrtiny ceny knihy jsou 90 Kč. Kolik korun je 20 % z ceny knihy?", "24 Kč", [
    "Jedna čtvrtina ceny je 90 : 3 = 30 Kč, celá kniha stojí 4 · 30 = 120 Kč.", "20 % ze 120 Kč je 0,2 · 120 = 24 Kč.",
  ], 90),
  typed("SOU1_06", "geometrie_rovnice", 1, "Obdélník má šířku 4 cm a obvod 18 cm. Jaký je jeho obsah?", "20 cm²", [
    "Polovina obvodu je 9 cm, takže délka je 9 − 4 = 5 cm.", "Obsah: 4 · 5 = 20 cm².",
  ], 90),
  typed("SOU1_07", "geometrie_pytagoras", 1, "Pravoúhlý trojúhelník má odvěsny 6 cm a 8 cm. Jaký je jeho obvod?", "24 cm", [
    "Přepona podle Pythagorovy věty: √(6² + 8²) = √100 = 10 cm.", "Obvod: 6 + 8 + 10 = 24 cm.",
  ], 90),
  typed("SOU1_08", "rovnice_slovni", 1, "Průměr čtyř čísel je 12. Tři z nich jsou 10, 12 a 14. Jaké je čtvrté číslo?", "12", [
    "Součet čtyř čísel je 4 · 12 = 48.", "Čtvrté číslo: 48 − (10 + 12 + 14) = 48 − 36 = 12.",
  ], 90),
  typed("SOU1_09", "zlomky_procenta", 1, "Čtvrtina žáků třídy je 6 žáků. Kolik procent všech žáků třídy tvoří 9 žáků?", "37,5 %", [
    "Ve třídě je 4 · 6 = 24 žáků.", "9 žáků z 24 je 9 : 24 = 0,375, tedy 37,5 %.",
  ], 120),

  // ───────── L3 ─────────
  typed("SOU3_01", "geometrie_rovnice", 3, `${pozemekStem} Kolik metrů měří strana čtvercového pozemku?`, "60 m", [
    "Stranu čtverce označíme a. Obdélník má strany 0,8a a a + 12.",
    "Stejný obvod: 4a = 2 · (0,8a + a + 12) = 3,6a + 24.",
    "Odtud 0,4a = 24, takže a = 60 m.",
    "Kontrola: obdélník má strany 48 m a 72 m, obvod 240 m = 4 · 60 m.",
  ], 240, { image: IMG.pozemky }),
  choice("SOU3_02", "geometrie_procenta", 3, `${pozemekStem} Kolik procent obsahu čtvercového pozemku tvoří obsah obdélníkového pozemku?`,
    ["80 %", "92 %", "96 %", "100 %", "104 %"], 2, [
      "Ze stejného obvodu vyjde a = 60 m: 4a = 3,6a + 24, takže a = 60.",
      "Čtverec má obsah 60 · 60 = 3 600 m², obdélník 48 · 72 = 3 456 m².",
      "3 456 : 3 600 = 0,96, tedy 96 %. Správně je C). (Při stejném obvodu má čtverec největší obsah, obdélník proto vychází menší.)",
    ], 240, { image: IMG.pozemky }),
  choice("SOU3_03", "geometrie_procenta", 3, "Do čtverce o straně 10 cm je vepsán kruh (viz obrázek). Šedé jsou části čtverce mimo kruh. Kolik procent obsahu čtverce zabírá šedá plocha? Použijte π ≈ 3,14.",
    ["25 %", "50 %", "21,5 %", "78,5 %", "7,85 %"], 2, [
      "Čtverec má obsah 10 · 10 = 100 cm². Kruh má poloměr 5 cm: π · 5² ≈ 3,14 · 25 = 78,5 cm².",
      "Šedá plocha: 100 − 78,5 = 21,5 cm², tedy 21,5 % obsahu čtverce. Správně je C). (78,5 % je podíl samotného kruhu.)",
    ], 180, { image: IMG.kruh }),
  choice("SOU3_04", "geometrie_slovni", 3, "Akvárium tvaru kvádru má rozměry dna 60 cm × 30 cm a výšku 40 cm. Voda v něm sahá do výšky 25 cm. Na dno položíme krychli o hraně 12 cm (celá se ponoří). O kolik centimetrů vystoupí hladina vody?",
    ["0,6 cm", "0,96 cm", "1,2 cm", "1,5 cm", "12 cm"], 1, [
      "Krychle vytlačí vodu o objemu 12 · 12 · 12 = 1 728 cm³ (ponoří se celá, protože 12 cm < 25 cm).",
      "Tento objem se rozloží na dno o obsahu 60 · 30 = 1 800 cm².",
      "Hladina vystoupí o 1 728 : 1 800 = 0,96 cm. Správně je B). (Voda nepřeteče: 25,96 cm < 40 cm.)",
    ], 240, { image: { kind: "parametric", diagram: { typ: "teleso", tvar: "kvadr", a: "60 cm", b: "30 cm", c: "40 cm" } } }),
  typed("SOU3_05", "geometrie_rovnice", 3, "Obvod obdélníku je 44 cm. Kdyby se delší strana zkrátila o 3 cm a kratší strana prodloužila o 3 cm, vznikl by čtverec. Jaký je obsah původního obdélníku?", "112 cm²", [
    "Strany označíme a (delší) a b (kratší): a + b = 22 (polovina obvodu).",
    "Čtverec vznikne, když a − 3 = b + 3, tedy a = b + 6.",
    "Dosadíme: b + 6 + b = 22, takže b = 8 cm a a = 14 cm.",
    "Obsah: 14 · 8 = 112 cm².",
  ], 210),
  typed("SOU3_06", "geometrie_procenta", 3, "Žebřík délky 5 m je opřen o svislou zeď a jeho spodní konec je 3 m od zdi. Spodní konec žebříku odsuneme o 1 m dál od zdi (žebřík se nezkrátí). O kolik procent klesne výška, do které žebřík na zdi dosahuje?", "25 %", [
    "Původní výška: √(5² − 3²) = √16 = 4 m.",
    "Po odsunutí je spodní konec 4 m od zdi, výška je √(5² − 4²) = √9 = 3 m.",
    "Výška klesla o 1 m, což je 1 : 4 = 25 % původní výšky.",
  ], 210),
  typed("SOU3_07", "zlomky_geometrie", 3, "Jedna strana obdélníku je tři čtvrtiny druhé strany. Obvod obdélníku je 56 cm. Jaký je jeho obsah?", "192 cm²", [
    "Delší stranu označíme b, kratší je 3/4 b. Polovina obvodu: b + 3/4 b = 28, tedy 7/4 b = 28.",
    "b = 28 · 4/7 = 16 cm a kratší strana je 3/4 · 16 = 12 cm.",
    "Obsah: 16 · 12 = 192 cm².",
  ], 210),
  choice("SOU3_08", "geometrie_rovnice", 3, "Kvádr má čtvercovou podstavu a jeho výška je dvojnásobkem hrany podstavy (viz obrázek). Objem kvádru je 128 cm³. Jaký je povrch kvádru?",
    ["128 cm²", "144 cm²", "160 cm²", "192 cm²", "256 cm²"], 2, [
      "Hranu podstavy označíme a, výška je 2a. Objem: a · a · 2a = 2a³ = 128, tedy a³ = 64 a a = 4 cm.",
      "Kvádr má rozměry 4 × 4 × 8 cm. Povrch: 2 · (4 · 4) + 4 · (4 · 8) = 32 + 128 = 160 cm². Správně je C). (Číslo 128 je objem, ne povrch.)",
    ], 240, { image: { kind: "parametric", diagram: { typ: "teleso", tvar: "kvadr", a: "a", b: "a", c: "2a" } } }),
  choice("SOU3_09", "tabulka_procenta", 3, "Tabulka ukazuje počty žáků ve třech třídách a počty dívek v nich. Kolik procent všech žáků těchto tří tříd tvoří dívky?",
    ["55 %", "58 %", "60 %", "64 %", "69 %"], 2, [
      "Všech žáků: 28 + 26 + 26 = 80. Dívek: 18 + 12 + 18 = 48.",
      "48 : 80 = 0,6, tedy 60 %. Správně je C).",
      "(Průměr procent jednotlivých tříd by vyšel jen přibližně — třídy mají různé počty žáků, počítá se podíl ze součtů.)",
    ], 180, { image: { kind: "tabulka", nazev: "Žáci 9. ročníku", hlavicka: ["Třída", "Počet žáků", "z toho dívek"], radky: [["9. A", 28, 18], ["9. B", 26, 12], ["9. C", 26, 18]] } }),
  typed("SOU3_10", "uhly_zlomky", 3, "Jaký (menší) úhel svírají hodinová a minutová ručička ve 3:20?", "20°", [
    "Minutová ručička urazí za 1 minutu 360° : 60 = 6°, ve 20 minutách je tedy na 20 · 6 = 120° od dvanáctky.",
    "Hodinová ručička urazí za hodinu 30°, za 20 minut třetinu hodiny, tedy 10°. Ve 3:20 je na 3 · 30° + 10° = 100° od dvanáctky.",
    "Rozdíl: 120° − 100° = 20°.",
  ], 210),
  anoNe("SOU3_11", "geometrie_zlomky", 3, `${zahradaStem} Tvrzení: „Záhon zabírá jednu patnáctinu plochy zahrady."`, true, [
    "Zahrada má obsah 20 · 12 = 240 m², záhon 4 · 4 = 16 m².",
    "16 : 240 = 1/15. Tvrzení je pravdivé — Ano.",
  ], 150, { image: IMG.zahrada }),
  anoNe("SOU3_12", "geometrie_slovni", 3, `${zahradaStem} Tvrzení: „Trávník má obsah 232 m²."`, false, [
    "Zahrada má obsah 240 m², záhon 16 m². Trávník je zbytek: 240 − 16 = 224 m².",
    "Tvrzení (232 m²) je nepravdivé — Ne.",
  ], 150, { image: IMG.zahrada }),
  anoNe("SOU3_13", "geometrie_procenta", 3, `${zahradaStem} Tvrzení: „Obvod zahrady je čtyřikrát větší než obvod záhonu."`, true, [
    "Obvod zahrady: 2 · (20 + 12) = 64 m. Obvod záhonu: 4 · 4 = 16 m.",
    "64 : 16 = 4. Tvrzení je pravdivé — Ano.",
  ], 150, { image: IMG.zahrada }),
];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const close = (a, b) => Math.abs(a - b) < 1e-9;
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const opt = (id) => by[id].moznosti[by[id].spravna];
// L1
{ const x = (9 + 3) / 2; ok("04", x === 6 && x * x === 36 && by.SOU1_04.odpoved === "36 cm²"); }
{ const price = 90 / 0.75; ok("05", close(price, 120) && close(0.2 * price, 24) && by.SOU1_05.odpoved === "24 Kč"); }
{ const l = 9 - 4; ok("06", l === 5 && 4 * l === 20 && by.SOU1_06.odpoved === "20 cm²"); }
{ const c = Math.hypot(6, 8); ok("07", close(c, 10) && 6 + 8 + c === 24 && by.SOU1_07.odpoved === "24 cm"); }
{ ok("08", 4 * 12 - (10 + 12 + 14) === 12 && by.SOU1_08.odpoved === "12"); }
{ const n = 6 * 4; ok("09", n === 24 && close((9 / n) * 100, 37.5) && by.SOU1_09.odpoved === "37,5 %"); }
// L3
const pozemek = () => { let sol = []; for (let a = 1; a < 500; a += 0.5) if (close(4 * a, 2 * (0.8 * a + a + 12))) sol.push(a); return sol; };
{ const s = pozemek(); ok("01", s.length === 1 && s[0] === 60 && by.SOU3_01.odpoved === "60 m", s); const a = s[0]; ok("01 kontrola", close(4 * a, 2 * (0.8 * a + a + 12)) && close(0.8 * a, 48) && a + 12 === 72); }
{ const a = 60; const pct = ((0.8 * a) * (a + 12)) / (a * a) * 100; ok("02", close(pct, 96) && opt("SOU3_02") === "96 %", pct); }
{ const s = 10, kruh = 3.14 * 5 * 5, siva = (s * s - kruh) / (s * s) * 100; ok("03", close(siva, 21.5) && opt("SOU3_03") === "21,5 %", siva); }
{ const rise = 12 ** 3 / (60 * 30); ok("04", close(rise, 0.96) && 25 + rise < 40 && 12 < 25 && opt("SOU3_04") === "0,96 cm", rise); }
{ let sol = []; for (let b = 1; b < 22; b++) { const a = 22 - b; if (a - 3 === b + 3 && 2 * (a + b) === 44) sol.push([a, b]); } ok("05", sol.length === 1 && sol[0][0] * sol[0][1] === 112 && by.SOU3_05.odpoved === "112 cm²", sol); }
{ const h0 = Math.sqrt(25 - 9), h1 = Math.sqrt(25 - 16); ok("06", close(h0, 4) && close(h1, 3) && close(((h0 - h1) / h0) * 100, 25) && by.SOU3_06.odpoved === "25 %"); }
{ let sol = []; for (let b = 1; b < 60; b++) if (close(2 * (b + 0.75 * b), 56)) sol.push(b); ok("07", sol.length === 1 && sol[0] * 0.75 * sol[0] === 192 && by.SOU3_07.odpoved === "192 cm²", sol); }
{ let sol = []; for (let a = 1; a < 20; a++) if (2 * a ** 3 === 128) sol.push(a); const a = sol[0]; const povrch = 2 * a * a + 4 * a * (2 * a); ok("08", sol.length === 1 && a === 4 && povrch === 160 && povrch !== 128 && opt("SOU3_08") === "160 cm²", sol); }
{ const rows = [[28, 18], [26, 12], [26, 18]]; const tot = rows.reduce((s, r) => s + r[0], 0), g = rows.reduce((s, r) => s + r[1], 0); const mean = rows.reduce((s, r) => s + (r[1] / r[0]) * 100, 0) / 3; ok("09", tot === 80 && g === 48 && close((g / tot) * 100, 60) && opt("SOU3_09") === "60 %" && !by.SOU3_09.moznosti.includes(`${mean.toFixed(1)} %`), mean); }
{ const min = 20 * 6, hod = 3 * 30 + 20 * 0.5; ok("10", Math.abs(min - hod) === 20 && by.SOU3_10.odpoved === "20°"); }
{ const G = 20 * 12, Z = 4 * 4; ok("11", close(Z / G, 1 / 15) && by.SOU3_11.odpoved === "Ano"); ok("12", G - Z === 224 && G - Z !== 232 && by.SOU3_12.odpoved === "Ne"); ok("13", 2 * (20 + 12) / (4 * 4) === 4 && by.SOU3_13.odpoved === "Ano"); }
// struktura
for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length >= 2 && new Set(e.moznosti).size === e.moznosti.length && e.odpoved === e.moznosti[e.spravna]);
  else ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
  if (e.image?.kind === "static") ok(e.id + " soubor", fs.existsSync("public" + e.image.url), e.image.url);
  if (!e.moznosti) { const num = e.odpoved.replace(/\s/g, "").match(/[\d,]+/)[0].replace(",", "."); ok(e.id + " odpověď v krocích", e.reseni_kroky.join(" ").replace(/\s/g, "").replace(/,/g, ".").includes(num), num); }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek/i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
}
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 19);
const all = ["databaze", "cermat-200", "doplnky-uhly-souhrnne", "konstrukce-interaktivni"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize s databází", ids.every((id) => !all.some((e) => e.id === id)));
console.log(`úloh: ${ex.length} (L1 ${ex.filter((e) => e.obtiznost === 1).length}, L3 ${ex.filter((e) => e.obtiznost === 3).length}), chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^SOU[13]_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + Souhrnné (19 úloh)` : "Souhrnné — úlohy z více témat najednou (19 úloh: 6× L1, 13× L3 se obrázky, tabulkou a ano/ne)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} souhrnných)`);
