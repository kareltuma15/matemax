"use client";
import { useState, useEffect } from "react";
import { getLevelFromXP, xpToNextLevel } from "@/lib/gamification";

interface XPProgressBarProps {
  xp: number;
  className?: string;
}

export default function XPProgressBar({ xp, className = "" }: XPProgressBarProps) {
  const level = getLevelFromXP(xp);
  const toNext = xpToNextLevel(xp);

  const levelXP = xp - level.xp_min;
  const levelTotal = level.xp_max !== null ? level.xp_max + 1 - level.xp_min : null;
  const targetPct = levelTotal !== null ? Math.min(100, Math.round((levelXP / levelTotal) * 100)) : 100;

  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDisplayPct(targetPct));
    return () => cancelAnimationFrame(id);
  }, [targetPct]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{level.icon_emoji}</span>
          <div>
            <p className="text-[10px] text-slate-400 leading-none uppercase tracking-wide">Úroveň</p>
            <p className="text-sm font-black leading-tight" style={{ color: level.color }}>
              {level.rank_title}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-black" style={{ color: "#2E6DA4" }}>⚡ {xp} XP</p>
          {toNext !== null ? (
            <p className="text-[10px] text-slate-400">{toNext} XP do dalšího levelu</p>
          ) : (
            <p className="text-[10px] text-slate-400">Maximální level!</p>
          )}
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-2.5 rounded-full transition-all duration-700"
          style={{ width: `${displayPct}%`, background: level.progress_bar_color }}
        />
      </div>
    </div>
  );
}
