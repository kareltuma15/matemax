import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// PATCH — úprava termínu (publish toggle, pole formuláře)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  // Povolená pole — nic jiného z klienta nepustíme
  const update: Record<string, unknown> = {};
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim();
  if (typeof body.scheduled_at === "string" && !isNaN(Date.parse(body.scheduled_at))) {
    update.scheduled_at = body.scheduled_at;
  }
  if (Number.isInteger(body.duration_minutes) && body.duration_minutes > 0) {
    update.duration_minutes = body.duration_minutes;
  }
  if (Number.isInteger(body.capacity) && body.capacity > 0) update.capacity = body.capacity;
  if (Number.isInteger(body.price_czk) && body.price_czk >= 0) update.price_czk = body.price_czk;
  if (typeof body.is_published === "boolean") update.is_published = body.is_published;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("online_test_sessions")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("admin/testy PATCH error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}

// DELETE — smazání termínu (jen pokud nemá zaplacené přihlášky)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

  const { id } = await params;

  const { count } = await supabaseAdmin
    .from("online_test_enrollments")
    .select("*", { count: "exact", head: true })
    .eq("session_id", id)
    .eq("payment_status", "paid");

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Termín má zaplacené přihlášky — nelze smazat" },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin
    .from("online_test_sessions")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("admin/testy DELETE error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
