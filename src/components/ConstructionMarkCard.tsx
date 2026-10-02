"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { DBExample, SceneElement, TEMA_LABELS, podtemaLabel } from "@/types";
import {
  Pt, Shape, allIntersections, nearest, clipLine, matchMarkers, dist,
} from "@/lib/construct-geom";
import { playCorrect, playWrong } from "@/lib/sound";
import MathText from "@/components/MathText";

/**
 * Rýsování (CERMAT „Sestrojte…"): žák má v obrázku pravítko a kružítko, klepnutí se přichytává
 * k průsečíkům a nakonec nástrojem „Bod" označí hledaný bod (nebo všechny hledané body).
 * Výsledek se ověřuje výpočtem, postup se po kontrole ukáže krok za krokem.
 * Data: `example.konstrukce_scena` (viz ConstructionScene v types).
 */

interface Props {
  example: DBExample;
  cardNumber: number;
  total: number;
  onResult: (correct: boolean, userAnswer: string) => void;
  onSkip?: () => void;
}

const NAVY = "#0D1B3E";
const BLUE = "#2E6DA4";
const ORANGE = "#f59e0b";
const GREEN = "#16a34a";
const RED = "#dc2626";

const DIFFICULTY_BADGE: Record<number, { label: string; bg: string; color: string }> = {
  1: { label: "Lehká ⭐", bg: "#f0fdf4", color: "#166534" },
  2: { label: "Střední ⭐⭐", bg: "#fffbeb", color: "#92400e" },
  3: { label: "Těžká ⭐⭐⭐", bg: "#fef2f2", color: "#991b1b" },
};

type NewItem =
  | { kind: "line"; a: Pt; b: Pt }
  | { kind: "circ"; c: Pt; r: number }
  | { kind: "marker"; p: Pt };
type Item = NewItem & { id: number };

function shapesOf(elements: SceneElement[]): Shape[] {
  const out: Shape[] = [];
  for (const e of elements) {
    if (e.t === "segment") out.push({ k: "seg", a: { x: e.x1, y: e.y1 }, b: { x: e.x2, y: e.y2 } });
    else if (e.t === "line") out.push({ k: "line", a: { x: e.x1, y: e.y1 }, b: { x: e.x2, y: e.y2 } });
    else if (e.t === "ray") out.push({ k: "ray", a: { x: e.x1, y: e.y1 }, b: { x: e.x2, y: e.y2 } });
    else if (e.t === "circle") out.push({ k: "circ", c: { x: e.cx, y: e.cy }, r: e.r });
    else if (e.t === "polygon") {
      e.pts.forEach((p, i) => {
        const q = e.pts[(i + 1) % e.pts.length];
        out.push({ k: "seg", a: { x: p[0], y: p[1] }, b: { x: q[0], y: q[1] } });
      });
    }
  }
  return out;
}

