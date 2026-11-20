"use client";

import Link from "next/link";
import type { Trida } from "@/types";

/**
 * Rámeček „Pro rodiče“ (Karel 20. 11. 2026): cena a co Premium dává patří jen sem, oslovuje rodiče (vykání).
 * Dítěti appka nikde neříká „kup si“ ani „řekni rodičům“ (pravidla reklamy zaměřené na děti).
 * Cena z ověřených faktů: Premium 99 Kč měsíčně.
 */
export default function ProRodice({ trida, kompaktni = false }: { trida: Trida; kompaktni?: boolean }) {
  const g5 = trida === 5;
  const body = [
    g5 ? "Všech 8 okruhů pro 5. třídu, všechny úlohy" : "Všech 9 témat, přes 1 200 úloh ve stylu CERMAT",
    "Odhad bodů u přijímaček a kde se trénink vyplatí nejvíc",
    "Každé pondělí e-mail, jak dítěti příprava jde",
  ];
  return (
    <aside
      className={`rounded-[20px] ${kompaktni ? "p-4" : "p-5"} flex flex-col gap-3 text-left`}
      style={{ background: "linear-gradient(150deg, #EBEAFE 0%, #F7F6FF 60%, #FFF6E5 100%)", border: "1.5px solid #C9C7F5" }}
      aria-label="Pro rodiče"
      data-testid="pro-rodice"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: "#0D1B3E", color: "#fff" }}>Pro rodiče</span>
        <span className="text-sm font-extrabold" style={{ color: "#0D1B3E" }}>99 Kč měsíčně</span>
      </div>
      <b className={`${kompaktni ? "text-[16px]" : "text-[18px]"} leading-snug`} style={{ color: "#0D1B3E" }}>
        MateMax Premium: celá příprava na přijímačky v jedné appce
      </b>
      <ul className="flex flex-col gap-1.5 text-sm" style={{ color: "#33405F" }}>
        {body.map((b) => (
          <li key={b} className="grid grid-cols-[18px_minmax(0,1fr)] gap-1.5"><span style={{ color: "#5B55D6" }} aria-hidden>✓</span><span>{b}</span></li>
        ))}
      </ul>
      <p className="text-[13px]" style={{ color: "#5F6982" }}>Zapnete ho na stránce Premium v MateMaxu, platí se kartou.</p>
      <Link href="/premium" className="self-start text-sm font-extrabold mm-odkaz" style={{ color: "#4741B8" }}>
        Co Premium obsahuje →
      </Link>
    </aside>
  );
}
