/**
 * Sbírka MateMax: krystaly, truhly a odměny pro Hexíka (1. etapa herního systému, schválil Karel 15. 11. 2026).
 *
 * Zásady:
 *  • Krystaly jsou za učení (správná odpověď na úrovni žáka, dokončený trénink, nejvyšší odhad bodů),
 *    s denním stropem. Za čas ani za klikání nic.
 *  • Všechno je jen vzhled. Nic nejde koupit za peníze, Premium nedává lepší šance.
 *  • Šance jsou vidět, pojistka hlídá smůlu (vzácná nejpozději v 10. truhle, legendární ve 30.).
 *  • Páťák vidí jen odměny 5. třídy, deváťák jen 9. (stejná pravidla, jiný obsah).
 *
 * Stav žije v localStorage a přihlášenému se zálohuje do Supabase (user_sbirka, viz sbirka-sync.ts).
 * Čísla, která se jen přičítají (získáno, utraceno, otevřeno), se při slučování dvou zařízení berou
 * jako maximum, takže se postup neztratí ani z jedné strany.
 */
import type { Trida } from "@/types";
import { localDateStr } from "./date";

export type TypOdmeny = "podoba" | "oslava" | "efekt" | "vzhled" | "pozadi";
export type Vzacnost = "bezna" | "neobvykla" | "vzacna" | "legenda";

export interface Odmena {
  id: string;
  trida: Trida;
  typ: TypOdmeny;
  klic: string;
  nazev: string;
  vz: Vzacnost;
  /** 0 = má každý od začátku, null = nejde koupit (jen z truhel). */
  cena: number | null;
  /** Odkud jinak než z truhel: "test" = jen za test nanečisto (v truhlách nepadá). */
  zdroj?: "test";
  /** Sezónní věc: koupit a vylosovat jde jen v sezóně, co žák jednou má, zůstává mu. */
  sezona?: SezonaId;
}

// ── Sezóny ──────────────────────────────────────────────────────────────────

export type SezonaId = "vanoce" | "zima" | "finis";
export interface Sezona { id: SezonaId; nazev: string; ikona: string; od: string; do: string; truhla: string }

/** Sezóny podle kalendáře (MM-DD, Vánoce přecházejí přes Nový rok). */
export const SEZONY: Sezona[] = [
  { id: "vanoce", nazev: "Vánoce", ikona: "🎄", od: "12-01", do: "01-06", truhla: "Vánoční truhla" },
  { id: "zima", nazev: "Zima", ikona: "❄️", od: "01-07", do: "02-28", truhla: "Zimní truhla" },
  { id: "finis", nazev: "Finiš před přijímačkami", ikona: "🏁", od: "03-01", do: "04-30", truhla: "Truhla finiše" },
];

function vSezone(z: Sezona, den: string): boolean {
  const md = den.slice(5);
  return z.od <= z.do ? md >= z.od && md <= z.do : md >= z.od || md <= z.do;
}

export function aktualniSezona(den: string): Sezona | null {
  return SEZONY.find((z) => vSezone(z, den)) ?? null;
}

/** Poslední den sezóny jako datum (pro „jen do 6. 1.“). */
export function konecSezony(z: Sezona, den: string): string {
  const rok = Number(den.slice(0, 4)) + (z.od > z.do && den.slice(5) >= z.od ? 1 : 0);
  return `${rok}-${z.do}`;
}

/** Jde věc teď koupit nebo vylosovat? (Nesezónní vždy, sezónní jen ve své sezóně.) */
export function jeVNabidce(o: Odmena, den: string): boolean {
  return !o.sezona || aktualniSezona(den)?.id === o.sezona;
}

export const VZACNOST: Record<Vzacnost, { nazev: string; barva: string }> = {
  bezna: { nazev: "běžná", barva: "#8A93AA" },
  neobvykla: { nazev: "neobvyklá", barva: "#2E6DA4" },
  vzacna: { nazev: "vzácná", barva: "#8E3FA8" },
  legenda: { nazev: "legendární", barva: "#E08A00" },
};

export const TYP_NAZEV: Record<TypOdmeny, string> = {
  podoba: "Podoba Hexíka",
  oslava: "Oslava série",
  efekt: "Efekt správné odpovědi",
  vzhled: "Vzhled appky",
  pozadi: "Pozadí profilu",
};

