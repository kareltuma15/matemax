import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "karel.tuma15@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase());

export async function POST(req: NextRequest) {
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

  const { userId } = (await req.json()) as { userId?: string };
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const [diagResult, onboardingResult] = await Promise.all([
    supabaseAdmin.from("diagnostic_results").delete().eq("user_id", userId),
    supabaseAdmin
      .from("user_onboarding")
      .update({ current_state: "registered" })
      .eq("user_id", userId),
  ]);

  if (diagResult.error) {
    return NextResponse.json({ error: diagResult.error.message }, { status: 500 });
  }

  console.log(`[admin] reset-diagnostics for ${userId} by ${user.email}, onboarding reset: ${!onboardingResult.error}`);
  return NextResponse.json({ ok: true });
}
