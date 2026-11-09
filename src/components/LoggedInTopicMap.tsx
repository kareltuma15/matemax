"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TEMA_LABELS, TEMATA_ORDER } from "@/types";
import { FREE_TOPICS, PREMIUM_TOPICS } from "@/lib/subscription";
import { pickMission } from "@/lib/mise";
import { computeTrainingState, type Level } from "@/lib/levels";
import { localLoadSessions } from "@/lib/storage";
import { getDaysUntilCermat } from "@/lib/cermat-date";
import { localDateStr, localDateDaysAgo } from "@/lib/date";
import { temaStyl } from "@/lib/barvy-temat";
import { HexIkona, HlavickaZnacky } from "@/components/HexIkona";

interface Props {
  isPremium: boolean;
  onSelectTopic: (tema: string, podtema?: string) => void;
  onStartMix: () => void;
  onStartMistakes: () => void;
}

function useDiagScores(): Record<string, number> {
  const [scores, setScores] = useState<Record<string, number>>({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem("matemax-diag-results");
      if (!raw) return;
      const results = JSON.parse(raw) as Record<string, { correct: number; total: number }>;
      const s: Record<string, number> = {};
      for (const [tema, v] of Object.entries(results)) {
        if (v.total > 0) s[tema] = Math.round((v.correct / v.total) * 100);
      }
      setScores(s);
    } catch { /* ignore */ }
  }, []);
  return scores;
}