// [typ, klíč, název, vzácnost, cena, zdroj nebo sezóna?]
type Radek = [TypOdmeny, string, string, Vzacnost, number | null, ("test" | SezonaId)?];
const KATALOG: Record<Trida, Radek[]> = {
  5: [
    ["podoba", "klasik", "Hexík", "bezna", 0],
    ["podoba", "mata", "Mátový Hexík", "bezna", 150],
    ["podoba", "malina", "Malinový Hexík", "bezna", 150],
    ["podoba", "citron", "Citronový Hexík", "bezna", 150],
    ["podoba", "boruvka", "Borůvkový Hexík", "bezna", 150],
    ["podoba", "kocicka", "Kočičí Hexík", "neobvykla", 400],
    ["podoba", "lisak", "Lišáček", "neobvykla", 400],
    ["podoba", "robutek", "Robůtek", "neobvykla", 400],
    ["podoba", "dracek", "Dráček", "vzacna", 900],
    ["podoba", "jednorozec", "Jednorožec", "legenda", null],
    ["oslava", "radost", "Radost", "bezna", 0],
    ["oslava", "poskok", "Poskok", "bezna", 150],
    ["oslava", "tanec", "Taneček", "neobvykla", 400],
    ["oslava", "kotrmelec", "Kotrmelec", "vzacna", 900],
    ["oslava", "piruetka", "Duhová piruetka", "legenda", null],
    ["efekt", "jiskry", "Jiskry", "bezna", 0],
    ["efekt", "srdicka", "Srdíčka", "bezna", 150],
    ["efekt", "konfety", "Konfety", "neobvykla", 400],
    ["efekt", "bubliny", "Bubliny", "neobvykla", 400],
    ["efekt", "hvezdy", "Hvězdičky", "vzacna", 900],
    ["efekt", "duha", "Duha", "legenda", null],
    ["vzhled", "klasik", "Klasik", "bezna", 0],
    ["vzhled", "louka", "Louka", "bezna", 150],
    ["vzhled", "bonbon", "Bonbon", "neobvykla", 400],
    ["vzhled", "ocean", "Oceán", "neobvykla", 400],
    ["vzhled", "zmrzlina", "Zmrzlina", "neobvykla", 400],
    ["vzhled", "vesmir", "Vesmír", "vzacna", 900],
    ["vzhled", "duha", "Duhový", "legenda", null],
    ["pozadi", "klasik", "Klasik", "bezna", 0],
    ["pozadi", "tyrkys", "Tyrkys", "bezna", 150],
    ["pozadi", "mraky", "Mraky", "bezna", 150],
    ["pozadi", "dzungle", "Džungle", "neobvykla", 400],
    ["pozadi", "podmori", "Podmoří", "vzacna", 900],
    ["pozadi", "pohadka", "Pohádka", "vzacna", 900],
    ["pozadi", "ohnostroj", "Ohňostroj", "legenda", null],
    ["pozadi", "generalka", "Generálka", "legenda", null, "test"],
    // sezónní
    ["podoba", "skritek", "Vánoční skřítek", "neobvykla", 400, "vanoce"],
    ["efekt", "vlocky", "Vločky", "bezna", 150, "vanoce"],
    ["vzhled", "snezeni", "Sněžení", "neobvykla", 400, "vanoce"],
    ["pozadi", "vanoce", "Vánoční noc", "vzacna", 900, "vanoce"],
    ["podoba", "snehulak", "Sněhulák", "neobvykla", 400, "zima"],
    ["pozadi", "ledove", "Ledové království", "vzacna", 900, "zima"],
    ["podoba", "sampion", "Šampion", "vzacna", 900, "finis"],
    ["efekt", "medaile", "Medaile", "neobvykla", 400, "finis"],
    ["pozadi", "cil", "Cílová páska", "neobvykla", 400, "finis"],
  ],
  9: [
    ["podoba", "klasik", "Hexík", "bezna", 0],
    ["podoba", "grafit", "Grafitový Hexík", "bezna", 150],
    ["podoba", "mata", "Mátový Hexík", "bezna", 150],
    ["podoba", "ohnivy", "Ohnivý Hexík", "bezna", 150],
    ["podoba", "ledovy", "Ledový Hexík", "bezna", 150],
    ["podoba", "neon", "Neon", "neobvykla", 400],
    ["podoba", "street", "Streetwear", "neobvykla", 400],
    ["podoba", "maskac", "Maskáč", "neobvykla", 400],
    ["podoba", "kyber", "Kyber", "vzacna", 900],
    ["podoba", "ninja", "Ninja", "vzacna", 900],
    ["podoba", "zlaty", "Zlatý Hexík", "legenda", null],
    ["oslava", "radost", "Radost", "bezna", 0],
    ["oslava", "poskok", "Poskok", "bezna", 150],
    ["oslava", "tanec", "Taneček", "neobvykla", 400],
    ["oslava", "salto", "Salto", "vzacna", 900],
    ["oslava", "teleport", "Teleport", "vzacna", 900],
    ["oslava", "disco", "Disco", "legenda", null],
    ["efekt", "jiskry", "Jiskry", "bezna", 0],
    ["efekt", "pixely", "Pixely", "bezna", 150],
    ["efekt", "konfety", "Konfety", "neobvykla", 400],
    ["efekt", "blesky", "Blesky", "vzacna", 900],
    ["efekt", "ohen", "Ohnivá stopa", "legenda", null],
    ["vzhled", "klasik", "Klasik", "bezna", 0],
    ["vzhled", "grafit", "Grafit", "bezna", 150],
    ["vzhled", "ocean", "Oceán", "neobvykla", 400],
    ["vzhled", "mesto", "Noční město", "vzacna", 900],
    ["vzhled", "vesmir", "Vesmír", "vzacna", 900],
    ["vzhled", "matrix", "Matrix", "vzacna", 900],
    ["vzhled", "aurora", "Aurora", "legenda", null],
    ["pozadi", "klasik", "Klasik", "bezna", 0],
    ["pozadi", "tyrkys", "Tyrkys", "bezna", 150],
    ["pozadi", "mrizka", "Mřížka", "bezna", 150],
    ["pozadi", "zapad", "Západ slunce", "neobvykla", 400],
    ["pozadi", "synthwave", "Synthwave", "vzacna", 900],
    ["pozadi", "stadion", "Stadion", "neobvykla", 400],
    ["pozadi", "polarni", "Polární záře", "legenda", null],
    ["pozadi", "generalka", "Generálka", "legenda", null, "test"],
    // sezónní
    ["podoba", "santa", "Santa", "neobvykla", 400, "vanoce"],
    ["efekt", "vlocky", "Vločky", "bezna", 150, "vanoce"],
    ["vzhled", "snezeni", "Sněžení", "neobvykla", 400, "vanoce"],
    ["pozadi", "vanoce", "Vánoční noc", "legenda", null, "vanoce"],
    ["podoba", "yeti", "Yeti", "vzacna", 900, "zima"],
    ["pozadi", "ledove", "Ledové království", "neobvykla", 400, "zima"],
    ["podoba", "finisher", "Finišer", "neobvykla", 400, "finis"],
    ["efekt", "medaile", "Medaile", "neobvykla", 400, "finis"],
    ["pozadi", "cil", "Cílová páska", "vzacna", 900, "finis"],
  ],
};

const zKatalogu = (t: Trida) => KATALOG[t].map(([typ, klic, nazev, vz, cena, extra]): Odmena =>
  ({ id: `${t}-${typ}-${klic}`, trida: t, typ, klic, nazev, vz, cena, ...(extra === "test" ? { zdroj: "test" as const } : extra ? { sezona: extra } : {}) }));

export const ODMENY: Record<Trida, Odmena[]> = { 5: zKatalogu(5), 9: zKatalogu(9) };

export function najdiOdmenu(id: string): Odmena | undefined {
  const t: Trida = id.startsWith("5-") ? 5 : 9;
  return ODMENY[t].find((o) => o.id === id);
}

/** Animace Hexíka pro oslavu série (klíč oslavy → CSS animace). */
export const ANIMACE_OSLAVY: Record<string, string> = {
  radost: "radost", poskok: "poskok", tanec: "tanec", kotrmelec: "salto", salto: "salto",
  teleport: "teleport", disco: "disco", piruetka: "disco",
};

/** Tmavé vzhledy: obsah appky leží na světlém listu, aby texty mimo karty zůstaly čitelné. */
export const TMAVE_VZHLEDY = new Set(["grafit", "vesmir", "mesto", "aurora", "matrix"]);

export const IKONA_ODMENY: Record<string, string> = {
  radost: "🙌", poskok: "🦘", tanec: "💃", kotrmelec: "🤸", salto: "🤸", teleport: "🌀", disco: "🪩", piruetka: "🌈",
  jiskry: "✨", srdicka: "💖", pixely: "🟪", konfety: "🎊", bubliny: "🫧", hvezdy: "⭐", duha: "🌈", blesky: "⚡", ohen: "🔥", vlocky: "❄️", medaile: "🥇",
};

// ── Truhly ──────────────────────────────────────────────────────────────────

export type TruhlaId = "denni" | "doporuceni" | "generalka" | "legendarni" | "sezonni" | "krystalova" | "velka" | "mistrovska" | "zlata";
/** Truhly, na které vzniká nárok za splněný úkol (každý úkol má vlastní klíč, nárok jen jednou). */
export type NarokTruhla = "doporuceni" | "generalka" | "legendarni";
export const NAROKOVE_TRUHLY: NarokTruhla[] = ["doporuceni", "generalka", "legendarni"];
export interface Truhla {
  id: TruhlaId;
  nazev: string;
  /** Jak ji získat (krátce, pro žáka). */
  jak: string;
  /** Cena v krystalech, null = nejde koupit. */
  cena: number | null;
  sance: Record<Vzacnost, number>;
  /** Kolik krystalů navíc padá (od–do). */
  bonus: [number, number];
}

