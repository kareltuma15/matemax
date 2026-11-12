"use client";

import { useState } from "react";
import { buildReportHtml, type ReportData } from "@/lib/report-rodice";
import { BODY_TEMAT } from "@/lib/odhad-vypocet";
import { temaLabel } from "@/types";

// Náhled pondělního e-mailu rodičům s ukázkovými daty (nikomu se nic neposílá).

function ukazka(trida: 5 | 9, varianta: "data" | "prvni" | "bez"): ReportData {
  const pomer: Record<string, number> = trida === 9
    ? { zlomky: 0.82, vyrazy: 0.6, rovnice: 0.48, geometrie: 0.35, slovni_ulohy: 0.3, grafy_logika: 0.7, konstrukce: 0.1, uhly: 0.45 }
    : { p5_pocitani: 0.8, p5_jednotky: 0.55, p5_slovni: 0.35, p5_zlomky: 0.5, p5_obsah: 0.4, p5_telesa: 0.2, p5_rysovani: 0.3, p5_grafy: 0.65 };
  const temata = Object.entries(BODY_TEMAT[trida]).map(([tema, max]) => ({ tema, label: temaLabel(tema), max, body: Math.round(max * pomer[tema] * 10) / 10 }));
  const celkem = Math.round(temata.reduce((a, t) => a + t.body, 0));
  const rezerva = [...temata].sort((a, b) => (b.max - b.body) - (a.max - a.body))[0];
  const tydny = varianta === "data" ? [14, 15, 17, 17, 19, 21].map((b, i) => ({ d: `2026-${i < 2 ? "10" : "11"}-${String([19, 26, 2, 9, 16, 23][i]).padStart(2, "0")}`, b })) : [];
  return {
    childName: trida === 9 ? "Tomáš" : "Ema",
    weekDate: "16. listopadu 2026",
    weekTotal: varianta === "bez" ? 0 : 47,
    lastWeekTotal: varianta === "bez" ? 0 : 38,
    streak: varianta === "bez" ? 0 : 5,
    accuracy: varianta === "bez" ? null : 72,
    odhad: {
      trida, celkem, max: 50, bezDat: varianta === "bez", cil: varianta === "data" ? 32 : null, temata,
      nejvicBodu: { label: rezerva.label, chybi: Math.round(rezerva.max - rezerva.body) },
      tydny, zmena: varianta === "data" ? celkem - 21 : null,
    },
  };
}

export default function ReportPreviewPage() {
  const [trida, setTrida] = useState<5 | 9>(9);
  const [varianta, setVarianta] = useState<"data" | "prvni" | "bez">("data");
  const html = buildReportHtml(ukazka(trida, varianta));
  const tl = (aktivni: boolean) =>
    `px-3 py-1.5 rounded-full text-sm font-bold cursor-pointer transition-colors ${aktivni ? "bg-[#0D1B3E] text-white" : "bg-white text-[#0D1B3E] border border-[#E4E6EF] hover:border-[#4741B8]"}`;

  return (
    <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
      <div>
        <h1 className="text-xl font-extrabold" style={{ color: "#0D1B3E" }}>Týdenní e-mail rodičům: náhled</h1>
        <p className="text-sm mt-0.5" style={{ color: "#5F6982" }}>Ukázková data, nikomu se nic neposílá.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={tl(trida === 9)} onClick={() => setTrida(9)}>9. třída</button>
        <button type="button" className={tl(trida === 5)} onClick={() => setTrida(5)}>5. třída</button>
        <span className="w-px bg-[#E4E6EF] mx-1" />
        <button type="button" className={tl(varianta === "data")} onClick={() => setVarianta("data")}>Po pár týdnech</button>
        <button type="button" className={tl(varianta === "prvni")} onClick={() => setVarianta("prvni")}>První report</button>
        <button type="button" className={tl(varianta === "bez")} onClick={() => setVarianta("bez")}>Dítě ještě nezačalo</button>
      </div>
      <div className="rounded-xl overflow-hidden border border-[#E4E6EF] bg-[#EEF0F8]" style={{ height: 1100 }}>
        <iframe title="Náhled e-mailu" className="w-full h-full border-0" sandbox="" srcDoc={html} data-testid="report-nahled" />
      </div>
    </div>
  );
}
