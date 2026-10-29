// 5. třída, okruh „Slovní úlohy a úvaha", třetí dávka (P5_SLO_31–45): dva údaje, tempo, hmotnosti, věk, logika.
// Styl podle úloh 3, 4 a 9–12 oficiálních testů CERMAT pro 5. třídu (vlastní čísla a zadání, nic se nekopíruje).
// Od 29. 10. 2026: v L2/L3 smí být „hezké“ dělení dvojciferným číslem a převody přes víc jednotek; L1 jen jednoduché kroky.
// Spuštění: node scripts/build-5-slovni3.mjs → doplní/přepíše P5_SLO_31–45 v src/data/nahled-batch.json (jiné dávky nechá).
// Každý výsledek se v tomto skriptu nezávisle přepočítá (aritmetika, hrubá síla).
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const mk = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "p5_slovni", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const hm = (min) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

const ex = [
  // ───────── L1 ─────────
  mk("P5_SLO_31", "p5_dva_udaje", 1, "V knihovně je 6 polic a na každé je 15 knih. Kolik knih je v knihovně celkem?", "90", [
    "Na každé polici je 15 knih a polic je 6.",
    "6 · 15 = 90 knih.",
  ], 75),
  mk("P5_SLO_32", "p5_tempo", 1, "Auto ujede za jednu hodinu 60 kilometrů. Kolik kilometrů ujede za 4 hodiny?", "240", [
    "Za každou hodinu ujede 60 km, hodiny jsou 4.",
    "4 · 60 = 240 km.",
  ], 60),
  mk("P5_SLO_33", "p5_hmotnosti", 1, "Jedno balení mouky váží 500 gramů. Kolik kilogramů váží 6 takových balení?", "3", [
    "Šest balení váží 6 · 500 = 3 000 g.",
    "Jeden kilogram má 1 000 g, takže 3 000 g je 3 kg.",
  ], 90),
  mk("P5_SLO_34", "p5_vek", 1, "Babičce je 66 let a dědeček je o 3 roky starší. Kolik let mají babička s dědečkem dohromady?", "135", [
    "Dědečkovi je 66 + 3 = 69 let.",
    "Dohromady 66 + 69 = 135 let.",
  ], 90),
  // ───────── L2 ─────────
  mk("P5_SLO_35", "p5_dva_udaje", 2, "V sadu rostou jabloně a hrušně. Jabloní je 36, což je o polovinu víc než hrušní. Kolik hrušní roste v sadu?", "24", [
    "Hrušně rozdělíme na dvě stejné poloviny. Jabloní je o polovinu víc než hrušní, takže jabloně tvoří tři takové poloviny.",
    "Tři půlky jsou 36 stromů, jedna půlka je 36 : 3 = 12 stromů.",
    "Hrušně jsou dvě půlky: 2 · 12 = 24. Zkouška: polovina z 24 je 12 a 24 + 12 = 36.",
  ], 180),
  mk("P5_SLO_36", "p5_tempo", 2, "Tiskárna vytiskne za jednu minutu 25 stran. Kolik minut potřebuje na vytištění 450 stran?", "18", [
    "Zjišťujeme, kolikrát se 25 stran vejde do 450 stran: 450 : 25.",
    "Čtyři takové minuty dají 100 stran, takže 400 stran je 16 minut. Zbývá 50 stran, to jsou další 2 minuty.",
    "Celkem 16 + 2 = 18 minut. Zkouška: 18 · 25 = 450.",
  ], 150),
  mk("P5_SLO_37", "p5_hmotnosti", 2, "Na nákladní auto naložili 18 beden po 25 kilogramech. Auto unese nejvýše 600 kilogramů. Kolik dalších beden po 25 kilogramech se na auto ještě vejde?", "6", [
    "Naložené bedny váží 18 · 25 = 450 kg.",
    "Auto unese ještě 600 − 450 = 150 kg.",
    "Beden po 25 kg se vejde 150 : 25 = 6.",
  ], 150),
  mk("P5_SLO_38", "p5_vek", 2, "Za šest let bude Markétě dvakrát tolik let, kolik je jí dnes. Kolik let je Markétě dnes?", "6", [
    "Dnešní věk označíme jako jeden díl. Za šest let bude Markétě tolik, co dnes, a ještě 6 let navíc.",
    "To má být dvakrát tolik, co dnes, tedy dva díly. Těch 6 let navíc je proto přesně jeden díl.",
    "Markétě je dnes 6 let. Zkouška: za šest let jí bude 12, což je dvakrát 6.",
  ], 180),
  mk("P5_SLO_39", "p5_dva_udaje", 2, "Honza koupil 3 stejné housky a 2 stejné rohlíky za 29 korun. Jedna houska stojí 7 korun. Kolik korun stojí jeden rohlík?", null, [
    "Housky stojí 3 · 7 = 21 korun.",
    "Na rohlíky zbývá 29 − 21 = 8 korun.",
    "Jeden rohlík stojí 8 : 2 = 4 koruny. Správně je B).",
  ], 150, { moznosti: ["3", "4", "5", "6", "7"], spravna: 1 }),
  mk("P5_SLO_40", "p5_dva_udaje", 2, "Karel šetří. V pondělí uložil do pokladničky 35 korun, v úterý o 15 korun víc než v pondělí a ve středu polovinu toho, co v úterý. Kolik korun uložil za tyto tři dny?", "110", [
    "V úterý uložil 35 + 15 = 50 korun.",
    "Ve středu uložil polovinu z 50, tedy 25 korun.",
    "Dohromady 35 + 50 + 25 = 110 korun.",
  ], 150),
  // ───────── L3 ─────────
  mk("P5_SLO_41", "p5_logika", 3, "Ve třídě je 26 žáků. Fotbal hraje 15 žáků, volejbal hraje 12 žáků a 3 žáci nehrají ani jeden z těchto sportů. Kolik žáků hraje fotbal i volejbal?", "4", [
    "Nějaký sport hraje 26 − 3 = 23 žáků.",
    "Kdybychom sečetli fotbalisty a volejbalisty, vyjde 15 + 12 = 27. Ti, kdo hrají oba sporty, jsou započtení dvakrát.",
    "Rozdíl 27 − 23 = 4 je tedy počet žáků, kteří hrají oba sporty. Zkouška: jen fotbal 11, jen volejbal 8, oba 4, žádný 3 a 11 + 8 + 4 + 3 = 26.",
  ], 240),
  mk("P5_SLO_42", "p5_logika", 3, "V pohádce žijí dvouhlaví a tříhlaví draci. Dohromady je jich 7 a mají 16 hlav. Kolik je tříhlavých draků?", "2", [
    "Kdyby bylo všech 7 draků dvouhlavých, měli by 7 · 2 = 14 hlav. Ve skutečnosti je jich o 16 − 14 = 2 víc.",
    "Každý tříhlavý drak přidá oproti dvouhlavému jednu hlavu, takže tříhlavých draků jsou právě 2.",
    "Dvouhlavých je 5. Zkouška: 5 · 2 + 2 · 3 = 10 + 6 = 16 hlav.",
  ], 240),
  mk("P5_SLO_43", "p5_dva_udaje", 3, "V nádrži byla voda. V pondělí se spotřebovala jedna pětina vody, v úterý polovina toho, co zbylo po pondělí. V nádrži zbylo 60 litrů. Kolik litrů vody bylo v nádrži na začátku?", null, [
    "Po pondělí zbyly čtyři pětiny vody. V úterý se spotřebovala polovina z toho, takže zbyla polovina ze čtyř pětin, tedy dvě pětiny vody.",
    "Dvě pětiny jsou 60 litrů, jedna pětina je 60 : 2 = 30 litrů.",
    "Celá nádrž (pět pětin) má 5 · 30 = 150 litrů. Zkouška: pondělí 30, zbývá 120, úterý 60, zbývá 60. Správně je C).",
  ], 270, { moznosti: ["100", "120", "150", "180", "200"], spravna: 2 }),
  mk("P5_SLO_44", "p5_tempo", 3, "Do školy to má Tomáš 3 kilometry 600 metrů. Za minutu ušel 90 metrů. Vyšel v 7:25. V kolik hodin došel do školy? Napiš čas ve tvaru hodiny:minuty.", "8:05", [
    "Vzdálenost je 3 km 600 m = 3 600 m.",
    "Cesta trvá 3 600 : 90 = 40 minut. (Zkouška: 40 · 90 = 3 600.)",
    "Od 7:25 do 8:00 uplyne 35 minut, zbývá 5 minut, tedy Tomáš došel v 8:05.",
  ], 240),
  mk("P5_SLO_45", "p5_tempo", 3, "Nádrž pojme 200 litrů a je v ní už 20 litrů vody. První trubkou natéká 10 litrů za minutu a druhou 8 litrů za minutu. Obě trubky pustíme ve stejnou chvíli. Za kolik minut bude nádrž plná?", "10", [
    "Do plné nádrže chybí 200 − 20 = 180 litrů.",
    "Obě trubky společně přitečou za minutu 10 + 8 = 18 litrů.",
    "Nádrž bude plná za 180 : 18 = 10 minut. Zkouška: 10 · 18 = 180.",
  ], 240),
];
for (const e of ex) if (e.moznosti) e.odpoved = e.moznosti[e.spravna];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const A = (id) => by[id].odpoved;
const t = (h, m) => h * 60 + m;
const uniq = (e, v) => e.moznosti[e.spravna] === String(v) && e.moznosti.filter((m) => Number(m) === v).length === 1;

