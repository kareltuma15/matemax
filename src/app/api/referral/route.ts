import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TRIAL_DAYS } from "@/lib/referral";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Kolik odměněných doporučení může mít jeden doporučující. Bez stropu by šlo zkušební
// prémium získávat donekonečna zakládáním dalších účtů (např. přes Gmail aliasy +1, +2…).
const MAX_REWARDED_REFERRALS = 5;

function trialExpiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d.toISOString();
}

type PremiumRow = { is_premium: boolean | null; trial_expires_at: string | null; trial_granted_by: string | null };

const isActive = (r: PremiumRow | null) =>
  !!r?.is_premium && (!r.trial_expires_at || new Date(r.trial_expires_at) > new Date());

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseCaller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await supabaseCaller.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { referralCode?: string } | null;
  const referralCode = body?.referralCode?.trim();
  const newUserId = user.id;

  if (!referralCode) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }

  // Zápisy do user_premium a referrals jdou jen přes service-role klient — anonymní klient
  // (dřívější kód) je kvůli RLS potichu odmítal a doporučení nikdy nefungovalo.

  // Jedno doporučení na nového uživatele
  const { data: alreadyUsed, error: usedErr } = await supabaseAdmin
    .from("referrals")
    .select("id")
    .eq("referred_user_id", newUserId)
    .limit(1);
  if (usedErr) {
    console.error("[referral] kontrola referrals selhala:", usedErr);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
  if (alreadyUsed && alreadyUsed.length > 0) {
    return NextResponse.json({ ok: false, reason: "Referral already used" });
  }

  // Doporučující: jeho UUID začíná kódem (bez pomlček, velkými písmeny)
  const { data: users, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
  if (listErr) {
    console.error("[referral] listUsers selhalo:", listErr);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
  const referrer = users.users.find(
    (u) => u.id.replace(/-/g, "").slice(0, 8).toUpperCase() === referralCode.toUpperCase()
  );

  if (!referrer) {
    return NextResponse.json({ ok: false, reason: "Referral code not found" });
  }
  if (referrer.id === newUserId) {
    return NextResponse.json({ ok: false, reason: "Cannot refer yourself" });
  }

  const { data: rows, error: premErr } = await supabaseAdmin
    .from("user_premium")
    .select("user_id, is_premium, trial_expires_at, trial_granted_by")
    .in("user_id", [newUserId, referrer.id]);
  if (premErr) {
    console.error("[referral] čtení user_premium selhalo:", premErr);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
  const newRow = (rows?.find((r) => r.user_id === newUserId) as PremiumRow | undefined) ?? null;
  const refRow = (rows?.find((r) => r.user_id === referrer.id) as PremiumRow | undefined) ?? null;

  // Nový uživatel dostane zkušební prémium jen pokud nemá aktivní prémium (placené ani zkušební)
  // a zkušební dobu ještě nevyužil — jinak by doporučení přepsalo placené předplatné.
  const newUserEligible = !isActive(newRow) && !newRow?.trial_expires_at && !newRow?.trial_granted_by;

  const expiresAt = trialExpiresAt();

  if (newUserEligible) {
    const { error } = await supabaseAdmin.from("user_premium").upsert(
      { user_id: newUserId, is_premium: true, trial_expires_at: expiresAt, trial_granted_by: "referral" },
      { onConflict: "user_id" }
    );
    if (error) {
      console.error("[referral] zápis trialu novému uživateli selhal:", error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }
  }

  // Odměna doporučujícímu: jen pokud nemá aktivní prémium a nepřekročil strop odměn
  const { count: rewardedSoFar, error: cntErr } = await supabaseAdmin
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referrer_user_id", referrer.id)
    .eq("reward_granted", true);
  if (cntErr) console.error("[referral] počítání odměn selhalo:", cntErr);

  const rewardReferrer =
    !isActive(refRow) && !cntErr && (rewardedSoFar ?? 0) < MAX_REWARDED_REFERRALS;

  let rewardGranted = false;
  if (rewardReferrer) {
    const { error } = await supabaseAdmin.from("user_premium").upsert(
      { user_id: referrer.id, is_premium: true, trial_expires_at: expiresAt, trial_granted_by: "referral_reward" },
      { onConflict: "user_id" }
    );
    if (error) console.error("[referral] zápis odměny doporučujícímu selhal:", error);
    else rewardGranted = true;
  }

  const { error: logErr } = await supabaseAdmin.from("referrals").insert({
    referrer_user_id: referrer.id,
    referred_user_id: newUserId,
    referral_code: referralCode.toUpperCase(),
    reward_granted: rewardGranted,
  });
  if (logErr) console.error("[referral] zápis do referrals selhal:", logErr);

  console.log(
    `[referral] ${referrer.id} → ${newUserId}, nový: ${newUserEligible ? "trial" : "beze změny"}, odměna: ${rewardGranted}`
  );
  return NextResponse.json({ ok: newUserEligible, trialDays: TRIAL_DAYS });
}
