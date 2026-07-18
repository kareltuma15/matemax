// Hlídá, že čísla tvrzená na webu (src/lib/site-stats.ts) sedí s realitou.
// Spustit: node scripts/check-site-stats.mjs
// Vrací nenulový kód, když se údaje rozejdou — vhodné i do CI.
import fs from "fs";

const DATA_FILES = [
  "src/data/databaze.json",
  "src/data/cermat-200.json",
  "src/data/konstrukce-interaktivni.json",
  "src/data/doplnky-uhly-souhrnne.json",
];

const stats = fs.readFileSync("src/lib/site-stats.ts", "utf8");
const num = (name) => {
  const m = stats.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
  if (!m) throw new Error(`V site-stats.ts chybí ${name}`);
  return Number(m[1]);
};

// ── Počet příkladů ───────────────────────────────────────────────────────────
let total = 0;
const temata = new Set();
for (const f of DATA_FILES) {
  const { examples } = JSON.parse(fs.readFileSync(f, "utf8"));
  total += examples.length;
  for (const e of examples) temata.add(e.tema);
}

const ocekavano = Math.floor(total / 50) * 50;
const uvedeno = num("EXAMPLES_ROUNDED");

const problemy = [];
if (uvedeno !== ocekavano) {
  problemy.push(
    `EXAMPLES_ROUNDED = ${uvedeno}, ale databáze má ${total} příkladů → mělo by být ${ocekavano}.`
  );
}
if (uvedeno > total) {
  problemy.push(`Tvrdíme ${uvedeno}+ příkladů, ale reálně jich je jen ${total}.`);
}

const temataUvedeno = num("TOPICS_COUNT");
if (temataUvedeno !== temata.size) {
  problemy.push(`TOPICS_COUNT = ${temataUvedeno}, ale v datech je ${temata.size} témat.`);
}

// ── Výsledek ─────────────────────────────────────────────────────────────────
console.log(`Příkladů v databázi: ${total} → tvrdíme „${uvedeno}+"`);
console.log(`Témat v databázi:    ${temata.size} → tvrdíme ${temataUvedeno}`);

if (problemy.length) {
  console.error("\nNESEDÍ:");
  for (const p of problemy) console.error("  ✗ " + p);
  process.exit(1);
}
console.log("\nVše sedí ✅");
