"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import type { PrehledObsahu, StavCerstvosti, RadekTematu } from "@/lib/obsah";

/** Obsah a odměny (jen pro admina): co v appce je, kolik toho je a kdy naposledy něco přibylo. */

const BARVA: Record<StavCerstvosti, { c: string; bg: string; text: string }> = {
  ok: { c: "#1F9D63", bg: "#E3F5EC", text: "v pořádku" },
  pozor: { c: "#C27A00", bg: "#FFF2DA", text: "blízko limitu" },
  zle: { c: "#D0453A", bg: "#FDE7E5", text: "po limitu" },
  ceka: { c: "#3E7BD6", bg: "#E5EEFC", text: "čeká na nasazení" },
};
const L = ["#9FD3B5", "#5FA8E8", "#2B4C9B"];
const datum = (d: string | null) => (d ? `${Number(d.slice(8, 10))}. ${Number(d.slice(5, 7))}. ${d.slice(0, 4)}` : "čeká");
const kdy = (dni: number | null) => (dni === null ? "bez zápisu" : dni === 0 ? "dnes" : dni === 1 ? "včera" : `před ${dni} dny`);
const cislo = (n: number) => n.toLocaleString("cs-CZ");

function TabulkaTemat({ nadpis, data }: { nadpis: string; data: PrehledObsahu["priklady"]["t9"] }) {
  const [otevrene, setOtevrene] = useState<string | null>(null);
  const max = Math.max(1, ...data.temata.map((t) => t.n));
  const nejmene = Math.min(...data.temata.map((t) => t.n));
  return (
    <div className="mm-karta p-4 min-w-0">
      <b className="text-[15px]" style={{ color: "#0D1B3E" }}>{nadpis} · {cislo(data.celkem)} úloh</b>
      <div className="overflow-x-auto mt-2">
        <table className="w-full text-sm tabular-nums" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr className="text-[11px] uppercase tracking-wider" style={{ color: "#5F6982" }}>
              <th className="text-left py-1.5 pr-2">Téma</th><th className="text-right px-2">Úloh</th><th className="text-left px-2">Úrovně 1 / 2 / 3</th><th className="text-right pl-2">Testové</th>
            </tr>
          </thead>
          <tbody>
            {data.temata.map((t: RadekTematu) => {
              const malo = t.dovednosti.filter((d) => d.n < 8).length;
              return [
                <tr key={t.tema} className="cursor-pointer" style={{ borderTop: "1px solid #E4E6EF" }} onClick={() => setOtevrene(otevrene === t.tema ? null : t.tema)} data-testid={`obsah-tema-${t.tema}`}>
                  <td className="py-1.5 pr-2" style={{ color: "#0D1B3E" }}>{otevrene === t.tema ? "▾" : "▸"} {t.nazev}{malo > 0 && <span className="ml-1.5 text-[11px] font-bold" style={{ color: "#C27A00" }}>{malo}× málo</span>}</td>
                  <td className="text-right px-2 font-bold" style={{ color: t.n === nejmene ? "#C27A00" : "#0D1B3E" }}>{t.n}</td>
                  <td className="px-2" style={{ width: 160 }}>
                    <div className="flex h-2.5 rounded-full overflow-hidden" style={{ width: `${Math.max(12, (t.n / max) * 100)}%`, background: "#E4E6EF" }} title={t.urovne.join(" / ")}>
                      {t.urovne.map((n, i) => <i key={i} style={{ width: `${(n / t.n) * 100}%`, background: L[i] }} />)}
                    </div>
                  </td>
                  <td className="text-right pl-2" style={{ color: "#33405F" }}>{t.testove}</td>
                </tr>,
                otevrene === t.tema && (
                  <tr key={t.tema + "-d"}><td colSpan={4} className="pb-2">
                    <div className="flex flex-wrap gap-1.5 pl-4">
                      {t.dovednosti.map((d) => (
                        <span key={d.klic} className="text-xs rounded-full px-2.5 py-1" style={d.n < 8 ? { background: "#FFF2DA", color: "#8A5600", fontWeight: 700 } : { border: "1px solid #E4E6EF", color: "#33405F" }}>{d.nazev} <b>{d.n}</b></span>
                      ))}
                    </div>
                    <p className="text-[11px] pl-4 mt-1" style={{ color: "#8A93AA" }}>Úrovně {t.urovne.join(" / ")} · oranžově dovednosti s méně než 8 úlohami</p>
                  </td></tr>
                ),
              ];
            })}
          </tbody>
          <tfoot>
            <tr className="font-extrabold" style={{ borderTop: "1px solid #E4E6EF", color: "#0D1B3E" }}>
              <td className="py-1.5">Celkem</td><td className="text-right px-2">{cislo(data.celkem)}</td><td className="px-2">{data.urovne.join(" / ")}</td><td className="text-right pl-2">{data.testove}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {data.druhy.map((d) => <span key={d.nazev} className="text-xs rounded-full px-2.5 py-1" style={{ border: "1px solid #E4E6EF", color: "#33405F" }}>{d.nazev} <b>{d.n}</b></span>)}
      </div>
    </div>
  );
}

