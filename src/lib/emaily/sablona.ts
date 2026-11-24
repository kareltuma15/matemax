/**
 * Společná šablona všech e-mailů MateMaxu (podle mockupu e-mailů schváleného Karlem 24. 11. 2026,
 * docs/emaily-2026-11). Tabulky a inline styly, protože e-mailové klienty (Gmail, Seznam, Outlook) jiné CSS neumí.
 * Dětem píše Hexík (tykání), rodičům Matematika Snadno (vykání).
 */

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://matemax.matematika-snadno.cz").replace(/\/$/, "");
/** Adresa podle ověřeného faktu lokalita_a_firma (oficiálně Všemyslice). */
export const ADRESA_FIRMY = "Matematika Snadno · Bohunice 81, 375 01 Všemyslice";

export interface Tlacitko { text: string; href: string }

export interface ObsahEmailu {
  predmet: string;
  /** Náhledový text vedle předmětu ve schránce. */
  pre: string;
  nadpis: string;
  /** Odstavce, smí obsahovat <b>; dynamické hodnoty musí projít esc(). */
  odstavce: string[];
  /** Fialový rámeček s body (řádky oddělené <br>), nepovinný. */
  box?: string;
  tlacitko?: Tlacitko;
  druhe?: Tlacitko;
  /** Obrázek Hexíka z public/emaily (bez přípony). */
  img?: string;
  rodic?: boolean;
  /** Vlastní HTML blok pod textem (např. tabulka), dynamické hodnoty musí projít esc(). */
  vlastniHtml?: string;
  /** Vlastní věta v patičce místo výchozí. */
  pata?: string;
  /** Servisní e-mail, kde se není z čeho odhlásit (pozvánka, platba, test): patička bez odkazů na odhlášení. */
  bezOdhlaseni?: boolean;
}

export function esc(s: string | number): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Absolutní odkaz do appky s označením zdroje (měření: kolik lidí e-mail vrátil do appky). */
export function odkaz(cesta: string, email: string): string {
  const url = new URL(cesta.startsWith("http") ? cesta : APP_URL + cesta);
  url.searchParams.set("utm_source", "email");
  url.searchParams.set("utm_campaign", email);
  return url.toString();
}

export function sestavHtml(e: ObsahEmailu, odkazy: { nastaveni?: string; odhlasit?: string } = {}): string {
  const odst = e.odstavce.map((p) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.6;color:#33405F">${p}</p>`).join("");
  const box = e.box
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3FF;border-radius:14px;margin:4px 0 20px"><tr><td style="padding:16px 18px;font-size:15px;line-height:1.7;color:#0D1B3E">${e.box}</td></tr></table>`
    : "";
  const tl = e.tlacitko
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px auto 10px"><tr><td style="background:#F5A623;border-radius:14px"><a href="${esc(e.tlacitko.href)}" style="display:inline-block;padding:15px 30px;font-size:16px;font-weight:800;color:#0D1B3E;text-decoration:none;font-family:Arial,sans-serif">${esc(e.tlacitko.text)}</a></td></tr></table>`
    : "";
  const druhe = e.druhe
    ? `<p style="margin:6px 0 0;text-align:center;font-size:14px"><a href="${esc(e.druhe.href)}" style="color:#5B55D6;font-weight:700">${esc(e.druhe.text)}</a></p>`
    : "";
  const obr = e.img
    ? `<tr><td align="center" style="background-color:#F1F0FF;padding:14px 0 0"><img src="${APP_URL}/emaily/${e.img}.png" width="190" height="190" alt="Hexík" style="display:block;width:190px;height:190px;border:0"></td></tr>`
    : "";
  const podpis = e.rodic ? "Karel Tůma · Matematika Snadno" : "Hexík a Karel z MateMaxu";
  const pata = e.pata ?? (e.rodic
    ? "Tento e-mail dostáváte, protože jste propojeni s účtem dítěte v MateMaxu."
    : "Tento e-mail dostáváš, protože máš účet v MateMaxu.");
  const odhlaseni = e.bezOdhlaseni || !odkazy.odhlasit
    ? ""
    : `<br>${odkazy.nastaveni ? `<a href="${esc(odkazy.nastaveni)}" style="color:#5B55D6">${e.rodic ? "Nastavení reportu" : "Nastavení e-mailů"}</a> · ` : ""}<a href="${esc(odkazy.odhlasit)}" style="color:#5B55D6">Odhlásit jedním klikem</a>`;
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(e.predmet)}</title></head><body style="margin:0;padding:0;background:#F3F5FA;font-family:Arial,Helvetica,sans-serif">`
    + `<div style="display:none;max-height:0;overflow:hidden">${esc(e.pre)}</div>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F5FA;padding:24px 12px"><tr><td align="center">`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:18px;overflow:hidden">`
    + `<tr><td style="background:#0D1B3E;padding:14px 22px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:34px;height:34px;background:#ffffff;border-radius:9px;text-align:center;font-weight:900;font-size:14px;color:#0D1B3E">M²</td><td style="padding-left:10px;color:#ffffff;font-weight:800;font-size:17px">MateMax</td></tr></table></td></tr>`
    + obr
    + `<tr><td style="padding:26px 30px 8px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0D1B3E">${esc(e.nadpis)}</h1>${odst}${box}${e.vlastniHtml ?? ""}${tl}${druhe}</td></tr>`
    + `<tr><td style="padding:18px 30px 26px"><p style="margin:0;font-size:15px;color:#33405F">${e.rodic ? "S pozdravem" : "Drž se!"}<br><b>${podpis}</b></p></td></tr>`
    + `<tr><td style="background:#F7F8FC;border-top:1px solid #E8ECF4;padding:16px 30px;font-size:12px;line-height:1.6;color:#8A93AB;text-align:center">${pata}${odhlaseni}<br>${ADRESA_FIRMY}</td></tr>`
    + `</table></td></tr></table></body></html>`;
}

/** Textová verze (pro klienty bez HTML a lepší doručitelnost). */
export function sestavText(e: ObsahEmailu, odkazy: { odhlasit?: string } = {}): string {
  const bezTagu = (s: string) => s.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  return [
    e.nadpis, "",
    ...e.odstavce.map(bezTagu).flatMap((p) => [p, ""]),
    ...(e.box ? [bezTagu(e.box), ""] : []),
    ...(e.tlacitko ? [`${e.tlacitko.text}: ${e.tlacitko.href}`, ""] : []),
    ...(e.druhe ? [`${e.druhe.text}: ${e.druhe.href}`, ""] : []),
    e.rodic ? "S pozdravem\nKarel Tůma · Matematika Snadno" : "Drž se!\nHexík a Karel z MateMaxu",
    "", ...(odkazy.odhlasit && !e.bezOdhlaseni ? [`Odhlásit: ${odkazy.odhlasit}`] : []), ADRESA_FIRMY,
  ].join("\n");
}
