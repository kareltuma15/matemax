// Oprava zápisu smíšených čísel (z Karlových screenshotů).
// V datech byla smíšená čísla psaná slovem: "3 a \frac{3}{4}". KaTeX bere „a"
// jako proměnnou a vysází „3𝑎¾", takže žák neví, jestli je to překlep.
// Správný zápis smíšeného čísla je „3\frac{3}{4}" (číslo a zlomek u sebe).
//
// Spustit: node scripts/fix-smisena-cisla.mjs   (idempotentní)
import fs from "fs";

const FILES = [
  "src/data/databaze.json",
  "src/data/cermat-200.json",
  "src/data/konstrukce-interaktivni.json",
  "src/data/doplnky-uhly-souhrnne.json",
];

// „3 a \frac{1}{2}" → „3\frac{1}{2}"   (uvnitř LaTeXu; bere i \dfrac)
// Zpětné lomítko skládáme z kódu — psané v literálu ho snadno spolkne
// escapování a vznikne „nepovinná číslice" místo „lomítko + frac".
const BS = String.fromCharCode(92);
const LATEX_MIX = new RegExp(`(\\d)\\s*a\\s*(${BS}${BS}d?frac\\{)`, "g");
// „2 a 1/2" → „2 1/2"                  (v odpovědích, prostý text)
const PLAIN_MIX = /^(\s*-?\d+)\s+a\s+(\d+\/\d+\s*)$/;

let zadani = 0, odpovedi = 0, kroky = 0;

for (const file of FILES) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const ex of data.examples) {
    if (typeof ex.zadani === "string") {
      const next = ex.zadani.replace(LATEX_MIX, "$1$2");
      if (next !== ex.zadani) { ex.zadani = next; zadani++; }
    }
    if (typeof ex.odpoved === "string") {
      const next = ex.odpoved.replace(PLAIN_MIX, "$1 $2").trimEnd();
      if (next !== ex.odpoved) { ex.odpoved = next; odpovedi++; }
    }
    if (Array.isArray(ex.reseni_kroky)) {
      const next = ex.reseni_kroky.map((k) =>
        typeof k === "string" ? k.replace(LATEX_MIX, "$1$2") : k
      );
      if (JSON.stringify(next) !== JSON.stringify(ex.reseni_kroky)) {
        ex.reseni_kroky = next; kroky++;
      }
    }
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

console.log(`zadání: ${zadani} · odpovědi: ${odpovedi} · kroky řešení: ${kroky}`);
console.log(zadani + odpovedi + kroky === 0 ? "Nic k opravě — už je hotovo ✅" : "Opraveno ✅");
