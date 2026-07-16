import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { TEST_TOPICS, TEST_TOPIC_LABELS, TEST_MAX_POINTS } from "@/lib/online-test-topics";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://matemax.matematika-snadno.cz";
// Ověřená doména — stejná, ze které chodí ostatní maily z aplikace
const FROM = process.env.FEEDBACK_EMAIL_FROM ?? "Karel Tůma <noreply@matematika-snadno.cz>";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Motivační věta podle výsledku — Karlův tón: nikdy nekritizovat, vždy povzbudit.
function motivace(pct: number): string {
  if (pct >= 85) return "To je vynikající výsledek — takhle připravený/á můžeš k přijímačkám klidně zítra. 🏆";
  if (pct >= 70) return "Pěkný výsledek! Základ máš solidní, teď už jde jen o doladění detailů. 💪";
  if (pct >= 50) return "Dobrý základ — vidím, že tomu rozumíš. Pár témat doladíme a půjde to nahoru rychle.";
  if (pct >= 30) return "Máš na čem stavět. Teď víme přesně, kam zaměřit trénink — a to je půlka úspěchu.";
  return "Nevěš hlavu — tenhle test nám hlavně ukázal, kde začít. Každý začínal někde. 🙂";
}

function zaver(pct: number): string {
  if (pct >= 70) return "Jen tak dál — držím ti palce!";
  if (pct >= 40) return "Dej tomu ještě kousek práce a uvidíš ten posun. Věřím ti!";
  return "Hlavu vzhůru, jdeme na to krok za krokem. Zvládneš to!";
}

