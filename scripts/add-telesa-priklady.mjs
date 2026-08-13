// Typ #5: prostorová tělesa — kvádr, krychle, válec (objem, povrch).
// Spustit: node scripts/add-telesa-priklady.mjs   (idempotentní podle id)
import fs from "fs";

const FILE = "src/data/databaze.json";

const NOVE = [
  {
    id: "TEL_1", tema: "geometrie", podtema: "prostorova", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "teleso", tvar: "kvadr", a: "5 cm", b: "3 cm", c: "4 cm" } },
    zadani: "Urči objem kvádru na obrázku.",
    odpoved: "60 cm³",
    reseni_kroky: [
      "Objem kvádru = a · b · c.",
      "V = 5 · 3 · 4.",
      "V = 60 cm³.",
    ],
  },
  {
    id: "TEL_2", tema: "geometrie", podtema: "prostorova", obtiznost: 1,
    image: { kind: "parametric", diagram: { typ: "teleso", tvar: "krychle", a: "3 cm" } },
    zadani: "Urči objem krychle s hranou 3 cm.",
    odpoved: "27 cm³",
    reseni_kroky: [
      "Objem krychle = a³.",
      "V = 3³ = 3 · 3 · 3.",
      "V = 27 cm³.",
    ],
  },
  {
    id: "TEL_3", tema: "geometrie", podtema: "prostorova", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "teleso", tvar: "krychle", a: "3 cm" } },
    zadani: "Urči povrch krychle s hranou 3 cm.",
    odpoved: "54 cm²",
    reseni_kroky: [
      "Povrch krychle = 6 · a².",
      "S = 6 · 3² = 6 · 9.",
      "S = 54 cm².",
    ],
  },
  {
    id: "TEL_4", tema: "geometrie", podtema: "prostorova", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "teleso", tvar: "valec", r: "r = 2 cm", v: "v = 5 cm" } },
    zadani: "Urči objem válce na obrázku. Počítej s π ≈ 3,14.",
    odpoved: "62,8 cm³",
    reseni_kroky: [
      "Objem válce = π · r² · v.",
      "V = 3,14 · 2² · 5 = 3,14 · 4 · 5.",
      "V = 62,8 cm³.",
    ],
  },
];

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
const existuje = new Set(data.examples.map((e) => e.id));
let pridano = 0;
for (const u of NOVE) {
  if (existuje.has(u.id)) continue;
  data.examples.push({ ...u, cas_sekund: 60, sm2_interval: 1 });
  pridano++;
}
if (data.metadata && typeof data.metadata.total === "number") data.metadata.total = data.examples.length;
fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(pridano === 0 ? "Nic k přidání ✅" : `Přidáno těles: ${pridano} ✅`);
