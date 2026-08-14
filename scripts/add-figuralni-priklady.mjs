// Typ [D]: figurální (obrázkové) posloupnosti — obrazce z jednotkových čtverečků.
// Logické úlohy „kolik dílů má n-tý obrazec". Spustit: node scripts/add-figuralni-priklady.mjs
import fs from "fs";

const FILE = "src/data/databaze.json";

const NOVE = [
  // Přímé spočítání z obrázku
  {
    id: "FIG_1", tema: "grafy_logika", podtema: "figuralni", obtiznost: 1,
    image: { kind: "parametric", diagram: { typ: "figuralni", rady: [1, 2, 3, 4], popisek: "Obrazec" } },
    zadani: "Kolik čtverečků je na obrázku?",
    odpoved: "10",
    reseni_kroky: ["Sečti čtverečky po řadách: 1 + 2 + 3 + 4.", "= 10.", "Na obrázku je 10 čtverečků."],
  },
  // Pokračování vzoru — pyramida (n-tý obrazec má n² dílů)
  {
    id: "FIG_2", tema: "grafy_logika", podtema: "figuralni", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "figuralni", rady: [1, 3, 5], popisek: "3. obrazec" } },
    zadani: "Obrazce tvoří posloupnost (řady 1, 3, 5, …). Kolik krychliček bude mít 4. obrazec?",
    odpoved: "16",
    reseni_kroky: [
      "4. obrazec má řady 1 + 3 + 5 + 7.",
      "= 16 (obecně n-tý obrazec má n² dílů, 4² = 16).",
      "16 krychliček.",
    ],
  },
  // Rozdíl mezi obrazci — výběr A–E
  {
    id: "FIG_3", tema: "grafy_logika", podtema: "figuralni", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "figuralni", rady: [1, 3, 5], popisek: "3. obrazec" } },
    zadani: "O kolik krychliček má 5. obrazec více než 4. obrazec?",
    moznosti: ["7", "9", "11", "16"],
    spravna: 1,
    odpoved: "9",
    reseni_kroky: [
      "5. obrazec přidává novou spodní řadu.",
      "Spodní řada 5. obrazce má 2·5 − 1 = 9 krychliček.",
      "Přibude tedy 9. Správně B).",
    ],
  },
];

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
const noveIds = new Set(NOVE.map((u) => u.id));
data.examples = data.examples.filter((e) => !noveIds.has(e.id)); // upsert
let pridano = 0;
for (const u of NOVE) {
  data.examples.push({ ...u, cas_sekund: 60, sm2_interval: 1 });
  pridano++;
}
if (data.metadata && typeof data.metadata.total === "number") data.metadata.total = data.examples.length;
fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(`Přidáno figurálních úloh: ${pridano} ✅`);
