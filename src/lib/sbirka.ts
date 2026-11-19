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

export type TypOdmeny = "podoba" | "oslava" | "efekt" | "vzhled" | "pozadi" | "hlava" | "oci" | "krk" | "ruce" | "nohy";
/** Doplňky na sloty: nasazují se na jakoukoli podobu Hexíka (3D). */
export const SLOTY = ["hlava", "oci", "krk", "ruce", "nohy"] as const;
export type Slot = (typeof SLOTY)[number];
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
  /**
   * Odkud jinak než z truhel (v truhlách pak nepadá a nejde koupit):
   * "test" = jen za test nanečisto, "uroven" = dostane ji každý, kdo dosáhne XP úrovně `uroven`.
   */
  zdroj?: "test" | "uroven" | "kalendar";
  /** U odměny za úroveň: číslo XP úrovně, na které se odemkne. */
  uroven?: number;
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
  hlava: "Na hlavu",
  oci: "Na oči",
  krk: "Na krk",
  ruce: "Na ruce",
  nohy: "Na nohy",
};

// [typ, klíč, název, vzácnost, cena, zdroj nebo sezóna?]  „u10“ = odměna za XP úroveň 10
type Radek = [TypOdmeny, string, string, Vzacnost, number | null, ("test" | "kalendar" | SezonaId | `u${number}`)?];
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
    // za XP úrovně
    ["efekt", "notky", "Notičky", "bezna", null, "u3"],
    ["pozadi", "duhova", "Duhová louka", "neobvykla", null, "u5"],
    ["podoba", "vcelka", "Včelka", "neobvykla", null, "u8"],
    ["vzhled", "les", "Kouzelný les", "neobvykla", null, "u10"],
    ["efekt", "motylci", "Motýlci", "vzacna", null, "u13"],
    ["pozadi", "zamek", "Zámek v oblacích", "vzacna", null, "u16"],
    ["podoba", "kralovsky", "Královský Hexík", "vzacna", null, "u20"],
    ["vzhled", "vata", "Cukrová vata", "vzacna", null, "u25"],
    ["podoba", "duhovy", "Duhový Hexík", "legenda", null, "u30"],
    // doplňky na sloty
    ["hlava", "nic", "Bez doplňku", "bezna", 0],
    ["hlava", "masle", "Mašle", "bezna", 150],
    ["hlava", "venecek", "Květinový věneček", "neobvykla", 400],
    ["hlava", "sluchatka", "Sluchátka", "neobvykla", 400],
    ["hlava", "klobouk", "Čarodějný klobouk", "vzacna", 900],
    ["hlava", "koruna", "Korunka", "legenda", null],
    ["hlava", "cepice", "Vánoční čepice", "neobvykla", 400, "vanoce"],
    ["hlava", "kulich", "Kulich", "neobvykla", 400, "zima"],
    ["oci", "nic", "Bez brýlí", "bezna", 0],
    ["oci", "bryle", "Kulaté brýle", "bezna", 150],
    ["oci", "srdce", "Srdíčkové brýle", "neobvykla", 400],
    ["oci", "hvezdicky", "Hvězdné brýle", "vzacna", 900],
    ["krk", "nic", "Nic na krku", "bezna", 0],
    ["krk", "motylek", "Motýlek", "bezna", 150],
    ["krk", "sala", "Pletená šála", "neobvykla", 400],
    ["krk", "medaile", "Zlatá medaile", "vzacna", 900],
    // ruce a nohy (Karel schválil 19. 11. 2026): palčáky, zimní boty a brusle jen v sezóně Zima
    ["ruce", "nic", "Ručičky", "bezna", 0],
    ["ruce", "naramek", "Přátelský náramek", "bezna", 150],
    ["ruce", "palcaky", "Palčáky", "bezna", 150, "zima"],
    ["ruce", "boxerske", "Boxerské rukavice", "neobvykla", 400],
    ["ruce", "superhrdina", "Rukavice superhrdiny", "vzacna", 900],
    ["ruce", "kouzelnicke", "Kouzelnické rukavice", "legenda", null],
    ["nohy", "nic", "Botičky", "bezna", 0],
    ["nohy", "tenisky", "Tenisky", "bezna", 150],
    ["nohy", "zimni", "Zimní boty", "bezna", 150, "zima"],
    ["nohy", "kopacky", "Kopačky", "neobvykla", 400],
    ["nohy", "brusle", "Brusle", "vzacna", 900, "zima"],
    ["nohy", "raketove", "Raketové boty", "legenda", null],
    // tanečky za XP úrovně
    ["oslava", "robot", "Robot", "neobvykla", null, "u6"],
    ["oslava", "vlnka", "Vlnka", "neobvykla", null, "u12"],
    ["oslava", "pirueta", "Dvojitá pirueta", "vzacna", null, "u18"],
    ["oslava", "breakdance", "Breakdance", "vzacna", null, "u22"],
    ["oslava", "hvezdne", "Hvězdné salto", "legenda", null, "u28"],
    // adventní kalendář (jen z kalendáře, 1.–24. 12.)
    ["hlava", "parohy", "Sobí parohy", "neobvykla", null, "kalendar"],
    ["krk", "svetr", "Vánoční svetr", "neobvykla", null, "kalendar"],
    ["efekt", "koule", "Sněhové koule", "neobvykla", null, "kalendar"],
    ["pozadi", "svetylka", "Adventní světýlka", "vzacna", null, "kalendar"],
    ["podoba", "pernicek", "Perníčkový Hexík", "vzacna", null, "kalendar"],
    ["oslava", "rolnicky", "Rolničky", "vzacna", null, "kalendar"],
    ["hlava", "hvezda", "Zlatá hvězda", "legenda", null, "kalendar"],
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
    // za XP úrovně
    ["efekt", "binar", "Binárka", "bezna", null, "u3"],
    ["pozadi", "beton", "Beton", "neobvykla", null, "u5"],
    ["podoba", "toxic", "Toxic", "neobvykla", null, "u8"],
    ["vzhled", "karbon", "Karbon", "neobvykla", null, "u10"],
    ["efekt", "rakety", "Rakety", "vzacna", null, "u13"],
    ["pozadi", "neonulice", "Neonová ulice", "vzacna", null, "u16"],
    ["podoba", "chrom", "Chrom", "vzacna", null, "u20"],
    ["vzhled", "lava", "Láva", "vzacna", null, "u25"],
    ["podoba", "diamant", "Diamantový Hexík", "legenda", null, "u30"],
    // doplňky na sloty
    ["hlava", "nic", "Bez doplňku", "bezna", 0],
    ["hlava", "ksiltovka", "Kšiltovka", "bezna", 150],
    ["hlava", "sluchatka", "Sluchátka", "neobvykla", 400],
    ["hlava", "celenka", "Ninja čelenka", "neobvykla", 400],
    ["hlava", "svatozar", "Svatozář", "vzacna", 900],
    ["hlava", "koruna", "Koruna", "legenda", null],
    ["hlava", "cepice", "Vánoční čepice", "neobvykla", 400, "vanoce"],
    ["hlava", "kulich", "Kulich", "neobvykla", 400, "zima"],
    ["oci", "nic", "Bez brýlí", "bezna", 0],
    ["oci", "slunecni", "Sluneční brýle", "bezna", 150],
    ["oci", "pixel", "Pixelové brýle", "neobvykla", 400],
    ["oci", "vizor", "Kyber vizor", "vzacna", 900],
    ["krk", "nic", "Nic na krku", "bezna", 0],
    ["krk", "sala", "Šála", "bezna", 150],
    ["krk", "retez", "Zlatý řetěz", "neobvykla", 400],
    ["krk", "medaile", "Zlatá medaile", "vzacna", 900],
    // ruce a nohy (Karel schválil 19. 11. 2026): palčáky, zimní boty a brusle jen v sezóně Zima
    ["ruce", "nic", "Ručičky", "bezna", 0],
    ["ruce", "naramek", "Přátelský náramek", "bezna", 150],
    ["ruce", "palcaky", "Palčáky", "bezna", 150, "zima"],
    ["ruce", "boxerske", "Boxerské rukavice", "neobvykla", 400],
    ["ruce", "superhrdina", "Rukavice superhrdiny", "vzacna", 900],
    ["ruce", "kouzelnicke", "Kouzelnické rukavice", "legenda", null],
    ["nohy", "nic", "Botičky", "bezna", 0],
    ["nohy", "tenisky", "Tenisky", "bezna", 150],
    ["nohy", "zimni", "Zimní boty", "bezna", 150, "zima"],
    ["nohy", "kopacky", "Kopačky", "neobvykla", 400],
    ["nohy", "brusle", "Brusle", "vzacna", 900, "zima"],
    ["nohy", "raketove", "Raketové boty", "legenda", null],
    // tanečky za XP úrovně
    ["oslava", "robot", "Robot", "neobvykla", null, "u6"],
    ["oslava", "vlnka", "Vlnka", "neobvykla", null, "u12"],
    ["oslava", "pirueta", "Dvojitá pirueta", "vzacna", null, "u18"],
    ["oslava", "breakdance", "Breakdance", "vzacna", null, "u22"],
    ["oslava", "hvezdne", "Hvězdné salto", "legenda", null, "u28"],
    // adventní kalendář (jen z kalendáře, 1.–24. 12.)
    ["hlava", "parohy", "Sobí parohy", "neobvykla", null, "kalendar"],
    ["krk", "svetr", "Vánoční svetr", "neobvykla", null, "kalendar"],
    ["efekt", "koule", "Sněhové koule", "neobvykla", null, "kalendar"],
    ["pozadi", "svetylka", "Adventní světýlka", "vzacna", null, "kalendar"],
    ["podoba", "polarni", "Polární Hexík", "vzacna", null, "kalendar"],
    ["oslava", "rolnicky", "Rolničky", "vzacna", null, "kalendar"],
    ["hlava", "hvezda", "Zlatá hvězda", "legenda", null, "kalendar"],
  ],
};

