/**
 * Propojení s Vyhodnocením testů: věci jen pro server (klíč API, jednorázové kódy, přihlášený žák).
 * Klíč MATEMAX_API_KEY je jen v proměnných prostředí ve Vercelu, nikdy v prohlížeči ani v gitu.
 */
import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "./supabase-admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Platnost jednorázového kódu z obrazovky propojení. */
export const KOD_PLATNOST_MS = 5 * 60 * 1000;

const sha = (s: string) => createHash("sha256").update(s, "utf8").digest();

/** Volá appka Vyhodnocení testů se správným klíčem? Bez nastaveného klíče neprojde nikdo. */
export function overApiKlic(req: Request, klic = process.env.MATEMAX_API_KEY): boolean {
  const h = req.headers.get("authorization") ?? "";
  if (!klic || !h.startsWith("Bearer ")) return false;
  return timingSafeEqual(sha(h.slice(7)), sha(klic));
}

export const novyKod = () => randomBytes(32).toString("base64url");
export const hashKodu = (code: string) => createHash("sha256").update(code, "utf8").digest("base64url");
export const noveLinkId = () => randomUUID();

/** Produkce = nasazená appka na Vercelu (tam se nesmí vracet na localhost). */
export const jeProdukce = () => process.env.VERCEL_ENV === "production";

/** Přihlášený žák podle tokenu z jeho prohlížeče (hlavička Authorization). */
export async function prihlasenyZak(req: Request): Promise<User | null> {
  const h = req.headers.get("authorization");
  if (!h?.startsWith("Bearer ") || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const klient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: h } } });
  const { data, error } = await klient.auth.getUser();
  return error || !data.user ? null : data.user;
}

export const chyba = (status: number, error: string) =>
  NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export const ok = (body: unknown) => NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });

export interface Propojeni { link_id: string; user_id: string; g: "m5" | "m9"; zruseno_at: string | null; vytvoreno_at: string }

/** Propojení podle link_id: null = neznámé, jinak řádek (pozor na zruseno_at → 410). */
export async function nactiPropojeni(linkId: string): Promise<Propojeni | null> {
  if (!supabaseAdmin) return null;
  const { data } = await supabaseAdmin
    .from("vysledky_propojeni")
    .select("link_id, user_id, g, zruseno_at, vytvoreno_at")
    .eq("link_id", linkId)
    .maybeSingle();
  return (data as Propojeni | null) ?? null;
}
