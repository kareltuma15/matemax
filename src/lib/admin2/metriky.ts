/**
 * Metriky nového adminu (DA-01, DA-02). Jediné místo, kde se z řádků žáků (SQL admin_zaci) a dnů aktivity
 * (SQL admin_aktivita) počítají čísla. Dlaždice na Dnes, segmenty v Žácích, export i testy používají totéž,
 * takže stejná metrika má všude stejnou hodnotu. Definice: docs/metriky.md.
 */
import { pragueDateStr } from "@/lib/date";
import type { Aktivita, Filtry, StavZaka, Zak } from "./typy";
import type { Nastaveni } from "./nastaveni";

const DEN = 86_400_000;
export const denZ = (iso: string) => pragueDateStr(new Date(iso));
export const posunDen = (den: string, o: number) => pragueDateStr(new Date(Date.parse(den + "T12:00:00Z") + o * DEN));
export const dnyMezi = (a: string, b: string) => Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / DEN);
/** Cena MateMax Premium za měsíc (fakt „matemax“ z kokpitu: premium 99 Kč / měsíc). */
export const CENA_PREMIUM = 99;

export type DnyAktivity = Map<string, Set<string>>;
export function mapaDnu(akt: Aktivita[]): DnyAktivity {
  const m: DnyAktivity = new Map();
  for (const a of akt) { const s = m.get(a.user_id) ?? new Set<string>(); s.add(a.den); m.set(a.user_id, s); }
  return m;
}
/** Kolik různých dnů žák trénoval v okně [od, do]. */
export function dnuVOkne(dny: DnyAktivity, id: string, od: string, doo: string): number {
  let n = 0;
  for (const d of dny.get(id) ?? []) if (d >= od && d <= doo) n++;
  return n;
}

// ── Žák ──

/** Aktivovaný = diagnostika i první trénink do 24 h od registrace. */
export function aktivovan(z: Zak): boolean {
  const reg = Date.parse(z.registrace);
  const ok = (t: string | null) => !!t && Date.parse(t) - reg <= DEN && Date.parse(t) >= reg - 60_000;
  return ok(z.diagnostika) && ok(z.prvni_trenink);
}

/** Stav žáka (ZA-02, prahy z nastavení): nový, aktivní, usíná, spí, nezačal. */
export function stavZaka(z: Zak, n: Nastaveni, dnes = pragueDateStr()): StavZaka {
  const odReg = dnyMezi(denZ(z.registrace), dnes);
  const odAkt = z.posledni_aktivita ? dnyMezi(z.posledni_aktivita, dnes) : null;
  if (odReg < n.prahy.novyDni) return "novy";
  if (odAkt === null) return "nezacal";
  if (odAkt < n.prahy.aktivniDni) return "aktivni";
  if (odAkt <= n.prahy.usinaDni) return "usina";
  return "spi";
}
export const NAZEV_STAVU: Record<StavZaka, string> = { novy: "nový", aktivni: "aktivní", usina: "usíná", spi: "spí", nezacal: "nezačal" };

/** Kroky aktivace jako tečky (ZA-01): e-mail, diagnostika, 1. trénink, návrat 2. den. */
export function krokyAktivace(z: Zak): { nazev: string; ok: boolean }[] {
  return [
    { nazev: "e-mail ověřen", ok: !!z.email_overen },
    { nazev: "diagnostika", ok: !!z.diagnostika },
    { nazev: "1. trénink", ok: !!z.prvni_trenink },
    { nazev: "návrat 2. den", ok: z.vratil_2den },
  ];
}

export const uspesnost = (z: Zak) => (z.odpovedi > 0 ? Math.round((z.spravne / z.odpovedi) * 100) : null);
export const vyhovujeFiltru = (z: Zak, f: Pick<Filtry, "trida" | "zdroj">) => (!f.trida || z.trida === f.trida) && (!f.zdroj || z.zdroj === f.zdroj);

// ── Metriky s lidmi za číslem ──

export type MetrikaId = "pravidelni" | "novi" | "aktivovani" | "platici" | "testy";

