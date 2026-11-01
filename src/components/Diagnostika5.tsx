"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { examples5 } from "@/data/examples";
import { diag5Question } from "@/data/diagnostika-5";
import { createCard } from "@/lib/sm2";
import { supabase } from "@/lib/supabase";
import { remoteSyncDiagResults } from "@/lib/storage";
import { trackEvent } from "@/lib/analytics";
import { DIAG_WEAK_BELOW } from "@/lib/levels";
import { usePremium } from "@/lib/premium";
import { FREE_TOPICS_5 } from "@/lib/subscription";
import { TEMATA_ORDER_5, TEMA_LABELS, type SM2Card, type DBExample } from "@/types";
import MoznostiCard from "@/components/MoznostiCard";
import VicOdpovediCard from "@/components/VicOdpovediCard";
import PracticeCard from "@/components/PracticeCard";
import ConstructionMarkCard from "@/components/ConstructionMarkCard";

type Vysledky = Record<string, { correct: number; total: number }>;

const CARDS_KEY = "matemax-cards";
const RESULTS_KEY = "matemax-diag-results";
const SEED_PER_WEAK_TOPIC = 10; // kolik nejlehčích úloh přidáme do tréninku pro každý slabý okruh
const SCORE_TOTAL = 3;          // maximální skóre okruhu
const STEPS = TEMATA_ORDER_5.map((tema) => ({ tema, label: TEMA_LABELS[tema] ?? tema }));
const QUESTIONS_PER_STEP = 2;
const TOTAL_QUESTIONS = STEPS.length * QUESTIONS_PER_STEP;

function readResults(): Vysledky {
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    return raw ? (JSON.parse(raw) as Vysledky) : {};
  } catch {
    return {};
  }
}

/** Žák už diagnostiku pro 5. třídu dělal, když jsou uložené výsledky aspoň jednoho okruhu 5. třídy. */
function hasDone5(): boolean {
  return Object.keys(readResults()).some((t) => t.startsWith("p5_"));
}

/** Slabé okruhy (výsledek pod prahem odemčení L2) dostanou do tréninku nejlehčí úlohy s okamžitou prioritou. */
function seedCards(results: Vysledky) {
  let cards: SM2Card[] = [];
  try {
    const raw = localStorage.getItem(CARDS_KEY);
    if (raw) cards = JSON.parse(raw) as SM2Card[];
  } catch { /* ignore */ }
  const existing = new Set(cards.map((c) => c.exampleId));
  const added: SM2Card[] = [];
  for (const [tema, { correct, total }] of Object.entries(results)) {
    if (!tema.startsWith("p5_") || total <= 0 || correct / total >= DIAG_WEAK_BELOW) continue;
    const pool = examples5.filter((e) => e.tema === tema && !existing.has(e.id)).sort((a, b) => a.obtiznost - b.obtiznost).slice(0, SEED_PER_WEAK_TOPIC);
    for (const ex of pool) {
      added.push({ ...createCard(ex.id), nextReview: Date.now() });
      existing.add(ex.id);
    }
  }
  if (added.length > 0) localStorage.setItem(CARDS_KEY, JSON.stringify([...cards, ...added]));
}

function levelText(correct: number): string {
  return ["Začneme od základů", "Základ ano, střední úlohy zatím ne", "Základy i střední úlohy sedí", "Zvládáš i úlohy na úrovni přijímaček"][Math.min(3, Math.max(0, correct))];
}

function pickStart(results: Vysledky, reachable: Set<string>): string | null {
  const rows = Object.entries(results)
    .filter(([t, v]) => t.startsWith("p5_") && v.total > 0)
    .map(([tema, v]) => ({ tema, pct: v.correct / v.total }))
    .sort((a, b) => a.pct - b.pct);
  return rows.find((r) => reachable.has(r.tema))?.tema ?? null;
}

function Otazka({ example, cardNumber, onResult }: { example: DBExample; cardNumber: number; onResult: (correct: boolean) => void }) {
  if (example.konstrukce_scena) return <ConstructionMarkCard key={example.id} example={example} cardNumber={cardNumber} total={TOTAL_QUESTIONS} onResult={onResult} />;
  if ((example.podulohy && example.podulohy.length > 0) || example.prirazeni) return <VicOdpovediCard key={example.id} example={example} cardNumber={cardNumber} total={TOTAL_QUESTIONS} onResult={onResult} />;
  if (example.moznosti && example.moznosti.length > 0) return <MoznostiCard key={example.id} example={example} cardNumber={cardNumber} total={TOTAL_QUESTIONS} onResult={onResult} />;
  return <PracticeCard key={example.id} example={example} cardNumber={cardNumber} total={TOTAL_QUESTIONS} consecutiveCorrect={0} noRetry onResult={(c) => onResult(c)} />;
}

/**
 * Adaptivní diagnostika pro 5. třídu: v každém z 8 okruhů dvě úlohy.
 * 1. úloha = L2; správně → 2. úloha je L3, špatně → 2. úloha je L1. Skóre okruhu 0–3 (stejně jako u 9. třídy).
 * Výsledky se přidají k ostatním v `matemax-diag-results` (okruhy 5. třídy mají předponu p5_, takže se s 9. třídou nepletou)
 * a podle nich se odemykají úrovně v tréninku.
 */
