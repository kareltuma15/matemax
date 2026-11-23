import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { zalozZadost } from "@/lib/propojeni-rodice";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const CHYBY = {
  neplatny_email: { status: 400, text: "Zadejte platný e-mail dítěte." },
  neexistuje: { status: 404, text: "Uživatel s tímto e-mailem v MateMaxu není. Zkontrolujte, pod jakým e-mailem se dítě registrovalo." },
  vlastni_ucet: { status: 400, text: "To je e-mail vašeho vlastního účtu. Zadejte e-mail, pod kterým je registrované dítě." },
} as const;

// Rodič požádá o propojení. Vznikne jen neověřená žádost (verified = false); data dítěte rodič uvidí,
// až ji dítě v MateMaxu potvrdí (/api/parent-link/zadosti).
export async function POST(req: NextRequest) {
  if (!rateLimit(`parent-link:${clientIp(req)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { childEmail } = (await req.json().catch(() => ({}))) as { childEmail?: unknown };

  const supabaseParent = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supabaseParent.auth.getUser();
  if (error || !user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!supabaseAdmin) return NextResponse.json({ error: "Admin not configured" }, { status: 503 });

  try {
    const v = await zalozZadost(supabaseAdmin, { id: user.id, email: user.email }, childEmail);
    if (!v.ok) return NextResponse.json({ error: CHYBY[v.chyba].text }, { status: CHYBY[v.chyba].status });
    return NextResponse.json({ ok: true, stav: v.stav });
  } catch (e) {
    console.error("[parent-link]", e);
    return NextResponse.json({ error: "Žádost se nepodařilo uložit. Zkuste to prosím znovu." }, { status: 500 });
  }
}
