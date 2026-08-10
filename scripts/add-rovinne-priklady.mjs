// Typ #1 (rovinné obrazce) — ověření autoringu: lichoběžník + kruh.
// Každá úloha nese obrázek PARAMETRICKY přes `image` (žádný kód, jen JSON).
// Spustit: node scripts/add-rovinne-priklady.mjs   (idempotentní podle id)
import fs from "fs";

const FILE = "src/data/databaze.json";

const NOVE = [
  // ── Lichoběžník ──
  {
    id: "GEO_L1", tema: "geometrie", podtema: "rovinne", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "lichobeznik", a: "8 cm", c: "4 cm", vyska: "5 cm" } },
    zadani: "Urči obsah lichoběžníku na obrázku.",
    odpoved: "30 cm²",
    reseni_kroky: [
      "Obsah lichoběžníku = (a + c) / 2 · v.",
      "S = (8 + 4) / 2 · 5 = 6 · 5.",
      "S = 30 cm².",
    ],
  },
  {
    id: "GEO_L2", tema: "geometrie", podtema: "rovinne", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "lichobeznik", a: "10 cm", c: "6 cm", b: "4 cm", d: "4 cm" } },
    zadani: "Urči obvod rovnoramenného lichoběžníku na obrázku.",
    odpoved: "24 cm",
    reseni_kroky: [
      "Obvod = součet všech čtyř stran.",
      "o = 10 + 6 + 4 + 4.",
      "o = 24 cm.",
    ],
  },
  // ── Kruh ──
  {
    id: "GEO_K1", tema: "geometrie", podtema: "rovinne", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "kruh", polomer: "r = 5 cm" } },
    zadani: "Urči obvod kruhu na obrázku. Počítej s π ≈ 3,14.",
    odpoved: "31,4 cm",
    reseni_kroky: [
      "Obvod kruhu = 2 · π · r.",
      "o = 2 · 3,14 · 5.",
      "o = 31,4 cm.",
    ],
  },
  {
    id: "GEO_K2", tema: "geometrie", podtema: "rovinne", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "kruh", polomer: "r = 3 cm" } },
    zadani: "Urči obsah kruhu na obrázku. Počítej s π ≈ 3,14.",
    odpoved: "28,26 cm²",
    reseni_kroky: [
      "Obsah kruhu = π · r².",
      "S = 3,14 · 3² = 3,14 · 9.",
      "S = 28,26 cm².",
    ],
  },
  {
    id: "GEO_K3", tema: "geometrie", podtema: "rovinne", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "kruh", prumer: "d = 10 cm" } },
    zadani: "Urči obvod kruhu, jehož průměr je na obrázku. Počítej s π ≈ 3,14.",
    odpoved: "31,4 cm",
    reseni_kroky: [
      "Obvod kruhu lze počítat i z průměru: o = π · d.",
      "o = 3,14 · 10.",
      "o = 31,4 cm.",
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
console.log(pridano === 0 ? "Nic k přidání ✅" : `Přidáno rovinných úloh: ${pridano} ✅`);
