import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { overPodpisReportu } from "@/lib/emaily/rodice";

/**
 * Odhlášení týdenního reportu rodiče (odkaz z patičky reportu nebo tlačítko „Odhlásit“ v Gmailu / Seznamu).
 * Zapíše parent_settings.report_frequency = „vypnuto“ (cron ho přeskočí), propojení s dítětem i rodičovský přehled
 * zůstávají. { odhlaseno: false } report zase zapne. Podpis t je HMAC z id propojení.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(`rodice-odhlasit:${clientIp(req)}`, 30, 10 * 60_000)) {
    return NextResponse.json({ error: "Příliš mnoho pokusů." }, { status: 429 });
  }
  if (!supabaseAdmin) return NextResponse.json({ error: "Chybí service role" }, { status: 503 });
  const l = req.nextUrl.searchParams.get("l") ?? "";
  const t = req.nextUrl.searchParams.get("t") ?? "";
  if (!l || !overPodpisReportu(l, t)) return NextResponse.json({ error: "Odkaz je neplatný." }, { status: 400 });

  let odhlaseno = true;
  if ((req.headers.get("content-type") ?? "").includes("application/json")) {
    const telo = (await req.json().catch(() => ({}))) as { odhlaseno?: boolean };
    if (typeof telo.odhlaseno === "boolean") odhlaseno = telo.odhlaseno;
  }
  const { data: link } = await supabaseAdmin.from("parent_child_link").select("parent_email").eq("id", l).maybeSingle();
  const email = (link as { parent_email?: string } | null)?.parent_email;
  if (!email) return NextResponse.json({ error: "Propojení už neexistuje, report vám nechodí." }, { status: 404 });

  const { error } = await supabaseAdmin.from("parent_settings").upsert(
    { parent_email: email, report_frequency: odhlaseno ? "vypnuto" : "weekly", updated_at: new Date().toISOString() },
    { onConflict: "parent_email" },
  );
  if (error) {
    console.error("[rodice/odhlasit]", error.message);
    return NextResponse.json({ error: "Nepodařilo se uložit. Napište nám prosím na karel.tuma@matematika-snadno.cz." }, { status: 500 });
  }
  if (odhlaseno) await supabaseAdmin.from("analytics_events").insert({ user_id: null, event_name: "email_unsubscribed", properties: { druh: "report" } });
  return NextResponse.json({ ok: true, odhlaseno });
}
