"use client";
import { getAllBadges, BadgeConfig, BadgeRarity } from "@/lib/gamification";

interface BadgeGridProps {
  earnedBadgeIds: string[];
}

const RARITY_BORDER: Record<BadgeRarity, string> = {
  common:    "#cbd5e1",
  uncommon:  "#86efac",
  rare:      "#93c5fd",
  epic:      "#c4b5fd",
  legendary: "#fcd34d",
};

const RARITY_LABEL: Record<BadgeRarity, string> = {
  common:    "Běžný",
  uncommon:  "Neobvyklý",
  rare:      "Vzácný",
  epic:      "Epický",
  legendary: "Legendární",
};

function BadgeItem({ badge, earned }: { badge: BadgeConfig; earned: boolean }) {
  return (
    <div
      title={`${badge.label}\n${badge.description}\n(${RARITY_LABEL[badge.rarity]})`}
      className="flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all"
      style={{
        borderColor: earned ? RARITY_BORDER[badge.rarity] : "#e2e8f0",
        background: earned ? "white" : "#f8fafc",
        opacity: earned ? 1 : 0.4,
      }}
    >
      <span className="text-2xl" style={{ filter: earned ? "none" : "grayscale(1)" }}>
        {badge.icon_emoji}
      </span>
      <p className="text-[10px] font-semibold text-center text-slate-700 leading-tight line-clamp-2 w-full">
        {badge.label}
      </p>
    </div>
  );
}

export default function BadgeGrid({ earnedBadgeIds }: BadgeGridProps) {
  const all = getAllBadges();
  const earnedSet = new Set(earnedBadgeIds);
  const earned = all.filter((b) => earnedSet.has(b.id));
  const locked = all.filter((b) => !earnedSet.has(b.id));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Odznaky</h2>
        <span className="text-xs text-slate-400 font-medium">
          {earned.length} / {all.length}
        </span>
      </div>

      {earned.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-2">
            Získané
          </p>
          <div className="grid grid-cols-4 gap-2">
            {earned.map((b) => (
              <BadgeItem key={b.id} badge={b} earned />
            ))}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wide font-bold text-slate-400 mb-2">
            Zbývá získat
          </p>
          <div className="grid grid-cols-4 gap-2">
            {locked.map((b) => (
              <BadgeItem key={b.id} badge={b} earned={false} />
            ))}
          </div>
        </div>
      )}

      {all.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">Žádné odznaky k zobrazení</p>
      )}
    </div>
  );
}
