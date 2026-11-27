/**
 * Návštěvy a chování (fáze B4, CH-01 až CH-05, RU-01 až RU-03). Zdroj: analytics_events z plánu měření (docs/tracking-plan.md).
 * Anonymní návštěvník = denní otisk `v` (platí jen jeden den, bez cookies), proto se anonymní kroky počítají v rámci dne.
 * Přihlášený žák = user_id. Základ všude: lidé, ne zobrazení. Testovací účty a admin se nepočítají (seznam žáků z admin_zaci).
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import { zdrojUdalosti } from "@/lib/analytika-server";
import { NAZVY_ODKAZU, NAZVY_PRVKU, NAZVY_SEKCI } from "@/lib/mereni-plan";
import { pragueDateStr } from "@/lib/date";
import type { Kontext } from "./data";

export interface Udalost { event_name: string; user_id: string | null; created_at: string; p: Record<string, unknown> }

const NAZVY = ["page_viewed", "page_left", "element_clicked", "rage_clicked", "form_started", "form_error_shown", "signup_submitted", "signup_google_started", "sample_answered", "premium_viewed", "checkout_started", "checkout_canceled"];

export async function nactiUdalosti(k: Kontext, od: string, pocitani: Set<string>): Promise<Udalost[]> {
  if (k.demo) return demoUdalosti(od);
  if (!supabaseAdmin) return [];
  const out: Udalost[] = [];
  for (let i = 0; i < 60_000; i += 1000) {
    const { data, error } = await supabaseAdmin.from("analytics_events").select("event_name, user_id, created_at, properties").in("event_name", NAZVY).gte("created_at", od).order("created_at").range(i, i + 999);
    if (error) throw new Error(error.message);
    for (const r of data ?? []) {
      const uid = r.user_id as string | null;
      if (uid && !pocitani.has(uid)) continue; // testovací účet, admin, rodič
      out.push({ event_name: r.event_name as string, user_id: uid, created_at: r.created_at as string, p: (r.properties ?? {}) as Record<string, unknown> });
    }
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

export const s = (x: unknown) => (typeof x === "string" && x ? x : null);
export const cesta = (u: Udalost) => s(u.p.cesta) ?? "/";
export const nazevStranky = (c: string) => NAZVY_ODKAZU[c] ?? c;
export const nazevPrvku = (c: string) => NAZVY_PRVKU[c] ?? c;
export const nazevSekce = (c: string) => NAZVY_SEKCI[c] ?? c;
/** Kdo to je: přihlášený žák, jinak denní otisk návštěvníka (v rámci jednoho dne). */
export const osoba = (u: Udalost) => (u.user_id ? `u:${u.user_id}` : s(u.p.v) ? `v:${s(u.p.v)}:${pragueDateStr(new Date(u.created_at))}` : null);
export const zdroj = (u: Udalost) => zdrojUdalosti(u.p as Parameters<typeof zdrojUdalosti>[0]);

// ── Návštěvy po lidech (CH-04) ──

export interface Navsteva { osoba: string; userId: string | null; zacatek: string; konec: string; zarizeni: string; zdroj: string; kroky: string[]; chyba: boolean; novy: boolean }

