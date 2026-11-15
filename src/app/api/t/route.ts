import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { pragueDateStr } from "@/lib/date";

/**
 * Měření návštěvnosti bez cookies (POST z komponenty Mereni). Do analytics_events jde jen:
 * název události, cesta, odkud návštěvník přišel (doména / utm), typ zařízení a anonymní otisk
 * návštěvníka platný jeden den (hash IP + prohlížeče + denní sůl, sůl se nikam neukládá).
 * Žádné jméno, e-mail, IP ani ID účtu, takže to nepotřebuje souhlas s cookies.
 */
const UDALOSTI = new Set(["navsteva", "klik", "registrace_odeslana", "registrace_google", "premium_zobrazeno", "platba_start", "doporuceni_otevreno"]);
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|vercel|facebookexternalhit|whatsapp/i;

const kratke = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : undefined);

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  // Lokální vývoj a testy píšou do stejné databáze: měří se jen ostrý provoz.
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview") return new NextResponse(null, { status: 204 });
  if (!supabaseAdmin || BOT.test(ua)) return new NextResponse(null, { status: 204 });
  const ip = clientIp(req);
  if (!rateLimit(`t:${ip}`, 120, 60_000)) return new NextResponse(null, { status: 204 });

  let b: Record<string, unknown> = {};
  try { b = JSON.parse(await req.text()); } catch { return new NextResponse(null, { status: 204 }); }
  const e = kratke(b.e, 40);
  if (!e || !UDALOSTI.has(e)) return new NextResponse(null, { status: 204 });

  const sul = createHash("sha256").update(`${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}:${pragueDateStr()}`).digest("hex");
  const v = createHash("sha256").update(`${sul}:${ip}:${ua}`).digest("hex").slice(0, 16);
  let ref: string | undefined;
  try { const r = kratke(b.r, 300); if (r) ref = new URL(r).hostname.replace(/^www\./, ""); } catch { /* neplatný referrer */ }

  const properties = {
    cesta: kratke(b.p, 120),
    ref: ref && !ref.endsWith("matemax.matematika-snadno.cz") ? ref : undefined,
    utm_source: kratke(b.us, 60),
    utm_medium: kratke(b.um, 60),
    utm_campaign: kratke(b.uc, 80),
    cil: kratke(b.c, 120),
    text: kratke(b.x, 50),
    zarizeni: /mobi|android|iphone/i.test(ua) ? "mobil" : "pocitac",
    v,
  };
  const { error } = await supabaseAdmin.from("analytics_events").insert({ user_id: null, event_name: e, properties });
  if (error) console.error("[mereni]", error.message);
  return new NextResponse(null, { status: 204 });
}
