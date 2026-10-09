// Úhly (CERMAT styl): 29 nových úloh UHN1_* (L1 ×8), UHN2_* (L2 ×12), UHN3_* (L3 ×9) s vlastními SVG (gen-uhly-svg.mjs).
// Spuštění: node scripts/gen-uhly-svg.mjs && node scripts/build-uhly.mjs  → doplní/přepíše UHN* v src/data/nahled-batch.json (ostatní dávky nechá).
// Každá odpověď se nezávisle přepočítá; psané odpovědi musí jít vyhodnotit, A–E musí mít právě jednu správnou možnost.
import fs from "node:fs";
const N = await import("../src/lib/normalize.ts");

const img = (file, width, height, alt) => ({ kind: "static", url: `/obrazky/uhly/${file}`, width, height, alt });
const IMG = {
  sestiuhelnik: img("nove-sestiuhelnik.svg", 230, 200, "Pravidelný šestiúhelník s vyznačeným vnitřním úhlem"),
  deltoid: img("nove-deltoid.svg", 260, 250, "Deltoid ABCD: AB = AD, CB = CD, úhel u A je 70°, úhel u C je 50°, hledaný úhel u B"),
  lichobeznik: img("nove-lichobeznik.svg", 270, 170, "Rovnoramenný lichoběžník ABCD se základnami AB a CD; úhel u A je 68°, hledaný úhel u D"),
  lomena: img("nove-lomena-cara.svg", 300, 170, "Rovnoběžky p a q, bod X mezi nimi; úhly 35° u bodu A a 50° u bodu B, hledaný úhel AXB"),
  trojOsa: img("nove-trojuhelnik-osa.svg", 280, 200, "Trojúhelník ABC s úhly α = 50° a β = 70°; přerušovaná osa úhlu při vrcholu C protíná stranu AB v bodě D"),
  osy: img("nove-osy-uhlu.svg", 290, 210, "Trojúhelník ABC s úhly 52° a 64°; osy úhlů při vrcholech A a B se protínají v bodě I; hledaný úhel AIB"),
  kruznice: img("nove-kruznice-opsana.svg", 290, 270, "Kružnice se středem S, trojúhelník ABC vepsaný do kružnice; úhel SAB je 25°, úhel SBC je 35°, hledaný úhel ACB"),
  sest6: img("nove-sestiuhelnik-uhlopricky.svg", 280, 230, "Pravidelný šestiúhelník ABCDEF s úhlopříčkami AC a AE; hledaný úhel CAE"),
  vyska: img("nove-vyska-osa.svg", 300, 230, "Trojúhelník ABC s úhly 48° a 72°; výška CV a osa úhlu CD; hledaný úhel VCD"),
  zlaty: img("nove-rovnoramenny-bod-d.svg", 250, 250, "Rovnoramenný trojúhelník ABC se základnou BC a bodem D na straně AC; úseky AD, BD a BC jsou shodné; hledaný úhel u vrcholu A"),
  rovnobeznik: img("nove-rovnobeznik-osa.svg", 270, 230, "Rovnoběžník ABCD s úhlem 70° u vrcholu A; osa úhlu při A protíná stranu BC v bodě E; hledaný úhel AEC"),
  osyRovnobezky: img("nove-rovnobezky-osy.svg", 300, 190, "Rovnoběžky p a q protnuté příčkou AB; úhel 70° u bodu A; osy úhlů na téže straně příčky se protínají v bodě O; hledaný úhel AOB"),
  osmiuhelnik: img("nove-osmiuhelnik.svg", 270, 250, "Pravidelný osmiúhelník ABCDEFGH s úhlopříčkou AC; hledaný úhel BAC"),
};

const base = (id, podtema, level, zadani, odpoved, kroky, cas, extra = {}) => ({
  id, tema: "uhly", podtema, obtiznost: level, ...extra, zadani, odpoved, reseni_kroky: kroky, cas_sekund: cas, sm2_interval: 1,
});
const typed = base;
const choice = (id, podtema, level, zadani, moznosti, spravna, kroky, cas, extra = {}) =>
  base(id, podtema, level, zadani, moznosti[spravna], kroky, cas, { moznosti, spravna, ...extra });
