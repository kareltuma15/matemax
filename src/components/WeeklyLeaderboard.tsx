"use client";
import { useEffect, useState, useCallback } from "react";
import type { LeaderboardEntry } from "@/lib/weekly-challenge";
import { formatTime, getWeekDateRange } from "@/lib/weekly-challenge";

const RANK_MEDALS = ["🥇", "🥈", "🥉"];

function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) return <span className="text-xl leading-none">{RANK_MEDALS[rank - 1]}</span>;
  return (
    <span className="text-sm font-extrabold tabular-nums" style={{ color: "#94a3b8", minWidth: 24, textAlign: "center" }}>
      {rank}
    </span>
  );
}

interface Props {
  refreshTrigger?: number;
  compact?: boolean;
}

export default function WeeklyLeaderboard({ refreshTrigger = 0, compact = false }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [ownEntry, setOwnEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/weekly-challenge/leaderboard");
      if (!res.ok) return;
      const json = await res.json();
      setEntries(json.entries ?? []);
      setOwnEntry(json.ownEntry ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshTrigger]);

  const weekRange = getWeekDateRange();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-sm">
        <span className="animate-spin text-lg">⏳</span> Načítám žebříček…
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400 text-sm">
        <p className="text-2xl mb-2">🏆</p>
        <p className="font-semibold">Buď první v žebříčku!</p>
        <p className="text-xs mt-1">Tento týden ({weekRange}) ještě nikdo nesplnil výzvu.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {!compact && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>
            🏆 Žebříček
          </h3>
          <span className="text-xs text-slate-400">{weekRange}</span>
        </div>
      )}

      {entries.map((e) => (
        <EntryRow key={e.user_id} entry={e} />
      ))}

      {/* User's own entry if outside top 10 */}
      {ownEntry && !entries.some((e) => e.is_own) && (
        <>
          <div className="flex items-center gap-2 py-1">
            <span className="flex-1 border-t border-dashed border-slate-200" />
            <span className="text-xs text-slate-400 shrink-0">tvoje umístění</span>
            <span className="flex-1 border-t border-dashed border-slate-200" />
          </div>
          <EntryRow entry={ownEntry} />
        </>
      )}
    </div>
  );
}

function EntryRow({ entry }: { entry: LeaderboardEntry }) {
  const pct = Math.round((entry.score / entry.total) * 100);
  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors"
      style={{
        background: entry.is_own ? "#eff6ff" : "#f8fafc",
        border: `1px solid ${entry.is_own ? "#bfdbfe" : "#f1f5f9"}`,
      }}
    >
      <div className="w-7 flex items-center justify-center shrink-0">
        <RankBadge rank={entry.rank} />
      </div>
      <span className="text-xl leading-none shrink-0">{entry.avatar_emoji}</span>
      <span
        className="flex-1 text-sm font-semibold truncate"
        style={{ color: entry.is_own ? "#1d4ed8" : "#1e293b" }}
      >
        {entry.nickname}
        {entry.is_own && <span className="ml-1 text-xs font-normal text-blue-400">(ty)</span>}
      </span>
      <span className="text-sm font-bold tabular-nums" style={{ color: "#0D1B3E" }}>
        {entry.score}/{entry.total}
      </span>
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{
          background: pct === 100 ? "#dcfce7" : pct >= 70 ? "#fef9c3" : "#fee2e2",
          color: pct === 100 ? "#15803d" : pct >= 70 ? "#92400e" : "#dc2626",
        }}
      >
        {pct}%
      </span>
      <span className="text-xs text-slate-400 tabular-nums shrink-0 hidden sm:block">
        {formatTime(entry.time_seconds)}
      </span>
    </div>
  );
}