/** Seskupí události podle člověka do návštěv (mezera nad 30 min = nová návštěva) a popíše je lidsky. */
export function navstevy(ud: Udalost[]): Navsteva[] {
  const podle = new Map<string, Udalost[]>();
  for (const u of ud) { const o = osoba(u); if (o) podle.set(o, [...(podle.get(o) ?? []), u]); }
  const out: Navsteva[] = [];
  for (const [o, rr] of podle) {
    let aktual: Udalost[] = [];
    const uzavri = () => {
      if (!aktual.length) return;
      const kroky: string[] = [];
      for (const u of aktual) {
        let t: string | null = null;
        if (u.event_name === "page_viewed") t = nazevStranky(cesta(u));
        else if (u.event_name === "element_clicked") t = `klik ${nazevPrvku(s(u.p.cil) ?? "?")}`;
        else if (u.event_name === "form_error_shown") t = `chyba „${s(u.p.cil) ?? "?"}“`;
        else if (u.event_name === "signup_submitted" || u.event_name === "signup_google_started") t = "odeslal registraci";
        else if (u.event_name === "rage_clicked") t = `rychlé kliky ${nazevPrvku(s(u.p.cil) ?? "")}`;
        else if (u.event_name === "page_left" && s(u.p.posledni_pole)) t = `odešel u pole ${s(u.p.posledni_pole)}`;
        else if (u.event_name === "checkout_started") t = "šel platit";
        if (t && kroky[kroky.length - 1] !== t) kroky.push(t);
      }
      const prvni = aktual.find((u) => u.event_name === "page_viewed") ?? aktual[0];
      out.push({
        osoba: o, userId: aktual[0].user_id, zacatek: aktual[0].created_at, konec: aktual[aktual.length - 1].created_at,
        zarizeni: s(prvni.p.zarizeni) ?? "?", zdroj: zdroj(prvni), kroky: kroky.slice(0, 14),
        chyba: aktual.some((u) => u.event_name === "form_error_shown" || u.event_name === "rage_clicked"), novy: !aktual[0].user_id,
      });
      aktual = [];
    };
    for (const u of rr) {
      if (aktual.length && Date.parse(u.created_at) - Date.parse(aktual[aktual.length - 1].created_at) > 30 * 60000) uzavri();
      aktual.push(u);
    }
    uzavri();
  }
  return out.sort((a, b) => b.zacatek.localeCompare(a.zacatek));
}

// ── Obrazovky, scroll, kliky (CH-01, CH-02) ──

export interface StatStranky { cesta: string; nazev: string; lide: number; zobrazeni: number; vstupni: number; prumerSekund: number | null; odchody: number }

export function stranky(ud: Udalost[]): StatStranky[] {
  const m = new Map<string, { lide: Set<string>; zobrazeni: number; vstupni: Set<string>; sekundy: number[]; odchody: Set<string> }>();
  const prvniDne = new Set<string>();
  for (const u of ud) {
    const o = osoba(u); if (!o) continue;
    const c = cesta(u);
    const x = m.get(c) ?? { lide: new Set(), zobrazeni: 0, vstupni: new Set(), sekundy: [], odchody: new Set() };
    if (u.event_name === "page_viewed") {
      x.lide.add(o); x.zobrazeni++;
      if (!prvniDne.has(o)) { prvniDne.add(o); x.vstupni.add(o); }
    } else if (u.event_name === "page_left") {
      const sek = Number(u.p.sekund); if (Number.isFinite(sek) && sek > 0 && sek < 3600) x.sekundy.push(sek);
    }
    m.set(c, x);
  }
  // Odchodová stránka = poslední zobrazená stránka člověka v den
  const posledni = new Map<string, string>();
  for (const u of ud) if (u.event_name === "page_viewed") { const o = osoba(u); if (o) posledni.set(o, cesta(u)); }
  for (const [o, c] of posledni) m.get(c)?.odchody.add(o);
  return [...m].filter(([, x]) => x.lide.size).map(([c, x]) => ({
    cesta: c, nazev: nazevStranky(c), lide: x.lide.size, zobrazeni: x.zobrazeni, vstupni: x.vstupni.size, odchody: x.odchody.size,
    prumerSekund: x.sekundy.length ? Math.round(x.sekundy.reduce((a, b) => a + b, 0) / x.sekundy.length) : null,
  })).sort((a, b) => b.lide - a.lide);
}

/** Kolik lidí došlo aspoň do 25 / 50 / 75 / 100 % stránky a kde lidé naposledy byli (sekce). */
export function scroll(ud: Udalost[], c: string) {
  const max = new Map<string, number>(), sekce = new Map<string, string>();
  for (const u of ud) if (u.event_name === "page_left" && cesta(u) === c) {
    const o = osoba(u); if (!o) continue;
    const sc = Number(u.p.scroll); if (Number.isFinite(sc)) max.set(o, Math.max(max.get(o) ?? 0, sc));
    const se = s(u.p.sekce); if (se) sekce.set(o, se);
  }
  const hodnoty = [...max.values()];
  const posledniSekce = new Map<string, number>();
  for (const se of sekce.values()) posledniSekce.set(se, (posledniSekce.get(se) ?? 0) + 1);
  return {
    lide: hodnoty.length,
    prahy: [25, 50, 75, 100].map((p) => ({ prah: p, lide: hodnoty.filter((h) => h >= p).length })),
    sekce: [...posledniSekce].map(([k, n]) => ({ sekce: nazevSekce(k), lide: n })).sort((a, b) => b.lide - a.lide),
  };
}

