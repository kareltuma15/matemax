// 5. třída: CERMAT od 27. 10. 2026 vypustil písemné dělení dvojciferným dělitelem. Čtyři úlohy na něm stály nebo vycházely se zbytkem.
// Tři tělesa mají jen nový postup (počet dílků podél hran), výsledek zůstává; P5_JED_07 má nové zadání bez zbytku.
// Spuštění: node scripts/fix-5-deleni.mjs → přepíše tyto úlohy v src/data/nahled-batch.json (jiné dávky nechá). Výsledky se nezávisle přepočítají.
import fs from "node:fs";

const db = JSON.parse(fs.readFileSync("src/data/databaze-5.json", "utf8")).examples;
const vzit = (id) => { const e = db.find((x) => x.id === id); if (!e) throw new Error(id); return e; };

const ex = [
  { ...vzit("P5_TEL_29"), reseni_kroky: [
    "Hrana krychle se musí dát složit z dílků, takže musí být násobkem 2 cm, 4 cm i 6 cm. Nejmenší takové číslo je 12, hrana krychle je 12 cm.",
    "Podél hrany 12 cm se vejde 12 : 2 = 6 dílků v prvním směru, 12 : 4 = 3 dílky ve druhém a 12 : 6 = 2 dílky ve třetím.",
    "Potřeba je 6 · 3 · 2 = 36 dílků.",
  ] },
  { ...vzit("P5_TEL_45"), reseni_kroky: [
    "Hrana krychle se musí dát složit z dílků, takže musí být násobkem 3 cm, 4 cm i 6 cm. Nejmenší takové číslo je 12, hrana krychle je 12 cm.",
    "Podél hrany 12 cm se vejdou 12 : 3 = 4 dílky v prvním směru, 12 : 4 = 3 dílky ve druhém a 12 : 6 = 2 dílky ve třetím.",
    "Potřeba je 4 · 3 · 2 = 24 dílků.",
  ] },
  { ...vzit("P5_TEL_23"), reseni_kroky: [
    "Dílky se dají poskládat bez mezer: jednu stranu 6 cm vyplní dva dílky po 3 cm, druhou stranu 6 cm tři dílky po 2 cm a stranu 8 cm dva dílky po 4 cm.",
    "Potřeba je 2 · 3 · 2 = 12 dílků.",
  ] },
  { ...vzit("P5_JED_07"),
    zadani: "Každý díl pořadu trvá 50 minut a mezi dvěma díly je vždy přestávka 10 minut. Kolik nejvíce celých dílů lze zhlédnout za 4 hodiny?",
    odpoved: "4",
    reseni_kroky: [
      "Čtyři hodiny jsou 4 · 60 = 240 minut.",
      "Čtyři díly a tři přestávky mezi nimi trvají 4 · 50 + 3 · 10 = 230 minut, to se do 240 minut vejde.",
      "Pět dílů a čtyři přestávky by trvalo 5 · 50 + 4 · 10 = 290 minut, to je moc. Stihnou se nejvíc 4 díly.",
    ] },
];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const A = (id) => ex.find((e) => e.id === id).odpoved;
/** Nejmenší hrana krychle složené z dílků (hrubou silou) a počet dílků bez objemů. */
const krychle = (a, b, c) => { for (let h = 1; h < 1000; h++) if (h % a === 0 && h % b === 0 && h % c === 0) return (h / a) * (h / b) * (h / c); };
ok("TEL_29", String(krychle(2, 4, 6)) === A("P5_TEL_29") && 12 ** 3 / 48 === 36);
ok("TEL_45", String(krychle(3, 4, 6)) === A("P5_TEL_45") && 12 ** 3 / 72 === 24);
ok("TEL_23", String((6 / 3) * (6 / 2) * (8 / 4)) === A("P5_TEL_23") && (6 * 6 * 8) / (2 * 3 * 4) === 12);
{ let n = 0; while ((n + 1) * 50 + n * 10 <= 240) n++; ok("JED_07", String(n) === A("P5_JED_07"), n); }
for (const e of ex) ok(e.id + " bez dvojciferného dělitele mimo násobky 10", ![...(e.zadani + " " + e.reseni_kroky.join(" ")).matchAll(/ : (\d{2,3})(?!\d)/g)].some((m) => Number(m[1]) % 10 !== 0 && Number(m[1]) !== 12));
console.log(`úloh: ${ex.length} | chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

const ids = ex.map((e) => e.id);
let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !ids.includes(e.id));
const nazev = "5. třída — čtyři úlohy upravené kvůli vypuštěnému písemnému dělení dvojciferným dělitelem";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úloh)`);
