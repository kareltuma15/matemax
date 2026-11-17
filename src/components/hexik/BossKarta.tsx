"use client";

import Link from "next/link";
import { useSbirka } from "@/lib/use-sbirka";
import { localDateStr } from "@/lib/date";
import { stavBosse, ZA_BOSSE, XP_ZA_BOSSE } from "@/lib/sbirka";
import { bossTydne } from "@/lib/boss";
import { temaLabel, type Trida } from "@/types";

/** Boss týdne ve Sbírce: těžká úloha ve stylu CERMAT, jeden pokus za týden, výhra = trofej a +100 krystalů. */
/** `jenCeka`: ukázat jen když boss čeká na souboj (Domov, souhrn tréninku). */
export default function BossKarta({ trida, jenCeka = false }: { trida: Trida; jenCeka?: boolean }) {
  const { stav, nacteno } = useSbirka();
  const den = localDateStr();
  const boss = bossTydne(trida, den);
  if (!nacteno || !boss) return null;
  const st = stavBosse(stav, den);
  const porazeno = stav.boss?.porazeno.length ?? 0;
  if (jenCeka && st !== "ceka") return null;

  return (
    <section
      className="rounded-3xl p-4 lg:p-5 flex items-center gap-4 text-white"
      style={{ background: st === "porazen" ? "linear-gradient(135deg,#14532D,#166534)" : "radial-gradient(circle at 20% 20%,#5B3FD6,#1F1A4A 70%)" }}
      data-testid="boss-karta"
      data-stav={st}
    >
      <span className={`text-5xl shrink-0 ${st === "ceka" ? "animate-bounce" : ""}`} aria-hidden="true">{st === "porazen" ? "🏆" : "👾"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "#C9C7F5" }}>Boss týdne · {temaLabel(boss.tema)}</p>
        <p className="font-black text-lg leading-tight">
          {st === "porazen" ? "Poražen! Nový boss přijde v pondělí." : st === "prohra" ? "Tentokrát vyhrál boss." : "Těžká úloha ve stylu přijímaček"}
        </p>
        <p className="text-xs mt-0.5" style={{ color: "#D9D8FE" }}>
          {st === "ceka" ? `Jeden pokus za týden. Výhra: trofej, +${ZA_BOSSE} krystalů a +${XP_ZA_BOSSE} XP.` : st === "prohra" ? "Nový pokus dostaneš s novým bossem v pondělí." : `Poražených bossů celkem: ${porazeno}.`}
        </p>
      </div>
      {st === "ceka" && (
        <Link href="/trenink?boss=1" className="mm-tlacitko shrink-0 rounded-2xl px-4 py-2.5 font-extrabold" style={{ background: "#F5A623", color: "#0D1B3E" }} data-testid="boss-utkat">
          Utkat se
        </Link>
      )}
    </section>
  );
}
