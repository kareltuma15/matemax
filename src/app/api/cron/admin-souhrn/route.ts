import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { behCronu } from "@/lib/system-log";
import { hodinaPraha, nactiUpozorneniNastaveni, upozorniAdmina } from "@/lib/admin-push";
import { nactiAktivitu, nactiZaky } from "@/lib/admin2/data";
import { spocitejDoporuceni, filtrujPodleStavu } from "@/lib/admin2/doporuceni";
import { nactiNastaveni } from "@/lib/admin2/nastaveni";
import { mapaDnu, denZ, posunDen } from "@/lib/admin2/metriky";
import { pragueDateStr } from "@/lib/date";

/**
 * Denní souhrn pro Karla (DN-10): cron běží každou hodinu, push odejde jen v hodinu nastavenou v Systém → Upozornění.
 * Text bez jmen: „2 noví žáci · 3 trénovali · 1 nová zpráva · 4 akce ve frontě“. Klepnutí otevře večerní kolečko.
 */
export const maxDuration = 60;

async function handler(vynutit: boolean) {
  const n = await nactiUpozorneniNastaveni();
  if (!vynutit && hodinaPraha() !== n.souhrnHodina) return NextResponse.json({ ok: true, preskoceno: "jiná hodina" });
  if (!n.typy.souhrn || !n.odbery.length) return NextResponse.json({ ok: true, preskoceno: "souhrn vypnutý nebo bez zařízení" });
  const k = { demo: false, sdileni: false };
  const dnes = pragueDateStr();
  const [zaci, aktivita, nast] = await Promise.all([nactiZaky(k), nactiAktivitu(k, posunDen(dnes, -30)), nactiNastaveni()]);
  const dny = mapaDnu(aktivita);
  const { aktivni } = await filtrujPodleStavu(await spocitejDoporuceni(zaci, dny, nast, k), k);
  const { count: zpravy } = supabaseAdmin ? await supabaseAdmin.from("schranka").select("id", { count: "exact", head: true }).eq("stav", "nove") : { count: 0 };
  const novi = zaci.filter((z) => denZ(z.registrace) === dnes).length;
  const trenovali = new Set(aktivita.filter((a) => a.den === dnes).map((a) => a.user_id)).size;
  const casti = [
    novi ? `${novi} ${novi === 1 ? "nový žák" : novi <= 4 ? "noví žáci" : "nových žáků"}` : null,
    `${trenovali} ${trenovali === 1 ? "trénoval" : "trénovalo"}`,
    zpravy ? `${zpravy} ${zpravy === 1 ? "nová zpráva" : zpravy <= 4 ? "nové zprávy" : "nových zpráv"}` : null,
    aktivni.length ? `${aktivni.length} ${aktivni.length === 1 ? "akce" : aktivni.length <= 4 ? "akce" : "akcí"} ve frontě` : "nic nehoří",
  ].filter(Boolean);
  const odeslano = await upozorniAdmina("souhrn", "MateMax dnes", casti.join(" · "), "/admin/novy/kolecko");
  return NextResponse.json({ ok: true, odeslano, novi, trenovali, zpravy: zpravy ?? 0, akce: aktivni.length });
}

const povoleno = (req: NextRequest) => !!process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
export async function GET(req: NextRequest) {
  if (!povoleno(req)) return NextResponse.json({ endpoint: "admin-souhrn cron", requiresSecret: true });
  return behCronu("admin-souhrn", () => handler(req.nextUrl.searchParams.get("ted") === "1"));
}
export async function POST(req: NextRequest) {
  if (!povoleno(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return behCronu("admin-souhrn", () => handler(req.nextUrl.searchParams.get("ted") === "1"));
}