export interface Dlazdice {
  id: MetrikaId;
  nazev: string;
  definice: string;
  hodnota: string;        // „5“, „2 z 5“
  cislo: number;          // pro srovnání
  pred: number | null;    // předchozí stejně dlouhé období
  zaklad: number;         // počet pozorování (pro štítek malého vzorku)
  graf: number[];         // 8 týdnů
  lide: string[];         // ID žáků za číslem
  pozn?: string;
}

/** Lidé za metrikou v okně [od, do]. Používá dlaždice i seznam žáků (?metrika=…). */
export function lideMetriky(id: MetrikaId, zaci: Zak[], dny: DnyAktivity, od: string, doo: string): { lide: string[]; zaklad: string[] } {
  switch (id) {
    case "pravidelni": {
      // Severka: 3+ různé dny s tréninkem za 7 dní končících posledním dnem okna
      const z7 = posunDen(doo, -6);
      return { lide: zaci.filter((z) => dnuVOkne(dny, z.id, z7, doo) >= 3).map((z) => z.id), zaklad: zaci.map((z) => z.id) };
    }
    case "novi": {
      const novi = zaci.filter((z) => { const d = denZ(z.registrace); return d >= od && d <= doo; });
      return { lide: novi.map((z) => z.id), zaklad: novi.map((z) => z.id) };
    }
    case "aktivovani": {
      const novi = zaci.filter((z) => { const d = denZ(z.registrace); return d >= od && d <= doo; });
      return { lide: novi.filter(aktivovan).map((z) => z.id), zaklad: novi.map((z) => z.id) };
    }
    case "platici":
      return { lide: zaci.filter((z) => z.premium === "stripe").map((z) => z.id), zaklad: zaci.map((z) => z.id) };
    case "testy": {
      const s = zaci.filter((z) => z.propojeno_vysledky);
      return { lide: s.filter((z) => { const d = denZ(z.propojeno_vysledky!); return d >= od && d <= doo; }).map((z) => z.id), zaklad: s.map((z) => z.id) };
    }
  }
}

export const DEFINICE: Record<MetrikaId, { nazev: string; definice: string }> = {
  pravidelni: { nazev: "Pravidelní", definice: "Severka: žáci, kteří za 7 dní končících posledním dnem období trénovali aspoň 3 různé dny. Trénoval = dokončil trénink, test nebo diagnostiku. Bez testovacích účtů a admina. Měří se od 26. 5. 2026." },
  novi: { nazev: "Noví žáci", definice: "Žáci s registrací v období (pražský den). Bez testovacích účtů a admina." },
  aktivovani: { nazev: "Aktivace", definice: "Z nových žáků v období ti, kdo do 24 h od registrace udělali diagnostiku i první trénink." },
  platici: { nazev: "Platí", definice: "Žáci s aktivním předplatným Premium přes Stripe (stav teď). Měsíční příjem = počet × 99 Kč. Ruční Premium se nepočítá." },
  testy: { nazev: "Z testů s účtem", definice: "Žáci, kteří v období propojili účet s Vyhodnocením testů nanečisto (Mám kód z testu). Kolik žáků bylo na testech celkem, appka zatím neví." },
};

