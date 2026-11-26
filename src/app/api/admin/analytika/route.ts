import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { spocitejAnalytiku, shrnutiTydne, type FiltryAnalytiky } from "@/lib/analytika-server";
import { zapisAudit } from "@/lib/admin-audit";

/**
 * Analytika pro admina (Karel 22. 11. 2026). GET = celý přehled podle filtrů,
 * POST = útrata za reklamu za den ({ akce: "utrata", den, zdroj, castka, kliky }) nebo poznámka do grafu
 * ({ akce: "poznamka", den, text }). Ukládá se do analytics_events (admin_utrata / admin_poznamka), poslední zápis vyhrává.
 */
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const q = new URL(req.url).searchParams;
  const dni = [1, 7, 30, 90].includes(Number(q.get("dni"))) ? Number(q.get("dni")) : 7;
  const t = Number(q.get("trida"));
  const z = q.get("zarizeni");
  const f: FiltryAnalytiky = { dni, trida: t === 5 || t === 9 ? t : null, zdroj: q.get("zdroj") || null, zarizeni: z === "mobil" || z === "pocitac" ? z : null };
  try {
    const [a, posledniReport] = await Promise.all([
      spocitejAnalytiku(f),
      supabaseAdmin!.from("analytics_events").select("created_at, properties").eq("event_name", "weekly_report_created").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const report = posledniReport.data ? { kdy: posledniReport.data.created_at as string, text: String((posledniReport.data.properties as Record<string, unknown>)?.text ?? "") } : null;
    return NextResponse.json({ ...a, report, shrnuti: dni === 7 ? shrnutiTydne(a) : null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "chyba" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Chybí service role" }, { status: 500 });
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return NextResponse.json({ error: "Neplatná data" }, { status: 400 }); }
  const den = typeof b.den === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.den) ? b.den : null;
  if (!den) return NextResponse.json({ error: "Chybí den" }, { status: 400 });
  if (b.akce === "utrata") {
    const zdroj = typeof b.zdroj === "string" ? b.zdroj.trim().slice(0, 100) : "";
    const castka = Math.max(0, Math.min(1_000_000, Math.round(Number(b.castka) || 0)));
    const kliky = Math.max(0, Math.min(1_000_000, Math.round(Number(b.kliky) || 0)));
    if (!zdroj) return NextResponse.json({ error: "Chybí zdroj" }, { status: 400 });
    const { error } = await supabaseAdmin.from("analytics_events").insert({ user_id: null, event_name: "ad_spend_saved", properties: { den, zdroj, castka, kliky } });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await zapisAudit({ adminId: auth.userId, akce: "utrata_zapsana", detail: { den, zdroj, castka, kliky } });
    return NextResponse.json({ ok: true });
  }
  if (b.akce === "poznamka") {
    const text = typeof b.text === "string" ? b.text.trim().slice(0, 80) : "";
    if (!text) return NextResponse.json({ error: "Chybí text" }, { status: 400 });
    const { error } = await supabaseAdmin.from("analytics_events").insert({ user_id: null, event_name: "chart_note_added", properties: { den, text } });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await zapisAudit({ adminId: auth.userId, akce: "poznamka_zapsana", detail: { den } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Neznámá akce" }, { status: 400 });
}
