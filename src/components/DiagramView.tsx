"use client";

import type { Diagram } from "@/types";

/**
 * Vykreslí parametrický diagram úlohy jako SVG. Barvy dědí přes currentColor,
 * takže figura funguje ve světlém i tmavém režimu; akcent (úhly, kóty) je modrý.
 *
 * Přidání typu: nová varianta v `Diagram` (types) + větev ve `switch` níže.
 */

const AKCENT = "#2E6DA4";

export default function DiagramView({ diagram }: { diagram: Diagram }) {
  return (
    <div
      className="w-full flex justify-center my-1"
      style={{ color: "var(--text-primary)" }}
      role="img"
      aria-label="Obrázek k úloze"
    >
      <svg viewBox="0 0 320 210" width="100%" style={{ maxWidth: 340 }}>
        {renderDiagram(diagram)}
      </svg>
    </div>
  );
}

function renderDiagram(d: Diagram) {
  switch (d.typ) {
    case "uhel_pricka": return <UhelPricka d={d} />;
    case "trojuhelnik": return <Trojuhelnik d={d} />;
    case "obdelnik":    return <Obdelnik d={d} />;
    default:            return null;
  }
}

// ── Malý oblouček úhlu + popisek ─────────────────────────────────────────────
function AngleMark({ x, y, label, dir }: { x: number; y: number; label: string; dir: [number, number] }) {
  // dir udává, do kterého kvadrantu oblouček a popisek jdou (±1, ±1)
  const [dx, dy] = dir;
  const r = 16;
  const start = `${x + dx * r},${y}`;
  const end = `${x},${y + dy * r}`;
  return (
    <g>
      <path d={`M ${start} A ${r} ${r} 0 0 ${dx * dy > 0 ? 0 : 1} ${end}`} fill="none" stroke={AKCENT} strokeWidth="2" />
      <text x={x + dx * 24} y={y + dy * 24} fontSize="15" fontWeight="700" fill={AKCENT} textAnchor="middle" dominantBaseline="middle">
        {label}
      </text>
    </g>
  );
}

// ── Rovnoběžky p ∥ q proťaté příčkou ─────────────────────────────────────────
function UhelPricka({ d }: { d: Extract<Diagram, { typ: "uhel_pricka" }> }) {
  // Pevná schematická geometrie (hodnota nese popisek, ne přesný úhel oblouku).
  const P1: [number, number] = [189, 70];   // průsečík s p
  const P2: [number, number] = [131, 150];  // průsečík s q
  // Kde je „?" podle vztahu k danému úhlu (daný je vpravo nahoře u P1)
  const hledanyDir: Record<string, { at: [number, number]; dir: [number, number] }> = {
    souhlasny:  { at: P2, dir: [1, -1] },
    stridavy:   { at: P2, dir: [-1, 1] },
    vedlejsi:   { at: P1, dir: [-1, -1] },
    vrcholovy:  { at: P1, dir: [-1, 1] },
  };
  const h = hledanyDir[d.hledany];
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none">
      {/* rovnoběžky */}
      <line x1="30" y1="70" x2="290" y2="70" />
      <line x1="30" y1="150" x2="290" y2="150" />
      {/* příčka */}
      <line x1="110" y1="185" x2="210" y2="35" />
      {/* šipky rovnoběžnosti */}
      <path d="M 250 66 l 8 4 l -8 4" />
      <path d="M 250 146 l 8 4 l -8 4" />
      {/* popisky přímek */}
      <text x="20" y="66" fontSize="14" fontWeight="700" fill="currentColor" stroke="none">p</text>
      <text x="20" y="146" fontSize="14" fontWeight="700" fill="currentColor" stroke="none">q</text>
      {/* daný úhel u P1 (vpravo nahoře) */}
      <AngleMark x={P1[0]} y={P1[1]} label={`${d.danyUhel}°`} dir={[1, -1]} />
      {/* hledaný úhel */}
      <AngleMark x={h.at[0]} y={h.at[1]} label="?" dir={h.dir} />
    </g>
  );
}

// ── Trojúhelník ABC ──────────────────────────────────────────────────────────
function Trojuhelnik({ d }: { d: Extract<Diagram, { typ: "trojuhelnik" }> }) {
  const A: [number, number] = [40, 175];
  const B: [number, number] = [280, 175];
  const C: [number, number] = [150, 40];
  const uhelLabel = (which: "alfa" | "beta" | "gama", val?: number) =>
    d.hledany === which ? "?" : val !== undefined ? `${val}°` : null;
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none">
      <polygon points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]}`} fill={`${AKCENT}14`} />
      {/* vrcholy */}
      <text x={A[0] - 14} y={A[1] + 6} fontSize="15" fontWeight="700" fill="currentColor" stroke="none">A</text>
      <text x={B[0] + 6} y={B[1] + 6} fontSize="15" fontWeight="700" fill="currentColor" stroke="none">B</text>
      <text x={C[0] - 4} y={C[1] - 8} fontSize="15" fontWeight="700" fill="currentColor" stroke="none">C</text>
      {/* úhly */}
      {uhelLabel("alfa", d.alfa) && <text x={A[0] + 26} y={A[1] - 12} fontSize="14" fontWeight="700" fill={AKCENT} stroke="none">{uhelLabel("alfa", d.alfa)}</text>}
      {uhelLabel("beta", d.beta) && <text x={B[0] - 34} y={B[1] - 12} fontSize="14" fontWeight="700" fill={AKCENT} stroke="none" textAnchor="end">{uhelLabel("beta", d.beta)}</text>}
      {uhelLabel("gama", d.gama) && <text x={C[0]} y={C[1] + 26} fontSize="14" fontWeight="700" fill={AKCENT} stroke="none" textAnchor="middle">{uhelLabel("gama", d.gama)}</text>}
      {/* strany */}
      {d.strany?.c && <text x={(A[0] + B[0]) / 2} y={A[1] + 20} fontSize="13" fill="currentColor" stroke="none" textAnchor="middle">{d.strany.c}</text>}
      {d.strany?.b && <text x={(A[0] + C[0]) / 2 - 14} y={(A[1] + C[1]) / 2} fontSize="13" fill="currentColor" stroke="none" textAnchor="end">{d.strany.b}</text>}
      {d.strany?.a && <text x={(B[0] + C[0]) / 2 + 14} y={(B[1] + C[1]) / 2} fontSize="13" fill="currentColor" stroke="none">{d.strany.a}</text>}
    </g>
  );
}

// ── Obdélník s kótami ────────────────────────────────────────────────────────
function Obdelnik({ d }: { d: Extract<Diagram, { typ: "obdelnik" }> }) {
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none">
      <rect x="70" y="55" width="180" height="100" fill={`${AKCENT}14`} />
      {/* kóta šířky */}
      <text x="160" y="175" fontSize="14" fontWeight="600" fill={AKCENT} stroke="none" textAnchor="middle">{d.sirka}</text>
      {/* kóta výšky */}
      <text x="52" y="110" fontSize="14" fontWeight="600" fill={AKCENT} stroke="none" textAnchor="middle" transform="rotate(-90 52 110)">{d.vyska}</text>
    </g>
  );
}
