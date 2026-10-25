// Zapíše schválenou dávku z src/data/nahled-batch.json do databáze (upsert podle id) a vyprázdní batch.
// Úlohy 9. třídy jdou do databaze.json, úlohy 5. třídy (téma p5_*) do databaze-5.json.
// Spustit AŽ po Karlově souhlasu na /nahled.   node scripts/merge-nahled.mjs
import fs from "fs";

const DB9 = "src/data/databaze.json";
const DB5 = "src/data/databaze-5.json";
const BATCH = "src/data/nahled-batch.json";

const batch = JSON.parse(fs.readFileSync(BATCH, "utf8"));
const items = batch.examples ?? [];
if (items.length === 0) { console.log("Batch je prázdný — nic k zápisu."); process.exit(0); }

const jePro5 = (e) => String(e.tema ?? "").startsWith("p5_") || e.trida === 5;

function zapsat(soubor, nove) {
  if (nove.length === 0) return;
  const db = JSON.parse(fs.readFileSync(soubor, "utf8"));
  const ids = new Set(nove.map((e) => e.id));
  db.examples = db.examples.filter((e) => !ids.has(e.id)); // upsert
  for (const e of nove) db.examples.push(e);
  if (db.metadata && typeof db.metadata.total === "number") db.metadata.total = db.examples.length;
  fs.writeFileSync(soubor, JSON.stringify(db, null, 2));
}

const pro5 = items.filter(jePro5).map(({ trida, ...zbytek }) => zbytek); // třída se doplní při načtení
const pro9 = items.filter((e) => !jePro5(e));
zapsat(DB9, pro9);
zapsat(DB5, pro5);

// vyprázdnit batch (název necháme jako stopu)
fs.writeFileSync(BATCH, JSON.stringify({ nazev: batch.nazev + " — ZAPSÁNO", examples: [] }, null, 2));
console.log(`Zapsáno do databáze: ${items.length} úloh ✅ (9. třída ${pro9.length}, 5. třída ${pro5.length}): ${items.map((e) => e.id).join(", ")}`);
