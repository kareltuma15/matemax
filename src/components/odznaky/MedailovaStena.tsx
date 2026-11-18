"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSbirka } from "@/lib/use-sbirka";
import { localLoadCards } from "@/lib/storage";
import { loadGamification, getAllBadges } from "@/lib/gamification";
import { loadProgress } from "@/lib/progress";
import { localLoadOdhady } from "@/lib/odhad-historie";
import { odmenaZaOdznaky } from "@/lib/sbirka-trenink";
import { stavOdznaku, nejblizsiMedaile, noveStupne, KATEGORIE, NAZEV_STUPNE, KRYSTALY_ZA_STUPEN, STARE_BEZ_NAHRADY, type StavMedaile, type VstupOdznaku } from "@/lib/odznaky";
import type { Medaile3D } from "@/lib/medaile3d";
import type { SbirkaStav } from "@/lib/sbirka";
import type { Trida } from "@/types";

const BARVA_STUPNE = ["#B26E36", "#8A96AA", "#C89200", "#1E9DBB"];
const nacti = <T,>(klic: string, vychozi: T): T => { try { const r = localStorage.getItem(klic); return r ? (JSON.parse(r) as T) : vychozi; } catch { return vychozi; } };

/** Vstup pro výpočet medailí z dat v prohlížeči. */
function vstup(trida: Trida, sb: SbirkaStav): VstupOdznaku {
  const gam = loadGamification();
  const odhady = localLoadOdhady(trida);
  const tydny = new Set(sb.tydny5 ?? []); if (sb.zlataOtevrena) tydny.add(sb.zlataOtevrena);
  return {
    trida,
    karty: localLoadCards(),
    maxSerie: Math.max(sb.maxSerieDni ?? 0, loadProgress().streak ?? 0),
    tydny5: tydny.size,
    vyreseno: gam.totalSolved ?? 0,
    napraveno: sb.napraveno ?? 0,
    perfektni: gam.perfectSessions ?? 0,
    diagnostika: nacti("matemax-diag-results", {}),
    testu: (nacti<unknown[]>(trida === 5 ? "cvicny-test-5-historie" : "cermat-test-history", [])).length,
    rustOdhadu: odhady.length > 1 ? Math.max(...odhady.map((o) => o.b)) - odhady[0].b : 0,
    generalek: Object.keys(sb.testy ?? {}).length,
    stareOdznaky: gam.earnedBadges ?? [],
  };
}

function stuha(m: StavMedaile) { return KATEGORIE.find((k) => k.id === m.kategorie)?.stuha ?? "#5B55D6"; }
const klicObr = (m: StavMedaile) => `${m.znak}|${m.stupen}|${stuha(m)}`;
const OBRAZKY = new Map<string, string>();

/** Hook: spočítá medaile, odmění nové stupně (krystaly) a vrátí je pro oslavu. */
export function useMedaile(trida: Trida, odmenit = false) {
  const { stav, nacteno } = useSbirka();
  const [medaile, setMedaile] = useState<StavMedaile[] | null>(null);
  const [nove, setNove] = useState<{ m: StavMedaile[]; krystaly: number } | null>(null);
  const hotovo = useRef(false);
  useEffect(() => {
    if (!nacteno) return;
    const v = vstup(trida, stav);
    const m = stavOdznaku(v);
    setMedaile(m); // eslint-disable-line react-hooks/set-state-in-effect
    if (odmenit && !hotovo.current) {
      hotovo.current = true;
      const r = odmenaZaOdznaky(m, v.maxSerie);
      if (r.nove.length) setNove({ m: r.nove, krystaly: r.krystaly });
    }
  }, [nacteno, trida, stav, odmenit]);
  const cekaStupnu = medaile ? noveStupne(medaile, stav.odznaky ?? {}).nove.length : 0;
  return { medaile, nove, cekaStupnu, zavriNove: () => setNove(null) };
}

/** Obrázky medailí (3D render jedním kontextem; bez WebGL zůstane jednoduchý šestiúhelník). */
function useObrazky(medaile: StavMedaile[] | null) {
  const [, setVerze] = useState(0);
  useEffect(() => {
    if (!medaile) return;
    const chybi = medaile.filter((m) => !OBRAZKY.has(klicObr(m)));
    if (!chybi.length) return;
    let zruseno = false;
    import("@/lib/medaile3d").then(({ obrazkyMedaili }) => {
      if (zruseno) return;
      try {
        const url = obrazkyMedaili(chybi.map((m) => ({ znak: m.znak, stupen: m.stupen, stuha: stuha(m) })), 150);
        chybi.forEach((m, i) => OBRAZKY.set(klicObr(m), url[i]));
        setVerze((x) => x + 1);
      } catch { /* bez WebGL: náhradní kresba */ }
    }).catch(() => {});
    return () => { zruseno = true; };
  }, [medaile]);
}

