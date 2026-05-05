"use client";

import Link from "next/link";
import { TEMA_LABELS } from "@/types";

interface Props {
  tema: string;
  cardNumber: number;
  total: number;
  onSkip: () => void;
}

export default function UpgradeCard({ tema, cardNumber, total, onSkip }: Props) {
  const topicLabel = TEMA_LABELS[tema] ?? tema;
  const progressPct = (cardNumber / total) * 100;

  return (
    <div className="card-enter bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-5">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-xs mb-2 gap-2">
          <span className="font-semibold text-slate-500 shrink-0">{cardNumber} / {total}</span>
          <span
            className="font-semibold px-2 py-0.5 rounded-full text-[11px] shrink-0 whitespace-nowrap"
            style={{ background: "#eff6ff", color: "#2E6DA4" }}
          >
            {topicLabel}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-3 rounded-full"
            style={{ width: `${progressPct}%`, background: "#0D1B3E" }}
          />
        </div>
      </div>

      {/* Lock icon + message */}
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
          style={{ background: "#f1f5f9" }}
        >
          🔒
        </div>
        <div>
          <h3 className="text-xl font-black" style={{ color: "#0D1B3E" }}>
            Toto téma je v Premium
          </h3>
          <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
            Téma <strong>{topicLabel}</strong> je dostupné jen v Premium.
            Odemkni všech 9 témat za 99 Kč/měsíc.
          </p>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-col gap-2">
        <Link
          href="/cenik"
          className="block w-full py-3.5 text-white font-black rounded-xl text-center text-base"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          Vyzkoušet Premium →
        </Link>
        <button
          onClick={onSkip}
          className="w-full py-2.5 text-slate-500 font-medium rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition-colors"
        >
          Přeskočit →
        </button>
      </div>
    </div>
  );
}
