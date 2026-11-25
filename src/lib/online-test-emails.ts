// Transakční emaily kolem testů nanečisto.
// Všechny sdílí jeden layout, aby vypadaly jako jedna rodina zpráv.
// Odesílání nikdy nevyhazuje — email je vedlejší efekt, nesmí shodit platbu
// ani odevzdání archu. Volající dostane true/false.
import { ADRESA_FIRMY } from "./emaily/sablona";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://matemax.matematika-snadno.cz";

const FROM = "MateMax <noreply@matematika-snadno.cz>";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("cs-CZ", {
    weekday: "long", day: "numeric", month: "long",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Europe/Prague",
  });
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("cs-CZ", {
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Prague",
  });
}

/** Vzhled jako ostatní e-maily MateMaxu (společná šablona, mockup e-mailů 24. 11. 2026): tmavý pruh s logem,
 *  Hexík, oranžové tlačítko, patička s adresou. Obsah e-mailů beze změny. */
function shell(opts: {
  badge: string;
  heading: string;
  bodyHtml: string;
  ctaHref?: string;
  ctaLabel?: string;
  img?: "test" | "vysledek";
}): string {
  const { badge, heading, bodyHtml, ctaHref, ctaLabel, img = "test" } = opts;
  return `<!DOCTYPE html>
<html lang="cs">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><style>:root{color-scheme:light only}</style><title>${esc(heading)}</title></head>
<body style="margin:0;padding:0;background:#F3F5FA;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F3F5FA;padding:24px 12px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden;">
  <tr><td style="background:#0D1B3E;padding:14px 22px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:34px;height:34px;background:#ffffff;border-radius:9px;text-align:center;font-weight:900;font-size:14px;color:#0D1B3E">M²</td><td style="padding-left:10px;color:#ffffff;font-weight:800;font-size:17px">MateMax</td></tr></table></td></tr>
  <tr><td align="center" style="background-color:#F1F0FF;padding:14px 0 0"><img src="${APP_URL}/emaily/${img}.png" width="170" height="170" alt="Hexík" style="display:block;width:170px;height:170px;border:0"></td></tr>
  <tr><td style="padding:26px 30px 0;">
    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#5B55D6;">${esc(badge)}</p>
    <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0D1B3E;">${esc(heading)}</h1>
    <div style="font-size:16px;line-height:1.6;color:#33405F;">${bodyHtml}</div>
  </td></tr>
  ${ctaHref && ctaLabel ? `<tr><td style="padding:22px 30px 6px;"><table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto"><tr><td style="background:#F5A623;border-radius:14px"><a href="${ctaHref}" style="display:inline-block;padding:15px 30px;font-size:16px;font-weight:800;color:#0D1B3E;text-decoration:none;font-family:Arial,sans-serif">${esc(ctaLabel.replace(/s*→$/, ""))}</a></td></tr></table></td></tr>` : ""}
  <tr><td style="padding:20px 30px 24px;">
    <p style="margin:0;font-size:15px;color:#33405F;">S pozdravem<br><b>Karel Tůma · Matematika Snadno</b></p>
    <p style="margin:4px 0 0;font-size:13px;color:#64748b;">720 477 336 · karel.tuma@matematika-snadno.cz</p>
  </td></tr>
  <tr><td style="background:#F7F8FC;border-top:1px solid #E8ECF4;padding:16px 30px;font-size:12px;line-height:1.6;color:#8A93AB;text-align:center">E-mail k přihlášce na test nanečisto v MateMaxu.<br>${ADRESA_FIRMY}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[online-test-emails] RESEND_API_KEY není nastaven — přeskakuji", subject);
    return false;
  }
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    // Resend SDK NEVYHAZUJE výjimku při API chybě (validace, odmítnutý
    // odesílatel…) — vrací { data, error }. Bez kontroly error by se odmítnutý
    // email tvářil jako úspěšně odeslaný (zjištěno 13.9. při E2E testu —
    // confirm_sent_at se nastavilo, i když email nikam nedorazil).
    const { data, error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error("[online-test-emails] Resend odmítl odeslání:", subject, error);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error("[online-test-emails] odeslání selhalo:", subject, err);
    return false;
  }
}

const p = (text: string) =>
  `<p style="font-size:15px;color:#4b5563;line-height:1.7;margin:0 0 16px;">${text}</p>`;

const box = (bg: string, border: string, color: string, html: string) =>
  `<div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:18px;margin:0 0 16px;">
     <div style="font-size:14px;color:${color};line-height:1.6;">${html}</div>
   </div>`;

export interface BuiltEmail { subject: string; html: string }

// ── 1. Po zaplacení ────────────────────────────────────────────────────────
export function buildEnrollmentConfirmation(opts: {
  jmeno: string; title: string; scheduledAt: string; sessionId: string;
}): BuiltEmail {
  const { jmeno, title, scheduledAt, sessionId } = opts;
  const html = shell({
    badge: "Přihlášení potvrzeno",
    heading: "Jsi přihlášen/a na test 🎉",
    bodyHtml:
      p(`Ahoj ${esc(jmeno)}, platba proběhla — máš místo na termínu <strong>${esc(title)}</strong>.`) +
      box("#F8FAFF", "#e2e8f0", "#0D1B3E",
        `<strong>Kdy:</strong> ${esc(fmtDateTime(scheduledAt))}<br><strong>Kde:</strong> online, přímo v MateMaxu`) +
      p("<strong>Co si připravit:</strong>") +
      p("Den před testem ti pošlu odkaz na <strong>záznamový arch</strong> — ten si vytiskni. Připrav si pero, tužku a pravítko, přesně jako k ostrým přijímačkám.") +
      p("V čas startu se ti v testovací místnosti odemkne zadání. Počítáš na papír, po skončení nahraješ fotky archu a do 48 hodin ti pošlu osobní hodnocení — téma po tématu."),
    ctaHref: `${APP_URL}/test/${sessionId}`,
    ctaLabel: "Otevřít testovou místnost →",
  });
  return { subject: `Přihlášení potvrzeno — ${title}`, html };
}