const zKatalogu = (t: Trida) => KATALOG[t].map(([typ, klic, nazev, vz, cena, extra]): Odmena =>
  ({
    id: `${t}-${typ}-${klic}`, trida: t, typ, klic, nazev, vz, cena,
    ...(extra === "test" ? { zdroj: "test" as const }
      : extra === "kalendar" ? { zdroj: "kalendar" as const }
      : extra?.startsWith("u") ? { zdroj: "uroven" as const, uroven: Number(extra.slice(1)) }
      : extra ? { sezona: extra as SezonaId } : {}),
  }));

export const ODMENY: Record<Trida, Odmena[]> = { 5: zKatalogu(5), 9: zKatalogu(9) };

export function najdiOdmenu(id: string): Odmena | undefined {
  const t: Trida = id.startsWith("5-") ? 5 : 9;
  return ODMENY[t].find((o) => o.id === id);
}

/** Animace Hexíka pro oslavu série (klíč oslavy → CSS animace). */
export const ANIMACE_OSLAVY: Record<string, string> = {
  radost: "radost", poskok: "poskok", tanec: "tanec", kotrmelec: "salto", salto: "salto",
  teleport: "teleport", disco: "disco", piruetka: "pirueta",
  robot: "robot", vlnka: "vlnka", pirueta: "pirueta", breakdance: "breakdance", hvezdne: "hvezdne",
  rolnicky: "rolnicky",
};

