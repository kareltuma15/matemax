import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { denniOtisk } from "@/lib/mereni-server";
import { jeAdminEmail } from "@/lib/admin-auth";
import { sablonaCesty } from "@/lib/mereni-plan";

/**
 * Signál „jsem tu“ přihlášeného žáka (událost app_heartbeat, Karel 19. 11. 2026): appka ho pošle jednou za minutu,
 * když je otevřená a vidět. Slouží adminu (kdo je teď v appce, kolik času v ní žák strávil) a přehledu pro rodiče.
 * Je to technická událost: na časové ose žáka se neukazuje, jen se z ní počítá čas v appce.
 * Ukládá se jen ID účtu, šablona cesty, typ zařízení a denní anonymní otisk (stejný jako v /api/t),
 * aby šly anonymní návštěvy spárovat s účtem (a testovací účty vynechat ze statistik).
 * Admin se neukládá vůbec: odpověď nese hlavičku x-nemerit a jeho zařízení se přestane měřit.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview") return new NextResponse(null, { status: 204 });
  if (!supabaseAdmin) return new NextResponse(null, { status: 204 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return new NextResponse(null, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return new NextResponse(null, { status: 401 });
  if (jeAdminEmail(user.email)) return new NextResponse(null, { status: 204, headers: { "x-nemerit": "1" } });
  // Nejvýš jeden signál za 50 s na účet (víc karet = pořád jen jeden žák)
  if (!rateLimit(`zive:${user.id}`, 1, 50_000)) return new NextResponse(null, { status: 204 });

  let b: Record<string, unknown> = {};
  try { b = JSON.parse(await req.text()); } catch { /* bez těla */ }
  const ua = req.headers.get("user-agent") ?? "";
  const cesta = typeof b.p === "string" ? sablonaCesty(b.p) : undefined;
  const { error } = await supabaseAdmin.from("analytics_events").insert({
    user_id: user.id, event_name: "app_heartbeat",
    properties: { cesta, v: denniOtisk(req), zarizeni: /mobi|android|iphone/i.test(ua) ? "mobil" : "pocitac" },
  });
  if (error) console.error("[zive]", error.message);
  return new NextResponse(null, { status: 204 });
}
