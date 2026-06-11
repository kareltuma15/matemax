import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
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
