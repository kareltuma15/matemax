import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface AdminTestSession {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  capacity: number;
  price_czk: number;
  zadani_pdf_url: string | null;
  zaznamovy_arch_pdf_url: string | null;
  rozbor_pdf_url: string | null;
  is_published: boolean;
  created_at: string;
  paid_count: number;
}

// GET — seznam všech termínů s počtem zaplacených přihlášek
export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

  const { data: sessions, error } = await supabaseAdmin
    .from("online_test_sessions")
    .select("*")
    .order("scheduled_at", { ascending: false });

  if (error) {
    console.error("admin/testy GET error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const { data: enrollments } = await supabaseAdmin
    .from("online_test_enrollments")
    .select("session_id")
    .eq("payment_status", "paid");

  const counts = new Map<string, number>();
  for (const e of enrollments ?? []) {
    counts.set(e.session_id, (counts.get(e.session_id) ?? 0) + 1);
  }

  const result: AdminTestSession[] = (sessions ?? []).map((s) => ({
    ...s,
    paid_count: counts.get(s.id) ?? 0,
  }));

  return NextResponse.json({ sessions: result });
}

// POST — vytvoření nového termínu
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const { title, scheduled_at, duration_minutes, capacity, price_czk } = body;

  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Chybí název termínu" }, { status: 400 });
  }
  if (!scheduled_at || isNaN(Date.parse(scheduled_at))) {
    return NextResponse.json({ error: "Neplatné datum a čas" }, { status: 400 });
  }
  const price = Number(price_czk);
  if (!Number.isInteger(price) || price < 0) {
    return NextResponse.json({ error: "Neplatná cena" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("online_test_sessions")
    .insert({
      title: title.trim(),
      scheduled_at,
      duration_minutes: Number(duration_minutes) || 60,
      capacity: Number(capacity) || 30,
      price_czk: price,
    })
    .select()
    .single();

  if (error) {
    console.error("admin/testy POST error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ session: data });
}
