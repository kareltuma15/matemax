/**
 * Zprávy v novém adminu (fáze B2): log zpráv, Schránka, šablony s dopadem a doručitelnost.
 * Zdroj: tabulky zpravy, zpravy_stav, schranka (migrace 20261128_admin_b1) a user_feedback.
 * V demo režimu vymyšlené zprávy k demo žákům (nic se nečte ani nezapisuje).
 */
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NAZVY as NAZVY_EMAILU } from "@/lib/emaily/katalog";
import { STAVY } from "@/lib/zpravy-log";
import { vlozDoSchranky } from "@/lib/schranka";
import { pragueDateStr } from "@/lib/date";
import type { Kontext } from "./data";
import type { Zak } from "./typy";
import { denZ, posunDen, type DnyAktivity } from "./metriky";

export interface Zprava {
  id: string; kanal: "email" | "push" | "vzkaz"; sablona: string; predmet: string | null; prijemce_typ: "zak" | "rodic" | "admin" | "jiny";
  user_id: string | null; prijemce: string | null; stav: string; testovaci: boolean; chyba: string | null; odeslano_at: string; stav_at: string;
}
export interface StavRadek { zprava_id: string; stav: string; detail: string | null; cas: string }
export interface Polozka {
  id: number; druh: "odpoved" | "zpetna_vazba" | "chyba_ulohy" | "anketa" | "vzkaz"; user_id: string | null; od: string | null; predmet: string | null;
  text: string | null; zprava_id: string | null; uloha_id: string | null; detail: Record<string, unknown> | null; stav: "nove" | "vyrizeno"; created_at: string; vyrizeno_at: string | null;
}

const NAZVY_DALSI: Record<string, string> = {
  report: "Týdenní přehled rodičům", premium: "Vítejte v Premium", platba: "Platba se nepovedla", pozvanka: "Pozvánka rodiče",
  vysledek_testu: "Výsledek testu nanečisto", online_test_prihlaska: "Test: přihláška potvrzena", online_test_24h: "Test: zítra začínáme",
  online_test_1h: "Test: za hodinu", online_test_arch: "Test: arch přijat", admin_test: "Test z adminu",
  push_pripominka: "Push: připomínka", push_serie: "Push: série", push_rucni: "Push: ruční", odpoved_admin: "Odpověď z adminu", vlastni: "Vlastní e-mail",
};
export function nazevSablony(s: string): string {
  return (NAZVY_EMAILU as Record<string, string>)[s] ?? NAZVY_DALSI[s] ?? s;
}
export const nazevStavu = (s: string) => STAVY[s]?.nazev ?? s;
export const DRUHY_SCHRANKY: Record<Polozka["druh"], string> = { odpoved: "Odpověď na e-mail", zpetna_vazba: "Zpětná vazba", chyba_ulohy: "Chyba v úloze", anketa: "Anketa", vzkaz: "Odpověď na vzkaz" };

/** Které kroky zpráva prošla (tečky v seznamu): odesláno, doručeno, kliknuto (u push zobrazeno/klepnuto), odpověděl. */
export function kroky(z: Zprava, stavy: StavRadek[]): { odeslano: boolean; doruceno: boolean; kliknuto: boolean; odpoved: boolean; problem: boolean } {
  const s = new Set([z.stav, ...stavy.map((x) => x.stav)]);
  const problem = !!STAVY[z.stav]?.spatny;
  return {
    odeslano: z.stav !== "selhalo",
    doruceno: s.has("doruceno") || s.has("zobrazeno") || s.has("otevreno") || s.has("kliknuto") || s.has("odpovezeno"),
    kliknuto: s.has("kliknuto"),
    odpoved: s.has("odpovezeno"),
    problem,
  };
}

export class ChybiMigraceB extends Error {}
const chybiTabulka = (m: string) => /relation .*(zpravy|schranka)|schema cache|does not exist/i.test(m);

// ── Načítání ──

