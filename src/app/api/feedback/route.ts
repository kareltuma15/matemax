import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// SQL migration (run once in Supabase):
// CREATE TABLE user_feedback (
//   id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id      UUID REFERENCES auth.users(id),
//   rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
//   liked        TEXT[] DEFAULT '{}',
//   suggestion   TEXT,
//   session_count INT,
//   created_at   TIMESTAMPTZ DEFAULT now()
// );
// ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Users can insert own feedback"
//   ON user_feedback FOR INSERT
//   WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

export async function POST(req: NextRequest) {
  if (!rateLimit(`feedback:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.rating !== "number" || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { rating, liked = [], suggestion = "", sessionCount } = body as {
    rating: number;
    liked: string[];
    suggestion: string;
    sessionCount?: number;
  };

  // Sanitize text inputs
  const cleanSuggestion = typeof suggestion === "string"
    ? suggestion.trim().slice(0, 1000)
    : "";
  const cleanLiked = Array.isArray(liked)
    ? liked.filter((x) => typeof x === "string").map((x) => x.trim().slice(0, 100)).slice(0, 20)
    : [];

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

  const { error } = await supabase.from("user_feedback").insert({
    user_id: user?.id ?? null,
    rating,
    liked: cleanLiked,
    suggestion: cleanSuggestion || null,
    session_count: typeof sessionCount === "number" ? sessionCount : null,
  });

  if (error) {
    console.error("[feedback] insert error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
