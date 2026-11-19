/**
 * Obličej 3D Hexíka s hloubkou a výrazy (Karel schválil 19. 11. 2026, mockup docs/gamifikace-2026-11/hexik-plus.html).
 *  - obličej jako měkký polštářek zapuštěný do těla se švem, tvářičky jako ruměnec
 *  - oči s duhovkou a dvěma odlesky, víčka, obočí, oblouček pro zavřené oči (^^)
 *  - ústa: úsměv, otevřený úsměv, „o“, čárka, smutná
 *  - výrazy: neutral, radost, překvapení, povzbuzení, ospalý, stýská se mu
 */
import * as THREE from "three";
import type { Podoba } from "../hexik-svg";

export type Vyraz3D = "neutral" | "radost" | "prekvapeni" | "povzbuzeni" | "ospaly" | "smutny";

const N = "#0D1B3E";

interface Oko { g: THREE.Group; koule: THREE.Object3D[]; oblouk: THREE.Mesh; vicko: THREE.Group; obočí: THREE.Mesh; sx: number; bx: number }

interface Hodnoty { oci: number; skvir: number; vicko: number; naklonVicka: number; oblouk: number; obociY: number; obociNaklon: number; obociVid: number; tvare: number; naklon: number; kyv: number }

export interface RigObliceje {
  oci: Oko[];
  usta: Record<string, THREE.Object3D>;
  tvare: THREE.Mesh[];
  /** Aktuální (plynule se měnící) hodnoty výrazu. */
  h: Hodnoty;
}

export interface StavObliceje {
  vyraz: Vyraz3D;
  /** Pohled: −1…1 (vodorovně a svisle). */
  lookX: number;
  lookY: number;
  /** Mrknutí: 1 = otevřené, ~0.1 = zavřené. */
  mrk: number;
  /** Čas výrazu (pro zívnutí). */
  tVyraz: number;
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

function kruhovaTextura(stopy: [number, string][]): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); for (const [o, b] of stopy) gr.addColorStop(o, b);
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export interface KontextObliceje {
  P: Podoba;
  body: THREE.Group;
  eyes: THREE.Group[];
  mouth: THREE.Object3D;
  inner: THREE.Mesh;
  tvare: THREE.Mesh[];
  g: <T extends THREE.BufferGeometry>(x: T) => T;
  mt: <T extends THREE.Material>(x: T) => T;
  tx: (x: THREE.Texture) => THREE.Texture;
}

