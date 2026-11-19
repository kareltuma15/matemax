"use client";

import { useEffect, useRef, useState } from "react";
import Hexik from "./Hexik";
import { useSbirka } from "@/lib/use-sbirka";
import { nasazena, slotyHexika, krystaly, etapaHexika, ANIMACE_OSLAVY, MISE, TROFEJE, TROFEJ_EVENT, type MiseId } from "@/lib/sbirka";
import { spustEfekt, reaguj } from "@/lib/hexik-efekty";
import { ODPOVED_EVENT, playCombo, playComboMilnik } from "@/lib/sound";
import { COMBO_EVENT, STUPNE_COMBA, stupenComba, type DetailComba } from "@/lib/combo";
import { vytvorOhenComba, type OhenComba } from "@/lib/combo-ohen";
import { KRYSTALY_EVENT, MISE_EVENT } from "@/lib/sbirka-trenink";
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
/** Úvodní hláška, než žák poprvé odpoví (pak ji nahradí reakce). */
const START: Record<Trida, string[]> = {
  5: ["Tohle dáš! Fandím ti 💪", "Jdeme na to spolu!", "Hurá do toho!"],
  9: ["Tohle dáš. Fandím ti 💪", "Jdeme na to!", "Pojď, dáme pár příkladů."],
};

/**
 * Hexík u příkladu: na telefonu stojí na horní hraně karty s bublinou vlevo, na počítači vpravo vedle karty.
 * Reaguje na vyhodnocení odpovědi (událost ze zvuku správně/špatně), oslavuje každou třetí
 * správnou v řadě nasazenou oslavou a ukazuje připsané krystaly.
 */
