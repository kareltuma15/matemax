"use client";

/**
 * Plán po testu nanečisto v prohlížeči a u účtu.
 * - Odkaz z appky Vyhodnocení testů se do přihlášení drží jen v tomto zařízení (matemax-doporuceni-odkaz),
 *   aby se po registraci neztratil. Na server se nic neposílá, dokud si žák plán sám neuloží.
 * - Uložený plán: tabulka plan_po_testu (jeden na účet) + kopie v prohlížeči, kdyby tabulka ještě nebyla.
 * - Splněno: v každém doporučeném tématu aspoň 10 správných odpovědí od uložení plánu.
 */
import { supabase } from "./supabase";
import { reportDbError } from "./db-error";
import { loadGamification } from "./gamification";
import { normalizujDoporuceni, type Doporuceni } from "./doporuceni";

const KLIC_ODKAZ = "matemax-doporuceni-odkaz";
const KLIC_PLAN = "matemax-plan-po-testu";
const SPLNENO_SPRAVNE = 10;

export interface PlanPoTestu {
  doporuceni: Doporuceni;
  zaklad: Record<string, number>;
  ulozeno: string;
  splneno?: string | null;
}

// ── odkaz čekající na přihlášení ──
export function ulozOdkaz(token: string): void {
  try { localStorage.setItem(KLIC_ODKAZ, JSON.stringify({ token, kdy: Date.now() })); } catch { /* soukromé okno */ }
}
export function nactiOdkaz(): string | null {
  try {
    const raw = JSON.parse(localStorage.getItem(KLIC_ODKAZ) ?? "null") as { token: string; kdy: number } | null;
    // po 30 dnech odkaz zapomeneme
    if (!raw || Date.now() - raw.kdy > 30 * 86400000) return null;
    return raw.token;
  } catch { return null; }
}
export function zapomenOdkaz(): void {
  try { localStorage.removeItem(KLIC_ODKAZ); } catch { /* nic */ }
}

function spravneTed(): Record<string, number> {
  const stats = loadGamification().topicStats;
  return Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, v.correct]));
}

function lokalniPlan(): PlanPoTestu | null {
  try {
    const p = JSON.parse(localStorage.getItem(KLIC_PLAN) ?? "null") as PlanPoTestu | null;
    if (!p) return null;
    const d = normalizujDoporuceni(p.doporuceni);
    return d ? { ...p, doporuceni: d } : null;
  } catch { return null; }
}

/** Uloží doporučení jako plán k účtu (přepíše starší). Vrací false, když žák není přihlášený. */
export async function ulozPlan(doporuceni: Doporuceni): Promise<boolean> {
  const plan: PlanPoTestu = { doporuceni, zaklad: spravneTed(), ulozeno: new Date().toISOString(), splneno: null };
  try { localStorage.setItem(KLIC_PLAN, JSON.stringify(plan)); } catch { /* nic */ }
  zapomenOdkaz();
  if (!supabase) return true;
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) return false;
  const { error } = await supabase.from("plan_po_testu").upsert({
    user_id: uid, zdroj: "nanecisto", doporuceni, zaklad: plan.zaklad, ulozeno_at: plan.ulozeno, splneno_at: null,
  });
  reportDbError("plan_po_testu.upsert", error);
  return true;
}

/** Plán přihlášeného žáka: ze serveru, jinak z prohlížeče. Novější vyhrává. */
export async function nactiPlan(userId: string | null): Promise<PlanPoTestu | null> {
  const lokal = lokalniPlan();
  if (!supabase || !userId) return lokal;
  const { data, error } = await supabase
    .from("plan_po_testu")
    .select("doporuceni, zaklad, ulozeno_at, splneno_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return lokal;
  const d = normalizujDoporuceni(data.doporuceni);
  if (!d) return lokal;
  let zaklad = (data.zaklad ?? {}) as Record<string, number>;
  // Plán, který sestavil server z výsledku testu (propojení s Vyhodnocením testů): postup se počítá
  // od chvíle, kdy ho žák poprvé uvidí, protože správné odpovědi po tématech zná jen jeho prohlížeč.
  if (zaklad._novy) {
    zaklad = spravneTed();
    const { error: e } = await supabase.from("plan_po_testu").update({ zaklad }).eq("user_id", userId);
    reportDbError("plan_po_testu.zaklad", e);
  }
  const server: PlanPoTestu = { doporuceni: d, zaklad, ulozeno: data.ulozeno_at as string, splneno: data.splneno_at as string | null };
  const vysledek = lokal && lokal.ulozeno > server.ulozeno ? lokal : server;
  try { localStorage.setItem(KLIC_PLAN, JSON.stringify(vysledek)); } catch { /* nic */ }
  return vysledek;
}

/** Kolik správných odpovědí přibylo v každém doporučeném tématu od uložení plánu. */
export function postupPlanu(plan: PlanPoTestu): { k: string; pribylo: number; cil: number }[] {
  const ted = spravneTed();
  const temata = [...new Set(plan.doporuceni.top.map((t) => t.k))];
  return temata.map((k) => ({ k, pribylo: Math.max(0, (ted[k] ?? 0) - (plan.zaklad[k] ?? 0)), cil: SPLNENO_SPRAVNE }));
}

export function jeSplneny(plan: PlanPoTestu): boolean {
  return !!plan.splneno || postupPlanu(plan).every((p) => p.pribylo >= p.cil);
}

/** Zapíše splnění plánu (jednou). */
export async function oznacSplneny(plan: PlanPoTestu, userId: string | null): Promise<void> {
  const kdy = new Date().toISOString();
  try { localStorage.setItem(KLIC_PLAN, JSON.stringify({ ...plan, splneno: kdy })); } catch { /* nic */ }
  if (!supabase || !userId) return;
  const { error } = await supabase.from("plan_po_testu").update({ splneno_at: kdy }).eq("user_id", userId);
  reportDbError("plan_po_testu.splneno", error);
}
