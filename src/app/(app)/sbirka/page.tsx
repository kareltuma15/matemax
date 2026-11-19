"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Hexik from "@/components/hexik/Hexik";
import DenniMise from "@/components/hexik/DenniMise";
import BossKarta from "@/components/hexik/BossKarta";
import TestNanecistoKarta from "@/components/hexik/TestNanecistoKarta";
import Trofeje from "@/components/hexik/Trofeje";
import Sady from "@/components/hexik/Sady";
import SezonaPruh from "@/components/hexik/SezonaPruh";
import OdmenaVizual from "@/components/hexik/OdmenaVizual";
import CestaUrovni from "@/components/hexik/CestaUrovni";
import AdventniKalendar from "@/components/hexik/AdventniKalendar";
import { denAdventu } from "@/lib/kalendar";
import HexikUvod from "@/components/hexik/HexikUvod";
import PozadiZive from "@/components/hexik/PozadiZive";
import TruhlaScena from "@/components/hexik/TruhlaScena";
import JakZiskat from "@/components/hexik/JakZiskat";
import { zkontrolujUroven } from "@/lib/sbirka-trenink";
import { urovenZXP } from "@/lib/urovne";
import { nactiTestyZVysledku } from "@/lib/sbirka-test";
import { loadProgress } from "@/lib/progress";
import { useTrida } from "@/lib/trida";
import { useSbirka } from "@/lib/use-sbirka";
import { localDateStr } from "@/lib/date";
import { spustEfekt, reaguj } from "@/lib/hexik-efekty";
import {
  ODMENY, TRUHLY, VZACNOST, TYP_NAZEV, ANIMACE_OSLAVY, ETAPY_HEXIKA, DENNI_STROP,
  POJISTKA_VZACNA, krystaly, maOdmenu, nasazena, etapaHexika, dostupnostTruhly, otevriTruhlu,
  kupOdmenu, nasadOdmenu, upravSbirku, dnuTentoTyden, DNU_PRO_ZLATOU, naroku, NAROKOVE_TRUHLY, TROFEJE, TROFEJ_EVENT, zkontrolujTrofeje, SADY, VSECHNY_SADY, SADA_EVENT, SEZONY, aktualniSezona, konecSezony, jeVNabidce, TMAVE_VZHLEDY, slotyHexika, SLOTY, type NarokTruhla,
  type Odmena, type TypOdmeny, type TruhlaId, type VysledekTruhly, type SbirkaStav,
} from "@/lib/sbirka";
import type { Trida } from "@/types";

type Zalozka = "kalendar" | "truhly" | "satnik" | "urovne" | "sady" | "trofeje";

function Krystal({ className = "" }: { className?: string }) {
  return <i className={`hx-krystal ${className}`} aria-hidden="true" />;
}

const Vizual = OdmenaVizual;

