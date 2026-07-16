import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendReminder24h, sendReminder1h } from "@/lib/online-test-emails";

// Připomínky před testem nanečisto.
//
// Volá se ze dvou míst: z denního cronu daily-push (Vercel Hobby dovolí jen
// 2 crony a jen denní frekvenci) a z /api/cron/test-reminders pro ruční
// spuštění nebo častější externí trigger.
//
// Proto se logika nesmí spoléhat na to, jak často běží. Drží ji dvě věci:
//  - široká okna, aby denní běh vždy padl do okna právě jednou
//  - sloupce reminder_*_sent_at, aby častější běh neposlal mail dvakrát
// „První běh v okně vyhrává" pak funguje pro denní i hodinovou kadenci.

const H = 60 * 60 * 1000;

// Denní cron běží v 17:00 CET. Okno 30h zaručí, že test kdykoli následující
// den (realisticky 8:00–20:00) chytí právě jeden běh — večer předtím.
// Kratší okno (26h) by minulo test v pozdní odpoledne.
const W24_MAX = 30 * H;

// „Za hodinu začínáme" potřebuje běh alespoň hodinový. Na denním cronu
// prakticky nevyhoří — kód je tu připravený, kdyby přibyl častější trigger.
const W1_MAX = 90 * 60 * 1000;

const LOOKAHEAD_MS = W24_MAX + H;
const ARCH_URL_TTL = 60 * 60 * 48;

type Session = {
  id: string; title: string; scheduled_at: string;
  zaznamovy_arch_pdf_url: string | null;
};

export type ReminderResult =
  | { ok: true; sessions: number; sent24h: number; sent1h: number; failed: number }
  | { ok: false; error: string; hint?: string };

export async function runTestReminders(): Promise<ReminderResult> {
  if (!supabaseAdmin) return { ok: false, error: "No admin client — add SUPABASE_SERVICE_ROLE_KEY" };
  if (!process.env.RESEND_API_KEY) return { ok: false, error: "No RESEND_API_KEY" };

  const now = Date.now();

  // Preflight: ověř schéma dřív, než se vrátíme kvůli 0 termínům. Bez toho by
  // cron hlásil ok:true až do dne prvního termínu — a teprve tehdy spadl.
  const { error: schemaErr } = await supabaseAdmin
    .from("online_test_enrollments")
    .select("confirm_sent_at, reminder_24h_sent_at, reminder_1h_sent_at")
    .limit(1);
  if (schemaErr) {
    return {
      ok: false,
      error: schemaErr.message,
      hint: "Spusť supabase/migrations/20260716_online_testy_notifikace.sql v Supabase SQL editoru.",
    };
  }

  const { data: sessions, error: sErr } = await supabaseAdmin
    .from("online_test_sessions")
    .select("id, title, scheduled_at, zaznamovy_arch_pdf_url")
    .eq("is_published", true)
    .gte("scheduled_at", new Date(now).toISOString())
    .lte("scheduled_at", new Date(now + LOOKAHEAD_MS).toISOString());

  if (sErr) return { ok: false, error: sErr.message };
  if (!sessions || sessions.length === 0) {
    return { ok: true, sessions: 0, sent24h: 0, sent1h: 0, failed: 0 };
  }

  const byId = new Map<string, Session>();
  for (const s of sessions as Session[]) byId.set(s.id, s);

  const { data: enrollments, error: eErr } = await supabaseAdmin
    .from("online_test_enrollments")
    .select("id, user_id, session_id, reminder_24h_sent_at, reminder_1h_sent_at")
    .eq("payment_status", "paid")
    .in("session_id", [...byId.keys()]);

  if (eErr) return { ok: false, error: eErr.message };

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
    const due24h = !e.reminder_24h_sent_at && diff > 0 && diff <= W24_MAX;
    const due1h  = !e.reminder_1h_sent_at  && diff > 0 && diff <= W1_MAX;
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
  return { ok: true, sessions: sessions.length, sent24h, sent1h, failed };
}
