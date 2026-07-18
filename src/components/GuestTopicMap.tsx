"use client";

import Link from "next/link";
import { TEMA_LABELS } from "@/types";
import { GUEST_FREE_TOPICS } from "@/lib/subscription";
import { EXAMPLES_LABEL } from "@/lib/site-stats";

const ALL_TOPICS = Object.keys(TEMA_LABELS);

const FREE_COLORS: Record<string, { border: string; label: string; bg: string }> = {
  zlomky:   { border: "#2E6DA4", label: "#2E6DA4", bg: "#eff6ff" },
  rovnice:  { border: "#16a34a", label: "#15803d", bg: "#f0fdf4" },
  geometrie:{ border: "#9333ea", label: "#7e22ce", bg: "#faf5ff" },
};

interface Props {
  onSelectTopic: (tema: string) => void;
}

export default function GuestTopicMap({ onSelectTopic }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div
        className="rounded-2xl px-5 py-4"
        style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 100%)" }}
      >
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-black text-white">📚 Mapa témat</h1>
          <span
            className="text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.12)", color: "#93c5fd" }}
          >
            3 / {ALL_TOPICS.length} zdarma
          </span>
        </div>
        <p className="text-sm text-blue-300 leading-snug">
          Vyberte téma a začněte procvičovat. Všechna témata odemknete registrací zdarma.
        </p>
      </div>

      {/* Free topics */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">
          ✅ Dostupná zdarma
        </p>
        <div className="flex flex-col gap-2">
          {ALL_TOPICS.filter((t) => GUEST_FREE_TOPICS.has(t)).map((tema) => {
            const colors = FREE_COLORS[tema] ?? { border: "#2E6DA4", label: "#2E6DA4", bg: "#eff6ff" };
            return (
              <button
                key={tema}
                onClick={() => onSelectTopic(tema)}
                className="w-full bg-white rounded-xl border-2 px-4 py-3 flex items-center justify-between hover:shadow-md transition-shadow text-left"
                style={{ borderColor: colors.border }}
              >
                <div>
                  <span
                    className="text-[10px] font-black uppercase tracking-wide"
                    style={{ color: colors.label }}
                  >
                    ZDARMA
                  </span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {TEMA_LABELS[tema] ?? tema}
                  </p>
                </div>
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full shrink-0"
                  style={{ background: colors.bg, color: colors.label }}
                >
                  Procvičovat →
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Locked topics */}
      <div>
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-1">
          🔒 Zamčeno — po registraci
        </p>
        <div className="grid grid-cols-2 gap-2">
          {ALL_TOPICS.filter((t) => !GUEST_FREE_TOPICS.has(t)).map((tema) => (
            <div
              key={tema}
              className="bg-slate-50 rounded-xl border border-slate-200 px-3 py-2.5 flex items-center gap-2 opacity-55"
            >
              <span className="text-base shrink-0">🔒</span>
              <p className="text-xs font-semibold text-slate-500 leading-tight">
                {TEMA_LABELS[tema] ?? tema}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Registration CTA */}
      <Link
        href="/registrace"
        className="block rounded-2xl p-5 text-center hover:opacity-90 transition-opacity"
        style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
      >
        <p className="text-base font-black text-white">🔓 Odemkni všechna témata</p>
        <p className="text-sm text-blue-200 mt-1">
          Registruj se zdarma — 2 minuty, žádná karta
        </p>
        <p className="text-xs text-blue-300 mt-2">
          {ALL_TOPICS.length} témat · SM-2 trénink · {EXAMPLES_LABEL} příkladů · CERMAT simulace
        </p>
      </Link>
    </div>
  );
}
