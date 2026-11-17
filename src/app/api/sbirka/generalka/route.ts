import { NextRequest, NextResponse } from "next/server";
import { overKodGeneralky } from "@/lib/generalka-server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * POST { kod } -> { ok: true, d: "YYYY-MM-DD" } (den testu nanecisto) nebo { ok: false }.
 * Kod nic neuklada a odemyka jen kosmeticke odmeny ve Sbirce (odmena se pripise v prohlizeci).
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`generalka:${ip}`, 10, 60_000)) return NextResponse.json({ ok: false, duvod: "limit" }, { status: 429 });
  const secret = process.env.MATEMAX_DOPORUCENI_SECRET;
  if (!secret) {
    console.error("[generalka] chybi MATEMAX_DOPORUCENI_SECRET");
    return NextResponse.json({ ok: false, duvod: "nedostupne" });
  }
  let kod = "";
  try { kod = String(((await req.json()) as { kod?: unknown }).kod ?? ""); } catch { /* prazdne telo */ }
  const d = overKodGeneralky(secret, kod.slice(0, 40));
  return NextResponse.json(d ? { ok: true, d } : { ok: false, duvod: "neplatny" });
}
