"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { TEMA_LABELS } from "@/types";
import { examples } from "@/data/examples";
import MathText from "./MathText";

export interface WrongAnswer {
  exampleId: string;
  userAnswer: string;
}

interface Props {
  correct: number;
  total: number;
  skipped?: number;
  xpEarned: number;
  streak: number;
  topics: string[];
  rezim?: "chyby" | "sm2";
  wrongAnswers?: WrongAnswer[];
  onRestart: () => void;
  onRestartChyby?: () => void;
}

function useCountUp(target: number, duration = 900): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      setVal(Math.round(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

function TopicProgressBar({ tema }: { tema: string }) {
  const [score, setScore] = useState<{ correct: number; total: number } | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("matemax-diag-results");
      if (raw) {
        const results = JSON.parse(raw) as Record<string, { correct: number; total: number }>;
        if (results[tema]) setScore(results[tema]);
      }
    } catch { /* ignore */ }
  }, [tema]);

  // Also check SM2 cards stats
  useEffect(() => {
    if (score) return;
    try {
      const raw = localStorage.getItem("matemax-gamification");
      if (raw) {
        const g = JSON.parse(raw);
        const ts = g.topicStats?.[tema];
        if (ts && ts.total > 0) setScore(ts);
      }
    } catch { /* ignore */ }
  }, [tema, score]);

  if (!score || score.total === 0) return null;

  const pct = Math.round((score.correct / score.total) * 100);
  const barColor = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const textColor = pct >= 80 ? "#166534" : pct >= 50 ? "#92400e" : "#991b1b";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-600 w-28 shrink-0 truncate">
        {TEMA_LABELS[tema] ?? tema}
      </span>
      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
        <div
          ref={barRef}
          className="h-2 rounded-full bar-animate"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>
      <span className="text-xs font-bold w-9 text-right shrink-0" style={{ color: textColor }}>
        {pct} %
      </span>
    </div>
  );
}

