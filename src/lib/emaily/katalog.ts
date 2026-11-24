import { esc, odkaz, type ObsahEmailu } from "./sablona";

/**
 * E-maily pro žáky (mockup e-mailů schválený Karlem 24. 11. 2026). Texty pro obě třídy, bez nabídky placených věcí
 * (reklama dětem), bez oslovení jménem (český vokativ se automaticky splete), rod neutrálně.
 *
 * - uvitani: hned po registraci (servisní, chodí vždy)
 * - nezacal: 3 dny po registraci bez diagnostiky i tréninku (nahrazuje Loops D+1/D+3)
 * - plan: den po diagnostice, když ještě nebyl trénink
 * - styska: 3 dny bez tréninku (kdo dřív trénoval)
 * - spi: 7 dní bez tréninku, poslední připomínka, pak ticho (nahrazuje Loops D+7)
 */
export type EmailZaka = "uvitani" | "nezacal" | "plan" | "styska" | "spi";
export const PRIPOMINKY: EmailZaka[] = ["nezacal", "plan", "styska", "spi"];

export const NAZVY: Record<EmailZaka, string> = {
  uvitani: "Uvítání",
  nezacal: "Ještě jsi nezačal(a)",
  plan: "Plán po diagnostice",
  styska: "Stýská se mi (3 dny)",
  spi: "Hexík usnul (7 dní)",
};

export const KDY: Record<EmailZaka, string> = {
  uvitani: "Hned po registraci",
  nezacal: "3 dny po registraci, když nemá diagnostiku ani trénink",
  plan: "Den po diagnostice, když ještě netrénoval(a)",
  styska: "3 dny bez tréninku (kdo už trénoval)",
  spi: "7 dní bez tréninku, poslední připomínka",
};

export interface DataZaka {
  trida: 5 | 9;
  /** Dnešní datum v Praze (YYYY-MM-DD). */
  dnes: string;
  /** Odhad bodů z diagnostiky (pro „plan“). */
  odhad?: { celkem: number; max: number; tema: { klic: string; label: string } | null };
  /** Datum posledního tréninku (YYYY-MM-DD). */
  posledniTrenink?: string;
  /** Kolik dní v řadě trénoval(a) před pauzou. */
  serie?: number;
  krystaly?: number;
}

/** První den přijímaček 2027 podle ověřeného faktu jpz_2027 (čtyřleté obory 12. 4., víceletá gymnázia 14. 4.). */
const PRIJIMACKY: Record<5 | 9, string> = { 9: "2027-04-12", 5: "2027-04-14" };

export function dniDoPrijimacek(trida: 5 | 9, dnes: string): number {
  return Math.max(0, Math.round((Date.parse(PRIJIMACKY[trida]) - Date.parse(dnes)) / 86400000));
}

const DEN_V_TYDNU = ["v neděli", "v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu"];
function kdyNaposledy(datum: string): string {
  return DEN_V_TYDNU[new Date(datum + "T12:00:00Z").getUTCDay()];
}
function dni(n: number): string {
  return n === 1 ? "den" : n >= 2 && n <= 4 ? "dny" : "dní";
}

