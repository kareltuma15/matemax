/**
 * Obsah a odměny (Karel 18. 11. 2026): co v appce je, kolik toho je a kdy naposledy něco přibylo.
 *
 * Počty se počítají přímo z kódu appky (příklady, katalog odměn, odznaky, videolekce, výzvy), takže nikdy
 * nezastarají. Data novinek drží kronika (src/data/kronika-obsahu.json). Test e2e/obsah.spec.ts spadne,
 * když se počty změní a kronika o tom neví – při každé změně obsahu se proto do kroniky přidá zápis
 * a přepíše `stav`.
 *
 * Používá ho administrace (/admin/obsah) i shrnutí pro MS Dashboard (/api/ms-dashboard/obsah).
 * Žádná data o žácích, jen počty a data.
 */
import { examples, examples5 } from "@/data/examples";
import gamData from "@/data/matemax-gamification-system.json";
import vyzvy from "@/data/daily-challenges.json";
import diagnostika9 from "@/data/diagnostika.json";
import { DIAG5_IDS } from "@/data/diagnostika-5";
import { VIDEOLEKCE } from "@/data/videolekce";
import { KRONIKA, dnyMezi, type OblastId, type ZapisKroniky, type Kronika } from "./obsah-kronika";
export { KRONIKA, dnyMezi, type OblastId, type ZapisKroniky, type Kronika };
import { ODMENY, TROFEJE, SADY, TRUHLY, SEZONY, TYP_NAZEV, type TypOdmeny } from "./sbirka";
import { dovednostiTematu, dovednostUlohy, TESTOVE, TESTOVE_NAZEV } from "./dovednosti";
import { stavOdznaku } from "./odznaky";
import { temaLabel, TEMATA_ORDER_5, type DBExample, type Trida } from "@/types";

// ── Oblasti a limity ────────────────────────────────────────────────────────

export interface Oblast { id: OblastId; nazev: string; limit: number }

/** Limity ve dnech schválil Karel 18. 11. 2026. */
export const OBLASTI: Oblast[] = [
  { id: "priklady9", nazev: "Příklady 9. třída", limit: 21 },
  { id: "priklady5", nazev: "Příklady 5. třída", limit: 21 },
  { id: "odmeny", nazev: "Odměny na Hexíka", limit: 30 },
  { id: "odznaky", nazev: "Odznaky na profilu", limit: 90 },
  { id: "testy", nazev: "Cvičné testy", limit: 60 },
  { id: "diagnostika", nazev: "Diagnostika", limit: 60 },
  { id: "videolekce", nazev: "Videolekce po chybě", limit: 30 },
  { id: "vyzvy", nazev: "Denní a týdenní výzva", limit: 90 },
];

/** Cvičné testy v appce. Nejdou spočítat z dat, proto jsou vyjmenované tady (a hlídá je kronika). */
export const CVICNE_TESTY: { nazev: string; trida: Trida }[] = [
  { nazev: "Cvičný test 5. třídy: 14 úloh, 70 minut, 50 bodů", trida: 5 },
  { nazev: "CERMAT trénink 9. třídy: náhodné úlohy na čas", trida: 9 },
];

// ── Počty ───────────────────────────────────────────────────────────────────

/** Klíče počtů v kronice (`stav`) a oblast, do které patří. */
export const KLICE_POCTU: Record<string, OblastId> = {
  priklady9: "priklady9", priklady5: "priklady5",
  odmeny5: "odmeny", odmeny9: "odmeny", truhly: "odmeny", trofeje: "odmeny", sady: "odmeny",
  odznaky: "odznaky", cvicne_testy: "testy", diagnostika: "diagnostika", videolekce: "videolekce", vyzvy: "vyzvy",
};

const realneOdmeny = (t: Trida) => ODMENY[t].filter((o) => o.klic !== "nic");
// Odznaky na profilu = 3D medaile za učení (lib/odznaky.ts), obě třídy
const pocetMedaili = (t: Trida) => stavOdznaku({ trida: t, karty: [], maxSerie: 0, tydny5: 0, vyreseno: 0, napraveno: 0, perfektni: 0, diagnostika: {}, testu: 0, rustOdhadu: 0, generalek: 0, stareOdznaky: [] }).length;
const odznaky = { get length() { return pocetMedaili(9) + pocetMedaili(5); } };
void gamData;

