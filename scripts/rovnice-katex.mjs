// Nález #11: zlomkové rovnice do KaTeXu.
//
// Z 88 rovnic mělo latex:true jen 9. Zlomkové rovnice se tak sázely jako
// plain text „x/4 = 3" místo pořádného zlomku. Zapíná latex:true a přepisuje
// zadání i kroky do $…$ s \frac.
//
// Při převodu vyplavaly tři chyby v odpovědích (jako u ROV_047/050 dřív):
//   • ROV_024: (x+1)/2 = (x-1)/3 → x = −5, ne uvedené „x = 5" (kroky měly −5).
//   • ROV_048: soustava vychází x=0, y=12, ne „x=6, y=6" (6/2+6/3=5≠4);
//     navíc měla nedokončený krok „řeš soustavu".
//   • ROV_069: odpověď byla popisná změť; správně x = 1 ± √2.
//
// Matematika je v $…$, próza venku (konvence KaTeXu). ROV_050 (km/h) není
// zlomková rovnice, vynechána.
// Spustit: node scripts/rovnice-katex.mjs   (idempotentní)
import fs from "fs";

const FILE = "src/data/databaze.json";

const OPRAVY = {
  ROV_004: { zadani: "Vyřeš: $\\frac{x}{4} = 3$", reseni_kroky: ["$x = 3 \\cdot 4 = 12$"] },
  ROV_007: { zadani: "Vyřeš: $\\frac{x}{2} + 1 = 5$", reseni_kroky: ["$\\frac{x}{2} = 4$", "$x = 8$"] },
  ROV_012: { zadani: "Vyřeš: $\\frac{x}{3} = 6$", reseni_kroky: ["$x = 6 \\cdot 3 = 18$"] },
  ROV_021: {
    zadani: "Vyřeš: $\\frac{x}{2} + \\frac{x}{3} = 5$",
    reseni_kroky: ["Společný jmenovatel je 6: $3x + 2x = 30$", "$5x = 30$", "$x = 6$"],
  },
  ROV_022: {
    zadani: "Vyřeš: $\\frac{x}{4} - \\frac{x}{6} = 1$",
    reseni_kroky: ["Společný jmenovatel je 12: $3x - 2x = 12$", "$x = 12$"],
  },
  ROV_023: {
    zadani: "Vyřeš: $\\frac{x}{3} + 2 = \\frac{x}{2}$",
    reseni_kroky: ["Společný jmenovatel je 6: $2x + 12 = 3x$", "$x = 12$"],
  },
  ROV_024: {
    zadani: "Vyřeš: $\\frac{x+1}{2} = \\frac{x-1}{3}$",
    odpoved: "x = -5",
    reseni_kroky: ["Vynásobíme křížem: $3(x+1) = 2(x-1)$", "$3x + 3 = 2x - 2$", "$x = -5$"],
  },
  ROV_025: {
    zadani: "Vyřeš: $\\frac{x}{5} + \\frac{x}{4} = 9$",
    reseni_kroky: ["Společný jmenovatel je 20: $4x + 5x = 180$", "$9x = 180$", "$x = 20$"],
  },
  ROV_045: {
    zadani: "Vyřeš: $\\frac{2x-1}{3} = \\frac{x+2}{2}$",
    reseni_kroky: ["Vynásobíme křížem: $2(2x-1) = 3(x+2)$", "$4x - 2 = 3x + 6$", "$x = 8$"],
  },
  ROV_046: {
    zadani: "Vyřeš: $\\frac{x}{x-2} = 3$ (podmínka $x \\neq 2$)",
    reseni_kroky: ["Vynásobíme jmenovatelem: $x = 3(x-2)$", "$x = 3x - 6$", "$2x = 6$", "$x = 3$ — ověření: $3 \\neq 2$ ✓"],
  },
  ROV_048: {
    zadani: "Vyřeš soustavu: $\\frac{x}{2} + \\frac{y}{3} = 4$;  $\\frac{x}{3} + \\frac{y}{4} = 3$",
    odpoved: "x = 0, y = 12",
    reseni_kroky: [
      "Zbavíme se zlomků: $3x + 2y = 24$ a $4x + 3y = 36$",
      "První $\\times 3$, druhou $\\times 2$: $9x + 6y = 72$ a $8x + 6y = 72$",
      "Odečteme: $x = 0$, dosadíme: $2y = 24 \\to y = 12$",
      "Zkouška: $\\frac{0}{2} + \\frac{12}{3} = 4$ ✓ a $\\frac{0}{3} + \\frac{12}{4} = 3$ ✓",
    ],
  },
  ROV_058: {
    zadani: "Vyřeš: $\\frac{3}{x} = 6$ (podmínka $x \\neq 0$)",
    reseni_kroky: ["Vynásobíme $x$: $3 = 6x$", "$x = \\frac{1}{2}$"],
  },
  ROV_059: {
    zadani: "Vyřeš: $\\frac{x}{5} = \\frac{x}{4} - 1$",
    reseni_kroky: ["Společný jmenovatel je 20: $4x = 5x - 20$", "$x = 20$"],
  },
  ROV_064: {
    zadani: "Vyřeš: $\\frac{x-2}{3} = 2$",
    reseni_kroky: ["$x - 2 = 6$", "$x = 8$"],
  },
  ROV_065: {
    zadani: "Vyřeš: $\\frac{3x+1}{4} = 4$",
    reseni_kroky: ["$3x + 1 = 16$", "$3x = 15$", "$x = 5$"],
  },
  ROV_069: {
    zadani: "Vyřeš: $\\frac{1}{x-1} + \\frac{1}{x+1} = 1$ (podmínka $x \\neq \\pm 1$)",
    odpoved: "x = 1 + √2 nebo x = 1 − √2",
    reseni_kroky: [
      "Sečteme zlomky: $\\frac{(x+1) + (x-1)}{(x-1)(x+1)} = 1$",
      "$\\frac{2x}{x^{2} - 1} = 1$",
      "$2x = x^{2} - 1$",
      "$x^{2} - 2x - 1 = 0$",
      "$x = 1 \\pm \\sqrt{2}$",
    ],
  },
};

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
let zmen = 0;

for (const ex of data.examples) {
  const op = OPRAVY[ex.id];
  if (!op) continue;
  const pred = JSON.stringify({ z: ex.zadani, o: ex.odpoved, k: ex.reseni_kroky, l: ex.latex });
  ex.latex = true;
  if (op.zadani) ex.zadani = op.zadani;
  if (op.odpoved) ex.odpoved = op.odpoved;
  if (op.reseni_kroky) ex.reseni_kroky = op.reseni_kroky;
  if (JSON.stringify({ z: ex.zadani, o: ex.odpoved, k: ex.reseni_kroky, l: ex.latex }) !== pred) zmen++;
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(zmen === 0 ? "Nic k úpravě ✅" : `Upraveno rovnic: ${zmen} ✅`);
