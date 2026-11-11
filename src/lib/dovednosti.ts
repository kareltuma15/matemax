import type { DBExample } from "@/types";

/**
 * Dovednosti uvnitř témat: žák si vybere, co chce procvičit (např. zlomky → násobení a dělení),
 * a na konci každého tématu jsou „Testové příklady“ jen z úloh ve stylu skutečných testů CERMAT.
 *
 * Úloha patří do dovednosti podle svého podtématu (seznam `podtemata` níže). Výjimky má uložené
 * přímo v databázi v poli `dovednost`: všechny testové příklady (`"testove"`) a geometrie, kde jedno
 * podtéma „rovinne“ obsahuje obvody i kruhy i Pythagorovu větu. Rozdělení připravil skript
 * scripts/rozdel-dovednosti.mjs, hlídá ho e2e/dovednosti.spec.ts (každá úloha musí mít dovednost).
 *
 * Soubor nesmí importovat nic za běhu (jen typy): načítá ho i skript přes Node.
 */

export const TESTOVE = "testove";

export interface Dovednost {
  klic: string;
  nazev: string;
  /** Krátké vysvětlení pod názvem, co v dovednosti je. */
  popis: string;
  /** Podtémata úloh, která do dovednosti patří. */
  podtemata: string[];
}

export const TESTOVE_NAZEV = "Testové příklady";
export const TESTOVE_POPIS = "Úvaha, obrázky, výběr A–E, delší zadání";

