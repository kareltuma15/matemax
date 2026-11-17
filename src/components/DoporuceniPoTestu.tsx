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
import type { DBExample, Trida } from "@/types";

interface Props {
  /** Odkaz z appky Vyhodnocení testů (ověří se na serveru), nebo už uložený plán. */
  token?: string;
  plan?: PlanPoTestu;
  isGuest: boolean;
  isPremium: boolean;
  /** Třída žáka: doporučení pro jinou třídu se nespouští (třídy jsou oddělené). */
  tridaZaka: Trida;
  onStart: (ids: string[]) => void;
  onNeplatne: () => void;
}

/**
 * Obrazovka „Doporučeno po testu nanečisto“: 1–3 témata z testu s důvodem, hlavní tlačítko na smíšenou
 * sadu 10 příkladů (6/3/1, obtížnost podle bodů v testu), u každého tématu běžný trénink.
 * Host vidí doporučení a přihlášení / registraci (odkaz si zařízení pamatuje), přihlášený si ho může uložit do plánu.
 */
export default function DoporuceniPoTestu({ token, plan, isGuest, isPremium, tridaZaka, onStart, onNeplatne }: Props) {
  const [d, setD] = useState<Doporuceni | null>(plan?.doporuceni ?? null);
  const [ulozeno, setUlozeno] = useState(!!plan);
  const [ukladam, setUkladam] = useState(false);

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
  const zamceno = (k: string) => !isGuest && isTopicLocked(k, isPremium);
  const volnych = d.top.filter((t) => !zamceno(t.k)).length;
  const navrat = token ? `/trenink?doporuceni=${encodeURIComponent(token)}` : "/trenink?plan=1";

  function zacit() {
    const ulohy = (examplesFor(trida) as DBExample[]).map((e) => ({ id: e.id, tema: e.tema, obtiznost: e.obtiznost, podtema: e.podtema, dovednost: e.dovednost }));
    const ids = sestavDoporucenouSadu(d!.top, ulohy, zamceno, (u) => dovednostUlohy(u as unknown as DBExample));
    if (ids.length) onStart(ids);
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

      <div className="grid gap-3">
        {d.top.map((t, i) => {
          const z = zamceno(t.k);
          const href = z ? "/premium" : t.s ? `/trenink?tema=${t.k}&dovednost=${t.s}` : maDovednosti(t.k) ? `/trenink?vyber=${t.k}` : `/trenink?tema=${t.k}`;
          return (
            <div key={`${t.k}-${t.s ?? ""}`} className="mm-karta p-4 grid grid-cols-[48px_minmax(0,1fr)] sm:grid-cols-[48px_minmax(0,1fr)_auto] gap-3 items-center" style={temaStyl(t.k)} data-tema={t.k}>
              <span className="relative">
                <HexIkona tema={t.k} velikost={48} />
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full text-[11px] font-extrabold text-white flex items-center justify-center" style={{ background: "var(--tema-barva)" }}>{i + 1}</span>
              </span>
              <span className="min-w-0">
                <b className="block text-[16px] leading-tight" style={{ color: "#0D1B3E" }}>{nazevTematu(t)}</b>
                <span className="block text-sm" style={{ color: "#5F6982" }}>{proc(t)}</span>
                <span className="mt-2 block h-1.5 rounded-full overflow-hidden" style={{ background: "var(--tema-tint)" }}>
                  <i className="block h-full rounded-full" style={{ width: `${Math.max(3, (t.pts / t.max) * 100)}%`, background: "var(--tema-barva)" }} />
                </span>
              </span>
              {!isGuest && (
                <Link href={href} className="col-span-2 sm:col-span-1 py-2.5 px-4 rounded-xl text-center text-sm font-extrabold mm-obrys" style={{ color: "#0D1B3E", border: "1.5px solid #E4E6EF" }}>
                  {z ? "🔒 V Premium" : "Trénovat"}
                </Link>
              )}
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
            <button type="button" onClick={zacit} className="w-full py-4 rounded-2xl text-center text-base font-extrabold mm-tlacitko" style={{ background: "#F5A623", color: "#0D1B3E" }} data-testid="doporuceni-start">
              Začít doporučený trénink · 10 příkladů
            </button>
          ) : (
            <Link href="/premium" className="w-full py-4 rounded-2xl text-center text-base font-extrabold text-white mm-tlacitko" style={{ background: "#0D1B3E" }}>
              Doporučená témata jsou v Premium
            </Link>
          )}
          {ulozeno ? (
            <p className="text-center text-sm font-bold" style={{ color: "#14753A" }} data-testid="doporuceni-ulozeno">✓ Uloženo v tvém plánu, najdeš ho na domovské stránce</p>
          ) : (
            <button type="button" onClick={ulozit} disabled={ukladam} className="w-full py-3 rounded-2xl text-center font-bold mm-obrys disabled:opacity-60" style={{ color: "#0D1B3E", border: "1.5px solid #E4E6EF" }} data-testid="doporuceni-ulozit">
              {ukladam ? "Ukládám…" : "Uložit do mého plánu"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
