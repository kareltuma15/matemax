"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { examples } from "@/data/examples";
import { checkAnswer } from "@/lib/normalize";
import MathText from "@/components/MathText";
import { TEMA_LABELS } from "@/types";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";

const TEST_SIZE = 15;
const TEST_SECONDS = 25 * 60; // 25 minutes
const HISTORY_KEY = "cermat-test-history";

export interface CermatTestResult {
  date: string;
  score: number;
  total: number;
  pct: number;
}

function saveCermatResult(result: CermatTestResult) {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: CermatTestResult[] = raw ? JSON.parse(raw) : [];
    localStorage.setItem(HISTORY_KEY, JSON.stringify([result, ...history].slice(0, 20)));
  } catch { /* ignore */ }
}

function pickRandom(count: number) {
  const shuffled = [...examples].sort(() => Math.random() - 0.5);
  // Aim for balanced difficulty distribution
  const easy = shuffled.filter(e => e.obtiznost === 1).slice(0, 7);
  const medium = shuffled.filter(e => e.obtiznost === 2).slice(0, 5);
  const hard = shuffled.filter(e => e.obtiznost === 3).slice(0, 3);
  const combined = [...easy, ...medium, ...hard].sort(() => Math.random() - 0.5);
  return combined.slice(0, count);
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getRating(pct: number): { emoji: string; label: string; color: string } {
  if (pct >= 90) return { emoji: "🏆", label: "Výborně!", color: "#16a34a" };
  if (pct >= 70) return { emoji: "💪", label: "Dobře", color: "#2563eb" };
  return { emoji: "📚", label: "Procvičuj dál", color: "#d97706" };
}

export default function CermatTestPage() {
  const [phase, setPhase] = useState<"intro" | "test" | "results">("intro");
  const [testExamples] = useState(() => pickRandom(TEST_SIZE));
  const [userAnswers, setUserAnswers] = useState<string[]>(Array(TEST_SIZE).fill(""));
  const [secondsLeft, setSecondsLeft] = useState(TEST_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedRef = useRef(false);

  const answeredCount = userAnswers.filter(a => a.trim() !== "").length;

  const submitTest = useCallback(() => {
    if (savedRef.current) return;
    savedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    const result: CermatTestResult = {
      date: new Date().toISOString().slice(0, 10),
      score: testExamples.filter((ex, i) => checkAnswer(userAnswers[i] ?? "", ex.odpoved)).length,
      total: TEST_SIZE,
      pct: 0,
    };
    result.pct = Math.round((result.score / result.total) * 100);
    saveCermatResult(result);

    // Analytics (fire-and-forget)
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const uid = data.session?.user.id ?? null;
        trackEvent(uid, "cermat_test_dokoncen", {
          score: result.score, total: result.total, pct: result.pct, timed_out: false,
        }).catch(() => {});
      });
    }

    setPhase("results");
  }, [testExamples, userAnswers]);

  useEffect(() => {
    if (phase !== "test") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimedOut(true);
          submitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, submitTest]);

  // ── INTRO ──
  if (phase === "intro") {
    return (
      <div className="flex flex-col gap-5">
        <div
          className="rounded-2xl p-6 text-white"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 100%)" }}
        >
          <p className="text-4xl mb-3">🎯</p>
          <h1 className="text-2xl font-black">Simulace CERMAT testu</h1>
          <p className="text-blue-200 text-sm mt-2 leading-relaxed">
            15 příkladů ve stylu reálných přijímaček. Čas: 25 minut.
            Výsledky uvidíš až po dokončení — jako v pravém testu.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3">
          {[
            { icon: "📝", text: "15 příkladů z různých témat (mix obtížností)" },
            { icon: "⏱️", text: "Časový limit 25 minut" },
            { icon: "🚫", text: "Bez průběžné zpětné vazby — výsledky až na konci" },
            { icon: "📊", text: "Po skončení: bodové hodnocení + přehled chyb" },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-lg shrink-0">{icon}</span>
              <p className="text-sm text-slate-700">{text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={() => setPhase("test")}
          className="w-full py-4 text-white font-black rounded-2xl text-lg"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          Spustit test →
        </button>
        <Link href="/trenink" className="block text-center text-sm text-slate-400 hover:text-slate-600">
          ← Zpět na trénink
        </Link>
      </div>
    );
  }

  // ── RESULTS ──
  if (phase === "results") {
    const score = testExamples.filter((ex, i) => checkAnswer(userAnswers[i] ?? "", ex.odpoved)).length;
    const pct = Math.round((score / TEST_SIZE) * 100);
    const rating = getRating(pct);
    const CERMAT_AVG_PCT = 55; // approx. Czech CERMAT admission test average

    const wrong = testExamples
      .map((ex, i) => ({ ex, userAnswer: userAnswers[i] ?? "", correct: checkAnswer(userAnswers[i] ?? "", ex.odpoved) }))
      .filter(x => !x.correct);

    // Per-topic breakdown
    const topicMap = new Map<string, { correct: number; total: number }>();
    testExamples.forEach((ex, i) => {
      const entry = topicMap.get(ex.tema) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (checkAnswer(userAnswers[i] ?? "", ex.odpoved)) entry.correct += 1;
      topicMap.set(ex.tema, entry);
    });
    const topicBreakdown = Array.from(topicMap.entries())
      .map(([tema, { correct, total }]) => ({
        tema,
        label: TEMA_LABELS[tema] ?? tema,
        correct,
        total,
        pct: Math.round((correct / total) * 100),
      }))
      .sort((a, b) => a.pct - b.pct);

    return (
      <div className="flex flex-col gap-5">
        {/* Header result card */}
        <div
          className="rounded-2xl p-7 text-center text-white"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <p className="text-5xl mb-2">{rating.emoji}</p>
          <p className="text-5xl font-black">{pct} %</p>
          <p className="text-xl font-bold mt-1">{rating.label}</p>
          <p className="text-blue-200 mt-2 text-sm">
            {score} z {TEST_SIZE} správně · {score} bod{score === 1 ? "" : score < 5 ? "y" : "ů"}
          </p>
          {timedOut && <p className="text-yellow-300 text-xs mt-1">⏱ Čas vypršel</p>}
        </div>

        {/* Stats row — user score vs CERMAT average */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Správně</p>
            <p className="text-2xl font-black" style={{ color: "#16a34a" }}>{score}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">Chybně</p>
            <p className="text-2xl font-black" style={{ color: "#dc2626" }}>{TEST_SIZE - score}</p>
          </div>
          <div
            className="rounded-xl border p-3 text-center"
            style={{
              background: pct >= CERMAT_AVG_PCT ? "#f0fdf4" : "#fef2f2",
              borderColor: pct >= CERMAT_AVG_PCT ? "#bbf7d0" : "#fecaca",
            }}
          >
            <p className="text-xs font-medium mb-1" style={{ color: pct >= CERMAT_AVG_PCT ? "#166534" : "#991b1b" }}>
              vs. průměr
            </p>
            <p className="text-lg font-black" style={{ color: pct >= CERMAT_AVG_PCT ? "#16a34a" : "#dc2626" }}>
              {pct >= CERMAT_AVG_PCT ? `+${pct - CERMAT_AVG_PCT}` : `${pct - CERMAT_AVG_PCT}`} %
            </p>
          </div>
        </div>

        {/* Comparison bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
            📊 Srovnání s průměrem CERMAT
          </p>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-slate-700">Tvůj výsledek</span>
                <span className="font-black" style={{ color: pct >= 70 ? "#16a34a" : pct >= CERMAT_AVG_PCT ? "#2E6DA4" : "#dc2626" }}>
                  {pct} %
                </span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: pct >= 70 ? "#22c55e" : pct >= CERMAT_AVG_PCT ? "#2E6DA4" : "#ef4444",
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Průměrný uchazeč CERMAT</span>
                <span className="text-slate-400">{CERMAT_AVG_PCT} %</span>
              </div>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full bg-slate-300" style={{ width: `${CERMAT_AVG_PCT}%` }} />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {pct >= 80 ? "🏆 Skvělý výsledek! Jsi výrazně nad průměrem přijímaček."
              : pct >= CERMAT_AVG_PCT ? "✅ Nad průměrem. Pokračuj v tréninku a udržuj si náskok."
              : "📚 Pod průměrem. Procvičuj slabá témata (viz níže) — rozdíl lze dohnat."}
          </p>
        </div>

        {/* Per-topic breakdown */}
        {topicBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">
              🎯 Výsledky podle témat
            </p>
            <div className="flex flex-col gap-3">
              {topicBreakdown.map(({ tema, label, correct, total, pct: tPct }) => (
                <div key={tema}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-700">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{correct}/{total}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: tPct === 100 ? "#f0fdf4" : tPct >= 50 ? "#eff6ff" : "#fef2f2",
                          color: tPct === 100 ? "#16a34a" : tPct >= 50 ? "#2563eb" : "#dc2626",
                        }}
                      >
                        {tPct} %
                      </span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${tPct}%`,
                        background: tPct === 100 ? "#22c55e" : tPct >= 50 ? "#2E6DA4" : "#ef4444",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {topicBreakdown[0]?.pct < 50 && (
              <div
                className="mt-4 px-4 py-3 rounded-xl flex items-center gap-2"
                style={{ background: "#fef9c3", border: "1px solid #fde68a" }}
              >
                <span className="text-base">💡</span>
                <p className="text-xs font-medium text-amber-800">
                  Nejslabší téma: <strong>{topicBreakdown[0].label}</strong>. Doporučujeme zaměřit trénink právě tam.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Wrong answers */}
        {wrong.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold" style={{ color: "#0D1B3E" }}>
              ❌ Chybné odpovědi ({wrong.length})
            </h2>
            {wrong.map(({ ex, userAnswer }, i) => (
              <div key={i} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                <p className="text-xs font-semibold text-slate-500 mb-1">
                  {TEMA_LABELS[ex.tema] ?? ex.tema} · obtížnost {ex.obtiznost}
                </p>
                <p className="text-sm font-semibold text-slate-800 mb-2">
                  <MathText text={ex.zadani} />
                </p>
                <div className="flex flex-col gap-1">
                  {userAnswer.trim() && (
                    <p className="text-sm" style={{ color: "#dc2626" }}>
                      Tvoje odpověď: <strong>{userAnswer}</strong>
                    </p>
                  )}
                  <p className="text-sm" style={{ color: "#16a34a" }}>
                    Správně: <strong><MathText text={ex.odpoved} /></strong>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {wrong.length === 0 && (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ background: "#f0fdf4", border: "2px solid #bbf7d0" }}
          >
            <p className="text-2xl mb-1">🏆</p>
            <p className="font-black" style={{ color: "#15803d" }}>Perfektní výsledek!</p>
          </div>
        )}

        {/* CTA: practice weakest topic */}
        {topicBreakdown[0]?.pct < 100 && (
          <Link
            href={`/trenink?tema=${topicBreakdown[0].tema}`}
            className="block w-full py-3 text-center font-bold text-sm rounded-xl"
            style={{ background: "#eff6ff", color: "#2E6DA4", border: "1px solid #bfdbfe" }}
          >
            📚 Procvičit {topicBreakdown[0].label} →
          </Link>
        )}

        <div className="flex flex-col gap-2">
          <Link
            href="/trenink"
            className="block w-full py-3 text-white font-bold rounded-xl text-center text-base"
            style={{ background: "#0D1B3E" }}
          >
            Pokračovat v tréninku →
          </Link>
          <button
            onClick={() => {
              savedRef.current = false;
              setUserAnswers(Array(TEST_SIZE).fill(""));
              setSecondsLeft(TEST_SECONDS);
              setTimedOut(false);
              setPhase("intro");
            }}
            className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
          >
            🔄 Zkusit znovu
          </button>
        </div>
      </div>
    );
  }

  // ── TEST ──
  const urgency = secondsLeft < 300; // last 5 minutes → red timer
  const almostDone = secondsLeft < 60;

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky timer header */}
      <div
        className="sticky top-0 z-30 rounded-2xl px-5 py-3 flex items-center justify-between"
        style={{ background: almostDone ? "#fef2f2" : urgency ? "#fff7ed" : "#0D1B3E", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}
      >
        <div>
          <p className="text-xs font-bold" style={{ color: almostDone ? "#dc2626" : urgency ? "#c2410c" : "rgba(255,255,255,0.6)" }}>
            {almostDone ? "⚠️ Méně než minuta!" : urgency ? "⏱ Zbývá málo času" : "CERMAT test"}
          </p>
          <p className="text-sm font-semibold" style={{ color: almostDone ? "#991b1b" : urgency ? "#9a3412" : "rgba(255,255,255,0.7)" }}>
            Odpovězeno {answeredCount}/{TEST_SIZE}
          </p>
        </div>
        <div
          className="text-3xl font-black font-mono"
          style={{ color: almostDone ? "#dc2626" : urgency ? "#ea580c" : "#fff" }}
        >
          {formatTime(secondsLeft)}
        </div>
      </div>

      {/* Questions */}
      {testExamples.map((ex, i) => (
        <div
          key={ex.id}
          className="bg-white rounded-2xl border p-5 flex flex-col gap-3"
          style={{ borderColor: userAnswers[i].trim() ? "#bfdbfe" : "#e2e8f0" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                style={{ background: userAnswers[i].trim() ? "#2E6DA4" : "#94a3b8" }}
              >
                {i + 1}
              </span>
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: "#eff6ff", color: "#2E6DA4" }}
              >
                {TEMA_LABELS[ex.tema] ?? ex.tema}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">obtížnost {ex.obtiznost}</span>
          </div>

          <p className="text-base font-semibold leading-snug" style={{ color: "#0D1B3E" }}>
            <MathText text={ex.zadani} large />
          </p>

          <input
            type="text"
            value={userAnswers[i]}
            onChange={(e) => {
              const next = [...userAnswers];
              next[i] = e.target.value;
              setUserAnswers(next);
            }}
            placeholder="Tvoje odpověď"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400 transition-colors"
            autoComplete="off"
          />
        </div>
      ))}

      {/* Submit button */}
      <button
        onClick={submitTest}
        disabled={answeredCount === 0}
        className="w-full py-4 text-white font-black rounded-2xl text-base disabled:opacity-40 transition-opacity"
        style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
      >
        {answeredCount === TEST_SIZE
          ? "Odevzdat test →"
          : `Odevzdat (${answeredCount}/${TEST_SIZE} odpovězeno)`}
      </button>
      <p className="text-center text-xs text-slate-400">
        Test se automaticky odevzdá po uplynutí času
      </p>
    </div>
  );
}
