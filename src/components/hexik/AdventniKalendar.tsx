"use client";

import { merFunkci } from "@/lib/analytics";
import { useEffect, useRef, useState } from "react";
import { useSbirka } from "@/lib/use-sbirka";
import { upravSbirku, nasadOdmenu, nasazena, slotyHexika, etapaHexika, IKONA_ODMENY, VZACNOST, TYP_NAZEV, SLOTY, type Odmena } from "@/lib/sbirka";
import Hexik from "./Hexik";
import { OKNA, PORADI_OKEN, stavOkna, otevriOkno, vecOkna, denAdventu, oknaKOtevreni, type VysledekOkna, type StavOkna } from "@/lib/kalendar";
import OdmenaVizual from "./OdmenaVizual";
import type { Trida } from "@/types";

const BARVY_GIRLANDY = ["#FF5E5E", "#FFD25E", "#5EE38F", "#5EB8FF", "#FF8AD8"];

/** Popisek okénka (co je za ním) pro otevřená okénka a seznam odměn. */
export function obsahOkna(d: number, trida: Trida): { ik: string; text: string } {
  const o = OKNA[d];
  if (o.druh === "krystaly") return { ik: "💎", text: `${o.n} krystalů` };
  if (o.druh === "truhla") return { ik: "🎁", text: "Sezónní truhla" };
  const v = vecOkna(d, trida);
  if (!v) return { ik: "🎁", text: "Dárek" };
  const ik = v.typ === "podoba" ? (v.klic === "pernicek" ? "🍪" : "🐻‍❄️") : v.typ === "pozadi" ? "✨" : IKONA_ODMENY[v.klic] ?? "🎁";
  return { ik, text: v.nazev };
}

/**
 * Adventní kalendář s Hexíkem (1.–24. 12.): okénko po tréninku, zmeškaná se dohánějí dalším tréninkem.
 * Pravidla a odměny v lib/kalendar.ts.
 */
