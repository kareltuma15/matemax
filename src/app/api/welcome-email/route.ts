import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { email } = (await req.json()) as { email?: string };

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  // ── Loops.so (preferred) ────────────────────────────────────────────────────
  // Requires both LOOPS_API_KEY and LOOPS_WELCOME_EMAIL_ID to be set.
  if (process.env.LOOPS_API_KEY && process.env.LOOPS_WELCOME_EMAIL_ID) {
    try {
      // Add contact to Loops mailing list
      await fetch("https://app.loops.so/api/v1/contacts/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          source: "MateMax registrace",
          userGroup: "students",
        }),
      });

      // Send transactional welcome email
      const res = await fetch("https://app.loops.so/api/v1/transactional", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LOOPS_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionalId: process.env.LOOPS_WELCOME_EMAIL_ID,
          email,
        }),
      });
      if (!res.ok) {
        console.error("Loops transactional email error:", await res.text());
      }

      return NextResponse.json({ ok: true, provider: "loops" });
    } catch (err) {
      console.error("Loops welcome-email error:", err);
      // Fall through to Resend on any Loops failure
    }
  }

  // ── Resend (fallback) ───────────────────────────────────────────────────────
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = `
<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Vítej v MateMax!</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,62,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#0D1B3E 0%,#2E6DA4 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-block;width:48px;height:48px;background:#fff;border-radius:12px;text-align:center;line-height:48px;font-weight:900;font-size:18px;color:#0D1B3E;">M²</div>
              <h1 style="color:#ffffff;margin:16px 0 4px;font-size:26px;font-weight:800;">Vítej v MateMax!</h1>
              <p style="color:#93c5fd;margin:0;font-size:15px;">Tvůj matematický trenér je připraven 🚀</p>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px;">
              <p style="color:#0D1B3E;font-size:16px;line-height:1.6;margin:0 0 20px;">
                Ahoj! Právě jsi udělal první krok k lepším přijímačkám. 🎉
              </p>
              <p style="color:#4b5563;font-size:15px;line-height:1.7;margin:0 0 28px;">
                MateMax se přizpůsobí přesně tvým mezerám — začni diagnostikou, která
                zabere jen 5 minut, a my sestavíme tréninkový plán přímo na míru.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:0 0 32px;">
                    <a href="https://matemax-ten.vercel.app/diagnostika"
                      style="display:inline-block;background:#00B4D8;color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 36px;border-radius:12px;">
                      Spustit diagnostiku →
                    </a>
                  </td>
                </tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;border-radius:12px;padding:24px;">
                <tr><td style="padding:0 0 12px;"><span style="font-size:18px;">📅</span><span style="color:#0D1B3E;font-size:14px;font-weight:600;margin-left:10px;">Každý den 7 příkladů stačí</span></td></tr>
                <tr><td style="padding:0 0 12px;"><span style="font-size:18px;">🧠</span><span style="color:#0D1B3E;font-size:14px;font-weight:600;margin-left:10px;">SM-2 algoritmus — inteligentní opakování</span></td></tr>
                <tr><td style="padding:0;"><span style="font-size:18px;">📊</span><span style="color:#0D1B3E;font-size:14px;font-weight:600;margin-left:10px;">700+ příkladů ve stylu CERMAT</span></td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="color:#94a3b8;font-size:13px;margin:0 0 4px;">Karel Tůma · Matematika Snadno</p>
              <p style="color:#cbd5e1;font-size:12px;margin:0;">MateMax © 2026 · Odhlaš se z emailů kdykoliv.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

  try {
    await resend.emails.send({
      from: "MateMax <onboarding@resend.dev>",
      to: email,
      subject: "Vítej v MateMax! Tvůj trénink začíná 🚀",
      html,
    });
    return NextResponse.json({ ok: true, provider: "resend" });
  } catch (err) {
    console.error("welcome-email resend error:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
