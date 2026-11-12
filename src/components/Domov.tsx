"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";
import HeaderClient from "@/components/HeaderClient";
import BottomNav from "@/components/BottomNav";
import PushSubscribeNudge from "@/components/PushSubscribeNudge";
import { HexIkona, HlavickaZnacky } from "@/components/HexIkona";
import { supabase } from "@/lib/supabase";
import { reportDbError } from "@/lib/db-error";
import { usePremium } from "@/lib/premium";
import { vokativ } from "@/lib/vokativ";
import { getDaysUntilCermat } from "@/lib/cermat-date";
import { getLevelFromXP } from "@/lib/gamification";
import { localLoadSessions } from "@/lib/storage";
import { localDateStr, localDateDaysAgo } from "@/lib/date";
import { temaStyl } from "@/lib/barvy-temat";
import { isTopicLocked } from "@/lib/subscription";
import { maDovednosti } from "@/lib/dovednosti";
import { computeDovednostProgress } from "@/lib/levels";
import { dnesniTrenink, type DnesniTrenink } from "@/lib/dnesni-trenink";
import { nactiVyvoj, type Vyvoj } from "@/lib/odhad-bodu";
import { TEMATA_ORDER, TEMATA_ORDER_5, TEMA_LABELS, type Trida } from "@/types";

/** První jednotný termín přijímaček na víceletá gymnázia (ověřený fakt: 14.–15. 4. 2027). */
const TERMIN_5 = new Date(2027, 3, 14);
const ZKRATKY_DNU = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

function dnyDo(cil: Date): number {
  const dnes = new Date();
  dnes.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((cil.getTime() - dnes.getTime()) / 86400000));
}

function emailNaJmeno(email: string): string {
  const cast = email.split("@")[0].split(/[._-]/)[0] ?? "";
  return cast ? cast[0].toUpperCase() + cast.slice(1) : "";
}

const prikladu = (n: number) => (n === 1 ? "příklad" : n >= 2 && n <= 4 ? "příklady" : "příkladů");

interface Den { popis: string; pocet: number; dnes: boolean }

/** Příklady po dnech za posledních 7 dní (z místní historie tréninků). */
function tentoTyden(): { prikladu: number; dny: Den[] } {
  const data = Array.from({ length: 7 }, (_, i) => localDateDaysAgo(6 - i));
  const pocty = new Map(data.map((d) => [localDateStr(d), 0]));
  for (const s of localLoadSessions()) if (pocty.has(s.date)) pocty.set(s.date, (pocty.get(s.date) ?? 0) + s.total);
  const dny = data.map((d, i) => ({ popis: ZKRATKY_DNU[d.getDay()], pocet: pocty.get(localDateStr(d)) ?? 0, dnes: i === 6 }));
  return { prikladu: dny.reduce((a, d) => a + d.pocet, 0), dny };
}

interface TemaPostup { tema: string; podil: number; zamceno: boolean }

function postupTemat(trida: Trida, isPremium: boolean): TemaPostup[] {
  const poradi = (trida === 5 ? TEMATA_ORDER_5 : TEMATA_ORDER) as readonly string[];
  return poradi.map((tema) => {
    const postup = Object.values(computeDovednostProgress(tema));
    const hotovo = postup.reduce((a, p) => a + p.done, 0);
    const celkem = postup.reduce((a, p) => a + p.total, 0);
    return { tema, podil: celkem ? hotovo / celkem : 0, zamceno: isTopicLocked(tema, isPremium) };
  });
}

