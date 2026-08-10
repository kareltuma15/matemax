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
    case "lichobeznik": return <Lichobeznik d={d} />;
    case "kruh":        return <Kruh d={d} />;
    default:            return null;
  }
}

// ── Oblouk úhlu mezi dvěma rameny (úhly ve stupních) + popisek na ose ─────────
function Oblouk({ cx, cy, a1, a2, label, r = 18 }: { cx: number; cy: number; a1: number; a2: number; label: string; r?: number }) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  // Nejkratší (menší) úhel mezi rameny — kreslíme právě ten.
  const d = ((a2 - a1 + 540) % 360) - 180; // -180..180
  const sweep = d > 0 ? 1 : 0;
  const A = [cx + r * Math.cos(rad(a1)), cy + r * Math.sin(rad(a1))];
  const B = [cx + r * Math.cos(rad(a2)), cy + r * Math.sin(rad(a2))];
  const mid = a1 + d / 2;
  const lr = r + 14;
  const L = [cx + lr * Math.cos(rad(mid)), cy + lr * Math.sin(rad(mid))];
  return (
    <g>
      <path d={`M ${A[0].toFixed(1)} ${A[1].toFixed(1)} A ${r} ${r} 0 0 ${sweep} ${B[0].toFixed(1)} ${B[1].toFixed(1)}`} fill="none" stroke={AKCENT} strokeWidth="2.5" />
      <text x={L[0].toFixed(1)} y={L[1].toFixed(1)} fontSize="14" fontWeight="800" fill={AKCENT} stroke="none" textAnchor="middle" dominantBaseline="middle">{label}</text>
    </g>
  );
}

