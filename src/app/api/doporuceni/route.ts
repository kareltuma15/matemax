import { NextRequest, NextResponse } from "next/server";
import { overDoporuceni } from "@/lib/doporuceni-server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * POST { token } → ověřené doporučení po testu nanečisto, nebo { ok: false }.
 * Klíč je jen tady na serveru (MATEMAX_DOPORUCENI_SECRET). Nic se neukládá: odkaz nese jen témata a čísla.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`doporuceni:${ip}`, 30, 60_000)) return NextResponse.json({ ok: false, duvod: "limit" }, { status: 429 });
  let token = "";
  try { token = String(((await req.json()) as { token?: unknown }).token ?? ""); } catch { /* prázdné tělo */ }
  const v = overDoporuceni(token, process.env.MATEMAX_DOPORUCENI_SECRET);
  if (!v.ok) {
    if (v.duvod === "klic") console.error("[doporuceni] chybí MATEMAX_DOPORUCENI_SECRET");
    return NextResponse.json({ ok: false, duvod: v.duvod === "klic" ? "nedostupne" : "neplatne" });
  }
  return NextResponse.json(v);
}
