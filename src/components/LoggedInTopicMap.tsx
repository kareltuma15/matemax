"use client";

import Link from "next/link";
import { TEMA_LABELS } from "@/types";
import { FREE_TOPICS, PREMIUM_TOPICS } from "@/lib/subscription";

interface Props {
  isPremium: boolean;
  onSelectTopic: (tema: string) => void;
  onStartMix: () => void;
}

export default function LoggedInTopicMap({ isPremium, onSelectTopic, onStartMix }: Props) {
  const allTopics = Object.keys(TEMA_LABELS);
  const freeTopics = allTopics.filter((t) => FREE_TOPICS.has(t));
  const premiumTopics = allTopics.filter((t) => PREMIUM_TOPICS.has(t));

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div
        className="rounded-2xl px-5 py-4"
        style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 100%)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-black text-white">📚 Mapa témat</h1>
          {!isPremium && (
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.12)", color: "#93c5fd" }}
            >
              {freeTopics.length} / {allTopics.length} zdarma
            </span>
          )}
        </div>
        <p className="text-sm text-blue-300 leading-snug">
          {isPremium
            ? "Máš přístup ke všem tématům. Vyber co chceš procvičovat."
            : "Vyber téma nebo upgraduj na Premium pro všechna témata."}
        </p>
      </div>

      {/* Free topics */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">
          ✅ Zdarma
        </p>
        <div className="flex flex-col gap-2">
          {freeTopics.map((tema) => (
            <button
              key={tema}
              onClick={() => onSelectTopic(tema)}
              className="w-full bg-white rounded-xl border-2 px-4 py-3 flex items-center justify-between hover:shadow-md transition-shadow text-left"
              style={{ borderColor: "#2E6DA4" }}
            >
              <span className="text-sm font-bold text-slate-800">{TEMA_LABELS[tema]}</span>
              <span
                className="text-sm font-bold px-3 py-1 rounded-full shrink-0"
                style={{ background: "#eff6ff", color: "#2E6DA4" }}
              >
                Procvičovat →
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Premium topics */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">
          {isPremium ? "⭐ Premium témata" : "🔒 Premium témata"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {premiumTopics.map((tema) =>
            isPremium ? (
              <button
                key={tema}
                onClick={() => onSelectTopic(tema)}
                className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 flex items-center justify-between hover:shadow-sm transition-shadow text-left"
              >
                <span className="text-xs font-semibold text-slate-700 leading-tight">
                  {TEMA_LABELS[tema]}
                </span>
                <span className="text-xs text-slate-400 shrink-0 ml-1">→</span>
              </button>
            ) : (
              <Link
                key={tema}
                href="/cenik"
                className="bg-slate-50 rounded-xl border border-slate-200 px-3 py-2.5 flex items-center gap-2 opacity-60 hover:opacity-80 transition-opacity"
              >
                <span className="text-base shrink-0">🔒</span>
                <p className="text-xs font-semibold text-slate-500 leading-tight">
                  {TEMA_LABELS[tema]}
                </p>
              </Link>
            )
          )}
        </div>
      </div>

      {/* Premium CTA */}
      {!isPremium && (
        <Link
          href="/cenik"
          className="block rounded-2xl p-5 text-center hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <p className="text-base font-black text-white">⭐ Odemkni všechna témata</p>
          <p className="text-sm text-blue-200 mt-1">
            Premium — všech {allTopics.length} témat · 99 Kč/měsíc
          </p>
        </Link>
      )}

      {/* Rychlý mód CTA */}
      <Link
        href="/rychly-mod"
        className="w-full rounded-xl border-2 border-dashed px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
        style={{ borderColor: "#0D1B3E" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">⚡</span>
          <div>
            <p className="text-sm font-bold text-slate-800">Rychlý mód</p>
            <p className="text-xs text-slate-400">10 příkladů · 60 sekund</p>
          </div>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "#0D1B3E", color: "#fff" }}>
          Hrát →
        </span>
      </Link>

      {/* Mix CTA */}
      <button
        onClick={onStartMix}
        className="w-full py-3 text-slate-500 font-medium rounded-xl border border-slate-200 text-sm hover:bg-slate-50 transition-colors"
      >
        🎲 Mixovat dostupná témata
      </button>
    </div>
  );
}
