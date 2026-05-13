"use client";

import { useMemo } from "react";
import Link from "next/link";
import { generateWeeklyPlan } from "@/lib/studijni-plan";
import { getCermatUrgency } from "@/lib/cermat-date";

const SCORE_COLOR = (s: number) =>
  s >= 70 ? "#16a34a" : s >= 40 ? "#d97706" : "#dc2626";
const SCORE_BG = (s: number) =>
  s >= 70 ? "#f0fdf4" : s >= 40 ? "#fff7ed" : "#fef2f2";

export default function StudijniPlanPage() {
  const { days, daysUntil, hasData } = useMemo(() => generateWeeklyPlan(), []);
  const urgency = getCermatUrgency(daysUntil);
  const todayPlan = days.find((d) => d.isToday);

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-black" style={{ color: "#0D1B3E" }}>
          Studijní plán 📅
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Týdenní rozvrh přizpůsobený tvým mezerám
        </p>
      </div>

      {/* Countdown pill */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: urgency.bg, border: `1px solid ${urgency.border}`, color: urgency.color }}
      >
        <span>{urgency.emoji}</span>
        <span>{urgency.label} — přijímačky za <strong>{daysUntil} dní</strong></span>
      </div>

      {/* No data state */}
      {!hasData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center flex flex-col gap-4">
          <span className="text-4xl">🎯</span>
          <div>
            <p className="font-bold text-slate-800">Nejdřív spusť diagnostiku</p>
            <p className="text-sm text-slate-500 mt-1">
              Plán se vygeneruje automaticky po dokončení vstupního testu.
            </p>
          </div>
          <Link
            href="/diagnostika"
            className="block py-3 text-white font-bold rounded-xl text-sm"
            style={{ background: "#0D1B3E" }}
          >
            Spustit diagnostiku →
          </Link>
        </div>
      )}

      {/* Today's highlight */}
      {hasData && todayPlan && !todayPlan.isRest && todayPlan.topic && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <div className="px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-300 mb-1">Dnes procvičuješ</p>
            <p className="text-xl font-black text-white">{todayPlan.topic.label}</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="bg-white/20 rounded-full px-2.5 py-0.5">
                <span className="text-xs font-bold text-white">
                  Připravenost: {todayPlan.topic.score} %
                </span>
              </div>
              <span className="text-xs text-blue-200">Cíl: {todayPlan.sessionsTarget} příkladů</span>
            </div>
          </div>
          <Link
            href={`/trenink?tema=${todayPlan.topic.tema}`}
            className="block px-5 py-3 text-center font-black text-sm"
            style={{ background: "rgba(255,255,255,0.12)", color: "#fff", borderTop: "1px solid rgba(255,255,255,0.15)" }}
          >
            Začít trénink →
          </Link>
        </div>
      )}

      {hasData && todayPlan?.isRest && (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
        >
          <p className="text-3xl mb-2">😴</p>
          <p className="font-bold text-slate-700">Dnes máš volno</p>
          <p className="text-sm text-slate-500 mt-1">Odpočinek je součástí tréninku. Vrať se zítra!</p>
        </div>
      )}

      {/* Weekly calendar */}
      {hasData && (
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 px-1">
            Tento týden
          </p>
          <div className="flex flex-col gap-2">
            {days.map((day) => {
              const isToday = day.isToday;
              const isRest = day.isRest;

              return (
                <div
                  key={day.dayIdx}
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: isToday ? "2px solid #2E6DA4" : "1px solid #e2e8f0",
                    background: isToday ? "#eff6ff" : "#fff",
                  }}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Day name */}
                    <div className="w-20 shrink-0">
                      <p
                        className="text-sm font-black"
                        style={{ color: isToday ? "#2E6DA4" : "#0D1B3E" }}
                      >
                        {day.dayName}
                        {isToday && (
                          <span
                            className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: "#2E6DA4", color: "#fff" }}
                          >
                            dnes
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Topic / rest */}
                    {isRest ? (
                      <p className="text-sm text-slate-400 flex-1">😴 Odpočinek</p>
                    ) : day.topic ? (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">
                            {day.topic.label}
                          </p>
                        </div>
                        {/* Score pill */}
                        <span
                          className="shrink-0 text-xs font-black px-2 py-0.5 rounded-full"
                          style={{
                            background: SCORE_BG(day.topic.score),
                            color: SCORE_COLOR(day.topic.score),
                          }}
                        >
                          {day.topic.score} %
                        </span>
                        {/* CTA */}
                        <Link
                          href={`/trenink?tema=${day.topic.tema}`}
                          className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-lg"
                          style={{ background: isToday ? "#2E6DA4" : "#f1f5f9", color: isToday ? "#fff" : "#64748b" }}
                        >
                          Procvičit
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm text-slate-300 flex-1">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info card */}
      {hasData && (
        <div
          className="rounded-xl p-4"
          style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}
        >
          <p className="text-xs font-bold text-cyan-700 mb-1">Jak plán funguje?</p>
          <p className="text-xs text-cyan-700 leading-relaxed">
            Témata jsou seřazena od nejslabšího po nejsilnější. Jak se zlepšuješ, plán se automaticky
            přizpůsobí. Stačí 10 minut každý den.
          </p>
        </div>
      )}

      {/* Back link */}
      <Link
        href="/"
        className="text-center text-xs text-slate-400 hover:text-slate-600 transition-colors pb-4"
      >
        ← Zpět na dashboard
      </Link>
    </div>
  );
}
