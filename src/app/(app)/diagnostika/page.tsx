"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { examples } from "@/data/examples";
import { createCard } from "@/lib/sm2";
import { SM2Card, DBExample } from "@/types";
import { supabase } from "@/lib/supabase";
import { remoteSyncDiagResults } from "@/lib/storage";
import { trackEvent } from "@/lib/analytics";
import MoznostiCard from "@/components/MoznostiCard";
import ConstructionMarkCard from "@/components/ConstructionMarkCard";
import pool from "@/data/diagnostika.json";
import { DIAG_WEAK_BELOW } from "@/lib/levels";

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
    if (score < DIAG_WEAK_BELOW) {
      // Slabé téma (výsledek pod prahem odemčení L2) — přidej nejlehčí příklady s nextReview = teď (interval 1)
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

/**
 * Adaptivní diagnostika: v každém z 8 témat žák dostane 2 otázky.
 *   1. otázka = úroveň L2 (středně těžká),
 *   2. otázka = úroveň L3 (styl CERMAT), pokud první zodpověděl správně, jinak L1 (základ).
 * Výsledek tématu (uložený jako correct z total = 3):
 *   3 = L2 ✓ + L3 ✓ — zvládá i úlohy na úrovni přijímaček,
 *   2 = L2 ✓ + L3 ✗ — základy i střední úlohy sedí, těžké ještě ne,
 *   1 = L2 ✗ + L1 ✓ — základ ano, střední úlohy ne,
 *   0 = L2 ✗ + L1 ✗ — začít od základů.
 * Oproti dřívějším 16 pevným otázkám na úrovni L1 to rozliší i silného žáka.
 * Otázky jsou v src/data/diagnostika.json (24 = 8 témat × 3 úrovně, všechny výběr A–E).
 */
const QUESTIONS_PER_STEP = 2;
const POOL = pool.questions as unknown as DBExample[];
const TOTAL_QUESTIONS = STEPS.length * QUESTIONS_PER_STEP;
const SCORE_TOTAL = 3; // maximální skóre tématu

function questionFor(tema: string, level: 1 | 2 | 3): DBExample {
  const q = POOL.find((e) => e.tema === tema && e.obtiznost === level);
  if (!q) throw new Error(`Diagnostika: chybí otázka ${tema} L${level}`);
  return q;
}

/** Popis výsledku tématu pro žáka (skóre 0–3 z 3; starší výsledky z 2 otázek se ukazují jako „x z y"). */
function levelText(correct: number, total: number): string {
  if (total !== SCORE_TOTAL) return `${correct} z ${total} správně`;
  return ["Začneme od základů", "Základ ano, střední úlohy zatím ne", "Základy i střední úlohy sedí", "Zvládáš i úlohy na úrovni přijímaček"][Math.min(3, Math.max(0, correct))];
}

export default function DiagnostikaPage() {
  const router = useRouter();
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<0 | 1>(0); // 0 = 1. otázka tématu (L2), 1 = adaptivní 2. otázka
  const [firstCorrect, setFirstCorrect] = useState(false);
  const [results, setResults] = useState<Record<string, { correct: number; total: number }>>({});
  const [finished, setFinished] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("matemax-diag-done") === "1") setAlreadyDone(true);
  }, []);

  const tema = STEPS[stepIdx].tema;
  const current = phase === 0 ? questionFor(tema, 2) : questionFor(tema, firstCorrect ? 3 : 1);
  const currentIdx = stepIdx * QUESTIONS_PER_STEP + phase;

  function finalize(finalResults: Record<string, { correct: number; total: number }>) {
    localStorage.setItem("matemax-diag-results", JSON.stringify(finalResults));
    localStorage.setItem("matemax-diag-done", "1");

    // Sync to Supabase + Loops if logged in (fire-and-forget)
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          const uid = data.session.user.id;
          const token = data.session.access_token;
          remoteSyncDiagResults(uid, finalResults).catch(() => {});
          const weakCount = Object.values(finalResults).filter(v => v.total > 0 && v.correct / v.total < DIAG_WEAK_BELOW).length;
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

    // Seed SM-2 karty: pro slabá témata (pod prahem) vytvoř karty s okamžitou prioritou
    seedCardsFromDiag(finalResults);

    setFinished(true);
    setShowPlanModal(true);
    setTimeout(() => import("canvas-confetti").then(({ default: c }) => c({ particleCount: 100, spread: 70, origin: { y: 0.5 } })), 150);
  }

  function handleResult(correct: boolean) {
    if (phase === 0) {
      setFirstCorrect(correct);
      setPhase(1);
      return;
    }
    // 2. otázka tématu → skóre 0–3 (viz komentář u QUESTIONS_PER_STEP)
    const score = firstCorrect ? (correct ? 3 : 2) : (correct ? 1 : 0);
    const nextResults = { ...results, [tema]: { correct: score, total: SCORE_TOTAL } };
    setResults(nextResults);

    if (stepIdx + 1 >= STEPS.length) {
      finalize(nextResults);
    } else {
      setStepIdx((i) => i + 1);
      setPhase(0);
      setFirstCorrect(false);
    }
  }

  if (alreadyDone && !finished) {
    return (
      <div className="flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center flex flex-col gap-4">
          <span className="text-4xl">✅</span>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
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
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
          Vstupní diagnostický test
        </h2>
        <p className="text-sm text-slate-500">
          16 otázek, 2 z každého tématu. Test se přizpůsobuje: když odpovíš správně, dostaneš těžší úlohu ve stylu přijímaček, když ne, lehčí. Díky tomu zjistíme, kde přesně stojíš.
        </p>
      </div>

      {/* Step indicator — viditelný progress bar (8 kroků po 2 otázkách) */}
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
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Otázka — stejná karta jako v tréninku (KaTeX + obrázky zdarma) */}
      {current.konstrukce_scena ? (
        <ConstructionMarkCard
          key={current.id}
          example={current}
          cardNumber={currentIdx + 1}
          total={TOTAL_QUESTIONS}
          onResult={handleResult}
        />
      ) : (
        <MoznostiCard
          key={current.id}
          example={current}
          cardNumber={currentIdx + 1}
          total={TOTAL_QUESTIONS}
          onResult={handleResult}
        />
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

  const weakCount = rows.filter((r) => r.pct < DIAG_WEAK_BELOW * 100).length;
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
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Začni těmito tématy</p>
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
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Tvoje mapa mezer</h2>
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
                  {levelText(row.correct, row.total)}
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
                  <span className="text-xs font-bold shrink-0" style={{ color: "#d97706" }}>{levelText(row.correct, row.total)}</span>
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
                ✓ {row.label}
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