function Obrazek({ m, velikost }: { m: StavMedaile; velikost: number }) {
  const url = OBRAZKY.get(klicObr(m));
  if (url) return <img src={url} alt="" width={velikost} height={velikost} style={{ width: velikost, height: velikost, objectFit: "contain" }} />;
  return (
    <span className="grid place-items-center font-black" aria-hidden="true" style={{ width: velikost, height: velikost, clipPath: "polygon(50% 4%,92% 27%,92% 73%,50% 96%,8% 73%,8% 27%)", background: m.stupen < 0 ? "#D5DAE4" : BARVA_STUPNE[m.stupen], color: "#fff", fontSize: velikost * 0.28 }}>
      {m.znak === "plamen" ? "🔥" : m.znak}
    </span>
  );
}

function ZiveMedaile({ m, oslava }: { m: StavMedaile; oslava?: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [lze, setLze] = useState(true);
  useEffect(() => {
    let inst: Medaile3D | null = null, zruseno = false;
    import("@/lib/medaile3d").then(({ vytvorMedaili3D }) => {
      if (zruseno || !cv.current) return;
      try {
        inst = vytvorMedaili3D(cv.current, { znak: m.znak, stupen: m.stupen, stuha: stuha(m) });
        if (oslava) window.setTimeout(() => inst?.oslava(), 150);
      } catch { setLze(false); }
    }).catch(() => setLze(false));
    return () => { zruseno = true; inst?.znic(); };
  }, [m, oslava]);
  if (!lze) return <Obrazek m={m} velikost={180} />;
  return <canvas ref={cv} className="block" style={{ width: 210, height: 210, cursor: "grab", touchAction: "pan-y" }} aria-label={`3D medaile ${m.nazev}, jde otočit`} />;
}

function Detail({ m, novy, onZavrit, krystaly }: { m: StavMedaile; novy?: boolean; onZavrit: () => void; krystaly?: number }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" style={{ background: "rgba(8,14,34,.72)" }} role="dialog" aria-label={`Medaile ${m.nazev}`} data-testid="medaile-detail" onClick={onZavrit}>
      <div className="w-full max-w-[380px] rounded-[24px] p-5 text-center text-white grid gap-2" style={{ background: "linear-gradient(180deg,#1C2F66,#0F1D45)", border: "1px solid rgba(255,255,255,.15)" }} onClick={(e) => e.stopPropagation()}>
        <div className="justify-self-center"><ZiveMedaile m={m} oslava={novy} /></div>
        <span className="justify-self-center text-sm font-black" style={{ color: m.stupen < 0 ? "#9AA3B8" : "#FFE08A" }}>{m.stupen < 0 ? "Zatím zamčeno" : `${novy ? "Nový stupeň: " : ""}${m.kategorie === "bonus" ? "Získáno" : NAZEV_STUPNE[m.stupen]}`}</span>
        <b className="text-xl">{m.nazev}</b>
        <span className="text-sm" style={{ color: "#C4CEEA" }}>{m.popis}</span>
        {m.stupne.length > 1 && (
          <div className="grid grid-cols-4 gap-1.5 mt-1">
            {m.stupne.map((s, i) => (
              <span key={i} className="rounded-xl px-1 py-1.5 text-[11px] font-bold leading-tight" style={i <= m.stupen ? { background: "rgba(242,193,78,.2)", color: "#FFE08A" } : { background: "rgba(255,255,255,.08)" }}>
                <b className="block text-[13px]">{NAZEV_STUPNE[i]}</b>{s}
              </span>
            ))}
          </div>
        )}
        <span className="text-sm font-extrabold" style={{ color: "#FFD27E" }}>{novy && krystaly ? `+${krystaly} krystalů za nové stupně` : m.chybi}</span>
        <button type="button" onClick={onZavrit} className="mt-1 rounded-[14px] px-4 py-2.5 font-black" style={{ background: "#F5A623", color: "#0D1B3E" }}>Paráda!</button>
      </div>
    </div>
  );
}

/** Karta „Nejbližší medaile“ (profil, přehled). */
export function NejblizsiMedaileKarta({ trida }: { trida: Trida }) {
  const { medaile, cekaStupnu } = useMedaile(trida);
  useObrazky(medaile);
  const n = medaile ? nejblizsiMedaile(medaile) : null;
  if (!n) return null;
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1 flex justify-between gap-2"><span>Nejbližší medaile</span>{cekaStupnu > 0 && <span className="normal-case tracking-normal" style={{ color: "#C27A00" }}>🎉 {cekaStupnu === 1 ? "Nový stupeň" : `${cekaStupnu} nové stupně`} čeká v Odznacích</span>}</p>
      <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3 card-hover" data-testid="nejblizsi-medaile">
        <Obrazek m={n} velikost={60} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-slate-800 leading-tight">{n.nazev}{n.stupen >= 0 ? ` · ${NAZEV_STUPNE[n.stupen]}` : ""}</p>
          <p className="text-xs text-slate-500 mt-0.5">{n.chybi}</p>
          <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "#E4E8F2" }}><i className="block h-full rounded-full" style={{ width: `${Math.max(4, Math.round(n.postup * 100))}%`, background: "linear-gradient(90deg,#F5A623,#F2C14E)" }} /></div>
        </div>
      </div>
    </div>
  );
}

