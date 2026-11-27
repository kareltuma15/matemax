/**
 * „Zkontrolováno“ u úloh (UC-04). Uloženo v admin_nastaveni.ulohy_zkontrolovano = { [uloha_id]: { cas } }.
 * Zkontrolovaná úloha nemá příznak, dokud nepřibude 10 nových prvních pokusů (pak se znovu vyhodnotí).
 */
import { cache } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { prvniPokusy, type Odpoved } from "./uceni";

export type Kontroly = Map<string, { cas: string }>;
export const NOVYCH_PO_KONTROLE = 10;

export const kontrolyUloh = cache(async (demo: boolean): Promise<Kontroly> => {
  if (demo || !supabaseAdmin) return new Map();
  const { data } = await supabaseAdmin.from("admin_nastaveni").select("hodnota").eq("klic", "ulohy_zkontrolovano").maybeSingle();
  const h = (data?.hodnota ?? {}) as Record<string, { cas: string }>;
  return new Map(Object.entries(h));
});

/** Úlohy, jejichž příznaky jsou po kontrole potlačené (méně než 10 nových prvních pokusů od kontroly). */
export function potlaceneUlohy(kontroly: Kontroly, odp: Odpoved[]): Set<string> {
  if (!kontroly.size) return new Set();
  const nove = new Map<string, number>();
  for (const r of prvniPokusy(odp)) { const k = kontroly.get(r.uloha_id); if (k && r.created_at > k.cas) nove.set(r.uloha_id, (nove.get(r.uloha_id) ?? 0) + 1); }
  return new Set([...kontroly.keys()].filter((id) => (nove.get(id) ?? 0) < NOVYCH_PO_KONTROLE));
}
