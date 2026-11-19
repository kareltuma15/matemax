"use client";

/**
 * Otevírání truhly přes celou obrazovku (na počítači vysoký panel uprostřed).
 * Dítě třikrát klepne a truhla se otevře (jinak sama), odměna vyletí ve 3D a dole vyjede karta.
 * Nasadit: doplněk přiletí Hexíkovi na hlavu/oči/krk, nová podoba vletí do Hexíka.
 * Bez WebGL zůstane dosavadní CSS truhla a karta s obrázkem odměny.
 */
import { useEffect, useRef, useState } from "react";
import type { Truhla3D, DruhTruhly, SezonaTruhly, VzacnostTruhly } from "@/lib/hexik3d/truhla";
import type { SlotyHexika } from "@/lib/hexik3d/scena";
import OdmenaVizual from "./OdmenaVizual";
import { VZACNOST, TYP_NAZEV, IKONA_ODMENY, type VysledekTruhly } from "@/lib/sbirka";

interface Props {
  druh: DruhTruhly;
  nazev: string;
  podnadpis?: string;
  sezona: SezonaTruhly | null;
  vysledek: VysledekTruhly | null;
  podoba: string;
  etapa: number;
  sloty?: SlotyHexika;
  /** Odměna je vidět. */
  onOdhaleno?: () => void;
  /** Dítě klepne na Nasadit (stránka věc nasadí). */
  onNasadit: () => void;
  onZavrit: () => void;
}

const IKONA_TYPU: Record<string, string> = { pozadi: "🖼️", vzhled: "🎨", podoba: "✨" };

