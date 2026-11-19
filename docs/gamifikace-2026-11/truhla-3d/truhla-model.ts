/**
 * MOCKUP v2: model truhly ve stejném „hračkovém“ jazyce jako Hexík.
 * - baculaté tělo (vyboulené boky, nahoře o kousek širší), všechny hrany měkce zaoblené
 * - prkna jako skutečné drážky v geometrii (ne čáry v textuře), kresba dřeva a lak
 * - kování kopíruje tvar těla, polokulové nýty, nožičky, panty
 * - zámek: šestiúhelník (Hexík) s broušeným šestiúhelníkovým drahokamem v barvě vzácnosti
 * - dutá: uvnitř dřevěné stěny, prošívané sametové dno s knoflíky; ve víku medailon se znakem MateMax (M²)
 * - 9 druhů, každý s jedním prvkem podle toho, za co truhla je (záložka, tabule, sníh, krystaly, ucha, 5 hvězd)
 */
import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Sklad } from "../../../src/lib/hexik3d/doplnky";

export type DruhModelu = "denni" | "doporuceni" | "generalka" | "legendarni" | "sezonni" | "krystalova" | "velka" | "mistrovska" | "zlata";

/** Jeden unikátní prvek podle toho, za co truhla je (ne zdobení navíc). */
type Prvek = "zalozka" | "tabule" | "snih" | "krystaly" | "ucha" | "hvezdy";
interface Paleta {
  telo: "drevo" | "zlato" | "krystal";
  drevo?: string;
  lak?: number;
  kov: "ocel" | "zlato" | "email" | "bronz";
  email?: string;
  nyty: "ocel" | "zlato";
  samet: string;
  prvek?: Prvek;
  meritko?: number;
}
export const PALETY: Record<DruhModelu, Paleta> = {
  denni: { telo: "drevo", drevo: "#C27A3E", lak: 0.45, kov: "ocel", nyty: "ocel", samet: "#2B2F78" },
  doporuceni: { telo: "drevo", drevo: "#2B8455", lak: 1, kov: "bronz", nyty: "zlato", samet: "#0E4A36", prvek: "zalozka" },
  generalka: { telo: "drevo", drevo: "#1E2A55", lak: 1, kov: "ocel", nyty: "ocel", samet: "#16483B", prvek: "tabule" },
  legendarni: { telo: "zlato", kov: "email", email: "#5B2DB8", nyty: "zlato", samet: "#2A0F55" },
  sezonni: { telo: "drevo", drevo: "#5E8CC4", lak: 0.5, kov: "ocel", nyty: "ocel", samet: "#22417E", prvek: "snih" },
  krystalova: { telo: "krystal", kov: "ocel", nyty: "ocel", samet: "#1C5C86", prvek: "krystaly" },
  velka: { telo: "drevo", drevo: "#4A36A0", lak: 1, kov: "zlato", nyty: "zlato", samet: "#24135E", prvek: "ucha", meritko: 1.16 },
  mistrovska: { telo: "drevo", drevo: "#1F2D6E", lak: 1, kov: "zlato", nyty: "zlato", samet: "#9E1B3A" },
  zlata: { telo: "zlato", kov: "email", email: "#22307A", nyty: "zlato", samet: "#1A2466", prvek: "hvezdy" },
};

const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// ── geometrie: zaoblený kvádr z jemně dělené krychle + deformace ─────────────
type Deformace = (v: THREE.Vector3, n0: THREE.Vector3) => void;

