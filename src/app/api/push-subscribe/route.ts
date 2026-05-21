import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!rateLimit(`push-subscribe:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json()) as { subscription?: unknown; userId?: string };
  if (!body.subscription) {
    return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
  }

  if (supabase) {
    const sub = body.subscription as { endpoint: string };
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          endpoint: sub.endpoint,
          subscription: JSON.stringify(body.subscription),
          user_id: body.userId ?? null,
          created_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" }
      );
    if (error) console.error("push_subscriptions upsert error:", error);
  }

  return NextResponse.json({ ok: true });
}