/** Přestaví plochý obličej z model.ts na obličej s hloubkou a přidá díly pro výrazy. */
export function postavOblicej(k: KontextObliceje): RigObliceje {
  const { P, body, g, mt, tx } = k;
  const barvaObliceje = new THREE.Color(P.i);
  // obličej: polštářek a šev
  k.inner.geometry = g(new THREE.ExtrudeGeometry(hexShape(0.8, 0.2), { depth: 0.006, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 6, curveSegments: 10 }));
  k.inner.position.z = 0.436;
  const im = k.inner.material as THREE.MeshStandardMaterial; im.roughness = Math.min(im.roughness, 0.55); im.polygonOffset = false;
  const pts = hexShape(0.86, 0.2).getSpacedPoints(120).map((p) => new THREE.Vector3(p.x, p.y, 0.46));
  body.add(new THREE.Mesh(g(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.016, 8, true)), mt(new THREE.MeshStandardMaterial({ color: barvaObliceje.clone().multiplyScalar(0.62), roughness: 0.8 }))));
  // tvářičky: ruměnec
  const blush = tx(kruhovaTextura([[0, "rgba(255,120,160,.85)"], [0.45, "rgba(255,130,170,.45)"], [1, "rgba(255,140,180,0)"]]));
  for (const t of k.tvare) { t.material = mt(new THREE.MeshBasicMaterial({ map: blush, transparent: true, depthWrite: false, opacity: 0.85 })); t.scale.setScalar(1.9); t.position.z = 0.482; t.position.y = -0.12; }
  // oči
  const duh = tx(kruhovaTextura([[0, "rgba(120,160,255,0)"], [0.6, "rgba(80,115,235,.18)"], [0.86, "rgba(120,160,255,.55)"], [1, "rgba(150,185,255,0)"]]));
  const oci: Oko[] = [];
  for (const eg of k.eyes) {
    const bx = eg.userData.bx as number, sx = Math.sign(bx) || 1;
    const koule = [...eg.children];
    const hlavni = koule.find((c) => (c as THREE.Mesh).isMesh && ((c as THREE.Mesh).geometry as THREE.SphereGeometry).parameters?.radius === 0.13) as THREE.Mesh | undefined;
    const kulate = !!hlavni && P.oci !== "neon";
    if (hlavni && kulate) {
      hlavni.material = mt(new THREE.MeshPhysicalMaterial({ color: "#131C45", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
      const d = new THREE.Mesh(g(new THREE.CircleGeometry(0.11, 32)), mt(new THREE.MeshBasicMaterial({ map: duh, transparent: true, depthWrite: false })));
      d.scale.set(0.95, 1.2, 1); d.position.set(0, -0.02, 0.062); eg.add(d); koule.push(d);
      const o2 = new THREE.Mesh(g(new THREE.SphereGeometry(0.02, 12, 8)), mt(new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.85 })));
      o2.position.set(-0.04, -0.055, 0.06); eg.add(o2); koule.push(o2);
      const velky = koule.find((c) => c !== hlavni && (c as THREE.Mesh).isMesh && ((c as THREE.Mesh).geometry as THREE.SphereGeometry).parameters?.radius === 0.04);
      if (velky) { velky.scale.set(1.25, 1.4, 1); velky.position.set(0.05, 0.06, 0.06); }
    }
    const oblouk = new THREE.Mesh(g(new THREE.TorusGeometry(0.085, 0.026, 10, 28, Math.PI)), mt(new THREE.MeshStandardMaterial({ color: P.oci === "neon" ? "#3DF5FF" : N, roughness: 0.3, emissive: P.oci === "neon" ? "#3DF5FF" : "#000000", emissiveIntensity: P.oci === "neon" ? 1 : 0 })));
    oblouk.position.set(0, -0.03, 0.04); oblouk.scale.set(1, 1.05, 0.6); oblouk.visible = false; eg.add(oblouk);
    const vicko = new THREE.Group(); vicko.visible = false; eg.add(vicko);
    if (kulate) { const vm = new THREE.Mesh(g(new THREE.SphereGeometry(0.142, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), mt(new THREE.MeshStandardMaterial({ color: barvaObliceje.clone().multiplyScalar(0.96), roughness: 0.5 }))); vm.scale.set(1.05, 1.3, 0.5); vicko.add(vm); }
    const ob = new THREE.Mesh(g(new THREE.CapsuleGeometry(0.018, 0.13, 4, 10)), mt(new THREE.MeshStandardMaterial({ color: N, roughness: 0.4 })));
    ob.rotation.z = Math.PI / 2; ob.position.set(sx * 0.27, 0.36, 0.47); ob.scale.setScalar(0.001); body.add(ob);
    oci.push({ g: eg, koule, oblouk, vicko, obočí: ob, sx, bx });
  }
  // ústa
  const usta: Record<string, THREE.Object3D> = { smich: k.mouth };
  const rovna = !!k.mouth.userData.rovna;
  if (!rovna) {
    k.mouth.position.z = 0.49;
    const otevrena = new THREE.Group();
    { const s = new THREE.Shape(); s.moveTo(-0.17, 0); s.absarc(0, 0, 0.17, Math.PI, 0, false); s.lineTo(-0.17, 0);
      otevrena.add(new THREE.Mesh(g(new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3 })), mt(new THREE.MeshStandardMaterial({ color: "#2A1030", roughness: 0.4 }))));
      const jaz = new THREE.Mesh(g(new THREE.SphereGeometry(0.075, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)), mt(new THREE.MeshStandardMaterial({ color: "#FF7A9C", roughness: 0.5 })));
      jaz.scale.set(1.25, 0.75, 0.35); jaz.position.set(0, -0.15, 0.02); otevrena.add(jaz); }
    otevrena.position.set(0, -0.19, 0.47);
    const ustaMat = (k.mouth as THREE.Mesh).material as THREE.Material;
    const ocko = new THREE.Mesh(g(new THREE.TorusGeometry(0.06, 0.03, 10, 28)), ustaMat); ocko.scale.set(0.9, 1.15, 0.6); ocko.position.set(0, -0.27, 0.48);
    const carka = new THREE.Mesh(g(new THREE.CapsuleGeometry(0.026, 0.12, 4, 8)), ustaMat); carka.rotation.z = Math.PI / 2; carka.position.set(0, -0.27, 0.48);
    const smutna = new THREE.Mesh(g(new THREE.TorusGeometry(0.12, 0.032, 10, 28, Math.PI)), ustaMat); smutna.position.set(0, -0.32, 0.48); smutna.scale.set(1, 0.7, 0.6);
    for (const m of [otevrena, ocko, carka, smutna]) { m.visible = false; body.add(m); }
    Object.assign(usta, { otevrena, o: ocko, carka, smutna });
  }
  return { oci, usta, tvare: k.tvare, h: { oci: 1, skvir: 1, vicko: 0, naklonVicka: 0, oblouk: 0, obociY: 0, obociNaklon: 0, obociVid: 0, tvare: 0.85, naklon: 0, kyv: 0 } };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Plynule nastaví obličej podle výrazu. Vrací náklon těla a kolébání (scéna je přičte k póze).
 * `dt` v sekundách.
 */
