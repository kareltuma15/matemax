// Rozdělí úlohy 9. třídy do dovedností (src/lib/dovednosti.ts) a vybere testové příklady.
//   node scripts/rozdel-dovednosti.mjs          … jen vypíše přehled, nic nezapíše
//   node scripts/rozdel-dovednosti.mjs --zapsat … zapíše pole `dovednost` a přesuny do databáze
// Úloha, která už pole `dovednost` má, se nepřepisuje (ruční oprava zůstane).
import fs from "fs";
import { DOVEDNOSTI, TESTOVE, dovednostUlohy } from "../src/lib/dovednosti.ts";

const SOUBORY = ["src/data/databaze.json", "src/data/cermat-200.json", "src/data/doplnky-uhly-souhrnne.json", "src/data/konstrukce-interaktivni.json"];
const zapsat = process.argv.includes("--zapsat");

// Úlohy psané podle skutečných testů CERMAT (rodiny *3_ a úlohy výběru A–E / s podúlohami z rodin *2_).
const TESTOVA_RODINA = /^(ZLO3|ROV3|VYR3|GEOB3|SLO3|SLD3|GRA3|UHN3|UHL_L3|KONS3|SOU3)_/;
const TESTOVY_FORMAT_RODINA = /^(SLO2|SOU2|UHN2|GRA2)_/;
const TESTOVE_NAVIC = new Set(["MOZ_2"]);
const jeTestova = (e) =>
  TESTOVA_RODINA.test(e.id) || TESTOVE_NAVIC.has(e.id) ||
  (TESTOVY_FORMAT_RODINA.test(e.id) && ((e.moznosti?.length ?? 0) > 0 || (e.podulohy?.length ?? 0) > 0 || (e.tvrzeni?.length ?? 0) > 0));

// Úlohy, které byly ve špatném tématu (podle id).
const PRESUNY = {
  GEO_053: { tema: "slovni_ulohy", podtema: "pomer_meritko" }, GEO_058: { tema: "slovni_ulohy", podtema: "pomer_meritko" },
  GEO_070: { tema: "uhly", podtema: "mnohouhelnik" }, GEO_076: { tema: "uhly", podtema: "mnohouhelnik" },
  GEO_078: { tema: "uhly", podtema: "pravidelny_mnohouhelnik" }, GEO_079: { tema: "uhly", podtema: "mnohouhelnik" },
  GEO_080: { tema: "uhly", podtema: "pravidelny_mnohouhelnik" },
  GEO_D1: { tema: "uhly", podtema: "vnitrni_uhly" }, GEO_D2: { tema: "uhly", podtema: "vnitrni_uhly" },
  GEO_065: { tema: "uhly", podtema: "vnitrni_uhly" }, GEO_073: { tema: "uhly", podtema: "kruznice_opsana" },
};
// Pythagorova věta jako krok řešení (úhlopříčka, výška rovnoramenného trojúhelníku, tečna), text to nepozná.
const DOVEDNOST_PODLE_ID = {
  GEO_013: "pythagoras", GEO_014: "pythagoras", GEO_023: "pythagoras", GEO_024: "pythagoras", GEO_026: "pythagoras",
  GEO_028: "pythagoras", GEO_033: "pythagoras", GEO_051: "pythagoras", GEO_052: "pythagoras", GEO_083: "pythagoras",
  GEO_085: "pythagoras", GEOB2_08: "obvod_obsah",
};
const PRESUN_TEMA = [[(e) => e.tema === "vyrazy" && e.podtema === "pythagorova_veta", { tema: "geometrie", podtema: "pythagorova_veta" }]];

// Geometrie: podtéma „rovinne“ míchá obvody, kruhy a Pythagorovu větu — rozliší se podle textu.
const PYTHAGORAS = /pythagor|přepon|odvěsn|Délka tyče od základny ke střeše|Délka lana od vrcholu/i;
const KRUH = /kruh|kružnic|výseč|π|\\pi|poloměr|průměr kola/i;

const text = (e) => [e.zadani, ...(e.reseni_kroky ?? [])].join(" ");
const statistika = {};
const zmeny = [];

for (const soubor of SOUBORY) {
  if (!fs.existsSync(soubor)) continue;
  const db = JSON.parse(fs.readFileSync(soubor, "utf8"));
  let zmeneno = 0;
  for (const e of db.examples) {
    if (String(e.tema).startsWith("p5_")) continue;
    const cil = PRESUNY[e.id];
    if (cil && e.tema !== cil.tema) { zmeny.push(`${e.id}: ${e.tema} → ${cil.tema}`); Object.assign(e, cil); zmeneno++; }
    for (const [test, cil] of PRESUN_TEMA) if (test(e)) { zmeny.push(`${e.id}: ${e.tema} → ${cil.tema}`); Object.assign(e, cil); zmeneno++; }

    if (!e.dovednost) {
      let d;
      if (jeTestova(e)) d = TESTOVE;
      else if (DOVEDNOST_PODLE_ID[e.id]) d = DOVEDNOST_PODLE_ID[e.id];
      else if (e.tema === "geometrie" && e.podtema === "rovinne") d = PYTHAGORAS.test(text(e)) ? "pythagoras" : KRUH.test(text(e)) ? "kruh" : undefined;
      if (d) { e.dovednost = d; zmeneno++; }
    }
    const d = dovednostUlohy(e) ?? "?? " + e.podtema;
    const s = ((statistika[e.tema] ??= {})[d] ??= [0, 0, 0]);
    s[e.obtiznost - 1]++;
  }
  if (zapsat && zmeneno > 0) fs.writeFileSync(soubor, JSON.stringify(db, null, 2));
  console.log(`${soubor}: ${zmeneno} změn${zapsat ? " zapsáno" : ""}`);
}

console.log("\nPřesuny:\n  " + zmeny.join("\n  "));
for (const [tema, ds] of Object.entries(statistika)) {
  console.log(`\n${tema}`);
  const poradi = [...(DOVEDNOSTI[tema] ?? []).map((d) => d.klic), TESTOVE, ...Object.keys(ds)];
  for (const k of [...new Set(poradi)]) if (ds[k]) console.log(`  ${k.padEnd(22)} ${ds[k].join("/").padEnd(10)} = ${ds[k].reduce((a, b) => a + b, 0)}`);
}
if (!zapsat) console.log("\n(jen přehled — zapíše se s --zapsat)");
