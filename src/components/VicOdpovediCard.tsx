"use client";

import { useState } from "react";
import { DBExample, TEMA_LABELS, podtemaLabel } from "@/types";
import { checkAnswer } from "@/lib/normalize";
import MathDisplay from "@/components/MathDisplay";
import MathText from "@/components/MathText";
import TaskImageView from "@/components/TaskImageView";
import { playCorrect, playWrong } from "@/lib/sound";
import VideoLessonHint from "@/components/VideoLessonHint";

/**
 * Úloha s více odpověďmi — dva tvary z CERMAT testů pro 5. třídu:
 *  - podúlohy (4.1, 4.2, 4.3): společné zadání a u každé podúlohy vlastní políčko na výsledek,
 *  - přiřazování (úloha 13): ke každé položce se vybírá písmeno z nabídky A–F.
 * Úloha se počítá jako správná, jen když jsou správně všechny části; po kontrole se u každé části ukáže, jak dopadla.
 * Stav se nuluje přes `key={example.id}` u volajícího (nová úloha = nová karta).
 */

interface Props {
  example: DBExample;
  cardNumber: number;
  total: number;
  onResult: (correct: boolean, userAnswer: string) => void;
  onSkip?: () => void;
  /** Po chybě nabídnout videolekci k tématu (v diagnostice ne). */
  videoHint?: boolean;
}

const DIFFICULTY_BADGE: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: "Lehká ⭐",       bg: "#f0fdf4", color: "#166534" },
  2: { label: "Střední ⭐⭐",   bg: "#fffbeb", color: "#92400e" },
  3: { label: "Těžká ⭐⭐⭐",   bg: "#fef2f2", color: "#991b1b" },
};

const PISMENA = ["A", "B", "C", "D", "E", "F"];

function Text({ ex, text }: { ex: DBExample; text: string }) {
  return ex.latex ? <MathDisplay tex={text} /> : <MathText text={text} />;
}