export default function Diagnostika5() {
  const router = useRouter();
  const { isPremium } = usePremium();
  const [alreadyDone, setAlreadyDone] = useState(() => hasDone5());
  const [stepIdx, setStepIdx] = useState(0);
  const [phase, setPhase] = useState<0 | 1>(0);
  const [firstCorrect, setFirstCorrect] = useState(false);
  const [results, setResults] = useState<Vysledky>({});
  const [finished, setFinished] = useState(false);

  const reachable = new Set<string>(isPremium ? STEPS.map((s) => s.tema) : FREE_TOPICS_5);
  const tema = STEPS[stepIdx].tema;
  const current = phase === 0 ? diag5Question(tema, 2) : diag5Question(tema, firstCorrect ? 3 : 1);
  const cardNumber = stepIdx * QUESTIONS_PER_STEP + phase + 1;

  function startTraining(t: string | null) {
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        trackEvent(data.session?.user.id ?? null, "diagnostika_prvni_trenink", { tema: t, zdroj: "vysledky", trida: 5 }).catch(() => {});
      });
    }
    router.push(t ? `/trenink?tema=${t}` : "/trenink");
  }

  function finalize(final5: Vysledky) {
    const merged = { ...readResults(), ...final5 };
    localStorage.setItem(RESULTS_KEY, JSON.stringify(merged));
    localStorage.setItem("matemax-diag-done", "1");
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) return;
        const uid = data.session.user.id;
        remoteSyncDiagResults(uid, final5).catch(() => {});
        const weak = Object.values(final5).filter((v) => v.correct / v.total < DIAG_WEAK_BELOW).length;
        trackEvent(uid, "diagnostika_dokoncena", { weak_topics: weak, trida: 5 }).catch(() => {});
        fetch("/api/loops-event", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
          body: JSON.stringify({ event: "diag_completed" }),
        }).catch(() => {});
      });
    }
    seedCards(final5);
    setFinished(true);
    setAlreadyDone(false);
  }

  function handleResult(correct: boolean) {
    if (phase === 0) {
      setFirstCorrect(correct);
      setPhase(1);
      return;
    }
    const score = firstCorrect ? (correct ? 3 : 2) : (correct ? 1 : 0);
    const next = { ...results, [tema]: { correct: score, total: SCORE_TOTAL } };
    setResults(next);
    if (stepIdx + 1 >= STEPS.length) {
      finalize(next);
    } else {
      setStepIdx((i) => i + 1);
      setPhase(0);
      setFirstCorrect(false);
    }
  }

  if (finished || (alreadyDone && !finished)) {
    const shown = finished ? results : Object.fromEntries(Object.entries(readResults()).filter(([t]) => t.startsWith("p5_")));
    const rows = STEPS.filter((s) => shown[s.tema]).map((s) => ({ ...s, correct: shown[s.tema].correct })).sort((a, b) => a.correct - b.correct);
    const start = pickStart(shown, reachable);
    const startLabel = start ? TEMA_LABELS[start] ?? start : null;
    return (
      <div className="flex flex-col gap-5" data-testid="diagnostika-5-vysledky">
        <div>
          <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{finished ? "Tvoje mapa mezer" : "Diagnostiku jsi už udělal(a)"}</h2>
          <p className="text-sm text-slate-500">Výsledky diagnostiky pro 5. třídu. Nejslabší okruhy jsou nahoře, tam začneme.</p>
        </div>
        <div className="flex flex-col gap-2">
          {rows.map((r) => {
            const slabe = r.correct < 2, dobre = r.correct === 3;
            return (
              <div key={r.tema} className="rounded-xl p-4 flex items-center justify-between gap-3 border" style={{ background: slabe ? "#fef2f2" : dobre ? "#f0fdf4" : "#fffbeb", borderColor: slabe ? "#fecaca" : dobre ? "#bbf7d0" : "#fde68a" }}>
                <div className="min-w-0">
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{r.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{levelText(r.correct)}</p>
                </div>
                {reachable.has(r.tema) ? (
                  <button onClick={() => startTraining(r.tema)} className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-white" style={{ background: "#0D1B3E" }}>Procvičit →</button>
                ) : (
                  <span className="shrink-0 text-xs text-slate-400">🔒 Premium</span>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={() => startTraining(start)} className="w-full py-3.5 text-white font-black rounded-xl text-base" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}>
          {startLabel ? `Spustit první trénink: ${startLabel} →` : "Spustit první trénink →"}
        </button>
        {!finished && (
          <button onClick={() => { const r = readResults(); for (const t of STEPS) delete r[t.tema]; localStorage.setItem(RESULTS_KEY, JSON.stringify(r)); setAlreadyDone(false); }} className="w-full py-2.5 text-slate-600 font-medium rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition-colors">
            🔄 Opakovat diagnostiku
          </button>
        )}
        <Link href="/trenink" className="text-center text-sm text-slate-500 underline">Nebo vyber okruh sám</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="diagnostika-5">
      <div>
        <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Vstupní diagnostický test</h2>
        <p className="text-sm text-slate-500">
          16 úloh, 2 z každého okruhu. Když odpovíš správně, dostaneš těžší úlohu ve stylu přijímaček, když ne, lehčí. Zjistíme, kde přesně stojíš.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-4 rounded-full transition-all" style={{ background: i < stepIdx ? "#2E6DA4" : i === stepIdx ? "#2563eb" : "#e2e8f0", boxShadow: i === stepIdx ? "0 0 0 3px rgba(37,99,235,0.25)" : "none" }} />
          ))}
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold" style={{ color: "#2E6DA4" }}>Krok {stepIdx + 1} z {STEPS.length}</span>
          <span className="font-semibold text-slate-600">{STEPS[stepIdx].label}</span>
        </div>
      </div>
      <Otazka example={current} cardNumber={cardNumber} onResult={handleResult} />
    </div>
  );
}
