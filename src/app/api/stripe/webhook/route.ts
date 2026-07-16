import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { sendEnrollmentConfirmation } from "@/lib/online-test-emails";
import type Stripe from "stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Next.js must not parse the body — Stripe needs raw bytes for signature verification
export const runtime = "nodejs";

async function setPremium(customerId: string, isPremium: boolean, subscriptionId?: string) {
  const { data } = await supabaseAdmin
    .from("user_premium")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!data?.user_id) {
    console.error("webhook: no user found for customer", customerId);
    return;
  }

  await supabaseAdmin.from("user_premium").upsert(
    {
      user_id: data.user_id,
      is_premium: isPremium,
      trial_expires_at: null,
      stripe_customer_id: customerId,
      ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
    },
    { onConflict: "user_id" }
  );
}

// Potvrzení přihlášení na test nanečisto. Stripe umí webhook zopakovat,
// proto se odeslání hlídá přes confirm_sent_at. Selhání emailu nesmí shodit
// webhook — platba už proběhla a enrollment je zaplacený.
async function sendOnlineTestConfirmation(enrollmentId: string) {
  try {
    const { data: enrollment } = await supabaseAdmin
      .from("online_test_enrollments")
      .select("id, user_id, session_id, confirm_sent_at")
      .eq("id", enrollmentId)
      .maybeSingle();
    if (!enrollment || enrollment.confirm_sent_at) return;

    const { data: session } = await supabaseAdmin
      .from("online_test_sessions")
      .select("id, title, scheduled_at")
      .eq("id", enrollment.session_id)
      .maybeSingle();
    if (!session) return;

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(enrollment.user_id);
    const to = userRes?.user?.email;
    if (!to) return;

    const meta = (userRes.user?.user_metadata ?? {}) as Record<string, unknown>;
    const jmeno =
      (typeof meta.first_name === "string" && meta.first_name) ||
      (typeof meta.full_name === "string" && meta.full_name.split(" ")[0]) ||
      to.split("@")[0];

    const ok = await sendEnrollmentConfirmation({
      to, jmeno, title: session.title, scheduledAt: session.scheduled_at, sessionId: session.id,
    });
    if (ok) {
      await supabaseAdmin
        .from("online_test_enrollments")
        .update({ confirm_sent_at: new Date().toISOString() })
        .eq("id", enrollmentId);
    }
  } catch (err) {
    console.error("webhook: online_test confirmation email failed", enrollmentId, err);
  }
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.arrayBuffer();
    event = stripe.webhooks.constructEvent(Buffer.from(rawBody), sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.customer) {
          await setPremium(
            session.customer as string,
            true,
            session.subscription as string
          );
        }
        // Jednorázová platba za online test nanečisto
        if (session.mode === "payment" && session.metadata?.type === "online_test") {
          const enrollmentId = session.metadata.enrollment_id;
          if (enrollmentId) {
            const { error } = await supabaseAdmin
              .from("online_test_enrollments")
              .update({
                payment_status: "paid",
                stripe_payment_intent_id: session.payment_intent as string,
              })
              .eq("id", enrollmentId);
            if (error) {
              console.error("webhook: online_test enrollment update failed", enrollmentId, error);
            } else {
              await sendOnlineTestConfirmation(enrollmentId);
            }
          } else {
            console.error("webhook: online_test checkout without enrollment_id", session.id);
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const active = sub.status === "active" || sub.status === "trialing";
        await setPremium(sub.customer as string, active, sub.id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await setPremium(sub.customer as string, false, sub.id);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await setPremium(invoice.customer as string, false);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
