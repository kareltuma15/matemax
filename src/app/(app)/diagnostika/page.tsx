"use client";

import React, { useState, useEffect } from "react";
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

// 8 CERMAT témat — žádné "Různé", žádné nerovnice ani pravděpodobnost
const STEPS: { label: string; tema: string }[] = [
  { label: "Zlomky",       tema: "zlomky" },
  { label: "Výrazy",       tema: "vyrazy" },
  { label: "Rovnice",      tema: "rovnice" },
  { label: "Geometrie",    tema: "geometrie" },
  { label: "Slovní úlohy", tema: "slovni_ulohy" },
  { label: "Grafy a logika", tema: "grafy_logika" },
  { label: "Konstrukce",   tema: "konstrukce" },
  { label: "Úhly",         tema: "uhly" },
];

// 16 otázek: 2 per téma, distribuce správných odpovědí A/B/C/D rovnoměrná (4× každá)
const QUESTIONS: DiagQuestion[] = [
  // ── Krok 1: Zlomky ──────────────────────────────────────────────────────────
  {
    id: 1,
    tema: "zlomky",
    text: "Vypočti: ¾ − ⅓",
    options: ["5/12", "4/12", "1/4", "7/12"],
    correct: 0, // A: 9/12 − 4/12 = 5/12
  },
  {
    id: 2,
    tema: "zlomky",
    text: "Vyjádři zlomek 18/24 v základním tvaru.",
    options: ["9/12", "6/8", "3/4", "2/3"],
    correct: 2, // C: GCD(18,24)=6 → 3/4
  },
  // ── Krok 2: Výrazy ──────────────────────────────────────────────────────────
  {
    id: 3,
    tema: "vyrazy",
    text: "Roznásob závorku: (x + 3)²",
    options: ["x² + 9", "x² + 6x + 9", "x² + 3x + 9", "x² − 6x + 9"],
    correct: 1, // B: (a+b)² = a²+2ab+b²
  },
  {
    id: 4,
    tema: "vyrazy",
    text: "Rozlož na součin: a² − 16",
    options: ["(a − 4)²", "a(a − 16)", "(a + 4)²", "(a − 4)(a + 4)"],
    correct: 3, // D: rozdíl čtverců a²−b²=(a−b)(a+b)
  },
  // ── Krok 3: Rovnice ─────────────────────────────────────────────────────────
  {
    id: 5,
    tema: "rovnice",
    text: "Vyřeš: 4x − 6 = 2x + 8",
    options: ["x = 7", "x = 4", "x = 3", "x = 1"],
    correct: 0, // A: 2x=14 → x=7
  },
  {
    id: 6,
    tema: "rovnice",
    text: "Vyřeš soustavu rovnic: x + y = 10,  x − y = 4",
    options: ["x = 3, y = 7", "x = 4, y = 6", "x = 7, y = 3", "x = 6, y = 4"],
    correct: 2, // C: sečtením 2x=14→x=7, y=3
  },
  // ── Krok 4: Geometrie ───────────────────────────────────────────────────────
  {
    id: 7,
    tema: "geometrie",
    text: "Pravoúhlý trojúhelník má odvěsny 6 cm a 8 cm. Jaká je délka přepony?",
    options: ["7 cm", "10 cm", "12 cm", "14 cm"],
    correct: 1, // B: √(36+64)=√100=10
  },
  {
    id: 8,
    tema: "geometrie",
    text: "Objem kvádru o rozměrech 4 cm × 3 cm × 5 cm:",
    options: ["24 cm³", "47 cm³", "94 cm³", "60 cm³"],
    correct: 3, // D: 4×3×5=60
  },
  // ── Krok 5: Slovní úlohy ────────────────────────────────────────────────────
  {
    id: 9,
    tema: "slovni_ulohy",
    text: "Vlak jede rychlostí 90 km/h. Za jak dlouho ujede 270 km?",
    options: ["2 hod", "2,5 hod", "3 hod", "4 hod"],
    correct: 2, // C: t = 270/90 = 3
  },
  {
    id: 10,
    tema: "slovni_ulohy",
    text: "Pracovník A zvládne práci za 6 hod, pracovník B za 4 hod. Za jak dlouho ji zvládnou společně?",
    options: ["2,4 hod", "5 hod", "3 hod", "2 hod"],
    correct: 0, // A: 1/(1/6+1/4)=12/5=2,4
  },
  // ── Krok 6: Grafy a logika ──────────────────────────────────────────────────
  {
    id: 11,
    tema: "grafy_logika",
    text: "V koláčovém grafu jedno pole zaujímá 72°. Kolik procent celku představuje?",
    options: ["25 %", "33 %", "15 %", "20 %"],
    correct: 3, // D: 72/360=0,2=20 %
  },
  {
    id: 12,
    tema: "grafy_logika",
    text: "Posloupnost: 1, 3, 7, 13, 21, … Jaké je následující číslo?",
    options: ["27", "31", "28", "33"],
    correct: 1, // B: rozdíly +2,+4,+6,+8 → +10 → 31
  },
  // ── Krok 7: Konstrukční úlohy (s obrázkem) ──────────────────────────────────
  {
    id: 13,
    tema: "konstrukce",
    text: "Chceš sestrojit osu úsečky AB. Jaký je PRVNÍ krok?",
    options: [
      "Narýsuj kružnici se středem A procházející bodem B",
      "Přilož pravítko a nakresli přímku AB",
      "Naměř délku AB a vyznač její střed pravítkem",
      "Narýsuj kolmici v bodě A na úsečku AB",
    ],
    correct: 0, // A: kružnice ze dvou středů → průsečíky dají osu
  },
  {
    id: 14,
    tema: "konstrukce",
    text: "Lze sestrojit trojúhelník se stranami 4 cm, 6 cm a 11 cm?",
    options: [
      "Ano, vždy lze",
      "Ano, ale pouze jako tupouhlý",
      "Ne, trojúhelník nelze sestrojit",
      "Záleží na pořadí zadaných stran",
    ],
    correct: 2, // C: 4+6=10 < 11 — trojúhelníková nerovnost nesplněna
  },
  // ── Krok 8: Úhly ────────────────────────────────────────────────────────────
  {
    id: 15,
    tema: "uhly",
    text: "V trojúhelníku jsou dva vnitřní úhly 55° a 75°. Jak velký je třetí vnitřní úhel?",
    options: ["40°", "60°", "45°", "50°"],
    correct: 3, // D: 180−55−75=50°
  },
  {
    id: 16,
    tema: "uhly",
    text: "Přímky p a q jsou rovnoběžné, příčka je protíná. Střídavé vnitřní úhly jsou:",
    options: [
      "Doplňkové — jejich součet je 90°",
      "Shodné — jsou si rovny",
      "Vedlejší — jejich součet je 180°",
      "Různé — záleží na sklonu příčky",
    ],
    correct: 1, // B: střídavé úhly u rovnoběžek jsou shodné
  },
];

