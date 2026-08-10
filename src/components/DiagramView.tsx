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
    case "graf":        return <Graf d={d} />;
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
          {/* popisek dovnitř vpravo od čárkované čáry — mimo levé rameno */}
          <text x={topL + 8} y={(yTop + yBot) / 2} fontSize="13" fontWeight="600" fill={AKCENT} stroke="none" textAnchor="start" dominantBaseline="middle">{d.vyska}</text>
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

// ── Souřadnicová síť + graf ──────────────────────────────────────────────────
// Ořízne (nekonečnou) přímku daNou dvěma body na obdélník rozsahu — vrátí krajní
// body úsečky přes celou síť (Liang–Barsky).
function clipToBox(
  p: [number, number], q: [number, number],
  box: { xMin: number; xMax: number; yMin: number; yMax: number },
): [[number, number], [number, number]] | null {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  let tmin = -Infinity, tmax = Infinity;
  const edges: [number, number][] = [
    [-dx, p[0] - box.xMin],  // x >= xMin
    [dx, box.xMax - p[0]],   // x <= xMax
    [-dy, p[1] - box.yMin],  // y >= yMin
    [dy, box.yMax - p[1]],   // y <= yMax
  ];
  for (const [den, num] of edges) {
    if (den === 0) { if (num < 0) return null; continue; }
    const t = num / den;
    if (den < 0) tmin = Math.max(tmin, t); else tmax = Math.min(tmax, t);
  }
  if (tmin > tmax) return null;
  return [
    [p[0] + tmin * dx, p[1] + tmin * dy],
    [p[0] + tmax * dx, p[1] + tmax * dy],
  ];
}

function Graf({ d }: { d: Extract<Diagram, { typ: "graf" }> }) {
  const xMin = d.xMin ?? -5, xMax = d.xMax ?? 5;
  const yMin = d.yMin ?? -5, yMax = d.yMax ?? 5;
  const nx = xMax - xMin, ny = yMax - yMin;

  // Plocha pro síť; čtvercové buňky (stejné px na jednotku v obou osách).
  const ox = 26, oy = 12, availW = 288, availH = 176;
  const cell = Math.min(availW / nx, availH / ny);
  const gw = cell * nx, gh = cell * ny;
  const gx0 = ox + (availW - gw) / 2;
  const gy0 = oy + (availH - gh) / 2;
  const mx = (x: number) => gx0 + (x - xMin) * cell;
  const my = (y: number) => gy0 + (yMax - y) * cell;

  const GRID = "#cbd5e1";
  const xs: number[] = [], ys: number[] = [];
  for (let i = Math.ceil(xMin); i <= xMax; i++) xs.push(i);
  for (let j = Math.ceil(yMin); j <= yMax; j++) ys.push(j);

  const hasX0 = yMin <= 0 && 0 <= yMax; // osa x uvnitř?
  const hasY0 = xMin <= 0 && 0 <= xMax; // osa y uvnitř?
  const axisY = hasX0 ? my(0) : gy0 + gh; // kam nakreslit osu x
  const axisX = hasY0 ? mx(0) : gx0;      // kam nakreslit osu y

  const primka = d.primka
    ? (d.primka.prodlouzit
        ? clipToBox([d.primka.x1, d.primka.y1], [d.primka.x2, d.primka.y2], { xMin, xMax, yMin, yMax })
        : [[d.primka.x1, d.primka.y1], [d.primka.x2, d.primka.y2]] as [[number, number], [number, number]])
    : null;

  return (
    <g fill="none">
      {/* mřížka */}
      {xs.map((i) => <line key={`vx${i}`} x1={mx(i)} y1={gy0} x2={mx(i)} y2={gy0 + gh} stroke={GRID} strokeWidth="1" />)}
      {ys.map((j) => <line key={`hy${j}`} x1={gx0} y1={my(j)} x2={gx0 + gw} y2={my(j)} stroke={GRID} strokeWidth="1" />)}

      {/* osy se šipkami */}
      <line x1={gx0} y1={axisY} x2={gx0 + gw} y2={axisY} stroke="currentColor" strokeWidth="1.8" />
      <line x1={axisX} y1={gy0 + gh} x2={axisX} y2={gy0} stroke="currentColor" strokeWidth="1.8" />
      <path d={`M ${gx0 + gw - 6} ${axisY - 4} l 6 4 l -6 4`} stroke="currentColor" strokeWidth="1.8" />
      <path d={`M ${axisX - 4} ${gy0 + 6} l 4 -6 l 4 6`} stroke="currentColor" strokeWidth="1.8" />
      <text x={gx0 + gw + 2} y={axisY + 13} fontSize="12" fontWeight="700" fill="currentColor" stroke="none">x</text>
      <text x={axisX - 12} y={gy0 + 2} fontSize="12" fontWeight="700" fill="currentColor" stroke="none">y</text>

      {/* popisky dělení (celá čísla, ne 0) */}
      {xs.filter((i) => i !== 0).map((i) => (
        <text key={`lx${i}`} x={mx(i)} y={axisY + 13} fontSize="9.5" fill="currentColor" stroke="none" textAnchor="middle" opacity="0.75">{i}</text>
      ))}
      {ys.filter((j) => j !== 0).map((j) => (
        <text key={`ly${j}`} x={axisX - 6} y={my(j) + 3.5} fontSize="9.5" fill="currentColor" stroke="none" textAnchor="end" opacity="0.75">{j}</text>
      ))}

      {/* přímka */}
      {primka && (
        <line x1={mx(primka[0][0])} y1={my(primka[0][1])} x2={mx(primka[1][0])} y2={my(primka[1][1])} stroke={AKCENT} strokeWidth="2.2" />
      )}

      {/* body */}
      {d.body?.map((b, i) => (
        <g key={`b${i}`}>
          <circle cx={mx(b.x)} cy={my(b.y)} r="3.6" fill={AKCENT} stroke="none" />
          {b.label && <text x={mx(b.x) + 7} y={my(b.y) - 6} fontSize="13" fontWeight="700" fill={AKCENT} stroke="none">{b.label}</text>}
        </g>
      ))}
    </g>
  );
}
