// Typ #3 (grafy): sloupcový graf ke slovní úloze — formát CERMAT.
// Obrázek nese hodnoty; čtení z osy y. Žádný kód na úlohu, jen JSON.
// Spustit: node scripts/add-sloupce-priklady.mjs   (idempotentní podle id)
import fs from "fs";

const FILE = "src/data/databaze.json";

const ZMRZLINA = {
  typ: "sloupce", nazev: "Prodej zmrzliny", jednotka: "ks",
  sloupce: [
    { label: "Po", hodnota: 20 },
    { label: "Út", hodnota: 35 },
    { label: "St", hodnota: 15 },
    { label: "Čt", hodnota: 40 },
    { label: "Pá", hodnota: 30 },
  ],
};

const NOVE = [
  {
    id: "SLO_1", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 1,
    image: { kind: "parametric", diagram: ZMRZLINA },
    zadani: "Graf ukazuje prodej zmrzliny v jednotlivých dnech. Kolik kusů se prodalo ve čtvrtek?",
    odpoved: "40 ks",
    reseni_kroky: [
      "Najdi sloupec pro čtvrtek (Čt).",
      "Jeho výška odpovídá hodnotě 40.",
      "Ve čtvrtek se prodalo 40 kusů.",
    ],
  },
  {
    id: "SLO_2", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 2,
    image: { kind: "parametric", diagram: ZMRZLINA },
    zadani: "O kolik více kusů zmrzliny se prodalo v pátek než ve středu?",
    odpoved: "15 ks",
    reseni_kroky: [
      "Pátek: 30 kusů, středa: 15 kusů.",
      "Rozdíl = 30 − 15.",
      "= 15 kusů.",
    ],
  },
  {
    id: "SLO_3", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 2,
    image: { kind: "parametric", diagram: ZMRZLINA },
    zadani: "Kolik kusů zmrzliny se prodalo celkem od pondělí do středy?",
    odpoved: "70 ks",
    reseni_kroky: [
      "Pondělí 20 + úterý 35 + středa 15.",
      "20 + 35 + 15 = 70.",
      "Celkem 70 kusů.",
    ],
  },
  {
    id: "SLO_4", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 1,
    image: {
      kind: "parametric",
      diagram: {
        typ: "sloupce", nazev: "Počet sourozenců ve třídě", jednotka: "žáků",
        sloupce: [
          { label: "0", hodnota: 8 },
          { label: "1", hodnota: 12 },
          { label: "2", hodnota: 6 },
          { label: "3", hodnota: 4 },
        ],
      },
    },
    zadani: "Graf ukazuje, kolik sourozenců mají žáci třídy. Kolik žáků má právě 1 sourozence?",
    odpoved: "12 žáků",
    reseni_kroky: [
      "Najdi sloupec nad hodnotou 1 (jeden sourozenec).",
      "Jeho výška odpovídá 12.",
      "Právě 1 sourozence má 12 žáků.",
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
console.log(pridano === 0 ? "Nic k přidání ✅" : `Přidáno sloupcových úloh: ${pridano} ✅`);