export default function AdventniKalendar({ trida, den }: { trida: Trida; den: string }) {
  const { stav } = useSbirka();
  const [odhal, setOdhal] = useState<VysledekOkna | null>(null);
  const [oteviram, setOteviram] = useState<number | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const scena = useRef<HTMLDivElement>(null);
  const snih = useRef<HTMLCanvasElement>(null);
  const dnes = denAdventu(den);
  const otevreno = stav.advent?.rok === Number(den.slice(0, 4)) ? stav.advent.otevreno.length : 0;
  const lze = oknaKOtevreni(stav, den);

  // Sníh ve dvou vrstvách
  useEffect(() => {
    const c = snih.current;
    if (!c || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const vl: { x: number; y: number; r: number; v: number; f: number; a: number }[] = [];
    const vel = () => { const r = c.getBoundingClientRect(); c.width = r.width; c.height = r.height; };
    vel();
    for (let i = 0; i < 80; i++) { const v = Math.random() < 0.25; vl.push({ x: Math.random() * c.width, y: Math.random() * c.height, r: v ? 2.2 + Math.random() * 2 : 0.5 + Math.random() * 1.4, v: v ? 0.7 + Math.random() * 0.6 : 0.2 + Math.random() * 0.4, f: Math.random() * 6, a: v ? 0.95 : 0.55 }); }
    const krok = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const s of vl) {
        s.y += s.v; s.f += 0.02; s.x += Math.sin(s.f) * 0.3;
        if (s.y > c.height) { s.y = -4; s.x = Math.random() * c.width; }
        ctx.fillStyle = `rgba(255,255,255,${s.a})`; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
      }
      raf = requestAnimationFrame(krok);
    };
    raf = requestAnimationFrame(krok);
    window.addEventListener("resize", vel);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", vel); };
  }, []);

  function naklon(e: React.PointerEvent) {
    const el = scena.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
    el.classList.add("adv-ruka");
  }
  function pust() { const el = scena.current; if (el) { el.style.transform = ""; el.classList.remove("adv-ruka"); } }

  function klik(d: number, st: StavOkna) {
    if (st === "dnes-po-treninku") { setHlaska(`Okénko ${d} se otevře po dnešním tréninku.`); return; }
    if (st === "zmeskane") { setHlaska("Zmeškané okénko dohoníš dalším tréninkem dnes."); return; }
    if (st === "budouci") { setHlaska(`Okénko ${d} je zatím zavřené. Počkej na ${d}. prosince.`); return; }
    if (st !== "dnes" && st !== "dohnat") return;
    const v = upravSbirku((s) => otevriOkno(s, trida, den, d));
    merFunkci("kalendar");
    if (!v) return;
    setHlaska(null);
    setOteviram(d);
    window.setTimeout(() => { setOdhal(v); setOteviram(null); }, 750);
  }

  const vz = odhal?.odmena ? VZACNOST[odhal.odmena.vz] : null;
  const nasazeno = odhal?.odmena ? nasazena(stav, trida, odhal.odmena.typ).id === odhal.odmena.id : false;

  return (
    <div className="flex flex-col gap-3" data-testid="adventni-kalendar">
      <div className="adv-obal">
        <div ref={scena} className="adv" onPointerMove={naklon} onPointerLeave={pust}>
          <canvas ref={snih} className="adv-snih" aria-hidden="true" />
          <div className="adv-girlanda" aria-hidden="true">
            <svg viewBox="0 0 100 26" preserveAspectRatio="none"><path d="M0 3 Q25 24 50 6 T100 3" fill="none" stroke="#2B3A2E" strokeWidth="1.2" /></svg>
            {Array.from({ length: 14 }, (_, i) => {
              const x = (i + 0.5) / 14, u = x <= 0.5 ? x * 2 : (x - 0.5) * 2;
              const y = x <= 0.5 ? (1 - u) * (1 - u) * 3 + 2 * (1 - u) * u * 24 + u * u * 6 : (1 - u) * (1 - u) * 6 + 2 * (1 - u) * u * -12 + u * u * 3;
              const b = BARVY_GIRLANDY[i % BARVY_GIRLANDY.length];
              return <i key={i} style={{ left: `${x * 100}%`, top: Math.max(0, y - 1), background: b, boxShadow: `0 0 8px ${b}`, animationDelay: `${(i * 0.37) % 1.8}s` }} />;
            })}
          </div>
          <div className="adv-hlava">
            <b>Adventní kalendář</b>
            <span>{dnes ? `${dnes}. prosince` : "prosinec"} · {otevreno} z 24</span>
          </div>
          <div className="adv-okna">
            {PORADI_OKEN.map((d) => {
              const st = stavOkna(stav, den, d);
              const o = obsahOkna(d, trida);
              const cls = st === "otevreno" || oteviram === d ? "otevreno" : st === "dnes" ? "dnes" : st === "dohnat" ? "dohnat" : st === "budouci" ? "budouci" : "zavreno";
              return (
                <button
                  key={d}
                  type="button"
                  className={`adv-okno ${cls}${d === 24 ? " velke" : ""}`}
                  onClick={() => klik(d, st)}
                  data-testid={`okno-${d}`}
                  data-stav={st}
                  aria-label={`${d}. prosince: ${st === "otevreno" ? o.text : st === "dnes" ? "otevři" : st === "dohnat" ? "dohnat zmeškané okénko" : st === "dnes-po-treninku" ? "otevře se po tréninku" : st === "zmeskane" ? "zmeškané" : "zatím zavřené"}`}
                >
                  <span className="adv-vnitrek"><span className="ik">{o.ik}</span><span className="tx">{o.text}</span></span>
                  <span className="adv-dvirka">{d}{st === "dohnat" && <span className="dohnat">dohnat</span>}</span>
                </button>
              );
            })}
          </div>
          <div className="adv-stav" role="status">
            {hlaska ? <><b>{hlaska}</b></> : lze > 0 ? <><b>{lze === 1 ? "Okénko čeká na otevření!" : `Můžeš otevřít ${lze} okénka!`}</b><span>Klikni na zlatě svítící okénko.</span></>
              : dnes && stavOkna(stav, den, dnes) === "dnes-po-treninku" ? <><b>Dnešní okénko čeká</b><span>Dokonči dnešní trénink a otevři ho. Zmeškaná okénka dohoníš dalším tréninkem.</span></>
              : <><b>{otevreno >= 24 ? "Máš všech 24 okének! Jsi Adventní mistr 🎄" : "Dnešní okénko máš otevřené"}</b><span>{otevreno >= 24 ? "Krásné Vánoce!" : "Zítra čeká další. Za všech 24 okének je trofej a 300 krystalů."}</span></>}
          </div>
        </div>
      </div>

      {odhal && (
        <div className="adv-odhal" role="dialog" aria-label="Odměna z kalendáře" data-testid="kalendar-odhal">
          <div>
            <span className="adv-odhal-den">{odhal.d}. prosince{odhal.d !== dnes ? " (dohnáno)" : ""}</span>
            <div className="adv-odhal-vec">
              {odhal.odmena ? <NahledVeci o={odhal.odmena} trida={trida} /> : <span style={{ fontSize: 56 }} aria-hidden="true">💎</span>}
            </div>
            {vz && <span className="adv-odhal-vz" style={{ background: vz.barva }}>{vz.nazev}</span>}
            <b className="adv-odhal-n">{odhal.odmena ? odhal.odmena.nazev : `${odhal.krystaly} krystalů`}</b>
            <span className="adv-odhal-t">
              {odhal.odmena ? `${TYP_NAZEV[odhal.odmena.typ]}${odhal.nova ? " · nové!" : " · už máš, vrátily se krystaly"}` : "Za dnešní trénink"}
              {odhal.odmena && odhal.krystaly > 0 ? ` · +${odhal.krystaly} krystalů` : ""}
            </span>
            {odhal.mistr && <span className="adv-odhal-t" style={{ color: "#FFD27E", fontWeight: 800 }}>Všech 24 okének! Trofej Adventní mistr a +300 krystalů</span>}
            <div className="flex gap-2 justify-center mt-2">
              {odhal.odmena && !nasazeno && (
                <button type="button" className="adv-btn hl" onClick={() => { upravSbirku((s) => nasadOdmenu(s, odhal.odmena!.id)); setOdhal(null); }}>Nasadit</button>
              )}
              <button type="button" className="adv-btn" onClick={() => setOdhal(null)}>Paráda!</button>
            </div>
          </div>
        </div>
      )}

      <div className="mm-karta p-4">
        <b className="text-sm" style={{ color: "var(--text-primary)" }}>Co je za okénky</b>
        <div className="grid gap-2 mt-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
          {[3, 6, 8, 11, 15, 18, 22, 24].map((d) => {
            const o = obsahOkna(d, trida);
            return (
              <div key={d} className="rounded-xl p-2.5 text-sm" style={{ border: "1px solid var(--border-color, #E4E6EF)" }}>
                <span className="block text-xs font-bold" style={{ color: "#5F6982" }}>{d}. prosince</span>
                <b style={{ color: "var(--text-primary)" }}>{o.ik} {o.text}</b>
              </div>
            );
          })}
        </div>
        <p className="text-xs mt-2" style={{ color: "#5F6982" }}>Ostatní dny krystaly. Okénko se otevře po dokončeném tréninku, zmeškané dohoníš dalším tréninkem v jednom dni.</p>
      </div>
    </div>
  );
}

