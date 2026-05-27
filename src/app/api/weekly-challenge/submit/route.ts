import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { getWeekKey } from "@/lib/weekly-challenge";

export async function POST(req: NextRequest) {
  if (!rateLimit(`weekly-submit:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (
    !body ||
    typeof body.score !== "number" ||
    typeof body.total !== "number" ||
    typeof body.time_seconds !== "number" ||
    body.score < 0 || body.total <= 0 || body.time_seconds < 0 ||
    body.score > body.total
  ) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { score, total, time_seconds, xp_earned = 0 } = body as {
    score: number;
    total: number;
    time_seconds: number;
    xp_earned: number;
  };

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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch nickname and avatar from user_progress
  const { data: profile } = await supabase
    .from("user_progress")
    .select("nickname, avatar_emoji, display_name")
    .eq("user_id", user.id)
    .single();

  const nickname =
    (profile?.nickname?.trim() || profile?.display_name?.trim() || "").slice(0, 30) ||
    `Žák ${user.id.slice(-4).toUpperCase()}`;
  const avatarEmoji = profile?.avatar_emoji ?? "🧑‍💻";

  const weekKey = getWeekKey();

  // Check existing entry
  const { data: existing } = await supabase
    .from("weekly_leaderboard")
    .select("score, time_seconds")
    .eq("user_id", user.id)
    .eq("week_key", weekKey)
    .single();

  const isBetter = !existing ||
    score > existing.score ||
    (score === existing.score && time_seconds < existing.time_seconds);

  if (isBetter) {
    const { error } = await supabase
      .from("weekly_leaderboard")
      .upsert(
        {
          user_id: user.id,
          week_key: weekKey,
          nickname,
          avatar_emoji: avatarEmoji,
          score,
          total,
          time_seconds,
          xp_earned,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,week_key" }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, improved: isBetter, weekKey });
}
