"use client";

import { useEffect } from "react";
import Link from "next/link";
import Hexik from "./Hexik";
import OdmenaVizual from "./OdmenaVizual";
import { playLevelUp } from "@/lib/sound";
import { getLevelFromXP } from "@/lib/gamification";
import { prahUrovne, type OdmenaUrovne } from "@/lib/urovne";
import { useSbirka } from "@/lib/use-sbirka";
import { nasazena, etapaHexika, slotyHexika, type Odmena } from "@/lib/sbirka";
import type { Trida } from "@/types";

/**
 * Oslava nové XP úrovně na konci tréninku (během příkladů nic nevyskakuje, ať trénink nic neruší).
 * Ukáže všechny úrovně, které žák v tréninku získal, a co za ně dostal.
 */
export default function UrovenModal({ urovne, trida, onClose }: { urovne: OdmenaUrovne[]; trida: Trida; onClose: () => void }) {
  const { stav } = useSbirka();
  const posledni = urovne[urovne.length - 1];
  const hodnost = getLevelFromXP(prahUrovne(posledni.n));
  const novaHodnost = urovne.some((u) => getLevelFromXP(prahUrovne(u.n)).key !== getLevelFromXP(prahUrovne(u.n - 1)).key);
  const krystalu = urovne.reduce((a, u) => a + u.krystaly, 0);
  const veci = urovne.map((u) => u.vec).filter((v): v is Odmena => !!v);
  const truhel = urovne.filter((u) => u.legendarni).length;

  useEffect(() => {
    playLevelUp();
    import("canvas-confetti").then(({ default: c }) => {
      c({ particleCount: 120, spread: 80, origin: { y: 0.4 }, colors: ["#F5A623", "#AFACFB", "#5B55D6", "#FFFFFF"] });
    }).catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" style={{ background: "rgba(13,27,62,.7)" }} onClick={onClose} data-testid="uroven-modal">
      <div className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl modal-spring" style={{ background: "#fff" }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="uroven-nadpis">
        <div className="px-6 pt-6 pb-5 text-center text-white flex flex-col items-center gap-1" style={{ background: "radial-gradient(circle at 50% 20%, #5B55D6, #1F2F66 70%)" }}>
          <Hexik podoba={nasazena(stav, trida, "podoba").klic} etapa={etapaHexika(stav.maxOdhad[trida])} d3 doplnky={slotyHexika(stav, trida)} className="w-24" />
          <p className="text-xs font-extrabold uppercase tracking-widest mt-1" style={{ color: "#C9C7F5" }}>{novaHodnost ? `Nová hodnost: ${hodnost.label}` : hodnost.label}</p>
          <h2 id="uroven-nadpis" className="text-3xl font-black">Úroveň {posledni.n}!</h2>
          {urovne.length > 1 && <p className="text-sm" style={{ color: "#D9D8FE" }}>Skok o {urovne.length} {urovne.length <= 4 ? "úrovně" : "úrovní"} v jednom tréninku!</p>}
        </div>
        <div className="p-5 flex flex-col gap-3">
          <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "#5F6982" }}>Za učení dostáváš</p>
          <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "#F3F4FB" }}>
            <i className="hx-krystal text-2xl" aria-hidden="true" />
            <b style={{ color: "#0D1B3E" }} data-testid="uroven-krystaly">+{krystalu} krystalů</b>
          </div>
          {veci.map((o) => (
            <div key={o.id} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "#FFF6E5", border: "1.5px solid #F3D9A0" }} data-testid="uroven-vec">
              <span className="w-14 flex justify-center shrink-0"><OdmenaVizual o={o} velikost={40} /></span>
              <span className="min-w-0">
                <b className="block" style={{ color: "#0D1B3E" }}>{o.nazev}</b>
                <span className="text-xs" style={{ color: "#7A5A12" }}>Jen za úroveň {o.uroven}, nejde koupit ani vylosovat</span>
              </span>
            </div>
          ))}
          {truhel > 0 && (
            <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "#FFF1D6" }}>
              <span className="text-2xl" aria-hidden="true">🎁</span>
              <b style={{ color: "#0D1B3E" }}>{truhel === 1 ? "Legendární truhla" : `${truhel} legendární truhly`} čeká ve Sbírce</b>
            </div>
          )}
          <div className="flex gap-2 mt-1">
            <Link href={veci.length ? "/sbirka?tab=satnik" : "/sbirka?tab=urovne"} className="flex-1 rounded-2xl py-3 text-center font-extrabold mm-tlacitko" style={{ background: "#F5A623", color: "#0D1B3E" }} data-testid="uroven-sbirka">
              {veci.length ? "Vyzkoušet" : "Cesta úrovní"}
            </Link>
            <button type="button" onClick={onClose} className="flex-1 rounded-2xl py-3 font-extrabold text-white mm-tlacitko" style={{ background: "#0D1B3E" }} data-testid="uroven-zavrit">
              Pokračovat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
