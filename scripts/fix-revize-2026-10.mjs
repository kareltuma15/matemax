// Jednorázová oprava starých úloh po ruční revizi (10. 10. 2026): špatné odpovědi, nekonzistentní zadání, úlohy mimo CERMAT.
// Spuštění: node scripts/fix-revize-2026-10.mjs  (idempotentní — druhé spuštění nic nemění)
// Postup: každá úloha byla přepočtena ručně nebo přesnou aritmetikou; důvody jsou u jednotlivých oprav.
import fs from "node:fs";

const load = (f) => { const raw = fs.readFileSync(f, "utf8"); return { f, crlf: raw.includes("\r\n"), raw, db: JSON.parse(raw) }; };
const save = ({ f, crlf, raw, db }) => {
  let out = JSON.stringify(db, null, 2) + (raw.endsWith("\n") ? "\n" : "");
  if (crlf) out = out.replace(/\n/g, "\r\n");
  fs.writeFileSync(f, out);
};
const A = load("src/data/databaze.json"), B = load("src/data/cermat-200.json");
const all = new Map([...A.db.examples, ...B.db.examples].map((e) => [e.id, e]));
let changed = 0;
const fix = (id, fields) => { const e = all.get(id); if (!e) { console.log("CHYBÍ", id); return; } Object.assign(e, fields); changed++; };

