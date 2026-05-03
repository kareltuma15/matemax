"use client";

import Link from "next/link";

interface Props {
  correct: number;
  total: number;
  onRestart: () => void;
}

export default function SessionSummary({ correct, total, onRestart }: Props) {
  const pct = Math.round((correct / total) * 100);
  const emoji = pct >= 80 ? "🎉" : pct >= 50 ? "💪" : "📚";
  const colorClass = pct >= 80 ? "text-green-600" : pct >= 50 ? "text-amber-500" : "text-red-500";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center flex flex-col gap-5">
      <div className="text-5xl">{emoji}</div>
      <div>
        <h2 className="text-2xl font-bold mb-1" style={{ color: "#0D1B3E" }}>Skvělá práce!</h2>
        <p className="text-slate-500 text-sm">Výsledky tohoto kola</p>
      </div>
      <div className={`text-6xl font-black ${colorClass}`}>{pct} %</div>
      <p className="text-slate-600">
        Správně: <strong>{correct}</strong> z <strong>{total}</strong>
      </p>
      <p className="text-xs text-slate-400 max-w-xs mx-auto">
        Chybné příklady se ti vrátí brzy díky spaced repetition (SM-2 algoritmus).
      </p>
      <div className="flex flex-col gap-2 mt-2">
        <button
          onClick={onRestart}
          className="w-full py-3 text-white font-semibold rounded-xl text-base"
          style={{ background: "#0D1B3E" }}
        >
          Trénovat znovu
        </button>
        <Link
          href="/"
          className="w-full py-2.5 text-slate-600 font-medium rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition-colors"
        >
          Zpět na úvod
        </Link>
      </div>
    </div>
  );
}