/** Věc z okénka: doplněk a podobu ukáže rovnou na 3D Hexíkovi (jde otočit), ostatní jako obrázek. */
function NahledVeci({ o, trida }: { o: Odmena; trida: Trida }) {
  const { stav } = useSbirka();
  const slot = (SLOTY as readonly string[]).includes(o.typ);
  if (!slot && o.typ !== "podoba" && o.typ !== "oslava") return <OdmenaVizual o={o} velikost={84} />;
  const podoba = o.typ === "podoba" ? o.klic : nasazena(stav, trida, "podoba").klic;
  return <Hexik podoba={podoba} etapa={etapaHexika(stav.maxOdhad[trida])} d3 otacet doplnky={slotyHexika(stav, trida, slot ? o : undefined)} style={{ width: 150, height: 150 }} />;
}

/** Kompaktní karta kalendáře na Domov (jen 1.–24. 12.). */
export function AdventKarta({ den }: { den: string }) {
  const { stav, nacteno } = useSbirka();
  const dnes = denAdventu(den);
  if (!nacteno || dnes === null) return null;
  const lze = oknaKOtevreni(stav, den);
  const otevreno = stav.advent?.rok === Number(den.slice(0, 4)) ? stav.advent.otevreno : [];
  const poTreninku = stavOkna(stav, den, dnes) === "dnes-po-treninku";
  return (
    <a href="/sbirka?tab=kalendar" className="adv-karta mm-klik" data-testid="advent-karta">
      <span className="adv-karta-ik" aria-hidden="true">🎄</span>
      <span className="min-w-0 flex-1">
        <b>{lze > 0 ? (lze === 1 ? "Okénko adventního kalendáře čeká!" : `Čeká na tebe ${lze} okénka!`) : poTreninku ? `Dnes je ${dnes}. okénko` : "Adventní kalendář"}</b>
        <span>{lze > 0 ? "Pojď ho otevřít." : poTreninku ? "Dokonči trénink a otevři ho." : `Otevřeno ${otevreno.length} z 24. Zítra další.`}</span>
        <span className="adv-tecky" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} className={otevreno.includes(i + 1) ? "on" : i + 1 === dnes ? "dnes" : ""} />)}</span>
      </span>
      <span className="adv-karta-btn">{lze > 0 ? "Otevřít" : "Kalendář"}</span>
    </a>
  );
}