// ── špatná odpověď / nekonzistentní zadání ──
fix("SLO_009", { reseni_kroky: ["Vlaky jedou vstříc, rychlosti se sčítají: 60 + 90 = 150 km/h.", "Čas setkání: 300 : 150 = 2 h.", "Vlak A za 2 h ujede 60 · 2 = 120 km, takže se setkají 120 km od A."] });
fix("SLO_024", { zadani: "Babičce je 60 let, vnukovi 12. Před kolika lety bylo babičce 7× více let než vnukovi?", odpoved: "4 roky", reseni_kroky: ["Před x lety měla babička 60 − x a vnuk 12 − x let.", "60 − x = 7 · (12 − x) = 84 − 7x, takže 6x = 24 a x = 4.", "Kontrola: před 4 lety bylo babičce 56 a vnukovi 8 let, 56 = 7 · 8."] });
fix("SLO_042", { zadani: "Výletníci vyjdou v 8:00 rychlostí 6 km/h. V 9:00 vyjede za nimi auto rychlostí 66 km/h. Za kolik minut je dožene?", odpoved: "6 minut", reseni_kroky: ["Výletníci mají v 9:00 náskok 6 km/h · 1 h = 6 km.", "Auto se k nim přibližuje rychlostí 66 − 6 = 60 km/h.", "Doženou je za 6 : 60 = 0,1 h = 6 minut."] });
fix("SLO_046", { zadani: "Za 5 jablek a 3 hrušky zaplatíme 37 Kč. Za 3 jablka a 5 hrušek 35 Kč. Kolik stojí 1 jablko?", odpoved: "5 Kč", reseni_kroky: ["5j + 3h = 37 a 3j + 5h = 35.", "Sečteme: 8j + 8h = 72, tedy j + h = 9. Odečteme: 2j − 2h = 2, tedy j − h = 1.", "Z toho j = 5 Kč a h = 4 Kč.", "Kontrola: 5 · 5 + 3 · 4 = 37 a 3 · 5 + 5 · 4 = 35."] });
fix("SLO_051", { zadani: "Kočár jede rychlostí 30 km/h. Za kolik hodin ujede 90 km?" });
fix("GEO_028", { zadani: "Tečna ke kružnici z bodu vzdáleného 10 cm od středu, poloměr 6 cm. Délka tečny?" });
fix("GEO_041", { zadani: "Válec má výšku 10 cm a objem 785 cm³. Jaký je jeho poloměr? (π ≈ 3,14)", odpoved: "5 cm", reseni_kroky: ["V = π · r² · v, tedy 785 = 3,14 · r² · 10.", "r² = 785 : 31,4 = 25.", "r = 5 cm."] });
fix("GEO_052", { zadani: "Rovnoramenný lichoběžník má základny 10 cm a 4 cm a ramena 5 cm. Jaký je jeho obsah?", odpoved: "28 cm²", reseni_kroky: ["Rozdíl základen je 10 − 4 = 6 cm, na každé straně tedy 3 cm.", "Výška: v² = 5² − 3² = 16, v = 4 cm.", "Obsah: (10 + 4) : 2 · 4 = 28 cm²."] });
fix("GEO_055", { zadani: "Kolo má průměr 26 palců (1 palec = 2,54 cm). Jaký je jeho obvod? (π ≈ 3,14)", odpoved: "207,37 cm", reseni_kroky: ["Průměr: 26 · 2,54 = 66,04 cm.", "Obvod: 3,14 · 66,04 = 207,3656 ≈ 207,37 cm."] });
fix("GEO_059", { zadani: "Kosočtverec má úhlopříčky 16 cm a 12 cm. Jaký je jeho obsah?" });
fix("GEO_063", { odpoved: "Kruh", reseni_kroky: ["Čtverec: strana 40 : 4 = 10 cm, obsah 100 cm².", "Kruh: obvod 2πr = 40, r ≈ 6,37 cm, obsah π · r² ≈ 127,3 cm².", "Kruh má větší obsah než čtverec (při stejném obvodu má největší obsah kruh)."] });
fix("GEO_088", { zadani: "Kvádr má rozměry 3 × 4 × 12 cm. Jaká je délka jeho prostorové úhlopříčky?", odpoved: "13 cm", reseni_kroky: ["d² = 3² + 4² + 12² = 9 + 16 + 144 = 169.", "d = √169 = 13 cm."] });
fix("GEO_090", { zadani: "Trojúhelník o stranách 3, 4 a 5 cm je pravoúhlý. Jaký je jeho obsah?", odpoved: "6 cm²", reseni_kroky: ["Pravý úhel je mezi stranami 3 cm a 4 cm (3² + 4² = 5²).", "Obsah: 3 · 4 : 2 = 6 cm²."] });
fix("ROV_067", { odpoved: "20 Kč", reseni_kroky: ["3j + 2h = 126 a j + 3h = 119.", "Z druhé rovnice j = 119 − 3h; dosadíme: 3 · (119 − 3h) + 2h = 126, tedy 357 − 7h = 126 a h = 33.", "j = 119 − 99 = 20 Kč.", "Kontrola: 3 · 20 + 2 · 33 = 126 a 20 + 3 · 33 = 119."] });
fix("PRO_054", { zadani: "Ve třídě tvoří chlapci 40 % žáků. Když do třídy přibyli 3 noví chlapci, tvoří chlapci polovinu třídy. Kolik žáků bylo ve třídě původně?", odpoved: "15", reseni_kroky: ["Původní počet žáků x: 0,4x + 3 = 0,5 · (x + 3).", "0,4x + 3 = 0,5x + 1,5, takže 0,1x = 1,5 a x = 15.", "Kontrola: chlapců bylo 6, nyní 9 z 18 žáků, což je polovina."] });
fix("PRO_061", { zadani: "Zboží nejdřív zdražilo o 20 % a pak zlevnilo o 20 %. Kolik procent původní ceny stojí nakonec?", odpoved: "96 %", reseni_kroky: ["Zdražení o 20 %: 1,20 původní ceny.", "Zlevnění o 20 % z nové ceny: 1,20 · 0,80 = 0,96.", "Zboží stojí 96 % původní ceny (je o 4 % levnější)."] });
fix("SES_ZLO_13", { odpoved: "5/24" });
fix("SES_ZLO_14", { odpoved: "-1/4" });
fix("SES_ZLO_15", { odpoved: "-1" });
fix("SES_VYR_15", { odpoved: "8/23" });
fix("SES_VYR_17", { odpoved: "(−11a² − 63a + 30)/3", reseni_kroky: ["(7a/3)·(a + 3) = (7a² + 21a)/3.", "2·(1 − 3a)(a + 5) = 2·(−3a² − 14a + 5) = −6a² − 28a + 10 = (−18a² − 84a + 30)/3.", "Součet: (7a² + 21a − 18a² − 84a + 30)/3 = (−11a² − 63a + 30)/3."] });
fix("SES_VYR_18", { odpoved: "-11/10" });
fix("t01_20", { zadani: "Poměr věků otce a syna je nyní 7 : 2. Za 6 let bude poměr jejich věků 8 : 3. Kolik let je nyní otci?", odpoved: "42 let", reseni_kroky: ["Nyní: otec 7k, syn 2k.", "Za 6 let: (7k + 6) : (2k + 6) = 8 : 3, tedy 3 · (7k + 6) = 8 · (2k + 6).", "21k + 18 = 16k + 48, takže 5k = 30 a k = 6.", "Otci je nyní 7 · 6 = 42 let (synovi 12). Kontrola: za 6 let 48 : 18 = 8 : 3."] });
fix("t06_17", { zadani: "Obdélník má obvod 60 cm a délka je 1,5krát větší než šířka. Určete rozměry.", odpoved: "Délka 18 cm, šířka 12 cm", reseni_kroky: ["2(a + b) = 60, tedy a + b = 30 a a = 1,5b.", "1,5b + b = 30, takže 2,5b = 30 a b = 12 cm.", "a = 1,5 · 12 = 18 cm."] });
fix("t08_12", { zadani: "Čerpadlo A vypumpuje nádrž za 6 h, čerpadlo B za 4 h. Jak dlouho budou pumpovat dohromady?" });
fix("t08_15", { zadani: "Dělník A pracuje 4 hodiny, pak odejde. Dělník B pracuje celých 8 hodin. Dohromady dokončí dílo přesně. A by dílo dokončil sám za 12 hodin. Za kolik hodin by dílo dokončil sám B?", odpoved: "Za 12 hodin", reseni_kroky: ["A udělá za 4 h: 4/12 = 1/3 díla.", "B musí udělat zbylé 2/3 díla za 8 hodin, za hodinu tedy (2/3) : 8 = 1/12 díla.", "Celé dílo by B dokončil sám za 12 hodin."] });
fix("t08_17", { zadani: "Dvě stáda krav: 10 krav spase louku za 12 dní, 15 krav za 8 dní. Kolik krav spase louku za 6 dní? (Zanedbejte dorůstání trávy.)" });
fix("t09_08", { zadani: "Vnější úhel trojúhelníku je 130°. Dva vnitřní úhly, které s ním nesousedí, jsou 50° a β. Jaký je β?" });
fix("t09_20", { odpoved: "72°", reseni_kroky: ["Úhly při základně: (180° − 36°) : 2 = 72°.", "Osa úhlu ABC ho půlí: úhel DBC = 36°.", "V trojúhelníku BCD: úhel BDC = 180° − 36° − 72° = 72°."] });
fix("t10_09", { odpoved: "Kniha", reseni_kroky: ["Hračka je v modré krabici.", "Kniha není v červené ani v modré (tam je hračka), takže je v zelené.", "V červené krabici je sešit; v zelené je kniha."] });
fix("t10_18", { zadani: "Pět závodníků (A–E) doběhlo cílem. Víme: (1) A skončil před B. (2) C skončil za D. (3) E skončil mezi A a B. (4) D skončil jako první. (5) C skončil poslední. Seřaďte závodníky." });

// ── mimo CERMAT / neřešitelné / vnitřně rozporné → smazat ──
const DEL = new Set([
  "GEO_029", "GEO_030", "GEO_038", "GEO_045", "GEO_046", "GEO_089", // odmocniny s √2, √3, Heronův vzorec, duplicita GEO_039
  "ROV_063", "ROV_070",                                              // kvadratické soustavy (součin a součet, x²+y²)
  "PRO_068",                                                          // exponenciální růst: vychází ≈ 3,2 roku, ne „6"
  "t03_14", "t04_12", "t06_14", "t06_20", "t10_11", "t10_15",         // nekonzistentní zadání, √72, směs jednotek, nejednoznačné, paradox lháře
]);
const before = A.db.examples.length + B.db.examples.length;
A.db.examples = A.db.examples.filter((e) => !DEL.has(e.id));
B.db.examples = B.db.examples.filter((e) => !DEL.has(e.id));
const removed = before - A.db.examples.length - B.db.examples.length;
save(A); save(B);
console.log(`opraveno ${changed} úloh, smazáno ${removed} (z ${DEL.size})`);
