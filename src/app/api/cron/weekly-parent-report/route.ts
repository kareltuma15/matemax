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

  const topicRows = weakTopics.slice(0, 3).map(({ label, pct }) => `
    <tr>
      <td style="padding:8px 0;font-size:14px;color:#374151;">${emoji(pct)} ${label}</td>
      <td style="padding:8px 0;font-size:14px;font-weight:700;text-align:right;color:${pct >= 70 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626"};">${pct} %</td>
    </tr>`).join("");

  const encouragement = weekTotal >= 50
    ? "Skvělý týden! Pokračujte v tomto tempu."
    : weekTotal >= 20
    ? "Dobrá práce! Pár minut denně navíc a výsledky přijdou."
    : "Zkuste příští týden alespoň 10 minut denně — stačí to!";

  return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F8FAFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,62,0.08);">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%);padding:32px 40px;text-align:center;">
        <div style="display:inline-block;width:48px;height:48px;background:#fff;border-radius:12px;line-height:48px;font-weight:900;font-size:18px;color:#0D1B3E;text-align:center;">M²</div>
        <h1 style="color:#fff;margin:16px 0 4px;font-size:22px;font-weight:800;">Týdenní zpráva MateMax</h1>
        <p style="color:#93c5fd;margin:0;font-size:14px;">${weekDate} · pokrok ${childName}</p>
      </td></tr>

      <!-- Greeting -->
      <tr><td style="padding:32px 40px 0;">
        <p style="color:#0D1B3E;font-size:16px;line-height:1.6;margin:0 0 8px;">Ahoj ${parentName},</p>
        <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 24px;">
          Tady je přehled toho, jak ${childName} trénoval/a minulý týden na přijímačky.
        </p>
      </td></tr>

      <!-- Stats -->
      <tr><td style="padding:0 40px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:20px;text-align:center;border-right:1px solid #e5e7eb;">
              <p style="margin:0;font-size:32px;font-weight:900;color:#0D1B3E;">${weekTotal}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;font-weight:600;">příkladů za týden</p>
            </td>
            <td style="padding:20px;text-align:center;border-right:1px solid #e5e7eb;">
              <p style="margin:0;font-size:32px;font-weight:900;color:#f97316;">${streak}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;font-weight:600;">🔥 streak (dní)</p>
            </td>
            <td style="padding:20px;text-align:center;">
              <p style="margin:0;font-size:32px;font-weight:900;color:${accuracy !== null && accuracy >= 70 ? "#16a34a" : "#d97706"};">${accuracy !== null ? `${accuracy} %` : "—"}</p>
              <p style="margin:4px 0 0;font-size:12px;color:#6b7280;font-weight:600;">úspěšnost</p>
            </td>
          </tr>
        </table>
      </td></tr>

      ${weakTopics.length > 0 ? `
      <!-- Topic breakdown -->
      <tr><td style="padding:0 40px 24px;">
        <p style="font-size:13px;font-weight:800;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 12px;">Silná a slabá témata</p>
        <table width="100%" cellpadding="0" cellspacing="0">${topicRows}</table>
      </td></tr>` : ""}

      <!-- Encouragement -->
      <tr><td style="padding:0 40px 24px;">
        <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;padding:16px 20px;">
          <p style="margin:0;font-size:14px;color:#0369a1;font-weight:600;">💡 ${encouragement}</p>
        </div>
      </td></tr>

      <!-- CTA -->
      <tr><td style="padding:0 40px 32px;text-align:center;">
        <a href="https://matemax.matematika-snadno.cz/rodice/dashboard"
          style="display:inline-block;background:#0D1B3E;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:12px;">
          Zobrazit celý přehled →
        </a>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
        <p style="color:#94a3b8;font-size:13px;margin:0 0 4px;">Karel Tůma · Matematika Snadno</p>
        <p style="color:#cbd5e1;font-size:12px;margin:0;">MateMax © 2026 · Odhlaš se z emailů kdykoliv.</p>
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
      const childEmail  = childAuth.data?.user?.email ?? "";
      if (!parentEmail) continue;

      const parentName = parentEmail.split("@")[0];
      const childName  = childEmail.split("@")[0];

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
