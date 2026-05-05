import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, "../src/data/databaze.json");
const db = JSON.parse(readFileSync(dbPath, "utf-8"));

// Remove non-CERMAT topics
const REMOVE_TOPICS = new Set(["pravdepodobnost", "funkce"]);
const kept = db.examples.filter(e => !REMOVE_TOPICS.has(e.tema));
console.log(`Kept ${kept.length} examples (removed ${db.examples.length - kept.length})`);

// ── New examples ──────────────────────────────────────────────────────────────

const mocniny = [
  // obtiznost 1
  { id:"MOC_001", tema:"mocniny", podtema:"umocnovani", obtiznost:1, zadani:"Vypočítej: 2²", odpoved:"4", reseni_kroky:["2² znamená 2 × 2","2 × 2 = 4"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_002", tema:"mocniny", podtema:"umocnovani", obtiznost:1, zadani:"Vypočítej: 3²", odpoved:"9", reseni_kroky:["3² = 3 × 3 = 9"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_003", tema:"mocniny", podtema:"umocnovani", obtiznost:1, zadani:"Vypočítej: 4²", odpoved:"16", reseni_kroky:["4² = 4 × 4 = 16"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_004", tema:"mocniny", podtema:"umocnovani", obtiznost:1, zadani:"Vypočítej: 5²", odpoved:"25", reseni_kroky:["5² = 5 × 5 = 25"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_005", tema:"mocniny", podtema:"umocnovani", obtiznost:1, zadani:"Vypočítej: 6²", odpoved:"36", reseni_kroky:["6² = 6 × 6 = 36"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_006", tema:"mocniny", podtema:"umocnovani", obtiznost:1, zadani:"Vypočítej: 7²", odpoved:"49", reseni_kroky:["7² = 7 × 7 = 49"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_007", tema:"mocniny", podtema:"umocnovani", obtiznost:1, zadani:"Vypočítej: 10²", odpoved:"100", reseni_kroky:["10² = 10 × 10 = 100"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_008", tema:"mocniny", podtema:"odmocniny", obtiznost:1, zadani:"Vypočítej: √4", odpoved:"2", reseni_kroky:["Hledáme číslo, jehož čtverec je 4","2² = 4, tedy √4 = 2"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_009", tema:"mocniny", podtema:"odmocniny", obtiznost:1, zadani:"Vypočítej: √9", odpoved:"3", reseni_kroky:["3² = 9, tedy √9 = 3"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_010", tema:"mocniny", podtema:"odmocniny", obtiznost:1, zadani:"Vypočítej: √16", odpoved:"4", reseni_kroky:["4² = 16, tedy √16 = 4"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_011", tema:"mocniny", podtema:"odmocniny", obtiznost:1, zadani:"Vypočítej: √25", odpoved:"5", reseni_kroky:["5² = 25, tedy √25 = 5"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_012", tema:"mocniny", podtema:"odmocniny", obtiznost:1, zadani:"Vypočítej: √36", odpoved:"6", reseni_kroky:["6² = 36, tedy √36 = 6"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_013", tema:"mocniny", podtema:"odmocniny", obtiznost:1, zadani:"Vypočítej: √49", odpoved:"7", reseni_kroky:["7² = 49, tedy √49 = 7"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_014", tema:"mocniny", podtema:"odmocniny", obtiznost:1, zadani:"Vypočítej: √64", odpoved:"8", reseni_kroky:["8² = 64, tedy √64 = 8"], cas_sekund:60, sm2_interval:1 },
  { id:"MOC_015", tema:"mocniny", podtema:"odmocniny", obtiznost:1, zadani:"Vypočítej: √100", odpoved:"10", reseni_kroky:["10² = 100, tedy √100 = 10"], cas_sekund:60, sm2_interval:1 },
  // obtiznost 2
  { id:"MOC_016", tema:"mocniny", podtema:"umocnovani", obtiznost:2, zadani:"Vypočítej: 2³", odpoved:"8", reseni_kroky:["2³ = 2 × 2 × 2","2 × 2 = 4, 4 × 2 = 8"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_017", tema:"mocniny", podtema:"umocnovani", obtiznost:2, zadani:"Vypočítej: 3³", odpoved:"27", reseni_kroky:["3³ = 3 × 3 × 3","3 × 3 = 9, 9 × 3 = 27"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_018", tema:"mocniny", podtema:"umocnovani", obtiznost:2, zadani:"Vypočítej: 2⁴", odpoved:"16", reseni_kroky:["2⁴ = 2 × 2 × 2 × 2","2² = 4, 4² = 16"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_019", tema:"mocniny", podtema:"umocnovani", obtiznost:2, zadani:"Vypočítej: (-3)²", odpoved:"9", reseni_kroky:["(-3)² = (-3) × (-3)","Záporné × záporné = kladné: 9"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_020", tema:"mocniny", podtema:"umocnovani", obtiznost:2, zadani:"Vypočítej: (-2)³", odpoved:"-8", reseni_kroky:["(-2)³ = (-2) × (-2) × (-2)","(-2)² = 4, 4 × (-2) = -8"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_021", tema:"mocniny", podtema:"odmocniny", obtiznost:2, zadani:"Vypočítej: √121", odpoved:"11", reseni_kroky:["11² = 121, tedy √121 = 11"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_022", tema:"mocniny", podtema:"odmocniny", obtiznost:2, zadani:"Vypočítej: √144", odpoved:"12", reseni_kroky:["12² = 144, tedy √144 = 12"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_023", tema:"mocniny", podtema:"zakony_mocnin", obtiznost:2, zadani:"Zjednodušs: 2³ · 2²", odpoved:"32", reseni_kroky:["Stejný základ → sečteme exponenty: 2³ · 2² = 2^(3+2) = 2⁵","2⁵ = 32"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_024", tema:"mocniny", podtema:"zakony_mocnin", obtiznost:2, zadani:"Zjednodušs: 4⁴ ÷ 4²", odpoved:"16", reseni_kroky:["Stejný základ → odečteme exponenty: 4⁴ ÷ 4² = 4^(4−2) = 4²","4² = 16"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_025", tema:"mocniny", podtema:"umocnovani", obtiznost:2, zadani:"Vypočítej: 3² + 4²", odpoved:"25", reseni_kroky:["3² = 9, 4² = 16","9 + 16 = 25"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_026", tema:"mocniny", podtema:"umocnovani", obtiznost:2, zadani:"Vypočítej: 5² − 3²", odpoved:"16", reseni_kroky:["5² = 25, 3² = 9","25 − 9 = 16"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_027", tema:"mocniny", podtema:"umocnovani", obtiznost:2, zadani:"Vypočítej: 2⁵", odpoved:"32", reseni_kroky:["2⁵ = 2 × 2 × 2 × 2 × 2","2² = 4, 2³ = 8, 2⁴ = 16, 2⁵ = 32"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_028", tema:"mocniny", podtema:"umocnovani", obtiznost:2, zadani:"Vypočítej: (1/2)²", odpoved:"1/4", reseni_kroky:["(1/2)² = 1/2 × 1/2","Čitatele: 1×1=1, jmenovatele: 2×2=4","Výsledek: 1/4"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_029", tema:"mocniny", podtema:"odmocniny", obtiznost:2, zadani:"Vypočítej: √(3² + 4²)", odpoved:"5", reseni_kroky:["Nejprve výrazy pod odmocninou: 3² = 9, 4² = 16","9 + 16 = 25","√25 = 5 (Pythagorova trojice 3-4-5)"], cas_sekund:90, sm2_interval:1 },
  { id:"MOC_030", tema:"mocniny", podtema:"odmocniny", obtiznost:2, zadani:"Vypočítej: √169", odpoved:"13", reseni_kroky:["13² = 169, tedy √169 = 13"], cas_sekund:90, sm2_interval:1 },
  // obtiznost 3
  { id:"MOC_031", tema:"mocniny", podtema:"odmocniny", obtiznost:3, zadani:"Vypočítej: √(5² + 12²)", odpoved:"13", reseni_kroky:["5² = 25, 12² = 144","25 + 144 = 169","√169 = 13 (Pythagorova trojice 5-12-13)"], cas_sekund:120, sm2_interval:1 },
  { id:"MOC_032", tema:"mocniny", podtema:"zakony_mocnin", obtiznost:3, zadani:"Vypočítej: 2^10", odpoved:"1024", reseni_kroky:["2⁵ = 32","2^10 = (2⁵)² = 32² = 1024"], cas_sekund:120, sm2_interval:1 },
  { id:"MOC_033", tema:"mocniny", podtema:"umocnovani", obtiznost:3, zadani:"Vypočítej: 3⁴", odpoved:"81", reseni_kroky:["3² = 9","3⁴ = (3²)² = 9² = 81"], cas_sekund:120, sm2_interval:1 },
  { id:"MOC_034", tema:"mocniny", podtema:"umocnovani", obtiznost:3, zadani:"Vypočítej: (-1)^100", odpoved:"1", reseni_kroky:["Sudý exponent → výsledek vždy kladný","(-1)^sudé = 1"], cas_sekund:120, sm2_interval:1 },
  { id:"MOC_035", tema:"mocniny", podtema:"umocnovani", obtiznost:3, zadani:"Vypočítej: (-1)^101", odpoved:"-1", reseni_kroky:["Lichý exponent → výsledek záporný","(-1)^liché = -1"], cas_sekund:120, sm2_interval:1 },
  { id:"MOC_036", tema:"mocniny", podtema:"zakony_mocnin", obtiznost:3, zadani:"Vypočítej: 6² × 2³", odpoved:"288", reseni_kroky:["6² = 36, 2³ = 8","36 × 8 = 288"], cas_sekund:120, sm2_interval:1 },
  { id:"MOC_037", tema:"mocniny", podtema:"odmocniny", obtiznost:3, zadani:"Vypočítej: √(49 + 576)", odpoved:"25", reseni_kroky:["49 + 576 = 625","√625: 25² = 625, tedy √625 = 25"], cas_sekund:120, sm2_interval:1 },
  { id:"MOC_038", tema:"mocniny", podtema:"odmocniny", obtiznost:3, zadani:"Vypočítej: √(10² − 8²)", odpoved:"6", reseni_kroky:["10² = 100, 8² = 64","100 − 64 = 36","√36 = 6"], cas_sekund:120, sm2_interval:1 },
  { id:"MOC_039", tema:"mocniny", podtema:"zakony_mocnin", obtiznost:3, zadani:"Vypočítej: (2³)²", odpoved:"64", reseni_kroky:["(2³)² = 2^(3×2) = 2⁶","2⁶ = 64"], cas_sekund:120, sm2_interval:1 },
  { id:"MOC_040", tema:"mocniny", podtema:"umocnovani", obtiznost:3, zadani:"Vypočítej: 10³ − 10²", odpoved:"900", reseni_kroky:["10³ = 1000, 10² = 100","1000 − 100 = 900"], cas_sekund:120, sm2_interval:1 },
];

const cisselne_rady = [
  // obtiznost 1
  { id:"CIS_001", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:1, zadani:"Doplň: 2, 4, 6, 8, ___", odpoved:"10", reseni_kroky:["Rozdíl sousedních členů: 4−2 = 2","Přičteme 2: 8 + 2 = 10"], cas_sekund:60, sm2_interval:1 },
  { id:"CIS_002", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:1, zadani:"Doplň: 1, 3, 5, 7, ___", odpoved:"9", reseni_kroky:["Společný rozdíl d = 2","7 + 2 = 9"], cas_sekund:60, sm2_interval:1 },
  { id:"CIS_003", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:1, zadani:"Doplň: 5, 10, 15, 20, ___", odpoved:"25", reseni_kroky:["Násobky 5: přičítáme 5","20 + 5 = 25"], cas_sekund:60, sm2_interval:1 },
  { id:"CIS_004", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:1, zadani:"Doplň: 100, 90, 80, 70, ___", odpoved:"60", reseni_kroky:["Klesající posloupnost: d = −10","70 + (−10) = 60"], cas_sekund:60, sm2_interval:1 },
  { id:"CIS_005", tema:"cisselne_rady", podtema:"geometricka_posloupnost", obtiznost:1, zadani:"Doplň: 1, 2, 4, 8, ___", odpoved:"16", reseni_kroky:["Každý člen je 2× větší (kvocient q = 2)","8 × 2 = 16"], cas_sekund:60, sm2_interval:1 },
  { id:"CIS_006", tema:"cisselne_rady", podtema:"geometricka_posloupnost", obtiznost:1, zadani:"Doplň: 3, 6, 12, 24, ___", odpoved:"48", reseni_kroky:["Kvocient q = 2","24 × 2 = 48"], cas_sekund:60, sm2_interval:1 },
  { id:"CIS_007", tema:"cisselne_rady", podtema:"kvadraticka_posloupnost", obtiznost:1, zadani:"Doplň: 1, 4, 9, 16, ___", odpoved:"25", reseni_kroky:["Čtverce přirozených čísel: 1², 2², 3², 4²…","5² = 25"], cas_sekund:60, sm2_interval:1 },
  { id:"CIS_008", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:1, zadani:"Doplň: 0, 3, 6, 9, 12, ___", odpoved:"15", reseni_kroky:["Násobky 3: d = 3","12 + 3 = 15"], cas_sekund:60, sm2_interval:1 },
  { id:"CIS_009", tema:"cisselne_rady", podtema:"geometricka_posloupnost", obtiznost:1, zadani:"Doplň: 2, 6, 18, 54, ___", odpoved:"162", reseni_kroky:["Kvocient q = 3","54 × 3 = 162"], cas_sekund:60, sm2_interval:1 },
  { id:"CIS_010", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:1, zadani:"Doplň: 50, 45, 40, 35, ___", odpoved:"30", reseni_kroky:["Klesající: d = −5","35 − 5 = 30"], cas_sekund:60, sm2_interval:1 },
  { id:"CIS_011", tema:"cisselne_rady", podtema:"fibonacciho_posloupnost", obtiznost:1, zadani:"Doplň: 1, 1, 2, 3, 5, 8, ___", odpoved:"13", reseni_kroky:["Každý člen = součet dvou předchozích","5 + 8 = 13 (Fibonacciho posloupnost)"], cas_sekund:60, sm2_interval:1 },
  { id:"CIS_012", tema:"cisselne_rady", podtema:"kubicka_posloupnost", obtiznost:1, zadani:"Doplň: 1, 8, 27, 64, ___", odpoved:"125", reseni_kroky:["Třetí mocniny: 1³, 2³, 3³, 4³…","5³ = 125"], cas_sekund:60, sm2_interval:1 },
  // obtiznost 2
  { id:"CIS_013", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:2, zadani:"Doplň: 3, 7, 11, 15, ___", odpoved:"19", reseni_kroky:["d = 7 − 3 = 4","15 + 4 = 19"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_014", tema:"cisselne_rady", podtema:"trojuhelnikova_cisla", obtiznost:2, zadani:"Doplň: 1, 3, 6, 10, 15, ___", odpoved:"21", reseni_kroky:["Trojúhelníková čísla: přičítáme vždy o 1 více","15 + 6 = 21"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_015", tema:"cisselne_rady", podtema:"fibonacciho_posloupnost", obtiznost:2, zadani:"Doplň: 2, 3, 5, 8, 13, ___", odpoved:"21", reseni_kroky:["Každý člen = součet dvou předchozích","8 + 13 = 21"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_016", tema:"cisselne_rady", podtema:"geometricka_posloupnost", obtiznost:2, zadani:"Doplň: 64, 32, 16, 8, ___", odpoved:"4", reseni_kroky:["Kvocient q = 1/2 (každý člen se dělí 2)","8 ÷ 2 = 4"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_017", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:2, zadani:"Jaký je 5. člen posloupnosti 3, 7, 11, 15, ...?", odpoved:"19", reseni_kroky:["a₁ = 3, d = 4","aₙ = a₁ + (n−1)·d","a₅ = 3 + 4·4 = 19"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_018", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:2, zadani:"Součet: 1 + 2 + 3 + ... + 10 = ?", odpoved:"55", reseni_kroky:["Gauss: S = n·(a₁+aₙ)/2","S = 10·(1+10)/2 = 10·11/2 = 55"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_019", tema:"cisselne_rady", podtema:"geometricka_posloupnost", obtiznost:2, zadani:"Jaký je 4. člen posloupnosti 2, 6, 18, ...?", odpoved:"54", reseni_kroky:["a₁ = 2, q = 3","a₄ = 2 · 3³ = 2 · 27 = 54"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_020", tema:"cisselne_rady", podtema:"ruzna_vzorec", obtiznost:2, zadani:"Doplň: 1, 2, 4, 7, 11, ___", odpoved:"16", reseni_kroky:["Rozdíly: +1, +2, +3, +4, +5 (rostou o 1)","11 + 5 = 16"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_021", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:2, zadani:"Jaký je 10. člen posloupnosti 5, 8, 11, ...?", odpoved:"32", reseni_kroky:["a₁ = 5, d = 3","a₁₀ = 5 + 9·3 = 5 + 27 = 32"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_022", tema:"cisselne_rady", podtema:"geometricka_posloupnost", obtiznost:2, zadani:"Doplň: 5, 10, 20, 40, ___", odpoved:"80", reseni_kroky:["q = 2 (každý člen × 2)","40 × 2 = 80"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_023", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:2, zadani:"Součet: 2 + 4 + 6 + ... + 20 = ?", odpoved:"110", reseni_kroky:["10 sudých čísel, a₁=2, a₁₀=20","S = 10·(2+20)/2 = 10·11 = 110"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_024", tema:"cisselne_rady", podtema:"ruzna_vzorec", obtiznost:2, zadani:"Doplň: 256, 128, 64, 32, ___", odpoved:"16", reseni_kroky:["q = 1/2 (dělíme 2)","32 ÷ 2 = 16"], cas_sekund:90, sm2_interval:1 },
  { id:"CIS_025", tema:"cisselne_rady", podtema:"kvadraticka_posloupnost", obtiznost:2, zadani:"Doplň: 1, 4, 9, 16, 25, ___", odpoved:"36", reseni_kroky:["Čtverce: 1², 2², 3², 4², 5²…","6² = 36"], cas_sekund:90, sm2_interval:1 },
  // obtiznost 3
  { id:"CIS_026", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:3, zadani:"Jaký je 20. člen posloupnosti 2, 5, 8, ...?", odpoved:"59", reseni_kroky:["a₁ = 2, d = 3","a₂₀ = 2 + 19·3 = 2 + 57 = 59"], cas_sekund:120, sm2_interval:1 },
  { id:"CIS_027", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:3, zadani:"Součet prvních 100 přirozených čísel?", odpoved:"5050", reseni_kroky:["Gaussův vzorec: S = n·(n+1)/2","S = 100·101/2 = 5050"], cas_sekund:120, sm2_interval:1 },
  { id:"CIS_028", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:3, zadani:"Jaký je 15. člen posloupnosti 10, 7, 4, ...?", odpoved:"-32", reseni_kroky:["a₁ = 10, d = −3","a₁₅ = 10 + 14·(−3) = 10 − 42 = −32"], cas_sekund:120, sm2_interval:1 },
  { id:"CIS_029", tema:"cisselne_rady", podtema:"ruzna_vzorec", obtiznost:3, zadani:"Posloupnost: aₙ = n² + 1. Jaký je 7. člen?", odpoved:"50", reseni_kroky:["Dosadíme n = 7","a₇ = 7² + 1 = 49 + 1 = 50"], cas_sekund:120, sm2_interval:1 },
  { id:"CIS_030", tema:"cisselne_rady", podtema:"geometricka_posloupnost", obtiznost:3, zadani:"Doplň: 3, 9, 27, 81, ___", odpoved:"243", reseni_kroky:["q = 3 (násobíme 3)","81 × 3 = 243"], cas_sekund:120, sm2_interval:1 },
  { id:"CIS_031", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:3, zadani:"Součet lichých čísel 1+3+5+...+19 = ?", odpoved:"100", reseni_kroky:["10 lichých čísel, a₁=1, a₁₀=19","S = 10·(1+19)/2 = 10·10 = 100"], cas_sekund:120, sm2_interval:1 },
  { id:"CIS_032", tema:"cisselne_rady", podtema:"ruzna_vzorec", obtiznost:3, zadani:"Jaký je 6. člen Fibonacciho posloupnosti (1, 1, 2, 3, 5, ...)?", odpoved:"8", reseni_kroky:["1, 1, 2, 3, 5, 8...","Každý člen = součet dvou předchozích: 3+5 = 8"], cas_sekund:120, sm2_interval:1 },
  { id:"CIS_033", tema:"cisselne_rady", podtema:"aritmeticka_posloupnost", obtiznost:3, zadani:"Kolik členů má posloupnost 5, 8, 11, ..., 50?", odpoved:"16", reseni_kroky:["aₙ = 5 + (n−1)·3 = 50","(n−1)·3 = 45, n−1 = 15","n = 16"], cas_sekund:120, sm2_interval:1 },
  { id:"CIS_034", tema:"cisselne_rady", podtema:"geometricka_posloupnost", obtiznost:3, zadani:"Jaký je 5. člen posloupnosti 1, 2, 4, 8, ...?", odpoved:"16", reseni_kroky:["a₁ = 1, q = 2","a₅ = 1 · 2⁴ = 16"], cas_sekund:120, sm2_interval:1 },
  { id:"CIS_035", tema:"cisselne_rady", podtema:"ruzna_vzorec", obtiznost:3, zadani:"Součet: 1² + 2² + 3² + 4² + 5² = ?", odpoved:"55", reseni_kroky:["1 + 4 + 9 + 16 + 25","= 5 + 9 + 16 + 25 = 55"], cas_sekund:120, sm2_interval:1 },
];

const vyrazy = [
  // obtiznost 1
  { id:"VYR_001", tema:"vyrazy", podtema:"dosazovani", obtiznost:1, zadani:"Dosaď x = 3: 2x + 1 = ?", odpoved:"7", reseni_kroky:["Dosadíme x = 3: 2·3 + 1","6 + 1 = 7"], cas_sekund:60, sm2_interval:1 },
  { id:"VYR_002", tema:"vyrazy", podtema:"dosazovani", obtiznost:1, zadani:"Dosaď x = 5: x − 2 = ?", odpoved:"3", reseni_kroky:["Dosadíme: 5 − 2 = 3"], cas_sekund:60, sm2_interval:1 },
  { id:"VYR_003", tema:"vyrazy", podtema:"dosazovani", obtiznost:1, zadani:"Dosaď a = 4: 3a − 2 = ?", odpoved:"10", reseni_kroky:["3·4 − 2 = 12 − 2 = 10"], cas_sekund:60, sm2_interval:1 },
  { id:"VYR_004", tema:"vyrazy", podtema:"dosazovani", obtiznost:1, zadani:"Dosaď x = 10: 5x − 3 = ?", odpoved:"47", reseni_kroky:["5·10 − 3 = 50 − 3 = 47"], cas_sekund:60, sm2_interval:1 },
  { id:"VYR_005", tema:"vyrazy", podtema:"dosazovani", obtiznost:1, zadani:"Dosaď x = 2, y = 3: x² + y = ?", odpoved:"7", reseni_kroky:["x² = 2² = 4","4 + 3 = 7"], cas_sekund:60, sm2_interval:1 },
  { id:"VYR_006", tema:"vyrazy", podtema:"dosazovani", obtiznost:1, zadani:"Dosaď x = 0: x³ + x + 5 = ?", odpoved:"5", reseni_kroky:["0³ + 0 + 5 = 0 + 0 + 5 = 5"], cas_sekund:60, sm2_interval:1 },
  { id:"VYR_007", tema:"vyrazy", podtema:"dosazovani", obtiznost:1, zadani:"Dosaď a = 2, b = 3: a² + b² = ?", odpoved:"13", reseni_kroky:["a² = 4, b² = 9","4 + 9 = 13"], cas_sekund:60, sm2_interval:1 },
  { id:"VYR_008", tema:"vyrazy", podtema:"dosazovani", obtiznost:1, zadani:"Dosaď n = 10: n(n+1)/2 = ?", odpoved:"55", reseni_kroky:["10 · 11 / 2","110 / 2 = 55"], cas_sekund:60, sm2_interval:1 },
  // obtiznost 2
  { id:"VYR_009", tema:"vyrazy", podtema:"dosazovani", obtiznost:2, zadani:"Dosaď x = 4: (x − 1)(x + 1) = ?", odpoved:"15", reseni_kroky:["(4−1)(4+1) = 3 · 5","= 15 (vzorec: x²−1 = 16−1 = 15)"], cas_sekund:90, sm2_interval:1 },
  { id:"VYR_010", tema:"vyrazy", podtema:"dosazovani", obtiznost:2, zadani:"Dosaď x = 3: x² − 2x + 1 = ?", odpoved:"4", reseni_kroky:["x² = 9, 2x = 6","9 − 6 + 1 = 4 (vzorec: (x−1)² = 2² = 4)"], cas_sekund:90, sm2_interval:1 },
  { id:"VYR_011", tema:"vyrazy", podtema:"dosazovani", obtiznost:2, zadani:"Dosaď x = 2: (x + 3)² = ?", odpoved:"25", reseni_kroky:["(2+3)² = 5²","= 25"], cas_sekund:90, sm2_interval:1 },
  { id:"VYR_012", tema:"vyrazy", podtema:"dosazovani", obtiznost:2, zadani:"Dosaď x = −1: x² + x − 1 = ?", odpoved:"-1", reseni_kroky:["(−1)² = 1, x = −1","1 + (−1) − 1 = −1"], cas_sekund:90, sm2_interval:1 },
  { id:"VYR_013", tema:"vyrazy", podtema:"dosazovani", obtiznost:2, zadani:"Dosaď t = 3: (2t − 1)² = ?", odpoved:"25", reseni_kroky:["2·3 − 1 = 5","5² = 25"], cas_sekund:90, sm2_interval:1 },
  { id:"VYR_014", tema:"vyrazy", podtema:"dosazovani", obtiznost:2, zadani:"Dosaď a = 5, b = 3: (a + b)(a − b) = ?", odpoved:"16", reseni_kroky:["(5+3)(5−3) = 8 · 2","= 16 (vzorec: a²−b² = 25−9 = 16)"], cas_sekund:90, sm2_interval:1 },
  { id:"VYR_015", tema:"vyrazy", podtema:"dosazovani", obtiznost:2, zadani:"Dosaď x = 5: x² − 3x + 2 = ?", odpoved:"12", reseni_kroky:["25 − 15 + 2","= 12"], cas_sekund:90, sm2_interval:1 },
  { id:"VYR_016", tema:"vyrazy", podtema:"dosazovani", obtiznost:2, zadani:"Dosaď x = 4: √x + x/2 = ?", odpoved:"4", reseni_kroky:["√4 = 2, 4/2 = 2","2 + 2 = 4"], cas_sekund:90, sm2_interval:1 },
  { id:"VYR_017", tema:"vyrazy", podtema:"dosazovani", obtiznost:2, zadani:"Dosaď x = 3: 2x² − x − 3 = ?", odpoved:"12", reseni_kroky:["2·9 − 3 − 3","18 − 6 = 12"], cas_sekund:90, sm2_interval:1 },
  { id:"VYR_018", tema:"vyrazy", podtema:"dosazovani", obtiznost:2, zadani:"Dosaď x = 6, y = 4: x + y + xy = ?", odpoved:"34", reseni_kroky:["6 + 4 = 10","6 · 4 = 24","10 + 24 = 34"], cas_sekund:90, sm2_interval:1 },
  // obtiznost 3
  { id:"VYR_019", tema:"vyrazy", podtema:"dosazovani", obtiznost:3, zadani:"Dosaď x = 2: x³ − x² + x − 1 = ?", odpoved:"5", reseni_kroky:["x³ = 8, x² = 4, x = 2","8 − 4 + 2 − 1 = 5"], cas_sekund:120, sm2_interval:1 },
  { id:"VYR_020", tema:"vyrazy", podtema:"dosazovani", obtiznost:3, zadani:"Dosaď a = 5, b = 3: a² − 2ab + b² = ?", odpoved:"4", reseni_kroky:["Vzorec (a−b)²: (5−3)² = 2²","= 4"], cas_sekund:120, sm2_interval:1 },
  { id:"VYR_021", tema:"vyrazy", podtema:"dosazovani", obtiznost:3, zadani:"Dosaď x = 2: 2^x + x² + x = ?", odpoved:"10", reseni_kroky:["2² = 4, x² = 4, x = 2","4 + 4 + 2 = 10"], cas_sekund:120, sm2_interval:1 },
  { id:"VYR_022", tema:"vyrazy", podtema:"dosazovani", obtiznost:3, zadani:"Dosaď x = 3: x³ − 3x² + 3x − 1 = ?", odpoved:"8", reseni_kroky:["Vzorec (x−1)³: (3−1)³ = 2³","= 8"], cas_sekund:120, sm2_interval:1 },
  { id:"VYR_023", tema:"vyrazy", podtema:"dosazovani", obtiznost:3, zadani:"Dosaď x = 6, y = 4: (x + y) / (x − y) = ?", odpoved:"5", reseni_kroky:["x + y = 10, x − y = 2","10 / 2 = 5"], cas_sekund:120, sm2_interval:1 },
  { id:"VYR_024", tema:"vyrazy", podtema:"dosazovani", obtiznost:3, zadani:"Dosaď x = 2: x⁴ − 2x³ + x² = ?", odpoved:"4", reseni_kroky:["x²(x²−2x+1) = x²(x−1)²","4 · 1 = 4"], cas_sekund:120, sm2_interval:1 },
  { id:"VYR_025", tema:"vyrazy", podtema:"dosazovani", obtiznost:3, zadani:"Dosaď n = 5: n² + 2n − 3 = ?", odpoved:"32", reseni_kroky:["25 + 10 − 3","= 32"], cas_sekund:120, sm2_interval:1 },
];

const newExamples = [...mocniny, ...cisselne_rady, ...vyrazy];
console.log(`New examples: ${newExamples.length} (mocniny:${mocniny.length}, cisselne_rady:${cisselne_rady.length}, vyrazy:${vyrazy.length})`);

const allExamples = [...kept, ...newExamples];
console.log(`Total examples: ${allExamples.length}`);

// Topic distribution
const counts = {};
allExamples.forEach(e => counts[e.tema] = (counts[e.tema]||0)+1);
console.log("Topics:", counts);

db.examples = allExamples;
writeFileSync(dbPath, JSON.stringify(db, null, 2), "utf-8");
console.log("✅ databaze.json updated");