/** Odemčené úrovně L1→L3 jako řada čipů v barvě okruhu (rodič nastavuje temaStyl). */
function LevelChips({ level }: { level: Level }) {
  return (
    <div className="flex gap-1">
      {([1, 2, 3] as const).map((l) => {
        const on = l <= level;
        return (
          <span
            key={l}
            className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${on ? "tema-tint tema-text" : ""}`}
            style={on ? undefined : { background: "var(--surface-1)", color: "var(--text-muted)" }}
            title={on ? `Úroveň ${l} odemčená` : `Úroveň ${l} zamčená — trénuj níž`}
          >
            L{l}{on ? " ✓" : ""}
          </span>
        );
      })}
    </div>
  );
}

export default function LoggedInTopicMap({ isPremium, onSelectTopic, onStartMix, onStartMistakes }: Props) {
  const diagScores = useDiagScores();
  const [levels, setLevels] = useState<Record<string, Level>>({});
  const [mistakes, setMistakes] = useState(0);
  const [missionTema, setMissionTema] = useState<string | null>(null);
  const [week, setWeek] = useState<{ total: number; bars: number[] }>({ total: 0, bars: [0, 0, 0, 0, 0, 0, 0] });

  useEffect(() => {
    const st = computeTrainingState();
    setLevels(st.levels);
    setMistakes(st.mistakes);
    setMissionTema(pickMission(isPremium)?.tema ?? null);

    // Posledních 7 dní: kolik příkladů (pro kartu „Tvůj týden").
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dny: string[] = [];
      for (let i = 6; i >= 0; i--) {
        dny.push(localDateStr(localDateDaysAgo(i)));
      }
      const byDate: Record<string, number> = {};
      for (const s of localLoadSessions()) byDate[s.date] = (byDate[s.date] ?? 0) + (s.total ?? 0);
      const bars = dny.map((d) => byDate[d] ?? 0);
      setWeek({ total: bars.reduce((a, b) => a + b, 0), bars });
    } catch { /* ignore */ }
  }, [isPremium]);

  const daysToCermat = getDaysUntilCermat();
  const weekMax = Math.max(1, ...week.bars);

  // Témata v pořadí sešitu; dostupná první, zamčená (Premium) na konec.
  const ordered = [...TEMATA_ORDER].sort((a, b) => {
    const la = !isPremium && PREMIUM_TOPICS.has(a) ? 1 : 0;
    const lb = !isPremium && PREMIUM_TOPICS.has(b) ? 1 : 0;
    return la - lb;
  });
  const freeCount = TEMATA_ORDER.filter((t) => FREE_TOPICS.has(t)).length;

  return (
    // Break-out: tréninkové centrum se roztáhne přes celou plochu (jako Domů),
    // i když session karta na /trenink zůstává úzká. Layout má overflow-x-hidden,
    // takže w-screen nezpůsobí vodorovné rolování kvůli scrollbaru.
    <div className="mx-[calc(50%-50vw)] w-screen px-4">
    <div className="mx-auto max-w-6xl flex flex-col gap-5 fade-in-up">
      {/* Header */}
      <HlavickaZnacky>
        <h1 className="text-2xl font-extrabold text-white">Tréninkové centrum</h1>
        <p className="text-sm leading-snug mt-1" style={{ color: "#D9D8FE" }}>Vyber, jak chceš dnes trénovat.</p>
        {!isPremium && (
          <span className="inline-block mt-2.5 text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: "rgba(175,172,251,0.22)" }}>
            {freeCount} z {TEMATA_ORDER.length} témat zdarma
          </span>
        )}
      </HlavickaZnacky>

      {/* Režimy tréninku */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Dnešní trénink — vede */}
        <button
          onClick={() => missionTema && onSelectTopic(missionTema)}
          disabled={!missionTema}
          className="text-left rounded-2xl p-4 flex flex-col gap-1 text-white press-scale disabled:opacity-70"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <span className="text-2xl">🎯</span>
          <span className="text-sm font-black">Dnešní trénink</span>
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.82)" }}>
            {missionTema ? `Pokračuj v tématu ${TEMA_LABELS[missionTema]}` : "Sedm příkladů na míru"}
          </span>
        </button>

        {/* Rychlý mód */}
        <Link href="/rychly-mod" className="rounded-2xl p-4 flex flex-col gap-1 bg-white border border-slate-200 card-hover">
          <span className="text-2xl">⚡</span>
          <span className="text-sm font-black" style={{ color: "var(--text-primary)" }}>Rychlý mód</span>
          <span className="text-[11px] text-slate-500">10 příkladů · 60 sekund</span>
        </Link>

        {/* Zopakovat chyby — jen když nějaké jsou */}
        {mistakes > 0 ? (
          <button
            onClick={onStartMistakes}
            className="text-left rounded-2xl p-4 flex flex-col gap-1 card-hover"
            style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
          >
            <span className="text-2xl">🔄</span>
            <span className="text-sm font-black" style={{ color: "#991b1b" }}>Zopakovat chyby</span>
            <span className="text-[11px]" style={{ color: "#dc2626" }}>{mistakes} {mistakes === 1 ? "příklad čeká" : mistakes <= 4 ? "příklady čekají" : "příkladů čeká"}</span>
          </button>
        ) : (
          <div className="rounded-2xl p-4 flex flex-col gap-1 bg-white border border-slate-200 opacity-60">
            <span className="text-2xl">🔄</span>
            <span className="text-sm font-black" style={{ color: "var(--text-primary)" }}>Zopakovat chyby</span>
            <span className="text-[11px] text-slate-400">Zatím žádné chyby k opakování</span>
          </div>
        )}

        {/* Mix témat */}
        <button
          onClick={onStartMix}
          className="text-left rounded-2xl p-4 flex flex-col gap-1 bg-white border border-slate-200 card-hover"
        >
          <span className="text-2xl">🎲</span>
          <span className="text-sm font-black" style={{ color: "var(--text-primary)" }}>Mix témat</span>
          <span className="text-[11px] text-slate-500">Náhodně z dostupných</span>
        </button>
      </div>

      {/* Témata */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Témata</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ordered.map((tema) => {
            const locked = !isPremium && PREMIUM_TOPICS.has(tema);
            const score = diagScores[tema] ?? 0;
            const level = levels[tema] ?? 1;

            if (locked) {
              return (
                <Link
                  key={tema}
                  href="/cenik"
                  className="rounded-2xl p-3 flex items-center gap-3 bg-white border border-slate-200 card-hover"
                  style={temaStyl(tema)}
                  data-tema={tema}
                >
                  <HexIkona tema={tema} />
                  <span className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className="text-[15px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{TEMA_LABELS[tema]}</span>
                    <span className="text-xs text-slate-500">Odemkni v Premium →</span>
                  </span>
                  <span className="shrink-0 flex items-center gap-1 text-xs font-bold text-slate-500">
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5Z" /></svg>
                    Premium
                  </span>
                </Link>
              );
            }

            return (
              <button
                key={tema}
                onClick={() => onSelectTopic(tema)}
                className="text-left rounded-2xl p-3 flex items-center gap-3 bg-white border border-slate-200 card-hover"
                style={temaStyl(tema)}
                data-tema={tema}
              >
                <HexIkona tema={tema} />
                <span className="flex-1 min-w-0 flex flex-col gap-1">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[15px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{TEMA_LABELS[tema]}</span>
                    {tema === missionTema && (
                      <span className="shrink-0 px-[7px] py-px rounded-full text-[11px] font-extrabold whitespace-nowrap" style={{ background: "#F5A623", color: "#0D1B3E" }}>Začni tady</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tema-tint flex-1 h-1.5 rounded-full overflow-hidden">
                      <span className="block h-full rounded-full" style={{ width: `${score}%`, background: "var(--tema-barva)" }} />
                    </span>
                    <span className="tema-text text-xs font-bold shrink-0">{score > 0 ? `${score} %` : "—"}</span>
                  </span>
                  <LevelChips level={level} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spodní řada — zaplňuje prostor pod tématy a motivuje k dalšímu kroku */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tvůj týden */}
        <div className="rounded-2xl p-4 bg-white border border-slate-200 flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tvůj týden</p>
          <p className="text-2xl font-black leading-none" style={{ color: "var(--text-primary)" }}>
            {week.total} <span className="text-xs font-semibold text-slate-400">{week.total === 1 ? "příklad" : week.total <= 4 ? "příklady" : "příkladů"}</span>
          </p>
          <div className="flex items-end gap-1 h-10 mt-1">
            {week.bars.map((v, i) => (
              <div key={i} className="flex-1 rounded-sm" style={{ height: `${Math.max(6, (v / weekMax) * 100)}%`, background: i === 6 ? "#2E6DA4" : "#c7d2fe" }} title={`${v} příkladů`} />
            ))}
          </div>
        </div>

        {/* Odpočet + testy nanečisto */}
        <Link href="/testy-nanecisto" className="rounded-2xl p-4 flex flex-col gap-1 text-white card-hover" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.6)" }}>Přijímačky za</p>
          <p className="text-2xl font-black leading-none">{daysToCermat} dní</p>
          <span className="mt-auto inline-block text-xs font-black px-3 py-1.5 rounded-lg w-fit" style={{ background: "rgba(255,255,255,0.15)" }}>🎯 Test nanečisto →</span>
        </Link>

        {/* Denní výzva */}
        <Link href="/vyzva" className="rounded-2xl p-4 flex flex-col gap-1 card-hover" style={{ background: "#fff7ed", border: "1px solid #fed7aa" }}>
          <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#c2410c" }}>Denní výzva</p>
          <p className="text-sm font-black" style={{ color: "#9a3412" }}>Rychlé kolo za pár minut</p>
          <p className="text-[11px]" style={{ color: "#c2410c" }}>Bonusové XP navíc</p>
          <span className="mt-auto inline-block text-xs font-black px-3 py-1.5 rounded-lg text-white w-fit" style={{ background: "#f97316" }}>Do toho →</span>
        </Link>
      </div>

      {/* Premium CTA */}
      {!isPremium && (
        <Link
          href="/cenik"
          className="block rounded-2xl p-5 text-center hover:opacity-90 transition-opacity"
          style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}
        >
          <p className="text-base font-black text-white">⭐ Odemkni všechna témata</p>
          <p className="text-sm text-blue-200 mt-1">Premium — všech {TEMATA_ORDER.length} témat · 99 Kč/měsíc</p>
        </Link>
      )}
    </div>
    </div>
  );
}
