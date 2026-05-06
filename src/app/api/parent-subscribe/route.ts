import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { parentEmail, childEmail } = (await req.json()) as {
    parentEmail?: string;
    childEmail?: string;
  };

  if (!parentEmail || !childEmail) {
    return NextResponse.json({ error: "Chybí emailové adresy" }, { status: 400 });
  }

  // Save to Supabase
  if (supabase) {
    const { error } = await supabase
      .from("parent_subscriptions")
      .insert({ parent_email: parentEmail, child_email: childEmail });
    if (error && !error.message.includes("duplicate")) {
      console.error("parent_subscriptions insert error:", error);
    }
  }

  // Send confirmation email
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const html = `
<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8" /><title>MateMax — report přihlášen</title></head>
<body style="margin:0;padding:0;background:#F8FAFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFF;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(13,27,62,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#0D1B3E,#2E6DA4);padding:28px 40px;text-align:center;">
            <div style="display:inline-block;width:44px;height:44px;background:#fff;border-radius:10px;text-align:center;line-height:44px;font-weight:900;font-size:16px;color:#0D1B3E;">M²</div>
            <h1 style="color:#fff;margin:12px 0 4px;font-size:22px;font-weight:800;">Jste přihlášeni k týdennímu reportu</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px;">
            <p style="color:#0D1B3E;font-size:15px;line-height:1.6;margin:0 0 16px;">
              Každé pondělí ráno vám přijde přehled o pokroku vašeho dítěte (${childEmail}).
            </p>
            <p style="color:#4b5563;font-size:14px;line-height:1.7;margin:0 0 24px;">
              Uvidíte: kolik příkladů vyřešilo, jaká je úspěšnost, kde má mezery a doporučení na příští týden.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7ff;border-radius:12px;padding:20px;">
              <tr><td style="padding:0 0 10px;color:#0D1B3E;font-size:14px;font-weight:600;">📅 Každé pondělí — přehled týdne</td></tr>
              <tr><td style="padding:0 0 10px;color:#0D1B3E;font-size:14px;font-weight:600;">📊 Výsledky po tématech — vím kde pomoci</td></tr>
              <tr><td style="padding:0;color:#0D1B3E;font-size:14px;font-weight:600;">🔥 Streak a motivace — víte jak to jde</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="color:#94a3b8;font-size:12px;margin:0;">Karel Tůma · Matematika Snadno · MateMax © 2026</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

    try {
      await resend.emails.send({
        from: "MateMax <onboarding@resend.dev>",
        to: parentEmail,
        subject: "✅ Přihlášení k týdennímu reportu MateMax",
        html,
      });
    } catch (err) {
      console.error("parent-subscribe email error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
