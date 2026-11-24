import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { nastavOdhlaseni } from "@/lib/emaily/odeslat";

/**
 * Zprávy o doručení e-mailů z Resendu (Admin → E-maily → Doručitelnost). Resend podepisuje přes Svix:
 * hlavičky svix-id, svix-timestamp, svix-signature a tajemství RESEND_WEBHOOK_SECRET (whsec_…) ve Vercelu.
 * Ukládá jen typ události a který e-mail (štítek „email“), žádnou adresu. Kdo e-mail označí jako spam,
 * tomu už připomínky nechodí.
 */
const TYPY: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.opened": "opened",
};

function overPodpis(telo: string, id: string, cas: string, podpisy: string, tajemstvi: string): boolean {
  if (!id || !cas || !podpisy || !tajemstvi.startsWith("whsec_")) return false;
  if (Math.abs(Date.now() / 1000 - Number(cas)) > 5 * 60) return false;
  const klic = Buffer.from(tajemstvi.slice(6), "base64");
  const ocekavany = crypto.createHmac("sha256", klic).update(`${id}.${cas}.${telo}`).digest("base64");
  return podpisy.split(" ").some((p) => {
    const [verze, sig] = p.split(",");
    if (verze !== "v1" || !sig) return false;
    const a = Buffer.from(sig), b = Buffer.from(ocekavany);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

function stitekEmailu(tags: unknown): string | undefined {
  if (Array.isArray(tags)) return (tags.find((t) => t?.name === "email") as { value?: string } | undefined)?.value;
  if (tags && typeof tags === "object") return (tags as Record<string, string>).email;
  return undefined;
}

export async function POST(req: NextRequest) {
  const tajemstvi = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const telo = await req.text();
  if (!overPodpis(telo, req.headers.get("svix-id") ?? "", req.headers.get("svix-timestamp") ?? "", req.headers.get("svix-signature") ?? "", tajemstvi)) {
    return NextResponse.json({ error: "Neplatný podpis" }, { status: 401 });
  }
  let udalost: { type?: string; data?: { to?: string[] | string; tags?: unknown } };
  try { udalost = JSON.parse(telo); } catch { return NextResponse.json({ error: "Neplatné tělo" }, { status: 400 }); }

  const typ = TYPY[udalost.type ?? ""];
  if (!typ || !supabaseAdmin) return NextResponse.json({ ok: true, ignorovano: true });
  const e = stitekEmailu(udalost.data?.tags);
  await supabaseAdmin.from("analytics_events").insert({ user_id: null, event_name: "email_dorucitelnost", properties: { typ, ...(e ? { e } : {}) } });

  // Spam nebo nedoručitelná adresa (bez potvrzení registrace např. překlep): už žádné připomínky na tuhle adresu,
  // ať opakované nedoručené e-maily nekazí pověst odesílatele
  if (typ === "complained" || typ === "bounced") {
    const adresa = (Array.isArray(udalost.data?.to) ? udalost.data?.to[0] : udalost.data?.to)?.toLowerCase();
    if (adresa) {
      for (let page = 1; page <= 50; page++) {
        const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        const u = data?.users.find((x) => x.email?.toLowerCase() === adresa);
        if (u) { await nastavOdhlaseni(u.id, true); break; }
        if (!data || data.users.length < 1000) break;
      }
    }
  }
  return NextResponse.json({ ok: true });
}