function WrongAnswersReview({ wrongAnswers }: { wrongAnswers: WrongAnswer[] }) {
  const [open, setOpen] = useState(false);
  const items = wrongAnswers
    .map(({ exampleId, userAnswer }) => ({ ex: examples.find((e) => e.id === exampleId), userAnswer }))
    .filter((x): x is { ex: NonNullable<typeof x.ex>; userAnswer: string } => !!x.ex);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-red-100 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-red-50"
        style={{ background: "#fef2f2" }}
      >
        <span className="text-sm font-bold text-red-700">
          ✗ Co ti nešlo ({items.length} {items.length === 1 ? "příklad" : items.length < 5 ? "příklady" : "příkladů"})
        </span>
        <span className="text-red-400 text-xs">{open ? "▲ Skrýt" : "▼ Zobrazit"}</span>
      </button>
      {open && (
        <div className="divide-y divide-red-50">
          {items.map(({ ex, userAnswer }, i) => (
            <div key={i} className="px-4 py-3 bg-white">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "#eff6ff", color: "#2E6DA4" }}
                >
                  {TEMA_LABELS[ex.tema] ?? ex.tema}
                </span>
              </div>
              <p className="text-sm font-medium text-slate-700 mb-2">
                <MathText text={ex.zadani} />
              </p>
              <div className="flex flex-col gap-1 text-xs">
                <span className="text-red-600">
                  ✗ Tvoje: <strong><MathText text={userAnswer || "—"} /></strong>
                </span>
                <span className="text-green-700">
                  ✓ Správně: <strong><MathText text={ex.odpoved} /></strong>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function buildShareBlob(pct: number, correct: number, total: number, streak: number): Promise<Blob> {
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0D1B3E");
  bg.addColorStop(1, "#1e3a6e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.beginPath();
  ctx.arc(W - 60, 60, 260, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = "#fff";

  ctx.font = `900 80px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  ctx.fillText("M²", W / 2, 190);

  ctx.font = `400 34px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillText("matemax.cz", W / 2, 235);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(W / 2 - 220, 265, 440, 2);

  ctx.font = `900 300px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.fillText(`${pct}%`, W / 2, 630);

  ctx.font = `600 52px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.fillText(`${correct} z ${total} spravne`, W / 2, 715);

  if (streak > 0) {
    ctx.font = `700 44px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
    ctx.fillStyle = "#fbbf24";
    ctx.fillText(`${streak} dni streak`, W / 2, 795);
  }

  ctx.font = `400 32px -apple-system, BlinkMacSystemFont, Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.fillText("Matematika pro prijimacky na SS", W / 2, 960);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("toBlob failed"));
    }, "image/png");
  });
}

export default function SessionSummary({ correct, total, skipped = 0, xpEarned, streak, topics, rezim, wrongAnswers = [], onRestart, onRestartChyby }: Props) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const animPct = useCountUp(pct);
  const animXp  = useCountUp(xpEarned);
  const [shareState, setShareState] = useState<"idle" | "loading" | "copied" | "error">("idle");

  async function handleShare() {
    setShareState("loading");
    try {
      const blob = await buildShareBlob(pct, correct, total, streak);
      const file = new File([blob], "matemax-vysledek.png", { type: "image/png" });
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `${pct} % z matematiky! — MateMax`,
          text: `Vyřešil/a jsem ${correct} z ${total} příkladů z matematiky. Zkus to taky na matemax.cz!`,
          files: [file],
        });
        setShareState("idle");
      } else if (navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setShareState("copied");
        setTimeout(() => setShareState("idle"), 2500);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "matemax-vysledek.png";
        a.click();
        URL.revokeObjectURL(url);
        setShareState("idle");
      }
    } catch {
      setShareState("error");
      setTimeout(() => setShareState("idle"), 2000);
    }
  }

  const tier = pct >= 80 ? "great" : pct >= 50 ? "good" : "low";
  const headerBg    = tier === "great" ? "#dcfce7" : tier === "good" ? "#dbeafe" : "#ffedd5";
  const headerColor = tier === "great" ? "#166534" : tier === "good" ? "#1e40af" : "#9a3412";
  const title       = tier === "great" ? "Výborně! 🏆" : tier === "good" ? "Dobrá práce! 💪" : "Nevzdávej to! 🔥";

  // Collect all practiced topics for progress bars (union of session + known diag topics)
  const [allTopics, setAllTopics] = useState<string[]>(topics);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("matemax-diag-results");
      if (raw) {
        const results = JSON.parse(raw) as Record<string, { correct: number; total: number }>;
        const diagTopics = Object.keys(results).filter((t) => results[t].total > 0);
        const merged = [...new Set([...topics, ...diagTopics])];
        setAllTopics(merged);
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Colored header */}
      <div className="px-8 py-7 text-center" style={{ background: headerBg }}>
        <h2 className="text-2xl font-bold count-fade-in" style={{ color: headerColor }}>{title}</h2>
        <p className="text-6xl font-black mt-3 count-fade-in" style={{ color: headerColor }}>
          {animPct} %
        </p>
        <p className="mt-2 text-sm font-medium" style={{ color: headerColor, opacity: 0.75 }}>
          {correct} z {total} správně{skipped > 0 ? ` · ${skipped} přeskočeno` : ""}
        </p>
      </div>

      <div className="p-6 flex flex-col gap-4">
        {/* XP + Streak */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-xl bg-indigo-50 border border-indigo-100 p-3 text-center">
            <p className="text-xs text-indigo-400 font-medium mb-0.5">Získal jsi</p>
            <p className="text-xl font-black text-indigo-600 count-fade-in">+{animXp} XP</p>
          </div>
          <div className="flex-1 rounded-xl bg-orange-50 border border-orange-100 p-3 text-center">
            <p className="text-xs text-orange-400 font-medium mb-0.5">Streak</p>
            <p className="text-xl font-black text-orange-500">🔥 {streak} dní</p>
          </div>
        </div>

        {/* Topics practiced */}
        {topics.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 font-medium mb-2">Procvičoval jsi</p>
            <div className="flex flex-wrap gap-1.5">
              {topics.map((tema) => (
                <span
                  key={tema}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ background: "#e0e7ff", color: "#3730a3" }}
                >
                  {TEMA_LABELS[tema] ?? tema}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Mini progress bars per topic */}
        {allTopics.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">📈 Tvůj pokrok</p>
            {allTopics.map((tema) => (
              <TopicProgressBar key={tema} tema={tema} />
            ))}
          </div>
        )}

        <p className="text-xs text-slate-400 text-center">
          Chybné příklady se ti vrátí brzy — SM-2 spaced repetition
        </p>

        {/* Wrong answers review */}
        {wrongAnswers.length > 0 && (
          <WrongAnswersReview wrongAnswers={wrongAnswers} />
        )}

        {rezim === "chyby" && (
          <div
            className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg"
            style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}
          >
            🔄 Procvičoval jsi pouze chyby
          </div>
        )}

        <div className="flex flex-col gap-2 mt-1">
          <button
            onClick={onRestart}
            className="w-full py-3 text-white font-semibold rounded-xl text-base"
            style={{ background: "#0D1B3E" }}
          >
            Trénovat znovu →
          </button>

          {onRestartChyby && correct < total && (
            <button
              onClick={onRestartChyby}
              className="w-full py-2.5 font-semibold rounded-xl border text-sm transition-colors"
              style={{ borderColor: "#fecaca", color: "#dc2626", background: "#fef2f2" }}
            >
              🔄 Procvičit chyby z tréninku
            </button>
          )}
          <button
            onClick={handleShare}
            disabled={shareState === "loading"}
            className="w-full py-2.5 font-semibold rounded-xl border text-sm transition-colors disabled:opacity-60"
            style={{ borderColor: "#bfdbfe", color: "#2E6DA4", background: "#eff6ff" }}
          >
            {shareState === "loading"
              ? "Generuji…"
              : shareState === "copied"
              ? "✓ Zkopírováno do schránky!"
              : shareState === "error"
              ? "⚠ Nepodařilo se sdílet"
              : "📤 Sdílet výsledek"}
          </button>
          <Link
            href="/profil"
            className="block w-full py-2.5 font-medium rounded-xl border border-indigo-200 text-sm text-center transition-colors hover:bg-indigo-50"
            style={{ color: "#2E6DA4" }}
          >
            📊 Zobrazit profil →
          </Link>
          <Link
            href="/"
            className="block w-full py-2.5 text-slate-500 font-medium rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition-colors text-center"
          >
            Zpět na úvod
          </Link>
        </div>
      </div>
    </div>
  );
}