export function pocty(): Record<string, number> {
  return {
    priklady9: examples.length,
    priklady5: examples5.length,
    odmeny5: realneOdmeny(5).length,
    odmeny9: realneOdmeny(9).length,
    truhly: TRUHLY.length,
    trofeje: TROFEJE.length,
    sady: SADY[5].length + SADY[9].length,
    odznaky: odznaky.length,
    cvicne_testy: CVICNE_TESTY.length,
    diagnostika: (diagnostika9.questions.length > 0 ? 1 : 0) + (Object.keys(DIAG5_IDS).length > 0 ? 1 : 0),
    videolekce: VIDEOLEKCE.length,
    vyzvy: (vyzvy as unknown[]).length,
  };
}

// ── Kronika ─────────────────────────────────────────────────────────────────

/** Klíče, u kterých se počet v kódu liší od kroniky (prázdné = kronika je aktuální). */
export function rozdilyProtiKronice(k: Kronika = KRONIKA): { klic: string; kronika: number | undefined; kod: number }[] {
  const p = pocty();
  const klice = new Set([...Object.keys(p), ...Object.keys(k.stav)]);
  return [...klice].filter((x) => p[x] !== k.stav[x]).map((x) => ({ klic: x, kronika: k.stav[x], kod: p[x] }));
}

// ── Čerstvost ───────────────────────────────────────────────────────────────

export type StavCerstvosti = "ok" | "pozor" | "zle" | "ceka";

export interface Cerstvost {
  oblast: OblastId; nazev: string; limit: number;
  posledni: ZapisKroniky | null; dni: number | null;
  stav: StavCerstvosti;
  /** Hotové novinky, které čekají na nasazení. */
  cekajici: ZapisKroniky[];
}

/**
 * Semafor: zelená do 80 % limitu, oranžová do limitu, červená po limitu.
 * „Čeká“ = něco nového je hotové, ale ještě není naostro (přebije oranžovou i červenou).
 */
export function cerstvost(den: string, k: Kronika = KRONIKA): Cerstvost[] {
  return OBLASTI.map((o) => {
    const z = k.zapisy.filter((x) => x.oblast === o.id);
    const datovane = z.filter((x) => x.datum).sort((a, b) => (a.datum! < b.datum! ? 1 : -1));
    const posledni = datovane[0] ?? null;
    const dni = posledni ? dnyMezi(posledni.datum!, den) : null;
    const cekajici = z.filter((x) => !x.datum);
    const stav: StavCerstvosti = cekajici.length ? "ceka" : dni === null || dni > o.limit ? "zle" : dni > o.limit * 0.8 ? "pozor" : "ok";
    return { oblast: o.id, nazev: o.nazev, limit: o.limit, posledni, dni, stav, cekajici };
  });
}

// ── Příklady podle témat ────────────────────────────────────────────────────

/** Dovednost s méně úlohami se v přehledu zvýrazní. */
export const MALO_ULOH = 8;

export interface RadekTematu {
  tema: string; nazev: string; n: number; urovne: [number, number, number]; testove: number;
  dovednosti: { klic: string; nazev: string; n: number }[];
}

const DRUH_NAZEV: Record<string, string> = {
  text: "Psaná odpověď", obrazek: "S obrázkem", moznosti: "Výběr A–E", rysovani: "Rýsování",
  kroky: "Konstrukce po krocích", vic: "Více odpovědí", porovnani: "Porovnání",
};
function druhUlohy(e: DBExample): string {
  if (e.konstrukce_scena) return "rysovani";
  if (e.kroky_volby?.length) return "kroky";
  if (e.moznosti?.length) return "moznosti";
  if (e.podulohy?.length || e.prirazeni || e.tvrzeni?.length) return "vic";
  if (e.porovnani) return "porovnani";
  if (e.image) return "obrazek";
  return "text";
}

