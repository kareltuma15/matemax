// Typ [C]: těžší úhly — přímky/paprsky jedním bodem, stupně a minuty (°′), výběr A–E.
// Figura je ILUSTRAČNÍ (neměřit). Spustit: node scripts/add-paprsky-priklady.mjs
import fs from "fs";

const FILE = "src/data/databaze.json";

const NOVE = [
  // Vedlejší úhel: 180° − daný
  {
    id: "PAP_1", tema: "uhly", podtema: "vedlejsi_uhly", obtiznost: 2,
    image: {
      kind: "parametric",
      diagram: {
        typ: "paprsky",
        paprsky: [{ smer: 0, label: "p" }, { smer: 180 }, { smer: -126.5, label: "r" }, { smer: 53.5 }],
        uhly: [
          { mezi: [0, 2], popis: "126°30′" },
          { mezi: [2, 1], popis: "α", r: 30 },
        ],
      },
    },
    zadani: "Přímky p a r se protínají v jednom bodě. Jaká je velikost vedlejšího úhlu α? (Obrázek je ilustrační.)",
    moznosti: ["53°30′", "63°30′", "43°30′", "126°30′"],
    spravna: 0,
    odpoved: "53°30′",
    reseni_kroky: [
      "Vedlejší úhly mají v součtu 180°.",
      "α = 180° − 126°30′ = 179°60′ − 126°30′.",
      "α = 53°30′. Správně A).",
    ],
  },
  // Vrcholové úhly: shodné
  {
    id: "PAP_2", tema: "uhly", podtema: "vrcholove_uhly", obtiznost: 2,
    image: {
      kind: "parametric",
      diagram: {
        typ: "paprsky",
        paprsky: [{ smer: 0, label: "p" }, { smer: 180 }, { smer: 40, label: "q" }, { smer: 220 }],
        uhly: [
          { mezi: [0, 2], popis: "47°30′" },
          { mezi: [1, 3], popis: "α" },
        ],
      },
    },
    zadani: "Přímky p a q se protínají. Jaká je velikost vrcholového úhlu α k úhlu 47°30′? (Obrázek je ilustrační.)",
    moznosti: ["47°30′", "132°30′", "42°30′", "94°30′"],
    spravna: 0,
    odpoved: "47°30′",
    reseni_kroky: [
      "Vrcholové úhly jsou shodné.",
      "α má stejnou velikost jako daný úhel.",
      "α = 47°30′. Správně A).",
    ],
  },
  // Úhly na přímce: součet 180°, s pravým úhlem
  {
    id: "PAP_3", tema: "uhly", podtema: "vedlejsi_uhly", obtiznost: 3,
    image: {
      kind: "parametric",
      diagram: {
        typ: "paprsky",
        paprsky: [{ smer: 0 }, { smer: 180 }, { smer: -90 }, { smer: -124.5 }],
        uhly: [
          { mezi: [0, 2], popis: "", pravy: true },
          { mezi: [2, 3], popis: "34°30′" },
          { mezi: [3, 1], popis: "α", r: 30 },
        ],
      },
    },
    zadani: "Úhly leží na přímce a dělí ji na pravý úhel, úhel 34°30′ a úhel α. Jaká je velikost úhlu α? (Obrázek je ilustrační.)",
    moznosti: ["55°30′", "45°30′", "64°30′", "124°30′"],
    spravna: 0,
    odpoved: "55°30′",
    reseni_kroky: [
      "Úhly na přímce mají součet 180°.",
      "α = 180° − 90° − 34°30′ = 90° − 34°30′.",
      "α = 55°30′. Správně A).",
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
console.log(pridano === 0 ? "Nic k přidání ✅" : `Přidáno úhlových úloh (paprsky): ${pridano} ✅`);
