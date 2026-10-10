// Po schválení Souhrnných L2 (10. 10. 2026): vyřadí 48 starých jednovětých KOM_* L2 a úlohy mimo CERMAT podle Karla
// (středový/obvodový úhel + tětivový čtyřúhelník, rovnice s absolutní hodnotou, kombinatorika).
// Spuštění: node scripts/vyradit-mimo-cermat-2026-10b.mjs  (po node scripts/merge-nahled.mjs)
import fs from "node:fs";

const load = (f) => { const raw = fs.readFileSync(f, "utf8"); return { f, crlf: raw.includes("\r\n"), raw, db: JSON.parse(raw) }; };
const save = ({ f, crlf, raw, db }) => {
  let out = JSON.stringify(db, null, 2) + (raw.endsWith("\n") ? "\n" : "");
  if (crlf) out = out.replace(/\n/g, "\r\n");
  fs.writeFileSync(f, out);
};
const A = load("src/data/databaze.json"), B = load("src/data/cermat-200.json");

const mimoCermat = new Set([
  "GEO_071", "GEO_072", "GEO_074", "GEO_075", "UHL_L3_03", "UHL_L3_04", "t09_17", // středový / obvodový úhel, tětivový čtyřúhelník
  "ROV_051", "ROV_052",                                                            // absolutní hodnota
  "t10_07", "t10_13", "t10_17", "t10_20",                                          // kombinatorika
]);
const isOldKom = (e) => /^KOM_/.test(e.id) && e.tema === "souhrnne" && e.obtiznost === 2;
const hasNewL2 = A.db.examples.some((e) => /^SOU2_/.test(e.id));
if (!hasNewL2) { console.error("SOU2_* nejsou v databázi — nejdřív merge-nahled."); process.exit(1); }

const count = (arr, pred) => arr.filter(pred).length;
const oldKom = count(A.db.examples, isOldKom);
const cermat = count(A.db.examples, (e) => mimoCermat.has(e.id)) + count(B.db.examples, (e) => mimoCermat.has(e.id));
A.db.examples = A.db.examples.filter((e) => !isOldKom(e) && !mimoCermat.has(e.id));
B.db.examples = B.db.examples.filter((e) => !mimoCermat.has(e.id));
if (A.db.metadata && typeof A.db.metadata.total === "number") A.db.metadata.total = A.db.examples.length;
save(A); save(B);
console.log(`vyřazeno ${oldKom} starých KOM L2 a ${cermat} úloh mimo CERMAT; databaze ${A.db.examples.length}, cermat-200 ${B.db.examples.length}`);
