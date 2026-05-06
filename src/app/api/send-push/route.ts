import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabase } from "@/lib/supabase";

webpush.setVapidDetails(
  "mailto:noreply@matemax.cz",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  const {
    title = "MateMax",
    body = "Čas na dnešní trénink! 💪",
    url = "/trenink",
  } = (await req.json()) as { title?: string; body?: string; url?: string };

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

  const payload = JSON.stringify({ title, body, url });

  const results = await Promise.allSettled(
    (rows ?? []).map((row: { endpoint: string; subscription: string }) =>
      webpush.sendNotification(JSON.parse(row.subscription), payload)
    )
  );

  const sent   = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Remove subscriptions that returned 410 Gone (unsubscribed)
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

  return NextResponse.json({ ok: true, sent, failed });
}
