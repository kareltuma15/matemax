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

export const TEMA_LABELS: Record<string, string> = {
  // Původní témata
  zlomky:              "Zlomky",
  procenta:            "Procenta",
  rovnice:             "Rovnice",
  geometrie:           "Geometrie",
  mocniny:             "Mocniny",
  slovni_ulohy:        "Slovní úlohy",
  cisselne_rady:       "Číselné řady",
  vyrazy:              "Výrazy",
  kombinovane:         "Kombinované",
  // CERMAT nová témata
  pomer_meritko:       "Poměr a měřítko",
  geometrie_rovinna:   "Geometrie rovinná",
  geometrie_prostorova:"Geometrie prostorová",
  uhly:                "Úhly",
  logicke_ulohy:       "Logické úlohy",
};

export const TEMA_COLORS: Record<string, string> = {
  zlomky: "bg-blue-500",
  procenta: "bg-purple-500",
  rovnice: "bg-amber-500",
  geometrie: "bg-green-500",
  mocniny: "bg-rose-500",
  slovni_ulohy: "bg-cyan-500",
};