export function obsahEmailu(id: EmailZaka, d: DataZaka): ObsahEmailu {
  const o = (cesta: string) => odkaz(cesta, id);
  switch (id) {
    case "uvitani":
      return {
        predmet: "Ahoj, já jsem Hexík 👋 Začneme?",
        pre: "Za pár minut zjistíme, co ti jde, a sestavím ti trénink.",
        nadpis: "Vítej v MateMaxu!",
        odstavce: [
          "Ahoj! Jsem Hexík a budu s tebou u každého příkladu.",
          "Začneme krátkou diagnostikou. Za pár minut zjistíme, co ti jde, a já ti z toho sestavím trénink na míru.",
        ],
        box: "🎯 Diagnostika je zdarma a zabere pár minut<br>🎁 Za správné příklady dostaneš krystaly a truhly s věcmi pro mě<br>📈 Uvidíš odhad bodů u přijímaček, který poroste s tebou",
        tlacitko: { text: "Spustit diagnostiku", href: o("/diagnostika") },
        img: "uvitani",
      };
    case "nezacal":
      return {
        predmet: "Hexík pořád čeká na tvůj první příklad",
        pre: "Stačí jeden příklad, zabere minutu.",
        nadpis: "Zkusíme první příklad?",
        odstavce: [
          "Od registrace uběhly tři dny a já pořád čekám, až spolu spočítáme první příklad.",
          "Nemusíš hned dělat diagnostiku. Klidně si zkus jeden příklad, zabere minutu.",
        ],
        tlacitko: { text: "Zkusit jeden příklad", href: o("/trenink") },
        druhe: { text: "Nebo spustit diagnostiku", href: o("/diagnostika") },
        img: "nezacal",
      };
    case "plan": {
      const tema = d.odhad?.tema ?? null;
      return {
        predmet: tema ? `Tvůj plán je hotový: začni tématem ${tema.label}` : "Tvůj plán je hotový",
        pre: "Pár příkladů a uvidíš, jak to jde.",
        nadpis: "Tvůj plán je připravený",
        odstavce: tema
          ? [
              `Z diagnostiky vím, kde můžeš přidat nejvíc bodů: <b>${esc(tema.label)}</b>.`,
              "Začni tréninkem v tomhle tématu. Po každém příkladu uvidíš, jak to šlo.",
            ]
          : ["Diagnostiku máš hotovou, takže víme, kde začít.", "Dej si první trénink. Po každém příkladu uvidíš, jak to šlo."],
        box: d.odhad
          ? `📈 Tvůj odhad dnes: <b>${esc(d.odhad.celkem)} z ${esc(d.odhad.max)} bodů</b>${tema ? `<br>🎯 Nejvíc přidáš v tématu ${esc(tema.label)}` : ""}`
          : undefined,
        tlacitko: { text: "Začít trénink", href: o(tema ? `/trenink?tema=${encodeURIComponent(tema.klic)}` : "/trenink") },
        img: "plan",
      };
    }
    case "styska": {
      const serie = d.serie ?? 0;
      const prvni = d.posledniTrenink
        ? `Naposledy jsme trénovali ${kdyNaposledy(d.posledniTrenink)}.${serie >= 2 ? ` Série ${serie} ${dni(serie)} skončila, ale nová začne jediným tréninkem.` : " Nová série začne jediným tréninkem."}`
        : "Nová série začne jediným tréninkem.";
      return {
        predmet: "Stýská se mi 🥺 Dáme dnes 10 minut?",
        pre: "Pár příkladů na rozjezd a jsme zase v rytmu.",
        nadpis: "Stýská se mi",
        odstavce: [prvni, "Stačí pár příkladů, ať se zase rozjedeš."],
        box: d.krystaly && d.krystaly > 0 ? `💎 Máš ${esc(d.krystaly)} krystalů, které čekají na utracení` : undefined,
        tlacitko: { text: "Pokračovat v tréninku", href: o("/trenink") },
        img: "styska",
      };
    }
    case "spi": {
      const zbyva = dniDoPrijimacek(d.trida, d.dnes);
      return {
        predmet: "Hexík usnul 😴 Probudíš ho?",
        pre: "Jeden krátký trénink a jsme zase v rytmu.",
        nadpis: "Hexík usnul",
        odstavce: [
          `Do přijímaček zbývá ${esc(zbyva)} ${dni(zbyva)}. Nemusíš dohánět všechno najednou, stačí jeden krátký trénink a jsme zase v rytmu.`,
          "Tohle je moje poslední připomínka. Pak tě nechám v klidu, dokud se nevrátíš.",
        ],
        tlacitko: { text: "Probudit Hexíka", href: o("/") },
        img: "spi",
      };
    }
  }
}

/** Ukázková data pro náhled v adminu a testy. */
export function ukazkovaData(trida: 5 | 9, dnes: string): DataZaka {
  return {
    trida, dnes,
    odhad: { celkem: 24, max: 50, tema: trida === 9 ? { klic: "slovni_ulohy", label: "Slovní úlohy" } : { klic: "p5_slovni", label: "Slovní úlohy" } },
    posledniTrenink: "2026-11-20", serie: 6, krystaly: 340,
  };
}
