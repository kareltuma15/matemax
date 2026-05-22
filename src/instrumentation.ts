import { type Instrumentation } from "next";

// Dedup: fingerprint → timestamp of last alert (in-memory, resets on cold start)
const lastAlerted = new Map<string, number>();
const ALERT_COOLDOWN_MS = 5 * 60 * 1000;

function shouldAlert(fingerprint: string): boolean {
  const now = Date.now();
  const last = lastAlerted.get(fingerprint);
  if (last && now - last < ALERT_COOLDOWN_MS) return false;
  lastAlerted.set(fingerprint, now);
  return true;
}

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context
) => {
  if (process.env.NODE_ENV !== "production") return;

  const error = err as Error & { digest?: string };

  // Skip expected Next.js control-flow errors
  if (
    error.digest?.startsWith("NEXT_NOT_FOUND") ||
    error.digest?.startsWith("NEXT_REDIRECT") ||
    error.message?.includes("NEXT_NOT_FOUND") ||
    error.message?.includes("NEXT_REDIRECT")
  ) {
    return;
  }

  const fingerprint = `server:${context.routePath}:${error.message?.slice(0, 60) ?? "unknown"}`;
  if (!shouldAlert(fingerprint)) return;

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  const alertEmail = process.env.ADMIN_ALERT_EMAIL ?? "karel.tuma15@gmail.com";
  const timestamp = new Date().toISOString();
  const stack = (error.stack ?? "").slice(0, 800);

  const html = `
<!DOCTYPE html><html lang="cs"><body style="font-family:monospace;background:#0f0f0f;color:#e5e5e5;padding:24px;margin:0;">
<h2 style="color:#ef4444;margin:0 0 16px;">🚨 Server Error — MateMax</h2>
<table style="width:100%;border-collapse:collapse;">
  <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;width:120px;">Čas</td><td style="padding:4px 0;">${timestamp}</td></tr>
  <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Route</td><td style="padding:4px 0;">${context.routePath}</td></tr>
  <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Typ</td><td style="padding:4px 0;">${context.routeType} / ${context.routerKind}</td></tr>
  <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Method</td><td style="padding:4px 0;">${request.method} ${request.path}</td></tr>
  <tr><td style="color:#94a3b8;padding:4px 8px 4px 0;">Digest</td><td style="padding:4px 0;">${error.digest ?? "—"}</td></tr>
</table>
<h3 style="color:#f97316;margin:20px 0 8px;">Chyba</h3>
<pre style="background:#1f1f1f;padding:12px;border-radius:8px;overflow:auto;white-space:pre-wrap;color:#fca5a5;">${error.message ?? "Unknown error"}</pre>
<h3 style="color:#f97316;margin:20px 0 8px;">Stack trace</h3>
<pre style="background:#1f1f1f;padding:12px;border-radius:8px;overflow:auto;white-space:pre-wrap;font-size:12px;color:#d1d5db;">${stack}</pre>
</body></html>`.trim();

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "MateMax Errors <onboarding@resend.dev>",
      to: alertEmail,
      subject: `🚨 Server error [${context.routeType}]: ${error.message?.slice(0, 60) ?? "Unknown"}`,
      html,
    });
  } catch {
    // Never crash because of error reporting
  }
};
