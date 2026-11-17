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

// [typ, klíč, název, vzácnost, cena]
type Radek = [TypOdmeny, string, string, Vzacnost, number | null];
const KATALOG: Record<Trida, Radek[]> = {
  5: [
    ["podoba", "klasik", "Hexík", "bezna", 0],
    ["podoba", "mata", "Mátový Hexík", "bezna", 150],
    ["podoba", "malina", "Malinový Hexík", "bezna", 150],
    ["podoba", "citron", "Citronový Hexík", "bezna", 150],
    ["podoba", "kocicka", "Kočičí Hexík", "neobvykla", 400],
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
    ["vzhled", "vesmir", "Vesmír", "vzacna", 900],
    ["vzhled", "duha", "Duhový", "legenda", null],
    ["pozadi", "klasik", "Klasik", "bezna", 0],
    ["pozadi", "tyrkys", "Tyrkys", "bezna", 150],
    ["pozadi", "mraky", "Mraky", "bezna", 150],
    ["pozadi", "dzungle", "Džungle", "neobvykla", 400],
    ["pozadi", "podmori", "Podmoří", "vzacna", 900],
    ["pozadi", "ohnostroj", "Ohňostroj", "legenda", null],
  ],
  9: [
    ["podoba", "klasik", "Hexík", "bezna", 0],
    ["podoba", "grafit", "Grafitový Hexík", "bezna", 150],
    ["podoba", "mata", "Mátový Hexík", "bezna", 150],
    ["podoba", "ohnivy", "Ohnivý Hexík", "bezna", 150],
    ["podoba", "neon", "Neon", "neobvykla", 400],
    ["podoba", "street", "Streetwear", "neobvykla", 400],
    ["podoba", "kyber", "Kyber", "vzacna", 900],
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
    ["vzhled", "aurora", "Aurora", "legenda", null],
    ["pozadi", "klasik", "Klasik", "bezna", 0],
    ["pozadi", "tyrkys", "Tyrkys", "bezna", 150],
    ["pozadi", "mrizka", "Mřížka", "bezna", 150],
    ["pozadi", "zapad", "Západ slunce", "neobvykla", 400],
    ["pozadi", "synthwave", "Synthwave", "vzacna", 900],
    ["pozadi", "polarni", "Polární záře", "legenda", null],
  ],
};

export const ODMENY: Record<Trida, Odmena[]> = {
  5: KATALOG[5].map(([typ, klic, nazev, vz, cena]) => ({ id: `5-${typ}-${klic}`, trida: 5, typ, klic, nazev, vz, cena })),
  9: KATALOG[9].map(([typ, klic, nazev, vz, cena]) => ({ id: `9-${typ}-${klic}`, trida: 9, typ, klic, nazev, vz, cena })),
};

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
export const TMAVE_VZHLEDY = new Set(["grafit", "vesmir", "mesto", "aurora"]);

export const IKONA_ODMENY: Record<string, string> = {
  radost: "🙌", poskok: "🦘", tanec: "💃", kotrmelec: "🤸", salto: "🤸", teleport: "🌀", disco: "🪩", piruetka: "🌈",
  jiskry: "✨", srdicka: "💖", pixely: "🟪", konfety: "🎊", bubliny: "🫧", hvezdy: "⭐", duha: "🌈", blesky: "⚡", ohen: "🔥",
};

// ── Truhly ──────────────────────────────────────────────────────────────────

export type TruhlaId = "denni" | "doporuceni" | "krystalova" | "velka" | "mistrovska" | "zlata";
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
  /** Za co už žák Truhlu doporučení dostal (klíče „tema:…“, „plan:…“) a kolik jich otevřel. */
  doporuceniKlice: string[];
  doporuceniOtevreno: number;
  mise: MiseStav;
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
    doporuceniKlice: [], doporuceniOtevreno: 0, mise: { d: "", hotove: [], serie: 0, maxSerie: 0, tezke: 0 }, t: 0,
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

/** Načte, upraví a uloží stav jedním krokem. */
export function upravSbirku<T>(fn: (s: SbirkaStav) => { s: SbirkaStav; vysledek: T }): T {
  const { s, vysledek } = fn(nactiSbirku());
  ulozSbirku({ ...s, t: Date.now() });
  return vysledek;
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
  if (id === "doporuceni") {
    if (doporuceniKOtevreni(s) <= 0) return { ok: false, proc: "Zvládni doporučené téma." };
    return { ok: true };
  }
  if (id === "zlata") {
    if (s.zlataOtevrena === pondeli(den)) return { ok: false, proc: "Tento týden už otevřená." };
    const n = dnuTentoTyden(s, den);
    if (n < DNU_PRO_ZLATOU) return { ok: false, proc: `Trénuj ${DNU_PRO_ZLATOU} dní v týdnu (zatím ${n}).` };
    return { ok: true };
  }
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
  if (id === "doporuceni") dalsi.doporuceniOtevreno = (s.doporuceniOtevreno ?? 0) + 1;
  const dd = s.dny[den] ?? { n: 0, ok: 0 };
  dalsi.dny = { ...s.dny, [den]: { ...dd, tr: (dd.tr ?? 0) + 1 } };

  const vz = losujVzacnost(s, t, rnd);
  dalsi.bezVzacne = vz === "vzacna" || vz === "legenda" ? 0 : s.bezVzacne + 1;
  dalsi.bezLegendy = vz === "legenda" ? 0 : s.bezLegendy + 1;

  const pool = ODMENY[trida].filter((o) => o.vz === vz && o.cena !== 0);
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

export function kupOdmenu(s: SbirkaStav, id: string): { s: SbirkaStav; vysledek: boolean } {
  const o = najdiOdmenu(id);
  if (!o || maOdmenu(s, o) || o.cena === null || krystaly(s) < o.cena) return { s, vysledek: false };
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
    doporuceniKlice: [...new Set([...(a.doporuceniKlice ?? []), ...(b.doporuceniKlice ?? [])])],
    doporuceniOtevreno: Math.max(a.doporuceniOtevreno ?? 0, b.doporuceniOtevreno ?? 0),
    mise,
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

// ── Truhla doporučení ───────────────────────────────────────────────────────

export function doporuceniKOtevreni(s: SbirkaStav): number {
  return Math.max(0, (s.doporuceniKlice ?? []).length - (s.doporuceniOtevreno ?? 0));
}

/**
 * Žák splnil doporučení (téma přes práh zvládnutí v tréninku, splněný plán po testu nanečisto).
 * Za každé doporučení jen jednou. Vrací true, když přibyla nová truhla.
 */
export function ziskejDoporuceni(s: SbirkaStav, klic: string): { s: SbirkaStav; vysledek: boolean } {
  const klice = s.doporuceniKlice ?? [];
  if (klice.includes(klic)) return { s, vysledek: false };
  return { s: { ...s, doporuceniKlice: [...klice, klic] }, vysledek: true };
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
