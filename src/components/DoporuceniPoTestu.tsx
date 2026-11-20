"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HexIkona } from "@/components/HexIkona";
import { temaStyl } from "@/lib/barvy-temat";
import { isTopicLocked } from "@/lib/subscription";
import { maDovednosti, dovednostUlohy } from "@/lib/dovednosti";
import { examplesFor } from "@/data/examples";
import { zapocitejTestZOdkazu } from "@/lib/sbirka-test";
import { nazevTematu, proc, kratkeDatum, sestavDoporucenouSadu, tridaDoporuceni, type Doporuceni } from "@/lib/doporuceni";
import { ulozOdkaz, ulozPlan, zapomenOdkaz, type PlanPoTestu } from "@/lib/plan-po-testu";
import { darekZDoporuceni, nactiPouzito, pouzitoLokalne, zbyva, DAREK_NA_TEMA, type Darek, type Pouzito } from "@/lib/ochutnavka";
import ProRodice from "@/components/ProRodice";
import type { DBExample, Trida } from "@/types";

/** Dárkový trénink: na která témata dárek platí, kolik je vyčerpáno a kam se po tréninku vrátit. */
export interface DarekSezeni extends Darek { pouzito: Pouzito; navrat: string }

interface Props {
  /** Odkaz z appky Vyhodnocení testů (ověří se na serveru), nebo už uložený plán. */
  token?: string;
  plan?: PlanPoTestu;
  isGuest: boolean;
  isPremium: boolean;
  /** Třída žáka: doporučení pro jinou třídu se nespouští (třídy jsou oddělené). */
  tridaZaka: Trida;
  onStart: (ids: string[], darek?: DarekSezeni) => void;
  onNeplatne: () => void;
}

/**
 * Obrazovka „Doporučeno po testu nanečisto“: 1–3 témata z testu s důvodem, hlavní tlačítko na smíšenou
 * sadu 10 příkladů (6/3/1, obtížnost podle bodů v testu), u každého tématu běžný trénink.
 * Host vidí doporučení a přihlášení / registraci (odkaz si zařízení pamatuje), přihlášený si ho může uložit do plánu.
 * Bez Premium: z každého doporučeného Premium tématu dárek 10 příkladů zdarma (lib/ochutnavka.ts). Dokud dárek
 * trvá, stránka neukazuje zámky, jen 🎁. Cena jen v rámečku Pro rodiče.
 */
