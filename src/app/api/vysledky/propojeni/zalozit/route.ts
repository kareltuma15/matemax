import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { povolenyNavrat, platnyState, navratUrl, tridaNaG } from "@/lib/vysledky";
import { prihlasenyZak, novyKod, hashKodu, noveLinkId, jeProdukce, KOD_PLATNOST_MS, chyba, ok } from "@/lib/vysledky-server";

/**
 * Obrazovka /propojit → po souhlasu rodiče. Volá ji prohlížeč přihlášeného žáka (jeho token).
 * POST { state, navrat, souhlas: true } → { url } = navrat?state=…&code=… (kód platí 5 minut, v DB jen hash).
 * Předchozí propojení účtu se zruší (jeden účet = jedno propojení).
 */
export async function POST(req: NextRequest) {
  const zak = await prihlasenyZak(req);
  if (!zak) return chyba(401, "neprihlasen");
  if (!rateLimit(`propojit:${zak.id}`, 10, 60_000)) return chyba(429, "limit");
  if (!supabaseAdmin) return chyba(503, "nedostupne");

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* prázdné tělo */ }
  if (body.souhlas !== true) return chyba(400, "souhlas");
  if (!povolenyNavrat(body.navrat, jeProdukce())) return chyba(400, "navrat");
  if (!platnyState(body.state)) return chyba(400, "state");

  const trida = Number((zak.user_metadata as Record<string, unknown> | undefined)?.trida);
  const g = tridaNaG(trida);
  const kdy = new Date();

  const { error: chybaZruseni } = await supabaseAdmin
    .from("vysledky_propojeni")
    .update({ zruseno_at: kdy.toISOString(), zrusil: "nove" })
    .eq("user_id", zak.id)
    .is("zruseno_at", null);
  if (chybaZruseni) { console.error("[propojit] zrušení starého", chybaZruseni.message); return chyba(500, "db"); }

  const code = novyKod();
  const { error } = await supabaseAdmin.from("vysledky_propojeni").insert({
    link_id: noveLinkId(), user_id: zak.id, g,
    kod_hash: hashKodu(code), kod_plati_do: new Date(kdy.getTime() + KOD_PLATNOST_MS).toISOString(),
  });
  if (error) { console.error("[propojit] založení", error.message); return chyba(500, "db"); }

  return ok({ url: navratUrl(body.navrat, body.state, { code }) });
}
