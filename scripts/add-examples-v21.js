const fs = require('fs');
const db = JSON.parse(fs.readFileSync('src/data/databaze.json', 'utf8'));

const newExamples = [
  // GEOMETRIE — obvodovy_uhel (5 examples)
  {id:'GEO_071',tema:'geometrie',podtema:'obvodovy_uhel',obtiznost:2,zadani:'Středový úhel AOB = 80°. Jak velký je obvodový úhel ACB nad stejnou tětivou AB?',odpoved:'40°',reseni_kroky:['Obvodový úhel = středový / 2 = 80 / 2 = 40°'],cas_sekund:75,sm2_interval:1},
  {id:'GEO_072',tema:'geometrie',podtema:'obvodovy_uhel',obtiznost:2,zadani:'Obvodový úhel ABC = 55°. Jak velký je středový úhel AOC nad stejnou tětivou AC?',odpoved:'110°',reseni_kroky:['Středový úhel = 2 × obvodový = 2 × 55 = 110°'],cas_sekund:75,sm2_interval:1},
  {id:'GEO_073',tema:'geometrie',podtema:'obvodovy_uhel',obtiznost:1,zadani:'Bod P leží na kružnici. AB je průměr. Jak velký je úhel APB (Thaletova věta)?',odpoved:'90°',reseni_kroky:['Thaletova věta: úhel vepsaný do půlkruhu (nad průměrem) je vždy 90°'],cas_sekund:60,sm2_interval:1},
  {id:'GEO_074',tema:'geometrie',podtema:'obvodovy_uhel',obtiznost:2,zadani:'Ve vepsaném čtyřúhelníku ABCD je úhel A = 115°. Jak velký je protilehlý úhel C?',odpoved:'65°',reseni_kroky:['Protilehlé úhly vepsaného čtyřúhelníku jsou doplňkové: A + C = 180°','C = 180 - 115 = 65°'],cas_sekund:75,sm2_interval:1},
  {id:'GEO_075',tema:'geometrie',podtema:'obvodovy_uhel',obtiznost:2,zadani:'Obvodový úhel ADB = 40° (D na menším oblouku). Obvodový úhel ACB (C na větším oblouku)?',odpoved:'140°',reseni_kroky:['Obvodové úhly na protilehlých obloucích jsou doplňkové: 180 - 40 = 140°'],cas_sekund:90,sm2_interval:1},
  // GEOMETRIE — pravidelny_mnohouhelnik (5 examples)
  {id:'GEO_076',tema:'geometrie',podtema:'pravidelny_mnohouhelnik',obtiznost:1,zadani:'Jaký je součet vnitřních úhlů pětiúhelníku?',odpoved:'540°',reseni_kroky:['S = (n-2) × 180 = (5-2) × 180 = 540°'],cas_sekund:60,sm2_interval:1},
  {id:'GEO_077',tema:'geometrie',podtema:'pravidelny_mnohouhelnik',obtiznost:1,zadani:'Pravidelný šestiúhelník má stranu 5 cm. Obvod?',odpoved:'30 cm',reseni_kroky:['O = 6 × 5 = 30 cm'],cas_sekund:45,sm2_interval:1},
  {id:'GEO_078',tema:'geometrie',podtema:'pravidelny_mnohouhelnik',obtiznost:2,zadani:'Vnitřní úhel pravidelného osmiúhelníku?',odpoved:'135°',reseni_kroky:['alfa = (n-2) × 180 / n = 6 × 180 / 8 = 1080 / 8 = 135°'],cas_sekund:75,sm2_interval:1},
  {id:'GEO_079',tema:'geometrie',podtema:'pravidelny_mnohouhelnik',obtiznost:2,zadani:'Kolik úhlopříček má šestiúhelník?',odpoved:'9',reseni_kroky:['Počet = n(n-3)/2 = 6 × 3 / 2 = 9'],cas_sekund:75,sm2_interval:1},
  {id:'GEO_080',tema:'geometrie',podtema:'pravidelny_mnohouhelnik',obtiznost:2,zadani:'Vnější úhel pravidelného dvanáctiúhelníku?',odpoved:'30°',reseni_kroky:['Vnější úhel = 360 / n = 360 / 12 = 30°'],cas_sekund:60,sm2_interval:1},
  // GEOMETRIE — kombinovane harder (10 examples)
  {id:'GEO_081',tema:'geometrie',podtema:'kombinovane',obtiznost:2,zadani:'Obdélník má obvod 24 cm a délka je 2× větší než šířka. Obsah?',odpoved:'32 cm²',reseni_kroky:['2(d+š) = 24, d = 2š → 6š = 24 → š = 4, d = 8','S = 4 × 8 = 32 cm²'],cas_sekund:90,sm2_interval:1},
  {id:'GEO_082',tema:'geometrie',podtema:'kombinovane',obtiznost:2,zadani:'Pravý trojúhelník: přepona 13 cm, odvěsna 5 cm. Druhá odvěsna?',odpoved:'12 cm',reseni_kroky:['b = sqrt(13^2 - 5^2) = sqrt(169 - 25) = sqrt(144) = 12 cm'],cas_sekund:75,sm2_interval:1},
  {id:'GEO_083',tema:'geometrie',podtema:'kombinovane',obtiznost:2,zadani:'Rovnoramenný trojúhelník: základna 10 cm, ramena 13 cm. Výška na základnu?',odpoved:'12 cm',reseni_kroky:['Výška rozdělí základnu na 5 cm','h = sqrt(13^2 - 5^2) = sqrt(144) = 12 cm'],cas_sekund:90,sm2_interval:1},
  {id:'GEO_084',tema:'geometrie',podtema:'kombinovane',obtiznost:2,zadani:'Kosočtverec má úhlopříčky 12 cm a 16 cm. Obsah?',odpoved:'96 cm²',reseni_kroky:['S = u1 × u2 / 2 = 12 × 16 / 2 = 96 cm²'],cas_sekund:75,sm2_interval:1},
  {id:'GEO_085',tema:'geometrie',podtema:'kombinovane',obtiznost:2,zadani:'Obdélník má úhlopříčku 10 cm a kratší stranu 6 cm. Obsah?',odpoved:'48 cm²',reseni_kroky:['b = sqrt(10^2 - 6^2) = sqrt(64) = 8 cm','S = 6 × 8 = 48 cm²'],cas_sekund:90,sm2_interval:1},
  {id:'GEO_086',tema:'geometrie',podtema:'kruznice',obtiznost:2,zadani:'Kružnice má průměr 14 cm. Obsah? (pi = 3,14)',odpoved:'153,86 cm²',reseni_kroky:['r = 7 cm','S = pi × r^2 = 3,14 × 49 = 153,86 cm²'],cas_sekund:75,sm2_interval:1},
  {id:'GEO_087',tema:'geometrie',podtema:'teleso',obtiznost:2,zadani:'Válec: polomer 5 cm, výška 8 cm. Objem? (pi = 3,14)',odpoved:'628 cm³',reseni_kroky:['V = pi × r^2 × h = 3,14 × 25 × 8 = 628 cm³'],cas_sekund:90,sm2_interval:1},
  {id:'GEO_088',tema:'geometrie',podtema:'teleso',obtiznost:3,zadani:'Kvádr 4×5×6 cm. Délka prostorové úhlopříčky?',odpoved:'sqrt(77) cm ≈ 8,8 cm',reseni_kroky:['d = sqrt(a^2 + b^2 + c^2) = sqrt(16+25+36) = sqrt(77) ≈ 8,77 cm'],cas_sekund:120,sm2_interval:1},
  {id:'GEO_089',tema:'geometrie',podtema:'podobnost',obtiznost:3,zadani:'Dva podobné trojúhelníky mají poměr stran 2:3. Jaký je poměr jejich ploch?',odpoved:'4:9',reseni_kroky:['Poměr ploch = (poměr stran)^2 = 2^2 : 3^2 = 4:9'],cas_sekund:90,sm2_interval:1},
  {id:'GEO_090',tema:'geometrie',podtema:'kombinovane',obtiznost:3,zadani:'Trojúhelník má strany 3, 4, 5 cm. Je pravoúhlý? Jaký je jeho obsah?',odpoved:'Ano, S = 6 cm²',reseni_kroky:['3^2 + 4^2 = 9+16 = 25 = 5^2 → pravoúhlý','S = (3 × 4) / 2 = 6 cm²'],cas_sekund:90,sm2_interval:1},
  // SLOVNI ULOHY — kvadraticke (5 examples)
  {id:'SLO_061',tema:'slovni_ulohy',podtema:'kvadraticke',obtiznost:2,zadani:'Číslo je o 3 větší než jeho polovina. Jaké číslo to je?',odpoved:'6',reseni_kroky:['x = x/2 + 3 → x/2 = 3 → x = 6'],cas_sekund:75,sm2_interval:1},
  {id:'SLO_062',tema:'slovni_ulohy',podtema:'kvadraticke',obtiznost:2,zadani:'Součin dvou po sobě jdoucích přirozených čísel je 72. Jaká jsou?',odpoved:'8 a 9',reseni_kroky:['n(n+1) = 72 → n^2 + n - 72 = 0','n = (-1 + sqrt(289))/2 = (-1+17)/2 = 8','8 × 9 = 72'],cas_sekund:120,sm2_interval:1},
  {id:'SLO_063',tema:'slovni_ulohy',podtema:'kvadraticke',obtiznost:2,zadani:'Obdélník má obsah 60 cm². Délka je o 7 cm větší než šířka. Rozměry?',odpoved:'5 × 12 cm',reseni_kroky:['x(x+7) = 60 → x^2 + 7x - 60 = 0','x = (-7+17)/2 = 5, délka = 12 cm'],cas_sekund:120,sm2_interval:1},
  {id:'SLO_064',tema:'slovni_ulohy',podtema:'kvadraticke',obtiznost:3,zadani:'Součet čtverce čísla a trojnásobku téhož čísla je 40. Jaké je to číslo (kladné)?',odpoved:'5',reseni_kroky:['x^2 + 3x = 40 → x^2 + 3x - 40 = 0','x = (-3 + sqrt(9+160))/2 = (-3+13)/2 = 5'],cas_sekund:120,sm2_interval:1},
  {id:'SLO_065',tema:'slovni_ulohy',podtema:'kvadraticke',obtiznost:3,zadani:'Čtvercová zahrada: prodloužení délky o 4 m a šířky o 2 m dá obsah 120 m². Původní strana?',odpoved:'8 m',reseni_kroky:['(x+4)(x+2) = 120 → x^2 + 6x - 112 = 0','x = (-6 + sqrt(484))/2 = (-6+22)/2 = 8 m'],cas_sekund:150,sm2_interval:1},
  // SLOVNI ULOHY — pohybove harder (4 examples)
  {id:'SLO_066',tema:'slovni_ulohy',podtema:'pohybove',obtiznost:2,zadani:'Dva cyklisté jedou vstříc ze vzdálenosti 90 km, rychlosti 25 a 20 km/h. Za jak dlouho se setkají?',odpoved:'2 hodiny',reseni_kroky:['Relativní rychlost = 25 + 20 = 45 km/h','t = 90 / 45 = 2 hodiny'],cas_sekund:90,sm2_interval:1},
  {id:'SLO_067',tema:'slovni_ulohy',podtema:'pohybove',obtiznost:2,zadani:'Vlak ujede 360 km za 3 h, autobus za 6 h. O kolik km/h je vlak rychlejší?',odpoved:'60 km/h',reseni_kroky:['v_vlak = 120 km/h, v_autobus = 60 km/h, rozdíl = 60 km/h'],cas_sekund:75,sm2_interval:1},
  {id:'SLO_068',tema:'slovni_ulohy',podtema:'pohybove',obtiznost:3,zadani:'Auto jede 80 km/h. Motocykl vyjede ze stejného místa o 30 min později rychlostí 120 km/h. Za jak dlouho motor dohonní auto?',odpoved:'1 hodina',reseni_kroky:['Náskok auta = 80 × 0,5 = 40 km','Relativní rychlost = 120-80 = 40 km/h','t = 40/40 = 1 hodina'],cas_sekund:120,sm2_interval:1},
  {id:'SLO_069',tema:'slovni_ulohy',podtema:'pohybove',obtiznost:3,zadani:'Dvě lodě plují z přístavu v opačných směrech, 35 a 25 km/h. Za jak dlouho jsou 300 km od sebe?',odpoved:'5 hodin',reseni_kroky:['Vzájemná rychlost = 35 + 25 = 60 km/h','t = 300/60 = 5 hodin'],cas_sekund:90,sm2_interval:1},
  // SLOVNI ULOHY — prace (2 examples)
  {id:'SLO_070',tema:'slovni_ulohy',podtema:'prace',obtiznost:2,zadani:'Petr dodělá práci za 4 h, Pavel za 6 h. Za jak dlouho ji dodělají spolu?',odpoved:'2 h 24 min',reseni_kroky:['1/t = 1/4 + 1/6 = 5/12 → t = 12/5 = 2,4 h = 2 h 24 min'],cas_sekund:120,sm2_interval:1},
  {id:'SLO_071',tema:'slovni_ulohy',podtema:'prace',obtiznost:3,zadani:'Čerpadlo A plní nádrž za 8 h, čerpadlo B ji vyprazdňuje za 12 h. Oba najednou — za kolik hodin se naplní?',odpoved:'24 hodin',reseni_kroky:['Netto = 1/8 - 1/12 = 3/24 - 2/24 = 1/24 za hodinu','t = 24 hod'],cas_sekund:120,sm2_interval:1},
  // SLOVNI ULOHY — smesi (2 examples)
  {id:'SLO_072',tema:'slovni_ulohy',podtema:'smesi',obtiznost:2,zadani:'Smícháme 3 l 40% roztoku a 2 l 20% roztoku. Výsledná koncentrace?',odpoved:'32%',reseni_kroky:['Čistá látka = 3×0,4 + 2×0,2 = 1,6 l','Konc. = 1,6/5 × 100 = 32%'],cas_sekund:120,sm2_interval:1},
  {id:'SLO_073',tema:'slovni_ulohy',podtema:'smesi',obtiznost:3,zadani:'200 g 30% roztoku cukru. Kolik gramů cukru přidáme, aby vznikl 50% roztok?',odpoved:'80 g',reseni_kroky:['Cukr: 60 g, voda: 140 g','(60+x)/(200+x) = 0,5 → x = 80 g'],cas_sekund:120,sm2_interval:1},
  // SLOVNI ULOHY — vekove (2 examples)
  {id:'SLO_074',tema:'slovni_ulohy',podtema:'vekove',obtiznost:2,zadani:'Otci 42, synovi 12. Za kolik let bude otci 3× tolik co synovi?',odpoved:'za 3 roky',reseni_kroky:['42+x = 3(12+x) → 42+x = 36+3x → x = 3'],cas_sekund:90,sm2_interval:1},
  {id:'SLO_075',tema:'slovni_ulohy',podtema:'vekove',obtiznost:2,zadani:'Babičce je 5× tolik co vnučce. Dohromady 72 let. Kolik je vnučce?',odpoved:'12 let',reseni_kroky:['x + 5x = 72 → x = 12 let'],cas_sekund:75,sm2_interval:1},
  // SLOVNI ULOHY — kombinovane (5 examples)
  {id:'SLO_076',tema:'slovni_ulohy',podtema:'kombinovane',obtiznost:2,zadani:'Prodáno 60 vstupenek. Dospělý 50 Kč, dítě 30 Kč. Celkem 2400 Kč. Kolik dospělých?',odpoved:'30',reseni_kroky:['d + k = 60, 50d + 30k = 2400','50d + 30(60-d) = 2400 → 20d = 600 → d = 30'],cas_sekund:120,sm2_interval:1},
  {id:'SLO_077',tema:'slovni_ulohy',podtema:'kombinovane',obtiznost:3,zadani:'Jan má 2× více peněz než Petr. Jan dal Petrovi 100 Kč a mají teď stejně. Kolik měl Jan?',odpoved:'400 Kč',reseni_kroky:['J = 2P, J-100 = P+100 → 2P-100 = P+100 → P = 200, J = 400 Kč'],cas_sekund:120,sm2_interval:1},
  {id:'SLO_078',tema:'slovni_ulohy',podtema:'kombinovane',obtiznost:3,zadani:'Třída 30 žáků, průměr 7,2 b. Chlapci 7 b, dívky 7,5 b. Kolik chlapců?',odpoved:'18',reseni_kroky:['c+d=30, 7c+7,5d=216 → 7c+7,5(30-c)=216 → 0,5c=9 → c=18'],cas_sekund:150,sm2_interval:1},
  {id:'SLO_079',tema:'slovni_ulohy',podtema:'kombinovane',obtiznost:3,zadani:'Tři čísla v poměru 2:3:5, součet 80. Jaká jsou?',odpoved:'16, 24, 40',reseni_kroky:['1 díl = 80/10 = 8','Čísla: 2×8=16, 3×8=24, 5×8=40'],cas_sekund:90,sm2_interval:1},
  {id:'SLO_080',tema:'slovni_ulohy',podtema:'kombinovane',obtiznost:3,zadani:'Zboží se zlevní o 20 % a pak o dalších 10 %. Celkové zlevnění v %?',odpoved:'28 %',reseni_kroky:['Po 1. slevě: 0,8','Po 2. slevě: 0,8 × 0,9 = 0,72','Sleva = 1 - 0,72 = 0,28 = 28 %'],cas_sekund:90,sm2_interval:1}
];

db.examples = [...db.examples, ...newExamples];
fs.writeFileSync('src/data/databaze.json', JSON.stringify(db, null, 2), 'utf8');

const counts = {};
db.examples.forEach(e => { counts[e.tema] = (counts[e.tema]||0)+1; });
console.log('Updated counts:');
Object.entries(counts).sort((a,b)=>b[1]-a[1]).forEach(([t,n])=>console.log(t+': '+n));
console.log('Total databaze.json:', db.examples.length);