/** Zaoblený kvádr; `posun` ho nejdřív posune (deformace pak dostává polohu v truhle). Normály se počítají po deformaci bez švů. */
function tvar(w: number, h: number, d: number, r: number, seg: [number, number, number], posun: THREE.Vector3 | null, def?: Deformace, ao?: (v: THREE.Vector3, n0: THREE.Vector3) => number, vyrez?: (n0: THREE.Vector3) => boolean): THREE.BufferGeometry {
  const geo = new THREE.BoxGeometry(w, h, d, seg[0], seg[1], seg[2]);
  const p = geo.attributes.position;
  const v = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  const ix = w / 2 - r, iy = h / 2 - r, iz = d / 2 - r;
  const barvy = ao ? new Float32Array(p.count * 3) : null;
  const ven = vyrez ? new Uint8Array(p.count) : null;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(cl(v.x, -ix, ix), cl(v.y, -iy, iy), cl(v.z, -iz, iz));
    n.subVectors(v, c); if (n.lengthSq() < 1e-12) n.set(0, 1, 0); n.normalize();
    v.copy(c).addScaledVector(n, r);
    if (ven && vyrez) ven[i] = vyrez(n) ? 1 : 0;
    if (posun) v.add(posun);
    def?.(v, n);
    if (barvy && ao) { const a = ao(v, n); barvy[i * 3] = barvy[i * 3 + 1] = barvy[i * 3 + 2] = a; }
    p.setXYZ(i, v.x, v.y, v.z);
  }
  if (barvy) geo.setAttribute("color", new THREE.BufferAttribute(barvy, 3));
  if (ven) {
    const idx = geo.index!.array, zbyle: number[] = [];
    for (let i = 0; i < idx.length; i += 3) if (!(ven[idx[i]] && ven[idx[i + 1]] && ven[idx[i + 2]])) zbyle.push(idx[i], idx[i + 1], idx[i + 2]);
    geo.setIndex(zbyle);
  }
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

/** Prošívaný polštář jako skutečná geometrie: kosočtverečné boule, švy a místa pro knoflíky. `dolu` = obrácený (spodek víka). */
function prosivany(s: Sklad, w: number, d: number, vyska: number, bunka: number, dolu: boolean, stredVolny = 0): { geo: THREE.BufferGeometry; knofliky: THREE.Vector3[] } {
  const geo = new THREE.PlaneGeometry(w, d, Math.round(w * 60), Math.round(d * 60)); geo.rotateX(dolu ? Math.PI / 2 : -Math.PI / 2);
  const p = geo.attributes.position, k = Math.SQRT1_2;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const a = (x + z) * k, b = (x - z) * k;
    let h = (0.5 - 0.5 * Math.cos((2 * Math.PI * a) / bunka)) * (0.5 - 0.5 * Math.cos((2 * Math.PI * b) / bunka));
    h = Math.pow(h, 0.6);
    const okraj = Math.min(w / 2 - Math.abs(x), d / 2 - Math.abs(z));
    const e = cl(okraj / 0.07, 0, 1); const ee = e * e * (3 - 2 * e);
    let y = vyska * h * ee - (1 - ee) * vyska * 0.5;
    if (stredVolny > 0) { const r = Math.hypot(x, z); const f = cl((r - stredVolny) / 0.08, 0, 1); y = y * f + vyska * 0.35 * (1 - f); }
    p.setY(i, dolu ? -y : y);
  }
  geo.computeVertexNormals(); s.g(geo);
  const knofliky: THREE.Vector3[] = [];
  const n = Math.ceil(Math.max(w, d) / bunka) + 2;
  for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
    const a = i * bunka, b = j * bunka, x = (a + b) * k, z = (a - b) * k;
    if (Math.abs(x) < w / 2 - 0.06 && Math.abs(z) < d / 2 - 0.06 && (stredVolny === 0 || Math.hypot(x, z) > stredVolny + 0.06)) knofliky.push(new THREE.Vector3(x, 0, z));
  }
  return { geo, knofliky };
}

