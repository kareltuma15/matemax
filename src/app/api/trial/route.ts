import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TRIAL_DAYS } from "@/lib/referral";

function trialExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { userId?: string };
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }

  // Check if user already has active premium or trial
  const { data: existing } = await supabaseAdmin
    .from("user_premium")
    .select("is_premium, trial_expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  const alreadyActive =
    existing?.is_premium &&
    (!existing.trial_expires_at || new Date(existing.trial_expires_at) > new Date());

  if (alreadyActive) {
    return NextResponse.json({ ok: false, reason: "Already premium" });
  }

  const expiresAt = trialExpiresAt();

  const { error } = await supabaseAdmin.from("user_premium").upsert(
    { user_id: userId, is_premium: true, trial_expires_at: expiresAt, trial_granted_by: "self" },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[trial] upsert error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  console.log(`[trial] granted to ${userId}, expires ${expiresAt}`);
  return NextResponse.json({ ok: true, trialDays: TRIAL_DAYS });
}