/** Malý graf odhadu za 8 týdnů (bez os), týdny bez dat vynechá. */
function MiniGraf({ tydny, max, cil }: { tydny: (number | null)[]; max: number; cil: number | null }) {
  const w = 300, h = 64, n = tydny.length;
  const x = (i: number) => 4 + (i * (w - 8)) / (n - 1);
  const hodnoty = [...tydny.filter((v): v is number => v !== null), ...(cil !== null ? [cil] : [])];
  const lo = Math.max(0, Math.min(...hodnoty) - 4), hi = Math.min(max, Math.max(...hodnoty) + 4);
  const y = (v: number) => 6 + (1 - (v - lo) / Math.max(1, hi - lo)) * (h - 12);
  const body = tydny.map((v, i) => (v === null ? null : ([x(i), y(v)] as const))).filter((b): b is readonly [number, number] => b !== null);
  if (body.length < 2) return null;
  const cara = body.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ");
  const [lx, ly] = body[body.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden preserveAspectRatio="none" className="block">
      <defs>
        <linearGradient id="mm-mini" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#5B55D6" stopOpacity=".28" />
          <stop offset="1" stopColor="#5B55D6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {cil !== null && <line x1={0} x2={w} y1={y(cil)} y2={y(cil)} stroke="#F5A623" strokeWidth="2" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />}
      <polygon points={`${body[0][0]},${h} ${cara} ${lx},${h}`} fill="url(#mm-mini)" />
      <polyline points={cara} fill="none" stroke="#5B55D6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="4.5" fill="#F5A623" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

interface Props {
  session: Session;
  trida: Trida;
  xp: number;
  streak: number;
  diagDone: boolean;
}

/**
 * Domov přihlášeného žáka, stejná kostra pro 5. i 9. třídu.
 * Telefon: pozdrav s odpočtem a úrovní, jedna hlavní akce (Dnešní trénink, nováček Krátká diagnostika),
 * týden a odhad bodů, Premium (účet zdarma) nebo pozvánka pro rodiče (Premium).
 * Počítač: dva sloupce, vlevo hlavní akce a všechna témata s postupem, vpravo odhad s grafem, týden a Premium.
 */
export default function Domov({ session, trida, xp, streak, diagDone }: Props) {
  const { isPremium } = usePremium();
  const meta = (session.user.user_metadata ?? {}) as Record<string, string>;
  const jmeno = meta.first_name || (meta.full_name ?? meta.name ?? "").split(" ")[0] || emailNaJmeno(session.user.email ?? "");
  const dni = trida === 5 ? dnyDo(TERMIN_5) : getDaysUntilCermat();
  const uroven = getLevelFromXP(xp);
  const xpDalsi = uroven.xp_max === null ? null : uroven.xp_max + 1;
  const xpPodil = xpDalsi === null ? 100 : Math.round(((xp - uroven.xp_min) / (xpDalsi - uroven.xp_min)) * 100);
  const g5 = trida === 5;

  const [diagHotova, setDiagHotova] = useState(diagDone);
  const [trenink, setTrenink] = useState<DnesniTrenink | null>(null);
  const [vyvoj, setVyvoj] = useState<Vyvoj | null>(null);
  const [cil, setCil] = useState<number | null>(null);
  const [tyden, setTyden] = useState<{ prikladu: number; dny: Den[] }>({ prikladu: 0, dny: [] });
  const [temata, setTemata] = useState<TemaPostup[]>([]);
  const [vzkaz, setVzkaz] = useState<{ id: string; text: string } | null>(null);
  const [nacteno, setNacteno] = useState(false);

  // Data z prohlížeče (a po obnově ze serveru znovu: ProgressSync pošle matemax-progress-update)
  useEffect(() => {
    function nacti() {
      setDiagHotova((d) => d || localStorage.getItem("matemax-diag-done") === "1");
      setTrenink(dnesniTrenink(trida, isPremium));
      setVyvoj(nactiVyvoj(trida));
      setTyden(tentoTyden());
      setTemata(postupTemat(trida, isPremium));
      const cilUctu = Number((session.user.user_metadata as Record<string, unknown> | undefined)?.cil_body);
      const cilLok = Number(localStorage.getItem(`matemax-cil-body-${trida}`));
      setCil(cilUctu > 0 ? cilUctu : cilLok > 0 ? cilLok : null);
      setNacteno(true);
    }
    nacti();
    window.addEventListener("matemax-progress-update", nacti);
    return () => window.removeEventListener("matemax-progress-update", nacti);
  }, [trida, isPremium, session.user.user_metadata]);

  // Diagnostika ze serveru (po přihlášení na novém zařízení ji místní úložiště ještě nemá)
  useEffect(() => {
    if (!supabase || diagHotova) return;
    let zruseno = false;
    supabase
      .from("diagnostic_results")
      .select("tema, correct, total")
      .eq("user_id", session.user.id)
      .then(({ data }) => {
        if (zruseno || !data || data.length === 0) return;
        const vysledky: Record<string, { correct: number; total: number }> = {};
        for (const r of data) vysledky[r.tema] = { correct: r.correct, total: r.total };
        localStorage.setItem("matemax-diag-results", JSON.stringify(vysledky));
        localStorage.setItem("matemax-diag-done", "1");
        setDiagHotova(true);
        setTrenink(dnesniTrenink(trida, isPremium));
        setVyvoj(nactiVyvoj(trida));
      });
    return () => { zruseno = true; };
  }, [session.user.id, diagHotova, trida, isPremium]);

  // Nepřečtený vzkaz od rodiče
  useEffect(() => {
    if (!supabase) return;
    supabase
      .from("parent_messages")
      .select("id, message, read_at")
      .eq("child_user_id", session.user.id)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) setVzkaz({ id: data[0].id as string, text: data[0].message as string });
      });
  }, [session.user.id]);

  async function vzkazPrecten() {
    if (!supabase || !vzkaz) return;
    const { error } = await supabase.from("parent_messages").update({ read_at: new Date().toISOString() }).eq("id", vzkaz.id);
    reportDbError("parent_messages.mark_read", error);
    setVzkaz(null);
  }

  // Nováček: žádná diagnostika a žádný trénink → hlavní akcí je diagnostika
  const novacek = nacteno && !diagHotova && (vyvoj?.odhad.bezDat ?? true);
  const odhad = vyvoj?.odhad;
  const maxDen = Math.max(1, ...tyden.dny.map((d) => d.pocet));
  const hlavniTlacitko = "w-full lg:w-auto lg:px-10 py-3.5 rounded-2xl text-center text-base font-extrabold mm-tlacitko";

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden mm-pozadi">
      <HeaderClient />
      <main
        className="flex-1 w-full max-w-xl lg:max-w-6xl mx-auto px-4 lg:px-8 pt-4 lg:pt-8 pb-28 lg:pb-12 grid gap-4 lg:gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start"
        data-testid={g5 ? "dashboard-5" : "domov"}
      >
        {/* ── Levý sloupec: kdo jsem, co dnes, všechna témata ── */}
        <div className="flex flex-col gap-4 lg:gap-6 min-w-0">
          <HlavickaZnacky>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm lg:text-base" style={{ color: "#D9D8FE" }}>{jmeno ? `Ahoj, ${vokativ(jmeno)}!` : "Ahoj!"}</p>
              <div className="hidden lg:flex gap-2 shrink-0 mr-16">
                <span className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,.1)" }}>🔥 {streak} {streak === 1 ? "den" : streak >= 2 && streak <= 4 ? "dny" : "dní"} v řadě</span>
                <span className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ background: "rgba(255,255,255,.1)" }}>⚡ {xp} XP</span>
              </div>
            </div>
            <h1 className="text-2xl lg:text-[32px] font-extrabold leading-tight mt-0.5">Do přijímaček zbývá {dni} dní</h1>
            <div className="mt-3 lg:mt-5 flex flex-col gap-1.5">
              <div className="flex justify-between text-[13px]" style={{ color: "#D9D8FE" }}>
                <b className="text-white">Úroveň {uroven.id} · {uroven.label}</b>
                <span className="tabular-nums">{xpDalsi === null ? `${xp} XP` : `${xp} / ${xpDalsi} XP`}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,.18)" }}>
                <i className="block h-full rounded-full" style={{ width: `${Math.max(3, Math.min(100, xpPodil))}%`, background: "#F5A623" }} />
              </div>
            </div>
          </HlavickaZnacky>

          {vzkaz && (
            <div className="rounded-2xl px-4 py-3.5 flex items-start gap-3" style={{ background: "#fffbeb", border: "1.5px solid #fde68a" }}>
              <span className="text-2xl" aria-hidden>💌</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">Vzkaz od rodiče</p>
                <p className="text-sm text-amber-900 leading-relaxed">{vzkaz.text}</p>
                <button type="button" onClick={vzkazPrecten} className="mt-1.5 text-xs font-semibold text-amber-700 underline">Označit jako přečteno</button>
              </div>
            </div>
          )}

          {/* Jedna hlavní akce */}
          {!nacteno ? (
            <div className="skeleton rounded-[22px]" style={{ height: 210 }} />
          ) : novacek ? (
            <div className="mm-karta overflow-hidden lg:grid lg:grid-cols-[200px_minmax(0,1fr)]" style={{ border: "2px solid #5B55D6" }} data-testid="domov-diagnostika">
              <div className="hidden lg:flex items-center justify-center" style={{ background: "#EBEAFE" }} aria-hidden>
                <span className="text-6xl">🧭</span>
              </div>
              <div className="p-4 lg:p-6 flex flex-col gap-3">
                <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#5B55D6" }}>Začni tady</span>
                <h2 className="text-[21px] lg:text-[26px] font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>Krátká diagnostika</h2>
                <p className="text-sm lg:text-base" style={{ color: "#5F6982" }}>
                  {g5
                    ? "Krátký test ze všech osmi okruhů, asi 15 minut. Podle něj ti ukážeme, čím začít."
                    : "Pár příkladů z každého tématu. Zjistí, kde máš mezery, a podle toho ti appka vybere trénink."}
                </p>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
                  <Link href="/diagnostika" data-testid={g5 ? "diagnostika-5-odkaz" : "diagnostika-odkaz"} className={hlavniTlacitko} style={{ background: "#F5A623", color: "#0D1B3E" }}>
                    Spustit diagnostiku
                  </Link>
                  <Link href="/trenink" className="text-center text-sm font-semibold mm-odkaz" style={{ color: "#4741B8" }}>Raději hned trénovat</Link>
                </div>
              </div>
            </div>
          ) : trenink ? (
            <div className="mm-karta overflow-hidden lg:grid lg:grid-cols-[200px_minmax(0,1fr)]" style={{ ...temaStyl(trenink.tema), border: "2px solid var(--tema-barva)" }} data-testid="dnesni-trenink">
              <div className="hidden lg:flex items-center justify-center tema-tint" aria-hidden>
                <HexIkona tema={trenink.tema} velikost={112} vypln="#fff" />
              </div>
              <div className="p-4 lg:p-6 flex flex-col gap-3">
                <span className="tema-text text-xs font-extrabold uppercase tracking-wider">Dnešní trénink</span>
                <div className="flex items-center gap-3">
                  <span className="lg:hidden"><HexIkona tema={trenink.tema} velikost={52} /></span>
                  <div className="min-w-0">
                    <h2 className="text-[20px] lg:text-[26px] font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>
                      {trenink.nazevTematu}{trenink.nazevDovednosti ? `: ${trenink.nazevDovednosti}` : ""}
                    </h2>
                    <p className="text-sm lg:text-base" style={{ color: "#5F6982" }}>7 příkladů · asi 8 minut</p>
                  </div>
                </div>
                <p className="text-sm lg:text-base" style={{ color: "#5F6982" }}>{trenink.duvod}</p>
                <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-5">
                  <Link href={trenink.href} className={hlavniTlacitko} style={{ background: "#F5A623", color: "#0D1B3E" }}>
                    Pokračovat →
                  </Link>
                  <Link href="/trenink" className="text-center text-sm font-semibold mm-odkaz" style={{ color: "#4741B8" }}>Vybrat jiné téma</Link>
                </div>
              </div>
            </div>
          ) : null}

          {/* Počítač: všechna témata s postupem (na telefonu jsou v Tréninku) */}
          {temata.length > 0 && (
            <section className="hidden lg:flex flex-col gap-3" data-testid="domov-temata">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-extrabold" style={{ color: "#0D1B3E" }}>{g5 ? "Tvoje okruhy" : "Tvoje témata"}</h2>
                <Link href="/trenink" className="text-sm font-semibold mm-odkaz" style={{ color: "#4741B8" }}>Celý trénink →</Link>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {temata.map((t) => (
                  <Link
                    key={t.tema}
                    href={t.zamceno ? "/premium" : maDovednosti(t.tema) ? `/trenink?vyber=${t.tema}` : `/trenink?tema=${t.tema}`}
                    data-tema={t.tema}
                    className="mm-karta mm-klik p-3.5 flex flex-col gap-2.5"
                    style={{ ...temaStyl(t.tema), ...(t.zamceno ? { background: "#F7F8FC", borderStyle: "dashed" } : {}) }}
                  >
                    <span className="flex items-center gap-2.5">
                      <HexIkona tema={t.tema} velikost={36} />
                      <span className="min-w-0 flex-1 text-[14.5px] font-bold leading-tight" style={{ color: "#0D1B3E" }}>{TEMA_LABELS[t.tema] ?? t.tema}</span>
                      <span className="mm-sipka text-lg" style={{ color: "#A0A8BD" }} aria-hidden>{t.zamceno ? "🔒" : "›"}</span>
                    </span>
                    {t.zamceno ? (
                      <span className="text-xs font-bold" style={{ color: "#8A5A00" }}>V Premium</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--tema-tint)" }}>
                          <i className="block h-full rounded-full" style={{ width: `${Math.max(3, Math.round(t.podil * 100))}%`, background: "var(--tema-barva)" }} />
                        </span>
                        <span className="text-xs font-bold tabular-nums tema-text">{Math.round(t.podil * 100)} %</span>
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* ── Pravý sloupec: odhad, týden, Premium ── */}
        <div className="flex flex-col gap-4 lg:gap-6">
          <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 lg:gap-6">
            <Link href="/profil" className="mm-karta mm-klik p-3 lg:p-5 flex flex-col gap-1 text-[13px]" style={{ color: "#5F6982" }} data-testid="domov-odhad">
              <span className="flex items-center justify-between">
                <span className="lg:text-xs lg:font-extrabold lg:uppercase lg:tracking-wider" style={{ color: "#5F6982" }}>Odhad u přijímaček</span>
                <span className="mm-sipka hidden lg:inline text-lg" style={{ color: "#A0A8BD" }} aria-hidden>›</span>
              </span>
              {odhad && !odhad.bezDat ? (
                <>
                  <b className="text-xl lg:text-[34px] lg:leading-none lg:mt-1 tabular-nums" style={{ color: "#0D1B3E" }}>
                    {odhad.celkem}<span className="lg:text-lg lg:font-bold" style={{ color: "#5F6982" }}> / {odhad.max} b.</span>
                  </b>
                  {vyvoj?.zmena14 != null && vyvoj.zmena14 !== 0 ? (
                    <span className="font-bold" style={{ color: vyvoj.zmena14 > 0 ? "#14753A" : "#8A93AA" }}>
                      {vyvoj.zmena14 > 0 ? `↑ +${vyvoj.zmena14}` : `↓ ${vyvoj.zmena14}`} b. za 2 týdny
                    </span>
                  ) : (
                    <span>Celý přehled v profilu ›</span>
                  )}
                  <span className="hidden lg:block mt-3"><MiniGraf tydny={vyvoj?.tydny ?? []} max={odhad.max} cil={cil} /></span>
                  {cil !== null && (
                    <span className="hidden lg:block text-xs mt-1" style={{ color: "#8A5A00" }}>
                      {cil > odhad.celkem ? `Do cíle ${cil} b. chybí ${cil - odhad.celkem}` : `Cíl ${cil} b. máš splněný`}
                    </span>
                  )}
                </>
              ) : (
                <>
                  <b className="text-xl lg:text-[34px]" style={{ color: "#0D1B3E" }}>?</b>
                  <span>Ukáže se po prvním tréninku</span>
                </>
              )}
            </Link>

            <div className="mm-karta p-3 lg:p-5 flex flex-col gap-1 text-[13px]" style={{ color: "#5F6982" }}>
              <span className="lg:text-xs lg:font-extrabold lg:uppercase lg:tracking-wider">Tento týden</span>
              <b className="text-xl lg:text-[26px] tabular-nums" style={{ color: "#0D1B3E" }}>{tyden.prikladu} {prikladu(tyden.prikladu)}</b>
              <div className="flex items-end gap-1 lg:gap-2 mt-1 lg:mt-3 lg:h-[88px]" aria-label={`Trénoval jsi ${tyden.dny.filter((d) => d.pocet > 0).length} ze 7 dní`}>
                {tyden.dny.map((d, i) => (
                  <span key={i} className="flex-1 flex flex-col items-center justify-end gap-1 lg:h-full">
                    <i
                      className="block w-4 h-4 lg:w-full rounded-[5px] lg:rounded-md"
                      style={{ background: d.pocet > 0 ? (d.dnes ? "#F5A623" : "#FDBA74") : "#EEF0F6", ["--v" as string]: `${Math.max(10, (d.pocet / maxDen) * 100)}%` }}
                      title={`${d.popis}: ${d.pocet} ${prikladu(d.pocet)}`}
                      data-vyska
                    />
                    <span className="hidden lg:block text-[11px] font-semibold" style={{ color: d.dnes ? "#0D1B3E" : "#8A93AA" }}>{d.popis}</span>
                  </span>
                ))}
              </div>
              {streak > 0 && <span className="text-xs font-bold lg:mt-2" style={{ color: "#C2410C" }}>🔥 {streak} {streak === 1 ? "den" : streak <= 4 ? "dny" : "dní"} v řadě</span>}
            </div>
          </div>

          {isPremium ? (
            <div className="mm-karta p-4 lg:p-5 flex flex-col gap-2.5">
              <b style={{ color: "#0D1B3E" }}>Pozvi rodiče</b>
              <span className="text-sm" style={{ color: "#5F6982" }}>Každé pondělí jim přijde přehled, jak ti to jde: odhad bodů, vývoj a témata.</span>
              <Link href="/profil#rodice" className="w-full py-3 rounded-2xl text-center font-bold mm-obrys" style={{ color: "#0D1B3E", border: "1.5px solid #E4E6EF" }}>
                Nastavit report pro rodiče
              </Link>
            </div>
          ) : (
            <div className="rounded-[20px] p-4 lg:p-5 flex flex-col gap-2.5 text-white" style={{ background: "linear-gradient(160deg, #1B2A5C, #0D1B3E)" }} data-testid="domov-premium">
              <span className="self-start text-[11px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "#F5A623", color: "#0D1B3E" }}>MateMax Premium</span>
              <h3 className="text-[19px] font-extrabold leading-tight">
                {g5 ? "Odemkni všech 8 okruhů a připrav se celý" : "Odemkni všech 9 témat a připrav se celý"}
              </h3>
              <ul className="flex flex-col gap-1.5 text-sm" style={{ color: "#E4E5FF" }}>
                {[
                  g5 ? "Všechny úlohy ve všech okruzích" : "Přes 1 200 úloh ve stylu CERMAT",
                  "Testové příklady jako u přijímaček v každém tématu",
                  "Rodiče dostanou každé pondělí report e-mailem",
                  "Všechny odznaky a výzvy",
                ].map((t) => (
                  <li key={t} className="grid grid-cols-[20px_1fr] gap-1.5"><span className="font-extrabold" style={{ color: "#F5A623" }}>✓</span>{t}</li>
                ))}
              </ul>
              <span className="text-[13px]" style={{ color: "#D9D8FE" }}>99 Kč měsíčně</span>
              <Link href="/premium" className="w-full py-3.5 rounded-2xl text-center text-base font-extrabold mm-tlacitko" style={{ background: "#F5A623", color: "#0D1B3E" }}>
                Co všechno získám
              </Link>
            </div>
          )}

          <PushSubscribeNudge streak={streak} userId={session.user.id} />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
