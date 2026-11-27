import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { nastavOdhlaseni } from "@/lib/emaily/odeslat";
import { dokonciWebhook, prijmiWebhook, zapisStav } from "@/lib/zpravy-log";
import { zapisChybu } from "@/lib/system-log";
import { vlozDoSchranky } from "@/lib/schranka";

/**
 * Webhook Resendu (admin 2.1, ZP-02, ZP-06). Resend podepisuje přes Svix: hlavičky svix-id, svix-timestamp,
 * svix-signature a tajemství RESEND_WEBHOOK_SECRET (whsec_…) ve Vercelu.
 * - Stavy zpráv (odesláno, doručeno, zpožděno, vráceno, neodešlo, spam, otevřeno, kliknuto, potlačeno) → log zpráv.
 * - Duplicitní doručení stejné události (svix-id) se zahodí (tabulka webhooky).
 * - email.received (odpověď na e-mail z appky) → Schránka v adminu, kopie Karlovi.
 * - Kdo e-mail označí jako spam nebo má nedoručitelnou adresu, tomu už připomínky nechodí.
 * Do starého adminu (E-maily → Doručitelnost) dál jde jen typ a šablona, bez adresy.
 */
const STAV: Record<string, string> = {
  "email.sent": "odeslano",
  "email.delivered": "doruceno",
  "email.delivery_delayed": "zpozdeno",
  "email.bounced": "vraceno",
  "email.failed": "selhalo",
  "email.complained": "spam",
  "email.opened": "otevreno",
  "email.clicked": "kliknuto",
  "email.suppressed": "potlaceno",
};
// Starý admin (analytics_events) zná jen tyhle
const STARE: Record<string, string> = { "email.delivered": "delivered", "email.bounced": "bounced", "email.complained": "complained", "email.opened": "opened" };

const KOPIE_ODPOVEDI = "karel.tuma@matematika-snadno.cz";

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

function stitek(tags: unknown, jmeno: string): string | undefined {
  if (Array.isArray(tags)) return (tags.find((t) => t?.name === jmeno) as { value?: string } | undefined)?.value;
  if (tags && typeof tags === "object") return (tags as Record<string, string>)[jmeno];
  return undefined;
}

const adresa = (s: string | undefined | null) => (s?.match(/<([^>]+)>/)?.[1] ?? s ?? "").trim().toLowerCase();

interface Data { email_id?: string; to?: string[] | string; from?: string; subject?: string; tags?: unknown; created_at?: string; message_id?: string; bounce?: { message?: string; type?: string }; failed?: { reason?: string }; suppressed?: { message?: string }; click?: { link?: string } }

/** Odpověď na e-mail z appky: stáhne tělo přes API, spáruje se žákem podle odesílatele, uloží do Schránky, přepošle kopii. */
async function prijataOdpoved(d: Data): Promise<void> {
  if (!supabaseAdmin || !d.email_id || !process.env.RESEND_API_KEY) return;
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data: e } = await resend.emails.receiving.get(d.email_id);
  const od = adresa(e?.from ?? d.from);
  // Párování: In-Reply-To / References s ID zprávy u Resendu, jinak poslední zpráva na stejnou adresu
  const hlavicky = (e?.headers ?? {}) as Record<string, string>;
  const odkaz = `${hlavicky["in-reply-to"] ?? hlavicky["In-Reply-To"] ?? ""} ${hlavicky["references"] ?? hlavicky["References"] ?? ""}`;
  type Z = { id: string; user_id: string | null };
  let zprava: Z | null = null;
  const idVOdkazu = odkaz.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [];
  if (idVOdkazu.length) {
    const { data } = await supabaseAdmin.from("zpravy").select("id, user_id").in("sluzba_id", idVOdkazu).order("odeslano_at", { ascending: false }).limit(1);
    zprava = (data?.[0] as Z | undefined) ?? null;
  }
  if (!zprava && od) {
    const { data } = await supabaseAdmin.from("zpravy").select("id, user_id").ilike("prijemce", od).order("odeslano_at", { ascending: false }).limit(1);
    zprava = (data?.[0] as Z | undefined) ?? null;
  }
  const text = (e?.text ?? (e?.html ?? "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).slice(0, 20000);
  const vl = await vlozDoSchranky([{
    druh: "odpoved", user_id: zprava?.user_id ?? null, od: od.slice(0, 320), predmet: (e?.subject ?? d.subject ?? "").slice(0, 300), text,
    zprava_id: zprava?.id ?? null, zdroj_id: d.email_id, detail: { prilohy: (e?.attachments ?? []).length },
  }]);
  if (vl.chyba) throw new Error(vl.chyba);
  if (zprava) await zapisStav({ zpravaId: zprava.id }, "odpovezeno", new Date().toISOString());
  // Kopie Karlovi, ať se nic neztratí (přeposlání přes Resend, beze změny obsahu)
  await resend.emails.receiving.forward({ emailId: d.email_id, to: KOPIE_ODPOVEDI, from: "MateMax odpovědi <noreply@matematika-snadno.cz>" }).catch(() => {});
}

async function zablokujAdresu(d: Data): Promise<void> {
  if (!supabaseAdmin) return;
  const komu = adresa(Array.isArray(d.to) ? d.to[0] : d.to);
  if (!komu) return;
  // Nejdřív podle logu zpráv (rychlé), jinak projít účty
  const { data: z } = await supabaseAdmin.from("zpravy").select("user_id, prijemce_typ").ilike("prijemce", komu).eq("prijemce_typ", "zak").not("user_id", "is", null).limit(1);
  if (z?.[0]?.user_id) { await nastavOdhlaseni(z[0].user_id as string, true); return; }
  for (let page = 1; page <= 50; page++) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    const u = data?.users.find((x) => x.email?.toLowerCase() === komu);
    if (u) { await nastavOdhlaseni(u.id, true); break; }
    if (!data || data.users.length < 1000) break;
  }
}