export async function nactiZpravy(k: Kontext, o: { od?: string; userId?: string; limit?: number } = {}): Promise<{ zpravy: Zprava[]; stavy: Map<string, StavRadek[]> }> {
  if (k.demo) {
    const d = demoZpravy();
    const zpravy = d.zpravy.filter((z) => (!o.userId || z.user_id === o.userId) && (!o.od || z.odeslano_at >= o.od)).slice(0, o.limit ?? 500);
    const stavy = new Map<string, StavRadek[]>();
    for (const s of d.stavy) if (zpravy.some((z) => z.id === s.zprava_id)) stavy.set(s.zprava_id, [...(stavy.get(s.zprava_id) ?? []), s]);
    return { zpravy, stavy };
  }
  if (!supabaseAdmin) return { zpravy: [], stavy: new Map() };
  const out: Zprava[] = [];
  const limit = o.limit ?? 2000;
  for (let i = 0; i < limit; i += 1000) {
    let q = supabaseAdmin.from("zpravy").select("*").order("odeslano_at", { ascending: false }).range(i, Math.min(i + 999, limit - 1));
    if (o.od) q = q.gte("odeslano_at", o.od);
    if (o.userId) q = q.eq("user_id", o.userId);
    const { data, error } = await q;
    if (error) { if (chybiTabulka(error.message)) throw new ChybiMigraceB(error.message); throw new Error(error.message); }
    out.push(...((data ?? []) as Zprava[]));
    if ((data ?? []).length < 1000) break;
  }
  const stavy = new Map<string, StavRadek[]>();
  const ids = out.map((z) => z.id);
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabaseAdmin.from("zpravy_stav").select("zprava_id, stav, detail, cas").in("zprava_id", ids.slice(i, i + 200)).order("cas").limit(5000);
    for (const s of (data ?? []) as StavRadek[]) stavy.set(s.zprava_id, [...(stavy.get(s.zprava_id) ?? []), s]);
  }
  return { zpravy: out, stavy };
}

/** Zpětná vazba z appky (user_feedback) se do Schránky přenese při otevření (feedback route se nemění). */
async function prenesZpetnouVazbu(): Promise<void> {
  if (!supabaseAdmin) return;
  const od = new Date(Date.now() - 60 * 86400000).toISOString();
  const { data } = await supabaseAdmin.from("user_feedback").select("id, user_id, rating, liked, suggestion, created_at").gte("created_at", od).limit(500);
  const radky = (data ?? []).map((f) => ({
    druh: "zpetna_vazba", user_id: f.user_id ?? null, text: (f.suggestion as string | null)?.slice(0, 20000) ?? null, zdroj_id: String(f.id),
    detail: { hodnoceni: f.rating, libi: f.liked ?? [] }, created_at: f.created_at,
  }));
  if (radky.length) await vlozDoSchranky(radky);
}

export async function nactiSchranku(k: Kontext, o: { stav?: "nove" | "vyrizeno" | "vse"; userId?: string } = {}): Promise<Polozka[]> {
  if (k.demo) return demoZpravy().schranka.filter((p) => (!o.userId || p.user_id === o.userId) && (o.stav === "vse" || !o.stav ? true : p.stav === o.stav));
  if (!supabaseAdmin) return [];
  if (!o.userId) await prenesZpetnouVazbu().catch(() => {});
  let q = supabaseAdmin.from("schranka").select("*").order("created_at", { ascending: false }).limit(300);
  if (o.stav && o.stav !== "vse") q = q.eq("stav", o.stav);
  if (o.userId) q = q.eq("user_id", o.userId);
  const { data, error } = await q;
  if (error) { if (chybiTabulka(error.message)) throw new ChybiMigraceB(error.message); throw new Error(error.message); }
  return (data ?? []) as Polozka[];
}

/** Zprávy jednoho žáka pro kartu (e-maily, push, odpovědi). Bez migrace vrátí chybi: true místo výjimky. */
export async function zpravyZaka(k: Kontext, userId: string): Promise<{ zpravy: Zprava[]; stavy: Map<string, StavRadek[]>; schranka: Polozka[]; chybi: boolean }> {
  try {
    const [{ zpravy, stavy }, schranka] = await Promise.all([nactiZpravy(k, { userId, limit: 300 }), nactiSchranku(k, { userId, stav: "vse" })]);
    return { zpravy, stavy, schranka, chybi: false };
  } catch (e) {
    if (e instanceof ChybiMigraceB) return { zpravy: [], stavy: new Map(), schranka: [], chybi: true };
    throw e;
  }
}

/** Platby žáka ze Stripe webhooků (invoice.paid, charge.refunded), od nasazení fáze B1. */
export async function platbyZaka(k: Kontext, userId: string): Promise<{ druh: "zaplaceno" | "vraceno"; castka: number; mena: string; cas: string }[]> {
  if (k.demo || !supabaseAdmin) return [];
  const { data } = await supabaseAdmin.from("analytics_events").select("event_name, properties, created_at").eq("user_id", userId).in("event_name", ["invoice_paid", "charge_refunded"]).order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map((r) => { const p = (r.properties ?? {}) as Record<string, unknown>; return { druh: r.event_name === "invoice_paid" ? "zaplaceno" as const : "vraceno" as const, castka: Number(p.castka ?? 0) / 100, mena: String(p.mena ?? "czk").toUpperCase(), cas: r.created_at as string }; });
}

