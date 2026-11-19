import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Admin: označí účet jako testovací (nebo značku zruší). Značka je v app_metadata.testovaci,
 * účet zůstává, jen se skryje z přehledu a nepočítá se do statistik.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as { id?: string; testovaci?: boolean };
  if (!b.id || typeof b.testovaci !== "boolean") return NextResponse.json({ error: "Chybí id nebo testovaci" }, { status: 400 });
  const { data, error: e1 } = await supabaseAdmin.auth.admin.getUserById(b.id);
  if (e1 || !data.user) return NextResponse.json({ error: "Účet nenalezen" }, { status: 404 });
  const { error } = await supabaseAdmin.auth.admin.updateUserById(b.id, { app_metadata: { ...(data.user.app_metadata ?? {}), testovaci: b.testovaci } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
