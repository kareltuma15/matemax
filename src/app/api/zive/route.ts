import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { pragueDateStr } from "@/lib/date";

/**
 * Signál „jsem tu“ přihlášeného žáka (Karel 19. 11. 2026): appka ho pošle jednou za minutu, když je
 * otevřená a vidět. Slouží adminu (kdo je teď v appce, kolik času v ní žák strávil) a přehledu pro rodiče.
 * Ukládá se jen ID účtu, cesta stránky, typ zařízení a denní anonymní otisk (stejný jako v /api/t),
 * aby šly anonymní návštěvy spárovat s účtem (a testovací účty vynechat ze statistik).
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview") return new NextResponse(null, { status: 204 });
  if (!supabaseAdmin) return new NextResponse(null, { status: 204 });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return new NextResponse(null, { status: 401 });
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (!user) return new NextResponse(null, { status: 401 });
  // Nejvýš jeden signál za 50 s na účet (víc karet = pořád jen jeden žák)
  if (!rateLimit(`zive:${user.id}`, 1, 50_000)) return new NextResponse(null, { status: 204 });

  let b: Record<string, unknown> = {};
  try { b = JSON.parse(await req.text()); } catch { /* bez těla */ }
  const ua = req.headers.get("user-agent") ?? "";
  const ip = clientIp(req);
  const sul = createHash("sha256").update(`${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}:${pragueDateStr()}`).digest("hex");
  const v = createHash("sha256").update(`${sul}:${ip}:${ua}`).digest("hex").slice(0, 16);
  const cesta = typeof b.p === "string" ? b.p.slice(0, 120) : undefined;
  const { error } = await supabaseAdmin.from("analytics_events").insert({
    user_id: user.id, event_name: "zive",
    properties: { cesta, v, zarizeni: /mobi|android|iphone/i.test(ua) ? "mobil" : "pocitac" },
  });
  if (error) console.error("[zive]", error.message);
  return new NextResponse(null, { status: 204 });
}
