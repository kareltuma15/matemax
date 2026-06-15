"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TEMA_LABELS, PODTEMA_SLOVNI_ORDER, PODTEMA_LABELS } from "@/types";
import { FREE_TOPICS, PREMIUM_TOPICS } from "@/lib/subscription";

interface Props {
  isPremium: boolean;
  onSelectTopic: (tema: string, podtema?: string) => void;
  onStartMix: () => void;
}

function useDiagScores(): Record<string, number> {
  const [scores, setScores] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("matemax-diag-results");
      if (!raw) return;
      const results = JSON.parse(raw) as Record<string, { correct: number; total: number }>;
      const s: Record<string, number> = {};
      for (const [tema, v] of Object.entries(results)) {
        if (v.total > 0) s[tema] = Math.round((v.correct / v.total) * 100);
      }
      setScores(s);
    } catch { /* ignore */ }
  }, []);
  return scores;
}

function DiagDot({ pct }: { pct: number | undefined }) {
  if (pct === undefined) return null;
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <span
      className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
      style={{ background: pct >= 80 ? "#f0fdf4" : pct >= 50 ? "#fffbeb" : "#fef2f2", color }}
    >
      {pct} %
    </span>
  );
}

export default function LoggedInTopicMap({ isPremium, onSelectTopic, onStartMix }: Props) {
  const diagScores = useDiagScores();
  const [expandedSlovni, setExpandedSlovni] = useState(false);
  const allTopics = Object.keys(TEMA_LABELS);
  const freeTopics = allTopics
    .filter((t) => FREE_TOPICS.has(t))
    .sort((a, b) => {
      // Slabá témata (nižší skóre) jdou první; bez diagnostiky na konec
      const sa = diagScores[a] ?? 101;
      const sb = diagScores[b] ?? 101;
      return sa - sb;
    });
  const premiumTopics = allTopics.filter((t) => PREMIUM_TOPICS.has(t));

  // Nejslabší téma (< 50 %) dostane "Začni tady" badge
  const weakestFree = freeTopics.find((t) => (diagScores[t] ?? 101) < 50) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div
        className="rounded-2xl px-5 py-4"
        style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 100%)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-black text-white">📚 Mapa témat</h1>
          {!isPremium && (
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full glass-card"
              style={{ color: "#93c5fd" }}
            >
              {freeTopics.length} / {allTopics.length} zdarma
            </span>
          )}
        </div>
        <p className="text-sm text-blue-300 leading-snug">
          {isPremium
            ? "Máš přístup ke všem tématům. Vyber co chceš procvičovat."
            : "Vyber téma nebo upgraduj na Premium pro všechna témata."}
        </p>
      </div>

      {/* Free topics */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">
          ✅ Zdarma
        </p>
        <div className="flex flex-col gap-2">
          {freeTopics.map((tema) => {
            const isWeakest = tema === weakestFree;
            const score = diagScores[tema];
            const borderColor = score !== undefined
              ? (score < 50 ? "#fca5a5" : score < 80 ? "#fde68a" : "#86efac")
              : "#2E6DA4";
            const bg = score !== undefined
              ? (score < 50 ? "#fff5f5" : score < 80 ? "#fffef0" : "#f0fdf4")
              : "#fff";
            const isSlovni = tema === "slovni_ulohy";
            return (
              <div key={tema} className="flex flex-col gap-2">
                <button
                  onClick={() => (isSlovni ? setExpandedSlovni((v) => !v) : onSelectTopic(tema))}
                  className="w-full rounded-xl border-2 px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow text-left"
                  style={{ borderColor, background: bg }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-800">{TEMA_LABELS[tema]}</span>
                      {isWeakest && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: "#dc2626", color: "#fff" }}>
                          🎯 Začni tady
                        </span>
                      )}
                    </div>
                  </div>
                  <DiagDot pct={score} />
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                    style={{ background: "#eff6ff", color: "#2E6DA4" }}
                  >
                    {isSlovni ? (expandedSlovni ? "Skrýt ▴" : "Vyber typ ▾") : "Procvičovat →"}
                  </span>
                </button>

                {isSlovni && expandedSlovni && (
                  <div className="flex flex-wrap gap-2 pl-2 pb-1">
                    <button
                      onClick={() => onSelectTopic("slovni_ulohy")}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border-2 hover:shadow-sm transition-shadow"
                      style={{ borderColor: "#2E6DA4", color: "#2E6DA4", background: "#fff" }}
                    >
                      Všechny
                    </button>
                    {PODTEMA_SLOVNI_ORDER.map((pt) => (
                      <button
                        key={pt}
                        onClick={() => onSelectTopic("slovni_ulohy", pt)}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 hover:shadow-sm transition-shadow"
                        style={{ background: "#fff", color: "#334155" }}
                      >
                        {PODTEMA_LABELS[pt]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Premium topics */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">
          {isPremium ? "⭐ Premium témata" : "🔒 Premium témata"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {premiumTopics.map((tema) =>
            isPremium ? (
              <button
                key={tema}
                onClick={() => onSelectTopic(tema)}
                className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 flex items-center justify-between hover:shadow-sm transition-shadow text-left"
              >
                <span className="text-xs font-semibold text-slate-700 leading-tight">
                  {TEMA_LABELS[tema]}
                </span>
                <span className="text-xs text-slate-400 shrink-0 ml-1">→</span>
              </button>
            ) : (
              <Link
                key={tema}
                href="/cenik"
                className="bg-slate-50 rounded-xl border border-slate-200 px-3 py-2.5 flex items-center gap-2 opacity-60 hover:opacity-80 transition-opacity"
              >
                <span className="text-base shrink-0">🔒</span>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  {TEMA_LABELS[tema]}
                </p>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Premium CTA */}
      {!isPremium && (
        <Link
          href="/cenik"
          className="block rounded-2xl p-5 text-center hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <p className="text-base font-black text-white">⭐ Odemkni všechna témata</p>
          <p className="text-sm text-blue-200 mt-1">
            Premium — všech {allTopics.length} témat · 99 Kč/měsíc
          </p>
        </Link>
      )}

      {/* Rychlý mód CTA */}
      <Link
        href="/rychly-mod"
        className="w-full rounded-xl border-2 border-dashed px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
        style={{ borderColor: "#0D1B3E" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">⚡</span>
          <div>
            <p className="text-sm font-bold text-slate-800">Rychlý mód</p>
            <p className="text-xs text-slate-400">10 příkladů · 60 sekund</p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "#0D1B3E", color: "#fff" }}>
          Hrát →
        </span>
      </Link>

      {/* Mix CTA */}
      <button
        onClick={onStartMix}
        className="w-full py-3 text-slate-500 font-medium rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition-colors"
      >
        🎲 Mixovat dostupná témata
      </button>
    </div>
  );
}
