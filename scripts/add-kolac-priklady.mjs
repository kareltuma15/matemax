// Typ #2 (přepracováno): koláčový graf ke slovní úloze — formát CERMAT.
// Obrázek nese procenta + legendu; absolutní celek (24 h, 30 žáků) je v zadání.
// Spustit: node scripts/add-kolac-priklady.mjs   (idempotentní podle id)
import fs from "fs";

const FILE = "src/data/databaze.json";

const DENNI = {
  typ: "kolac", nazev: "Denní činnosti (24 h)",
  casti: [
    { label: "zaměstnání", procenta: 25 },
    { label: "spánek", procenta: 35 },
    { label: "denní povinnosti", procenta: 30 },
    { label: "volný čas", procenta: 10 },
  ],
};

const NOVE = [
  {
    id: "KOL_1", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 2,
    image: { kind: "parametric", diagram: DENNI },
    zadani: "Graf ukazuje rozdělení dne (24 hodin) paní Kratochvílové. Kolik hodin denně tráví v zaměstnání?",
    odpoved: "6 h",
    reseni_kroky: [
      "Zaměstnání zabírá 25 % z 24 hodin.",
      "25 % = 1/4, tedy 24 · 0,25 = 24 / 4.",
      "= 6 hodin.",
    ],
  },
  {
    id: "KOL_2", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 2,
    image: { kind: "parametric", diagram: DENNI },
    zadani: "Graf ukazuje rozdělení dne (24 hodin). Kolik hodin denně spí? Výsledek zaokrouhli na jedno desetinné místo.",
    odpoved: "8,4 h",
    reseni_kroky: [
      "Spánek zabírá 35 % z 24 hodin.",
      "24 · 0,35 = 8,4.",
      "= 8,4 hodiny.",
    ],
  },
  {
    id: "KOL_3", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 3,
    image: {
      kind: "parametric",
      diagram: {
        typ: "kolac", nazev: "Volný čas",
        casti: [
          { label: "TV", procenta: 40 },
          { label: "sport", procenta: 35 },
          { label: "četba", procenta: 25 },
        ],
      },
    },
    zadani: "Volný čas paní Kratochvílové trvá 144 minut. Kolik z nich připadá na sport? Výsledek zaokrouhli na celé minuty.",
    odpoved: "50 min",
    reseni_kroky: [
      "Sport zabírá 35 % ze 144 minut.",
      "144 · 0,35 = 50,4.",
      "Po zaokrouhlení na celé minuty = 50 minut.",
    ],
  },
  {
    id: "KOL_4", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 1,
    image: {
      kind: "parametric",
      diagram: {
        typ: "kolac", nazev: "Oblíbený předmět (30 žáků)",
        casti: [
          { label: "matematika", procenta: 40 },
          { label: "čeština", procenta: 35 },
          { label: "angličtina", procenta: 25 },
        ],
      },
    },
    zadani: "Ve třídě je 30 žáků. Kolik z nich má nejraději matematiku?",
    odpoved: "12",
    reseni_kroky: [
      "Matematiku má nejraději 40 % z 30 žáků.",
      "30 · 0,40 = 12.",
      "= 12 žáků.",
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
console.log(pridano === 0 ? "Nic k přidání ✅" : `Přidáno koláčových úloh: ${pridano} ✅`);
