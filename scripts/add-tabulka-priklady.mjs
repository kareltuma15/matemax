// Typ [B]: datové tabulky ke slovním úlohám (formát CERMAT), i s chybějícími buňkami.
// Spustit: node scripts/add-tabulka-priklady.mjs   (idempotentní podle id)
import fs from "fs";

const FILE = "src/data/databaze.json";

const NOVE = [
  // Chybějící buňka → dopočítat z celku (odpověď hodnotou)
  {
    id: "TAB_1", tema: "grafy_logika", podtema: "tabulka", obtiznost: 2,
    image: {
      kind: "tabulka", nazev: "Prodej zmrzliny za týden",
      hlavicka: ["Den", "Prodej (ks)"],
      radky: [["Po", 20], ["Út", null], ["St", 15], ["Čt", 40], ["Pá", 30], ["Celkem", 140]],
    },
    zadani: "Za celý týden se prodalo celkem 140 kusů. Kolik kusů se prodalo v úterý (údaj v tabulce chybí)?",
    odpoved: "35 ks",
    reseni_kroky: [
      "Sečti známé dny: 20 + 15 + 40 + 30 = 105.",
      "Úterý = celkem − známé = 140 − 105.",
      "= 35 kusů.",
    ],
  },
  // Dvourozměrná tabulka + výběr A–E (čtení a rozdíl)
  {
    id: "TAB_2", tema: "grafy_logika", podtema: "tabulka", obtiznost: 2,
    image: {
      kind: "tabulka", nazev: "Počet rodin podle počtu psů",
      hlavicka: ["Ulice", "0 psů", "1 pes", "2 psi", "3 psi"],
      radky: [["Jižní", 33, 8, 5, 2], ["Severní", 23, 12, 1, 4]],
    },
    zadani: "O kolik více rodin chová právě 1 psa v Severní ulici než v Jižní ulici?",
    moznosti: ["2 rodiny", "4 rodiny", "6 rodin", "12 rodin"],
    spravna: 1,
    odpoved: "4 rodiny",
    reseni_kroky: [
      "Severní ulice, 1 pes: 12 rodin.",
      "Jižní ulice, 1 pes: 8 rodin.",
      "Rozdíl = 12 − 8 = 4 rodiny. Správně B).",
    ],
  },
  // Porovnávací tabulka + dopočet buňky (odpověď hodnotou)
  {
    id: "TAB_3", tema: "grafy_logika", podtema: "tabulka", obtiznost: 1,
    image: {
      kind: "tabulka", nazev: "Ranní teploty",
      hlavicka: ["Město", "Teplota (°C)"],
      radky: [["Praha", 8], ["Brno", 11], ["Ostrava", null]],
    },
    zadani: "V Ostravě bylo o 2 °C méně než v Brně. Jaká byla teplota v Ostravě?",
    odpoved: "9 °C",
    reseni_kroky: [
      "Brno mělo 11 °C.",
      "Ostrava = 11 − 2.",
      "= 9 °C.",
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
console.log(pridano === 0 ? "Nic k přidání ✅" : `Přidáno tabulkových úloh: ${pridano} ✅`);
