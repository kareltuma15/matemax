/**
 * Efekty comba kolem Hexíka (canvas 2D nad i pod 3D Hexíkem):
 * 1 jiskry kolem, 2 modré jiskry (záři dělá CSS), 3 oheň a uhlíky, 4 duhový oheň, 5 zlatý oheň a blesky.
 * Kreslí se jen, když je co kreslit; při skryté stránce nebo omezeném pohybu nic.
 */

interface Castice { k: "jiskra" | "ohen" | "uhlik"; x: number; y: number; vx: number; vy: number; z: number; dz: number; s: number; h: number; w: number }

export interface OhenComba {
  stupen: (t: number) => void;
  vzplanuti: () => void;
  znic: () => void;
}

export function vytvorOhenComba(cv: HTMLCanvasElement): OhenComba {
  const ctx = cv.getContext("2d");
  const redukce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const P: Castice[] = [];
  let W = 0, H = 0, d = 1, f = 0, t = 0, raf = 0, konec = false;
  let blesk: { b: [number, number][]; z: number } | null = null;
  let arena = 0;
  /** Barva tmavé arény za Hexíkem podle stupně (oheň svítí jen na tmavém). */
  const ARENA: Record<number, string> = { 2: "20,40,105", 3: "70,22,16", 4: "40,20,92", 5: "88,56,8" };

  function vel() {
    const r = cv.getBoundingClientRect();
    d = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d);
  }
  const pridej = (c: Omit<Castice, "w"> & { w?: number }) => P.push({ w: 0, ...c });

  function emit() {
    const cx = W / 2, cy = H * 0.5, R = Math.min(W, H) * 0.3;
    if (t >= 1) {
      for (let i = 0; i < (t >= 2 ? 3 : 1); i++) {
        const a = Math.random() * 6.283, rr = R * (1.05 + Math.random() * 0.2);
        pridej({ k: "jiskra", x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.85, vx: -Math.sin(a) * 1.3, vy: Math.cos(a) * 1 - 0.3, z: 1, dz: 0.02, s: 1.4 + Math.random() * 1.8, h: t >= 2 ? 215 : 195 });
      }
    }
    if (t >= 3) {
      const pocet = t >= 5 ? 8 : 6, sk = R / 70;
      for (let i = 0; i < pocet; i++) {
        const ua = Math.PI * (0.05 + Math.random() * 0.9);
        const sx = cx + Math.cos(ua) * R * 1.1 * (Math.random() < 0.5 ? 1 : -1), base = cy + Math.sin(ua) * R * 0.9;
        pridej({ k: "ohen", x: sx, y: base, vx: (cx - sx) * 0.006 + (Math.random() - 0.5) * 0.6, vy: -(2 + Math.random() * 2.6) * sk, z: 1, dz: 0.015 + Math.random() * 0.012, s: (14 + Math.random() * 16) * sk, h: Math.random() * 360 });
      }
      if (Math.random() < 0.6) pridej({ k: "uhlik", x: cx + (Math.random() - 0.5) * R * 1.6, y: cy + R * 0.6, vx: (Math.random() - 0.5) * 1.2, vy: -(2 + Math.random() * 2.5) * sk, z: 1, dz: 0.008, s: 1.4 + Math.random() * 1.6, h: 0, w: Math.random() * 6 });
    }
    if (t >= 5 && !blesk && Math.random() < 0.03) {
      const b: [number, number][] = []; let x = cx + (Math.random() - 0.5) * R * 3, y = 0; b.push([x, y]);
      while (y < cy - R * 0.4) { y += 14 + Math.random() * 16; x += (Math.random() - 0.5) * 26; b.push([x, y]); }
      blesk = { b, z: 7 };
    }
  }

  function barva(p: Castice, l: number) {
    if (p.k === "jiskra") return `hsla(${p.h},100%,${70 + l * 25}%,${l}`;
    if (p.k === "uhlik") return `hsla(${30 + l * 20},100%,${60 + l * 30}%,${l}`;
    if (t === 4) return `hsla(${(p.h + f * 3) % 360},100%,${45 + l * 30}%,${l * 0.85}`;
    if (t >= 5) return `hsla(${36 + l * 14},100%,${46 + l * 30}%,${l * 0.75}`;
    return `hsla(${8 + l * 40},100%,${40 + l * 32}%,${l * 0.7}`;
  }

  function krok() {
    raf = 0;
    if (konec || !ctx) return;
    f++;
    if (!W || cv.width !== Math.round(W * d)) vel();
    if (!document.hidden) emit();
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, W, H);
    arena += ((t >= 2 ? 1 : 0) - arena) * 0.08;
    if (arena > 0.01) {
      const cx = W / 2, cy = H * 0.5, rr = Math.min(W, H) * 0.5, c = ARENA[Math.min(t, 5)] ?? ARENA[2];
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr);
      g.addColorStop(0, `rgba(${c},${0.95 * arena})`); g.addColorStop(0.62, `rgba(${c},${0.8 * arena})`); g.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.283); ctx.fill();
    }
    ctx.globalCompositeOperation = "lighter";
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i]; p.z -= p.dz; if (p.z <= 0) { P.splice(i, 1); continue; }
      p.x += p.vx; p.y += p.vy;
      if (p.k === "ohen") { p.vx *= 0.98; p.s *= 0.985; }
      if (p.k === "uhlik") { p.w += 0.15; p.x += Math.sin(p.w) * 0.6; }
      const l = Math.min(1, p.z), g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.s);
      const b = barva(p, l); g.addColorStop(0, b + ")"); g.addColorStop(1, b.replace(/,[^,]*$/, ",0") + ")");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.283); ctx.fill();
    }
    if (blesk) {
      ctx.strokeStyle = `rgba(255,240,170,${blesk.z / 7})`; ctx.lineWidth = 3; ctx.shadowColor = "#FFD25E"; ctx.shadowBlur = 16;
      ctx.beginPath(); blesk.b.forEach((q, j) => (j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
      ctx.shadowBlur = 0; if (--blesk.z <= 0) blesk = null;
    }
    ctx.globalCompositeOperation = "source-over";
    if (t > 0 || P.length || blesk || arena > 0.01) raf = requestAnimationFrame(krok);
  }
  const spust = () => { if (!raf && !konec && !redukce) raf = requestAnimationFrame(krok); };
  const naResize = () => vel();
  window.addEventListener("resize", naResize);

  return {
    stupen(x) { t = x; if (t > 0) spust(); },
    vzplanuti() {
      if (redukce) return;
      if (!W) vel();
      const cx = W / 2, cy = H * 0.5;
      for (let i = 0; i < 60; i++) {
        const a = Math.random() * 6.283, v = 2 + Math.random() * 5;
        pridej({ k: t >= 3 ? "ohen" : "jiskra", x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, z: 1, dz: 0.025, s: t >= 3 ? 14 + Math.random() * 12 : 3, h: Math.random() * 360 });
      }
      spust();
    },
    znic() { konec = true; if (raf) cancelAnimationFrame(raf); window.removeEventListener("resize", naResize); },
  };
}
