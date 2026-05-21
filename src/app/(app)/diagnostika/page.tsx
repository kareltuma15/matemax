"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { examples } from "@/data/examples";
import { createCard } from "@/lib/sm2";
import { SM2Card } from "@/types";
import { isTopicLocked } from "@/lib/subscription";
import { usePremium } from "@/lib/premium";
import { supabase } from "@/lib/supabase";
import { remoteSyncDiagResults } from "@/lib/storage";
import { trackEvent } from "@/lib/analytics";

const CARDS_KEY = "matemax-cards";
const SEED_PER_WEAK_TOPIC = 10; // kolik nejlehčích karet přidáme pro každé slabé téma

function seedCardsFromDiag(results: Record<string, { correct: number; total: number }>) {
  let cards: SM2Card[] = [];
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    if (raw) cards = JSON.parse(raw) as SM2Card[];
  } catch { /* ignore */ }

  const existingIds = new Set(cards.map((c) => c.exampleId));
  const newCards: SM2Card[] = [];

  for (const [tema, { correct, total }] of Object.entries(results)) {
    const score = total > 0 ? correct / total : 1;
    if (score < 0.67) {
      // Slabé téma — přidej nejlehčí příklady s nextReview = teď (interval 1)
      const temaExamples = examples
        .filter((e) => e.tema === tema && !existingIds.has(e.id))
        .sort((a, b) => a.obtiznost - b.obtiznost)
        .slice(0, SEED_PER_WEAK_TOPIC);

      for (const ex of temaExamples) {
        const card = createCard(ex.id);
        // nextReview = teď → zobrazí se ihned v prvním tréninku
        newCards.push({ ...card, nextReview: Date.now() });
        existingIds.add(ex.id);
      }
    }
  }

  if (newCards.length > 0) {
    localStorage.setItem(CARDS_KEY, JSON.stringify([...cards, ...newCards]));
  }
}

interface DiagQuestion {
  id: number;
  text: string;
  options: string[];
  correct: number; // index
  tema: string;
}

const STEPS: { label: string; tema: string }[] = [
  { label: "Zlomky & procenta", tema: "zlomky" },
  { label: "Rovnice", tema: "rovnice" },
  { label: "Geometrie", tema: "geometrie" },
  { label: "Mocniny", tema: "mocniny" },
  { label: "Slovní úlohy", tema: "slovni_ulohy" },
  { label: "Různé", tema: "ruzne" },
];

