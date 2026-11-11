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
import { dnesniTrenink, type DnesniTrenink } from "@/lib/dnesni-trenink";
import { nactiVyvoj, type Vyvoj } from "@/lib/odhad-bodu";
import type { Trida } from "@/types";

/** První jednotný termín přijímaček na víceletá gymnázia (ověřený fakt: 14.–15. 4. 2027). */
const TERMIN_5 = new Date(2027, 3, 14);

function dnyDo(cil: Date): number {
  const dnes = new Date();
  dnes.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((cil.getTime() - dnes.getTime()) / 86400000));
}

function emailNaJmeno(email: string): string {
  const cast = email.split("@")[0].split(/[._-]/)[0] ?? "";
  return cast ? cast[0].toUpperCase() + cast.slice(1) : "";
}

/** Příklady a dny s tréninkem za posledních 7 dní (z místní historie tréninků). */
function tentoTyden(): { prikladu: number; dny: boolean[] } {
  const dny = Array.from({ length: 7 }, (_, i) => localDateStr(localDateDaysAgo(6 - i)));
  const pocty = new Map(dny.map((d) => [d, 0]));
  for (const s of localLoadSessions()) if (pocty.has(s.date)) pocty.set(s.date, (pocty.get(s.date) ?? 0) + s.total);
  return { prikladu: [...pocty.values()].reduce((a, b) => a + b, 0), dny: dny.map((d) => (pocty.get(d) ?? 0) > 0) };
}

interface Props {
  session: Session;
  trida: Trida;
  xp: number;
  streak: number;
  diagDone: boolean;
}

/**
 * Domov přihlášeného žáka, stejná kostra pro 5. i 9. třídu:
 * pozdrav s odpočtem a úrovní, jedna hlavní akce (Dnešní trénink, nováček Krátká diagnostika),
 * týden a odhad bodů, Premium (účet zdarma) nebo pozvánka pro rodiče (Premium).
 * Témata jsou jen v Tréninku, celkový přehled v Profilu.
 */