const QUESTIONS_PER_STEP = 2;

// SVG ilustrace ke konstrukčním otázkám
const QUESTION_IMAGES: Record<number, React.ReactNode> = {
  // Q13 — osa úsečky AB
  13: (
    <div className="my-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
      <svg viewBox="0 0 240 68" className="w-full" style={{ maxHeight: 68 }} aria-hidden="true">
        <circle cx="28" cy="38" r="5" fill="#0D1B3E" />
        <text x="28" y="22" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0D1B3E">A</text>
        <circle cx="212" cy="38" r="5" fill="#0D1B3E" />
        <text x="212" y="22" textAnchor="middle" fontSize="13" fontWeight="bold" fill="#0D1B3E">B</text>
        <line x1="33" y1="38" x2="207" y2="38" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="7,5" />
        <text x="120" y="62" textAnchor="middle" fontSize="11" fill="#64748b">úsečka AB</text>
      </svg>
    </div>
  ),
  // Q14 — tři délky stran
  14: (
    <div className="my-1 px-4 py-3 bg-slate-50 rounded-xl border border-slate-200">
      <svg viewBox="0 0 260 96" className="w-full" style={{ maxHeight: 96 }} aria-hidden="true">
        <line x1="10" y1="22" x2="90" y2="22" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
        <text x="50" y="15" textAnchor="middle" fontSize="11" fill="#64748b">4 cm</text>
        <line x1="10" y1="52" x2="130" y2="52" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
        <text x="70" y="45" textAnchor="middle" fontSize="11" fill="#64748b">6 cm</text>
        <line x1="10" y1="82" x2="230" y2="82" stroke="#2E6DA4" strokeWidth="3.5" strokeLinecap="round" />
        <text x="120" y="75" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#2E6DA4">11 cm</text>
      </svg>
    </div>
  ),
};

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
            {QUESTION_IMAGES[q.id]}
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
  zlomky:       "Zlomky",
  vyrazy:       "Výrazy",
  rovnice:      "Rovnice",
  geometrie:    "Geometrie",
  slovni_ulohy: "Slovní úlohy",
  grafy_logika: "Grafy a logika",
  konstrukce:   "Konstrukční úlohy",
  uhly:         "Úhly",
};

