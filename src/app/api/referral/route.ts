import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TRIAL_DAYS } from "@/lib/referral";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

function trialExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d.toISOString();
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await supabaseCaller.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { referralCode?: string };
  const { referralCode } = body;
  const newUserId = user.id;

  if (!referralCode) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!supabase || !supabaseAdmin) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }

  // Find referrer: their UUID starts with the code (case-insensitive)
  const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  const referrer = users?.users?.find(
    (u) => u.id.replace(/-/g, "").slice(0, 8).toUpperCase() === referralCode.toUpperCase()
  );

  if (!referrer) {
    return NextResponse.json({ ok: false, reason: "Referral code not found" });
  }
  if (referrer.id === newUserId) {
    return NextResponse.json({ ok: false, reason: "Cannot refer yourself" });
  }

  const expiresAt = trialExpiresAt();

  // Grant trial to the new user
  await supabase.from("user_premium").upsert(
    { user_id: newUserId, is_premium: true, trial_expires_at: expiresAt, trial_granted_by: "referral" },
    { onConflict: "user_id" }
  );

  // Grant trial to the referrer (only if they don't already have active premium)
  const { data: referrerPremium } = await supabase
    .from("user_premium")
    .select("is_premium, trial_expires_at")
    .eq("user_id", referrer.id)
    .maybeSingle();

  const referrerAlreadyPremium =
    referrerPremium?.is_premium &&
    (!referrerPremium.trial_expires_at || new Date(referrerPremium.trial_expires_at) > new Date());

  if (!referrerAlreadyPremium) {
    await supabase.from("user_premium").upsert(
      { user_id: referrer.id, is_premium: true, trial_expires_at: expiresAt, trial_granted_by: "referral_reward" },
      { onConflict: "user_id" }
    );
  }

  // Log the referral (best-effort — table may not exist yet)
  try {
    await supabase.from("referrals").insert({
      referrer_user_id: referrer.id,
      referred_user_id: newUserId,
      referral_code: referralCode.toUpperCase(),
      reward_granted: true,
    });
  } catch { /* ignore if table doesn't exist */ }

  console.log(`[referral] ${referrer.id} → ${newUserId}, trial until ${expiresAt}`);
  return NextResponse.json({ ok: true, trialDays: TRIAL_DAYS });
}
