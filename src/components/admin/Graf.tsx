"use client";

import { useState } from "react";

export interface Sloupec {
  /** Popisek pod osou (např. „19. 11.“ nebo „14 h“). */
  popisek: string;
  hodnota: number;
  /** Druhá řada (např. včera nebo zobrazené stránky) jako tečka nad sloupcem. */
  hodnota2?: number;
  /** Text bubliny při najetí nebo ťuknutí. */
  detail: string;
  zvyraznit?: boolean;
  /** Rozdělení sloupce na části zdola nahoru (součet = hodnota), např. přihlášení a bez účtu. */
  casti?: { hodnota: number; barva: string }[];
}

/** Hezké maximum osy (1, 2, 5, 10, 20, 50…), ať popisky vycházejí v kulatých číslech. */
function hezkeMax(n: number): number {
  if (n <= 4) return Math.max(1, Math.ceil(n));
  const rad = 10 ** Math.floor(Math.log10(n));
  for (const k of [1, 2, 2.5, 5, 10]) if (k * rad >= n) return k * rad;
  return 10 * rad;
}

/**
 * Sloupcový graf pro admin: osa Y s mřížkou a hodnotami, popisky dnů nebo hodin pod sloupci
 * (u mnoha sloupců jen každý n-tý), hodnota po najetí myší nebo ťuknutí, volitelná druhá řada.
 */
