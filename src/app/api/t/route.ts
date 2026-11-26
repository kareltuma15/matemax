import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { BOT, denniOtisk } from "@/lib/mereni-server";
import { POVOLENE_PARAMETRY, STARE_NAZVY, UDALOSTI_KLIENTA, sablonaCesty, zdrojZDomeny } from "@/lib/mereni-plan";

/**
 * Měření návštěvnosti bez cookies (POST z komponenty Mereni), podle plánu měření (docs/tracking-plan.md).
 * Do analytics_events jde jen: název události, šablona cesty, povolené parametry, odkud návštěvník přišel
 * (sloučená doména / utm), typ zařízení, jestli byl přihlášený a anonymní otisk platný jeden den
 * (hash IP + prohlížeče + denní sůl, sůl se nikam neukládá). Žádné jméno, e-mail, IP, psaný text ani ID účtu.
 */
const UDALOSTI = new Set<string>(UDALOSTI_KLIENTA);

const kratke = (v: unknown, n: number) => (typeof v === "string" && v ? v.slice(0, n) : undefined);
const cislo = (v: unknown, max: number) => (typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.round(v))) : undefined);

export async function POST(req: NextRequest) {
  const ua = req.headers.get("user-agent") ?? "";
  // Lokální vývoj a testy píšou do stejné databáze: měří se jen ostrý provoz.
  if (process.env.NODE_ENV !== "production" || process.env.VERCEL_ENV === "preview") return new NextResponse(null, { status: 204 });
  if (!supabaseAdmin || BOT.test(ua)) return new NextResponse(null, { status: 204 });
  const ip = clientIp(req);
  if (!rateLimit(`t:${ip}`, 120, 60_000)) return new NextResponse(null, { status: 204 });

  let b: Record<string, unknown> = {};
  try { b = JSON.parse(await req.text()); } catch { return new NextResponse(null, { status: 204 }); }
  const puvodni = kratke(b.e, 40);
  const e = puvodni ? STARE_NAZVY[puvodni] ?? puvodni : undefined;
  if (!e || !UDALOSTI.has(e)) return new NextResponse(null, { status: 204 });

  let domena: string | undefined;
  try { const r = kratke(b.r, 300); if (r) domena = new URL(r).hostname; } catch { /* neplatný referrer */ }
  const { ref, navratZPlatby } = zdrojZDomeny(domena);
  const cesta = kratke(b.p_, 120) ?? kratke(b.p, 120);

  const parametry: Record<string, string> = {};
  for (const k of POVOLENE_PARAMETRY) if (!k.startsWith("utm_")) { const v = kratke(b[k], 40); if (v) parametry[k] = v; }

  const properties = {
    cesta: cesta ? sablonaCesty(cesta) : undefined,
    ...parametry,
    ref,
    navrat_z_platby: navratZPlatby || undefined,
    utm_source: kratke(b.us, 60),
    utm_medium: kratke(b.um, 60),
    utm_campaign: kratke(b.uc, 80),
    // název prvku z plánu měření (klik), text chyby formuláře, název pole, odpověď ukázkového příkladu
    cil: kratke(b.c, 120),
    cil_cesta: typeof b.x === "string" && b.x.startsWith("/") ? sablonaCesty(b.x) : undefined,
    odpoved: e === "sample_answered" ? kratke(b.o, 20) : undefined,
    spravne: e === "sample_answered" ? b.ok === 1 : undefined,
    // chování na veřejné stránce (page_left): sekundy, kam až doscrolloval (%), kliky, poslední sekce a pole
    sekund: cislo(b.s, 7200),
    scroll: cislo(b.h, 100),
    kliku: cislo(b.k, 500),
    sekce: kratke(b.sk, 40),
    posledni_pole: kratke(b.lp, 40),
    vstup: b.vs === 1 ? true : undefined,
    prihlasen: b.pr === 1,
    zarizeni: /mobi|android|iphone/i.test(ua) ? "mobil" : "pocitac",
    v: denniOtisk(req),
  };
  const { error } = await supabaseAdmin.from("analytics_events").insert({ user_id: null, event_name: e, properties });
  if (error) console.error("[mereni]", error.message);
  return new NextResponse(null, { status: 204 });
}