export interface StatPrvku { cil: string; nazev: string; stranka: string; lide: number; kliku: number }
export function kliky(ud: Udalost[]): { prvky: StatPrvku[]; nikdo: string[]; rage: { nazev: string; lide: number }[]; bezNazvu: number } {
  // Kliky z doby před úklidem měření (26. 11.) bez lidského názvu („tlačítko“, adresa) se jen sečtou
  const bezNazvu = ud.filter((u) => u.event_name === "element_clicked" && (!s(u.p.cil) || s(u.p.cil) === "tlačítko" || s(u.p.cil)!.startsWith("/"))).length;
  const m = new Map<string, { lide: Set<string>; kliku: number; stranka: string }>();
  const rage = new Map<string, Set<string>>();
  for (const u of ud) {
    const o = osoba(u); if (!o) continue;
    const cil = s(u.p.cil); if (!cil || cil === "tlačítko" || cil.startsWith("/")) continue;
    if (u.event_name === "element_clicked") { const x = m.get(cil) ?? { lide: new Set(), kliku: 0, stranka: cesta(u) }; x.lide.add(o); x.kliku++; m.set(cil, x); }
    if (u.event_name === "rage_clicked") rage.set(cil, (rage.get(cil) ?? new Set()).add(o));
  }
  return {
    prvky: [...m].map(([cil, x]) => ({ cil, nazev: nazevPrvku(cil), stranka: nazevStranky(x.stranka), lide: x.lide.size, kliku: x.kliku })).sort((a, b) => b.lide - a.lide),
    nikdo: Object.keys(NAZVY_PRVKU).filter((k) => !m.has(k)).map(nazevPrvku),
    rage: [...rage].map(([k, v]) => ({ nazev: nazevPrvku(k), lide: v.size })).sort((a, b) => b.lide - a.lide),
    bezNazvu,
  };
}

// ── Formuláře (CH-05) ──

export function formular(ud: Udalost[], c: string) {
  const otevreli = new Set<string>(), zacali = new Set<string>(), odeslali = new Set<string>();
  const pole = new Map<string, Set<string>>(), chyby = new Map<string, Set<string>>(), odesli = new Map<string, Set<string>>();
  const startCas = new Map<string, number>(), casy: number[] = [];
  const doPeti = new Set<string>();
  for (const u of ud) {
    const o = osoba(u); if (!o || cesta(u) !== c && !u.event_name.startsWith("signup")) continue;
    if (u.event_name === "page_viewed") otevreli.add(o);
    if (u.event_name === "page_left" && Number(u.p.sekund) <= 5 && !zacali.has(o)) doPeti.add(o);
    if (u.event_name === "form_started") { zacali.add(o); if (!startCas.has(o)) startCas.set(o, Date.parse(u.created_at)); const p = s(u.p.cil); if (p) pole.set(p, (pole.get(p) ?? new Set()).add(o)); }
    if (u.event_name === "form_error_shown") { const t = s(u.p.cil) ?? "?"; chyby.set(t, (chyby.get(t) ?? new Set()).add(o)); }
    if (c === "/registrace" && (u.event_name === "signup_submitted" || u.event_name === "signup_google_started")) { odeslali.add(o); const st = startCas.get(o); if (st) casy.push(Math.round((Date.parse(u.created_at) - st) / 1000)); }
    if (u.event_name === "page_left" && s(u.p.posledni_pole) && !odeslali.has(o)) { const p = s(u.p.posledni_pole)!; odesli.set(p, (odesli.get(p) ?? new Set()).add(o)); }
  }
  casy.sort((a, b) => a - b);
  const mapa = (m: Map<string, Set<string>>) => [...m].map(([k, v]) => ({ nazev: k, lide: v.size })).sort((a, b) => b.lide - a.lide);
  return { otevreli: otevreli.size, zacali: zacali.size, odeslali: odeslali.size, doPetiSekund: doPeti.size, medianSekund: casy.length ? casy[Math.floor(casy.length / 2)] : null, pole: mapa(pole), chyby: mapa(chyby), odesliU: mapa(odesli) };
}

