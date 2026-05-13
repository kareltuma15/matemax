"use client";

import Link from "next/link";

type ModalType = "diagnostika" | "comeback";

interface Props {
  type: ModalType;
  daysSince?: number;
  onClose: () => void;
}

export default function GuidanceModal({ type, daysSince, onClose }: Props) {
  if (type === "diagnostika") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl fade-in-up"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="px-6 py-7 text-center"
            style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
          >
            <p className="text-5xl mb-3">🎯</p>
            <h2 className="text-xl font-black text-white">Kde začít?</h2>
            <p className="text-sm text-blue-200 mt-1">Diagnostika ti ušetří hodiny zbytečného procvičování</p>
          </div>

          {/* Body */}
          <div className="p-6 flex flex-col gap-4">
            <ul className="flex flex-col gap-3">
              {[
                ["🔬", "Zjistíme, kde máš mezery", "Krátký test — 18 otázek, ~8 minut"],
                ["🧠", "Trénink přizpůsobený tobě", "Algoritmus se zaměří přesně na slabá místa"],
                ["📈", "Výsledky ihned", "Po testu uvidíš svoji mapu silných a slabých témat"],
              ].map(([icon, title, sub]) => (
                <li key={title as string} className="flex items-start gap-3">
                  <span className="text-2xl shrink-0 mt-0.5">{icon}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                  </div>
                </li>
              ))}
            </ul>

            <Link
              href="/diagnostika"
              onClick={onClose}
              className="block w-full py-3.5 text-white font-black rounded-xl text-base text-center"
              style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
            >
              Spustit diagnostiku →
            </Link>
            <button
              onClick={onClose}
              className="w-full py-2.5 text-slate-400 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Přeskočit, chci rovnou trénovat
            </button>
          </div>
        </div>
      </div>
    );
  }

  // comeback
  const daysText = daysSince === 1 ? "1 den" : `${daysSince} dní`;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-7 text-center"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <p className="text-5xl mb-3">🏃</p>
          <h2 className="text-xl font-black text-white">Vítej zpět!</h2>
          <p className="text-sm text-blue-200 mt-1">
            Chyběl jsi {daysText}. Přijímačky se blíží!
          </p>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          <div
            className="rounded-xl p-4"
            style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}
          >
            <p className="text-xs font-bold text-cyan-700 mb-1">Věděl jsi, že…</p>
            <p className="text-xs text-cyan-700 leading-relaxed">
              Pravidelné mini-procvičování (10 min denně) je 3× efektivnější než delší, ale nepravidelné sezení.
              Stačí jeden trénink a streak znovu začne hořet!
            </p>
          </div>

          <Link
            href="/trenink"
            onClick={onClose}
            className="block w-full py-3.5 text-white font-black rounded-xl text-base text-center"
            style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
          >
            Pokračovat v tréninku →
          </Link>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-slate-400 text-sm font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
}
