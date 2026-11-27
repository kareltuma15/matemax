/** Typy nového adminu (admin 2.1). Řádek žáka odpovídá SQL funkci admin_zaci(). */
export type Premium = "stripe" | "rucne" | "zkusebni" | "zdarma";

export interface Zak {
  id: string;
  email: string | null;
  jmeno: string | null;
  trida: 5 | 9;
  registrace: string;            // ISO
  zdroj: string | null;          // user_metadata.zdroj („fb · 1202…“, „letak · …“, „přímo“)
  odkud: string | null;          // „Odkud ses o nás dozvěděl?“
  email_overen: string | null;
  posledni_prihlaseni: string | null;
  diagnostika: string | null;    // první dokončená diagnostika
  prvni_trenink: string | null;
  posledni_aktivita: string | null; // YYYY-MM-DD (pražský den)
  dny_7: number;                 // dny s tréninkem za posledních 7 dní
  dny_celkem: number;
  odpovedi: number;
  spravne: number;
  vratil_2den: boolean;
  premium: Premium;
  premium_do: string | null;
  souhlas_podminky: string | null;
  souhlas_novinky: boolean | null;
  prezdivka: string | null;
  rodic_email: string | null;
  propojeno_vysledky: string | null;
  odhlasen_emaily: boolean;
}

export interface Aktivita { user_id: string; den: string; druh: "trenink" | "test" | "diagnostika"; pocet: number }

export type StavZaka = "novy" | "aktivni" | "usina" | "spi" | "nezacal";

/** Filtry v adrese (KO-06). Platí napříč sekcemi. */
export interface Filtry {
  obdobi: "dnes" | "7" | "30" | "90" | "vlastni";
  od: string;   // YYYY-MM-DD včetně
  do: string;   // YYYY-MM-DD včetně
  predOd: string;
  predDo: string;
  dni: number;
  trida: 5 | 9 | null;
  zdroj: string | null;
}
