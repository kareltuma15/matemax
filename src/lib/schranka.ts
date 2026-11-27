/**
 * Vložení do Schránky adminu bez duplicit podle (druh, zdroj_id). Unikátní index je částečný (jen kde zdroj_id není NULL),
 * a ten Postgres pro upsert / ON CONFLICT nepozná. Proto: zjistit existující zdroj_id a vložit jen nové.
 */
import { supabaseAdmin } from "./supabase-admin";

export interface RadekSchranky { druh: string; zdroj_id?: string | null; [k: string]: unknown }

export async function vlozDoSchranky(radky: RadekSchranky[]): Promise<{ vlozeno: number; chyba?: string }> {
  if (!supabaseAdmin || !radky.length) return { vlozeno: 0 };
  const sZdrojem = radky.filter((r) => r.zdroj_id);
  const existuji = new Set<string>();
  for (const druh of new Set(sZdrojem.map((r) => r.druh))) {
    const ids = sZdrojem.filter((r) => r.druh === druh).map((r) => String(r.zdroj_id));
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await supabaseAdmin.from("schranka").select("zdroj_id").eq("druh", druh).in("zdroj_id", ids.slice(i, i + 200));
      for (const d of data ?? []) existuji.add(`${druh}|${d.zdroj_id}`);
    }
  }
  const nove = radky.filter((r) => !r.zdroj_id || !existuji.has(`${r.druh}|${r.zdroj_id}`));
  if (!nove.length) return { vlozeno: 0 };
  const { error } = await supabaseAdmin.from("schranka").insert(nove);
  // Souběžné vložení stejného záznamu narazí na unikátní index: to je v pořádku (už tam je)
  if (error && !/duplicate key|unique/i.test(error.message)) return { vlozeno: 0, chyba: error.message };
  return { vlozeno: error ? 0 : nove.length };
}
