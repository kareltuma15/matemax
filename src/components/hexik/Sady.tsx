"use client";

import { merFunkci } from "@/lib/analytics";
import { useEffect } from "react";
import OdmenaVizual from "./OdmenaVizual";
import { useSbirka } from "@/lib/use-sbirka";
import { localDateStr } from "@/lib/date";
import {
  SADY, SEZONY, najdiOdmenu, postupSady, aktualniSezona, konecSezony, upravSbirku, nastavEfekt, nastavDomov, type Sada,
} from "@/lib/sbirka";
import type { Trida } from "@/types";

function datum(den: string): string {
  const [, m, d] = den.split("-").map(Number);
  return `${d}. ${m}.`;
}

/**
 * Záložka Sady (pravidla schválená 19. 11. 2026): za polovinu sady efekt kolem Hexíka, za celou domov
 * (3D místo) a bonus krystalů. Sezónní sady jdou sbírat jen v sezóně, Advent jen z adventního kalendáře.
 */
export default function Sady({ trida }: { trida: Trida }) {
  useEffect(() => { merFunkci("sady"); }, []);
  const { stav, nacteno } = useSbirka();
  if (!nacteno) return <div className="mm-karta h-64 animate-pulse" aria-hidden="true" />;
  const den = localDateStr();
  const sezona = aktualniSezona(den);
  const sady = SADY[trida];
  const hotovo = sady.filter((sd) => postupSady(stav, sd).hotovo).length;
  const efektu = sady.filter((sd) => postupSady(stav, sd).efekt).length;
  const zapnutyEfekt = stav.okoli?.[trida];
  const domov = stav.domov?.[trida];

  return (
    <section className="flex flex-col gap-3" data-testid="sady">
      <p className="text-sm" style={{ color: "#5F6982" }}>
        <b style={{ color: "#0D1B3E" }}>{hotovo} z {sady.length}</b> sad hotovo{efektu > 0 ? `, ${efektu} ${efektu === 1 ? "efekt" : efektu < 5 ? "efekty" : "efektů"} kolem Hexíka` : ""}.
        {" "}Za polovinu sady se kolem Hexíka rozběhne efekt, za celou sadu dostane Hexík domov.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {sady.map((sd) => (
          <KartaSady key={sd.id} sd={sd} trida={trida} den={den} sezonaId={sezona?.id ?? null} zapnuto={zapnutyEfekt === sd.id} domovem={domov === sd.id} />
        ))}
      </div>
    </section>
  );
}

