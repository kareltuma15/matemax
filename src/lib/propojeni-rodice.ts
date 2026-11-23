import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// Propojení rodič ↔ dítě (tabulka parent_child_link). Rodič žádost jen založí (verified = false),
// data dítěte uvidí, až ji dítě v MateMaxu potvrdí. Všechny trasy (žádost, odpověď dítěte, přehled rodiče,
// zprávy rodiče, týdenní report) jdou přes tyhle funkce, ať pravidlo „bez souhlasu dítěte nic“ platí všude stejně.
// Funkce dostávají klienta se service role (supabaseAdmin); v testech in-memory náhradu.

export type Akce = "povolit" | "odmitnout" | "zrusit";
export type Zadost = { token: string; rodic: string };
export type ZadostiDitete = { cekajici: Zadost[]; overene: Zadost[] };

export type VysledekZadosti =
  | { ok: true; stav: "odeslano" | "uz_ceka" | "uz_overeno" }
  | { ok: false; chyba: "neplatny_email" | "neexistuje" | "vlastni_ucet" };

const TABULKA = "parent_child_link";
const STRANKA = 1000;

export function novyToken(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function platnyToken(t: unknown): t is string {
  return typeof t === "string" && /^[0-9a-f]{32,64}$/.test(t);
}

export function normalizujEmail(e: unknown): string | null {
  if (typeof e !== "string") return null;
  const s = e.trim().toLowerCase();
  if (s.length < 3 || s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  return s;
}

/**
 * Účet podle e-mailu. Hlavně přes RPC najdi_ucet_podle_emailu (migrace 20261123_propojeni_rodice.sql,
 * spustit smí jen service role). Dokud funkce v databázi není, projde všechny stránky listUsers
 * (dřív se četla jen první stránka = 50 účtů a další děti se nenašly).
 */
export async function najdiUcetPodleEmailu(db: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await db.rpc("najdi_ucet_podle_emailu", { p_email: email });
  if (!error) return typeof data === "string" && data ? data : null;

  console.warn("[propojeni-rodice] RPC najdi_ucet_podle_emailu nejde, procházím listUsers po stránkách:", error.message);
  for (let page = 1; page <= 500; page++) {
    const { data: d, error: e } = await db.auth.admin.listUsers({ page, perPage: STRANKA });
    if (e) throw e;
    const nalez = d.users.find((u) => u.email?.toLowerCase() === email);
    if (nalez) return nalez.id;
    if (d.users.length < STRANKA) return null;
  }
  return null;
}

/** Rodič požádá o propojení. Nikdy nic neověří a ověřené propojení nikdy neshodí zpět na neověřené. */
export async function zalozZadost(
  db: SupabaseClient,
  rodic: { id: string; email: string },
  emailDitete: unknown,
): Promise<VysledekZadosti> {
  const email = normalizujEmail(emailDitete);
  if (!email) return { ok: false, chyba: "neplatny_email" };
  if (email === rodic.email.toLowerCase()) return { ok: false, chyba: "vlastni_ucet" };

  const dite = await najdiUcetPodleEmailu(db, email);
  if (!dite) return { ok: false, chyba: "neexistuje" };
  if (dite === rodic.id) return { ok: false, chyba: "vlastni_ucet" };

  const { data: existujici, error: selErr } = await db
    .from(TABULKA)
    .select("verified")
    .eq("parent_email", rodic.email)
    .eq("child_user_id", dite)
    .maybeSingle();
  if (selErr) throw selErr;
  if (existujici) return { ok: true, stav: (existujici as { verified: boolean }).verified ? "uz_overeno" : "uz_ceka" };

  const { error: insErr } = await db.from(TABULKA).insert({
    parent_email: rodic.email,
    child_user_id: dite,
    verified: false,
    token: novyToken(),
    verified_at: null,
  });
  if (insErr) throw insErr;
  return { ok: true, stav: "odeslano" };
}

/** Co vidí dítě: kdo žádá o propojení a kdo už jeho přehled vidí. */
export async function zadostiDitete(db: SupabaseClient, diteId: string): Promise<ZadostiDitete> {
  const { data, error } = await db.from(TABULKA).select("token, parent_email, verified").eq("child_user_id", diteId);
  if (error) throw error;
  const radky = (data ?? []) as { token: string | null; parent_email: string | null; verified: boolean }[];
  const zadost = (r: (typeof radky)[number]): Zadost => ({ token: r.token ?? "", rodic: r.parent_email ?? "" });
  return {
    cekajici: radky.filter((r) => !r.verified && r.token).map(zadost),
    overene: radky.filter((r) => r.verified && r.token).map(zadost),
  };
}

/**
 * Odpověď dítěte. Řádek musí patřit přihlášenému dítěti (child_user_id) – token sám nestačí,
 * takže rodič, který token z vlastního řádku zná, si propojení nepotvrdí.
 * povolit/odmitnout = jen čekající žádost, zrusit = jen už ověřené propojení.
 */
export async function odpovedDitete(
  db: SupabaseClient,
  diteId: string,
  token: unknown,
  akce: unknown,
): Promise<{ ok: true } | { ok: false; chyba: "neplatne" | "nenalezeno" }> {
  if (!platnyToken(token) || (akce !== "povolit" && akce !== "odmitnout" && akce !== "zrusit")) {
    return { ok: false, chyba: "neplatne" };
  }
  const overene = akce === "zrusit";

  const { data: radek, error: selErr } = await db
    .from(TABULKA)
    .select("verified")
    .eq("token", token)
    .eq("child_user_id", diteId)
    .eq("verified", overene)
    .maybeSingle();
  if (selErr) throw selErr;
  if (!radek) return { ok: false, chyba: "nenalezeno" };

  const { error } = akce === "povolit"
    ? await db.from(TABULKA)
        .update({ verified: true, verified_at: new Date().toISOString() })
        .eq("token", token).eq("child_user_id", diteId).eq("verified", false)
    : await db.from(TABULKA)
        .delete()
        .eq("token", token).eq("child_user_id", diteId).eq("verified", overene);
  if (error) throw error;
  return { ok: true };
}

/** Přehled rodiče: ověřené dítě (jen to smí dostat data) a e-maily dětí, které ještě nepotvrdily. */
export async function stavRodice(
  db: SupabaseClient,
  emailRodice: string,
): Promise<{ overeneDite: string | null; cekajici: string[] }> {
  const { data, error } = await db.from(TABULKA).select("child_user_id, verified").eq("parent_email", emailRodice);
  if (error) throw error;
  const radky = (data ?? []) as { child_user_id: string; verified: boolean }[];
  const overene = radky.find((r) => r.verified === true);
  const cekajici: string[] = [];
  for (const r of radky.filter((x) => x.verified !== true)) {
    // E-mail zadal sám rodič, nic dalšího o dítěti (jméno, data) se v čekajícím stavu neposílá.
    const { data: u } = await db.auth.admin.getUserById(r.child_user_id);
    if (u?.user?.email) cekajici.push(u.user.email);
  }
  return { overeneDite: overene?.child_user_id ?? null, cekajici };
}

/** Smí rodič psát / číst data tohoto dítěte? Jen s ověřeným propojením. */
export async function jeOvereno(db: SupabaseClient, emailRodice: string, diteId: string): Promise<boolean> {
  const { data, error } = await db
    .from(TABULKA)
    .select("verified")
    .eq("parent_email", emailRodice)
    .eq("child_user_id", diteId)
    .eq("verified", true)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

/** Ověřená propojení pro týdenní report rodičům. Neověřená se sem nikdy nedostanou. */
export async function overenaPropojeni(db: SupabaseClient): Promise<{ parent_email: string; child_user_id: string }[]> {
  const { data, error } = await db.from(TABULKA).select("parent_email, child_user_id, verified").eq("verified", true);
  if (error) throw error;
  return ((data ?? []) as { parent_email: string; child_user_id: string; verified: boolean }[])
    .filter((r) => r.verified === true)
    .map(({ parent_email, child_user_id }) => ({ parent_email, child_user_id }));
}