const anoNe = (id, podtema, level, zadani, pravda, kroky, cas, extra) =>
  base(id, podtema, level, zadani, pravda ? "Ano" : "Ne", kroky, cas, { moznosti: ["Ano", "Ne"], spravna: pravda ? 0 : 1, ...extra });

const trojStem = "V trojúhelníku ABC je α = 50° a β = 70°. Bod D leží na straně AB a přímka CD je osou úhlu γ (viz obrázek). Rozhodněte, zda je tvrzení pravdivé.";

const ex = [
  // ───────── L1 ─────────
  typed("UHN1_01", "doplnkove_uhly", 1, "Úhel α má velikost 38°. Jak velký je úhel, který α doplňuje na pravý úhel (90°)?", "52°", [
    "Pravý úhel má 90°.", "Doplňkový úhel: 90° − 38° = 52°.",
  ], 60),
  typed("UHN1_02", "stupne_minuty", 1, "Sečtěte úhly 47°30′ a 12°45′. Výsledek zapište ve stupních a minutách.", "60°15′", [
    "Minuty: 30′ + 45′ = 75′, což je 1° a 15′.", "Stupně: 47° + 12° + 1° = 60°.", "Výsledek: 60°15′.",
  ], 90),
  typed("UHN1_03", "stupne_minuty", 1, "Přímý úhel má 180°. Jak velký úhel zbude, když od něj odečteme úhel 62°40′? Výsledek zapište ve stupních a minutách.", "117°20′", [
    "Přepíšeme 180° = 179°60′ (1° = 60′).", "179°60′ − 62°40′ = 117°20′.",
  ], 90),
  typed("UHN1_04", "pravidelny_mnohouhelnik", 1, "Obrázek ukazuje pravidelný šestiúhelník. Jak velký je jeho vnitřní úhel (?)?", "120°", [
    "Z jednoho vrcholu rozdělíme šestiúhelník na 4 trojúhelníky, jejich úhly dají všechny vnitřní úhly: 4 · 180° = 720°.",
    "Všech šest úhlů je stejných: 720° : 6 = 120°.",
  ], 90, { image: IMG.sestiuhelnik }),
  typed("UHN1_05", "rovnoramenny_trojuhelnik", 1, "Pravoúhlý trojúhelník má dvě stejně dlouhé odvěsny. Jak velký je každý z jeho ostrých úhlů?", "45°", [
    "Součet úhlů v trojúhelníku je 180°, pravý úhel má 90°, zbývající dva úhly mají dohromady 90°.",
    "Stejně dlouhé odvěsny znamenají stejné úhly: 90° : 2 = 45°.",
  ], 75),
  typed("UHN1_06", "hodiny", 1, "Na ciferníku hodin ukazují ručičky přesně 4:00. Jak velký (menší) úhel spolu svírají?", "120°", [
    "Ciferník má 12 dílků a celý kruh 360°, jeden dílek (hodina) je 360° : 12 = 30°.",
    "Minutová ručička je na 12, hodinová na 4: 4 · 30° = 120°.",
  ], 75),
  typed("UHN1_07", "osa_uhlu", 1, "Osa úhlu AVB ho dělí na dva shodné úhly. Úhel AVB má 84°. Jak velký je každý z nich?", "42°", [
    "Osa rozděluje úhel na dvě stejné poloviny.", "84° : 2 = 42°.",
  ], 60),
  typed("UHN1_08", "rovnobeznik", 1, "V rovnoběžníku ABCD má úhel u vrcholu A velikost α = 65°. Jak velký je úhel β u sousedního vrcholu B?", "115°", [
    "V rovnoběžníku dávají dva sousední úhly dohromady 180° (rovnoběžné strany a příčka).",
    "β = 180° − 65° = 115°.",
  ], 75),

  // ───────── L2 ─────────
  typed("UHN2_01", "pravidelny_mnohouhelnik", 2, "Vnější úhel pravidelného mnohoúhelníku má velikost 40°. Kolik vrcholů má tento mnohoúhelník?", "9", [
    "Součet všech vnějších úhlů každého konvexního mnohoúhelníku je 360°.",
    "Vnější úhly jsou shodné, takže jejich počet je 360° : 40° = 9.",
    "Mnohoúhelník má 9 vrcholů (je to devítiúhelník).",
  ], 120),
  typed("UHN2_02", "pravidelny_mnohouhelnik", 2, "Vnitřní úhel pravidelného mnohoúhelníku má velikost 150°. Kolik stran má tento mnohoúhelník?", "12", [
    "Vnější úhel je doplněk vnitřního do 180°: 180° − 150° = 30°.",
    "Součet vnějších úhlů je 360°, takže počet vrcholů je 360° : 30° = 12.",
    "Mnohoúhelník má 12 stran.",
  ], 120),
  choice("UHN2_03", "deltoid", 2, "Čtyřúhelník ABCD je deltoid, platí AB = AD a CB = CD (viz obrázek). Úhel u vrcholu A má 70° a úhel u vrcholu C má 50°. Jak velký je úhel u vrcholu B?",
    ["90°", "100°", "120°", "130°", "240°"], 2, [
      "Součet úhlů čtyřúhelníku je 360°.", "Úhly u B a D jsou v deltoidu shodné: 360° − 70° − 50° = 240° je jejich součet.",
      "Úhel u B: 240° : 2 = 120°. Správně je C). (240° je součet obou shodných úhlů.)",
    ], 150, { image: IMG.deltoid }),
  typed("UHN2_04", "lichobeznik", 2, "Rovnoramenný lichoběžník ABCD má základny AB a CD a úhel u vrcholu A měří 68° (viz obrázek). Jak velký je úhel u vrcholu D?", "112°", [
    "Základny AB a CD jsou rovnoběžné, rameno AD je příčka.",
    "Úhly u ramene AD (u vrcholů A a D) dávají dohromady 180°.", "Úhel u D: 180° − 68° = 112°.",
  ], 120, { image: IMG.lichobeznik }),
  typed("UHN2_05", "hodiny", 2, "Kolik stupňů měří menší úhel mezi hodinovou a minutovou ručičkou ve 2:30?", "105°", [
    "Minutová ručička ukazuje na 6, tedy 6 · 30° = 180° od dvanáctky.",
    "Hodinová ručička urazila 2 hodiny a půl hodiny: 2 · 30° + 15° = 75°.",
    "Rozdíl: 180° − 75° = 105°.",
  ], 150),
  typed("UHN2_06", "stupne_minuty", 2, "Jak velký je úhel, který tvoří tři osminy pravého úhlu? Výsledek zapište ve stupních a minutách.", "33°45′", [
    "Osmina pravého úhlu: 90° : 8 = 11,25°.", "Tři osminy: 3 · 11,25° = 33,75°.",
    "0,75° = 0,75 · 60′ = 45′, výsledek je 33°45′.",
  ], 150),
  typed("UHN2_07", "doplnkove_uhly", 2, "Úhel α je o 36° větší než úhel, který ho doplňuje na pravý úhel. Jak velký je úhel α?", "63°", [
    "Doplňkový úhel označíme β: β = 90° − α.", "Podle zadání je α = β + 36° = 90° − α + 36°.",
    "Odtud 2α = 126°, takže α = 63°.", "Kontrola: doplněk je 27°, a 63° − 27° = 36°.",
  ], 150),
  typed("UHN2_08", "rovnobezky", 2, "Přímky p a q jsou rovnoběžné (viz obrázek). Jak velký je úhel AXB?", "85°", [
    "Bodem X vedeme přímku rovnoběžnou s p a q. Rozdělí úhel AXB na dva úhly.",
    "Horní z nich je střídavý k úhlu 35°, spodní je střídavý k úhlu 50°.",
    "Úhel AXB = 35° + 50° = 85°.",
  ], 150, { image: IMG.lomena }),
  anoNe("UHN2_09", "vnitrni_uhly", 2, `${trojStem} Tvrzení: „Úhel γ má velikost 60°."`, true, [
    "γ = 180° − 50° − 70° = 60°. Tvrzení je pravdivé — Ano.",
  ], 90, { image: IMG.trojOsa }),
  anoNe("UHN2_10", "osa_uhlu", 2, `${trojStem} Tvrzení: „Úhel ACD má velikost 25°."`, false, [
    "γ = 180° − 50° − 70° = 60°. Osa úhlu γ ho dělí na dvě poloviny po 30°.",
    "Úhel ACD má 30°, ne 25° — Ne.",
  ], 120, { image: IMG.trojOsa }),
  anoNe("UHN2_11", "osa_uhlu", 2, `${trojStem} Tvrzení: „Úhel ADC má velikost 100°."`, true, [
    "γ = 60°, takže úhel ACD = 60° : 2 = 30°.",
    "V trojúhelníku ADC: 180° − 50° − 30° = 100°. Tvrzení je pravdivé — Ano.",
  ], 150, { image: IMG.trojOsa }),
  typed("UHN2_12", "pravidelny_mnohouhelnik", 2, "Obrázek ukazuje pravidelný osmiúhelník ABCDEFGH s úhlopříčkou AC. Jak velký je úhel BAC? Výsledek zapište ve stupních a minutách.", "22°30′", [
    "Vnitřní úhel pravidelného osmiúhelníku: (8 − 2) · 180° : 8 = 135°.",
    "Trojúhelník ABC je rovnoramenný (AB = BC) s úhlem 135° u vrcholu B.",
    "Úhly při základně: (180° − 135°) : 2 = 22,5° = 22°30′.",
  ], 180, { image: IMG.osmiuhelnik }),

  // ───────── L3 ─────────
  choice("UHN3_01", "osa_uhlu", 3, "V trojúhelníku ABC je α = 52° a β = 64° (viz obrázek). Osy úhlů při vrcholech A a B se protínají v bodě I. Jak velký je úhel AIB?",
    ["58°", "90°", "116°", "122°", "128°"], 3, [
      "Osa úhlu při A svírá se stranou AB úhel 52° : 2 = 26°, osa úhlu při B úhel 64° : 2 = 32°.",
      "V trojúhelníku ABI je úhel AIB = 180° − 26° − 32° = 122°. Správně je D).",
      "(116° je součet α + β, 58° je jeho polovina.)",
    ], 210, { image: IMG.osy }),
  typed("UHN3_02", "kruznice_opsana", 3, "Bod S je střed kružnice opsané trojúhelníku ABC. Úhel SAB má 25° a úhel SBC má 35° (viz obrázek). Jak velký je úhel ACB?", "65°", [
    "Úsečky SA, SB a SC jsou poloměry, proto jsou trojúhelníky SAB, SBC a SCA rovnoramenné.",
    "Z trojúhelníku SAB: úhel SBA = 25°. Z trojúhelníku SBC: úhel SCB = 35°. Úhly SCA a SAC jsou shodné, označíme je x.",
    "Součet úhlů v trojúhelníku ABC: 2 · (25° + 35° + x) = 180°, takže x = 30°.",
    "Úhel ACB = úhel SCB + úhel SCA = 35° + 30° = 65°.",
  ], 270, { image: IMG.kruznice }),
  choice("UHN3_03", "pravidelny_mnohouhelnik", 3, "ABCDEF je pravidelný šestiúhelník (viz obrázek). Jak velký je úhel CAE, který svírají úhlopříčky AC a AE?",
    ["30°", "45°", "60°", "90°", "120°"], 2, [
      "Vnitřní úhel pravidelného šestiúhelníku má 120°.",
      "Trojúhelník ABC je rovnoramenný (AB = BC) s úhlem 120° u B, takže úhel BAC = (180° − 120°) : 2 = 30°. Stejně úhel FAE = 30°.",
      "Úhel CAE = 120° − 30° − 30° = 60°. Správně je C).",
    ], 180, { image: IMG.sest6 }),
  typed("UHN3_04", "vyska_a_osa", 3, "V trojúhelníku ABC je α = 48° a β = 72° (viz obrázek). Přímka CV je výška na stranu AB a přímka CD je osa úhlu γ; body V a D leží na straně AB. Jak velký je úhel VCD?", "12°", [
    "γ = 180° − 48° − 72° = 60°, takže osa vytvoří úhel ACD = 30°.",
    "V pravoúhlém trojúhelníku AVC je úhel ACV = 90° − 48° = 42°.",
    "Úhel VCD = ACV − ACD = 42° − 30° = 12°.",
  ], 270, { image: IMG.vyska }),
  choice("UHN3_05", "rovnoramenny_trojuhelnik", 3, "V rovnoramenném trojúhelníku ABC se základnou BC (AB = AC) leží na straně AC bod D tak, že AD = BD = BC (viz obrázek). Jak velký je úhel u vrcholu A?",
    ["30°", "36°", "40°", "45°", "72°"], 1, [
      "Úhel u vrcholu A označíme x. Trojúhelník ABD je rovnoramenný (AD = BD), proto úhel ABD = x.",
      "Úhel BDC je vnější úhel trojúhelníku ABD, takže BDC = 2x. Trojúhelník BCD je rovnoramenný (BD = BC), proto také BCD = 2x.",
      "Trojúhelník ABC je rovnoramenný, takže úhel ACB = ABC = 2x. Součet úhlů v ABC: x + 2x + 2x = 180°, tedy x = 36°. Správně je B).",
      "(72° je velikost úhlů při základně.)",
    ], 300, { image: IMG.zlaty }),
  choice("UHN3_06", "rovnobeznik", 3, "V rovnoběžníku ABCD je α = 70°. Osa úhlu při vrcholu A protíná stranu BC v bodě E (viz obrázek). Jak velký je úhel AEC?",
    ["35°", "70°", "110°", "145°", "155°"], 3, [
      "Osa dělí úhel DAB na dva úhly po 35°.",
      "Strany AD a BC jsou rovnoběžné, příčka AE tvoří střídavé úhly: úhel AEB = úhel DAE = 35°.",
      "Úhly AEB a AEC jsou vedlejší: 180° − 35° = 145°. Správně je D).",
    ], 240, { image: IMG.rovnobeznik }),
  typed("UHN3_07", "hodiny", 3, "Kolik stupňů měří menší úhel mezi hodinovou a minutovou ručičkou ve 14:40 (tedy ve 2:40 odpoledne)?", "160°", [
    "Minutová ručička ukazuje na 8, tedy 8 · 30° = 240° od dvanáctky.",
    "Hodinová ručička urazila 2 hodiny a 40 minut: 2 · 30° + 40 · 0,5° = 60° + 20° = 80°.",
    "Rozdíl: 240° − 80° = 160° (menší z obou úhlů je 160°, druhý je 200°).",
  ], 210),
  typed("UHN3_08", "vnejsi_uhel", 3, "V trojúhelníku ABC jsou vnější úhly při vrcholech A a B v poměru 5 : 6 a vnější úhel při vrcholu C má 140°. Jak velký je největší vnitřní úhel tohoto trojúhelníku?", "80°", [
    "Součet vnějších úhlů trojúhelníku je 360°, takže vnější úhly při A a B dávají dohromady 360° − 140° = 220°.",
    "Poměr 5 : 6 má 11 dílů: 220° : 11 = 20°. Vnější úhly jsou 100° (u A) a 120° (u B).",
    "Vnitřní úhly: α = 180° − 100° = 80°, β = 180° − 120° = 60°, γ = 180° − 140° = 40°.",
    "Největší je α = 80°.",
  ], 270),
  choice("UHN3_09", "rovnobezky", 3, "Příčka AB protíná rovnoběžky p a q (viz obrázek). Úhel, který svírá příčka s přímkou p vpravo od příčky, má 70°. Osy tohoto úhlu a úhlu, který příčka svírá s přímkou q na téže straně, se protínají v bodě O. Jak velký je úhel AOB?",
    ["60°", "70°", "90°", "110°", "120°"], 2, [
      "Úhly na téže straně příčky mezi rovnoběžkami se doplňují do 180°: u A je 70°, u B tedy 110°.",
      "Osy je rozpůlí na 35° a 55°.", "V trojúhelníku ABO je úhel AOB = 180° − 35° − 55° = 90°. Správně je C).",
      "(Výsledek je vždy 90° — polovina z 180° — bez ohledu na velikost úhlu 70°.)",
    ], 240, { image: IMG.osyRovnobezky }),
];

