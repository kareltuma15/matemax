/**
 * Rodiny (fáze B3, DA-05, ZA-09 Rodina, ZA-10 Rodiče). Rodič = e-mail z propojení rodiče s dítětem (parent_child_link),
 * odběr reportu z parent_settings, sourozenci = další děti se stejným e-mailem rodiče, platby a zprávy rodině z logu zpráv.
 * Kontakt z Wixu přijde ve fázi D. Testy nanečisto z Vyhodnocení (vysledky_testy).
 */
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Kontext } from "./data";
import type { Zak } from "./typy";

export interface Rodic { email: string; deti: string[]; overeno: boolean; od: string; report: "tydne" | "mesicne" | "vypnuto" | "neznamo" }
export interface TestNanecisto { n: number; d: string; celkem: { pts: number; max: number } | null; temata: { k: string; s?: string; pts: number; max: number; j: string }[] }

/** Všichni rodiče s dětmi (ZA-10). V demu z e-mailu rodiče u demo žáků. */
export async function nactiRodice(k: Kontext, zaci: Zak[]): Promise<Rodic[]> {
  const pocitane = new Set(zaci.map((z) => z.id));
  if (k.demo || !supabaseAdmin) {
    const m = new Map<string, Rodic>();
    zaci.filter((z) => z.rodic_email).forEach((z, i) => {
      const email = `rodic${i % 3}@example.invalid`;
      const r = m.get(email) ?? { email, deti: [], overeno: i % 4 !== 3, od: z.registrace, report: i % 4 === 3 ? "neznamo" : i % 5 === 0 ? "mesicne" : "tydne" };
      r.deti.push(z.id); m.set(email, r);
    });
    return [...m.values()];
  }
  const [{ data: odkazy }, { data: nastaveni }] = await Promise.all([
    supabaseAdmin.from("parent_child_link").select("parent_email, child_user_id, verified, created_at").limit(5000),
    supabaseAdmin.from("parent_settings").select("parent_email, report_frequency").limit(5000),
  ]);
  const frekvence = new Map((nastaveni ?? []).map((n) => [String(n.parent_email).toLowerCase(), String(n.report_frequency ?? "")]));
  const m = new Map<string, Rodic>();
  for (const o of (odkazy ?? []) as { parent_email: string; child_user_id: string; verified: boolean; created_at: string }[]) {
    if (!pocitane.has(o.child_user_id)) continue;
    const email = o.parent_email.toLowerCase();
    const f = frekvence.get(email);
    const r = m.get(email) ?? { email, deti: [], overeno: false, od: o.created_at, report: f === "vypnuto" ? "vypnuto" : f === "mesicne" ? "mesicne" : f === "tydne" || !f ? "tydne" : "neznamo" } as Rodic;
    if (!r.deti.includes(o.child_user_id)) r.deti.push(o.child_user_id);
    r.overeno = r.overeno || !!o.verified;
    if (o.created_at < r.od) r.od = o.created_at;
    m.set(email, r);
  }
  return [...m.values()].sort((a, b) => b.od.localeCompare(a.od));
}

export async function nactiTesty(k: Kontext, userId: string): Promise<TestNanecisto[]> {
  if (k.demo || !supabaseAdmin) return [];
  const { data } = await supabaseAdmin.from("vysledky_testy").select("test_n, test_d, celkem, temata").eq("user_id", userId).order("test_d", { ascending: false }).limit(10);
  return (data ?? []).map((r) => ({ n: r.test_n as number, d: r.test_d as string, celkem: (r.celkem as TestNanecisto["celkem"]) ?? null, temata: (Array.isArray(r.temata) ? r.temata : []) as TestNanecisto["temata"] }));
}
