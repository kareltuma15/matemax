import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";

// Protect with CRON_SECRET header so only trusted callers can trigger.
// Call manually: POST /api/cron/daily-push  { "x-cron-secret": "<CRON_SECRET>" }
// Or wire up via Vercel Cron Jobs (vercel.json) or any external scheduler.

if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:noreply@matemax.cz",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 });
  }

  if (!supabase) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }

  const { data: rows, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, subscription");

  if (error) {
    console.error("push_subscriptions select error:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  const payload = JSON.stringify({
    title: "MateMax",
    body: "Čas na dnešní trénink! 💪",
    url: "/trenink",
  });

  const results = await Promise.allSettled(
    (rows ?? []).map((row: { endpoint: string; subscription: string }) =>
      webpush.sendNotification(JSON.parse(row.subscription), payload)
    )
  );

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Remove expired / unsubscribed endpoints (HTTP 410)
  const gone: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number };
      if (err?.statusCode === 410) gone.push((rows ?? [])[i].endpoint);
    }
  });
  if (gone.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", gone);
  }

  console.log(`[daily-push] sent=${sent} failed=${failed} removed=${gone.length}`);
  return NextResponse.json({ ok: true, sent, failed, removed: gone.length });
}

// Allow GET for quick health-check (unauthenticated, returns no data)
export async function GET() {
  return NextResponse.json({ endpoint: "daily-push cron", requiresSecret: true });
}
