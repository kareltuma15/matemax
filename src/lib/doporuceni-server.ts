/**
 * Ověření podpisu doporučení po testu nanečisto. Jen na serveru: klíč MATEMAX_DOPORUCENI_SECRET
 * se nesmí dostat do prohlížeče.
 * Formát: `<data>.<podpis>`, data = base64url(JSON v UTF-8), podpis = base64url(HMAC-SHA256(data jako text)).
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { normalizujDoporuceni, type Doporuceni } from "./doporuceni";

export type VysledekOvereni =
  | { ok: true; doporuceni: Doporuceni }
  | { ok: false; duvod: "format" | "podpis" | "proslo" | "data" | "klic" };

export function overDoporuceni(token: string, secret: string | undefined, nyniSekundy = Math.floor(Date.now() / 1000)): VysledekOvereni {
  if (!secret) return { ok: false, duvod: "klic" };
  if (typeof token !== "string" || token.length > 4000) return { ok: false, duvod: "format" };
  const casti = token.split(".");
  if (casti.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(casti[0]) || !/^[A-Za-z0-9_-]+$/.test(casti[1])) return { ok: false, duvod: "format" };
  const [data, podpis] = casti;

  const ocekavany = createHmac("sha256", secret).update(data, "utf8").digest();
  const prijaty = Buffer.from(podpis, "base64url");
  if (prijaty.length !== ocekavany.length || !timingSafeEqual(prijaty, ocekavany)) return { ok: false, duvod: "podpis" };

  let json: unknown;
  try { json = JSON.parse(Buffer.from(data, "base64url").toString("utf8")); } catch { return { ok: false, duvod: "data" }; }
  const d = normalizujDoporuceni(json);
  if (!d) return { ok: false, duvod: "data" };
  if (d.exp <= nyniSekundy) return { ok: false, duvod: "proslo" };
  return { ok: true, doporuceni: d };
}
