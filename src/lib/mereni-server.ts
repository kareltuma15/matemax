import type { NextRequest } from "next/server";
import { createHash } from "node:crypto";
import { clientIp } from "./rate-limit";
import { pragueDateStr } from "./date";

/** Roboti a náhledy odkazů (Facebook, WhatsApp, Slack…): neměří se. */
export const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|vercel|facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp|telegram|slack|discord|linkedin|embedly|pinterest|python|curl|wget|node-fetch|axios/i;

/**
 * Denní anonymní otisk zařízení: hash IP + prohlížeče + denní sůl (sůl se nikam neukládá).
 * Stejný výpočet v /api/t, /api/zive a při spárování návštěv s novým účtem.
 */
export function denniOtisk(req: NextRequest): string {
  const ua = req.headers.get("user-agent") ?? "";
  const sul = createHash("sha256").update(`${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}:${pragueDateStr()}`).digest("hex");
  return createHash("sha256").update(`${sul}:${clientIp(req)}:${ua}`).digest("hex").slice(0, 16);
}
