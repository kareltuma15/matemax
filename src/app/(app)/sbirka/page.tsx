"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Hexik from "@/components/hexik/Hexik";
import DenniMise from "@/components/hexik/DenniMise";
import { loadProgress } from "@/lib/progress";
import { useTrida } from "@/lib/trida";
import { useSbirka } from "@/lib/use-sbirka";
import { localDateStr } from "@/lib/date";
import { spustEfekt, reaguj } from "@/lib/hexik-efekty";
import {
  ODMENY, TRUHLY, VZACNOST, TYP_NAZEV, IKONA_ODMENY, ANIMACE_OSLAVY, ETAPY_HEXIKA, DENNI_STROP,
  POJISTKA_VZACNA, krystaly, maOdmenu, nasazena, etapaHexika, dostupnostTruhly, otevriTruhlu,
  kupOdmenu, nasadOdmenu, upravSbirku, dnuTentoTyden, DNU_PRO_ZLATOU, doporuceniKOtevreni, TMAVE_VZHLEDY, ZA_MISI,
  type Odmena, type TypOdmeny, type TruhlaId, type VysledekTruhly, type SbirkaStav,
} from "@/lib/sbirka";
import type { Trida } from "@/types";

type Zalozka = "truhly" | "satnik";

function Krystal({ className = "" }: { className?: string }) {
  return <i className={`hx-krystal ${className}`} aria-hidden="true" />;
}

function Vizual({ o, velikost = 52 }: { o: Odmena; velikost?: number }) {
  if (o.typ === "podoba") return <Hexik podoba={o.klic} staticky style={{ width: velikost }} />;
  if (o.typ === "vzhled") return <span className="mm-swatch" data-vz={o.klic} style={{ width: velikost * 1.6, height: velikost }} aria-hidden="true"><i /><i /></span>;
  if (o.typ === "pozadi") return <span className="mm-banner mm-nahled block" data-pozadi={o.klic === "klasik" ? undefined : o.klic} style={{ width: velikost * 1.6, height: velikost }} aria-hidden="true" />;
  return <span style={{ fontSize: velikost * 0.62, lineHeight: 1 }} aria-hidden="true">{IKONA_ODMENY[o.klic] ?? "✨"}</span>;
}

function stavOdmeny(s: SbirkaStav, o: Odmena, trida: Trida) {
  if (nasazena(s, trida, o.typ).id === o.id) return "nasazeno" as const;
  if (maOdmenu(s, o)) return "mam" as const;
  if (o.cena === null) return "truhla" as const;
  return "koupit" as const;
}

export default function SbirkaPage() {
  return (
    <Suspense fallback={<div className="mm-karta h-64 animate-pulse" />}>
      <Sbirka />
    </Suspense>
  );
}