export default function HexikParta({ trida }: { trida: Trida }) {
  const { stav, nacteno } = useSbirka();
  const hxRef = useRef<HTMLSpanElement>(null);
  const serieRef = useRef(0);
  const [bublina, setBublina] = useState<string | null>(null);
  const [uvod, setUvod] = useState<string | null>(null);
  useEffect(() => { setUvod(nahodne(START[trida])); }, [trida]); // eslint-disable-line react-hooks/set-state-in-effect
  const [plus, setPlus] = useState<{ n: number; klic: number } | null>(null);
  const bublinaCas = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [combo, setCombo] = useState<{ n: number; stit: boolean; pop: number }>({ n: 0, stit: false, pop: 0 });
  const [milnik, setMilnik] = useState<{ n: number; nazev: string; krystaly: number; klic: number } | null>(null);
  const ohenCv = useRef<HTMLCanvasElement>(null);
  const ohen = useRef<OhenComba | null>(null);
  const comboStupen = stupenComba(combo.n);

  const podoba = nasazena(stav, trida, "podoba").klic;
  const oslava = nasazena(stav, trida, "oslava").klic;
  const efekt = nasazena(stav, trida, "efekt").klic;
  const etapa = etapaHexika(stav.maxOdhad[trida]);

  // Aktuální nasazení pro posluchače (bez přeregistrování při každé změně)
  const nas = useRef({ oslava, efekt, trida });
  useEffect(() => { nas.current = { oslava, efekt, trida }; }, [oslava, efekt, trida]);

  useEffect(() => {
    const rekni = (t: string, ms = 2000) => {
      setBublina(t);
      setUvod(null);
      if (bublinaCas.current) clearTimeout(bublinaCas.current);
      bublinaCas.current = setTimeout(() => setBublina(null), ms);
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
    // Splněná mise přebije běžnou hlášku (přijde hned po vyhodnocení odpovědi)
    const naMise = (e: Event) => {
      const ids = (e as CustomEvent<{ ids: MiseId[] }>).detail?.ids ?? [];
      if (!ids.length) return;
      window.setTimeout(() => {
        reaguj(hxRef.current, ANIMACE_OSLAVY[nas.current.oslava] ?? "radost");
        rekni(`Mise splněna: ${MISE[ids[0]].text}!`, 3200);
      }, 350);
    };
    window.addEventListener(ODPOVED_EVENT, naOdpoved);
    window.addEventListener(KRYSTALY_EVENT, naKrystaly);
    window.addEventListener(MISE_EVENT, naMise);
    const naTrofej = (e: Event) => {
      const t = TROFEJE.find((x) => x.id === (e as CustomEvent<{ ids: string[] }>).detail?.ids?.[0]);
      if (!t) return;
      window.setTimeout(() => { reaguj(hxRef.current, "radost"); rekni(`${t.ikona} Nová trofej: ${t.nazev}!`, 3500); }, 700);
    };
    window.addEventListener(TROFEJ_EVENT, naTrofej);
    // Combo: stupně, štít, milníky (přijde hned po vyhodnocení odpovědi a krystalech)
    const naCombo = (e: Event) => {
      const d = (e as CustomEvent<DetailComba>).detail;
      if (!d) return;
      const u = d.udalost;
      setCombo({ n: d.stav.n, stit: d.stav.stit, pop: Date.now() });
      ohen.current?.stupen(stupenComba(d.stav.n));
      if (u.druh === "vic") {
        playCombo(d.stav.n);
        if (u.milnik) {
          playComboMilnik();
          ohen.current?.vzplanuti();
          reaguj(hxRef.current, d.stav.n >= 20 ? "salto" : "tanec");
          setMilnik({ n: u.milnik, nazev: STUPNE_COMBA[stupenComba(u.milnik)].nazev, krystaly: d.krystaly, klic: Date.now() });
          rekni(`${u.milnik}× za sebou! ${STUPNE_COMBA[stupenComba(u.milnik)].nazev}!`, 2600);
        } else if (u.noveStit) {
          rekni("Máš štít 🛡 Jedna chyba combo nesrazí.", 2800);
        } else if (u.novyStupen) {
          ohen.current?.vzplanuti();
          rekni(`${STUPNE_COMBA[stupenComba(d.stav.n)].nazev}! 🔥`, 2200);
        }
      } else if (u.druh === "stit") {
        rekni("Štít podržel combo! 🛡", 2600);
      } else if (u.druh === "konec" && u.bylo >= 5) {
        rekni(`Combo ${u.bylo} skončilo. Nevadí, jedeme znovu!`, 2600);
      }
    };
    window.addEventListener(COMBO_EVENT, naCombo);
    return () => {
      window.removeEventListener(COMBO_EVENT, naCombo);
      window.removeEventListener(ODPOVED_EVENT, naOdpoved);
      window.removeEventListener(KRYSTALY_EVENT, naKrystaly);
      window.removeEventListener(MISE_EVENT, naMise);
      window.removeEventListener(TROFEJ_EVENT, naTrofej);
      if (bublinaCas.current) clearTimeout(bublinaCas.current);
    };
  }, []);

  useEffect(() => {
    if (!nacteno || !ohenCv.current) return;
    ohen.current = vytvorOhenComba(ohenCv.current);
    return () => { ohen.current?.znic(); ohen.current = null; };
  }, [nacteno]);

  useEffect(() => {
    if (!milnik) return;
    const t = setTimeout(() => setMilnik(null), 1900);
    return () => clearTimeout(t);
  }, [milnik]);

  if (!nacteno) return <div className="h-[118px] lg:hidden" aria-hidden="true" />;

  // Telefon (Karel 19. 11., mockup Opravy z mobilu): nahoře krystaly a combo, pod tím bublina a Hexík,
  // který stojí nohama na horní hraně karty s příkladem. Počítač: panel vpravo vedle karty jako dřív.
  return (
    <div className="hx-parta" data-testid="hexik-parta">
      <div className="hx-parta-info">
        <div className="relative z-[2] shrink-0">
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
        {combo.n >= 2 && (
          <span
            key={combo.pop}
            className="combo-cip shrink-0 inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-sm font-black tabular-nums"
            data-t={comboStupen}
            data-testid="combo"
            data-n={combo.n}
            title={STUPNE_COMBA[comboStupen].nazev || "Combo: správně za sebou"}
          >
            <span aria-hidden="true">🔥</span>{combo.n}{combo.stit && <span aria-label="štít">🛡</span>}
          </span>
        )}
      </div>
      <div className="hx-parta-bub">
        <p
          className={`hx-bublina hx-bublina-sipka inline-block max-w-full rounded-2xl px-3 py-1.5 text-sm font-bold shadow-sm border ${bublina ?? uvod ? "hx-vid" : ""}`}
          style={{ background: "var(--surface-0, #fff)", borderColor: "var(--border-color, #E4E6EF)", color: "var(--text-primary, #0D1B3E)" }}
          aria-live="polite"
          data-testid="hexik-bublina"
        >
          {bublina ?? uvod ?? " "}
        </p>
      </div>
      <div className="hx-parta-hx combo-obal" data-t={comboStupen} data-testid="combo-hexik">
        <canvas ref={ohenCv} className="combo-ohen" aria-hidden="true" />
        <Hexik ref={hxRef} podoba={podoba} etapa={etapa} d3="setrne" doplnky={slotyHexika(stav, trida)} className="relative z-[1] w-full" />
      </div>
      {milnik && (
        <div key={milnik.klic} className="combo-milnik" role="status" data-testid="combo-milnik">
          <b>{milnik.n}× COMBO</b>
          <span>{milnik.nazev}{milnik.krystaly > 0 ? ` · +${milnik.krystaly} krystalů` : ""}</span>
        </div>
      )}
    </div>
  );
}
