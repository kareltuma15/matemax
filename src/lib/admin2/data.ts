/**
 * Zdroj dat nového adminu: ostrá databáze (SQL funkce admin_zaci a admin_aktivita), nebo demo data.
 * Kdo se nepočítá, se rozhoduje v SQL (testovací účty, admin_role) a pro jistotu ještě tady (admin e-mail),
 * stejně jako ve všech starších výpočtech (src/lib/admin-data.ts).
 */
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { jeAdminEmail } from "@/lib/admin-auth";
import { demoData } from "./demo";
import { pragueDateStr } from "@/lib/date";
import type { Aktivita, Filtry, Zak } from "./typy";

export interface Kontext { demo: boolean; sdileni: boolean }

export async function kontext(searchDemo?: string | string[]): Promise<Kontext> {
  const c = await cookies();
  const e2e = process.env.NODE_ENV === "development" && process.env.ADMIN2_E2E === "1" && c.get("admin2_e2e")?.value === "1";
  return { demo: e2e || searchDemo === "1" || c.get("admin_demo")?.value === "1", sdileni: c.get("admin_sdileni")?.value === "1" };
}

export class ChybiMigrace extends Error {}

/** Všichni žáci (bez testovacích účtů a admina). */
export async function nactiZaky(k: Kontext): Promise<Zak[]> {
  if (k.demo) return demoData().zaci.filter((z) => !z._testovaci && !z._admin && !jeAdminEmail(z.email));
  if (!supabaseAdmin) throw new Error("Chybí service role");
  const out: Zak[] = [];
  for (let od = 0; od < 100_000; od += 1000) {
    const { data, error } = await supabaseAdmin.rpc("admin_zaci").order("registrace", { ascending: false }).range(od, od + 999);
    if (error) { if (/admin_zaci|function|schema cache/i.test(error.message)) throw new ChybiMigrace(error.message); throw new Error(error.message); }
    const d = (data ?? []) as Zak[];
    out.push(...d);
    if (d.length < 1000) break;
  }
  return out.filter((z) => !jeAdminEmail(z.email)).map((z) => ({ ...z, trida: Number(z.trida) === 5 ? 5 : 9 }));
}

/** Dny aktivity od data (včetně). */
export async function nactiAktivitu(k: Kontext, od: string): Promise<Aktivita[]> {
  if (k.demo) return demoData().aktivita.filter((a) => a.den >= od);
  if (!supabaseAdmin) throw new Error("Chybí service role");
  const out: Aktivita[] = [];
  for (let i = 0; i < 200_000; i += 1000) {
    const { data, error } = await supabaseAdmin.rpc("admin_aktivita", { p_od: od }).order("den").order("user_id").range(i, i + 999);
    if (error) { if (/admin_aktivita|function|schema cache/i.test(error.message)) throw new ChybiMigrace(error.message); throw new Error(error.message); }
    const d = (data ?? []) as Aktivita[];
    out.push(...d);
    if (d.length < 1000) break;
  }
  return out;
}

// ── Období a filtry v adrese (KO-06) ──

const posun = (den: string, o: number) => pragueDateStr(new Date(Date.parse(den + "T12:00:00Z") + o * 86400000));
const platneDatum = (s: unknown) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;

export function nactiFiltry(sp: Record<string, string | string[] | undefined>): Filtry {
  const dnes = pragueDateStr();
  const o = sp.obdobi;
  const obdobi: Filtry["obdobi"] = o === "dnes" || o === "30" || o === "90" || o === "vlastni" ? o : "7";
  let od: string, doo: string;
  if (obdobi === "vlastni" && platneDatum(sp.od) && platneDatum(sp.do) && (sp.od as string) <= (sp.do as string)) { od = sp.od as string; doo = sp.do as string; }
  else if (obdobi === "dnes") { od = dnes; doo = dnes; }
  else { const n = obdobi === "vlastni" ? 7 : Number(obdobi); od = posun(dnes, -(n - 1)); doo = dnes; }
  const dni = Math.round((Date.parse(doo) - Date.parse(od)) / 86400000) + 1;
  const t = Number(sp.trida);
  return { obdobi, od, do: doo, predOd: posun(od, -dni), predDo: posun(od, -1), dni, trida: t === 5 || t === 9 ? t : null, zdroj: typeof sp.zdroj === "string" && sp.zdroj ? sp.zdroj.slice(0, 100) : null };
}

/** Filtry jako query string (přenáší se při proklikávání a mezi sekcemi). */
export function filtryDoAdresy(f: Filtry, navic: Record<string, string | null | undefined> = {}): string {
  const q = new URLSearchParams();
  if (f.obdobi !== "7") q.set("obdobi", f.obdobi);
  if (f.obdobi === "vlastni") { q.set("od", f.od); q.set("do", f.do); }
  if (f.trida) q.set("trida", String(f.trida));
  if (f.zdroj) q.set("zdroj", f.zdroj);
  for (const [k, v] of Object.entries(navic)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `?${s}` : "";
}

/** Načte data, nebo vrátí null, když chybí migrace nového adminu (stránka pak ukáže návod). */
export async function bezMigrace<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch (e) { if (e instanceof ChybiMigrace) return null; throw e; }
}