// ── Demo ──

let demoCache: { od: string; d: Udalost[] } | null = null;

export function demoUdalosti(od: string): Udalost[] {
  if (demoCache?.od === od) return demoCache.d;
  let x = 20261129 >>> 0;
  const r = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
  const out: Udalost[] = [];
  const zacatek = Date.parse(od), ted = Date.now();
  const zdroje = [{ utm_source: "fb", utm_campaign: "120250280402450491" }, { ref: "facebook.com" }, {}, { utm_source: "vysledky", utm_campaign: "test-14-11" }, { utm_source: "email", utm_campaign: "styska" }, { ref: "matematika-snadno.cz" }];
  const pridej = (event_name: string, kdy: number, p: Record<string, unknown>, user_id: string | null = null) => out.push({ event_name, user_id, created_at: new Date(kdy).toISOString(), p });
  for (let i = 0; i < 160; i++) {
    const kdy0 = zacatek + Math.floor(r() * Math.max(1, ted - zacatek - 3600000));
    const v = `d${i}`;
    const z = zdroje[Math.floor(r() * zdroje.length)];
    const mobil = r() < 0.85;
    const zakl = { v, zarizeni: mobil ? "mobil" : "pocitac", ...z };
    let t = kdy0;
    if (r() < 0.55) {
      // rovnou na registraci (reklama)
      pridej("page_viewed", t, { ...zakl, cesta: "/registrace", vstup: true });
      if (r() < 0.6) { pridej("page_left", t + 4000, { ...zakl, cesta: "/registrace", sekund: 3, scroll: 10 }); continue; }
      t += 15000; pridej("form_started", t, { ...zakl, cesta: "/registrace", cil: "Třída" });
      if (r() < 0.3) { pridej("form_error_shown", t + 5000, { ...zakl, cesta: "/registrace", cil: "Vyber, jestli jsi v 5. nebo 9. třídě" }); }
      if (r() < 0.45) { pridej("signup_submitted", t + 70000, { ...zakl, cesta: "/registrace", cil: "9" }); }
      else pridej("page_left", t + 40000, { ...zakl, cesta: "/registrace", sekund: 45, posledni_pole: r() < 0.6 ? "Třída" : "Heslo" });
    } else {
      pridej("page_viewed", t, { ...zakl, cesta: "/", vstup: true });
      const sc = Math.floor(r() * 100);
      if (r() < 0.4) pridej("element_clicked", t + 9000, { ...zakl, cesta: "/", cil: "uvod-zacit" });
      if (r() < 0.25) pridej("sample_answered", t + 20000, { ...zakl, cesta: "/", odpoved: "36", spravne: r() < 0.6 });
      if (r() < 0.05) pridej("rage_clicked", t + 25000, { ...zakl, cesta: "/", cil: "uvod-video" });
      pridej("page_left", t + 60000, { ...zakl, cesta: "/", sekund: 30 + Math.floor(r() * 120), scroll: sc, sekce: ["uvod", "zkus-priklad", "ukazky", "cenik", "otazky"][Math.min(4, Math.floor(sc / 22))] });
      if (r() < 0.3) { t += 70000; pridej("page_viewed", t, { ...zakl, cesta: "/registrace" }); if (r() < 0.5) pridej("signup_submitted", t + 60000, { ...zakl, cesta: "/registrace", cil: "5" }); }
    }
  }
  out.sort((a, b) => a.created_at.localeCompare(b.created_at));
  demoCache = { od, d: out };
  return out;
}
