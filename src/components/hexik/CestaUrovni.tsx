"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import OdmenaVizual from "./OdmenaVizual";
import { loadProgress } from "@/lib/progress";
import { urovenZXP, odmenaUrovne, UROVNE_S_ODMENOU } from "@/lib/urovne";
import type { Trida } from "@/types";

/**
 * Cesta úrovní ve Sbírce: kde žák je, kolik XP chybí a co dostane za každou další úroveň.
 * Věci za úroveň nejdou koupit ani vylosovat, takže je tu vidět, proč se vyplatí trénovat dál.
 */
export default function CestaUrovni({ trida }: { trida: Trida }) {
  const [xp, setXp] = useState<number | null>(null);
  useEffect(() => {
    const obnov = () => setXp(loadProgress().xp ?? 0);
    obnov();
    window.addEventListener("matemax-progress-update", obnov);
    return () => window.removeEventListener("matemax-progress-update", obnov);
  }, []);

  if (xp === null) return null;
  const u = urovenZXP(xp);
  const urovne = Array.from({ length: Math.max(UROVNE_S_ODMENOU, u.n + 1) - 1 }, (_, i) => odmenaUrovne(trida, i + 2));

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] items-start" data-testid="cesta-urovni">
      <div className="mm-karta p-5 flex flex-col gap-3 lg:sticky lg:top-24">
        <div className="flex items-center gap-3">
          <span className="w-14 h-14 rounded-2xl grid place-items-center text-2xl font-black text-white shrink-0" style={{ background: "#5B55D6" }} data-testid="cesta-uroven">{u.n}</span>
          <div className="min-w-0">
            <p className="text-xs font-extrabold uppercase tracking-wide" style={{ color: "#5F6982" }}>{u.hodnost.icon_emoji} {u.hodnost.label}</p>
            <p className="font-black text-xl leading-tight" style={{ color: "var(--text-primary)" }}>Úroveň {u.n}</p>
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs font-bold" style={{ color: "#5F6982" }}>
            <span className="tabular-nums">{xp} XP</span>
            <span className="tabular-nums">další úroveň {u.do} XP</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden mt-1" style={{ background: "#E7E9F3" }}>
            <i className="block h-full rounded-full" style={{ width: `${Math.max(3, Math.round(u.podil * 100))}%`, background: "#F5A623" }} />
          </div>
        </div>
        <div className="text-sm flex flex-col gap-1.5" style={{ color: "#33405F" }}>
          <p><b>XP dostáváš za učení:</b> správně vyřešený příklad 10 XP (se sérií dní víc), Boss týdne 50 XP, k tomu odznaky a milníky.</p>
          <p><b>Za každou novou úroveň</b> krystaly. Na vybraných úrovních věc, která nejde koupit ani vylosovat, a na 10., 20. a 30. úrovni legendární truhla.</p>
        </div>
        <Link href="/trenink" className="mm-tlacitko rounded-2xl py-3 text-center font-extrabold" style={{ background: "#F5A623", color: "#0D1B3E" }}>Trénovat a sbírat XP</Link>
      </div>

      <ol className="flex flex-col gap-2">
        {urovne.map((o) => {
          const hotovo = o.n <= u.n;
          const dalsi = o.n === u.n + 1;
          const velka = !!o.vec || o.legendarni;
          return (
            <li
              key={o.n}
              className="mm-karta px-3 py-2.5 flex items-center gap-3"
              style={dalsi ? { borderColor: "#F5A623", boxShadow: "0 0 0 2px #F5A62355" } : hotovo ? { opacity: 0.72 } : undefined}
              data-testid={`cesta-${o.n}`}
              data-hotovo={hotovo ? "1" : "0"}
            >
              <span
                className="w-10 h-10 rounded-xl grid place-items-center font-black shrink-0"
                style={hotovo ? { background: "#2FA36B", color: "#fff" } : dalsi ? { background: "#F5A623", color: "#0D1B3E" } : { background: "#EEF0F6", color: "#5F6982" }}
              >
                {hotovo ? "✓" : o.n}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold" style={{ color: "#5F6982" }}>
                  Úroveň {o.n}{dalsi ? ` · chybí ${u.do - xp} XP` : ""}
                </p>
                <p className="text-sm font-extrabold flex items-center gap-1.5 flex-wrap" style={{ color: "var(--text-primary)" }}>
                  <span className="flex items-center gap-1"><i className="hx-krystal" aria-hidden="true" /> {o.krystaly}</span>
                  {o.vec && <span>· {o.vec.nazev}</span>}
                  {o.legendarni && <span>· 🎁 legendární truhla</span>}
                </p>
              </div>
              {o.vec && (
                <span className="w-16 h-11 flex items-center justify-center shrink-0" style={!hotovo ? { filter: "grayscale(.5)", opacity: 0.8 } : undefined}>
                  <OdmenaVizual o={o.vec} velikost={34} />
                </span>
              )}
              {!o.vec && velka && <span className="text-2xl shrink-0" aria-hidden="true">🎁</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
