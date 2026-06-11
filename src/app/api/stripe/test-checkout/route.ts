import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// POST — Stripe Checkout pro přihlášení na test nanečisto.
// Body: { sessionId } (id termínu z online_test_sessions)
export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Not configured" }, { status: 503 });
    }

    const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await caller.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const sessionId = body?.sessionId;
    if (typeof sessionId !== "string" || !sessionId) {
      return NextResponse.json({ error: "Chybí sessionId" }, { status: 400 });
    }

    // Termín musí být publikovaný a v budoucnu
    const { data: testSession } = await supabaseAdmin
      .from("online_test_sessions")
      .select("id, title, scheduled_at, capacity, price_czk, is_published")
      .eq("id", sessionId)
      .maybeSingle();

    if (!testSession || !testSession.is_published) {
      return NextResponse.json({ error: "Termín nenalezen" }, { status: 404 });
    }
    if (new Date(testSession.scheduled_at) < new Date()) {
      return NextResponse.json({ error: "Termín už proběhl" }, { status: 400 });
    }

    // Už přihlášen a zaplaceno?
    const { data: existing } = await supabaseAdmin
      .from("online_test_enrollments")
      .select("id, payment_status")
      .eq("session_id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.payment_status === "paid") {
      return NextResponse.json({ error: "Na tento termín už jsi přihlášen/a" }, { status: 409 });
    }

    // Kontrola kapacity (počítají se jen zaplacené přihlášky)
    const { count: paidCount } = await supabaseAdmin
      .from("online_test_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("payment_status", "paid");

    if ((paidCount ?? 0) >= testSession.capacity) {
      return NextResponse.json({ error: "Termín je plně obsazen" }, { status: 409 });
    }

    // Pending enrollment — webhook ho po platbě přepne na paid
    let enrollmentId = existing?.id as string | undefined;
    if (!enrollmentId) {
      const { data: enrollment, error: enrollError } = await supabaseAdmin
        .from("online_test_enrollments")
        .insert({ session_id: sessionId, user_id: user.id })
        .select("id")
        .single();
      if (enrollError || !enrollment) {
        console.error("test-checkout enrollment error:", enrollError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      enrollmentId = enrollment.id;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://matemax.matematika-snadno.cz";
    const startDate = new Date(testSession.scheduled_at).toLocaleString("cs-CZ", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Prague",
    });

    const checkout = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "czk",
            unit_amount: testSession.price_czk * 100,
            product_data: {
              name: testSession.title,
              description: `Online test nanečisto — ${startDate}`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/testy-nanecisto?platba=ok`,
      cancel_url: `${appUrl}/testy-nanecisto?platba=zrusena`,
      locale: "cs",
      metadata: {
        type: "online_test",
        enrollment_id: enrollmentId!,
        supabase_user_id: user.id,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("test-checkout error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
