import { NextRequest, NextResponse } from "next/server";
import { pragueDateStr } from "@/lib/date";
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
  /** Jméno z registrace (user_metadata), nebo null */
  name: string | null;
  /** paid = platí předplatné, trial = zkušební období, free = zdarma */
  plan: "paid" | "trial" | "free";
  trialUntil: string | null;
  lastLogin: string | null;
  answered: number;
  correct: number;
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
    { data: premiumRows },
  ] = await Promise.all([
    supabaseAdmin.from("user_xp").select("user_id, total_xp, current_level").in("user_id", userIds),
    supabaseAdmin
      .from("sessions")
      .select("user_id, date, correct, total")
      .in("user_id", userIds)
      .order("date", { ascending: false }),
    supabaseAdmin
      .from("diagnostic_results")
      .select("user_id")
      .in("user_id", userIds),
    supabaseAdmin
      .from("user_premium")
      .select("user_id, is_premium, trial_expires_at")
      .in("user_id", userIds),
  ]);

  const premiumMap = new Map<string, { isPremium: boolean; trialUntil: string | null }>();
  for (const row of premiumRows ?? []) {
    premiumMap.set(row.user_id as string, { isPremium: !!row.is_premium, trialUntil: (row.trial_expires_at as string | null) ?? null });
  }
  const answersByUser = new Map<string, { answered: number; correct: number }>();
  for (const row of sessionRows ?? []) {
    const cur = answersByUser.get(row.user_id as string) ?? { answered: 0, correct: 0 };
    cur.answered += (row.total as number) ?? 0;
    cur.correct += (row.correct as number) ?? 0;
    answersByUser.set(row.user_id as string, cur);
  }

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
      const ds = pragueDateStr(d);
      if (dateSet.has(ds)) streak++;
      else if (i > 0) break;
    }
    return streak;
  }

  const users: AdminUser[] = authUsers.map((u) => {
    const dates = sessionsByUser.get(u.id) ?? [];
    const xpInfo = xpMap.get(u.id) ?? { xp: 0, level: "zacatecnik" };
    const prem = premiumMap.get(u.id);
    const trialActive = !!prem?.trialUntil && new Date(prem.trialUntil) > new Date();
    const plan: AdminUser["plan"] = prem?.isPremium ? (prem.trialUntil ? (trialActive ? "trial" : "free") : "paid") : "free";
    const meta = (u.user_metadata ?? {}) as Record<string, unknown>;
    const first = typeof meta.first_name === "string" ? meta.first_name : "";
    const last = typeof meta.last_name === "string" ? meta.last_name : "";
    const full = typeof meta.full_name === "string" ? meta.full_name : "";
    const name = `${first} ${last}`.trim() || full.trim() || null;
    const ans = answersByUser.get(u.id) ?? { answered: 0, correct: 0 };
    return {
      id: u.id,
      email: u.email ?? "(no email)",
      name,
      plan,
      trialUntil: plan === "trial" ? prem?.trialUntil ?? null : null,
      lastLogin: u.last_sign_in_at ?? null,
      answered: ans.answered,
      correct: ans.correct,
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