// ── Rovnoběžky p ∥ q proťaté příčkou ─────────────────────────────────────────
function UhelPricka({ d }: { d: Extract<Diagram, { typ: "uhel_pricka" }> }) {
  const pY = 70, qY = 150;
  const Tbot: [number, number] = [120, 190];
  const Ttop: [number, number] = [230, 30];
  const xAt = (y: number) => Tbot[0] + ((y - Tbot[1]) / (Ttop[1] - Tbot[1])) * (Ttop[0] - Tbot[0]);
  const P1: [number, number] = [xAt(pY), pY]; // průsečík s p
  const P2: [number, number] = [xAt(qY), qY]; // průsečík s q
  // Úhly ramen (ve stupních, obrazovkové souřadnice y dolů)
  const ang = (V: [number, number], T: [number, number]) => (Math.atan2(T[1] - V[1], T[0] - V[0]) * 180) / Math.PI;
  const upP1 = ang(P1, Ttop), downP1 = ang(P1, Tbot);
  const upP2 = ang(P2, Ttop), downP2 = ang(P2, Tbot);
  const RIGHT = 0, LEFT = 180;

  // Daný úhel = ostrý vpravo nahoře u P1 (mezi p vpravo a příčkou vzhůru).
  // Hledaný podle vztahu:
  const hledany = {
    souhlasny: { cx: P2[0], cy: P2[1], a1: RIGHT, a2: upP2 },   // stejná poloha u P2
    stridavy:  { cx: P2[0], cy: P2[1], a1: LEFT, a2: downP2 },  // protilehlý roh u P2
    vedlejsi:  { cx: P1[0], cy: P1[1], a1: LEFT, a2: upP1 },    // vedlejší (180−daný)
    vrcholovy: { cx: P1[0], cy: P1[1], a1: LEFT, a2: downP1 },  // vrcholový u P1
  }[d.hledany];

  return (
    <g stroke="currentColor" strokeWidth="2" fill="none">
      {/* rovnoběžky */}
      <line x1="30" y1={pY} x2="295" y2={pY} />
      <line x1="30" y1={qY} x2="295" y2={qY} />
      {/* příčka (přesah za průsečíky) */}
      <line x1={Tbot[0]} y1={Tbot[1]} x2={Ttop[0]} y2={Ttop[1]} />
      {/* šipky rovnoběžnosti */}
      <path d={`M 285 ${pY - 4} l 8 4 l -8 4`} />
      <path d={`M 285 ${qY - 4} l 8 4 l -8 4`} />
      {/* popisky přímek */}
      <text x="20" y={pY + 4} fontSize="14" fontWeight="700" fill="currentColor" stroke="none">p</text>
      <text x="20" y={qY + 4} fontSize="14" fontWeight="700" fill="currentColor" stroke="none">q</text>
      {/* daný úhel */}
      <Oblouk cx={P1[0]} cy={P1[1]} a1={RIGHT} a2={upP1} label={`${d.danyUhel}°`} />
      {/* hledaný úhel */}
      <Oblouk cx={hledany.cx} cy={hledany.cy} a1={hledany.a1} a2={hledany.a2} label="?" />
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

// ── Lichoběžník se základnami a ∥ c a výškou v ───────────────────────────────
function Lichobeznik({ d }: { d: Extract<Diagram, { typ: "lichobeznik" }> }) {
  // Rovnoramenný obrys: dolní základna širší, horní vycentrovaná.
  const yTop = 60, yBot = 160;
  const botL = 45, botR = 275;
  const topL = 95, topR = 225;
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none">
      <polygon points={`${botL},${yBot} ${botR},${yBot} ${topR},${yTop} ${topL},${yTop}`} fill={`${AKCENT}14`} />
      {/* horní základna c */}
      {d.c && <text x={(topL + topR) / 2} y={yTop - 8} fontSize="13" fontWeight="600" fill={AKCENT} stroke="none" textAnchor="middle">{d.c}</text>}
      {/* dolní základna a */}
      {d.a && <text x={(botL + botR) / 2} y={yBot + 18} fontSize="13" fontWeight="600" fill={AKCENT} stroke="none" textAnchor="middle">{d.a}</text>}
      {/* výška v — svislá čárkovaná kóta uvnitř */}
      {d.vyska && (
        <>
          <line x1={topL} y1={yTop} x2={topL} y2={yBot} strokeWidth="1.3" strokeDasharray="4 3" stroke={AKCENT} />
          <text x={topL - 6} y={(yTop + yBot) / 2} fontSize="13" fontWeight="600" fill={AKCENT} stroke="none" textAnchor="end" dominantBaseline="middle">{d.vyska}</text>
        </>
      )}
      {/* levé rameno d */}
      {d.d && <text x={(botL + topL) / 2 - 8} y={(yTop + yBot) / 2} fontSize="12" fill="currentColor" stroke="none" textAnchor="end" dominantBaseline="middle">{d.d}</text>}
      {/* pravé rameno b */}
      {d.b && <text x={(botR + topR) / 2 + 8} y={(yTop + yBot) / 2} fontSize="12" fill="currentColor" stroke="none" dominantBaseline="middle">{d.b}</text>}
    </g>
  );
}

// ── Kruh s poloměrem nebo průměrem ───────────────────────────────────────────
function Kruh({ d }: { d: Extract<Diagram, { typ: "kruh" }> }) {
  const cx = 160, cy = 108, r = 72;
  return (
    <g stroke="currentColor" strokeWidth="2" fill="none">
      <circle cx={cx} cy={cy} r={r} fill={`${AKCENT}14`} />
      <circle cx={cx} cy={cy} r={2.5} fill="currentColor" stroke="none" />
      {d.prumer ? (
        <>
          {/* průměr — vodorovná úsečka přes střed */}
          <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} strokeWidth="1.6" stroke={AKCENT} />
          <text x={cx} y={cy - 8} fontSize="13" fontWeight="600" fill={AKCENT} stroke="none" textAnchor="middle">{d.prumer}</text>
        </>
      ) : d.polomer ? (
        <>
          {/* poloměr — úsečka ze středu doprava */}
          <line x1={cx} y1={cy} x2={cx + r} y2={cy} strokeWidth="1.6" stroke={AKCENT} />
          <text x={cx + r / 2} y={cy - 8} fontSize="13" fontWeight="600" fill={AKCENT} stroke="none" textAnchor="middle">{d.polomer}</text>
        </>
      ) : null}
    </g>
  );
}