export const TRUHLY: Truhla[] = [
  { id: "denni", nazev: "Denní truhla", jak: "Zdarma jednou denně za dokončený trénink", cena: null,
    sance: { bezna: 0.62, neobvykla: 0.28, vzacna: 0.08, legenda: 0.02 }, bonus: [10, 30] },
  { id: "doporuceni", nazev: "Truhla doporučení", jak: "Za zvládnuté doporučené téma nebo splněný plán po testu", cena: null,
    sance: { bezna: 0, neobvykla: 0.5, vzacna: 0.38, legenda: 0.12 }, bonus: [20, 50] },
  { id: "generalka", nazev: "Truhla Generálka", jak: "Za každý test nanečisto (kód z učebny nebo výsledek v appce)", cena: null,
    sance: { bezna: 0, neobvykla: 0.4, vzacna: 0.45, legenda: 0.15 }, bonus: [40, 90] },
  { id: "legendarni", nazev: "Legendární truhla", jak: "Za zlepšení v testu nanečisto oproti minulému", cena: null,
    sance: { bezna: 0, neobvykla: 0, vzacna: 0, legenda: 1 }, bonus: [50, 100] },
  { id: "sezonni", nazev: "Sezónní truhla", jak: "Jen v sezóně, padají z ní jen sezónní věci", cena: 250,
    sance: { bezna: 0, neobvykla: 0.55, vzacna: 0.35, legenda: 0.1 }, bonus: [10, 30] },
  { id: "krystalova", nazev: "Krystalová truhla", jak: "Kdykoli za krystaly", cena: 100,
    sance: { bezna: 0.62, neobvykla: 0.28, vzacna: 0.08, legenda: 0.02 }, bonus: [5, 20] },
  { id: "velka", nazev: "Velká truhla", jak: "Aspoň neobvyklá odměna", cena: 350,
    sance: { bezna: 0, neobvykla: 0.7, vzacna: 0.24, legenda: 0.06 }, bonus: [10, 40] },
  { id: "mistrovska", nazev: "Mistrovská truhla", jak: "Aspoň vzácná odměna, nejvyšší šance na legendární", cena: 900,
    sance: { bezna: 0, neobvykla: 0, vzacna: 0.8, legenda: 0.2 }, bonus: [20, 60] },
  { id: "zlata", nazev: "Zlatá truhla", jak: "Za 5 dní tréninku v jednom týdnu", cena: null,
    sance: { bezna: 0, neobvykla: 0.6, vzacna: 0.32, legenda: 0.08 }, bonus: [30, 80] },
];

export const POJISTKA_VZACNA = 10;
export const POJISTKA_LEGENDA = 30;
/** Za věc, kterou už žák má, se vrátí krystaly. */
export const VRACENI: Record<Vzacnost, number> = { bezna: 50, neobvykla: 120, vzacna: 300, legenda: 600 };

// ── Krystaly za učení ───────────────────────────────────────────────────────

export const DENNI_STROP = 250;
export const ZA_TRENINK = 10;
export const ZA_BOD_ODHADU = 30;
export const DNU_PRO_ZLATOU = 5;
/** Odpověď rychlejší než tohle u úlohy s výběrem je spíš tip naslepo. */
export const MIN_MS_VYBER = 3000;

/**
 * Krystaly za jednu odpověď.
 * @param obtiznost úroveň příkladu (1–3)
 * @param uroven nejvyšší odemčená úroveň žáka v tématu (1–3)
 * @param ms jak dlouho žák odpovídal
 * @param vyber úloha s výběrem odpovědi (dá se hádat)
 */
export function krystalyZaOdpoved(spravne: boolean, obtiznost: number, uroven: number, ms: number | null, vyber: boolean): number {
  if (!spravne) return 0;
  if (vyber && ms !== null && ms < MIN_MS_VYBER) return 0;
  if (obtiznost >= 3) return 4;
  if (obtiznost < uroven) return 1;
  return 2;
}

// ── Stav ────────────────────────────────────────────────────────────────────

/** n odpovědí, ok správně, m splněných misí, tr otevřených truhel (pro týdenní e-mail rodičům). */
export interface DenStat { n: number; ok: number; m?: number; tr?: number }

/** Dnešní mise: postup se počítá jen pro dnešek. */
export interface MiseStav { d: string; hotove: string[]; serie: number; maxSerie: number; tezke: number }

export interface SbirkaStav {
  v: 1;
  ziskano: number;
  utraceno: number;
  mam: string[];
  nasazeno: Partial<Record<Trida, Partial<Record<TypOdmeny, string>>>>;
  /** Kolik krystalů žák dnes získal učením (kvůli stropu). */
  dnes: { d: string; k: number };
  /** Den, kdy dokončil trénink (odemyká denní truhlu), a den, kdy ji otevřel. */
  denniOdemcena: string | null;
  denniOtevrena: string | null;
  /** Dny s dokončeným tréninkem (posledních ~21) pro zlatou truhlu. */
  dnyTreninku: string[];
  /** Pondělí týdne, za který už zlatou truhlu otevřel. */
  zlataOtevrena: string | null;
  bezVzacne: number;
  bezLegendy: number;
  otevreno: number;
  /** Nejvyšší dosažený odhad bodů podle třídy (Hexík roste, krystaly jen za nový rekord). */
  maxOdhad: Partial<Record<Trida, number>>;
  /** Statistika po dnech (posledních 60) pro admin a ověření, že odměny pomáhají. */
  dny: Record<string, DenStat>;
  /**
   * Nároky na truhly za splněné úkoly: za co už je žák dostal (klíče „tema:…“, „plan:…“, „gen:2026-12-12“,
   * „zlepseni:…“) a kolik jich otevřel. K otevření = počet klíčů − otevřeno.
   */
  naroky: Partial<Record<NarokTruhla, string[]>>;
  otevrenoNaroku: Partial<Record<NarokTruhla, number>>;
  mise: MiseStav;
  /** Boss týdne: pondělí týdnů, kdy žák bojoval, a kdy vyhrál. */
  boss: { pokusy: string[]; porazeno: string[] };
  /** Získané trofeje: id → den získání. */
  trofeje: Record<string, string>;
  /** Výsledky testů nanečisto, které žák uplatnil (den → body, null = body neznáme). */
  testy: Record<string, number | null>;
  /** Dokončené sady: id → den (bonus krystalů se připíše jen jednou). */
  sady: Record<string, string>;
  /** Kdy se stav naposledy změnil (ms) — při slučování vyhrává novější u nasazení a pojistky. */
  t: number;
}

export const SBIRKA_KEY = "matemax-sbirka";
export const SBIRKA_EVENT = "matemax-sbirka";

export function vychoziStav(): SbirkaStav {
  return {
    v: 1, ziskano: 0, utraceno: 0, mam: [], nasazeno: {}, dnes: { d: "", k: 0 },
    denniOdemcena: null, denniOtevrena: null, dnyTreninku: [], zlataOtevrena: null,
    bezVzacne: 0, bezLegendy: 0, otevreno: 0, maxOdhad: {}, dny: {},
    naroky: {}, otevrenoNaroku: {}, mise: { d: "", hotove: [], serie: 0, maxSerie: 0, tezke: 0 },
    boss: { pokusy: [], porazeno: [] }, trofeje: {}, testy: {}, sady: {}, t: 0,
  };
}

export function krystaly(s: SbirkaStav): number {
  return Math.max(0, s.ziskano - s.utraceno);
}

export function maOdmenu(s: SbirkaStav, o: Odmena): boolean {
  return o.cena === 0 || s.mam.includes(o.id);
}

export function nasazena(s: SbirkaStav, trida: Trida, typ: TypOdmeny): Odmena {
  const id = s.nasazeno[trida]?.[typ];
  const o = id ? najdiOdmenu(id) : undefined;
  if (o && maOdmenu(s, o)) return o;
  return ODMENY[trida].find((x) => x.typ === typ && x.cena === 0)!;
}