export const DOVEDNOSTI: Record<string, Dovednost[]> = {
  // ── 9. třída ───────────────────────────────────────────────────────────────
  zlomky: [
    { klic: "scitani_odcitani", nazev: "Sčítání a odčítání", popis: "Společný jmenovatel, rozšiřování", podtemata: ["scitani", "odcitani", "scitani_odcitani", "scitani_a_odcitani"] },
    { klic: "nasobeni_deleni", nazev: "Násobení a dělení", popis: "Krácení, převrácený zlomek", podtemata: ["nasobeni", "deleni", "nasobeni_deleni"] },
    { klic: "upravy", nazev: "Krácení, porovnávání, smíšená čísla", podtemata: ["zkracovani", "porovnavani", "smisena_cisla", "smisena_cisla_operace", "ciselna_osa", "cast_obrazce"], popis: "Základní tvar, který zlomek je větší" },
    { klic: "vypocty", nazev: "Delší výpočty a složené zlomky", popis: "Závorky, přednost operací, zlomek ve zlomku", podtemata: ["kombinovane", "komplexni_vypocet", "slozeny_zlomek"] },
    { klic: "slovni", nazev: "Zlomky ve slovních úlohách", popis: "Část z celku, rovnice se zlomky", podtemata: ["slovni_uloha", "rovnice", "rovnice_se_zlomky"] },
  ],
  vyrazy: [
    { klic: "mocniny", nazev: "Mocniny", popis: "Druhé a třetí mocniny, pravidla pro mocniny", podtemata: ["mocniny", "zakony_mocnin"] },
    { klic: "odmocniny", nazev: "Odmocniny", popis: "Druhá odmocnina, částečné odmocnění", podtemata: ["odmocniny"] },
    { klic: "dosazovani", nazev: "Dosazování do výrazů", popis: "Hodnota výrazu pro dané číslo", podtemata: ["dosazovani"] },
    { klic: "upravy", nazev: "Úpravy výrazů a vzorce", popis: "Roznásobení, vytýkání, (a + b)²", podtemata: ["uprava_vyrazu"] },
  ],
  rovnice: [
    { klic: "klasicke", nazev: "Klasické rovnice", popis: "Lineární rovnice, i se závorkami", podtemata: ["linearni", "linearni_jednoduche", "linearni_se_zavorkou", "linearni_rovnice", "linearni_rovnice_se_zavorkami", "vyjadreni_neznama"] },
    { klic: "se_zlomky", nazev: "Rovnice se zlomky", popis: "Odstranění zlomků, neznámá ve jmenovateli", podtemata: ["linearni_se_zlomky", "zlomkova", "linearni_rovnice_se_zlomky"] },
    { klic: "soustavy", nazev: "Soustavy rovnic", popis: "Dvě rovnice o dvou neznámých", podtemata: ["soustava", "soustava_rovnic", "soustava_rovnic_3_nezname", "soustava_rovnic_aplikace"] },
    { klic: "slovni", nazev: "Slovní úlohy na rovnice", popis: "Sestav rovnici ze zadání", podtemata: ["slovni", "linearni_rovnice_aplikace", "linearni_rovnice_komplexni"] },
  ],
  geometrie: [
    { klic: "obvod_obsah", nazev: "Obvod a obsah obrazců", popis: "Čtverec, obdélník, trojúhelník, rovnoběžník, lichoběžník", podtemata: ["rovinne"] },
    { klic: "kruh", nazev: "Kruh a kružnice", popis: "Obvod, obsah, výseč, π", podtemata: [] },
    { klic: "pythagoras", nazev: "Pythagorova věta", popis: "Přepona, odvěsna, úhlopříčka", podtemata: ["pythagorova_veta"] },
    { klic: "telesa", nazev: "Objem a povrch těles", popis: "Krychle, kvádr, hranol, válec", podtemata: ["prostorova"] },
  ],
  slovni_ulohy: [
    { klic: "procenta", nazev: "Procenta", popis: "Zdražení, sleva, úroky", podtemata: ["procenta", "finance"] },
    { klic: "pomer", nazev: "Poměr, měřítko a úměra", popis: "Dělení v poměru, mapa, přímá a nepřímá úměra", podtemata: ["pomer_meritko", "umera"] },
    { klic: "pohyb", nazev: "Pohyb", popis: "Rychlost, čas, dráha, setkání", podtemata: ["pohyb"] },
    { klic: "prace", nazev: "Společná práce", popis: "Kdo co udělá za jak dlouho", podtemata: ["spolecna_prace"] },
  ],
  grafy_logika: [
    { klic: "grafy", nazev: "Grafy a tabulky", popis: "Čtení dat z grafu a tabulky", podtemata: ["cteni_grafu", "tabulka"] },
    { klic: "posloupnosti", nazev: "Posloupnosti", popis: "Další člen, n-tý člen", podtemata: ["aritmeticka_posloupnost", "geometricka_posloupnost", "posloupnosti"] },
    { klic: "zakonitosti", nazev: "Zákonitosti a logika", popis: "Obrázkové řady, číselné vzorce, úvaha", podtemata: ["ciselne_zakonitosti", "figuralni", "logicka_dedukce"] },
  ],
  uhly: [
    { klic: "zakladni", nazev: "Vedlejší a vrcholové úhly", popis: "Doplňkové úhly, stupně a minuty, hodiny", podtemata: ["vedlejsi_uhly", "vrcholove_uhly", "doplnkove_uhly", "stupne_minuty", "hodiny", "prime_a_vedlejsi_uhly", "vedlejsi_a_vrcholove_uhly"] },
    { klic: "rovnobezky", nazev: "Úhly u rovnoběžek", popis: "Souhlasné a střídavé úhly, příčka", podtemata: ["rovnobezky", "souhlasne_uhly", "stridave_a_souhlasne_uhly", "stridave_a_souhlasne_vypocet", "pricka_a_rovnobezky_neznamy_uhel", "kombinace_rovnobezek_a_trojuhelniku", "rovnobezky_trojuhelnik"] },
    { klic: "trojuhelnik", nazev: "Úhly v trojúhelníku", popis: "Součet úhlů, vnější úhel, osa úhlu", podtemata: ["vnitrni_uhly", "vnejsi_uhel", "rovnoramenny_trojuhelnik", "rovnostranny_trojuhelnik", "osa_uhlu", "vyska_a_osa", "soucet_uhl_trojuhelniku", "pravy_uhel_v_trojuhelniku", "trojuhelnik_rovnice_z_uhlu", "trojuhelnik_vnejsi_uhel", "vnejsi_uhel_trojuhelniku", "osa_uhlu_trojuhelnik", "kruznice_opsana"] },
    { klic: "mnohouhelniky", nazev: "Úhly ve čtyřúhelnících a mnohoúhelnících", popis: "Rovnoběžník, lichoběžník, pravidelné mnohoúhelníky", podtemata: ["ctyruhelnik", "deltoid", "lichobeznik", "rovnobeznik", "mnohouhelnik", "pravidelny_mnohouhelnik", "osy_soumernosti", "kosoctverec_uhly", "rovnobeznik_uhly", "ctyruhelnik_soucet_uhl", "mnohouhelnik_soucet_uhl", "slozita_konfigurace"] },
  ],
  konstrukce: [
    { klic: "zakladni", nazev: "Kolmice, rovnoběžky a osy", popis: "Osa úsečky, osa úhlu, úhel bez úhloměru", podtemata: ["kolmice", "rovnobezka", "osa_usecky", "osa_uhlu", "uhel_bez_uhlomeru"] },
    { klic: "trojuhelniky", nazev: "Trojúhelníky", popis: "Ze tří stran, ze dvou stran a úhlu, s výškou", podtemata: ["trojuhelnik_sss", "trojuhelnik_ssu", "trojuhelnik_vyska"] },
    { klic: "ctyruhelniky", nazev: "Čtyřúhelníky", popis: "Čtverec, kosočtverec, rovnoběžník, Thaletova kružnice", podtemata: ["ctverec", "kosoctverec", "rovnobeznik", "obdelnik_thales"] },
    { klic: "kruznice", nazev: "Kružnice a množiny bodů", popis: "Tečna, kružnice opsaná a vepsaná", podtemata: ["kruznice_dotyk", "kruznice_opsana", "kruznice_vepsana", "stred_kruznice", "tecna", "mnoziny_bodu"] },
  ],
  souhrnne: [
    { klic: "geometrie", nazev: "Geometrie v souvislostech", popis: "Obsahy a tělesa s procenty, zlomky, rovnicí", podtemata: ["geometrie_cisla", "geometrie_kombinovane", "geometrie_procenta", "geometrie_pytagoras", "geometrie_rovnice", "geometrie_slovni", "geometrie_zlomky", "procenta_geometrie", "zlomky_geometrie", "rovnice_geometrie", "uhly_rovnice", "uhly_zlomky"] },
    { klic: "procenta", nazev: "Procenta, zlomky a čísla", popis: "Kombinace procent, zlomků a tabulek", podtemata: ["procenta_cisla", "procenta_slovni", "procenta_tabulka", "tabulka_procenta", "zlomky_procenta", "zlomky_slovni", "cisla_slovni", "mix"] },
    { klic: "rovnice", nazev: "Rovnice v úlohách", popis: "Slovní úlohy řešené rovnicí nebo soustavou", podtemata: ["cisla_rovnice", "rovnice_procenta", "rovnice_slovni", "rovnice_zlomky", "soustava_slovni", "zlomky_soustava"] },
  ],

  // ── 5. třída ───────────────────────────────────────────────────────────────
  // Úlohy úrovně 3 jsou na úrovni skutečných testů (docs/cermat-5), proto jsou testovými příklady.
  p5_pocitani: [
    { klic: "poradi", nazev: "Pořadí počítání", popis: "Co se počítá dřív, závorky", podtemata: ["poradi_operaci", "vyber_vyrazu"] },
    { klic: "velka_cisla", nazev: "Velká čísla a zaokrouhlování", popis: "Tisíce, miliony, zaokrouhli na desítky", podtemata: ["p5_velka_cisla", "p5_zaokrouhlovani"] },
    { klic: "doplnit", nazev: "Doplň chybějící číslo", popis: "Číslo do čtverečku, hvězdičky, řetězec se šipkami", podtemata: ["doplnit_cislo", "p5_logika", "p5_hvezdicky", "p5_retezec"] },
    { klic: "osa", nazev: "Číselná osa", popis: "Urči čísla podle dílků na ose", podtemata: ["p5_ciselna_osa"] },
  ],
  p5_jednotky: [
    { klic: "prevody", nazev: "Převody jednotek", popis: "Metry, kilogramy, litry", podtemata: ["p5_prevody"] },
    { klic: "cas", nazev: "Čas a hodiny", popis: "Hodiny, minuty, jízdní řád", podtemata: ["p5_cas"] },
    { klic: "penize", nazev: "Peníze a ceny", popis: "Nákupy, mince, kolik zbude", podtemata: ["p5_ceny", "p5_mince"] },
  ],
  p5_slovni: [
    { klic: "dva_udaje", nazev: "Kolik dohromady, kolik víc", popis: "Úlohy na dva a více kroků", podtemata: ["p5_dva_udaje"] },
    { klic: "tempo", nazev: "Kolik za hodinu, za den", popis: "Robot, pekař, truhlář: stejně rychle", podtemata: ["p5_tempo"] },
    { klic: "vek_hmotnost", nazev: "Věk a hmotnost", popis: "Kolik let bude, kolik váží jeden kus", podtemata: ["p5_vek", "p5_hmotnosti", "p5_logika"] },
  ],
  p5_zlomky: [
    { klic: "obrazek", nazev: "Zlomek z obrázku", popis: "Jaká část je vybarvená, který zlomek je větší", podtemata: ["p5_zlomek_obrazku", "p5_porovnani"] },
    { klic: "cast_celku", nazev: "Část celku", popis: "Polovina, třetina, čtvrtina z čísla", podtemata: ["p5_cast_celku"] },
    { klic: "o_zlomek", nazev: "O zlomek víc, o zlomek míň", popis: "Zdražení o čtvrtinu, kolik zbylo", podtemata: ["p5_o_zlomek", "p5_zbytek"] },
  ],
  p5_obsah: [
    { klic: "sit", nazev: "Obrazce ve čtvercové síti", popis: "Spočítej čtverečky a strany", podtemata: [] },
    { klic: "obvod", nazev: "Obvod", popis: "Čtverec, obdélník, složené obrazce", podtemata: ["p5_obvod"] },
    { klic: "obsah", nazev: "Obsah", popis: "Kolik čtverečních centimetrů nebo metrů", podtemata: ["p5_obsah"] },
  ],
  p5_telesa: [
    { klic: "krychlicky", nazev: "Stavby z krychliček", popis: "Kolik krychliček, pohled shora, skládání", podtemata: ["p5_krychlicky", "p5_pudorys", "p5_skladani"] },
    { klic: "kvadr", nazev: "Krychle a kvádr", popis: "Hrany, stěny, vrcholy", podtemata: ["p5_kvadr"] },
    { klic: "soumernost", nazev: "Osová souměrnost", popis: "Je obrázek souměrný, dokresli druhou půlku", podtemata: ["p5_soumernost"] },
  ],
  p5_rysovani: [
    { klic: "zaklad", nazev: "Úsečky, kolmice a rovnoběžky", podtemata: ["kolmice", "rovnobezka", "stred_usecky", "osa_usecky", "p5_cast_usecky", "p5_pruseciky", "p5_vzdalenost", "soumernost"], popis: "Střed úsečky, vzdálenost, průsečík" },
    { klic: "kruznice", nazev: "Kružnice", popis: "Střed a poloměr, body na kružnici", podtemata: ["kruznice"] },
    { klic: "obrazce", nazev: "Trojúhelník, čtverec, obdélník", popis: "Rýsování podle zadaných stran", podtemata: ["trojuhelnik", "ctverec", "obdelnik", "kosoctverec"] },
  ],
  p5_grafy: [
    { klic: "cteni", nazev: "Čtení z grafu a tabulky", popis: "Sloupcové a obrázkové grafy", podtemata: ["p5_sloupcovy", "p5_tabulka"] },
    { klic: "chybi", nazev: "Chybějící údaj a tvrzení", popis: "Dopočítej sloupec, rozhodni ANO/NE", podtemata: ["p5_chybi_udaj", "p5_tvrzeni"] },
    { klic: "vzory", nazev: "Vzory a řady", popis: "Jak řada pokračuje", podtemata: ["p5_vzory"] },
  ],
};

/** Dovednosti tématu bez testových příkladů (prázdné pole = téma ještě rozdělené není). */
export function dovednostiTematu(tema: string): Dovednost[] {
  return DOVEDNOSTI[tema] ?? [];
}

export function maDovednosti(tema: string): boolean {
  return dovednostiTematu(tema).length > 0;
}

/** Dovednost úlohy: z pole `dovednost` v databázi, jinak podle podtématu. Neznámé = undefined. */
export function dovednostUlohy(ex: Pick<DBExample, "tema" | "podtema" | "dovednost">): string | undefined {
  if (ex.dovednost) return ex.dovednost;
  return dovednostiTematu(ex.tema).find((d) => d.podtemata.includes(ex.podtema))?.klic;
}

export function nazevDovednosti(tema: string, klic: string): string | undefined {
  if (klic === TESTOVE) return TESTOVE_NAZEV;
  return dovednostiTematu(tema).find((d) => d.klic === klic)?.nazev;
}
