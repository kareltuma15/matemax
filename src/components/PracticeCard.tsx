"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { DBExample, TEMA_LABELS, podtemaLabel } from "@/types";
import { dovednostUlohy, nazevDovednosti, TESTOVE } from "@/lib/dovednosti";
import { checkAnswer, isDifferentForm } from "@/lib/normalize";
import { getTips } from "@/lib/tips";
import MathText from "./MathText";
import KrokyReseni from "./KrokyReseni";
import { temaStyl } from "@/lib/barvy-temat";
import TaskImageView from "./TaskImageView";
import MathDisplay from "./MathDisplay";
import FitMath, { splitPrompt } from "./FitMath";
import { playCorrect, playWrong } from "@/lib/sound";
import VideoLessonHint from "./VideoLessonHint";
import { klavesnice } from "@/lib/klavesnice";

/** Renderuje text nebo LaTeX podle typu příkladu */
function ExMath({ ex, text, large, display }: { ex: DBExample; text: string; large?: boolean; display?: boolean }) {
  if (ex.latex) return <MathDisplay tex={text} displayMode={display} />;
  return <MathText text={text} large={large} />;
}

interface Props {
  example: DBExample;
  cardNumber: number;
  total: number;
  consecutiveCorrect: number;
  onResult: (correct: boolean, userAnswer: string) => void;
  onSkip?: () => void;
  /** Diagnostika: změřit první pokus, takže po špatné odpovědi se druhý pokus nenabízí. */
  noRetry?: boolean;
}

/** Hvězdičky obtížnosti v rohu karty (malé, ať neruší zadání). */
const HVEZDY: Record<number, string> = { 1: "⭐", 2: "⭐⭐", 3: "⭐⭐⭐" };
const NAZEV_OBTIZNOSTI: Record<number, string> = { 1: "Lehká", 2: "Střední", 3: "Těžká" };

