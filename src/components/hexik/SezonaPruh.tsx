"use client";

import { localDateStr } from "@/lib/date";
import { aktualniSezona, konecSezony, ODMENY } from "@/lib/sbirka";
import type { Trida } from "@/types";

const POZADI: Record<string, string> = {
  vanoce: "linear-gradient(120deg,#8E1B1F,#C0392B 45%,#1F7A3A)",
  zima: "linear-gradient(120deg,#1F4F80,#4E9BD6 55%,#8CC9F0)",
  finis: "linear-gradient(120deg,#0D1B3E,#2E6DA4 55%,#E0A400)",
};

/** Pruh nahoře ve Sbírce, když běží sezóna: kolik sezónních věcí je v nabídce a do kdy. */
export default function SezonaPruh({ trida }: { trida: Trida }) {
  const den = localDateStr();
  const z = aktualniSezona(den);
  if (!z) return null;
  const [, m, d] = konecSezony(z, den).split("-").map(Number);
  const pocet = ODMENY[trida].filter((o) => o.sezona === z.id).length;
  return (
    <section
      className="rounded-2xl px-4 py-3 flex items-center gap-3"
      style={{ background: POZADI[z.id], color: "#fff" }}
      data-testid="sezona-pruh"
      data-sezona={z.id}
    >
      <span className="text-3xl" aria-hidden="true">{z.ikona}</span>
      <p className="flex-1 min-w-0 text-sm">
        <b>Sezóna {z.nazev}</b> · jen do {d}. {m}. V šatníku je {pocet} sezónních věcí a otevřít jde {z.truhla}. Co získáš, zůstane ti i po sezóně.
      </p>
    </section>
  );
}