export function prikladyTridy(trida: Trida) {
  const list = trida === 5 ? examples5 : examples;
  const temata = new Map<string, DBExample[]>();
  for (const e of list) temata.set(e.tema, [...(temata.get(e.tema) ?? []), e]);
  const poradi = trida === 5 ? [...TEMATA_ORDER_5] as string[] : [];
  const radky: RadekTematu[] = [...temata.entries()].map(([tema, l]) => {
    const urovne: [number, number, number] = [0, 0, 0];
    for (const e of l) urovne[e.obtiznost - 1]++;
    const dov = new Map<string, number>();
    for (const e of l) {
      const k = dovednostUlohy(e) ?? `podtema:${e.podtema}`;
      dov.set(k, (dov.get(k) ?? 0) + 1);
    }
    const nazvy = new Map(dovednostiTematu(tema).map((d) => [d.klic, d.nazev]));
    const dovednosti = [...dov.entries()].map(([klic, n]) => ({
      klic, n,
      nazev: klic === TESTOVE ? TESTOVE_NAZEV : nazvy.get(klic) ?? (klic.startsWith("podtema:") ? `podtéma ${klic.slice(8).replace(/_/g, " ")}` : klic),
    })).sort((a, b) => a.n - b.n);
    return { tema, nazev: temaLabel(tema), n: l.length, urovne, testove: l.filter((e) => dovednostUlohy(e) === TESTOVE).length, dovednosti };
  }).sort((a, b) => (poradi.length ? poradi.indexOf(a.tema) - poradi.indexOf(b.tema) : b.n - a.n));
  const druhy = new Map<string, number>();
  for (const e of list) druhy.set(druhUlohy(e), (druhy.get(druhUlohy(e)) ?? 0) + 1);
  const urovne: [number, number, number] = [0, 0, 0];
  for (const e of list) urovne[e.obtiznost - 1]++;
  return {
    celkem: list.length, urovne, testove: radky.reduce((a, r) => a + r.testove, 0), temata: radky,
    druhy: [...druhy.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ nazev: DRUH_NAZEV[k] ?? k, n })),
  };
}

// ── Odměny ──────────────────────────────────────────────────────────────────

const PORADI_TYPU: TypOdmeny[] = ["podoba", "hlava", "oci", "krk", "oslava", "efekt", "vzhled", "pozadi"];

export function odmenyPrehled() {
  const typy = PORADI_TYPU.map((typ) => ({
    typ, nazev: typ === "oslava" ? "Tanečky a oslavy" : TYP_NAZEV[typ],
    t5: realneOdmeny(5).filter((o) => o.typ === typ).length,
    t9: realneOdmeny(9).filter((o) => o.typ === typ).length,
  }));
  const vse = [...realneOdmeny(5), ...realneOdmeny(9)];
  return {
    t5: realneOdmeny(5).length, t9: realneOdmeny(9).length, typy,
    legendarni: vse.filter((o) => o.vz === "legenda").length,
    sezonni: vse.filter((o) => o.sezona).length,
    zaUroven: vse.filter((o) => o.zdroj === "uroven").length,
    truhly: TRUHLY.length, trofeje: TROFEJE.length, sady: SADY[5].length + SADY[9].length,
    odznaky: odznaky.length, sezony: SEZONY.map((s) => ({ nazev: s.nazev, od: s.od, do: s.do })),
  };
}

/** Nejbližší začátek sezóny od dneška (MM-DD v SEZONY). */
export function dalsiSezona(den: string): { nazev: string; datum: string; dni: number } | null {
  const rok = Number(den.slice(0, 4));
  const kandidati = SEZONY.flatMap((s) => [rok, rok + 1].map((r) => ({ nazev: s.nazev, datum: `${r}-${s.od}` })))
    .filter((x) => x.datum > den).sort((a, b) => (a.datum < b.datum ? -1 : 1));
  const k = kandidati[0];
  return k ? { ...k, dni: dnyMezi(den, k.datum) } : null;
}

// ── Návrhy úkolů pro kokpit ─────────────────────────────────────────────────

export interface NavrhUkolu { oblast: OblastId; title: string; description: string; estimate_hours: number }

function nejslabsiTema(trida: Trida): string {
  const t = prikladyTridy(trida).temata.slice().sort((a, b) => a.n - b.n)[0];
  return t ? `${t.nazev} (${t.n} úloh)` : "";
}

