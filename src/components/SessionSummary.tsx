"use client";

import Link from "next/link";
import { TEMA_LABELS } from "@/types";

interface Props {
  correct: number;
  total: number;
  xpEarned: number;
  streak: number;
  topics: string[];
  onRestart: () => void;
}

export default function SessionSummary({ correct, total, xpEarned, streak, topics, onRestart }: Props) {
  const pct = Math.round((correct / total) * 100);

  const tier = pct >= 80 ? "great" : pct >= 50 ? "good" : "low";
  const headerBg    = tier === "great" ? "#dcfce7" : tier === "good" ? "#dbeafe" : "#ffedd5";
  const headerColor = tier === "great" ? "#166534" : tier === "good" ? "#1e40af" : "#9a3412";
  const title       = tier === "great" ? "Výborně! 🏆" : tier === "good" ? "Dobrá práce! 💪" : "Nevzdávej to! 🔥";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Colored header */}
      <div className="px-8 py-7 text-center" style={{ background: headerBg }}>
        <h2 className="text-2xl font-bold" style={{ color: headerColor }}>{title}</h2>
        <p className="text-6xl font-black mt-3" style={{ color: headerColor }}>{pct} %</p>
        <p className="mt-2 text-sm font-medium" style={{ color: headerColor, opacity: 0.75 }}>
          {correct} z {total} správně
        </p>
      </div>

      <div className="p-6 flex flex-col gap-4">
        {/* XP + Streak */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-center">
            <p className="text-xs text-indigo-400 font-medium mb-0.5">Získal jsi</p>
            <p className="text-xl font-black text-indigo-600">+{xpEarned} XP</p>
          </div>
          <div className="flex-1 rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
            <p className="text-xs text-orange-400 font-medium mb-0.5">Streak</p>
            <p className="text-xl font-black text-orange-500">🔥 {streak} dní</p>
          </div>
        </div>

        {/* Topics */}
        {topics.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 font-medium mb-2">Procvičoval jsi</p>
            <div className="flex flex-wrap gap-1.5">
              {topics.map((tema) => (
                <span
                  key={tema}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "#e0e7ff", color: "#3730a3" }}
                >
                  {TEMA_LABELS[tema] ?? tema}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 text-center">
          Chybné příklady se ti vrátí brzy — SM-2 spaced repetition
        </p>

        <div className="flex flex-col gap-2 mt-1">
          <button
            onClick={onRestart}
            className="w-full py-3 text-white font-semibold rounded-xl text-base"
            style={{ background: "#0D1B3E" }}
          >
            Trénovat znovu →
          </button>
          <Link
            href="/"
            className="block w-full py-2.5 text-slate-600 font-medium rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition-colors text-center"
          >
            Zpět na úvod
          </Link>
        </div>
      </div>
    </div>
  );
}
