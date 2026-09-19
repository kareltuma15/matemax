import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!rateLimit(`push-subscribe:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { subscription?: { endpoint?: unknown } } | null;
  const subscription = body?.subscription;
  const endpoint = subscription?.endpoint;
  if (!subscription || typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 2000) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  // Volajícího ověřujeme ze session (cookies), NE z userId v těle — jinak by šlo
  // přihlásit push k cizímu účtu. Dřívější kód zapisoval anonymním klientem, který
  // RLS potichu odmítala, takže se žádné odběry nikdy neuložily.
  const cookieStore = await cookies();
  const supabaseCaller = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabaseCaller.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }

  const { error } = await supabaseAdmin
    .from("push_subscriptions")
    .upsert(
      {
        endpoint,
        subscription: JSON.stringify(subscription),
        user_id: user.id,
        created_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    );
  if (error) {
    console.error("[push-subscribe] upsert selhal:", error);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
