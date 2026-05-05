"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

interface Props {
  correct: number;
  total: number;
  onClose: () => void;
}

const MESSAGES = [
  "Výborný začátek! Vrať se zítra a streak začne hořet 🔥",
  "Skvělý první trénink! Zítra to půjde ještě líp 💪",
  "Perfektní! Věda říká: denní procvičování 10× zlepší výsledky 🧠",
];

export default function FirstSessionModal({ correct, total, onClose }: Props) {
  const router = useRouter();
  const pct = Math.round((correct / total) * 100);
  const message = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];

  useEffect(() => {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.4 } });
  }, []);

  function goToProfile() {
    onClose();
    router.push("/profil");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
    >
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div
          className="px-6 py-7 text-center"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <p className="text-5xl mb-3">🏆</p>
          <h2 className="text-2xl font-black text-white">První trénink dokončen!</h2>
          <p className="text-sm text-blue-200 mt-1">
            {correct} z {total} správně — {pct} %
          </p>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-slate-600 text-center leading-relaxed">
            {message}
          </p>

          {/* Motivační hint */}
          <div
            className="rounded-xl p-4 text-center"
            style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}
          >
            <p className="text-xs font-bold text-cyan-700 mb-0.5">Věděl jsi, že…</p>
            <p className="text-xs text-cyan-600 leading-relaxed">
              MateMax si pamatuje každou tvoji chybu a příklad zopakuje přesně ve chvíli, kdy ho začínáš zapomínat.
            </p>
          </div>

          {/* Buttons */}
          <button
            onClick={goToProfile}
            className="w-full py-3.5 text-white font-black rounded-xl text-base"
            style={{ background: "#0D1B3E" }}
          >
            Zobrazit svůj profil →
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-slate-500 font-medium rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition-colors"
          >
            Pokračovat v tréninku
          </button>
        </div>
      </div>
    </div>
  );
}
