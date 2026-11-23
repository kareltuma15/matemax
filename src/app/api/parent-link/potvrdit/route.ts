import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { propadla, type LinkRow } from "@/lib/rodic-link";

/**
 * Rodič potvrdí odběr reportu odkazem z e-mailu (pozvánku poslalo dítě).
 * Potvrzuje se tlačítkem na stránce (POST), ne samotným otevřením odkazu: poštovní filtry odkazy
 * otevírají automaticky a odběr by se potvrdil bez rodiče.
 */
export async function POST(req: NextRequest) {
  if (!rateLimit(`parent-potvrdit:${clientIp(req)}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: "Příliš mnoho pokusů. Zkuste to za pár minut." }, { status: 429 });
  }
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  const { t } = (await req.json().catch(() => ({}))) as { t?: string };
  if (!t || !/^[0-9a-f]{32}$/.test(t)) return NextResponse.json({ error: "Odkaz je neplatný." }, { status: 400 });

  const { data } = await supabaseAdmin.from("parent_child_link").select("*").eq("token", `rodic:${t}`).maybeSingle();
  const row = data as LinkRow | null;
  if (!row || propadla(row)) {
    return NextResponse.json({ error: "Odkaz už neplatí. Požádejte dítě, ať vám v MateMaxu pošle novou pozvánku." }, { status: 404 });
  }
  if (!row.verified) {
    await supabaseAdmin.from("parent_child_link").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", row.id);
  }
  return NextResponse.json({ ok: true });
}