const QUESTIONS: DiagQuestion[] = [
  // Krok 1 — Zlomky
  {
    id: 1,
    tema: "zlomky",
    text: "Vypočítej: ½ + ⅓ = ?",
    options: ["2/5", "5/6", "2/6", "1/6"],
    correct: 1,
  },
  {
    id: 2,
    tema: "zlomky",
    text: "Kolik je 30 % z čísla 120?",
    options: ["30", "36", "40", "42"],
    correct: 1,
  },
  {
    id: 3,
    tema: "zlomky",
    text: "Po slevě 25 % stojí výrobek 450 Kč. Jaká byla původní cena?",
    options: ["562,50 Kč", "675 Kč", "600 Kč", "540 Kč"],
    correct: 2,
  },
  // Krok 2 — Rovnice
  {
    id: 4,
    tema: "rovnice",
    text: "Vyřeš: 2x + 6 = 14",
    options: ["x = 3", "x = 4", "x = 5", "x = 10"],
    correct: 1,
  },
  {
    id: 5,
    tema: "rovnice",
    text: "Vyřeš: 3(x − 2) = x + 4",
    options: ["x = 4", "x = 3", "x = 5", "x = 7"],
    correct: 2,
  },
  {
    id: 6,
    tema: "rovnice",
    text: "Vyřeš nerovnici: 2x − 5 > 1",
    options: ["x > 2", "x > 3", "x < 3", "x > 6"],
    correct: 1,
  },
  // Krok 3 — Geometrie
  {
    id: 7,
    tema: "geometrie",
    text: "Obsah obdélníku o rozměrech 8 × 5 cm?",
    options: ["26 cm²", "13 cm²", "40 cm²", "45 cm²"],
    correct: 2,
  },
  {
    id: 8,
    tema: "geometrie",
    text: "Pravoúhlý trojúhelník, odvěsny 9 cm a 12 cm. Jak dlouhá je přepona?",
    options: ["13 cm", "15 cm", "21 cm", "11 cm"],
    correct: 1,
  },
  {
    id: 9,
    tema: "geometrie",
    text: "Objem válce: r = 5 cm, v = 6 cm (π ≈ 3,14)?",
    options: ["314 cm³", "188,4 cm³", "471 cm³", "942 cm³"],
    correct: 2,
  },
  // Krok 4 — Mocniny
  {
    id: 10,
    tema: "mocniny",
    text: "Zjednodušs: 3² × 3³",
    options: ["3⁶", "9⁵", "3⁵", "6⁵"],
    correct: 2,
  },
  {
    id: 11,
    tema: "mocniny",
    text: "Roznásob: (x + 3)(x − 2)",
    options: ["x² − x − 6", "x² + x + 6", "x² + x − 6", "x² − 5x − 6"],
    correct: 2,
  },
  {
    id: 12,
    tema: "mocniny",
    text: "Zjednodušs: √50 + √8",
    options: ["√58", "6√2", "7√2", "8√2"],
    correct: 2,
  },
  // Krok 5 — Slovní úlohy
  {
    id: 13,
    tema: "slovni_ulohy",
    text: "Auto jede rychlostí 90 km/h. Jak daleko ujede za 2 hodiny?",
    options: ["45 km", "180 km", "90 km", "270 km"],
    correct: 1,
  },
  {
    id: 14,
    tema: "slovni_ulohy",
    text: "Kolika různými způsoby lze seřadit 3 knihy na polici?",
    options: ["3", "9", "6", "12"],
    correct: 2,
  },
  {
    id: 15,
    tema: "slovni_ulohy",
    text: "Hodíme dvě kostky. Jaká je pravděpodobnost, že součet bodů je 8?",
    options: ["4/36", "5/36", "6/36", "8/36"],
    correct: 1,
  },
  // Krok 6 — Různé (poměr, úhly, logika)
  {
    id: 16,
    tema: "pomer_meritko",
    text: "Rozdělte 120 Kč v poměru 3 : 5. Kolik je větší část?",
    options: ["45 Kč", "60 Kč", "75 Kč", "80 Kč"],
    correct: 2,
  },
  {
    id: 17,
    tema: "uhly",
    text: "Jak velký je doplňkový úhel k úhlu 65°?",
    options: ["25°", "35°", "115°", "125°"],
    correct: 2,
  },
  {
    id: 18,
    tema: "logicke_ulohy",
    text: "Jan je starší než Petr. Petr je starší než Eva. Kdo je nejmladší?",
    options: ["Jan", "Petr", "Eva", "Nelze určit"],
    correct: 2,
  },
];

const QUESTIONS_PER_STEP = 3;

function getStepQuestions(stepIdx: number): DiagQuestion[] {
  return QUESTIONS.slice(stepIdx * QUESTIONS_PER_STEP, (stepIdx + 1) * QUESTIONS_PER_STEP);
}