export function dlazdice(zaci: Zak[], dny: DnyAktivity, f: Filtry): Dlazdice[] {
  const zf = zaci.filter((z) => vyhovujeFiltru(z, f));
  const tyden = (i: number) => { const doo = posunDen(f.do, -7 * (7 - i)); return { od: posunDen(doo, -6), do: doo }; };
  const graf = (id: MetrikaId) => Array.from({ length: 8 }, (_, i) => { const t = tyden(i); return lideMetriky(id, zf, dny, t.od, t.do).lide.length; });
  const out: Dlazdice[] = [];
  for (const id of ["pravidelni", "novi", "aktivovani", "platici", "testy"] as MetrikaId[]) {
    const ted = lideMetriky(id, zf, dny, f.od, f.do);
    const pred = lideMetriky(id, zf, dny, f.predOd, f.predDo);
    const d = DEFINICE[id];
    const hodnota = id === "aktivovani" ? `${ted.lide.length} z ${ted.zaklad.length}` : String(ted.lide.length);
    out.push({
      id, nazev: d.nazev, definice: d.definice, hodnota, cislo: ted.lide.length,
      pred: id === "platici" ? null : pred.lide.length,
      zaklad: id === "aktivovani" || id === "novi" ? ted.zaklad.length : ted.lide.length,
      graf: graf(id), lide: ted.lide,
      pozn: id === "platici" ? `${(ted.lide.length * CENA_PREMIUM).toLocaleString("cs-CZ")} Kč měsíčně` : id === "aktivovani" && pred.zaklad.length ? `minule ${pred.lide.length} z ${pred.zaklad.length}` : undefined,
    });
  }
  return out;
}

// ── Cíle sezóny (DN-07) ──

export interface StavCile { nazev: string; hodnota: number | null; od: number; az: number; doKdy: string; tempo: number | null; jednotka: string; poznamka?: string; lide?: string[] }

export function cileSezony(zaci: Zak[], n: Nastaveni, dnes = pragueDateStr()): StavCile[] {
  return n.cile.map((c) => {
    const m = c.milniky.find((x) => x.do >= dnes) ?? c.milniky[c.milniky.length - 1];
    if (c.zdroj === "registrace") {
      const lide = zaci.filter((z) => denZ(z.registrace) >= n.sezonaOd);
      const uplynulo = Math.max(1, dnyMezi(n.sezonaOd, dnes));
      const zbyva = Math.max(0, dnyMezi(dnes, m.do));
      return { nazev: c.nazev, hodnota: lide.length, od: m.od, az: m.az, doKdy: m.do, tempo: Math.round(lide.length + (lide.length / uplynulo) * zbyva), jednotka: c.jednotka, lide: lide.map((z) => z.id) };
    }
    if (c.zdroj === "kompletni") return { nazev: c.nazev, hodnota: n.rucne.kompletni, od: m.od, az: m.az, doKdy: m.do, tempo: null, jednotka: c.jednotka, poznamka: c.poznamka };
    return { nazev: c.nazev, hodnota: null, od: m.od, az: m.az, doKdy: m.do, tempo: null, jednotka: c.jednotka, poznamka: c.poznamka };
  });
}

/** Jedna věta o žákovi z dat (ZA-06). */
export function shrnutiZaka(z: Zak, zdrojNazev: string, nejslabsi: { nazev: string; pct: number; n: number } | null, dnes = pragueDateStr()): string {
  const pred = dnyMezi(denZ(z.registrace), dnes);
  const kdy = pred === 0 ? "dnes" : pred === 1 ? "včera" : `před ${pred} dny`;
  const casti = [`Registrace ${kdy} (${zdrojNazev})`];
  casti.push(z.diagnostika ? "diagnostika hotová" : "bez diagnostiky");
  casti.push(z.dny_celkem ? `${z.dny_celkem} ${z.dny_celkem === 1 ? "den" : z.dny_celkem <= 4 ? "dny" : "dní"} s tréninkem` : "zatím netrénoval");
  if (nejslabsi && nejslabsi.n >= 10) casti.push(`nejslabší téma ${nejslabsi.nazev.toLowerCase()} (${nejslabsi.pct} %, ${nejslabsi.n} odpovědí)`);
  if (z.premium !== "zdarma") casti.push(z.premium === "stripe" ? "platí Premium" : z.premium === "rucne" ? "má ručně udělené Premium" : "zkouší Premium");
  return casti.join(", ") + ".";
}

/** Čas před N dny jako ISO (mimo render komponent, ať je výpočet „čistý“). */
export const isoPred = (dni: number) => new Date(Date.now() - dni * DEN).toISOString();
/** Je účet deaktivovaný (ban v Supabase)? */
export const jeZablokovany = (u: { banned_until?: string | null }) => !!u.banned_until && Date.parse(u.banned_until) > Date.now();
