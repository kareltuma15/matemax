import { NextRequest, NextResponse } from "next/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALERT_COOLDOWN_MS = 5 * 60 * 1000;
const lastAlerted = new Map<string, number>();

function shouldAlert(fingerprint: string): boolean {
  const now = Date.now();
  const last = lastAlerted.get(fingerprint);
  if (last && now - last < ALERT_COOLDOWN_MS) return false;
  lastAlerted.set(fingerprint, now);
  return true;
}

type ErrorPayload = {
  type: "unhandled_error" | "unhandled_rejection" | "react_error_boundary";
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  url?: string;
  digest?: string;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!rateLimit(`err-report:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ ok: true }); // Silently accept to not alert attacker
  }

  const body = await req.json().catch(() => null) as ErrorPayload | null;
  if (!body || typeof body.message !== "string") {
    return NextResponse.json({ ok: true });
  }

  const { type, message, stack, source, lineno, colno, url, digest } = body;
  const cleanMessage = message.slice(0, 500);
  const cleanStack = stack ? stack.slice(0, 1000) : undefined;

  // Skip non-actionable browser noise
  if (
    cleanMessage.includes("ResizeObserver loop") ||
    cleanMessage.includes("Script error") ||
    cleanMessage.includes("ChunkLoadError") ||
    cleanMessage.includes("Loading chunk")
  ) {
    return NextResponse.json({ ok: true });
  }

  // Store in analytics_events for dashboarding
  if (supabaseAdmin) {
    void supabaseAdmin
      .from("analytics_events")
      .insert({
        user_id: null,
        event_name: "error_client",
        properties: { type, message: cleanMessage, stack: cleanStack, source, lineno, colno, url, digest },
      });
  }

  // Send Resend alert (rate limited per error fingerprint)
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.json({ ok: true });
  }

  const fingerprint = `client:${cleanMessage.slice(0, 80)}`;
  if (!shouldAlert(fingerprint)) {
    return NextResponse.json({ ok: true });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ ok: true });

  const alertEmail = process.env.ADMIN_ALERT_EMAIL ?? "karel.tuma15@gmail.com";
  const timestamp = new Date().toISOString();

  const html = `
<!DOCTYPE html><html lang="cs"><body style="font-family:monospace;background:#0f0f0f;color:#e5e5e5;padding:24px;margin:0;">
<h2 style="color:#f59e0b;margin:0 0 16px;">⚠️ Client Error — MateMax</h2>
<table style="width:100%;border-collapse:collapse;">
  <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;width:100px;">Čas</td><td style="padding:4px 0;">${timestamp}</td></tr>
  <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Typ</td><td style="padding:4px 0;">${type}</td></tr>
  <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">URL</td><td style="padding:4px 0;">${url ?? "—"}</td></tr>
  <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Source</td><td style="padding:4px 0;">${source ?? "—"}${lineno != null ? `:${lineno}:${colno ?? 0}` : ""}</td></tr>
  ${digest ? `<tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Digest</td><td style="padding:4px 0;">${digest}</td></tr>` : ""}
</table>
<h3 style="color:#f97316;margin:20px 0 8px;">Chyba</h3>
<pre style="background:#1f1f1f;padding:12px;border-radius:8px;overflow:auto;white-space:pre-wrap;color:#fca5a5;">${cleanMessage}</pre>
${cleanStack ? `<h3 style="color:#f97316;margin:20px 0 8px;">Stack trace</h3><pre style="background:#1f1f1f;padding:12px;border-radius:8px;overflow:auto;white-space:pre-wrap;font-size:12px;color:#d1d5db;">${cleanStack}</pre>` : ""}
</body></html>`.trim();

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "MateMax Errors <onboarding@resend.dev>",
      to: alertEmail,
      subject: `⚠️ Client error [${type}]: ${cleanMessage.slice(0, 55)}`,
      html,
    });
  } catch {
    // Never crash the app because of error reporting
  }

  return NextResponse.json({ ok: true });
}