export function nactiSbirku(): SbirkaStav {
  if (typeof window === "undefined") return vychoziStav();
  try {
    const raw = localStorage.getItem(SBIRKA_KEY);
    if (raw) return { ...vychoziStav(), ...(JSON.parse(raw) as Partial<SbirkaStav>) };
  } catch { /* poškozená data: začni znovu */ }
  return vychoziStav();
}

export function ulozSbirku(s: SbirkaStav): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(SBIRKA_KEY, JSON.stringify(s)); } catch { /* plné úložiště */ }
  window.dispatchEvent(new Event(SBIRKA_EVENT));
}

/** Nově získané trofeje (detail: { ids }) — stránka je ohlásí. */
export const TROFEJ_EVENT = "matemax-trofej";

/** Nově dokončené sady (detail: { ids, krystaly }) — stránka je ohlásí. */
export const SADA_EVENT = "matemax-sada";

/** Sady a trofeje se dopočítávají po každé změně stavu (nejdřív sady, protože z nich jsou i trofeje). */
function dopocitej(s: SbirkaStav): { s: SbirkaStav; sady: string[]; bonus: number; trofeje: string[] } {
  const den = localDateStr();
  const sd = zapisSady(s, den);
  const tr = zapisTrofeje(sd.s, den);
  return { s: tr.s, sady: sd.vysledek.ids, bonus: sd.vysledek.krystaly, trofeje: tr.vysledek };
}

function ohlas(d: { sady: string[]; bonus: number; trofeje: string[] }) {
  if (d.sady.length > 0) window.dispatchEvent(new CustomEvent(SADA_EVENT, { detail: { ids: d.sady, krystaly: d.bonus } }));
  if (d.trofeje.length > 0) window.dispatchEvent(new CustomEvent(TROFEJ_EVENT, { detail: { ids: d.trofeje } }));
}

/** Načte, upraví a uloží stav jedním krokem. Při každé změně doplní dokončené sady a nově splněné trofeje. */
export function upravSbirku<T>(fn: (s: SbirkaStav) => { s: SbirkaStav; vysledek: T }): T {
  const { s, vysledek } = fn(nactiSbirku());
  const d = dopocitej(s);
  ulozSbirku({ ...d.s, t: Date.now() });
  ohlas(d);
  return vysledek;
}

/** Dopočítá sady a trofeje pro stav, který se od jejich zavedení nezměnil (volá se při otevření Sbírky). */
export function zkontrolujTrofeje(): void {
  if (typeof window === "undefined") return;
  const d = dopocitej(nactiSbirku());
  if (d.sady.length === 0 && d.trofeje.length === 0) return;
  ulozSbirku({ ...d.s, t: Date.now() });
  ohlas(d);
}

// ── Čisté operace (testované v e2e/sbirka.spec.ts) ──────────────────────────

/** Připíše krystaly za učení s denním stropem. Vrací, kolik se opravdu připsalo. */
export function pripis(s: SbirkaStav, n: number, den: string): { s: SbirkaStav; vysledek: number } {
  const dnes = s.dnes.d === den ? s.dnes : { d: den, k: 0 };
  const lze = Math.max(0, Math.min(n, DENNI_STROP - dnes.k));
  return { s: { ...s, ziskano: s.ziskano + lze, dnes: { d: den, k: dnes.k + lze } }, vysledek: lze };
}

/** Zapíše odpověď do denní statistiky (počítá se každá odpověď, i bez krystalů). */
export function zapisOdpoved(s: SbirkaStav, spravne: boolean, den: string): SbirkaStav {
  const d = s.dny[den] ?? { n: 0, ok: 0 };
  const dny = { ...s.dny, [den]: { ...d, n: d.n + 1, ok: d.ok + (spravne ? 1 : 0) } };
  const klice = Object.keys(dny).sort();
  for (const k of klice.slice(0, Math.max(0, klice.length - 60))) delete dny[k];
  return { ...s, dny };
}

/** Pondělí týdne daného dne (YYYY-MM-DD). */
export function pondeli(den: string): string {
  const [y, m, d] = den.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const posun = (dt.getDay() + 6) % 7;
  return localDateStr(new Date(y, m - 1, d - posun));
}

export function dnuTentoTyden(s: SbirkaStav, den: string): number {
  const po = pondeli(den);
  return new Set(s.dnyTreninku.filter((d) => d >= po && d <= den)).size;
}

export interface OdmenaZaTrenink { krystaly: number; denniNove: boolean; zlataNove: boolean }

/** Dokončený trénink: +10 jednou denně, odemkne denní truhlu, počítá dny pro zlatou. */
export function dokoncenyTrenink(s: SbirkaStav, den: string): { s: SbirkaStav; vysledek: OdmenaZaTrenink } {
  const prvniDnes = s.denniOdemcena !== den;
  const predTim = dnuTentoTyden(s, den);
  const dnyTreninku = [...new Set([...s.dnyTreninku, den])].sort().slice(-21);
  let dalsi: SbirkaStav = { ...s, denniOdemcena: den, dnyTreninku };
  let k = 0;
  if (prvniDnes) { const r = pripis(dalsi, ZA_TRENINK, den); dalsi = r.s; k = r.vysledek; }
  const ted = dnuTentoTyden(dalsi, den);
  const zlataNove = predTim < DNU_PRO_ZLATOU && ted >= DNU_PRO_ZLATOU && dalsi.zlataOtevrena !== pondeli(den);
  return { s: dalsi, vysledek: { krystaly: k, denniNove: prvniDnes && dalsi.denniOtevrena !== den, zlataNove } };
}

/** Nový rekord odhadu bodů: +30 za každý bod nad dosavadní maximum. První měření jen nastaví základ. */
export function zapocitejOdhad(s: SbirkaStav, trida: Trida, celkem: number, den: string): { s: SbirkaStav; vysledek: number } {
  const dosud = s.maxOdhad[trida];
  if (dosud === undefined) return { s: { ...s, maxOdhad: { ...s.maxOdhad, [trida]: celkem } }, vysledek: 0 };
  if (celkem <= dosud) return { s, vysledek: 0 };
  const r = pripis({ ...s, maxOdhad: { ...s.maxOdhad, [trida]: celkem } }, (celkem - dosud) * ZA_BOD_ODHADU, den);
  return r;
}

export type Dostupnost = { ok: true } | { ok: false; proc: string };

export function dostupnostTruhly(s: SbirkaStav, id: TruhlaId, den: string): Dostupnost {
  const t = TRUHLY.find((x) => x.id === id)!;
  if (id === "denni") {
    if (s.denniOtevrena === den) return { ok: false, proc: "Dnes už otevřená. Zítra zase." };
    if (s.denniOdemcena !== den) return { ok: false, proc: "Dokonči dnešní trénink." };
    return { ok: true };
  }
  if ((NAROKOVE_TRUHLY as string[]).includes(id)) {
    if (naroku(s, id as NarokTruhla) > 0) return { ok: true };
    return { ok: false, proc: id === "doporuceni" ? "Zvládni doporučené téma." : id === "generalka" ? "Napiš test nanečisto." : "Zlepši se v dalším testu nanečisto." };
  }
  if (id === "zlata") {
    if (s.zlataOtevrena === pondeli(den)) return { ok: false, proc: "Tento týden už otevřená." };
    const n = dnuTentoTyden(s, den);
    if (n < DNU_PRO_ZLATOU) return { ok: false, proc: `Trénuj ${DNU_PRO_ZLATOU} dní v týdnu (zatím ${n}).` };
    return { ok: true };
  }
  if (id === "sezonni" && !aktualniSezona(den)) return { ok: false, proc: "Sezóna právě neběží." };
  if (t.cena !== null && krystaly(s) < t.cena) return { ok: false, proc: `Chybí ${t.cena - krystaly(s)} krystalů.` };
  return { ok: true };
}

