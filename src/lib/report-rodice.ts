/**
 * Týdenní e-mail rodičům (HTML pro e-mailové klienty: tabulky a inline styly).
 * Čistá funkce bez serveru: používá ji pondělní cron i náhled /report-preview.
 * Ceny ani nic dalšího prodejního tu není, jen pokrok dítěte.
 */
import type { OdhadDitete } from "./odhad-server";

export interface ReportData {
  childName: string;
  weekDate: string;
  weekTotal: number;
  lastWeekTotal: number;
  streak: number;
  accuracy: number | null;
  odhad: OdhadDitete;
  appUrl?: string;
}

const NAVY = "#0D1B3E";
const GOLD = "#F5A623";
const VIOLET = "#4741B8";
const MUTED = "#5F6982";
const LINE = "#E4E6EF";
const GREEN = "#14753A";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

function bodySlovo(n: number): string {
  const a = Math.abs(Math.round(n));
  if (a === 1) return "bod";
  if (a >= 2 && a <= 4) return "body";
  return "bodů";
}

function pilulkaZmeny(zmena: number | null): string {
  if (zmena === null) return "";
  const [bg, fg, text] = zmena > 0
    ? ["#E2F4E9", GREEN, `▲ +${zmena} ${bodySlovo(zmena)} od minulého týdne`]
    : zmena < 0
    ? ["#FDECEC", "#B4232F", `▼ ${zmena} ${bodySlovo(zmena)} od minulého týdne`]
    : ["#EEF0F6", MUTED, "stejně jako minulý týden"];
  return `<span style="display:inline-block;background:${bg};color:${fg};font-size:12px;font-weight:800;padding:4px 10px;border-radius:999px;">${text}</span>`;
}

/** Sloupce odhadu po týdnech (posledních až 8 reportů + dnešek). */
function grafTydnu(o: OdhadDitete): string {
  const body = [...o.tydny.slice(-7).map((z) => ({ d: z.d, b: z.b, dnes: false })), { d: "", b: o.celkem, dnes: true }];
  if (body.length < 2) return "";
  const VYSKA = 90;
  const nejvic = Math.max(1, ...body.map((z) => z.b));
  const sloupce = body.map((z) => {
    const h = Math.max(6, Math.round((z.b / nejvic) * VYSKA));
    const popisek = z.dnes ? "teď" : `${Number(z.d.slice(8, 10))}. ${Number(z.d.slice(5, 7))}.`;
    return `<td valign="bottom" align="center" style="padding:0 3px;">
      <div style="font-size:11px;font-weight:800;color:${z.dnes ? NAVY : MUTED};padding-bottom:3px;">${z.b}</div>
      <div style="height:${h}px;width:26px;background:${z.dnes ? GOLD : "#C9C7F5"};border-radius:6px 6px 2px 2px;font-size:0;line-height:0;">&nbsp;</div>
      <div style="font-size:10px;color:${MUTED};padding-top:4px;white-space:nowrap;">${popisek}</div>
    </td>`;
  }).join("");
  return `<tr><td style="padding:0 32px 22px;">
    <p style="font-size:11px;font-weight:800;color:#8A93AA;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 10px;">Vývoj odhadu po týdnech</p>
    <table cellpadding="0" cellspacing="0"><tr>${sloupce}</tr></table>
  </td></tr>`;
}

function radkyTemat(o: OdhadDitete): string {
  return o.temata.map((t) => {
    const pct = t.max > 0 ? t.body / t.max : 0;
    const barva = pct >= 0.7 ? "#1F9D55" : pct >= 0.4 ? GOLD : "#E0565B";
    const sirka = Math.max(3, Math.round(pct * 100));
    return `<tr><td style="padding:9px 0 0;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:14px;color:${NAVY};font-weight:600;">${esc(t.label)}</td>
        <td style="font-size:13px;color:${MUTED};text-align:right;white-space:nowrap;"><b style="color:${NAVY};">${fmt(t.body)}</b> / ${t.max} b.</td>
      </tr><tr><td colspan="2" style="padding-top:5px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF0F6;border-radius:4px;"><tr>
          <td width="${sirka}%" style="background:${barva};height:7px;border-radius:4px;font-size:0;line-height:0;">&nbsp;</td><td style="font-size:0;line-height:0;">&nbsp;</td>
        </tr></table>
      </td></tr></table>
    </td></tr>`;
  }).join("");
}

