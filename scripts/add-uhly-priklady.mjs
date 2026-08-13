// Typ #4: úhly rozšíření — mnohoúhelník + obecný/rovnoramenný trojúhelník.
// Spustit: node scripts/add-uhly-priklady.mjs   (idempotentní podle id)
import fs from "fs";

const FILE = "src/data/databaze.json";

const NOVE = [
  // ── Mnohoúhelník: dopočítat úhel ze součtu (n−2)·180° ──
  {
    id: "UHL_M1", tema: "uhly", podtema: "ctyruhelnik", obtiznost: 1,
    image: { kind: "parametric", diagram: { typ: "mnohouhelnik", uhly: [110, 70, 95, null] } },
    zadani: "Ve čtyřúhelníku na obrázku urči velikost chybějícího úhlu (?).",
    odpoved: "85°",
    reseni_kroky: [
      "Součet vnitřních úhlů čtyřúhelníku je 360°.",
      "? = 360° − 110° − 70° − 95°.",
      "? = 85°.",
    ],
  },
  {
    id: "UHL_M2", tema: "uhly", podtema: "mnohouhelnik", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "mnohouhelnik", uhly: [100, 110, 120, 100, null] } },
    zadani: "V pětiúhelníku na obrázku urči velikost chybějícího úhlu (?).",
    odpoved: "110°",
    reseni_kroky: [
      "Součet vnitřních úhlů pětiúhelníku = (5 − 2) · 180° = 540°.",
      "? = 540° − 100° − 110° − 120° − 100°.",
      "? = 110°.",
    ],
  },
  // ── Obecný trojúhelník (téma úhly) ──
  {
    id: "UHL_T1", tema: "uhly", podtema: "vnitrni_uhly", obtiznost: 1,
    image: { kind: "parametric", diagram: { typ: "trojuhelnik", alfa: 40, beta: 60, hledany: "gama" } },
    zadani: "V trojúhelníku jsou dva úhly 40° a 60°. Urči velikost třetího úhlu (?).",
    odpoved: "80°",
    reseni_kroky: [
      "Součet vnitřních úhlů trojúhelníku je 180°.",
      "? = 180° − 40° − 60°.",
      "? = 80°.",
    ],
  },
  {
    id: "UHL_T2", tema: "uhly", podtema: "rovnoramenny_trojuhelnik", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "trojuhelnik", beta: 50, gama: 50, hledany: "alfa" } },
    zadani: "Rovnoramenný trojúhelník má oba úhly při základně 50°. Urči úhel u hlavního vrcholu (?).",
    odpoved: "80°",
    reseni_kroky: [
      "Úhly při základně jsou shodné: 50° a 50°.",
      "? = 180° − 50° − 50°.",
      "? = 80°.",
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
console.log(pridano === 0 ? "Nic k přidání ✅" : `Přidáno úhlových úloh: ${pridano} ✅`);
