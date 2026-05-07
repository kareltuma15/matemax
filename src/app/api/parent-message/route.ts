import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, childUserId } = (await req.json()) as {
    message?: string;
    childUserId?: string;
  };

  if (!message || !childUserId) {
    return NextResponse.json({ error: "Chybí zpráva nebo ID dítěte" }, { status: 400 });
  }
  if (message.length > 200) {
    return NextResponse.json({ error: "Zpráva je příliš dlouhá (max 200 znaků)" }, { status: 400 });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const supabaseParent = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await supabaseParent.auth.getUser();
  if (userErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });
  }

  const { error } = await supabaseAdmin.from("parent_messages").insert({
    parent_email: user.email,
    child_user_id: childUserId,
    message,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
