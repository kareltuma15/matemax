"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TEMA_LABELS, TEMATA_ORDER } from "@/types";
import { FREE_TOPICS, PREMIUM_TOPICS } from "@/lib/subscription";
import { pickMission } from "@/lib/mise";
import { computeTrainingState, type Level } from "@/lib/levels";

interface Props {
  isPremium: boolean;
  onSelectTopic: (tema: string, podtema?: string) => void;
  onStartMix: () => void;
  onStartMistakes: () => void;
}

const EMOJI: Record<string, string> = {
  zlomky: "🍕", vyrazy: "🔢", rovnice: "⚖️", geometrie: "📐",
  slovni_ulohy: "📝", grafy_logika: "📊", konstrukce: "📏", uhly: "🔺", souhrnne: "🏆",
};

function useDiagScores(): Record<string, number> {
  const [scores, setScores] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("matemax-diag-results");
      if (!raw) return;
      const results = JSON.parse(raw) as Record<string, { correct: number; total: number }>;
      const s: Record<string, number> = {};
      for (const [tema, v] of Object.entries(results)) {
        if (v.total > 0) s[tema] = Math.round((v.correct / v.total) * 100);
      }
      setScores(s);
    } catch { /* ignore */ }
  }, []);
  return scores;
}

function barColor(score: number): string {
  if (score >= 70) return "#16a34a";
  if (score >= 40) return "#d97706";
  return "#dc2626";
}

/** Odemčené úrovně L1→L3 jako řada čipů. */
function LevelChips({ level }: { level: Level }) {
  return (
    <div className="flex gap-1">
      {([1, 2, 3] as const).map((l) => {
        const on = l <= level;
        return (
          <span
            key={l}
            className="text-[9px] font-black px-1.5 py-0.5 rounded-full border"
            style={
              on
                ? { background: "#f0fdf4", borderColor: "#bbf7d0", color: "#166534" }
                : { background: "#f8fafc", borderColor: "#e2e8f0", color: "#cbd5e1" }
            }
            title={on ? `Úroveň ${l} odemčená` : `Úroveň ${l} zamčená — trénuj níž`}
          >
            L{l}{on ? " ✓" : ""}
          </span>
        );
      })}
    </div>
  );
}

