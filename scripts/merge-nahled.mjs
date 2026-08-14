// Zapíše schválenou dávku z src/data/nahled-batch.json do databaze.json (upsert
// podle id) a vyprázdní batch. Spustit AŽ po Karlově souhlasu na /nahled.
// node scripts/merge-nahled.mjs
import fs from "fs";

const DB = "src/data/databaze.json";
const BATCH = "src/data/nahled-batch.json";

const db = JSON.parse(fs.readFileSync(DB, "utf8"));
const batch = JSON.parse(fs.readFileSync(BATCH, "utf8"));
const items = batch.examples ?? [];
if (items.length === 0) { console.log("Batch je prázdný — nic k zápisu."); process.exit(0); }

const ids = new Set(items.map((e) => e.id));
db.examples = db.examples.filter((e) => !ids.has(e.id)); // upsert
for (const e of items) db.examples.push(e);
if (db.metadata && typeof db.metadata.total === "number") db.metadata.total = db.examples.length;
fs.writeFileSync(DB, JSON.stringify(db, null, 2));

// vyprázdnit batch (název necháme jako stopu)
fs.writeFileSync(BATCH, JSON.stringify({ nazev: batch.nazev + " — ZAPSÁNO", examples: [] }, null, 2));
console.log(`Zapsáno do databáze: ${items.length} úloh ✅ (${items.map((e) => e.id).join(", ")})`);
