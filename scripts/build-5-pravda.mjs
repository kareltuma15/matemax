// 5. třída, karta pravda / nepravda (úloha 8 oficiálních testů): u každého tvrzení žák volí ANO / NE.
// Dávka P5_VIC_16–25 (10 úloh, 3–4 tvrzení); okruhy jednotky, počítání, slovní, zlomky, obsah, tělesa.
// Styl podle oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Spuštění: node scripts/build-5-pravda.mjs → doplní/přepíše P5_VIC_16–25 v src/data/nahled-batch.json (jiné dávky nechá).
// Pravdivost každého tvrzení se v tomto skriptu nezávisle přepočítá (`plati` je výpočet, ne opsaná hodnota).
import fs from "node:fs";

/** Úloha s tvrzeními: odpověď úlohy = A/N u každého tvrzení oddělené „ ; “. Tvrzení = [text, vypočtená pravdivost]. */
const mk = (id, tema, podtema, level, zadani, tvrzeni, kroky, cas) => ({
  id, tema, podtema, obtiznost: level, zadani,
  tvrzeni: tvrzeni.map(([text, pravda]) => ({ text, pravda })),
  odpoved: tvrzeni.map(([, pravda]) => (pravda ? "A" : "N")).join(" ; "),
  reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const hm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;
const t = (h, m) => h * 60 + m;

// ───────── hodnoty pro tvrzení (vždy výpočtem) ─────────
const mojeCasy = { odjezd: t(14, 25), jizda: 110 };
const prijezd = mojeCasy.odjezd + mojeCasy.jizda;
const petr = 40, jana = petr + 15, marek = petr / 2;
const rychlost = 18; // km/h
const obdelnik = { a: 6, b: 4 }, ctverec = 5;
const kvadr = { a: 4, b: 3, c: 2 };
const penize = 60, sesit = penize / 3, piti = penize / 4;
const zaokr = (n, k) => Math.round(n / k) * k;

const ex = [
  // ───────── L1 ─────────
  mk("P5_VIC_16", "p5_jednotky", "p5_prevody", 1, "Rozhodni, zda jednotlivá tvrzení platí.", [
    ["1 m je 100 cm.", 1 * 100 === 100],
    ["3 kg je 300 g.", 3 * 1000 === 300],
    ["2 hodiny je 120 minut.", 2 * 60 === 120],
    ["5 dm je 50 cm.", 5 * 10 === 50],
  ], [
    "Platí: 1 metr má 100 centimetrů.",
    "Neplatí: 1 kg je 1 000 g, takže 3 kg je 3 000 g.",
    "Platí: 2 · 60 = 120 minut.",
    "Platí: 1 dm je 10 cm, takže 5 dm je 50 cm.",
  ], 120),
  mk("P5_VIC_17", "p5_pocitani", "poradi_operaci", 1, "Rozhodni, zda jsou jednotlivé výpočty správně.", [
    ["7 · 8 = 54", 7 * 8 === 54],
    ["45 + 38 = 83", 45 + 38 === 83],
    ["100 − 64 = 46", 100 - 64 === 46],
  ], [
    "Neplatí: 7 · 8 = 56.",
    "Platí: 45 + 38 = 83.",
    "Neplatí: 100 − 64 = 36.",
  ], 120),
  // ───────── L2 ─────────
  mk("P5_VIC_18", "p5_obsah", "p5_obvod", 2, "Obdélník má strany 6 cm a 4 cm. Čtverec má stranu 5 cm. Rozhodni, zda jednotlivá tvrzení platí.", [
    ["Obvod obdélníku je 20 cm.", 2 * (obdelnik.a + obdelnik.b) === 20],
    ["Obsah obdélníku je 24 cm².", obdelnik.a * obdelnik.b === 24],
    ["Obvod čtverce je 25 cm.", 4 * ctverec === 25],
    ["Obsah čtverce je 25 cm².", ctverec * ctverec === 25],
  ], [
    "Platí: 2 · (6 + 4) = 20 cm.",
    "Platí: 6 · 4 = 24 cm².",
    "Neplatí: obvod čtverce je 4 · 5 = 20 cm (25 je jeho obsah).",
    "Platí: 5 · 5 = 25 cm².",
  ], 180),
  mk("P5_VIC_19", "p5_zlomky", "p5_o_zlomek", 2, "Ve třídě je 24 žáků. Rozhodni, zda jednotlivá tvrzení platí.", [
    ["Čtvrtina žáků je 6 žáků.", 24 / 4 === 6],
    ["Třetina žáků je 9 žáků.", 24 / 3 === 9],
    ["Polovina žáků je 12 žáků.", 24 / 2 === 12],
    ["Tři osminy žáků je 8 žáků.", 3 * (24 / 8) === 8],
  ], [
    "Platí: 24 : 4 = 6.",
    "Neplatí: třetina je 24 : 3 = 8 žáků.",
    "Platí: 24 : 2 = 12.",
    "Neplatí: osmina je 24 : 8 = 3 žáci, tři osminy jsou 3 · 3 = 9 žáků, ne 8.",
  ], 180),
  mk("P5_VIC_20", "p5_slovni", "p5_dva_udaje", 2, "Petr má 40 korun. Jana má o 15 korun více než Petr. Marek má o polovinu méně než Petr. Rozhodni, zda jednotlivá tvrzení platí.", [
    ["Jana má 55 korun.", jana === 55],
    ["Marek má 25 korun.", marek === 25],
    ["Jana a Marek mají dohromady 75 korun.", jana + marek === 75],
    ["Nejvíce peněz má Petr.", petr > jana && petr > marek],
  ], [
    "Platí: Jana má 40 + 15 = 55 korun.",
    "Neplatí: polovina ze 40 je 20, Marek má 40 − 20 = 20 korun.",
    "Platí: 55 + 20 = 75 korun.",
    "Neplatí: nejvíce má Jana (55 korun), Petr má 40 korun.",
  ], 210),
  mk("P5_VIC_21", "p5_jednotky", "p5_cas", 2, "Autobus odjíždí ve 14:25 a jede 1 hodinu a 50 minut. Rozhodni, zda jednotlivá tvrzení platí.", [
    ["Autobus přijede v 16:15.", hm(prijezd) === "16:15"],
    ["Jízda trvá 100 minut.", 60 + 50 === 100],
    ["Autobus přijede dříve než v 16:00.", prijezd < t(16, 0)],
  ], [
    "Platí: 14:25 + 1 hodina = 15:25, plus 50 minut = 16:15.",
    "Neplatí: 60 + 50 = 110 minut, ne 100.",
    "Neplatí: 16:15 je později než 16:00.",
  ], 180),
  // ───────── L3 ─────────
  mk("P5_VIC_22", "p5_pocitani", "p5_zaokrouhlovani", 3, "Je dáno číslo 63 482. Rozhodni, zda jednotlivá tvrzení platí.", [
    ["Zaokrouhleno na tisíce je to 63 000.", zaokr(63482, 1000) === 63000],
    ["Zaokrouhleno na stovky je to 63 500.", zaokr(63482, 100) === 63500],
    ["Zaokrouhleno na desítky je to 63 490.", zaokr(63482, 10) === 63490],
    ["Číslo je o 482 větší než 63 000.", 63482 - 63000 === 482],
  ], [
    "Platí: za tisícovkou 3 je stovková číslice 4, zaokrouhlujeme dolů na 63 000.",
    "Platí: za stovkou 4 je desítková číslice 8, zaokrouhlujeme nahoru na 63 500.",
    "Neplatí: za desítkou 8 je jednotková číslice 2, zaokrouhlujeme dolů na 63 480.",
    "Platí: 63 482 − 63 000 = 482.",
  ], 240),
  mk("P5_VIC_23", "p5_slovni", "p5_tempo", 3, "Cyklista jede stálou rychlostí 18 km za hodinu. Rozhodni, zda jednotlivá tvrzení platí.", [
    ["Za 2 hodiny a 30 minut ujede 45 km.", rychlost * 2.5 === 45],
    ["Vzdálenost 9 km ujede za 20 minut.", rychlost / 60 * 20 === 9],
    ["Za 40 minut ujede 12 km.", rychlost / 60 * 40 === 12],
    ["Vzdálenost 54 km ujede za 4 hodiny.", 54 / rychlost === 4],
  ], [
    "Platí: za 2 hodiny ujede 36 km, za půl hodiny 9 km, dohromady 45 km.",
    "Neplatí: 9 km je polovina z 18 km, takže je to půl hodiny, tedy 30 minut.",
    "Platí: za 20 minut (třetinu hodiny) ujede 6 km, za 40 minut 12 km.",
    "Neplatí: 54 : 18 = 3, trvá to 3 hodiny, ne 4.",
  ], 240),
  mk("P5_VIC_24", "p5_telesa", "p5_krychlicky", 3, "Kvádr je složený z jednotkových krychliček. Je 4 krychličky dlouhý, 3 široký a 2 vysoký. Rozhodni, zda jednotlivá tvrzení platí.", [
    ["Kvádr je složený z 24 krychliček.", kvadr.a * kvadr.b * kvadr.c === 24],
    ["Spodní vrstva má 8 krychliček.", kvadr.a * kvadr.b === 8],
    ["Když z horní vrstvy odebereme 5 krychliček, zbyde jich 19.", 24 - 5 === 19],
    ["Kvádr má tři vrstvy.", kvadr.c === 3],
  ], [
    "Platí: 4 · 3 · 2 = 24 krychliček.",
    "Neplatí: ve vrstvě je 4 · 3 = 12 krychliček, ne 8.",
    "Platí: 24 − 5 = 19 krychliček.",
    "Neplatí: kvádr je 2 krychličky vysoký, má tedy dvě vrstvy.",
  ], 240),
  mk("P5_VIC_25", "p5_zlomky", "p5_o_zlomek", 3, "Pavel měl 60 korun. Třetinu peněz utratil za sešit a čtvrtinu peněz za pití. Rozhodni, zda jednotlivá tvrzení platí.", [
    ["Za sešit utratil 20 korun.", sesit === 20],
    ["Za pití utratil 12 korun.", piti === 12],
    ["Dohromady utratil 35 korun.", sesit + piti === 35],
    ["Zbylo mu 25 korun.", penize - sesit - piti === 25],
  ], [
    "Platí: 60 : 3 = 20 korun.",
    "Neplatí: čtvrtina z 60 je 60 : 4 = 15 korun.",
    "Platí: 20 + 15 = 35 korun.",
    "Platí: 60 − 35 = 25 korun.",
  ], 240),
];

// ───────── kontrola ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
for (const e of ex) {
  ok(e.id + " tvrzení 3–4", e.tvrzeni.length >= 3 && e.tvrzeni.length <= 4);
  ok(e.id + " kroky = tvrzení", e.reseni_kroky.length === e.tvrzeni.length);
  // text kroku musí odpovídat vypočtené pravdivosti
  e.tvrzeni.forEach((tv, i) => ok(`${e.id} krok ${i + 1} sedí na pravdivost`, tv.pravda ? /^Platí/.test(e.reseni_kroky[i]) : /^Neplatí/.test(e.reseni_kroky[i]), e.reseni_kroky[i]));
  // aspoň jedno pravdivé i nepravdivé tvrzení — jinak by se dalo tipovat
  ok(e.id + " obě hodnoty", e.tvrzeni.some((x) => x.pravda) && e.tvrzeni.some((x) => !x.pravda));
  ok(e.id + " odpoved", /^[AN]( ; [AN]){2,3}$/.test(e.odpoved));
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  if (e.obtiznost === 1) ok(e.id + " L1 bez dvojciferného dělení", !/\d :\s?\d\d/.test(e.zadani + e.reseni_kroky.join(" ")));
}
// celkově ať se nedá hádat: podíl pravdivých tvrzení kolem poloviny
const vse = ex.flatMap((e) => e.tvrzeni);
const podil = vse.filter((x) => x.pravda).length / vse.length;
ok("podíl pravdivých tvrzení 35–70 %", podil >= 0.35 && podil <= 0.7, podil);
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 10, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}) | tvrzení ${vse.length}, pravdivých ${Math.round(podil * 100)} % | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: pravda / nepravda (10 úloh)` : "5. třída — pravda / nepravda u tvrzení (úloha 8 testů), 10 úloh (L1 ×2, L2 ×4, L3 ×4)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
