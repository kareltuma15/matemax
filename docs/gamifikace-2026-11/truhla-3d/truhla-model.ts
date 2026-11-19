/**
 * MOCKUP v2: model truhly ve stejném „hračkovém“ jazyce jako Hexík.
 * - baculaté tělo (vyboulené boky, nahoře o kousek širší), všechny hrany měkce zaoblené
 * - prkna jako skutečné drážky v geometrii (ne čáry v textuře), kresba dřeva a lak
 * - kování kopíruje tvar těla, polokulové nýty, nožičky, panty
 * - zámek: šestiúhelník (Hexík) s broušeným šestiúhelníkovým drahokamem v barvě vzácnosti
 * - uvnitř sametová výstelka, která po otevření září
 */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Sklad } from "../../../src/lib/hexik3d/doplnky";

export type DruhModelu = "denni" | "mistrovska" | "legendarni" | "krystalova";

interface Paleta {
  telo: "drevo" | "zlato" | "krystal";
  drevo?: string;
  lak?: number;
  kov: "ocel" | "zlato" | "email";
  email?: string;
  nyty: "ocel" | "zlato";
  samet: string;
}
export const PALETY: Record<DruhModelu, Paleta> = {
  denni: { telo: "drevo", drevo: "#C27A3E", lak: 0.45, kov: "ocel", nyty: "ocel", samet: "#2B2F78" },
  mistrovska: { telo: "drevo", drevo: "#1F2D6E", lak: 1, kov: "zlato", nyty: "zlato", samet: "#9E1B3A" },
  legendarni: { telo: "zlato", kov: "email", email: "#5B2DB8", nyty: "zlato", samet: "#2A0F55" },
  krystalova: { telo: "krystal", kov: "ocel", nyty: "ocel", samet: "#1C5C86" },
};

const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ── geometrie: zaoblený kvádr z jemně dělené krychle + deformace ─────────────
type Deformace = (v: THREE.Vector3, n0: THREE.Vector3) => void;

/** Zaoblený kvádr; `posun` ho nejdřív posune (deformace pak dostává polohu v truhle). Normály se počítají po deformaci bez švů. */
function tvar(w: number, h: number, d: number, r: number, seg: [number, number, number], posun: THREE.Vector3 | null, def?: Deformace, ao?: (v: THREE.Vector3, n0: THREE.Vector3) => number): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d, seg[0], seg[1], seg[2]);
  const p = geo.attributes.position;
  const v = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r;
  const barvy = ao ? new Float32Array(p.count * 3) : null;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(cl(v.x, -ix, ix), cl(v.y, -iy, iy), cl(v.z, -iz, iz));
    n.subVectors(v, c); if (n.lengthSq() < 1e-12) n.set(0, 1, 0); n.normalize();
    v.copy(c).addScaledVector(n, r);
    if (posun) v.add(posun);
    def?.(v, n);
    if (barvy && ao) { const a = ao(v, n); barvy[i * 3] = barvy[i * 3 + 1] = barvy[i * 3 + 2] = a; }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  if (barvy) geo.setAttribute("color", new THREE.BufferAttribute(barvy, 3));
  // hladké normály přes hrany krychle: spočítat na sloučené kopii a přenést zpět
  const jen = new THREE.BufferGeometry(); jen.setAttribute("position", p.clone()); jen.setIndex(geo.index!.clone());
  const m = mergeVertices(jen, 1e-5); m.computeVertexNormals();
  const mapa = new Map<string, number>(); const mp = m.attributes.position, mn = m.attributes.normal;
  const klic = (x: number, y: number, z: number) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
  for (let i = 0; i < mp.count; i++) mapa.set(klic(mp.getX(i), mp.getY(i), mp.getZ(i)), i);
  const norm = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) { const j = mapa.get(klic(p.getX(i), p.getY(i), p.getZ(i))); if (j !== undefined) norm.setXYZ(i, mn.getX(j), mn.getY(j), mn.getZ(j)); }
  norm.needsUpdate = true; jen.dispose(); m.dispose();
  return geo;
}

