"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TEMA_LABELS } from "@/types";
import { PREMIUM_TOPICS } from "@/lib/subscription";

interface Props {
  isPremium: boolean;
}

const EMOJI: Record<string, string> = {
  zlomky:       "🍕",
  rovnice:      "⚖️",
  slovni_ulohy: "📝",
  vyrazy:       "🔢",
  geometrie:    "📐",
  grafy_logika: "📊",
  konstrukce:   "📏",
  uhly:         "🔺",
  souhrnne:     "🏆",
};

// Snake layout: [key, gridCol (1-indexed), gridRow (1-indexed)]
// Row 0: L→R, Row 1: R→L (snake reversal), Row 2: L→R
const NODES: [string, number, number][] = [
  ["zlomky",       1, 1],
  ["rovnice",      2, 1],
  ["slovni_ulohy", 3, 1],
  ["vyrazy",       3, 2],
  ["geometrie",    2, 2],
  ["grafy_logika", 1, 2],
  ["konstrukce",   1, 3],
  ["uhly",         2, 3],
  ["souhrnne",     3, 3],
];

// SVG path connects node centers in snake order.
// Container: 360px wide · 3 cols of 120px → col centers: 60, 180, 300
// 3 rows of 150px → row centers: 75, 225, 375
// SVG viewBox: "0 0 360 450" (scaled to 100% width)
const R = 28; // corner radius
const SNAKE_D = [
  `M 60,75`,
  `L ${300 - R},75`,      `Q 300,75 300,${75 + R}`,
  `L 300,${225 - R}`,     `Q 300,225 ${300 - R},225`,
  `L ${60 + R},225`,      `Q 60,225 60,${225 + R}`,
  `L 60,${375 - R}`,      `Q 60,375 ${60 + R},375`,
  `L 300,375`,
].join(" ");

// Individual node centers in SVG coords [x, y] — for the star "checkpoint" markers
const NODE_SVG: Record<string, [number, number]> = {
  zlomky:       [60,  75],
  rovnice:      [180, 75],
  slovni_ulohy: [300, 75],
  vyrazy:       [300, 225],
  geometrie:    [180, 225],
  grafy_logika: [60,  225],
  konstrukce:   [60,  375],
  uhly:         [180, 375],
  souhrnne:     [300, 375],
};

function useScores(): Record<string, number> {
  const [scores, setScores] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      const diagRaw = localStorage.getItem("matemax-diag-results");
      const diagScores: Record<string, number> = {};
      if (diagRaw) {
        const r = JSON.parse(diagRaw) as Record<string, { correct: number; total: number }>;
        for (const [t, v] of Object.entries(r)) {
          if (v.total > 0) diagScores[t] = Math.round((v.correct / v.total) * 100);
        }
      }

      const gamRaw = localStorage.getItem("matemax-gamification");
      const practiceScores: Record<string, number> = {};
      const practicedCount: Record<string, number> = {};
      if (gamRaw) {
        const gam = JSON.parse(gamRaw);
        for (const [t, s] of Object.entries(gam.topicStats ?? {}) as [string, { correct: number; total: number }][]) {
          practicedCount[t] = s.total ?? 0;
          if (s.total > 0) practiceScores[t] = Math.round((s.correct / s.total) * 100);
        }
      }

      const combined: Record<string, number> = {};
      for (const key of Object.keys(TEMA_LABELS)) {
        const d = diagScores[key];
        const p = practiceScores[key];
        const n = practicedCount[key] ?? 0;
        if (n >= 3) {
          combined[key] = Math.round((p ?? d ?? 0) * 0.65 + (d ?? p ?? 0) * 0.35);
        } else if (n > 0) {
          combined[key] = Math.round((p ?? 0) * (n / 3) * 0.8);
        } else if (d !== undefined) {
          combined[key] = Math.round(d * 0.55);
        }
      }
      setScores(combined);
    } catch { /* ignore */ }
  }, []);
  return scores;
}

function arcColor(score: number): string {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#fbbf24";
  return "#f87171";
}

function nodeGradient(locked: boolean, score: number, started: boolean): string {
  if (locked) return "linear-gradient(145deg, #1e293b, #334155)";
  if (!started) return "linear-gradient(145deg, #e2e8f0, #cbd5e1)";
  if (score >= 70) return "linear-gradient(145deg, #15803d, #22c55e)";
  if (score >= 40) return "linear-gradient(145deg, #b45309, #fbbf24)";
  return "linear-gradient(145deg, #dc2626, #f87171)";
}

function nodeTextColor(locked: boolean, started: boolean): string {
  if (locked) return "#94a3b8";
  if (!started) return "#64748b";
  return "var(--text-primary)";
}

