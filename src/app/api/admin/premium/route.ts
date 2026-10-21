import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * Ruční udělení / odebrání Premium z admin přehledu (jen pro adminy).
 * Pro zákazníky plánů z webu (Wix), kteří nemají předplatné ve Stripe.
 * - grant: is_premium = true, volitelně do data `until` (RRRR-MM-DD); bez data = bez omezení
 * - revoke: is_premium = false
 * Uživatele s předplatným ve Stripe se tu nemění — tím řídí webhook, ruční zásah by se s ním rozešel.
 */
export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });

  let body: { userId?: unknown; action?: unknown; until?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: "Bad userId" }, { status: 400 });
  if (body.action !== "grant" && body.action !== "revoke") {
    return NextResponse.json({ error: "Bad action" }, { status: 400 });
  }

  // Uživatel musí existovat v Authentication.
  const { data: target, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userErr || !target?.user) return NextResponse.json({ error: "Uživatel neexistuje" }, { status: 404 });

  const { data: row, error: readErr } = await supabaseAdmin
    .from("user_premium")
    .select("is_premium, stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

  if (row?.stripe_subscription_id) {
    return NextResponse.json(
      { error: "Uživatel má předplatné ve Stripe — spravuje se tam (zrušení přes portál / webhook)." },
      { status: 409 }
    );
  }

  const grantedBy = `admin:${auth.email}`;

  if (body.action === "revoke") {
    const { error } = await supabaseAdmin
      .from("user_premium")
      .update({ is_premium: false, trial_expires_at: null })
      .eq("user_id", userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    console.log(`[admin] premium REVOKE pro ${userId} (${target.user.email}) od ${auth.email}`);
    return NextResponse.json({ ok: true, plan: "free", trialUntil: null });
  }

  // grant — volitelné datum konce musí být platné a v budoucnosti (konec dne)
  let expiresAt: string | null = null;
  if (body.until !== undefined && body.until !== null && body.until !== "") {
    const until = typeof body.until === "string" ? body.until : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return NextResponse.json({ error: "Datum musí být RRRR-MM-DD" }, { status: 400 });
    const end = new Date(`${until}T23:59:59Z`);
    if (Number.isNaN(end.getTime()) || end.toISOString().slice(0, 10) !== until) {
      return NextResponse.json({ error: "Neplatné datum" }, { status: 400 });
    }
    if (end.getTime() <= Date.now()) return NextResponse.json({ error: "Datum musí být v budoucnosti" }, { status: 400 });
    expiresAt = end.toISOString();
  }

  const { error } = await supabaseAdmin
    .from("user_premium")
    .upsert(
      { user_id: userId, is_premium: true, trial_expires_at: expiresAt, trial_granted_by: grantedBy },
      { onConflict: "user_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  console.log(`[admin] premium GRANT pro ${userId} (${target.user.email}) do ${expiresAt ?? "bez omezení"} od ${auth.email}`);
  return NextResponse.json({ ok: true, plan: expiresAt ? "trial" : "paid", trialUntil: expiresAt });
}
