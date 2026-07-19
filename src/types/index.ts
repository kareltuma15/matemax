/** Jeden krok interaktivní konstrukce — žák vybírá správnou volbu postupu. */
export interface ConstructionStep {
  otazka: string;         // "Jaký je první krok konstrukce?"
  volby: string[];        // nabídnuté možnosti postupu
  spravna: number;        // index správné volby ve `volby`
  vysvetleni?: string;    // proč je to správně (ukáže se po výběru)
}

export interface DBExample {
  id: string;
  tema: string;
  podtema: string;
  obtiznost: 1 | 2 | 3;
  zadani: string;
  odpoved: string;
  reseni_kroky: string[];
  cas_sekund: number;
  sm2_interval: number;
  /** Pokud true, zadani a reseni_kroky používají LaTeX syntaxi — renderováno přes KaTeX */
  latex?: boolean;
  /** Výchozí situace („V rovině leží úsečka AB") — u konstrukčních úloh. */
  kontext?: string;
  /**
   * Interaktivní konstrukce: místo textové odpovědi žák vybírá správný postup
   * krok za krokem. Když je vyplněno, trénink místo PracticeCard vykreslí
   * ConstructionCard. Viz kapitola 7 pracovního sešitu.
   */
  kroky_volby?: ConstructionStep[];
}

export interface SM2Card {
  exampleId: string;
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReview: number;
  lastQuality: number;
}

export interface UserProgress {
  xp: number;
  streak: number;
  lastActiveDate: string | null; // "YYYY-MM-DD"
  consecutiveCorrect: number;
  freezeCount?: number;
  lastFreezeEarnedAtStreak?: number;
}

// === 9 sjednocených témat (dle CERMAT testů a pracovního sešitu 2026/27) ===
// Pořadí odpovídá kapitolám sešitu. Viz docs/STRUKTURA-cermat-sesit-matemax.md
export const TEMATA_ORDER = [
  "zlomky", "vyrazy", "rovnice", "geometrie", "slovni_ulohy",
  "grafy_logika", "konstrukce", "uhly", "souhrnne",
] as const;

// POZOR: některé komponenty iterují Object.keys(TEMA_LABELS) jako seznam témat —
// drž zde jen 9 kanonických témat (legacy mapuj přes legacyTemaLabel()).
export const TEMA_LABELS: Record<string, string> = {
  zlomky:       "Zlomky",
  vyrazy:       "Výrazy",
  rovnice:      "Rovnice",
  geometrie:    "Geometrie",
  slovni_ulohy: "Slovní úlohy",
  grafy_logika: "Grafy a logika",
  konstrukce:   "Konstrukční úlohy",
  uhly:         "Úhly",
  souhrnne:     "Souhrnné",
};

// Stará témata (z dřívějších localStorage dat / odkazů) → label, jen pro zobrazení
const LEGACY_TEMA_LABELS: Record<string, string> = {
  procenta: "Procenta", mocniny: "Mocniny", cisselne_rady: "Číselné řady",
  kombinovane: "Souhrnné", pomer_meritko: "Poměr a měřítko",
  geometrie_rovinna: "Geometrie", geometrie_prostorova: "Geometrie",
  logicke_ulohy: "Logické úlohy",
};

/** Bezpečný label pro téma (zná i stará témata). */
export function temaLabel(tema: string): string {
  return TEMA_LABELS[tema] ?? LEGACY_TEMA_LABELS[tema] ?? tema;
}

// Podtémata slovních úloh (jako kapitola 5 v sešitu) — pořadí dle sešitu
export const PODTEMA_SLOVNI_ORDER = [
  "pomer_meritko", "pohyb", "spolecna_prace", "umera", "procenta", "finance",
] as const;

