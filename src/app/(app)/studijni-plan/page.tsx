"use client";

import { useMemo } from "react";
import Link from "next/link";
import { generateCesta, CestaStop } from "@/lib/cesta";
import { getCermatUrgency } from "@/lib/cermat-date";
import { usePremium } from "@/lib/premium";

export default function CestaPage() {
  const { isPremium } = usePremium();
  const cesta = useMemo(() => generateCesta(isPremium), [isPremium]);
  const urgency = getCermatUrgency(cesta.daysUntil);
  const progressPct = Math.round((cesta.masteredCount / cesta.total) * 100);

  return (
    <div className="flex flex-col gap-4 pb-6">

      {/* Hlavička */}
      <div>
        <h1 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>
          Tvoje cesta k přijímačkám 🗺️
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Osm témat v pořadí sešitu. Tempo držíš ty.
        </p>
      </div>

      {/* Odpočet — kontext, ne bič */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{ background: urgency.bg, border: `1px solid ${urgency.border}`, color: urgency.color }}
      >
        <span>{urgency.emoji}</span>
        <span>Do přijímaček zbývá <strong>{cesta.weeksUntil} týdnů</strong></span>
      </div>

      {/* Bez diagnostiky */}
      {!cesta.hasData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center flex flex-col gap-4">
          <span className="text-4xl">🎯</span>
          <div>
            <p className="font-bold text-slate-800">Nejdřív zjistíme, kde jsi</p>
            <p className="text-sm text-slate-500 mt-1">
              Po krátké diagnostice ti cesta ukáže, kterým tématem začít.
            </p>
          </div>
          <Link
            href="/vitej"
            className="block py-3 text-white font-bold rounded-xl text-sm"
            style={{ background: "#0D1B3E" }}
          >
            Spustit diagnostiku →
          </Link>
        </div>
      )}

      {/* Hero — kde jsi na cestě */}
      {cesta.hasData && (
        <div
          className="rounded-3xl p-5"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)", boxShadow: "0 10px 24px -12px rgba(13,27,62,.5)" }}
        >
          <p className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.6)" }}>
            Kde jsi na cestě
          </p>
          <p className="text-2xl font-black text-white mt-1" style={{ letterSpacing: "-0.02em" }}>
            {cesta.masteredCount} z {cesta.total} témat zvládnuto
          </p>
          {cesta.currentTema && cesta.currentWeek && (
            <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.82)" }}>
              Právě jsi u tématu <strong>{cesta.stops[cesta.currentWeek - 1].label}</strong> — {cesta.currentWeek}. zastávka z {cesta.total}.
            </p>
          )}
          <div className="h-2 rounded-full mt-3 overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${progressPct}%`, background: "#fff" }} />
          </div>
        </div>
      )}

      {/* Cesta */}
      {cesta.hasData && (
        <div className="flex flex-col">
          {cesta.stops.map((stop) => (
            <Stop key={stop.tema} stop={stop} />
          ))}

          {/* Finále */}
          <div className="grid" style={{ gridTemplateColumns: "40px 1fr", gap: 12 }}>
            <div className="flex flex-col items-center">
              <div
                className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-base shrink-0"
                style={{ background: "var(--surface-1, #fff)", border: "2px solid #059669", color: "#059669", zIndex: 1 }}
              >
                🎓
              </div>
            </div>
            <div
              className="rounded-2xl p-4 text-center text-white"
              style={{ background: "linear-gradient(135deg, #064E3B 0%, #059669 100%)" }}
            >
              <div className="text-2xl">🎓</div>
              <div className="text-base font-black mt-0.5">Cíl: Přijímačky nanečisto</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.85)" }}>
                Až projdeš všech {cesta.total} témat, čeká tě souhrnné opakování a testy nanečisto na ostro.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tempo je na tobě */}
      {cesta.hasData && (
        <div
          className="flex gap-2.5 px-4 py-3 rounded-2xl"
          style={{ background: "var(--surface-2, #f8fafc)", border: "1px solid var(--border-color, #e2e8f0)" }}
        >
          <span className="text-lg shrink-0">🧭</span>
          <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text-secondary, #64748b)" }}>
            <strong style={{ color: "var(--text-primary)" }}>Tempo je na tobě.</strong> Doporučujeme jedno téma týdně —
            do přijímaček tak stihneš celou cestu i závěrečné opakování. Kdo vynechá den, o nic nepřijde: na tématu
            zůstáváš, dokud ho nezvládneš.
          </p>
        </div>
      )}

      {/* Zpět */}
      <Link
        href="/"
        className="text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        ← Zpět na dashboard
      </Link>
    </div>
  );
}

