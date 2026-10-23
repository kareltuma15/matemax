// Úhly s obrázky, druhá dávka: 10 úloh UHN4_01–10 (L1 ×5, L2 ×5), každá s vlastním obrázkem (gen-uhly2-svg.mjs).
// Spuštění: node scripts/gen-uhly2-svg.mjs && node scripts/build-uhly2.mjs → doplní/přepíše UHN4_* v src/data/nahled-batch.json (ostatní dávky nechá).
// Každá odpověď se nezávisle přepočítá; psané odpovědi musí jít vyhodnotit, A–E musí mít právě jednu správnou možnost.
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const img = (file, width, height, alt) => ({ kind: "static", url: `/obrazky/uhly/${file}`, width, height, alt });
const IMG = {
  rv40: img("nove2-rovnoramenny-40.svg", 240, 200, "Rovnoramenný trojúhelník ABC se shodnými stranami AB a AC; úhel při vrcholu A je 40°, hledaný úhel při vrcholu B"),
  dvePrimky: img("nove2-dve-primky.svg", 260, 210, "Dvě protínající se přímky p a q; jeden úhel má 115°, hledaný úhel k němu přiléhá"),
  pravyTri: img("nove2-pravy-uhel-tri.svg", 200, 190, "Pravý úhel rozdělený dvěma polopřímkami na tři úhly 22°, hledaný a 41°"),
  primyTri: img("nove2-primy-uhel-tri.svg", 300, 175, "Body A, V a B leží na přímce; polopřímky z bodu V ji dělí na tři úhly 50°, 75° a hledaný úhel"),
  stridave: img("nove2-stridave.svg", 300, 170, "Rovnoběžky p a q protnuté příčkou AB; úhel 65° u bodu A pod přímkou p, hledaný úhel u bodu B nad přímkou q na opačné straně příčky"),
  vnejsi: img("nove2-vnejsi-uhel.svg", 300, 230, "Trojúhelník ABC s úhly 55° při A a 70° při B; strana AC je prodloužena za bod C; hledaný vnější úhel při vrcholu C"),
  rvVnejsi: img("nove2-rovnoramenny-vnejsi.svg", 300, 200, "Rovnoramenný trojúhelník ABC se základnou BC (AB = AC); základna je prodloužena za bod B; vnější úhel při B má 110°, hledaný úhel při vrcholu A"),
  petiuhelnik: img("nove2-petiuhelnik.svg", 250, 230, "Pravidelný pětiúhelník ABCDE s vyznačeným vnitřním úhlem při vrcholu A"),
  jednostranne: img("nove2-jednostranne.svg", 300, 170, "Rovnoběžky p a q protnuté příčkou AB; úhel 115° u bodu A a hledaný úhel u bodu B jsou na téže straně příčky mezi rovnoběžkami"),
  alfaBeta: img("nove2-alfa-ctyrnasobek.svg", 200, 190, "Pravý úhel rozdělený polopřímkou na úhly α a β; α je čtyřikrát větší než β"),
};

const base = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "uhly", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const typed = base;
const choice = (id, podtema, level, zadani, moznosti, spravna, kroky, cas, extra = {}) =>
  base(id, podtema, level, zadani, moznosti[spravna], kroky, cas, { moznosti, spravna, ...extra });
const ILU = " Obrázek je ilustrační, úhly neměř, ale vypočítej je.";

