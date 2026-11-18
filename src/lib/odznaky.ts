/**
 * Odznaky na profilu jako 3D medaile (schválil Karel 18. 11. 2026, mockup docs/gamifikace-2026-11/odznaky.html).
 * Odznaky jsou za učení, trofeje ve Sbírce za herní systém. Každá medaile má stupně bronz, stříbro, zlato, diamant.
 *
 * Výpočet je čistá funkce nad daty, která appka už má (SM-2 karty, statistiky, diagnostika, testy, Sbírka).
 * Testováno v e2e/odznaky.spec.ts.
 */
import { examplesFor } from "@/data/examples";
import { TEMATA_ORDER, TEMATA_ORDER_5, temaLabel, type DBExample, type SM2Card, type Trida } from "@/types";
import { dovednostUlohy, TESTOVE } from "./dovednosti";

export type Stupen = -1 | 0 | 1 | 2 | 3;
export const NAZEV_STUPNE: readonly string[] = ["Bronz", "Stříbro", "Zlato", "Diamant"];
/** Krystaly za dosažení stupně (bronz, stříbro, zlato, diamant). */
export const KRYSTALY_ZA_STUPEN = [20, 40, 80, 150] as const;

export interface Kategorie { id: string; nazev: string; stuha: string }
export const KATEGORIE: Kategorie[] = [
  { id: "temata", nazev: "Mistr témat", stuha: "#5B55D6" },
  { id: "vytrvalost", nazev: "Vytrvalost", stuha: "#E0653A" },
  { id: "pilnost", nazev: "Pilnost", stuha: "#1F9D63" },
  { id: "testy", nazev: "Testy a pokrok", stuha: "#2F7FD6" },
  { id: "typy", nazev: "Typy úloh", stuha: "#C27A00" },
  { id: "bonus", nazev: "Bonusové", stuha: "#8E44AD" },
];

export interface StavMedaile {
  id: string;
  kategorie: string;
  nazev: string;
  znak: string;
  popis: string;
  /** Co je potřeba na jednotlivé stupně (texty). Bonusové mají jen jeden. */
  stupne: string[];
  stupen: Stupen;
  /** Postup k dalšímu stupni 0–1 (1 = nejvyšší stupeň). */
  postup: number;
  /** Krátký text, co chybí do dalšího stupně. */
  chybi: string;
}

/** Vstupní data (sbírá je profil v prohlížeči). */
export interface VstupOdznaku {
  trida: Trida;
  karty: SM2Card[];
  /** Nejdelší série dní s tréninkem (ze Sbírky + aktuální). */
  maxSerie: number;
  /** Týdny s aspoň 5 dny tréninku. */
  tydny5: number;
  /** Správně vyřešené příklady celkem (statistika tréninku). */
  vyreseno: number;
  /** Příklady, které nešly a později byly správně. */
  napraveno: number;
  /** Tréninky 10+ příkladů bez chyby. */
  perfektni: number;
  /** Diagnostika: { tema: { correct, total } }. */
  diagnostika: Record<string, { correct: number; total: number }>;
  /** Cvičné testy (5. třída) / CERMAT trénink (9. třída). */
  testu: number;
  /** Růst odhadu bodů od prvního měření. */
  rustOdhadu: number;
  /** Testy nanečisto. */
  generalek: number;
  /** Získané staré odznaky (kvůli převodu a bonusovým). */
  stareOdznaky: string[];
}

/** Stupeň podle prahů (počet ≥ prah). Vrací stupeň a postup k dalšímu. */
function podlePrahu(hodnota: number, prahy: [number, number, number, number]): { stupen: Stupen; postup: number; dalsi: number | null } {
  let s = -1;
  prahy.forEach((p, i) => { if (hodnota >= p) s = i; });
  if (s === 3) return { stupen: 3, postup: 1, dalsi: null };
  const od = s < 0 ? 0 : prahy[s], do_ = prahy[s + 1];
  return { stupen: s as Stupen, postup: Math.max(0, Math.min(1, (hodnota - od) / (do_ - od))), dalsi: do_ };
}

const SPRAVNE = (c: SM2Card) => c.lastQuality >= 3;
/** Kolik správných odpovědí na úrovni zvládne úroveň (stejně jako odemykání v tréninku). */
export const ZVLADNUTI = 4;

