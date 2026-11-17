import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LINK_ID, souhrnProcvicovani, type ZaznamProcvicovani } from "@/lib/vysledky";
import { normalizujDoporuceni } from "@/lib/doporuceni";
import { overApiKlic, nactiPropojeni, chyba, ok } from "@/lib/vysledky-server";

/**
 * Souhrn procvičování pro Vyhodnocení testů od data (včetně). Jen souhrn, žádné jednotlivé odpovědi.
 * GET ?link_id=…&od=YYYY-MM-DD → { temata, posledni_aktivita, plan } · zrušené propojení 410.
 */
export async function GET(req: NextRequest) {
  if (!overApiKlic(req)) return chyba(401, "unauthorized");
  if (!supabaseAdmin) return chyba(503, "nedostupne");

  const linkId = (req.nextUrl.searchParams.get("link_id") ?? "").toLowerCase();
  const od = req.nextUrl.searchParams.get("od") ?? "";
  if (!LINK_ID.test(linkId)) return chyba(400, "link_id");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(od)) return chyba(400, "od");

  const p = await nactiPropojeni(linkId);
  if (!p) return chyba(404, "nezname");
  if (p.zruseno_at) return chyba(410, "zruseno");

  const [zaznamy, plan] = await Promise.all([
    supabaseAdmin.from("procvicovani").select("datum, kdy, sekund, temata").eq("user_id", p.user_id).gte("datum", od).order("kdy").limit(5000),
    supabaseAdmin.from("plan_po_testu").select("doporuceni, splneno_at").eq("user_id", p.user_id).maybeSingle(),
  ]);
  if (zaznamy.error) { console.error("[procvicovani]", zaznamy.error.message); return chyba(500, "db"); }

  const souhrn = souhrnProcvicovani((zaznamy.data ?? []) as ZaznamProcvicovani[]);
  const d = plan.data && !plan.data.splneno_at ? normalizujDoporuceni(plan.data.doporuceni) : null;
  return ok({
    temata: souhrn.temata,
    posledni_aktivita: souhrn.posledni_aktivita,
    plan: d ? d.top.map((t) => ({ k: t.k, ...(t.s ? { s: t.s } : {}) })) : [],
  });
}