export interface VysledekTruhly { odmena: Odmena | null; vz: Vzacnost; nova: boolean; krystaly: number }

/** Losování vzácnosti s pojistkou. `rnd` vrací čísla 0–1 (v testu se podstrčí). */
export function losujVzacnost(s: SbirkaStav, t: Truhla, rnd: () => number): Vzacnost {
  if (s.bezLegendy >= POJISTKA_LEGENDA - 1) return "legenda";
  if (s.bezVzacne >= POJISTKA_VZACNA - 1) return rnd() < 0.15 ? "legenda" : "vzacna";
  const r = rnd();
  const { legenda, vzacna, neobvykla } = t.sance;
  if (r < legenda) return "legenda";
  if (r < legenda + vzacna) return "vzacna";
  if (r < legenda + vzacna + neobvykla) return "neobvykla";
  return "bezna";
}

export function otevriTruhlu(s: SbirkaStav, id: TruhlaId, trida: Trida, den: string, rnd: () => number = Math.random): { s: SbirkaStav; vysledek: VysledekTruhly | null } {
  if (!dostupnostTruhly(s, id, den).ok) return { s, vysledek: null };
  const t = TRUHLY.find((x) => x.id === id)!;
  let dalsi: SbirkaStav = { ...s, otevreno: s.otevreno + 1 };
  if (t.cena !== null) dalsi.utraceno += t.cena;
  if (id === "denni") dalsi.denniOtevrena = den;
  if (id === "zlata") dalsi.zlataOtevrena = pondeli(den);
  if ((NAROKOVE_TRUHLY as string[]).includes(id)) {
    const n = id as NarokTruhla;
    dalsi.otevrenoNaroku = { ...(s.otevrenoNaroku ?? {}), [n]: (s.otevrenoNaroku?.[n] ?? 0) + 1 };
  }
  const dd = s.dny[den] ?? { n: 0, ok: 0 };
  dalsi.dny = { ...s.dny, [den]: { ...dd, tr: (dd.tr ?? 0) + 1 } };

  const vz = losujVzacnost(s, t, rnd);
  dalsi.bezVzacne = vz === "vzacna" || vz === "legenda" ? 0 : s.bezVzacne + 1;
  dalsi.bezLegendy = vz === "legenda" ? 0 : s.bezLegendy + 1;

  // V běžných truhlách padá všechno, co je teď v nabídce (sezónní věci jen v sezóně);
  // sezónní truhla dává jen věci aktuální sezóny (když v losované vzácnosti žádná není, bere jakoukoli sezónní).
  const sez = aktualniSezona(den)?.id;
  const vNabidce = ODMENY[trida].filter((o) => o.cena !== 0 && !o.zdroj && jeVNabidce(o, den) && (id !== "sezonni" || o.sezona === sez));
  const pool = vNabidce.filter((o) => o.vz === vz).length > 0 || id !== "sezonni" ? vNabidce.filter((o) => o.vz === vz) : vNabidce;
  const nove = pool.filter((o) => !dalsi.mam.includes(o.id));
  const vyber = nove.length ? nove : pool;
  const odmena = vyber.length ? vyber[Math.floor(rnd() * vyber.length) % vyber.length] : null;
  const bonus = t.bonus[0] + Math.floor(rnd() * (t.bonus[1] - t.bonus[0] + 1));
  let k = bonus;
  const nova = !!odmena && nove.length > 0;
  if (odmena && nova) dalsi = { ...dalsi, mam: [...dalsi.mam, odmena.id] };
  else k += VRACENI[vz];
  // Krystaly z truhly nepodléhají dennímu stropu (strop hlídá jen krystaly za učení).
  dalsi.ziskano += k;
  return { s: dalsi, vysledek: { odmena, vz, nova, krystaly: k } };
}

export function kupOdmenu(s: SbirkaStav, id: string, den: string = localDateStr()): { s: SbirkaStav; vysledek: boolean } {
  const o = najdiOdmenu(id);
  if (!o || maOdmenu(s, o) || o.cena === null || krystaly(s) < o.cena || !jeVNabidce(o, den)) return { s, vysledek: false };
  return { s: { ...s, utraceno: s.utraceno + o.cena, mam: [...s.mam, o.id] }, vysledek: true };
}

export function nasadOdmenu(s: SbirkaStav, id: string): { s: SbirkaStav; vysledek: boolean } {
  const o = najdiOdmenu(id);
  if (!o || !maOdmenu(s, o)) return { s, vysledek: false };
  return { s: { ...s, nasazeno: { ...s.nasazeno, [o.trida]: { ...(s.nasazeno[o.trida] ?? {}), [o.typ]: o.id } } }, vysledek: true };
}

/** Sloučení dvou zařízení (prohlížeč a záloha na serveru). */
export function slucSbirku(a: SbirkaStav, b: SbirkaStav): SbirkaStav {
  const novejsi = b.t > a.t ? b : a;
  const dny: Record<string, DenStat> = { ...a.dny };
  for (const [d, x] of Object.entries(b.dny ?? {})) {
    const y = dny[d];
    dny[d] = !y ? x : { n: Math.max(x.n, y.n), ok: Math.max(x.ok, y.ok), m: Math.max(x.m ?? 0, y.m ?? 0), tr: Math.max(x.tr ?? 0, y.tr ?? 0) };
  }
  const ma = a.mise ?? vychoziStav().mise, mb = b.mise ?? vychoziStav().mise;
  const mise: MiseStav = ma.d === mb.d
    ? { d: ma.d, hotove: [...new Set([...ma.hotove, ...mb.hotove])], serie: Math.max(ma.serie, mb.serie), maxSerie: Math.max(ma.maxSerie, mb.maxSerie), tezke: Math.max(ma.tezke, mb.tezke) }
    : (ma.d > mb.d ? ma : mb);
  const pozdeji = (x: string | null, y: string | null) => (!x ? y : !y ? x : x > y ? x : y);
  const dnes = a.dnes.d === b.dnes.d ? { d: a.dnes.d, k: Math.max(a.dnes.k, b.dnes.k) } : (a.dnes.d > b.dnes.d ? a.dnes : b.dnes);
  const maxOdhad: Partial<Record<Trida, number>> = { ...a.maxOdhad };
  for (const t of [5, 9] as Trida[]) {
    const x = a.maxOdhad[t], y = b.maxOdhad[t];
    if (x !== undefined || y !== undefined) maxOdhad[t] = Math.max(x ?? 0, y ?? 0);
  }
  return {
    v: 1,
    ziskano: Math.max(a.ziskano, b.ziskano),
    utraceno: Math.max(a.utraceno, b.utraceno),
    mam: [...new Set([...a.mam, ...b.mam])],
    nasazeno: novejsi.nasazeno,
    dnes,
    denniOdemcena: pozdeji(a.denniOdemcena, b.denniOdemcena),
    denniOtevrena: pozdeji(a.denniOtevrena, b.denniOtevrena),
    dnyTreninku: [...new Set([...a.dnyTreninku, ...b.dnyTreninku])].sort().slice(-21),
    zlataOtevrena: pozdeji(a.zlataOtevrena, b.zlataOtevrena),
    bezVzacne: novejsi.bezVzacne,
    bezLegendy: novejsi.bezLegendy,
    otevreno: Math.max(a.otevreno, b.otevreno),
    maxOdhad,
    dny,
    naroky: Object.fromEntries(NAROKOVE_TRUHLY.map((n) => [n, [...new Set([...(a.naroky?.[n] ?? []), ...(b.naroky?.[n] ?? [])])]])),
    otevrenoNaroku: Object.fromEntries(NAROKOVE_TRUHLY.map((n) => [n, Math.max(a.otevrenoNaroku?.[n] ?? 0, b.otevrenoNaroku?.[n] ?? 0)])),
    mise,
    boss: {
      pokusy: [...new Set([...(a.boss?.pokusy ?? []), ...(b.boss?.pokusy ?? [])])].sort().slice(-60),
      porazeno: [...new Set([...(a.boss?.porazeno ?? []), ...(b.boss?.porazeno ?? [])])].sort(),
    },
    trofeje: Object.fromEntries([...new Set([...Object.keys(a.trofeje ?? {}), ...Object.keys(b.trofeje ?? {})])].map((k) => {
      const x = a.trofeje?.[k], y = b.trofeje?.[k];
      return [k, !x ? y! : !y ? x : x < y ? x : y];
    })),
    testy: { ...(a.testy ?? {}), ...Object.fromEntries(Object.entries(b.testy ?? {}).map(([d, v]) => [d, v ?? a.testy?.[d] ?? null])) },
    sady: Object.fromEntries([...new Set([...Object.keys(a.sady ?? {}), ...Object.keys(b.sady ?? {})])].map((k) => {
      const x = a.sady?.[k], y = b.sady?.[k];
      return [k, !x ? y! : !y ? x : x < y ? x : y];
    })),
    t: Math.max(a.t, b.t),
  };
}

