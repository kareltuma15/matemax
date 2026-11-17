"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { examples5 } from "@/data/examples";
import {
  sestavTest5, vyhodnotTest5, jeVyplnena, spravneCasti, bodyCasti, oznaceniCasti,
  TEST5_SEKUND, TEST5_MAX_BODU, TEST5_HISTORIE,
  type UlohaTestu, type CastTestu, type OdpovedCasti, type TypCasti,
} from "@/lib/cvicny-test-5";
import { supabase } from "@/lib/supabase";
import { trackEvent } from "@/lib/analytics";
import { localDateStr } from "@/lib/date";
import { usePremium } from "@/lib/premium";
import { FREE_TOPICS_5 } from "@/lib/subscription";
import { vzhledTematu } from "@/lib/barvy-temat";
import { TEMA_LABELS, type DBExample } from "@/types";
import MathText from "@/components/MathText";
import MathDisplay from "@/components/MathDisplay";
import TaskImageView from "@/components/TaskImageView";
import ConstructionMarkCard from "@/components/ConstructionMarkCard";

/**
 * Cvičný test pro 5. třídu: 14 úloh, 70 minut, 50 bodů jako u přijímaček na víceleté gymnázium.
 * Během testu žádná kontrola, body (i dílčí) a řešení až po odevzdání.
 * Rozpracovaný test přežije obnovení stránky (bez rýsování, to se kreslí znovu).
 */

const ROZPRACOVANY = "cvicny-test-5-rozpracovany";
const PISMENA = ["A", "B", "C", "D", "E", "F"];
const NAVY = "#0D1B3E";

export interface VysledekCvicnehoTestu5 { date: string; body: number; max: number; pct: number }

interface Ulozeny {
  start: number;
  ulohy: { cislo: number; nazev: string; casti: { id: string; body: number; typ: TypCasti }[] }[];
  odpovedi: Record<string, OdpovedCasti>;
}

function nactiRozpracovany(): { ulohy: UlohaTestu[]; odpovedi: Record<string, OdpovedCasti>; start: number } | null {
  try {
    const u = JSON.parse(localStorage.getItem(ROZPRACOVANY) ?? "null") as Ulozeny | null;
    // Čas vypršel, když stránka nebyla otevřená: test se po načtení sám odevzdá (do druhého dne, pak ho zahodíme).
    if (!u || Date.now() - u.start >= TEST5_SEKUND * 1000 + 24 * 3600 * 1000) return null;
    const podleId = new Map(examples5.map((e) => [e.id, e]));
    const ulohy = u.ulohy.map((x) => ({ ...x, casti: x.casti.flatMap((c) => { const ex = podleId.get(c.id); return ex ? [{ ex, body: c.body, typ: c.typ }] : []; }) }));
    // rýsování se po obnovení kreslí znovu
    const odpovedi = Object.fromEntries(Object.entries(u.odpovedi).filter(([, o]) => o.rys === undefined));
    return { ulohy, odpovedi, start: u.start };
  } catch { return null; }
}

function ulozRozpracovany(ulohy: UlohaTestu[], odpovedi: Record<string, OdpovedCasti>, start: number) {
  const data: Ulozeny = { start, odpovedi, ulohy: ulohy.map((u) => ({ cislo: u.cislo, nazev: u.nazev, casti: u.casti.map((c) => ({ id: c.ex.id, body: c.body, typ: c.typ })) })) };
  try { localStorage.setItem(ROZPRACOVANY, JSON.stringify(data)); } catch { /* soukromé okno */ }
}

function smazRozpracovany() { try { localStorage.removeItem(ROZPRACOVANY); } catch { /* nic */ } }

export function nactiHistorii5(): VysledekCvicnehoTestu5[] {
  try {
    const h = JSON.parse(localStorage.getItem(TEST5_HISTORIE) ?? "[]");
    return Array.isArray(h) ? h : [];
  } catch { return []; }
}

