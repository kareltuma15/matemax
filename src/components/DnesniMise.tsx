"use client";

import Link from "next/link";
import { pickMission } from "@/lib/mise";

const DAILY_GOAL = 10;
const SESSION_SIZE = 7;

/** 1 příklad · 2–4 příklady · 5+ příkladů */
function sklonuj(n: number): string {
  if (n === 1) return "příklad";
  if (n >= 2 && n <= 4) return "příklady";
  return "příkladů";
}

/**
 * Řízený domov — místo katalogu témat jedna konkrétní mise na dnešek.
 *
 * Filozofie: appka rozhoduje CO, žák jen JESTLI teď. Samo-tempo, ne kalendář —
 * mise = nejslabší téma dle diagnostiky + tréninku (getReadiness míchá obojí),
 * ne „je středa, tak rovnice". Kdo nemá diagnostiku, dostane ji jako misi,
 * protože ta guidanci teprve odemyká.
 */
export default function DnesniMise({
  diagDone,
  isPremium,
  todayCount,
}: {
  diagDone: boolean;
  isPremium: boolean;
  todayCount: number;
}) {
  const goalMet = todayCount >= DAILY_GOAL;

  // ── Bez diagnostiky: mise = zjistit, kde žák je ─────────────────────────────
  if (!diagDone) {
    return (
      <Hero
        kicker="Než začneme"
        title="Zjistíme, kde jsi"
        meta="8 minut · 16 otázek · výsledek ihned"
        why="💡 Podle výsledku ti sestavíme trénink přesně na tvoje mezery."
        href="/vitej"
        cta="Spustit diagnostiku →"
      />
    );
  }

  // ── Cíl splněn: oslavit, nabídnout (ne vnutit) ──────────────────────────────
  if (goalMet) {
    return (
      <Hero
        kicker="Hotovo na dnešek"
        title="Dnešní cíl splněn! 🎉"
        meta={`${todayCount} příkladů hotovo · streak pokračuje`}
        why="🔥 Zítra tě čeká další krok. Vrátíš se?"
        href="/trenink"
        cta="Ještě 5 minut navíc"
        tone="calm"
      />
    );
  }

  // ── Dnešní mise: nejslabší dostupné téma ────────────────────────────────────
  const mission = pickMission(isPremium);
  const remaining = DAILY_GOAL - todayCount;

  if (!mission) {
    // Diagnostika hotová, ale zatím žádná data o slabinách — pošli rovnou trénovat
    return (
      <Hero
        kicker="Dnešní trénink"
        title="Pojď na dnešní příklady"
        meta={`${SESSION_SIZE} příkladů · ~10 minut · od lehkých po střední`}
        why="💪 Každý den kousek — přesně to tě posune."
        href="/trenink"
        cta="Začít trénink →"
        goal={{ done: todayCount, total: DAILY_GOAL }}
      />
    );
  }

  const whyText =
    mission.score > 0
      ? `💡 Tvoje nejslabší téma — právě ${mission.score} %. Pojďme ho zvednout.`
      : "💡 Tohle téma sis ještě nezkusil. Začneme od lehkých.";

  // Rozdělaný den nesmí vypadat jako první přihlášení — appka má uznat,
  // co už je hotovo, jinak žák nechápe, proč má „začít" něco, co dělal.
  const rozdelano = todayCount > 0;

  return (
    <Hero
      kicker={rozdelano ? "Pokračuj v dnešku" : "Dnešní trénink"}
      title={mission.label}
      meta={
        rozdelano
          ? `Dnes už máš ${todayCount} ${sklonuj(todayCount)} · ${remaining} do splnění cíle`
          : `${SESSION_SIZE} příkladů · ~10 minut · ${remaining} do splnění cíle`
      }
      why={whyText}
      href={`/trenink?tema=${mission.tema}`}
      cta={rozdelano ? "Pokračovat →" : "Začít trénink →"}
      goal={{ done: todayCount, total: DAILY_GOAL }}
    />
  );
}

function Hero({
  kicker, title, meta, why, href, cta, goal, tone = "primary",
}: {
  kicker: string;
  title: string;
  meta: string;
  why: string;
  href: string;
  cta: string;
  goal?: { done: number; total: number };
  tone?: "primary" | "calm";
}) {
  const bg =
    tone === "calm"
      ? "linear-gradient(135deg, #064E3B 0%, #059669 100%)"
      : "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)";
  const pct = goal ? Math.min(100, Math.round((goal.done / goal.total) * 100)) : 0;

  return (
    <div className="rounded-3xl p-6 shadow-lg fade-in-up" style={{ background: bg }}>
      {/* Na širokém displeji text vlevo, tlačítko vpravo — aby mise nezdrobněla
          na jednu kartu z mnoha, ale zůstala největším prvkem stránky. */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex flex-col gap-3 lg:flex-1 lg:min-w-0">
          <span className="text-[11px] font-black uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.6)" }}>
            {kicker}
          </span>
          <h2 className="text-3xl lg:text-4xl font-black text-white leading-none" style={{ letterSpacing: "-0.02em" }}>
            {title}
          </h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.82)" }}>{meta}</p>
          <p className="text-[13px] leading-snug rounded-xl px-3 py-2 lg:self-start" style={{ background: "rgba(255,255,255,0.14)", color: "#fff" }}>
            {why}
          </p>
        </div>

        <Link
          href={href}
          className="mt-1 lg:mt-0 block text-center font-black text-lg py-4 lg:py-5 lg:px-10 rounded-2xl press-scale transition-transform lg:shrink-0"
          style={{ background: "#fff", color: "#0D1B3E", boxShadow: "0 8px 20px -8px rgba(0,0,0,0.5)" }}
        >
          {cta}
        </Link>
      </div>

      {goal && (
        <div className="flex items-center gap-2.5 mt-3">
          <span className="text-[11px] font-semibold shrink-0" style={{ color: "rgba(255,255,255,0.7)" }}>
            Dnešní cíl
          </span>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "#fff" }} />
          </div>
          <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: "#fff" }}>
            {goal.done}/{goal.total}
          </span>
        </div>
      )}
    </div>
  );
}
