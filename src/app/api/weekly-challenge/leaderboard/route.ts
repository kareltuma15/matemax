import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getWeekKey, type LeaderboardEntry } from "@/lib/weekly-challenge";

export async function GET() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );

  const weekKey = getWeekKey();

  const { data, error } = await supabase
    .from("weekly_leaderboard")
    .select("user_id, nickname, avatar_emoji, score, total, time_seconds, xp_earned")
    .eq("week_key", weekKey)
    .order("score", { ascending: false })
    .order("time_seconds", { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: { user } } = await supabase.auth.getUser();

  const entries: LeaderboardEntry[] = (data ?? []).map((row, i) => ({
    rank: i + 1,
    user_id: row.user_id,
    nickname: row.nickname,
    avatar_emoji: row.avatar_emoji,
    score: row.score,
    total: row.total,
    time_seconds: row.time_seconds,
    xp_earned: row.xp_earned,
    is_own: row.user_id === user?.id,
  }));

  // If user is authenticated but not in top 10, fetch their own entry
  let ownEntry: LeaderboardEntry | null = null;
  if (user && !entries.some((e) => e.is_own)) {
    const { data: own } = await supabase
      .from("weekly_leaderboard")
      .select("user_id, nickname, avatar_emoji, score, total, time_seconds, xp_earned")
      .eq("week_key", weekKey)
      .eq("user_id", user.id)
      .single();

    if (own) {
      // Get rank by counting entries with better score
      const { count } = await supabase
        .from("weekly_leaderboard")
        .select("id", { count: "exact", head: true })
        .eq("week_key", weekKey)
        .or(`score.gt.${own.score},and(score.eq.${own.score},time_seconds.lt.${own.time_seconds})`);

      ownEntry = {
        rank: (count ?? 0) + 1,
        user_id: own.user_id,
        nickname: own.nickname,
        avatar_emoji: own.avatar_emoji,
        score: own.score,
        total: own.total,
        time_seconds: own.time_seconds,
        xp_earned: own.xp_earned,
        is_own: true,
      };
    }
  }

  return NextResponse.json({ entries, ownEntry, weekKey });
}
