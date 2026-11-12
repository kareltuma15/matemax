"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HexIkona } from "@/components/HexIkona";
import { temaStyl } from "@/lib/barvy-temat";
import { isTopicLocked } from "@/lib/subscription";
import { dovednostiTematu } from "@/lib/dovednosti";
import { computeDovednostProgress } from "@/lib/levels";
import { localLoadCards } from "@/lib/storage";
import { loadGamification } from "@/lib/gamification";
import { dnesniTrenink } from "@/lib/dnesni-trenink";
import { examplesFor } from "@/data/examples";
import { TEMATA_ORDER, TEMATA_ORDER_5, TEMA_LABELS, type Trida } from "@/types";

interface Props {
  trida: Trida;
  isPremium: boolean;
  onOpenTopic: (tema: string) => void;
  onStartMistakes: () => void;
  onStartMix: () => void;
}

interface Radek {
  tema: string;
  dovednosti: number;
  uloh: number;
  podil: number;
}

/**
 * Trénink = všechna témata na jednom místě, stejná kostra pro obě třídy (5. třída barevné řádky).
 * Nahoře malé zkratky (chyby, mix, u 9. třídy rychlý mód a výzva), pod tím dostupná témata s postupem,
 * zamčená témata jako jeden menší blok „V Premium“ s tím, co v nich je, a jedním tlačítkem.
 */