function KartaSady({ sd, trida, den, sezonaId, zapnuto, domovem }: { sd: Sada; trida: Trida; den: string; sezonaId: string | null; zapnuto: boolean; domovem: boolean }) {
  const { stav } = useSbirka();
  const p = postupSady(stav, sd);
  const kdy = stav.sady?.[sd.id];
  const z = sd.sezona ? SEZONY.find((x) => x.id === sd.sezona)! : null;
  const bezi = !z || sezonaId === z.id;
  const chybiNaEfekt = Math.max(0, p.polovina - p.mam);
  const chybiNaDomov = p.z - p.mam;
  const procent = Math.round((Math.min(p.mam, p.z) / p.z) * 100);
  const pulka = Math.round((p.polovina / p.z) * 100);

  return (
    <div
      className="mm-karta p-4 flex flex-col gap-3"
      style={p.hotovo ? { borderColor: "#F3C14B", boxShadow: "0 0 0 2px rgba(243,193,75,.35)", background: "linear-gradient(160deg,#FFF8E6,#fff 55%)" } : undefined}
      data-testid={`sada-${sd.id}`}
      data-hotovo={p.hotovo ? "1" : "0"}
      data-efekt={p.efekt ? "1" : "0"}
    >
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">{sd.ikona}</span>
        <div className="flex-1 min-w-0">
          <p className="font-black text-lg leading-tight" style={{ color: "#0D1B3E" }}>{sd.nazev}</p>
          <p className="text-xs" style={{ color: "#5F6982" }}>
            {kdy ? `Hotovo ${datum(kdy)} · ${sd.bonus} krystalů připsáno` : `Za polovinu ${sd.efekt.nazev.toLowerCase()}, za celou ${sd.domov.nazev} a ${sd.bonus} krystalů`}
          </p>
        </div>
        <span className="text-sm font-black tabular-nums" style={{ color: p.hotovo ? "#9A5B00" : "#5F6982" }}>{Math.min(p.mam, p.z)}/{p.z}</span>
      </div>

      {z && (
        <span className="mm-sezona-stitek self-start">
          {z.ikona} {bezi ? `Sezóna ${z.nazev}, jen do ${datum(konecSezony(z, den))}` : `Sezóna ${z.nazev}: věci se dají získat od ${datum(`2000-${z.od}`)}`}
        </span>
      )}
      {sd.puvod === "kalendar" && <span className="mm-sezona-stitek self-start" style={{ background: "#FFF1DC", color: "#9A5B00" }}>🍪 Věci z adventního kalendáře, 1. až 24. 12.</span>}

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

      {/* Cesta: polovina = efekt, celá = domov */}
      <div className="flex flex-col gap-2">
        <div className="relative h-2.5 rounded-full" style={{ background: "#E3E7F0" }} aria-hidden="true">
          <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${procent}%`, background: "linear-gradient(90deg,#F5A623,#FFD36E)" }} />
          <span className="absolute top-1/2 w-1 h-4 rounded -translate-x-1/2 -translate-y-1/2" style={{ left: `${pulka}%`, background: "#0D1B3E", opacity: 0.35 }} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Krok ok={p.efekt} nazev={sd.efekt.nazev} text={p.efekt ? "Efekt kolem Hexíka" : `Za ${p.polovina} z ${p.z}, ještě ${chybiNaEfekt}`} testid={`sada-krok-efekt-${sd.id}`} />
          <Krok ok={p.hotovo} nazev={sd.domov.nazev} text={p.hotovo ? (sd.domov.hotovy ? "Domov Hexíka" : "Hexík se nastěhuje v lednu") : `Za celou sadu, ještě ${chybiNaDomov}`} testid={`sada-krok-domov-${sd.id}`} />
        </div>
      </div>

      {(p.efekt || (p.hotovo && sd.domov.hotovy)) && (
        <div className="flex flex-wrap gap-2">
          {p.efekt && (
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl text-[13px] font-extrabold mm-klik"
              style={zapnuto ? { background: "#0D1B3E", color: "#fff" } : { background: "#EEF1F6", color: "#0D1B3E" }}
              onClick={() => upravSbirku((s) => nastavEfekt(s, trida, zapnuto ? null : sd.id))}
              aria-pressed={zapnuto}
              data-testid={`sada-efekt-${sd.id}`}
            >
              {zapnuto ? `✓ ${sd.efekt.nazev} zapnuto` : `Zapnout ${sd.efekt.nazev.toLowerCase()}`}
            </button>
          )}
          {p.hotovo && sd.domov.hotovy && (
            <button
              type="button"
              className="px-3 py-1.5 rounded-xl text-[13px] font-extrabold mm-klik"
              style={domovem ? { background: "#0D1B3E", color: "#fff" } : { background: "#EEF1F6", color: "#0D1B3E" }}
              onClick={() => upravSbirku((s) => nastavDomov(s, trida, domovem ? null : sd.id))}
              aria-pressed={domovem}
              data-testid={`sada-domov-${sd.id}`}
            >
              {domovem ? `✓ Hexík bydlí: ${sd.domov.nazev}` : `Nastěhovat Hexíka`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Krok({ ok, nazev, text, testid }: { ok: boolean; nazev: string; text: string; testid: string }) {
  return (
    <div
      className="rounded-xl px-2.5 py-2 text-[12px] leading-snug"
      style={ok ? { border: "1.5px solid #1F9D55", background: "#E9F8EF", color: "#2C5A40" } : { border: "1.5px dashed #D5DAE6", color: "#5F6982" }}
      data-testid={testid}
      data-ok={ok ? "1" : "0"}
    >
      <b className="block text-[13px]" style={{ color: ok ? "#14663D" : "#0D1B3E" }}>{ok ? "✓" : "🔒"} {nazev}</b>
      {text}
    </div>
  );
}
