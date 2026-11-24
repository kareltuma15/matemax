"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { AnalytikaEmailu } from "@/lib/emaily/analytika";

/** Analytika e-mailů (mockup schválený Karlem 25. 11. 2026, docs/emaily-2026-11/analytika-emailu-mockup.html). */
const B = { navy: "#0D1B3E", sedy: "#5F6982", muted: "#8A93AA", cara: "#E4E6EF", s1: "#2a78d6", s2: "#9ec5f4", s3: "#cde2fb", good: "#14753A", bad: "#B4232F", warn: "#9A6200" };
const pct = (x: number | null) => (x === null ? "–" : `${Math.round(x * 100)} %`);

function Delta({ ted, pred, body = false }: { ted: number | null; pred: number | null; body?: boolean }) {
  if (ted === null || pred === null) return <span className="text-xs font-bold" style={{ color: B.muted }}>bez srovnání</span>;
  const r = body ? Math.round((ted - pred) * 100) : ted - pred;
  if (r === 0) return <span className="text-xs font-bold" style={{ color: B.muted }}>● beze změny</span>;
  return <span className="text-xs font-extrabold" style={{ color: r > 0 ? B.good : B.bad }}>{r > 0 ? "▲ +" : "▼ "}{r}{body ? " bodů" : ""} proti předchozímu období</span>;
}

function Dlazdice({ nadpis, hodnota, delta, pozn }: { nadpis: string; hodnota: string | number; delta?: React.ReactNode; pozn?: string }) {
  return (
    <div className="mm-karta p-3.5 flex flex-col gap-1 min-w-0">
      <span className="text-xs font-bold" style={{ color: B.sedy }}>{nadpis}</span>
      <span className="text-[26px] font-black tabular-nums leading-tight" style={{ color: B.navy }}>{hodnota}</span>
      {delta}
      {pozn && <span className="text-[11.5px]" style={{ color: B.muted }}>{pozn}</span>}
    </div>
  );
}

function GrafPoDnech({ data }: { data: AnalytikaEmailu["poDnech"] }) {
  const max = Math.max(4, ...data.map((d) => d.zak + d.servis + d.rodic));
  const strop = Math.ceil(max / 4) * 4;
  const W = 520, H = 170, L = 34, T = 14, vyska = H - T - 24, krok = (W - L - 6) / data.length;
  const y = (n: number) => T + vyska - (n / strop) * vyska;
  const kr = (d: string) => `${Number(d.slice(8, 10))}. ${Number(d.slice(5, 7))}.`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Odeslané e-maily po dnech">
      {[0, strop / 2, strop].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - 4} y1={y(v)} y2={y(v)} stroke={B.cara} strokeDasharray={v ? "3 4" : undefined} />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill={B.sedy}>{v}</text>
        </g>
      ))}
      {data.map((d, i) => {
        let zaklad = 0;
        return (
          <g key={d.den}>
            {([["zak", B.s1], ["servis", B.s2], ["rodic", B.s3]] as const).map(([k, barva]) => {
              const n = d[k]; if (!n) return null;
              const y1 = y(zaklad + n), y0 = y(zaklad); zaklad += n;
              return <rect key={k} x={L + 2 + i * krok} y={y1} width={Math.max(1, krok - 3)} height={y0 - y1} rx={2} fill={barva}><title>{`${kr(d.den)}: ${d.zak} žákům, ${d.servis} uvítání a servisní, ${d.rodic} rodičům`}</title></rect>;
            })}
          </g>
        );
      })}
      <text x={L + 2} y={H - 6} fontSize="11" fill={B.sedy}>{kr(data[0].den)}</text>
      <text x={W - 4} y={H - 6} fontSize="11" fill={B.sedy} textAnchor="end">{kr(data[data.length - 1].den)}</text>
    </svg>
  );
}