/** Záložka Odznaky na profilu: medailová stěna. */
export default function MedailovaStena({ trida }: { trida: Trida }) {
  const { medaile, nove, zavriNove } = useMedaile(trida, true);
  useObrazky(medaile);
  const [detail, setDetail] = useState<StavMedaile | null>(null);
  const stare = useMemo(() => {
    const vse = getAllBadges(), mam = new Set(loadGamification().earnedBadges ?? []);
    return vse.filter((b) => mam.has(b.id) && STARE_BEZ_NAHRADY.has(b.id));
  }, []);
  if (!medaile) return <div className="skeleton rounded-2xl" style={{ height: 320 }} />;
  const n = nejblizsiMedaile(medaile);
  const ziskano = medaile.filter((m) => m.stupen >= 0).length;
  return (
    <div className="flex flex-col gap-4" data-testid="medailova-stena">
      <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-between gap-3">
        <div><b className="text-[15px]" style={{ color: "var(--text-primary)" }}>Odznaky za učení</b><p className="text-xs text-slate-500">Každá medaile má stupně bronz, stříbro, zlato a diamant. Za nový stupeň krystaly ({KRYSTALY_ZA_STUPEN.join(" / ")}).</p></div>
        <span className="shrink-0 text-sm font-black tabular-nums" style={{ color: "#2E6DA4" }}>{ziskano} z {medaile.length}</span>
      </div>
      {n && (
        <button type="button" onClick={() => setDetail(n)} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3 text-left mm-klik">
          <Obrazek m={n} velikost={64} />
          <span className="flex-1 min-w-0">
            <b className="block text-sm" style={{ color: "var(--text-primary)" }}>Nejbližší medaile: {n.nazev}</b>
            <span className="block text-xs text-slate-500">{n.chybi}</span>
            <span className="block h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "#E4E8F2" }}><i className="block h-full rounded-full" style={{ width: `${Math.max(4, Math.round(n.postup * 100))}%`, background: "linear-gradient(90deg,#F5A623,#F2C14E)" }} /></span>
          </span>
        </button>
      )}
      {KATEGORIE.map((k) => {
        const v = medaile.filter((m) => m.kategorie === k.id);
        if (!v.length) return null;
        return (
          <section key={k.id}>
            <h3 className="flex justify-between text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1"><span>{k.id === "temata" && trida === 5 ? "Mistr okruhů" : k.nazev}</span><span className="normal-case tracking-normal">{v.filter((m) => m.stupen >= 0).length} z {v.length}</span></h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {v.map((m) => (
                <button key={m.id} type="button" onClick={() => setDetail(m)} className="bg-white rounded-2xl border border-slate-200 px-1.5 pt-1 pb-2 grid justify-items-center gap-0.5 mm-klik" data-testid={`medaile-${m.id}`} data-stupen={m.stupen}>
                  <span style={{ opacity: m.stupen < 0 ? 0.85 : 1 }}><Obrazek m={m} velikost={84} /></span>
                  <span className="text-[12px] font-extrabold leading-tight text-center" style={{ color: "var(--text-primary)" }}>{m.nazev}</span>
                  <span className="text-[10px] font-black uppercase tracking-wide" style={{ color: m.stupen < 0 ? "#9AA3B8" : BARVA_STUPNE[m.stupen] }}>{m.stupen < 0 ? "zamčeno" : m.kategorie === "bonus" ? "získáno" : NAZEV_STUPNE[m.stupen]}</span>
                  {m.kategorie !== "bonus" && <span className="w-full h-1 rounded-full overflow-hidden" style={{ background: "#E4E8F2" }}><i className="block h-full" style={{ width: `${Math.round(m.postup * 100)}%`, background: "#F5A623" }} /></span>}
                </button>
              ))}
            </div>
          </section>
        );
      })}
      {stare.length > 0 && (
        <details className="bg-white rounded-2xl border border-slate-200 p-4">
          <summary className="text-sm font-black cursor-pointer" style={{ color: "var(--text-primary)" }}>Původní odznaky ({stare.length})</summary>
          <div className="flex flex-wrap gap-2 mt-3">{stare.map((b) => <span key={b.id} className="text-xs font-bold rounded-full px-2.5 py-1" style={{ background: "#F4F7FC", color: "#33405F" }}>{b.icon_emoji} {b.label}</span>)}</div>
        </details>
      )}
      {detail && <Detail m={detail} onZavrit={() => setDetail(null)} />}
      {nove && <Detail m={nove.m.slice().sort((a, b) => b.stupen - a.stupen)[0]} novy krystaly={nove.krystaly} onZavrit={zavriNove} />}
    </div>
  );
}