function formatCas(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

function bodu(n: number) { return n === 1 ? "bod" : n >= 2 && n <= 4 ? "body" : "bodů"; }

function Text({ ex, text }: { ex: DBExample; text: string }) {
  return ex.latex ? <MathDisplay tex={text} /> : <MathText text={text} />;
}

function Volba({ vybrano, onClick, children, testid }: { vybrano: boolean; onClick: () => void; children: React.ReactNode; testid?: string }) {
  return (
    <button type="button" onClick={onClick} data-testid={testid}
      className="mm-obrys rounded-xl px-3 py-2 text-sm font-bold border-2 transition-colors text-left"
      style={{ borderColor: vybrano ? NAVY : "#e2e8f0", background: vybrano ? NAVY : "#fff", color: vybrano ? "#fff" : NAVY }}>
      {children}
    </button>
  );
}

/** Jedna část úlohy během testu (bez kontroly). */
function CastVTestu({ c, oznaceni, odpoved, zmena }: { c: CastTestu; oznaceni: string; odpoved: OdpovedCasti | undefined; zmena: (o: OdpovedCasti) => void }) {
  const ex = c.ex;
  const volby = odpoved?.volby ?? [];
  const nastavVolbu = (i: number, v: number) => { const n = [...volby]; n[i] = v; zmena({ volby: n }); };
  const hlavicka = (
    <div className="flex items-center gap-2">
      <span className="min-w-8 h-7 px-2 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0" style={{ background: jeVyplnena(c, odpoved) ? "#2E6DA4" : "#94a3b8" }}>{oznaceni}</span>
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: vzhledTematu(ex.tema).tint, color: vzhledTematu(ex.tema).barva }}>{TEMA_LABELS[ex.tema] ?? ex.tema}</span>
      <span className="ml-auto text-[11px] font-bold text-slate-400">{c.body} {bodu(c.body)}</span>
    </div>
  );

  if (c.typ === "rys") {
    return (
      <div className="flex flex-col gap-2" data-testid={`cast-${oznaceni}`}>
        <div className="px-1">{hlavicka}</div>
        <ConstructionMarkCard example={ex} cardNumber={0} total={0} onResult={() => {}} vTestu={(ok) => zmena({ rys: ok })} />
      </div>
    );
  }

  return (
    <div className="mm-karta p-5 flex flex-col gap-3" data-testid={`cast-${oznaceni}`}>
      {hlavicka}
      {ex.image && <TaskImageView image={ex.image} />}
      <div className="text-base font-semibold leading-snug" style={{ color: "var(--text-primary)" }}><Text ex={ex} text={ex.zadani} /></div>

      {c.typ === "text" && (
        <input type="text" value={odpoved?.text ?? ""} onChange={(e) => zmena({ text: e.target.value })} placeholder="Tvůj výsledek" autoComplete="off"
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-base outline-none focus:border-blue-400 transition-colors" data-testid={`vstup-${oznaceni}`} />
      )}

      {c.typ === "AE" && (
        <div className="flex flex-col gap-2">
          {ex.moznosti!.map((m, i) => (
            <Volba key={i} vybrano={volby[0] === i} onClick={() => zmena({ volby: [i] })} testid={`moznost-${oznaceni}-${PISMENA[i]}`}>
              <span className="mr-2">{PISMENA[i]})</span><Text ex={ex} text={m} />
            </Volba>
          ))}
        </div>
      )}

      {c.typ === "AN" && (
        <div className="flex flex-col gap-2">
          {ex.tvrzeni!.map((t, i) => (
            <div key={i} className="rounded-xl p-3 flex flex-col gap-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              <div className="text-sm" style={{ color: "#334155" }}><span className="font-black mr-1">{i + 1}.</span><Text ex={ex} text={t.text} /></div>
              <div className="flex gap-2">
                <Volba vybrano={volby[i] === 0} onClick={() => nastavVolbu(i, 0)} testid={`an-${oznaceni}-${i + 1}-ano`}>ANO</Volba>
                <Volba vybrano={volby[i] === 1} onClick={() => nastavVolbu(i, 1)} testid={`an-${oznaceni}-${i + 1}-ne`}>NE</Volba>
              </div>
            </div>
          ))}
        </div>
      )}

      {c.typ === "AF" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-1" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            {ex.prirazeni!.nabidka.map((n, i) => (
              <div key={i} className="text-sm" style={{ color: "#334155" }}><span className="font-black mr-1">{PISMENA[i]})</span><Text ex={ex} text={n} /></div>
            ))}
          </div>
          {ex.prirazeni!.polozky.map((p, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="text-sm" style={{ color: "#334155" }}><span className="font-black mr-1">{i + 1}.</span><Text ex={ex} text={p.text} /></div>
              <div className="flex flex-wrap gap-1.5">
                {ex.prirazeni!.nabidka.map((_, j) => (
                  <Volba key={j} vybrano={volby[i] === j} onClick={() => nastavVolbu(i, j)} testid={`af-${oznaceni}-${i + 1}-${PISMENA[j]}`}>{PISMENA[j]}</Volba>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function tvojeOdpoved(c: CastTestu, o: OdpovedCasti | undefined): string {
  const v = o?.volby ?? [];
  if (c.typ === "text") return o?.text?.trim() || "bez odpovědi";
  if (c.typ === "rys") return o?.rys == null ? "nic neoznačeno" : "body neleží na správném místě";
  if (c.typ === "AE") return v[0] == null ? "bez odpovědi" : PISMENA[v[0]];
  if (c.typ === "AN") return c.ex.tvrzeni!.map((_, i) => `${i + 1} ${v[i] == null ? "?" : v[i] === 0 ? "ANO" : "NE"}`).join(", ");
  return c.ex.prirazeni!.polozky.map((_, i) => `${i + 1}–${v[i] == null ? "?" : PISMENA[v[i]!]}`).join(", ");
}

function spravnaOdpoved(c: CastTestu): string | null {
  if (c.typ === "text") return c.ex.odpoved;
  if (c.typ === "rys") return null;
  if (c.typ === "AE") return `${PISMENA[c.ex.spravna ?? 0]}) ${c.ex.moznosti![c.ex.spravna ?? 0]}`;
  if (c.typ === "AN") return c.ex.tvrzeni!.map((t, i) => `${i + 1} ${t.pravda ? "ANO" : "NE"}`).join(", ");
  return c.ex.prirazeni!.polozky.map((p, i) => `${i + 1}–${PISMENA[p.spravna]}`).join(", ");
}

function Rozbor({ c, oznaceni, odpoved }: { c: CastTestu; oznaceni: string; odpoved: OdpovedCasti | undefined }) {
  const [reseni, setReseni] = useState(false);
  const b = bodyCasti(c, odpoved);
  const { ok, z } = spravneCasti(c, odpoved);
  const kroky = c.typ === "rys" ? (c.ex.konstrukce_scena?.steps ?? []).map((s) => s.text) : c.ex.reseni_kroky;
  const spravne = spravnaOdpoved(c);
  return (
    <div className="border-b border-slate-100 pb-4 last:border-0 last:pb-0 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
        <span className="font-black" style={{ color: NAVY }}>{oznaceni}</span>
        <span>{TEMA_LABELS[c.ex.tema] ?? c.ex.tema}</span>
        <span className="ml-auto font-bold" style={{ color: b > 0 ? "#a16207" : "#dc2626" }}>{b} z {c.body} {bodu(c.body)}{z > 1 ? ` · správně ${ok} z ${z}` : ""}</span>
      </div>
      {c.typ !== "rys" && c.ex.image && <TaskImageView image={c.ex.image} />}
      <div className="text-sm font-semibold text-slate-800"><Text ex={c.ex} text={c.ex.zadani} /></div>
      <p className="text-sm" style={{ color: "#dc2626" }}>Tvoje odpověď: <strong>{tvojeOdpoved(c, odpoved)}</strong></p>
      {spravne && <p className="text-sm" style={{ color: "#16a34a" }}>Správně: <strong><Text ex={c.ex} text={spravne} /></strong></p>}
      {kroky.length > 0 && (
        reseni ? (
          <ol className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
            {kroky.map((k, i) => (
              <li key={i} className="flex gap-2 text-sm" style={{ color: "#334155" }}><span className="font-black shrink-0" style={{ color: "#2E6DA4" }}>{i + 1}.</span><span><Text ex={c.ex} text={k} /></span></li>
            ))}
          </ol>
        ) : (
          <button type="button" onClick={() => setReseni(true)} className="self-start text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: "#eef2ff", color: "#4338ca" }}>Ukázat řešení</button>
        )
      )}
    </div>
  );
}

export default function CvicnyTest5() {
  const { isPremium } = usePremium();
  const [faze, setFaze] = useState<"uvod" | "test" | "vysledky">("uvod");
  const [ulohy, setUlohy] = useState<UlohaTestu[]>([]);
  const [odpovedi, setOdpovedi] = useState<Record<string, OdpovedCasti>>({});
  const [start, setStart] = useState(0);
  const [zbyva, setZbyva] = useState(TEST5_SEKUND);
  const [vyprselo, setVyprselo] = useState(false);
  const [posledni, setPosledni] = useState<VysledekCvicnehoTestu5 | null>(null);
  const odevzdano = useRef(false);

  // Rozpracovaný test (obnovení stránky) a poslední výsledek
  useEffect(() => {
    const r = nactiRozpracovany();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- čtení z localStorage až po připojení
    if (r) { setUlohy(r.ulohy); setOdpovedi(r.odpovedi); setStart(r.start); setFaze("test"); }
    setPosledni(nactiHistorii5()[0] ?? null);
  }, []);

  const casti = useMemo(() => ulohy.flatMap((u) => u.casti.map((c, i) => ({ c, oznaceni: oznaceniCasti(u, i) }))), [ulohy]);
  const vyplneno = casti.filter(({ c }) => jeVyplnena(c, odpovedi[c.ex.id])).length;

  function spustit() {
    const nove = sestavTest5(examples5);
    const t = Date.now();
    odevzdano.current = false;
    setUlohy(nove); setOdpovedi({}); setStart(t); setZbyva(TEST5_SEKUND); setVyprselo(false); setFaze("test");
    ulozRozpracovany(nove, {}, t);
    window.scrollTo({ top: 0 });
  }

  function zmena(id: string, o: OdpovedCasti) {
    setOdpovedi((cur) => {
      const n = { ...cur, [id]: o };
      ulozRozpracovany(ulohy, n, start);
      return n;
    });
  }

  const odevzdat = useCallback((casVyprsel: boolean) => {
    if (odevzdano.current) return;
    odevzdano.current = true;
    const v = vyhodnotTest5(ulohy, odpovedi);
    const zaznam: VysledekCvicnehoTestu5 = { date: localDateStr(), body: v.body, max: v.max, pct: Math.round((v.body / v.max) * 100) };
    try { localStorage.setItem(TEST5_HISTORIE, JSON.stringify([zaznam, ...nactiHistorii5()].slice(0, 20))); } catch { /* nic */ }
    smazRozpracovany();
    setPosledni(zaznam);
    setVyprselo(casVyprsel);
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        trackEvent(data.session?.user.id ?? null, "cermat_test_dokoncen", {
          trida: 5, body: v.body, max: v.max, pct: zaznam.pct, timed_out: casVyprsel,
          minut: Math.round((Date.now() - start) / 60000),
        }).catch(() => {});
      });
    }
    setFaze("vysledky");
    window.scrollTo({ top: 0 });
  }, [ulohy, odpovedi, start]);

  useEffect(() => {
    if (faze !== "test") return;
    const tik = () => {
      const s = Math.max(0, TEST5_SEKUND - Math.floor((Date.now() - start) / 1000));
      setZbyva(s);
      if (s === 0) odevzdat(true);
    };
    tik();
    const id = setInterval(tik, 1000);
    return () => clearInterval(id);
  }, [faze, start, odevzdat]);

  // ── ÚVOD ──
  if (faze === "uvod") {
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full" data-testid="cvicny-test-5">
        <div className="rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1e3a6e 100%)" }}>
          <p className="text-4xl mb-3">⏱️</p>
          <h1 className="text-2xl font-black">Cvičný test na čas</h1>
          <p className="text-blue-200 text-sm mt-2 leading-relaxed">
            Stejný jako přijímačky na víceleté gymnázium: 14 úloh, 70 minut, 50 bodů. Výsledek a řešení uvidíš až po odevzdání.
          </p>
        </div>
        <div className="mm-karta p-5 flex flex-col gap-3">
          {[
            ["📝", "Úlohy 1–6 a 14: napíšeš jen výsledek. Některé mají dvě části, třeba 1.1 a 1.2."],
            ["📐", "Úloha 7: rýsování pravítkem a kružítkem přímo v appce."],
            ["✅", "Úloha 8: rozhodneš, jestli tvrzení platí (ANO, NE)."],
            ["🔤", "Úlohy 9–12: vybereš jednu odpověď z A–E. Úloha 13: přiřadíš odpovědi z nabídky A–F."],
            ["🧮", "Body dostaneš i za část úlohy. Za špatnou odpověď se nic neodečítá."],
            ["✏️", "Připrav si papír a tužku na výpočty, kalkulačka u přijímaček není povolená."],
          ].map(([ikona, text]) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-lg shrink-0">{ikona}</span>
              <p className="text-sm text-slate-700">{text}</p>
            </div>
          ))}
        </div>
        {posledni && <p className="text-sm text-center text-slate-500" data-testid="cvicny-test-5-posledni">Naposledy: {posledni.body} z {posledni.max} bodů ({posledni.date.split("-").reverse().map(Number).join(". ")})</p>}
        <button onClick={spustit} className="mm-tlacitko w-full py-4 text-white font-black rounded-2xl text-lg" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }} data-testid="cvicny-test-5-start">
          Spustit test (70 minut) →
        </button>
        <Link href="/testy" className="block text-center text-sm text-slate-400 hover:text-slate-600">← Zpět na testy</Link>
      </div>
    );
  }

  // ── VÝSLEDKY ──
  if (faze === "vysledky") {
    const v = vyhodnotTest5(ulohy, odpovedi);
    const pct = Math.round((v.body / v.max) * 100);
    const chybne = casti.filter(({ c }) => bodyCasti(c, odpovedi[c.ex.id]) < c.body);
    const nejslabsi = v.okruhy.find((o) => o.body < o.max);
    const dostupny = nejslabsi && (isPremium || FREE_TOPICS_5.has(nejslabsi.tema));
    return (
      <div className="flex flex-col gap-5 max-w-2xl mx-auto w-full" data-testid="cvicny-test-5-vysledky">
        <div className="rounded-2xl p-7 text-center text-white" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }}>
          <p className="text-5xl mb-2">{pct >= 80 ? "🏆" : pct >= 50 ? "💪" : "📚"}</p>
          <p className="text-5xl font-black" data-testid="cvicny-test-5-body">{v.body} <span className="text-2xl">z {v.max}</span></p>
          <p className="text-lg font-bold mt-1">{bodu(v.body)} · {pct} %</p>
          {vyprselo && <p className="text-yellow-300 text-xs mt-2">⏱ Čas vypršel, test se odevzdal sám.</p>}
        </div>

        <div className="mm-karta p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Body po úlohách</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {v.ulohy.map((u) => (
              <div key={u.cislo} className="rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-sm" data-testid={`uloha-body-${u.cislo}`}
                style={{ background: u.body === u.max ? "#f0fdf4" : u.body > 0 ? "#fffbeb" : "#fef2f2" }}>
                <span className="truncate"><span className="font-black mr-1">{u.cislo}.</span><span className="text-slate-600">{u.nazev}</span></span>
                <span className="font-black shrink-0" style={{ color: u.body === u.max ? "#16a34a" : u.body > 0 ? "#a16207" : "#dc2626" }}>{u.body}/{u.max}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mm-karta p-5">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Body po okruzích</p>
          <div className="flex flex-col gap-3">
            {v.okruhy.map((o) => {
              const p = Math.round((o.body / o.max) * 100);
              return (
                <div key={o.tema}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="font-semibold text-slate-700">{TEMA_LABELS[o.tema] ?? o.tema}</span>
                    <span className="text-xs font-bold text-slate-500">{o.body} z {o.max}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${p}%`, background: vzhledTematu(o.tema).barva }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {nejslabsi && (dostupny ? (
          <Link href={`/trenink?tema=${nejslabsi.tema}`} className="mm-tlacitko block w-full py-3.5 text-center font-black text-white rounded-xl" style={{ background: NAVY }} data-testid="cvicny-test-5-procvicit">
            Procvičit {TEMA_LABELS[nejslabsi.tema] ?? nejslabsi.tema} →
          </Link>
        ) : (
          <Link href="/premium" className="block w-full py-3 text-center font-bold text-sm rounded-xl" style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a" }}>
            Nejvíc bodů ti uteklo v okruhu {TEMA_LABELS[nejslabsi.tema] ?? nejslabsi.tema}. Ten je v Premium →
          </Link>
        ))}

        {chybne.length > 0 && (
          <div className="mm-karta p-5 flex flex-col gap-4">
            <h2 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Kde ti utekly body ({chybne.length})</h2>
            {chybne.map(({ c, oznaceni }) => <Rozbor key={c.ex.id} c={c} oznaceni={oznaceni} odpoved={odpovedi[c.ex.id]} />)}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button onClick={spustit} className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors">🔄 Nový test</button>
          <Link href="/testy" className="block text-center text-sm text-slate-400 hover:text-slate-600">← Zpět na testy</Link>
        </div>
      </div>
    );
  }

  // ── TEST ──
  const malo = zbyva < 10 * 60, minuta = zbyva < 60;
  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full" data-testid="cvicny-test-5-bezi">
      <div className="sticky top-0 z-30 rounded-2xl px-5 py-3 flex items-center justify-between"
        style={{ background: minuta ? "#fef2f2" : malo ? "#fff7ed" : NAVY, boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}>
        <div>
          <p className="text-xs font-bold" style={{ color: minuta ? "#dc2626" : malo ? "#c2410c" : "rgba(255,255,255,0.6)" }}>
            {minuta ? "⚠️ Méně než minuta!" : malo ? "⏱ Zbývá málo času" : "Cvičný test · 5. třída"}
          </p>
          <p className="text-sm font-semibold" style={{ color: minuta ? "#991b1b" : malo ? "#9a3412" : "rgba(255,255,255,0.75)" }} data-testid="cvicny-test-5-vyplneno">
            Vyplněno {vyplneno} z {casti.length}
          </p>
        </div>
        <div className="text-3xl font-black font-mono" style={{ color: minuta ? "#dc2626" : malo ? "#ea580c" : "#fff" }} data-testid="cvicny-test-5-cas">{formatCas(zbyva)}</div>
      </div>

      {ulohy.map((u) => (
        <section key={u.cislo} className="flex flex-col gap-3" data-testid={`uloha-${u.cislo}`}>
          <h2 className="text-sm font-black px-1" style={{ color: NAVY }}>
            Úloha {u.cislo} <span className="font-semibold text-slate-400">· {u.nazev} · {u.casti.reduce((s, c) => s + c.body, 0)} {bodu(u.casti.reduce((s, c) => s + c.body, 0))}</span>
          </h2>
          {u.casti.map((c, i) => (
            <CastVTestu key={c.ex.id} c={c} oznaceni={oznaceniCasti(u, i)} odpoved={odpovedi[c.ex.id]} zmena={(o) => zmena(c.ex.id, o)} />
          ))}
        </section>
      ))}

      <button onClick={() => odevzdat(false)} className="mm-tlacitko w-full py-4 text-white font-black rounded-2xl text-base" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #2E6DA4 100%)" }} data-testid="cvicny-test-5-odevzdat">
        {vyplneno === casti.length ? "Odevzdat test →" : `Odevzdat (vyplněno ${vyplneno} z ${casti.length})`}
      </button>
      <p className="text-center text-xs text-slate-400">Test se sám odevzdá, až vyprší čas. Celkem {TEST5_MAX_BODU} bodů.</p>
    </div>
  );
}
