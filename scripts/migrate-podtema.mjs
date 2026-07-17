// Migrace podtémat (audit 2026-07): geometrie → rovinné/prostorové + oprava
// poškozené diakritiky. Pouští se ručně: node scripts/migrate-podtema.mjs
// Idempotentní — druhý běh už nic nezmění.
import fs from "fs";

const FILES = ["src/data/databaze.json", "src/data/cermat-200.json"];

// 3D → prostorová, ostatní geometrie → rovinné. Detekce podle klíčových slov,
// aby fungovala i pro budoucí příklady.
const IS_3D = /(objem|povrch|teles|t_les|kvadr|krychl|valec|jehlan|kuzel|koule|hranol)/;

// Poškozená diakritika (ě/í/á/ů → _) mimo geometrii, kde se podtema stejně přepíše.
const DIACRITICS = {
  "d_leni": "deleni",                                             // dělení (zlomky)
  "pythagorova_v_ta": "pythagorova_veta",                         // věta (výrazy)
  "pythagorova_v_ta_aplikace": "pythagorova_veta_aplikace",
  "pricka_a_rovnob_zky_neznamy_uhel": "pricka_a_rovnobezky_neznamy_uhel", // rovnoběžky (úhly)
  "trojuhelnik_rovnice_z_uhl": "trojuhelnik_rovnice_z_uhlu",      // úhlů
  "kombinace_rovnob_zek_a_trojuhelniku": "kombinace_rovnobezek_a_trojuhelniku",
  "kombinatorika_vyb_r": "kombinatorika_vyber",                   // výběr (grafy_logika)
  "rovnob_znik_uhly": "rovnobeznik_uhly",                         // rovnoběžník (úhly)
  "trojuhelnik_vn_jsi_uhel": "trojuhelnik_vnejsi_uhel",           // vnější (úhly)
  "vn_jsi_uhel_trojuhelniku": "vnejsi_uhel_trojuhelniku",
};

// Geometrie už přemapovaná na tyto hodnoty — chrání idempotenci (jinak by IS_3D
// druhý běh přepsal "prostorova" zpět na "rovinne").
const GEO_DONE = new Set(["rovinne", "prostorova"]);

let geo = 0, dia = 0;
for (const file of FILES) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const ex of data.examples) {
    if (ex.tema === "geometrie") {
      if (GEO_DONE.has(ex.podtema)) continue;
      const next = IS_3D.test(ex.podtema) ? "prostorova" : "rovinne";
      if (ex.podtema !== next) { ex.podtema = next; geo++; }
    } else if (DIACRITICS[ex.podtema]) {
      ex.podtema = DIACRITICS[ex.podtema]; dia++;
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`  ${file} — zapsáno`);
}
console.log(`Hotovo: geometrie přemapováno ${geo}, diakritika opravena ${dia}.`);
