"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { LevelData } from "@/lib/gamification";

interface Props {
  level: LevelData;
  onClose: () => void;
}

export default function LevelUpModal({ level, onClose }: Props) {
  useEffect(() => {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.4 } });
    confetti({ particleCount: 80, spread: 100, origin: { y: 0.6 }, angle: 60 });
    confetti({ particleCount: 80, spread: 100, origin: { y: 0.6 }, angle: 120 });
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="px-6 py-8 text-center"
          style={{ background: level.progress_bar_color }}
        >
          <p className="text-6xl mb-3">{level.icon_emoji}</p>
          <p className="text-sm font-bold text-white/70 uppercase tracking-widest mb-1">
            Level Up!
          </p>
          <h2 className="text-2xl font-black text-white">{level.rank_title}</h2>
          <p className="text-sm text-white/70 mt-1">{level.label}</p>
        </div>

        <div className="p-6 flex flex-col gap-4 text-center">
          <p className="text-sm text-slate-600 leading-relaxed">
            Skvělá práce! Dosáhl jsi nové úrovně 🎉
            <br />
            Pokračuj a odemkni ještě víc odměn.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3.5 text-white font-black rounded-xl text-base"
            style={{ background: "#0D1B3E" }}
          >
            Pokračovat! 🚀
          </button>
        </div>
      </div>
    </div>
  );
}
