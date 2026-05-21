import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "karel.tuma15@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await caller.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: authData },
    { count: totalSessions },
    { count: activeTodaySessions },
    { data: feedbackRows },
  ] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
    supabaseAdmin.from("sessions").select("*", { count: "exact", head: true }),
    supabaseAdmin.from("sessions").select("*", { count: "exact", head: true }).eq("date", today),
    supabaseAdmin.from("user_feedback").select("rating"),
  ]);

  const allUsers = authData?.users ?? [];
  const totalUsers = allUsers.length;
  const newThisWeek = allUsers.filter((u) => new Date(u.created_at) >= new Date(weekAgo)).length;

  const ratings = (feedbackRows ?? []).map((r) => r.rating as number);
  const avgFeedback = ratings.length > 0
    ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
    : null;

  // Active today = distinct users who have a session today
  const { data: todayUsers } = await supabaseAdmin
    .from("sessions")
    .select("user_id")
    .eq("date", today);
  const activeToday = new Set((todayUsers ?? []).map((r) => r.user_id as string)).size;

  return NextResponse.json({
    totalUsers,
    newThisWeek,
    totalSessions: totalSessions ?? 0,
    activeToday,
    avgFeedback,
    feedbackCount: ratings.length,
  });
}
