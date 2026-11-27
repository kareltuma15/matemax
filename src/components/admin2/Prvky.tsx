/**
 * Sada komponent nového adminu (VZ-01), serverové: dlaždice metriky, ikonka „i“, malý graf,
 * prázdný stav, řádek žáka. Klientské (karta akce, filtry) jsou ve vlastních souborech.
 */
import Link from "next/link";
import { malyVzorek, srovnani, wilson } from "@/lib/admin2/mala-cisla";
import type { Dlazdice } from "@/lib/admin2/metriky";

export function Info({ children, label = "Co to číslo znamená" }: { children: React.ReactNode; label?: string }) {
  return (
    <details className="a2-info">
      <summary aria-label={label}>i</summary>
      <div>{children}</div>
    </details>
  );
}

/** Malý sloupcový graf 8 týdnů (sloupce od nuly, poslední zvýrazněný). */
export function Graf({ hodnoty, popis }: { hodnoty: number[]; popis: string }) {
  const max = Math.max(1, ...hodnoty);
  const w = 100 / hodnoty.length;
  return (
    <svg className="graf" viewBox="0 0 100 22" preserveAspectRatio="none" role="img" aria-label={popis}>
      {hodnoty.map((h, i) => {
        const v = Math.max(h > 0 ? 2 : 0.6, (h / max) * 20);
        return <rect key={i} x={i * w + 1} y={22 - v} width={w - 2} height={v} rx="1" fill={i === hodnoty.length - 1 ? "var(--a-akcent)" : "#C9CDE0"} />;
      })}
    </svg>
  );
}

export function DlazdiceMetriky({ d, href }: { d: Dlazdice; href: string }) {
  const s = srovnani(d.cislo, d.pred);
  const interval = d.id === "aktivovani" ? wilson(d.cislo, d.zaklad) : null;
  return (
    <div className="a2-dl" data-testid={`a2-dl-${d.id}`} data-hodnota={d.cislo}>
      <span className="l"><span>{d.nazev}</span><Info>{d.definice}{interval && ` Podíl ${d.cislo} z ${d.zaklad}, interval spolehlivosti 95 %: ${interval[0]}–${interval[1]} %.`}</Info></span>
      <Link href={href} className="v" aria-label={`${d.nazev}: ${d.hodnota}, ukázat žáky`} style={{ position: "static" }}>
        {d.hodnota}
        <span style={{ position: "absolute", inset: 0 }} aria-hidden="true" />
      </Link>
      <span className="p">{d.pozn ?? s.text ?? ""}{d.pozn && s.text && d.id !== "aktivovani" ? ` · ${s.text}` : ""}</span>
      {malyVzorek(d.zaklad) && <span className="a2-maly">malý vzorek</span>}
      <Graf hodnoty={d.graf} popis={`${d.nazev} po týdnech za 8 týdnů: ${d.graf.join(", ")}`} />
    </div>
  );
}

export function Prazdne({ titulek, children }: { titulek: string; children?: React.ReactNode }) {
  return <div className="a2-prazdne"><b>{titulek}</b>{children && <span>{children}</span>}</div>;
}

export function TridaStitek({ t }: { t: 5 | 9 }) {
  return <span className={`a2-tr t${t}`}>{t}.</span>;
}

/** Počet s podstatným jménem: 1 žák, 2 žáci, 5 žáků. */
export const zaku = (n: number) => `${n.toLocaleString("cs-CZ")} ${n === 1 ? "žák" : n >= 2 && n <= 4 ? "žáci" : "žáků"}`;