/** Znak MateMax: tmavý zaoblený čtverec s bílým M² (podle logo_pravidlo). */
function texturaM2(s: Sklad): THREE.Texture {
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d")!;
  x.fillStyle = "#0D1B3E"; x.beginPath(); x.roundRect(28, 28, 200, 200, 46); x.fill();
  const g = x.createLinearGradient(0, 28, 0, 228); g.addColorStop(0, "rgba(255,255,255,.10)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.beginPath(); x.roundRect(28, 28, 200, 200, 46); x.fill();
  x.fillStyle = "#FFFFFF"; x.textBaseline = "alphabetic";
  x.font = "900 128px 'DM Sans', system-ui, sans-serif"; x.textAlign = "right"; x.fillText("M", 168, 176);
  x.font = "900 64px 'DM Sans', system-ui, sans-serif"; x.textAlign = "left"; x.fillText("2", 170, 112);
  const t = s.t(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

/** Tabule na víku Generálky: křídou psané vzorce z přijímaček. */
function texturaTabule(s: Sklad): THREE.Texture {
  const c = document.createElement("canvas"); c.width = 512; c.height = 640; const x = c.getContext("2d")!;
  x.fillStyle = "#1F3D34"; x.fillRect(0, 0, 512, 640);
  let sem = 3; const rnd = () => { sem = (sem * 16807) % 2147483647; return sem / 2147483647; };
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${0.015 + rnd() * 0.03})`; x.beginPath(); x.ellipse(rnd() * 512, rnd() * 640, 30 + rnd() * 90, 8 + rnd() * 30, rnd() * 3, 0, Math.PI * 2); x.fill(); }
  x.fillStyle = "rgba(245,245,235,.92)"; x.textAlign = "center";
  const r = (txt: string, y: number, vel: number, rot = 0) => { x.save(); x.translate(256, y); x.rotate(rot); x.font = `700 ${vel}px 'Comic Sans MS', 'Segoe Print', 'DM Sans', sans-serif`; x.fillText(txt, 0, 0); x.restore(); };
  r("a² + b² = c²", 110, 54, -0.03); r("2x + 3 = 11", 220, 50, 0.02); r("x = 4", 300, 44, -0.02); r("√49 = 7", 400, 50, 0.03); r("π ≈ 3,14", 500, 48, -0.02);
  x.strokeStyle = "rgba(245,245,235,.85)"; x.lineWidth = 4; x.beginPath(); x.moveTo(60, 600); x.lineTo(160, 600); x.lineTo(60, 540); x.closePath(); x.stroke();
  x.beginPath(); x.arc(420, 575, 34, 0, Math.PI * 2); x.stroke();
  const t = s.t(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

function hvezdaShape(r1: number, r2: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? r2 : r1, a = Math.PI / 2 + (i * Math.PI) / 5; if (i === 0) s.moveTo(r * Math.cos(a), r * Math.sin(a)); else s.lineTo(r * Math.cos(a), r * Math.sin(a)); }
  s.closePath(); return s;
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
  /** Výška sametového dna uvnitř (tam svítí záře). */
  dnoY: number;
  D: number;
  W: number;
  /** Co se má hýbat samo (sníh, krystaly). */
  krok?: (cas: number) => void;
}

export function postavTruhlu(s: Sklad, druh: DruhModelu, barva: THREE.Color): ModelTruhly {
  const P = PALETY[druh];
  const W = 1.72, H = 0.92, D = 1.14, R = 0.17;
  const LH = 0.3, LA = 0.32, LR = 0.13; // výška boku víka, vyklenutí, zaoblení
  const HLOUBKA = 0.27; // jak hluboko je sametové dno pod horní hranou
  const dnoY = H - HLOUBKA;

  const bulge = (yn: number) => (1 + 0.055 * Math.sin(Math.PI * cl(yn, 0, 1))) * (0.955 + 0.045 * cl(yn, 0, 1));
  const naTelo = (v: THREE.Vector3) => { const k = bulge(v.y / H); v.x *= k; v.z *= k; };
  const drazky = (yn: number) => { let g = 0; for (const b of [1 / 3, 2 / 3]) g += Math.exp(-(((yn - b) / 0.02) ** 2)); return g; };
  const vrch = (n0: THREE.Vector3) => n0.y > 0.999;
  const vrchDno = (n0: THREE.Vector3) => Math.abs(n0.y) > 0.999;

  // ── materiály ──
  let teloMat: THREE.Material, vikoMat: THREE.Material, vnitrMat: THREE.Material;
  if (P.telo === "drevo") {
    const t = texturaDreva(P.drevo!, 3, s), tv = texturaDreva(P.drevo!, 4, s);
    const lakove = (P.lak ?? 0) > 0.7;
    const zakl = { roughness: lakove ? 0.45 : 0.58, clearcoat: P.lak ?? 0.4, clearcoatRoughness: lakove ? 0.18 : 0.32, sheen: lakove ? 0 : 0.18, sheenColor: new THREE.Color("#FFE6C8"), vertexColors: true, envMapIntensity: lakove ? 0.55 : 1 };
    teloMat = s.m(new THREE.MeshPhysicalMaterial({ ...zakl, map: t.map, roughnessMap: t.rough }));
    vikoMat = s.m(new THREE.MeshPhysicalMaterial({ ...zakl, map: tv.map, roughnessMap: tv.rough }));
    // vnitřní stěny: stejné dřevo, tmavší a matné (nelakované)
    const ti = texturaDreva(new THREE.Color(P.drevo!).multiplyScalar(0.62).getStyle(), 3, s);
    vnitrMat = s.m(new THREE.MeshPhysicalMaterial({ map: ti.map, roughness: 0.85, side: THREE.BackSide, vertexColors: true, envMapIntensity: 0.5 }));
  } else if (P.telo === "zlato") {
    teloMat = vikoMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#FFC24A", metalness: 1, roughness: 0.26, clearcoat: 0.5, clearcoatRoughness: 0.15, vertexColors: true, envMapIntensity: 1.5 }));
    vnitrMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#A87A1E", metalness: 1, roughness: 0.4, side: THREE.BackSide, vertexColors: true, envMapIntensity: 0.9 }));
  } else {
    teloMat = vikoMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#9BE6FF", metalness: 0, roughness: 0.06, clearcoat: 1, transparent: true, opacity: 0.88, iridescence: 1, iridescenceIOR: 1.45, emissive: "#1E7FA8", emissiveIntensity: 0.22, vertexColors: true }));
    vnitrMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#5FB8DA", roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.9, side: THREE.BackSide, vertexColors: true, emissive: "#1E7FA8", emissiveIntensity: 0.2 }));
  }
  const kovMat = P.kov === "zlato"
    ? s.m(new THREE.MeshPhysicalMaterial({ color: "#FFC24A", metalness: 1, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.12, envMapIntensity: 1.9 }))
    : P.kov === "email"
      ? s.m(new THREE.MeshPhysicalMaterial({ color: P.email, metalness: 0.15, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: 0.3 }))
      : P.kov === "bronz"
        ? s.m(new THREE.MeshPhysicalMaterial({ color: "#D99A5E", metalness: 1, roughness: 0.3, clearcoat: 0.5, envMapIntensity: 1.9 }))
        : s.m(new THREE.MeshPhysicalMaterial({ color: "#D3DBE6", metalness: 1, roughness: 0.28, clearcoat: 0.4, envMapIntensity: 2.0 }));
  const nytMat = P.nyty === "zlato" ? s.m(new THREE.MeshPhysicalMaterial({ color: "#FFD36A", metalness: 1, roughness: 0.18, clearcoat: 0.8, envMapIntensity: 2 })) : s.m(new THREE.MeshPhysicalMaterial({ color: "#E3E9F2", metalness: 1, roughness: 0.22, envMapIntensity: 2 }));
  const sametMat = s.m(new THREE.MeshPhysicalMaterial({ color: P.samet, roughness: 0.95, sheen: 1, sheenRoughness: 0.38, sheenColor: new THREE.Color(P.samet).lerp(new THREE.Color("#FFFFFF"), 0.35), emissive: barva, emissiveIntensity: 0 }));
  const zlatoMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#FFC24A", metalness: 1, roughness: 0.2, clearcoat: 0.7, envMapIntensity: 2 }));

  const root = new THREE.Group(); if (P.meritko) root.scale.setScalar(P.meritko);
  const pruzne = new THREE.Group(); root.add(pruzne);
  const animace: ((cas: number) => void)[] = [];

  // ── tělo: duté (bez horní plochy), drážky mezi prkny, tmavší spáry ──
  const teloGeo = s.g(tvar(W, H, D, R, [28, 54, 22], new THREE.Vector3(0, H / 2, 0),
    (v, n0) => {
      const yn = v.y / H; naTelo(v);
      if (Math.abs(n0.y) < 0.6 && P.telo !== "krystal") { const g = drazky(yn) * 0.016; const nh = new THREE.Vector3(n0.x, 0, n0.z).normalize(); v.addScaledVector(nh, -g); }
    },
    (v, n0) => { const yn = v.y / H; let a = 1 - drazky(yn) * (Math.abs(n0.y) < 0.6 ? 0.55 : 0); a *= 0.72 + 0.28 * cl(yn * 3, 0, 1); return a; },
    vrch));
  { const p = teloGeo.attributes.position, uv = teloGeo.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); uv.setXY(i, (Math.atan2(z, x) / (Math.PI * 2) + 0.5) * 3, p.getY(i) / H); } uv.needsUpdate = true; }
  pruzne.add(new THREE.Mesh(teloGeo, teloMat));

  // vnitřní stěny (vidíme je zevnitř), dole tmavší – stín v hloubce
  const Wi = W - 2 * R, Di = D - 2 * R, Hi = HLOUBKA + 0.06;
  const vnitrGeo = s.g(tvar(Wi, Hi, Di, 0.05, [14, 8, 10], new THREE.Vector3(0, H - Hi / 2, 0), undefined,
    (v) => 0.35 + 0.65 * cl((v.y - (H - Hi)) / Hi, 0, 1) ** 1.4, vrch));
  { const p = vnitrGeo.attributes.position, uv = vnitrGeo.attributes.uv; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); uv.setXY(i, (Math.atan2(z, x) / (Math.PI * 2) + 0.5) * 2.4, (p.getY(i) - (H - Hi)) / H * 1.5); } uv.needsUpdate = true; }
  pruzne.add(new THREE.Mesh(vnitrGeo, vnitrMat));

  // sametové dno: prošívaný polštář s knoflíky
  const dno = prosivany(s, Wi - 0.03, Di - 0.03, 0.055, 0.24, false);
  const dnoMesh = new THREE.Mesh(dno.geo, sametMat); dnoMesh.position.y = dnoY; pruzne.add(dnoMesh);
  const knofGeo = s.g(new THREE.SphereGeometry(0.022, 14, 8));
  const knofMat = P.nyty === "zlato" ? zlatoMat : sametMat;
  for (const k of dno.knofliky) { const b = new THREE.Mesh(knofGeo, knofMat); b.scale.y = 0.6; b.position.set(k.x, dnoY + 0.004, k.z); pruzne.add(b); }

  const skviraMat = s.m(new THREE.MeshBasicMaterial({ color: barva, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const skvira = new THREE.Mesh(s.g(tvar(W + 0.04, 0.03, D + 0.04, 0.012, [6, 1, 6], new THREE.Vector3(0, H + 0.01, 0), undefined, undefined, vrchDno)), skviraMat); pruzne.add(skvira);

  // ── kování těla ──
  pruzne.add(new THREE.Mesh(s.g(tvar(W + 0.04, 0.11, D + 0.04, 0.04, [24, 3, 16], new THREE.Vector3(0, 0.07, 0), (v) => naTelo(v))), kovMat));
  pruzne.add(new THREE.Mesh(s.g(tvar(W + 0.04, 0.09, D + 0.04, 0.04, [24, 3, 16], new THREE.Vector3(0, H - 0.04, 0), (v) => naTelo(v), undefined, vrchDno)), kovMat));
  const pasX = W * 0.27;
  for (const sx of [-1, 1]) {
    // pásy zepředu a zezadu (neprochází dutinou)
    const vnejsi = D / 2 + 0.0175, vnitrni = (D - 2 * R) / 2 + 0.012, hl = vnejsi - vnitrni;
    for (const sz of [-1, 1]) pruzne.add(new THREE.Mesh(s.g(tvar(0.16, H - 0.06, hl, 0.035, [3, 30, 4], new THREE.Vector3(sx * pasX, H / 2, sz * (vnitrni + hl / 2)), (v) => naTelo(v))), kovMat));
    for (const sz of [-1, 1]) for (const [yy, vh] of [[0.17, 0.34], [H - 0.15, 0.3]] as const) {
      pruzne.add(new THREE.Mesh(s.g(tvar(0.2, vh, 0.2, 0.07, [6, 10, 6], new THREE.Vector3(sx * (W / 2 - 0.075), yy, sz * (D / 2 - 0.075)), (v) => naTelo(v))), kovMat));
    }
  }
  const nytGeo = s.g(new THREE.SphereGeometry(0.042, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)); nytGeo.rotateX(Math.PI / 2);
  const nyt = (x: number, y: number, zStrana: number) => {
    const k = bulge(y / H); const m = new THREE.Mesh(nytGeo, nytMat);
    m.position.set(x * k, y, zStrana * (D / 2 + 0.018) * k); if (zStrana < 0) m.rotation.y = Math.PI; pruzne.add(m);
  };
  for (const sx of [-1, 1]) for (const yy of [0.24, 0.46, 0.68]) { nyt(sx * pasX, yy * H, 1); nyt(sx * pasX, yy * H, -1); }
  for (const sx of [-1, 1]) for (const yy of [0.19, 0.84]) nyt(sx * (W / 2 - 0.04), yy * H, 1);
  const nozka = s.g(new THREE.SphereGeometry(0.1, 20, 12));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const f = new THREE.Mesh(nozka, nytMat); f.scale.set(1.15, 0.55, 1.15); f.position.set(sx * (W / 2 - 0.13), 0.01, sz * (D / 2 - 0.12)); pruzne.add(f); }

  // ── víko ──
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
  // spodek víka: prošívaný samet a uprostřed medailon se znakem MateMax (vidět jen po otevření)
  const podW = VW - 0.34, podD = VD - 0.34;
  const pod = prosivany(s, podW, podD, 0.045, 0.22, true, 0.2);
  const podMesh = new THREE.Mesh(pod.geo, sametMat); podMesh.position.y = -0.006; viko.add(podMesh);
  for (const k of pod.knofliky) { const b = new THREE.Mesh(knofGeo, knofMat); b.scale.y = 0.6; b.position.set(k.x, -0.01, k.z); viko.add(b); }
  const medailon = new THREE.Group(); medailon.position.set(0, -0.02, 0); medailon.rotation.x = Math.PI / 2; viko.add(medailon);
  medailon.add(new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(hexShape(0.2, 0.24), { depth: 0.025, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.018, bevelSegments: 4, curveSegments: 8 })), zlatoMat));
  { const hs = hexShape(0.155, 0.24); const g = s.g(new THREE.ShapeGeometry(hs, 8)); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.31 + 0.5, uv.getY(i) / 0.31 + 0.5);
    const m = new THREE.Mesh(g, s.m(new THREE.MeshPhysicalMaterial({ map: texturaM2(s), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08 }))); m.position.z = 0.046; medailon.add(m); }
  // pásy na víku + přední lem
  for (const sx of [-1, 1]) {
    viko.add(new THREE.Mesh(s.g(tvar(0.17, LH + 0.03, VD + 0.035, 0.04, [3, 8, 40], new THREE.Vector3(sx * pasX, (LH + 0.03) / 2 - 0.01, 0), (v) => klenba(v, VD + 0.035, LH + 0.03))), kovMat));
    viko.add(new THREE.Mesh(s.g(tvar(0.1, LH + 0.02, VD + 0.025, 0.04, [3, 8, 40], new THREE.Vector3(sx * (VW / 2 - 0.17), (LH + 0.02) / 2 - 0.008, 0), (v) => klenba(v, VD + 0.025, LH + 0.02))), kovMat));
  }
  viko.add(new THREE.Mesh(s.g(tvar(VW + 0.03, 0.08, 0.09, 0.035, [20, 2, 2], new THREE.Vector3(0, 0.03, VD / 2 - 0.01))), kovMat));
  for (const sx of [-1, 1]) for (const zn of [-0.55, 0, 0.55]) {
    const m = new THREE.Mesh(nytGeo, nytMat); const z = zn * (VD / 2);
    const y = LH + 0.02 + LA * Math.cos(zn * Math.PI / 2);
    m.position.set(sx * pasX, y, z); m.lookAt(sx * pasX, y + Math.cos(zn * Math.PI / 2), z + Math.sin(zn * Math.PI / 2) * 1.2); viko.add(m);
  }
  for (const sx of [-1, 1]) { const pt = new THREE.Mesh(s.g(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 16)), kovMat); pt.rotation.z = Math.PI / 2; pt.position.set(sx * W * 0.3, H + 0.01, -D / 2 - 0.03); pruzne.add(pt); }

  // ── zámek ──
  const zamek = new THREE.Group(); const kz = bulge(1) * (D / 2) + 0.02; zamek.position.set(0, H - 0.03, kz); pruzne.add(zamek);
  const zlatoZamek = P.kov === "email" ? nytMat : kovMat;
  zamek.add(new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(hexShape(0.3, 0.24), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 5, curveSegments: 8 })), zlatoZamek));
  const lem = new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(hexShape(0.205, 0.24), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3, curveSegments: 8 })), s.m(new THREE.MeshPhysicalMaterial({ color: "#14193A", roughness: 0.35, clearcoat: 1 })));
  lem.position.z = 0.07; zamek.add(lem);
  const profil = [new THREE.Vector2(0, -0.08), new THREE.Vector2(0.165, 0.0), new THREE.Vector2(0.165, 0.014), new THREE.Vector2(0.1, 0.07), new THREE.Vector2(0, 0.075)];
  const kamenGeo = s.g(new THREE.LatheGeometry(profil, 6)); kamenGeo.rotateX(Math.PI / 2); kamenGeo.rotateZ(Math.PI / 6);
  const kamenMat = s.m(new THREE.MeshPhysicalMaterial({ color: barva, roughness: 0.02, metalness: 0.05, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.8, emissive: barva, emissiveIntensity: 0.45, flatShading: true }));
  const kamen = new THREE.Mesh(kamenGeo, kamenMat); kamen.position.z = 0.1; zamek.add(kamen);

  // ── unikátní prvek podle toho, za co truhla je ──
  if (P.prvek === "zalozka") {
    // Doporučení: stužka-záložka jako v učebnici (doporučené téma)
    const stuha = s.m(new THREE.MeshPhysicalMaterial({ color: "#D8344A", roughness: 0.35, sheen: 1, sheenColor: new THREE.Color("#FF9AA8"), sheenRoughness: 0.25, side: THREE.DoubleSide }));
    const tvarStuhy = new THREE.Shape(); tvarStuhy.moveTo(-0.055, 0); tvarStuhy.lineTo(0.055, 0); tvarStuhy.lineTo(0.055, -0.36); tvarStuhy.lineTo(0, -0.31); tvarStuhy.lineTo(-0.055, -0.36); tvarStuhy.closePath();
    const sg = s.g(new THREE.ExtrudeGeometry(tvarStuhy, { depth: 0.006, bevelEnabled: false }));
    const p = sg.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setZ(i, p.getZ(i) + 0.03 * Math.sin(-y * 6) * -y); } sg.computeVertexNormals();
    for (const [x, r] of [[0.5, -0.06], [0.6, 0.1]] as const) { const m = new THREE.Mesh(sg, stuha); m.position.set(x, 0.04, VD / 2 + 0.035); m.rotation.z = r; viko.add(m); }
  }
  if (P.prvek === "tabule") {
    // Generálka: tabule se vzorci z přijímaček na vršku víka
    const tw = 2 * pasX - 0.26, td = VD * 0.8;
    const naVrch = (v: THREE.Vector3, dy: number) => { const zn = cl(v.z / (VD / 2), -1, 1); v.y += LH + dy + LA * Math.cos(zn * Math.PI / 2); };
    viko.add(new THREE.Mesh(s.g(tvar(tw + 0.06, 0.02, td + 0.06, 0.01, [16, 1, 32], new THREE.Vector3(0, 0, 0), (v) => naVrch(v, 0.004))), kovMat));
    const tg = s.g(tvar(tw, 0.012, td, 0.004, [16, 1, 32], new THREE.Vector3(0, 0, 0), (v) => naVrch(v, 0.016)));
    { const p = tg.attributes.position, uv = tg.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tw + 0.5, 0.5 - p.getZ(i) / td); uv.needsUpdate = true; }
    viko.add(new THREE.Mesh(tg, s.m(new THREE.MeshStandardMaterial({ map: texturaTabule(s), roughness: 0.92 }))));
  }
  if (P.prvek === "snih") {
    // Sezónní (Zima): sněhová čepice na víku a rampouchy
    const snihMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", roughness: 1, sheen: 1, sheenColor: new THREE.Color("#DDEBFF"), sheenRoughness: 0.6, emissive: "#9FC0FF", emissiveIntensity: 0.06 }));
    const sw = VW * 0.86, sd = VD * 0.78;
    const sg = s.g(tvar(sw, 0.1, sd, 0.05, [30, 4, 30], new THREE.Vector3(0, 0, 0), (v) => {
      const zn = cl(v.z / (sd / 2), -1, 1), xn = cl(v.x / (sw / 2), -1, 1);
      const hrb = 0.05 * Math.sin(v.x * 9 + 1) * Math.sin(v.z * 7) + 0.03 * Math.sin(v.x * 23 + v.z * 13);
      v.y = (v.y > 0 ? v.y * (1 + hrb * 6) : v.y * 0.4) + LH + LA * Math.cos(zn * Math.PI / 2) + 0.03 - 0.06 * xn ** 8;
    }));
    viko.add(new THREE.Mesh(sg, snihMat));
    const ledMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#D8F1FF", roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.8, emissive: "#7FC8FF", emissiveIntensity: 0.15 }));
    for (const [x, l] of [[-0.7, 0.12], [-0.52, 0.2], [-0.3, 0.1], [0.32, 0.16], [0.45, 0.24], [0.66, 0.12], [-0.12, 0.08]] as const) {
      const c = new THREE.Mesh(s.g(new THREE.ConeGeometry(0.022, l, 10)), ledMat); c.rotation.x = Math.PI; c.position.set(x, -l / 2 + 0.005, VD / 2 + 0.03); viko.add(c);
    }
  }
  if (P.prvek === "krystaly") {
    // Krystalová: shluk krystalů vyrůstajících z víka
    const krMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#BDF2FF", roughness: 0.03, clearcoat: 1, transparent: true, opacity: 0.85, iridescence: 1, emissive: "#3FB4E0", emissiveIntensity: 0.35, flatShading: true }));
    const shluk = new THREE.Group(); shluk.position.set(0.38, LH + LA - 0.02, -0.05); viko.add(shluk);
    for (const [x, z, h, rx, rz] of [[0, 0, 0.36, 0, 0], [0.09, 0.05, 0.24, 0.2, -0.45], [-0.08, 0.04, 0.22, 0.25, 0.5], [0.03, -0.08, 0.18, -0.45, -0.1], [-0.05, -0.06, 0.14, -0.3, 0.4]] as const) {
      const k = new THREE.Group(); k.position.set(x, 0, z); k.rotation.set(rx, 0, rz);
      const telo = new THREE.Mesh(s.g(new THREE.CylinderGeometry(0.045, 0.05, h, 6)), krMat); telo.position.y = h / 2; k.add(telo);
      const spic = new THREE.Mesh(s.g(new THREE.ConeGeometry(0.045, 0.08, 6)), krMat); spic.position.y = h + 0.04; k.add(spic);
      shluk.add(k);
    }
    animace.push((cas) => { krMat.emissiveIntensity = 0.3 + 0.12 * Math.sin(cas * 2); });
  }
  if (P.prvek === "ucha") {
    // Velká: je větší a má dvě kovová ucha na nošení
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 * bulge(0.62) + 0.02), y = H * 0.62;
      const drzak = new THREE.Mesh(s.g(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 16)), kovMat); drzak.rotation.z = Math.PI / 2; drzak.position.set(x, y, 0); pruzne.add(drzak);
      const ucho = new THREE.Mesh(s.g(new THREE.TorusGeometry(0.13, 0.026, 12, 32)), kovMat); ucho.rotation.y = Math.PI / 2; ucho.position.set(x + sx * 0.04, y - 0.12, 0); pruzne.add(ucho);
    }
  }
  if (P.prvek === "hvezdy") {
    // Zlatá: pět hvězd = pět dní tréninku v týdnu
    const hvMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#FFE08A", roughness: 0.05, clearcoat: 1, emissive: "#FFB000", emissiveIntensity: 0.7, flatShading: true }));
    const hg = s.g(new THREE.ExtrudeGeometry(hvezdaShape(0.05, 0.022), { depth: 0.015, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.008, bevelSegments: 2 }));
    for (const x of [-0.62, -0.31, 0, 0.31, 0.62]) { const m = new THREE.Mesh(hg, hvMat); m.position.set(x, 0.07, bulge(0.07 / H) * (D / 2) + 0.045); pruzne.add(m); }
  }

  return { root, pruzne, vikoCep, kamen, kamenMat, sametMat, skviraMat, H, dnoY, D, W, krok: animace.length ? (c) => animace.forEach((f) => f(c)) : undefined };
}
