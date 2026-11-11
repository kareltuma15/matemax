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
  const zkratka = "shrink-0 text-[13px] font-bold rounded-full px-3 py-2 bg-white press-scale";

  return (
    <div className="flex flex-col gap-3.5 max-w-xl mx-auto w-full" data-testid="trenink-temata">
      <h1 className="text-[26px] font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>Trénink</h1>

      <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1">
        {chyby > 0 && (
          <button type="button" onClick={onStartMistakes} className={zkratka} style={{ border: "1px solid #E4E6EF", color: "#0D1B3E" }}>
            🔄 Opakovat chyby ({chyby})
          </button>
        )}
        <button type="button" onClick={onStartMix} className={zkratka} style={{ border: "1px solid #E4E6EF", color: "#0D1B3E" }}>
          🎲 Mix ze všech témat
        </button>
        {!g5 && (
          <>
            <Link href="/rychly-mod" className={zkratka} style={{ border: "1px solid #E4E6EF", color: "#0D1B3E" }}>⚡ Rychlý mód</Link>
            <Link href="/vyzva" className={zkratka} style={{ border: "1px solid #E4E6EF", color: "#0D1B3E" }}>🏆 Denní výzva</Link>
          </>
        )}
      </div>

      <span className="text-xs font-extrabold uppercase tracking-wider mt-1" style={{ color: "#8A93AA" }}>
        {zamcena.length ? "Tvoje témata" : "Všechna témata"}
      </span>
      {volna.map((r) => (
        <button
          key={r.tema}
          type="button"
          data-tema={r.tema}
          onClick={() => onOpenTopic(r.tema)}
          className={`grid grid-cols-[44px_minmax(0,1fr)_auto] gap-3 items-center rounded-[18px] p-3 text-left press-scale ${g5 ? "tema-tint" : "bg-white"}`}
          style={{ ...temaStyl(r.tema), border: g5 ? "1px solid transparent" : "1px solid #E4E6EF" }}
        >
          <HexIkona tema={r.tema} velikost={44} vypln={g5 ? "#fff" : undefined} />
          <span className="min-w-0">
            <span className="flex items-center gap-2 flex-wrap">
              <span className="text-[15.5px] font-bold" style={{ color: "#0D1B3E" }}>{TEMA_LABELS[r.tema] ?? r.tema}</span>
              {doporuceno?.tema === r.tema && (
                <span data-testid="doporuceny-okruh" className="text-[11px] font-extrabold px-2 py-0.5 rounded-full text-white" style={{ background: "var(--tema-barva)" }}>
                  {doporuceno.novacek ? "Začni tady" : "Dnes"}
                </span>
              )}
            </span>
            <span className="block text-[12.5px]" style={{ color: "#5F6982" }}>
              {r.dovednosti ? `${r.dovednosti} ${r.dovednosti >= 5 ? "dovedností" : "dovednosti"} · testové příklady` : `${r.uloh} úloh`}
            </span>
            <span
              className="block h-1.5 rounded-full overflow-hidden mt-1.5"
              style={{ background: g5 ? "rgba(255,255,255,.75)" : "var(--tema-tint)" }}
              role="img"
              aria-label={`Zvládnuto ${Math.round(r.podil * 100)} %`}
            >
              <i className="block h-full rounded-full" style={{ width: `${Math.max(3, Math.round(r.podil * 100))}%`, background: "var(--tema-barva)" }} />
            </span>
          </span>
          <span className="text-xl" style={{ color: "#A0A8BD" }} aria-hidden>›</span>
        </button>
      ))}

      {zamcena.length > 0 && (
        <>
          <span className="text-xs font-extrabold uppercase tracking-wider mt-1" style={{ color: "#8A93AA" }}>V Premium</span>
          <div className="grid grid-cols-2 gap-2">
            {zamcena.map((r) => (
              <div
                key={r.tema}
                data-tema={r.tema}
                className="rounded-[14px] p-2.5 flex gap-2 items-center text-[13px] font-bold"
                style={{ ...temaStyl(r.tema), border: "1px dashed #C9CDDC", background: "#FBFBFD", color: "#0D1B3E" }}
              >
                <HexIkona tema={r.tema} velikost={30} />
                <span className="min-w-0">
                  {TEMA_LABELS[r.tema] ?? r.tema}
                  <small className="block font-medium text-[11.5px]" style={{ color: "#5F6982" }}>
                    {r.uloh} úloh
                  </small>
                </span>
              </div>
            ))}
          </div>
          <Link href="/premium" className="w-full py-3.5 rounded-2xl text-center text-base font-extrabold text-white press-scale" style={{ background: "#0D1B3E" }} data-testid="odemknout-premium">
            Odemknout {g5 ? `všech ${radky.length} okruhů` : `všech ${radky.length} témat`} · 99 Kč/měs.
          </Link>
        </>
      )}
    </div>
  );
}
