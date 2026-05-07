import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { childEmail } = (await req.json()) as { childEmail?: string };
  if (!childEmail) return NextResponse.json({ error: "Chybí email dítěte" }, { status: 400 });

  const supabaseParent = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabaseParent.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!supabaseAdmin) return NextResponse.json({ error: "Admin not configured" }, { status: 503 });

  // Find child user by email
  const { data: childUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });

  const child = childUsers.users.find((u) => u.email?.toLowerCase() === childEmail.toLowerCase());
  if (!child) {
    return NextResponse.json({ error: "Uživatel s tímto emailem neexistuje v MateMax." }, { status: 404 });
  }

  const token = crypto.randomBytes(16).toString("hex");

  const { error: insertErr } = await supabaseAdmin.from("parent_child_link").upsert(
    {
      parent_email: user.email,
      child_user_id: child.id,
      verified: true,
      token,
      verified_at: new Date().toISOString(),
    },
    { onConflict: "parent_email,child_user_id" }
  );

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });
  return NextResponse.json({ ok: true, childName: childEmail.split("@")[0] });
}