function sklon(n: number, a: string, b: string, c: string) { return n === 1 ? a : n >= 2 && n <= 4 ? b : c; }

export function stavOdznaku(v: VstupOdznaku): StavMedaile[] {
  const priklady = examplesFor(v.trida);
  const podleId = new Map<string, DBExample>(priklady.map((e) => [e.id, e]));
  const spravne = v.karty.filter(SPRAVNE).map((c) => podleId.get(c.exampleId)).filter((e): e is DBExample => !!e);
  const out: StavMedaile[] = [];

  // ── Mistr témat / okruhů ──
  const temata: string[] = v.trida === 5 ? [...TEMATA_ORDER_5] : [...TEMATA_ORDER];
  const ZNAKY: Record<string, string> = {
    zlomky: "½", vyrazy: "x²", rovnice: "=", geometrie: "△", slovni_ulohy: "%", grafy_logika: "▥", konstrukce: "⌖", uhly: "∠", souhrnne: "★",
    p5_pocitani: "+", p5_jednotky: "kg", p5_slovni: "?", p5_zlomky: "½", p5_obsah: "▢", p5_telesa: "◫", p5_rysovani: "✎", p5_grafy: "▥",
  };
  const stareMistr: Record<string, string> = { zlomky: "badge_zlomky_master", rovnice: "badge_rovnice_master", geometrie: "badge_geometrie_master", slovni_ulohy: "badge_slovni_ulohy_master" };
  for (const t of temata) {
    const vTematu = spravne.filter((e) => e.tema === t);
    const naUrovni = [1, 2, 3].map((o) => vTematu.filter((e) => e.obtiznost === o).length);
    const celkem = priklady.filter((e) => e.tema === t).length;
    const polovina = Math.ceil(celkem / 2);
    let s: Stupen = -1;
    if (naUrovni[0] >= ZVLADNUTI) s = 0;
    if (s === 0 && naUrovni[1] >= ZVLADNUTI) s = 1;
    if (s === 1 && naUrovni[2] >= ZVLADNUTI) s = 2;
    if (s === 2 && vTematu.length >= polovina) s = 3;
    // Převod: starý odznak „mistr tématu“ = aspoň stříbro
    if (stareMistr[t] && v.stareOdznaky.includes(stareMistr[t]) && s < 1) s = 1;
    const dalsiUroven = s + 1;
    const postup = s === 3 ? 1 : s === 2 ? Math.min(1, vTematu.length / polovina) : Math.min(1, naUrovni[dalsiUroven] / ZVLADNUTI);
    const chybi = s === 3 ? "Nejvyšší stupeň!" : s === 2 ? `Do diamantu: správně ${Math.max(0, polovina - vTematu.length)} dalších úloh tématu` : `Do dalšího stupně: ${Math.max(0, ZVLADNUTI - naUrovni[dalsiUroven])} správně na ${dalsiUroven + 1}. úrovni`;
    out.push({
      id: `tema:${t}`, kategorie: "temata", nazev: temaLabel(t), znak: ZNAKY[t] ?? "★",
      popis: v.trida === 5 ? "Medaile za okruh. Roste s tím, jak zvládáš úrovně." : "Medaile za téma. Roste s tím, jak zvládáš úrovně.",
      stupne: ["Zvládnutá 1. úroveň", "Zvládnutá 2. úroveň", "Zvládnutá 3. úroveň (jako v testu)", "Zlato a správně polovina úloh tématu"],
      stupen: s, postup, chybi,
    });
  }

  const prahova = (id: string, kat: string, nazev: string, znak: string, popis: string, hodnota: number, prahy: [number, number, number, number], popisky: string[], jednotka: (n: number) => string) => {
    const r = podlePrahu(hodnota, prahy);
    out.push({ id, kategorie: kat, nazev, znak, popis, stupne: popisky, stupen: r.stupen, postup: r.postup, chybi: r.dalsi === null ? "Nejvyšší stupeň!" : `Do dalšího stupně: ${jednotka(r.dalsi - hodnota)}` });
  };

  // ── Vytrvalost ──
  const stareSerie = [["badge_streak_100", 100], ["badge_streak_30", 30], ["badge_streak_14", 14], ["badge_streak_7", 7], ["badge_streak_3", 3]] as const;
  const serie = Math.max(v.maxSerie, ...stareSerie.filter(([id]) => v.stareOdznaky.includes(id)).map(([, n]) => n));
  prahova("plamen", "vytrvalost", "Plamínek", "plamen", "Trénuj den po dni bez přestávky.", serie, [3, 7, 30, 100], ["3 dny v řadě", "7 dní v řadě", "30 dní v řadě", "100 dní v řadě"], (n) => `${n} ${sklon(n, "den", "dny", "dní")} v řadě`);
  prahova("pravidelnost", "vytrvalost", "Pravidelnost", "5/7", "Týdny, kdy trénuješ aspoň 5 dní.", v.tydny5, [1, 4, 10, 20], ["1 týden", "4 týdny", "10 týdnů", "20 týdnů"], (n) => `${n} ${sklon(n, "týden", "týdny", "týdnů")} s 5 dny tréninku`);

  // ── Pilnost ──
  prahova("pocetar", "pilnost", "Počtář", "∑", "Správně vyřešené příklady celkem.", v.vyreseno, [50, 250, 500, 1000], ["50 příkladů", "250 příkladů", "500 příkladů", "1 000 příkladů"], (n) => `${n} správně vyřešených příkladů`);
  prahova("napraveno", "pilnost", "Po chybě vstávám", "↺", "Příklad, který ti nešel, později vyřešíš správně.", v.napraveno, [5, 25, 100, 250], ["5 opravených", "25 opravených", "100 opravených", "250 opravených"], (n) => `${n} ${sklon(n, "příklad", "příklady", "příkladů")} opravit po chybě`);
  prahova("cista", "pilnost", "Čistá práce", "✓", "Trénink aspoň 10 příkladů bez jediné chyby.", v.perfektni, [1, 5, 15, 40], ["1×", "5×", "15×", "40×"], (n) => `${n}× trénink bez chyby`);

  // ── Testy a pokrok ──
  const diag = Object.entries(v.diagnostika).filter(([t]) => (v.trida === 5) === t.startsWith("p5_"));
  const dc = diag.reduce((a, [, x]) => a + x.correct, 0), dt = diag.reduce((a, [, x]) => a + x.total, 0);
  const proc = dt > 0 ? Math.round((dc / dt) * 100) : -1;
  {
    let s: Stupen = -1;
    if (dt > 0) s = 0; if (proc >= 60) s = 1; if (proc >= 80) s = 2; if (proc >= 90) s = 3;
    const cile = [60, 80, 90];
    out.push({ id: "diagnostika", kategorie: "testy", nazev: "Diagnostika", znak: "◎", popis: "Diagnostika všech témat a jak dopadla.", stupne: ["Hotová", "Aspoň 60 %", "Aspoň 80 %", "Aspoň 90 %"], stupen: s, postup: s === 3 ? 1 : s < 0 ? 0 : Math.min(1, proc / cile[s]), chybi: s < 0 ? "Udělej diagnostiku" : s === 3 ? "Nejvyšší stupeň!" : `Do dalšího stupně: aspoň ${cile[s]} % v diagnostice (teď ${proc} %)` });
  }
  prahova("testy", "testy", v.trida === 5 ? "Cvičný test" : "CERMAT trénink", "A+", v.trida === 5 ? "Cvičný test jako u přijímaček: 14 úloh, 70 minut." : "Cvičný test na čas s úlohami jako u přijímaček.", v.testu, [1, 3, 10, 20], ["1×", "3×", "10×", "20×"], (n) => `${n}× cvičný test`);
  prahova("nahoru", "testy", "Jdu nahoru", "↗", "O kolik bodů ti vzrostl odhad od prvního měření.", v.rustOdhadu, [3, 6, 10, 15], ["+3 body", "+6 bodů", "+10 bodů", "+15 bodů"], (n) => `o ${n} ${sklon(n, "bod", "body", "bodů")} vyšší odhad`);
  prahova("generalka", "testy", "Generálka", "★", "Test nanečisto v gymnáziu nebo online.", v.generalek, [1, 2, 3, 5], ["1 test", "2 testy", "3 testy", "5 testů"], (n) => `${n} ${sklon(n, "test", "testy", "testů")} nanečisto`);

  // ── Typy úloh (z karet: různé úlohy vyřešené správně) ──
  const rys = spravne.filter((e) => e.konstrukce_scena || (e.kroky_volby && e.kroky_volby.length > 0)).length;
  const ae = spravne.filter((e) => e.moznosti && e.moznosti.length > 0).length;
  const obr = spravne.filter((e) => !!e.image).length;
  prahova("rysovac", "typy", "Rýsovač", "∡", "Správně narýsované konstrukce.", rys, [5, 20, 50, 120], ["5", "20", "50", "120"], (n) => `${n} ${sklon(n, "konstrukce", "konstrukce", "konstrukcí")}`);
  prahova("detektiv", "typy", "Detektiv A–E", "A–E", "Správně vyřešené úlohy s výběrem A–E.", ae, [10, 50, 150, 400], ["10", "50", "150", "400"], (n) => `${n} ${sklon(n, "úloha", "úlohy", "úloh")} s výběrem`);
  prahova("obrazky", "typy", "Čtenář obrázků", "▥", "Správně úlohy s obrázkem, grafem nebo tabulkou.", obr, [10, 50, 150, 400], ["10", "50", "150", "400"], (n) => `${n} ${sklon(n, "úloha", "úlohy", "úloh")} s obrázkem`);
  void dovednostUlohy; void TESTOVE;

  // ── Bonusové (bez stupňů: získaný = bronz) ──
  for (const [id, nazev, znak, popis, stary] of [
    ["rano", "Ranní ptáče", "☀", "Trénink mezi 6:00 a 8:00.", "badge_early_bird"],
    ["vikend", "Víkendový bojovník", "S+N", "Trénink v sobotu i v neděli.", "badge_weekend_warrior"],
    ["zpatky", "Jsem zpátky", "↩", "Návrat k tréninku po pauze delší než týden.", "badge_comeback_kid"],
  ] as const) {
    const ma = v.stareOdznaky.includes(stary);
    out.push({ id, kategorie: "bonus", nazev, znak, popis, stupne: ["Získáno"], stupen: ma ? 0 : -1, postup: ma ? 1 : 0, chybi: ma ? "Získáno" : popis });
  }
  return out;
}

