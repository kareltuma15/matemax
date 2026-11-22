"use client";

import { useState } from "react";
import Link from "next/link";
import Hexik from "./Hexik";
import JakZiskat from "./JakZiskat";
import { useSbirka } from "@/lib/use-sbirka";
import { nasazena } from "@/lib/sbirka";
import type { Trida } from "@/types";

const KLIC = "matemax-hexik-uvod";

function videl(): boolean {
  try { return localStorage.getItem(KLIC) === "1"; } catch { return true; }
}

/**
 * Uvítání Hexíka: tři kroky, jak herní systém funguje (učení → krystaly a XP → truhly a šatník).
 * Nezavírá obsah (není to okno přes stránku), dítě ho schová tlačítkem „Rozumím“ a už se neukáže.
 */
export default function HexikUvod({ trida, naSbirce = false }: { trida: Trida; naSbirce?: boolean }) {
  const { stav, nacteno } = useSbirka();
  const [skryt, setSkryt] = useState<boolean>(() => (typeof window === "undefined" ? true : videl()));
  const [vic, setVic] = useState(false);
  if (!nacteno || skryt) return null;

  const zavri = () => { try { localStorage.setItem(KLIC, "1"); } catch { /* bez úložiště jen schovat */ } setSkryt(true); };
  const kroky = [
    { ikona: "✏️", nadpis: "Řeš příklady", text: "Za každou správnou odpověď dostaneš krystaly a XP. Za rychlé tipování nic." },
    { ikona: "⭐", nadpis: "Sbírej úrovně", text: "S XP rosteš v úrovních. Každá dá krystaly, některé i věc, kterou jinde nezískáš." },
    { ikona: "🎁", nadpis: "Otevírej truhly", text: "Za krystaly otevřeš truhly a oblékneš mě. Nic se nekupuje za peníze." },
  ];

  return (
    <section className="@container rounded-3xl p-4 lg:p-5 flex flex-col gap-3" style={{ background: "linear-gradient(135deg,#EEEDFE,#FFF6E5)", border: "1.5px solid #DCD9FB" }} data-testid="hexik-uvod">
      <div className="flex items-center gap-3">
        <Hexik podoba={nasazena(stav, trida, "podoba").klic} className="w-14 shrink-0" />
        <div className="min-w-0">
          <p className="font-black text-lg leading-tight" style={{ color: "#0D1B3E" }}>Ahoj, já jsem Hexík!</p>
          <p className="text-sm" style={{ color: "#5F6982" }}>Budu s tebou u každého příkladu. Takhle to funguje:</p>
        </div>
      </div>
      {/* Tři vedle sebe jen když je na to místo (ne v úzkém pravém sloupci Domova na počítači) */}
      <ol className="grid gap-2 @lg:grid-cols-3">
        {kroky.map((k, i) => (
          <li key={k.nadpis} className="rounded-2xl bg-white p-3 flex gap-2.5" style={{ border: "1px solid #E4E6EF" }}>
            <span className="w-8 h-8 rounded-xl grid place-items-center text-lg shrink-0" style={{ background: "#EEEDFE" }} aria-hidden="true">{k.ikona}</span>
            <span className="min-w-0">
              <b className="block text-sm" style={{ color: "#0D1B3E" }}>{i + 1}. {k.nadpis}</b>
              <span className="block text-xs leading-snug" style={{ color: "#5F6982" }}>{k.text}</span>
            </span>
          </li>
        ))}
      </ol>
      {vic && <JakZiskat kompaktni />}
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/trenink" className="mm-tlacitko rounded-2xl px-5 py-2.5 font-extrabold" style={{ background: "#F5A623", color: "#0D1B3E" }} onClick={zavri}>Jdeme trénovat</Link>
        {!naSbirce && <Link href="/sbirka" className="rounded-2xl px-4 py-2.5 font-extrabold mm-obrys" style={{ color: "#0D1B3E" }} onClick={zavri}>Moje Sbírka</Link>}
        {!vic && <button type="button" onClick={() => setVic(true)} className="text-sm font-bold underline" style={{ color: "#5B55D6" }}>Za co přesně jsou krystaly?</button>}
        <button type="button" onClick={zavri} className="ml-auto text-sm font-bold" style={{ color: "#5F6982" }} data-testid="hexik-uvod-zavrit">Rozumím</button>
      </div>
    </section>
  );
}
