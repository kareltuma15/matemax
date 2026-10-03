"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { DBExample, SceneElement, TEMA_LABELS, podtemaLabel } from "@/types";
import {
  Pt, Shape, allIntersections, intersections, nearest, clipLine, matchMarkers, dist, distToShape, perpendicularThrough, parallelThrough,
} from "@/lib/construct-geom";
import { playCorrect, playWrong } from "@/lib/sound";
import MathText from "@/components/MathText";

/**
 * Rýsování (CERMAT „Sestrojte…"): žák má v obrázku pravítko a kružítko, klepnutí se přichytává
 * k průsečíkům a nakonec nástrojem „Bod" označí hledaný bod (nebo všechny hledané body).
 *
 * Pravítko s pravým úhlem („⟂ Kolmice"): žák klepne na přímku/úsečku a pak na bod, kterým má kolmice vést
 * (jako když posouvá trojúhelník s ryskou po přímce až k bodu).
 *
 * Výsledný bod se smí označit JEN v průsečíku čar (nebo v zadaném bodě) — ne odhadem od oka.
 * Výsledek se ověřuje výpočtem, postup se po kontrole ukáže krok za krokem.
 * Lupa přiblíží obrázek (hustá konstrukce se na mobilu špatně klepe). Kružítko umí pevný poloměr
 * (např. „3 cm") i „stejný poloměr jako naposledy" (kružítko zůstane rozevřené).
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
const SNAP_PX = 18;       // dosah přichycení v pixelech na obrazovce
const MAX_ZOOM = 4;
const RSNAP_PX = 8;       // dosah „zastavení" poloměru kružnice na dříve použitém poloměru

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

/** Prvek scény. `u` = jednotek scény na 1 px obrazovky (při přiblížení menší) — body a písmo mají stálou velikost. */
function Element({ el, w, h, color, sw, dashed, u }: { el: SceneElement; w: number; h: number; color: string; sw: number; dashed?: boolean; u: number }) {
  const dash = dashed ? "5 4" : undefined;
  const ns = { vectorEffect: "non-scaling-stroke" as const };
  switch (el.t) {
    case "point":
      return (
        <g>
          <circle cx={el.x} cy={el.y} r={3.6 * u} fill={color} />
          {el.label && (
            <text x={el.x + (el.dx ?? 7) * u} y={el.y + (el.dy ?? -7) * u} fontSize={14 * u} fontWeight={700} fill={color} style={{ fontFamily: "system-ui, sans-serif" }}>
              {el.label}
            </text>
          )}
        </g>
      );
    case "segment":
      return <line x1={el.x1} y1={el.y1} x2={el.x2} y2={el.y2} stroke={color} strokeWidth={sw} strokeDasharray={el.dashed ? "5 4" : dash} strokeLinecap="round" {...ns} />;
    case "line":
    case "ray": {
      const c = clipLine({ x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 }, w, h, el.t === "ray");
      if (!c) return null;
      return <line x1={c[0].x} y1={c[0].y} x2={c[1].x} y2={c[1].y} stroke={color} strokeWidth={sw} strokeDasharray={el.dashed ? "5 4" : dash} strokeLinecap="round" {...ns} />;
    }
    case "circle":
      return <circle cx={el.cx} cy={el.cy} r={el.r} fill="none" stroke={color} strokeWidth={sw} strokeDasharray={el.dashed ? "5 4" : dash} {...ns} />;
    case "arc":
      return <path d={arcPath(el.cx, el.cy, el.r, el.a1, el.a2)} fill="none" stroke={color} strokeWidth={sw} {...ns} />;
    case "polygon":
      return <polygon points={el.pts.map((p) => p.join(",")).join(" ")} fill={el.fill ?? "none"} stroke={color} strokeWidth={sw} strokeLinejoin="round" {...ns} />;
    case "text":
      return (
        <text x={el.x} y={el.y} fontSize={(el.size ?? 14) * u} fontWeight={700} fill={color} textAnchor={el.anchor ?? "start"} style={{ fontFamily: "system-ui, sans-serif" }}>
          {el.text}
        </text>
      );
    case "right": {
      const s = 9 * u;
      const d = `M${el.x + el.ux * s} ${el.y + el.uy * s} L${el.x + (el.ux + el.vx) * s} ${el.y + (el.uy + el.vy) * s} L${el.x + el.vx * s} ${el.y + el.vy * s}`;
      return <path d={d} fill="none" stroke={color} strokeWidth={1.4} {...ns} />;
    }
  }
}

