// Grafy s CHYBĚJÍCÍM údajem (?) — klasický CERMAT trik: dopočítat ze 100 % / z celku.
// Spustit: node scripts/add-chybejici-priklady.mjs   (idempotentní podle id)
import fs from "fs";

const FILE = "src/data/databaze.json";

const NOVE = [
  // ── Koláč: chybí jedna výseč → dopočítat ze 100 % ──
  {
    id: "KOL_5", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 2,
    image: {
      kind: "parametric",
      diagram: {
        typ: "kolac", nazev: "Denní činnosti (24 h)",
        casti: [
          { label: "zaměstnání", procenta: 25 },
          { label: "spánek", procenta: 35 },
          { label: "denní povinnosti", procenta: 30 },
          { label: "volný čas", procenta: 10, skryta: true },
        ],
      },
    },
    zadani: "V grafu chybí údaj u volného času. Kolik procent dne zabírá volný čas?",
    odpoved: "10 %",
    reseni_kroky: [
      "Celý graf je 100 %.",
      "Zbytek = 100 − 25 − 35 − 30.",
      "= 10 %.",
    ],
  },
  {
    id: "KOL_6", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 3,
    image: {
      kind: "parametric",
      diagram: {
        typ: "kolac", nazev: "Rozpočet (12 000 Kč)",
        casti: [
          { label: "nájem", procenta: 45 },
          { label: "jídlo", procenta: 30 },
          { label: "úspory", procenta: 25, skryta: true },
        ],
      },
    },
    zadani: "V grafu chybí podíl úspor. Kolik korun měsíčně jde na úspory? Rozpočet je 12 000 Kč.",
    odpoved: "3000 Kč",
    reseni_kroky: [
      "Podíl úspor = 100 − 45 − 30 = 25 %.",
      "25 % z 12 000 = 12 000 · 0,25.",
      "= 3 000 Kč.",
    ],
  },
  // ── Sloupce: chybí jeden sloupec → dopočítat z celku ──
  {
    id: "SLO_5", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 2,
    image: {
      kind: "parametric",
      diagram: {
        typ: "sloupce", nazev: "Prodej zmrzliny", jednotka: "ks",
        sloupce: [
          { label: "Po", hodnota: 20 },
          { label: "Út", hodnota: 35, skryta: true },
          { label: "St", hodnota: 15 },
          { label: "Čt", hodnota: 40 },
          { label: "Pá", hodnota: 30 },
        ],
      },
    },
    zadani: "Za pondělí až pátek se prodalo celkem 140 kusů. Údaj za úterý v grafu chybí — kolik kusů se prodalo v úterý?",
    odpoved: "35 ks",
    reseni_kroky: [
      "Sečti známé dny: 20 + 15 + 40 + 30 = 105.",
      "Úterý = celkem − známé = 140 − 105.",
      "= 35 kusů.",
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
console.log(pridano === 0 ? "Nic k přidání ✅" : `Přidáno úloh s chybějícím údajem: ${pridano} ✅`);
