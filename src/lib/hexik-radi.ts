/**
 * „Hexík radí“ (Karel 18. 11. 2026): Hexík na Domově řekne jednu věc, která se teď nejvíc vyplatí.
 * Odměny tak samy vedou k tomu, co dítě potřebuje – nejčastěji k nejslabšímu tématu.
 *
 * Pořadí: čekající truhla → kousek do nové úrovně → nejslabší téma (Truhla doporučení) → mise → Boss týdne.
 * Čistá funkce, testovaná v e2e/hexik-radi.spec.ts.
 */
import {
  NAROKOVE_TRUHLY, naroku, dostupnostTruhly, dnesniMise, jeMiseHotova, stavBosse, ZA_MISI, ZA_BOSSE,
  type SbirkaStav,
} from "./sbirka";
import { urovenZXP, odmenaUrovne } from "./urovne";
import { oknaKOtevreni } from "./kalendar";
import type { Trida } from "@/types";

export interface RadaHexika {
  druh: "truhla" | "kalendar" | "uroven" | "tema" | "mise" | "boss" | "hotovo";
  text: string;
  tlacitko: string;
  href: string;
  /** Taneček, kterým Hexík radu doprovodí. */
  reakce: "mavani" | "jasot" | "tanec" | "poskok";
}

export interface VstupRady {
  stav: SbirkaStav;
  trida: Trida;
  xp: number;
  den: string;
  /** Doporučený trénink (lib/dnesni-trenink.ts): nejslabší téma nebo dovednost. */
  trenink: { nazevTematu: string; nazevDovednosti: string | null; href: string } | null;
  /** Je Boss týdne k dispozici (má třída úlohu)? */
  bossExistuje: boolean;
}

const sklon = (n: number, jedna: string, dve: string, pet: string) => (n === 1 ? jedna : n >= 2 && n <= 4 ? dve : pet);

export function radaHexika(v: VstupRady): RadaHexika {
  const { stav, den } = v;

  // 1) Truhla čeká na otevření
  const zdarma = (["denni", "zlata"] as const).filter((t) => dostupnostTruhly(stav, t, den).ok).length;
  const cekaNaroku = NAROKOVE_TRUHLY.reduce((a, t) => a + naroku(stav, t), 0);
  const truhel = zdarma + cekaNaroku;
  if (truhel > 0) {
    return {
      druh: "truhla", reakce: "jasot", href: "/sbirka",
      text: `${truhel === 1 ? "Čeká na tebe truhla" : `Čekají na tebe ${truhel} ${sklon(truhel, "truhla", "truhly", "truhel")}`}! Pojď ji otevřít, jsem zvědavý, co v ní je.`,
      tlacitko: truhel === 1 ? "Otevřít truhlu" : "Otevřít truhly",
    };
  }

  // 1b) Adventní kalendář: okénko čeká
  const oken = oknaKOtevreni(stav, den);
  if (oken > 0) {
    return {
      druh: "kalendar", reakce: "jasot", href: "/sbirka?tab=kalendar",
      text: oken === 1 ? "Okénko adventního kalendáře čeká! Co v něm asi bude?" : `Čekají na tebe ${oken} okénka adventního kalendáře!`,
      tlacitko: "Otevřít okénko",
    };
  }

  // 2) Kousek do nové úrovně
  const u = urovenZXP(v.xp);
  const chybi = u.do - v.xp;
  if (chybi <= 60) {
    const o = odmenaUrovne(v.trida, u.n + 1);
    const navic = o.vec ? ` a ${o.vec.nazev}` : o.legendarni ? " a legendární truhla" : "";
    return {
      druh: "uroven", reakce: "poskok", href: v.trenink?.href ?? "/trenink",
      text: `Do úrovně ${u.n + 1} ti chybí jen ${chybi} XP. To je jeden krátký trénink! Čeká tam ${o.krystaly} krystalů${navic}.`,
      tlacitko: "Dotáhnout úroveň",
    };
  }

  // 3) Nejslabší téma → Truhla doporučení
  if (v.trenink) {
    const co = v.trenink.nazevDovednosti ? `${v.trenink.nazevTematu}: ${v.trenink.nazevDovednosti}` : v.trenink.nazevTematu;
    return {
      druh: "tema", reakce: "mavani", href: v.trenink.href,
      text: `Téma ${co} ti zatím jde nejhůř. Pojď na to se mnou! Až to dotáhneš, dostaneš Truhlu doporučení s nejlepší šancí na vzácné věci.`,
      tlacitko: "Jdeme na to",
    };
  }

  // 4) Nesplněné mise
  const zbyva = dnesniMise(den).filter((m) => !jeMiseHotova(stav, m, den)).length;
  if (zbyva > 0) {
    return {
      druh: "mise", reakce: "mavani", href: "/trenink",
      text: `Dnes ti zbývají ${zbyva} ${sklon(zbyva, "mise", "mise", "misí")}. Za každou je +${ZA_MISI} krystalů a plamínek série nezhasne.`,
      tlacitko: "Plnit mise",
    };
  }

  // 5) Boss týdne
  if (v.bossExistuje && stavBosse(stav, den) === "ceka") {
    return {
      druh: "boss", reakce: "tanec", href: "/trenink?boss=1",
      text: `Mise máš splněné, paráda! Troufneš si na Bosse týdne? Za výhru je trofej a +${ZA_BOSSE} krystalů.`,
      tlacitko: "Na bosse",
    };
  }

  return {
    druh: "hotovo", reakce: "tanec", href: "/sbirka",
    text: "Dnes máš všechno hotové. Jsem na tebe pyšný! Zítra pokračujeme.",
    tlacitko: "Do Sbírky",
  };
}