// ── 2. 24h před testem ─────────────────────────────────────────────────────
export function buildReminder24h(opts: {
  jmeno: string; title: string; scheduledAt: string; sessionId: string;
  archUrl: string | null;
}): BuiltEmail {
  const { jmeno, title, scheduledAt, sessionId, archUrl } = opts;
  const html = shell({
    badge: "Zítra tě čeká test",
    heading: "Nezapomeň si vytisknout arch 🖨️",
    bodyHtml:
      p(`Ahoj ${esc(jmeno)}, zítra máš test <strong>${esc(title)}</strong>.`) +
      box("#F8FAFF", "#e2e8f0", "#0D1B3E", `<strong>Start:</strong> ${esc(fmtDateTime(scheduledAt))}`) +
      (archUrl
        ? p(`Vytiskni si <a href="${archUrl}" style="color:#2E6DA4;font-weight:700;">záznamový arch (PDF)</a> — budeš do něj psát odpovědi. Odkaz najdeš i v testovací místnosti.`)
        : p("Záznamový arch najdeš ke stažení v testovací místnosti.")) +
      p("Připrav si pero, tužku a pravítko. Zadání se ti odemkne přesně v čas startu."),
    ctaHref: `${APP_URL}/test/${sessionId}`,
    ctaLabel: "Otevřít testovou místnost →",
  });
  return { subject: "Zítra test nanečisto — vytiskni si arch", html };
}

// ── 3. 1h před testem ──────────────────────────────────────────────────────
export function buildReminder1h(opts: {
  jmeno: string; title: string; scheduledAt: string; sessionId: string;
}): BuiltEmail {
  const { jmeno, title, scheduledAt, sessionId } = opts;
  const html = shell({
    badge: "Už za chvíli",
    heading: "Za hodinu začínáme! ⏰",
    bodyHtml:
      p(`Ahoj ${esc(jmeno)}, test <strong>${esc(title)}</strong> startuje v <strong>${esc(fmtTime(scheduledAt))}</strong>.`) +
      p("Měj po ruce vytištěný záznamový arch, pero a pravítko. V čas startu se ti v místnosti odemkne zadání a spustí se časomíra."),
    ctaHref: `${APP_URL}/test/${sessionId}`,
    ctaLabel: "Jdu na to →",
  });
  return { subject: `Za hodinu začínáme — ${title}`, html };
}

// ── 4. Po odevzdání archu ──────────────────────────────────────────────────
export function buildSubmissionReceived(opts: {
  jmeno: string; title: string; sessionId: string; photoCount: number;
}): BuiltEmail {
  const { jmeno, title, sessionId, photoCount } = opts;
  const html = shell({
    badge: "Arch přijat",
    img: "vysledek",
    heading: "Máme to! ✅",
    bodyHtml:
      p(`Ahoj ${esc(jmeno)}, tvůj záznamový arch z testu <strong>${esc(title)}</strong> dorazil (${photoCount} ${photoCount === 1 ? "fotka" : photoCount < 5 ? "fotky" : "fotek"}).`) +
      box("#f0fdf4", "#bbf7d0", "#166534",
        "Teď ho opravím ručně — <strong>do 48 hodin</strong> ti pošlu osobní hodnocení: body po tématech, co ti jde a co ještě dotrénovat.") +
      p("Zatím si můžeš dát trénink v MateMaxu 🙂"),
    ctaHref: `${APP_URL}/test/${sessionId}`,
    ctaLabel: "Zobrazit testovou místnost →",
  });
  return { subject: "Arch přijat — výsledky do 48 hodin", html };
}

// ── Odesílací obálky ───────────────────────────────────────────────────────

export function sendEnrollmentConfirmation(
  o: { to: string; jmeno: string; title: string; scheduledAt: string; sessionId: string }
): Promise<boolean> {
  const { subject, html } = buildEnrollmentConfirmation(o);
  return send(o.to, subject, html);
}

export function sendReminder24h(
  o: { to: string; jmeno: string; title: string; scheduledAt: string; sessionId: string; archUrl: string | null }
): Promise<boolean> {
  const { subject, html } = buildReminder24h(o);
  return send(o.to, subject, html);
}

export function sendReminder1h(
  o: { to: string; jmeno: string; title: string; scheduledAt: string; sessionId: string }
): Promise<boolean> {
  const { subject, html } = buildReminder1h(o);
  return send(o.to, subject, html);
}

export function sendSubmissionReceived(
  o: { to: string; jmeno: string; title: string; sessionId: string; photoCount: number }
): Promise<boolean> {
  const { subject, html } = buildSubmissionReceived(o);
  return send(o.to, subject, html);
}
