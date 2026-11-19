"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Hexik from "./Hexik";
import { useSbirka } from "@/lib/use-sbirka";
import { nasazena, slotyHexika, etapaHexika } from "@/lib/sbirka";
import { radaHexika } from "@/lib/hexik-radi";
import { reaguj } from "@/lib/hexik-efekty";
import { loadProgress } from "@/lib/progress";
import { naladaHexika, type NaladaHexika } from "@/lib/nalada-hexika";
import { localDateStr } from "@/lib/date";
import { bossTydne } from "@/lib/boss";
import type { DnesniTrenink } from "@/lib/dnesni-trenink";
import type { Trida } from "@/types";

/** Hexík radí na Domově: jedna věc, která se teď nejvíc vyplatí, s tlačítkem rovnou na ni. */
export default function HexikRadi({ trida, trenink }: { trida: Trida; trenink: DnesniTrenink | null }) {
  const { stav, nacteno } = useSbirka();
  const hx = useRef<HTMLSpanElement>(null);
  const [xp] = useState(() => (typeof window === "undefined" ? 0 : loadProgress().xp ?? 0));
  // Ospalý po pauze, stýská se mu večer, když hrozí přerušení série (jen 3D obličej, text rady zůstává)
  const [nalada] = useState<NaladaHexika>(() => (typeof window === "undefined" ? "neutral" : naladaHexika(loadProgress(), new Date())));
  const den = localDateStr();
  const rada = nacteno ? radaHexika({ stav, trida, xp, den, trenink, bossExistuje: !!bossTydne(trida, den) }) : null;

  // Hexík radu doprovodí pohybem (až se 3D načte)
  useEffect(() => {
    if (!rada) return;
    const t = window.setTimeout(() => reaguj(hx.current, rada.reakce), 1200);
    return () => window.clearTimeout(t);
  }, [rada?.druh]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!rada) return null;
  return (
    <section className="mm-karta p-4 lg:p-5 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#EEEDFE,#F7F7FF)", borderColor: "#DCD9FB" }} data-testid="hexik-radi" data-druh={rada.druh}>
      <Hexik ref={hx} podoba={nasazena(stav, trida, "podoba").klic} etapa={etapaHexika(stav.maxOdhad[trida])} doplnky={slotyHexika(stav, trida)} d3 nalada={nalada} mazlit className="w-20 lg:w-24 shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <p className="relative rounded-2xl rounded-tl-md bg-white px-3.5 py-2.5 text-sm font-semibold leading-snug shadow-sm" style={{ color: "#0D1B3E", border: "1px solid #E4E6EF" }} data-testid="hexik-radi-text">
          {rada.text}
        </p>
        <Link href={rada.href} className="mm-tlacitko self-start rounded-2xl px-4 py-2 text-sm font-extrabold" style={{ background: "#F5A623", color: "#0D1B3E" }} data-testid="hexik-radi-akce">
          {rada.tlacitko}
        </Link>
      </div>
    </section>
  );
}
