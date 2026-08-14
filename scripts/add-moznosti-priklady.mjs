// Režim výběru A–E (MoznostiCard) — ověření mechanismu napříč zobrazeními.
// Ukazuje: parametrický obrázek + A–E, statický obrázek + A–E, text + A–E.
// Spustit: node scripts/add-moznosti-priklady.mjs   (idempotentní podle id)
import fs from "fs";

const FILE = "src/data/databaze.json";

const NOVE = [
  // Parametrický obrázek (koláč) + výběr
  {
    id: "MOZ_1", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 2,
    image: {
      kind: "parametric",
      diagram: {
        typ: "kolac", nazev: "Denní činnosti (24 h)",
        casti: [
          { label: "zaměstnání", procenta: 25 },
          { label: "spánek", procenta: 35 },
          { label: "denní povinnosti", procenta: 30 },
          { label: "volný čas", procenta: 10 },
        ],
      },
    },
    zadani: "Kolik hodin denně tvoří spánek?",
    moznosti: ["6 hodin", "7,5 hodiny", "8,4 hodiny", "9,6 hodiny"],
    spravna: 2,
    odpoved: "8,4 hodiny",
    reseni_kroky: ["Spánek = 35 % z 24 hodin.", "24 · 0,35 = 8,4.", "Správně je C) 8,4 hodiny."],
  },
  // Statický obrázek (složená geometrie) + výběr — přesně formát CERMAT
  {
    id: "MOZ_2", tema: "geometrie", podtema: "rovinne", obtiznost: 3,
    image: {
      kind: "static",
      url: "/obrazky/geometrie/lichobeznik-slozeny.svg",
      width: 320, height: 210,
      alt: "Pravoúhlý lichoběžník ABCD rozdělený úsečkou DP na čtverec o straně 6 cm a trojúhelník s odvěsnami 3 cm a 6 cm",
    },
    zadani: "Lichoběžník ABCD je úsečkou DP rozdělen na čtverec PBCD (strana 6 cm) a trojúhelník APD (AP = 3 cm). Jaký je obsah celého lichoběžníku? (Obrázek je ilustrační.)",
    moznosti: ["42 cm²", "45 cm²", "48 cm²", "51 cm²"],
    spravna: 1,
    odpoved: "45 cm²",
    reseni_kroky: [
      "Obsah čtverce = 6 · 6 = 36 cm².",
      "Obsah trojúhelníku = (3 · 6) / 2 = 9 cm².",
      "Celkem = 36 + 9 = 45 cm². Správně je B).",
    ],
  },
  // Text + výběr (bez obrázku)
  {
    id: "MOZ_3", tema: "geometrie", podtema: "rovinne", obtiznost: 2,
    zadani: "Obdélník má obvod 24 cm a jednu stranu dlouhou 5 cm. Jaký je jeho obsah?",
    moznosti: ["30 cm²", "35 cm²", "40 cm²", "45 cm²"],
    spravna: 1,
    odpoved: "35 cm²",
    reseni_kroky: [
      "Polovina obvodu = 24 / 2 = 12 cm = součet dvou sousedních stran.",
      "Druhá strana = 12 − 5 = 7 cm.",
      "Obsah = 5 · 7 = 35 cm². Správně je B).",
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
console.log(pridano === 0 ? "Nic k přidání ✅" : `Přidáno úloh s výběrem: ${pridano} ✅`);
