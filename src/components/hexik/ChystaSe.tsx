"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { novinky, type NovinkaVeStavu } from "@/lib/novinky";
import { OKNA, ZA_VSECHNA_OKNA } from "@/lib/kalendar";
import { obsahOkna } from "./AdventniKalendar";
import { localDateStr } from "@/lib/date";
import type { Trida } from "@/types";

const dniSlovo = (n: number) => (n === 1 ? "den" : n >= 2 && n <= 4 ? "dny" : "dní");

/**
 * „Chystá se v MateMaxu“ na Domově (Karel 22. 11. 2026, mockup domov-pocitac.html): velký odpočet nejbližší
 * akce z kroniky místo malého řádku „Za 9 dní…“. Adventní kalendář má vlastní podobu s mřížkou 24 okének
 * a tím, co v nich bude (z lib/kalendar.ts). Od startu akce karta zmizí a její místo převezme akce sama.
 */
export default function ChystaSe({ trida }: { trida: Trida }) {
  const [brzy, setBrzy] = useState<NovinkaVeStavu | null>(null);
  const [vic, setVic] = useState(false);
  useEffect(() => {
    setBrzy(novinky(localDateStr(), trida).find((n) => n.stav === "brzy") ?? null); // eslint-disable-line react-hooks/set-state-in-effect
  }, [trida]);
  if (!brzy) return null;

  // Adventní kalendář (v kronice s vizuálem kalendáře nebo Vánoční truhly) má vlastní podobu s okénky
  if (brzy.vizual !== "kalendar" && brzy.vizual !== "truhla-vanocni") {
    return (
      <div className="chysta-obal"><section className="chysta chysta-obecne" data-testid="chysta-se">
        <div className="chysta-txt">
          <span className="chysta-stit">Chystá se v MateMaxu</span>
          <div className="chysta-odpocet"><b>{brzy.dniDoStartu}</b><span>{dniSlovo(brzy.dniDoStartu)} do startu</span></div>
          <h3>{brzy.nadpis}</h3>
          <p>{brzy.text}</p>
        </div>
      </section></div>
    );
  }

  const dny = Array.from({ length: 24 }, (_, i) => i + 1);
  const veci = dny.filter((d) => OKNA[d]?.druh === "vec");
  const truhel = dny.filter((d) => OKNA[d]?.druh === "truhla").length;
  const start = brzy.od ? `${Number(brzy.od.slice(8, 10))}. ${brzy.od.slice(5, 7) === "12" ? "prosince" : `${Number(brzy.od.slice(5, 7))}.`}` : "";
  return (
    <div className="chysta-obal"><section className="chysta chysta-advent" data-testid="chysta-se">
      <div className="chysta-snih" aria-hidden="true" />
      <div className="chysta-txt">
        <span className="chysta-stit">Chystá se v MateMaxu</span>
        <div className="chysta-odpocet" data-testid="chysta-se-dni"><b>{brzy.dniDoStartu}</b><span>{dniSlovo(brzy.dniDoStartu)}{start ? ` do ${start}` : ""}</span></div>
        <h3>🎄 Adventní kalendář s Hexíkem</h3>
        <p>24 okének, každý den jedno po tréninku. Uvnitř krystaly, {truhel} sezónní truhly a {veci.length} věcí pro Hexíka, které jinde nejsou. Kdo otevře všech 24, dostane navíc {ZA_VSECHNA_OKNA} krystalů.</p>
        <div className="chysta-body">
          <span>🦌 {veci.length} věcí, které jinde nejsou</span>
          <span>🎁 {truhel} sezónní truhly</span>
          <span>💎 +{ZA_VSECHNA_OKNA} za všech 24</span>
        </div>
        {vic ? (
          <ul className="chysta-veci" data-testid="chysta-se-veci">
            {veci.map((d) => { const o = obsahOkna(d, trida); return <li key={d}><span aria-hidden="true">{o.ik}</span><b>{d}. 12.</b> {o.text}</li>; })}
          </ul>
        ) : (
          <button type="button" className="chysta-btn" onClick={() => setVic(true)}>Podívat se, co bude v okénkách</button>
        )}
        {vic && <Link href="/trenink" className="chysta-btn">Jdu trénovat</Link>}
      </div>
      <div className="chysta-okenka" aria-hidden="true">
        {dny.map((d) => <i key={d} className={d === 24 ? "hvezda" : OKNA[d]?.druh === "vec" ? "vec" : ""}>{d === 24 ? "⭐" : d}</i>)}
      </div>
    </section></div>
  );
}