function stavOdmeny(s: SbirkaStav, o: Odmena, trida: Trida, den: string) {
  if (nasazena(s, trida, o.typ).id === o.id) return "nasazeno" as const;
  if (maOdmenu(s, o)) return "mam" as const;
  if (o.zdroj === "test") return "test" as const;
  if (o.zdroj === "uroven") return "uroven" as const;
  if (o.zdroj === "kalendar") return "kalendar" as const;
  if (!jeVNabidce(o, den)) return "mimo" as const;
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
  const tabParam = params.get("tab");
  const vAdventu = denAdventu(localDateStr()) !== null;
  const [zalozka, setZalozka] = useState<Zalozka>(tabParam === "satnik" || tabParam === "trofeje" || tabParam === "sady" || tabParam === "urovne" ? tabParam : tabParam === "kalendar" && vAdventu ? "kalendar" : "truhly");
  // Ohlášení nahoře (dokončená sada, nová trofej) jdou po sobě, nepřepisují se
  const [fronta, setFronta] = useState<string[]>([]);
  const novaTrofej = fronta[0] ?? null;
  useEffect(() => {
    if (!novaTrofej) return;
    const cas = setTimeout(() => setFronta((f) => f.slice(1)), 3500);
    return () => clearTimeout(cas);
  }, [novaTrofej]);

  // Posluchače ohlášení jsou první efekt stránky: další efekty (úrovně, testy) ukládají Sbírku a sady
  // se při tom dopočítají, ohlášení se tak neztratí.
  useEffect(() => {
    const na = (e: Event) => {
      const ids = (e as CustomEvent<{ ids: string[] }>).detail?.ids ?? [];
      const texty = ids.map((id) => TROFEJE.find((x) => x.id === id)).filter(Boolean).map((t) => `${t!.ikona} Nová trofej: ${t!.nazev}`);
      if (texty.length) setFronta((f) => [...f, ...texty]);
    };
    const naSadu = (e: Event) => {
      const det = (e as CustomEvent<{ ids: string[]; krystaly: number; poloviny?: string[] }>).detail;
      const najdi = (id: string) => VSECHNY_SADY.find((x) => x.id === id);
      const texty = [
        ...(det?.poloviny ?? []).map(najdi).filter(Boolean).map((sd) => `${sd!.ikona} Půlka sady ${sd!.nazev}! Kolem Hexíka: ${sd!.efekt.nazev}`),
        ...(det?.ids ?? []).map(najdi).filter(Boolean).map((sd) => `${sd!.ikona} Sada ${sd!.nazev} je kompletní! ${sd!.domov.hotovy ? `Hexík se stěhuje: ${sd!.domov.nazev}` : `Domov ${sd!.domov.nazev} odemčen`} · +${sd!.bonus} krystalů`),
      ];
      if (texty.length) setFronta((f) => [...f, ...texty]);
    };
    window.addEventListener(TROFEJ_EVENT, na);
    window.addEventListener(SADA_EVENT, naSadu);
    // Zpětné sady a trofeje až po zapnutí posluchačů, ať se ohlásí
    zkontrolujTrofeje();
    return () => { window.removeEventListener(TROFEJ_EVENT, na); window.removeEventListener(SADA_EVENT, naSadu); };
  }, []);
  // Výsledky testů nanečisto z appky Vyhodnocení (propojený účet) → Truhla Generálka a za zlepšení Legendární truhla
  useEffect(() => { nactiTestyZVysledku().catch(() => {}); }, []);
  // Odměny za XP úrovně (i zpětně za XP z doby před herním systémem)
  useEffect(() => { zkontrolujUroven(trida); }, [trida]);
  const [typ, setTyp] = useState<TypOdmeny>("podoba");
  const [vybrana, setVybrana] = useState<string | null>(null);
  const [otevirani, setOtevirani] = useState<{ id: TruhlaId; faze: "tres" | "hotovo"; vysledek: VysledekTruhly | null } | null>(null);
  const nahledRef = useRef<HTMLSpanElement>(null);
  const den = localDateStr();
  // Série dní z prohlížeče (na serveru 0; vykresluje se až po načtení Sbírky)
  const [streak] = useState(() => loadProgress().streak);
  const [xp] = useState(() => loadProgress().xp ?? 0);
  const urovenXP = urovenZXP(xp);

  const etapa = etapaHexika(stav.maxOdhad[trida]);
  const etapaInfo = ETAPY_HEXIKA[etapa - 1];
  const dalsiEtapa = ETAPY_HEXIKA[etapa];
  const podoba = nasazena(stav, trida, "podoba");
  const dnesK = stav.dnes.d === den ? stav.dnes.k : 0;

  const seznam = ODMENY[trida].filter((o) => o.typ === typ);
  const sadaOdmeny = new Map(SADY[trida].flatMap((sd) => sd.polozky.map((id) => [id, sd] as const)));
  const vyb = (vybrana && seznam.find((o) => o.id === vybrana)) || nasazena(stav, trida, typ);
  const vybStav = stavOdmeny(stav, vyb, trida, den);
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

  // Výsledek se losuje hned, 3D truhla ho pak ukáže (dítě klepe, Hexík otevírá)
  function otevri(id: TruhlaId) {
    const vysledek = upravSbirku((s) => otevriTruhlu(s, id, trida, localDateStr()));
    setOtevirani({ id, faze: vysledek ? "tres" : "hotovo", vysledek });
  }
  function odhal() {
    setOtevirani((o) => (o ? { ...o, faze: "hotovo" } : o));
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
        <PozadiZive klic={pozadi.klic} />
        <Hexik podoba={podoba.klic} etapa={etapa} d3 otacet doplnky={slotyHexika(stav, trida)} className="w-28 lg:w-36 shrink-0" />
        <div className="flex-1 min-w-0 text-center sm:text-left">
          <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "#C9C7F5" }}>Tvůj Hexík · {etapaInfo.nazev}</p>
          <h1 className="text-3xl lg:text-4xl font-black mt-1 flex items-center gap-2 justify-center sm:justify-start" data-testid="sbirka-krystaly">
            <Krystal /> {krystaly(stav)} <span className="text-base font-bold" style={{ color: "#C9C7F5" }}>krystalů</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "#D9D8FE" }}>
            <button type="button" onClick={() => setZalozka("urovne")} className="font-extrabold underline-offset-2 hover:underline" style={{ color: "#FFE08A" }} data-testid="sbirka-uroven">Úroveň {urovenXP.n}</button>
            {" · "}Dnes za učení {dnesK} z {DENNI_STROP}.{" "}
            {dalsiEtapa ? `Hexík povyroste na ${dalsiEtapa.nazev} od ${dalsiEtapa.od} bodů v odhadu.` : "Hexík je v nejvyšší podobě."}
          </p>
        </div>
        <Link href="/trenink" className="mm-tlacitko shrink-0 rounded-2xl px-5 py-3 font-extrabold text-white" style={{ background: "#F5A623", color: "#0D1B3E" }}>
          Trénovat
        </Link>
      </section>

      <HexikUvod trida={trida} naSbirce />

      <div className="flex gap-2" role="tablist" aria-label="Sbírka">
        {((vAdventu ? ["kalendar", "truhly", "satnik", "urovne", "sady", "trofeje"] : ["truhly", "satnik", "urovne", "sady", "trofeje"]) as Zalozka[]).map((z) => (
          <button
            key={z}
            type="button"
            role="tab"
            aria-selected={zalozka === z}
            onClick={() => setZalozka(z)}
            className={`flex-1 sm:flex-none rounded-2xl px-1 sm:px-5 py-2.5 text-[13px] sm:text-base font-extrabold flex flex-col sm:flex-row items-center justify-center sm:gap-1.5 leading-tight ${zalozka === z ? "text-white" : "mm-obrys"}`}
            style={zalozka === z ? { background: "#0D1B3E" } : undefined}
            data-testid={`zalozka-${z}`}
          >
            <span aria-hidden="true">{z === "kalendar" ? "🎄" : z === "truhly" ? "🎁" : z === "satnik" ? "👕" : z === "urovne" ? "⭐" : z === "sady" ? "📚" : "🏆"}</span>
            {z === "kalendar" ? "Kalendář" : z === "truhly" ? "Truhly" : z === "satnik" ? "Šatník" : z === "urovne" ? "Úrovně" : z === "sady" ? "Sady" : "Trofeje"}
          </button>
        ))}
      </div>

      {zalozka === "kalendar" && <AdventniKalendar trida={trida} den={localDateStr()} />}
      {(zalozka === "truhly" || zalozka === "satnik") && <SezonaPruh trida={trida} />}

      {zalozka === "truhly" && (
        <section className="flex flex-col gap-3">
          <DenniMise streak={streak} />
          <BossKarta trida={trida} />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TRUHLY.filter((t) => t.id !== "sezonni" || !!aktualniSezona(den)).map((t) => {
              const d = dostupnostTruhly(stav, t.id, den);
              const pct = (v: number) => `${Math.round(v * 100)} %`;
              const sance = (Object.keys(t.sance) as (keyof typeof t.sance)[]).filter((k) => t.sance[k] > 0);
              const cekaNaroku = (NAROKOVE_TRUHLY as string[]).includes(t.id) ? naroku(stav, t.id as NarokTruhla) : 0;
              const zlataInfo = t.id === "zlata" ? ` · tento týden ${Math.min(dnuTentoTyden(stav, den), DNU_PRO_ZLATOU)}/${DNU_PRO_ZLATOU}` : cekaNaroku > 0 ? ` · čeká ${cekaNaroku}` : "";
              return (
                <div key={t.id} className="mm-karta p-4 flex flex-col gap-3" data-testid={`truhla-${t.id}`}>
                  <div className="flex items-center gap-3">
                    <span className="hx-truhla hx-mala shrink-0" data-druh={t.id}><span className="hx-vika" /><span className="hx-telo" /><span className="hx-zamek" /></span>
                    <div className="min-w-0">
                      <p className="font-black text-lg leading-tight" style={{ color: "var(--text-primary)" }}>{t.id === "sezonni" ? aktualniSezona(den)?.truhla ?? t.nazev : t.nazev}</p>
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
                  {!d.ok && t.cena !== null && krystaly(stav) < t.cena && (
                    <Link href="/trenink" className="-mt-1 text-xs font-bold text-center" style={{ color: "#5B55D6" }}>Krystaly získáš tréninkem ›</Link>
                  )}
                </div>
              );
            })}
          </div>
          <TestNanecistoKarta trida={trida} />
          <JakZiskat />
          <div className="mm-karta p-4 text-sm flex flex-col gap-1.5" style={{ color: "#33405F" }}>
            <p><b>Pojistka:</b> vzácná nebo lepší odměna nejpozději za {Math.max(1, POJISTKA_VZACNA - stav.bezVzacne)} {POJISTKA_VZACNA - stav.bezVzacne === 1 ? "truhlu" : "truhel"}. Věc, kterou už máš, se vrátí jako krystaly.</p>
            <p><b>XP úrovně:</b> za každou novou úroveň krystaly, na některých věc, která nejde koupit ani vylosovat. Přehled je v záložce Úrovně.</p>
            <p><b>Truhla doporučení:</b> dostaneš ji, když v tréninku dotáhneš doporučené téma do zvládnutí, nebo když splníš plán po testu nanečisto.</p>
            <p>Nic se nekupuje za peníze. Legendární věci jsou jen v truhlách a pozadí Generálka jen za test nanečisto. Trofeje se dají jen vybojovat.</p>
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
                <PozadiZive klic={nahledPozadi} />
                <Hexik ref={nahledRef} podoba={nahledPodoba} etapa={etapa} d3 otacet doplnky={slotyHexika(stav, trida)} className="w-28" />
              </div>
            ) : (
              <Hexik ref={nahledRef} podoba={nahledPodoba} etapa={etapa} d3 otacet doplnky={slotyHexika(stav, trida, (SLOTY as readonly string[]).includes(vyb.typ) ? vyb : undefined)} className="w-36" />
            )}
            <p className="text-sm text-center" style={{ color: "#5F6982" }}>
              <span className="inline-block rounded-full px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white mr-1" style={{ background: VZACNOST[vyb.vz].barva }}>{VZACNOST[vyb.vz].nazev}</span>
              {TYP_NAZEV[vyb.typ]}: <b style={{ color: "var(--text-primary)" }}>{vyb.nazev}</b>
            </p>
            <button
              type="button"
              onClick={akce}
              disabled={vybStav === "nasazeno" || vybStav === "truhla" || vybStav === "test" || vybStav === "uroven" || vybStav === "kalendar" || vybStav === "mimo" || (vybStav === "koupit" && krystaly(stav) < (vyb.cena ?? 0))}
              className="mm-tlacitko w-full rounded-2xl py-3 font-extrabold text-white disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              style={{ background: "#5B55D6" }}
              data-testid="satnik-akce"
            >
              {vybStav === "nasazeno" ? "Nasazeno" : vybStav === "mam" ? "Nasadit" : vybStav === "truhla" ? "Legendární: jen z truhel" : vybStav === "test" ? "Jen za test nanečisto" : vybStav === "uroven" ? `Odemkne úroveň ${vyb.uroven}` : vybStav === "kalendar" ? "Jen z adventního kalendáře" : vybStav === "mimo" ? "Jen v sezóně" :
                krystaly(stav) < (vyb.cena ?? 0) ? `Chybí ${(vyb.cena ?? 0) - krystaly(stav)} krystalů` : <>Koupit za {vyb.cena} <Krystal /></>}
            </button>
            <button type="button" onClick={() => predved(vyb)} className="text-sm font-bold underline" style={{ color: "#5B55D6" }}>Vyzkoušet</button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Druh odměny">
              {(["podoba", "hlava", "oci", "krk", "ruce", "nohy", "oslava", "efekt", "vzhled", "pozadi"] as TypOdmeny[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={typ === t}
                  onClick={() => { setTyp(t); setVybrana(null); }}
                  className={`flex-1 min-w-[22%] sm:min-w-0 rounded-xl px-2.5 py-2 text-sm font-extrabold ${typ === t ? "text-white" : "mm-obrys"}`}
                  style={typ === t ? { background: "#5B55D6" } : undefined}
                  data-testid={`typ-${t}`}
                >
                  {t === "podoba" ? "Podoba" : t === "hlava" ? "Hlava" : t === "oci" ? "Oči" : t === "krk" ? "Krk" : t === "ruce" ? "Ruce" : t === "nohy" ? "Nohy" : t === "oslava" ? "Tanečky" : t === "efekt" ? "Efekt" : t === "vzhled" ? "Vzhled appky" : "Pozadí"}
                </button>
              ))}
            </div>
            <p className="text-xs" style={{ color: "#5F6982" }}>
              {typ === "podoba" ? "Jak Hexík vypadá u příkladů a v profilu." : (SLOTY as readonly string[]).includes(typ) ? "Doplněk si nasadíš na jakoukoli podobu Hexíka. Otoč si ho prstem." : typ === "oslava" ? "Taneček, který Hexík zatančí, když máš tři správně v řadě. Některé se odemykají jen za XP úrovně." : typ === "efekt" ? "Co vyletí, když odpovíš správně." : typ === "vzhled" ? "Klepni a vyzkoušej: změní se pozadí celé appky. Nasadit ho můžeš, až ho máš." : "Pozadí hlavičky v profilu a tady ve Sbírce."}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5" data-testid="satnik-mrizka">
              {seznam.map((o) => {
                const st = stavOdmeny(stav, o, trida, den);
                const z = o.sezona ? SEZONY.find((x) => x.id === o.sezona) : null;
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
                    <span className="mm-dlazdice" data-vz={o.vz} style={st === "mimo" ? { filter: "grayscale(.8)", opacity: 0.55 } : undefined}>
                      <Vizual o={o} velikost={54} etapa={etapa} vyplnit />
                      {z && <span className="mm-sezona-stitek mm-dlazdice-stitek" data-testid={`sezonni-${o.klic}`}>{z.ikona} {st === "mimo" ? `od ${Number(z.od.slice(3))}. ${Number(z.od.slice(0, 2))}.` : `do ${Number(konecSezony(z, den).slice(8))}. ${Number(konecSezony(z, den).slice(5, 7))}.`}</span>}
                      {sadaOdmeny.get(o.id) && <span className="mm-dlazdice-sada" title={`Patří do sady ${sadaOdmeny.get(o.id)!.nazev}`} data-testid={`sada-${o.klic}`}>{sadaOdmeny.get(o.id)!.ikona} sada</span>}
                    </span>
                    <span className="text-[13px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>{o.nazev}</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wide -mt-1" style={{ color: VZACNOST[o.vz].barva }}>{VZACNOST[o.vz].nazev}</span>
                    <span className="text-[11px] font-bold flex items-center gap-1" style={{ color: st === "nasazeno" ? "#1F9D55" : "#5F6982" }}>
                      {st === "nasazeno" ? "✓ Nasazeno" : st === "mam" ? "Máš" : st === "mimo" ? "Jen v sezóně" : st === "truhla" ? "🎁 Jen z truhly" : st === "test" ? "🏫 Za test nanečisto" : st === "uroven" ? `⭐ Úroveň ${o.uroven}` : st === "kalendar" ? "🎄 Z kalendáře" : <><Krystal /> {o.cena}</>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {zalozka === "urovne" && <CestaUrovni trida={trida} />}
      {zalozka === "sady" && <Sady trida={trida} />}
      {zalozka === "trofeje" && <Trofeje trida={trida} />}

      {novaTrofej && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] rounded-2xl px-4 py-2.5 font-extrabold shadow-lg" style={{ background: "#0D1B3E", color: "#FFE08A" }} role="status" data-testid="nova-trofej">
          {novaTrofej}
        </div>
      )}

      {/* Otevírání truhly (přes celou obrazovku, 3D) */}
      {otevirani && (
        <TruhlaScena
          druh={otevirani.id}
          nazev={otevirani.id === "sezonni" ? aktualniSezona(den)?.truhla ?? "Sezónní truhla" : TRUHLY.find((t) => t.id === otevirani.id)?.nazev ?? "Truhla"}
          podnadpis={TRUHLY.find((t) => t.id === otevirani.id)?.jak}
          sezona={aktualniSezona(den)?.id ?? null}
          vysledek={otevirani.vysledek}
          podoba={podoba.klic}
          etapa={etapa}
          sloty={slotyHexika(stav, trida)}
          onOdhaleno={odhal}
          onNasadit={() => { const id = otevirani.vysledek?.odmena?.id; if (id) upravSbirku((s) => nasadOdmenu(s, id)); }}
          onZavrit={() => setOtevirani(null)}
        />
      )}
    </div>
  );
}
