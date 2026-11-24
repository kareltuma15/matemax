import crypto from "crypto";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { APP_URL, sestavHtml, sestavText } from "./sablona";
import { obsahEmailu, PRIPOMINKY, type DataZaka, type EmailZaka } from "./katalog";
import type { EmailovyStav } from "./rozhodnuti";

/**
 * Odeslání e-mailu žákovi přes Resend + záznam do app_metadata.emaily (kdy co odešlo, strop) a do analytics_events
 * (email_odeslan, pro admin → E-maily). Bez nové tabulky v databázi.
 */

const OD = "Hexík z MateMaxu <noreply@matematika-snadno.cz>";
const ODPOVEDI = "karel.tuma@matematika-snadno.cz";

function tajemstvi(): string {
  return process.env.EMAILY_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

/** Podpis odkazu na odhlášení (nejde podvrhnout pro cizí účet). */
export function podpisOdhlaseni(userId: string): string {
  return crypto.createHmac("sha256", tajemstvi()).update(`odhlasit:${userId}`).digest("hex").slice(0, 32);
}

export function overPodpis(userId: string, podpis: string): boolean {
  const a = Buffer.from(podpisOdhlaseni(userId));
  const b = Buffer.from(String(podpis));
  return !!tajemstvi() && a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function odkazyUctu(userId: string) {
  const q = `u=${encodeURIComponent(userId)}&t=${podpisOdhlaseni(userId)}`;
  return {
    nastaveni: `${APP_URL}/emaily?${q}`,
    odhlasit: `${APP_URL}/emaily?${q}&odhlasit=1`,
    api: `${APP_URL}/api/emaily/odhlasit?${q}`,
  };
}

export function emailovyStav(user: User): EmailovyStav {
  const s = (user.app_metadata?.emaily ?? {}) as EmailovyStav;
  return { odhlaseno: !!s.odhlaseno, odeslano: s.odeslano ?? {}, historie: Array.isArray(s.historie) ? s.historie : [] };
}

export async function posliEmailZakovi(user: User, id: EmailZaka, data: DataZaka): Promise<{ ok: boolean; chyba?: string }> {
  if (!user.email) return { ok: false, chyba: "bez e-mailu" };
  if (!process.env.RESEND_API_KEY) return { ok: false, chyba: "RESEND_API_KEY chybí" };
  if (!supabaseAdmin) return { ok: false, chyba: "service role chybí" };

  const obsah = obsahEmailu(id, data);
  const odkazy = odkazyUctu(user.id);
  try {
    const { Resend } = await import("resend");
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: OD,
      to: user.email,
      replyTo: ODPOVEDI,
      subject: obsah.predmet,
      html: sestavHtml(obsah, odkazy),
      text: sestavText(obsah, odkazy),
      headers: {
        // Odhlášení jedním klikem přímo v Gmailu / Seznamu (RFC 8058)
        "List-Unsubscribe": `<${odkazy.api}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      tags: [{ name: "email", value: id }],
    });
    if (error) return { ok: false, chyba: error.message };
  } catch (e) {
    return { ok: false, chyba: e instanceof Error ? e.message : String(e) };
  }

  // Zápis: kdy co odešlo (a strop připomínek). Uvítání se do stropu nepočítá.
  // Čerstvá metadata (volající mohl mezitím zapsat jiný klíč, např. welcome_sent_at), ať se nic nepřepíše.
  const ted = new Date().toISOString();
  const { data: cerstvy } = await supabaseAdmin.auth.admin.getUserById(user.id);
  const meta = cerstvy?.user?.app_metadata ?? user.app_metadata ?? {};
  const stav = emailovyStav(cerstvy?.user ?? user);
  const novy: EmailovyStav = {
    ...stav,
    odeslano: { ...stav.odeslano, [id]: ted },
    historie: PRIPOMINKY.includes(id) ? [...(stav.historie ?? []), ted].slice(-6) : stav.historie,
  };
  await supabaseAdmin.auth.admin.updateUserById(user.id, { app_metadata: { ...meta, emaily: novy } }).catch(() => {});
  await supabaseAdmin.from("analytics_events").insert({ user_id: user.id, event_name: "email_odeslan", properties: { e: id, trida: data.trida } });
  return { ok: true };
}

export async function nastavOdhlaseni(userId: string, odhlaseno: boolean): Promise<boolean> {
  if (!supabaseAdmin) return false;
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error || !data.user) return false;
  const stav = emailovyStav(data.user);
  const { error: e2 } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    app_metadata: { ...data.user.app_metadata, emaily: { ...stav, odhlaseno } },
  });
  if (!e2 && odhlaseno && !stav.odhlaseno) {
    // Analytika: po kterém e-mailu se odhlásil (poslední odeslaná připomínka)
    const posledni = Object.entries(stav.odeslano ?? {}).sort((a, b) => String(b[1]).localeCompare(String(a[1])))[0]?.[0];
    await supabaseAdmin.from("analytics_events").insert({ user_id: userId, event_name: "email_odhlaseni", properties: { druh: "zak", ...(posledni ? { posledni } : {}) } });
  }
  return !e2;
}