function hexShape(R: number, rr: number): THREE.Shape {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + i * Math.PI / 3; pts.push(new THREE.Vector2(R * Math.cos(a), R * Math.sin(a))); }
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const p = pts[i], a1 = p.clone().lerp(pts[(i + 5) % 6], rr), a2 = p.clone().lerp(pts[(i + 1) % 6], rr);
    if (i === 0) s.moveTo(a1.x, a1.y); else s.lineTo(a1.x, a1.y);
    s.quadraticCurveTo(p.x, p.y, a2.x, a2.y);
  }
  s.closePath(); return s;
}

// ── textury ─────────────────────────────────────────────────────────────────
function texturaDreva(zaklad: string, prken: number, sklad: Sklad): { map: THREE.Texture; rough: THREE.Texture } {
  const W = 1024, H = 512;
  const c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d")!;
  const r = document.createElement("canvas"); r.width = W; r.height = H; const y = r.getContext("2d")!;
  const z = new THREE.Color(zaklad);
  let sem = 7; const rnd = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647; };
  const h = H / prken;
  y.fillStyle = "#8a8a8a"; y.fillRect(0, 0, W, H);
  for (let pr = 0; pr < prken; pr++) {
    const odst = z.clone().offsetHSL((rnd() - 0.5) * 0.015, (rnd() - 0.5) * 0.05, (rnd() - 0.5) * 0.06);
    x.fillStyle = "#" + odst.getHexString(); x.fillRect(0, pr * h, W, h);
    // jemná vlákna
    for (let k = 0; k < 140; k++) {
      const y0 = pr * h + rnd() * h, svet = rnd() > 0.5;
      x.strokeStyle = svet ? `rgba(255,236,210,${0.03 + rnd() * 0.05})` : `rgba(55,22,0,${0.04 + rnd() * 0.08})`;
      x.lineWidth = 0.6 + rnd() * 1.6; x.beginPath(); x.moveTo(0, y0);
      const f = 0.004 + rnd() * 0.006, a = 1 + rnd() * 3, fz = rnd() * 10;
      for (let i = 0; i <= W; i += 16) x.lineTo(i, y0 + Math.sin(i * f + fz) * a + Math.sin(i * f * 3.1 + fz) * a * 0.3);
      x.stroke();
    }
    // léta kolem suku
    const sx = 120 + rnd() * (W - 240), sy = pr * h + h * (0.35 + rnd() * 0.3);
    for (let k = 1; k < 9; k++) {
      x.strokeStyle = `rgba(60,24,0,${0.16 - k * 0.014})`; x.lineWidth = 1.4;
      x.beginPath(); x.ellipse(sx, sy, 8 + k * 10, 3 + k * 2.6, 0, 0, Math.PI * 2); x.stroke();
    }
    const gk = x.createRadialGradient(sx, sy, 1, sx, sy, 9); gk.addColorStop(0, "rgba(45,18,0,.6)"); gk.addColorStop(1, "rgba(45,18,0,0)");
    x.fillStyle = gk; x.beginPath(); x.ellipse(sx, sy, 10, 5, 0, 0, Math.PI * 2); x.fill();
    // okraje prkna tmavší (ošoupané)
    const go = x.createLinearGradient(0, pr * h, 0, (pr + 1) * h);
    go.addColorStop(0, "rgba(40,16,0,.28)"); go.addColorStop(0.08, "rgba(40,16,0,0)"); go.addColorStop(0.92, "rgba(40,16,0,0)"); go.addColorStop(1, "rgba(40,16,0,.32)");
    x.fillStyle = go; x.fillRect(0, pr * h, W, h);
    // drsnost: vlákna matnější
    for (let k = 0; k < 60; k++) { y.fillStyle = `rgba(${rnd() > 0.5 ? "255,255,255" : "0,0,0"},${0.05 + rnd() * 0.08})`; y.fillRect(0, pr * h + rnd() * h, W, 1 + rnd() * 2); }
  }
  const map = sklad.t(new THREE.CanvasTexture(c)); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8;
  const rough = sklad.t(new THREE.CanvasTexture(r)); rough.anisotropy = 8;
  return { map, rough };
}

