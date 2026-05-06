import { NextRequest, NextResponse } from "next/server";

// Skeleton — requires `npm install web-push` and VAPID keys
// Generate keys: npx web-push generate-vapid-keys
// Set env vars:
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>
//   VAPID_PRIVATE_KEY=<private key>
export async function POST(req: NextRequest) {
  const {
    title = "MateMax",
    body = "Čas na dnešní trénink! 💪",
    url = "/trenink",
  } = (await req.json()) as { title?: string; body?: string; url?: string };

  // TODO: uncomment when web-push is installed and VAPID keys are configured
  /*
  const webpush = require("web-push");
  webpush.setVapidDetails(
    "mailto:noreply@matemax.cz",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const { supabase } = await import("@/lib/supabase");
  if (!supabase) return NextResponse.json({ error: "No DB" }, { status: 503 });

  const { data: rows } = await supabase.from("push_subscriptions").select("subscription");
  const results = await Promise.allSettled(
    (rows ?? []).map((row: { subscription: string }) =>
      webpush.sendNotification(
        JSON.parse(row.subscription),
        JSON.stringify({ title, body, url })
      )
    )
  );
  const sent = results.filter((r) => r.status === "fulfilled").length;
  return NextResponse.json({ ok: true, sent });
  */

  console.log("[send-push] skeleton called:", { title, body, url });
  return NextResponse.json({ ok: true, sent: 0, note: "Push sending not yet implemented — configure VAPID keys first" });
}
