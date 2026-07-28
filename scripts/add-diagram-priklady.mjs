// Enabler-ukázky: první obrázkové úlohy (parametrické SVG diagramy).
// Nahrazují i „slovní úhly bez obrázku", které Karel označil za nesmysl —
// teď má žák u úhlů skutečnou figuru.
//
// Spustit: node scripts/add-diagram-priklady.mjs   (idempotentní podle id)
import fs from "fs";

const FILE = "src/data/databaze.json";

const NOVE = [
  // ── Úhly u rovnoběžek (s obrázkem) ──
  {
    id: "UHL_D1", tema: "uhly", podtema: "rovnobezky", obtiznost: 1,
    diagram: { typ: "uhel_pricka", danyUhel: 65, hledany: "stridavy" },
    zadani: "Přímky p a q jsou rovnoběžné. Urči velikost vyznačeného úhlu (?).",
    odpoved: "65°",
    reseni_kroky: [
      "Vyznačený úhel je střídavý k danému úhlu 65°.",
      "Střídavé úhly u rovnoběžek proťatých příčkou jsou shodné.",
      "Hledaný úhel má tedy 65°.",
    ],
  },
  {
    id: "UHL_D2", tema: "uhly", podtema: "rovnobezky", obtiznost: 2,
    diagram: { typ: "uhel_pricka", danyUhel: 72, hledany: "vedlejsi" },
    zadani: "Přímky p a q jsou rovnoběžné. Urči velikost vyznačeného úhlu (?).",
    odpoved: "108°",
    reseni_kroky: [
      "Vyznačený úhel je vedlejší k danému úhlu 72°.",
      "Vedlejší úhly mají v součtu 180°.",
      "Hledaný úhel = 180° − 72° = 108°.",
    ],
  },
  {
    id: "UHL_D3", tema: "uhly", podtema: "rovnobezky", obtiznost: 2,
    diagram: { typ: "uhel_pricka", danyUhel: 115, hledany: "souhlasny" },
    zadani: "Přímky p a q jsou rovnoběžné. Urči velikost vyznačeného úhlu (?).",
    odpoved: "115°",
    reseni_kroky: [
      "Vyznačený úhel je souhlasný s daným úhlem 115°.",
      "Souhlasné úhly u rovnoběžek jsou shodné.",
      "Hledaný úhel má 115°.",
    ],
  },
  // ── Trojúhelník (s obrázkem) ──
  {
    id: "GEO_D1", tema: "geometrie", podtema: "rovinne", obtiznost: 1,
    diagram: { typ: "trojuhelnik", alfa: 60, beta: 70, hledany: "gama" },
    zadani: "V trojúhelníku ABC je α = 60° a β = 70°. Urči velikost úhlu γ.",
    odpoved: "50°",
    reseni_kroky: [
      "Součet vnitřních úhlů trojúhelníku je vždy 180°.",
      "γ = 180° − α − β = 180° − 60° − 70°.",
      "γ = 50°.",
    ],
  },
  {
    id: "GEO_D2", tema: "geometrie", podtema: "rovinne", obtiznost: 1,
    diagram: { typ: "trojuhelnik", alfa: 90, beta: 35, hledany: "gama" },
    zadani: "Pravoúhlý trojúhelník má u vrcholu B úhel 35°. Urči úhel γ u vrcholu C.",
    odpoved: "55°",
    reseni_kroky: [
      "Úhel u A je pravý (90°).",
      "γ = 180° − 90° − 35°.",
      "γ = 55°.",
    ],
  },
  // ── Obdélník (s obrázkem) ──
  {
    id: "GEO_D3", tema: "geometrie", podtema: "rovinne", obtiznost: 1,
    diagram: { typ: "obdelnik", sirka: "6 cm", vyska: "4 cm" },
    zadani: "Urči obvod obdélníku na obrázku.",
    odpoved: "20 cm",
    reseni_kroky: [
      "Obvod = 2 · (šířka + výška).",
      "Obvod = 2 · (6 + 4) = 2 · 10.",
      "Obvod = 20 cm.",
    ],
  },
  {
    id: "GEO_D4", tema: "geometrie", podtema: "rovinne", obtiznost: 1,
    diagram: { typ: "obdelnik", sirka: "8 cm", vyska: "5 cm" },
    zadani: "Urči obsah obdélníku na obrázku.",
    odpoved: "40 cm²",
    reseni_kroky: [
      "Obsah = šířka · výška.",
      "Obsah = 8 · 5.",
      "Obsah = 40 cm².",
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
console.log(pridano === 0 ? "Nic k přidání ✅" : `Přidáno obrázkových úloh: ${pridano} ✅`);