/** Úkol, který kokpit navrhne, když oblast zčervená. Popis ve formátu kokpitu (CO / KROKY / HOTOVO KDYŽ / ČAS). */
export function navrhUkolu(c: Cerstvost): NavrhUkolu {
  const kolik = c.dni === null ? "zatím bez zápisu v kronice" : `${c.dni} dní bez novinky (limit ${c.limit})`;
  const u = (title: string, co: string, kroky: string[], hotovo: string, hodin: number): NavrhUkolu => ({
    oblast: c.oblast, title, estimate_hours: hodin,
    description: `CO: ${c.nazev}: ${kolik}. ${co}\nKROKY: ${kroky.map((k, i) => `${i + 1}) ${k}`).join(" ")}\nHOTOVO KDYŽ: ${hotovo}\nČAS: asi ${hodin} h`,
  });
  switch (c.oblast) {
    case "priklady9": case "priklady5": {
      const t: Trida = c.oblast === "priklady5" ? 5 : 9;
      return u(`MateMax: nová dávka příkladů pro ${t}. třídu`, `Nejméně úloh má téma ${nejslabsiTema(t)}.`,
        ["Vybrat téma a dovednosti s málo úlohami", "Připravit 10–15 úloh ve stylu CERMAT do náhledu", "Karel schválí", "Zapsat, audit odpovědí, zápis do kroniky"],
        "Nové úlohy jsou v appce a v kronice.", 4);
    }
    case "odmeny": return u("MateMax: nové odměny na Hexíka", "Žáci by měli mít na co se těšit.",
      ["Navrhnout 4–6 nových věcí (doplňky, pozadí, taneček) s mockupem", "Karel schválí", "Postavit ve 3D a zařadit do truhel", "Zápis do kroniky"],
      "Nové odměny jsou v appce a v kronice.", 5);
    case "odznaky": return u("MateMax: nové odznaky na profil", "Odznaky na profilu dlouho stojí.",
      ["Navrhnout 5 nových odznaků navázaných na herní systém s mockupem", "Karel schválí", "Postavit a otestovat", "Zápis do kroniky"],
      "Nové odznaky jsou na profilu a v kronice.", 3);
    case "testy": return u("MateMax: nový cvičný test", "Žáci by měli mít čerstvý test na zkoušku.",
      ["Navrhnout test podle posledních přijímaček s mockupem", "Karel schválí", "Postavit a otestovat", "Zápis do kroniky"],
      "Nový cvičný test je v appce a v kronice.", 6);
    case "diagnostika": return u("MateMax: revize diagnostiky", "Diagnostika dlouho beze změny.",
      ["Projít úlohy diagnostiky obou tříd proti novým úlohám a datům z appky", "Navrhnout výměny", "Karel schválí", "Zápis do kroniky"],
      "Diagnostika je zrevidovaná a v kronice.", 3);
    case "videolekce": return u("MateMax: další videolekce po chybě", "Videolekce zatím pokrývají jen část témat.",
      ["Vybrat téma s nejvíc chybami žáků", "Připojit existující video z YouTube kanálu nebo navrhnout nové", "Zápis do kroniky"],
      "Nová videolekce se nabízí po chybě a je v kronice.", 3);
    case "vyzvy": return u("MateMax: obnovit denní a týdenní výzvu", "Výzvy se dlouho neměnily.",
      ["Projít úlohy výzev a navázat je na herní systém", "Navrhnout nové s mockupem", "Karel schválí", "Zápis do kroniky"],
      "Výzvy jsou obnovené a v kronice.", 4);
  }
}

// ── Souhrny ─────────────────────────────────────────────────────────────────

export function prehledObsahu(den: string) {
  const c = cerstvost(den);
  return {
    den,
    pocty: pocty(),
    cerstvost: c,
    priklady: { t9: prikladyTridy(9), t5: prikladyTridy(5) },
    odmeny: odmenyPrehled(),
    testy: CVICNE_TESTY,
    dalsiSezona: dalsiSezona(den),
    kronika: KRONIKA.zapisy.slice().sort((a, b) => (a.datum ?? "9999") < (b.datum ?? "9999") ? 1 : -1),
    navrhy: c.filter((x) => x.stav === "zle").map(navrhUkolu),
    kronikaSedi: rozdilyProtiKronice().length === 0,
  };
}
export type PrehledObsahu = ReturnType<typeof prehledObsahu>;

/** Krátké shrnutí pro MS Dashboard: semafor a návrhy úkolů. Jen počty a data. */
export function shrnutiProKokpit(den: string) {
  const c = cerstvost(den);
  const p = pocty();
  return {
    den,
    odkaz: "https://matemax.matematika-snadno.cz/admin/obsah",
    pocty: { priklady9: p.priklady9, priklady5: p.priklady5, odmeny: p.odmeny5 + p.odmeny9, odznaky: p.odznaky, cvicne_testy: p.cvicne_testy, videolekce: p.videolekce, vyzvy: p.vyzvy },
    oblasti: c.map((x) => ({ id: x.oblast, nazev: x.nazev, stav: x.stav, dni: x.dni, limit: x.limit, posledni: x.posledni?.datum ?? null, popis: x.posledni?.popis ?? null, ceka: x.cekajici.map((z) => z.popis) })),
    navrhy_ukolu: c.filter((x) => x.stav === "zle").map(navrhUkolu),
  };
}
