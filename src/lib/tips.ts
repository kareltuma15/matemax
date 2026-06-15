export interface Tip {
  label: string;
  content: string;
}

// Tipy podle 9 sjednocených témat (sloučeno ze starých 14 — viz docs/STRUKTURA-cermat-sesit-matemax.md)
const TIPS: Record<string, Tip[]> = {
  zlomky: [
    { label: "Sčítání / odčítání", content: "Převeď na stejného jmenovatele, pak sčítej nebo odčítej čitatele." },
    { label: "Násobení", content: "a/b · c/d = (a·c) / (b·d) — násob čitatele s čitatelem a jmenovatele s jmenovatelem." },
    { label: "Dělení", content: "a/b ÷ c/d = a/b · d/c — dělení = násobení převráceným zlomkem." },
    { label: "Zkrácení", content: "Vyděl čitatele i jmenovatele jejich největším společným dělitelem (NSD)." },
  ],
  vyrazy: [
    { label: "Distributivita", content: "a·(b + c) = a·b + a·c" },
    { label: "Kvadratické vzorce", content: "(a+b)² = a²+2ab+b²  |  (a−b)² = a²−2ab+b²  |  (a+b)(a−b) = a²−b²" },
    { label: "Vytýkání", content: "Najdi největší společný faktor všech členů a vytkni ho před závorku." },
    { label: "Pravidla mocnin", content: "aᵐ · aⁿ = aᵐ⁺ⁿ  |  aᵐ ÷ aⁿ = aᵐ⁻ⁿ  |  (aᵐ)ⁿ = aᵐⁿ" },
    { label: "Speciální hodnoty", content: "a⁰ = 1  |  a⁻ⁿ = 1/aⁿ  |  a^(1/2) = √a" },
    { label: "Odmocniny", content: "√(a·b) = √a · √b  |  √(a/b) = √a / √b" },
  ],
  rovnice: [
    { label: "Zlaté pravidlo", content: "Co uděláš na jedné straně rovnice, musíš udělat i na druhé." },
    { label: "Postup řešení", content: "1) Rozbal závorky  2) Dej neznámé na jednu stranu  3) Vyděl koeficientem." },
    { label: "Zlomkové rovnice", content: "Vynásob obě strany společným jmenovatelem — zbavíš se zlomků." },
    { label: "Soustava rovnic", content: "Vyjádři jednu neznámou z první rovnice a dosaď do druhé (substituční metoda)." },
  ],
  geometrie: [
    { label: "Pythagorova věta", content: "a² + b² = c²  (c je přepona pravého trojúhelníku)" },
    { label: "Obsahy", content: "Čtverec: S = a²  |  Obdélník: S = a·b  |  Trojúhelník: S = a·h/2  |  Lichoběžník: S = (a+c)·h/2" },
    { label: "Kruh", content: "Obvod: o = 2πr  |  Obsah: S = πr²  (π ≈ 3,14)" },
    { label: "Objem těles", content: "Krychle: V = a³  |  Kvádr: V = a·b·c  |  Válec: V = πr²·h  |  Jehlan/kužel: V = (podstava·v)/3" },
    { label: "Povrch těles", content: "Krychle: S = 6a²  |  Kvádr: S = 2(ab+bc+ac)  |  Válec: S = 2πr²+2πrh" },
  ],
  slovni_ulohy: [
    { label: "Postup", content: "1) Co hledám? (= x)  2) Sestavím rovnici ze zadání  3) Vypočítám a ověřím výsledek." },
    { label: "Pohyb (rychlost/čas/dráha)", content: "s = v · t  →  t = s / v  →  v = s / t" },
    { label: "Společná práce", content: "Výkon = 1 / čas. Součet výkonů = výkon dohromady." },
    { label: "Poměr a měřítko", content: "Trojčlenka: a : b = c : d → a·d = b·c. Měřítko: skutečnost = mapa × číslo měřítka." },
    { label: "Procenta", content: "p % z X = X · p / 100  |  Základ = část / p · 100  |  Změna % = (nová − původní) / původní · 100" },
    { label: "Úměra", content: "Přímá: víc → víc (a/b = c/d). Nepřímá: víc → míň (a·b = c·d)." },
  ],
  grafy_logika: [
    { label: "Aritmetická posloupnost", content: "Každý člen = předchozí + d (společný rozdíl). aₙ = a₁ + (n−1)·d" },
    { label: "Geometrická posloupnost", content: "Každý člen = předchozí · q (kvocient). aₙ = a₁ · qⁿ⁻¹" },
    { label: "Hledání vzoru", content: "Spočítej rozdíl (nebo podíl) sousedních členů — odhalí typ posloupnosti." },
    { label: "Logické úlohy", content: "Nakresli schéma nebo tabulku. Vylučuj nemožné možnosti systematicky." },
    { label: "Pravda / Lež", content: "Předpokládej jedno tvrzení jako pravdivé a sleduj, zda nevede ke sporu." },
  ],
  konstrukce: [
    { label: "Osa úsečky", content: "Z obou krajních bodů narýsuj oblouky stejného poloměru — spojnice průsečíků je osa." },
    { label: "Kolmice z bodu", content: "Z bodu opiš oblouk protínající přímku ve 2 bodech, pak sestroj jejich osu." },
    { label: "Trojúhelník ze 3 stran", content: "Narýsuj jednu stranu, z krajních bodů oblouky o délkách zbylých stran — průsečík je 3. vrchol." },
  ],
  uhly: [
    { label: "Součty úhlů", content: "Trojúhelník: α+β+γ = 180°  |  Čtyřúhelník: 360°  |  Přímý úhel: 180°" },
    { label: "Vedlejší a vrcholové úhly", content: "Vedlejší úhly mají součet 180°. Vrcholové (svislé) úhly jsou shodné." },
    { label: "Rovnoběžky", content: "Střídavé úhly jsou shodné. Souhlasné úhly jsou shodné. Přilehlé mají součet 180°." },
  ],
  souhrnne: [
    { label: "Strategie", content: "Rozděl úlohu na menší části. Řeš krok za krokem a výsledky kombinuj." },
    { label: "Ověření", content: "Po výpočtu dosaď výsledek zpět do zadání a zkontroluj, zda sedí." },
  ],
};

export function getTips(tema: string): Tip[] {
  return TIPS[tema] ?? [];
}
