import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Runs every Monday 06:00 UTC (≈ 08:00 CET) via Vercel Cron.
// Sends a weekly progress email to every parent with a verified child link.

function topicLabel(tema: string): string {
  const MAP: Record<string, string> = {
    zlomky: "Zlomky & procenta", rovnice: "Rovnice", geometrie: "Geometrie",
    geometrie_rovinna: "Geometrie (2D)", geometrie_prostorova: "Geometrie (3D)",
    mocniny: "Mocniny", procenta: "Procenta", slovni_ulohy: "Slovní úlohy",
    pomer_meritko: "Poměr a měřítko", uhly: "Úhly", vyrazy: "Výrazy",
    logicke_ulohy: "Logika", mix: "Mix témat",
  };
  return MAP[tema] ?? tema;
}

function emoji(pct: number) {
  if (pct >= 80) return "🟢";
  if (pct >= 50) return "🟡";
  return "🔴";
}

function buildHtml(opts: {
  parentName: string;
  childName: string;
  weekTotal: number;
  streak: number;
  accuracy: number | null;
  weakTopics: { label: string; pct: number }[];
  weekDate: string;
}): string {
  const { parentName, childName, weekTotal, streak, accuracy, weakTopics, weekDate } = opts;

  const allTopicsSorted = [...weakTopics].sort((a, b) => a.pct - b.pct);
  const displayTopics = allTopicsSorted.slice(0, 5);

  const topicRows = displayTopics.map(({ label, pct }) => {
    const barColor = pct >= 70 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
    const barWidth = Math.max(4, pct);
    return `
    <tr>
      <td style="padding:10px 0 2px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#374151;font-weight:600;">${emoji(pct)} ${label}</td>
            <td style="font-size:13px;font-weight:800;color:${barColor};text-align:right;white-space:nowrap;">${pct}&thinsp;%</td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top:4px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;border-radius:4px;height:6px;overflow:hidden;">
                <tr>
                  <td width="${barWidth}%" style="background:${barColor};height:6px;border-radius:4px;"></td>
                  <td></td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }).join("");

  const weakest = displayTopics[0];
  const tip = weakest && weakest.pct < 60
    ? `Nejslabší oblast je <strong>${weakest.label}</strong> (${weakest.pct}&thinsp;%). Zkuste spolu 10 minut procvičit právě tohle téma — SM-2 algoritmus MateMaxu to zařídí automaticky.`
    : accuracy !== null && accuracy >= 75
    ? `Skvělá úspěšnost ${accuracy}&thinsp;%! ${childName} je dobře na cestě. Udržte denní 10minutové procvičování a výsledky na přijímačkách budou výrazně lepší.`
    : `Pravidelnost je klíč. Stačí 10 minut denně — MateMax sám vybere, co ${childName} nejvíc potřebuje procvičit.`;

  const streakBadge = streak >= 7
    ? `<div style="display:inline-block;background:#fff7ed;border:1px solid #fed7aa;border-radius:20px;padding:4px 12px;font-size:12px;font-weight:700;color:#c2410c;margin-top:8px;">🔥 ${streak}denní série!</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Týdenní zpráva MateMax</title>
</head>
<body style="margin:0;padding:0;background:#F0F4FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F4FF;padding:40px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

      <!-- Logo bar -->
      <tr><td style="padding:0 0 20px;text-align:center;">
        <table cellpadding="0" cellspacing="0" style="display:inline-table;">
          <tr>
            <td style="width:36px;height:36px;background:#0D1B3E;border-radius:8px;text-align:center;vertical-align:middle;font-weight:900;font-size:14px;color:#fff;line-height:36px;">M²</td>
            <td style="padding-left:10px;font-size:16px;font-weight:800;color:#0D1B3E;vertical-align:middle;">MateMax</td>
          </tr>
        </table>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(13,27,62,0.10);">

        <!-- Header gradient -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="background:linear-gradient(135deg,#0D1B3E 0%,#1e4d8c 60%,#2E6DA4 100%);padding:36px 40px 32px;text-align:center;">
            <p style="color:#93c5fd;margin:0 0 6px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">TÝDENNÍ PŘEHLED · ${weekDate}</p>
            <h1 style="color:#fff;margin:0 0 6px;font-size:26px;font-weight:900;letter-spacing:-0.5px;">Pokrok ${childName}</h1>
            ${streakBadge}
          </td></tr>
        </table>

        <!-- Greeting -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:28px 40px 8px;">
            <p style="color:#0D1B3E;font-size:16px;line-height:1.6;margin:0 0 6px;font-weight:600;">Ahoj ${parentName},</p>
            <p style="color:#6b7280;font-size:15px;line-height:1.7;margin:0;">
              Tady je shrnutí toho, jak ${childName} trénoval/a tento týden na matematiku. Každý příklad ho/ji posouvá blíže k přijímačkám.
            </p>
          </td></tr>
        </table>

        <!-- Stats row -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:24px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;overflow:hidden;background:#f8fafc;border:1px solid #e2e8f0;">
              <tr>
                <td width="33%" style="padding:20px 16px;text-align:center;border-right:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:34px;font-weight:900;color:#0D1B3E;line-height:1;">${weekTotal}</p>
                  <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">příkladů</p>
                </td>
                <td width="33%" style="padding:20px 16px;text-align:center;border-right:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:34px;font-weight:900;color:${streak >= 7 ? "#f97316" : "#0D1B3E"};line-height:1;">${streak}</p>
                  <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">dní v sérii</p>
                </td>
                <td width="33%" style="padding:20px 16px;text-align:center;">
                  <p style="margin:0;font-size:34px;font-weight:900;color:${accuracy !== null ? (accuracy >= 70 ? "#16a34a" : accuracy >= 50 ? "#d97706" : "#dc2626") : "#94a3b8"};line-height:1;">${accuracy !== null ? `${accuracy}&thinsp;%` : "—"}</p>
                  <p style="margin:6px 0 0;font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">úspěšnost</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>

        ${displayTopics.length > 0 ? `
        <!-- Topic breakdown -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:0 40px 24px;">
            <p style="font-size:11px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px;">Přehled témat</p>
            <table width="100%" cellpadding="0" cellspacing="0">${topicRows}</table>
          </td></tr>
        </table>` : ""}

        <!-- Tip box -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:0 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#eff6ff,#f0f9ff);border:1px solid #bfdbfe;border-radius:14px;">
              <tr><td style="padding:18px 22px;">
                <p style="margin:0 0 4px;font-size:12px;font-weight:800;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.05em;">💡 Tip pro tento týden</p>
                <p style="margin:0;font-size:14px;color:#1e3a8a;line-height:1.6;">${tip}</p>
              </td></tr>
            </table>
          </td></tr>
        </table>

        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:0 40px 36px;text-align:center;">
            <a href="https://matemax.matematika-snadno.cz/rodice/dashboard"
              style="display:inline-block;background:#0D1B3E;color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:16px 36px;border-radius:12px;letter-spacing:-0.2px;">
              Zobrazit celý přehled →
            </a>
            <p style="margin:14px 0 0;font-size:13px;color:#94a3b8;">Sledujte pokrok ${childName} kdykoliv v rodičovském portálu</p>
          </td></tr>
        </table>

        <!-- Footer -->
        <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #f1f5f9;">
          <tr><td style="padding:20px 40px;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0 0 4px;">MateMax · <a href="https://matemax.matematika-snadno.cz" style="color:#94a3b8;">matemax.matematika-snadno.cz</a></p>
            <p style="color:#cbd5e1;font-size:11px;margin:0;">Dostáváte tento email, protože jste propojeni jako rodič v MateMax. <a href="https://matemax.matematika-snadno.cz/rodice/dashboard" style="color:#94a3b8;">Odhlásit se</a></p>
          </td></tr>
        </table>

      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

async function handler() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "No admin client — add SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: "No RESEND_API_KEY" }, { status: 503 });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  // All verified parent-child links
  const { data: links, error: linksError } = await supabaseAdmin
    .from("parent_child_link")
    .select("parent_user_id, child_user_id")
    .eq("verified", true);

  if (linksError) return NextResponse.json({ error: linksError.message }, { status: 500 });
  if (!links || links.length === 0) return NextResponse.json({ ok: true, sent: 0 });

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const weekDate = new Date().toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" });

  let sent = 0;
  let failed = 0;

  for (const link of links as { parent_user_id: string; child_user_id: string }[]) {
    try {
      const [parentAuth, childAuth] = await Promise.all([
        supabaseAdmin.auth.admin.getUserById(link.parent_user_id),
        supabaseAdmin.auth.admin.getUserById(link.child_user_id),
      ]);

      const parentEmail = parentAuth.data?.user?.email;
      if (!parentEmail) continue;

      const parentMeta  = parentAuth.data?.user?.user_metadata ?? {};
      const childMeta   = childAuth.data?.user?.user_metadata ?? {};
      const childEmail  = childAuth.data?.user?.email ?? "";

      const extractFirst = (meta: Record<string, unknown>, fallbackEmail: string) => {
        const full = (meta.full_name ?? meta.name ?? "") as string;
        if (full.trim()) return full.split(" ")[0];
        return fallbackEmail.split("@")[0];
      };

      const parentName = extractFirst(parentMeta, parentEmail);
      const childName  = extractFirst(childMeta, childEmail);

      // Sessions last 7 days
      const { data: sessions } = await supabaseAdmin
        .from("sessions")
        .select("correct, total")
        .eq("user_id", link.child_user_id)
        .gte("date", weekAgo);

      const weekTotal   = (sessions ?? []).reduce((s, r) => s + (r.total as number), 0);
      const weekCorrect = (sessions ?? []).reduce((s, r) => s + (r.correct as number), 0);
      const accuracy    = weekTotal > 0 ? Math.round((weekCorrect / weekTotal) * 100) : null;

      // Streak
      const { data: allDates } = await supabaseAdmin
        .from("sessions")
        .select("date")
        .eq("user_id", link.child_user_id)
        .order("date", { ascending: false });

      let streak = 0;
      if (allDates && allDates.length > 0) {
        const dateSet = new Set((allDates as { date: string }[]).map((r) => r.date));
        const today = new Date();
        for (let i = 0; i < 365; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          if (dateSet.has(d.toISOString().slice(0, 10))) streak++;
          else if (i > 0) break;
        }
      }

      // Weak topics from diagnostic_results
      const { data: diagRows } = await supabaseAdmin
        .from("diagnostic_results")
        .select("tema, correct, total")
        .eq("user_id", link.child_user_id);

      const weakTopics = (diagRows ?? [])
        .filter((r) => (r.total as number) > 0)
        .map((r) => ({
          label: topicLabel(r.tema as string),
          pct: Math.round(((r.correct as number) / (r.total as number)) * 100),
        }))
        .sort((a, b) => a.pct - b.pct);

      const html = buildHtml({ parentName, childName, weekTotal, streak, accuracy, weakTopics, weekDate });

      await resend.emails.send({
        from: "MateMax <noreply@matematika-snadno.cz>",
        to: parentEmail,
        subject: `Týdenní zpráva: ${childName} procvičil/a ${weekTotal} příkladů 📊`,
        html,
      });

      sent++;
    } catch (err) {
      console.error("[weekly-parent-report] error for link:", link, err);
      failed++;
    }
  }

  console.log(`[weekly-parent-report] sent=${sent} failed=${failed}`);
  return NextResponse.json({ ok: true, sent, failed });
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;
  if (!expected || auth !== expected) {
    return NextResponse.json({ endpoint: "weekly-parent-report cron", requiresSecret: true });
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
