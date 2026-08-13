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
    case "kolac":       return <KolacovyGraf d={d} />;
    case "sloupce":     return <SloupcovyGraf d={d} />;
    case "mnohouhelnik": return <Mnohouhelnik d={d} />;
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

// ── Koláčový graf ke slovní úloze (formát CERMAT) ────────────────────────────
const PIE = ["#2E6DA4", "#7cb3e8", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

// Kontrastní barva textu na dané výplni (bílá na tmavé, tmavá na světlé).
function textOn(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#0D1B3E" : "#fff";
}

function KolacovyGraf({ d }: { d: Extract<Diagram, { typ: "kolac" }> }) {
  const cx = 92, cy = 116, r = 74;
  const at = (deg: number, rad: number): [number, number] => {
    const a = (deg * Math.PI) / 180;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const casti = d.casti;
  const jedna = casti.length === 1 || casti[0].procenta >= 99.9; // celý kruh

  // Počáteční úhly výsečí — bez mutace: prefixový součet předchozích procent.
  const sweeps = casti.map((c) => (c.procenta / 100) * 360);
  const starts = sweeps.map((_, i) => -90 + sweeps.slice(0, i).reduce((a, b) => a + b, 0));
  const vysece = casti.map((c, i) => {
    const start = starts[i], sweep = sweeps[i];
    const end = start + sweep, mid = start + sweep / 2;
    const p1 = at(start, r), p2 = at(end, r);
    const large = sweep > 180 ? 1 : 0;
    const lp = at(mid, r * 0.6);          // popisek % uvnitř výseče (nikdy se neořízne)
    return { c, path: `M ${cx} ${cy} L ${p1[0].toFixed(1)} ${p1[1].toFixed(1)} A ${r} ${r} 0 ${large} 1 ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} Z`, lp };
  });

  return (
    <g>
      {d.nazev && (
        <text x={cx} y={14} fontSize="12.5" fontWeight="800" fill="currentColor" textAnchor="middle">{d.nazev}</text>
      )}

      {/* výseče */}
      {jedna ? (
        <circle cx={cx} cy={cy} r={r} fill={PIE[0]} stroke="#fff" strokeWidth="2" />
      ) : (
        vysece.map((v, i) => (
          <path key={`s${i}`} d={v.path} fill={PIE[i % PIE.length]} stroke="#fff" strokeWidth="2" />
        ))
      )}

      {/* popisky procent uvnitř výsečí (kontrastní barva); skrytá → „?" */}
      {!jedna && vysece.map((v, i) => (
        <text key={`p${i}`} x={v.lp[0].toFixed(1)} y={(v.lp[1] + 3.5).toFixed(1)} fontSize="11" fontWeight="800" fill={textOn(PIE[i % PIE.length])} stroke="none" textAnchor="middle">
          {v.c.skryta ? "?" : `${v.c.procenta} %`}
        </text>
      ))}

      {/* legenda vpravo */}
      {casti.map((c, i) => {
        const ly = cy - (casti.length - 1) * 11 + i * 22;
        return (
          <g key={`l${i}`}>
            <rect x={210} y={ly - 9} width={13} height={13} rx={2} fill={PIE[i % PIE.length]} />
            <text x={228} y={ly + 1.5} fontSize="11.5" fill="currentColor" stroke="none" dominantBaseline="middle">{c.label}</text>
          </g>
        );
      })}
    </g>
  );
}

// ── Sloupcový graf ke slovní úloze (formát CERMAT) ───────────────────────────
// Nejmenší „hezký" krok ≥ x (1, 2, 2.5, 5, 10 × mocnina 10) — pro dělení osy y.
function niceStep(x: number): number {
  if (x <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(x)));
  for (const m of [1, 2, 2.5, 5, 10]) if (pow * m >= x) return pow * m;
  return pow * 10;
}

function SloupcovyGraf({ d }: { d: Extract<Diagram, { typ: "sloupce" }> }) {
  const ox = 34, plotRight = 302, plotTop = 28, baseY = 170;
  const plotW = plotRight - ox, plotH = baseY - plotTop;
  const n = d.sloupce.length;
  // Skryté sloupce NEovlivňují škálu (jinak by měřítko mohlo prozradit hodnotu).
  const maxV = Math.max(...d.sloupce.filter((s) => !s.skryta).map((s) => s.hodnota), 1);
  const step = niceStep(maxV / 4);
  const axisMax = step * Math.ceil(maxV / step);
  const slot = plotW / n;
  const barW = Math.min(slot * 0.58, 46);
  const my = (v: number) => baseY - (v / axisMax) * plotH;

  const nTicks = Math.round(axisMax / step);
  const ticks = Array.from({ length: nTicks + 1 }, (_, k) => k * step);
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ","));

  return (
    <g>
      {d.nazev && (
        <text x={(ox + plotRight) / 2} y={14} fontSize="12.5" fontWeight="800" fill="currentColor" textAnchor="middle">{d.nazev}</text>
      )}

      {/* vodorovné dělící čáry + popisky osy y */}
      {ticks.map((t, i) => (
        <g key={`t${i}`}>
          <line x1={ox} y1={my(t)} x2={plotRight} y2={my(t)} stroke={i === 0 ? "currentColor" : "#cbd5e1"} strokeWidth={i === 0 ? 1.6 : 1} />
          <text x={ox - 5} y={my(t) + 3.5} fontSize="9.5" fill="currentColor" stroke="none" textAnchor="end" opacity="0.75">{fmt(t)}</text>
        </g>
      ))}

      {/* osa y + popisek jednotky */}
      <line x1={ox} y1={plotTop - 4} x2={ox} y2={baseY} stroke="currentColor" strokeWidth="1.6" />
      {d.jednotka && (
        <text x={ox - 2} y={plotTop - 9} fontSize="9.5" fontWeight="600" fill="currentColor" stroke="none" textAnchor="start" opacity="0.85">{d.jednotka}</text>
      )}

      {/* sloupce s hodnotou a popiskem; skrytý → čárkovaný obrys přes celou
          výšku + „?" uprostřed (nesmí napovědět velikost) */}
      {d.sloupce.map((s, i) => {
        const cxb = ox + slot * (i + 0.5);
        if (s.skryta) {
          return (
            <g key={`b${i}`}>
              <rect x={cxb - barW / 2} y={plotTop} width={barW} height={baseY - plotTop} rx={2} fill="none" stroke={AKCENT} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.55" />
              <text x={cxb} y={(plotTop + baseY) / 2 + 5} fontSize="15" fontWeight="800" fill={AKCENT} stroke="none" textAnchor="middle">?</text>
              <text x={cxb} y={baseY + 13} fontSize="10.5" fill="currentColor" stroke="none" textAnchor="middle">{s.label}</text>
            </g>
          );
        }
        const y = my(s.hodnota);
        return (
          <g key={`b${i}`}>
            <rect x={cxb - barW / 2} y={y} width={barW} height={baseY - y} rx={2} fill={PIE[i % PIE.length]} />
            <text x={cxb} y={y - 4} fontSize="11" fontWeight="800" fill="currentColor" stroke="none" textAnchor="middle">{fmt(s.hodnota)}</text>
            <text x={cxb} y={baseY + 13} fontSize="10.5" fill="currentColor" stroke="none" textAnchor="middle">{s.label}</text>
          </g>
        );
      })}
    </g>
  );
}

