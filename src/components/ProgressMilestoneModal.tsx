"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

const MILESTONE_CONFIG: Record<number, { emoji: string; headline: string; color: string; bg: string; border: string }> = {
  10:  { emoji: "🎯", headline: "Prvních 10 příkladů!",    color: "#2563eb", bg: "#eff6ff",  border: "#bfdbfe" },
  25:  { emoji: "⚡", headline: "25 příkladů zvládnuto!",  color: "#7c3aed", bg: "#f5f3ff",  border: "#ddd6fe" },
  50:  { emoji: "🔥", headline: "Půlstoovka příkladů!",    color: "#d97706", bg: "#fffbeb",  border: "#fde68a" },
  100: { emoji: "💎", headline: "100 příkladů — skvělé!",  color: "#dc2626", bg: "#fef2f2",  border: "#fecaca" },
  250: { emoji: "🚀", headline: "250 příkladů — šampion!", color: "#059669", bg: "#f0fdf4",  border: "#bbf7d0" },
  500: { emoji: "🏆", headline: "500 příkladů — legenda!", color: "#0D1B3E", bg: "#f8faff",  border: "#bfdbfe" },
};

interface Props {
  count: number;
  xpBonus: number;
  onClose: () => void;
}

export default function ProgressMilestoneModal({ count, xpBonus, onClose }: Props) {
  const cfg = MILESTONE_CONFIG[count] ?? {
    emoji: "🎯",
    headline: `${count} příkladů!`,
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
  };

  useEffect(() => {
    confetti({ particleCount: 140, spread: 75, origin: { y: 0.45 } });
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
          {count} příkladů!
        </p>
        <p className="text-base font-bold text-slate-700 mb-2">{cfg.headline}</p>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">
          Každý příklad tě posouvá blíž k přijímačkám. Takhle se to dělá!
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