export default function Graf({ data, barva = "#5B55D6", barva2 = "#F5A623", legenda, vyska = 180, testid, onVyber, legendaCasti }: {
  data: Sloupec[]; barva?: string; barva2?: string; legenda?: [string, string?]; vyska?: number; testid?: string;
  /** Klepnutí na sloupec (např. otevřít detail dne). */
  onVyber?: (i: number) => void;
  /** Legenda pro rozdělené sloupce: [název, barva]. */
  legendaCasti?: [string, string][];
}) {
  const [vybStav, setVyb] = useState<number | null>(null);
  const [pevny, setPevny] = useState<number | null>(null);
  const vyb = vybStav ?? pevny;
  const max = hezkeMax(Math.max(1, ...data.map((d) => Math.max(d.hodnota, d.hodnota2 ?? 0))));
  const krokPopisku = Math.max(1, Math.ceil(data.length / 10));
  const aktivni = vyb !== null ? data[vyb] : null;
  return (
    <div data-testid={testid}>
      {legendaCasti && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2" style={{ color: "#5F6982" }}>
          {legendaCasti.map(([n, b]) => <span key={n} className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3 rounded-sm" style={{ background: b }} />{n}</span>)}
          {legenda?.[1] && <span className="inline-flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: barva2 }} />{legenda[1]}</span>}
        </div>
      )}
      {legenda && !legendaCasti && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-2" style={{ color: "#5F6982" }}>
          <span className="inline-flex items-center gap-1.5"><i className="inline-block w-3 h-3 rounded-sm" style={{ background: barva }} />{legenda[0]}</span>
          {legenda[1] && <span className="inline-flex items-center gap-1.5"><i className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: barva2 }} />{legenda[1]}</span>}
        </div>
      )}
      <div className="h-6 text-xs font-bold" style={{ color: "#0D1B3E" }} aria-live="polite" data-testid={testid ? `${testid}-detail` : undefined}>
        {aktivni ? aktivni.detail : <span style={{ color: "#8A93AA", fontWeight: 500 }}>Najeď nebo ťukni na sloupec</span>}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: "auto minmax(0,1fr)" }}>
        {/* osa Y */}
        <div className="relative text-[11px] tabular-nums text-right" style={{ height: vyska, color: "#8A93AA", minWidth: 22 }}>
          {[1, 0.5, 0].map((f) => (
            <span key={f} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - f) * 100}%` }}>{Math.round(max * f)}</span>
          ))}
        </div>
        <div className="min-w-0">
          <div className="relative" style={{ height: vyska }} onMouseLeave={() => setVyb(null)}>
            {[1, 0.5, 0].map((f) => <div key={f} className="absolute left-0 right-0 border-t" style={{ top: `${(1 - f) * 100}%`, borderColor: f === 0 ? "#C9CEDC" : "#EEF0F6" }} />)}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {data.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  className="relative flex-1 h-full flex items-end justify-center group"
                  onMouseEnter={() => setVyb(i)}
                  onFocus={() => setVyb(i)}
                  onClick={() => { setVyb(i); setPevny(i); onVyber?.(i); }}
                  aria-label={d.detail}
                >
                  {d.casti ? (
                    <span className="flex flex-col-reverse w-full rounded-t overflow-hidden transition-opacity" style={{ height: `${d.hodnota ? Math.max(2, (d.hodnota / max) * 100) : 0}%`, opacity: vyb === null || vyb === i ? 1 : 0.45, outline: d.zvyraznit ? "2px solid #F5A623" : undefined, outlineOffset: 1 }}>
                      {d.casti.map((c, k) => <span key={k} style={{ flex: `${c.hodnota} 0 0`, background: c.barva }} />)}
                    </span>
                  ) : (
                    <span
                      className="block w-full rounded-t transition-opacity"
                      style={{ height: `${d.hodnota ? Math.max(2, (d.hodnota / max) * 100) : 0}%`, background: d.zvyraznit ? "#F5A623" : barva, opacity: vyb === null || vyb === i ? 1 : 0.45, minHeight: d.hodnota ? 2 : 0 }}
                    />
                  )}
                  {d.hodnota2 !== undefined && d.hodnota2 > 0 && (
                    <span className="absolute w-2 h-2 rounded-full -translate-y-1/2 left-1/2 -translate-x-1/2" style={{ bottom: `calc(${(d.hodnota2 / max) * 100}% - 4px)`, background: barva2, boxShadow: "0 0 0 1.5px #fff" }} />
                  )}
                  {vyb === i && <span className="absolute inset-y-0 left-0 right-0 rounded" style={{ background: "rgba(91,85,214,.08)" }} />}
                </button>
              ))}
            </div>
          </div>
          {/* osa X */}
          <div className="flex gap-[2px] mt-1 text-[10px] tabular-nums" style={{ color: "#8A93AA" }}>
            {data.map((d, i) => (
              <span key={i} className="flex-1 min-w-0 flex justify-center overflow-visible whitespace-nowrap" style={{ fontWeight: d.zvyraznit ? 800 : 400, color: d.zvyraznit ? "#0D1B3E" : undefined }}>
                {/* na mobilu jen každý druhý popisek, ať se neslévají */}
                {(i % krokPopisku === 0 || d.zvyraznit) && (
                  <span className={d.zvyraznit || i % (krokPopisku * 2) === 0 ? "" : "hidden sm:inline"}>{d.popisek}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Vodorovné pruhy pro žebříčky (stránky, zdroje, kliky): název, pruh v poměru k nejvyššímu, počet. */
export function Pruhy({ polozky, barva = "#5B55D6", prazdne = "Zatím nic." }: { polozky: { k: string; n: number }[]; barva?: string; prazdne?: string }) {
  if (polozky.length === 0) return <p className="text-sm mt-2" style={{ color: "#8A93AA" }}>{prazdne}</p>;
  const max = Math.max(1, ...polozky.map((x) => x.n));
  return (
    <ul className="mt-2 flex flex-col gap-1.5">
      {polozky.map((x) => (
        <li key={x.k} className="text-sm">
          <div className="flex justify-between gap-3"><span className="min-w-0 break-words" style={{ color: "#33405F" }}>{x.k}</span><b className="tabular-nums shrink-0" style={{ color: "#0D1B3E" }}>{x.n}</b></div>
          <span className="block h-1.5 rounded-full mt-0.5" style={{ background: "#EEF0F6" }}><span className="block h-full rounded-full" style={{ width: `${Math.max(2, (x.n / max) * 100)}%`, background: barva }} /></span>
        </li>
      ))}
    </ul>
  );
}
