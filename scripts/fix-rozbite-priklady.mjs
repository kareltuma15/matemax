// Oprava tří příkladů s chybnými odpověďmi a chybějícím řešením.
//
// Našly se při opravě smíšených čísel: `reseni_kroky` u nich byl řetězec „..."
// místo pole kroků. Při kontrole se ukázalo, že mají i špatné odpovědi a v nich
// prosáklé poznámky autora („— přepočti: …"), které žák viděl jako součást
// výsledku.
//
// Spustit: node scripts/fix-rozbite-priklady.mjs   (idempotentní)
import fs from "fs";

const FILE = "src/data/databaze.json";

const OPRAVY = {
  // Původní soustava 2x+5y=17; 3x−2y=6 vychází x=64/19, y=39/19 — na devátou
  // třídu nevhodné. Zadání proto přepsáno na koeficienty s celočíselným řešením.
  ROV_047: {
    zadani: "Vyřeš soustavu: 2x + 5y = 16; 3x − 2y = 5",
    odpoved: "x = 3, y = 2",
    reseni_kroky: [
      "První rovnici vynásobíme 2 a druhou 5, aby se y vyrušilo:",
      "4x + 10y = 32   a   15x − 10y = 25",
      "Sečteme: 19x = 57 → x = 3",
      "Dosadíme do první rovnice: 2·3 + 5y = 16 → 5y = 10 → y = 2",
      "Zkouška: 3·3 − 2·2 = 9 − 4 = 5 ✓",
    ],
  },

  // Text tvrdil, že B vyjede o 30 min DŘÍV — pak by ho pomalejší A nikdy
  // nedohnal a úloha nemá řešení. Rovnice v datech přitom počítala s „později".
  // Sjednoceno na „později", což odpovídá i výsledku.
  ROV_050: {
    zadani: "Cyklista A jede rychlostí 18 km/h. O 30 minut později vyjede za ním cyklista B rychlostí 24 km/h. Za jak dlouho od výjezdu A ho dohoní?",
    odpoved: "za 2 hodiny",
    reseni_kroky: [
      "Čas od výjezdu A označíme t (v hodinách). B jede o 0,5 h méně.",
      "Dráhy se v okamžiku setkání rovnají: 18t = 24(t − 0,5)",
      "18t = 24t − 12 → 6t = 12 → t = 2",
      "A ujel 18·2 = 36 km, B ujel 24·1,5 = 36 km ✓",
    ],
  },

  // Odpověď a=5, b=2 dávala rozdíl obsahů 25 − 4 = 21 cm², ne 15 cm².
  KOM_020: {
    zadani: "Dva čtverce: jejich obvody se liší o 12 cm a obsahy o 15 cm². Jak dlouhé jsou jejich strany?",
    odpoved: "a = 4 cm, b = 1 cm",
    reseni_kroky: [
      "Z rozdílu obvodů: 4a − 4b = 12 → a − b = 3",
      "Z rozdílu obsahů: a² − b² = 15",
      "Rozklad: a² − b² = (a − b)(a + b) = 15",
      "Dosadíme a − b = 3: 3(a + b) = 15 → a + b = 5",
      "Ze soustavy a − b = 3 a a + b = 5: a = 4, b = 1",
      "Zkouška: obvody 16 − 4 = 12 cm ✓, obsahy 16 − 1 = 15 cm² ✓",
    ],
  },
};

const data = JSON.parse(fs.readFileSync(FILE, "utf8"));
let zmeneno = 0;

for (const ex of data.examples) {
  const oprava = OPRAVY[ex.id];
  if (!oprava) continue;
  const pred = JSON.stringify({ z: ex.zadani, o: ex.odpoved, k: ex.reseni_kroky });
  Object.assign(ex, oprava);
  if (JSON.stringify({ z: ex.zadani, o: ex.odpoved, k: ex.reseni_kroky }) !== pred) zmeneno++;
}

fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
console.log(zmeneno === 0 ? "Nic k opravě ✅" : `Opraveno příkladů: ${zmeneno} ✅`);
