import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { overApiKlic, hashKodu, chyba, ok } from "@/lib/vysledky-server";

/**
 * Vyhodnocení testů vymění jednorázový kód za propojení.
 * POST { code } → 200 { link_id, g } · neplatný, prošlý nebo už použitý kód → 400. Kód jde použít jen jednou.
 */
export async function POST(req: NextRequest) {
  if (!overApiKlic(req)) return chyba(401, "unauthorized");
  if (!supabaseAdmin) return chyba(503, "nedostupne");

  let code = "";
  try { code = String(((await req.json()) as { code?: unknown }).code ?? ""); } catch { /* prázdné tělo */ }
  if (!/^[A-Za-z0-9_-]{43}$/.test(code)) return chyba(400, "neplatny_kod");

  const ted = new Date().toISOString();
  // Podmíněný update = kód se spotřebuje právě jednou, i když přijdou dvě volání naráz.
  const { data, error } = await supabaseAdmin
    .from("vysledky_propojeni")
    .update({ kod_pouzit_at: ted, kod_hash: null })
    .eq("kod_hash", hashKodu(code))
    .is("kod_pouzit_at", null)
    .is("zruseno_at", null)
    .gt("kod_plati_do", ted)
    .select("link_id, g")
    .maybeSingle();
  if (error) { console.error("[vymena]", error.message); return chyba(500, "db"); }
  if (!data) return chyba(400, "neplatny_kod");
  return ok({ link_id: data.link_id, g: data.g });
}
