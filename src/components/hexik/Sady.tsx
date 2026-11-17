"use client";

import OdmenaVizual from "./OdmenaVizual";
import { useSbirka } from "@/lib/use-sbirka";
import { localDateStr } from "@/lib/date";
import { SADY, SEZONY, najdiOdmenu, postupSady, aktualniSezona, konecSezony } from "@/lib/sbirka";
import type { Trida } from "@/types";

function datum(den: string): string {
  const [, m, d] = den.split("-").map(Number);
  return `${d}. ${m}.`;
}

/**
 * Záložka Sady: věci, které k sobě patří. Kdo nasbírá celou sadu, dostane jednou bonus krystalů.
 * Sezónní sady jdou dokončit jen v sezóně (mimo ni se věci nedají koupit ani vylosovat).
 */
export default function Sady({ trida }: { trida: Trida }) {
  const { stav, nacteno } = useSbirka();
  if (!nacteno) return <div className="mm-karta h-64 animate-pulse" aria-hidden="true" />;
  const den = localDateStr();
  const sezona = aktualniSezona(den);
  const hotovo = SADY[trida].filter((sd) => stav.sady?.[sd.id]).length;

  return (
    <section className="flex flex-col gap-3" data-testid="sady">
      <p className="text-sm" style={{ color: "#5F6982" }}>
        <b style={{ color: "#0D1B3E" }}>{hotovo} z {SADY[trida].length}</b> sad hotovo. Za celou sadu dostaneš jednou bonus krystalů.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SADY[trida].map((sd) => {
          const p = postupSady(stav, sd);
          const kdy = stav.sady?.[sd.id];
          const z = sd.sezona ? SEZONY.find((x) => x.id === sd.sezona)! : null;
          const bezi = !z || sezona?.id === z.id;
          return (
            <div
              key={sd.id}
              className="mm-karta p-4 flex flex-col gap-3"
              style={kdy ? { borderColor: "#F3C14B", boxShadow: "0 0 0 2px rgba(243,193,75,.35)", background: "linear-gradient(160deg,#FFF8E6,#fff 55%)" } : undefined}
              data-testid={`sada-${sd.id}`}
              data-hotovo={kdy ? "1" : "0"}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden="true">{sd.ikona}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg leading-tight" style={{ color: "#0D1B3E" }}>{sd.nazev}</p>
                  <p className="text-xs" style={{ color: "#5F6982" }}>
                    {kdy ? `Hotovo ${datum(kdy)} · bonus ${sd.bonus} krystalů připsán` : `Bonus za celou sadu: ${sd.bonus} krystalů`}
                  </p>
                </div>
                <span className="text-sm font-black tabular-nums" style={{ color: kdy ? "#9A5B00" : "#5F6982" }}>{p.mam}/{p.z}</span>
              </div>
              {z && (
                <span className="mm-sezona-stitek self-start">
                  {z.ikona} {bezi ? `Sezóna ${z.nazev}, jen do ${datum(konecSezony(z, den))}` : `Sezóna ${z.nazev}: věci se dají získat od ${datum(`2000-${z.od}`)}`}
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                {sd.polozky.map((id) => {
                  const o = najdiOdmenu(id);
                  if (!o) return null;
                  const mam = stav.mam.includes(id);
                  return (
                    <span key={id} className="relative rounded-xl p-1.5 flex flex-col items-center gap-1 w-[76px]" style={{ background: mam ? "#F1F9F3" : "#F3F4F9", opacity: mam ? 1 : 0.6 }} title={o.nazev}>
                      <span className="h-10 flex items-center justify-center" style={mam ? undefined : { filter: "grayscale(.7)" }}><OdmenaVizual o={o} velikost={34} /></span>
                      <span className="text-[10px] font-bold leading-tight text-center" style={{ color: "#33405F" }}>{o.nazev}</span>
                      {mam && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[11px] font-black flex items-center justify-center text-white" style={{ background: "#1F9D55" }}>✓</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