export function buildReportHtml(r: ReportData): string {
  const { childName, weekDate, weekTotal, lastWeekTotal, streak, accuracy, odhad: o } = r;
  const app = r.appUrl ?? "https://matemax.matematika-snadno.cz";
  const jmeno = esc(childName);
  const pct = Math.round((o.celkem / o.max) * 100);
  const cilPct = o.cil ? Math.round((o.cil / o.max) * 100) : null;
  const doCile = o.cil ? o.cil - o.celkem : null;
  const trend = weekTotal - lastWeekTotal;

  const cilText = o.cil === null
    ? ""
    : doCile !== null && doCile <= 0
    ? `<p style="margin:10px 0 0;font-size:14px;color:${GREEN};font-weight:700;">🎯 Cíl ${o.cil} bodů je splněný.</p>`
    : `<p style="margin:10px 0 0;font-size:14px;color:#D9D8FE;">🎯 Cíl, který si ${jmeno} nastavil/a: <b style="color:#fff;">${o.cil} bodů</b>, chybí ještě ${doCile} ${bodySlovo(doCile!)}.</p>`;

  const odhadBlok = o.bezDat
    ? `<tr><td style="padding:24px 32px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F3FF;border:1px solid #DCDAFB;border-radius:16px;"><tr><td style="padding:18px 20px;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:800;color:${NAVY};">Odhad bodů zatím nemáme</p>
          <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.6;">Až ${jmeno} udělá vstupní diagnostiku nebo vyřeší první příklady, ukážeme vám tady, kolik bodů by teď u přijímaček získal/a.</p>
        </td></tr></table>
      </td></tr>`
    : `<tr><td style="padding:24px 32px 22px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:${NAVY};background-image:linear-gradient(160deg,#1B2A5C,#0D1B3E);border-radius:18px;"><tr><td style="padding:22px 22px 20px;">
          <p style="margin:0 0 6px;font-size:12px;font-weight:800;color:#C9C7F5;text-transform:uppercase;letter-spacing:0.08em;">Odhad bodů u přijímaček</p>
          <p style="margin:0;color:#fff;line-height:1;"><span style="font-size:46px;font-weight:900;">${o.celkem}</span><span style="font-size:18px;font-weight:700;color:#C9C7F5;"> z ${o.max} bodů</span></p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px;background:rgba(255,255,255,0.16);border-radius:6px;"><tr>
            <td width="${Math.max(3, pct)}%" style="background:${GOLD};height:10px;border-radius:6px;font-size:0;line-height:0;">&nbsp;</td><td style="font-size:0;line-height:0;">&nbsp;</td>
          </tr></table>
          ${cilPct !== null ? `<p style="margin:4px 0 0;font-size:11px;color:#C9C7F5;text-align:right;">cíl ${o.cil} b.</p>` : ""}
          <p style="margin:12px 0 0;">${pilulkaZmeny(o.zmena)}</p>
          ${cilText}
        </td></tr></table>
      </td></tr>
      ${grafTydnu(o)}`;

  const tip = o.bezDat
    ? `Začít je nejlepší vstupní diagnostikou: trvá pár minut a appka podle ní sama vybere, co procvičovat.`
    : o.nejvicBodu
    ? `Nejvíc bodů může ${jmeno} přidat v tématu <b>${esc(o.nejvicBodu.label)}</b> (zbývá až ${o.nejvicBodu.chybi} ${bodySlovo(o.nejvicBodu.chybi)}). Stačí 10 minut denně, appka úlohy vybere sama podle toho, co ještě nejde.`
    : `Všechna témata jsou na dobré cestě. Udržte pravidelnost, 10 minut denně stačí.`;

  const stat = (hodnota: string, popis: string, barva = NAVY, border = true) =>
    `<td width="33%" style="padding:16px 8px;text-align:center;${border ? `border-right:1px solid ${LINE};` : ""}">
      <p style="margin:0;font-size:28px;font-weight:900;color:${barva};line-height:1;">${hodnota}</p>
      <p style="margin:6px 0 0;font-size:11px;color:#8A93AA;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${popis}</p>
    </td>`;

  const trendText = weekTotal === 0 && lastWeekTotal === 0
    ? `Tento týden ${jmeno} netrénoval/a. Krátké připomenutí u večeře většinou stačí.`
    : trend > 0
    ? `O ${trend} příkladů víc než minulý týden.`
    : trend < 0
    ? `O ${-trend} příkladů méně než minulý týden.`
    : `Stejně jako minulý týden.`;

  return `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Týdenní přehled MateMax</title>
</head>
<body style="margin:0;padding:0;background:#EEF0F8;font-family:'DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#EEF0F8;padding:32px 12px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 0 18px;text-align:center;">
        <table cellpadding="0" cellspacing="0" style="display:inline-table;"><tr>
          <td style="width:34px;height:34px;background:${NAVY};border-radius:9px;text-align:center;vertical-align:middle;font-weight:900;font-size:14px;color:#fff;line-height:34px;">M²</td>
          <td style="padding-left:10px;font-size:16px;font-weight:800;color:${NAVY};vertical-align:middle;">MateMax</td>
        </tr></table>
      </td></tr>

      <tr><td style="background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 6px 28px rgba(13,27,62,0.10);">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:28px 32px 0;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:800;color:${VIOLET};text-transform:uppercase;letter-spacing:0.08em;">Týdenní přehled · ${esc(weekDate)}</p>
            <h1 style="margin:0;font-size:25px;font-weight:900;color:${NAVY};letter-spacing:-0.3px;">Jak se daří: ${jmeno}</h1>
            <p style="margin:8px 0 0;font-size:15px;color:${MUTED};line-height:1.6;">Dobrý den, tady je shrnutí přípravy na přijímačky z matematiky za poslední týden.</p>
          </td></tr>

          ${odhadBlok}

          <tr><td style="padding:0 32px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:14px;background:#F7F8FC;border:1px solid ${LINE};"><tr>
              ${stat(String(weekTotal), "příkladů za týden")}
              ${stat(String(streak), "dní v řadě", streak >= 7 ? "#E8590C" : NAVY)}
              ${stat(accuracy !== null ? `${accuracy}&thinsp;%` : "–", "úspěšnost", accuracy === null ? "#A0A8BD" : accuracy >= 70 ? GREEN : accuracy >= 50 ? "#B7791F" : "#B4232F", false)}
            </tr></table>
            <p style="margin:8px 0 0;font-size:13px;color:${MUTED};">${trendText}</p>
          </td></tr>

          ${o.bezDat ? "" : `<tr><td style="padding:18px 32px 22px;">
            <p style="font-size:11px;font-weight:800;color:#8A93AA;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 2px;">Body podle témat</p>
            <table width="100%" cellpadding="0" cellspacing="0">${radkyTemat(o)}</table>
          </td></tr>`}

          <tr><td style="padding:0 32px 26px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF6E5;border:1px solid #F8D9A0;border-radius:14px;"><tr><td style="padding:16px 18px;">
              <p style="margin:0 0 4px;font-size:12px;font-weight:800;color:#9A5B00;text-transform:uppercase;letter-spacing:0.05em;">💡 Na co se zaměřit</p>
              <p style="margin:0;font-size:14px;color:#4A3500;line-height:1.6;">${tip}</p>
            </td></tr></table>
          </td></tr>

          <tr><td style="padding:0 32px 30px;text-align:center;">
            <a href="${app}/rodice/dashboard" style="display:inline-block;background:${NAVY};color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:15px 32px;border-radius:12px;">Otevřít rodičovský přehled →</a>
          </td></tr>

          <tr><td style="padding:16px 32px 22px;border-top:1px solid #F0F1F6;text-align:center;">
            <p style="color:#8A93AA;font-size:12px;line-height:1.6;margin:0 0 6px;">Odhad bodů je orientační: počítá se z úspěšnosti v appce a z toho, kolik bodů za jednotlivá témata bývá v testu CERMAT.</p>
            <p style="color:#A0A8BD;font-size:11px;margin:0;">E-mail dostáváte, protože jste v MateMaxu propojeni jako rodič. <a href="${app}/rodice/nastaveni" style="color:#8A93AA;">Nastavení reportu</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