export default function Analytika() {
  const [dni, setDni] = useState<7 | 30 | 90>(30);
  const [a, setA] = useState<AnalytikaEmailu | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  useEffect(() => {
    let zruseno = false;
    (async () => {
      setA(null); setChyba(null);
      if (!supabase) return;
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) return;
      const r = await fetch(`/api/admin/emaily/analytika?dni=${dni}`, { headers: { Authorization: `Bearer ${s.session.access_token}` }, cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (zruseno) return;
      if (!r.ok) setChyba((j as { error?: string }).error ?? "Chyba");
      else setA(j as AnalytikaEmailu);
    })();
    return () => { zruseno = true; };
  }, [dni]);

  return (
    <section className="flex flex-col gap-4" data-testid="admin-emaily-analytika">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-black" style={{ color: B.navy }}>Jak fungují e-maily</h2>
        <div className="flex gap-1.5" role="group" aria-label="Období">
          {([7, 30, 90] as const).map((d) => (
            <button key={d} type="button" onClick={() => setDni(d)} className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ background: dni === d ? B.navy : "#fff", color: dni === d ? "#fff" : B.navy, border: `1px solid ${B.cara}` }}>{d} dní</button>
          ))}
        </div>
      </div>

      {chyba && <p className="text-sm" style={{ color: B.bad }}>{chyba}</p>}
      {!a && !chyba && <p className="text-sm" style={{ color: B.sedy }}>Počítám…</p>}
      {a && (
        <>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Dlazdice nadpis="Odesláno e-mailů" hodnota={a.souhrn.odeslano} delta={<Delta ted={a.souhrn.odeslano} pred={a.souhrn.odeslanoPred} />} pozn={`žákům ${a.souhrn.zakum} · rodičům a plátcům ${a.souhrn.rodicum}`} />
            <Dlazdice nadpis="Prokliky do appky" hodnota={a.souhrn.prokliky} delta={<Delta ted={a.souhrn.prokliky} pred={a.souhrn.proklikyPred} />} pozn="lidé, kteří přišli přes tlačítko v e-mailu" />
            <Dlazdice nadpis="Vrátili se k tréninku do 2 dnů" hodnota={pct(a.souhrn.navrat)} delta={<Delta ted={a.souhrn.navrat} pred={a.souhrn.navratPred} body />} pozn="z žáků, kterým přišla připomínka" />
            <Dlazdice nadpis="Odhlášeno" hodnota={a.souhrn.odhlaseno} pozn={`připomínky ${a.souhrn.odhlasenoZak} · týdenní report ${a.souhrn.odhlasenoReport}${a.souhrn.prijemcu ? ` · ${(a.souhrn.odhlaseno / a.souhrn.prijemcu * 100).toFixed(1).replace(".", ",")} % příjemců` : ""}`} />
          </div>

          {a.postreh && (
            <div className="mm-karta p-4 text-sm" style={{ borderLeft: `4px solid ${B.good}`, color: B.navy }} data-testid="admin-emaily-postreh">{a.postreh}</div>
          )}

          <div className="mm-karta p-4 min-w-0">
            <b className="block mb-2" style={{ color: B.navy }}>Po jednotlivých e-mailech</b>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 680 }}>
                <thead>
                  <tr style={{ color: B.sedy }} className="text-xs">
                    <th className="text-left py-2 px-2">E-mail</th><th className="text-right px-2">Odesláno</th><th className="text-right px-2">Prokliky</th><th className="text-right px-2">Míra prokliku</th><th className="text-right px-2">Co e-mail způsobil</th><th className="text-right px-2">Odhlášeno</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {(["zak", "rodic"] as const).map((skupina) => (
                    <FragmentRadku key={skupina} nadpis={skupina === "zak" ? "Žákům" : "Rodičům a plátcům"} radky={a.radky.filter((r) => (skupina === "zak" ? r.druh !== "rodic" : r.druh === "rodic"))} />
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11.5px] mt-2" style={{ color: B.muted }}>„Co e-mail způsobil“: u žáků kolik příjemců mělo do 2 dnů od e-mailu trénink, u rodičů to, co má e-mail způsobit. Pomlčka = zatím nic neodešlo.</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="mm-karta p-4 min-w-0">
              <b className="block mb-2" style={{ color: B.navy }}>Odesláno po dnech</b>
              <GrafPoDnech data={a.poDnech} />
              <div className="flex gap-3 flex-wrap text-xs mt-1" style={{ color: B.sedy }}>
                {[["připomínky a novinky žákům", B.s1], ["uvítání a servisní", B.s2], ["rodičům", B.s3]].map(([t, c]) => <span key={t}><i className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5 align-[-1px]" style={{ background: c }} />{t}</span>)}
              </div>
            </div>
            <div className="mm-karta p-4 min-w-0">
              <b className="block mb-3" style={{ color: B.navy }}>Trychtýř připomínek</b>
              {([["Odesláno", a.trychtyr.odeslano, B.s1], ["Proklik do appky", a.trychtyr.proklik, B.s2], ["Trénink do 2 dnů", a.trychtyr.trenink, B.s3]] as const).map(([t, n, c]) => (
                <div key={t} className="grid items-center gap-2.5 mb-2.5 text-sm" style={{ gridTemplateColumns: "minmax(0,130px) 1fr 44px", color: B.navy }}>
                  <span>{t}</span>
                  <div className="h-6 rounded-lg" style={{ background: c, width: `${a.trychtyr.odeslano ? Math.max(2, Math.min(100, (n / a.trychtyr.odeslano) * 100)) : 2}%` }} />
                  <b className="text-right tabular-nums">{n}</b>
                </div>
              ))}
              <p className="text-[11.5px]" style={{ color: B.muted }}>Trénink může být vyšší než proklik: část žáků e-mail přečte a appku otevře sama.</p>
            </div>
          </div>

          <div className="mm-karta p-4" style={{ borderStyle: a.dorucitelnost.zapnuto ? "solid" : "dashed" }} data-testid="admin-emaily-dorucitelnost">
            <b className="block" style={{ color: B.navy }}>Doručitelnost{a.dorucitelnost.zapnuto ? "" : " (čeká na nastavení v Resendu)"}</b>
            <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4 mt-2.5">
              {([["Doručeno", a.dorucitelnost.doruceno], ["Nedoručeno", a.dorucitelnost.nedoruceno], ["Označeno jako spam", a.dorucitelnost.spam], ["Otevřeno", a.dorucitelnost.otevreno]] as const).map(([t, n]) => (
                <div key={t} className="rounded-xl px-3 py-2.5" style={{ border: `1px solid ${B.cara}` }}>
                  <span className="text-xs font-bold" style={{ color: B.sedy }}>{t}</span>
                  <b className="block text-xl tabular-nums" style={{ color: a.dorucitelnost.zapnuto ? B.navy : B.muted }}>{a.dorucitelnost.zapnuto ? n : "–"}</b>
                </div>
              ))}
            </div>
            <p className="text-[11.5px] mt-2" style={{ color: B.muted }}>Otevření je jen orientační: iPhony otevírají e-maily samy. Rozhodující je proklik a návrat k tréninku. Kdo e-mail označí jako spam, tomu už připomínky nechodí.</p>
          </div>
        </>
      )}
    </section>
  );
}

function FragmentRadku({ nadpis, radky }: { nadpis: string; radky: AnalytikaEmailu["radky"] }) {
  return (
    <>
      <tr><td colSpan={6} className="pt-3 pb-1 px-2 text-xs font-extrabold" style={{ color: B.muted }}>{nadpis}</td></tr>
      {radky.map((r) => (
        <tr key={r.id} style={{ borderTop: `1px solid ${B.cara}`, color: B.navy }}>
          <td className="py-2 px-2">{r.nazev}</td>
          <td className="text-right px-2">{r.odeslano}</td>
          <td className="text-right px-2">{r.prokliky === null || !r.odeslano ? "–" : r.prokliky}</td>
          <td className="text-right px-2">{r.prokliky === null || !r.odeslano ? "–" : `${Math.round((r.prokliky / r.odeslano) * 100)} %`}</td>
          <td className="text-right px-2">
            {r.cilPodil !== null && r.druh !== "rodic" ? (
              <span className="inline-flex items-center gap-2 justify-end">{pct(r.cilPodil)}<span className="block w-[80px] h-2 rounded" style={{ background: B.s3 }}><span className="block h-2 rounded" style={{ background: B.s1, width: `${Math.round(r.cilPodil * 100)}%` }} /></span></span>
            ) : r.cilText}
          </td>
          <td className="text-right px-2">{r.odhlaseno === null || !r.odeslano ? "–" : r.odhlaseno}</td>
        </tr>
      ))}
    </>
  );
}