/** Odznak u Zpráv: počet nových položek ve Schránce (jeden rychlý dotaz, chyba = bez odznaku). */
export const pocetNovychVeSchrance = cache(async (demo: boolean): Promise<number> => {
  if (demo) return demoZpravy().schranka.filter((p) => p.stav === "nove").length;
  if (!supabaseAdmin) return 0;
  const { count, error } = await supabaseAdmin.from("schranka").select("id", { count: "exact", head: true }).eq("stav", "nove");
  if (error) return 0;
  return count ?? 0;
});

// ── Šablony a dopad (ZP-08) ──

export interface DopadSablony { sablona: string; nazev: string; kanal: string; odeslano: number; doruceno: number; kliknuto: number; odpovedi: number; problemy: number; zaci: number; trenovali: number; lideTrenovali: string[]; lide: string[] }

/**
 * Dopad: kolik různých žáků po zprávě trénovalo. Aktivita je po dnech, proto „do 48 h“ = den zprávy nebo dva další dny.
 * Počítají se jen zprávy žákům (u rodičovského reportu dítě, ke kterému patří), bez testovacích.
 */
export function dopadSablon(zpravy: Zprava[], stavy: Map<string, StavRadek[]>, dny: DnyAktivity): DopadSablony[] {
  const m = new Map<string, DopadSablony>();
  const trenoval = (uid: string, kdy: string) => { const d0 = denZ(kdy); const s = dny.get(uid); if (!s) return false; for (let i = 0; i <= 2; i++) if (s.has(posunDen(d0, i))) return true; return false; };
  for (const z of zpravy) {
    if (z.testovaci) continue;
    const d = m.get(z.sablona) ?? { sablona: z.sablona, nazev: nazevSablony(z.sablona), kanal: z.kanal, odeslano: 0, doruceno: 0, kliknuto: 0, odpovedi: 0, problemy: 0, zaci: 0, trenovali: 0, lideTrenovali: [], lide: [] };
    const kr = kroky(z, stavy.get(z.id) ?? []);
    if (kr.odeslano) d.odeslano++;
    if (kr.doruceno) d.doruceno++;
    if (kr.kliknuto) d.kliknuto++;
    if (kr.odpoved) d.odpovedi++;
    if (kr.problem) d.problemy++;
    if (z.user_id && !d.lide.includes(z.user_id)) { d.lide.push(z.user_id); d.zaci++; }
    if (z.user_id && kr.odeslano && !d.lideTrenovali.includes(z.user_id) && trenoval(z.user_id, z.odeslano_at)) { d.lideTrenovali.push(z.user_id); d.trenovali++; }
    m.set(z.sablona, d);
  }
  return [...m.values()].sort((a, b) => b.odeslano - a.odeslano);
}

export function dorucitelnost(zpravy: Zprava[]) {
  const emaily = zpravy.filter((z) => z.kanal === "email" && !z.testovaci);
  const pocet = (s: string) => emaily.filter((z) => z.stav === s).length;
  return { celkem: emaily.length, vraceno: pocet("vraceno"), spam: pocet("spam"), potlaceno: pocet("potlaceno"), selhalo: pocet("selhalo") };
}

/** E-maily odeslané přes Resend za posledních 24 h podle logu (strop Resend Free je 100 denně; bereme opatrně klouzavých 24 h). */
export async function odeslano24h(k: Kontext): Promise<number> {
  if (k.demo || !supabaseAdmin) return 6;
  const { count } = await supabaseAdmin.from("zpravy").select("id", { count: "exact", head: true }).eq("kanal", "email").gte("odeslano_at", new Date(Date.now() - 24 * 3600000).toISOString());
  return count ?? 0;
}

/** Kdo stejnou šablonu dostal v posledních 7 dnech, nebo má vrácený e-mail / spam (z logu zpráv). */
export async function vylouceniZLogu(ids: string[], sablona: string): Promise<{ nedavno: Set<string>; problem: Set<string> }> {
  const nedavno = new Set<string>(), problem = new Set<string>();
  if (!supabaseAdmin || !ids.length) return { nedavno, problem };
  const od = new Date(Date.now() - 7 * 86400000).toISOString();
  for (let i = 0; i < ids.length; i += 200) {
    const cast = ids.slice(i, i + 200);
    const [{ data: a }, { data: b }] = await Promise.all([
      supabaseAdmin.from("zpravy").select("user_id").eq("sablona", sablona).eq("testovaci", false).neq("stav", "selhalo").gte("odeslano_at", od).in("user_id", cast),
      supabaseAdmin.from("zpravy").select("user_id").eq("kanal", "email").eq("prijemce_typ", "zak").in("stav", ["vraceno", "spam", "potlaceno"]).in("user_id", cast),
    ]);
    for (const r of a ?? []) if (r.user_id) nedavno.add(r.user_id as string);
    for (const r of b ?? []) if (r.user_id) problem.add(r.user_id as string);
  }
  return { nedavno, problem };
}