export default function VicOdpovediCard({ example, cardNumber, total, onResult, onSkip, videoHint = false }: Props) {
  const podulohy = example.podulohy ?? [];
  const prirazeni = example.prirazeni;
  const pocet = prirazeni ? prirazeni.polozky.length : podulohy.length;

  const [vstupy, setVstupy] = useState<string[]>(() => Array(pocet).fill(""));
  const [vybrano, setVybrano] = useState<(number | null)[]>(() => Array(pocet).fill(null));
  const [vyhodnoceno, setVyhodnoceno] = useState<boolean[] | null>(null);

  if (pocet === 0) return null;

  const hotovo = prirazeni ? vybrano.every((v) => v !== null) : vstupy.every((v) => v.trim() !== "");
  const vseSpravne = vyhodnoceno !== null && vyhodnoceno.every(Boolean);

  function zkontrolovat() {
    if (vyhodnoceno || !hotovo) return;
    const vysl = prirazeni
      ? prirazeni.polozky.map((p, i) => vybrano[i] === p.spravna)
      : podulohy.map((p, i) => checkAnswer(vstupy[i], p.odpoved));
    setVyhodnoceno(vysl);
    if (vysl.every(Boolean)) playCorrect(); else playWrong();
  }

  function odpovedText(): string {
    return prirazeni
      ? vybrano.map((v, i) => `${i + 1}–${v === null ? "?" : PISMENA[v]}`).join(" ; ")
      : vstupy.join(" ; ");
  }

  const badge = DIFFICULTY_BADGE[example.obtiznost] ?? DIFFICULTY_BADGE[1];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 fade-in-up" data-testid="vic-odpovedi">
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-slate-500 shrink-0">{cardNumber} / {total}</span>
        <span className="font-semibold px-2 py-0.5 rounded-full text-[11px] min-w-0 truncate" style={{ background: "#eff6ff", color: "#2E6DA4" }}>
          {TEMA_LABELS[example.tema] ?? example.tema}
        </span>
        {podtemaLabel(example.podtema) && (
          <span className="text-slate-300 text-[10px] min-w-0 truncate max-w-[90px] hidden min-[420px]:inline">{podtemaLabel(example.podtema)}</span>
        )}
        <span className="ml-auto font-semibold px-2 py-0.5 rounded-full text-[11px] shrink-0" style={{ background: badge.bg, color: badge.color }}>
          {badge.label}
        </span>
      </div>

      {example.image && <TaskImageView image={example.image} />}

      <div className="text-base font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
        <Text ex={example} text={example.zadani} />
      </div>

      {prirazeni ? (
        <>
          <ol className="flex flex-col gap-1.5 rounded-xl p-3" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }} aria-label="Nabídka odpovědí">
            {prirazeni.nabidka.map((n, i) => (
              <li key={i} className="flex items-center gap-2 text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
                <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background: "#eff6ff", color: "#2E6DA4" }}>{PISMENA[i]}</span>
                <Text ex={example} text={n} />
              </li>
            ))}
          </ol>
          <div className="flex flex-col gap-3">
            {prirazeni.polozky.map((p, i) => {
              const ok = vyhodnoceno?.[i];
              return (
                <div key={i} className="rounded-xl p-3 flex flex-col gap-2" data-testid={`prirazeni-${i + 1}`}
                  style={{ border: `2px solid ${ok === undefined ? "#e2e8f0" : ok ? "#16a34a" : "#dc2626"}`, background: ok === undefined ? "#fff" : ok ? "#f0fdf4" : "#fef2f2" }}>
                  <div className="text-[15px] font-semibold flex gap-2" style={{ color: "var(--text-primary)" }}>
                    <span className="font-black shrink-0" style={{ color: "#2E6DA4" }}>{i + 1}.</span>
                    <Text ex={example} text={p.text} />
                  </div>
                  <div className="flex gap-1.5 flex-wrap" role="group" aria-label={`Odpověď k položce ${i + 1}`}>
                    {prirazeni.nabidka.map((_, j) => {
                      const zvoleno = vybrano[i] === j;
                      const spravna = vyhodnoceno !== null && p.spravna === j;
                      let style: React.CSSProperties = { background: "#fff", border: "2px solid #cbd5e1", color: "#334155" };
                      if (vyhodnoceno !== null && spravna) style = { background: "#16a34a", border: "2px solid #16a34a", color: "#fff" };
                      else if (vyhodnoceno !== null && zvoleno) style = { background: "#dc2626", border: "2px solid #dc2626", color: "#fff" };
                      else if (zvoleno) style = { background: "#2E6DA4", border: "2px solid #2E6DA4", color: "#fff" };
                      return (
                        <button
                          key={j}
                          type="button"
                          disabled={vyhodnoceno !== null}
                          aria-pressed={zvoleno}
                          aria-label={`Položka ${i + 1}: ${PISMENA[j]}`}
                          onClick={() => setVybrano((v) => v.map((x, k) => (k === i ? j : x)))}
                          className="w-10 h-10 rounded-lg text-sm font-black active:scale-95 transition-all"
                          style={style}
                        >
                          {PISMENA[j]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          {podulohy.map((p, i) => {
            const ok = vyhodnoceno?.[i];
            return (
              <div key={i} className="rounded-xl p-3 flex flex-col gap-2" data-testid={`poduloha-${i + 1}`}
                style={{ border: `2px solid ${ok === undefined ? "#e2e8f0" : ok ? "#16a34a" : "#dc2626"}`, background: ok === undefined ? "#fff" : ok ? "#f0fdf4" : "#fef2f2" }}>
                <div className="text-[15px] font-semibold flex gap-2" style={{ color: "var(--text-primary)" }}>
                  <span className="font-black shrink-0" style={{ color: "#2E6DA4" }}>{i + 1}.</span>
                  <Text ex={example} text={p.otazka} />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={vstupy[i] ?? ""}
                    onChange={(e) => setVstupy((v) => v.map((x, k) => (k === i ? e.target.value : x)))}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); zkontrolovat(); } }}
                    disabled={vyhodnoceno !== null}
                    aria-label={`Výsledek podúlohy ${i + 1}`}
                    placeholder="výsledek"
                    className="flex-1 min-w-0 rounded-lg border-2 border-slate-200 px-3 py-2 text-lg outline-none focus:border-indigo-400 bg-white"
                    autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false}
                  />
                  {p.jednotka && <span className="text-sm font-semibold text-slate-500 shrink-0">{p.jednotka}</span>}
                </div>
                {ok === false && (
                  <p className="text-sm" style={{ color: "#991b1b" }}>
                    Správně: <strong><Text ex={example} text={p.odpoved} /></strong>{p.jednotka ? ` ${p.jednotka}` : ""}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {vyhodnoceno === null && (
        <>
          <button
            type="button"
            onClick={zkontrolovat}
            disabled={!hotovo}
            className="rounded-xl px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed"
            style={{ background: hotovo ? "#2E6DA4" : "#cbd5e1" }}
          >
            Zkontrolovat
          </button>
          {onSkip && (
            <button onClick={onSkip} className="text-xs font-semibold self-center" style={{ color: "#94a3b8" }}>Přeskočit úlohu</button>
          )}
        </>
      )}

      {vyhodnoceno !== null && (
        <div className="flex flex-col gap-3 fade-in-up">
          <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: vseSpravne ? "#f0fdf4" : "#fef2f2", border: `1px solid ${vseSpravne ? "#bbf7d0" : "#fecaca"}` }}>
            <div className="font-bold text-sm" style={{ color: vseSpravne ? "#166534" : "#991b1b" }}>
              {vseSpravne
                ? "✓ Správně!"
                : `✕ Správně ${vyhodnoceno.filter(Boolean).length} z ${vyhodnoceno.length}`}
              {!vseSpravne && prirazeni && (
                <span className="font-semibold">
                  {" · správně je "}
                  {prirazeni.polozky.map((p, i) => `${i + 1}–${PISMENA[p.spravna]}`).join(", ")}
                </span>
              )}
            </div>
            {example.reseni_kroky.length > 0 && (
              <ol className="flex flex-col gap-1.5">
                {example.reseni_kroky.map((krok, i) => (
                  <li key={i} className="flex gap-2 text-sm" style={{ color: "#334155" }}>
                    <span className="font-black shrink-0" style={{ color: "#2E6DA4" }}>{i + 1}.</span>
                    <span><Text ex={example} text={krok} /></span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {videoHint && !vseSpravne && <VideoLessonHint tema={example.tema} podtema={example.podtema} />}
          <button
            onClick={() => onResult(vseSpravne, odpovedText())}
            className="rounded-xl px-4 py-3 text-sm font-bold text-white"
            style={{ background: "#2E6DA4" }}
          >
            Pokračovat →
          </button>
        </div>
      )}
    </div>
  );
}
