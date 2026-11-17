import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizujVysledek, planZVysledku } from "@/lib/vysledky";
import { normalizujDoporuceni } from "@/lib/doporuceni";
import { overApiKlic, nactiPropojeni, chyba, ok } from "@/lib/vysledky-server";

/**
 * Vyhodnocení testů posílá výsledek jednoho testu nanečisto.
 * POST { link_id, g, test, dalsi?, celkem?, temata } → 200 { ok: true } · zrušené propojení 410.
 * Stejné link_id + test.d přepíše předchozí. Z výsledku se sestaví plán do příštího testu (plan_po_testu):
 * novější test přepíše starší plán, opakované poslání téhož testu zachová postup v plánu.
 */
export async function POST(req: NextRequest) {
  if (!overApiKlic(req)) return chyba(401, "unauthorized");
  if (!supabaseAdmin) return chyba(503, "nedostupne");

  let raw: unknown = null;
  try { raw = await req.json(); } catch { /* prázdné tělo */ }
  const v = normalizujVysledek(raw);
  if (!v) return chyba(400, "neplatna_data");

  const p = await nactiPropojeni(v.link_id);
  if (!p) return chyba(404, "nezname");
  if (p.zruseno_at) return chyba(410, "zruseno");
  if (p.g !== v.g) return chyba(400, "jina_trida");

  const { error } = await supabaseAdmin.from("vysledky_testy").upsert({
    link_id: v.link_id, user_id: p.user_id, g: v.g, test_n: v.test.n, test_d: v.test.d,
    dalsi: v.dalsi ?? null, celkem: v.celkem ?? null, temata: v.temata, prijato_at: new Date().toISOString(),
  }, { onConflict: "link_id,test_d" });
  if (error) { console.error("[vysledky]", error.message); return chyba(500, "db"); }

  // Plán do příštího testu
  const plan = planZVysledku(v);
  if (plan) {
    const { data: stary } = await supabaseAdmin
      .from("plan_po_testu").select("doporuceni, zaklad, ulozeno_at, splneno_at").eq("user_id", p.user_id).maybeSingle();
    const staryPlan = stary ? normalizujDoporuceni(stary.doporuceni) : null;
    if (!staryPlan || staryPlan.test.d < v.test.d) {
      // `_novy`: postup se začne počítat, až žák MateMax otevře (správné odpovědi zná jen jeho prohlížeč).
      const { error: e2 } = await supabaseAdmin.from("plan_po_testu").upsert({
        user_id: p.user_id, zdroj: "propojeni", doporuceni: plan, zaklad: { _novy: 1 },
        ulozeno_at: new Date().toISOString(), splneno_at: null,
      });
      if (e2) console.error("[vysledky.plan]", e2.message);
    } else if (staryPlan.test.d === v.test.d) {
      const { error: e3 } = await supabaseAdmin.from("plan_po_testu")
        .update({ doporuceni: plan, zdroj: "propojeni" }).eq("user_id", p.user_id);
      if (e3) console.error("[vysledky.plan]", e3.message);
    }
  }
  return ok({ ok: true });
}