function DiagResults({ onStart }: { onStart: () => void }) {
  let results: Record<string, { correct: number; total: number }> = {};
  try {
    const raw = localStorage.getItem("matemax-diag-results");
    if (raw) results = JSON.parse(raw);
  } catch { /* ignore */ }

  const rows = Object.entries(results)
    .filter(([, v]) => v.total > 0)
    .map(([tema, v]) => ({
      tema,
      label: RESULT_LABELS[tema] ?? tema,
      pct: Math.round((v.correct / v.total) * 100),
      correct: v.correct,
      total: v.total,
    }))
    .sort((a, b) => a.pct - b.pct); // nejslabší první

  const procvicit = rows.filter((r) => r.pct < 50);
  const posilit   = rows.filter((r) => r.pct >= 50 && r.pct < 80);
  const zvladas   = rows.filter((r) => r.pct >= 80);

  const topWeakest = procvicit[0] ?? posilit[0] ?? null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "#0D1B3E" }}>Tvoje mapa mezer</h2>
        <p className="text-sm text-slate-500">Výsledky diagnostického testu</p>
      </div>

      {/* Procvičit — slabá místa */}
      {procvicit.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-black uppercase tracking-widest px-1" style={{ color: "#dc2626" }}>
            🔴 Procvičit — tady máš mezery
          </p>
          {procvicit.map((row) => (
            <div
              key={row.tema}
              className="rounded-xl p-4 flex items-center justify-between gap-3"
              style={{ background: "#fef2f2", border: "1.5px solid #fecaca" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold" style={{ color: "#991b1b" }}>{row.label}</p>
                <p className="text-xs mt-0.5" style={{ color: "#dc2626" }}>
                  {row.correct} z {row.total} správně · {row.pct} %
                </p>
              </div>
              <button
                onClick={onStart}
                className="shrink-0 text-xs font-black px-3 py-2 rounded-lg text-white"
                style={{ background: "#dc2626" }}
              >
                Procvičit →
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Posílit — střed */}
      {posilit.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-black uppercase tracking-widest px-1" style={{ color: "#d97706" }}>
            🟡 Posílit — jde to, ale dá se zlepšit
          </p>
          {posilit.map((row) => (
            <div
              key={row.tema}
              className="rounded-xl p-3 flex items-center justify-between gap-3"
              style={{ background: "#fffbeb", border: "1.5px solid #fde68a" }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "#92400e" }}>{row.label}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-amber-100 rounded-full h-1.5 overflow-hidden">
                    <div className="h-1.5 rounded-full" style={{ width: `${row.pct}%`, background: "#f59e0b" }} />
                  </div>
                  <span className="text-xs font-bold shrink-0" style={{ color: "#d97706" }}>{row.pct} %</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zvládáš — silná témata */}
      {zvladas.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-black uppercase tracking-widest px-1" style={{ color: "#16a34a" }}>
            🟢 Zvládáš — tohle ti jde
          </p>
          <div className="flex flex-wrap gap-2">
            {zvladas.map((row) => (
              <span
                key={row.tema}
                className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5"
                style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534" }}
              >
                ✓ {row.label} · {row.pct} %
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CTA — začni od nejslabšího */}
      {topWeakest && (
        <div
          className="rounded-xl p-4 flex items-center gap-3"
          style={{ background: "#eff6ff", border: "1.5px solid #bfdbfe" }}
        >
          <span className="text-2xl shrink-0">🎯</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black" style={{ color: "#1e40af" }}>
              Začni s: {topWeakest.label}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#3b82f6" }}>
              Největší prostor pro zlepšení — MateMax připraví příklady přesně pro tebe
            </p>
          </div>
        </div>
      )}

      <button
        onClick={onStart}
        className="w-full py-3 text-white font-bold rounded-xl text-base"
        style={{ background: "#0D1B3E" }}
      >
        Začít trénovat →
      </button>
    </div>
  );
}