const ex = [
  // ───────── L1 ─────────
  typed("UHN4_01", "rovnoramenny_trojuhelnik", 1, "Trojúhelník ABC je rovnoramenný, |AB| = |AC|. Úhel při vrcholu A má 40° (viz obrázek). Jak velký je úhel při vrcholu B (?)?" + ILU, "70°", [
    "Součet úhlů v trojúhelníku je 180°. Na dva shodné úhly při základně tak zbývá 180° − 40° = 140°.",
    "Každý z nich má 140° : 2 = 70°.",
  ], 75, { image: IMG.rv40 }),
  typed("UHN4_02", "vedlejsi_uhly", 1, "Přímky p a q se protínají (viz obrázek). Jeden z vyznačených úhlů má 115°. Jak velký je druhý vyznačený úhel (?)?" + ILU, "65°", [
    "Vyznačené úhly leží vedle sebe na přímce, jsou to vedlejší úhly. Dohromady tvoří přímý úhel 180°.",
    "Hledaný úhel: 180° − 115° = 65°.",
  ], 60, { image: IMG.dvePrimky }),
  typed("UHN4_03", "doplnkove_uhly", 1, "Pravý úhel je rozdělen dvěma polopřímkami na tři úhly (viz obrázek). Dva z nich mají 22° a 41°. Jak velký je třetí úhel (?)?" + ILU, "27°", [
    "Všechny tři úhly dohromady tvoří pravý úhel, tedy 90°.",
    "Dva známé úhly mají 22° + 41° = 63°.",
    "Třetí úhel: 90° − 63° = 27°.",
  ], 75, { image: IMG.pravyTri }),
  typed("UHN4_04", "vedlejsi_uhly", 1, "Body A, V a B leží na jedné přímce. Polopřímky z bodu V ji dělí na tři úhly (viz obrázek); dva z nich mají 50° a 75°. Jak velký je třetí úhel (?)?" + ILU, "55°", [
    "Všechny tři úhly dohromady vyplní přímý úhel, tedy 180°.",
    "Dva známé úhly mají 50° + 75° = 125°.",
    "Třetí úhel: 180° − 125° = 55°.",
  ], 75, { image: IMG.primyTri }),
  typed("UHN4_05", "rovnobezky", 1, "Přímky p a q jsou rovnoběžné a protíná je příčka AB (viz obrázek). Úhel u bodu A má 65°. Jak velký je vyznačený úhel u bodu B (?)?" + ILU, "65°", [
    "Vyznačené úhly leží uvnitř pásu mezi rovnoběžkami na opačných stranách příčky. Jsou to střídavé úhly.",
    "Střídavé úhly u rovnoběžek jsou shodné, proto má hledaný úhel stejnou velikost jako 65°.",
  ], 75, { image: IMG.stridave }),
  // ───────── L2 ─────────
  typed("UHN4_06", "vnejsi_uhel", 2, "V trojúhelníku ABC má úhel při vrcholu A velikost 55° a při vrcholu B velikost 70°. Strana AC je prodloužena za bod C (viz obrázek). Jak velký je vnější úhel při vrcholu C (?)?" + ILU, "125°", [
    "Úhel při vrcholu C uvnitř trojúhelníku: 180° − 55° − 70° = 55°.",
    "Vnější úhel k němu je vedlejší a doplňuje ho do 180°: 180° − 55° = 125°.",
    "Kontrola: vnější úhel je součtem dvou vnitřních úhlů u zbývajících vrcholů, 55° + 70° = 125°.",
  ], 120, { image: IMG.vnejsi }),
  typed("UHN4_07", "rovnoramenny_trojuhelnik", 2, "Trojúhelník ABC je rovnoramenný se základnou BC, |AB| = |AC|. Základna je prodloužena za bod B a vnější úhel při vrcholu B má 110° (viz obrázek). Jak velký je úhel při vrcholu A (?)?" + ILU, "40°", [
    "Vnitřní úhel při vrcholu B je vedlejší k vnějšímu: 180° − 110° = 70°.",
    "Úhly při základně jsou shodné, takže úhel při C má také 70°.",
    "Úhel při vrcholu A: 180° − 70° − 70° = 40°.",
  ], 120, { image: IMG.rvVnejsi }),
  choice("UHN4_08", "pravidelny_mnohouhelnik", 2, "Obrázek ukazuje pravidelný pětiúhelník ABCDE. Jak velký je jeho vnitřní úhel při vrcholu A (?)?" + ILU,
    ["72°", "100°", "108°", "120°", "135°"], 2, [
      "Pětiúhelník rozdělíme úhlopříčkami z jednoho vrcholu na tři trojúhelníky.",
      "Součet vnitřních úhlů je 3 · 180° = 540°.",
      "V pravidelném pětiúhelníku jsou všechny úhly shodné: 540° : 5 = 108°. Správně je C).",
    ], 120, { image: IMG.petiuhelnik }),
  typed("UHN4_09", "rovnobezky", 2, "Přímky p a q jsou rovnoběžné a protíná je příčka AB (viz obrázek). Úhel u bodu A má 115°. Jak velký je vyznačený úhel u bodu B (?)?" + ILU, "65°", [
    "Vyznačené úhly leží mezi rovnoběžkami na téže straně příčky. Jsou to jednostranné úhly.",
    "Jednostranné úhly u rovnoběžek dávají dohromady 180°.",
    "Hledaný úhel: 180° − 115° = 65°.",
  ], 90, { image: IMG.jednostranne }),
  typed("UHN4_10", "doplnkove_uhly", 2, "Pravý úhel je rozdělen polopřímkou na úhly α a β (viz obrázek). Úhel α je čtyřikrát větší než úhel β. Jak velký je úhel β?" + ILU, "18°", [
    "Úhly α a β dohromady tvoří pravý úhel: α + β = 90°.",
    "Protože α = 4β, platí 4β + β = 5β = 90°.",
    "Odtud β = 90° : 5 = 18° (a α = 72°).",
  ], 120, { image: IMG.alfaBeta }),
];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
ok("L1_01", (180 - 40) / 2 === 70 && by.UHN4_01.odpoved === "70°");
ok("L1_02", 180 - 115 === 65 && by.UHN4_02.odpoved === "65°");
ok("L1_03", 90 - 22 - 41 === 27 && by.UHN4_03.odpoved === "27°");
ok("L1_04", 180 - 50 - 75 === 55 && by.UHN4_04.odpoved === "55°");
ok("L1_05", by.UHN4_05.odpoved === "65°");                       // střídavé = shodné
ok("L2_06", 55 + 70 === 125 && 180 - (180 - 55 - 70) === 125 && by.UHN4_06.odpoved === "125°");
ok("L2_07", 180 - (180 - 110) * 2 === 40 && by.UHN4_07.odpoved === "40°");
ok("L2_08", ((5 - 2) * 180) / 5 === 108 && by.UHN4_08.moznosti[by.UHN4_08.spravna] === "108°" && by.UHN4_08.moznosti.filter((o) => o === "108°").length === 1);
ok("L2_09", 180 - 115 === 65 && by.UHN4_09.odpoved === "65°");   // jednostranné = doplněk do 180°
ok("L2_10", 90 / 5 === 18 && 4 * 18 + 18 === 90 && by.UHN4_10.odpoved === "18°");

