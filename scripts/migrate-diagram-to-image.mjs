// Jednorázová migrace: DBExample.diagram → DBExample.image (hybridní model).
// Starý tvar   { diagram: { typ: … } }
// Nový tvar    { image: { kind: "parametric", diagram: { typ: … } } }
//
// Idempotentní: úlohy, které už mají `image`, přeskočí; `diagram` odstraní.
// Spustit: node scripts/migrate-diagram-to-image.mjs
import fs from "fs";
import path from "path";

const DIR = "src/data";
const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));

let celkem = 0;
for (const f of files) {
  const full = path.join(DIR, f);
  const data = JSON.parse(fs.readFileSync(full, "utf8"));
  if (!Array.isArray(data.examples)) continue;
  let zmen = 0;
  for (const e of data.examples) {
    if (e.diagram && !e.image) {
      e.image = { kind: "parametric", diagram: e.diagram };
      zmen++;
    }
    if (e.diagram) delete e.diagram;
  }
  if (zmen > 0) {
    fs.writeFileSync(full, JSON.stringify(data, null, 2));
    console.log(`${f}: migrováno ${zmen}`);
    celkem += zmen;
  }
}
console.log(celkem === 0 ? "Nic k migraci ✅" : `Hotovo, migrováno celkem ${celkem} ✅`);