// ── Mnohoúhelník s vnitřními úhly ────────────────────────────────────────────
// Vrcholy z předlohy (schéma, ne k měřítku); úhly nese popisek, null = „?".
const MNOHO_PRESETY: Record<number, [number, number][]> = {
  3: [[160, 40], [280, 175], [40, 175]],
  4: [[58, 64], [252, 48], [276, 168], [44, 178]],
  5: [[160, 34], [286, 118], [236, 186], [84, 186], [34, 118]],
  6: [[110, 40], [210, 40], [286, 108], [210, 176], [110, 176], [34, 108]],
};

function Mnohouhelnik({ d }: { d: Extract<Diagram, { typ: "mnohouhelnik" }> }) {
  const n = d.uhly.length;
  const V = MNOHO_PRESETY[n] ??
    d.uhly.map((_, i) => {
      const a = (-90 + (360 / n) * i) * (Math.PI / 180);
      return [160 + 120 * Math.cos(a), 108 + 84 * Math.sin(a)] as [number, number];
    });
  const cx = V.reduce((s, p) => s + p[0], 0) / n;
  const cy = V.reduce((s, p) => s + p[1], 0) / n;

  return (
    <g stroke="currentColor" strokeWidth="2" fill="none">
      <polygon points={V.map((p) => `${p[0]},${p[1]}`).join(" ")} fill={`${AKCENT}14`} />
      {V.map((p, i) => {
        // popisek úhlu posunutý od vrcholu ke středu
        const dx = cx - p[0], dy = cy - p[1];
        const len = Math.hypot(dx, dy) || 1;
        const lx = p[0] + (dx / len) * 30, ly = p[1] + (dy / len) * 30;
        const u = d.uhly[i];
        return (
          <text key={`u${i}`} x={lx.toFixed(1)} y={(ly + 4).toFixed(1)} fontSize="13" fontWeight="700" fill={AKCENT} stroke="none" textAnchor="middle">
            {u === null ? "?" : `${u}°`}
          </text>
        );
      })}
    </g>
  );
}