// ── Hexík roste s odhadem bodů ──────────────────────────────────────────────

export const ETAPY_HEXIKA = [
  { od: 0, nazev: "Nováček", doplnek: "základní Hexík" },
  { od: 15, nazev: "Učeň", doplnek: "hvězdička" },
  { od: 25, nazev: "Zkušený", doplnek: "šála" },
  { od: 35, nazev: "Expert", doplnek: "zlatá aura" },
  { od: 43, nazev: "Mistr přijímaček", doplnek: "koruna" },
];

/** Etapa 1–5 podle nejvyššího dosaženého odhadu (podoba se nikdy nevezme zpátky). */
export function etapaHexika(maxOdhad: number | undefined): number {
  const b = maxOdhad ?? 0;
  return ETAPY_HEXIKA.reduce((a, e, i) => (b >= e.od ? i + 1 : a), 1);
}

// ── Nároky na truhly (doporučení, Generálka, legendární za zlepšení) ────────

/** Kolik truhel daného druhu čeká na otevření. */
export function naroku(s: SbirkaStav, t: NarokTruhla): number {
  return Math.max(0, (s.naroky?.[t] ?? []).length - (s.otevrenoNaroku?.[t] ?? 0));
}

/** Přidá nárok na truhlu za úkol s klíčem `klic` (každý úkol jen jednou). Vrací true, když je nový. */
export function ziskejNarok(s: SbirkaStav, t: NarokTruhla, klic: string): { s: SbirkaStav; vysledek: boolean } {
  const klice = s.naroky?.[t] ?? [];
  if (klice.includes(klic)) return { s, vysledek: false };
  return { s: { ...s, naroky: { ...(s.naroky ?? {}), [t]: [...klice, klic] } }, vysledek: true };
}

export const doporuceniKOtevreni = (s: SbirkaStav) => naroku(s, "doporuceni");

/**
 * Žák splnil doporučení (téma přes práh zvládnutí v tréninku, splněný plán po testu nanečisto).
 * Za každé doporučení jen jednou. Vrací true, když přibyla nová truhla.
 */
export function ziskejDoporuceni(s: SbirkaStav, klic: string): { s: SbirkaStav; vysledek: boolean } {
  return ziskejNarok(s, "doporuceni", klic);
}

// ── Test nanečisto (Generálka) ──────────────────────────────────────────────

export interface OdmenaZaTest { novy: boolean; zlepseni: boolean; pozadi: boolean }

/**
 * Žák napsal test nanečisto ze dne `den` (ověřeno kódem z učebny, výsledkem z appky Vyhodnocení
 * nebo podepsaným odkazem na doporučení). Za každý test Truhla Generálka, za první test pozadí Generálka
 * a za lepší výsledek než v předchozím testu Legendární truhla.
 */
export function zapocitejTest(s: SbirkaStav, trida: Trida, den: string, body: number | null = null): { s: SbirkaStav; vysledek: OdmenaZaTest } {
  const testy = { ...(s.testy ?? {}) };
  const znamy = den in testy;
  if (body !== null || !znamy) testy[den] = body ?? testy[den] ?? null;
  let dalsi: SbirkaStav = { ...s, testy };
  const g = ziskejNarok(dalsi, "generalka", `gen:${den}`);
  dalsi = g.s;
  const idPozadi = `${trida}-pozadi-generalka`;
  const pozadi = !dalsi.mam.includes(idPozadi);
  if (pozadi) dalsi = { ...dalsi, mam: [...dalsi.mam, idPozadi] };
  // Zlepšení: body tohoto testu > body nejbližšího staršího testu se známými body
  let zlepseni = false;
  const ted = testy[den];
  if (ted !== null && ted !== undefined) {
    const starsi = Object.entries(testy).filter(([d, b]) => d < den && b !== null).sort(([a], [b]) => (a < b ? 1 : -1))[0];
    if (starsi && ted > (starsi[1] as number)) zlepseni = ziskejNarok(dalsi, "legendarni", `zlepseni:${den}`).vysledek;
    if (zlepseni) dalsi = ziskejNarok(dalsi, "legendarni", `zlepseni:${den}`).s;
  }
  return { s: dalsi, vysledek: { novy: g.vysledek, zlepseni, pozadi } };
}

// ── Boss týdne ──────────────────────────────────────────────────────────────

export const ZA_BOSSE = 100;

/** Boss týdne: těžký testový příklad (3. úroveň) stejný pro všechny žáky třídy po celý týden. */
export function vyberBosse<T extends { id: string }>(kandidati: T[], den: string): T | null {
  if (kandidati.length === 0) return null;
  const po = pondeli(den);
  const [y, m, d] = po.split("-").map(Number);
  const tyden = Math.floor(Date.UTC(y, m - 1, d) / (7 * 86400000));
  const serazene = [...kandidati].sort((a, b) => (a.id < b.id ? -1 : 1));
  return serazene[(tyden * 7919) % serazene.length];
}

export type StavBosse = "ceka" | "porazen" | "prohra";

export function stavBosse(s: SbirkaStav, den: string): StavBosse {
  const po = pondeli(den);
  if (s.boss?.porazeno.includes(po)) return "porazen";
  if (s.boss?.pokusy.includes(po)) return "prohra";
  return "ceka";
}

