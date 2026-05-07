import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseParent = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabaseParent.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!supabaseAdmin) return NextResponse.json({ error: "Admin not configured" }, { status: 503 });

  const { data } = await supabaseAdmin
    .from("parent_settings")
    .select("*")
    .eq("parent_email", user.email)
    .maybeSingle();

  return NextResponse.json(data ?? {
    report_frequency: "weekly",
    send_day: "sunday",
    inactive_alert: true,
  });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    report_frequency?: string;
    send_day?: string;
    inactive_alert?: boolean;
  };

  const supabaseParent = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabaseParent.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!supabaseAdmin) return NextResponse.json({ error: "Admin not configured" }, { status: 503 });

  const { error: upsertErr } = await supabaseAdmin.from("parent_settings").upsert(
    {
      parent_email: user.email,
      report_frequency: body.report_frequency ?? "weekly",
      send_day: body.send_day ?? "sunday",
      inactive_alert: body.inactive_alert ?? true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "parent_email" }
  );

  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
