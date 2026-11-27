import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { stripe } from "@/lib/stripe";
import { sendEnrollmentConfirmation } from "@/lib/online-test-emails";
import type Stripe from "stripe";
import { posliEmail, premiumAktivni, platbaSeNepovedla } from "@/lib/emaily/rodice";
import { dokonciWebhook, prijmiWebhook } from "@/lib/zpravy-log";
import { zapisChybu } from "@/lib/system-log";
import { upozorniAdmina } from "@/lib/admin-push";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Next.js must not parse the body — Stripe needs raw bytes for signature verification
export const runtime = "nodejs";

/**
 * Najde uživatele podle Stripe zákazníka. Primárně přes user_premium.stripe_customer_id;
 * když se ID při zakládání checkoutu neuložilo (create-checkout to jen zaloguje, platbu nerušil),
 * použije se supabase_user_id z metadat předplatného, nebo zákazníka ve Stripe.
 * Bez tohoto záložního párování by zaplatil zákazník zůstal bez prémia.
 */
async function findUserId(customerId: string, hintUserId?: string | null): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("user_premium")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (data?.user_id) return data.user_id as string;
  if (hintUserId) return hintUserId;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) return customer.metadata?.supabase_user_id ?? null;
  } catch (err) {
    console.error("webhook: načtení zákazníka ze Stripe selhalo", customerId, err);
  }
  return null;
}

async function setPremium(customerId: string, isPremium: boolean, subscriptionId?: string, hintUserId?: string | null) {
  const userId = await findUserId(customerId, hintUserId);
  if (!userId) {
    // Chyba, ne tiché přeskočení: Stripe webhook zopakuje a v logu je vidět, že platba nemá uživatele.
    throw new Error(`webhook: nenalezen uživatel pro zákazníka ${customerId}`);
  }

  const { error } = await supabaseAdmin.from("user_premium").upsert(
    {
      user_id: userId,
      is_premium: isPremium,
      trial_expires_at: null,
      stripe_customer_id: customerId,
      ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
    },
    { onConflict: "user_id" }
  );
  // Selhání zápisu musí shodit webhook (500) — Stripe ho pak zopakuje, místo aby zaplacené prémium zmizelo.
  if (error) throw new Error(`webhook: zápis user_premium selhal: ${error.message}`);
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

  // Proti duplicitám (Stripe stejnou událost někdy doručí víckrát) a pro Zdraví systému v adminu
  const objekt = event.data.object as { id?: string };
  if ((await prijmiWebhook("stripe", event.id, event.type, { objekt: objekt.id ?? null })) === "duplicita") {
    return NextResponse.json({ received: true, duplicita: true });
  }

  try {
    switch (event.type) {
      // Peníze v adminu (RU-05, karta žáka → Platby): zaplacená faktura a vrácená platba, jen částka a ID
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        const uid = inv.customer ? await findUserId(inv.customer as string).catch(() => null) : null;
        await supabaseAdmin.from("analytics_events").insert({ user_id: uid, event_name: "invoice_paid", properties: { castka: inv.amount_paid, mena: inv.currency, faktura: inv.id, duvod: inv.billing_reason ?? null } });
        break;
      }
      case "charge.refunded": {
        const ch = event.data.object as Stripe.Charge;
        const uid = ch.customer ? await findUserId(ch.customer as string).catch(() => null) : null;
        await supabaseAdmin.from("analytics_events").insert({ user_id: uid, event_name: "charge_refunded", properties: { castka: ch.amount_refunded, mena: ch.currency, platba: ch.id } });
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.customer) {
          await setPremium(
            session.customer as string,
            true,
            session.subscription as string
          );
          // Potvrzení „Vítejte v Premium“ plátci (rodiči), vedlejší efekt, nesmí shodit webhook
          const komu = session.customer_details?.email ?? session.customer_email;
          if (komu) await posliEmail(komu, premiumAktivni(), "premium", {}, { userId: session.metadata?.supabase_user_id ?? null }).catch(() => false);
          await upozorniAdmina("platba", "Nová platba Premium", "Někdo si koupil MateMax Premium.", "/admin/novy/rust?tab=penize");
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
        // past_due = platba selhala, ale Stripe ji ještě opakuje (zákazník dostal e-mail) — Premium necháme.
        // Odebere se, až Stripe předplatné zruší (customer.subscription.deleted) nebo ho označí za unpaid.
        const active = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
        await setPremium(sub.customer as string, active, sub.id, sub.metadata?.supabase_user_id);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await setPremium(sub.customer as string, false, sub.id, sub.metadata?.supabase_user_id);
        break;
      }

      case "invoice.payment_failed": {
        // Záměrně NEODEBÍRÁME Premium: Stripe platbu zkouší znovu a zákazník dostane e-mail.
        // O stavu rozhodují události customer.subscription.updated/deleted.
        const invoice = event.data.object as Stripe.Invoice;
        console.warn("webhook: selhala platba faktury", invoice.id, "zákazník", invoice.customer);
        if (invoice.attempt_count === 1) await upozorniAdmina("platba", "Platba se nepovedla", "Platba za Premium neprošla, Stripe ji zkusí znovu.", "/admin/novy/rust?tab=penize");
        // Náš e-mail jen při prvním selhání (Stripe pak zkouší znovu a případně posílá vlastní upozornění)
        if (invoice.attempt_count === 1 && invoice.customer_email) {
          const castka = typeof invoice.amount_due === "number"
            ? new Intl.NumberFormat("cs-CZ", { style: "currency", currency: (invoice.currency || "czk").toUpperCase(), maximumFractionDigits: 0 }).format(invoice.amount_due / 100)
            : null;
          await posliEmail(invoice.customer_email, platbaSeNepovedla(castka, invoice.hosted_invoice_url ?? null), "platba", {}, { vlastnosti: invoice.id ? { faktura: invoice.id } : {} }).catch(() => false);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    const zprava = err instanceof Error ? err.message : String(err);
    await dokonciWebhook("stripe", event.id, "chyba", zprava);
    await zapisChybu({ zdroj: "webhook", zprava: `Stripe ${event.type}: ${zprava}`, cesta: "/api/stripe/webhook" });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  await dokonciWebhook("stripe", event.id, "zpracovano");
  return NextResponse.json({ received: true });
}
