import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { spocitejAnalytiku, shrnutiTydne } from "@/lib/analytika-server";
import { behCronu } from "@/lib/system-log";
import { posliResend } from "@/lib/zpravy-log";
import { nactiAktivitu, nactiZaky } from "@/lib/admin2/data";
import { nactiNastaveni } from "@/lib/admin2/nastaveni";
import { spocitejDoporuceni, filtrujPodleStavu } from "@/lib/admin2/doporuceni";
import { mapaDnu, posunDen } from "@/lib/admin2/metriky";
import { tydenVKostce } from "@/lib/admin2/plan";
import { pragueDateStr } from "@/lib/date";

/**
 * Týdenní report analytiky (každé pondělí 6:00 UTC = 7:00 v Praze): shrnutí posledních 7 dní proti předchozím 7
 * se uloží do analytics_events (tydenni_report) a ukáže se v adminu → Analytika. E-mailem jen když je nastavená
 * proměnná ANALYTIKA_EMAIL (adresa admina, ve Vercelu, ne v kódu).
 */
export const maxDuration = 60;

async function handler() {
  if (!supabaseAdmin) return NextResponse.json({ error: "Chybí service role" }, { status: 500 });
  const a = await spocitejAnalytiku({ dni: 7, trida: null, zdroj: null, zarizeni: null });
  const text = shrnutiTydne(a);
  const { error } = await supabaseAdmin.from("analytics_events").insert({ user_id: null, event_name: "weekly_report_created", properties: { text } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Pondělní e-mail (PL-06): týden v kostce ze stejných čísel jako admin (metriky.ts), bez jmen, s odkazem do adminu
  let email = false;
  const komu = process.env.ANALYTIKA_EMAIL;
  if (komu && process.env.RESEND_API_KEY) {
    try {
      const k = { demo: false, sdileni: false };
      const dnes = pragueDateStr();
      const [zaci, aktivita, nast] = await Promise.all([nactiZaky(k), nactiAktivitu(k, posunDen(dnes, -60)), nactiNastaveni()]);
      const dny = mapaDnu(aktivita);
      const t = tydenVKostce(zaci, dny, dnes);
      const { aktivni } = await filtrujPodleStavu(await spocitejDoporuceni(zaci, dny, nast, k), k);
      const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!);
      const radky = [
        ...t.zmeny.map((z) => `${z.nazev}: ${z.text}`),
        `Trénovalo aspoň 1 den: ${t.trenovali}, dní tréninku celkem ${t.dniTreninku}`,
        "", "Navržené úkoly na tento týden:", ...(aktivni.length ? aktivni.slice(0, 3).map((d) => `• ${d.titulek}`) : ["• nic nečeká"]),
      ];
      const r = await posliResend({
        from: "MateMax Admin <noreply@matematika-snadno.cz>", to: komu.split(",").map((x) => x.trim()), subject: `MateMax: týden ${new Date(t.od + "T12:00:00").toLocaleDateString("cs-CZ")}–${new Date(t.do + "T12:00:00").toLocaleDateString("cs-CZ")}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0D1B3E">${radky.map((x) => (x ? `<p style="margin:0 0 6px">${esc(x)}</p>` : "<br>")).join("")}<p style="margin-top:16px"><a href="https://matemax.matematika-snadno.cz/admin/novy/plan" style="background:#5B55D6;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none;font-weight:bold">Otevřít týden v adminu</a></p></div>`,
        tags: [{ name: "email", value: "admin_tyden" }],
      }, { sablona: "admin_tyden", prijemceTyp: "admin" });
      email = r.ok;
    } catch (e) { console.error("[tydenni-analytika] e-mail", e); email = false; }
  }
  return NextResponse.json({ ok: true, email });
}

const povoleno = (req: NextRequest) => !!process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
export async function GET(req: NextRequest) {
  if (!povoleno(req)) return NextResponse.json({ endpoint: "tydenni-analytika cron", requiresSecret: true });
  return behCronu("tydenni-analytika", handler);
}
export async function POST(req: NextRequest) {
  if (!povoleno(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return behCronu("tydenni-analytika", handler);
}
