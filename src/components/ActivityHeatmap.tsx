"use client";

import { useEffect, useState } from "react";
import { dnyTreninku } from "@/lib/storage";
import { localDateStr, pondeliTydne } from "@/lib/date";

const DAY_LABELS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

export default function ActivityHeatmap() {
  const [practiceSet, setPracticeSet] = useState<Set<string>>(new Set());
  const [totalPracticed, setTotalPracticed] = useState(0);

  useEffect(() => {
    // Tréninky z prohlížeče i ze serveru (trénink na telefonu je vidět i na počítači); po obnově ze serveru znovu
    function nacti() {
      const dates = new Set([...dnyTreninku()].filter(([, n]) => n > 0).map(([d]) => d));
      setPracticeSet(dates);
      setTotalPracticed(dates.size);
    }
    nacti();
    window.addEventListener("matemax-progress-update", nacti);
    return () => window.removeEventListener("matemax-progress-update", nacti);
  }, []);

  // Build grid: 8 columns (weeks) × 7 rows (Mon–Sun)
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);
  const todayStr = localDateStr(todayDate);

  // Poslední sloupec = tento týden (Po–Ne), začátek = pondělí o 7 týdnů dřív.
  // (Dřív se počítalo „dnes − 55 dní → pondělí“, takže mřížka končila minulou nedělí
  // a trénink z tohoto týdne se v ní nikdy nezabarvil.)
  const startDate = pondeliTydne(todayDate, 7);

  // 8 weeks × 7 days matrix [row=weekday][col=week]
  const grid: Array<Array<{ date: string; practiced: boolean; isToday: boolean; isFuture: boolean }>> =
    Array.from({ length: 7 }, () => []);

  for (let week = 0; week < 8; week++) {
    for (let day = 0; day < 7; day++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + week * 7 + day);
      const dateStr = localDateStr(d);
      const isFuture = d > todayDate;
      grid[day].push({
        date: dateStr,
        practiced: !isFuture && practiceSet.has(dateStr),
        isToday: dateStr === todayStr,
        isFuture,
      });
    }
  }

  // Count current streak from today backwards
  let streak = 0;
  const checkDate = new Date(todayDate);
  while (true) {
    const s = localDateStr(checkDate);
    if (practiceSet.has(s)) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else break;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
          📅 Aktivita — posledních 8 týdnů
        </p>
        {streak > 1 && (
          <span className="text-xs font-bold text-orange-500">🔥 {streak} dní streak</span>
        )}
      </div>

      <div className="flex gap-1">
        {/* Day-of-week labels */}
        <div className="flex flex-col gap-1 mr-1">
          {DAY_LABELS.map((label, i) => (
            <div key={i} className="h-6 flex items-center">
              <span className="text-[9px] text-slate-300 w-4">{label}</span>
            </div>
          ))}
        </div>

        {/* Grid columns (weeks) */}
        {Array.from({ length: 8 }, (_, weekIdx) => (
          <div key={weekIdx} className="flex flex-col gap-1">
            {grid.map((row, dayIdx) => {
              const cell = row[weekIdx];
              if (!cell) return <div key={dayIdx} className="w-6 h-6" />;
              return (
                <div
                  key={dayIdx}
                  title={cell.isFuture ? "" : `${cell.date}${cell.practiced ? " ✓" : ""}`}
                  className="w-6 h-6 rounded-sm transition-colors"
                  style={{
                    background: cell.isFuture
                      ? "transparent"
                      : cell.practiced
                      ? "#22c55e"
                      : "#f1f5f9",
                    outline: cell.isToday ? "2px solid #2563eb" : "none",
                    outlineOffset: "1px",
                    opacity: cell.isFuture ? 0 : 1,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-slate-400">
          {totalPracticed} {totalPracticed === 1 ? "den" : totalPracticed <= 4 ? "dny" : "dní"} s tréninkem
        </p>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ background: "#f1f5f9" }} />
            Klid
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block bg-green-500" />
            Trénink
          </span>
        </div>
      </div>
    </div>
  );
}
