// Porovnávací úlohy na klikání znaménka (varianta A z mockupů).
//
// ZLO_036/037 byly obyčejné příklady s textovým polem a odpovědí „3/4 < 5/6".
// Žák nevěděl, co se po něm chce psát, a zadání navíc znělo „\frac{3}{4} a
// \frac{5}{6}" — KaTeX to „a" vysázel jako proměnnou. Dostávají pole
// `porovnani` (trénink pak vykreslí ComparisonCard) a k nim přibývá šest
// dalších, aby porovnávání pokrylo L1–L3 včetně desetinných a záporných.
//
// Spustit: node scripts/porovnavani-tlacitka.mjs   (idempotentní)
import fs from "fs";

const DB = "src/data/databaze.json";
const CERMAT = "src/data/cermat-200.json";

const base = {
  tema: "zlomky",
  podtema: "porovnavani",
  cas_sekund: 60,
  sm2_interval: 1,
  latex: true,
};

/**
 * Zadání pro seznamy mimo kartu. Próza musí zůstat MIMO $...$, jinak z ní
 * KaTeX udělá proměnné — přesně to dělalo původní „\frac{3}{4} a \frac{5}{6}".
 * A `\text{}` není řešení: KaTeX v něm rozbíjí českou diakritiku
 * („Společný" → „Spolecˇnyˊ"), ověřeno v prohlížeči.
 */
const nadpis = (l, p) => `Porovnej $${l}$ a $${p}$`;

const UPRAVY = [
  {
    id: "ZLO_036",
    obtiznost: 2,
    levy: "\\frac{3}{4}", pravy: "\\frac{5}{6}", znak: "<",
    odpoved: "3/4 < 5/6",
    reseni_kroky: [
      "Společný jmenovatel je 12.",
      "$\\frac{3}{4} = \\frac{9}{12}$ a $\\frac{5}{6} = \\frac{10}{12}$",
      "Devět dvanáctin je méně než deset dvanáctin.",
    ],
  },
  {
    id: "ZLO_037",
    obtiznost: 2,
    levy: "\\frac{7}{8}", pravy: "\\frac{5}{6}", znak: ">",
    odpoved: "7/8 > 5/6",
    reseni_kroky: [
      "Společný jmenovatel je 24.",
      "$\\frac{7}{8} = \\frac{21}{24}$ a $\\frac{5}{6} = \\frac{20}{24}$",
      "Dvacet jedna dvacetičtvrtin je více než dvacet.",
    ],
  },
  {
    id: "ZLO_P01",
    obtiznost: 1,
    levy: "\\frac{2}{5}", pravy: "\\frac{3}{5}", znak: "<",
    odpoved: "2/5 < 3/5",
    reseni_kroky: [
      "Jmenovatelé jsou stejní, stačí porovnat čitatele.",
      "$2 < 3$, takže $\\frac{2}{5} < \\frac{3}{5}$",
    ],
  },
  {
    id: "ZLO_P02",
    obtiznost: 1,
    levy: "\\frac{1}{2}", pravy: "\\frac{1}{3}", znak: ">",
    odpoved: "1/2 > 1/3",
    reseni_kroky: [
      "Stejný čitatel: čím větší jmenovatel, tím menší díl.",
      "Polovina koláče je víc než třetina.",
    ],
  },
  {
    id: "ZLO_P03",
    obtiznost: 1,
    levy: "0{,}75", pravy: "\\frac{3}{4}", znak: "=",
    odpoved: "0,75 = 3/4",
    reseni_kroky: [
      "$\\frac{3}{4} = 3 : 4 = 0{,}75$",
      "Obě čísla jsou stejná, jen zapsaná jinak.",
    ],
  },
  {
    id: "ZLO_P04",
    obtiznost: 2,
    levy: "\\frac{2}{3}", pravy: "0{,}6", znak: ">",
    odpoved: "2/3 > 0,6",
    reseni_kroky: [
      "Zlomek převedeme na desetinné číslo: $\\frac{2}{3} = 0{,}66\\ldots$",
      "$0{,}66\\ldots > 0{,}6$",
    ],
  },
  {
    id: "ZLO_P05",
    obtiznost: 3,
    levy: "\\frac{5}{7}", pravy: "\\frac{7}{10}", znak: ">",
    odpoved: "5/7 > 7/10",
    reseni_kroky: [
      "Společný jmenovatel je 70.",
      "$\\frac{5}{7} = \\frac{50}{70}$ a $\\frac{7}{10} = \\frac{49}{70}$",
      "$50 > 49$, takže levý zlomek je větší.",
    ],
  },
  {
    id: "ZLO_P06",
    obtiznost: 3,
    levy: "-\\frac{2}{3}", pravy: "-\\frac{3}{4}", znak: ">",
    odpoved: "-2/3 > -3/4",
    reseni_kroky: [
      "U záporných čísel je větší to, které leží blíž nule.",
      "$\\frac{2}{3} = \\frac{8}{12}$ a $\\frac{3}{4} = \\frac{9}{12}$",
      "Osm dvanáctin je blíž nule než devět, takže $-\\frac{2}{3} > -\\frac{3}{4}$",
    ],
  },
  {
    // Ze cermat-200: zadání znělo „$\frac{5}{8} nebo \frac{7}{12}?$" — celé
    // „nebo" bylo uvnitř matematiky, takže KaTeX vysázel čtyři proměnné n·e·b·o.
    // Odpověď „5/8 je větší" se navíc nedala napsat jinak než přesně takhle.
    id: "t02_07",
    soubor: CERMAT,
    tema: "zlomky",
    obtiznost: 1,
    levy: "\\frac{5}{8}", pravy: "\\frac{7}{12}", znak: ">",
    odpoved: "5/8 > 7/12",
    reseni_kroky: [
      "Společný jmenovatel je 24.",
      "$\\frac{5}{8} = \\frac{15}{24}$ a $\\frac{7}{12} = \\frac{14}{24}$",
      "$15 > 14$, takže $\\frac{5}{8}$ je větší.",
    ],
  },
];

const nactene = new Map();
const nacti = (f) => {
  if (!nactene.has(f)) nactene.set(f, JSON.parse(fs.readFileSync(f, "utf8")));
  return nactene.get(f);
};

let upraveno = 0, pridano = 0;

for (const u of UPRAVY) {
  const { id, obtiznost, levy, pravy, znak, odpoved, reseni_kroky, soubor, tema } = u;
  const data = nacti(soubor ?? DB);
  const zaznam = {
    ...base,
    ...(tema ? { tema } : {}),
    id, obtiznost, odpoved, reseni_kroky,
    zadani: nadpis(levy, pravy),
    porovnani: { levy, pravy, znak },
  };
  const idx = data.examples.findIndex((e) => e.id === id);
  if (idx >= 0) {
    const pred = JSON.stringify(data.examples[idx]);
    data.examples[idx] = { ...data.examples[idx], ...zaznam };
    if (JSON.stringify(data.examples[idx]) !== pred) upraveno++;
  } else {
    data.examples.push(zaznam);
    pridano++;
  }
}

for (const [soubor, data] of nactene) {
  if (data.metadata && typeof data.metadata.total === "number") {
    data.metadata.total = data.examples.length;
  }
  fs.writeFileSync(soubor, JSON.stringify(data, null, 2));
}
console.log(`upraveno: ${upraveno} · přidáno: ${pridano}`);
console.log(upraveno + pridano === 0 ? "Nic k úpravě ✅" : "Hotovo ✅");
