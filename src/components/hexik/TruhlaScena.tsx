"use client";

import { useEffect, useRef, useState } from "react";
import type { Truhla3D, DruhTruhly, VzacnostTruhly } from "@/lib/hexik3d/truhla";
import type { SlotyHexika } from "@/lib/hexik3d/scena";

interface Props {
  druh: DruhTruhly;
  vz: VzacnostTruhly;
  podoba: string;
  etapa: number;
  sloty?: SlotyHexika;
  onOtevreno: () => void;
}

/**
 * 3D truhla s Hexíkem: dítě třikrát klepne a Hexík truhlu otevře (jinak se otevře sama).
 * Bez WebGL se ukáže dosavadní CSS truhla a otevře se po chvilce.
 */
export default function TruhlaScena({ druh, vz, podoba, etapa, sloty, onOtevreno }: Props) {
  const obal = useRef<HTMLDivElement>(null);
  const inst = useRef<Truhla3D | null>(null);
  const hotovo = useRef(onOtevreno);
  useEffect(() => { hotovo.current = onOtevreno; }, [onOtevreno]);
  const [je3d, setJe3d] = useState<boolean | null>(null);
  const [klepnuti, setKlepnuti] = useState(0);
  const [otevreno, setOtevreno] = useState(false);

  useEffect(() => {
    let zruseno = false, canvas: HTMLCanvasElement | null = null, zaloha = 0;
    const otevri = () => { if (!zruseno) { setOtevreno(true); hotovo.current(); } };
    Promise.all([import("@/lib/hexik3d/truhla"), import("@/lib/hexik3d/scena")]).then(([t, s]) => {
      if (zruseno || !obal.current) return;
      if (!s.umi3D()) { setJe3d(false); zaloha = window.setTimeout(otevri, 700); return; }
      canvas = document.createElement("canvas");
      canvas.className = "absolute inset-0 w-full h-full cursor-pointer";
      canvas.setAttribute("data-testid", "truhla-3d");
      obal.current.appendChild(canvas);
      try {
        inst.current = t.vytvorTruhlu3D(canvas, { druh, vz, podoba, etapa, sloty, onOtevreno: otevri, onKlepnuti: setKlepnuti });
        setJe3d(true);
      } catch { canvas.remove(); canvas = null; setJe3d(false); zaloha = window.setTimeout(otevri, 700); }
    }).catch(() => { setJe3d(false); zaloha = window.setTimeout(otevri, 700); });
    return () => { zruseno = true; window.clearTimeout(zaloha); inst.current?.znic(); inst.current = null; canvas?.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full flex flex-col items-center gap-1">
      <div ref={obal} className="relative w-full h-56 sm:h-64" role="button" aria-label="Klepni na truhlu a otevři ji" tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inst.current?.klepni(); } }}>
        {je3d === false && (
          <span className={`hx-truhla absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${otevreno ? "hx-otevrena" : "hx-tres"}`} data-druh={druh}><span className="hx-vika" /><span className="hx-telo" /><span className="hx-zamek" /></span>
        )}
      </div>
      {je3d && !otevreno && (
        <div className="flex flex-col items-center gap-1.5" aria-live="polite">
          <p className="text-sm font-extrabold" style={{ color: "#FFE08A" }}>{klepnuti === 0 ? "Klepni na truhlu!" : klepnuti === 1 ? "Ještě! Něco tam svítí…" : "Poslední klepnutí!"}</p>
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => <i key={i} className="block w-2.5 h-2.5 rounded-full" style={{ background: i < klepnuti ? "#FFE08A" : "rgba(255,255,255,.25)" }} />)}
          </div>
          <button type="button" onClick={() => inst.current?.otevri()} className="text-xs underline" style={{ color: "#C9C7F5" }} data-testid="truhla-otevrit-hned">Otevřít hned</button>
        </div>
      )}
    </div>
  );
}
