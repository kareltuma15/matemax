/** Jeden krok interaktivní konstrukce — žák vybírá správnou volbu postupu. */
export interface ConstructionStep {
  otazka: string;         // "Jaký je první krok konstrukce?"
  volby: string[];        // nabídnuté možnosti postupu
  spravna: number;        // index správné volby ve `volby`
  vysvetleni?: string;    // proč je to správně (ukáže se po výběru)
}

/**
 * Porovnávací úloha. Psát „<" do textového pole je pro žáka past — neví,
 * jestli se čeká „3/4 < 5/6", „<", nebo „menší". Strany se proto vykreslí
 * a žák vybere jen znaménko.
 */
export interface Porovnani {
  levy: string;              // levá strana (text nebo LaTeX dle `latex`)
  pravy: string;             // pravá strana
  znak: "<" | "=" | ">";     // správné znaménko
}

/**
 * Parametrický diagram k úloze. CERMAT je z velké části obrázkový (úhly,
 * geometrie, grafy) a appka obrázky neměla vůbec. Místo statických obrázků
 * nese úloha jen POPIS (typ + parametry) a vykreslí se ostré, dark-mode-aware
 * SVG (viz DiagramView). Škáluje, je zdarma a bez copyright rizika.
 *
 * Diskriminovaná unie podle `typ` — přidání nového typu = nová varianta zde
 * + větev v DiagramView.
 */
export type Diagram =
  | UhelPrickaDiagram
  | TrojuhelnikDiagram
  | ObdelnikDiagram
  | LichobeznikDiagram
  | KruhDiagram
  | KolacovyGrafDiagram
  | SloupcovyGrafDiagram;

/**
 * Obrázek k úloze — hybridní model. Většinu obrázkových úloh (opakující se typy:
 * úhly, rovinné obrazce, grafy…) nese PARAMETRICKY jako popis a vykreslíme ostré,
 * dark-mode-aware SVG. Nepravidelný „dlouhý ocas" (netypické figury, plánky) nese
 * STATICKY jako soubor v public/obrazky/. Viz docs/OBRAZKOVE_ULOHY_STRATEGIE.md.
 *
 * Autoring: parametrickou úlohu přidáš jen pár čísly v JSON (bez kódu), pokud typ
 * už existuje; statickou nakreslíš (nejlépe SVG) a jen odkážeš `url`.
 */
export type TaskImage =
  | { kind: "parametric"; diagram: Diagram }
  | {
      kind: "static";
      url: string;      // cesta v public/, např. „/obrazky/uhly/priklad-01.svg"
      width: number;    // přirozená šířka (px) — proti CLS
      height: number;   // přirozená výška (px)
      alt: string;      // POVINNÝ popis pro čtečky/nevidomé
    };

/** Dvě rovnoběžky p ∥ q proťaté příčkou; jeden úhel je zadaný, jeden hledaný. */
export interface UhelPrickaDiagram {
  typ: "uhel_pricka";
  danyUhel: number;                                   // velikost vyznačeného úhlu (°)
  hledany: "souhlasny" | "stridavy" | "vedlejsi" | "vrcholovy"; // který úhl se ptáme (vyznačí „?")
}

/** Trojúhelník ABC s možnými popisky úhlů a stran; volitelně vyznačený úhel „?". */
export interface TrojuhelnikDiagram {
  typ: "trojuhelnik";
  alfa?: number;                 // úhel u A (°) — když je uveden, zobrazí se
  beta?: number;                 // úhel u B
  gama?: number;                 // úhel u C
  strany?: { a?: string; b?: string; c?: string };  // popisky stran (a proti A…)
  hledany?: "alfa" | "beta" | "gama";               // vyznačí „?" místo hodnoty
}

/** Obdélník/čtverec s popiskem šířky a výšky (obvod, obsah). */
export interface ObdelnikDiagram {
  typ: "obdelnik";
  sirka: string;                 // popisek vodorovné strany (např. „6 cm")
  vyska: string;                 // popisek svislé strany
}

/**
 * Lichoběžník se základnami a ∥ c a výškou v. Kreslí se rovnoramenný obrys;
 * kóty se zobrazí jen tam, kde je popisek. Ramena b, d volitelně (obvod).
 */
export interface LichobeznikDiagram {
  typ: "lichobeznik";
  a?: string;                    // dolní (delší) základna
  c?: string;                    // horní (kratší) základna
  vyska?: string;                // výška v (svislá kóta)
  b?: string;                    // pravé rameno
  d?: string;                    // levé rameno
}

/** Kruh/kružnice s vyznačeným poloměrem nebo průměrem (obvod, obsah). */
export interface KruhDiagram {
  typ: "kruh";
  polomer?: string;              // popisek poloměru (např. „5 cm") — nakreslí se r
  prumer?: string;               // popisek průměru — nakreslí se d (místo r)
}

/**
 * Koláčový graf ke slovní úloze — přesně formát CERMAT (rozdělení celku na
 * procenta: denní činnosti z 24 h, volný čas, rozpočet…). Figura ukazuje jen
 * procenta a legendu; absolutní celek (24 h, 30 žáků) nese text zadání.
 *
 * NE kartézská soustava — CERMAT „grafy" jsou koláčové a sloupcové ke slovním
 * úlohám. Viz docs/OBRAZKOVE_ULOHY_STRATEGIE.md.
 */
export interface KolacovyGrafDiagram {
  typ: "kolac";
  nazev?: string;                          // titulek nad grafem
  casti: { label: string; procenta: number }[]; // výseče (součet ≈ 100)
}

/**
 * Sloupcový graf ke slovní úloze (formát CERMAT) — čtení hodnot z osy y
 * (počty, teploty, tržby po měsících…). Osa y se škáluje automaticky na
 * „hezké" maximum; nad každým sloupcem je jeho hodnota.
 */
export interface SloupcovyGrafDiagram {
  typ: "sloupce";
  nazev?: string;                          // titulek nad grafem
  jednotka?: string;                       // popisek osy y (např. „ks", „°C")
  sloupce: { label: string; hodnota: number }[];
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
  /**
   * Obrázek k úloze (parametrický SVG nebo statický soubor) — vykreslí se nad
   * zadáním. Hybridní model, viz {@link TaskImage}.
   */
  image?: TaskImage;
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
  /**
   * Porovnávací úloha: místo psaní „<" žák klikne na znaménko. Když je
   * vyplněno, trénink místo PracticeCard vykreslí ComparisonCard.
   */
  porovnani?: Porovnani;
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
  uprava_vyrazu:        "Úprava výrazů",
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
  posloupnosti:            "Další posloupnosti",
  kombinatorika:           "Kombinatorika",
  kvadraticka_posloupnost: "Kvadratická posloupnost",
  ciselna_zakonitost:      "Číselná zákonitost",
  ciselne_zakonitosti:     "Číselná zákonitost",
  ruzna_vzorec:            "Číselná zákonitost",
  logicka_dedukce:         "Logická dedukce",
  cteni_grafu:             "Čtení z grafu",

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