export default function PracticeCard({ example, cardNumber, total, consecutiveCorrect, onResult, onSkip, noRetry }: Props) {
  const [input, setInput]               = useState("");
  const [status, setStatus]             = useState<"idle" | "correct" | "wrong">("idle");
  const [showSolution, setShowSolution] = useState(false);
  const [flashColor, setFlashColor]     = useState<"" | "green" | "red">("");
  const [shaking, setShaking]           = useState(false);
  const [comboText, setComboText]       = useState<string | null>(null);
  const [xpLabel, setXpLabel]           = useState<string | null>(null);
  const [cardKey, setCardKey]           = useState(0);
  const [showTip, setShowTip]           = useState(false);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [lastWrongInput, setLastWrongInput] = useState("");
  const [isFlipping, setIsFlipping]     = useState(false);

  // AI hint state
  const [aiHint, setAiHint]             = useState<string | null>(null);
  const [aiHintLoading, setAiHintLoading] = useState(false);
  const [aiHintError, setAiHintError]   = useState(false);
  const [aiHintUnavailable, setAiHintUnavailable] = useState(false); // klíč nenastaven → skryj tlačítko

  const inputRef = useRef<HTMLInputElement>(null);

  /** Vloží znak na pozici kurzoru (nebo přepíše výběr) a nechá klávesnici otevřenou. */
  function insertChar(ch: string) {
    const el = inputRef.current;
    const start = el?.selectionStart ?? input.length;
    const end = el?.selectionEnd ?? input.length;
    setInput(input.slice(0, start) + ch + input.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + ch.length, start + ch.length);
    });
  }

  /** Žák chce postup hned po první chybě: pokus tím končí (výsledek už uvidí), otevře se vysvětlení. */
  function ukazPostup() {
    setWrongAttempts(2);
    setShowSolution(true);
  }

  useEffect(() => {
    setInput("");
    setStatus("idle");
    setShowSolution(false);
    setFlashColor("");
    setShaking(false);
    setComboText(null);
    setXpLabel(null);
    setShowTip(false);
    setWrongAttempts(0);
    setLastWrongInput("");
    setIsFlipping(false);
    setAiHint(null);
    setAiHintLoading(false);
    setAiHintError(false);
    setCardKey((k) => k + 1);
    inputRef.current?.focus();
  }, [example.id]);

  // Keyboard shortcut: Enter or Space to advance after final wrong or correct
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (status === "idle") return;
      if (status === "correct" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onResult(true, input);
      }
      // After 2nd wrong attempt, Enter/Space skips
      if (status === "wrong" && wrongAttempts >= 2 && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        onResult(false, lastWrongInput);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, input, onResult, wrongAttempts, lastWrongInput]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status !== "idle" || !input.trim()) return;

    const correct = checkAnswer(input, example.odpoved);
    if (correct) {
      setStatus("correct");
      setFlashColor("green");
      setXpLabel("+10 XP");
      setIsFlipping(true);
      playCorrect();
      // Small confetti burst on every correct answer
      import("canvas-confetti").then(({ default: c }) => c({
        particleCount: 35,
        spread: 52,
        origin: { y: 0.6 },
        startVelocity: 22,
        gravity: 1.3,
        colors: ["#2E6DA4", "#0D1B3E", "#fbbf24", "#22c55e", "#ffffff"],
      }));
      const newConsec = consecutiveCorrect + 1;
      if (newConsec >= 5) {
        // Extra large burst for combo ≥5
        import("canvas-confetti").then(({ default: c }) => c({ particleCount: 80, spread: 70, origin: { y: 0.45 } }));
        setComboText(`🔥 ${newConsec} v řadě!`);
      } else if (newConsec >= 3) {
        setComboText("+combo! 🔥");
      }
      setTimeout(() => setIsFlipping(false), 420);
      setTimeout(() => setComboText(null), 1500);
      setTimeout(() => setFlashColor(""), 350);
    } else {
      const newWrongCount = wrongAttempts + 1;
      setWrongAttempts(newWrongCount);
      setLastWrongInput(input);
      setStatus("wrong");
      setFlashColor("red");
      setXpLabel("+1 XP");
      setShaking(true);
      playWrong();
      // Screen shake — celá stránka se jemně zatřese
      document.body.classList.add("screen-shake");
      setTimeout(() => document.body.classList.remove("screen-shake"), 450);
      setTimeout(() => setFlashColor(""), 350);
      setTimeout(() => setShaking(false), 500);
      // Show static tip after 1st wrong (if available)
      if (newWrongCount >= 1 && tips.length > 0) setShowTip(true);
      // Auto-expand solution after 2nd wrong attempt
      if (newWrongCount >= 2 && example.reseni_kroky.length > 0) setShowSolution(true);
    }
    setTimeout(() => setXpLabel(null), 1200);
  }

  function handleRetry() {
    setInput("");
    setStatus("idle");
    setFlashColor("");
    setShaking(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function fetchAiHint() {
    if (aiHintLoading || aiHint) return;
    setAiHintLoading(true);
    setAiHintError(false);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zadani: example.zadani,
          odpoved: example.odpoved,
          tema: example.tema,
          podtema: example.podtema,
          chybna_odpoved: lastWrongInput,
        }),
      });
      const data = await res.json();
      if (data.hint) {
        setAiHint(data.hint);
      } else if (data.unavailable) {
        setAiHintUnavailable(true); // funkce vypnutá — tlačítko zmizí, žádná chyba
      } else {
        setAiHintError(true);
      }
    } catch {
      setAiHintError(true);
    } finally {
      setAiHintLoading(false);
    }
  }

  // „Řešte rovnici: $…$" → pokyn malým písmem a výraz vlastním řádkem (jinak se dlouhý zlomkový výraz
  // láme uprostřed věty). Krátké „Vypočítej:" / „Vyřeš:" zůstává beze změny.
  const promptSplit = example.latex ? splitPrompt(example.zadani) : null;
  const progressPct = (cardNumber / total) * 100;
  const topicLabel = TEMA_LABELS[example.tema] ?? example.tema;
  const dovednost = dovednostUlohy(example);
  const nazevDov = dovednost === TESTOVE
    ? "Testový příklad"
    : (dovednost && nazevDovednosti(example.tema, dovednost)) || podtemaLabel(example.podtema);
  const tips = getTips(example.tema);
  const canRetry = !noRetry && status === "wrong" && wrongAttempts < 2;
  // Číselná klávesnice telefonu, klávesa navíc jen když ji úloha potřebuje (viz lib/klavesnice.ts)
  const klav = klavesnice(String(example.odpoved), example.tema);
  const podobne = dovednost && dovednost !== TESTOVE
    ? `/trenink?tema=${example.tema}&dovednost=${dovednost}`
    : `/trenink?tema=${example.tema}&podtema=${encodeURIComponent(example.podtema)}`;

  return (
    <>
      {flashColor && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity duration-300"
          style={{ background: flashColor === "green" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }}
        />
      )}

      {comboText && (
        <div
          className="fixed left-1/2 z-50 pointer-events-none xp-bump"
          style={{ top: "30%", transform: "translateX(-50%)" }}
        >
          <span
            className="text-2xl font-black px-5 py-2.5 rounded-2xl shadow-xl"
            style={{ background: "#fff7ed", color: "#c2410c", border: "2px solid #fed7aa" }}
          >
            {comboText}
          </span>
        </div>
      )}

      <div
        key={cardKey}
        style={temaStyl(example.tema)}
        className={`card-enter bg-white rounded-3xl shadow-sm border p-5 sm:p-6 flex flex-col gap-5 relative transition-colors duration-200 ${
          isFlipping
            ? "card-flip border-green-400"
            : shaking
            ? "wrong-shake border-red-300"
            : status === "correct"
            ? "border-green-400"
            : "border-slate-200"
        }`}
      >
        {xpLabel && (
          <div
            className="absolute left-1/2 font-black text-xl xp-float-up z-20 pointer-events-none whitespace-nowrap"
            style={{
              top: "20%",
              color: status === "correct" ? "#f59e0b" : "#64748b",
              textShadow: status === "correct"
                ? "0 2px 8px rgba(245,158,11,0.45), 0 0 1px rgba(255,255,255,0.9)"
                : "0 2px 6px rgba(0,0,0,0.15)",
            }}
          >
            {xpLabel}
          </div>
        )}

        {/* Pořadí v sadě: jen mimo trénink (diagnostika, náhled). V tréninku je postup série nahoře v SerieHlava. */}
        <div className="karta-poradi flex items-center gap-3 text-xs">
          <span className="font-semibold text-slate-500 shrink-0">{cardNumber} / {total}</span>
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${progressPct}%`, background: "var(--tema-barva)" }} />
          </div>
        </div>

        {/* Téma a dovednost */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="tema-tint tema-text font-bold px-3 py-1 rounded-full text-xs min-w-0 truncate"
            data-testid="karta-tema"
          >
            {topicLabel}{nazevDov ? ` · ${nazevDov}` : ""}
          </span>
          <span className="text-[11px] shrink-0" title={`${NAZEV_OBTIZNOSTI[example.obtiznost] ?? ""} úloha`} aria-label={`${NAZEV_OBTIZNOSTI[example.obtiznost] ?? ""} úloha`}>
            {HVEZDY[example.obtiznost] ?? ""}
          </span>
        </div>

        {/* Zadání */}
        <div>
          {example.image && (
            <div className="mb-4">
              <TaskImageView image={example.image} />
            </div>
          )}
          {promptSplit ? (
            <>
              <p className="text-base font-semibold leading-snug mb-1" style={{ color: "var(--text-primary)" }}>
                {promptSplit.instruction}
              </p>
              <FitMath tex={promptSplit.expression} />
            </>
          ) : (
            <div
              className={`${example.zadani.length > 140 ? "text-lg leading-relaxed" : example.zadani.length > 70 ? "text-xl leading-snug" : "text-2xl leading-snug"} font-bold`}
              style={{ color: "var(--text-primary)" }}
            >
              <ExMath ex={example} text={example.zadani} large display={example.latex} />
            </div>
          )}
        </div>

        {/* Odpověď */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            ref={inputRef}
            type="text"
            inputMode={klav.inputMode}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={status !== "idle"}
            placeholder="Tvoje odpověď"
            aria-label="Tvoje odpověď"
            className="w-full px-4 py-3 text-xl font-bold rounded-2xl border-2 outline-none transition-colors placeholder:font-medium placeholder:text-slate-300 disabled:opacity-100"
            style={{
              color: "var(--text-primary)",
              borderColor: status === "correct" ? "#22c55e" : status === "wrong" ? "#B4232F" : "var(--tema-barva)",
              background: status === "correct" ? "#f0fdf4" : status === "wrong" ? "#FDE8EA" : "#fff",
            }}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="done"
          />

          {/* Klávesy navíc: jen znaky, které úloha potřebuje a na klávesnici telefonu nejsou.
              Vkládají na pozici kurzoru a nechají klávesnici otevřenou. */}
          {status === "idle" && klav.klavesy.length > 0 && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Znaky navíc">
              {klav.klavesy.map((k) => (
                <button
                  key={k.name}
                  type="button"
                  data-testid={`mathkey-${k.name}`}
                  aria-label={k.aria}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => insertChar(k.insert)}
                  className="min-w-12 h-11 px-3 rounded-xl border-[1.5px] border-slate-200 bg-white text-lg font-extrabold text-slate-800 press-scale"
                >
                  {k.label}
                </button>
              ))}
              {klav.klavesy.some((k) => k.name === "minute") && (
                <span className="text-xs text-slate-500">Zapiš např. 22°30′ nebo 22 30</span>
              )}
            </div>
          )}

          {status === "idle" && (
            <button
              type="submit"
              disabled={!input.trim()}
              className="w-full py-3.5 rounded-2xl text-white text-base font-extrabold transition-colors press-scale disabled:cursor-not-allowed"
              style={{ background: input.trim() ? "#0D1B3E" : "#cbd5e1" }}
            >
              Zkontrolovat
            </button>
          )}
        </form>

        {/* Nápověda k tématu: jen malý odkaz, ať nepřebíjí hlavní akci */}
        {status === "idle" && tips.length > 0 && (
          <div className="-mt-2">
            <button
              type="button"
              onClick={() => setShowTip(!showTip)}
              className="text-sm font-semibold"
              style={{ color: "#4741B8" }}
            >
              💡 {showTip ? "Skrýt nápovědu" : "Nápověda"}
            </button>
            {showTip && (
              <div
                className="mt-2 rounded-2xl p-4 flex flex-col gap-3 fade-in-up"
                style={{ background: "#fffbeb", border: "1px solid #fde68a" }}
              >
                {tips.map((tip, i) => (
                  <div key={i}>
                    <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color: "#92400e" }}>
                      {tip.label}
                    </p>
                    <p className="text-sm leading-snug" style={{ color: "#78350f" }}>
                      {tip.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Správně */}
        {status === "correct" && (
          <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: "#E2F4E9" }}>
            <p className="text-lg font-extrabold" style={{ color: "#14753A" }}>Správně!</p>
            {/* Žák zapsal jiný, ale rovnocenný tvar (47/12 místo 3 11/12) — pochválíme a ukážeme i druhý zápis. */}
            {isDifferentForm(input, example.odpoved) ? (
              <p className="text-sm" style={{ color: "#14532d" }}>
                Dá se zapsat i jako{" "}
                <strong><ExMath ex={example} text={example.odpoved} /></strong>
                {" "}— u přijímaček se hodí obojí.
              </p>
            ) : (
              <p className="text-sm" style={{ color: "#14532d" }}>
                Výsledek: <strong><ExMath ex={example} text={example.odpoved} /></strong>
              </p>
            )}
            {consecutiveCorrect + 1 >= 3 && (
              <p className="text-sm font-bold text-amber-700">🔥 {consecutiveCorrect + 1} správně v řadě!</p>
            )}
          </div>
        )}

        {/* Špatně */}
        {status === "wrong" && (
          <div className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: "#FDE8EA" }} data-testid="karta-chyba">
            <p className="text-lg font-extrabold" style={{ color: "#B4232F" }}>
              {canRetry ? "Ještě ne" : "Tentokrát ne"}
            </p>
            {canRetry ? (
              <p className="text-sm" style={{ color: "#0D1B3E" }}>
                Zkus to znovu.{example.reseni_kroky.length > 0 ? " Když si nevíš rady, projdeme to spolu po krocích." : ""}
              </p>
            ) : (
              <p className="text-sm" style={{ color: "#0D1B3E" }}>
                Správně je <strong><ExMath ex={example} text={example.odpoved} /></strong>
              </p>
            )}
          </div>
        )}

        {/* Po první chybě: jedna jasná cesta */}
        {canRetry && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleRetry}
              className="w-full py-3.5 rounded-2xl text-white text-base font-extrabold press-scale"
              style={{ background: "#0D1B3E" }}
            >
              Zkusit znovu
            </button>
            {example.reseni_kroky.length > 0 && (
              <button
                type="button"
                onClick={ukazPostup}
                className="w-full py-3 rounded-2xl text-base font-bold press-scale"
                style={{ background: "transparent", color: "#0D1B3E", border: "1.5px solid #E4E6EF" }}
              >
                Ukaž mi postup
              </button>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 pt-1">
              <VideoLessonHint tema={example.tema} podtema={example.podtema} maly />
              {!aiHint && !aiHintLoading && !aiHintUnavailable && (
                <button type="button" onClick={fetchAiHint} className="text-sm font-semibold hover:underline underline-offset-2" style={{ color: "#4741B8" }}>
                  🤖 Nápověda od AI
                </button>
              )}
              {aiHintLoading && <span className="text-sm animate-pulse" style={{ color: "#4741B8" }}>🤖 Načítám nápovědu…</span>}
            </div>
          </div>
        )}

        {/* Nápověda od AI */}
        {aiHint && (
          <div className="rounded-2xl p-4 fade-in-up" style={{ background: "#faf5ff", border: "1.5px solid #c4b5fd" }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#7c3aed" }}>🤖 Nápověda od AI</p>
            <p className="text-sm leading-relaxed" style={{ color: "#4c1d95" }}>{aiHint}</p>
          </div>
        )}
        {aiHintError && (
          <p className="text-xs text-slate-400 text-center">Nápovědu se nepodařilo načíst. Zkus to za chvíli.</p>
        )}

        {/* Postup řešení: po chybě (rovnou otevřený) nebo po správné odpovědi na vyžádání */}
        {status !== "idle" && !canRetry && example.reseni_kroky.length > 0 && (
          status === "wrong" ? (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowSolution(!showSolution)}
                className="flex items-center justify-between text-sm font-bold"
                style={{ color: "#0D1B3E" }}
              >
                <span>Projdeme to spolu</span>
                <span className="text-slate-400 text-xs font-semibold">{showSolution ? "▲ skrýt" : "▼ zobrazit"}</span>
              </button>
              {showSolution && <KrokyReseni key={example.id} example={example} />}
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "#E4E6EF" }}>
              <button
                type="button"
                onClick={() => setShowSolution(!showSolution)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold"
                style={{ background: "#f8fafc", color: "var(--text-primary)" }}
              >
                <span>📐 Jak se to řeší?</span>
                <span className="text-slate-400 text-xs">{showSolution ? "▲ skrýt" : "▼ zobrazit"}</span>
              </button>
              {showSolution && (
                <ol className="px-4 pb-4 pt-3 flex flex-col gap-2 fade-in-up bg-white">
                  {example.reseni_kroky.map((krok, i) => (
                    <li key={i} className="tema-tint rounded-xl px-3 py-2.5 grid grid-cols-[24px_1fr] gap-2.5 text-sm leading-snug" style={{ color: "#1e293b" }}>
                      <span
                        className="w-6 h-6 flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: "var(--tema-barva)", clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)" }}
                      >
                        {i + 1}
                      </span>
                      <span><ExMath ex={example} text={krok} /></span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )
        )}

        {/* Po konečné chybě: malé odkazy na podobné úlohy a video */}
        {status === "wrong" && !canRetry && (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
            <Link href={podobne} className="text-sm font-semibold hover:underline underline-offset-2" style={{ color: "#4741B8" }}>
              🔄 Procvičit podobné
            </Link>
            <VideoLessonHint tema={example.tema} podtema={example.podtema} maly />
          </div>
        )}

        {/* Další příklad */}
        {status !== "idle" && !canRetry && (
          <button
            onClick={() => onResult(status === "correct", status === "correct" ? input : lastWrongInput)}
            className="w-full py-3.5 rounded-2xl text-base font-extrabold press-scale"
            style={{ background: "#F5A623", color: "#0D1B3E" }}
          >
            Další příklad →
          </button>
        )}

        {/* Přeskočit: nenápadně dole, ne vedle hlavního tlačítka */}
        {canRetry && (
          <button
            type="button"
            onClick={() => onSkip ? onSkip() : onResult(false, lastWrongInput)}
            className="self-center text-xs font-semibold text-slate-400 hover:text-slate-600"
          >
            Přeskočit úlohu
          </button>
        )}
      </div>
    </>
  );
}
