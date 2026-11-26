import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getWeekKey, type LeaderboardEntry } from "@/lib/weekly-challenge";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Žebříček týdenní výzvy: top 10 a vlastní řádek. Čte server (service role), prohlížeč dostane
 * jen přezdívku, avatar a výsledek. ID účtů ostatních žáků se neposílají (SY-13). Skryté řádky
 * (admin je vyřadil) se neukazují ostatním, jen jejich majiteli.
 */
const SLOUPCE = "user_id, nickname, avatar_emoji, score, total, time_seconds, xp_earned, skryty";

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
  if (!supabaseAdmin) return NextResponse.json({ error: "Server není nastavený" }, { status: 503 });

  const weekKey = getWeekKey();
  const { data: { user } } = await supabase.auth.getUser();

  const { data, error } = await supabaseAdmin
    .from("weekly_leaderboard")
    .select(SLOUPCE)
    .eq("week_key", weekKey)
    .eq("skryty", false)
    .order("score", { ascending: false })
    .order("time_seconds", { ascending: true })
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  type Radek = { user_id: string; nickname: string; avatar_emoji: string; score: number; total: number; time_seconds: number; xp_earned: number };
  const zaznam = (row: Radek, rank: number): LeaderboardEntry => ({
    rank,
    nickname: row.nickname,
    avatar_emoji: row.avatar_emoji,
    score: row.score,
    total: row.total,
    time_seconds: row.time_seconds,
    xp_earned: row.xp_earned,
    is_own: !!user && row.user_id === user.id,
  });
  const entries: LeaderboardEntry[] = ((data ?? []) as Radek[]).map((row, i) => zaznam(row, i + 1));

  // Vlastní řádek, když žák není v top 10 (nebo ho admin skryl ostatním)
  let ownEntry: LeaderboardEntry | null = null;
  if (user && !entries.some((e) => e.is_own)) {
    const { data: own } = await supabaseAdmin
      .from("weekly_leaderboard")
      .select(SLOUPCE)
      .eq("week_key", weekKey)
      .eq("user_id", user.id)
      .maybeSingle();

    if (own) {
      const { count } = await supabaseAdmin
        .from("weekly_leaderboard")
        .select("id", { count: "exact", head: true })
        .eq("week_key", weekKey)
        .eq("skryty", false)
        .or(`score.gt.${own.score},and(score.eq.${own.score},time_seconds.lt.${own.time_seconds})`);
      ownEntry = zaznam(own as Radek, (count ?? 0) + 1);
    }
  }

  return NextResponse.json({ entries, ownEntry, weekKey });
}