export default function TreninkTemata({ trida, isPremium, onOpenTopic, onStartMistakes, onStartMix }: Props) {
  const [radky, setRadky] = useState<Radek[]>([]);
  const [chyby, setChyby] = useState(0);
  const [doporuceno, setDoporuceno] = useState<{ tema: string; novacek: boolean } | null>(null);

  useEffect(() => {
    const poradi = (trida === 5 ? TEMATA_ORDER_5 : TEMATA_ORDER) as readonly string[];
    const priklady = examplesFor(trida);
    setRadky(poradi.map((tema) => {
      const postup = Object.values(computeDovednostProgress(tema));
      const hotovo = postup.reduce((a, p) => a + p.done, 0);
      const celkem = postup.reduce((a, p) => a + p.total, 0);
      return {
        tema,
        dovednosti: dovednostiTematu(tema).length,
        uloh: priklady.filter((e) => e.tema === tema).length,
        podil: celkem ? hotovo / celkem : 0,
      };
    }));
    setChyby(localLoadCards().filter((c) => c.repetitions > 0 && c.lastQuality <= 2).length);
    const dnes = dnesniTrenink(trida, isPremium);
    let diag = false;
    try { diag = localStorage.getItem("matemax-diag-done") === "1"; } catch { /* nic */ }
    const stats = loadGamification().topicStats;
    const trenoval = poradi.some((t) => (stats[t]?.total ?? 0) > 0);
    if (dnes) setDoporuceno({ tema: dnes.tema, novacek: !diag && !trenoval });
  }, [trida, isPremium]);

  const volna = radky.filter((r) => !isTopicLocked(r.tema, isPremium));
  const zamcena = radky.filter((r) => isTopicLocked(r.tema, isPremium));
  const g5 = trida === 5;
  const ulohVPremium = zamcena.reduce((a, r) => a + r.uloh, 0);

  const zkratky: { ikona: string; nazev: string; popis: string; barva: string; tint: string; onClick?: () => void; href?: string }[] = [
    ...(chyby > 0 ? [{ ikona: "🔄", nazev: "Opakovat chyby", popis: `${chyby} ${chyby === 1 ? "úloha" : chyby <= 4 ? "úlohy" : "úloh"} k opravě`, barva: "#B4232F", tint: "#FDECEC", onClick: onStartMistakes }] : []),
    { ikona: "🎲", nazev: g5 ? "Mix ze všech okruhů" : "Mix ze všech témat", popis: "Příklady napříč", barva: "#5B55D6", tint: "#EBEAFE", onClick: onStartMix },
    ...(!g5 ? [
      { ikona: "⚡", nazev: "Rychlý mód", popis: "Na čas, bez nápověd", barva: "#A66300", tint: "#FDF0DA", href: "/rychly-mod" },
      { ikona: "🏆", nazev: "Denní výzva", popis: "Jednou denně, body navíc", barva: "#0F7F76", tint: "#DDF3F0", href: "/vyzva" },
    ] : []),
  ];

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto w-full mm-siroke" data-testid="trenink-temata">
      <div>
        <h1 className="text-[26px] lg:text-[32px] font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>Trénink</h1>
        <p className="text-sm lg:text-base mt-1" style={{ color: "#5F6982" }}>
          Vyber {g5 ? "okruh" : "téma"}. Příklady ti appka vybere podle toho, co ti jde a co ještě ne.
        </p>
      </div>

      {/* Zkratky: na telefonu posuvný pás, na počítači řada dlaždic */}
      <div className={`flex lg:grid ${["", "lg:grid-cols-1", "lg:grid-cols-2", "lg:grid-cols-3", "lg:grid-cols-4"][zkratky.length]} gap-2.5 overflow-x-auto lg:overflow-visible pb-1 -mx-4 px-4 lg:mx-0 lg:px-0`}>
        {zkratky.map((z) => {
          const obsah = (
            <>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: z.tint }} aria-hidden>{z.ikona}</span>
              <span className="min-w-0 text-left">
                <span className="block text-[14px] font-bold leading-tight" style={{ color: "#0D1B3E" }}>{z.nazev}</span>
                <span className="block text-xs" style={{ color: z.barva }}>{z.popis}</span>
              </span>
            </>
          );
          const trida_ = "mm-karta mm-klik shrink-0 min-w-[190px] lg:min-w-0 flex items-center gap-3 p-3";
          const styl = { ["--tema-barva" as string]: z.barva };
          return z.href ? (
            <Link key={z.nazev} href={z.href} className={trida_} style={styl}>{obsah}</Link>
          ) : (
            <button key={z.nazev} type="button" onClick={z.onClick} className={trida_} style={styl}>{obsah}</button>
          );
        })}
      </div>

      <span className="text-xs font-extrabold uppercase tracking-wider mt-1" style={{ color: "#5F6982" }}>
        {zamcena.length ? (g5 ? "Tvoje okruhy" : "Tvoje témata") : (g5 ? "Všechny okruhy" : "Všechna témata")}
      </span>
      <div className="grid gap-3 lg:grid-cols-2">
        {volna.map((r) => {
          const pct = Math.round(r.podil * 100);
          return (
            <button
              key={r.tema}
              type="button"
              data-tema={r.tema}
              onClick={() => onOpenTopic(r.tema)}
              className={`mm-klik grid grid-cols-[52px_minmax(0,1fr)_auto] gap-3 items-center p-3.5 text-left rounded-[20px] ${g5 ? "tema-tint" : "mm-karta"}`}
              style={{ ...temaStyl(r.tema), ...(g5 ? { border: "1.5px solid transparent" } : {}) }}
            >
              <span className={`w-[52px] h-[52px] rounded-2xl flex items-center justify-center ${g5 ? "bg-white" : "tema-tint"}`}>
                <HexIkona tema={r.tema} velikost={40} vypln={g5 ? undefined : "#fff"} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 flex-wrap">
                  <span className="text-[16px] font-bold" style={{ color: "#0D1B3E" }}>{TEMA_LABELS[r.tema] ?? r.tema}</span>
                  {doporuceno?.tema === r.tema && (
                    <span data-testid="doporuceny-okruh" className="text-[11px] font-extrabold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--tema-barva)" }}>
                      {doporuceno.novacek ? "Začni tady" : "Dnes"}
                    </span>
                  )}
                </span>
                <span className="block text-[12.5px]" style={{ color: "#5F6982" }}>
                  {r.dovednosti ? `${r.dovednosti} ${r.dovednosti >= 5 ? "dovedností" : "dovednosti"} · testové příklady` : `${r.uloh} úloh`}
                </span>
                <span className="flex items-center gap-2 mt-2">
                  <span
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ background: g5 ? "rgba(255,255,255,.8)" : "var(--tema-tint)" }}
                    role="img"
                    aria-label={`Zvládnuto ${pct} %`}
                  >
                    <i className="block h-full rounded-full" style={{ width: `${Math.max(3, pct)}%`, background: "var(--tema-barva)" }} />
                  </span>
                  <span className="text-xs font-bold tabular-nums tema-text w-9 text-right">{pct} %</span>
                </span>
              </span>
              <span className="mm-sipka text-2xl leading-none" style={{ color: "#A0A8BD" }} aria-hidden>›</span>
            </button>
          );
        })}
      </div>

      {zamcena.length > 0 && (
        <section className="rounded-[22px] p-4 lg:p-5 flex flex-col gap-3 mt-1" style={{ background: "linear-gradient(160deg, #FFF8E8, #FFF1D2)", border: "1px solid #F3D9A0" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1" style={{ color: "#8A5A00" }}><span aria-hidden>🔒</span><span>V Premium</span></span>
              <p className="text-sm font-semibold mt-0.5" style={{ color: "#4A3500" }}>
                {zamcena.length} {g5 ? (zamcena.length >= 5 ? "dalších okruhů" : "další okruhy") : (zamcena.length >= 5 ? "dalších témat" : "další témata")} · {ulohVPremium} úloh
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
            {zamcena.map((r) => (
              <Link
                key={r.tema}
                href="/premium"
                data-tema={r.tema}
                className="mm-klik rounded-[16px] p-3 flex gap-2.5 items-center text-[13.5px] font-bold bg-white"
                style={{ ...temaStyl(r.tema), border: "1px solid #F0E0BC", color: "#0D1B3E" }}
              >
                <HexIkona tema={r.tema} velikost={34} />
                <span className="min-w-0">
                  {TEMA_LABELS[r.tema] ?? r.tema}
                  <small className="block font-medium text-[11.5px]" style={{ color: "#5F6982" }}>{r.uloh} úloh</small>
                </span>
              </Link>
            ))}
          </div>
          <Link href="/premium" className="w-full lg:w-auto lg:self-start lg:px-8 py-3.5 rounded-2xl text-center text-base font-extrabold text-white mm-tlacitko" style={{ background: "#0D1B3E" }} data-testid="odemknout-premium">
            Odemknout {g5 ? `všech ${radky.length} okruhů` : `všech ${radky.length} témat`} · 99 Kč/měs.
          </Link>
        </section>
      )}
    </div>
  );
}