for (const e of ex) {
  ok(e.id + " obrázek", e.image?.kind === "static" && fs.existsSync("public" + e.image.url) && !!e.image.alt, e.id);
  ok(e.id + " ilustrační", /ilustra/i.test(e.zadani), "chybí poznámka, že obrázek je ilustrační");
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length >= 2 && new Set(e.moznosti).size === e.moznosti.length && e.odpoved === e.moznosti[e.spravna]);
  else {
    ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
    ok(e.id + " správná odpověď projde", N.checkAnswer(e.odpoved, e.odpoved));
    const m = e.odpoved.replace(/\s/g, "").match(/\d+/g), steps = e.reseni_kroky.join(" ").replace(/\s/g, "").replace(/,/g, ".");
    ok(e.id + " odpověď v krocích", m.every((n) => steps.includes(n)), e.odpoved);
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek|přeprač|odchyluje se|ale\.\.\./i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
}
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 10);
const all = ["databaze", "cermat-200", "doplnky-uhly-souhrnne", "konstrukce-interaktivni"].flatMap((f) => { try { return JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples; } catch { return []; } });
ok("id bez kolize s databází", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}), chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^UHN4_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + Úhly s obrázky (10 úloh)` : "Úhly s obrázky — vedlejší, střídavé a jednostranné úhly, vnější úhel, rovnoramenný trojúhelník, pětiúhelník (10 úloh: L1 ×5, L2 ×5)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úhlových)`);