/** Jeden pokus za týden. Výhra = +100 krystalů (mimo denní strop) a trofej. */
export function bojSBossem(s: SbirkaStav, den: string, spravne: boolean): { s: SbirkaStav; vysledek: { vyhra: boolean; krystaly: number } | null } {
  if (stavBosse(s, den) !== "ceka") return { s, vysledek: null };
  const po = pondeli(den);
  const boss = { pokusy: [...(s.boss?.pokusy ?? []), po].slice(-60), porazeno: [...(s.boss?.porazeno ?? []), ...(spravne ? [po] : [])] };
  return { s: { ...s, boss, ziskano: s.ziskano + (spravne ? ZA_BOSSE : 0) }, vysledek: { vyhra: spravne, krystaly: spravne ? ZA_BOSSE : 0 } };
}

// ── Trofeje ─────────────────────────────────────────────────────────────────

export interface Trofej { id: string; nazev: string; popis: string; ikona: string; splneno: (s: SbirkaStav) => boolean }

const dnuSeVsemiMisemi = (s: SbirkaStav) => Object.values(s.dny).filter((d) => (d.m ?? 0) >= 3).length;
const maLegendu = (s: SbirkaStav) => s.mam.some((id) => najdiOdmenu(id)?.vz === "legenda" && !najdiOdmenu(id)?.zdroj);

/** Trofeje se nedají koupit ani vylosovat, jen vybojovat. Přibývají s dalšími etapami. */
export const TROFEJE: Trofej[] = [
  { id: "prvni_truhla", nazev: "První truhla", popis: "Otevři svou první truhlu.", ikona: "🎁", splneno: (s) => s.otevreno >= 1 },
  { id: "splneny_den", nazev: "Splněný den", popis: "Splň za jeden den všechny tři mise.", ikona: "✅", splneno: (s) => dnuSeVsemiMisemi(s) >= 1 },
  { id: "tyden_misi", nazev: "Týden misí", popis: "Splň všechny mise v sedmi různých dnech.", ikona: "📅", splneno: (s) => dnuSeVsemiMisemi(s) >= 7 },
  { id: "zlaty_tyden", nazev: "Zlatý týden", popis: "Otevři zlatou truhlu za 5 dní tréninku v týdnu.", ikona: "🏅", splneno: (s) => !!s.zlataOtevrena },
  { id: "sberatel", nazev: "Sběratel", popis: "Měj 10 věcí ve sbírce.", ikona: "🧺", splneno: (s) => s.mam.length >= 10 },
  { id: "velky_sberatel", nazev: "Velký sběratel", popis: "Měj 25 věcí ve sbírce.", ikona: "🏛️", splneno: (s) => s.mam.length >= 25 },
  { id: "legendarni_nalez", nazev: "Legendární nález", popis: "Získej legendární věc z truhly.", ikona: "🌟", splneno: maLegendu },
  { id: "premozitel", nazev: "Přemožitel bosse", popis: "Poraz bosse týdne.", ikona: "⚔️", splneno: (s) => (s.boss?.porazeno.length ?? 0) >= 1 },
  { id: "lovec_bossu", nazev: "Lovec bossů", popis: "Poraz bosse v pěti různých týdnech.", ikona: "🐉", splneno: (s) => (s.boss?.porazeno.length ?? 0) >= 5 },
  { id: "generalka", nazev: "Generálka", popis: "Napiš test nanečisto.", ikona: "🏫", splneno: (s) => Object.keys(s.testy ?? {}).length >= 1 },
  { id: "ostrileny", nazev: "Ostřílený", popis: "Napiš tři testy nanečisto.", ikona: "🎯", splneno: (s) => Object.keys(s.testy ?? {}).length >= 3 },
  { id: "zlepseni", nazev: "Jdu nahoru", popis: "V testu nanečisto získej víc bodů než minule.", ikona: "📈", splneno: (s) => (s.naroky?.legendarni ?? []).some((k) => k.startsWith("zlepseni:")) },
  { id: "zkuseny_hexik", nazev: "Zkušený Hexík", popis: "Dotáhni odhad bodů na 25.", ikona: "🧣", splneno: (s) => Object.values(s.maxOdhad).some((b) => (b ?? 0) >= 25) },
  { id: "mistr", nazev: "Mistr přijímaček", popis: "Dotáhni odhad bodů na 43.", ikona: "👑", splneno: (s) => Object.values(s.maxOdhad).some((b) => (b ?? 0) >= 43) },
  { id: "prvni_sada", nazev: "První sada", popis: "Dokonči celou sadu.", ikona: "📚", splneno: (s) => Object.keys(s.sady ?? {}).length >= 1 },
  { id: "sberatel_sad", nazev: "Sběratel sad", popis: "Dokonči tři sady.", ikona: "🗂️", splneno: (s) => Object.keys(s.sady ?? {}).length >= 3 },
  { id: "sezonni", nazev: "Sezónní sběratel", popis: "Získej věc ze sezóny.", ikona: "🎄", splneno: (s) => s.mam.some((id) => !!najdiOdmenu(id)?.sezona) },
];

/** Doplní nově splněné trofeje. Volá se při každé změně stavu (upravSbirku). */
export function zapisTrofeje(s: SbirkaStav, den: string): { s: SbirkaStav; vysledek: string[] } {
  const mam = s.trofeje ?? {};
  const nove = TROFEJE.filter((t) => !mam[t.id] && t.splneno(s)).map((t) => t.id);
  if (nove.length === 0) return { s, vysledek: [] };
  return { s: { ...s, trofeje: { ...mam, ...Object.fromEntries(nove.map((id) => [id, den])) } }, vysledek: nove };
}

/** Témata, která během tréninku přešla přes práh zvládnutí (před → po). */
export function novaZvladnutaTemata(pred: Record<string, number> | null, po: Record<string, number>, prah: number): string[] {
  if (!pred) return [];
  return Object.entries(po).filter(([t, v]) => v >= prah && (pred[t] ?? 0) < prah).map(([t]) => t);
}

// ── Denní mise ──────────────────────────────────────────────────────────────

export const ZA_MISI = 15;
export type MiseId = "trenink" | "spravne10" | "spravne20" | "serie5" | "tezke3";

export const MISE: Record<MiseId, { text: string; cil: number; ikona: string }> = {
  trenink: { text: "Dokonči dnešní trénink", cil: 1, ikona: "🏁" },
  spravne10: { text: "Odpověz správně na 10 příkladů", cil: 10, ikona: "✅" },
  spravne20: { text: "Odpověz správně na 20 příkladů", cil: 20, ikona: "💪" },
  serie5: { text: "Dej 5 správně v řadě", cil: 5, ikona: "🔥" },
  tezke3: { text: "Vyřeš správně 3 příklady 2. nebo 3. úrovně", cil: 3, ikona: "⛰️" },
};

const DVOJICE_MISI: [MiseId, MiseId][] = [
  ["spravne10", "serie5"], ["serie5", "tezke3"], ["spravne10", "tezke3"], ["spravne20", "serie5"], ["tezke3", "spravne20"],
];

/** Tři mise na den: vždy dokončit trénink a k tomu dvě, které se střídají podle data. */
export function dnesniMise(den: string): MiseId[] {
  const [y, m, d] = den.split("-").map(Number);
  const cislo = Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  return ["trenink", ...DVOJICE_MISI[cislo % DVOJICE_MISI.length]];
}

function miseDnes(s: SbirkaStav, den: string): MiseStav {
  return s.mise && s.mise.d === den ? s.mise : { d: den, hotove: [], serie: 0, maxSerie: 0, tezke: 0 };
}