/** Medaile, ke které má žák nejblíž (nejvyšší postup, není na maximu, bez bonusových). */
export function nejblizsiMedaile(m: StavMedaile[]): StavMedaile | null {
  const kand = m.filter((x) => x.kategorie !== "bonus" && x.stupen < 3 && x.postup < 1);
  return kand.sort((a, b) => b.postup - a.postup)[0] ?? null;
}

/** Nové stupně proti už odměněným: krystaly a seznam pro oslavu. */
export function noveStupne(m: StavMedaile[], odmeneno: Record<string, number>): { krystaly: number; nove: StavMedaile[]; odmeneno: Record<string, number> } {
  let krystaly = 0; const nove: StavMedaile[] = []; const dalsi = { ...odmeneno };
  for (const x of m) {
    const bylo = odmeneno[x.id] ?? -1;
    if (x.stupen > bylo) {
      for (let s = bylo + 1; s <= x.stupen; s++) krystaly += x.kategorie === "bonus" ? 20 : KRYSTALY_ZA_STUPEN[s];
      dalsi[x.id] = x.stupen; nove.push(x);
    }
  }
  return { krystaly, nove, odmeneno: dalsi };
}

/** Staré odznaky bez náhrady (zůstanou v „Původních“). */
export const STARE_BEZ_NAHRADY = new Set(["badge_mocniny_master", "badge_procenta_master", "badge_all_topics_master", "badge_level_up_zak", "badge_level_up_pokrocily", "badge_level_up_expert", "badge_level_up_mistr", "badge_premium_member", "badge_speed_demon", "badge_night_owl", "badge_cermat_ready", "badge_marathon_session", "badge_daily_goal_7x", "badge_registered", "badge_first_example", "badge_first_diagnostic", "badge_no_mistakes_10", "badge_perfect_session_5", "badge_perfect_session_3x", "badge_perfect_diagnostic"]);