export async function POST(req: NextRequest) {
  const tajemstvi = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const telo = await req.text();
  const svixId = req.headers.get("svix-id") ?? "";
  if (!overPodpis(telo, svixId, req.headers.get("svix-timestamp") ?? "", req.headers.get("svix-signature") ?? "", tajemstvi)) {
    return NextResponse.json({ error: "Neplatný podpis" }, { status: 401 });
  }
  let udalost: { type?: string; created_at?: string; data?: Data };
  try { udalost = JSON.parse(telo); } catch { return NextResponse.json({ error: "Neplatné tělo" }, { status: 400 }); }
  if (!supabaseAdmin) return NextResponse.json({ ok: true, ignorovano: true });

  const typ = udalost.type ?? "";
  const d = udalost.data ?? {};
  const sablona = stitek(d.tags, "email");
  // Do logu webhooků jen technická data, bez adres a obsahu
  if ((await prijmiWebhook("resend", svixId, typ, { email_id: d.email_id ?? null, sablona: sablona ?? null })) === "duplicita") {
    return NextResponse.json({ ok: true, duplicita: true });
  }

  try {
    if (typ === "email.received") {
      await prijataOdpoved(d);
      await dokonciWebhook("resend", svixId, "zpracovano");
      return NextResponse.json({ ok: true });
    }
    const stav = STAV[typ];
    if (!stav) { await dokonciWebhook("resend", svixId, "ignorovano"); return NextResponse.json({ ok: true, ignorovano: true }); }

    if (STARE[typ]) await supabaseAdmin.from("analytics_events").insert({ user_id: null, event_name: "email_status_received", properties: { typ: STARE[typ], ...(sablona ? { e: sablona } : {}) } });

    const detail = d.click?.link ?? d.bounce?.message ?? d.failed?.reason ?? d.suppressed?.message ?? null;
    const nasel = await zapisStav({ zpravaId: stitek(d.tags, "z"), sluzbaId: d.email_id }, stav, udalost.created_at ?? new Date().toISOString(), detail);
    if (stav === "spam" || stav === "vraceno") await zablokujAdresu(d);

    // Zpráva se štítkem z má být v logu: když tam ještě není (webhook předběhl zápis), ať Resend doručení zopakuje
    if (!nasel && stitek(d.tags, "z")) {
      await dokonciWebhook("resend", svixId, "chyba", "zpráva v logu zatím není");
      return NextResponse.json({ error: "Zpráva zatím není v logu" }, { status: 503 });
    }
    // Zpráva z doby před logem (nebo admin upozornění) v logu není: nic se neztratí, jen se nezapíše stav
    await dokonciWebhook("resend", svixId, nasel ? "zpracovano" : "ignorovano");
    return NextResponse.json({ ok: true });
  } catch (e) {
    const zprava = e instanceof Error ? e.message : String(e);
    await dokonciWebhook("resend", svixId, "chyba", zprava);
    await zapisChybu({ zdroj: "webhook", zprava: `Resend ${typ}: ${zprava}`, cesta: "/api/resend/webhook" });
    // 500 = Resend doručení zopakuje
    return NextResponse.json({ error: "Zpracování selhalo" }, { status: 500 });
  }
}