export default function TopicPathMap({ isPremium }: Props) {
  const scores = useScores();
  const mapRef = useRef<HTMLDivElement>(null);
  const [drawProgress, setDrawProgress] = useState(0);

  const started = (key: string) => (scores[key] ?? 0) > 0;
  const locked  = (key: string) => !isPremium && PREMIUM_TOPICS.has(key);

  const startedCount = NODES.filter(([k]) => started(k)).length;

  const SNAKE_ORDER = NODES.map(([k]) => k);
  let lastStartedIdx = -1;
  for (let i = 0; i < SNAKE_ORDER.length; i++) {
    if (started(SNAKE_ORDER[i])) lastStartedIdx = i;
  }

  const APPROX_LENGTH = 960;
  const progressFill = lastStartedIdx < 0 ? 0 : ((lastStartedIdx) / 8) * APPROX_LENGTH;

  // Animate the progress path draw when the map scrolls into view
  useEffect(() => {
    if (progressFill <= 0) return;
    const el = mapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setDrawProgress(progressFill), 120);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [progressFill]);

  return (
    <div ref={mapRef} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>
            🗺️ Mapa učení
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {startedCount === 0
              ? "Začni s libovolným tématem"
              : `${startedCount} z 9 témat procvičeno`}
          </p>
        </div>
        <Link
          href="/trenink"
          className="text-xs font-bold px-3 py-1.5 rounded-full shrink-0"
          style={{ background: "#eff6ff", color: "#2E6DA4" }}
        >
          Všechna témata →
        </Link>
      </div>

      {/* Snake map */}
      <div className="relative px-2 pb-3" style={{ height: 450 }}>
        {/* SVG track layer */}
        <svg
          viewBox="0 0 360 450"
          width="100%"
          height="100%"
          className="absolute inset-0"
          style={{ zIndex: 0 }}
          aria-hidden="true"
        >
          {/* Gray track */}
          <path
            d={SNAKE_D}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Progress fill — animates in when map enters viewport */}
          {progressFill > 0 && (
            <path
              d={SNAKE_D}
              fill="none"
              stroke="#bfdbfe"
              strokeWidth="16"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={APPROX_LENGTH}
              strokeDashoffset={APPROX_LENGTH - drawProgress}
              style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          )}
          {/* Checkpoint dots at each node center (behind the HTML nodes) */}
          {NODES.map(([key]) => {
            const [cx, cy] = NODE_SVG[key];
            return (
              <circle
                key={key}
                cx={cx}
                cy={cy}
                r={8}
                fill={started(key) ? "#2E6DA4" : "#cbd5e1"}
              />
            );
          })}
        </svg>

        {/* HTML nodes grid */}
        <div
          className="absolute inset-0"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gridTemplateRows: "repeat(3, 150px)",
            zIndex: 1,
          }}
        >
          {NODES.map(([key, col, row]) => {
            const isLocked  = locked(key);
            const score     = scores[key] ?? 0;
            const isStarted = started(key);
            const href      = isLocked ? "/cenik" : `/trenink?tema=${key}`;
            const RING_R    = 40;
            const circ      = 2 * Math.PI * RING_R;
            const fill      = (score / 100) * circ;

            return (
              <div
                key={key}
                style={{ gridColumn: col, gridRow: row }}
                className="flex items-center justify-center"
              >
                <Link
                  href={href}
                  className="flex flex-col items-center gap-1 select-none"
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {/* Circle + progress ring */}
                  <div className="relative" style={{ width: 80, height: 80 }}>
                    {/* Progress ring SVG */}
                    <svg
                      width="80"
                      height="80"
                      viewBox="0 0 100 100"
                      className="absolute inset-0"
                      style={{ transform: "rotate(-90deg)" }}
                      aria-hidden="true"
                    >
                      <circle cx="50" cy="50" r={RING_R} fill="none" stroke="#e2e8f0" strokeWidth="5" />
                      {score > 0 && !isLocked && (
                        <circle
                          cx="50"
                          cy="50"
                          r={RING_R}
                          fill="none"
                          stroke={arcColor(score)}
                          strokeWidth="5"
                          strokeDasharray={`${fill} ${circ}`}
                          strokeLinecap="round"
                        />
                      )}
                    </svg>

                    {/* Node circle */}
                    <div
                      className="absolute rounded-full flex items-center justify-center transition-transform active:scale-95"
                      style={{
                        inset: 10,
                        background: nodeGradient(isLocked, score, isStarted),
                        boxShadow: isStarted && !isLocked
                          ? "0 4px 14px rgba(0,0,0,0.18)"
                          : "0 2px 6px rgba(0,0,0,0.08)",
                      }}
                    >
                      <span
                        className="text-xl leading-none"
                        style={{
                          filter: !isStarted && !isLocked ? "grayscale(1) opacity(0.5)" : "none",
                        }}
                      >
                        {isLocked ? "🔒" : EMOJI[key]}
                      </span>
                    </div>

                    {/* Checkmark badge for mastered topics */}
                    {score >= 70 && !isLocked && (
                      <div
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                        style={{ background: "#16a34a", boxShadow: "0 0 0 2px #fff" }}
                      >
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Topic label */}
                  <span
                    className="text-[11px] font-bold text-center leading-tight"
                    style={{ color: nodeTextColor(isLocked, isStarted), maxWidth: 88 }}
                  >
                    {TEMA_LABELS[key]}
                  </span>

                  {/* Score or status */}
                  <span className="text-[10px] leading-none" style={{ color: "#94a3b8" }}>
                    {isLocked
                      ? "Premium"
                      : score > 0
                      ? `${score} %`
                      : "Nezačato"}
                  </span>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      {/* Premium upsell footer */}
      {!isPremium && (
        <Link
          href="/cenik"
          className="flex items-center justify-between px-5 py-3 border-t border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <span className="text-xs font-semibold text-slate-500">
            🔒 6 témat za Premium — odemkni a procvičuj vše
          </span>
          <span className="text-xs font-black shrink-0 ml-2" style={{ color: "#2E6DA4" }}>
            od 99 Kč →
          </span>
        </Link>
      )}
    </div>
  );
}
