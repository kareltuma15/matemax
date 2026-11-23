import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { odpovedDitete, zadostiDitete } from "@/lib/propojeni-rodice";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Strana dítěte: GET = kdo žádá o propojení a kdo už přehled vidí, POST = povolit / odmítnout / zrušit.
// Vždy jen řádky přihlášeného dítěte (child_user_id = jeho účet).

async function prihlaseny(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error } = await sb.auth.getUser();
  return error ? null : user;
}

export async function GET(req: NextRequest) {
  const user = await prihlaseny(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin not configured" }, { status: 503 });
  try {
    return NextResponse.json(await zadostiDitete(supabaseAdmin, user.id));
  } catch (e) {
    console.error("[parent-link/zadosti GET]", e);
    return NextResponse.json({ error: "Nepodařilo se načíst žádosti." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!rateLimit(`parent-link-odpoved:${clientIp(req)}`, 20, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = await prihlaseny(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin not configured" }, { status: 503 });

  const { token, akce } = (await req.json().catch(() => ({}))) as { token?: unknown; akce?: unknown };
  try {
    const v = await odpovedDitete(supabaseAdmin, user.id, token, akce);
    if (!v.ok) return NextResponse.json({ error: "Žádost už neplatí." }, { status: v.chyba === "neplatne" ? 400 : 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[parent-link/zadosti POST]", e);
    return NextResponse.json({ error: "Nepodařilo se uložit odpověď." }, { status: 500 });
  }
}