export default function Domov({ session, trida, xp, streak, diagDone }: Props) {
  const { isPremium } = usePremium();
  const meta = (session.user.user_metadata ?? {}) as Record<string, string>;
  const jmeno = meta.first_name || (meta.full_name ?? meta.name ?? "").split(" ")[0] || emailNaJmeno(session.user.email ?? "");
  const dni = trida === 5 ? dnyDo(TERMIN_5) : getDaysUntilCermat();
  const uroven = getLevelFromXP(xp);
  const xpDalsi = uroven.xp_max === null ? null : uroven.xp_max + 1;
  const xpPodil = xpDalsi === null ? 100 : Math.round(((xp - uroven.xp_min) / (xpDalsi - uroven.xp_min)) * 100);

  const [diagHotova, setDiagHotova] = useState(diagDone);
  const [trenink, setTrenink] = useState<DnesniTrenink | null>(null);
  const [vyvoj, setVyvoj] = useState<Vyvoj | null>(null);
  const [tyden, setTyden] = useState<{ prikladu: number; dny: boolean[] }>({ prikladu: 0, dny: Array(7).fill(false) });
  const [vzkaz, setVzkaz] = useState<{ id: string; text: string } | null>(null);
  const [nacteno, setNacteno] = useState(false);

  // Data z prohlížeče (a po obnově ze serveru znovu: ProgressSync pošle matemax-progress-update)
  useEffect(() => {
    function nacti() {
      setDiagHotova((d) => d || localStorage.getItem("matemax-diag-done") === "1");
      setTrenink(dnesniTrenink(trida, isPremium));
      setVyvoj(nactiVyvoj(trida));
      setTyden(tentoTyden());
      setNacteno(true);
    }
    nacti();
    window.addEventListener("matemax-progress-update", nacti);
    return () => window.removeEventListener("matemax-progress-update", nacti);
  }, [trida, isPremium]);

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

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden" style={{ background: "#F6F7FB" }}>
      <HeaderClient />
      <main className="flex-1 w-full max-w-xl mx-auto px-4 pt-4 pb-28 flex flex-col gap-4" data-testid={trida === 5 ? "dashboard-5" : "domov"}>
        <HlavickaZnacky>
          <p className="text-sm" style={{ color: "#D9D8FE" }}>{jmeno ? `Ahoj, ${vokativ(jmeno)}!` : "Ahoj!"}</p>
          <h1 className="text-2xl font-extrabold leading-tight mt-0.5">Do přijímaček zbývá {dni} dní</h1>
          <div className="mt-3 flex flex-col gap-1.5">
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
          <div className="rounded-[22px] bg-white p-4 flex flex-col gap-3" style={{ border: "2px solid #5B55D6" }} data-testid="domov-diagnostika">
            <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#5B55D6" }}>Začni tady</span>
            <h2 className="text-[21px] font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>Krátká diagnostika</h2>
            <p className="text-sm" style={{ color: "#5F6982" }}>
              {trida === 5
                ? "Krátký test ze všech osmi okruhů, asi 15 minut. Podle něj ti ukážeme, čím začít."
                : "Pár příkladů z každého tématu. Zjistí, kde máš mezery, a podle toho ti appka vybere trénink."}
            </p>
            <Link href="/diagnostika" data-testid={trida === 5 ? "diagnostika-5-odkaz" : "diagnostika-odkaz"} className="w-full py-3.5 rounded-2xl text-center text-base font-extrabold press-scale" style={{ background: "#F5A623", color: "#0D1B3E" }}>
              Spustit diagnostiku
            </Link>
            <Link href="/trenink" className="text-center text-sm font-semibold" style={{ color: "#4741B8" }}>Raději hned trénovat</Link>
          </div>
        ) : trenink ? (
          <div className="rounded-[22px] bg-white p-4 flex flex-col gap-3" style={{ ...temaStyl(trenink.tema), border: "2px solid var(--tema-barva)" }} data-testid="dnesni-trenink">
            <span className="tema-text text-xs font-extrabold uppercase tracking-wider">Dnešní trénink</span>
            <div className="flex items-center gap-3">
              <HexIkona tema={trenink.tema} velikost={52} />
              <div className="min-w-0">
                <h2 className="text-[20px] font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>
                  {trenink.nazevTematu}{trenink.nazevDovednosti ? `: ${trenink.nazevDovednosti}` : ""}
                </h2>
                <p className="text-sm" style={{ color: "#5F6982" }}>7 příkladů · asi 8 minut</p>
              </div>
            </div>
            <p className="text-sm" style={{ color: "#5F6982" }}>{trenink.duvod}</p>
            <Link href={trenink.href} className="w-full py-3.5 rounded-2xl text-center text-base font-extrabold press-scale" style={{ background: "#F5A623", color: "#0D1B3E" }}>
              Pokračovat
            </Link>
            <Link href="/trenink" className="text-center text-sm font-semibold" style={{ color: "#4741B8" }}>Vybrat jiné téma</Link>
          </div>
        ) : null}

        {/* Týden a odhad bodů */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-white p-3 flex flex-col gap-1 text-[13px]" style={{ border: "1px solid #E4E6EF", color: "#5F6982" }}>
            Tento týden
            <b className="text-xl tabular-nums" style={{ color: "#0D1B3E" }}>{tyden.prikladu} {tyden.prikladu === 1 ? "příklad" : tyden.prikladu >= 2 && tyden.prikladu <= 4 ? "příklady" : "příkladů"}</b>
            <div className="flex gap-1 mt-1" aria-label={`Trénoval jsi ${tyden.dny.filter(Boolean).length} ze 7 dní`}>
              {tyden.dny.map((on, i) => (
                <i key={i} className="block w-4 h-4 rounded-[5px]" style={{ background: on ? "#FDBA74" : "#EEF0F6" }} />
              ))}
            </div>
            {streak > 0 && <span className="text-xs font-bold" style={{ color: "#C2410C" }}>🔥 {streak} {streak === 1 ? "den" : streak <= 4 ? "dny" : "dní"} v řadě</span>}
          </div>
          <Link href="/profil" className="rounded-2xl bg-white p-3 flex flex-col gap-1 text-[13px] press-scale" style={{ border: "1px solid #E4E6EF", color: "#5F6982" }} data-testid="domov-odhad">
            Odhad u přijímaček
            {odhad && !odhad.bezDat ? (
              <>
                <b className="text-xl tabular-nums" style={{ color: "#0D1B3E" }}>{odhad.celkem} / {odhad.max} b.</b>
                {vyvoj?.zmena14 != null && vyvoj.zmena14 !== 0 ? (
                  <span className="font-bold" style={{ color: vyvoj.zmena14 > 0 ? "#14753A" : "#8A93AA" }}>
                    {vyvoj.zmena14 > 0 ? `↑ +${vyvoj.zmena14}` : `↓ ${vyvoj.zmena14}`} b. za 2 týdny
                  </span>
                ) : (
                  <span>Celý přehled v profilu ›</span>
                )}
              </>
            ) : (
              <>
                <b className="text-xl" style={{ color: "#0D1B3E" }}>?</b>
                <span>Ukáže se po prvním tréninku</span>
              </>
            )}
          </Link>
        </div>

        {isPremium ? (
          <div className="rounded-[18px] bg-white p-4 flex flex-col gap-2.5" style={{ border: "1px solid #E4E6EF" }}>
            <b style={{ color: "#0D1B3E" }}>Pozvi rodiče</b>
            <span className="text-sm" style={{ color: "#5F6982" }}>Každé pondělí jim přijde přehled, jak ti to jde: odhad bodů, vývoj a témata.</span>
            <Link href="/profil#rodice" className="w-full py-3 rounded-2xl text-center font-bold press-scale" style={{ color: "#0D1B3E", border: "1.5px solid #E4E6EF" }}>
              Nastavit report pro rodiče
            </Link>
          </div>
        ) : (
          <div className="rounded-[20px] p-4 flex flex-col gap-2.5 text-white" style={{ background: "linear-gradient(160deg, #1B2A5C, #0D1B3E)" }} data-testid="domov-premium">
            <span className="self-start text-[11px] font-extrabold px-2 py-0.5 rounded-full" style={{ background: "#F5A623", color: "#0D1B3E" }}>MateMax Premium</span>
            <h3 className="text-[19px] font-extrabold leading-tight">
              {trida === 5 ? "Odemkni všech 8 okruhů a připrav se celý" : "Odemkni všech 9 témat a připrav se celý"}
            </h3>
            <ul className="flex flex-col gap-1.5 text-sm" style={{ color: "#E4E5FF" }}>
              {[
                trida === 5 ? "Všechny úlohy ve všech okruzích" : "Přes 1 200 úloh ve stylu CERMAT",
                "Testové příklady jako u přijímaček v každém tématu",
                "Rodiče dostanou každé pondělí report e-mailem",
                "Všechny odznaky a výzvy",
              ].map((t) => (
                <li key={t} className="grid grid-cols-[20px_1fr] gap-1.5"><span className="font-extrabold" style={{ color: "#F5A623" }}>✓</span>{t}</li>
              ))}
            </ul>
            <span className="text-[13px]" style={{ color: "#D9D8FE" }}>99 Kč měsíčně</span>
            <Link href="/premium" className="w-full py-3.5 rounded-2xl text-center text-base font-extrabold press-scale" style={{ background: "#F5A623", color: "#0D1B3E" }}>
              Co všechno získám
            </Link>
          </div>
        )}

        <PushSubscribeNudge streak={streak} userId={session.user.id} />
      </main>
      <BottomNav />
    </div>
  );
}