// POST — odešle žákovi email se zpětnou vazbou a označí submission jako `sent`.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ sid: string }> }
) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!supabaseAdmin) return NextResponse.json({ error: "Admin client not configured" }, { status: 503 });
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "RESEND_API_KEY není nastavený" }, { status: 503 });
  }

  const { sid } = await params;

  const { data: sub } = await supabaseAdmin
    .from("online_test_submissions")
    .select("*")
    .eq("id", sid)
    .maybeSingle();
  if (!sub) return NextResponse.json({ error: "Odevzdání nenalezeno" }, { status: 404 });
  if (!sub.submitted_at) {
    return NextResponse.json({ error: "Test ještě nebyl odevzdán" }, { status: 400 });
  }

  const { data: enrollment } = await supabaseAdmin
    .from("online_test_enrollments")
    .select("user_id, session_id")
    .eq("id", sub.enrollment_id)
    .maybeSingle();
  if (!enrollment) return NextResponse.json({ error: "Přihláška nenalezena" }, { status: 404 });

  const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(enrollment.user_id);
  const email = userRes?.user?.email;
  if (!email) return NextResponse.json({ error: "Žák nemá email" }, { status: 400 });

  const meta = (userRes?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const jmeno =
    (typeof meta.first_name === "string" && meta.first_name) ||
    (typeof meta.full_name === "string" && meta.full_name.split(" ")[0]) ||
    email.split("@")[0];

  // Další vypsaný termín — pro závěrečnou pozvánku
  const { data: nextSession } = await supabaseAdmin
    .from("online_test_sessions")
    .select("scheduled_at")
    .eq("is_published", true)
    .gt("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const nextDate = nextSession
    ? new Date(nextSession.scheduled_at).toLocaleDateString("cs-CZ", {
        day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Prague",
      })
    : null;

  const total = (sub.body_celkem as number | null) ?? 0;
  const pct = Math.round((total / TEST_MAX_POINTS) * 100);
  const komentarTemy = (sub.komentar_temy as Record<string, string> | null) ?? {};

  const topicRows = TEST_TOPICS
    .map((t) => ({
      label: TEST_TOPIC_LABELS[t],
      points: sub[`body_${t}`] as number | null,
      comment: komentarTemy[t],
    }))
    .filter((r) => r.points !== null || r.comment);

  const topicHtml = topicRows
    .map((r) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eef2f7;">
          <div style="font-size:14px;font-weight:700;color:#0D1B3E;">
            ${esc(r.label)}${r.points !== null ? ` <span style="color:#2E6DA4;font-weight:800;">— ${r.points} b</span>` : ""}
          </div>
          ${r.comment ? `<div style="font-size:13px;color:#64748b;margin-top:3px;">${esc(r.comment)}</div>` : ""}
        </td>
      </tr>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Výsledek testu nanečisto</title></head>
<body style="margin:0;padding:0;background:#F8FAFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,62,0.08);">

  <tr><td style="background:linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%);padding:32px 40px;">
    <div style="font-size:12px;color:#93c5fd;text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">Test nanečisto</div>
    <div style="font-size:24px;font-weight:800;color:#fff;margin-top:6px;">Výsledek tvého testu</div>
  </td></tr>

  <tr><td style="padding:32px 40px 0;">
    <p style="font-size:16px;color:#0D1B3E;margin:0 0 16px;">Dobrý den a ahoj ${esc(jmeno)},</p>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0 0 24px;">níže zasílám výsledek tvého testu nanečisto.</p>

    <div style="background:#F8FAFF;border-radius:12px;padding:24px;text-align:center;">
      <div style="font-size:13px;color:#64748b;font-weight:600;">Počet získaných bodů</div>
      <div style="font-size:40px;font-weight:800;color:#0D1B3E;line-height:1.2;margin-top:4px;">${total} <span style="font-size:20px;color:#94a3b8;">z ${TEST_MAX_POINTS}</span></div>
      <div style="font-size:14px;color:#2E6DA4;font-weight:700;">${pct} %</div>
    </div>
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:16px 0 0;">${esc(motivace(pct))}</p>
  </td></tr>

  ${topicRows.length > 0 ? `
  <tr><td style="padding:28px 40px 0;">
    <div style="font-size:15px;font-weight:700;color:#0D1B3E;margin-bottom:12px;">Komentář + doporučení</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eef2f7;border-radius:12px;overflow:hidden;">${topicHtml}</table>
  </td></tr>` : ""}

  ${sub.silne_stranky ? `
  <tr><td style="padding:24px 40px 0;">
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:18px;">
      <div style="font-size:14px;font-weight:700;color:#15803d;margin-bottom:4px;">💪 Silné stránky</div>
      <div style="font-size:14px;color:#166534;line-height:1.6;">${esc(String(sub.silne_stranky))}</div>
    </div>
  </td></tr>` : ""}

  ${sub.doporuceni ? `
  <tr><td style="padding:12px 40px 0;">
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:18px;">
      <div style="font-size:14px;font-weight:700;color:#1d4ed8;margin-bottom:4px;">🎯 Do příště dotrénovat</div>
      <div style="font-size:14px;color:#1e40af;line-height:1.6;">${esc(String(sub.doporuceni))}</div>
    </div>
  </td></tr>` : ""}

  ${sub.komentar_celkovy ? `
  <tr><td style="padding:24px 40px 0;">
    <div style="font-size:15px;color:#4b5563;line-height:1.7;white-space:pre-line;">${esc(String(sub.komentar_celkovy))}</div>
  </td></tr>` : ""}

  <tr><td style="padding:24px 40px 0;">
    <p style="font-size:15px;color:#4b5563;line-height:1.6;margin:0;">${esc(zaver(pct))}</p>
  </td></tr>

  <tr><td style="padding:24px 40px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
      <a href="${APP_URL}/testy-nanecisto" style="display:inline-block;background:#2E6DA4;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:10px;">
        Zobrazit výsledky v MateMaxu →
      </a>
    </td></tr></table>
  </td></tr>

  ${nextDate ? `
  <tr><td style="padding:0 40px 24px;">
    <p style="font-size:14px;color:#64748b;text-align:center;margin:0;">Příští test nás čeká ${esc(nextDate)}, budu se těšit 🙂</p>
  </td></tr>` : ""}

  <tr><td style="padding:20px 40px;border-top:1px solid #e5e7eb;">
    <div style="font-size:14px;color:#0D1B3E;font-weight:700;">Karel Tůma</div>
    <div style="font-size:13px;color:#64748b;margin-top:2px;">720 477 336</div>
    <div style="font-size:13px;color:#64748b;">karel@matematika-snadno.cz</div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Výsledek testu nanečisto — ${total} z ${TEST_MAX_POINTS} bodů`,
      html,
    });
  } catch (err) {
    console.error("send-email: Resend error", err);
    return NextResponse.json({ error: "Odeslání emailu selhalo" }, { status: 500 });
  }

  const { error: updErr } = await supabaseAdmin
    .from("online_test_submissions")
    .update({ status: "sent", email_sent_at: new Date().toISOString() })
    .eq("id", sid);
  if (updErr) {
    // Email odešel — nehlásíme chybu, jen zalogujeme
    console.error("send-email: status update failed", updErr);
  }

  return NextResponse.json({ ok: true, to: email });
}