export function jeMiseHotova(s: SbirkaStav, id: MiseId, den: string): boolean {
  return miseDnes(s, den).hotove.includes(id);
}

export function postupMise(s: SbirkaStav, id: MiseId, den: string): number {
  const m = miseDnes(s, den);
  switch (id) {
    case "trenink": return s.denniOdemcena === den ? 1 : 0;
    case "spravne10": case "spravne20": return s.dny[den]?.ok ?? 0;
    case "serie5": return m.maxSerie;
    case "tezke3": return m.tezke;
  }
}

/** Odpověď posune postup misí (série, těžší příklady). */
export function misePriOdpovedi(s: SbirkaStav, spravne: boolean, obtiznost: number, den: string): SbirkaStav {
  const m = miseDnes(s, den);
  const serie = spravne ? m.serie + 1 : 0;
  return { ...s, mise: { ...m, serie, maxSerie: Math.max(m.maxSerie, serie), tezke: m.tezke + (spravne && obtiznost >= 2 ? 1 : 0) } };
}

/** Odškrtne splněné mise a připíše za každou krystaly (v rámci denního stropu). */
export function splnMise(s: SbirkaStav, den: string): { s: SbirkaStav; vysledek: { nove: MiseId[]; krystaly: number } } {
  const m = miseDnes(s, den);
  const nove = dnesniMise(den).filter((id) => !m.hotove.includes(id) && postupMise(s, id, den) >= MISE[id].cil);
  if (nove.length === 0) return { s: { ...s, mise: m }, vysledek: { nove, krystaly: 0 } };
  const dd = s.dny[den] ?? { n: 0, ok: 0 };
  const r = pripis({ ...s, mise: { ...m, hotove: [...m.hotove, ...nove] }, dny: { ...s.dny, [den]: { ...dd, m: (dd.m ?? 0) + nove.length } } }, nove.length * ZA_MISI, den);
  return { s: r.s, vysledek: { nove, krystaly: r.vysledek } };
}

// ── Týden pro e-mail rodičům ────────────────────────────────────────────────

export interface TydenSbirky { dnyTreninku: number; mise: number; truhly: number; krystaly: number; odmen: number }

/** Souhrn týdne (od pondělí do dne) ze zálohy Sbírky na serveru. Bez zálohy null. */
export function tydenSbirky(s: Partial<SbirkaStav> | null | undefined, den: string): TydenSbirky | null {
  if (!s || !s.t) return null;
  const st = { ...vychoziStav(), ...s };
  const po = pondeli(den);
  const dny = Object.entries(st.dny).filter(([d]) => d >= po && d <= den).map(([, x]) => x);
  return {
    dnyTreninku: new Set(st.dnyTreninku.filter((d) => d >= po && d <= den)).size,
    mise: dny.reduce((a, x) => a + (x.m ?? 0), 0),
    truhly: dny.reduce((a, x) => a + (x.tr ?? 0), 0),
    krystaly: krystaly(st),
    odmen: st.mam.length,
  };
}

// -- Sady ----------------------------------------------------------------------

export interface Sada { id: string; trida: Trida; nazev: string; ikona: string; polozky: string[]; bonus: number; sezona?: SezonaId }

const sada = (trida: Trida, id: string, nazev: string, ikona: string, bonus: number, polozky: string[], sezona?: SezonaId): Sada =>
  ({ id: `${trida}-${id}`, trida, nazev, ikona, bonus, polozky: polozky.map((p) => `${trida}-${p}`), ...(sezona ? { sezona } : {}) });

/**
 * Sady: kdo nasbírá všechny věci sady, dostane jednou bonus krystalů (mimo denní strop) a sada se mu
 * v Sbírce zlatě orámuje. Věci se sbírají běžně (truhly, nákup), sada nic neodemyká navíc.
 */
export const SADY: Record<Trida, Sada[]> = {
  5: [
    sada(5, "ovoce", "Ovocný košík", "\u{1F353}", 200, ["podoba-mata", "podoba-malina", "podoba-citron", "podoba-boruvka"]),
    sada(5, "zviratka", "Zvířátka", "\u{1F43E}", 400, ["podoba-kocicka", "podoba-lisak", "podoba-dracek", "podoba-jednorozec"]),
    sada(5, "more", "Pod mořem", "\u{1F420}", 300, ["vzhled-ocean", "pozadi-podmori", "efekt-bubliny"]),
    sada(5, "pohadka", "Pohádka", "\u{1F3F0}", 500, ["pozadi-pohadka", "vzhled-duha", "oslava-piruetka", "efekt-duha"]),
    sada(5, "vanoce", "Vánoce", "\u{1F384}", 300, ["podoba-skritek", "efekt-vlocky", "vzhled-snezeni", "pozadi-vanoce"], "vanoce"),
    sada(5, "zima", "Zima", "❄️", 250, ["podoba-snehulak", "pozadi-ledove"], "zima"),
    sada(5, "finis", "Finiš", "\u{1F3C1}", 300, ["podoba-sampion", "efekt-medaile", "pozadi-cil"], "finis"),
  ],
  9: [
    sada(9, "kyber", "Kyber", "\u{1F916}", 400, ["podoba-neon", "podoba-kyber", "vzhled-matrix", "pozadi-mrizka"]),
    sada(9, "ulice", "Ulice", "\u{1F6F9}", 400, ["podoba-street", "podoba-maskac", "vzhled-mesto", "pozadi-synthwave"]),
    sada(9, "ohen", "Oheň", "\u{1F525}", 500, ["podoba-ohnivy", "efekt-ohen", "efekt-blesky", "pozadi-zapad"]),
    sada(9, "led", "Led", "\u{1F9CA}", 500, ["podoba-ledovy", "vzhled-aurora", "pozadi-polarni"]),
    sada(9, "vanoce", "Vánoce", "\u{1F384}", 300, ["podoba-santa", "efekt-vlocky", "vzhled-snezeni", "pozadi-vanoce"], "vanoce"),
    sada(9, "zima", "Zima", "❄️", 250, ["podoba-yeti", "pozadi-ledove"], "zima"),
    sada(9, "finis", "Finiš", "\u{1F3C1}", 300, ["podoba-finisher", "efekt-medaile", "pozadi-cil"], "finis"),
  ],
};

export function postupSady(s: SbirkaStav, sd: Sada): { mam: number; z: number } {
  return { mam: sd.polozky.filter((id) => s.mam.includes(id)).length, z: sd.polozky.length };
}

/** Připíše bonus za nově dokončené sady (obě třídy, každou sadu jednou). */
export function zapisSady(s: SbirkaStav, den: string): { s: SbirkaStav; vysledek: { ids: string[]; krystaly: number } } {
  const hotove = s.sady ?? {};
  const nove = [...SADY[5], ...SADY[9]].filter((sd) => !hotove[sd.id] && sd.polozky.every((id) => s.mam.includes(id)));
  if (nove.length === 0) return { s, vysledek: { ids: [], krystaly: 0 } };
  const bonus = nove.reduce((a, sd) => a + sd.bonus, 0);
  return {
    s: { ...s, ziskano: s.ziskano + bonus, sady: { ...hotove, ...Object.fromEntries(nove.map((sd) => [sd.id, den])) } },
    vysledek: { ids: nove.map((sd) => sd.id), krystaly: bonus },
  };
}