/** Prošívaný samet: kosočtverce, tmavší švy a knoflíky v průsečících. */
function texturaPrositi(s: Sklad): THREE.Texture {
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d")!;
  x.fillStyle = "#FFFFFF"; x.fillRect(0, 0, 256, 256);
  const k = 64;
  for (let i = -4; i < 9; i++) for (let j = -4; j < 9; j++) {
    const cx = i * k + (j % 2 ? k / 2 : 0), cy = j * k / 2;
    const g = x.createRadialGradient(cx, cy, 2, cx, cy, k * 0.55); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,.22)");
    x.fillStyle = g; x.beginPath(); x.moveTo(cx, cy - k / 2); x.lineTo(cx + k / 2, cy); x.lineTo(cx, cy + k / 2); x.lineTo(cx - k / 2, cy); x.closePath(); x.fill();
  }
  x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = 2;
  for (let i = -8; i < 16; i++) { x.beginPath(); x.moveTo(i * k / 2, 0); x.lineTo(i * k / 2 + 256, 256); x.stroke(); x.beginPath(); x.moveTo(i * k / 2, 256); x.lineTo(i * k / 2 + 256, 0); x.stroke(); }
  for (let i = 0; i < 5; i++) for (let j = 0; j < 9; j++) { const cx = i * k + (j % 2 ? k / 2 : 0), cy = j * k / 2; x.fillStyle = "rgba(0,0,0,.45)"; x.beginPath(); x.arc(cx, cy, 5, 0, Math.PI * 2); x.fill(); x.fillStyle = "rgba(255,255,255,.5)"; x.beginPath(); x.arc(cx - 1.5, cy - 1.5, 2, 0, Math.PI * 2); x.fill(); }
  const t = s.t(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2.5, 2);
  return t;
}

// ── model ───────────────────────────────────────────────────────────────────
export interface ModelTruhly {
  root: THREE.Group;
  /** Pivot u země: na něm se dělá zmáčknutí. */
  pruzne: THREE.Group;
  /** Pant víka (otáčí se kolem osy x). */
  vikoCep: THREE.Group;
  kamen: THREE.Mesh;
  kamenMat: THREE.MeshPhysicalMaterial;
  sametMat: THREE.MeshPhysicalMaterial;
  skviraMat: THREE.MeshBasicMaterial;
  /** Výška horní hrany těla (odtud letí světlo a odměna). */
  H: number;
  D: number;
  W: number;
}