export default function ConstructionMarkCard({ example, cardNumber, total, onResult, onSkip }: Props) {
  const scene = example.konstrukce_scena!;
  const svgRef = useRef<SVGSVGElement>(null);
  const idRef = useRef(1);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tool, setTool] = useState<string>("pravitko");
  const [pending, setPending] = useState<Pt | null>(null);
  const [refLine, setRefLine] = useState<Shape | null>(null); // přímka vybraná pro kolmici
  const [items, setItems] = useState<Item[]>([]);
  const [lastR, setLastR] = useState<number | null>(null);
  const [result, setResult] = useState<ReturnType<typeof matchMarkers> | null>(null);
  const [stepShown, setStepShown] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<Pt>({ x: scene.width / 2, y: scene.height / 2 });
  const [notice, setNotice] = useState<string | null>(null);
  // Živý náhled: myš (hover) nebo prst během podržení. `mouse` = skutečný ukazatel (skryje systémový kurzor).
  const [hover, setHover] = useState<{ p: Pt; k: number; mouse: boolean } | null>(null);

  useEffect(() => {
    setTool("pravitko"); setPending(null); setRefLine(null); setItems([]); setLastR(null); setResult(null); setStepShown(0);
    setZoom(1); setCenter({ x: scene.width / 2, y: scene.height / 2 }); setNotice(null); setHover(null);
  }, [example.id, scene.width, scene.height]);

  const W = scene.width, H = scene.height;
  const vw = W / zoom, vh = H / zoom;
  const vx = Math.min(Math.max(center.x - vw / 2, 0), W - vw);
  const vy = Math.min(Math.max(center.y - vh / 2, 0), H - vh);
  const u = 1 / zoom;

  const givenShapes = useMemo(() => shapesOf(scene.given), [scene]);
  const givenPoints = useMemo(() => scene.given.filter((e) => e.t === "point").map((e) => ({ x: (e as { x: number }).x, y: (e as { y: number }).y })), [scene]);

  const helperShapes: Shape[] = useMemo(
    () => items.flatMap((it): Shape[] => it.kind === "line" ? [{ k: "line", a: it.a, b: it.b }] : it.kind === "circ" ? [{ k: "circ", c: it.c, r: it.r }] : []),
    [items],
  );
  const markers = useMemo(() => items.filter((it): it is Extract<Item, { kind: "marker" }> => it.kind === "marker"), [items]);

  // Body, ke kterým se klepnutí přichytává: zadané body + všechny průsečíky zadaných i vlastních čar.
  // Zobrazují se jen průsečíky, na nichž se podílí aspoň jedna vlastní čára (méně čmouhy).
  const candidates = useMemo(() => {
    const inScene = (p: Pt) => p.x > -2 && p.x < W + 2 && p.y > -2 && p.y < H + 2;
    const all = allIntersections([...givenShapes, ...helperShapes]).filter(inScene);
    const withHelper: Pt[] = [];
    helperShapes.forEach((h, i) => {
      for (const s of [...givenShapes, ...helperShapes.slice(0, i)]) {
        for (const p of intersections(h, s)) {
          if (inScene(p) && !withHelper.some((q) => dist(p, q) < 0.75) && !givenPoints.some((g) => dist(g, p) < 1)) withHelper.push(p);
        }
      }
    });
    const extra = all.filter((p) => !givenPoints.some((g) => dist(g, p) < 1));
    return { snap: [...givenPoints, ...extra], visible: withHelper.slice(0, 120) };
  }, [givenShapes, helperShapes, givenPoints, W, H]);

  const checked = result !== null;
  const badge = DIFFICULTY_BADGE[example.obtiznost] ?? DIFFICULTY_BADGE[1];

  function toScene(e: React.MouseEvent<SVGSVGElement>) {
    const r = svgRef.current!.getBoundingClientRect();
    const k = vw / r.width; // jednotek scény na 1 px obrazovky
    return { p: { x: vx + (e.clientX - r.left) * k, y: vy + (e.clientY - r.top) * (vh / r.height) }, k };
  }

  // Poloměry, na kterých se kružítko „zastaví": dosud nakreslené kružnice (vlastní i zadané) a pevné poloměry úlohy.
  const radiusPool = useMemo(() => {
    const rs: number[] = [];
    for (const sh of [...givenShapes, ...helperShapes]) if (sh.k === "circ") rs.push(sh.r);
    for (const r of scene.radii ?? []) rs.push(r.r);
    return rs;
  }, [givenShapes, helperShapes, scene.radii]);

  /** Kam míří ukazatel v bodě `p` (k = jednotek scény na pixel): přichycení k bodu, u kružítka i k poloměru. */
  function aimAt(p: Pt, k: number): { pt: Pt; snapped: boolean; r?: number; note?: string } {
    const sn = nearest(candidates.snap, p, SNAP_PX * k);
    let pt = sn ?? p;
    if (tool === "kruzitko" && pending) {
      let r = dist(pending, pt);
      let note: string | undefined = sn ? "prochází bodem" : undefined;
      if (!sn) {
        const raw = dist(pending, p);
        let best: number | null = null, bd = RSNAP_PX * k;
        for (const rr of radiusPool) { const d = Math.abs(rr - raw); if (d <= bd) { bd = d; best = rr; } }
        if (best !== null && raw > 0) {
          r = best; note = "stejný poloměr";
          pt = { x: pending.x + ((p.x - pending.x) / raw) * best, y: pending.y + ((p.y - pending.y) / raw) * best };
        }
      }
      return { pt, snapped: !!sn, r, note };
    }
    return { pt, snapped: !!sn };
  }

  function add(it: NewItem) {
    setItems((cur) => [...cur, { ...it, id: idRef.current++ }]);
  }

  function say(msg: string) {
    setNotice(msg);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 3500);
  }
  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current); }, []);

  function addCircle(c: Pt, r: number) {
    add({ kind: "circ", c, r });
    setLastR(r);
  }

  function onClick(e: React.MouseEvent<SVGSVGElement>) {
    if (checked) return;
    const { p, k } = toScene(e);
    const aim = aimAt(p, k);
    const snapped = aim.snapped ? aim.pt : null;
    const s = aim.pt;

    if (tool === "lupa") {
      const nz = zoom >= MAX_ZOOM ? MAX_ZOOM : zoom * 2;
      setZoom(nz); setCenter(p);
      return;
    }
    if (tool === "bod") {
      const hit = markers.find((m) => dist(m.p, p) < 14 * k);
      if (hit) { setItems((cur) => cur.filter((it) => it.id !== hit.id)); return; }
      // hledaný bod musí být sestrojený (průsečík čar / zadaný bod) — odhad od oka se neuznává.
      // Test (e2e) smí označovat volně, protože nekonstruuje celý postup.
      const free = typeof window !== "undefined" && (window as unknown as { __MATEMAX_FREE_MARKERS?: boolean }).__MATEMAX_FREE_MARKERS === true;
      if (!snapped && !free) { say("Bod musí ležet v průsečíku čar. Nejdřív ho sestroj pravítkem a kružítkem, pak ho označ."); return; }
      add({ kind: "marker", p: s });
    } else if (tool === "pravitko") {
      if (!pending) setPending(s);
      else if (dist(pending, s) > 2) { add({ kind: "line", a: pending, b: s }); setPending(null); }
    } else if (tool === "kolmice" || tool === "rovnobezka") {
      if (!refLine) {
        // krok 1: vyber přímku / úsečku, ke které bude kolmice kolmá
        let best: Shape | null = null, bd = 16 * k;
        for (const sh of [...givenShapes, ...helperShapes]) {
          const d = distToShape(p, sh);
          if (d <= bd) { bd = d; best = sh; }
        }
        if (best) setRefLine(best); else say("Klepni přímo na přímku nebo úsečku, ke které chceš vést kolmici nebo rovnoběžku.");
      } else {
        // krok 2: bod, kterým kolmice prochází
        const l = (tool === "kolmice" ? perpendicularThrough : parallelThrough)(refLine, s);
        if (l) add({ kind: "line", a: l.a, b: l.b });
        setRefLine(null);
      }
    } else if (tool === "kruzitko") {
      if (!pending) setPending(s);
      else if (dist(pending, s) > 2) { addCircle(pending, aim.r ?? dist(pending, s)); setPending(null); }
    } else if (tool === "stejny") {
      if (lastR) addCircle(s, lastR);
    } else if (tool.startsWith("r:")) {
      const rr = scene.radii?.[Number(tool.slice(2))];
      if (rr) addCircle(s, rr.r);
    }
  }

  function chooseTool(t: string) { setTool(t); setPending(null); setRefLine(null); setNotice(null); }
  function undo() { setItems((cur) => cur.slice(0, -1)); setPending(null); setRefLine(null); }
  function clearAll() { setItems([]); setPending(null); setRefLine(null); setLastR(null); }
  function resetZoom() { setZoom(1); setCenter({ x: W / 2, y: H / 2 }); }

  function check() {
    const r = matchMarkers(markers.map((m) => m.p), scene.targets, scene.tolerance);
    setResult(r);
    if (r.ok) playCorrect(); else playWrong();
  }

  const hint =
    tool === "bod" ? "Klepnutím označ výsledek (jen v průsečíku čar, ukazatel se k němu přichytí); klepnutím na značku ji zrušíš."
    : tool === "pravitko" ? (pending ? "Klepni na druhý bod, kterým přímka prochází." : "Klepni na první bod přímky. Body se přichytávají k průsečíkům.")
    : tool === "kolmice" ? (refLine ? "Teď klepni na bod, kterým má kolmice procházet." : "Pravý úhel: klepni na přímku nebo úsečku, ke které chceš vést kolmici.")
    : tool === "rovnobezka" ? (refLine ? "Teď klepni na bod, kterým má rovnoběžka procházet." : "Rovnoběžka: klepni na přímku nebo úsečku, se kterou má být rovnoběžná.")
    : tool === "kruzitko" ? (pending ? "Táhni ukazatel: kružnice se zvětšuje. U bodu nebo u poloměru jiné kružnice se zastaví — klepnutím ji nakreslíš." : "Klepni na střed kružnice.")
    : tool === "stejny" ? "Klepni na střed kružnice — poloměr zůstane stejný jako u poslední kružnice."
    : tool === "lupa" ? "Klepni do místa, které chceš přiblížit (až 4×)."
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
  const smallBtn = (label: string, onClick: () => void, disabled: boolean) => (
    <button type="button" onClick={onClick} disabled={disabled} className="rounded-lg px-2.5 py-1.5 text-xs font-bold" style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", opacity: disabled ? 0.4 : 1 }}>
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
          <span className="text-slate-300 text-[10px] min-w-0 truncate">{podtemaLabel(example.podtema)}</span>
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
        {toolBtn("pravitko", "📏 Pravítko")}
        {toolBtn("kolmice", "⟂ Pravý úhel")}
        {toolBtn("rovnobezka", "∥ Rovnoběžka")}
        {toolBtn("kruzitko", "⭕ Kružítko")}
        {lastR !== null && toolBtn("stejny", "⭕ Stejný poloměr")}
        {(scene.radii ?? []).map((r, i) => toolBtn(`r:${i}`, `⭕ ${r.label}`))}
        {toolBtn("bod", "📍 Označit bod")}
        {toolBtn("lupa", "🔍 Lupa")}
        <span className="ml-auto flex gap-1.5">
          {zoom > 1 && smallBtn("Celý obrázek", resetZoom, checked)}
          {smallBtn("↶ Zpět", undo, checked || items.length === 0)}
          {smallBtn("Smazat", clearAll, checked || items.length === 0)}
        </span>
      </div>
      {!checked && <div className="text-xs" style={{ color: "#64748b" }}>{hint}</div>}
      {notice && <div className="text-xs font-semibold rounded-lg px-3 py-2" style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca" }}>{notice}</div>}

      {/* Scéna */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`${vx} ${vy} ${vw} ${vh}`}
          role="img"
          aria-label={example.zadani}
          onClick={onClick}
          onPointerMove={(e) => {
            if (checked) return;
            const touch = e.pointerType === "touch";
            if (touch && e.buttons === 0) return;
            const { p, k } = toScene(e);
            setHover({ p, k, mouse: !touch });
          }}
          onPointerDown={(e) => {
            if (checked || e.pointerType !== "touch") return;
            const { p, k } = toScene(e);
            setHover({ p, k, mouse: false });
          }}
          onPointerUp={(e) => { if (e.pointerType === "touch") setHover(null); }}
          onPointerCancel={() => setHover(null)}
          onPointerLeave={() => setHover(null)}
          style={{ width: "100%", height: "auto", display: "block", touchAction: "manipulation", cursor: checked ? "default" : tool === "lupa" ? "zoom-in" : hover?.mouse ? "none" : "default", userSelect: "none" }}
        >
          {/* zadání */}
          {scene.given.map((el, i) => <Element key={`g${i}`} el={el} w={W} h={H} color={NAVY} sw={2} u={u} />)}

          {/* postup řešení (po kontrole) */}
          {shownSteps.flatMap((s, si) => s.draw.map((el, i) => (
            <Element key={`s${si}-${i}`} el={el} w={W} h={H} color={BLUE} sw={1.5} u={u} dashed={el.t === "circle" || el.t === "line"} />
          )))}

          {/* vlastní pomocné čáry — jemné, ať nezakrývají obrázek */}
          <g opacity={0.6}>
            {items.map((it) => it.kind === "line"
              ? <Element key={it.id} el={{ t: "line", x1: it.a.x, y1: it.a.y, x2: it.b.x, y2: it.b.y }} w={W} h={H} color={BLUE} sw={1} u={u} />
              : it.kind === "circ"
                ? <circle key={it.id} cx={it.c.x} cy={it.c.y} r={it.r} fill="none" stroke={BLUE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
                : null)}
          </g>

          {/* body, ke kterým se klepnutí přichytí */}
          {!checked && candidates.visible.map((p, i) => <circle key={`c${i}`} cx={p.x} cy={p.y} r={2.4 * u} fill="#475569" fillOpacity={0.55} />)}

          {/* živý náhled (šedě): čára / kružnice / kolmice podle zvoleného nástroje */}
          {!checked && hover && (() => {
            const a = aimAt(hover.p, hover.k);
            const gray = "#64748b";
            const els: React.ReactNode[] = [];
            const circle = (c: Pt, r: number, key: string) => <circle key={key} cx={c.x} cy={c.y} r={r} fill="none" stroke={gray} strokeWidth={1.4} strokeDasharray="5 4" opacity={0.75} vectorEffect="non-scaling-stroke" />;
            const cm = (r: number) => `${(r / scene.cm).toFixed(1).replace(".", ",")} cm`;
            if (tool === "pravitko" && pending) els.push(<Element key="pl" el={{ t: "line", x1: pending.x, y1: pending.y, x2: a.pt.x, y2: a.pt.y }} w={W} h={H} color={gray} sw={1.4} dashed u={u} />);
            if (tool === "kruzitko" && pending && a.r) {
              els.push(circle(pending, a.r, "kc"));
              els.push(<line key="kr" x1={pending.x} y1={pending.y} x2={a.pt.x} y2={a.pt.y} stroke={gray} strokeWidth={1} opacity={0.6} vectorEffect="non-scaling-stroke" />);
              const label = `${cm(a.r)}${a.note ? ` · ${a.note}` : ""}`;
              const flipX = a.pt.x + (label.length * 6.8 + 18) * u > vx + vw, flipY = a.pt.y < vy + 24 * u;
              els.push(<text key="kl" x={a.pt.x + (flipX ? -12 : 12) * u} y={a.pt.y + (flipY ? 20 : -12) * u} textAnchor={flipX ? "end" : "start"} fontSize={12 * u} fontWeight={700} fill={a.note ? GREEN : "#334155"} stroke="#fff" strokeWidth={3} paintOrder="stroke" style={{ fontFamily: "system-ui, sans-serif" }}>{label}</text>);
            }
            if (tool === "stejny" && lastR) els.push(circle(a.pt, lastR, "sc"));
            if (tool.startsWith("r:")) { const rr = scene.radii?.[Number(tool.slice(2))]; if (rr) els.push(circle(a.pt, rr.r, "fc")); }
            if (tool === "kolmice" || tool === "rovnobezka") {
              if (!refLine) {
                let best: Shape | null = null, bd = 16 * hover.k;
                for (const sh of [...givenShapes, ...helperShapes]) { const d = distToShape(hover.p, sh); if (d <= bd) { bd = d; best = sh; } }
                if (best && best.k !== "circ") {
                  const c = clipLine(best.a, best.b, W, H, best.k === "ray");
                  const x1 = best.k === "seg" ? best.a : c?.[0], x2 = best.k === "seg" ? best.b : c?.[1];
                  if (x1 && x2) els.push(<line key="kh" x1={x1.x} y1={x1.y} x2={x2.x} y2={x2.y} stroke={ORANGE} strokeWidth={3} strokeLinecap="round" opacity={0.45} vectorEffect="non-scaling-stroke" />);
                }
              } else {
                const l = (tool === "kolmice" ? perpendicularThrough : parallelThrough)(refLine, a.pt);
                if (l) els.push(<Element key="kp" el={{ t: "line", x1: l.a.x, y1: l.a.y, x2: l.b.x, y2: l.b.y }} w={W} h={H} color={gray} sw={1.4} dashed u={u} />);
              }
            }
            // kurzor: malý kroužek; přichycený k bodu → oranžový terč
            els.push(a.snapped
              ? <g key="cur"><circle cx={a.pt.x} cy={a.pt.y} r={9 * u} fill="none" stroke={ORANGE} strokeWidth={2} vectorEffect="non-scaling-stroke" /><circle cx={a.pt.x} cy={a.pt.y} r={3.2 * u} fill={ORANGE} /></g>
              : hover.mouse ? <circle key="cur" cx={a.pt.x} cy={a.pt.y} r={4 * u} fill="none" stroke={tool === "bod" ? "#94a3b8" : gray} strokeWidth={1.4} vectorEffect="non-scaling-stroke" /> : null);
            return <g pointerEvents="none">{els}</g>;
          })()}

          {/* přímka vybraná pro kolmici */}
          {refLine && refLine.k !== "circ" && (() => {
            const c = clipLine(refLine.a, refLine.b, W, H, refLine.k === "ray");
            const a = refLine.k === "seg" ? refLine.a : c?.[0], b = refLine.k === "seg" ? refLine.b : c?.[1];
            return a && b ? <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ORANGE} strokeWidth={3} strokeLinecap="round" opacity={0.85} vectorEffect="non-scaling-stroke" /> : null;
          })()}

          {/* rozpracovaný první bod pravítka/kružítka */}
          {pending && <circle cx={pending.x} cy={pending.y} r={7 * u} fill="none" stroke={ORANGE} strokeWidth={2} vectorEffect="non-scaling-stroke" />}

          {/* správné body po kontrole */}
          {checked && scene.targets.map((t, i) => (
            <g key={`t${i}`}>
              <circle cx={t.x} cy={t.y} r={11 * u} fill="none" stroke={GREEN} strokeWidth={2.2} strokeDasharray={result!.matchedTarget[i] ? undefined : "4 3"} vectorEffect="non-scaling-stroke" />
              <circle cx={t.x} cy={t.y} r={2.2 * u} fill={GREEN} />
            </g>
          ))}

          {/* moje značky */}
          {markers.map((m, i) => (
            <circle key={m.id} cx={m.p.x} cy={m.p.y} r={5.5 * u} fill={markerColor(i)} stroke="#fff" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
          ))}

          {/* měřítko */}
          <g>
            <line x1={W - 10 - scene.cm} y1={H - 10} x2={W - 10} y2={H - 10} stroke="#64748b" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
            <line x1={W - 10 - scene.cm} y1={H - 14} x2={W - 10 - scene.cm} y2={H - 6} stroke="#64748b" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
            <line x1={W - 10} y1={H - 14} x2={W - 10} y2={H - 6} stroke="#64748b" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
            <text x={W - 10 - scene.cm / 2} y={H - 17} fontSize={10 * u} fill="#64748b" textAnchor="middle" style={{ fontFamily: "system-ui, sans-serif" }}>1 cm</text>
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
              onClick={() => { if (zoom > 1) resetZoom(); setStepShown((n) => n + 1); }}
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
