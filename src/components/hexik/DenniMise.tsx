"use client";

import Link from "next/link";
import { useSbirka } from "@/lib/use-sbirka";
import { localDateStr } from "@/lib/date";
import { MISE, ZA_MISI, dnesniMise, postupMise, jeMiseHotova } from "@/lib/sbirka";

function dnu(n: number): string {
  return n === 1 ? "den" : n >= 2 && n <= 4 ? "dny" : "dní";
}

/**
 * Tři denní mise (+15 krystalů za každou) s plamínkem série dní.
 * Plamínek roste se sérií, dnes bez tréninku je zhasnutý.
 * Na Domově jako karta s odkazem na trénink, ve Sbírce bez odkazu.
 */
export default function DenniMise({ streak, odkaz = false }: { streak: number; odkaz?: boolean }) {
  const { stav, nacteno } = useSbirka();
  const den = localDateStr();
  if (!nacteno) return <div className="mm-karta h-40 animate-pulse" aria-hidden="true" />;

  const mise = dnesniMise(den);
  const hotovo = mise.filter((id) => jeMiseHotova(stav, id, den)).length;
  const dnesTrenoval = stav.denniOdemcena === den;
  const velikost = Math.min(44, 22 + streak * 2);

  return (
    <section className="mm-karta p-4 lg:p-5 flex flex-col gap-3" data-testid="denni-mise">
      <div className="flex items-center gap-3">
        <span className="mm-plamen shrink-0" style={{ ["--s" as string]: `${velikost}px` }} {...(dnesTrenoval ? {} : { "data-zhasnuty": "" })} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#5F6982" }}>Dnešní mise</p>
          <p className="font-black text-lg leading-tight" style={{ color: "#0D1B3E" }}>
            {streak > 0 ? `${streak} ${dnu(streak)} v řadě` : "Zapal plamínek"}
          </p>
          <p className="text-xs" style={{ color: dnesTrenoval ? "#14753A" : "#C2410C" }}>
            {dnesTrenoval ? "Dnes hoří. Zítra ho zase přilož." : "Dokonči dnes trénink, ať plamínek nezhasne."}
          </p>
        </div>
        <span className="shrink-0 text-sm font-black tabular-nums" style={{ color: hotovo === mise.length ? "#14753A" : "#5F6982" }} data-testid="mise-pocet">
          {hotovo}/{mise.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {mise.map((id) => {
          const m = MISE[id];
          const hotova = jeMiseHotova(stav, id, den);
          const p = Math.min(m.cil, postupMise(stav, id, den));
          return (
            <li key={id} className="flex items-center gap-2.5 text-sm" data-testid={`mise-${id}`} data-hotova={hotova ? "1" : "0"}>
              <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: hotova ? "#E2F4E9" : "#F3F4F9" }} aria-hidden="true">
                {hotova ? "✓" : m.ikona}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold leading-tight" style={{ color: hotova ? "#14753A" : "#0D1B3E", textDecoration: hotova ? "line-through" : undefined }}>{m.text}</span>
                {m.cil > 1 && !hotova && (
                  <span className="mt-1 block h-1.5 rounded-full overflow-hidden" style={{ background: "#EEF0F6" }}>
                    <span className="block h-full rounded-full" style={{ width: `${(p / m.cil) * 100}%`, background: "#F5A623" }} />
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs font-extrabold flex items-center gap-1" style={{ color: hotova ? "#14753A" : "#1E5FA8" }}>
                {m.cil > 1 && !hotova ? `${p}/${m.cil} · ` : ""}+{ZA_MISI} <i className="hx-krystal" aria-hidden="true" />
              </span>
            </li>
          );
        })}
      </ul>
      {odkaz && hotovo < mise.length && (
        <Link href="/trenink" className="mm-obrys w-full py-2.5 rounded-xl text-center text-sm font-extrabold" style={{ color: "#0D1B3E", border: "1.5px solid #E4E6EF" }}>
          Plnit mise →
        </Link>
      )}
    </section>
  );
}
