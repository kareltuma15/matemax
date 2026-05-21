import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "karel.tuma15@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

export interface AdminUser {
  id: string;
  email: string;
  createdAt: string;
  lastSession: string | null;
  sessionCount: number;
  streak: number;
  level: string;
  totalXp: number;
  diagDone: boolean;
}

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

  const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = authData?.users ?? [];

  const userIds = authUsers.map((u) => u.id);

  const [
    { data: xpRows },
    { data: sessionRows },
    { data: diagRows },
  ] = await Promise.all([
    supabaseAdmin.from("user_xp").select("user_id, total_xp, current_level").in("user_id", userIds),
    supabaseAdmin
      .from("sessions")
      .select("user_id, date")
      .in("user_id", userIds)
      .order("date", { ascending: false }),
    supabaseAdmin
      .from("diagnostic_results")
      .select("user_id")
      .in("user_id", userIds),
  ]);

  const xpMap = new Map<string, { xp: number; level: string }>();
  for (const row of xpRows ?? []) {
    xpMap.set(row.user_id as string, {
      xp: (row.total_xp as number) ?? 0,
      level: (row.current_level as string) ?? "zacatecnik",
    });
  }

  // Build per-user session list for streak + count + lastSession
  const sessionsByUser = new Map<string, string[]>();
  for (const row of sessionRows ?? []) {
    const uid = row.user_id as string;
    if (!sessionsByUser.has(uid)) sessionsByUser.set(uid, []);
    sessionsByUser.get(uid)!.push(row.date as string);
  }

  const diagUserSet = new Set((diagRows ?? []).map((r) => r.user_id as string));

  function computeStreak(dates: string[]): number {
    if (!dates.length) return 0;
    const dateSet = new Set(dates);
    const today = new Date();
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      if (dateSet.has(ds)) streak++;
      else if (i > 0) break;
    }
    return streak;
  }

  const users: AdminUser[] = authUsers.map((u) => {
    const dates = sessionsByUser.get(u.id) ?? [];
    const xpInfo = xpMap.get(u.id) ?? { xp: 0, level: "zacatecnik" };
    return {
      id: u.id,
      email: u.email ?? "(no email)",
      createdAt: u.created_at,
      lastSession: dates[0] ?? null,
      sessionCount: dates.length,
      streak: computeStreak(dates),
      level: xpInfo.level,
      totalXp: xpInfo.xp,
      diagDone: diagUserSet.has(u.id),
    };
  });

  // Sort: most recent activity first
  users.sort((a, b) => {
    if (a.lastSession && b.lastSession) return b.lastSession.localeCompare(a.lastSession);
    if (a.lastSession) return -1;
    if (b.lastSession) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

  return NextResponse.json({ users });
}