// ── Jedna zastávka na cestě ──────────────────────────────────────────────────

const PILL: Record<string, { text: (s: CestaStop) => string; cls: string }> = {
  done:     { text: (s) => `Zvládnuto · ${s.score} %`, cls: "bg-green-50 text-green-700 border border-green-200" },
  current:  { text: (s) => `Tady jsi · ${s.score} %`,  cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  upcoming: { text: () => "Čeká",                       cls: "bg-slate-50 text-slate-400 border border-slate-200" },
  locked:   { text: () => "🔒 Premium",                cls: "bg-slate-50 text-slate-400 border border-slate-200" },
};

function Stop({ stop }: { stop: CestaStop }) {
  const isCurrent = stop.status === "current";
  const isDone = stop.status === "done";
  const pill = PILL[stop.status];

  return (
    <div className="grid" style={{ gridTemplateColumns: "40px 1fr", gap: 12 }}>
      {/* Kolejnice s uzlem a spojnicí */}
      <div className="flex flex-col items-center">
        <div
          className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-sm font-black shrink-0"
          style={{
            zIndex: 1,
            background: isDone ? "#16a34a" : "#fff",
            border: `2px solid ${isDone ? "#16a34a" : isCurrent ? "#2E6DA4" : "#e2e8f0"}`,
            color: isDone ? "#fff" : isCurrent ? "#2E6DA4" : "#94a3b8",
            boxShadow: isCurrent ? "0 0 0 4px rgba(46,109,164,.18)" : "none",
          }}
        >
          {isDone ? "✓" : stop.week}
        </div>
        <div className="w-0.5 flex-1 min-h-[14px]" style={{ background: isDone ? "#16a34a" : "#e2e8f0" }} />
      </div>

      {/* Karta tématu */}
      <div
        className={`rounded-2xl p-3.5 mb-3 bg-white shadow-sm ${isCurrent ? "" : "opacity-75"}`}
        style={{ border: isCurrent ? "2px solid #2E6DA4" : "1px solid #e2e8f0" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Téma {stop.week}</span>
          <span className={`ml-auto text-[11px] font-black px-2.5 py-0.5 rounded-full whitespace-nowrap ${pill.cls}`}>
            {pill.text(stop)}
          </span>
        </div>
        <div className="text-base font-black mt-0.5" style={{ color: "var(--text-primary)" }}>{stop.label}</div>
        <div className="text-xs text-slate-500 mt-1 leading-relaxed">{stop.subs}</div>

        {isCurrent && (
          <>
            <div className="text-xs mt-2.5 px-2.5 py-2 rounded-xl" style={{ background: "rgba(46,109,164,.08)", color: "#2E6DA4" }}>
              💡 {stop.score > 0
                ? "Tvoje nejslabší dostupné téma. Pár tréninků a posuneš se dál."
                : "Tady začneš. Od lehkých příkladů po těžší."}
            </div>
            <Link
              href={`/trenink?tema=${stop.tema}`}
              className="block text-center mt-2.5 py-2.5 rounded-xl text-sm font-black text-white"
              style={{ background: "#2E6DA4" }}
            >
              Pokračovat v tématu {stop.label} →
            </Link>
          </>
        )}

        {stop.status === "locked" && (
          <Link
            href="/cenik"
            className="block text-center mt-2.5 py-2 rounded-xl text-xs font-bold"
            style={{ background: "#f8fafc", color: "#2E6DA4", border: "1px solid #e2e8f0" }}
          >
            Odemknout v Premium →
          </Link>
        )}
      </div>
    </div>
  );
}
