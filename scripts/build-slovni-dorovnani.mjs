// Dorovnání slovních úloh: úměra (L1/L2/L3), finance L1+L3, společná práce L1+L3, poměr a měřítko L1.
// Spuštění: node scripts/build-slovni-dorovnani.mjs → doplní/přepíše SLD1_*, SLD2_*, SLD3_* v src/data/nahled-batch.json (jiné dávky nechá).
// Každá odpověď se nezávisle přepočítá; psané odpovědi musí jít vyhodnotit (toValue), A–E musí mít právě jednu správnou možnost.
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "slovni_ulohy", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const typed = mk;
const choice = (id, podtema, level, zadani, moznosti, spravna, kroky, cas, extra = {}) =>
  mk(id, podtema, level, zadani, moznosti[spravna], kroky, cas, { moznosti, spravna, ...extra });
const anoNe = (id, podtema, level, zadani, pravda, kroky, cas, extra = {}) =>
  mk(id, podtema, level, zadani, pravda ? "Ano" : "Ne", kroky, cas, { moznosti: ["Ano", "Ne"], spravna: pravda ? 0 : 1, ...extra });

const strojeTab = { kind: "tabulka", nazev: "Výroba zakázky", hlavicka: ["Počet strojů", "Doba výroby (h)"], radky: [[3, 20], [4, 15], [5, 12], [6, 10]] };
const strojeStem = "Tabulka ukazuje, za kolik hodin vyrobí stejnou zakázku různý počet strojů (všechny stroje pracují stejně rychle). Rozhodněte, zda je tvrzení pravdivé.";

