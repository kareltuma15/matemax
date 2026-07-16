import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendReminder24h, sendReminder1h } from "@/lib/online-test-emails";

// Připomínky před testem nanečisto. Běží každou hodinu (vercel.json).
//
// Okna jsou schválně široká, aby připomínka nevypadla, když cron jednou
// neproběhne nebo test nezačíná v celou. Proti opakovanému odeslání chrání
// sloupce reminder_*_sent_at, ne přesnost časování.

const H = 60 * 60 * 1000;
const LOOKAHEAD_MS = 27 * H;   // koho vůbec řešit
const W24_MAX = 26 * H;        // „vytiskni si arch" — od 26h
const W24_MIN = 3 * H;         //   … do 3h před startem
const W1_MAX = 90 * 60 * 1000; // „za hodinu začínáme" — od 90 min před startem
const ARCH_URL_TTL = 60 * 60 * 48;

type Session = {
  id: string; title: string; scheduled_at: string;
  zaznamovy_arch_pdf_url: string | null;
};

async function handler() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "No admin client — add SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 503 });
  }

  const now = Date.now();

  // Preflight: ověř schéma dřív, než se vrátíme kvůli 0 termínům. Bez toho by
  // cron hlásil ok:true až do dne, kdy je první termín — a teprve tehdy spadl.
  const { error: schemaErr } = await supabaseAdmin
    .from("online_test_enrollments")
    .select("confirm_sent_at, reminder_24h_sent_at, reminder_1h_sent_at")
    .limit(1);
  if (schemaErr) {
    console.error("[test-reminders] schéma není připravené:", schemaErr.message);
    return NextResponse.json({
      error: schemaErr.message,
      hint: "Spusť supabase/migrations/20260716_online_testy_notifikace.sql v Supabase SQL editoru.",
    }, { status: 500 });
  }

  // Publikované termíny, které startují v nejbližších 27 hodinách
  const { data: sessions, error: sErr } = await supabaseAdmin
    .from("online_test_sessions")
    .select("id, title, scheduled_at, zaznamovy_arch_pdf_url")
    .eq("is_published", true)
    .gte("scheduled_at", new Date(now).toISOString())
    .lte("scheduled_at", new Date(now + LOOKAHEAD_MS).toISOString());

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ ok: true, sessions: 0, sent24h: 0, sent1h: 0 });
  }

  const byId = new Map<string, Session>();
  for (const s of sessions as Session[]) byId.set(s.id, s);

  const { data: enrollments, error: eErr } = await supabaseAdmin
    .from("online_test_enrollments")
    .select("id, user_id, session_id, reminder_24h_sent_at, reminder_1h_sent_at")
    .eq("payment_status", "paid")
    .in("session_id", [...byId.keys()]);

  if (eErr) return NextResponse.json({ error: eErr.message }, { status: 500 });

  // Signed URL na arch generujeme jednou na termín, ne na každého žáka
  const archUrls = new Map<string, string | null>();
  async function archUrl(s: Session): Promise<string | null> {
    if (archUrls.has(s.id)) return archUrls.get(s.id)!;
    let url: string | null = null;
    if (s.zaznamovy_arch_pdf_url) {
      const { data } = await supabaseAdmin!.storage
        .from("test-sessions")
        .createSignedUrl(s.zaznamovy_arch_pdf_url, ARCH_URL_TTL);
      url = data?.signedUrl ?? null;
    }
    archUrls.set(s.id, url);
    return url;
  }

  let sent24h = 0, sent1h = 0, failed = 0;

  for (const e of enrollments ?? []) {
    const s = byId.get(e.session_id as string);
    if (!s) continue;

    const diff = new Date(s.scheduled_at).getTime() - now;
    const due24h = !e.reminder_24h_sent_at && diff <= W24_MAX && diff > W24_MIN;
    const due1h  = !e.reminder_1h_sent_at  && diff <= W1_MAX  && diff > 0;
    if (!due24h && !due1h) continue;

    try {
      const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(e.user_id as string);
      const to = userRes?.user?.email;
      if (!to) continue;

      const meta = (userRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
      const jmeno =
        (typeof meta.first_name === "string" && meta.first_name) ||
        (typeof meta.full_name === "string" && meta.full_name.split(" ")[0]) ||
        to.split("@")[0];

      if (due24h) {
        const ok = await sendReminder24h({
          to, jmeno, title: s.title, scheduledAt: s.scheduled_at,
          sessionId: s.id, archUrl: await archUrl(s),
        });
        if (ok) {
          await supabaseAdmin.from("online_test_enrollments")
            .update({ reminder_24h_sent_at: new Date().toISOString() }).eq("id", e.id);
          sent24h++;
        } else failed++;
      }

      if (due1h) {
        const ok = await sendReminder1h({
          to, jmeno, title: s.title, scheduledAt: s.scheduled_at, sessionId: s.id,
        });
        if (ok) {
          await supabaseAdmin.from("online_test_enrollments")
            .update({ reminder_1h_sent_at: new Date().toISOString() }).eq("id", e.id);
          sent1h++;
        } else failed++;
      }
    } catch (err) {
      console.error("[test-reminders] enrollment selhal", e.id, err);
      failed++;
    }
  }

  console.log(`[test-reminders] sessions=${sessions.length} sent24h=${sent24h} sent1h=${sent1h} failed=${failed}`);
  return NextResponse.json({ ok: true, sessions: sessions.length, sent24h, sent1h, failed });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || auth !== expected) {
    return NextResponse.json({ endpoint: "test-reminders cron", requiresSecret: true });
  }
  return handler();
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return handler();
}
