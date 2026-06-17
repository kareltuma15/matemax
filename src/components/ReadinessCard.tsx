"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getReadiness, ReadinessData } from "@/lib/readiness";

function Gauge({ score, color }: { score: number; color: string }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg viewBox="0 0 100 100" className="w-28 h-28 shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="10" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="46" textAnchor="middle" dominantBaseline="middle"
        fontSize="18" fontWeight="800" fill={color}>
        {score}%
      </text>
      <text x="50" y="63" textAnchor="middle" fontSize="8" fill="#94a3b8" fontWeight="500">
        připravenost
      </text>
    </svg>
  );
}

export default function ReadinessCard() {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => { setData(getReadiness()); }, []);

  if (!data) return null;

  const topicsToShow = expanded ? data.topics : data.topics.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-5">
          <Gauge score={data.score} color={data.color} />

          <div className="flex flex-col gap-1.5 min-w-0">
            <span
              className="text-sm font-extrabold leading-tight"
              style={{ color: data.color }}
            >
              {data.label}
            </span>

            {!data.hasData ? (
              <p className="text-xs text-slate-400 leading-relaxed">
                Udělej diagnostiku nebo začni trénovat — skóre se zobrazí po prvních příkladech.
              </p>
            ) : data.weakest ? (
              <div className="text-xs text-slate-600 leading-relaxed">
                <span className="text-slate-400">Nejslabší: </span>
                <span className="font-semibold" style={{ color: "#dc2626" }}>
                  {data.weakest.label}
                </span>
                <span className="text-slate-400"> ({data.weakest.score}%)</span>
              </div>
            ) : null}

            {data.weakest && (
              <Link
                href={`/trenink?tema=${data.weakest.tema}`}
                className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg w-fit mt-1"
                style={{ background: "#eff6ff", color: "#2E6DA4" }}
              >
                💪 Procvičit {data.weakest.label} →
              </Link>
            )}

            {!data.hasData && (
              <Link
                href="/diagnostika"
                className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg w-fit mt-1"
                style={{ background: "#eff6ff", color: "#2E6DA4" }}
              >
                🎯 Spustit diagnostiku →
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Topic bars */}
      {data.hasData && (
        <div className="border-t border-slate-100 px-5 py-3 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
            Témata
          </p>
          {topicsToShow.map((t) => {
            const barColor = t.score >= 70 ? "#22c55e" : t.score >= 40 ? "#f59e0b" : "#ef4444";
            const textColor = t.score >= 70 ? "#16a34a" : t.score >= 40 ? "#92400e" : "#991b1b";
            const isZero = t.score === 0 && t.practiced === 0;
            return (
              <div key={t.tema} className="flex items-center gap-2">
                <span className="text-xs text-slate-600 w-28 shrink-0 truncate">{t.label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  {!isZero && (
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${t.score}%`, background: barColor }}
                    />
                  )}
                </div>
                <span className="text-xs font-bold w-8 text-right shrink-0"
                  style={{ color: isZero ? "#cbd5e1" : textColor }}>
                  {isZero ? "—" : `${t.score}%`}
                </span>
              </div>
            );
          })}

          {data.topics.length > 5 && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-semibold text-blue-500 hover:text-blue-700 transition-colors text-left mt-1"
            >
              {expanded ? "Zobrazit méně ↑" : `Zobrazit všechna témata (${data.topics.length}) ↓`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
