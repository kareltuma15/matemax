/**
 * Odhad bodů dítěte na serveru (rodičovský přehled a týdenní e-mail rodičům).
 *
 * Počítá se stejně jako v profilu žáka: úspěšnost po tématech ze zálohy gamifikace (user_gamification)
 * + diagnostika (diagnostic_results) → spocitejOdhad. Týdenní vývoj si server pamatuje v app_metadata
 * dítěte (`odhad_tydny`, zapisuje jen pondělní report), protože historie v profilu žije jen v prohlížeči.
 */
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { spocitejOdhad, MAX_BODU } from "./odhad-vypocet";
import { temaLabel, type Trida } from "@/types";

type Pocty = Record<string, { correct: number; total: number }>;

export interface TydenniZaznam { d: string; b: number }

export interface OdhadDitete {
  trida: Trida;
  celkem: number;
  max: number;
  bezDat: boolean;
  /** Cíl, který si žák nastavil v profilu (null = nenastavil). */
  cil: number | null;
  temata: { tema: string; label: string; body: number; max: number }[];
  /** Kde dítě může přidat nejvíc bodů. */
  nejvicBodu: { label: string; chybi: number } | null;
  /** Odhad v minulých pondělních reportech (nejstarší první). */
  tydny: TydenniZaznam[];
  /** Změna proti poslednímu reportu (null = první report). */
  zmena: number | null;
}

export function tridaUzivatele(user: User | null | undefined): Trida {
  return Number(user?.user_metadata?.trida) === 5 ? 5 : 9;
}

function cilUzivatele(user: User | null | undefined): number | null {
  const n = Number(user?.user_metadata?.cil_body);
  return Number.isFinite(n) && n >= 1 && n <= MAX_BODU ? Math.round(n) : null;
}

function tydnyUzivatele(user: User | null | undefined): TydenniZaznam[] {
  const raw = user?.app_metadata?.odhad_tydny;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((z): z is TydenniZaznam => typeof z?.d === "string" && typeof z?.b === "number")
    .sort((a, b) => a.d.localeCompare(b.d));
}

export async function odhadDitete(admin: SupabaseClient, user: User, dnes: string): Promise<OdhadDitete> {
  const trida = tridaUzivatele(user);
  const [{ data: gam }, { data: diagRows }] = await Promise.all([
    admin.from("user_gamification").select("state").eq("user_id", user.id).maybeSingle(),
    admin.from("diagnostic_results").select("tema, correct, total").eq("user_id", user.id),
  ]);
  const stats = ((gam as { state?: { topicStats?: Pocty } } | null)?.state?.topicStats ?? {}) as Pocty;
  const diag: Pocty = {};
  for (const r of (diagRows ?? []) as { tema: string; correct: number; total: number }[]) {
    diag[r.tema] = { correct: r.correct, total: r.total };
  }

  const o = spocitejOdhad(trida, stats, diag);
  const temata = o.temata.map((t) => ({ tema: t.tema, label: temaLabel(t.tema), body: t.body, max: t.max }));
  const rezerva = [...temata].sort((a, b) => (b.max - b.body) - (a.max - a.body))[0];
  const tydny = tydnyUzivatele(user).filter((z) => z.d < dnes);
  const posledni = tydny[tydny.length - 1];

  return {
    trida,
    celkem: o.celkem,
    max: o.max,
    bezDat: o.bezDat,
    cil: cilUzivatele(user),
    temata,
    nejvicBodu: !o.bezDat && rezerva && rezerva.max - rezerva.body >= 1
      ? { label: rezerva.label, chybi: Math.round(rezerva.max - rezerva.body) }
      : null,
    tydny,
    zmena: !o.bezDat && posledni ? o.celkem - posledni.b : null,
  };
}

/** Zapíše dnešní odhad do týdenní historie dítěte (posledních 12 reportů). */
export async function ulozTydenniOdhad(admin: SupabaseClient, user: User, odhad: OdhadDitete, dnes: string): Promise<void> {
  if (odhad.bezDat) return;
  const tydny = [...odhad.tydny, { d: dnes, b: odhad.celkem }].slice(-12);
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...(user.app_metadata ?? {}), odhad_tydny: tydny },
  });
  if (error) console.error("[odhad-server] uložení týdenního odhadu selhalo:", error.message);
}
