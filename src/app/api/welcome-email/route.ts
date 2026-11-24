import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { pragueDateStr } from "@/lib/date";
import { tridaUzivatele } from "@/lib/odhad-server";
import { posliEmailZakovi } from "@/lib/emaily/odeslat";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Uvítací e-mail smí dostat jen účet založený před chvílí (registrace volá trasu hned po signUp).
const FRESH_MS = 30 * 60 * 1000;

export async function POST(req: NextRequest) {
  if (!rateLimit(`welcome-email:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = (await req.json().catch(() => null)) as { email?: string; firstName?: string; userId?: string } | null;
  const email = body?.email?.trim();
  const userId = body?.userId;

  if (!email || !userId || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Missing or invalid email/userId" }, { status: 400 });
  }
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "No DB" }, { status: 503 });
  }

  // Trasa je veřejná (registrace ji volá ještě před přihlášením), proto bez ověření nesmí
  // poslat e-mail na libovolnou adresu — jinak jde zneužít
  // k rozesílání spamu z naší domény. Ověřujeme: účet existuje, e-mail k němu sedí,
  // je čerstvý a uvítání ještě nedostal.
  const { data: found, error: userErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  const account = found?.user;
  if (userErr || !account || account.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (Date.now() - new Date(account.created_at).getTime() > FRESH_MS) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (account.app_metadata?.welcome_sent_at) {
    return NextResponse.json({ ok: true, skipped: "already_sent" });
  }
  const { error: claimErr } = await supabaseAdmin.auth.admin.updateUserById(account.id, {
    app_metadata: { ...account.app_metadata, welcome_sent_at: new Date().toISOString() },
  });
  if (claimErr) {
    console.error("[welcome-email] uložení welcome_sent_at selhalo:", claimErr);
    return NextResponse.json({ error: "DB error" }, { status: 500 });
  }
  // Když se e-mail nepodaří odeslat vůbec nikudy, značku vrátíme, ať jde zkusit znovu.
  const release = () =>
    supabaseAdmin!.auth.admin
      .updateUserById(account.id, { app_metadata: { ...account.app_metadata, welcome_sent_at: null } })
      .catch(() => {});

  // Uvítání posílá appka přes Resend ve společné šabloně (Karel 24. 11. 2026). Dřív šlo přes Loops (šablona bez
  // proměnné jména, se starou adresou); kontakt do Loops se už nezakládá (automatizace nahradil
  // denní běh src/lib/emaily, viz /api/cron/emaily-zakum).
  const r = await posliEmailZakovi(account, "uvitani", { trida: tridaUzivatele(account), dnes: pragueDateStr() });
  if (!r.ok) {
    console.error("[welcome-email] odeslání selhalo:", r.chyba);
    await release();
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, provider: "resend" });
}
