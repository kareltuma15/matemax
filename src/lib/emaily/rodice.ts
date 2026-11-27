import crypto from "crypto";
import { supabaseAdmin } from "../supabase-admin";
import { esc, odkaz, sestavHtml, sestavText, APP_URL, type ObsahEmailu } from "./sablona";
import { adresaOdpovedi, posliResend } from "../zpravy-log";

/**
 * E-maily rodičům a plátcům (krok 2, mockup e-mailů schválený Karlem 24. 11. 2026). Vykání, podpis Matematika Snadno.
 * Ceny jen ze Stripe (skutečně účtovaná částka), žádné natvrdo.
 */

const OD = "MateMax <noreply@matematika-snadno.cz>";

export function pozvankaRodice(jmenoDitete: string, odkazPotvrzeni: string): ObsahEmailu {
  const j = esc(jmenoDitete);
  return {
    predmet: "Potvrďte odběr týdenního reportu MateMax",
    pre: `${jmenoDitete} chce, abyste viděli, jak se připravuje na přijímačky.`,
    nadpis: "Potvrďte odběr týdenního reportu",
    odstavce: [
      "Dobrý den,",
      `v MateMaxu (příprava na přijímačky z matematiky) zadal(a) <b>${j}</b> tento e-mail, aby vám každé pondělí ráno chodil přehled jeho/jejího tréninku.`,
      "V přehledu uvidíte, kolik trénuje, odhad bodů u přijímaček a témata, na kterých pracuje.",
    ],
    tlacitko: { text: "Potvrdit odběr", href: odkazPotvrzeni + (odkazPotvrzeni.includes("?") ? "&" : "?") + "utm_source=email&utm_campaign=pozvanka" },
    img: "rodic",
    rodic: true,
    bezOdhlaseni: true,
    pata: `Tento e-mail přišel, protože vaši adresu zadal(a) ${j} v MateMaxu. Pokud nic neznáte, e-mail ignorujte. Bez potvrzení vám nic dalšího nepošleme.`,
  };
}

export function premiumAktivni(): ObsahEmailu {
  return {
    predmet: "Vítejte v MateMax Premium 👑",
    pre: "Co se odemklo a jak zapnout týdenní přehled.",
    nadpis: "Děkujeme, Premium je aktivní",
    odstavce: [
      "Dobrý den, děkujeme za důvěru. MateMax Premium je od teď aktivní.",
      "Předplatné můžete kdykoli zrušit v MateMaxu na stránce Ceník → Spravovat předplatné.",
    ],
    box: "🔓 Všechna témata a úrovně<br>📬 Týdenní přehled pro rodiče každé pondělí ráno",
    tlacitko: { text: "Propojit účet rodiče", href: odkaz("/rodice", "premium") },
    druhe: { text: "Otevřít MateMax", href: odkaz("/", "premium") },
    img: "premium",
    rodic: true,
    bezOdhlaseni: true,
    pata: "Tento e-mail dostáváte, protože jste zaplatili MateMax Premium.",
  };
}

export function platbaSeNepovedla(castka: string | null, odkazPlatby: string | null): ObsahEmailu {
  return {
    predmet: "Platba za MateMax Premium se nepovedla",
    pre: "Prosím zkontrolujte platební kartu.",
    nadpis: "Platba se nepovedla",
    odstavce: [
      `Dobrý den, poslední platbu za MateMax Premium${castka ? ` (${esc(castka)})` : ""} se nepodařilo provést. Premium zatím běží dál.`,
      "Prosím zkontrolujte platební kartu. Pokud je vše v pořádku, platbu zkusíme znovu.",
    ],
    tlacitko: { text: "Zkontrolovat platbu", href: odkazPlatby ?? odkaz("/cenik", "platba") },
    img: "platba",
    rodic: true,
    bezOdhlaseni: true,
    pata: "Tento e-mail dostáváte, protože máte předplatné MateMax Premium.",
  };
}

export async function posliEmail(komu: string, obsah: ObsahEmailu, stitek: string, odkazy: { nastaveni?: string; odhlasit?: string; api?: string } = {}, zaznam: { userId?: string | null; vlastnosti?: Record<string, string> } = {}): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) { console.warn(`[emaily] RESEND_API_KEY chybí, ${stitek} neodeslán`); return false; }
  try {
    // Odeslání + log zpráv (admin → Zprávy; u rodiče je user_id dítě nebo plátce, ke kterému e-mail patří)
    const r = await posliResend({
      from: OD, to: komu, replyTo: adresaOdpovedi(), subject: obsah.predmet,
      html: sestavHtml(obsah, odkazy), text: sestavText(obsah, odkazy),
      headers: odkazy.api ? { "List-Unsubscribe": `<${odkazy.api}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } : undefined,
      tags: [{ name: "email", value: stitek }],
    }, { sablona: stitek, prijemceTyp: "rodic", userId: zaznam.userId ?? null });
    if (!r.ok) { console.error(`[emaily] ${stitek}: Resend odmítl`, r.chyba); return false; }
    // Záznam pro analytiku e-mailů (Admin → E-maily)
    await supabaseAdmin?.from("analytics_events").insert({ user_id: zaznam.userId ?? null, event_name: "email_sent", properties: { e: stitek, ...(zaznam.vlastnosti ?? {}) } });
    return true;
  } catch (e) {
    console.error(`[emaily] ${stitek}: výjimka`, e);
    return false;
  }
}

// ── Odhlášení týdenního reportu (podepsaný odkaz z id propojení, bez e-mailu v adrese) ──
function tajemstvi(): string {
  return process.env.EMAILY_SECRET || process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}
export function podpisReportu(linkId: string): string {
  return crypto.createHmac("sha256", tajemstvi()).update(`report:${linkId}`).digest("hex").slice(0, 32);
}
export function overPodpisReportu(linkId: string, t: string): boolean {
  const a = Buffer.from(podpisReportu(linkId));
  const b = Buffer.from(String(t));
  return !!tajemstvi() && a.length === b.length && crypto.timingSafeEqual(a, b);
}
export function odkazyReportu(linkId: string) {
  const q = `l=${encodeURIComponent(linkId)}&t=${podpisReportu(linkId)}`;
  return { odhlasit: `${APP_URL}/rodice/odhlasit?${q}`, api: `${APP_URL}/api/rodice/odhlasit?${q}`, nastaveni: `${APP_URL}/rodice/nastaveni` };
}
