"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

const MILESTONE_CONFIG: Record<number, { emoji: string; headline: string; color: string; bg: string; border: string }> = {
  7:   { emoji: "🌟", headline: "Týden bez přerušení!",   color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  14:  { emoji: "🔥", headline: "14 dní bez výpadku!",   color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  30:  { emoji: "💎", headline: "Celý měsíc tréninku!",  color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  60:  { emoji: "🚀", headline: "2 měsíce šampiona!",    color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  100: { emoji: "🏆", headline: "100 dní — legenda!",    color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
};

interface Props {
  streak: number;
  xpBonus: number;
  onClose: () => void;
}

export default function StreakMilestoneModal({ streak, xpBonus, onClose }: Props) {
  const cfg = MILESTONE_CONFIG[streak] ?? {
    emoji: "🔥",
    headline: `${streak} dní v řadě!`,
    color: "#d97706",
    bg: "#fffbeb",
    border: "#fde68a",
  };

  useEffect(() => {
    confetti({ particleCount: 160, spread: 80, origin: { y: 0.4 } });
    const timer = setTimeout(onClose, 7000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="rounded-2xl p-8 max-w-xs w-full text-center shadow-2xl modal-spring"
        style={{ background: cfg.bg, border: `2px solid ${cfg.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-7xl mb-4 leading-none">{cfg.emoji}</p>
        <p className="text-3xl font-black mb-1" style={{ color: cfg.color }}>
          {streak} dní streak!
        </p>
        <p className="text-base font-bold text-slate-700 mb-2">{cfg.headline}</p>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          Takhle se připravují šampioni. Nevzdávej to ani zítra!
        </p>
        <div
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-lg mb-5"
          style={{ background: cfg.color, color: "#fff" }}
        >
          +{xpBonus} XP 🎁
        </div>
        <button
          onClick={onClose}
          className="block w-full py-2.5 rounded-xl font-semibold text-sm transition-colors"
          style={{ background: "rgba(0,0,0,0.07)", color: cfg.color }}
        >
          Pokračovat →
        </button>
      </div>
    </div>
  );
}
