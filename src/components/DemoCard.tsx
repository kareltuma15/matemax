"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { checkAnswer } from "@/lib/normalize";
import { playCorrect, playWrong } from "@/lib/sound";
import MathText from "@/components/MathText";

const DEMO_EXAMPLES = [
  { zadani: "Kolik je 1/2 + 1/4?", odpoved: "3/4", hint: "Najdi spolecneho jmenovatele" },
  { zadani: "2x + 4 = 10. Kolik je x?", odpoved: "3", hint: "Odecti 4 od obou stran" },
  { zadani: "Kolik je 15 % ze 60?", odpoved: "9", hint: "15 % = 15 / 100 x 60" },
  { zadani: "Kolik je 2/3 z cisla 12?", odpoved: "8", hint: "12 / 3 x 2 = ?" },
  { zadani: "Obvod ctverce je 20 cm. Kolik je strana?", odpoved: "5", hint: "O = 4 x a" },
];

export default function DemoCard() {
  const [exIdx, setExIdx] = useState(() => Math.floor(Math.random() * DEMO_EXAMPLES.length));
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState<"idle" | "correct" | "wrong">("idle");
  const [flash, setFlash] = useState<"" | "green" | "red">("");
  const inputRef = useRef<HTMLInputElement>(null);
  const ex = DEMO_EXAMPLES[exIdx];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || phase !== "idle") return;
    const ok = checkAnswer(input, ex.odpoved);
    if (ok) {
      playCorrect();
      setFlash("green");
      import("canvas-confetti").then(({ default: c }) =>
        c({ particleCount: 80, spread: 60, origin: { y: 0.6 } })
      );
    } else {
      playWrong();
      setFlash("red");
    }
    setPhase(ok ? "correct" : "wrong");
    setTimeout(() => setFlash(""), 350);
  }

  function nextExample() {
    setExIdx((i) => (i + 1) % DEMO_EXAMPLES.length);
    setInput("");
    setPhase("idle");
    setFlash("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  return (
    <div className="relative">
      {flash && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-10 transition-opacity duration-300"
          style={{
            background:
              flash === "green" ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
          }}
        />
      )}
      <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full text-white"
            style={{ background: "#2E6DA4" }}
          >
            Zkus priklad
          </span>
          <span className="text-xs text-slate-400">bez registrace</span>
        </div>

        <div className="text-center py-2">
          <p className="text-xl font-bold leading-snug" style={{ color: "#0D1B3E" }}>
            <MathText text={ex.zadani} />
          </p>
          {phase === "idle" && (
            <p className="text-xs text-slate-400 mt-1.5">&#x1F4A1; {ex.hint}</p>
          )}
        </div>

        {phase === "idle" && (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tvoja odpoved..."
              className="flex-1 px-4 py-3 rounded-xl border-2 border-slate-200 focus:border-indigo-400 outline-none text-base transition-colors"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-5 py-3 text-white font-bold rounded-xl disabled:opacity-50 transition-colors press-scale"
              style={{ background: "#2E6DA4" }}
            >
              OK
            </button>
          </form>
        )}

        {phase === "correct" && (
          <div className="flex flex-col gap-3">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="font-black text-green-700 text-lg">Spravne! Vyborne!</p>
              <p className="text-xs text-green-600 mt-1">
                Spravna odpoved: <strong>{ex.odpoved}</strong>
              </p>
            </div>
            <Link
              href="/vitej"
              className="w-full py-3 text-center text-white font-black rounded-xl text-sm press-scale"
              style={{
                background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)",
              }}
            >
              Chci procvicovat vic &#8594; Registrace zdarma
            </Link>
            <button
              type="button"
              onClick={nextExample}
              className="text-sm text-slate-400 hover:text-slate-600 text-center transition-colors"
            >
              Zkusit dalsi priklad
            </button>
          </div>
        )}

        {phase === "wrong" && (
          <div className="flex flex-col gap-3">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <p className="font-bold text-red-700">
                Skoro! Spravne je: <strong>{ex.odpoved}</strong>
              </p>
              <p className="text-xs text-red-500 mt-1">
                Procvicovat se da &#8212; MateMax te nauci postup krok po kroku.
              </p>
            </div>
            <Link
              href="/vitej"
              className="w-full py-3 text-center text-white font-black rounded-xl text-sm press-scale"
              style={{
                background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)",
              }}
            >
              Procvicit a zlepsit se &#8594; Registrace zdarma
            </Link>
            <button
              type="button"
              onClick={nextExample}
              className="text-sm text-slate-400 hover:text-slate-600 text-center transition-colors"
            >
              Zkusit jiny priklad
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
