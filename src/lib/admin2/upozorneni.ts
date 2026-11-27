/**
 * Centrum upozornění (KO-12): zvonek v liště adminu. Upozornění se skládají z dat za 7 dní (nic se kvůli nim neukládá):
 * nové položky ve Schránce, platby, opakované chyby (3+ za 24 h), selhané automatické úlohy a webhooky, noví žáci.
 * Přečtené = starší než čas posledního otevření zvonku (admin_nastaveni.upozorneni_precteno).
 */
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { demoZpravy, DRUHY_SCHRANKY } from "./zpravy";
import type { Kontext } from "./data";

export interface Upozorneni { id: string; typ: "zprava" | "platba" | "chyba" | "system" | "zak"; text: string; href: string; cas: string; nove: boolean }

const H = 3600000;

export const nactiUpozorneni = cache(async (k: Kontext, zaci: { id: string; registrace: string; trida: number }[]): Promise<Upozorneni[]> => {
  const ted = Date.now();
  const od = new Date(ted - 7 * 24 * H).toISOString();
  const out: Omit<Upozorneni, "nove">[] = [];
  let precteno: string | null = null;

  if (k.demo || !supabaseAdmin) {
    for (const p of demoZpravy().schranka.filter((x) => x.stav === "nove")) out.push({ id: `s${p.id}`, typ: "zprava", text: `${DRUHY_SCHRANKY[p.druh]} ve Schránce`, href: "/admin/novy/zpravy", cas: p.created_at });
    out.push({ id: "demo-platba", typ: "platba", text: "Nová platba Premium (99 Kč)", href: "/admin/novy/zaci?segment=premium", cas: new Date(ted - 30 * H).toISOString() });
    precteno = new Date(ted - 20 * H).toISOString();
  } else {
    const db = supabaseAdmin;
    const tichy = <T,>(p: PromiseLike<{ data: T[] | null }>) => Promise.resolve(p).then((r) => r.data ?? []).catch(() => [] as T[]);
    const [schranka, platby, chyby, crony, webhooky, nast] = await Promise.all([
      tichy(db.from("schranka").select("id, druh, created_at").eq("stav", "nove").gte("created_at", od).order("created_at", { ascending: false }).limit(20)),
      tichy(db.from("analytics_events").select("id, event_name, properties, created_at").in("event_name", ["invoice_paid", "charge_refunded", "premium_purchased"]).gte("created_at", od).order("created_at", { ascending: false }).limit(20)),
      tichy(db.from("chyby").select("otisk, zprava, cas").gte("cas", new Date(ted - 24 * H).toISOString()).order("cas", { ascending: false }).limit(500)),
      tichy(db.from("behy_cronu").select("id, uloha, zacatek").eq("ok", false).gte("zacatek", od).order("zacatek", { ascending: false }).limit(10)),
      tichy(db.from("webhooky").select("id, zdroj, typ, prijato_at").eq("stav", "chyba").gte("prijato_at", od).order("prijato_at", { ascending: false }).limit(10)),
      tichy(db.from("admin_nastaveni").select("hodnota").eq("klic", "upozorneni_precteno").limit(1)),
    ]);
    for (const p of schranka as { id: number; druh: keyof typeof DRUHY_SCHRANKY; created_at: string }[]) out.push({ id: `s${p.id}`, typ: "zprava", text: `${DRUHY_SCHRANKY[p.druh] ?? "Zpráva"} ve Schránce`, href: "/admin/novy/zpravy", cas: p.created_at });
    for (const p of platby as { id: number; event_name: string; properties: Record<string, unknown> | null; created_at: string }[]) {
      const castka = Number(p.properties?.castka ?? 0) / 100;
      out.push({ id: `p${p.id}`, typ: "platba", text: p.event_name === "charge_refunded" ? `Vrácená platba${castka ? ` (${castka.toLocaleString("cs-CZ")} Kč)` : ""}` : p.event_name === "invoice_paid" ? `Zaplacená faktura${castka ? ` (${castka.toLocaleString("cs-CZ")} Kč)` : ""}` : "Nové předplatné Premium", href: "/admin/novy/zaci?segment=premium", cas: p.created_at });
    }
    const podleOtisku = new Map<string, { n: number; zprava: string; cas: string }>();
    for (const c of chyby as { otisk: string; zprava: string; cas: string }[]) { const x = podleOtisku.get(c.otisk); if (x) x.n++; else podleOtisku.set(c.otisk, { n: 1, zprava: c.zprava, cas: c.cas }); }
    for (const [otisk, c] of podleOtisku) if (c.n >= 3) out.push({ id: `c${otisk}`.slice(0, 120), typ: "chyba", text: `Chyba ${c.n}× za 24 h: ${c.zprava.slice(0, 70)}`, href: "/admin/novy/nastaveni#zdravi", cas: c.cas });
    for (const c of crony as { id: number; uloha: string; zacatek: string }[]) out.push({ id: `cr${c.id}`, typ: "system", text: `Automatická úloha selhala: ${c.uloha}`, href: "/admin/novy/nastaveni#zdravi", cas: c.zacatek });
    for (const w of webhooky as { id: number; zdroj: string; typ: string; prijato_at: string }[]) out.push({ id: `w${w.id}`, typ: "system", text: `Webhook ${w.zdroj === "stripe" ? "Stripe" : "Resend"} se nepovedl zpracovat (${w.typ})`, href: "/admin/novy/nastaveni#zdravi", cas: w.prijato_at });
    precteno = ((nast as { hodnota: unknown }[])[0]?.hodnota as { cas?: string } | undefined)?.cas ?? null;
  }
  for (const z of zaci) if (z.registrace >= od) out.push({ id: `z${z.id}`, typ: "zak", text: `Nový žák (${z.trida}. třída)`, href: `/admin/novy/zaci/${z.id}`, cas: z.registrace });
  return out.sort((a, b) => b.cas.localeCompare(a.cas)).slice(0, 30).map((u) => ({ ...u, nove: !precteno || u.cas > precteno }));
});