export function animujOblicej(r: RigObliceje, s: StavObliceje, dt: number): { naklon: number; kyv: number } {
  const k = Math.min(1, dt * 9);
  let t: Hodnoty = { oci: 1, skvir: 1, vicko: 0, naklonVicka: 0, oblouk: 0, obociY: 0, obociNaklon: 0, obociVid: 0, tvare: 0.85, naklon: 0, kyv: 0 };
  let ust = "smich";
  const v = s.vyraz;
  if (v === "prekvapeni") { t = { ...t, oci: 1.28, obociY: 0.05, obociVid: 1 }; ust = "o"; }
  if (v === "povzbuzeni") { t = { ...t, skvir: 0.86, obociY: 0.035, obociVid: 1, naklon: 0.05 }; }
  if (v === "ospaly") { t = { ...t, vicko: 0.72, tvare: 0.5, kyv: 1 }; ust = Math.sin(s.tVyraz * 0.9) > 0.85 ? "o" : "carka"; }
  if (v === "smutny") { t = { ...t, vicko: 0.34, naklonVicka: -0.3, obociVid: 1, obociNaklon: -0.36, tvare: 0.45, naklon: -0.04 }; ust = "smutna"; }
  if (v === "radost") { t = { ...t, oblouk: 1, tvare: 1.25 }; ust = "otevrena"; }
  for (const key of Object.keys(r.h) as (keyof Hodnoty)[]) r.h[key] = lerp(r.h[key], t[key], k);
  const h = r.h;
  const mrk = v === "ospaly" || v === "radost" ? 1 : s.mrk;
  for (const o of r.oci) {
    o.g.scale.set(h.oci, h.oci * h.skvir * mrk, 1);
    o.g.position.x = o.bx + s.lookX * 0.055; o.g.position.y = 0.1 + s.lookY * 0.04;
    const kul = h.oblouk < 0.5;
    for (const kk of o.koule) kk.visible = kul;
    o.oblouk.visible = !kul;
    o.vicko.visible = h.vicko > 0.02 && kul && o.vicko.children.length > 0;
    o.vicko.rotation.x = lerp(-1.4, 0.6, h.vicko); o.vicko.rotation.z = -o.sx * h.naklonVicka;
    o.obočí.scale.setScalar(Math.max(0.001, h.obociVid)); o.obočí.position.y = 0.33 + h.obociY + s.lookY * 0.03; o.obočí.rotation.z = Math.PI / 2 + o.sx * h.obociNaklon;
  }
  for (const tv of r.tvare) (tv.material as THREE.MeshBasicMaterial).opacity = Math.max(0, Math.min(1, h.tvare));
  const klic = r.usta[ust] ? ust : "smich";
  for (const [kk, m] of Object.entries(r.usta)) m.visible = kk === klic;
  return { naklon: h.naklon, kyv: h.kyv };
}
