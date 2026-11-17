import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { prihlasenyZak, chyba, ok } from "@/lib/vysledky-server";

/**
 * Propojení přihlášeného žáka (nastavení v profilu).
 * GET → { propojeno, od } · DELETE → zruší propojení (Vyhodnocení testů pak dostává 410).
 */
export async function GET(req: NextRequest) {
  const zak = await prihlasenyZak(req);
  if (!zak) return chyba(401, "neprihlasen");
  if (!supabaseAdmin) return ok({ propojeno: false, od: null });
  const { data } = await supabaseAdmin
    .from("vysledky_propojeni")
    .select("vytvoreno_at")
    .eq("user_id", zak.id)
    .is("zruseno_at", null)
    .not("kod_pouzit_at", "is", null)
    .order("vytvoreno_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return ok({ propojeno: !!data, od: (data?.vytvoreno_at as string | undefined) ?? null });
}

export async function DELETE(req: NextRequest) {
  const zak = await prihlasenyZak(req);
  if (!zak) return chyba(401, "neprihlasen");
  if (!supabaseAdmin) return chyba(503, "nedostupne");
  const { data, error } = await supabaseAdmin
    .from("vysledky_propojeni")
    .update({ zruseno_at: new Date().toISOString(), zrusil: "zak", kod_hash: null })
    .eq("user_id", zak.id)
    .is("zruseno_at", null)
    .select("link_id");
  if (error) { console.error("[propojeni.moje.delete]", error.message); return chyba(500, "db"); }
  const ids = (data ?? []).map((r) => r.link_id as string);
  if (ids.length) await supabaseAdmin.from("vysledky_testy").delete().in("link_id", ids);
  return ok({ ok: true });
}
