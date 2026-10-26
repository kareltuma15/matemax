// 5. třída, okruh „Slovní úlohy a úvaha" (P5_SLO_01–15): dva údaje dohromady, tempo, hmotnosti a váhy, věk, logika.
// Styl podle úloh 3 a 4 oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Spuštění: node scripts/build-5-slovni.mjs → doplní/přepíše P5_SLO_* v src/data/nahled-batch.json (jiné dávky nechá).
// Každý výsledek se v tomto skriptu nezávisle přepočítá (aritmetika, hrubá síla).
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_slovni", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});

const ex = [
  // ───────── L1 ─────────
  mk("P5_SLO_01", "p5_dva_udaje", 1, "Anička má 35 korun a Petr má o 12 korun víc než Anička. Kolik korun mají dohromady?", "82", [
    "Petr má o 12 korun víc: 35 + 12 = 47 Kč.",
    "Dohromady: 35 + 47 = 82 Kč.",
  ], 75),
  mk("P5_SLO_02", "p5_tempo", 1, "Robot postaví za jednu minutu 6 věžiček. Kolik věžiček postaví za 8 minut?", "48", [
    "Za každou minutu přibude 6 věžiček, minut je 8.",
    "8 · 6 = 48 věžiček.",
  ], 60),
  mk("P5_SLO_03", "p5_vek", 1, "Mamince je 34 let a Honzovi je 8 let. Kolik let bude mamince, až bude Honzovi 12 let?", "38", [
    "Honzovi chybí do 12 let 12 − 8 = 4 roky.",
    "Maminka bude o stejné 4 roky starší: 34 + 4 = 38 let.",
  ], 75),
  mk("P5_SLO_04", "p5_hmotnosti", 1, "Tři stejné pytlíky bonbonů váží dohromady 450 gramů. Kolik gramů váží jeden pytlík?", "150", [
    "Hmotnost se rozdělí na tři stejné díly: 450 : 3.",
    "450 : 3 = 150 g.",
  ], 60),
  // ───────── L2 ─────────
  mk("P5_SLO_05", "p5_dva_udaje", 2, "Eva si každý týden ukládá do pokladničky 40 korun. Po osmi týdnech koupila knihu za 250 korun. Kolik korun jí zbylo?", "70", [
    "Za 8 týdnů naspořila 8 · 40 = 320 Kč.",
    "Po koupi knihy jí zbylo 320 − 250 = 70 Kč.",
  ], 120),
  mk("P5_SLO_06", "p5_tempo", 2, "Pekař upeče za jednu hodinu 45 rohlíků. Kolik hodin potřebuje na upečení 270 rohlíků?", "6", [
    "Zjišťujeme, kolikrát se 45 rohlíků vejde do 270 rohlíků: 270 : 45.",
    "Zkouška: 6 · 45 = 270, takže pekař potřebuje 6 hodin.",
  ], 120),
  mk("P5_SLO_07", "p5_hmotnosti", 2, "Jablko a hruška váží dohromady 340 gramů. Hruška váží o 40 gramů víc než jablko. Kolik gramů váží jablko?", "150", [
    "Kdyby hruška vážila stejně jako jablko, ubylo by 40 g a obě by vážily dohromady 340 − 40 = 300 g.",
    "Pak by dva stejné kousky vážily 300 g, takže jedno jablko váží 300 : 2 = 150 g.",
    "Zkouška: hruška váží 150 + 40 = 190 g a 150 + 190 = 340 g.",
  ], 150),
  mk("P5_SLO_08", "p5_vek", 2, "Před čtyřmi lety bylo Kláře 7 let. Kolik let jí bude za pět let?", "16", [
    "Před čtyřmi lety jí bylo 7, dnes je jí 7 + 4 = 11 let.",
    "Za pět let jí bude 11 + 5 = 16 let.",
  ], 120),
  mk("P5_SLO_09", "p5_logika", 2, "Čtyři kamarádi závodili v běhu. Adam doběhl dřív než Božena, Božena doběhla dřív než Cyril a Dana doběhla dřív než Adam. Kdo doběhl do cíle poslední?", null, [
    "Zapíšeme pořadí od prvního: Dana je před Adamem, Adam před Boženou a Božena před Cyrilem.",
    "Pořadí je tedy Dana, Adam, Božena, Cyril. Poslední doběhl Cyril, správně je C).",
  ], 150, { moznosti: ["Adam", "Božena", "Cyril", "Dana", "nedá se určit"], spravna: 2 }),
  mk("P5_SLO_10", "p5_dva_udaje", 2, "Na výlet jelo 6 aut a v každém sedělo 4 děti. Další 3 děti jely na kole. Kolik dětí bylo na výletě celkem?", null, [
    "V autech jelo 6 · 4 = 24 dětí.",
    "S dětmi na kolech: 24 + 3 = 27 dětí. Správně je D).",
  ], 120, { moznosti: ["21", "24", "25", "27", "30"], spravna: 3 }),
  // ───────── L3 ─────────
  mk("P5_SLO_11", "p5_tempo", 3, "Dva roboti stavějí věž z kostek. Červený položí 4 kostky za minutu, modrý položí 6 kostek za minutu. Začali ve stejnou chvíli a skončili, když měla věž přesně 80 kostek. Kolik minut stavěli?", "8", [
    "Oba roboti společně položí za jednu minutu 4 + 6 = 10 kostek.",
    "Na 80 kostek potřebují 80 : 10 = 8 minut.",
    "Zkouška: červený položí 8 · 4 = 32 kostek, modrý 8 · 6 = 48 kostek a 32 + 48 = 80.",
  ], 210),
  mk("P5_SLO_12", "p5_hmotnosti", 3, "Na jedné misce vah leží 3 stejné koule a závaží 200 gramů. Na druhé misce leží 5 stejných koulí. Váhy jsou v rovnováze. Kolik gramů váží jedna koule?", "100", [
    "Na obou miskách jsou stejné hmotnosti. Odebereme z každé misky 3 koule.",
    "Na jedné misce zůstane jen závaží 200 g a na druhé 2 koule, takže 2 koule váží 200 g.",
    "Jedna koule váží 200 : 2 = 100 g. Zkouška: 3 · 100 + 200 = 500 a 5 · 100 = 500.",
  ], 210),
  mk("P5_SLO_13", "p5_vek", 3, "Tatínek je o 28 let starší než syn. Za 4 roky bude tatínek právě třikrát starší než syn. Kolik let je synovi dnes?", "10", [
    "Rozdíl věku se nemění, vždy zůstává 28 let.",
    "Až bude tatínek třikrát starší než syn, bude mít na věku syna tři díly a rozdíl dva díly. Dva díly jsou 28 let, jeden díl je 14 let, takže synovi bude za 4 roky 14 let.",
    "Dnes je synovi 14 − 4 = 10 let. Zkouška: tatínkovi je 38, za 4 roky 42 a 3 · 14 = 42.",
  ], 270),
  mk("P5_SLO_14", "p5_dva_udaje", 3, "Lenka dostala kapesné. Polovinu z něj utratila za časopis a z toho, co jí zbylo, utratila třetinu za sladkosti. Nakonec jí zbylo 40 korun. Kolik korun dostala?", "120", [
    "Po koupi časopisu jí zbyla polovina. Pak utratila třetinu zbytku, takže jí zbyly dvě třetiny z poloviny.",
    "Dvě třetiny poloviny jsou třetina celku, takže třetina kapesného je 40 Kč. Celé kapesné je 3 · 40 = 120 Kč.",
    "Zkouška: 120 − 60 = 60 Kč, třetina ze 60 je 20 Kč, 60 − 20 = 40 Kč.",
  ], 270),
  mk("P5_SLO_15", "p5_logika", 3, "Na dvoře jsou slepice a králíci. Dohromady mají 9 hlav a 26 nohou. Kolik je tam králíků?", "4", [
    "Kdyby všech 9 zvířat byly slepice, mělo by dohromady 9 · 2 = 18 nohou. To je o 26 − 18 = 8 nohou méně, než je ve skutečnosti.",
    "Každý králík místo slepice přidá 2 nohy (4 − 2), takže králíků je 8 : 2 = 4.",
    "Zkouška: 4 králíci mají 16 nohou, 5 slepic má 10 nohou, dohromady 26 nohou a 9 hlav.",
  ], 240),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const A = (id) => by[id].odpoved;

ok("01", 35 + (35 + 12) === 82 && A("P5_SLO_01") === "82");
ok("02", 8 * 6 === 48 && A("P5_SLO_02") === "48");
ok("03", 34 + (12 - 8) === 38 && A("P5_SLO_03") === "38");
ok("04", 450 / 3 === 150 && A("P5_SLO_04") === "150");
ok("05", 8 * 40 - 250 === 70 && A("P5_SLO_05") === "70");
ok("06", 270 / 45 === 6 && A("P5_SLO_06") === "6");
{ const s = []; for (let j = 1; j < 340; j++) if (j + (j + 40) === 340) s.push(j); ok("07", s.length === 1 && String(s[0]) === A("P5_SLO_07"), s); }
ok("08", 7 + 4 + 5 === 16 && A("P5_SLO_08") === "16");
{ // pořadí: všechny permutace splňující tři podmínky
  const jm = ["Adam", "Božena", "Cyril", "Dana"], perms = [];
  const gen = (a, r = []) => { if (!a.length) perms.push(r); else a.forEach((x, i) => gen([...a.slice(0, i), ...a.slice(i + 1)], [...r, x])); };
  gen(jm);
  const good = perms.filter((p) => p.indexOf("Adam") < p.indexOf("Božena") && p.indexOf("Božena") < p.indexOf("Cyril") && p.indexOf("Dana") < p.indexOf("Adam"));
  ok("09", good.length === 1 && good[0][3] === by.P5_SLO_09.moznosti[by.P5_SLO_09.spravna], good);
}
ok("10", 6 * 4 + 3 === 27 && by.P5_SLO_10.moznosti[by.P5_SLO_10.spravna] === "27");
{ let m = 0; while (4 * m + 6 * m < 80) m++; ok("11", m === 8 && 4 * m + 6 * m === 80 && A("P5_SLO_11") === "8"); }
{ const s = []; for (let k = 1; k < 1000; k++) if (3 * k + 200 === 5 * k) s.push(k); ok("12", s.length === 1 && String(s[0]) === A("P5_SLO_12"), s); }
{ const s = []; for (let y = 1; y < 100; y++) if (y + 4 + 28 === 3 * (y + 4)) s.push(y); ok("13", s.length === 1 && String(s[0]) === A("P5_SLO_13"), s); }
{ const s = []; for (let x = 1; x <= 1000; x++) { const po1 = x - x / 2, po2 = po1 - po1 / 3; if (Number.isInteger(x / 2) && Number.isInteger(po1 / 3) && po2 === 40) s.push(x); } ok("14", s.length === 1 && String(s[0]) === A("P5_SLO_14"), s); }
{ const s = []; for (let r = 0; r <= 9; r++) if (r + (9 - r) === 9 && 4 * r + 2 * (9 - r) === 26) s.push(r); ok("15", s.length === 1 && String(s[0]) === A("P5_SLO_15"), s); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
}
ok("rozmístění", new Set(ex.filter((e) => e.moznosti).map((e) => e.spravna)).size === 2);
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 15, ex.length);
const all = ["databaze", "cermat-200", "databaze-5"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}; A–E ${ex.filter((e) => e.moznosti).length}) | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^P5_SLO_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Slovní úlohy a úvaha (15 úloh)` : "5. třída — Slovní úlohy a úvaha: dva údaje, tempo, hmotnosti, věk, logika (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