export default function LoggedInTopicMap({ isPremium, onSelectTopic, onStartMix, onStartMistakes }: Props) {
  const diagScores = useDiagScores();
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [mistakes, setMistakes] = useState(0);
  const [missionTema, setMissionTema] = useState<string | null>(null);

  useEffect(() => {
    const st = computeTrainingState();
    setLevels(st.levels);
    setMistakes(st.mistakes);
    setMissionTema(pickMission(isPremium)?.tema ?? null);
  }, [isPremium]);

  // Témata v pořadí sešitu; dostupná první, zamčená (Premium) na konec.
  const ordered = [...TEMATA_ORDER].sort((a, b) => {
    const la = !isPremium && PREMIUM_TOPICS.has(a) ? 1 : 0;
    const lb = !isPremium && PREMIUM_TOPICS.has(b) ? 1 : 0;
    return la - lb;
  });
  const freeCount = TEMATA_ORDER.filter((t) => FREE_TOPICS.has(t)).length;

  return (
    // Break-out: tréninkové centrum se roztáhne přes celou plochu (jako Domů),
    // i když session karta na /trenink zůstává úzká. Layout má overflow-x-hidden,
    // takže w-screen nezpůsobí vodorovné rolování kvůli scrollbaru.
    <div className="mx-[calc(50%-50vw)] w-screen px-4">
    <div className="mx-auto max-w-6xl flex flex-col gap-5 fade-in-up">
      {/* Header */}
      <div className="rounded-2xl px-5 py-4" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 100%)" }}>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-black text-white">🏋️ Tréninkové centrum</h1>
          {!isPremium && (
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full glass-card" style={{ color: "#93c5fd" }}>
              {freeCount} / {TEMATA_ORDER.length} zdarma
            </span>
          )}
        </div>
        <p className="text-sm text-blue-300 leading-snug mt-0.5">Vyber, jak chceš dnes trénovat.</p>
      </div>

      {/* Režimy tréninku */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Dnešní trénink — vede */}
        <button
          onClick={() => missionTema && onSelectTopic(missionTema)}
          disabled={!missionTema}
          className="text-left rounded-2xl p-4 flex flex-col gap-1 text-white press-scale disabled:opacity-70"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <span className="text-2xl">🎯</span>
          <span className="text-sm font-black">Dnešní trénink</span>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.82)" }}>
            {missionTema ? `Pokračuj v tématu ${TEMA_LABELS[missionTema]}` : "Sedm příkladů na míru"}
          </span>
        </button>

        {/* Rychlý mód */}
        <Link href="/rychly-mod" className="rounded-2xl p-4 flex flex-col gap-1 bg-white border border-slate-200 card-hover">
          <span className="text-2xl">⚡</span>
          <span className="text-sm font-black" style={{ color: "#0D1B3E" }}>Rychlý mód</span>
          <span className="text-[11px] text-slate-500">10 příkladů · 60 sekund</span>
        </Link>

        {/* Zopakovat chyby — jen když nějaké jsou */}
        {mistakes > 0 ? (
          <button
            onClick={onStartMistakes}
            className="text-left rounded-2xl p-4 flex flex-col gap-1 card-hover"
            style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
          >
            <span className="text-2xl">🔄</span>
            <span className="text-sm font-black" style={{ color: "#991b1b" }}>Zopakovat chyby</span>
            <span className="text-[11px]" style={{ color: "#dc2626" }}>{mistakes} {mistakes === 1 ? "příklad čeká" : mistakes <= 4 ? "příklady čekají" : "příkladů čeká"}</span>
          </button>
        ) : (
          <div className="rounded-2xl p-4 flex flex-col gap-1 bg-white border border-slate-200 opacity-60">
            <span className="text-2xl">🔄</span>
            <span className="text-sm font-black" style={{ color: "#0D1B3E" }}>Zopakovat chyby</span>
            <span className="text-[11px] text-slate-400">Zatím žádné chyby k opakování</span>
          </div>
        )}

        {/* Mix témat */}
        <button
          onClick={onStartMix}
          className="text-left rounded-2xl p-4 flex flex-col gap-1 bg-white border border-slate-200 card-hover"
        >
          <span className="text-2xl">🎲</span>
          <span className="text-sm font-black" style={{ color: "#0D1B3E" }}>Mix témat</span>
          <span className="text-[11px] text-slate-500">Náhodně z dostupných</span>
        </button>
      </div>

      {/* Témata */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Témata</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ordered.map((tema) => {
            const locked = !isPremium && PREMIUM_TOPICS.has(tema);
            const score = diagScores[tema] ?? 0;
            const level = levels[tema] ?? 1;

            if (locked) {
              return (
                <Link
                  key={tema}
                  href="/cenik"
                  className="rounded-2xl p-3.5 flex flex-col gap-2 bg-white border border-slate-200 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg grayscale">🔒</span>
                    <span className="text-sm font-bold text-slate-500 truncate">{TEMA_LABELS[tema]}</span>
                    <span className="ml-auto text-[11px] font-bold text-slate-400 shrink-0">Premium</span>
                  </div>
                  <span className="text-[11px] text-slate-400">Odemkni v Premium →</span>
                </Link>
              );
            }

            return (
              <button
                key={tema}
                onClick={() => onSelectTopic(tema)}
                className="text-left rounded-2xl p-3.5 flex flex-col gap-2 bg-white border border-slate-200 card-hover"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{EMOJI[tema]}</span>
                  <span className="text-sm font-bold truncate" style={{ color: "#0D1B3E" }}>{TEMA_LABELS[tema]}</span>
                  <span className="ml-auto text-xs font-black shrink-0" style={{ color: score > 0 ? barColor(score) : "#94a3b8" }}>
                    {score > 0 ? `${score} %` : "—"}
                  </span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#eef2f7" }}>
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: barColor(score) }} />
                </div>
                <LevelChips level={level} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Premium CTA */}
      {!isPremium && (
        <Link
          href="/cenik"
          className="block rounded-2xl p-5 text-center hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <p className="text-base font-black text-white">⭐ Odemkni všechna témata</p>
          <p className="text-sm text-blue-200 mt-1">Premium — všech {TEMATA_ORDER.length} témat · 99 Kč/měsíc</p>
        </Link>
      )}
    </div>
    </div>
  );
}
