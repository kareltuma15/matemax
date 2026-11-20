"use client";

import ProRodice from "@/components/ProRodice";
import { TEMA_LABELS } from "@/types";

interface Props {
  tema: string;
  cardNumber: number;
  total: number;
  onSkip: () => void;
}

/**
 * Příklad ze zamčeného tématu v tréninku. Dítěti jen věcně, že téma je v Premium, a hlavní tlačítko
 * pokračuje dál. Cena a Premium jen v rámečku Pro rodiče (Karel 20. 11. 2026: žádné „Odemkni za 99 Kč“
 * ani „Vyzkoušet Premium“ pro dítě).
 */
export default function UpgradeCard({ tema, cardNumber, total, onSkip }: Props) {
  const topicLabel = TEMA_LABELS[tema] ?? tema;
  const progressPct = (cardNumber / total) * 100;

  return (
    <div className="card-enter bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col gap-5" data-testid="upgrade-card">
      <div>
        <div className="flex items-center justify-between text-xs mb-2 gap-2">
          <span className="karta-poradi font-semibold text-slate-500 shrink-0">{cardNumber} / {total}</span>
          <span className="font-semibold px-2 py-0.5 rounded-full text-[11px] shrink-0 whitespace-nowrap" style={{ background: "#eff6ff", color: "#2E6DA4" }}>
            {topicLabel}
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div className="h-3 rounded-full" style={{ width: `${progressPct}%`, background: "#0D1B3E" }} />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl" style={{ background: "#f1f5f9" }} aria-hidden>🔒</div>
        <div>
          <h3 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>Toto téma je v Premium</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
            Příklady z tématu <strong>{topicLabel}</strong> patří do Premium. Pokračuj dalším příkladem.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="block w-full py-3.5 font-black rounded-xl text-center text-base"
        style={{ background: "#F5A623", color: "#0D1B3E" }}
      >
        Pokračovat →
      </button>

      <ProRodice trida={tema.startsWith("p5_") ? 5 : 9} kompaktni />
    </div>
  );
}