function arcPath(cx: number, cy: number, r: number, a1: number, a2: number) {
  const rad = (a: number) => (a * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(a1)), y1 = cy + r * Math.sin(rad(a1));
  const x2 = cx + r * Math.cos(rad(a2)), y2 = cy + r * Math.sin(rad(a2));
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function Element({ el, w, h, color, sw, dashed }: { el: SceneElement; w: number; h: number; color: string; sw: number; dashed?: boolean }) {
  const dash = dashed ? "5 4" : undefined;
  switch (el.t) {
    case "point":
      return (
        <g>
          <circle cx={el.x} cy={el.y} r={3.6} fill={color} />
          {el.label && (
            <text x={el.x + (el.dx ?? 7)} y={el.y + (el.dy ?? -7)} fontSize={14} fontWeight={700} fill={color} style={{ fontFamily: "system-ui, sans-serif" }}>
              {el.label}
            </text>
          )}
        </g>
      );
    case "segment":
      return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={color} strokeWidth={sw} strokeDasharray={el.dashed ? "5 4" : dash} strokeLinecap="round" />;
    case "line":
    case "ray": {
      const c = clipLine({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }, w, h, el.t === "ray");
      if (!c) return null;
      return <line x1={c[0].x} y1={c[0].y} x2={c[1].x} y2={c[1].y} stroke={color} strokeWidth={sw} strokeDasharray={el.dashed ? "5 4" : dash} strokeLinecap="round" />;
    }
    case "circle":
      return <circle cx={el.cx} cy={el.cy} r={el.r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={el.dashed ? "5 4" : dash} />;
    case "arc":
      return <path d={arcPath(el.cx, el.cy, el.r, el.a1, el.a2)} fill="none" stroke={color} strokeWidth={sw} />;
    case "polygon":
      return <polygon points={el.pts.map((p) => p.join(",")).join(" ")} fill={el.fill ?? "none"} stroke={color} strokeWidth={sw} strokeLinejoin="round" />;
    case "text":
      return (
        <text x={el.x} y={el.y} fontSize={el.size ?? 14} fontWeight={700} fill={color} textAnchor={el.anchor ?? "start"} style={{ fontFamily: "system-ui, sans-serif" }}>
          {el.text}
        </text>
      );
    case "right": {
      const s = 9;
      const d = `M${el.x + el.ux * s} ${el.y + el.uy * s} L${el.x + (el.ux + el.vx) * s} ${el.y + (el.uy + el.vy) * s} L${el.x + el.vx * s} ${el.y + el.vy * s}`;
      return <path d={d} fill="none" stroke={color} strokeWidth={1.4} />;
    }
  }
}

export default function ConstructionMarkCard({ example, cardNumber, total, onResult, onSkip }: Props) {
  const scene = example.konstrukce_scena!;
  const svgRef = useRef<SVGSVGElement>(null);
  const idRef = useRef(1);

  const [tool, setTool] = useState<string>("bod");
  const [pending, setPending] = useState<Pt | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [result, setResult] = useState<ReturnType<typeof matchMarkers> | null>(null);
  const [stepShown, setStepShown] = useState(0);

  useEffect(() => {
    setTool("bod"); setPending(null); setItems([]); setResult(null); setStepShown(0);
  }, [example.id]);

  const givenShapes = useMemo(() => shapesOf(scene.given), [scene]);
  const givenPoints = useMemo(() => scene.given.filter((e) => e.t === "point").map((e) => ({ x: (e as { x: number }).x, y: (e as { y: number }).y })), [scene]);

  const helperShapes: Shape[] = useMemo(
    () => items.flatMap((it): Shape[] => it.kind === "line" ? [{ k: "line", a: it.a, b: it.b }] : it.kind === "circ" ? [{ k: "circ", c: it.c, r: it.r }] : []),
    [items],
  );
  const markers = useMemo(() => items.filter((it): it is Extract<Item, { kind: "marker" }> => it.kind === "marker"), [items]);

  // Body, ke kterým se klepnutí přichytává: zadané body + všechny průsečíky zadaných i vlastních čar
  const candidates = useMemo(() => {
    const inter = allIntersections([...givenShapes, ...helperShapes]).filter(
      (p) => p.x > -2 && p.x < scene.width + 2 && p.y > -2 && p.y < scene.height + 2,
    );
    const extra = inter.filter((p) => !givenPoints.some((g) => dist(g, p) < 1));
    return { snap: [...givenPoints, ...extra], visible: extra.slice(0, 90) };
  }, [givenShapes, helperShapes, givenPoints, scene]);

  const checked = result !== null;
  const badge = DIFFICULTY_BADGE[example.obtiznost] ?? DIFFICULTY_BADGE[1];

  function toScene(e: React.MouseEvent<SVGSVGElement>) {
    const r = svgRef.current!.getBoundingClientRect();
    const k = scene.width / r.width;
    return { p: { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k }, k };
  }

  function add(it: NewItem) {
    setItems((cur) => [...cur, { ...it, id: idRef.current++ }]);
  }

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    if (checked) return;
    const { p, k } = toScene(e);
    const s = nearest(candidates.snap, p, 18 * k) ?? p;

    if (tool === "bod") {
      const hit = markers.find((m) => dist(m.p, p) < 14 * k);
      if (hit) { setItems((cur) => cur.filter((it) => it.id !== hit.id)); return; }
      add({ kind: "marker", p: s });
    } else if (tool === "pravitko") {
      if (!pending) setPending(s);
      else if (dist(pending, s) > 2) { add({ kind: "line", a: pending, b: s }); setPending(null); }
    } else if (tool === "kruzitko") {
      if (!pending) setPending(s);
      else if (dist(pending, s) > 2) { add({ kind: "circ", c: pending, r: dist(pending, s) }); setPending(null); }
    } else if (tool.startsWith("r:")) {
      const rr = scene.radii?.[Number(tool.slice(2))];
      if (rr) add({ kind: "circ", c: s, r: rr.r });
    }
  }

  function chooseTool(t: string) { setTool(t); setPending(null); }
  function undo() { setItems((cur) => cur.slice(0, -1)); setPending(null); }
  function clearAll() { setItems([]); setPending(null); }

  function check() {
    const r = matchMarkers(markers.map((m) => m.p), scene.targets, scene.tolerance);
    setResult(r);
    if (r.ok) playCorrect(); else playWrong();
  }

  const hint =
    tool === "bod" ? "Klepnutím označ výsledek; klepnutím na značku ji zrušíš."
    : tool === "pravitko" ? (pending ? "Klepni na druhý bod, kterým přímka prochází." : "Klepni na první bod přímky.")
    : tool === "kruzitko" ? (pending ? "Klepni na bod, kterým kružnice prochází (určí poloměr)." : "Klepni na střed kružnice.")
    : "Klepni na střed kružnice (poloměr je pevný).";

  const toolBtn = (id: string, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => chooseTool(id)}
      disabled={checked}
      className="rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
      style={{
        background: tool === id ? NAVY : "#f1f5f9",
        color: tool === id ? "#fff" : "#334155",
        border: `1px solid ${tool === id ? NAVY : "#e2e8f0"}`,
        opacity: checked ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );

  const markerColor = (i: number) => (!checked ? ORANGE : result!.matchedMarker[i] ? GREEN : RED);
  const shownSteps = scene.steps.slice(0, stepShown);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-4 fade-in-up">
      {/* Hlavička */}
      <div className="flex items-center gap-2 text-xs">
        <span className="font-semibold text-slate-500 shrink-0">{cardNumber} / {total}</span>
        <span className="font-semibold px-2 py-0.5 rounded-full text-[11px] shrink-0" style={{ background: "#eef2ff", color: "#4338ca" }}>
          {TEMA_LABELS[example.tema] ?? example.tema}
        </span>
        {podtemaLabel(example.podtema) && (
          <span className="text-slate-300 text-[10px] shrink-0 truncate max-w-[90px]">{podtemaLabel(example.podtema)}</span>
        )}
        <span className="ml-auto font-semibold px-2 py-0.5 rounded-full text-[11px] shrink-0" style={{ background: badge.bg, color: badge.color }}>
          {badge.label}
        </span>
      </div>

      {/* Zadání */}
      <div className="rounded-xl p-4" style={{ background: "#eef2ff", border: "1px solid #c7d2fe" }}>
        <div className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#6366f1" }}>📐 Rýsování</div>
        <div className="text-base font-bold leading-snug" style={{ color: "var(--text-primary)" }}>
          <MathText text={example.zadani} />
        </div>
      </div>

      {/* Nástroje */}
      <div className="flex flex-wrap items-center gap-1.5">
        {toolBtn("bod", "📍 Bod")}
        {toolBtn("pravitko", "📏 Pravítko")}
        {toolBtn("kruzitko", "⭕ Kružítko")}
        {(scene.radii ?? []).map((r, i) => toolBtn(`r:${i}`, `⭕ ${r.label}`))}
        <span className="ml-auto flex gap-1.5">
          <button type="button" onClick={undo} disabled={checked || items.length === 0} className="rounded-lg px-2.5 py-1.5 text-xs font-bold" style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", opacity: checked || items.length === 0 ? 0.4 : 1 }}>
            ↶ Zpět
          </button>
          <button type="button" onClick={clearAll} disabled={checked || items.length === 0} className="rounded-lg px-2.5 py-1.5 text-xs font-bold" style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", opacity: checked || items.length === 0 ? 0.4 : 1 }}>
            Smazat
          </button>
        </span>
      </div>
      {!checked && <div className="text-xs" style={{ color: "#64748b" }}>{hint}</div>}

      {/* Scéna */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${scene.width} ${scene.height}`}
          role="img"
          aria-label={example.zadani}
          onClick={onClick}
          style={{ width: "100%", height: "auto", display: "block", touchAction: "manipulation", cursor: checked ? "default" : "crosshair", userSelect: "none" }}
        >
          {/* zadání */}
          {scene.given.map((el, i) => <Element key={`g${i}`} el={el} w={scene.width} h={scene.height} color={NAVY} sw={2} />)}

          {/* postup řešení (po kontrole) */}
          {shownSteps.flatMap((s, si) => s.draw.map((el, i) => (
            <Element key={`s${si}-${i}`} el={el} w={scene.width} h={scene.height} color={BLUE} sw={1.5} dashed={el.t === "circle" || el.t === "line"} />
          )))}

          {/* vlastní pomocné čáry */}
          {items.map((it) => it.kind === "line"
            ? <Element key={it.id} el={{ t: "line", x1: it.a.x, y1: it.a.y, x2: it.b.x, y2: it.b.y }} w={scene.width} h={scene.height} color={BLUE} sw={1.4} />
            : it.kind === "circ"
              ? <circle key={it.id} cx={it.c.x} cy={it.c.y} r={it.r} fill="none" stroke={BLUE} strokeWidth={1.4} />
              : null)}

          {/* body, ke kterým se klepnutí přichytí */}
          {!checked && candidates.visible.map((p, i) => <circle key={`c${i}`} cx={p.x} cy={p.y} r={3} fill="#94a3b8" fillOpacity={0.7} />)}

          {/* rozpracovaný první bod pravítka/kružítka */}
          {pending && <circle cx={pending.x} cy={pending.y} r={7} fill="none" stroke={ORANGE} strokeWidth={2} />}

          {/* správné body po kontrole */}
          {checked && scene.targets.map((t, i) => (
            <g key={`t${i}`}>
              <circle cx={t.x} cy={t.y} r={11} fill="none" stroke={GREEN} strokeWidth={2.2} strokeDasharray={result!.matchedTarget[i] ? undefined : "4 3"} />
              <circle cx={t.x} cy={t.y} r={2.2} fill={GREEN} />
            </g>
          ))}

          {/* moje značky */}
          {markers.map((m, i) => (
            <circle key={m.id} cx={m.p.x} cy={m.p.y} r={5.5} fill={markerColor(i)} stroke="#fff" strokeWidth={1.6} />
          ))}

          {/* měřítko */}
          <g>
            <line x1={scene.width - 10 - scene.cm} y1={scene.height - 10} x2={scene.width - 10} y2={scene.height - 10} stroke="#64748b" strokeWidth={1.6} />
            <line x1={scene.width - 10 - scene.cm} y1={scene.height - 14} x2={scene.width - 10 - scene.cm} y2={scene.height - 6} stroke="#64748b" strokeWidth={1.2} />
            <line x1={scene.width - 10} y1={scene.height - 14} x2={scene.width - 10} y2={scene.height - 6} stroke="#64748b" strokeWidth={1.2} />
            <text x={scene.width - 10 - scene.cm / 2} y={scene.height - 17} fontSize={10} fill="#64748b" textAnchor="middle" style={{ fontFamily: "system-ui, sans-serif" }}>1 cm</text>
          </g>
        </svg>
      </div>

      {/* Kontrola */}
      {!checked && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={check}
            disabled={markers.length === 0}
            className="rounded-xl px-4 py-3 text-sm font-bold text-white transition-opacity"
            style={{ background: "#2E6DA4", opacity: markers.length === 0 ? 0.45 : 1 }}
          >
            Zkontrolovat výsledek
          </button>
          {onSkip && (
            <button type="button" onClick={onSkip} className="text-xs font-semibold text-slate-400 py-1">Přeskočit úlohu</button>
          )}
        </div>
      )}

      {/* Vyhodnocení + postup */}
      {checked && (
        <div className="flex flex-col gap-3 fade-in-up">
          <div
            className="rounded-xl p-4"
            style={{ background: result!.ok ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result!.ok ? "#bbf7d0" : "#fecaca"}` }}
          >
            <div className="text-sm font-black" style={{ color: result!.ok ? "#166534" : "#991b1b" }}>
              {result!.ok
                ? scene.targets.length > 1 ? "✅ Správně — našel jsi všechny body." : "✅ Správně!"
                : "❌ Není to ono."}
            </div>
            {!result!.ok && (
              <div className="text-xs mt-1" style={{ color: "#7f1d1d" }}>
                {result!.matched} z {scene.targets.length} hledaných bodů máš správně
                {result!.extra > 0 ? `, ${result!.extra} ${result!.extra === 1 ? "značka je" : "značky jsou"} navíc nebo mimo` : ""}.
                Správné body jsou v obrázku vyznačené zeleně.
              </div>
            )}
          </div>

          {shownSteps.length > 0 && (
            <ol className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
              {shownSteps.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm" style={{ color: "#334155" }}>
                  <span className="font-black shrink-0" style={{ color: BLUE }}>{i + 1}.</span>
                  <span><MathText text={s.text} /></span>
                </li>
              ))}
            </ol>
          )}

          {stepShown < scene.steps.length && (
            <button
              type="button"
              onClick={() => setStepShown((n) => n + 1)}
              className="rounded-xl px-4 py-2.5 text-sm font-bold"
              style={{ background: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe" }}
            >
              {stepShown === 0 ? "📐 Ukaž postup krok za krokem" : `Další krok (${stepShown + 1}/${scene.steps.length})`}
            </button>
          )}

          <button
            type="button"
            onClick={() => onResult(result!.ok, "konstrukce")}
            className="rounded-xl px-4 py-3 text-sm font-bold text-white"
            style={{ background: NAVY }}
          >
            Pokračovat →
          </button>
        </div>
      )}
    </div>
  );
}