export function postavTruhlu(s: Sklad, druh: DruhModelu, barva: THREE.Color): ModelTruhly {
  const P = PALETY[druh];
  const W = 1.72, H = 0.92, D = 1.14, R = 0.17;
  const LH = 0.3, LA = 0.32, LR = 0.13; // výška boku víka a vyklenutí

  // tvar těla: vyboulené boky, nahoře o kousek širší
  const bulge = (yn: number) => (1 + 0.055 * Math.sin(Math.PI * cl(yn, 0, 1))) * (0.955 + 0.045 * cl(yn, 0, 1));
  const naTelo = (v: THREE.Vector3) => { const k = bulge(v.y / H); v.x *= k; v.z *= k; };
  const drazky = (yn: number) => { let g = 0; for (const b of [1 / 3, 2 / 3]) g += Math.exp(-(((yn - b) / 0.02) ** 2)); return g; };

  // ── materiály ──
  let teloMat: THREE.Material, vikoMat: THREE.Material;
  if (P.telo === "drevo") {
    const t = texturaDreva(P.drevo!, 3, s), tv = texturaDreva(P.drevo!, 4, s);
    const lakove = (P.lak ?? 0) > 0.7;
    const zakl = { roughness: lakove ? 0.45 : 0.58, clearcoat: P.lak ?? 0.4, clearcoatRoughness: lakove ? 0.18 : 0.32, sheen: lakove ? 0 : 0.18, sheenColor: new THREE.Color("#FFE6C8"), vertexColors: true, envMapIntensity: lakove ? 0.55 : 1 };
    teloMat = s.m(new THREE.MeshPhysicalMaterial({ ...zakl, map: t.map, roughnessMap: t.rough }));
    vikoMat = s.m(new THREE.MeshPhysicalMaterial({ ...zakl, map: tv.map, roughnessMap: tv.rough }));
  } else if (P.telo === "zlato") {
    teloMat = vikoMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#FFC24A", metalness: 1, roughness: 0.26, clearcoat: 0.5, clearcoatRoughness: 0.15, vertexColors: true, envMapIntensity: 1.5 }));
  } else {
    teloMat = vikoMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#9BE6FF", metalness: 0, roughness: 0.06, clearcoat: 1, transparent: true, opacity: 0.88, iridescence: 1, iridescenceIOR: 1.45, emissive: "#1E7FA8", emissiveIntensity: 0.22, vertexColors: true }));
  }
  const kovMat = P.kov === "zlato"
    ? s.m(new THREE.MeshPhysicalMaterial({ color: "#FFC24A", metalness: 1, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.12, envMapIntensity: 1.9 }))
    : P.kov === "email"
      ? s.m(new THREE.MeshPhysicalMaterial({ color: P.email, metalness: 0.15, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.3 }))
      : s.m(new THREE.MeshPhysicalMaterial({ color: "#D3DBE6", metalness: 1, roughness: 0.28, clearcoat: 0.4, envMapIntensity: 2.0 }));
  const nytMat = P.nyty === "zlato" ? s.m(new THREE.MeshPhysicalMaterial({ color: "#FFD36A", metalness: 1, roughness: 0.18, clearcoat: 0.8, envMapIntensity: 2 })) : s.m(new THREE.MeshPhysicalMaterial({ color: "#E3E9F2", metalness: 1, roughness: 0.22, envMapIntensity: 2 }));
  const sametMat = s.m(new THREE.MeshPhysicalMaterial({ map: texturaPrositi(s), color: P.samet, roughness: 0.92, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color(P.samet).lerp(new THREE.Color("#FFFFFF"), 0.3), emissive: barva, emissiveIntensity: 0 }));

  const root = new THREE.Group();
  const pruzne = new THREE.Group(); root.add(pruzne);

  // ── tělo s drážkami mezi prkny a tmavšími spárami (vertex AO) ──
  const teloGeo = s.g(tvar(W, H, D, R, [28, 54, 22], new THREE.Vector3(0, H / 2, 0),
    (v, n0) => {
      const yn = v.y / H; naTelo(v);
      if (Math.abs(n0.y) < 0.6 && P.telo !== "krystal") { const g = drazky(yn) * 0.016; const nh = new THREE.Vector3(n0.x, 0, n0.z).normalize(); v.addScaledVector(nh, -g); }
    },
    (v, n0) => { const yn = v.y / H; let a = 1 - drazky(yn) * (Math.abs(n0.y) < 0.6 ? 0.55 : 0); a *= 0.72 + 0.28 * cl(yn * 3, 0, 1); return a; }));
  // UV: prkna na všech bocích vodorovně (u = obvod, v = výška)
  { const p = teloGeo.attributes.position, uv = teloGeo.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); uv.setXY(i, (Math.atan2(z, x) / (Math.PI * 2) + 0.5) * 3, p.getY(i) / H); } uv.needsUpdate = true; }
  pruzne.add(new THREE.Mesh(teloGeo, teloMat));

  // výstelka (samet) – baculatý polštář nahoře uvnitř obruby
  const polstar = new THREE.Mesh(s.g(tvar(W - 0.26, 0.1, D - 0.26, 0.05, [10, 3, 8], new THREE.Vector3(0, H - 0.02, 0), (v) => { const xn = v.x / ((W - 0.26) / 2), zn = v.z / ((D - 0.26) / 2); if (v.y > H - 0.02) v.y += 0.035 * Math.cos(cl(xn, -1, 1) * Math.PI / 2) * Math.cos(cl(zn, -1, 1) * Math.PI / 2); })), sametMat);
  pruzne.add(polstar);
  const skviraMat = s.m(new THREE.MeshBasicMaterial({ color: barva, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const skvira = new THREE.Mesh(s.g(tvar(W + 0.04, 0.03, D + 0.04, 0.012, [6, 1, 6], new THREE.Vector3(0, H + 0.01, 0))), skviraMat); pruzne.add(skvira);

  // ── kování těla ──
  // obruby nahoře a dole
  for (const [yy, vy] of [[0.07, 0.11], [H - 0.04, 0.09]] as const) {
    pruzne.add(new THREE.Mesh(s.g(tvar(W + 0.04, vy, D + 0.04, 0.04, [24, 3, 16], new THREE.Vector3(0, yy, 0), (v) => naTelo(v))), kovMat));
  }
  // svislé pásy a rohy
  const pasX = W * 0.27;
  for (const sx of [-1, 1]) {
    pruzne.add(new THREE.Mesh(s.g(tvar(0.16, H - 0.06, D + 0.035, 0.035, [3, 30, 16], new THREE.Vector3(sx * pasX, H / 2, 0), (v) => naTelo(v))), kovMat));
    for (const sz of [-1, 1]) for (const [yy, vh] of [[0.17, 0.34], [H - 0.15, 0.3]] as const) {
      pruzne.add(new THREE.Mesh(s.g(tvar(0.25, vh, 0.25, 0.08, [6, 10, 6], new THREE.Vector3(sx * (W / 2 - 0.09), yy, sz * (D / 2 - 0.09)), (v) => naTelo(v))), kovMat));
    }
  }
  // nýty (polokoule) – na pásech zepředu i zezadu, na rozích
  const nytGeo = s.g(new THREE.SphereGeometry(0.042, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)); nytGeo.rotateX(Math.PI / 2);
  const nyt = (x: number, y: number, zStrana: number) => {
    const k = bulge(y / H); const m = new THREE.Mesh(nytGeo, nytMat);
    m.position.set(x * k, y, zStrana * (D / 2 + 0.018) * k); if (zStrana < 0) m.rotation.y = Math.PI; pruzne.add(m);
  };
  for (const sx of [-1, 1]) for (const yy of [0.24, 0.46, 0.68]) { nyt(sx * pasX, yy * H, 1); nyt(sx * pasX, yy * H, -1); }
  for (const sx of [-1, 1]) for (const yy of [0.19, 0.84]) nyt(sx * (W / 2 - 0.04), yy * H, 1);
  // nožičky
  const nozka = s.g(new THREE.SphereGeometry(0.1, 20, 12));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const f = new THREE.Mesh(nozka, nytMat); f.scale.set(1.15, 0.55, 1.15); f.position.set(sx * (W / 2 - 0.13), 0.01, sz * (D / 2 - 0.12)); pruzne.add(f); }

  // ── víko: klenuté, prkna podél šířky, přesah přes tělo ──
  const vikoCep = new THREE.Group(); vikoCep.position.set(0, H + 0.005, -D / 2 - 0.02); pruzne.add(vikoCep);
  const viko = new THREE.Group(); viko.position.z = D / 2 + 0.02; vikoCep.add(viko);
  const VW = W + 0.07, VD = D + 0.07;
  const klenba = (v: THREE.Vector3, vd: number, lh: number) => { const zn = cl(v.z / (vd / 2), -1, 1); const yn = cl(v.y / lh, 0, 1); v.y += yn * LA * Math.cos(zn * Math.PI / 2); };
  const vikoDrazky = (zn: number) => { let g = 0; for (const b of [-0.5, 0, 0.5]) g += Math.exp(-(((zn - b) / 0.035) ** 2)); return g; };
  const vikoGeo = s.g(tvar(VW, LH, VD, LR, [28, 10, 40], new THREE.Vector3(0, LH / 2, 0),
    (v, n0) => { const zn = cl(v.z / (VD / 2), -1, 1); klenba(v, VD, LH); if (n0.y > 0.5 && P.telo !== "krystal") v.y -= vikoDrazky(zn) * 0.016; },
    (v, n0) => { const zn = cl(v.z / (VD / 2), -1, 1); return 1 - (n0.y > 0.5 ? vikoDrazky(zn) * 0.55 : 0) - (n0.y < -0.5 ? 0.35 : 0); }));
  { const p = vikoGeo.attributes.position, uv = vikoGeo.attributes.uv; for (let i = 0; i < p.count; i++) { uv.setXY(i, (p.getX(i) / VW + 0.5) * 1.6, cl(p.getZ(i) / (VD / 2), -1, 1) * 0.5 + 0.5); } uv.needsUpdate = true; }
  viko.add(new THREE.Mesh(vikoGeo, vikoMat));
  // spodek víka: samet (po otevření je vidět)
  const podViko = new THREE.Mesh(s.g(tvar(VW - 0.2, 0.03, VD - 0.2, 0.012, [6, 1, 6], new THREE.Vector3(0, -0.005, 0))), sametMat); viko.add(podViko);
  // pásy na víku + přední lem
  for (const sx of [-1, 1]) {
    viko.add(new THREE.Mesh(s.g(tvar(0.17, LH + 0.03, VD + 0.035, 0.04, [3, 8, 40], new THREE.Vector3(sx * pasX, (LH + 0.03) / 2 - 0.01, 0), (v) => klenba(v, VD + 0.035, LH + 0.03))), kovMat));
    viko.add(new THREE.Mesh(s.g(tvar(0.1, LH + 0.02, VD + 0.025, 0.04, [3, 8, 40], new THREE.Vector3(sx * (VW / 2 - 0.17), (LH + 0.02) / 2 - 0.008, 0), (v) => klenba(v, VD + 0.025, LH + 0.02))), kovMat));
  }
  viko.add(new THREE.Mesh(s.g(tvar(VW + 0.03, 0.08, 0.09, 0.035, [20, 2, 2], new THREE.Vector3(0, 0.03, VD / 2 - 0.01))), kovMat));
  // nýty na víku (na vrcholu pásů)
  for (const sx of [-1, 1]) for (const zn of [-0.55, 0, 0.55]) {
    const m = new THREE.Mesh(nytGeo, nytMat); const z = zn * (VD / 2);
    const y = LH + 0.02 + LA * Math.cos(zn * Math.PI / 2);
    m.position.set(sx * pasX, y, z); m.lookAt(sx * pasX, y + Math.cos(zn * Math.PI / 2), z + Math.sin(zn * Math.PI / 2) * 1.2); m.rotateX(0); viko.add(m);
  }
  // panty vzadu
  for (const sx of [-1, 1]) { const pt = new THREE.Mesh(s.g(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 16)), kovMat); pt.rotation.z = Math.PI / 2; pt.position.set(sx * W * 0.3, H + 0.01, -D / 2 - 0.03); pruzne.add(pt); }

  // ── zámek: šestiúhelník s broušeným drahokamem ──
  const zamek = new THREE.Group(); const kz = bulge(1) * (D / 2) + 0.02; zamek.position.set(0, H - 0.03, kz); pruzne.add(zamek);
  const zlatoZamek = P.kov === "ocel" ? kovMat : (P.kov === "email" ? nytMat : kovMat);
  const deska = new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(hexShape(0.3, 0.24), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 5, curveSegments: 8 })), zlatoZamek);
  zamek.add(deska);
  const lem = new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(hexShape(0.205, 0.24), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 8 })), s.m(new THREE.MeshPhysicalMaterial({ color: "#14193A", roughness: 0.35, clearcoat: 1 })));
  lem.position.z = 0.07; zamek.add(lem);
  // drahokam: šestiboký brus (tabulka, koruna, rondista, pavilon)
  const profil = [new THREE.Vector2(0, -0.08), new THREE.Vector2(0.165, 0.0), new THREE.Vector2(0.165, 0.014), new THREE.Vector2(0.1, 0.07), new THREE.Vector2(0, 0.075)];
  const kamenGeo = s.g(new THREE.LatheGeometry(profil, 6)); kamenGeo.rotateX(Math.PI / 2); kamenGeo.rotateZ(Math.PI / 6);
  const kamenMat = s.m(new THREE.MeshPhysicalMaterial({ color: barva, roughness: 0.02, metalness: 0.05, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.8, emissive: barva, emissiveIntensity: 0.45, flatShading: true }));
  const kamen = new THREE.Mesh(kamenGeo, kamenMat); kamen.position.z = 0.1; zamek.add(kamen);
  // klíčová dírka pod zámkem
  const dirka = new THREE.Mesh(s.g(new THREE.CircleGeometry(0.022, 16)), s.m(new THREE.MeshBasicMaterial({ color: "#0B0E20" })));
  dirka.position.set(0, -0.31, kz - 0.005 + 0.022); dirka.position.y = 0; zamek.add(dirka); dirka.visible = false;

  return { root, pruzne, vikoCep, kamen, kamenMat, sametMat, skviraMat, H, D, W };
}
