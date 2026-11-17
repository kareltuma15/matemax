"use client";

import { useEffect, useRef, useState } from "react";
import Hexik from "./Hexik";
import { useSbirka } from "@/lib/use-sbirka";
import { nasazena, krystaly, etapaHexika, ANIMACE_OSLAVY } from "@/lib/sbirka";
import { spustEfekt, reaguj } from "@/lib/hexik-efekty";
import { ODPOVED_EVENT } from "@/lib/sound";
import { KRYSTALY_EVENT } from "@/lib/sbirka-trenink";
import type { Trida } from "@/types";

const TEXTY: Record<Trida, { ok: string[]; serie: string[]; chyba: string[] }> = {
  5: {
    ok: ["Jupí!", "Paráda!", "Správně!", "To je ono!", "Super!"],
    serie: ["Tři v řadě, hurá!", "Jsi hvězda!", "Série jede!"],
    chyba: ["Nevadí, zkusíme to spolu.", "Skoro! Mrkni na postup.", "Z chyby se učíme."],
  },
  9: {
    ok: ["Pecka!", "Jo!", "Přesně tak.", "Čistá práce.", "Sedí."],
    serie: ["Tři v řadě, jedeš!", "Série!", "Tohle už máš v ruce."],
    chyba: ["Klídek, mrkni na postup.", "To dáme. Koukni, kde to ujelo.", "V pohodě, příště to sedne."],
  },
};
const nahodne = (a: string[]) => a[Math.floor(Math.random() * a.length)];

/**
 * Hexík u příkladu: na telefonu v řádku nad úlohou, na počítači vpravo dole.
 * Reaguje na vyhodnocení odpovědi (událost ze zvuku správně/špatně), oslavuje každou třetí
 * správnou v řadě nasazenou oslavou a ukazuje připsané krystaly.
 */
export default function HexikParta({ trida }: { trida: Trida }) {
  const { stav, nacteno } = useSbirka();
  const hxRef = useRef<HTMLSpanElement>(null);
  const serieRef = useRef(0);
  const [bublina, setBublina] = useState<string | null>(null);
  const [plus, setPlus] = useState<{ n: number; klic: number } | null>(null);
  const bublinaCas = useRef<ReturnType<typeof setTimeout> | null>(null);

  const podoba = nasazena(stav, trida, "podoba").klic;
  const oslava = nasazena(stav, trida, "oslava").klic;
  const efekt = nasazena(stav, trida, "efekt").klic;
  const etapa = etapaHexika(stav.maxOdhad[trida]);

  // Aktuální nasazení pro posluchače (bez přeregistrování při každé změně)
  const nas = useRef({ oslava, efekt, trida });
  useEffect(() => { nas.current = { oslava, efekt, trida }; }, [oslava, efekt, trida]);

  useEffect(() => {
    const rekni = (t: string) => {
      setBublina(t);
      if (bublinaCas.current) clearTimeout(bublinaCas.current);
      bublinaCas.current = setTimeout(() => setBublina(null), 2000);
    };
    const naOdpoved = (e: Event) => {
      const spravne = (e as CustomEvent<{ spravne: boolean }>).detail?.spravne;
      const { oslava: o, efekt: ef, trida: t } = nas.current;
      if (spravne) {
        serieRef.current += 1;
        if (serieRef.current % 3 === 0) {
          reaguj(hxRef.current, ANIMACE_OSLAVY[o] ?? "radost");
          spustEfekt(ef, hxRef.current, 1.7);
          rekni(nahodne(TEXTY[t].serie));
        } else {
          reaguj(hxRef.current, "jasot");
          spustEfekt(ef, hxRef.current, 1);
          rekni(nahodne(TEXTY[t].ok));
        }
      } else {
        serieRef.current = 0;
        reaguj(hxRef.current, "povzbud");
        rekni(nahodne(TEXTY[t].chyba));
      }
    };
    const naKrystaly = (e: Event) => {
      const n = (e as CustomEvent<{ n: number }>).detail?.n ?? 0;
      if (n > 0) setPlus({ n, klic: Date.now() });
    };
    window.addEventListener(ODPOVED_EVENT, naOdpoved);
    window.addEventListener(KRYSTALY_EVENT, naKrystaly);
    return () => {
      window.removeEventListener(ODPOVED_EVENT, naOdpoved);
      window.removeEventListener(KRYSTALY_EVENT, naKrystaly);
      if (bublinaCas.current) clearTimeout(bublinaCas.current);
    };
  }, []);

  if (!nacteno) return <div className="h-14 mb-2 lg:hidden" aria-hidden="true" />;

  return (
    <div
      className="relative flex items-center gap-2 mb-2 h-14 lg:fixed lg:z-30 lg:top-28 lg:left-[calc(50%+22rem)] lg:mb-0 lg:h-auto lg:flex-col-reverse lg:items-start lg:gap-1.5"
      data-testid="hexik-parta"
    >
      <Hexik ref={hxRef} podoba={podoba} etapa={etapa} className="w-12 shrink-0 lg:w-32" />
      <div className="flex-1 min-w-0 lg:flex-none lg:max-w-[220px]">
        <p
          className={`hx-bublina inline-block max-w-full rounded-2xl rounded-bl-md lg:rounded-bl-2xl lg:rounded-br-md px-3 py-1.5 text-sm font-bold shadow-sm border ${bublina ? "hx-vid" : ""}`}
          style={{ background: "var(--surface-0, #fff)", borderColor: "var(--border-color, #E4E6EF)", color: "var(--text-primary, #0D1B3E)" }}
          aria-live="polite"
          data-testid="hexik-bublina"
        >
          {bublina ?? " "}
        </p>
      </div>
      <div className="relative shrink-0 lg:self-start">
        <span
          className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-sm font-black tabular-nums"
          style={{ background: "#E8F4FF", color: "#1E5FA8" }}
          title="Krystaly"
          data-testid="hexik-krystaly"
        >
          <i className="hx-krystal" aria-hidden="true" />
          {krystaly(stav)}
        </span>
        {plus && (
          <span key={plus.klic} className="hx-plus hx-jede absolute right-1 -top-5 text-sm font-black" style={{ color: "#1E8FE0" }}>
            +{plus.n}
          </span>
        )}
      </div>
    </div>
  );
}