ok("31", 6 * 15 === 90 && A("P5_SLO_31") === "90");
ok("32", 4 * 60 === 240 && A("P5_SLO_32") === "240");
ok("33", 6 * 500 / 1000 === 3 && A("P5_SLO_33") === "3");
ok("34", 66 + (66 + 3) === 135 && A("P5_SLO_34") === "135");
{ const s = []; for (let h = 1; h < 200; h++) if (h + h / 2 === 36) s.push(h); ok("35", s.length === 1 && String(s[0]) === A("P5_SLO_35"), s); }
{ let m = 0; while (25 * m < 450) m++; ok("36", m === 18 && 25 * m === 450 && A("P5_SLO_36") === "18"); }
{ let k = 0; while (18 * 25 + (k + 1) * 25 <= 600) k++; ok("37", k === 6 && A("P5_SLO_37") === "6", k); }
{ const s = []; for (let m = 1; m < 100; m++) if (m + 6 === 2 * m) s.push(m); ok("38", s.length === 1 && String(s[0]) === A("P5_SLO_38"), s); }
{ const e = by.P5_SLO_39, s = []; for (let r = 1; r < 29; r++) if (3 * 7 + 2 * r === 29) s.push(r); ok("39", s.length === 1 && uniq(e, s[0]), s); }
ok("40", 35 + (35 + 15) + (35 + 15) / 2 === 110 && A("P5_SLO_40") === "110");
{ const s = []; // jen fotbal = 15 − o, jen volejbal = 12 − o
  for (let o = 0; o <= 12; o++) if ((15 - o) + (12 - o) + o + 3 === 26) s.push(o); ok("41", s.length === 1 && String(s[0]) === A("P5_SLO_41"), s); }
{ const s = []; for (let b = 0; b <= 7; b++) { const a = 7 - b; if (2 * a + 3 * b === 16) s.push(b); } ok("42", s.length === 1 && String(s[0]) === A("P5_SLO_42"), s); }
{ const e = by.P5_SLO_43, s = []; for (let x = 5; x <= 1000; x += 5) { const z1 = x - x / 5; if (z1 % 2 === 0 && z1 - z1 / 2 === 60) s.push(x); } ok("43", s.length === 1 && uniq(e, s[0]), s); }
{ let min = 0; while (90 * min < 3600) min++; ok("44", 90 * min === 3600 && hm(t(7, 25) + min) === "8:05" && A("P5_SLO_44") === "8:05", min); }
{ let min = 0, v = 20; while (v < 200) { v += 10 + 8; min++; } ok("45", v === 200 && min === 10 && A("P5_SLO_45") === "10", [v, min]); }

for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length === 5 && new Set(e.moznosti).size === 5 && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null || /^\d{1,2}:\d{2}$/.test(e.odpoved), e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
  ok(e.id + " kroky", e.reseni_kroky.length >= 2);
  if (e.obtiznost === 1) ok(e.id + " L1 bez dvojciferného dělení", !/\d :\s?\d\d/.test(e.zadani + e.reseni_kroky.join(" ")));
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
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = others.length ? `${prev.nazev} + 5. třída: Slovní úlohy a úvaha, třetí dávka (15 úloh)` : "5. třída — Slovní úlohy a úvaha, třetí dávka: dva údaje, tempo, hmotnosti, věk, logika (15 úloh: L1 ×4, L2 ×6, L3 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