export const PODTEMA_LABELS: Record<string, string> = {
  // Slovní úlohy (kapitola 5 sešitu, 5A–5F)
  pomer_meritko:  "Poměr a měřítko",
  pohyb:          "Pohyb",
  spolecna_prace: "Společná práce",
  umera:          "Úměra",
  procenta:       "Procenta",
  finance:        "Finance",
  // Geometrie (kapitola 4 sešitu, 4A/4B)
  rovinne:        "Rovinné obrazce",
  prostorova:     "Prostorová tělesa",
  // Konstrukce (kapitola 7 sešitu)
  osa_usecky:         "Osa úsečky",
  osa_uhlu:           "Osa úhlu",
  kolmice:            "Kolmice",
  trojuhelnik_sss:    "Trojúhelník (sss)",
  trojuhelnik_sus:    "Trojúhelník (sus)",
  kruznice_opsana:    "Kružnice opsaná",
  kruznice_vepsana:   "Kružnice vepsaná",
  obdelnik_thales:    "Obdélník (Thales)",

  // Zlomky — některé slugy znamenají totéž, proto sdílí popisek
  scitani:              "Sčítání",
  odcitani:             "Odčítání",
  scitani_a_odcitani:   "Sčítání a odčítání",
  scitani_odcitani:     "Sčítání a odčítání",
  nasobeni:             "Násobení",
  deleni:               "Dělení",
  nasobeni_deleni:      "Násobení a dělení",
  smisena_cisla:        "Smíšená čísla",
  smisena_cisla_operace:"Smíšená čísla",
  zkracovani:           "Krácení",
  porovnavani:          "Porovnávání",
  slozeny_zlomek:       "Složený zlomek",
  slovni_uloha:         "Slovní úloha",
  komplexni_vypocet:    "Složený výpočet",
  kombinovane:          "Kombinované",
  rovnice_se_zlomky:    "Rovnice se zlomky",

  // Výrazy
  dosazovani:           "Dosazování",
  umocnovani:           "Umocňování",
  mocniny:              "Mocniny",
  odmocniny:            "Odmocniny",
  zakony_mocnin:        "Zákony mocnin",
  pravidla_pro_mocniny: "Zákony mocnin",
  roznasobeni:          "Roznásobení závorek",
  vytkani:              "Vytýkání",
  zjednodusovani:       "Zjednodušování",
  pythagorova_veta:     "Pythagorova věta",

  // Rovnice
  linearni:             "Lineární rovnice",
  linearni_rovnice:     "Lineární rovnice",
  linearni_jednoduche:  "Lineární rovnice",
  linearni_se_zavorkou: "Rovnice se závorkami",
  linearni_rovnice_se_zavorkami: "Rovnice se závorkami",
  zlomkova:             "Zlomková rovnice",
  linearni_se_zlomky:   "Zlomková rovnice",
  linearni_rovnice_se_zlomky: "Zlomková rovnice",
  soustava:             "Soustava rovnic",
  soustava_rovnic:      "Soustava rovnic",
  slovni:               "Slovní úloha",

  // Grafy a logika
  aritmeticka_posloupnost: "Aritmetická posloupnost",
  geometricka_posloupnost: "Geometrická posloupnost",
  kvadraticka_posloupnost: "Kvadratická posloupnost",
  ciselna_zakonitost:      "Číselná zákonitost",
  ciselne_zakonitosti:     "Číselná zákonitost",
  ruzna_vzorec:            "Číselná zákonitost",
  logicka_dedukce:         "Logická dedukce",

  // Úhly (kapitola 8 sešitu)
  vnejsi_uhel:              "Vnější úhel",
  vedlejsi_uhly:            "Vedlejší úhly",
  rovnobezky:               "Úhly u rovnoběžek",
  rovnobezky_trojuhelnik:   "Úhly u rovnoběžek",
  ctyruhelnik:              "Čtyřúhelník",
  rovnoramenny_trojuhelnik: "Rovnoramenný trojúhelník",
  lichobeznik:              "Lichoběžník",
  pravidelny_mnohouhelnik:  "Pravidelný mnohoúhelník",
  osa_uhlu_trojuhelnik:     "Osa úhlu v trojúhelníku",

  // Souhrnné
  mix:                "Mix témat",

  ostatni:            "Ostatní",
};

// Podtémata geometrie (kapitola 4 sešitu) — pořadí dle sešitu 4A/4B
export const PODTEMA_GEOMETRIE_ORDER = ["rovinne", "prostorova"] as const;

/**
 * Čitelný popisek podtématu, nebo `null` když ho neznáme.
 *
 * Databáze má u některých témat desítky jednorázových podtémat (úhly: 28
 * na 30 příkladů) — syrový slug typu „scitani_a_odcitani" vypadá jako
 * nedodělek, který se omylem dostal ven. Radši nezobrazíme nic.
 */
export function podtemaLabel(podtema: string): string | null {
  return PODTEMA_LABELS[podtema] ?? null;
}

export const TEMA_COLORS: Record<string, string> = {
  zlomky:       "bg-blue-500",
  vyrazy:       "bg-rose-500",
  rovnice:      "bg-amber-500",
  geometrie:    "bg-green-500",
  slovni_ulohy: "bg-cyan-500",
  grafy_logika: "bg-purple-500",
  konstrukce:   "bg-indigo-500",
  uhly:         "bg-orange-500",
  souhrnne:     "bg-slate-500",
};