// ───────── nezávislé ověření ─────────
let fail = 0;
const ok = (n, c, i = "") => { if (!c) { fail++; console.log("CHYBA", n, i); } };
const close = (a, b) => Math.abs(a - b) < 1e-9;
const by = Object.fromEntries(ex.map((e) => [e.id, e]));
const opt = (id) => by[id].moznosti[by[id].spravna];
const clockAngle = (h, m) => { const hh = (h % 12) * 30 + m * 0.5, mm = m * 6, d = Math.abs(hh - mm); return Math.min(d, 360 - d); };
const interior = (n) => ((n - 2) * 180) / n;
// L1
ok("L1_01", 90 - 38 === 52 && by.UHN1_01.odpoved === "52°");
{ const t = 30 + 45, min = t % 60, deg = 47 + 12 + Math.floor(t / 60); ok("L1_02", deg === 60 && min === 15 && by.UHN1_02.odpoved === "60°15′"); }
{ const tot = 180 * 60 - (62 * 60 + 40); ok("L1_03", Math.floor(tot / 60) === 117 && tot % 60 === 20 && by.UHN1_03.odpoved === "117°20′"); }
ok("L1_04", interior(6) === 120 && 4 * 180 / 6 === 120 && by.UHN1_04.odpoved === "120°");
ok("L1_05", (180 - 90) / 2 === 45 && by.UHN1_05.odpoved === "45°");
ok("L1_06", clockAngle(4, 0) === 120 && by.UHN1_06.odpoved === "120°");
ok("L1_07", 84 / 2 === 42 && by.UHN1_07.odpoved === "42°");
ok("L1_08", 180 - 65 === 115 && by.UHN1_08.odpoved === "115°");
// L2
ok("L2_01", 360 / 40 === 9 && close(180 - interior(9), 40) && by.UHN2_01.odpoved === "9");
ok("L2_02", 360 / (180 - 150) === 12 && close(interior(12), 150) && by.UHN2_02.odpoved === "12");
ok("L2_03", (360 - 70 - 50) / 2 === 120 && opt("UHN2_03") === "120°" && by.UHN2_03.moznosti.includes("240°"));
ok("L2_04", 180 - 68 === 112 && by.UHN2_04.odpoved === "112°");
ok("L2_05", clockAngle(2, 30) === 105 && by.UHN2_05.odpoved === "105°");
{ const deg = (90 / 8) * 3, d = Math.floor(deg), m = Math.round((deg - d) * 60); ok("L2_06", d === 33 && m === 45 && by.UHN2_06.odpoved === "33°45′", deg); }
{ let sol = []; for (let a = 0; a <= 90; a += 0.5) if (close(a, 90 - a + 36)) sol.push(a); ok("L2_07", sol.length === 1 && sol[0] === 63 && by.UHN2_07.odpoved === "63°", sol); }
ok("L2_08", 35 + 50 === 85 && by.UHN2_08.odpoved === "85°");
{ const g = 180 - 50 - 70; ok("L2_09", g === 60 && by.UHN2_09.odpoved === "Ano"); ok("L2_10", g / 2 === 30 && g / 2 !== 25 && by.UHN2_10.odpoved === "Ne"); ok("L2_11", 180 - 50 - g / 2 === 100 && by.UHN2_11.odpoved === "Ano"); }
ok("L2_12", close(interior(8), 135) && close((180 - 135) / 2, 22.5) && by.UHN2_12.odpoved === "22°30′");
// L3
ok("L3_01", 180 - 52 / 2 - 64 / 2 === 122 && opt("UHN3_01") === "122°" && by.UHN3_01.moznosti.includes("116°"));
{ let sol = []; for (let x = 1; x < 90; x += 0.5) if (close(2 * (25 + 35 + x), 180)) sol.push(x); ok("L3_02", sol.length === 1 && sol[0] === 30 && 35 + sol[0] === 65 && by.UHN3_02.odpoved === "65°", sol); }
{ const bac = (180 - interior(6)) / 2; ok("L3_03", close(interior(6) - 2 * bac, 60) && opt("UHN3_03") === "60°", bac); }
{ const g = 180 - 48 - 72, acd = g / 2, acv = 90 - 48; ok("L3_04", acv - acd === 12 && by.UHN3_04.odpoved === "12°"); }
{ let sol = []; for (let x = 1; x < 90; x += 0.5) if (close(x + 2 * x + 2 * x, 180)) sol.push(x); ok("L3_05", sol.length === 1 && sol[0] === 36 && opt("UHN3_05") === "36°" && by.UHN3_05.moznosti.includes("72°"), sol); }
ok("L3_06", 180 - 70 / 2 === 145 && opt("UHN3_06") === "145°" && by.UHN3_06.moznosti.includes("35°"));
ok("L3_07", clockAngle(14, 40) === 160 && clockAngle(2, 40) === 160 && by.UHN3_07.odpoved === "160°");
{ let sol = []; for (let k = 1; k < 100; k++) { const A = 5 * k, B = 6 * k; if (A + B + 140 === 360) sol.push([A, B]); } const [ea, eb] = sol[0]; const inner = [180 - ea, 180 - eb, 180 - 140]; ok("L3_08", sol.length === 1 && inner.reduce((s, v) => s + v, 0) === 180 && Math.max(...inner) === 80 && by.UHN3_08.odpoved === "80°", sol); }
ok("L3_09", 70 / 2 + 110 / 2 === 90 && 180 - 70 / 2 - 110 / 2 === 90 && opt("UHN3_09") === "90°");
// struktura
for (const e of ex) {
  if (e.moznosti) ok(e.id + " možnosti", e.moznosti.length >= 2 && new Set(e.moznosti).size === e.moznosti.length && e.odpoved === e.moznosti[e.spravna]);
  else if (e.podtema === "stupne_minuty" || /°\d+′$/.test(e.odpoved)) {
    ok(e.id + " stupně a minuty", N.checkAnswer(e.odpoved, e.odpoved) && N.checkAnswer(e.odpoved.replace("′", "'"), e.odpoved), e.odpoved);
  } else ok(e.id + " vyhodnotitelná odpověď", N.toValue(e.odpoved) !== null, e.odpoved);
  if (e.image?.kind === "static") ok(e.id + " soubor", fs.existsSync("public" + e.image.url), e.image.url);
  if (!e.moznosti) {
    const m = e.odpoved.replace(/\s/g, "").match(/\d+/g), steps = e.reseni_kroky.join(" ").replace(/\s/g, "").replace(/,/g, ".");
    ok(e.id + " odpověď v krocích", m.every((n) => steps.includes(n)), e.odpoved);
  }
  if (/PŘEPOČ|přepoč|\boprava\b|zkusme|Jiný postup|Pozor: výsledek/i.test(e.reseni_kroky.join(" "))) ok(e.id + " poznámka v řešení", false);
}
const ids = ex.map((e) => e.id);
ok("unikátní id", new Set(ids).size === ids.length && ex.length === 29);
const all = ["databaze", "cermat-200", "doplnky-uhly-souhrnne", "konstrukce-interaktivni"].flatMap((f) => JSON.parse(fs.readFileSync(`src/data/${f}.json`, "utf8")).examples);
ok("id bez kolize s databází", ids.every((id) => !all.some((e) => e.id === id)));
const lv = (n) => ex.filter((e) => e.obtiznost === n).length;
console.log(`úloh: ${ex.length} (L1 ${lv(1)}, L2 ${lv(2)}, L3 ${lv(3)}), chyb: ${fail}`);
if (fail) { console.log("NEZAPISUJI"); process.exit(1); }

let prev = { nazev: "", examples: [] };
try { prev = JSON.parse(fs.readFileSync("src/data/nahled-batch.json", "utf8")); } catch { /* bez předchozí dávky */ }
const others = (prev.examples ?? []).filter((e) => !/^UHN[123]_/.test(e.id));
const nazev = others.length ? `${prev.nazev} + Úhly (29 úloh)` : "Úhly — dorovnání (29 úloh: L1 ×8, L2 ×12, L3 ×9 s vlastními obrázky: pravidelné mnohoúhelníky, osy úhlů, kružnice se středem, rovnoběžky, hodiny)";
fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev, examples: [...others, ...ex] }, null, 2) + "\n");
console.log(`zapsáno do src/data/nahled-batch.json (${others.length} jiných + ${ex.length} úhlových)`);
