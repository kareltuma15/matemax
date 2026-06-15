import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { examples } from "@/data/examples";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function topicLabel(tema: string): string {
  const MAP: Record<string, string> = {
    zlomky: "Zlomky",
    vyrazy: "Výrazy",
    rovnice: "Rovnice",
    geometrie: "Geometrie",
    slovni_ulohy: "Slovní úlohy",
    grafy_logika: "Grafy a logika",
    konstrukce: "Konstrukční úlohy",
    uhly: "Úhly",
    souhrnne: "Souhrnné",
    mix: "Mix témat",
  };
  return MAP[tema] ?? tema;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // Use parent's JWT so RLS filters parent_child_link by their email
  const supabaseParent = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabaseParent.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get verified child links for this parent
  const { data: links, error: linkError } = await supabaseParent
    .from("parent_child_link")
    .select("child_user_id, verified")
    .eq("verified", true);

  if (linkError) return NextResponse.json({ error: linkError.message }, { status: 500 });
  if (!links || links.length === 0) {
    return NextResponse.json({ linked: false });
  }

  const childId = links[0].child_user_id as string;

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Admin client not configured — add SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  }

  // Child display name (email prefix from auth.users)
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(childId);
  const childEmail = authUser?.user?.email ?? "";
  const childName = childEmail.split("@")[0];

  // Sessions last 14 days (7 this week + 7 last week for trend)
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: sessions } = await supabaseAdmin
    .from("sessions")
    .select("date, correct, total, xp_earned")
    .eq("user_id", childId)
    .gte("date", twoWeeksAgo);

  const allRecentSessions = sessions ?? [];
  const thisWeekSessions = allRecentSessions.filter((s) => (s.date as string) >= weekAgo);
  const lastWeekSessions = allRecentSessions.filter((s) => (s.date as string) < weekAgo);

  const weekTotal = thisWeekSessions.reduce((acc, s) => acc + (s.total as number), 0);
  const weekCorrect = thisWeekSessions.reduce((acc, s) => acc + (s.correct as number), 0);
  const accuracy = weekTotal > 0 ? Math.round((weekCorrect / weekTotal) * 100) : null;
  const lastWeekTotal = lastWeekSessions.reduce((acc, s) => acc + (s.total as number), 0);

  // Daily activity for the last 7 days (for the activity strip)
  const dailyMap: Record<string, number> = {};
  for (const s of thisWeekSessions) {
    const d = s.date as string;
    dailyMap[d] = (dailyMap[d] ?? 0) + (s.total as number);
  }
  const weeklyActivity: { date: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    weeklyActivity.push({ date: ds, count: dailyMap[ds] ?? 0 });
  }

  // Streak (consecutive days ending today) + lastSession
  const { data: allSessions } = await supabaseAdmin
    .from("sessions")
    .select("date")
    .eq("user_id", childId)
    .order("date", { ascending: false });

  let streak = 0;
  const lastSession = (allSessions as { date: string }[] | null)?.[0]?.date ?? null;
  if (allSessions && allSessions.length > 0) {
    const dates = new Set((allSessions as { date: string }[]).map((s) => s.date));
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      if (dates.has(ds)) streak++;
      else if (i > 0) break;
    }
  }

  // XP + level
  const { data: xpRow } = await supabaseAdmin
    .from("user_xp")
    .select("total_xp, current_level")
    .eq("user_id", childId)
    .maybeSingle();
  const totalXp = (xpRow as { total_xp: number } | null)?.total_xp ?? 0;
  const currentLevel = (xpRow as { current_level: string } | null)?.current_level ?? "zacatecnik";

  // Topic performance from sm2_cards (ease factor < 2.1 = struggling)
  const { data: sm2Cards } = await supabaseAdmin
    .from("sm2_cards")
    .select("example_id, ease, interval")
    .eq("user_id", childId);

  type TopicStat = { correct: number; total: number };
  const topicStats: Record<string, TopicStat> = {};

  if (sm2Cards && sm2Cards.length > 0) {
    const exampleMap = new Map(examples.map((e) => [e.id, e.tema]));
    for (const card of sm2Cards as { example_id: string; ease: number; interval: number }[]) {
      const tema = exampleMap.get(card.example_id);
      if (!tema) continue;
      if (!topicStats[tema]) topicStats[tema] = { correct: 0, total: 0 };
      topicStats[tema].total += 1;
      // ease >= 2.5 = mastered, < 2.0 = struggling
      if (card.ease >= 2.3) topicStats[tema].correct += 1;
    }
  }

  const topicTable = Object.entries(topicStats)
    .map(([tema, s]) => ({
      tema,
      label: topicLabel(tema),
      accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      total: s.total,
    }))
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakestTopic = topicTable[0] ?? null;

  return NextResponse.json({
    linked: true,
    childId,
    childName,
    childEmail,
    weekTotal,
    lastWeekTotal,
    accuracy,
    streak,
    lastSession,
    totalXp,
    currentLevel,
    topicTable,
    weakestTopic,
    weeklyActivity,
  });
}
