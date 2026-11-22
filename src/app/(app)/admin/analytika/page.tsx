"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { Analytika } from "@/lib/analytika-server";

/**
 * Analytika MateMaxu (Karel 22. 11. 2026, schválený mockup docs/appka-2026-11/analytika-mockup.html).
 * 9 částí: přehled, reklama a zdroje, trychtýř, aktivace, retence, zapojení, peníze, obsah, report a kvalita dat.
 * Barvy grafů: kategorie modrá / oranžová / tyrkysová (ověřené pro barvoslepé), velikost = jedna modrá škála.
 */
type Data = Analytika & { report: { kdy: string; text: string } | null; shrnuti: string | null };

const B = { navy: "#0D1B3E", sedy: "#5F6982", muted: "#8A93AA", cara: "#E4E6EF", s1: "#2a78d6", s2: "#eb6834", s3: "#1baf7a", good: "#14753A", bad: "#B4232F", warn: "#9A6200" };
const SKALA = ["#F0F4FA", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf"];
const kc = (x: number) => `${x.toLocaleString("cs-CZ")} Kč`;
const pct = (x: number | null, des = 0) => (x === null ? "–" : `${(x * 100).toFixed(des).replace(".", ",")} %`);
const kratkyDen = (d: string) => `${Number(d.slice(8, 10))}. ${Number(d.slice(5, 7))}.`;
const dnesStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

async function api<T>(url: string, init?: RequestInit): Promise<{ data?: T; chyba?: string }> {
  if (!supabase) return { chyba: "Supabase není dostupné." };
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return { chyba: "Přihlas se jako admin." };
  const r = await fetch(url, { ...init, headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${s.session.access_token}`, "Content-Type": "application/json" }, cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  return r.ok ? { data: j as T } : { chyba: (j as { error?: string }).error ?? "Chyba" };
}

/* ── tooltip ── */
const Tip = { el: null as HTMLDivElement | null };
function ukaz(e: React.MouseEvent | MouseEvent, html: string) {
  const t = Tip.el; if (!t) return;
  t.innerHTML = html; t.style.display = "block";
  t.style.left = `${Math.min(window.innerWidth - 220, e.clientX + 14)}px`; t.style.top = `${e.clientY + 14}px`;
}
function skryj() { if (Tip.el) Tip.el.style.display = "none"; }

function Delta({ ted, pred, procenta = true, inverze = false, jednotka = "" }: { ted: number | null; pred: number | null; procenta?: boolean; inverze?: boolean; jednotka?: string }) {
  if (ted === null || pred === null) return <span className="text-xs font-bold" style={{ color: B.muted }}>bez srovnání</span>;
  const rozdil = ted - pred;
  if (rozdil === 0) return <span className="text-xs font-bold" style={{ color: B.muted }}>● beze změny</span>;
  const lepsi = inverze ? rozdil < 0 : rozdil > 0;
  // Při malém základu (pod 10) je procento zavádějící (1 → 60 = +5 900 %): ukáže se rozdíl v kusech
  const text = procenta && pred >= 10 ? `${rozdil > 0 ? "+" : "−"}${Math.abs(Math.round((rozdil / pred) * 100))} %` : `${rozdil > 0 ? "+" : "−"}${Math.abs(Math.round(rozdil * 10) / 10).toLocaleString("cs-CZ")}${jednotka}`;
  return <span className="text-xs font-extrabold" style={{ color: lepsi ? B.good : B.bad }}>{rozdil > 0 ? "▲" : "▼"} {text} <span style={{ color: B.muted, fontWeight: 600 }}>(proti {pred.toLocaleString("cs-CZ")}{jednotka})</span></span>;
}

function Dlazdice({ nadpis, hodnota, jednotka, delta, pozn, testid }: { nadpis: string; hodnota: ReactNode; jednotka?: string; delta?: ReactNode; pozn?: string; testid?: string }) {
  return (
    <div className="mm-karta p-3.5 flex flex-col gap-1 min-w-0" data-testid={testid}>
      <span className="text-xs font-bold" style={{ color: B.sedy }}>{nadpis}</span>
      <span className="text-[26px] font-black tabular-nums leading-tight" style={{ color: B.navy }}>{hodnota}{jednotka && <span className="text-sm font-bold ml-1" style={{ color: B.sedy }}>{jednotka}</span>}</span>
      {delta}
      {pozn && <span className="text-[11.5px]" style={{ color: B.muted }}>{pozn}</span>}
    </div>
  );
}

function Sekce({ cislo, nadpis, popis, children, testid }: { cislo: number; nadpis: string; popis?: string; children: ReactNode; testid?: string }) {
  return (
    <section className="flex flex-col gap-3 min-w-0" data-testid={testid}>
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span className="w-6 h-6 rounded-lg grid place-items-center text-xs font-extrabold text-white self-center shrink-0" style={{ background: B.navy }}>{cislo}</span>
        <h2 className="text-lg font-extrabold" style={{ color: B.navy }}>{nadpis}</h2>
        {popis && <span className="text-[13px]" style={{ color: B.sedy }}>{popis}</span>}
      </div>
      {children}
    </section>
  );
}

/* ── grafy ── */
function GrafNavstev({ graf, udalosti }: { graf: Data["graf"]; udalosti: Data["udalosti"] }) {
  const W = 640, H = 210, L = 36, R = 628, T = 16, Bo = 180;
  const max = Math.max(4, ...graf.map((g) => Math.max(g.navstevnici, g.navstevniciPred)));
  const krok = Math.ceil(max / 3 / 5) * 5 || 1, osa = [0, krok, krok * 2, krok * 3];
  const top = osa[3];
  const x = (i: number) => L + (i * (R - L)) / Math.max(1, graf.length - 1), y = (v: number) => Bo - (v / top) * (Bo - T);
  const [i, setI] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const kazdy = Math.ceil(graf.length / 8);
  return (
    <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="Návštěvníci po dnech">
      {osa.map((v) => <g key={v}><line x1={L} x2={R} y1={y(v)} y2={y(v)} stroke="#EEF0F6" /><text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={B.muted}>{v}</text></g>)}
      {graf.map((g, k) => (k % kazdy === 0 || k === graf.length - 1) && <text key={g.den} x={x(k)} y={200} textAnchor="middle" fontSize={11} fill={B.muted}>{kratkyDen(g.den)}</text>)}
      {udalosti.map((u, k) => { const idx = graf.findIndex((g) => g.den === u.den); if (idx < 0) return null; return <g key={k}><line x1={x(idx)} x2={x(idx)} y1={T} y2={Bo} stroke={B.sedy} strokeDasharray="3 3" /><text x={x(idx) + 5} y={T + 10 + k * 13} fontSize={11} fill="#33405F" fontWeight={700}>{u.text}</text></g>; })}
      <polyline points={graf.map((g, k) => `${x(k)},${y(g.navstevniciPred)}`).join(" ")} fill="none" stroke="#A0A8BD" strokeWidth={2} strokeDasharray="5 4" />
      <polyline points={graf.map((g, k) => `${x(k)},${y(g.navstevnici)}`).join(" ")} fill="none" stroke={B.s1} strokeWidth={2} strokeLinejoin="round" />
      {graf.length <= 31 && graf.map((g, k) => <circle key={g.den} cx={x(k)} cy={y(g.navstevnici)} r={3.5} fill={B.s1} stroke="#fcfcfb" strokeWidth={2} />)}
      {i !== null && <line x1={x(i)} x2={x(i)} y1={T} y2={Bo} stroke={B.navy} strokeOpacity={0.25} />}
      <rect x={L} y={T} width={R - L} height={Bo - T} fill="transparent"
        onMouseMove={(e) => { const r = svg.current!.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; const k = Math.max(0, Math.min(graf.length - 1, Math.round(((px - L) / (R - L)) * (graf.length - 1)))); setI(k); ukaz(e, `<b>${kratkyDen(graf[k].den)}</b><br>Návštěvníci: <b>${graf[k].navstevnici}</b><br>Předchozí období: ${graf[k].navstevniciPred}`); }}
        onMouseLeave={() => { setI(null); skryj(); }} />
    </svg>
  );
}

function GrafUctu({ graf }: { graf: Data["graf"] }) {
  const W = 640, L = 36, R = 628, T = 14, Bo = 92;
  const max = Math.max(2, ...graf.map((g) => g.ucty)), sirka = (R - L) / graf.length, bw = Math.max(3, Math.min(36, sirka - 6));
  const kazdy = Math.ceil(graf.length / 8);
  return (
    <svg viewBox={`0 0 ${W} 120`} className="w-full h-auto block" role="img" aria-label="Nové účty po dnech">
      <line x1={L} x2={R} y1={Bo} y2={Bo} stroke="#E4E6EF" />
      <text x={L - 8} y={T + 4} textAnchor="end" fontSize={11} fill={B.muted}>{max}</text>
      {graf.map((g, k) => {
        const cx = L + sirka * (k + 0.5), h = g.ucty ? Math.max(4, (g.ucty / max) * (Bo - T)) : 0;
        return (
          <g key={g.den}>
            {h > 0 && <path d={`M${cx - bw / 2},${Bo} v${-h + 4} q0,-4 4,-4 h${bw - 8} q4,0 4,4 v${h - 4} z`} fill={B.s1} />}
            {g.ucty > 0 && graf.length <= 31 && <text x={cx} y={Bo - h - 5} textAnchor="middle" fontSize={11} fill="#33405F" fontWeight={700}>{g.ucty}</text>}
            {(k % kazdy === 0 || k === graf.length - 1) && <text x={cx} y={112} textAnchor="middle" fontSize={11} fill={B.muted}>{kratkyDen(g.den)}</text>}
            <rect x={cx - sirka / 2} y={T} width={sirka} height={Bo - T} fill="transparent" onMouseMove={(e) => ukaz(e, `<b>${kratkyDen(g.den)}</b><br>Nové účty: <b>${g.ucty}</b>`)} onMouseLeave={skryj} />
          </g>
        );
      })}
    </svg>
  );
}

const BARVY = [B.s1, B.s2, B.s3];
function TrychtyrZdroju({ data }: { data: Data["trychtyrZdroju"] }) {
  const kroky = ["Návštěva", "Klik na registraci", "Účet", "Trénoval", "Platí"];
  const L = 120, R = 460, rowH = 14 + data.length * 12;
  return (
    <>
      <div className="flex gap-3.5 flex-wrap text-xs mb-2" style={{ color: B.sedy }}>
        {data.map((z, i) => <span key={z.zdroj} className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: BARVY[i] }} />{z.zdroj}</span>)}
      </div>
      <svg viewBox={`0 0 520 ${kroky.length * rowH + 6}`} className="w-full h-auto block" role="img" aria-label="Trychtýř podle zdroje">
        {kroky.map((k, ki) => (
          <g key={k}>
            <text x={0} y={ki * rowH + 16} fontSize={12} fill="#33405F" fontWeight={600}>{k}</text>
            {data.map((z, zi) => {
              const v = z.kroky[ki], w = Math.max(2, (v / 100) * (R - L)), y = ki * rowH + 6 + zi * 12;
              return (
                <g key={z.zdroj} onMouseMove={(e) => ukaz(e, `<b>${z.zdroj}</b><br>${k}: <b>${String(v).replace(".", ",")} %</b> návštěvníků`)} onMouseLeave={skryj}>
                  <rect x={L} y={y} width={w} height={10} rx={3} fill={BARVY[zi]} />
                  <text x={L + w + 6} y={y + 9} fontSize={10.5} fill="#33405F" fontWeight={700}>{String(v).replace(".", ",")} %</text>
                  <rect x={L} y={y - 1} width={R - L + 50} height={12} fill="transparent" />
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </>
  );
}

function Pruhy({ polozky, max = 100, popis }: { polozky: { nazev: string; hodnota: number; text: string; tip: string }[]; max?: number; popis: string }) {
  return (
    <div className="flex flex-col gap-2" role="img" aria-label={popis}>
      {polozky.map((p) => (
        <div key={p.nazev} className="grid grid-cols-[minmax(0,150px)_minmax(0,1fr)_64px] gap-2.5 items-center text-[13px]" onMouseMove={(e) => ukaz(e, p.tip)} onMouseLeave={skryj}>
          <span className="truncate font-semibold" style={{ color: "#33405F" }}>{p.nazev}</span>
          <span className="h-4 rounded" style={{ background: "#F0F2F7" }}><span className="block h-full rounded" style={{ width: `${Math.max(p.hodnota ? 1.5 : 0, (p.hodnota / max) * 100)}%`, background: B.s1 }} /></span>
          <b className="tabular-nums text-right" style={{ color: B.navy }}>{p.text}</b>
        </div>
      ))}
    </div>
  );
}

function stahniCsv(nazev: string, radky: (string | number | null)[][]) {
  const csv = "﻿" + radky.map((r) => r.map((c) => (c === null ? "" : `"${String(c).replace(/"/g, '""')}"`)).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = nazev; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export default function AnalytikaPage() {
  const [dni, setDni] = useState(7);
  const [trida, setTrida] = useState("");
  const [zdroj, setZdroj] = useState("");
  const [zarizeni, setZarizeni] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);
  const [nacita, setNacita] = useState(true);
  const [verze, setVerze] = useState(0);
  const tipRef = useRef<HTMLDivElement>(null);
  useEffect(() => { Tip.el = tipRef.current; }, []);

  useEffect(() => {
    let zruseno = false;
    setNacita(true); // eslint-disable-line react-hooks/set-state-in-effect
    const q = new URLSearchParams({ dni: String(dni), ...(trida ? { trida } : {}), ...(zdroj ? { zdroj } : {}), ...(zarizeni ? { zarizeni } : {}) });
    api<Data>(`/api/admin/analytika?${q}`).then((r) => { if (zruseno) return; setNacita(false); if (r.data) { setData(r.data); setChyba(null); } else setChyba(r.chyba ?? "Chyba"); });
    return () => { zruseno = true; };
  }, [dni, trida, zdroj, zarizeni, verze]);

  // ── útrata za reklamu a poznámka ──
  const [ut, setUt] = useState({ den: dnesStr(), zdroj: "", castka: "", kliky: "" });
  const [pz, setPz] = useState({ den: dnesStr(), text: "" });
  const [ukladam, setUkladam] = useState<string | null>(null);
  const uloz = useCallback(async (telo: Record<string, unknown>, co: string) => {
    setUkladam(co);
    const r = await api<{ ok: boolean }>("/api/admin/analytika", { method: "POST", body: JSON.stringify(telo) });
    setUkladam(r.chyba ? `Chyba: ${r.chyba}` : "Uloženo ✓");
    if (!r.chyba) setVerze((v) => v + 1);
    setTimeout(() => setUkladam(null), 2500);
  }, []);

  const p = data?.prehled;
  const obdobi = dni === 1 ? "dnes" : `${dni} dní`;
  const sumTr = (k: Data["trychtyr"][number]) => k.mobil + k.pocitac + k.nezname;
  const maxTr = data ? Math.max(1, sumTr(data.trychtyr[0])) : 1;
  const zdrojeFiltr = useMemo(() => data?.zdrojeProFiltr ?? [], [data]);

  const filtrBtn = (on: boolean) => (on ? { background: B.navy, color: "#fff" } : { background: "#fff", color: B.navy, border: `1px solid ${B.cara}` });
  const vyber = "rounded-xl px-3 py-1.5 text-sm font-bold bg-white";

  return (
    <div className="flex flex-col gap-5 max-w-6xl mx-auto w-full mm-siroke pb-10" data-testid="analytika">
      <div ref={tipRef} className="fixed pointer-events-none z-50 hidden rounded-xl px-2.5 py-2 text-xs leading-snug text-white shadow-lg" style={{ background: B.navy }} />

      <div className="flex flex-col gap-1">
        <Link href="/admin" className="text-sm font-semibold mm-odkaz" style={{ color: "#4741B8" }}>← Admin</Link>
        <h1 className="text-[26px] font-extrabold" style={{ color: B.navy }}>Analytika</h1>
        <p className="text-sm max-w-3xl" style={{ color: B.sedy }}>Odkud lidé přicházejí, kde odpadají, jestli se vracejí a co vydělává. Srovnání je vždy s předchozím stejně dlouhým obdobím. Živé dění a detail dne najdeš ve <Link href="/admin/navstevnost" className="font-bold mm-odkaz" style={{ color: "#4741B8" }}>Statistikách</Link>.</p>
      </div>

      {/* Filtry */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 flex gap-2 flex-wrap items-center border-b" style={{ background: "rgba(244,245,250,.94)", backdropFilter: "blur(6px)", borderColor: B.cara }} data-testid="analytika-filtry">
        <span className="inline-flex gap-1 flex-wrap">
          {[[1, "Dnes"], [7, "7 dní"], [30, "30 dní"], [90, "90 dní"]].map(([d, t]) => <button key={d} type="button" onClick={() => setDni(d as number)} className="px-3 py-1.5 rounded-full text-sm font-bold" style={filtrBtn(dni === d)}>{t}</button>)}
        </span>
        <select value={trida} onChange={(e) => setTrida(e.target.value)} className={vyber} style={{ border: `1px solid ${B.cara}`, color: B.navy }} aria-label="Třída"><option value="">Obě třídy</option><option value="9">9. třída</option><option value="5">5. třída</option></select>
        <select value={zdroj} onChange={(e) => setZdroj(e.target.value)} className={`${vyber} max-w-[220px]`} style={{ border: `1px solid ${B.cara}`, color: B.navy }} aria-label="Zdroj"><option value="">Všechny zdroje</option>{zdrojeFiltr.map((z) => <option key={z} value={z}>{z}</option>)}</select>
        <select value={zarizeni} onChange={(e) => setZarizeni(e.target.value)} className={vyber} style={{ border: `1px solid ${B.cara}`, color: B.navy }} aria-label="Zařízení"><option value="">Mobil i počítač</option><option value="mobil">Mobil</option><option value="pocitac">Počítač</option></select>
        {nacita && <span className="text-xs font-bold" style={{ color: B.muted }}>Načítám…</span>}
        {data && <button type="button" className="ml-auto rounded-xl px-3 py-1.5 text-sm font-bold bg-white" style={{ border: `1px solid ${B.cara}`, color: B.navy }} onClick={() => stahniCsv(`matemax-analytika-${dnesStr()}.csv`, [
          ["Zdroj", "Útrata Kč", "Kliky", "Návštěvníci", "Klik na registraci", "Odeslali registraci", "Nové účty", "Cena za účet", "Potvrdili", "Trénovali", "3+ dny", "Platí", "Příjem Kč/měs."],
          ...data.kampane.map((k) => [k.zdroj, k.utrata, k.kliky, k.navstevnici, k.klikRegistrace, k.odeslali, k.ucty, k.cenaZaUcet, k.potvrdili, k.trenovali, k.jadro, k.platici, k.prijem]),
          [], ["Krok trychtýře", "Mobil", "Počítač", "Neznámé"], ...data.trychtyr.map((t) => [t.krok, t.mobil, t.pocitac, t.nezname]),
        ])}>⬇ Export CSV</button>}
      </div>

      {chyba && <p className="mm-karta p-4 text-sm" style={{ color: B.bad }}>{chyba}</p>}
      {!data && !chyba && <div className="skeleton rounded-2xl" style={{ height: 420 }} />}

      {data && p && (
        <>
          {/* 1 PŘEHLED */}
          <Sekce cislo={1} nadpis="Přehled" popis={`Za ${obdobi}, šipka = srovnání s předchozím obdobím.`} testid="analytika-prehled">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Dlazdice nadpis="Návštěvníci" hodnota={p.navstevnici.ted} delta={<Delta ted={p.navstevnici.ted} pred={p.navstevnici.pred} />} testid="kpi-navstevnici" />
              <Dlazdice nadpis="Nové účty" hodnota={p.noveUcty.ted} delta={<Delta ted={p.noveUcty.ted} pred={p.noveUcty.pred} />} testid="kpi-ucty" />
              <Dlazdice nadpis="Návštěva → účet" hodnota={p.konverze.ted === null ? "–" : (p.konverze.ted * 100).toFixed(1).replace(".", ",")} jednotka={p.konverze.ted === null ? undefined : "%"} delta={<Delta ted={p.konverze.ted === null ? null : Math.round(p.konverze.ted * 1000) / 10} pred={p.konverze.pred === null ? null : Math.round(p.konverze.pred * 1000) / 10} procenta={false} jednotka=" b." />} />
              <Dlazdice nadpis={dni === 1 ? "Trénovali dnes" : "Trénovali v období"} hodnota={p.trenovali.ted} delta={<Delta ted={p.trenovali.ted} pred={p.trenovali.pred} />} pozn="aspoň 1 dokončený trénink" />
              <Dlazdice nadpis="Trénují 3+ dny v týdnu" hodnota={p.jadro.ted} delta={<Delta ted={p.jadro.ted} pred={p.jadro.pred} procenta={false} />} pozn="posledních 7 dní, jádro přípravy" />
              <Dlazdice nadpis="Platící Premium" hodnota={p.platici.ted} delta={<Delta ted={p.platici.ted} pred={p.platici.pred} procenta={false} />} pozn={p.stripe ? "aktivní předplatné ve Stripe" : "z appky (Stripe nedostupný)"} />
              <Dlazdice nadpis="Měsíční příjem z Premium" hodnota={p.prijemMesicne.ted === null ? "–" : p.prijemMesicne.ted.toLocaleString("cs-CZ")} jednotka={p.prijemMesicne.ted === null ? undefined : "Kč"} delta={<Delta ted={p.prijemMesicne.ted} pred={p.prijemMesicne.pred} procenta={false} jednotka=" Kč" />} pozn="ze Stripe, po zrušeních" />
              <Dlazdice nadpis="Cena za nového žáka z reklamy" hodnota={p.cenaZaUcet.ted === null ? "–" : p.cenaZaUcet.ted.toLocaleString("cs-CZ")} jednotka={p.cenaZaUcet.ted === null ? undefined : "Kč"} delta={<Delta ted={p.cenaZaUcet.ted} pred={p.cenaZaUcet.pred} procenta={false} inverze jednotka=" Kč" />} pozn={p.cenaZaUcet.utrata ? `útrata ${kc(p.cenaZaUcet.utrata)} ÷ ${p.cenaZaUcet.uctu} účtů` : "zadej útratu v části Reklama a zdroje"} testid="kpi-cena-za-ucet" />
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
              <div className="mm-karta p-4 min-w-0">
                <div className="flex justify-between items-baseline gap-2 flex-wrap mb-1"><b className="text-sm" style={{ color: B.navy }}>Návštěvníci po dnech</b><span className="text-xs" style={{ color: B.muted }}>čárkovaně předchozí období · svislé značky = reklamy a poznámky</span></div>
                <GrafNavstev graf={data.graf} udalosti={data.udalosti} />
                <b className="text-sm block mt-2" style={{ color: B.navy }}>Nové účty po dnech</b>
                <GrafUctu graf={data.graf} />
              </div>
              <div className="mm-karta p-4 flex flex-col gap-2.5 min-w-0" data-testid="analytika-upozorneni">
                <div className="flex justify-between items-baseline"><b className="text-sm" style={{ color: B.navy }}>Upozornění</b><span className="text-xs" style={{ color: B.muted }}>hlídá se samo</span></div>
                {data.upozorneni.length === 0 && <p className="text-sm" style={{ color: B.muted }}>Nic, co by teď chtělo pozornost.</p>}
                {data.upozorneni.map((u, i) => (
                  <div key={i} className="rounded-xl px-3 py-2.5 text-[13px] leading-snug flex gap-2" style={{ background: u.uroven === "spatne" ? "#FDE7E8" : u.uroven === "pozor" ? "#FFF3D6" : "#E3F5EA" }}>
                    <span aria-hidden="true">{u.uroven === "spatne" ? "⛔" : u.uroven === "pozor" ? "⚠️" : "✅"}</span>
                    <span><b className="block" style={{ color: B.navy }}>{u.nadpis}</b><span style={{ color: "#33405F" }}>{u.text}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </Sekce>

          {/* 2 REKLAMA A ZDROJE */}
          <Sekce cislo={2} nadpis="Reklama a zdroje" popis="Co přinesl který zdroj, od návštěvy po platbu. Útratu a kliky z Meta zadáš níže." testid="analytika-kampane">
            <div className="mm-karta p-4 overflow-x-auto">
              <table className="w-full text-[13px] tabular-nums" style={{ color: "#33405F" }}>
                <thead><tr className="text-[11.5px]" style={{ color: B.muted }}>
                  {["Zdroj / kampaň", "Útrata", "Kliky (Meta)", "Návštěvníci", "Klik na registraci", "Odeslali registraci", "Nové účty", "Cena za účet", "Potvrdili", "Trénovali", "3+ dny", "Platí", "Příjem", "Návratnost"].map((h, i) => <th key={h} className={`py-1.5 px-2 font-bold whitespace-nowrap ${i ? "text-right" : "text-left"}`}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.kampane.length === 0 && <tr><td colSpan={14} className="py-3 text-center" style={{ color: B.muted }}>Za vybrané období žádná data.</td></tr>}
                  {data.kampane.map((k) => (
                    <tr key={k.zdroj} className="border-t" style={{ borderColor: "#F0F2F7", background: k.reklama ? "#F2F7FE" : undefined }}>
                      <td className="py-2 px-2 font-bold break-words" style={{ color: B.navy }}>{k.zdroj}{k.reklama && <span className="ml-1.5 text-[10.5px] font-extrabold px-1.5 py-0.5 rounded-full" style={{ background: "#E3F5EA", color: B.good }}>reklama</span>}</td>
                      <td className="py-2 px-2 text-right">{k.utrata ? kc(k.utrata) : "–"}</td>
                      <td className="py-2 px-2 text-right">{k.kliky || "–"}</td>
                      <td className="py-2 px-2 text-right">{k.navstevnici}</td>
                      <td className="py-2 px-2 text-right">{k.klikRegistrace}</td>
                      <td className="py-2 px-2 text-right">{k.odeslali}</td>
                      <td className="py-2 px-2 text-right font-extrabold" style={{ color: B.navy }}>{k.ucty}</td>
                      <td className="py-2 px-2 text-right font-bold">{k.cenaZaUcet !== null ? kc(k.cenaZaUcet) : "–"}</td>
                      <td className="py-2 px-2 text-right">{k.potvrdili}</td>
                      <td className="py-2 px-2 text-right">{k.trenovali}</td>
                      <td className="py-2 px-2 text-right">{k.jadro}</td>
                      <td className="py-2 px-2 text-right">{k.platici}</td>
                      <td className="py-2 px-2 text-right">{k.prijem ? `${kc(k.prijem)}/měs.` : "–"}</td>
                      <td className="py-2 px-2 text-right">{k.navratnost !== null ? pct(k.navratnost) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs mt-2" style={{ color: B.muted }}>Návštěvník patří zdroji, odkud ten den poprvé přišel. Účty podle zdroje uloženého při registraci (od 22. 11. 2026). 3+ dny = trénoval aspoň 3 různé dny v prvních 14 dnech. Návratnost = měsíční příjem od žáků z kampaně ÷ útrata (Premium se platí každý měsíc, takže se během přípravy násobí).</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="mm-karta p-4 min-w-0">
                <div className="flex justify-between items-baseline mb-2 gap-2 flex-wrap"><b className="text-sm" style={{ color: B.navy }}>Trychtýř podle zdroje</b><span className="text-xs" style={{ color: B.muted }}>podíl z návštěvníků zdroje (3 největší)</span></div>
                {data.trychtyrZdroju.length ? <TrychtyrZdroju data={data.trychtyrZdroju} /> : <p className="text-sm" style={{ color: B.muted }}>Zatím málo dat.</p>}
              </div>
              <div className="mm-karta p-4 flex flex-col gap-3 min-w-0" data-testid="analytika-utrata">
                <b className="text-sm" style={{ color: B.navy }}>Útrata za reklamu</b>
                <p className="text-xs" style={{ color: B.sedy }}>Jednou denně opiš z Meta (Správce reklam) útratu a kliky za včerejšek nebo dnešek. Zdroj vyber stejný, jaký je v tabulce (s parametry odkazu třeba „facebook · herni-system“).</p>
                <form className="grid grid-cols-2 gap-2 text-sm" onSubmit={(e) => { e.preventDefault(); void uloz({ akce: "utrata", den: ut.den, zdroj: ut.zdroj, castka: Number(ut.castka), kliky: Number(ut.kliky) }, "utrata"); }}>
                  <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: B.sedy }}>Den<input type="date" required value={ut.den} onChange={(e) => setUt({ ...ut, den: e.target.value })} className="rounded-lg px-2 py-1.5 text-sm font-semibold" style={{ border: `1px solid ${B.cara}`, color: B.navy }} /></label>
                  <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: B.sedy }}>Zdroj<input list="zdroje-utrata" required value={ut.zdroj} onChange={(e) => setUt({ ...ut, zdroj: e.target.value })} placeholder="facebook · herni-system" className="rounded-lg px-2 py-1.5 text-sm font-semibold" style={{ border: `1px solid ${B.cara}`, color: B.navy }} /></label>
                  <datalist id="zdroje-utrata">{zdrojeFiltr.map((z) => <option key={z} value={z} />)}</datalist>
                  <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: B.sedy }}>Útrata (Kč)<input type="number" min={0} inputMode="numeric" required value={ut.castka} onChange={(e) => setUt({ ...ut, castka: e.target.value })} className="rounded-lg px-2 py-1.5 text-sm font-semibold" style={{ border: `1px solid ${B.cara}`, color: B.navy }} /></label>
                  <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: B.sedy }}>Kliky na odkaz<input type="number" min={0} inputMode="numeric" value={ut.kliky} onChange={(e) => setUt({ ...ut, kliky: e.target.value })} className="rounded-lg px-2 py-1.5 text-sm font-semibold" style={{ border: `1px solid ${B.cara}`, color: B.navy }} /></label>
                  <button type="submit" className="col-span-2 rounded-xl py-2 font-extrabold mm-tlacitko" style={{ background: "#F5A623", color: B.navy }}>Uložit útratu</button>
                </form>
                {data.reklamaPoDnech.length > 0 && (
                  <table className="w-full text-[12.5px] tabular-nums" style={{ color: "#33405F" }}>
                    <thead><tr className="text-[11px]" style={{ color: B.muted }}>{["Den", "Útrata", "Kliky", "Návštěvníci", "Účty", "Cena za účet"].map((h, i) => <th key={h} className={`py-1 px-1.5 font-bold ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
                    <tbody>{data.reklamaPoDnech.map((r) => <tr key={r.den} className="border-t" style={{ borderColor: "#F0F2F7" }}><td className="py-1.5 px-1.5">{kratkyDen(r.den)}</td><td className="py-1.5 px-1.5 text-right">{kc(r.utrata)}</td><td className="py-1.5 px-1.5 text-right">{r.kliky || "–"}</td><td className="py-1.5 px-1.5 text-right">{r.navstevnici}</td><td className="py-1.5 px-1.5 text-right">{r.ucty}</td><td className="py-1.5 px-1.5 text-right font-bold">{r.cenaZaUcet !== null ? kc(r.cenaZaUcet) : "–"}</td></tr>)}</tbody>
                  </table>
                )}
                <form className="flex gap-2 flex-wrap items-end text-sm pt-2 border-t" style={{ borderColor: "#F0F2F7" }} onSubmit={(e) => { e.preventDefault(); void uloz({ akce: "poznamka", den: pz.den, text: pz.text }, "poznamka"); setPz({ ...pz, text: "" }); }}>
                  <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: B.sedy }}>Poznámka do grafu<input type="date" required value={pz.den} onChange={(e) => setPz({ ...pz, den: e.target.value })} className="rounded-lg px-2 py-1.5 text-sm font-semibold" style={{ border: `1px solid ${B.cara}`, color: B.navy }} /></label>
                  <input required maxLength={80} value={pz.text} onChange={(e) => setPz({ ...pz, text: e.target.value })} placeholder="např. Post o adventu" className="flex-1 min-w-[140px] rounded-lg px-2 py-1.5 text-sm font-semibold" style={{ border: `1px solid ${B.cara}`, color: B.navy }} />
                  <button type="submit" className="rounded-xl px-3 py-1.5 font-bold mm-obrys" style={{ color: B.navy }}>Přidat</button>
                </form>
                {ukladam && <span className="text-xs font-bold" style={{ color: ukladam.startsWith("Chyba") ? B.bad : B.good }}>{ukladam === "utrata" || ukladam === "poznamka" ? "Ukládám…" : ukladam}</span>}
              </div>
            </div>
          </Sekce>

          {/* 3 TRYCHTÝŘ */}
          <Sekce cislo={3} nadpis="Trychtýř: kde lidé odpadají" popis={`Za ${obdobi}. Číslo vpravo = kolik lidí, červeně ztráta proti předchozímu kroku.`} testid="analytika-trychtyr">
            <div className="mm-karta p-4">
              <div className="flex gap-3.5 text-xs mb-2.5" style={{ color: B.sedy }}><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: B.s1 }} />Mobil</span><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: B.s2 }} />Počítač</span><span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: "#C8CDDB" }} />Neznámé</span></div>
              <div className="flex flex-col gap-1">
                {data.trychtyr.map((t, i) => {
                  const c = sumTr(t), pred = i ? sumTr(data.trychtyr[i - 1]) : null;
                  const ztrata = pred ? Math.round((1 - c / pred) * 100) : null;
                  return (
                    <div key={t.krok} className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)_86px] sm:grid-cols-[200px_minmax(0,1fr)_110px] gap-2.5 items-center text-[13px] py-0.5" onMouseMove={(e) => ukaz(e, `<b>${t.krok}</b><br>Mobil: <b>${t.mobil}</b> · Počítač: <b>${t.pocitac}</b>${t.nezname ? ` · Neznámé: ${t.nezname}` : ""}${ztrata && ztrata > 0 ? `<br>Ztráta proti předchozímu kroku: ${ztrata} %` : ""}`)} onMouseLeave={skryj}>
                      <span style={{ color: "#33405F" }}>{t.krok}</span>
                      <span className="h-5 flex gap-0.5">
                        {[["mobil", B.s1], ["pocitac", B.s2], ["nezname", "#C8CDDB"]].map(([k, barva]) => { const v = t[k as "mobil"]; return v ? <i key={k} className="block h-full rounded" style={{ width: `${(v / maxTr) * 100}%`, minWidth: 3, background: barva }} /> : null; })}
                      </span>
                      <span className="text-right tabular-nums"><b style={{ color: B.navy }}>{c}</b>{ztrata !== null && ztrata > 0 && <span className="ml-1.5 text-[11.5px] font-bold" style={{ color: B.bad }}>−{ztrata} %</span>}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs mt-2" style={{ color: B.muted }}>Kroky do „Odeslali registraci“ jsou anonymní návštěvníci, od „Nové účty“ dál skutečné účty z období. Zaplatili = nová předplatná ve Stripe.</p>
            </div>
          </Sekce>

          {/* 4 AKTIVACE + 5 RETENCE */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Sekce cislo={4} nadpis="Aktivace nových žáků" popis={`${data.aktivace.uctu} nových účtů za ${obdobi}`} testid="analytika-aktivace">
              <div className="mm-karta p-4 flex flex-col gap-3">
                {data.aktivace.kroky.map((k) => (
                  <div key={k.krok} className="grid grid-cols-[minmax(0,1fr)_52px] gap-2.5 items-center text-[13px]">
                    <div><span style={{ color: "#33405F" }}>{k.krok}</span><div className="h-2 rounded-full mt-1.5" style={{ background: "#EEF0F6" }}><i className="block h-full rounded-full" style={{ width: `${k.podil ?? 0}%`, background: B.s1 }} /></div></div>
                    <b className="text-right tabular-nums" style={{ color: B.navy }}>{k.podil === null ? "–" : `${k.podil} %`}</b>
                  </div>
                ))}
                <p className="text-[12.5px]" style={{ color: B.sedy }}>Od registrace do prvního tréninku: <b>{data.aktivace.medianMinutDoTreninku === null ? "–" : data.aktivace.medianMinutDoTreninku < 120 ? `medián ${data.aktivace.medianMinutDoTreninku} min` : `medián ${Math.round(data.aktivace.medianMinutDoTreninku / 60)} h`}</b>.</p>
              </div>
            </Sekce>
            <Sekce cislo={5} nadpis="Retence: vracejí se?" popis="Podíl žáků, kteří po registraci zase přišli (trénink nebo čas v appce)" testid="analytika-retence">
              <div className="mm-karta p-4 overflow-x-auto">
                <table className="w-full text-[12.5px] tabular-nums" style={{ borderCollapse: "separate", borderSpacing: 3 }}>
                  <thead><tr className="text-[11px]" style={{ color: B.muted }}><th className="text-left font-bold">Registrace v týdnu od</th><th className="font-bold">Žáků</th><th className="font-bold">Den 1</th><th className="font-bold">Den 7–13</th><th className="font-bold">Den 14–20</th><th className="font-bold">Den 30–36</th></tr></thead>
                  <tbody>
                    {data.retence.map((r) => (
                      <tr key={r.tyden}>
                        <td className="font-bold" style={{ color: "#33405F" }}>{kratkyDen(r.tyden)}</td>
                        <td className="text-center" style={{ color: "#33405F" }}>{r.zaku}</td>
                        {r.hodnoty.map((h, i) => {
                          if (h === null) return <td key={i} className="text-center rounded-md py-1.5" style={{ border: "1px dashed #E4E6EF", color: "#C8CDDB" }}>·</td>;
                          const st = h >= 60 ? 5 : h >= 50 ? 4 : h >= 40 ? 3 : h >= 30 ? 2 : h >= 15 ? 1 : 0;
                          return <td key={i} className="text-center rounded-md py-1.5 font-bold" style={{ background: SKALA[st], color: st >= 4 ? "#fff" : B.navy }} title={`${h} %`}>{h} %</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs mt-2" style={{ color: B.muted }}>Tmavší = víc se jich vrátilo. Tečka = ještě neuplynulo. Prázdné týdny bez registrací mají 0 žáků.</p>
              </div>
            </Sekce>
          </div>

          {/* 6 ZAPOJENÍ */}
          <Sekce cislo={6} nadpis="Zapojení a herní systém" popis="Jestli appka baví a které části se doopravdy používají" testid="analytika-zapojeni">
            <div className="grid gap-3 sm:grid-cols-3">
              <Dlazdice nadpis="Minut v appce na aktivního žáka / týden" hodnota={data.zapojeni.ted.minutNaZaka ?? "–"} jednotka={data.zapojeni.ted.minutNaZaka === null ? undefined : "min"} delta={<Delta ted={data.zapojeni.ted.minutNaZaka} pred={data.zapojeni.pred.minutNaZaka} procenta={false} jednotka=" min" />} />
              <Dlazdice nadpis="Příkladů na aktivního žáka / týden" hodnota={data.zapojeni.ted.prikladuNaZaka ?? "–"} delta={<Delta ted={data.zapojeni.ted.prikladuNaZaka} pred={data.zapojeni.pred.prikladuNaZaka} procenta={false} />} />
              <Dlazdice nadpis="Úspěšnost odpovědí" hodnota={data.zapojeni.ted.uspesnost ?? "–"} jednotka={data.zapojeni.ted.uspesnost === null ? undefined : "%"} delta={<Delta ted={data.zapojeni.ted.uspesnost} pred={data.zapojeni.pred.uspesnost} procenta={false} jednotka=" b." />} />
            </div>
            <div className="mm-karta p-4">
              <div className="flex justify-between items-baseline mb-3 gap-2 flex-wrap"><b className="text-sm" style={{ color: B.navy }}>Kolik aktivních žáků použilo…</b><span className="text-xs" style={{ color: B.muted }}>podíl z {data.zapojeni.ted.aktivnich} žáků, kteří v období trénovali{data.zapojeni.funkceMeriOd ? ` · měří se od ${new Date(data.zapojeni.funkceMeriOd).toLocaleDateString("cs-CZ")}` : " · měří se od nasazení analytiky"}</span></div>
              <Pruhy popis="Použití herních funkcí" polozky={[...data.zapojeni.funkce].sort((a, b) => b.podil - a.podil).map((x) => ({ nazev: x.nazev, hodnota: x.podil, text: `${x.podil} %`, tip: `<b>${x.nazev}</b><br>${x.zaku} z ${data.zapojeni.ted.aktivnich} aktivních žáků` }))} />
            </div>
          </Sekce>

          {/* 7 PENÍZE + 8 OBSAH */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Sekce cislo={7} nadpis="Peníze" popis="Premium od zobrazení po platbu a zrušení" testid="analytika-penize">
              <div className="mm-karta p-4 flex flex-col gap-3">
                <Pruhy popis="Trychtýř Premium" max={Math.max(1, data.penize.otevreliPremium)} polozky={[
                  { nazev: "Otevřeli Premium", hodnota: data.penize.otevreliPremium, text: String(data.penize.otevreliPremium), tip: "Návštěvníci stránky Premium" },
                  { nazev: "Začali platit", hodnota: data.penize.zacaliPlatit, text: String(data.penize.zacaliPlatit), tip: "Klikli na platbu, otevřel se Stripe" },
                  { nazev: "Vrátili se bez platby", hodnota: data.penize.zavreliPlatbu, text: String(data.penize.zavreliPlatbu), tip: "Zavřeli platbu nebo neprošla karta (měří se od nasazení analytiky)" },
                  { nazev: "Zaplatili", hodnota: data.penize.zaplatili ?? 0, text: data.penize.zaplatili === null ? "–" : String(data.penize.zaplatili), tip: "Nová předplatná ve Stripe" },
                  { nazev: "Zrušili", hodnota: data.penize.zrusili ?? 0, text: data.penize.zrusili === null ? "–" : String(data.penize.zrusili), tip: "Zrušená předplatná ve Stripe" },
                ]} />
                <p className="text-[12.5px]" style={{ color: B.sedy }}>Teď platí <b>{data.penize.platici}</b>{data.penize.prijemMesicne !== null ? <>, měsíčně <b>{kc(data.penize.prijemMesicne)}</b></> : null}.</p>
              </div>
            </Sekce>
            <Sekce cislo={8} nadpis="Obsah: které úlohy dělají problém" testid="analytika-obsah">
              <div className="mm-karta p-4 overflow-x-auto">
                {data.obsah.odpovedi === 0 ? (
                  <p className="text-sm" style={{ color: B.muted }}>Výsledky jednotlivých úloh se měří od nasazení analytiky (23. 11. 2026). První data se ukážou po pár trénincích.</p>
                ) : (
                  <>
                    <table className="w-full text-[12.5px] tabular-nums" style={{ color: "#33405F" }}>
                      <thead><tr className="text-[11px]" style={{ color: B.muted }}>{["Úloha", "Pokusů", "Chybovost", "Přeskočeno", ""].map((h, i) => <th key={i} className={`py-1 px-1.5 font-bold ${i ? "text-right" : "text-left"}`}>{h}</th>)}</tr></thead>
                      <tbody>
                        {[...data.obsah.tezke.map((x) => ({ ...x, stitek: (x.chybovost ?? 0) >= 75 ? "projít klíč" : "moc těžká?", barva: (x.chybovost ?? 0) >= 75 ? "spatne" : "pozor" })), ...data.obsah.preskakovane.filter((x) => !data.obsah.tezke.some((t) => t.id === x.id)).map((x) => ({ ...x, stitek: "přeskakují", barva: "pozor" })), ...data.obsah.lehke.map((x) => ({ ...x, stitek: "moc lehká", barva: "ok" }))].slice(0, 16).map((x) => (
                          <tr key={x.id + x.stitek} className="border-t" style={{ borderColor: "#F0F2F7" }}>
                            <td className="py-1.5 px-1.5"><b style={{ color: B.navy }}>{x.id}</b> <span style={{ color: B.muted }}>{x.zadani}</span></td>
                            <td className="py-1.5 px-1.5 text-right">{x.pokusu}</td>
                            <td className="py-1.5 px-1.5 text-right">{x.chybovost === null ? "–" : `${x.chybovost} %`}</td>
                            <td className="py-1.5 px-1.5 text-right">{x.preskoceno}</td>
                            <td className="py-1.5 px-1.5 text-right"><span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap" style={x.barva === "spatne" ? { background: "#FDE7E8", color: B.bad } : x.barva === "pozor" ? { background: "#FFF3D6", color: B.warn } : { background: "#E3F5EA", color: B.good }}>{x.stitek}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-xs mt-2" style={{ color: B.muted }}>Za posledních 30 dní, {data.obsah.odpovedi.toLocaleString("cs-CZ")} odpovědí. Těžké = aspoň 5 pokusů a 60 % chyb, lehké = aspoň 10 pokusů a nejvýš 5 % chyb.</p>
                  </>
                )}
              </div>
            </Sekce>
          </div>

          {/* 9 REPORT A KVALITA DAT */}
          <Sekce cislo={9} nadpis="Týdenní report a kvalita dat" testid="analytika-report">
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="mm-karta p-4 text-[13.5px] leading-relaxed" style={{ color: "#33405F" }}>
                <b className="text-sm block mb-1.5" style={{ color: B.navy }}>{data.report ? `Report z ${new Date(data.report.kdy).toLocaleDateString("cs-CZ")} (každé pondělí v 7:00)` : "Shrnutí posledních 7 dní"}</b>
                <p className="whitespace-pre-line">{data.report?.text ?? data.shrnuti ?? "Přepni období na 7 dní, ukáže se shrnutí týdne."}</p>
              </div>
              <div className="mm-karta p-4 text-[13px] leading-relaxed" style={{ color: "#33405F" }}>
                <b className="text-sm block mb-1.5" style={{ color: B.navy }}>Na čem čísla stojí</b>
                ✓ Testovací účty ({data.kvalita.testovacichUctu}) a zařízení s volbou „Nepočítat“ se nepočítají.<br />
                ✓ Návštěvník = anonymní otisk zařízení na jeden den (bez cookies). Účty, tréninky a platby jsou přesné.<br />
                ✓ Zdroj se ukládá k účtu při registraci od 22. 11. 2026, výsledky úloh a herní funkce od 23. 11. 2026.<br />
                ✓ Data se načítají celá (dřív se statistiky uřezávaly na 1 000 záznamů).<br />
                ⚠ Kdo přijde z reklamy a zaregistruje se až jindy v jiném okně, počítá se jako „přímo“. U reklamy proto sleduj i celkový nárůst účtů proti předchozímu období.
              </div>
            </div>
          </Sekce>
        </>
      )}
    </div>
  );
}
