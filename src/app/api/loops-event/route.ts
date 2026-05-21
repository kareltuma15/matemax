import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { upsertLoopsContact, sendLoopsEvent } from "@/lib/loops";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Valid events that can be sent to Loops from the client
const ALLOWED_EVENTS = new Set([
  "diag_completed",
  "first_session_completed",
  "session_completed",
  "cermat_completed",
]);

export async function POST(req: NextRequest) {
  if (!rateLimit(`loops-event:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const caller = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await caller.auth.getUser();
  if (error || !user || !user.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { event?: string; props?: Record<string, string | number | boolean> };
  const { event, props } = body;

  if (!event || !ALLOWED_EVENTS.has(event)) {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }

  const email = user.email;

  // Update contact properties based on event type
  if (event === "diag_completed") {
    await upsertLoopsContact(email, {
      diagDone: true,
      diagCompletedAt: new Date().toISOString().slice(0, 10),
    });
  } else if (event === "first_session_completed") {
    await upsertLoopsContact(email, {
      firstSessionDone: true,
      firstSessionAt: new Date().toISOString().slice(0, 10),
    });
  } else if (event === "session_completed") {
    const count = (props?.sessionCount as number | undefined) ?? 1;
    await upsertLoopsContact(email, {
      sessionCount: count,
      lastSessionAt: new Date().toISOString().slice(0, 10),
    });
  } else if (event === "cermat_completed") {
    await upsertLoopsContact(email, {
      cermatDone: true,
      lastCermatAt: new Date().toISOString().slice(0, 10),
    });
  }

  // Also send the named event for automation triggers
  await sendLoopsEvent(email, event, props);

  return NextResponse.json({ ok: true });
}
