"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { getBadgeConfig, BadgeRarity } from "@/lib/gamification";

interface BadgeToastProps {
  badgeId: string;
  onDismiss: () => void;
}

const RARITY_COLOR: Record<BadgeRarity, string> = {
  common:    "#64748b",
  uncommon:  "#16a34a",
  rare:      "#2563eb",
  epic:      "#7c3aed",
  legendary: "#d97706",
};

export default function BadgeToast({ badgeId, onDismiss }: BadgeToastProps) {
  const badge = getBadgeConfig(badgeId);

  useEffect(() => {
    if (!badge) return;

    if (badge.rarity === "legendary") {
      confetti({ particleCount: 160, spread: 70, origin: { y: 0.15 } });
    } else if (badge.rarity === "epic" || badge.rarity === "rare") {
      confetti({ particleCount: 80, spread: 55, origin: { y: 0.15 } });
    }

    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!badge) return null;

  const color = RARITY_COLOR[badge.rarity];

  return (
    <div
      className="fixed top-4 left-1/2 z-50 animate-slide-down"
      style={{ minWidth: "280px", maxWidth: "340px" }}
    >
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl cursor-pointer"
        style={{ background: "white", border: `2.5px solid ${color}` }}
        onClick={onDismiss}
      >
        <span className="text-3xl shrink-0">{badge.icon_emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
            Nový odznak!
          </p>
          <p className="text-sm font-black text-slate-800 leading-tight">{badge.label}</p>
          <p className="text-xs text-slate-500 truncate">{badge.ui.toast_text}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-black" style={{ color: "#2E6DA4" }}>+{badge.xp_reward} XP</p>
        </div>
      </div>
    </div>
  );
}
