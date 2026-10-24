/**
 * Videolekce, které se žákovi nabídnou po chybě („Nechápeš? Pusť si lekci…").
 *
 * Jak přidat novou lekci: až bude video veřejné na YouTube (v MS Dashboard ve fázi „Veřejné"),
 * přidej jeden řádek do pole níž. `podtemata` jsou přesná podtémata úloh, ke kterým lekce sedí;
 * `vychozi: true` označí lekci, která se nabídne u ostatních úloh stejného tématu (základy tématu).
 * Nepublikovaná videa sem nepatří — odkaz by nikam nevedl.
 */
export interface Videolekce {
  id: string;
  tema: string;
  /** Podtémata úloh, u kterých se nabídne přesně tahle lekce. */
  podtemata?: string[];
  /** Lekce pro zbytek tématu, když žádná nesedí přesně. */
  vychozi?: boolean;
  nazev: string;
  url: string;
}

export const VIDEOLEKCE: Videolekce[] = [
  {
    id: "zlomky-scitani-odcitani",
    tema: "zlomky",
    podtemata: ["scitani", "odcitani", "scitani_odcitani", "scitani_a_odcitani"],
    nazev: "Sčítání a odčítání zlomků",
    url: "https://www.youtube.com/watch?v=yYvrJ1L3BYM",
  },
  {
    id: "zlomky-zaklady",
    tema: "zlomky",
    podtemata: ["zkracovani", "cast_obrazce", "ciselna_osa"],
    vychozi: true,
    nazev: "Čitatel, jmenovatel a krácení",
    url: "https://youtu.be/w-dvvKwyWPQ",
  },
];

/** Najde lekci k úloze: nejdřív přesnou podle podtématu, jinak výchozí lekci tématu; `presna` říká, která z toho to je. */
export function najdiVideolekci(tema: string, podtema?: string | null): { lekce: Videolekce; presna: boolean } | null {
  const poTematu = VIDEOLEKCE.filter((v) => v.tema === tema);
  if (poTematu.length === 0) return null;
  const presna = podtema ? poTematu.find((v) => v.podtemata?.includes(podtema)) : undefined;
  if (presna) return { lekce: presna, presna: true };
  const vychozi = poTematu.find((v) => v.vychozi);
  return vychozi ? { lekce: vychozi, presna: false } : null;
}
