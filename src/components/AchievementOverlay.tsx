"use client";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { getBadgeConfig, BadgeRarity } from "@/lib/gamification";

interface Props {
  badgeId: string;
  onDismiss: () => void;
}

const RARITY_LABEL: Record<BadgeRarity, string> = {
  common:    "Běžný",
  uncommon:  "Neobvyklý",
  rare:      "Vzácný",
  epic:      "Epický",
  legendary: "Legendární",
};

const RARITY_COLOR: Record<BadgeRarity, string> = {
  common:    "#64748b",
  uncommon:  "#16a34a",
  rare:      "#2563eb",
  epic:      "#7c3aed",
  legendary: "#d97706",
};

export default function AchievementOverlay({ badgeId, onDismiss }: Props) {
  const badge = getBadgeConfig(badgeId);

  useEffect(() => {
    if (!badge) return;

    const color = RARITY_COLOR[badge.rarity];
    const particles = badge.rarity === "legendary" ? 280 : badge.rarity === "epic" ? 180 : 120;

    confetti({
      particleCount: particles,
      spread: 85,
      origin: { y: 0.45 },
      colors: [color, "#ffffff", "#2E6DA4", "#00B4D8"],
    });

    if (badge.rarity === "legendary") {
      setTimeout(() => {
        confetti({ particleCount: 160, spread: 130, origin: { y: 0.3 }, startVelocity: 50 });
      }, 350);
    }

    const t = setTimeout(onDismiss, badge.rarity === "legendary" ? 5000 : 3800);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!badge) return null;
  const color = RARITY_COLOR[badge.rarity];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center modal-overlay"
      style={{ background: "rgba(13,27,62,0.85)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={onDismiss}
    >
      <div
        className="modal-spring flex flex-col items-center text-center px-8 py-10 rounded-3xl shadow-2xl mx-4 w-full"
        style={{ background: "white", maxWidth: 360, border: `3px solid ${color}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="text-7xl mb-4"
          style={{
            filter: `drop-shadow(0 0 18px ${color}99)`,
            animation: "xp-bounce 0.55s cubic-bezier(0.34,1.56,0.64,1) both",
          }}
        >
          {badge.icon_emoji}
        </div>

        <span
          className="text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3"
          style={{ background: `${color}22`, color }}
        >
          {RARITY_LABEL[badge.rarity]} odznak
        </span>

        <h2 className="text-2xl font-black text-slate-900 mb-2 leading-tight">{badge.label}</h2>
        <p className="text-sm text-slate-500 mb-5 leading-relaxed">{badge.ui.toast_text}</p>

        <div
          className="flex items-center gap-2 mb-6 px-5 py-2 rounded-full"
          style={{ background: "#f0f7ff" }}
        >
          <span className="text-lg">⚡</span>
          <span className="font-black text-blue-700">+{badge.xp_reward} XP získáno!</span>
        </div>

        <button
          onClick={onDismiss}
          className="w-full py-3 rounded-xl font-bold text-white text-base press-scale"
          style={{ background: color }}
        >
          Pokračovat →
        </button>
      </div>
    </div>
  );
}