export default function TruhlaScena({ druh, nazev, podnadpis, sezona, vysledek, podoba, etapa, sloty, onOdhaleno, onNasadit, onZavrit }: Props) {
  const obal = useRef<HTMLDivElement>(null);
  const inst = useRef<Truhla3D | null>(null);
  const odhaleno = useRef(onOdhaleno);
  useEffect(() => { odhaleno.current = onOdhaleno; }, [onOdhaleno]);
  const [je3d, setJe3d] = useState<boolean | null>(null);
  const [klepnuti, setKlepnuti] = useState(0);
  const [barva, setBarva] = useState<VzacnostTruhly>("bezna");
  const [otevreno, setOtevreno] = useState(false);
  const [karta, setKarta] = useState(!vysledek);
  const [nasazeno, setNasazeno] = useState(false);
  const [blesk, setBlesk] = useState<VzacnostTruhly | null>(null);
  const [pocet, setPocet] = useState(0);

  useEffect(() => {
    if (!vysledek) return;
    let zruseno = false, canvas: HTMLCanvasElement | null = null, zaloha = 0, bleskT = 0;
    const ukaz = () => { if (!zruseno) { setOtevreno(true); setKarta(true); odhaleno.current?.(); } };
    const zablesk = (v: VzacnostTruhly) => { if (v === "bezna") return; setBlesk(v); window.clearTimeout(bleskT); bleskT = window.setTimeout(() => setBlesk(null), 1100); };
    let posledni: VzacnostTruhly = "bezna";
    Promise.all([import("@/lib/hexik3d/truhla"), import("@/lib/hexik3d/scena")]).then(([t, s]) => {
      if (zruseno || !obal.current) return;
      if (!s.umi3D()) { setJe3d(false); zaloha = window.setTimeout(ukaz, 700); return; }
      canvas = document.createElement("canvas");
      canvas.className = "absolute inset-0 w-full h-full cursor-pointer touch-manipulation";
      canvas.setAttribute("data-testid", "truhla-3d");
      obal.current.prepend(canvas);
      try {
        const o = vysledek.odmena;
        inst.current = t.vytvorTruhlu3D(canvas, {
          druh, sezona, vz: vysledek.vz, podoba, etapa, sloty,
          odmena: o ? { typ: o.typ, klic: o.klic, ikona: IKONA_ODMENY[o.klic] ?? IKONA_TYPU[o.typ] ?? "🎁" } : null,
          nova: vysledek.nova,
          onKlepnuti: (n, v) => { setKlepnuti(n); setBarva(v); if (v !== posledni) { posledni = v; zablesk(v); } },
          onOtevreno: (v) => { setOtevreno(true); setBarva(v); if (v !== posledni) { posledni = v; zablesk(v); } },
          onOdhaleno: ukaz,
          onNasazeno: () => setNasazeno(true),
        });
        setJe3d(true);
        // Krajní pojistka: na hodně pomalém zařízení ukázat kartu, i kdyby scéna nestíhala
        zaloha = window.setTimeout(ukaz, 10000);
      } catch { canvas.remove(); canvas = null; setJe3d(false); zaloha = window.setTimeout(ukaz, 700); }
    }).catch(() => { setJe3d(false); zaloha = window.setTimeout(ukaz, 700); });
    return () => { zruseno = true; window.clearTimeout(zaloha); window.clearTimeout(bleskT); inst.current?.znic(); inst.current = null; canvas?.remove(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // krystaly na kartě naskakují
  useEffect(() => {
    if (!karta || !vysledek) return;
    const cil = vysledek.krystaly, t0 = performance.now(); let raf = 0;
    const krok = () => { const q = Math.min(1, (performance.now() - t0) / 900); setPocet(Math.round(cil * q)); if (q < 1) raf = requestAnimationFrame(krok); };
    raf = requestAnimationFrame(krok);
    return () => cancelAnimationFrame(raf);
  }, [karta, vysledek]);

  useEffect(() => {
    const klavesa = (e: KeyboardEvent) => { if (e.key === "Escape" && karta) onZavrit(); };
    window.addEventListener("keydown", klavesa);
    return () => window.removeEventListener("keydown", klavesa);
  }, [karta, onZavrit]);

  function nasadit() {
    onNasadit();
    const anim = inst.current?.nasad() ?? false;
    if (!anim) onZavrit();
  }

  const o = vysledek?.odmena ?? null;
  const vzInfo = vysledek ? VZACNOST[vysledek.vz] : null;
  const barvaTecek = VZACNOST[barva].barva;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center sm:p-4" style={{ background: "rgba(5,8,26,.86)" }} role="dialog" aria-modal="true" aria-label={`Otevírání: ${nazev}`}>
      <div
        ref={obal}
        className="relative w-full h-full sm:max-w-[440px] sm:h-[min(92vh,800px)] sm:rounded-[32px] overflow-hidden text-white select-none"
        style={{ background: "radial-gradient(120% 70% at 50% 34%,#33399A,#121A4C 58%,#070B24)" }}
        tabIndex={0}
        aria-description="Klepni na truhlu (nebo stiskni Enter) a otevři ji"
        onKeyDown={(e) => { if (!otevreno && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); inst.current?.klepni(); } }}
      >
        {je3d === false && (
          <span className={`hx-truhla absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 ${otevreno ? "hx-otevrena" : "hx-tres"}`} data-druh={druh}><span className="hx-vika" /><span className="hx-telo" /><span className="hx-zamek" /></span>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-1 px-4 text-center" style={{ paddingTop: "max(20px, env(safe-area-inset-top))" }}>
          <p className="text-[11px] font-black uppercase tracking-[.16em]" style={{ color: "#C9C7F5" }}>{nazev}</p>
          {podnadpis && <p className="text-lg font-black leading-tight">{podnadpis}</p>}
        </div>

        <div
          className="pointer-events-none absolute left-1/2 top-[24%] -translate-x-1/2 rounded-full px-4 py-1.5 text-base font-black uppercase tracking-widest transition-all duration-300"
          style={{ background: blesk ? VZACNOST[blesk].barva : "transparent", color: "#0D1B3E", opacity: blesk ? 1 : 0, transform: `translate(-50%,0) scale(${blesk ? 1 : 0.7})` }}
          aria-hidden="true"
        >
          {blesk ? `${VZACNOST[blesk].nazev}!` : ""}
        </div>

        {vysledek && !otevreno && je3d && (
          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4" style={{ paddingBottom: "max(24px, env(safe-area-inset-bottom))" }} aria-live="polite">
            <p className="pointer-events-none text-base font-black" style={{ color: "#FFE08A", textShadow: "0 2px 10px rgba(0,0,0,.4)" }}>
              {klepnuti === 0 ? "Klepni na truhlu!" : klepnuti === 1 ? "Ještě! Něco tam svítí…" : klepnuti === 2 ? "Poslední klepnutí!" : "…"}
            </p>
            <div className="pointer-events-none flex gap-2" aria-hidden="true">
              {[0, 1, 2].map((i) => <i key={i} className="block w-3 h-3 rounded-full transition-all" style={{ background: i < klepnuti ? barvaTecek : "rgba(255,255,255,.22)", transform: i < klepnuti ? "scale(1.2)" : undefined }} />)}
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); inst.current?.otevri(); }} className="text-sm underline p-2" style={{ color: "#C9C7F5" }} data-testid="truhla-otevrit-hned">Přeskočit</button>
          </div>
        )}

        <div
          className="absolute inset-x-3 flex flex-col items-center gap-2 rounded-3xl border px-4 pt-4 pb-3 text-center transition-transform duration-500"
          style={{
            bottom: "max(12px, env(safe-area-inset-bottom))",
            background: "rgba(10,16,44,.84)", borderColor: "rgba(255,255,255,.14)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
            transform: karta ? "translateY(0)" : "translateY(130%)", transitionTimingFunction: "cubic-bezier(.2,1.25,.4,1)",
          }}
          aria-live="polite"
          data-testid="odhaleni"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {karta && vysledek && vzInfo && (
            <>
              {je3d === false && o && <OdmenaVizual o={o} velikost={84} />}
              <span className="rounded-full px-3 py-0.5 text-[11px] font-black uppercase tracking-wider" style={{ background: vzInfo.barva, color: "#0D1B3E" }}>{vzInfo.nazev}</span>
              <p className="text-2xl font-black leading-tight">{o ? o.nazev : "Krystaly"}</p>
              <p className="text-sm" style={{ color: "#D9D8FE" }}>
                {nasazeno ? "Sluší mu to! Máš to nasazené." : o ? `${TYP_NAZEV[o.typ]} · ${vysledek.nova ? "Nové!" : "Už ji máš, vracíme krystaly"}` : "Tentokrát padly krystaly"}
              </p>
              <span className="inline-flex items-center gap-1.5 font-black tabular-nums" style={{ color: "#BFF4FF" }}>
                <i className="hx-krystal" aria-hidden="true" /> +{pocet} krystalů
              </span>
            </>
          )}
          {karta && !vysledek && <p className="py-2">Truhlu teď nejde otevřít.</p>}
          {karta && (
            <div className="flex gap-2 w-full mt-1">
              {vysledek?.nova && o && !nasazeno && (
                <button type="button" className="mm-tlacitko flex-1 rounded-2xl py-3 font-extrabold" style={{ background: "#F5A623", color: "#0D1B3E" }} onClick={nasadit} data-testid="odhaleni-nasadit">
                  Nasadit
                </button>
              )}
              <button type="button" className="flex-1 rounded-2xl py-3 font-extrabold border border-white/30" onClick={onZavrit} data-testid="odhaleni-hotovo">
                Hotovo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
