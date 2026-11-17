import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LINK_ID } from "@/lib/vysledky";
import { overApiKlic, nactiPropojeni, chyba, ok } from "@/lib/vysledky-server";

/**
 * Vyhodnocení testů ruší propojení. DELETE { link_id } → 200 { ok: true }, pak už jen 410.
 * Výsledky testů od Vyhodnocení se smažou, procvičování a plán zůstávají žákovi.
 */
export async function DELETE(req: NextRequest) {
  if (!overApiKlic(req)) return chyba(401, "unauthorized");
  if (!supabaseAdmin) return chyba(503, "nedostupne");

  let linkId = "";
  try { linkId = String(((await req.json()) as { link_id?: unknown }).link_id ?? "").toLowerCase(); } catch { /* prázdné tělo */ }
  if (!LINK_ID.test(linkId)) return chyba(400, "link_id");

  const p = await nactiPropojeni(linkId);
  if (!p) return chyba(404, "nezname");
  if (p.zruseno_at) return chyba(410, "zruseno");

  const { error } = await supabaseAdmin
    .from("vysledky_propojeni")
    .update({ zruseno_at: new Date().toISOString(), zrusil: "vysledky", kod_hash: null })
    .eq("link_id", linkId);
  if (error) { console.error("[propojeni.delete]", error.message); return chyba(500, "db"); }
  await supabaseAdmin.from("vysledky_testy").delete().eq("link_id", linkId);
  return ok({ ok: true });
}