const ex = [
  // ───────── ÚMĚRA — L1 ─────────
  typed("SLD1_01", "umera", 1, "3 kg jablek stojí 84 Kč. Kolik korun stojí 5 kg stejných jablek?", "140 Kč", ["1 kg stojí 84 : 3 = 28 Kč.", "5 kg stojí 5 · 28 = 140 Kč."], 90),
  typed("SLD1_02", "umera", 1, "Auto spotřebuje na 100 km 6 litrů benzínu. Kolik litrů spotřebuje na 250 km?", "15 l", ["Na 1 km spotřebuje 6 : 100 = 0,06 l.", "Na 250 km spotřebuje 250 · 0,06 = 15 l."], 90),
  typed("SLD1_03", "umera", 1, "Čtyři dělníci vykopou příkop za 6 dní. Za kolik dní by příkop vykopalo osm stejně rychlých dělníků?", "3 dny", ["Dělníků je dvakrát víc, takže práce bude hotová dvakrát rychleji (nepřímá úměra).", "6 : 2 = 3 dny."], 90),
  typed("SLD1_04", "umera", 1, "Na 12 sendvičů je potřeba 300 g šunky. Kolik gramů šunky je potřeba na 20 sendvičů?", "500 g", ["Na 1 sendvič připadá 300 : 12 = 25 g šunky.", "Na 20 sendvičů je potřeba 20 · 25 = 500 g."], 90),
  typed("SLD1_05", "umera", 1, "Při rychlosti 4 km/h trvá výlet 3 hodiny. Za jak dlouho ho ujdeme rychlostí 6 km/h?", "2 hodiny", ["Dráha výletu je 4 · 3 = 12 km.", "Rychlostí 6 km/h to trvá 12 : 6 = 2 hodiny."], 90),
  // ───────── FINANCE — L1 ─────────
  typed("SLD1_06", "finance", 1, "Tričko stojí 280 Kč. Prodavač nabídl slevu 25 %. Kolik korun zaplatíme?", "210 Kč", ["Sleva je 0,25 · 280 = 70 Kč.", "Zaplatíme 280 − 70 = 210 Kč."], 90),
  typed("SLD1_07", "finance", 1, "Na účet s úrokem 3 % ročně uložil Karel 20 000 Kč. Kolik korun úroku dostane za jeden rok?", "600 Kč", ["Úrok je 3 % z 20 000 Kč.", "0,03 · 20 000 = 600 Kč."], 90),
  typed("SLD1_08", "finance", 1, "Za 3 sešity a 2 tužky zaplatíme 88 Kč. Jeden sešit stojí 24 Kč. Kolik korun stojí jedna tužka?", "8 Kč", ["Sešity stojí 3 · 24 = 72 Kč.", "Na dvě tužky zbývá 88 − 72 = 16 Kč, jedna tužka stojí 16 : 2 = 8 Kč."], 120),
  typed("SLD1_09", "finance", 1, "Kniha stála 400 Kč a zdražila o 15 %. Kolik korun stojí nyní?", "460 Kč", ["Zdražení je 0,15 · 400 = 60 Kč.", "Nová cena: 400 + 60 = 460 Kč."], 90),
  typed("SLD1_10", "finance", 1, "Petra dostává kapesné 1 500 Kč měsíčně a třetinu z něj šetří. Kolik korun ušetří za rok?", "6 000 Kč", ["Za měsíc ušetří 1 500 : 3 = 500 Kč.", "Za rok (12 měsíců) ušetří 12 · 500 = 6 000 Kč."], 120),
  // ───────── SPOLEČNÁ PRÁCE — L1 ─────────
  typed("SLD1_11", "spolecna_prace", 1, "Malíř vymaluje jeden pokoj za 6 hodin. Kolik stejných pokojů vymaluje za 18 hodin?", "3", ["Za 18 hodin uplyne 18 : 6 = 3 šestihodinové úseky.", "Vymaluje 3 pokoje."], 90),
  typed("SLD1_12", "spolecna_prace", 1, "Dva stejně rychlí pracovníci udělají práci za 10 dní. Za kolik dní by ji udělal jeden z nich sám?", "20 dní", ["Jeden pracovník je dvakrát pomalejší než dva.", "Práci udělá za 2 · 10 = 20 dní."], 90),
  typed("SLD1_13", "spolecna_prace", 1, "Kohoutek naplní vanu za 12 minut. Jakou část vany naplní za 3 minuty? Výsledek zapište zlomkem.", "1/4", ["Za 1 minutu naplní 1/12 vany.", "Za 3 minuty naplní 3/12 = 1/4 vany."], 90),
  typed("SLD1_14", "spolecna_prace", 1, "Tři stejně rychlí kopáči vykopou jámu za 4 hodiny. Za jak dlouho by ji vykopalo šest kopáčů?", "2 hodiny", ["Kopáčů je dvakrát víc, práce půjde dvakrát rychleji.", "4 : 2 = 2 hodiny."], 90),
  // ───────── POMĚR A MĚŘÍTKO — L1 ─────────
  typed("SLD1_15", "pomer_meritko", 1, "Písek a štěrk jsou ve směsi v poměru 2 : 3. Kolik kilogramů štěrku je ve 20 kg směsi?", "12 kg", ["Směs má 2 + 3 = 5 dílů, jeden díl váží 20 : 5 = 4 kg.", "Štěrk tvoří 3 díly: 3 · 4 = 12 kg."], 120),
  typed("SLD1_16", "pomer_meritko", 1, "Na mapě s měřítkem 1 : 50 000 měří vzdálenost dvou obcí 6 cm. Kolik kilometrů je to ve skutečnosti?", "3 km", ["6 cm · 50 000 = 300 000 cm.", "300 000 cm = 3 000 m = 3 km."], 120),
  typed("SLD1_17", "pomer_meritko", 1, "Počet chlapců a dívek ve třídě je v poměru 3 : 2. Chlapců je 15. Kolik je ve třídě dívek?", "10", ["Jeden díl odpovídá 15 : 3 = 5 žáků.", "Dívky tvoří 2 díly: 2 · 5 = 10."], 90),
  typed("SLD1_18", "pomer_meritko", 1, "Na plánu je vzdálenost 12 km zakreslena úsečkou dlouhou 4 cm. Kolik kilometrů ve skutečnosti odpovídá 1 cm na plánu?", "3 km", ["4 cm na plánu odpovídá 12 km.", "1 cm odpovídá 12 : 4 = 3 km."], 90),

  // ───────── ÚMĚRA — L2 ─────────
  typed("SLD2_01", "umera", 2, "Tabulka ukazuje cenu různého počtu stejných sešitů. Kolik korun stojí 12 sešitů?", "96 Kč", [
    "Z tabulky: 5 sešitů stojí 40 Kč, takže 1 sešit stojí 40 : 5 = 8 Kč (druhý řádek to potvrzuje: 8 · 8 = 64).", "12 sešitů stojí 12 · 8 = 96 Kč.",
  ], 120, { image: { kind: "tabulka", nazev: "Ceny sešitů", hlavicka: ["Počet sešitů", "Cena (Kč)"], radky: [[5, 40], [8, 64], [12, null]] } }),
  typed("SLD2_02", "umera", 2, "Šest čerpadel by vyčerpalo nádrž za 10 hodin. Po 4 hodinách společné práce se dvě čerpadla porouchala. Za kolik dalších hodin vyčerpají nádrž zbylá čtyři čerpadla?", "9 hodin", [
    "Celá práce je 6 · 10 = 60 hodin čerpadla. Za první 4 hodiny se udělalo 6 · 4 = 24.", "Zbývá 60 − 24 = 36 hodin čerpadla; čtyři čerpadla ji zvládnou za 36 : 4 = 9 hodin.",
  ], 180),
  typed("SLD2_03", "umera", 2, "Ze 75 dkg mouky se upeče 30 koláčů. Kolik koláčů se upeče ze 2 kg mouky?", "80", [
    "2 kg = 200 dkg. Z 1 dkg se upeče 30 : 75 = 0,4 koláče.", "Z 200 dkg se upeče 200 · 0,4 = 80 koláčů.",
  ], 150),
  typed("SLD2_04", "umera", 2, "Patnáct kopáčů by vykopalo příkop za 8 dní. Kolik kopáčů je potřeba, aby byl příkop hotový za 5 dní? (Všichni pracují stejně rychle.)", "24", [
    "Celá práce je 15 · 8 = 120 kopáčodnů.", "Na 5 dní je potřeba 120 : 5 = 24 kopáčů.",
  ], 150),

  // ───────── ÚMĚRA — L3 ─────────
  typed("SLD3_01", "umera", 3, "Zásoba vody pro 12 turistů vystačí na 15 dní. Po 3 dnech přišlo na tábor dalších 6 turistů. Na kolik dalších dní vystačí zbylá zásoba všem turistům?", "8 dní", [
    "Celá zásoba odpovídá 12 · 15 = 180 turistodnů. Za první 3 dny se spotřebovalo 12 · 3 = 36.",
    "Zbývá 180 − 36 = 144 turistodnů. Turistů je teď 12 + 6 = 18, zásoba vystačí na 144 : 18 = 8 dní.",
  ], 240),
  choice("SLD3_02", "umera", 3, "Osm pekařů upeče za 6 hodin 480 housek. Kolik housek upečou pět pekařů za 8 hodin? (Všichni pracují stejně rychle.)",
    ["300", "320", "360", "400", "450"], 3, [
      "Jeden pekař upeče za 1 hodinu 480 : (8 · 6) = 10 housek.", "Pět pekařů za 8 hodin: 5 · 8 · 10 = 400 housek. Správně je D).",
    ], 210),
  typed("SLD3_03", "umera", 3, "Při rychlosti 80 km/h trvá cesta 3 hodiny. O kolik procent se zkrátí doba cesty, zvýšíme-li rychlost na 100 km/h?", "20 %", [
    "Délka cesty: 80 · 3 = 240 km.", "Rychlostí 100 km/h trvá cesta 240 : 100 = 2,4 h, tedy o 0,6 h méně.",
    "0,6 : 3 = 0,2, tedy o 20 % kratší. (Rychlost vzrostla o 25 %, doba se ale zkrátila jen o 20 % — úměra je nepřímá.)",
  ], 210),
  anoNe("SLD3_04", "umera", 3, `${strojeStem} Tvrzení: „Čtyři stroje vyrobí zakázku za 16 hodin."`, false, [
    "Součin počtu strojů a doby výroby je stálý: 3 · 20 = 60 (4 · 15 = 60, 5 · 12 = 60, 6 · 10 = 60).",
    "Čtyři stroje potřebují 60 : 4 = 15 hodin, ne 16. Tvrzení je nepravdivé — Ne.",
  ], 150, { image: strojeTab }),
  anoNe("SLD3_05", "umera", 3, `${strojeStem} Tvrzení: „Osm strojů by zakázku vyrobilo za 7,5 hodiny."`, true, [
    "Součin počtu strojů a doby výroby je stálý: 3 · 20 = 60.",
    "Osm strojů potřebuje 60 : 8 = 7,5 hodiny. Tvrzení je pravdivé — Ano.",
  ], 150, { image: strojeTab }),
  anoNe("SLD3_06", "umera", 3, `${strojeStem} Tvrzení: „Při dvojnásobném počtu strojů se doba výroby zdvojnásobí."`, false, [
    "Součin počtu strojů a doby výroby je stálý (60), jde o nepřímou úměru.",
    "Při dvojnásobném počtu strojů se doba výroby zkrátí na polovinu (např. 3 stroje 20 h, 6 strojů 10 h). Tvrzení je nepravdivé — Ne.",
  ], 150, { image: strojeTab }),
  // ───────── FINANCE — L3 ─────────
  choice("SLD3_07", "finance", 3, "Půjčovna kol: první hodina stojí 120 Kč a každá další hodina 80 Kč. Který výraz vyjadřuje cenu půjčení kola na x hodin (x je celé číslo, x ≥ 1)?",
    ["80x", "80x + 40", "80x + 120", "120x − 40", "200x"], 1, [
      "První hodina stojí 120 Kč, zbývajících x − 1 hodin stojí po 80 Kč: 120 + 80 · (x − 1).",
      "Roznásobíme: 120 + 80x − 80 = 80x + 40. Správně je B). (Výraz 80x + 120 by platil, kdyby první hodina byla navíc.)",
    ], 180),
  typed("SLD3_08", "finance", 3, "Půjčovna kol: první hodina stojí 120 Kč a každá další hodina 80 Kč. Eva si půjčila kolo na x hodin a Jana na x + 2 hodin. Dohromady zaplatily 1 360 Kč. Kolik hodin si půjčila Eva?", "7 hodin", [
    "Cena za n hodin je 80n + 40. Eva zaplatila 80x + 40, Jana 80(x + 2) + 40 = 80x + 200.",
    "Dohromady: 160x + 240 = 1 360, tedy 160x = 1 120 a x = 7.",
    "Zkouška: Eva 7 hodin = 600 Kč, Jana 9 hodin = 760 Kč, dohromady 1 360 Kč.",
  ], 240),
  // ───────── SPOLEČNÁ PRÁCE — L3 ─────────
  typed("SLD3_09", "spolecna_prace", 3, "První čerpadlo vyčerpá bazén za 6 hodin, druhé za 12 hodin. Čerpají spolu 2 hodiny, pak druhé čerpadlo vypnou a zbytek dočerpá první samo. Kolik hodin trvalo vyčerpání celého bazénu?", "5 hodin", [
    "Za hodinu vyčerpají společně 1/6 + 1/12 = 3/12 = 1/4 bazénu, za 2 hodiny tedy 1/2.",
    "Zbývá 1/2 bazénu; první čerpadlo vyčerpá za hodinu 1/6, zbytek tedy za (1/2) : (1/6) = 3 hodiny.",
    "Celkem 2 + 3 = 5 hodin.",
  ], 210),
  typed("SLD3_10", "spolecna_prace", 3, "Pracovník A zvládne práci za 12 dní, pracovník B za 6 dní. Pracovali spolu 3 dny, zbytek práce dokončil za 2 dny sám pracovník C. Za kolik dní by celou práci udělal pracovník C sám?", "8 dní", [
    "A + B udělají za den 1/12 + 1/6 = 3/12 = 1/4 práce, za 3 dny 3/4.",
    "Zbývá 1/4 práce, kterou C udělal za 2 dny, takže za den udělá 1/8.",
    "Celou práci by C udělal za 8 dní.",
  ], 240),
];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const close = (a, b) => Math.abs(a - b) < 1e-9;
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const opt = (id) => by[id].moznosti[by[id].spravna];
const A = (id) => by[id].odpoved;
ok("1_01", close(5 * 84 / 3, 140) && A("SLD1_01") === "140 Kč");
ok("1_02", close(250 * 6 / 100, 15) && A("SLD1_02") === "15 l");
ok("1_03", 4 * 6 / 8 === 3 && A("SLD1_03") === "3 dny");
ok("1_04", close(20 * 300 / 12, 500) && A("SLD1_04") === "500 g");
ok("1_05", 4 * 3 / 6 === 2 && A("SLD1_05") === "2 hodiny");
ok("1_06", close(280 * 0.75, 210) && A("SLD1_06") === "210 Kč");
ok("1_07", close(20000 * 0.03, 600) && A("SLD1_07") === "600 Kč");
ok("1_08", (88 - 3 * 24) / 2 === 8 && A("SLD1_08") === "8 Kč");
ok("1_09", close(400 * 1.15, 460) && A("SLD1_09") === "460 Kč");
ok("1_10", (1500 / 3) * 12 === 6000 && A("SLD1_10") === "6 000 Kč");
ok("1_11", 18 / 6 === 3 && A("SLD1_11") === "3");
ok("1_12", 10 * 2 === 20 && A("SLD1_12") === "20 dní");
ok("1_13", 3 / 12 === 0.25 && A("SLD1_13") === "1/4");
ok("1_14", 3 * 4 / 6 === 2 && A("SLD1_14") === "2 hodiny");
ok("1_15", (20 / 5) * 3 === 12 && A("SLD1_15") === "12 kg");
ok("1_16", 6 * 50000 / 100000 === 3 && A("SLD1_16") === "3 km");
ok("1_17", (15 / 3) * 2 === 10 && A("SLD1_17") === "10");
ok("1_18", 12 / 4 === 3 && A("SLD1_18") === "3 km");
ok("2_01", 40 / 5 === 8 && 8 * 8 === 64 && 12 * 8 === 96 && A("SLD2_01") === "96 Kč");
ok("2_02", (6 * 10 - 6 * 4) / 4 === 9 && A("SLD2_02") === "9 hodin");
ok("2_03", close(200 * 30 / 75, 80) && A("SLD2_03") === "80");
ok("2_04", 15 * 8 / 5 === 24 && A("SLD2_04") === "24");
ok("3_01", (12 * 15 - 12 * 3) / 18 === 8 && A("SLD3_01") === "8 dní");
ok("3_02", 5 * 8 * (480 / (8 * 6)) === 400 && opt("SLD3_02") === "400");
{ const d = 80 * 3, t = d / 100; ok("3_03", close(((3 - t) / 3) * 100, 20) && A("SLD3_03") === "20 %"); }
{ const rows = [[3, 20], [4, 15], [5, 12], [6, 10]]; ok("3_04–06 tabulka stálý součin", rows.every((r) => r[0] * r[1] === 60));
  ok("3_04", 60 / 4 === 15 && 60 / 4 !== 16 && A("SLD3_04") === "Ne"); ok("3_05", 60 / 8 === 7.5 && A("SLD3_05") === "Ano"); ok("3_06", 60 / 6 === 10 && 60 / 3 / 2 === 10 && A("SLD3_06") === "Ne"); }
{ const f = (x) => 120 + 80 * (x - 1); ok("3_07", [1, 2, 5, 9].every((x) => f(x) === 80 * x + 40) && opt("SLD3_07") === "80x + 40" && by.SLD3_07.moznosti.filter((o) => o === "80x + 40").length === 1); }
{ const f = (x) => 80 * x + 40; let sol = []; for (let x = 1; x < 100; x++) if (f(x) + f(x + 2) === 1360) sol.push(x); ok("3_08", sol.length === 1 && sol[0] === 7 && f(7) === 600 && f(9) === 760 && A("SLD3_08") === "7 hodin", sol); }
{ const together = 1 / 6 + 1 / 12, done = together * 2, t2 = (1 - done) / (1 / 6); ok("3_09", close(2 + t2, 5) && A("SLD3_09") === "5 hodin"); }
{ const done = (1 / 12 + 1 / 6) * 3, c = (1 - done) / 2; ok("3_10", close(1 / c, 8) && A("SLD3_10") === "8 dní"); }
for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length >= 2 && new Set(e.moznosti).size === e.moznosti.length && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
    const num = e.odpoved.replace(/\s/g, "").match(/[\d,/]+/)[0].replace(",", ".");
    ok(e.id + " odpověď v krocích", e.reseni_kroky.join(" ").replace(/\s/g, "").replace(/,/g, ".").includes(num), num);
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek/i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
}
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 32, ex.length);
const all = ["databaze", "cermat-200", "doplnky-uhly-souhrnne", "konstrukce-interaktivni"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize s databází", ids.every((id) => !all.some((e) => e.id === id)));
const cnt = (p, l) => ex.filter((e) => e.podtema === p && e.obtiznost === l).length;
console.log(`úloh: ${ex.length} | úměra L1 ${cnt("umera", 1)} L2 ${cnt("umera", 2)} L3 ${cnt("umera", 3)} | finance L1 ${cnt("finance", 1)} L3 ${cnt("finance", 3)} | spol. práce L1 ${cnt("spolecna_prace", 1)} L3 ${cnt("spolecna_prace", 3)} | poměr L1 ${cnt("pomer_meritko", 1)} | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^SLD[123]_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + Slovní úlohy — dorovnání (32 úloh)` : "Slovní úlohy — dorovnání: úměra, finance, společná práce, poměr a měřítko (32 úloh: L1 ×18, L2 ×4, L3 ×10)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} slovních)`);
