import crypto from "crypto";
import { createClient, type User } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Propojení rodiče s dítětem (tabulka parent_child_link), schválil Karel 23. 11. 2026 (mockup rodic-propojeni).
 *
 * Propojení platí (verified = true) jen se souhlasem:
 * - rodič požádá → token „dite:…“ → dítě povolí kartou v appce,
 * - dítě pozve rodiče → token „rodic:…“ → rodič potvrdí odkazem v e-mailu,
 * - společný e-mail → token „stejny:…“ → platí hned (obě strany čtou stejnou schránku).
 * Nepotvrzená žádost po 14 dnech propadne. Report i rodičovský přehled čtou jen verified = true.
 */

export type DruhZadosti = "dite" | "rodic" | "stejny";
export const PLATNOST_ZADOSTI_MS = 14 * 24 * 3600_000;
export const MAX_RODICU = 3;

export interface LinkRow {
  id: string;
  parent_email: string;
  child_user_id: string;
  verified: boolean;
  token: string | null;
  created_at: string;
  verified_at: string | null;
}

export function novyToken(druh: DruhZadosti): string {
  return `${druh}:${crypto.randomBytes(16).toString("hex")}`;
}

/** Kdo má žádost potvrdit; staré tokeny bez předpony (před 23. 11.) jsou vždy už ověřené. */
export function druhTokenu(token: string | null): DruhZadosti | null {
  const p = token?.split(":")[0];
  return p === "dite" || p === "rodic" || p === "stejny" ? p : null;
}

export function propadla(row: Pick<LinkRow, "verified" | "created_at">): boolean {
  return !row.verified && Date.now() - new Date(row.created_at).getTime() > PLATNOST_ZADOSTI_MS;
}

export function normEmail(e: unknown): string {
  return typeof e === "string" ? e.trim().toLowerCase() : "";
}

export function platnyEmail(e: string): boolean {
  return e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/** Přihlášený uživatel z hlavičky Authorization (JWT ze Supabase). */
export async function uzivatelZPozadavku(req: NextRequest): Promise<User | null> {
  const auth = req.headers.get("Authorization");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!auth || !url || !anon) return null;
  const klient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data, error } = await klient.auth.getUser();
  return error ? null : data.user;
}

/**
 * Účet podle e-mailu. Dřív se hledalo jen v první stránce listUsers (50 účtů), takže od 51. účtu
 * se dítě „nenašlo“. Teď se prochází všechny stránky po 1000.
 */
export async function najdiUcetPodleEmailu(email: string): Promise<User | null> {
  if (!supabaseAdmin) return null;
  const hledany = normEmail(email);
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const nalez = data.users.find((u) => normEmail(u.email) === hledany);
    if (nalez) return nalez;
    if (data.users.length < 1000) return null;
  }
  return null;
}

/** Kolik rodičů má dítě (platná propojení + běžící žádosti). */
export async function pocetRodicu(childId: string): Promise<number> {
  if (!supabaseAdmin) return 0;
  const { data } = await supabaseAdmin
    .from("parent_child_link").select("verified, created_at").eq("child_user_id", childId);
  return ((data ?? []) as Pick<LinkRow, "verified" | "created_at">[]).filter((r) => !propadla(r)).length;
}

export function jmenoDitete(u: User): string {
  const m = (u.user_metadata ?? {}) as { first_name?: string; full_name?: string };
  return (m.first_name || m.full_name || (u.email ?? "").split("@")[0] || "Žák").slice(0, 40);
}