function Sbirka() {
  const { trida } = useTrida();
  const { stav, nacteno } = useSbirka();
  const params = useSearchParams();
  const [zalozka, setZalozka] = useState<Zalozka>(params.get("tab") === "satnik" ? "satnik" : "truhly");
  const [typ, setTyp] = useState<TypOdmeny>("podoba");
  const [vybrana, setVybrana] = useState<string | null>(null);
  const [otevirani, setOtevirani] = useState<{ id: TruhlaId; faze: "tres" | "hotovo"; vysledek: VysledekTruhly | null } | null>(null);
  const nahledRef = useRef<HTMLSpanElement>(null);
  const odhaleniRef = useRef<HTMLDivElement>(null);
  const den = localDateStr();
  // Série dní z prohlížeče (na serveru 0; vykresluje se až po načtení Sbírky)
  const [streak] = useState(() => loadProgress().streak);

  const etapa = etapaHexika(stav.maxOdhad[trida]);
  const etapaInfo = ETAPY_HEXIKA[etapa - 1];
  const dalsiEtapa = ETAPY_HEXIKA[etapa];
  const podoba = nasazena(stav, trida, "podoba");
  const dnesK = stav.dnes.d === den ? stav.dnes.k : 0;

  const seznam = ODMENY[trida].filter((o) => o.typ === typ);
  const vyb = (vybrana && seznam.find((o) => o.id === vybrana)) || nasazena(stav, trida, typ);
  const vybStav = stavOdmeny(stav, vyb, trida);
  const nahledPodoba = typ === "podoba" ? vyb.klic : podoba.klic;
  const pozadi = nasazena(stav, trida, "pozadi");
  const nahledPozadi = typ === "pozadi" ? vyb.klic : pozadi.klic;
  const nasazenyVzhled = nasazena(stav, trida, "vzhled").klic;
  const nahledVzhled = zalozka === "satnik" && typ === "vzhled" ? vyb.klic : nasazenyVzhled;

  // Vzhled appky se v šatníku zkouší naživo na celé appce; po odchodu ze záložky se vrátí nasazený.
  useEffect(() => {
    if (!nacteno || nahledVzhled === nasazenyVzhled) return;
    const d = document.documentElement;
    const nastav = (k: string) => {
      if (k === "klasik") { d.removeAttribute("data-vzhled"); d.removeAttribute("data-vzhled-tmavy"); return; }
      d.setAttribute("data-vzhled", k);
      if (TMAVE_VZHLEDY.has(k)) d.setAttribute("data-vzhled-tmavy", ""); else d.removeAttribute("data-vzhled-tmavy");
    };
    nastav(nahledVzhled);
    return () => nastav(nasazenyVzhled);
  }, [nahledVzhled, nasazenyVzhled, nacteno]);

  function predved(o: Odmena) {
    if (o.typ === "oslava") reaguj(nahledRef.current, ANIMACE_OSLAVY[o.klic] ?? "radost");
    else if (o.typ === "efekt") { reaguj(nahledRef.current, "jasot"); spustEfekt(o.klic, nahledRef.current, 1.2); }
    else reaguj(nahledRef.current, "jasot");
  }

  function akce() {
    if (vybStav === "koupit") {
      const ok = upravSbirku((s) => kupOdmenu(s, vyb.id));
      if (!ok) return;
    }
    upravSbirku((s) => nasadOdmenu(s, vyb.id));
    predved(vyb);
  }

  function otevri(id: TruhlaId) {
    setOtevirani({ id, faze: "tres", vysledek: null });
    window.setTimeout(() => {
      const vysledek = upravSbirku((s) => otevriTruhlu(s, id, trida, localDateStr()));
      setOtevirani({ id, faze: "hotovo", vysledek });
      if (vysledek) window.setTimeout(() => spustEfekt(vysledek.vz === "legenda" || vysledek.vz === "vzacna" ? "hvezdy" : "jiskry", odhaleniRef.current, vysledek.vz === "legenda" ? 2 : 1.2), 80);
    }, 700);
  }

  if (!nacteno) return <div className="mm-karta h-64 animate-pulse" />;

  return (
    <div className="flex flex-col gap-5" data-testid="sbirka">
      {/* Hlavička: Hexík, krystaly, etapa */}
      <section
        className="mm-banner rounded-3xl p-5 lg:p-7 text-white flex flex-col sm:flex-row gap-5 items-center"
        style={pozadi.klic === "klasik" ? { background: "linear-gradient(140deg,#1F2F66,#0D1B3E 70%)" } : undefined}
        data-pozadi={pozadi.klic === "klasik" ? undefined : pozadi.klic}
        data-testid="sbirka-hlavicka"
      >
        <Hexik podoba={podoba.klic} etapa={etapa} className="w-28 lg:w-36 shrink-0" />
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "#C9C7F5" }}>Tvůj Hexík · {etapaInfo.nazev}</p>
          <h1 className="text-3xl lg:text-4xl font-black mt-1 flex items-center gap-2 justify-center sm:justify-start" data-testid="sbirka-krystaly">
            <Krystal /> {krystaly(stav)} <span className="text-base font-bold" style={{ color: "#C9C7F5" }}>krystalů</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "#D9D8FE" }}>
            Dnes za učení {dnesK} z {DENNI_STROP}.{" "}
            {dalsiEtapa ? `Hexík povyroste na ${dalsiEtapa.nazev} od ${dalsiEtapa.od} bodů v odhadu.` : "Hexík je v nejvyšší podobě."}
          </p>
        </div>
        <Link href="/trenink" className="mm-tlacitko shrink-0 rounded-2xl px-5 py-3 font-extrabold text-white" style={{ background: "#F5A623", color: "#0D1B3E" }}>
          Trénovat
        </Link>
      </section>

      <div className="flex gap-2" role="tablist" aria-label="Sbírka">
        {(["truhly", "satnik"] as Zalozka[]).map((z) => (
          <button
            key={z}
            type="button"
            role="tab"
            aria-selected={zalozka === z}
            onClick={() => setZalozka(z)}
            className={`flex-1 sm:flex-none rounded-2xl px-5 py-2.5 font-extrabold ${zalozka === z ? "text-white" : "mm-obrys"}`}
            style={zalozka === z ? { background: "#0D1B3E" } : undefined}
            data-testid={`zalozka-${z}`}
          >
            {z === "truhly" ? "🎁 Truhly" : "👕 Šatník"}
          </button>
        ))}
      </div>

      {zalozka === "truhly" && (
        <section className="flex flex-col gap-3">
          <DenniMise streak={streak} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TRUHLY.map((t) => {
              const d = dostupnostTruhly(stav, t.id, den);
              const pct = (v: number) => `${Math.round(v * 100)} %`;
              const sance = (Object.keys(t.sance) as (keyof typeof t.sance)[]).filter((k) => t.sance[k] > 0);
              const zlataInfo = t.id === "zlata" ? ` · tento týden ${Math.min(dnuTentoTyden(stav, den), DNU_PRO_ZLATOU)}/${DNU_PRO_ZLATOU}` : t.id === "doporuceni" && doporuceniKOtevreni(stav) > 0 ? ` · čeká ${doporuceniKOtevreni(stav)}` : "";
              return (
                <div key={t.id} className="mm-karta p-4 flex flex-col gap-3" data-testid={`truhla-${t.id}`}>
                  <div className="flex items-center gap-3">
                    <span className="hx-truhla hx-mala shrink-0" data-druh={t.id}><span className="hx-vika" /><span className="hx-telo" /><span className="hx-zamek" /></span>
                    <div className="min-w-0">
                      <p className="font-black text-lg leading-tight" style={{ color: "var(--text-primary)" }}>{t.nazev}</p>
                      <p className="text-xs" style={{ color: "#5F6982" }}>{t.jak}{zlataInfo}</p>
                    </div>
                  </div>
                  <p className="text-[11px] leading-snug" style={{ color: "#5F6982" }}>
                    Šance: {sance.map((k) => `${VZACNOST[k].nazev} ${pct(t.sance[k])}`).join(" · ")}
                  </p>
                  <button
                    type="button"
                    disabled={!d.ok}
                    onClick={() => otevri(t.id)}
                    className={`mt-auto w-full rounded-2xl py-2.5 font-extrabold flex items-center justify-center gap-1.5 ${d.ok ? "mm-tlacitko text-white" : "mm-obrys opacity-70 cursor-not-allowed"}`}
                    style={d.ok ? { background: t.cena === null ? "#F5A623" : "#5B55D6", color: t.cena === null ? "#0D1B3E" : "#fff" } : undefined}
                    data-testid={`otevrit-${t.id}`}
                  >
                    {d.ok ? (t.cena === null ? "Otevřít zdarma" : <>Otevřít za {t.cena} <Krystal /></>) : d.proc}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mm-karta p-4 text-sm flex flex-col gap-1.5" style={{ color: "#33405F" }}>
            <p><b>Pojistka:</b> vzácná nebo lepší odměna nejpozději za {Math.max(1, POJISTKA_VZACNA - stav.bezVzacne)} {POJISTKA_VZACNA - stav.bezVzacne === 1 ? "truhlu" : "truhel"}. Věc, kterou už máš, se vrátí jako krystaly.</p>
            <p><b>Krystaly získáš za učení:</b> správná odpověď 2 (těžký příklad 4, lehčí než tvoje úroveň 1), dokončený trénink 10 a denní truhla, každá denní mise {ZA_MISI}, každý nový bod v odhadu 30. Za den nejvýš {DENNI_STROP} krystalů za učení.</p>
            <p><b>Truhla doporučení:</b> dostaneš ji, když v tréninku dotáhneš doporučené téma do zvládnutí, nebo když splníš plán po testu nanečisto.</p>
            <p>Nic se nekupuje za peníze. Legendární věci jsou jen v truhlách.</p>
          </div>
        </section>
      )}

      {zalozka === "satnik" && (
        <section className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] items-start">
          <div className="mm-karta p-5 flex flex-col items-center gap-3 lg:sticky lg:top-24">
            {typ === "pozadi" ? (
              <div
                className="mm-banner w-full rounded-2xl flex items-center justify-center py-3"
                style={nahledPozadi === "klasik" ? { background: "linear-gradient(135deg,#0D1B3E,#7c3aed 45%,#00B4D8)" } : undefined}
                data-pozadi={nahledPozadi === "klasik" ? undefined : nahledPozadi}
                data-testid="satnik-nahled-pozadi"
              >
                <Hexik ref={nahledRef} podoba={nahledPodoba} etapa={etapa} className="w-28" />
              </div>
            ) : (
              <Hexik ref={nahledRef} podoba={nahledPodoba} etapa={etapa} className="w-36" />
            )}
            <p className="text-sm text-center" style={{ color: "#5F6982" }}>
              <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white mr-1" style={{ background: VZACNOST[vyb.vz].barva }}>{VZACNOST[vyb.vz].nazev}</span>
              {TYP_NAZEV[vyb.typ]}: <b style={{ color: "var(--text-primary)" }}>{vyb.nazev}</b>
            </p>
            <button
              type="button"
              onClick={akce}
              disabled={vybStav === "nasazeno" || vybStav === "truhla" || (vybStav === "koupit" && krystaly(stav) < (vyb.cena ?? 0))}
              className="mm-tlacitko w-full rounded-2xl py-3 font-extrabold text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              style={{ background: "#5B55D6" }}
              data-testid="satnik-akce"
            >
              {vybStav === "nasazeno" ? "Nasazeno" : vybStav === "mam" ? "Nasadit" : vybStav === "truhla" ? "Legendární: jen z truhel" :
                krystaly(stav) < (vyb.cena ?? 0) ? `Chybí ${(vyb.cena ?? 0) - krystaly(stav)} krystalů` : <>Koupit za {vyb.cena} <Krystal /></>}
            </button>
            <button type="button" onClick={() => predved(vyb)} className="text-sm font-bold underline" style={{ color: "#5B55D6" }}>Vyzkoušet</button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Druh odměny">
              {(["podoba", "oslava", "efekt", "vzhled", "pozadi"] as TypOdmeny[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={typ === t}
                  onClick={() => { setTyp(t); setVybrana(null); }}
                  className={`flex-1 min-w-[30%] sm:min-w-0 rounded-xl px-3 py-2 text-sm font-extrabold ${typ === t ? "text-white" : "mm-obrys"}`}
                  style={typ === t ? { background: "#5B55D6" } : undefined}
                  data-testid={`typ-${t}`}
                >
                  {t === "podoba" ? "Podoba" : t === "oslava" ? "Oslava série" : t === "efekt" ? "Efekt" : t === "vzhled" ? "Vzhled appky" : "Pozadí"}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: "#5F6982" }}>
              {typ === "podoba" ? "Jak Hexík vypadá u příkladů a v profilu." : typ === "oslava" ? "Co Hexík udělá, když máš tři správně v řadě." : typ === "efekt" ? "Co vyletí, když odpovíš správně." : typ === "vzhled" ? "Klepni a vyzkoušej: změní se pozadí celé appky. Nasadit ho můžeš, až ho máš." : "Pozadí hlavičky v profilu a tady ve Sbírce."}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5" data-testid="satnik-mrizka">
              {seznam.map((o) => {
                const st = stavOdmeny(stav, o, trida);
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => { setVybrana(o.id); predved(o); }}
                    aria-pressed={vyb.id === o.id}
                    className="mm-karta mm-klik p-2.5 flex flex-col gap-1.5 text-left"
                    style={{ borderColor: vyb.id === o.id ? "#5B55D6" : undefined, boxShadow: vyb.id === o.id ? "0 0 0 2px rgba(91,85,214,.3)" : undefined }}
                    data-testid={`odmena-${o.klic}`}
                  >
                    <span className="h-1 rounded-full" style={{ background: VZACNOST[o.vz].barva }} />
                    <span className="flex items-center justify-center h-14"><Vizual o={o} /></span>
                    <span className="text-[13px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{o.nazev}</span>
                    <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: st === "nasazeno" ? "#1F9D55" : "#5F6982" }}>
                      {st === "nasazeno" ? "✓ Nasazeno" : st === "mam" ? "Máš" : st === "truhla" ? "🎁 Jen z truhly" : <><Krystal /> {o.cena}</>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Otevírání truhly */}
      {otevirani && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(8,12,30,.78)" }} role="dialog" aria-modal="true" aria-label="Otevírání truhly">
          <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col items-center gap-4 text-center text-white" style={{ background: "radial-gradient(circle at 50% 30%,#2A2F7A,#0D1B3E 72%)" }}>
            <p className="text-sm font-extrabold uppercase tracking-widest" style={{ color: "#C9C7F5" }}>{TRUHLY.find((t) => t.id === otevirani.id)?.nazev}</p>
            <span className={`hx-truhla ${otevirani.faze === "tres" ? "hx-tres" : "hx-otevrena"}`} data-druh={otevirani.id}><span className="hx-vika" /><span className="hx-telo" /><span className="hx-zamek" /></span>
            <div ref={odhaleniRef} className="min-h-[150px] flex flex-col items-center justify-center gap-2" aria-live="polite" data-testid="odhaleni">
              {otevirani.faze === "tres" && <p style={{ color: "#D9D8FE" }}>…</p>}
              {otevirani.faze === "hotovo" && otevirani.vysledek && (
                <>
                  {otevirani.vysledek.odmena && <Vizual o={otevirani.vysledek.odmena} velikost={84} />}
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide" style={{ background: VZACNOST[otevirani.vysledek.vz].barva }}>{VZACNOST[otevirani.vysledek.vz].nazev}</span>
                  {otevirani.vysledek.odmena && <p className="text-xl font-black">{otevirani.vysledek.odmena.nazev}</p>}
                  <p className="text-sm" style={{ color: "#D9D8FE" }}>
                    {otevirani.vysledek.odmena ? TYP_NAZEV[otevirani.vysledek.odmena.typ] + " · " : ""}
                    {otevirani.vysledek.nova ? `Nové! A k tomu +${otevirani.vysledek.krystaly} krystalů` : `Už ji máš, vracíme ${otevirani.vysledek.krystaly} krystalů`}
                  </p>
                </>
              )}
              {otevirani.faze === "hotovo" && !otevirani.vysledek && <p>Truhlu teď nejde otevřít.</p>}
            </div>
            <div className="flex gap-2 w-full">
              {otevirani.faze === "hotovo" && otevirani.vysledek?.nova && otevirani.vysledek.odmena && (
                <button
                  type="button"
                  className="mm-tlacitko flex-1 rounded-2xl py-3 font-extrabold"
                  style={{ background: "#F5A623", color: "#0D1B3E" }}
                  onClick={() => { const id = otevirani.vysledek!.odmena!.id; upravSbirku((s) => nasadOdmenu(s, id)); setOtevirani(null); }}
                  data-testid="odhaleni-nasadit"
                >
                  Nasadit
                </button>
              )}
              <button
                type="button"
                disabled={otevirani.faze !== "hotovo"}
                className="flex-1 rounded-2xl py-3 font-extrabold border border-white/30 disabled:opacity-50"
                onClick={() => setOtevirani(null)}
                data-testid="odhaleni-hotovo"
              >
                Hotovo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
