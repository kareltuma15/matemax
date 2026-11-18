"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Hexik from "./Hexik";
import { novinky, type NovinkaVeStavu } from "@/lib/novinky";
import { localDateStr } from "@/lib/date";
import type { Trida } from "@/types";

const KLIC = "matemax-novinky-videne";

function videne(): string[] {
  try { return JSON.parse(localStorage.getItem(KLIC) ?? "[]") as string[]; } catch { return []; }
}

/**
 * Novinky na Domově žáka (Karel 18. 11. 2026): nahoře karta s novinkou (ukáže se, dokud ji žák nezavře
 * nebo nevyzkouší) a pod ní „Brzy“ s odpočtem, ať ví, na co se těšit. Data z kroniky (lib/novinky.ts).
 */
export default function NovinkyDomov({ trida }: { trida: Trida }) {
  const [stav, setStav] = useState<{ nova: NovinkaVeStavu | null; brzy: NovinkaVeStavu | null } | null>(null);
  useEffect(() => {
    const seznam = novinky(localDateStr(), trida);
    const v = videne();
    setStav({ nova: seznam.find((n) => n.stav === "nove" && !v.includes(n.klic)) ?? null, brzy: seznam.find((n) => n.stav === "brzy") ?? null }); // eslint-disable-line react-hooks/set-state-in-effect
  }, [trida]);
  if (!stav || (!stav.nova && !stav.brzy)) return null;
  const zavri = (klic: string) => {
    try { localStorage.setItem(KLIC, JSON.stringify([...videne(), klic].slice(-30))); } catch { /* bez paměti */ }
    setStav((s) => (s ? { ...s, nova: null } : s));
  };
  const n = stav.nova, b = stav.brzy;
  return (
    <div className="flex flex-col gap-2" data-testid="novinky-domov">
      {n && (
        <div className="relative rounded-[20px] p-3.5 text-white grid items-center gap-3" style={{ gridTemplateColumns: "72px minmax(0,1fr)", background: "linear-gradient(135deg,#3B2F9E,#1E3A6E)" }}>
          <button type="button" aria-label="Zavřít novinku" onClick={() => zavri(n.klic)} className="absolute right-2.5 top-2 text-sm font-black" style={{ color: "#B9C4E4" }}>✕</button>
          <Hexik podoba="klasik" etapa={3} staticky style={{ width: 72, height: 72 }} />
          <div className="min-w-0 pr-5">
            <span className="inline-block text-[10px] font-black uppercase tracking-wider rounded-full px-2 py-0.5" style={{ background: "#34D399", color: "#05351F" }}>Nově</span>
            <b className="block text-[15px] mt-0.5">{n.nadpis}</b>
            <p className="text-[13px]" style={{ color: "#D7DEF5" }}>{n.text}</p>
            {n.odkaz && <Link href={n.odkaz} onClick={() => zavri(n.klic)} className="inline-block mt-2 rounded-xl px-3 py-1.5 text-[13px] font-black" style={{ background: "#F5A623", color: "#0D1B3E" }}>Vyzkoušet</Link>}
          </div>
        </div>
      )}
      {b && (
        <div className="rounded-[18px] px-3.5 py-3 flex items-center gap-3 mm-karta" style={{ borderStyle: "dashed" }}>
          <span className="w-11 h-11 rounded-xl grid place-items-center text-xl shrink-0" style={{ background: "#FDECEC" }} aria-hidden="true">{b.vizual === "kalendar" ? "🎄" : "✨"}</span>
          <span className="min-w-0">
            <b className="block text-[15px]" style={{ color: "var(--text-primary)" }}>{b.dniDoStartu === 1 ? `Zítra: ${b.nadpis.toLowerCase()}` : `Za ${b.dniDoStartu} dní: ${b.nadpis.toLowerCase()}`}</b>
            <span className="block text-[13px]" style={{ color: "#5F6982" }}>{b.text}</span>
          </span>
        </div>
      )}
    </div>
  );
}
