// Doplnění lehkých (L1) slovních úloh se zlomky — nález #10.
//
// Sešit má slovní úlohy v každé úrovni, databáze u zlomků jen na L2/L3.
// Na L1 tak žák dostával jen čisté počítání a neučil se převádět text na
// výpočet — což je jádro CERMATu. Přidáno 5 jednokrokových konkrétních úloh
// (pizza, čokoláda…) ve stylu sešitu.
//
// Matematika je v $…$, próza venku (konvence KaTeXu, viz scripts/audit-katex).
// Spustit: node scripts/add-zlomky-slovni-l1.mjs   (idempotentní podle id)
import fs from "fs";

const FILE = "src/data/databaze.json";

const NOVE = [
  {
    id: "ZLO_L1_S1",
    zadani: "Pizza má 8 stejných dílků. Anička snědla 3 dílky. Jakou část pizzy snědla?",
    odpoved: "3/8",
    reseni_kroky: [
      "Celá pizza má 8 dílků, snědené jsou 3.",
      "Snědená část je $\\frac{3}{8}$.",
    ],
  },
  {
    id: "ZLO_L1_S2",
    zadani: "Tabulka čokolády má 12 kostiček. Dáš kamarádovi 4 kostičky. Jakou část tabulky jsi mu dal?",
    odpoved: "1/3",
    reseni_kroky: [
      "Ze 12 kostiček jsi dal 4, tedy $\\frac{4}{12}$.",
      "Zlomek zkrátíme třemi: $\\frac{4}{12} = \\frac{1}{3}$.",
    ],
  },
  {
    id: "ZLO_L1_S3",
    zadani: "Dort je rozkrájený na 6 stejných dílů. Ty sníš 1 díl a brácha 2 díly. Jakou část dortu jste snědli dohromady?",
    odpoved: "1/2",
    reseni_kroky: [
      "Dohromady jste snědli $1 + 2 = 3$ díly ze 6.",
      "To je $\\frac{3}{6}$, po zkrácení $\\frac{1}{2}$.",
    ],
  },
  {
    id: "ZLO_L1_S4",
    zadani: "Ve třídě je 20 dětí a 5 z nich nosí brýle. Jakou část třídy tvoří děti s brýlemi?",
    odpoved: "1/4",
    reseni_kroky: [
      "Brýle nosí 5 z 20 dětí, tedy $\\frac{5}{20}$.",
      "Zlomek zkrátíme pěti: $\\frac{5}{20} = \\frac{1}{4}$.",
    ],
  },
  {
    id: "ZLO_L1_S5",
    zadani: "V lahvi máš $\\frac{3}{4}$ litru džusu a vypiješ $\\frac{1}{4}$ litru. Kolik litru ti zbude?",
    odpoved: "1/2",
    reseni_kroky: [
      "Odečteme vypitou část: $\\frac{3}{4} - \\frac{1}{4} = \\frac{2}{4}$.",
      "Zlomek zkrátíme dvěma: $\\frac{2}{4} = \\frac{1}{2}$.",
    ],
  },
];

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
const existuje = new Set(data.examples.map((e) => e.id));
let pridano = 0;

for (const u of NOVE) {
  if (existuje.has(u.id)) continue;
  data.examples.push({
    id: u.id,
    tema: "zlomky",
    podtema: "slovni_uloha",
    obtiznost: 1,
    zadani: u.zadani,
    odpoved: u.odpoved,
    reseni_kroky: u.reseni_kroky,
    cas_sekund: 60,
    sm2_interval: 1,
    latex: true,
  });
  pridano++;
}

if (data.metadata && typeof data.metadata.total === "number") {
  data.metadata.total = data.examples.length;
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(pridano === 0 ? "Nic k přidání — už tam jsou ✅" : `Přidáno L1 slovních úloh: ${pridano} ✅`);
