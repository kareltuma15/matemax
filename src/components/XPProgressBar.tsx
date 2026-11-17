"use client";
import { useState, useEffect } from "react";
import { urovenZXP } from "@/lib/urovne";

interface XPProgressBarProps {
  xp: number;
  className?: string;
}

/** XP úroveň s postupem k další (stejná čísla jako na Domově a ve Sbírce v Cestě úrovní). */
export default function XPProgressBar({ xp, className = "" }: XPProgressBarProps) {
  const u = urovenZXP(xp);
  const targetPct = Math.min(100, Math.round(u.podil * 100));
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setDisplayPct(targetPct));
    return () => cancelAnimationFrame(id);
  }, [targetPct]);

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl grid place-items-center font-black text-white" style={{ background: "#5B55D6" }}>{u.n}</span>
          <div>
            <p className="text-[10px] text-slate-400 leading-none uppercase tracking-wide">Úroveň {u.n}</p>
            <p className="text-sm font-black leading-tight" style={{ color: "#0D1B3E" }}>{u.hodnost.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-black" style={{ color: "#2E6DA4" }}>⚡ {xp} XP</p>
          <p className="text-[10px] text-slate-400">{u.do - xp} XP do další úrovně</p>
        </div>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
        <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${displayPct}%`, background: "#F5A623" }} />
      </div>
    </div>
  );
}
