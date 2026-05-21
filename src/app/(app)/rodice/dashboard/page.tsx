"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SkeletonLine } from "@/components/Skeleton";

// ─── TYPES ───────────────────────────────────────────────────────────────────

type TopicRow = {
  tema: string;
  label: string;
  accuracy: number;
  total: number;
};

type DashboardData = {
  linked: boolean;
  childId?: string;
  childName?: string;
  childEmail?: string;
  weekTotal?: number;
  lastWeekTotal?: number;
  accuracy?: number | null;
  streak?: number;
  lastSession?: string | null;
  totalXp?: number;
  currentLevel?: string;
  topicTable?: TopicRow[];
  weakestTopic?: TopicRow | null;
  weeklyActivity?: { date: string; count: number }[];
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const LEVEL_LABELS: Record<string, string> = {
  zacatecnik: "Začátečník",
  pokrocily: "Pokročilý",
  expert: "Expert",
  mistr: "Mistr",
  legenda: "Legenda",
};

const DAY_LABELS = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function daysAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "nikdy";
  const diff = Math.round((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diff === 0) return "dnes";
  if (diff === 1) return "včera";
  return `${diff} dní zpět`;
}

function topicColor(accuracy: number): { bg: string; text: string; bar: string } {
  if (accuracy >= 70) return { bg: "#f0fdf4", text: "#166534", bar: "#22c55e" };
  if (accuracy >= 40) return { bg: "#fffbeb", text: "#92400e", bar: "#f59e0b" };
  return { bg: "#fef2f2", text: "#991b1b", bar: "#ef4444" };
}

function getCoachingInsight(data: DashboardData): { icon: string; title: string; text: string; color: string } {
  const { streak = 0, weekTotal = 0, accuracy, weakestTopic } = data;

  if (streak === 0 && weekTotal === 0) {
    return {
      icon: "💬",
      title: "Dítě dnes ještě necvičilo",
      text: `Zkuste se dítěte zeptat, jestli si dnes chce dát alespoň 5 příkladů. Stačí 10 minut — pravidelnost je důležitější než objem.`,
      color: "#fef9c3",
    };
  }
  if (streak >= 14) {
    return {
      icon: "🏆",
      title: `Úžasný streak — ${streak} dní v řadě!`,
      text: "Dítě cvičí velmi pravidelně. Pochvalte ho — pozitivní zpětná vazba je silnější motivátor než tlak. Zvažte malou odměnu za dosažení 30 dní.",
      color: "#fef3c7",
    };
  }
  if (streak >= 7) {
    return {
      icon: "🔥",
      title: `${streak} dní v řadě — skvělá pravidelnost`,
      text: "Pravidelný trénink funguje. Dítě si buduje návyk. Připomeňte mu streak — děti jsou na čísla hrdé a nechci sérii přerušit.",
      color: "#fef9c3",
    };
  }
  if (accuracy !== null && accuracy !== undefined && accuracy < 40 && weekTotal > 0) {
    return {
      icon: "📚",
      title: "Dítě se potýká s chybami",
      text: `Úspěšnost ${accuracy} % znamená, že látka je těžká. Nesrovnávejte s ostatními — pochvalte za snahu. Zkuste si spolu projít ${weakestTopic?.label ?? "nejslabší téma"}, ale bez tlaku.`,
      color: "#ffe4e6",
    };
  }
  if (weekTotal >= 30) {
    return {
      icon: "💪",
      title: "Výborný týdenní výkon",
      text: `${weekTotal} příkladů za týden je skvělý výsledek. Dítě pracuje nad rámec denního cíle. Ujistěte se, že ho to baví a necvičí z donucení.`,
      color: "#dcfce7",
    };
  }
  if (weekTotal > 0 && weekTotal < 5) {
    return {
      icon: "⏰",
      title: "Méně aktivní týden",
      text: "Tento týden jen pár příkladů. Neznamená to selhání — možná bylo hodně jiných povinností. Zkuste večer říct: \"Chceš si dát rychlé kolo v MateMax?\"",
      color: "#eff6ff",
    };
  }
  return {
    icon: "📊",
    title: "Pokrok probíhá",
    text: weakestTopic
      ? `Téma ${weakestTopic.label} (${weakestTopic.accuracy} %) potřebuje více procvičení. Nebojte se dítěti říct, co vidíte — děti ocení, že rodič sleduje jejich pokrok.`
      : "Dítě procvičuje rovnoměrně. Sledujte tabulku témat níže pro detailní přehled.",
    color: "#eff6ff",
  };
}

const COACHING_GUIDE = [
  {
    icon: "🗣️",
    title: "Jak mluvit o chybách",
    text: "Místo \"To je špatně\" zkuste \"Vidím, že tohle je těžké — co si myslíš, kde nastala chyba?\" Aktivní reflexe učí víc než oprava.",
  },
  {
    icon: "⏱️",
    title: "Kolik minut denně",
    text: "Optimální je 10–15 minut denně, ne víkendový maraton. Algoritmus MateMax je navržen tak, aby 7 příkladů denně stačilo na znatelný pokrok za 3–4 týdny.",
  },
  {
    icon: "🎯",
    title: "Kdy zasáhnout",
    text: "Pokud dítě má úspěšnost pod 40 % opakovaně, doporučujeme doučovatel nebo společné procvičení. Aplikace ukáže přesně, které téma drhne.",
  },
  {
    icon: "📅",
    title: "Blíží se přijímačky?",
    text: "3–4 týdny před termínem zintenzivněte na 15+ příkladů denně a zařaďte CERMAT cvičné testy. Zjistíte, kde jsou největší mezery.",
  },
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function RodiceDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgSent, setMsgSent] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) { setError("Supabase není dostupné."); setLoading(false); return; }
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/rodice/prihlaseni"); return; }
      tokenRef.current = session.access_token;

      try {
        const res = await fetch("/api/parent-dashboard", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = (await res.json()) as DashboardData & { error?: string };
        if (!res.ok) { setError(json.error ?? "Chyba při načítání dat."); return; }
        setData(json);
      } catch {
        setError("Nepodařilo se načíst data. Zkuste to znovu.");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!data?.childId || !message.trim() || !tokenRef.current) return;
    setSendingMsg(true);
    setMsgError(null);

    try {
      const res = await fetch("/api/parent-message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenRef.current}`,
        },
        body: JSON.stringify({ message: message.trim(), childUserId: data.childId }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) { setMsgError(json.error ?? "Zprávu se nepodařilo odeslat."); return; }
      setMsgSent(true);
      setMessage("");
      setTimeout(() => setMsgSent(false), 4000);
    } finally {
      setSendingMsg(false);
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-4 fade-in-up">
        <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "#064E3B" }}>
          <div className="skeleton rounded-full" style={{ width: 48, height: 48, background: "rgba(255,255,255,0.15)" }} />
          <div className="flex flex-col gap-2 flex-1">
            <div style={{ width: "55%", height: "1rem", background: "rgba(255,255,255,0.2)", borderRadius: 6 }} />
            <div style={{ width: "35%", height: "0.75rem", background: "rgba(255,255,255,0.12)", borderRadius: 6 }} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-col gap-2">
              <SkeletonLine width="60%" height="0.75rem" />
              <SkeletonLine width="40%" height="1.5rem" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-3">
          <SkeletonLine width="40%" height="0.875rem" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonLine width="30%" height="0.75rem" />
              <div className="flex-1 skeleton rounded-full" style={{ height: 8 }} />
              <SkeletonLine width="30px" height="0.75rem" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="max-w-sm mx-auto flex flex-col gap-4 pt-8 text-center">
        <span className="text-5xl">⚠️</span>
        <h2 className="text-xl font-extrabold" style={{ color: "#064E3B" }}>Nastala chyba</h2>
        <p className="text-sm text-slate-500">{error}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full py-3 rounded-xl text-white font-bold"
          style={{ background: "#047857" }}
        >
          Zkusit znovu
        </button>
      </div>
    );
  }

  // ─── Not linked ─────────────────────────────────────────────────────────────

  if (!data?.linked) {
    return (
      <div className="max-w-sm mx-auto flex flex-col gap-6 items-center text-center pt-8">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
          style={{ background: "#d1fae5" }}
        >
          🔗
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#047857" }}>
            Rodičovský portál
          </p>
          <h2 className="text-2xl font-extrabold" style={{ color: "#064E3B" }}>Žádné propojené dítě</h2>
          <p className="mt-2 text-slate-500 text-sm leading-relaxed">
            Dosud nemáte propojený účet s žádným dítětem.
            Propojení trvá méně než minutu.
          </p>
        </div>
        <Link
          href="/rodice/propojeni"
          className="w-full py-4 rounded-2xl text-white font-extrabold text-base text-center shadow-md"
          style={{ background: "linear-gradient(135deg,#064E3B 0%,#047857 100%)" }}
        >
          Propojit s dítětem →
        </Link>
      </div>
    );
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  const {
    childName, childEmail,
    weekTotal = 0, lastWeekTotal = 0, accuracy, streak = 0,
    lastSession, weeklyActivity = [],
    totalXp = 0, currentLevel = "zacatecnik",
    topicTable = [], weakestTopic,
  } = data;

  const trendDiff = weekTotal - lastWeekTotal;

  const insight = getCoachingInsight(data);
  const childInitial = childName ? childName[0].toUpperCase() : (childEmail ? childEmail[0].toUpperCase() : "?");

  return (
    <div className="flex flex-col gap-5 pb-10 fade-in-up">

      {/* ── PARENT PORTAL HEADER ─────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #064E3B 0%, #065f46 60%, #047857 100%)" }}
      >
        <div className="px-5 pt-5 pb-4">
          {/* Portal label */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#a7f3d0" }}>
              👨‍👩‍👧 Rodičovský portál
            </span>
          </div>

          {/* Child info */}
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "2px solid rgba(255,255,255,0.25)" }}
            >
              {childInitial}
            </div>
            <div>
              <p className="text-white font-extrabold text-lg leading-tight">{childName ?? childEmail ?? "Dítě"}</p>
              <p className="text-emerald-200 text-xs mt-0.5">{LEVEL_LABELS[currentLevel] ?? currentLevel} · {totalXp} XP celkem</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-emerald-300">🔥 {streak} dní streak</span>
                <span className="text-xs text-emerald-300">📚 {weekTotal} příkladů</span>
              </div>
              {lastSession && (
                <p className="text-xs mt-1" style={{ color: "rgba(167,243,208,0.7)" }}>
                  Naposledy: {daysAgo(lastSession)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 7-day activity strip */}
        {weeklyActivity.length > 0 && (
          <div className="px-5 pb-4 flex items-end gap-1.5">
            {weeklyActivity.map(({ date, count }) => {
              const dayIdx = new Date(date).getDay();
              const active = count > 0;
              return (
                <div key={date} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-md transition-all"
                    style={{
                      height: active ? Math.min(28, 8 + count * 3) : 8,
                      background: active ? "#34d399" : "rgba(255,255,255,0.15)",
                      minHeight: 8,
                    }}
                    title={`${date}: ${count} příkladů`}
                  />
                  <span className="text-xs" style={{ color: active ? "#a7f3d0" : "rgba(255,255,255,0.35)", fontSize: 9 }}>
                    {DAY_LABELS[dayIdx]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── COACHING INSIGHT ─────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 flex items-start gap-3"
        style={{ background: insight.color, border: "2px solid rgba(0,0,0,0.08)" }}
      >
        <span className="text-2xl flex-shrink-0">{insight.icon}</span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-0.5">Tip pro vás</p>
          <p className="text-sm font-bold text-slate-800">{insight.title}</p>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">{insight.text}</p>
        </div>
      </div>

      {/* ── STATS GRID ───────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Tento týden</p>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-3xl font-extrabold" style={{ color: "#064E3B" }}>{weekTotal}</p>
            <p className="text-xs text-slate-400 mt-1 leading-snug">příkladů</p>
            {lastWeekTotal > 0 && (
              <p
                className="text-xs font-bold mt-1"
                style={{ color: trendDiff >= 0 ? "#16a34a" : "#dc2626" }}
              >
                {trendDiff >= 0 ? `↑ +${trendDiff}` : `↓ ${trendDiff}`}
              </p>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            {accuracy !== null && accuracy !== undefined ? (
              <>
                <p
                  className="text-3xl font-extrabold"
                  style={{ color: accuracy >= 70 ? "#16a34a" : accuracy >= 40 ? "#d97706" : "#dc2626" }}
                >
                  {accuracy}%
                </p>
                <p className="text-xs text-slate-400 mt-1 leading-snug">úspěšnost</p>
              </>
            ) : (
              <>
                <p className="text-2xl font-extrabold text-slate-300">—</p>
                <p className="text-xs text-slate-400 mt-1">úspěšnost</p>
              </>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-3xl font-extrabold text-orange-500">{streak}</p>
            <p className="text-xs text-slate-400 mt-1 leading-snug">dní v řadě</p>
          </div>
        </div>
      </div>

      {/* ── TOPIC BREAKDOWN ──────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Přehled témat</p>
        {topicTable.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-50">
              {topicTable.map((row) => {
                const c = topicColor(row.accuracy);
                const barPct = Math.min(100, row.accuracy);
                return (
                  <div key={row.tema} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: c.bg, color: c.text }}
                        >
                          {row.accuracy} %
                        </span>
                        <span className="text-xs text-slate-300">{row.total}×</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-full transition-all duration-700"
                        style={{ width: `${barPct}%`, background: c.bar }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2.5 flex gap-4 text-xs text-slate-400 border-t border-slate-50">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> ≥ 70 % zvládá</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 40–70 %</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt; 40 % slabé</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 p-5 text-center">
            <p className="text-2xl mb-2">📊</p>
            <p className="text-sm font-semibold text-slate-600">Zatím žádná data</p>
            <p className="text-xs text-slate-400 mt-1">Data se zobrazí po prvním tréninku dítěte v MateMax.</p>
          </div>
        )}
      </div>

      {/* ── COACHING GUIDE ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <button
          type="button"
          onClick={() => setGuideOpen((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <p className="text-sm font-bold" style={{ color: "#064E3B" }}>Průvodce rodiče — jak vést dítě</p>
          </div>
          <span
            className="text-slate-400 text-xl font-light transition-transform duration-200 select-none"
            style={{ transform: guideOpen ? "rotate(45deg)" : "rotate(0deg)", display: "inline-block" }}
          >
            +
          </span>
        </button>
        {guideOpen && (
          <div className="px-5 pb-5 flex flex-col gap-4 border-t border-slate-50">
            {COACHING_GUIDE.map((tip) => (
              <div key={tip.title} className="flex gap-3 pt-3">
                <span className="text-xl flex-shrink-0">{tip.icon}</span>
                <div>
                  <p className="text-sm font-bold text-slate-700">{tip.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── MESSAGE TO CHILD ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">💌</span>
          <p className="text-sm font-bold" style={{ color: "#064E3B" }}>Vzkaz pro dítě</p>
        </div>
        <p className="text-xs text-slate-400 mb-3 leading-relaxed">
          Napište motivační zprávu — dítě ji uvidí na svém dashboardu jako bannner.
        </p>
        <form onSubmit={sendMessage} className="flex flex-col gap-3">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            placeholder="Např: Makej dál, věřím ti! 💪"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm outline-none transition-colors resize-none"
            style={{ outlineColor: "#047857" }}
            onFocus={(e) => e.target.style.borderColor = "#047857"}
            onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{message.length}/200</span>
            <button
              type="submit"
              disabled={sendingMsg || !message.trim()}
              className="px-5 py-2.5 rounded-xl text-white font-bold text-sm disabled:opacity-50 transition-opacity"
              style={{ background: "#047857" }}
            >
              {sendingMsg ? "Odesílám…" : "Odeslat vzkaz"}
            </button>
          </div>
          {msgSent && <p className="text-sm font-semibold text-green-600">✅ Vzkaz byl odeslán!</p>}
          {msgError && <p className="text-sm text-red-600">{msgError}</p>}
        </form>
      </div>

      {/* ── BOTTOM LINKS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/rodice/nastaveni"
          className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <span className="text-lg">⚙️</span>
          <span className="text-sm font-semibold text-slate-700">Nastavení reportů</span>
        </Link>
        <Link
          href="/rodice/propojeni"
          className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors"
        >
          <span className="text-lg">🔗</span>
          <span className="text-sm font-semibold text-slate-700">Propojení</span>
        </Link>
      </div>

    </div>
  );
}
