"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSbirka } from "@/lib/use-sbirka";
import { domovHexika, nasazena, etapaHexika, slotyHexika, SADA_EVENT, SADY } from "@/lib/sbirka";
import type { Domov3D } from "@/lib/hexik3d/domovy";
import type { Trida } from "@/types";

/**
 * Domov Hexíka: 3D místo za dokončenou sadu (pokojíček, Synthwave, Podmoří, Polární záře). Ukazuje se v profilu, na Domově
 * a v Sadách, jen když si ho žák nastavil (při dokončení sady se nastaví sám). 3D knihovna se načte až tady.
 * Bez WebGL se karta neukáže.
 */
/** Barva plochy, než se 3D scéna načte (podle domova). */
const PODKLAD: Record<string, string> = { "vanocni-pokojicek": "#2A0F17", synthwave: "#2A0A45", "podmorsky-svet": "#0F5E95", "polarni-zare": "#0B1E3F" };

export default function DomovHexika({ trida, odkaz = true }: { trida: Trida; odkaz?: boolean }) {
  const { stav, nacteno } = useSbirka();
  const domov = nacteno ? domovHexika(stav, trida) : null;
  const podoba = nasazena(stav, trida, "podoba").klic;
  const etapa = etapaHexika(stav.maxOdhad[trida]);
  const sloty = slotyHexika(stav, trida);
  const slotyKlic = JSON.stringify(sloty);
  const plocha = useRef<HTMLDivElement>(null);
  const inst = useRef<Domov3D | null>(null);
  const posledni = useRef({ podoba, etapa, sloty });
  // Poslední podoba pro spuštění scény (efekt níž ji čte až po vykreslení)
  useEffect(() => { posledni.current = { podoba, etapa, sloty }; });
  const [bez3D, setBez3D] = useState(false);
  const domovId = domov?.id ?? null;

  useEffect(() => {
    if (!domovId || !plocha.current) return;
    let zruseno = false;
    let canvas: HTMLCanvasElement | null = null;
    Promise.all([import("@/lib/hexik3d/domovy"), import("@/lib/hexik3d/scena")]).then(([{ vytvorDomov, jeHotovyDomov }, { umi3D }]) => {
      if (zruseno || !plocha.current) return;
      if (!umi3D() || !jeHotovyDomov(domovId)) { setBez3D(true); return; }
      canvas = document.createElement("canvas");
      canvas.className = "block w-full h-full";
      canvas.style.cursor = "grab";
      canvas.style.touchAction = "pan-y";
      plocha.current.appendChild(canvas);
      try {
        const p = posledni.current;
        inst.current = vytvorDomov(canvas, domovId, p.podoba, p.etapa, p.sloty);
      } catch {
        canvas.remove(); canvas = null; setBez3D(true);
      }
    }).catch(() => setBez3D(true));
    // Dokončená sada s tímhle domovem → Hexík se raduje
    const naSadu = (e: Event) => {
      const ids = (e as CustomEvent<{ ids: string[] }>).detail?.ids ?? [];
      if (SADY[trida].some((sd) => ids.includes(sd.id) && sd.domov.id === domovId)) inst.current?.oslava();
    };
    window.addEventListener(SADA_EVENT, naSadu);
    return () => {
      zruseno = true;
      window.removeEventListener(SADA_EVENT, naSadu);
      inst.current?.znic(); inst.current = null;
      canvas?.remove();
    };
  }, [domovId, trida]);

  useEffect(() => { inst.current?.nastav(podoba, etapa, sloty); }, [podoba, etapa, slotyKlic]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!domov || bez3D) return null;
  return (
    <section className="mm-karta overflow-hidden p-0" data-testid="domov-hexika" data-domov={domov.id}>
      <div ref={plocha} className="relative w-full" style={{ height: "clamp(220px, 42vw, 320px)", background: PODKLAD[domov.id] ?? "#1A2558" }} />
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-2xl" aria-hidden="true">{SADY[trida].find((sd) => sd.domov.id === domov.id)?.ikona ?? "🏠"}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black leading-tight" style={{ color: "#0D1B3E" }}>Hexík bydlí: {domov.nazev}</p>
          <p className="text-xs" style={{ color: "#5F6982" }}>{domov.id === "vanocni-pokojicek" ? "Táhni do stran, ťukni na Hexíka nebo na stromeček." : "Táhni do stran a ťukni na Hexíka."}</p>
        </div>
        {odkaz && <Link href="/sbirka?tab=sady" className="text-sm font-extrabold shrink-0" style={{ color: "#2E6DA4" }}>Sady</Link>}
      </div>
    </section>
  );
}
