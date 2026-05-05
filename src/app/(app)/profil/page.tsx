"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { loadProgress } from "@/lib/progress";
import { loadGamification } from "@/lib/gamification";
import { TEMA_LABELS } from "@/types";
import XPProgressBar from "@/components/XPProgressBar";
import BadgeGrid from "@/components/BadgeGrid";

interface TopicScore {
  tema: string;
  score: number;
  correct: number;
  total: number;
}

export default function ProfilPage() {
  const router = useRouter();
  const [email, setEmail]             = useState<string | null>(null);
  const [xp, setXp]                   = useState(0);
  const [streak, setStreak]           = useState(0);
  const [totalPracticed, setTotal]    = useState(0);
  const [topicScores, setTopicScores] = useState<TopicScore[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<string[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        setEmail(data.session?.user.email ?? null);
      });
    }

    const p = loadProgress();
    setXp(p.xp);
    setStreak(p.streak);

    const g = loadGamification();
    setEarnedBadges(g.earnedBadges);

    try {
      const raw = localStorage.getItem("matemax-cards");
      if (raw) setTotal((JSON.parse(raw) as unknown[]).length);
    } catch { /* ignore */ }

    try {
      const raw = localStorage.getItem("matemax-diag-results");
      if (raw) {
        const results = JSON.parse(raw) as Record<string, { correct: number; total: number }>;
        const scores: TopicScore[] = Object.entries(results)
          .filter(([, v]) => v.total > 0)
          .map(([tema, v]) => ({ tema, score: v.correct / v.total, correct: v.correct, total: v.total }))
          .sort((a, b) => b.score - a.score);
        setTopicScores(scores);
      }
    } catch { /* ignore */ }

    setLoading(false);
  }, []);

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return <div className="h-48 flex items-center justify-center text-slate-400">Načítám…</div>;
  }

  const strongest = topicScores[0] ?? null;
  const weakest   = topicScores[topicScores.length - 1] ?? null;
  const initials  = email ? email[0].toUpperCase() : "?";

  return (
    <div className="flex flex-col gap-5">
      {/* Avatar + email */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-black shrink-0"
          style={{ background: "#0D1B3E" }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-base truncate" style={{ color: "#0D1B3E" }}>
            {email ?? "Nepřihlášen"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Tvůj MateMax účet</p>
        </div>
      </div>

      {/* XP Level Progress */}
      <XPProgressBar xp={xp} />

      {/* Streak + Procvičeno */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <p className="text-xs text-slate-400 font-medium mb-1">Streak</p>
          <p className="text-3xl font-black text-orange-500">🔥 {streak}</p>
          <p className="text-xs text-slate-400">dní v řadě</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center">
          <p className="text-xs text-slate-400 font-medium mb-1">Procvičeno</p>
          <p className="text-3xl font-black" style={{ color: "#0D1B3E" }}>{totalPracticed}</p>
          <p className="text-xs text-slate-400">různých příkladů</p>
        </div>
      </div>

      {/* Badges */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <BadgeGrid earnedBadgeIds={earnedBadges} />
      </div>

      {/* Topic strengths */}
      {topicScores.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
          <h2 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>Výsledky témat</h2>

          {topicScores.map(({ tema, score, correct, total }) => (
            <div key={tema}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-600">
                  {TEMA_LABELS[tema] ?? tema}
                </span>
                <span className="text-xs font-bold" style={{ color: score >= 0.67 ? "#166534" : "#9a3412" }}>
                  {correct}/{total} ({Math.round(score * 100)} %)
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full bar-animate"
                  style={{
                    width: `${Math.round(score * 100)}%`,
                    background: score >= 0.67 ? "#22c55e" : score >= 0.4 ? "#f59e0b" : "#ef4444",
                  }}
                />
              </div>
            </div>
          ))}

          <div className="flex gap-2 flex-wrap pt-1">
            {strongest && strongest !== weakest && (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#dcfce7", color: "#166534" }}>
                💪 Nejsilnější: {TEMA_LABELS[strongest.tema] ?? strongest.tema}
              </span>
            )}
            {weakest && strongest !== weakest && (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: "#fef2f2", color: "#991b1b" }}>
                🎯 Procvičit: {TEMA_LABELS[weakest.tema] ?? weakest.tema}
              </span>
            )}
          </div>
        </div>
      )}

      {topicScores.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 text-center text-slate-400 text-sm">
          Nejdřív projdi diagnostický test — uvidíš svá silná a slabá témata.
        </div>
      )}

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors mt-1"
      >
        Odhlásit se
      </button>
    </div>
  );
}
