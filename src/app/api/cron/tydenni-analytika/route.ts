import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { spocitejAnalytiku, shrnutiTydne } from "@/lib/analytika-server";

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
  let email = false;
  const komu = process.env.ANALYTIKA_EMAIL;
  if (komu && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const r = await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: "MateMax <noreply@matematika-snadno.cz>", to: komu.split(",").map((x) => x.trim()), subject: "MateMax: týden v číslech",
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#0D1B3E">${text.split("\n").map((r) => `<p style="margin:0 0 8px">${r.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]!)}</p>`).join("")}<p><a href="https://matemax.matematika-snadno.cz/admin/analytika">Otevřít analytiku</a></p></div>`,
      });
      email = !r.error;
    } catch { email = false; }
  }
  return NextResponse.json({ ok: true, email, text });
}

const povoleno = (req: NextRequest) => !!process.env.CRON_SECRET && req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
export async function GET(req: NextRequest) {
  if (!povoleno(req)) return NextResponse.json({ endpoint: "tydenni-analytika cron", requiresSecret: true });
  return handler();
}
export async function POST(req: NextRequest) {
  if (!povoleno(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return handler();
}