export default function ObsahPage() {
  const [data, setData] = useState<PrehledObsahu | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  useEffect(() => {
    let zruseno = false;
    (async () => {
      if (!supabase) { setChyba("Supabase není dostupné."); return; }
      const { data: s } = await supabase.auth.getSession();
      if (!s.session) { setChyba("Přihlas se jako admin."); return; }
      const r = await fetch("/api/admin/obsah", { headers: { Authorization: `Bearer ${s.session.access_token}` } });
      const j = await r.json();
      if (zruseno) return;
      if (!r.ok) setChyba(j.error ?? "Chyba"); else setData(j);
    })();
    return () => { zruseno = true; };
  }, []);

  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto w-full mm-siroke" data-testid="obsah">
      <div>
        <Link href="/admin" className="text-sm font-semibold mm-odkaz" style={{ color: "#4741B8" }}>← Admin</Link>
        <h1 className="text-[26px] font-extrabold" style={{ color: "#0D1B3E" }}>Obsah a odměny</h1>
        <p className="text-sm" style={{ color: "#5F6982" }}>Co v appce je, kolik toho je a kdy naposledy něco přibylo. Počty se počítají samy z kódu, data novinek jsou z kroniky. Semafor ukazuje, kde už dlouho nic nevyšlo.</p>
      </div>

      {chyba && <p className="mm-karta p-4 text-sm" style={{ color: "#B4232F" }}>{chyba}</p>}
      {!data && !chyba && <div className="skeleton rounded-[20px]" style={{ height: 300 }} />}

      {data && (
        <>
          {!data.kronikaSedi && <p className="mm-karta p-4 text-sm" style={{ color: "#8A5600", background: "#FFF2DA" }}>Počty v kódu se liší od kroniky. Do kroniky chybí zápis o poslední novince.</p>}

          <section className="mm-karta p-4 flex flex-col gap-3">
            <div className="flex flex-wrap justify-between items-baseline gap-2">
              <b className="text-[17px]" style={{ color: "#0D1B3E" }}>Čerstvost</b>
              <span className="text-xs" style={{ color: "#5F6982" }}>Zelená do 80 % limitu, oranžová do limitu, červená po limitu. Po limitu navrhne kokpit úkol.</span>
            </div>
            <div className="grid gap-2.5 items-start" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
              {data.cerstvost.map((c) => {
                const b = BARVA[c.stav];
                const p = data.pocty;
                const pocet = c.oblast === "odmeny" ? p.odmeny5 + p.odmeny9 : c.oblast === "testy" ? p.cvicne_testy : p[c.oblast];
                return (
                  <div key={c.oblast} className="rounded-xl p-3 relative" style={{ border: "1px solid #E4E6EF", background: "#fff" }} data-testid={`obsah-semafor-${c.oblast}`} data-stav={c.stav}>
                    <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r" style={{ background: b.c }} />
                    <div className="flex justify-between items-center gap-2">
                      <b className="text-sm" style={{ color: "#0D1B3E" }}>{c.nazev}</b>
                      <span className="text-[11px] font-extrabold rounded-full px-2 py-0.5 whitespace-nowrap" style={{ color: b.c, background: b.bg }}>{c.stav === "ceka" ? b.text : kdy(c.dni)}</span>
                    </div>
                    <div className="text-[26px] font-extrabold tabular-nums leading-tight" style={{ color: "#0D1B3E" }}>{cislo(pocet ?? 0)}</div>
                    <div className="text-xs" style={{ color: "#5F6982" }}>
                      {c.posledni ? <>Naostro {datum(c.posledni.datum)}: {c.posledni.popis}</> : "Zatím bez zápisu."} · limit {c.limit} dní
                    </div>
                    {c.cekajici.length > 0 && <div className="text-xs mt-1 font-semibold" style={{ color: "#3E7BD6" }}>Čeká: {c.cekajici.map((z) => z.popis).join("; ")}</div>}
                  </div>
                );
              })}
              {data.dalsiSezona && (
                <div className="rounded-xl p-3" style={{ border: "1px solid #E4E6EF", background: "#fff" }}>
                  <div className="flex justify-between items-center gap-2"><b className="text-sm" style={{ color: "#0D1B3E" }}>Další sezóna</b><span className="text-[11px] font-extrabold rounded-full px-2 py-0.5" style={{ color: "#3E7BD6", background: "#E5EEFC" }}>za {data.dalsiSezona.dni} dní</span></div>
                  <div className="text-[26px] font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>{data.dalsiSezona.nazev}</div>
                  <div className="text-xs" style={{ color: "#5F6982" }}>Začíná {datum(data.dalsiSezona.datum)}</div>
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className="flex flex-wrap justify-between items-baseline gap-2">
              <b className="text-[17px]" style={{ color: "#0D1B3E" }}>Příklady podle témat</b>
              <span className="flex gap-3 text-xs" style={{ color: "#5F6982" }}>{["1. úroveň", "2. úroveň", "3. úroveň"].map((t, i) => <span key={t} className="inline-flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: L[i] }} />{t}</span>)}</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <TabulkaTemat nadpis="9. třída" data={data.priklady.t9} />
              <TabulkaTemat nadpis="5. třída" data={data.priklady.t5} />
            </div>
            <p className="text-xs" style={{ color: "#8A93AA" }}>Klikni na téma: ukáže dovednosti a kolik mají úloh.</p>
          </section>

          <section className="mm-karta p-4 flex flex-col gap-3">
            <div className="flex flex-wrap justify-between items-baseline gap-2">
              <b className="text-[17px]" style={{ color: "#0D1B3E" }}>Odměny</b>
              <span className="text-xs" style={{ color: "#5F6982" }}>Páťáci {data.odmeny.t5} · deváťáci {data.odmeny.t9}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm tabular-nums" style={{ borderCollapse: "collapse" }}>
                <thead><tr className="text-[11px] uppercase tracking-wider" style={{ color: "#5F6982" }}><th className="text-left py-1.5">Druh</th><th className="text-right px-2">5. třída</th><th className="text-right pl-2">9. třída</th></tr></thead>
                <tbody>
                  {data.odmeny.typy.map((t) => (
                    <tr key={t.typ} style={{ borderTop: "1px solid #E4E6EF", color: "#0D1B3E" }}><td className="py-1.5">{t.nazev}</td><td className="text-right px-2">{t.t5}</td><td className="text-right pl-2">{t.t9}</td></tr>
                  ))}
                </tbody>
                <tfoot><tr className="font-extrabold" style={{ borderTop: "1px solid #E4E6EF", color: "#0D1B3E" }}><td className="py-1.5">Celkem</td><td className="text-right px-2">{data.odmeny.t5}</td><td className="text-right pl-2">{data.odmeny.t9}</td></tr></tfoot>
              </table>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[["Truhly", data.odmeny.truhly], ["Trofeje", data.odmeny.trofeje], ["Sady", data.odmeny.sady], ["Legendární věci", data.odmeny.legendarni], ["Sezónní věci", data.odmeny.sezonni], ["Věci za XP úrovně", data.odmeny.zaUroven], ["Odznaky na profilu", data.odmeny.odznaky]].map(([k, n]) => (
                <span key={k} className="text-xs rounded-full px-2.5 py-1" style={{ border: "1px solid #E4E6EF", color: "#33405F" }}>{k} <b>{n}</b></span>
              ))}
            </div>
            <div className="text-xs" style={{ color: "#5F6982" }}>Cvičné testy: {data.testy.map((t) => t.nazev).join(" · ")}</div>
          </section>

          <section className="mm-karta p-4 flex flex-col gap-2">
            <b className="text-[17px]" style={{ color: "#0D1B3E" }}>Kronika novinek</b>
            <ul className="flex flex-col">
              {data.kronika.map((z, i) => {
                const b = z.datum ? null : BARVA.ceka;
                return (
                  <li key={i} className="grid gap-x-3 py-2 text-sm items-baseline" style={{ gridTemplateColumns: "92px 150px minmax(0,1fr)", borderTop: i ? "1px solid #E4E6EF" : undefined }}>
                    <b className="tabular-nums" style={{ color: b?.c ?? "#0D1B3E" }}>{datum(z.datum)}</b>
                    <span className="text-xs font-bold" style={{ color: "#5F6982" }}>{data.cerstvost.find((c) => c.oblast === z.oblast)?.nazev}</span>
                    <span style={{ color: "#33405F" }}>{z.popis}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          {data.navrhy.length > 0 && (
            <section className="mm-karta p-4 flex flex-col gap-2">
              <b className="text-[17px]" style={{ color: "#0D1B3E" }}>Kokpit navrhne úkoly</b>
              <p className="text-xs" style={{ color: "#5F6982" }}>Tyhle oblasti jsou po limitu. MS Dashboard si je stahuje a navrhne z nich úkoly.</p>
              <ul className="flex flex-col gap-2">
                {data.navrhy.map((n) => (
                  <li key={n.oblast} className="rounded-xl p-3 text-sm" style={{ border: "1px dashed #D9C9A3", background: "#FFFBF2" }}>
                    <b style={{ color: "#0D1B3E" }}>{n.title}</b> <span className="text-xs" style={{ color: "#5F6982" }}>· odhad {n.estimate_hours} h</span>
                    <p className="text-xs mt-1 whitespace-pre-line" style={{ color: "#33405F" }}>{n.description}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