export default function DoporuceniPoTestu({ token, plan, isGuest, isPremium, tridaZaka, onStart, onNeplatne }: Props) {
  const [d, setD] = useState<Doporuceni | null>(plan?.doporuceni ?? null);
  const [ulozeno, setUlozeno] = useState(!!plan);
  const [ukladam, setUkladam] = useState(false);
  const darek = d ? darekZDoporuceni(d, isPremium, isGuest) : null;
  const darekKlic = darek?.klic ?? null;
  const [pouzito, setPouzito] = useState<Pouzito | null>(null);

  useEffect(() => {
    if (!d || !darekKlic) return;
    const dk = darekZDoporuceni(d, isPremium, isGuest);
    if (!dk) return;
    let zruseno = false;
    setPouzito(pouzitoLokalne(dk.klic)); // eslint-disable-line react-hooks/set-state-in-effect
    void nactiPouzito(dk).then((p) => { if (!zruseno) setPouzito(p); });
    return () => { zruseno = true; };
  }, [d, darekKlic, isPremium, isGuest]);

  useEffect(() => {
    if (!token || plan) return;
    let zruseno = false;
    fetch("/api/doporuceni", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) })
      .then((r) => r.json())
      .then((v: { ok: boolean; doporuceni?: Doporuceni }) => {
        if (zruseno) return;
        if (v.ok && v.doporuceni) {
          setD(v.doporuceni);
          if (isGuest) ulozOdkaz(token);
          // Podepsaný odkaz = žák test nanečisto opravdu psal → Truhla Generálka (za každý test jednou)
          zapocitejTestZOdkazu(tridaDoporuceni(v.doporuceni), v.doporuceni.test.d);
        } else {
          zapomenOdkaz();
          onNeplatne();
        }
      })
      .catch(() => { if (!zruseno) onNeplatne(); });
    return () => { zruseno = true; };
  }, [token, plan, isGuest, onNeplatne]);

  if (!d) return <div className="skeleton rounded-[22px] max-w-xl mx-auto w-full" style={{ height: 360 }} data-testid="doporuceni-nacitani" />;

  const trida = tridaDoporuceni(d);
  if (!isGuest && trida !== tridaZaka) {
    return (
      <div className="mm-karta p-5 max-w-xl mx-auto w-full flex flex-col gap-2" data-testid="doporuceni-jina-trida">
        <b style={{ color: "#0D1B3E" }}>Doporučení je pro {trida}. třídu</b>
        <span className="text-sm" style={{ color: "#5F6982" }}>Ty máš v MateMaxu nastavenou {tridaZaka}. třídu. Třídu změníš v profilu.</span>
        <Link href="/profil" className="self-start mt-1 px-4 py-2.5 rounded-xl text-sm font-extrabold text-white mm-tlacitko" style={{ background: "#0D1B3E" }}>Do profilu</Link>
      </div>
    );
  }
  const p = pouzito ?? {};
  const jeDarek = (k: string) => !!darek?.temata.includes(k);
  // Zamčené = Premium téma bez dárku, nebo s vyčerpaným dárkem
  const zamceno = (k: string) => !isGuest && isTopicLocked(k, isPremium) && (!jeDarek(k) || zbyva(p, k) === 0);
  const strop = (k: string) => (jeDarek(k) ? zbyva(p, k) : Infinity);
  const volnych = d.top.filter((t) => !zamceno(t.k)).length;
  const darekZbyva = darek ? darek.temata.some((k) => zbyva(p, k) > 0) : false;
  const vycerpano = darek ? darek.temata.some((k) => zbyva(p, k) === 0) : false;
  const navrat = token ? `/trenink?doporuceni=${encodeURIComponent(token)}` : "/trenink?plan=1";
  const ulohyTridy = () => (examplesFor(trida) as DBExample[]).map((e) => ({ id: e.id, tema: e.tema, obtiznost: e.obtiznost, podtema: e.podtema, dovednost: e.dovednost }));
  const sezeni = (ids: string[]) => {
    const tema = new Map(ulohyTridy().map((u) => [u.id, u.tema]));
    const vDarku = !!darek && ids.some((id) => darek.temata.includes(tema.get(id) ?? ""));
    onStart(ids, vDarku && darek ? { ...darek, pouzito: p, navrat } : undefined);
  };

  function zacit() {
    const ids = sestavDoporucenouSadu(d!.top, ulohyTridy(), zamceno, (u) => dovednostUlohy(u as unknown as DBExample), Math.random, strop);
    if (ids.length) sezeni(ids);
  }

  /** Dárkový trénink jen jednoho tématu (tlačítko u karty): kolik zbývá, nejvýš 10. */
  function zacitTema(t: Doporuceni["top"][number]) {
    const ids = sestavDoporucenouSadu([t], ulohyTridy(), () => false, (u) => dovednostUlohy(u as unknown as DBExample), Math.random, () => Math.min(DAREK_NA_TEMA, zbyva(p, t.k)));
    if (ids.length) sezeni(ids);
  }

  async function ulozit() {
    setUkladam(true);
    await ulozPlan(d!);
    setUkladam(false);
    setUlozeno(true);
  }

  return (
    <div className="flex flex-col gap-4 max-w-xl lg:max-w-3xl mx-auto w-full" data-testid="doporuceni-po-testu">
      <div className="rounded-[22px] p-5 lg:p-6 text-white" style={{ background: "linear-gradient(160deg, #1F2F66, #0D1B3E 70%)" }}>
        <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#C9C7F5" }}>Doporučeno po testu nanečisto</span>
        <h1 className="text-[24px] lg:text-[30px] font-extrabold leading-tight mt-1">
          Po {d.test.n}. testu nanečisto ({kratkeDatum(d.test.d)})
        </h1>
        <p className="text-sm lg:text-base mt-1.5" style={{ color: "#D9D8FE" }}>
          Tady ti v testu utekly body. Když je potrénuješ, příště je získáš.
        </p>
        {d.dalsi && <p className="text-sm mt-2 font-bold" style={{ color: "#FFC85C" }}>Další test {kratkeDatum(d.dalsi)}: stihneš to.</p>}
      </div>

      {darek && darekZbyva && (
        <div className="rounded-[20px] p-4 lg:p-5 grid grid-cols-[48px_minmax(0,1fr)] gap-3 items-center darek-pruh" style={{ background: "linear-gradient(135deg, #FFE8B8, #FFD27A)", boxShadow: "0 8px 22px rgba(245,166,35,.28)" }} data-testid="darek-pruh">
          <span className="text-[40px] leading-none text-center" aria-hidden>🎁</span>
          <span className="min-w-0">
            <b className="block text-[17px] lg:text-[19px] leading-tight" style={{ color: "#5A3500" }}>Dárek po testu</b>
            <span className="block text-sm mt-0.5" style={{ color: "#6B4A10" }}>
              Z {darek.temata.length === 1 ? "doporučeného tématu" : "každého doporučeného tématu"} máš zdarma {DAREK_NA_TEMA} příkladů. I z {darek.temata.length === 1 ? "tématu, které" : "témat, která"} jinak patří do Premium.
            </span>
          </span>
        </div>
      )}

      <div className="grid gap-3">
        {d.top.map((t, i) => {
          const z = zamceno(t.k);
          const dar = jeDarek(t.k) && !z;
          const zb = zbyva(p, t.k);
          const href = t.s ? `/trenink?tema=${t.k}&dovednost=${t.s}` : maDovednosti(t.k) ? `/trenink?vyber=${t.k}` : `/trenink?tema=${t.k}`;
          return (
            <div key={`${t.k}-${t.s ?? ""}`} className="mm-karta p-4 grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[48px_minmax(0,1fr)_auto] gap-3 items-center" style={temaStyl(t.k)} data-tema={t.k}>
              <span className="relative">
                <HexIkona tema={t.k} velikost={48} />
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full text-[11px] font-extrabold text-white flex items-center justify-center" style={{ background: "var(--tema-barva)" }}>{i + 1}</span>
              </span>
              <span className="min-w-0">
                <b className="block text-[16px] leading-tight" style={{ color: "#0D1B3E" }}>{nazevTematu(t)}</b>
                <span className="block text-sm" style={{ color: "#5F6982" }}>{proc(t)}</span>
                {dar && (
                  <span className="inline-block mt-1.5 text-xs font-extrabold px-2.5 py-0.5 rounded-full" style={{ background: "#FFF1DC", color: "#9A5B00" }} data-testid="darek-stitek">
                    🎁 {zb >= DAREK_NA_TEMA ? `${DAREK_NA_TEMA} příkladů zdarma` : `zbývá ${zb} z ${DAREK_NA_TEMA}`}
                  </span>
                )}
                {z && jeDarek(t.k) && (
                  <span className="inline-block mt-1.5 text-xs font-bold px-2.5 py-0.5 rounded-full" style={{ background: "#F0F1F6", color: "#5F6982" }}>Dárek hotový · další příklady jsou v Premium</span>
                )}
                <span className="mt-2 block h-1.5 rounded-full overflow-hidden" style={{ background: "var(--tema-tint)" }}>
                  <i className="block h-full rounded-full" style={{ width: `${Math.max(3, (t.pts / t.max) * 100)}%`, background: "var(--tema-barva)" }} />
                </span>
              </span>
              {!isGuest && (dar ? (
                <button type="button" onClick={() => zacitTema(t)} className="col-span-2 sm:col-span-1 py-2.5 px-4 rounded-xl text-center text-sm font-extrabold mm-obrys" style={{ color: "#5A3500", background: "#FFF6E5", border: "1.5px solid #F8D9A0" }} data-testid="darek-trenovat">
                  🎁 Trénovat
                </button>
              ) : z ? (
                <span className="col-span-2 sm:col-span-1 py-2.5 px-4 rounded-xl text-center text-sm font-bold" style={{ color: "#8A93AA", background: "#F5F6FB" }}>V Premium</span>
              ) : (
                <Link href={href} className="col-span-2 sm:col-span-1 py-2.5 px-4 rounded-xl text-center text-sm font-extrabold mm-obrys" style={{ color: "#0D1B3E", border: "1.5px solid #E4E6EF" }}>
                  Trénovat
                </Link>
              ))}
            </div>
          );
        })}
      </div>

      {isGuest ? (
        <div className="mm-karta p-4 lg:p-5 flex flex-col gap-3" data-testid="doporuceni-host">
          <b style={{ color: "#0D1B3E" }}>Přihlas se a začni trénovat</b>
          <span className="text-sm" style={{ color: "#5F6982" }}>Doporučení si zapamatujeme, po přihlášení ho tady najdeš.</span>
          <div className="grid sm:grid-cols-2 gap-2">
            <Link href={`/registrace?next=${encodeURIComponent(navrat)}`} className="py-3.5 rounded-2xl text-center font-extrabold mm-tlacitko" style={{ background: "#F5A623", color: "#0D1B3E" }}>
              Zaregistrovat se zdarma
            </Link>
            <Link href={`/prihlaseni?next=${encodeURIComponent(navrat)}`} className="py-3.5 rounded-2xl text-center font-bold mm-obrys" style={{ color: "#0D1B3E", border: "1.5px solid #E4E6EF" }}>
              Už mám účet
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {volnych > 0 ? (
            <>
              <button type="button" onClick={zacit} className="w-full py-4 rounded-2xl text-center text-base font-extrabold mm-tlacitko" style={{ background: "#F5A623", color: "#0D1B3E" }} data-testid="doporuceni-start">
                {darekZbyva ? "🎁 Začít dárkový trénink · 10 příkladů" : "Začít doporučený trénink · 10 příkladů"}
              </button>
              {darekZbyva && <p className="text-center text-xs" style={{ color: "#5F6982" }}>Míchá všechna doporučená témata, i ta z Premium</p>}
            </>
          ) : (
            <p className="w-full py-3.5 px-4 rounded-2xl text-center text-sm font-bold" style={{ background: "#F0F1F6", color: "#33405F" }} data-testid="doporuceni-vse-premium">
              Doporučená témata jsou v Premium. Témata zdarma najdeš v Tréninku.
            </p>
          )}
          {ulozeno ? (
            <p className="text-center text-sm font-bold" style={{ color: "#14753A" }} data-testid="doporuceni-ulozeno">✓ Uloženo v tvém plánu, najdeš ho na domovské stránce</p>
          ) : (
            <button type="button" onClick={ulozit} disabled={ukladam} className="w-full py-3 rounded-2xl text-center font-bold mm-obrys disabled:opacity-60" style={{ color: "#0D1B3E", border: "1.5px solid #E4E6EF" }} data-testid="doporuceni-ulozit">
              {ukladam ? "Ukládám…" : "Uložit do mého plánu"}
            </button>
          )}
          {darek && <div className="mt-3"><ProRodice trida={trida} kompaktni={!vycerpano} /></div>}
        </div>
      )}
    </div>
  );
}
