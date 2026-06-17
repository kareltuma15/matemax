"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

// Testovací data dle zadání
const TEST_DATA = {
  child_name: "Tomáš",
  parent_name: "paní Nováková",
  week_from: "21. 4.",
  week_to: "27. 4. 2026",
  total_examples: "42",
  streak_days: "7",
  streak_emoji: "⚡",
  accuracy_pct: "74",
  time_spent_min: "63",
  weak_topic_1: "Geometrie",
  weak_pct_1: "45",
  weak_topic_2: "Výrazy",
  weak_pct_2: "52",
  weak_topic_3: "Slovní úlohy",
  weak_pct_3: "61",
  strong_topic: "Zlomky",
  recommendation:
    "Tomáš zvládá zlomky skvěle — to je dobrý základ. Doporučujeme se příští týden zaměřit na geometrii, zejména výpočty obsahu a obvodu. Zařaďte 2–3 příklady denně navíc z tohoto tématu.",
  next_topic: "Geometrie — obsah a obvod",
  app_url: "http://localhost:3000/trenink",
  unsubscribe_url: "#",
};

function buildHtml(data: typeof TEST_DATA): string {
  const raw = `<!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MateMax – Týdenní report pro rodiče</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:Arial,Helvetica,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f8;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:linear-gradient(135deg,#0D1B3E 0%,#1e3a6e 100%);padding:32px 40px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">🧮 MateMax</div>
                  <div style="font-size:13px;color:#7eb8f0;margin-top:4px;">Matematika, která baví každý den</div>
                </td>
                <td align="right" valign="top">
                  <div style="background:rgba(255,255,255,0.12);border-radius:8px;padding:8px 14px;display:inline-block;">
                    <div style="font-size:11px;color:#b0ccee;text-transform:uppercase;letter-spacing:1px;">Týdenní report</div>
                    <div style="font-size:13px;color:#ffffff;margin-top:2px;font-weight:600;">${data.week_from} – ${data.week_to}</div>
                  </div>
                </td>
              </tr>
            </table>
            <div style="margin-top:24px;padding:16px 20px;background:rgba(255,255,255,0.08);border-radius:10px;border-left:4px solid #00B4D8;">
              <div style="font-size:13px;color:#90b8d8;">Přehled pro:</div>
              <div style="font-size:20px;font-weight:700;color:#ffffff;margin-top:4px;">${data.child_name}</div>
            </div>
          </td>
        </tr>

        <!-- STATISTIKY -->
        <tr>
          <td style="padding:32px 40px 0;">
            <div style="font-size:15px;font-weight:600;color:#0D1B3E;margin-bottom:16px;">📊 Tento týden v číslech</div>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="31%" style="background:#f0f8ff;border-radius:12px;padding:18px 16px;text-align:center;vertical-align:top;">
                  <div style="font-size:34px;font-weight:700;color:#0D1B3E;line-height:1;">${data.total_examples}</div>
                  <div style="font-size:12px;color:#5a7a9a;margin-top:6px;font-weight:500;">příkladů splněno</div>
                </td>
                <td width="4%"></td>
                <td width="31%" style="background:#fff8e8;border-radius:12px;padding:18px 16px;text-align:center;vertical-align:top;">
                  <div style="font-size:34px;font-weight:700;color:#e67e00;line-height:1;">${data.streak_days} ${data.streak_emoji}</div>
                  <div style="font-size:12px;color:#8a6a20;margin-top:6px;font-weight:500;">dní v řadě</div>
                </td>
                <td width="4%"></td>
                <td width="30%" style="background:#eefff4;border-radius:12px;padding:18px 16px;text-align:center;vertical-align:top;">
                  <div style="font-size:34px;font-weight:700;color:#1a7a42;line-height:1;">${data.accuracy_pct}%</div>
                  <div style="font-size:12px;color:#3a7a5a;margin-top:6px;font-weight:500;">správných odpovědí</div>
                </td>
              </tr>
            </table>
            <div style="margin-top:12px;background:#f8f0ff;border-radius:10px;padding:12px 16px;text-align:center;">
              <span style="font-size:14px;color:#5a3a8a;">⏱️ Celkový čas procvičování tento týden: <strong style="color:#0D1B3E;">${data.time_spent_min} minut</strong></span>
            </div>
          </td>
        </tr>

        <!-- STREAK BAR -->
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="font-size:13px;color:#5a7a9a;margin-bottom:10px;font-weight:500;">Aktivita v týdnu:</div>
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                ${["Po","Út","St","Čt","Pá","So","Ne"].map((den, i) => {
                  const active = [0,1,2,4,5].includes(i);
                  return `<td align="center" width="13%">
                    <div style="width:36px;height:36px;border-radius:50%;background:${active ? "#27ae60" : "#e0e8f0"};display:inline-block;line-height:36px;text-align:center;font-size:18px;">${active ? "✓" : "–"}</div>
                    <div style="font-size:11px;color:#5a7a9a;margin-top:4px;">${den}</div>
                  </td>`;
                }).join("")}
              </tr>
            </table>
          </td>
        </tr>

        <!-- NEJSLABŠÍ TÉMATA -->
        <tr>
          <td style="padding:28px 40px 0;">
            <div style="font-size:15px;font-weight:600;color:#0D1B3E;margin-bottom:4px;">🎯 Kde má ${data.child_name} ještě prostor k růstu</div>
            <div style="font-size:13px;color:#5a7a9a;margin-bottom:16px;">Témata s nejnižší úspěšností tento týden:</div>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
              <tr><td style="background:#fff5f5;border-radius:10px;padding:14px 16px;border-left:4px solid #e74c3c;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td><div style="font-size:14px;font-weight:600;color:#0D1B3E;">${data.weak_topic_1}</div><div style="font-size:12px;color:#8a5a5a;margin-top:3px;">Úspěšnost: ${data.weak_pct_1} %</div></td>
                  <td align="right"><div style="width:80px;height:8px;background:#f0d0d0;border-radius:4px;overflow:hidden;"><div style="width:${data.weak_pct_1}%;height:8px;background:#e74c3c;border-radius:4px;"></div></div></td>
                </tr></table>
              </td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:10px;">
              <tr><td style="background:#fffbf0;border-radius:10px;padding:14px 16px;border-left:4px solid #f39c12;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td><div style="font-size:14px;font-weight:600;color:#0D1B3E;">${data.weak_topic_2}</div><div style="font-size:12px;color:#8a7a3a;margin-top:3px;">Úspěšnost: ${data.weak_pct_2} %</div></td>
                  <td align="right"><div style="width:80px;height:8px;background:#f0e0b0;border-radius:4px;overflow:hidden;"><div style="width:${data.weak_pct_2}%;height:8px;background:#f39c12;border-radius:4px;"></div></div></td>
                </tr></table>
              </td></tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="background:#f5f8ff;border-radius:10px;padding:14px 16px;border-left:4px solid #3498db;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                  <td><div style="font-size:14px;font-weight:600;color:#0D1B3E;">${data.weak_topic_3}</div><div style="font-size:12px;color:#4a6a9a;margin-top:3px;">Úspěšnost: ${data.weak_pct_3} %</div></td>
                  <td align="right"><div style="width:80px;height:8px;background:#c0d8f0;border-radius:4px;overflow:hidden;"><div style="width:${data.weak_pct_3}%;height:8px;background:#3498db;border-radius:4px;"></div></div></td>
                </tr></table>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- DOPORUČENÍ -->
        <tr>
          <td style="padding:24px 40px 0;">
            <div style="background:linear-gradient(135deg,#e8f5e9 0%,#f0fff4 100%);border-radius:12px;padding:20px 22px;border:1px solid #c8e6c9;">
              <div style="font-size:15px;font-weight:600;color:#1a5e35;margin-bottom:8px;">💡 Co doporučujeme na příští týden</div>
              <div style="font-size:14px;color:#2d5a3d;line-height:1.6;">${data.recommendation}</div>
              <div style="margin-top:12px;padding-top:12px;border-top:1px solid #c8e6c9;">
                <span style="font-size:13px;color:#4a7a5a;font-weight:500;">📚 Navrhované téma: </span>
                <span style="font-size:13px;color:#0D1B3E;font-weight:700;">${data.next_topic}</span>
              </div>
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:28px 40px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center">
                <a href="${data.app_url}" style="display:inline-block;background:linear-gradient(135deg,#00B4D8 0%,#0077a8 100%);color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:10px;letter-spacing:0.3px;">
                  📱 Otevřít MateMax
                </a>
                <div style="font-size:12px;color:#8a9aaa;margin-top:10px;">
                  Podívejte se na detailní přehled výsledků a statistiky v aplikaci.
                </div>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- MOTIVACE -->
        <tr>
          <td style="padding:0 40px 28px;">
            <div style="background:#0D1B3E;border-radius:12px;padding:20px 22px;text-align:center;">
              <div style="font-size:20px;margin-bottom:8px;">🏅</div>
              <div style="font-size:14px;color:#c0d8f0;line-height:1.6;">
                Každý příklad, který ${data.child_name} vyřeší, ho/ji přibližuje k lepším výsledkům u přijímaček.
                Pokračujte v tom — jste na správné cestě!
              </div>
            </div>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f8fafc;border-top:1px solid #e8eef4;padding:20px 40px;border-radius:0 0 16px 16px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <div style="font-size:12px;color:#8a9aaa;line-height:1.6;">
                    Tento email jste dostali, protože jste registrován/a jako rodič v MateMax.<br>
                    Report se odesílá každé pondělí ráno za předchozí týden.
                  </div>
                  <div style="margin-top:8px;">
                    <a href="${data.unsubscribe_url}" style="font-size:12px;color:#b0b8c4;text-decoration:underline;">Odhlásit odběr reportů</a>
                    &nbsp;·&nbsp;
                    <a href="https://matematika-snadno.cz" style="font-size:12px;color:#b0b8c4;text-decoration:underline;">matematika-snadno.cz</a>
                  </div>
                </td>
                <td align="right" valign="middle">
                  <div style="font-size:11px;color:#c0c8d0;text-align:right;">
                    🧮 MateMax<br>by Karel Tůma
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
  return raw;
}

export default function ReportPreviewPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(buildHtml(TEST_DATA));
        doc.close();
      }
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "#0D1B3E" }}>
            📧 Týdenní report — preview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Testovací data: Tomáš · streak 7 dní · 42 příkladů · nejslabší: Geometrie
          </p>
        </div>
        <Link
          href="/trenink"
          className="text-sm font-medium px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
          style={{ color: "#2E6DA4" }}
        >
          ← Zpět do tréninku
        </Link>
      </div>

      {/* Testovací data badge */}
      <div className="flex flex-wrap gap-2">
        {[
          `👤 ${TEST_DATA.child_name}`,
          `🔥 streak ${TEST_DATA.streak_days} dní`,
          `📊 ${TEST_DATA.total_examples} příkladů`,
          `✓ ${TEST_DATA.accuracy_pct}% úspěšnost`,
          `⚠️ Slabé: ${TEST_DATA.weak_topic_1}`,
          `💪 Silné: ${TEST_DATA.strong_topic}`,
        ].map((b) => (
          <span key={b} className="text-xs px-2.5 py-1 rounded-full border font-medium" style={{ background: "#F0F5FF", color: "#2E6DA4", borderColor: "#bfdbfe" }}>
            {b}
          </span>
        ))}
      </div>

      {/* Email iframe */}
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-gray-100" style={{ height: "800px" }}>
        <iframe
          ref={iframeRef}
          title="Email report preview"
          className="w-full h-full border-0"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}