export default function DiagnostikaPage() {
  const router = useRouter();
  const { isPremium } = usePremium();
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(QUESTIONS.length).fill(null));
  const [selected, setSelected] = useState<(number | null)[]>(Array(QUESTIONS_PER_STEP).fill(null));
  const [confirmed, setConfirmed] = useState(false);
  const [finished, setFinished] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("matemax-diag-done") === "1") setAlreadyDone(true);
  }, []);

  const stepQuestions = getStepQuestions(stepIdx);
  const allSelected = selected.every((s) => s !== null);

  function handleSelect(qInStep: number, optIdx: number) {
    if (confirmed) return;
    const next = [...selected];
    next[qInStep] = optIdx;
    setSelected(next);
  }

  function handleConfirm() {
    // Save answers
    const base = stepIdx * QUESTIONS_PER_STEP;
    const nextAnswers = [...answers];
    selected.forEach((s, i) => { nextAnswers[base + i] = s; });
    setAnswers(nextAnswers);
    setConfirmed(true);
  }

  function handleNext() {
    if (stepIdx + 1 >= STEPS.length) {
      // Save to localStorage and finish
      const base = stepIdx * QUESTIONS_PER_STEP;
      const finalAnswers = [...answers];
      selected.forEach((s, i) => { finalAnswers[base + i] = s; });

      const results: Record<string, { correct: number; total: number }> = {};
      // Initialize per-question tema (supports mixed-topic steps)
      QUESTIONS.forEach((q) => {
        if (!results[q.tema]) results[q.tema] = { correct: 0, total: 0 };
        results[q.tema].total++;
      });
      QUESTIONS.forEach((q, i) => {
        if (finalAnswers[i] === q.correct) results[q.tema].correct++;
      });

      localStorage.setItem("matemax-diag-results", JSON.stringify(results));
      localStorage.setItem("matemax-diag-done", "1");

      // Sync to Supabase + Loops if logged in (fire-and-forget)
      if (supabase) {
        supabase.auth.getSession().then(({ data }) => {
          if (data.session) {
            const uid = data.session.user.id;
            const token = data.session.access_token;
            remoteSyncDiagResults(uid, results).catch(() => {});
            const weakCount = Object.values(results).filter(v => v.total > 0 && v.correct / v.total < 0.67).length;
            trackEvent(uid, "diagnostika_dokoncena", { weak_topics: weakCount }).catch(() => {});
            // Notify Loops so D+1/D+3/D+7 automations can branch on diagDone
            fetch("/api/loops-event", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ event: "diag_completed" }),
            }).catch(() => {});
          }
        });
      }

      // Seed SM-2 karty: pro slabá témata (< 67 %) vytvoř karty s okamžitou prioritou
      seedCardsFromDiag(results);

      setFinished(true);
      setShowPlanModal(true);
      setTimeout(() => import("canvas-confetti").then(({ default: c }) => c({ particleCount: 100, spread: 70, origin: { y: 0.5 } })), 150);
    } else {
      setStepIdx((s) => s + 1);
      setSelected(Array(QUESTIONS_PER_STEP).fill(null));
      setConfirmed(false);
    }
  }

  if (alreadyDone && !finished) {
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center flex flex-col gap-4">
          <span className="text-4xl">✅</span>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "#0D1B3E" }}>
              Diagnostiku jsi již absolvoval
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Výsledky jsou uloženy a trénink je přizpůsoben tvým mezerám.
            </p>
          </div>
          <div className="flex flex-col gap-2 mt-2">
            <Link
              href="/trenink"
              className="w-full py-3 text-white font-semibold rounded-xl text-base text-center"
              style={{ background: "#0D1B3E" }}
            >
              Pokračovat v tréninku →
            </Link>
            <button
              onClick={() => {
                localStorage.removeItem("matemax-diag-done");
                localStorage.removeItem("matemax-diag-results");
                setAlreadyDone(false);
              }}
              className="w-full py-2.5 text-slate-600 font-medium rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition-colors"
            >
              🔄 Opakovat diagnostiku
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (finished) {
    return (
      <>
        {showPlanModal && <DiagPlanModal onStart={() => { setShowPlanModal(false); router.push("/trenink"); }} onClose={() => setShowPlanModal(false)} />}
        <DiagResults onStart={() => router.push("/trenink")} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "#0D1B3E" }}>
          Vstupní diagnostický test
        </h2>
        <p className="text-sm text-slate-500">Zjistíme, kde potřebuješ nejvíce procvičit.</p>
      </div>

      {/* Step indicator — viditelný progress bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-4 rounded-full transition-all duration-400"
              style={{
                background:
                  i < stepIdx ? "#2E6DA4" :
                  i === stepIdx ? "#2563eb" :
                  "#e2e8f0",
                boxShadow: i === stepIdx ? "0 0 0 3px rgba(37,99,235,0.25)" : "none",
              }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold" style={{ color: "#2E6DA4" }}>
            Krok {stepIdx + 1} z {STEPS.length}
          </span>
          <span className="font-semibold text-slate-600">
            {STEPS[stepIdx].label}
            {isTopicLocked(STEPS[stepIdx].tema, isPremium) && " 🔒"}
          </span>
        </div>
        {/* Step labels below bars */}
        <div className="hidden sm:flex gap-1.5">
          {STEPS.map((step, i) => (
            <div key={i} className="flex-1 text-center">
              <span
                className="text-xs leading-tight"
                style={{ color: i === stepIdx ? "#2E6DA4" : "#94a3b8", fontWeight: i === stepIdx ? 600 : 400 }}
              >
                {step.label}
                {isTopicLocked(step.tema, isPremium) && " 🔒"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Questions */}
      {stepQuestions.map((q, qInStep) => {
        const globalIdx = stepIdx * QUESTIONS_PER_STEP + qInStep;
        const sel = selected[qInStep];

        function getOptionStyle(optIdx: number): React.CSSProperties {
          if (confirmed) {
            if (optIdx === q.correct) return { border: "2px solid #22c55e", background: "#f0fdf4", color: "#15803d", fontWeight: 600 };
            if (sel === optIdx) return { border: "2px solid #f87171", background: "#fff1f2", color: "#dc2626", textDecoration: "line-through" };
            return { border: "2px solid #e2e8f0", background: "#fff", color: "#94a3b8" };
          }
          if (sel === optIdx) return { border: "3px solid #2563eb", background: "#dbeafe", color: "#1d4ed8", fontWeight: 700, boxShadow: "0 0 0 4px rgba(37,99,235,0.25)", transform: "translateX(3px)" };
          return { border: "2px solid #e2e8f0", background: "#fff", color: "#374151" };
        }

        return (
          <div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                style={{ background: "#2E6DA4" }}
              >
                {globalIdx + 1}
              </span>
              <p className="font-semibold text-base leading-snug" style={{ color: "#0D1B3E" }}>
                {q.text}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {q.options.map((opt, optIdx) => (
                <button
                  key={optIdx}
                  onClick={() => handleSelect(qInStep, optIdx)}
                  disabled={confirmed}
                  className="text-left px-4 py-3 rounded-xl transition-all text-sm cursor-pointer disabled:cursor-default"
                  style={getOptionStyle(optIdx)}
                >
                  <span
                    className="inline-block w-6 h-6 rounded-full text-xs font-bold text-center leading-6 mr-2 shrink-0"
                    style={{
                      background: sel === optIdx && !confirmed ? "#1d4ed8" : "#f1f5f9",
                      color: sel === optIdx && !confirmed ? "#fff" : "#64748b",
                    }}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
            {/* Per-question feedback */}
            {confirmed && (
              <p className="text-xs font-medium" style={{ color: sel === q.correct ? "#16a34a" : "#dc2626" }}>
                {sel === q.correct ? "✓ Správně!" : `✗ Správná odpověď: ${q.options[q.correct]}`}
              </p>
            )}
          </div>
        );
      })}

      {/* Action buttons */}
      {!confirmed ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleConfirm}
            disabled={!allSelected}
            className="w-full py-3.5 text-white font-bold rounded-xl text-base transition-all"
            style={{
              background: allSelected ? "#0D1B3E" : "#e2e8f0",
              color: allSelected ? "#fff" : "#94a3b8",
              cursor: allSelected ? "pointer" : "not-allowed",
              boxShadow: allSelected ? "0 4px 14px rgba(13,27,62,0.25)" : "none",
            }}
          >
            {allSelected ? "Zkontrolovat odpovědi ✓" : `Vyber odpovědi (${selected.filter(s => s !== null).length}/${QUESTIONS_PER_STEP})`}
          </button>
          {!allSelected && (
            <p className="text-center text-xs text-slate-400">Musíš odpovědět na všechny otázky</p>
          )}
        </div>
      ) : (
        <button
          onClick={handleNext}
          className="w-full py-3.5 text-white font-bold rounded-xl text-base"
          style={{ background: "#2E6DA4", boxShadow: "0 4px 14px rgba(46,109,164,0.3)" }}
        >
          {stepIdx + 1 >= STEPS.length ? "Zobrazit výsledky →" : "Další krok →"}
        </button>
      )}
    </div>
  );
}

// ── DiagPlanModal — aha-moment po dokončení diagnostiky ──────────────────────

function DiagPlanModal({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  let results: Record<string, { correct: number; total: number }> = {};
  try {
    const raw = localStorage.getItem("matemax-diag-results");
    if (raw) results = JSON.parse(raw);
  } catch { /* ignore */ }

  const rows = Object.entries(results)
    .filter(([, v]) => v.total > 0)
    .map(([tema, v]) => ({
      label: RESULT_LABELS[tema] ?? tema,
      pct: Math.round((v.correct / v.total) * 100),
    }))
    .sort((a, b) => a.pct - b.pct);

  const totalCorrect = Object.values(results).reduce((s, v) => s + v.correct, 0);
  const totalQ       = Object.values(results).reduce((s, v) => s + v.total, 0);
  const overall      = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

  const weakCount = rows.filter((r) => r.pct < 67).length;
  const focus = rows.slice(0, 2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="px-6 py-7 text-center"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <p className="text-5xl mb-3">🎯</p>
          <h2 className="text-xl font-black text-white">Tvůj plán je připraven!</h2>
          <p className="text-sm text-blue-200 mt-1">
            Celková úspěšnost: <strong className="text-white">{overall} %</strong>
            {weakCount > 0 && ` · ${weakCount} ${weakCount === 1 ? "téma" : weakCount <= 4 ? "témata" : "témat"} k procvičení`}
          </p>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          {focus.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Začni těmito tématy</p>
              {focus.map(({ label, pct }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl px-4 py-3 border"
                  style={{ borderColor: "#e2e8f0", background: "#f8fafc" }}
                >
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded-full"
                    style={{ background: pct < 50 ? "#fef2f2" : "#fff7ed", color: pct < 50 ? "#991b1b" : "#92400e" }}
                  >
                    {pct} %
                  </span>
                </div>
              ))}
            </div>
          )}

          <div
            className="rounded-xl p-3 text-center"
            style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}
          >
            <p className="text-xs text-green-700 font-medium">
              ✅ MateMax sestavil tréninkový plán přesně pro tebe. Algoritmus se zaměří na slabá místa jako první.
            </p>
          </div>

          <button
            onClick={onStart}
            className="w-full py-3.5 text-white font-black rounded-xl text-base"
            style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
          >
            Spustit první trénink →
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
          >
            Zobrazit detailní výsledky
          </button>
        </div>
      </div>
    </div>
  );
}

// Human-readable labels for all temas that may appear in results
const RESULT_LABELS: Record<string, string> = {
  zlomky:              "Zlomky & procenta",
  procenta:            "Procenta",
  rovnice:             "Rovnice",
  geometrie:           "Geometrie",
  mocniny:             "Mocniny",
  slovni_ulohy:        "Slovní úlohy",
  pomer_meritko:       "Poměr a měřítko",
  uhly:                "Úhly",
  logicke_ulohy:       "Logické úlohy",
};

function DiagResults({ onStart }: { onStart: () => void }) {
  let results: Record<string, { correct: number; total: number }> = {};
  try {
    const raw = localStorage.getItem("matemax-diag-results");
    if (raw) results = JSON.parse(raw);
  } catch { /* ignore */ }

  // Build rows from actual result temas (not just STEPS)
  const rows = Object.entries(results)
    .filter(([, v]) => v.total > 0)
    .map(([tema, v]) => ({
      tema,
      label: RESULT_LABELS[tema] ?? tema,
      correct: v.correct,
      total: v.total,
    }));

  const weakest = rows.length > 0
    ? rows.reduce((a, b) => (a.correct / a.total) <= (b.correct / b.total) ? a : b)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "#0D1B3E" }}>Tvoje mapa mezer</h2>
        <p className="text-sm text-slate-500">Výsledky diagnostického testu</p>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const pct = Math.round((row.correct / row.total) * 100);
          const barColor = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";
          const textColor = pct >= 80 ? "text-green-700" : pct >= 50 ? "text-amber-600" : "text-red-600";
          return (
            <div key={row.tema} className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold" style={{ color: "#0D1B3E" }}>{row.label}</span>
                <span className={`text-sm font-bold ${textColor}`}>{row.correct}/{row.total} správně</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: barColor }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {weakest && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-indigo-800">
            💡 Doporučení: Začni procvičovat <strong>{weakest.label}</strong> — tam je největší prostor pro zlepšení.
          </p>
        </div>
      )}

      <button
        onClick={onStart}
        className="w-full py-3 text-white font-semibold rounded-xl text-base"
        style={{ background: "#0D1B3E" }}
      >
        Začít trénovat →
      </button>
    </div>
  );
}
