export interface Tip {
  label: string;
  content: string;
}

const TIPS: Record<string, Tip[]> = {
  zlomky: [
    { label: "Sčítání / odčítání", content: "Převeď na stejného jmenovatele, pak sčítej nebo odčítej čitatele." },
    { label: "Násobení", content: "a/b · c/d = (a·c) / (b·d) — násob čitatele s čitatelem a jmenovatele s jmenovatelem." },
    { label: "Dělení", content: "a/b ÷ c/d = a/b · d/c — dělení = násobení převráceným zlomkem." },
    { label: "Zkrácení", content: "Vyděl čitatele i jmenovatele jejich největším společným dělitelem (NSD)." },
  ],
  procenta: [
    { label: "Základní vzorec", content: "p % z čísla X = X · p ÷ 100" },
    { label: "Zjistit základ", content: "Základ = část ÷ p · 100" },
    { label: "Procentuální změna", content: "Změna (%) = (nová − původní) ÷ původní · 100" },
  ],
  rovnice: [
    { label: "Zlaté pravidlo", content: "Co uděláš na jedné straně rovnice, musíš udělat i na druhé." },
    { label: "Postup řešení", content: "1) Rozbal závorky  2) Dej neznámé na jednu stranu  3) Vyděl koeficientem." },
    { label: "Soustava rovnic", content: "Vyjádři jednu neznámou z první rovnice a dosaď do druhé (substituční metoda)." },
  ],
  geometrie: [
    { label: "Pythagorova věta", content: "a² + b² = c²  (c je přepona pravého trojúhelníku)" },
    { label: "Obsahy", content: "Čtverec: S = a²  |  Obdélník: S = a·b  |  Trojúhelník: S = a·h / 2" },
    { label: "Kruh", content: "Obvod: o = 2πr  |  Obsah: S = πr²  (π ≈ 3,14)" },
  ],
  mocniny: [
    { label: "Pravidla mocnin", content: "aᵐ · aⁿ = aᵐ⁺ⁿ  |  aᵐ ÷ aⁿ = aᵐ⁻ⁿ  |  (aᵐ)ⁿ = aᵐⁿ" },
    { label: "Speciální hodnoty", content: "a⁰ = 1  |  a⁻ⁿ = 1/aⁿ  |  a^(1/2) = √a" },
    { label: "Různé základy", content: "aⁿ · bⁿ = (a·b)ⁿ  |  aⁿ ÷ bⁿ = (a÷b)ⁿ" },
  ],
  slovni_ulohy: [
    { label: "Postup", content: "1) Co hledám? (= x)  2) Sestavím rovnici ze zadání  3) Vypočítám a ověřím výsledek." },
    { label: "Rychlost / čas / vzdálenost", content: "s = v · t  →  t = s / v  →  v = s / t" },
    { label: "Společná práce", content: "Výkon = 1 / čas. Součet výkonů = výkon dohromady." },
  ],
  cisselne_rady: [
    { label: "Aritmetická posloupnost", content: "Každý člen = předchozí + d (společný rozdíl). aₙ = a₁ + (n−1)·d" },
    { label: "Geometrická posloupnost", content: "Každý člen = předchozí · q (kvocient). aₙ = a₁ · qⁿ⁻¹" },
    { label: "Tip na vzor", content: "Spočítej rozdíl (nebo podíl) sousedních členů — odhalí typ posloupnosti." },
  ],
  vyrazy: [
    { label: "Distributivita", content: "a·(b + c) = a·b + a·c" },
    { label: "Kvadratické vzorce", content: "(a+b)² = a²+2ab+b²  |  (a−b)² = a²−2ab+b²  |  (a+b)(a−b) = a²−b²" },
    { label: "Vytýkání", content: "Najdi největší společný faktor všech členů a vytkni ho před závorku." },
  ],
  kombinovane: [
    { label: "Strategie", content: "Rozděl úlohu na menší části. Řeš krok za krokem a výsledky kombinuj." },
    { label: "Ověření", content: "Po výpočtu dosaď výsledek zpět do zadání a zkontroluj, zda sedí." },
  ],
  pomer_meritko: [
    { label: "Trojčlenka (přímá úměra)", content: "a : b = c : d  →  a·d = b·c" },
    { label: "Měřítko mapy", content: "Skutečná vzdálenost = vzdálenost na mapě × číslo měřítka" },
    { label: "Dělení v poměru", content: "Celkové množství rozděl na díly: 1 díl = celek ÷ (součet čísel poměru)." },
  ],
  geometrie_rovinna: [
    { label: "Obsah a obvod", content: "Čtverec: S = a², o = 4a  |  Trojúhelník: S = a·h/2  |  Lichoběžník: S = (a+c)·h/2" },
    { label: "Pythagorova věta", content: "a² + b² = c²  (platí jen v pravém trojúhelníku, c = přepona)" },
    { label: "Kruh", content: "S = πr²  |  o = 2πr  (π ≈ 3,14)" },
  ],
  geometrie_prostorova: [
    { label: "Objem těles", content: "Krychle: V = a³  |  Kvádr: V = a·b·c  |  Válec: V = πr²·h  |  Kužel: V = πr²·h/3" },
    { label: "Povrch těles", content: "Krychle: S = 6a²  |  Kvádr: S = 2(ab+bc+ac)  |  Válec: S = 2πr²+2πrh" },
    { label: "Koule", content: "V = 4/3·πr³  |  S = 4πr²" },
  ],
  uhly: [
    { label: "Součty úhlů", content: "Trojúhelník: α+β+γ = 180°  |  Čtyřúhelník: 360°  |  Přímý úhel: 180°" },
    { label: "Vedlejší a vrcholové úhly", content: "Vedlejší úhly mají součet 180°. Vrcholové (svislé) úhly jsou shodné." },
    { label: "Rovnoběžky", content: "Střídavé úhly jsou shodné. Souhlasné úhly jsou shodné. Souúhlasné mají součet 180°." },
  ],
  logicke_ulohy: [
    { label: "Strategie", content: "Nakresli schéma nebo tabulku. Vylučuj nemožné možnosti systematicky." },
    { label: "Dosazování", content: "Zkus postupně dosazovat hodnoty. Začni tam, kde je nejvíce podmínek." },
    { label: "Pravda / Lež", content: "Předpokládej jedno tvrzení jako pravdivé a sleduj, zda nevede ke sporu." },
  ],
};

export function getTips(tema: string): Tip[] {
  return TIPS[tema] ?? [];
}