// ── Demo ──

let demoCache: { den: string; d: { zpravy: Zprava[]; stavy: StavRadek[]; schranka: Polozka[] } } | null = null;

export function demoZpravy(zaci?: Zak[]) {
  const den = pragueDateStr();
  if (demoCache?.den === den) return demoCache.d;
  const ids = (zaci ?? []).map((z) => z.id);
  const uid = (i: number) => ids[i] ?? `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
  const ted = Date.now();
  const H = 3600000;
  const zpravy: Zprava[] = [];
  const stavy: StavRadek[] = [];
  const sablony = ["styska", "nezacal", "plan", "report", "push_pripominka", "uvitani", "spi"];
  for (let i = 0; i < 34; i++) {
    const s = sablony[i % sablony.length];
    const kanal = s.startsWith("push") ? "push" : "email";
    const kdy = new Date(ted - (i * 19 + 2) * H).toISOString();
    const id = `10000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
    const stav = i === 5 ? "vraceno" : i % 4 === 0 ? "kliknuto" : i % 7 === 3 ? "odpovezeno" : "doruceno";
    zpravy.push({ id, kanal, sablona: s, predmet: nazevSablony(s), prijemce_typ: s === "report" ? "rodic" : "zak", user_id: uid(i % 20), prijemce: kanal === "email" ? `demo${i}@example.invalid` : null, stav, testovaci: false, chyba: null, odeslano_at: kdy, stav_at: kdy });
    stavy.push({ zprava_id: id, stav: "odeslano", detail: null, cas: kdy });
    if (stav !== "vraceno") stavy.push({ zprava_id: id, stav: kanal === "push" ? "zobrazeno" : "doruceno", detail: null, cas: new Date(Date.parse(kdy) + 60000).toISOString() });
    else stavy.push({ zprava_id: id, stav: "vraceno", detail: "Adresa neexistuje", cas: new Date(Date.parse(kdy) + 60000).toISOString() });
    if (stav === "kliknuto" || stav === "odpovezeno") stavy.push({ zprava_id: id, stav: "kliknuto", detail: "matemax.matematika-snadno.cz/trenink", cas: new Date(Date.parse(kdy) + 40 * 60000).toISOString() });
    if (stav === "odpovezeno") stavy.push({ zprava_id: id, stav: "odpovezeno", detail: null, cas: new Date(Date.parse(kdy) + 3 * H).toISOString() });
  }
  const schranka: Polozka[] = [
    { id: 1, druh: "odpoved", user_id: uid(3), od: "demo3@example.invalid", predmet: "Re: Plán po diagnostice", text: "Dobrý den, diagnostiku jsem začal, ale nevím, jestli se mi uložila. Mám ji dělat znovu?", zprava_id: zpravy[3].id, uloha_id: null, detail: null, stav: "nove", created_at: new Date(ted - 2 * H).toISOString(), vyrizeno_at: null },
    { id: 2, druh: "chyba_ulohy", user_id: uid(1), od: null, predmet: null, text: "Výsledek 3/4 je stejný jako 0,75, appka ho nevzala.", zprava_id: null, uloha_id: "ZLO2_14", detail: { duvod: "spatny_vysledek", odpoved: "0,75" }, stav: "nove", created_at: new Date(ted - 5 * H).toISOString(), vyrizeno_at: null },
    { id: 3, druh: "zpetna_vazba", user_id: uid(2), od: null, predmet: null, text: "Chtěla bych víc úloh na slovní úlohy.", zprava_id: null, uloha_id: null, detail: { hodnoceni: 4, libi: ["Hexík", "truhly"] }, stav: "nove", created_at: new Date(ted - 26 * H).toISOString(), vyrizeno_at: null },
    { id: 4, druh: "zpetna_vazba", user_id: uid(6), od: null, predmet: null, text: "Je to super, jen bych chtěl tmavý režim.", zprava_id: null, uloha_id: null, detail: { hodnoceni: 5, libi: ["odměny"] }, stav: "vyrizeno", created_at: new Date(ted - 80 * H).toISOString(), vyrizeno_at: new Date(ted - 70 * H).toISOString() },
  ];
  const d = { zpravy, stavy, schranka };
  demoCache = { den, d };
  return d;
}
