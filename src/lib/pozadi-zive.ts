/**
 * Živá pozadí (Karel 18. 11. 2026: pozadí musí být na úrovni 3D Hexíka).
 *
 * Základ zůstává v CSS (globals.css, .mm-banner[data-pozadi]) – ten se ukáže i v náhledech a bez JavaScriptu.
 * Přes něj kreslí <canvas> živou vrstvu: sníh, hvězdy, bublinky, světlušky, ohňostroj, polární záři…
 * Kreslí se jen když je pozadí vidět, s omezenými animacemi jen jeden klidný snímek.
 */

type Ctx = CanvasRenderingContext2D;
interface Castice { x: number; y: number; vx: number; vy: number; r: number; f: number; zivot: number; barva: string }
interface Scena { init: (w: number, h: number) => void; kresli: (x: Ctx, w: number, h: number, t: number, dt: number) => void }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const vyber = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

function hvezda(x: Ctx, cx: number, cy: number, r: number, barva: string, a: number) {
  x.globalAlpha = a; x.fillStyle = barva;
  x.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.28 : r, u = (i * Math.PI) / 4; x.lineTo(cx + Math.cos(u) * rr, cy + Math.sin(u) * rr); }
  x.fill(); x.globalAlpha = 1;
}
function kruh(x: Ctx, cx: number, cy: number, r: number, barva: string, a = 1) {
  x.globalAlpha = a; x.fillStyle = barva; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1;
}
/** Stejná barva, ale průhledná (přechod do „rgba(0,0,0,0)“ by dělal šedé okraje). */
function pruhledna(barva: string): string {
  if (barva.startsWith("#")) { const n = parseInt(barva.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},0)`; }
  const m = barva.match(/rgba?\(([^,]+),([^,]+),([^,)]+)/);
  return m ? `rgba(${m[1]},${m[2]},${m[3]},0)` : "rgba(0,0,0,0)";
}
function zare(x: Ctx, cx: number, cy: number, r: number, barva: string, a: number) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, barva); g.addColorStop(1, pruhledna(barva));
  x.globalAlpha = a; x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); x.globalAlpha = 1;
}

/** Obecný „roj“ částic s vlastním zrozením a kreslením. */
function roj(pocet: (w: number, h: number) => number, zrod: (p: Castice, w: number, h: number, prvni: boolean) => void,
  krok: (p: Castice, w: number, h: number, t: number, dt: number) => boolean, kresli: (x: Ctx, p: Castice, t: number) => void): Scena {
  let cs: Castice[] = [];
  const nova = (w: number, h: number, prvni: boolean) => { const p: Castice = { x: 0, y: 0, vx: 0, vy: 0, r: 1, f: Math.random() * 6.28, zivot: 0, barva: "#fff" }; zrod(p, w, h, prvni); return p; };
  return {
    init: (w, h) => { cs = Array.from({ length: pocet(w, h) }, () => nova(w, h, true)); },
    kresli: (x, w, h, t, dt) => {
      for (let i = 0; i < cs.length; i++) {
        const p = cs[i];
        p.zivot += dt;
        if (!krok(p, w, h, t, dt)) { cs[i] = nova(w, h, false); continue; }
        kresli(x, p, t);
      }
    },
  };
}

const sloz = (...sc: Scena[]): Scena => ({ init: (w, h) => sc.forEach((s) => s.init(w, h)), kresli: (x, w, h, t, dt) => sc.forEach((s) => s.kresli(x, w, h, t, dt)) });
const vrstva = (kresli: Scena["kresli"]): Scena => ({ init: () => {}, kresli });

// ── Stavebnice efektů ───────────────────────────────────────────────────────

const snih = (hustota = 1, barva = "#FFFFFF") => roj((w, h) => Math.round((w * h) / 2600 * hustota),
  (p, w, h, prvni) => { p.x = rnd(0, w); p.y = prvni ? rnd(0, h) : -6; p.r = rnd(0.8, 2.6); p.vy = rnd(14, 34) * (p.r / 2); p.vx = rnd(-6, 6); },
  (p, w, h, t, dt) => { p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 0.8 + p.f) * 10) * dt; return p.y < h + 6; },
  (x, p) => kruh(x, p.x, p.y, p.r, barva, 0.85));

const hvezdy = (barvy = ["#FFFFFF", "#CFE3FF", "#FFE9A8"], hustota = 1) => roj((w, h) => Math.round((w * h) / 1800 * hustota),
  (p, w, h) => { p.x = rnd(0, w); p.y = rnd(0, h); p.r = rnd(0.6, 1.8); p.barva = vyber(barvy); },
  () => true,
  (x, p, t) => { const a = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 1.8 + p.f * 3), 2); kruh(x, p.x, p.y, p.r, p.barva, a); if (p.r > 1.5) hvezda(x, p.x, p.y, p.r * 3.2, p.barva, a * 0.5); });

const bubliny = (barva = "rgba(255,255,255,.85)", hustota = 1) => roj((w, h) => Math.round((w * h) / 9000 * hustota) + 6,
  (p, w, h, prvni) => { p.x = rnd(0, w); p.y = prvni ? rnd(0, h) : h + 10; p.r = rnd(2, 7); p.vy = -rnd(12, 30); },
  (p, w, h, t, dt) => { p.y += p.vy * dt; p.x += Math.sin(t * 1.6 + p.f) * 12 * dt; return p.y > -12; },
  (x, p) => { x.strokeStyle = barva; x.lineWidth = 1.2; x.globalAlpha = 0.8; x.beginPath(); x.arc(p.x, p.y, p.r, 0, Math.PI * 2); x.stroke(); kruh(x, p.x - p.r * 0.35, p.y - p.r * 0.35, p.r * 0.25, "#FFFFFF", 0.9); x.globalAlpha = 1; });

const svetlusky = (barva = "#FFF27A", hustota = 1) => roj((w, h) => Math.round((w * h) / 7000 * hustota) + 5,
  (p, w, h) => { p.x = rnd(0, w); p.y = rnd(h * 0.2, h); p.vx = rnd(-8, 8); p.vy = rnd(-6, 6); },
  (p, w, h, t, dt) => { p.x += (p.vx + Math.sin(t + p.f) * 8) * dt; p.y += (p.vy + Math.cos(t * 0.7 + p.f) * 6) * dt; if (p.x < -10) p.x = w + 10; if (p.x > w + 10) p.x = -10; if (p.y < 0 || p.y > h) p.vy *= -1; return true; },
  (x, p, t) => { const a = 0.3 + 0.7 * Math.max(0, Math.sin(t * 2.2 + p.f * 2)); zare(x, p.x, p.y, 10, barva, a * 0.7); kruh(x, p.x, p.y, 1.6, "#FFFFFF", a); });

const jiskry = (barvy: string[], hustota = 1) => roj((w, h) => Math.round((w * h) / 6000 * hustota) + 6,
  (p, w, h) => { p.x = rnd(0, w); p.y = rnd(0, h); p.r = rnd(3, 7); p.barva = vyber(barvy); },
  (p, w, h, t) => { if (Math.sin(t * 1.3 + p.f * 5) < -0.98) { p.x = rnd(0, w); p.y = rnd(0, h); } return true; },
  (x, p, t) => { const a = Math.pow(Math.max(0, Math.sin(t * 1.3 + p.f * 5)), 3); hvezda(x, p.x, p.y, p.r * (0.5 + a), p.barva, a); });

const konfety = (barvy: string[], hustota = 1) => roj((w, h) => Math.round((w * h) / 4500 * hustota) + 8,
  (p, w, h, prvni) => { p.x = rnd(0, w); p.y = prvni ? rnd(0, h) : -8; p.vy = rnd(18, 40); p.vx = rnd(-10, 10); p.r = rnd(3, 6); p.barva = vyber(barvy); },
  (p, w, h, t, dt) => { p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * 2 + p.f) * 14) * dt; return p.y < h + 10; },
  (x, p, t) => { x.save(); x.translate(p.x, p.y); x.rotate(t * 3 + p.f); x.scale(1, Math.abs(Math.sin(t * 4 + p.f))); x.fillStyle = p.barva; x.globalAlpha = 0.9; x.fillRect(-p.r / 2, -p.r, p.r, p.r * 2); x.restore(); x.globalAlpha = 1; });

const listi = (barvy: string[]) => roj((w, h) => Math.round(w / 60) + 3,
  (p, w, h, prvni) => { p.x = rnd(0, w); p.y = prvni ? rnd(0, h) : -12; p.vy = rnd(12, 24); p.r = rnd(5, 9); p.barva = vyber(barvy); },
  (p, w, h, t, dt) => { p.y += p.vy * dt; p.x += Math.sin(t * 1.2 + p.f) * 22 * dt; return p.y < h + 12; },
  (x, p, t) => { x.save(); x.translate(p.x, p.y); x.rotate(Math.sin(t * 1.5 + p.f) * 1.2); x.fillStyle = p.barva; x.globalAlpha = 0.85; x.beginPath(); x.ellipse(0, 0, p.r, p.r * 0.45, 0, 0, Math.PI * 2); x.fill(); x.restore(); x.globalAlpha = 1; });

const mraky = (barva = "rgba(255,255,255,.9)", pocet = 4) => roj(() => pocet,
  (p, w, h, prvni) => { p.x = prvni ? rnd(0, w) : -120; p.y = rnd(h * 0.08, h * 0.7); p.r = rnd(26, 46); p.vx = rnd(5, 12); },
  (p, w, h, t, dt) => { p.x += p.vx * dt; return p.x < w + 140; },
  (x, p) => { for (const [dx, dy, k] of [[0, 0, 1], [p.r * 0.9, 4, 0.75], [-p.r * 0.9, 6, 0.7], [p.r * 0.4, -p.r * 0.4, 0.7]] as const) zare(x, p.x + dx, p.y + dy, p.r * k * 1.4, barva, 0.8); });

const ohnostroj = () => {
  let rakety: { x: number; y: number; cil: number; vy: number; barva: string; boom: number; jiskry: { x: number; y: number; vx: number; vy: number }[] }[] = [];
  let pristi = 0;
  return {
    init: () => { rakety = []; pristi = 0; },
    kresli: (x: Ctx, w: number, h: number, t: number, dt: number) => {
      if (t > pristi) { rakety.push({ x: rnd(w * 0.1, w * 0.9), y: h + 4, cil: rnd(h * 0.12, h * 0.45), vy: -rnd(160, 220), barva: vyber(["#FF5A9E", "#FFD24D", "#4DD2FF", "#7CFF8A", "#B07CFF"]), boom: -1, jiskry: [] }); pristi = t + rnd(0.6, 1.4); }
      rakety = rakety.filter((r) => r.boom < 1.6);
      for (const r of rakety) {
        if (r.boom < 0) {
          r.y += r.vy * dt; kruh(x, r.x, r.y, 1.8, "#FFF6D0");
          if (r.y <= r.cil) { r.boom = 0; for (let i = 0; i < 36; i++) { const u = (i / 36) * Math.PI * 2, s = rnd(40, 80); r.jiskry.push({ x: r.x, y: r.y, vx: Math.cos(u) * s, vy: Math.sin(u) * s }); } }
        } else {
          r.boom += dt;
          const a = Math.max(0, 1 - r.boom / 1.6);
          for (const j of r.jiskry) { j.x += j.vx * dt; j.y += j.vy * dt; j.vy += 40 * dt; j.vx *= 0.985; kruh(x, j.x, j.y, 1.6, r.barva, a); }
          if (r.boom < 0.2) zare(x, r.x, r.y, 40, r.barva, (0.2 - r.boom) * 3);
        }
      }
    },
  };
};

const aurora = (barvy = ["rgba(61,245,176,.55)", "rgba(141,110,255,.5)", "rgba(77,210,255,.4)"]) => vrstva((x, w, h, t) => {
  x.globalCompositeOperation = "lighter";
  barvy.forEach((b, k) => {
    x.beginPath();
    for (let i = 0; i <= 24; i++) { const px = (i / 24) * w, py = h * (0.32 + k * 0.1) + Math.sin(i * 0.5 + t * (0.6 + k * 0.2) + k) * h * 0.08; if (i === 0) x.moveTo(px, py); else x.lineTo(px, py); }
    for (let i = 24; i >= 0; i--) { const px = (i / 24) * w, py = h * (0.32 + k * 0.1) + Math.sin(i * 0.5 + t * (0.6 + k * 0.2) + k) * h * 0.08 - h * (0.22 + 0.05 * Math.sin(i + t)); x.lineTo(px, py); }
    const g = x.createLinearGradient(0, h * 0.1, 0, h * 0.6); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, b);
    x.fillStyle = g; x.fill();
  });
  x.globalCompositeOperation = "source-over";
});

const paprsky = (barva = "rgba(255,255,255,.12)") => vrstva((x, w, h, t) => {
  x.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i++) {
    const cx = w * (0.15 + i * 0.18) + Math.sin(t * 0.4 + i) * 20;
    x.beginPath(); x.moveTo(cx - 12, 0); x.lineTo(cx + 12, 0); x.lineTo(cx + 60, h); x.lineTo(cx - 20, h); x.closePath();
    x.globalAlpha = 0.5 + 0.5 * Math.sin(t * 0.7 + i * 1.7); x.fillStyle = barva; x.fill();
  }
  x.globalAlpha = 1; x.globalCompositeOperation = "source-over";
});

const dest = () => roj((w, h) => Math.round(w / 6),
  (p, w, h, prvni) => { p.x = rnd(0, w); p.y = prvni ? rnd(0, h) : -20; p.vy = rnd(260, 380); p.r = rnd(8, 16); p.barva = vyber(["rgba(255,61,139,.5)", "rgba(61,245,255,.45)", "rgba(255,255,255,.35)"]); },
  (p, w, h, t, dt) => { p.y += p.vy * dt; p.x -= p.vy * 0.15 * dt; return p.y < h + 20; },
  (x, p) => { x.strokeStyle = p.barva; x.lineWidth = 1; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x + p.r * 0.15, p.y - p.r); x.stroke(); });

const synthMrizka = () => vrstva((x, w, h, t) => {
  const horiz = h * 0.58;
  x.strokeStyle = "rgba(255,61,200,.55)"; x.lineWidth = 1;
  for (let i = -10; i <= 10; i++) { x.beginPath(); x.moveTo(w / 2 + i * 14, horiz); x.lineTo(w / 2 + i * w * 0.22, h); x.stroke(); }
  for (let i = 0; i < 8; i++) { const k = ((i + (t * 0.6) % 1) / 8); const y = horiz + Math.pow(k, 2.2) * (h - horiz); x.globalAlpha = k; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
  x.globalAlpha = 1;
});

const skenMrizka = () => vrstva((x, w, h, t) => {
  const y = ((t * 40) % (h + 60)) - 30;
  const g = x.createLinearGradient(0, y - 30, 0, y + 30); g.addColorStop(0, "rgba(61,245,255,0)"); g.addColorStop(0.5, "rgba(61,245,255,.35)"); g.addColorStop(1, "rgba(61,245,255,0)");
  x.fillStyle = g; x.fillRect(0, y - 30, w, 60);
});

const reflektory = (barva = "rgba(255,255,255,.18)") => vrstva((x, w, h, t) => {
  x.globalCompositeOperation = "lighter";
  for (const [ox, k] of [[0.08, 1], [0.92, -1]] as const) {
    const u = Math.sin(t * 0.6 * k) * 0.5 + (k > 0 ? 0.35 : -0.35);
    x.save(); x.translate(w * ox, 0); x.rotate(u);
    const g = x.createLinearGradient(0, 0, 0, h * 1.2); g.addColorStop(0, barva); g.addColorStop(1, "rgba(255,255,255,0)");
    x.fillStyle = g; x.beginPath(); x.moveTo(-4, 0); x.lineTo(4, 0); x.lineTo(60, h * 1.2); x.lineTo(-60, h * 1.2); x.closePath(); x.fill(); x.restore();
  }
  x.globalCompositeOperation = "source-over";
});

const blesky = () => roj((w, h) => Math.round(w / 14),
  (p, w, h) => { p.x = rnd(0, w); p.y = rnd(h * 0.05, h * 0.5); p.r = rnd(1, 2); },
  () => true,
  (x, p, t) => { const a = Math.sin(t * 7 + p.f * 9) > 0.97 ? 1 : 0; if (a) { kruh(x, p.x, p.y, p.r * 2, "#FFFFFF", 1); zare(x, p.x, p.y, 14, "rgba(255,255,255,.8)", 0.8); } });

const sestiuhelniky = (barva = "rgba(255,255,255,.12)") => roj((w, h) => Math.round(w / 50) + 4,
  (p, w, h, prvni) => { p.x = rnd(0, w); p.y = prvni ? rnd(0, h) : h + 20; p.r = rnd(6, 16); p.vy = -rnd(6, 14); },
  (p, w, h, t, dt) => { p.y += p.vy * dt; return p.y > -20; },
  (x, p, t) => { x.save(); x.translate(p.x, p.y); x.rotate(t * 0.3 + p.f); x.strokeStyle = barva; x.lineWidth = 1.5; x.beginPath(); for (let i = 0; i < 6; i++) { const u = (i * Math.PI) / 3; x.lineTo(Math.cos(u) * p.r, Math.sin(u) * p.r); } x.closePath(); x.stroke(); x.restore(); });

const svetylka = () => vrstva((x, w, h, t) => {
  const barvy = ["#FF5A5F", "#FFD24D", "#4DD2FF", "#7CFF8A"];
  x.strokeStyle = "rgba(20,40,20,.8)"; x.lineWidth = 1.5; x.beginPath();
  for (let i = 0; i <= 20; i++) { const px = (i / 20) * w, py = 10 + Math.sin((i / 20) * Math.PI * 3) * 6; if (i === 0) x.moveTo(px, py); else x.lineTo(px, py); }
  x.stroke();
  for (let i = 0; i < 14; i++) { const px = ((i + 0.5) / 14) * w, py = 14 + Math.sin(((i + 0.5) / 14) * Math.PI * 3) * 6; const a = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 3 + i * 1.7)); zare(x, px, py, 10, barvy[i % 4], a); kruh(x, px, py, 2.6, barvy[i % 4], 1); }
});

const neonBlik = () => vrstva((x, w, h, t) => {
  const on = Math.sin(t * 13) > -0.6 || Math.sin(t * 2.1) > 0;
  x.globalCompositeOperation = "lighter";
  zare(x, w * 0.2, h * 0.75, 60, "rgba(255,61,139,.55)", on ? 0.9 : 0.3);
  zare(x, w * 0.78, h * 0.7, 70, "rgba(61,245,255,.45)", 0.8);
  x.globalCompositeOperation = "source-over";
});

const SCENY: Record<string, () => Scena> = {
  klasik: () => sestiuhelniky(),
  tyrkys: () => sloz(bubliny("rgba(255,255,255,.7)", 0.6), jiskry(["#FFFFFF"], 0.6)),
  mraky: () => sloz(mraky("rgba(255,255,255,.85)", 5), jiskry(["#FFFFFF", "#FFE9A8"], 0.5)),
  mrizka: () => sloz(skenMrizka(), jiskry(["#3DF5FF"], 0.8)),
  dzungle: () => sloz(listi(["#3FA45B", "#6CC46B", "#9BDC6A", "#2F8F4E"]), svetlusky("#FFF27A", 1)),
  zapad: () => sloz(hvezdy(["#FFFFFF"], 0.25), roj(() => 4, (p, w, h, prvni) => { p.x = prvni ? rnd(0, w) : -20; p.y = rnd(h * 0.15, h * 0.45); p.vx = rnd(18, 30); }, (p, w, h, t, dt) => { p.x += p.vx * dt; return p.x < w + 20; }, (x, p, t) => { x.strokeStyle = "rgba(59,42,94,.85)"; x.lineWidth = 1.6; const k = Math.sin(t * 8 + p.f) * 3; x.beginPath(); x.moveTo(p.x - 6, p.y - k); x.quadraticCurveTo(p.x - 3, p.y - 3, p.x, p.y); x.quadraticCurveTo(p.x + 3, p.y - 3, p.x + 6, p.y - k); x.stroke(); })),
  podmori: () => sloz(paprsky("rgba(190,240,255,.12)"), bubliny("rgba(255,255,255,.75)", 1.2)),
  synthwave: () => sloz(hvezdy(["#FFFFFF", "#FFB3E6"], 0.5), synthMrizka()),
  pohadka: () => sloz(jiskry(["#FFFFFF", "#FFD36E", "#FF9AC8", "#B79CFF"], 1.4), svetlusky("#FFD6F2", 0.6)),
  stadion: () => sloz(reflektory(), blesky()),
  ohnostroj: () => sloz(hvezdy(["#FFFFFF"], 0.5), ohnostroj()),
  polarni: () => sloz(hvezdy(["#FFFFFF", "#CFE3FF"], 0.9), aurora()),
  generalka: () => sloz(reflektory("rgba(255,224,138,.16)"), konfety(["#F5C542", "#FFE08A", "#FFFFFF"], 0.7)),
  vanoce: () => sloz(svetylka(), snih(1.1)),
  svetylka: () => sloz(svetylka(), svetlusky("#FFC46B", 0.8), snih(0.5)),
  ledove: () => sloz(snih(0.8, "#8EC9EE"), jiskry(["#FFFFFF", "#7FC8F0"], 1.2)),
  cil: () => konfety(["#F5A623", "#2E6DA4", "#FFFFFF", "#E5383B"], 1),
  duhova: () => sloz(jiskry(["#FFFFFF", "#FFE9A8"], 0.8), roj(() => 4, (p, w, h) => { p.x = rnd(0, w); p.y = rnd(h * 0.1, h * 0.6); p.barva = vyber(["#FF9AC8", "#8ED1FF", "#FFD36E"]); }, (p, w, h, t, dt) => { p.x += Math.sin(t * 0.7 + p.f) * 18 * dt; p.y += Math.cos(t * 0.9 + p.f) * 10 * dt; return true; }, (x, p, t) => { const k = Math.abs(Math.sin(t * 9 + p.f)); x.fillStyle = p.barva; x.globalAlpha = 0.9; x.beginPath(); x.ellipse(p.x - 4 * k, p.y, 4 * k + 0.5, 3, -0.4, 0, Math.PI * 2); x.ellipse(p.x + 4 * k, p.y, 4 * k + 0.5, 3, 0.4, 0, Math.PI * 2); x.fill(); x.globalAlpha = 1; })),
  zamek: () => sloz(mraky("rgba(255,255,255,.75)", 3), jiskry(["#FFFFFF", "#FFD6F2"], 1)),
  beton: () => sloz(roj((w, h) => Math.round(w / 12), (p, w, h) => { p.x = rnd(0, w); p.y = rnd(0, h); p.r = rnd(0.5, 1.4); }, (p, w, h, t, dt) => { p.y += Math.sin(t * 0.5 + p.f) * 4 * dt; p.x += 3 * dt; if (p.x > w) p.x = 0; return true; }, (x, p, t) => kruh(x, p.x, p.y, p.r, "#FFFFFF", 0.25 + 0.2 * Math.sin(t + p.f))), neonBlik()),
  neonulice: () => sloz(dest(), neonBlik()),
};

export function maZivePozadi(klic: string): boolean {
  return klic in SCENY;
}

/** Spustí živou vrstvu na plátně; vrací funkci, která ji zastaví. */
export function spustZivePozadi(canvas: HTMLCanvasElement, klic: string): () => void {
  const tvorba = SCENY[klic];
  const x = canvas.getContext("2d");
  if (!tvorba || !x) return () => {};
  const sc = tvorba();
  const klidne = typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let w = 0, h = 0, raf = 0, bezi = false, videt = true, t = 0, minule = performance.now();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const velikost = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    sc.init(w, h);
  };
  const snimek = () => {
    const ted = performance.now(), dt = Math.min(0.05, (ted - minule) / 1000); minule = ted; t += dt;
    x.clearRect(0, 0, w, h);
    sc.kresli(x, w, h, t, dt);
  };
  const smycka = () => {
    if (!videt || document.hidden) { bezi = false; return; }
    snimek(); raf = requestAnimationFrame(smycka);
  };
  const spust = () => { if (klidne) { snimek(); return; } if (!bezi && videt && !document.hidden) { bezi = true; minule = performance.now(); raf = requestAnimationFrame(smycka); } };
  velikost();
  if (klidne) { t = 3; snimek(); }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => { velikost(); if (klidne) snimek(); }) : null; ro?.observe(canvas);
  const io = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver((z) => { videt = z.some((e) => e.isIntersecting); if (videt) spust(); }) : null; io?.observe(canvas);
  const naViditelnost = () => { if (!document.hidden) spust(); };
  document.addEventListener("visibilitychange", naViditelnost);
  spust();
  return () => { cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); document.removeEventListener("visibilitychange", naViditelnost); };
}
