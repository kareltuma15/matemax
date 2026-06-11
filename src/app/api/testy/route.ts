import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export interface PublicTestSession {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  price_czk: number;
  capacity: number;
  remaining: number;
  enrolled: boolean; // přihlášen a zaplaceno (jen pro přihlášeného uživatele)
}

// GET — publikované termíny + zbývající kapacita.
// Auth header je volitelný — s ním vrací i stav přihlášení žáka.
export async function GET(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const { data: sessions, error } = await supabaseAdmin
    .from("online_test_sessions")
    .select("id, title, scheduled_at, duration_minutes, price_czk, capacity")
    .eq("is_published", true)
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("testy GET error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const ids = (sessions ?? []).map((s) => s.id);

  // Zaplacené přihlášky per termín
  const counts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: paid } = await supabaseAdmin
      .from("online_test_enrollments")
      .select("session_id")
      .in("session_id", ids)
      .eq("payment_status", "paid");
    for (const e of paid ?? []) {
      counts.set(e.session_id, (counts.get(e.session_id) ?? 0) + 1);
    }
  }

  // Volitelně: stav přihlášení aktuálního uživatele
  const myEnrollments = new Set<string>();
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ") && ids.length > 0) {
    const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (user) {
      const { data: mine } = await supabaseAdmin
        .from("online_test_enrollments")
        .select("session_id")
        .eq("user_id", user.id)
        .eq("payment_status", "paid")
        .in("session_id", ids);
      for (const e of mine ?? []) myEnrollments.add(e.session_id);
    }
  }

  const result: PublicTestSession[] = (sessions ?? []).map((s) => ({
    ...s,
    remaining: Math.max(0, s.capacity - (counts.get(s.id) ?? 0)),
    enrolled: myEnrollments.has(s.id),
  }));

  return NextResponse.json({ sessions: result });
}