/** Tmavé vzhledy: obsah appky leží na světlém listu, aby texty mimo karty zůstaly čitelné. */
export const TMAVE_VZHLEDY = new Set(["grafit", "vesmir", "mesto", "aurora", "matrix", "karbon", "lava"]);

export const IKONA_ODMENY: Record<string, string> = {
  radost: "🙌", poskok: "🦘", tanec: "💃", kotrmelec: "🤸", salto: "🤸", teleport: "🌀", disco: "🪩", piruetka: "🌈",
  jiskry: "✨", srdicka: "💖", pixely: "👾", konfety: "🎊", bubliny: "🫧", hvezdy: "⭐", duha: "🌈", blesky: "⚡", ohen: "🔥", vlocky: "❄️", medaile: "🥇", notky: "🎵", motylci: "🦋", binar: "🔢", rakety: "🚀",
  robot: "🤖", vlnka: "🌊", pirueta: "🩰", breakdance: "🕺", hvezdne: "🌟",
  nic: "⭕", masle: "🎀", venecek: "🌼", sluchatka: "🎧", klobouk: "🧙", koruna: "👑", cepice: "🎅", kulich: "🧶", ksiltovka: "🧢", celenka: "🥷", svatozar: "😇",
  bryle: "👓", srdce: "😍", hvezdicky: "🤩", slunecni: "🕶️", pixel: "😎", vizor: "🥽",
  motylek: "🎩", sala: "🧣", retez: "⛓️",
  naramek: "📿", palcaky: "🧤", boxerske: "🥊", superhrdina: "🦸", kouzelnicke: "🪄", tenisky: "👟", zimni: "🥾", kopacky: "⚽", brusle: "⛸️", raketove: "🚀",
  parohy: "🦌", svetr: "🧥", koule: "☃️", rolnicky: "🔔", hvezda: "🌟",
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
  { id: "legendarni", nazev: "Legendární truhla", jak: "Za zlepšení v testu nanečisto a za 10., 20. a 30. XP úroveň", cena: null,
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
  /** Sady, kde žák nasbíral polovinu (odemčený efekt kolem Hexíka): id → den. */
  polovinySad?: Record<string, string>;
  /** Zapnutý efekt sady kolem Hexíka podle třídy: id sady, null = žák efekty vypnul. */
  okoli?: Partial<Record<Trida, string | null>>;
  /** Domov Hexíka (3D místo za dokončenou sadu) podle třídy: id sady, null = bez domova. */
  domov?: Partial<Record<Trida, string | null>>;
  /** Nejvyšší XP úroveň, za kterou už žák dostal krystaly a truhly (věci za úroveň se doplňují podle třídy). */
  uroven: number;
  /** Nejdelší combo (správně za sebou v jednom tréninku). */
  comboRekord: number;
  /** Adventní kalendář (lib/kalendar.ts). */
  advent?: AdventStav;
  /** Odznaky na profilu: už odměněný stupeň medaile (lib/odznaky.ts). */
  odznaky?: Record<string, number>;
  /** Příklady, které žák pokazil a později vyřešil správně. */
  napraveno?: number;
  /** Pondělí týdnů, kdy žák trénoval aspoň 5 dní. */
  tydny5?: string[];
  /** Nejdelší série dní s tréninkem. */
  maxSerieDni?: number;
  /** Kdy se stav naposledy změnil (ms) — při slučování vyhrává novější u nasazení a pojistky. */
  t: number;
}

/** Adventní kalendář: otevřená okénka a tréninky v jednom dni (pravidla v lib/kalendar.ts). */
export interface AdventStav {
  rok: number;
  /** Otevřená okénka (dny 1–24). */
  otevreno: number[];
  /** Dokončené tréninky v jednom dni (kvůli dohánění). */
  tr: { d: string; n: number };
  /** Kolik zmeškaných okének už žák v ten den dohnal. */
  dohnano: { d: string; n: number };
  /** Bonus za všech 24 okének už připsán. */
  mistr?: boolean;
}

/** Sloučení stavu kalendáře ze dvou zařízení (nic se neztratí). */
export function slucAdvent(a?: AdventStav, b?: AdventStav): AdventStav | undefined {
  if (!a || !b) return a ?? b;
  if (a.rok !== b.rok) return a.rok > b.rok ? a : b;
  const vetsi = (x: { d: string; n: number }, y: { d: string; n: number }) => (x.d === y.d ? { d: x.d, n: Math.max(x.n, y.n) } : x.d > y.d ? x : y);
  return { rok: a.rok, otevreno: [...new Set([...a.otevreno, ...b.otevreno])].sort((x, y) => x - y), tr: vetsi(a.tr, b.tr), dohnano: vetsi(a.dohnano, b.dohnano), mistr: !!(a.mistr || b.mistr) };
}

export const SBIRKA_KEY = "matemax-sbirka";
export const SBIRKA_EVENT = "matemax-sbirka";

export function vychoziStav(): SbirkaStav {
  return {
    v: 1, ziskano: 0, utraceno: 0, mam: [], nasazeno: {}, dnes: { d: "", k: 0 },
    denniOdemcena: null, denniOtevrena: null, dnyTreninku: [], zlataOtevrena: null,
    bezVzacne: 0, bezLegendy: 0, otevreno: 0, maxOdhad: {}, dny: {},
    naroky: {}, otevrenoNaroku: {}, mise: { d: "", hotove: [], serie: 0, maxSerie: 0, tezke: 0 },
    boss: { pokusy: [], porazeno: [] }, trofeje: {}, testy: {}, sady: {}, uroven: 1, comboRekord: 0, t: 0,
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

/** Nasazené doplňky na sloty (klíče pro 3D Hexíka; „nic“ = prázdný slot). Volitelně s náhledem jedné věci. */
export function slotyHexika(s: SbirkaStav, trida: Trida, nahled?: Odmena): Partial<Record<Slot | "okoli", string>> {
  const v: Partial<Record<Slot | "okoli", string>> = {};
  for (const sl of SLOTY) {
    const o = nahled && nahled.typ === sl ? nahled : nasazena(s, trida, sl);
    if (o && o.klic !== "nic") v[sl] = o.klic;
  }
  // Efekt sady kolem Hexíka (za polovinu sady)
  const ef = efektHexika(s, trida);
  if (ef) v.okoli = ef;
  return v;
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

/** Nově dokončené sady a poloviny sad (detail: { ids, krystaly, poloviny }) — stránka je ohlásí. */
export const SADA_EVENT = "matemax-sada";

/** Sady a trofeje se dopočítávají po každé změně stavu (nejdřív sady, protože z nich jsou i trofeje). */
function dopocitej(s: SbirkaStav): { s: SbirkaStav; sady: string[]; bonus: number; poloviny: string[]; trofeje: string[] } {
  const den = localDateStr();
  const sd = zapisSady(s, den);
  const tr = zapisTrofeje(sd.s, den);
  return { s: tr.s, sady: sd.vysledek.ids, bonus: sd.vysledek.krystaly, poloviny: sd.vysledek.poloviny, trofeje: tr.vysledek };
}

function ohlas(d: { sady: string[]; bonus: number; poloviny: string[]; trofeje: string[] }) {
  if (d.sady.length > 0 || d.poloviny.length > 0) window.dispatchEvent(new CustomEvent(SADA_EVENT, { detail: { ids: d.sady, krystaly: d.bonus, poloviny: d.poloviny } }));
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
  if (d.sady.length === 0 && d.poloviny.length === 0 && d.trofeje.length === 0) return;
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
  if (ted >= DNU_PRO_ZLATOU && !(dalsi.tydny5 ?? []).includes(pondeli(den))) dalsi = { ...dalsi, tydny5: [...(dalsi.tydny5 ?? []), pondeli(den)].sort() };
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
    return { ok: false, proc: id === "doporuceni" ? "Zvládni doporučené téma." : id === "generalka" ? "Napiš test nanečisto." : "Zlepši se v testu nanečisto nebo dosáhni 10. úrovně." };
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

/** @param zdarma truhla jako dárek (adventní kalendář): bez ceny a bez kontroly dostupnosti */
export function otevriTruhlu(s: SbirkaStav, id: TruhlaId, trida: Trida, den: string, rnd: () => number = Math.random, zdarma = false): { s: SbirkaStav; vysledek: VysledekTruhly | null } {
  if (!zdarma && !dostupnostTruhly(s, id, den).ok) return { s, vysledek: null };
  const t = TRUHLY.find((x) => x.id === id)!;
  let dalsi: SbirkaStav = { ...s, otevreno: s.otevreno + 1 };
  if (t.cena !== null && !zdarma) dalsi.utraceno += t.cena;
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
  // Pojistka sad: u legendy mají přednost chybějící věci z rozdělaných sad
  const zeSad = vz === "legenda" ? nove.filter((o) => chybiVRozdelanych(dalsi, trida).has(o.id)) : [];
  const vyber = zeSad.length ? zeSad : nove.length ? nove : pool;
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
    polovinySad: Object.fromEntries([...new Set([...Object.keys(a.polovinySad ?? {}), ...Object.keys(b.polovinySad ?? {})])].map((k) => {
      const x = a.polovinySad?.[k], y = b.polovinySad?.[k];
      return [k, !x ? y! : !y ? x : x < y ? x : y];
    })),
    ...(novejsi.okoli ?? a.okoli ?? b.okoli ? { okoli: { ...(a.okoli ?? {}), ...(b.okoli ?? {}), ...(novejsi.okoli ?? {}) } } : {}),
    ...(novejsi.domov ?? a.domov ?? b.domov ? { domov: { ...(a.domov ?? {}), ...(b.domov ?? {}), ...(novejsi.domov ?? {}) } } : {}),
    uroven: Math.max(a.uroven ?? 1, b.uroven ?? 1),
    comboRekord: Math.max(a.comboRekord ?? 0, b.comboRekord ?? 0),
    odznaky: Object.fromEntries([...new Set([...Object.keys(a.odznaky ?? {}), ...Object.keys(b.odznaky ?? {})])].map((k) => [k, Math.max(a.odznaky?.[k] ?? -1, b.odznaky?.[k] ?? -1)])),
    napraveno: Math.max(a.napraveno ?? 0, b.napraveno ?? 0),
    tydny5: [...new Set([...(a.tydny5 ?? []), ...(b.tydny5 ?? [])])].sort(),
    maxSerieDni: Math.max(a.maxSerieDni ?? 0, b.maxSerieDni ?? 0),
    ...(a.advent || b.advent ? { advent: slucAdvent(a.advent, b.advent) } : {}),
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
/** Za poraženého bosse týdne i XP (dřív je dával starý boss na konci tréninku tématu). */
export const XP_ZA_BOSSE = 50;

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
  { id: "uroven_10", nazev: "Desítka", popis: "Dosáhni 10. XP úrovně.", ikona: "🔟", splneno: (s) => (s.uroven ?? 1) >= 10 },
  { id: "uroven_20", nazev: "Vytrvalec", popis: "Dosáhni 20. XP úrovně.", ikona: "💪", splneno: (s) => (s.uroven ?? 1) >= 20 },
  { id: "uroven_30", nazev: "Legenda MateMaxu", popis: "Dosáhni 30. XP úrovně.", ikona: "🏆", splneno: (s) => (s.uroven ?? 1) >= 30 },
  { id: "sezonni", nazev: "Sezónní sběratel", popis: "Získej věc ze sezóny.", ikona: "🎄", splneno: (s) => s.mam.some((id) => !!najdiOdmenu(id)?.sezona) },
  { id: "combo_10", nazev: "Ohnivé combo", popis: "Odpověz správně 10× za sebou.", ikona: "🔥", splneno: (s) => (s.comboRekord ?? 0) >= 10 },
  { id: "advent_mistr", nazev: "Adventní mistr", popis: "Otevři všech 24 okének adventního kalendáře.", ikona: "🎄", splneno: (s) => (s.advent?.otevreno.length ?? 0) >= 24 },
  { id: "combo_25", nazev: "Nezastavitelný", popis: "Odpověz správně 25× za sebou.", ikona: "⚡", splneno: (s) => (s.comboRekord ?? 0) >= 25 },
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

/**
 * Efekt sady kolem 3D Hexíka. Klíč odpovídá OKOLI v hexik3d/model.ts (tady jen řetězec, ať Sbírka
 * nenačítá 3D knihovnu).
 */
export type EfektSady = "snih" | "vlocky" | "drobky" | "konfety" | "bubliny" | "listky" | "motylci" | "duha" | "magie" | "rakety" | "digital" | "neon" | "uhliky" | "jinovatka" | "potlesk" | "blesky";

/** Domov = 3D místo, kde Hexík bydlí (pozadí profilu a Domova). `hotovy` = scéna už existuje. */
export interface DomovSady { id: string; nazev: string; hotovy: boolean }

export interface Sada {
  id: string; trida: Trida; nazev: string; ikona: string; polozky: string[]; bonus: number; sezona?: SezonaId;
  /** Za polovinu sady (zaokrouhleno nahoru). */
  efekt: { klic: EfektSady; nazev: string };
  /** Za celou sadu. */
  domov: DomovSady;
  /** Odkud věci jsou, když to není běžný obchod a truhly (Advent = adventní kalendář). */
  puvod?: "kalendar";
  /** Ovocný košík: první sada z běžných podob pro začátečníky (výjimka z pravidel). */
  zacatecnicka?: boolean;
}

/** Hotové 3D domovy. Ostatní se odemknou hned, Hexík se do nich nastěhuje, až budou scény hotové (leden). */
export const HOTOVE_DOMOVY: readonly string[] = ["vanocni-pokojicek"];

const KRYSTALY_ZA_VEC = 50;
const MAX_BONUS_SADY = 250;

const sada = (
  trida: Trida, id: string, nazev: string, ikona: string, polozky: string[],
  efekt: [EfektSady, string], domov: [string, string],
  extra: { sezona?: SezonaId; puvod?: "kalendar"; zacatecnicka?: boolean; bonus?: number } = {},
): Sada => ({
  id: `${trida}-${id}`, trida, nazev, ikona,
  polozky: polozky.map((p) => `${trida}-${p}`),
  bonus: extra.bonus ?? Math.min(MAX_BONUS_SADY, polozky.length * KRYSTALY_ZA_VEC),
  efekt: { klic: efekt[0], nazev: efekt[1] },
  domov: { id: domov[0], nazev: domov[1], hotovy: HOTOVE_DOMOVY.includes(domov[0]) },
  ...(extra.sezona ? { sezona: extra.sezona } : {}),
  ...(extra.puvod ? { puvod: extra.puvod } : {}),
  ...(extra.zacatecnicka ? { zacatecnicka: true } : {}),
});

const ADVENT = (t: Trida) => ["hlava-parohy", "krk-svetr", "efekt-koule", "pozadi-svetylka", t === 5 ? "podoba-pernicek" : "podoba-polarni", "oslava-rolnicky", "hlava-hvezda"];

/**
 * Sady podle pravidel schválených 19. 11. 2026: jeden svět o 3–5 věcech různých druhů, jen neobvyklé,
 * vzácné a legendární věci, každá věc nejvýš v jedné sadě. Za polovinu sady efekt kolem Hexíka,
 * za celou domov a bonus krystalů (50 za věc, nejvýš 250; mimo denní strop).
 * Výjimky: Advent (7 věcí z kalendáře) a Ovocný košík (běžné podoby, sada pro začátečníky).
 * Hlídá e2e/sbirka-sezony.spec.ts.
 */
export const SADY: Record<Trida, Sada[]> = {
  5: [
    sada(5, "vanoce", "Vánoce", "\u{1F384}", ["podoba-skritek", "hlava-cepice", "vzhled-snezeni", "pozadi-vanoce"], ["snih", "Sněžení"], ["vanocni-pokojicek", "Vánoční pokojíček"], { sezona: "vanoce" }),
    sada(5, "advent", "Advent", "\u{1F36A}", ADVENT(5), ["drobky", "Perníkové drobky"], ["pernikova-chaloupka", "Perníková chaloupka"], { puvod: "kalendar" }),
    sada(5, "zima", "Zima", "❄️", ["podoba-snehulak", "hlava-kulich", "nohy-brusle", "pozadi-ledove"], ["vlocky", "Poletující vločky"], ["polarni-zare", "Polární záře"], { sezona: "zima" }),
    sada(5, "finis", "Finiš", "\u{1F3C1}", ["podoba-sampion", "efekt-medaile", "pozadi-cil"], ["konfety", "Konfety"], ["cilova-rovinka", "Cílová rovinka"], { sezona: "finis" }),
    sada(5, "more", "Pod mořem", "\u{1F420}", ["vzhled-ocean", "pozadi-podmori", "efekt-bubliny"], ["bubliny", "Bubliny"], ["podmorsky-svet", "Podmořský svět"]),
    sada(5, "zviratka", "Zvířátka", "\u{1F43E}", ["podoba-kocicka", "efekt-motylci", "pozadi-dzungle", "hlava-venecek"], ["motylci", "Motýlci"], ["paseka", "Paseka"]),
    sada(5, "pohadka", "Pohádka", "\u{1F3F0}", ["podoba-jednorozec", "pozadi-pohadka", "efekt-duha", "oslava-piruetka"], ["duha", "Duhové jiskry"], ["zamek-v-oblacich", "Zámek v oblacích"]),
    sada(5, "kouzelnik", "Kouzelník", "\u{1FA84}", ["hlava-klobouk", "oci-hvezdicky", "ruce-kouzelnicke", "efekt-hvezdy"], ["magie", "Magické jiskry"], ["kouzelnicka-vez", "Kouzelnická věž"]),
    sada(5, "superhrdina", "Superhrdina", "\u{1F9B8}", ["ruce-superhrdina", "nohy-raketove", "vzhled-vesmir"], ["rakety", "Stopa z raket"], ["strecha-mrakodrapu", "Střecha mrakodrapu"]),
    sada(5, "ovoce", "Ovocný košík", "\u{1F353}", ["podoba-mata", "podoba-malina", "podoba-citron", "podoba-boruvka"], ["listky", "Padající lístky"], ["ovocny-sad", "Ovocný sad"], { zacatecnicka: true, bonus: 100 }),
  ],
  9: [
    sada(9, "vanoce", "Vánoce", "\u{1F384}", ["podoba-santa", "hlava-cepice", "vzhled-snezeni", "pozadi-vanoce"], ["snih", "Sněžení"], ["vanocni-pokojicek", "Vánoční pokojíček"], { sezona: "vanoce" }),
    sada(9, "advent", "Advent", "\u{1F36A}", ADVENT(9), ["drobky", "Perníkové drobky"], ["pernikova-chaloupka", "Perníková chaloupka"], { puvod: "kalendar" }),
    sada(9, "zima", "Zima", "❄️", ["podoba-yeti", "hlava-kulich", "nohy-brusle", "pozadi-ledove"], ["vlocky", "Poletující vločky"], ["polarni-zare", "Polární záře"], { sezona: "zima" }),
    sada(9, "finis", "Finiš", "\u{1F3C1}", ["podoba-finisher", "efekt-medaile", "pozadi-cil"], ["konfety", "Konfety"], ["cilova-rovinka", "Cílová rovinka"], { sezona: "finis" }),
    sada(9, "sportovec", "Sportovec", "⚽", ["nohy-kopacky", "ruce-boxerske", "krk-medaile", "pozadi-stadion", "oslava-salto"], ["potlesk", "Potlesk"], ["satna-s-trofejemi", "Šatna s trofejemi"]),
    sada(9, "superhrdina", "Superhrdina", "\u{1F9B8}", ["ruce-superhrdina", "nohy-raketove", "efekt-rakety"], ["rakety", "Stopa z raket"], ["strecha-mrakodrapu", "Střecha mrakodrapu"]),
    sada(9, "kyber", "Kyber", "\u{1F916}", ["podoba-kyber", "oci-vizor", "vzhled-matrix", "oslava-teleport"], ["digital", "Digitální částice"], ["neonova-garaz", "Neonová garáž"]),
    sada(9, "ulice", "Ulice", "\u{1F6F9}", ["podoba-street", "hlava-sluchatka", "vzhled-mesto", "pozadi-synthwave", "oslava-breakdance"], ["neon", "Blikající neon"], ["synthwave", "Synthwave"]),
    sada(9, "ohen", "Oheň", "\u{1F525}", ["efekt-ohen", "vzhled-lava", "pozadi-zapad"], ["uhliky", "Stoupající uhlíky"], ["kovarna-u-sopky", "Kovárna u sopky"]),
    sada(9, "led", "Led", "\u{1F9CA}", ["podoba-diamant", "vzhled-aurora", "pozadi-polarni"], ["jinovatka", "Jinovatka"], ["ledova-jeskyne", "Ledová jeskyně"]),
    sada(9, "ninja", "Ninja", "\u{1F977}", ["podoba-ninja", "hlava-celenka", "efekt-blesky", "oslava-disco"], ["blesky", "Bleskové jiskry"], ["dojo", "Dódžó"]),
  ],
};

export const VSECHNY_SADY: Sada[] = [...SADY[5], ...SADY[9]];

/** Kolik věcí sady je potřeba na efekt (polovina, zaokrouhleno nahoru). */
export function polovinaSady(sd: Sada): number {
  return Math.ceil(sd.polozky.length / 2);
}

export interface PostupSady { mam: number; z: number; polovina: number; efekt: boolean; hotovo: boolean }

export function postupSady(s: SbirkaStav, sd: Sada): PostupSady {
  const mam = sd.polozky.filter((id) => s.mam.includes(id)).length;
  // Kdo sadu dokončil podle dřívějšího složení, má efekt i domov dál
  const hotovo = !!s.sady?.[sd.id] || mam === sd.polozky.length;
  return { mam, z: sd.polozky.length, polovina: polovinaSady(sd), efekt: hotovo || !!s.polovinySad?.[sd.id] || mam >= polovinaSady(sd), hotovo };
}

/** Sada, do které věc patří (každá věc je nejvýš v jedné). */
export function sadaVeci(id: string): Sada | undefined {
  return VSECHNY_SADY.find((sd) => sd.polozky.includes(id));
}

/** Zapnutý efekt kolem Hexíka (klíč pro 3D), nebo null. */
export function efektHexika(s: SbirkaStav, trida: Trida): EfektSady | null {
  const id = s.okoli?.[trida];
  if (!id) return null;
  const sd = SADY[trida].find((x) => x.id === id);
  return sd && postupSady(s, sd).efekt ? sd.efekt.klic : null;
}

/** Zvolený domov (jen hotová scéna), nebo null. */
export function domovHexika(s: SbirkaStav, trida: Trida): DomovSady | null {
  const id = s.domov?.[trida];
  if (!id) return null;
  const sd = SADY[trida].find((x) => x.id === id);
  return sd && sd.domov.hotovy && postupSady(s, sd).hotovo ? sd.domov : null;
}

/** Zapne efekt sady (null = vypnout). Jde jen odemčený. */
export function nastavEfekt(s: SbirkaStav, trida: Trida, sadaId: string | null): { s: SbirkaStav; vysledek: boolean } {
  if (sadaId) {
    const sd = SADY[trida].find((x) => x.id === sadaId);
    if (!sd || !postupSady(s, sd).efekt) return { s, vysledek: false };
  }
  return { s: { ...s, okoli: { ...(s.okoli ?? {}), [trida]: sadaId } }, vysledek: true };
}

/** Nastaví domov (null = bez domova). Jde jen dokončená sada s hotovou scénou. */
export function nastavDomov(s: SbirkaStav, trida: Trida, sadaId: string | null): { s: SbirkaStav; vysledek: boolean } {
  if (sadaId) {
    const sd = SADY[trida].find((x) => x.id === sadaId);
    if (!sd || !sd.domov.hotovy || !postupSady(s, sd).hotovo) return { s, vysledek: false };
  }
  return { s: { ...s, domov: { ...(s.domov ?? {}), [trida]: sadaId } }, vysledek: true };
}

/**
 * Pojistka pro legendy: chybějící věci ze sad, kde má žák aspoň polovinu. Když truhla losuje
 * legendu, dostanou přednost (legendární věc sady jde tak vždycky získat).
 */
export function chybiVRozdelanych(s: SbirkaStav, trida: Trida): Set<string> {
  const v = new Set<string>();
  for (const sd of SADY[trida]) {
    const p = postupSady(s, sd);
    if (!p.hotovo && p.mam >= p.polovina) for (const id of sd.polozky) if (!s.mam.includes(id)) v.add(id);
  }
  return v;
}

export interface VysledekSad { ids: string[]; krystaly: number; poloviny: string[] }

/**
 * Zapíše nově dosažené poloviny (efekt) a dokončené sady (domov + bonus, každou sadu jednou).
 * Nový efekt se rovnou zapne, pokud žák efekty sám nevypnul. Hotový domov se nastaví, pokud žádný nemá.
 */
export function zapisSady(s: SbirkaStav, den: string): { s: SbirkaStav; vysledek: VysledekSad } {
  const hotove = s.sady ?? {};
  const poloviny = s.polovinySad ?? {};
  const pocet = (sd: Sada) => sd.polozky.filter((id) => s.mam.includes(id)).length;
  const nove = VSECHNY_SADY.filter((sd) => !hotove[sd.id] && pocet(sd) === sd.polozky.length);
  const novePoloviny = VSECHNY_SADY.filter((sd) => !hotove[sd.id] && !poloviny[sd.id] && pocet(sd) >= polovinaSady(sd));
  if (nove.length === 0 && novePoloviny.length === 0) return { s, vysledek: { ids: [], krystaly: 0, poloviny: [] } };
  const bonus = nove.reduce((a, sd) => a + sd.bonus, 0);
  const okoli = { ...(s.okoli ?? {}) };
  for (const sd of novePoloviny) if (okoli[sd.trida] !== null) okoli[sd.trida] = sd.id;
  const domov = { ...(s.domov ?? {}) };
  for (const sd of nove) if (sd.domov.hotovy && !domov[sd.trida]) domov[sd.trida] = sd.id;
  return {
    s: {
      ...s,
      ziskano: s.ziskano + bonus,
      sady: { ...hotove, ...Object.fromEntries(nove.map((sd) => [sd.id, den])) },
      polovinySad: { ...poloviny, ...Object.fromEntries(novePoloviny.map((sd) => [sd.id, den])) },
      okoli, domov,
    },
    vysledek: { ids: nove.map((sd) => sd.id), krystaly: bonus, poloviny: novePoloviny.filter((sd) => !nove.includes(sd)).map((sd) => sd.id) },
  };
}
