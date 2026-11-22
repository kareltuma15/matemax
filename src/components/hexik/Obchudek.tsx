"use client";

import { merFunkci } from "@/lib/analytics";
import { useState } from "react";
import { useSbirka } from "@/lib/use-sbirka";
import { useTrida } from "@/lib/trida";
import { krystaly, upravSbirku, domovHexika, nastavDomov } from "@/lib/sbirka";
import { MISTA, VYBAVENI, maVec, nasazeneVybaveni, kupVec, postavVec, type MistoVybaveni } from "@/lib/vybaveni";

/**
 * Obchůdek (Karel 20. 11. 2026): jedno místo pro utrácení krystalů. Nahoře vybavení Hexíkova pokojíčku
 * (6 míst, věci za 120 / 300 / 600), pod tím vzhled appky a pozadí (přesunuté ze šatníku, vykresluje
 * je stránka Sbírky). Truhly za krystaly zůstávají v záložce Truhly.
 */
export default function Obchudek() {
  const { stav } = useSbirka();
  const { trida } = useTrida();
  const [misto, setMisto] = useState<MistoVybaveni>("obraz");
  const nasazeno = nasazeneVybaveni(stav);
  const mam = krystaly(stav);
  const jinyDomov = domovHexika(stav, trida);
  const veci = VYBAVENI.filter((v) => v.misto === misto);

  return (
    <section className="flex flex-col gap-3" data-testid="obchudek">
      <div className="mm-karta p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>🛍️ Vybavení pokojíčku</h2>
          <span className="text-sm font-extrabold rounded-full px-3 py-1" style={{ background: "#E6F6FF", color: "#0E6BA8" }} data-testid="obchudek-krystaly">💎 {mam} krystalů</span>
        </div>
        <p className="text-sm" style={{ color: "#5F6982" }}>Vyber místo v Hexíkově pokojíčku a postav tam novou věc. Koupíš ji jednou a můžeš ji kdykoli vrátit zpátky.</p>
        {jinyDomov && (
          <p className="text-sm rounded-xl px-3 py-2 flex flex-wrap items-center gap-2" style={{ background: "#FFF6E5", color: "#7A4A00" }} data-testid="obchudek-jiny-domov">
            Hexík teď bydlí v pokoji {jinyDomov.nazev}, který má vlastní výzdobu. Vybavení uvidíš v Hexíkově pokojíčku.
            <button type="button" onClick={() => upravSbirku((s) => nastavDomov(s, trida, null))} className="font-extrabold underline">Přestěhovat do pokojíčku</button>
          </p>
        )}
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label="Místo v pokojíčku" style={{ scrollbarWidth: "none" }}>
          {MISTA.map((m) => (
            <button key={m.misto} type="button" role="tab" aria-selected={misto === m.misto} onClick={() => setMisto(m.misto)}
              className={`shrink-0 rounded-xl px-3 py-2 text-sm font-extrabold ${misto === m.misto ? "text-white" : "mm-obrys"}`} style={misto === m.misto ? { background: "#5B55D6" } : undefined} data-testid={`misto-${m.misto}`}>
              {m.ikona} {m.nazev}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" data-testid="vybaveni-mrizka">
          {veci.map((v) => {
            const ma = maVec(stav, v.id);
            const stoji = nasazeno[v.misto] === v.id.slice(v.misto.length + 1);
            const chybi = !ma && mam < v.cena;
            return (
              <div key={v.id} className="mm-karta p-3 flex flex-col gap-2 items-center text-center" style={stoji ? { borderColor: "#5B55D6", boxShadow: "0 0 0 2px rgba(91,85,214,.3)" } : undefined} data-testid={`vec-${v.id}`}>
                <span className="text-4xl leading-none h-12 grid place-items-center" aria-hidden="true">{v.ikona}</span>
                <b className="text-[13px] leading-tight" style={{ color: "var(--text-primary)" }}>{v.nazev}</b>
                {stoji ? (
                  <span className="text-xs font-extrabold" style={{ color: "#1F9D55" }}>✓ V pokojíčku</span>
                ) : ma ? (
                  <button type="button" onClick={() => upravSbirku((s) => postavVec(s, v.id))} className="mm-tlacitko w-full rounded-xl py-2 text-sm font-extrabold text-white" style={{ background: "#5B55D6" }} data-testid={`postavit-${v.id}`}>Postavit</button>
                ) : (
                  <button type="button" disabled={chybi} onClick={() => { upravSbirku((s) => kupVec(s, v.id)); merFunkci("obchudek"); }} className="mm-tlacitko w-full rounded-xl py-2 text-sm font-extrabold text-white disabled:opacity-55 disabled:cursor-not-allowed" style={{ background: "#5B55D6" }} data-testid={`koupit-${v.id}`}>
                    {chybi ? `Chybí ${v.cena - mam} 💎` : `Koupit za ${v.cena} 💎`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <h2 className="text-lg font-black mt-1" style={{ color: "var(--text-primary)" }}>🎨 Vzhled appky a pozadí</h2>
    </section>
  );
}
