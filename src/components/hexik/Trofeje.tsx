"use client";

import Hexik from "./Hexik";
import { useSbirka } from "@/lib/use-sbirka";
import { TROFEJE, ETAPY_HEXIKA, etapaHexika, nasazena } from "@/lib/sbirka";
import type { Trida } from "@/types";

function datum(den: string): string {
  const [, m, d] = den.split("-").map(Number);
  return `${d}. ${m}.`;
}

/** Záložka Trofeje ve Sbírce: trofeje (jen vybojovat, nekupují se) a Hexík, který roste s odhadem bodů. */
export default function Trofeje({ trida }: { trida: Trida }) {
  const { stav, nacteno } = useSbirka();
  if (!nacteno) return <div className="mm-karta h-64 animate-pulse" aria-hidden="true" />;
  const mam = stav.trofeje ?? {};
  const pocet = TROFEJE.filter((t) => mam[t.id]).length;
  const etapa = etapaHexika(stav.maxOdhad[trida]);
  const odhad = stav.maxOdhad[trida];

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] items-start" data-testid="trofeje">
      <div className="flex flex-col gap-3">
        <p className="text-sm" style={{ color: "#5F6982" }}>
          <b style={{ color: "#0D1B3E" }}>{pocet} z {TROFEJE.length}</b> trofejí. Nedají se koupit ani vylosovat, jen vybojovat.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {TROFEJE.map((t) => {
            const kdy = mam[t.id];
            return (
              <div
                key={t.id}
                className="mm-karta p-3 flex flex-col gap-1.5"
                style={kdy ? { background: "linear-gradient(160deg,#FFF8E6,#fff 60%)", borderColor: "#F3D9A0" } : { opacity: 0.7 }}
                data-testid={`trofej-${t.id}`}
                data-ziskana={kdy ? "1" : "0"}
              >
                <span className="text-3xl" style={kdy ? undefined : { filter: "grayscale(1)", opacity: 0.45 }} aria-hidden="true">{t.ikona}</span>
                <b className="text-sm leading-tight" style={{ color: "#0D1B3E" }}>{t.nazev}</b>
                <span className="text-xs leading-snug" style={{ color: "#5F6982" }}>{t.popis}</span>
                <span className="text-[11px] font-extrabold mt-auto" style={{ color: kdy ? "#9A5B00" : "#A0A8BD" }}>{kdy ? `Získáno ${datum(kdy)}` : "Zatím ne"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mm-karta p-4 lg:p-5 flex flex-col gap-3 lg:sticky lg:top-24" data-testid="hexik-roste">
        <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#5F6982" }}>Hexík roste s tebou</p>
        <div className="flex items-center gap-3">
          <Hexik podoba={nasazena(stav, trida, "podoba").klic} etapa={etapa} staticky className="w-20 shrink-0" />
          <p className="text-sm" style={{ color: "#33405F" }}>
            Podoba se řídí nejvyšším odhadem bodů u přijímaček{odhad !== undefined ? ` (zatím ${odhad} b.)` : ""}. Co jednou získáš, už ti nikdo nevezme.
          </p>
        </div>
        <ol className="flex flex-col">
          {ETAPY_HEXIKA.map((e, i) => {
            const ok = i < etapa;
            return (
              <li key={e.nazev} className="grid grid-cols-[26px_1fr_auto] gap-2 items-center text-[13px] py-1.5 border-b border-dashed last:border-0" style={{ borderColor: "#E4E6EF" }}>
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-extrabold" style={ok ? { background: "#E2F4E9", color: "#14753A" } : { background: "#F3F4F9", color: "#8A93AA" }}>{ok ? "✓" : i + 1}</span>
                <span style={{ color: "#0D1B3E" }}><b>{e.nazev}</b> · {e.doplnek}</span>
                <span className="text-xs" style={{ color: "#8A93AA" }}>od {e.od} b.</span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
