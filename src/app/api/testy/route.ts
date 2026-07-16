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
  past: boolean;     // termín už proběhl — žák sem chodí nahrát arch / pro výsledky
}

// GET — publikované termíny + zbývající kapacita.
// Auth header je volitelný — s ním vrací i stav přihlášení žáka a jeho
// už proběhlé termíny (aby se dostal do místnosti nahrát arch a pro výsledky).
export async function GET(req: Request) {
  if (!supabaseAdmin) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const nowIso = new Date().toISOString();

  // Kdo volá (volitelně) + na které termíny má zaplaceno
  let userId: string | null = null;
  const myPaidSessionIds = new Set<string>();
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (user) {
      userId = user.id;
      const { data: mine } = await supabaseAdmin
        .from("online_test_enrollments")
        .select("session_id")
        .eq("user_id", user.id)
        .eq("payment_status", "paid");
      for (const e of mine ?? []) myPaidSessionIds.add(e.session_id as string);
    }
  }

  // Nadcházející publikované termíny
  const { data: upcoming, error } = await supabaseAdmin
    .from("online_test_sessions")
    .select("id, title, scheduled_at, duration_minutes, price_czk, capacity")
    .eq("is_published", true)
    .gte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("testy GET error:", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const sessions = [...(upcoming ?? [])];
  const seen = new Set(sessions.map((s) => s.id));

  // Plus proběhlé termíny, na které je žák přihlášen — jinak by ztratil
  // přístup do místnosti (upload archu, výsledky) hned po skončení testu.
  if (userId && myPaidSessionIds.size > 0) {
    const missing = [...myPaidSessionIds].filter((id) => !seen.has(id));
    if (missing.length > 0) {
      const { data: pastMine } = await supabaseAdmin
        .from("online_test_sessions")
        .select("id, title, scheduled_at, duration_minutes, price_czk, capacity")
        .eq("is_published", true)
        .in("id", missing)
        .order("scheduled_at", { ascending: false });
      sessions.push(...(pastMine ?? []));
    }
  }

  const ids = sessions.map((s) => s.id);

  // Zaplacené přihlášky per termín (kapacita)
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

  const result: PublicTestSession[] = sessions.map((s) => ({
    ...s,
    remaining: Math.max(0, s.capacity - (counts.get(s.id) ?? 0)),
    enrolled: myPaidSessionIds.has(s.id),
    past: new Date(s.scheduled_at).getTime() < Date.now(),
  }));

  return NextResponse.json({ sessions: result });
}
