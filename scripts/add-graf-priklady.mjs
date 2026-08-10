// Typ #2 (souřadnicová síť + graf) — ověření autoringu.
// Obrázek nese parametricky přes `image`; žádný kód na úlohu, jen JSON.
// Spustit: node scripts/add-graf-priklady.mjs   (idempotentní podle id)
import fs from "fs";

const FILE = "src/data/databaze.json";

const NOVE = [
  // ── Čtení souřadnic bodu ──
  {
    id: "GRAF_G1", tema: "grafy_logika", podtema: "souradnice", obtiznost: 1,
    image: { kind: "parametric", diagram: { typ: "graf", body: [{ x: 3, y: 2, label: "A" }] } },
    zadani: "Jaká je první (x-ová) souřadnice bodu A na obrázku?",
    odpoved: "3",
    reseni_kroky: [
      "První souřadnice se čte na vodorovné ose x.",
      "Bod A leží nad číslem 3.",
      "x-ová souřadnice je 3.",
    ],
  },
  {
    id: "GRAF_G2", tema: "grafy_logika", podtema: "souradnice", obtiznost: 1,
    image: { kind: "parametric", diagram: { typ: "graf", body: [{ x: -3, y: 2, label: "B" }] } },
    zadani: "Jaká je druhá (y-ová) souřadnice bodu B na obrázku?",
    odpoved: "2",
    reseni_kroky: [
      "Druhá souřadnice se čte na svislé ose y.",
      "Bod B leží ve výšce 2.",
      "y-ová souřadnice je 2.",
    ],
  },
  // ── Čtení z lineárního grafu ──
  {
    id: "GRAF_G3", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "graf", xMin: -1, xMax: 5, yMin: -1, yMax: 5, body: [{ x: 0, y: 1, label: "A" }, { x: 2, y: 3, label: "B" }], primka: { x1: 0, y1: 1, x2: 2, y2: 3, prodlouzit: true } } },
    zadani: "Přímka prochází body A a B. Jakou hodnotu y má pro x = 4?",
    odpoved: "5",
    reseni_kroky: [
      "Z bodů A[0; 1] a B[2; 3] plyne, že s každým krokem o 1 doprava y stoupne o 1.",
      "Přímka má předpis y = x + 1.",
      "Pro x = 4 je y = 4 + 1 = 5.",
    ],
  },
  {
    id: "GRAF_G4", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "graf", body: [{ x: -2, y: -1, label: "A" }, { x: 2, y: 3, label: "B" }], primka: { x1: -2, y1: -1, x2: 2, y2: 3, prodlouzit: true } } },
    zadani: "V jakém bodě protíná přímka osu y? Napiš hodnotu y (pro x = 0).",
    odpoved: "1",
    reseni_kroky: [
      "Přímka prochází body A[−2; −1] a B[2; 3] → předpis y = x + 1.",
      "Osu y protíná tam, kde x = 0.",
      "y = 0 + 1 = 1.",
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
console.log(pridano === 0 ? "Nic k přidání ✅" : `Přidáno grafových úloh: ${pridano} ✅`);
