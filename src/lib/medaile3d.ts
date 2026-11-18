/**
 * 3D medaile pro odznaky na profilu (návrh 18. 11. 2026): šestiúhelník z kovu podle stupně
 * (bronz, stříbro, zlato, diamant) se smaltem a vyraženým znakem, stuha v barvě kategorie,
 * u vyšších stupňů vavříny, u diamantu krystal a jiskry. Zamčená medaile je matná šedá.
 *
 * Dvě použití: živá medaile v detailu (otáčí se, oslava při novém stupni) a obrázky pro medailovou
 * stěnu (vyrenderují se jedním WebGL kontextem, aby stěna s desítkami medailí nebrala výkon).
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

export type StupenMedaile = -1 | 0 | 1 | 2 | 3;
export interface Medaile { znak: string; stupen: StupenMedaile; stuha: string }

const KOV: { c: string; em: string; r: number }[] = [
  { c: "#D08A4E", em: "#5A2A0E", r: 0.32 },
  { c: "#DCE3EE", em: "#3B4252", r: 0.22 },
  { c: "#FFC93C", em: "#8A5A00", r: 0.2 },
  { c: "#D2F6FF", em: "#1E8FB0", r: 0.1 },
];
const ZNAK = ["#FFE2C2", "#FFFFFF", "#FFF3C2", "#FFFFFF"];
const SMALT = ["#1D3A7A", "#4B2A86", "#A3122E", "#0B3D63"];

function sestiuhelnik(r: number, zaobleni: number): THREE.Shape {
  const s = new THREE.Shape();
  const body = Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 2 + (i * Math.PI) / 3; return new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r); });
  for (let i = 0; i < 6; i++) {
    const p = body[i], a = body[(i + 5) % 6], b = body[(i + 1) % 6];
    const k1 = p.clone().lerp(a, zaobleni), k2 = p.clone().lerp(b, zaobleni);
    if (i === 0) s.moveTo(k1.x, k1.y); else s.lineTo(k1.x, k1.y);
    s.quadraticCurveTo(p.x, p.y, k2.x, k2.y);
  }
  s.closePath();
  return s;
}

function texturaZnaku(znak: string): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#000"; x.fillRect(0, 0, 256, 256);
  x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle";
  if (znak === "plamen") {
    x.beginPath(); x.moveTo(128, 30); x.bezierCurveTo(150, 80, 205, 110, 190, 170); x.bezierCurveTo(180, 215, 150, 232, 128, 232); x.bezierCurveTo(100, 232, 66, 212, 64, 168); x.bezierCurveTo(62, 130, 90, 120, 96, 86); x.bezierCurveTo(108, 104, 112, 118, 118, 126); x.bezierCurveTo(124, 96, 120, 60, 128, 30); x.closePath(); x.fill();
    x.fillStyle = "#000"; x.beginPath(); x.moveTo(128, 140); x.bezierCurveTo(142, 165, 160, 178, 152, 204); x.bezierCurveTo(146, 220, 110, 222, 104, 200); x.bezierCurveTo(100, 182, 118, 172, 128, 140); x.closePath(); x.fill();
    const t0 = new THREE.CanvasTexture(c); t0.colorSpace = THREE.NoColorSpace; return t0;
  }
  const delka = [...znak].length;
  x.font = `900 ${delka > 2 ? 92 : delka > 1 ? 120 : 150}px "DM Sans", "Segoe UI Symbol", system-ui, sans-serif`;
  x.fillText(znak, 128, 138);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

function texturaStuhy(barva: string): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 64; c.height = 8;
  const x = c.getContext("2d")!;
  x.fillStyle = barva; x.fillRect(0, 0, 64, 8);
  x.fillStyle = "rgba(255,255,255,.85)"; x.fillRect(14, 0, 6, 8); x.fillRect(44, 0, 6, 8);
  x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(0, 0, 3, 8); x.fillRect(61, 0, 3, 8);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Postaveno { skupina: THREE.Group; jiskry: THREE.Points | null; krystal: THREE.Mesh | null; zahod: () => void }

function postav(m: Medaile): Postaveno {
  const g = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [], texs: THREE.Texture[] = [];
  const G = <T extends THREE.BufferGeometry>(x: T) => (geos.push(x), x);
  const M = <T extends THREE.Material>(x: T) => (mats.push(x), x);
  const zam = m.stupen < 0;
  const k = KOV[Math.max(0, m.stupen)];
  const kov = M(zam
    ? new THREE.MeshStandardMaterial({ color: "#7C859A", roughness: 0.85, metalness: 0.1 })
    : new THREE.MeshPhysicalMaterial({ color: k.c, metalness: 1, roughness: k.r, clearcoat: 0.6, clearcoatRoughness: 0.2, emissive: k.em, emissiveIntensity: 0.15, iridescence: m.stupen === 3 ? 1 : 0, iridescenceIOR: 1.8 }));

  // Tělo medaile se zkosenou hranou
  const telo = new THREE.Mesh(G(new THREE.ExtrudeGeometry(sestiuhelnik(1, 0.16), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.07, bevelSegments: 5, curveSegments: 8 })), kov);
  telo.position.z = -0.08; g.add(telo);
  // Smalt uvnitř
  const smalt = M(zam
    ? new THREE.MeshStandardMaterial({ color: "#9AA2B3", roughness: 0.9 })
    : new THREE.MeshPhysicalMaterial({ color: SMALT[m.stupen], roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, iridescence: m.stupen === 3 ? 0.9 : 0.15, sheen: 0.3 }));
  const lice = new THREE.Mesh(G(new THREE.ExtrudeGeometry(sestiuhelnik(0.74, 0.18), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 })), smalt);
  lice.position.z = 0.17; g.add(lice);
  // Kovový rámeček kolem smaltu
  const ram = sestiuhelnik(0.84, 0.17); ram.holes.push(sestiuhelnik(0.75, 0.18) as unknown as THREE.Path);
  const ramecek = new THREE.Mesh(G(new THREE.ExtrudeGeometry(ram, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2 })), kov);
  ramecek.position.z = 0.16; g.add(ramecek);
  // Vyražený znak (kov na smaltu)
  const tz = texturaZnaku(m.znak); texs.push(tz);
  const znakMat = M(zam
    ? new THREE.MeshStandardMaterial({ color: "#8D96A8", roughness: 0.8, alphaMap: tz, transparent: true })
    : new THREE.MeshPhysicalMaterial({ color: ZNAK[m.stupen], metalness: 0.85, roughness: 0.15, alphaMap: tz, transparent: true, bumpMap: tz, bumpScale: 4, clearcoat: 1, emissive: ZNAK[m.stupen], emissiveIntensity: 0.25 }));
  const znak = new THREE.Mesh(G(new THREE.PlaneGeometry(1.15, 1.15)), znakMat); znak.position.z = 0.215; g.add(znak);

  // Stuha za medailí (dva cípy)
  const ts = texturaStuhy(zam ? "#9AA3B8" : m.stuha); texs.push(ts);
  const stuhaMat = M(new THREE.MeshStandardMaterial({ map: ts, roughness: 0.6, side: THREE.DoubleSide }));
  const cip = new THREE.Shape(); cip.moveTo(-0.2, 0); cip.lineTo(0.2, 0); cip.lineTo(0.2, -0.9); cip.lineTo(0, -0.72); cip.lineTo(-0.2, -0.9); cip.closePath();
  for (const sx of [-1, 1]) {
    const c = new THREE.Mesh(G(new THREE.ShapeGeometry(cip)), stuhaMat);
    c.position.set(sx * 0.32, -0.55, -0.14); c.rotation.z = sx * 0.32; g.add(c);
  }

  // Vavřínový věnec na větvičce (stříbro: kratší, zlato a diamant: plný). Levá strana, pravá je zrcadlo.
  if (m.stupen >= 1) {
    const list = G(new THREE.SphereGeometry(0.1, 14, 10));
    const delka = m.stupen === 1 ? 1.45 : 2.3, n = m.stupen === 1 ? 7 : 11, R = 1.2;
    const strana = new THREE.Group();
    const body: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) { const u = -Math.PI / 2 - 0.1 - (i / 24) * delka; body.push(new THREE.Vector3(Math.cos(u) * R, Math.sin(u) * R, 0.02)); }
    const krivka = new THREE.CatmullRomCurve3(body);
    strana.add(new THREE.Mesh(G(new THREE.TubeGeometry(krivka, 40, 0.022, 6)), kov));
    for (let i = 0; i < n; i++) {
      const t = 0.06 + (i / (n - 1)) * 0.9, b = krivka.getPoint(t), tg = krivka.getTangent(t);
      const smer = Math.atan2(tg.y, tg.x) - Math.PI / 2;
      for (const sv of [1, -1]) {
        const l = new THREE.Mesh(list, kov);
        l.position.copy(b).add(new THREE.Vector3(-tg.y, tg.x, 0).multiplyScalar(sv * 0.085));
        l.rotation.z = smer + sv * 0.6;
        const vel = 1 - t * 0.35;
        l.scale.set(0.42 * vel, 1.15 * vel, 0.3);
        strana.add(l);
      }
    }
    const zrcadlo = strana.clone(); zrcadlo.scale.x = -1;
    g.add(strana, zrcadlo);
  }
  // Hvězdička nahoře (zlato) / krystal (diamant)
  let krystal: THREE.Mesh | null = null;
  if (m.stupen === 2) {
    const sh = new THREE.Shape();
    for (let i = 0; i < 10; i++) { const rr = i % 2 ? 0.07 : 0.16, a = Math.PI / 2 + (i * Math.PI) / 5; if (i === 0) sh.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else sh.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    const hv = new THREE.Mesh(G(new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 })), kov);
    hv.position.set(0, 1.12, 0); g.add(hv);
  }
  if (m.stupen === 3) {
    krystal = new THREE.Mesh(G(new THREE.OctahedronGeometry(0.26, 0)), M(new THREE.MeshPhysicalMaterial({ color: "#BFF6FF", metalness: 0, roughness: 0.02, transmission: 0.6, thickness: 0.3, ior: 2.2, iridescence: 1, clearcoat: 1, emissive: "#3AD0F0", emissiveIntensity: 0.8 })));
    krystal.position.set(0, 1.22, 0.08); krystal.scale.set(0.9, 1.3, 0.9); g.add(krystal);
  }
  // Jiskry kolem diamantu
  let jiskry: THREE.Points | null = null;
  if (m.stupen === 3) {
    const n = 26, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 1.25 + Math.random() * 0.35; p[i * 3] = Math.cos(a) * r; p[i * 3 + 1] = Math.sin(a) * r; p[i * 3 + 2] = (Math.random() - 0.5) * 0.4; }
    const pg = G(new THREE.BufferGeometry()); pg.setAttribute("position", new THREE.BufferAttribute(p, 3));
    jiskry = new THREE.Points(pg, M(new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.07, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
    g.add(jiskry);
  }
  return { skupina: g, jiskry, krystal, zahod: () => { geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); texs.forEach((x) => x.dispose()); } };
}

function scena(renderer: THREE.WebGLRenderer) {
  const s = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04);
  s.environment = env.texture; s.environmentIntensity = 1.1;
  pm.dispose();
  const key = new THREE.DirectionalLight("#FFFFFF", 2.4); key.position.set(2, 3, 4); s.add(key);
  const rim = new THREE.DirectionalLight("#B9C8FF", 1.4); rim.position.set(-3, 1, -2); s.add(rim);
  s.add(new THREE.AmbientLight("#FFFFFF", 0.35));
  const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.set(0, 0.12, 6.4); cam.lookAt(0, 0.12, 0);
  return { s, cam, env };
}

export interface Medaile3D { nastav: (m: Medaile) => void; oslava: () => void; znic: () => void }

/** Živá medaile: pomalu se natáčí (odlesky kovu se hýbou), tažením jde otočit, `oslava()` = dvě otočky. */
export function vytvorMedaili3D(canvas: HTMLCanvasElement, m: Medaile): Medaile3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const { s, cam, env } = scena(renderer);
  let p = postav(m); s.add(p.skupina);
  let raf = 0, cas = 0, oslavaOd = -1, tah = 0, vel = 0, dolu: number | null = null;
  const vel0 = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  vel0();
  const ro = new ResizeObserver(vel0); ro.observe(canvas);
  const prvni = performance.now();
  const krok = () => {
    cas = (performance.now() - prvni) / 1000;
    let rotY = Math.sin(cas * 0.8) * 0.38 + tah, skal = 1;
    if (oslavaOd >= 0) {
      const q = Math.min(1, (cas - oslavaOd) / 1.4), e = 1 - Math.pow(1 - q, 3);
      rotY += e * Math.PI * 4; skal = 1 + Math.sin(q * Math.PI) * 0.18;
      if (q >= 1) oslavaOd = -1;
    }
    if (dolu === null) { tah += vel; vel *= 0.93; tah *= 0.97; }
    p.skupina.rotation.y = rotY; p.skupina.scale.setScalar(skal);
    p.skupina.position.y = Math.sin(cas * 1.6) * 0.04;
    if (p.jiskry) { p.jiskry.rotation.z = cas * 0.3; (p.jiskry.material as THREE.PointsMaterial).opacity = 0.6 + 0.4 * Math.sin(cas * 4); }
    if (p.krystal) p.krystal.rotation.y = cas * 1.5;
    renderer.render(s, cam);
    raf = requestAnimationFrame(krok);
  };
  raf = requestAnimationFrame(krok);
  const pd = (e: PointerEvent) => { dolu = e.clientX; canvas.setPointerCapture?.(e.pointerId); };
  const pmv = (e: PointerEvent) => { if (dolu === null) return; const d = (e.clientX - dolu) / 80; tah += d; vel = d * 0.5; dolu = e.clientX; };
  const pu = () => { dolu = null; };
  canvas.addEventListener("pointerdown", pd); canvas.addEventListener("pointermove", pmv); canvas.addEventListener("pointerup", pu); canvas.addEventListener("pointercancel", pu);
  return {
    nastav(n) { s.remove(p.skupina); p.zahod(); p = postav(n); s.add(p.skupina); },
    oslava() { oslavaOd = cas; },
    znic() { cancelAnimationFrame(raf); ro.disconnect(); s.remove(p.skupina); p.zahod(); env.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}

/** Obrázky medailí pro stěnu: jeden WebGL kontext, postupně vyrenderuje všechny (data URL PNG). */
export function obrazkyMedaili(seznam: Medaile[], velikost = 160): string[] {
  const c = document.createElement("canvas"); c.width = c.height = velikost * 2;
  const renderer = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(velikost * 2, velikost * 2, false);
  const { s, cam, env } = scena(renderer);
  const out = seznam.map((m) => {
    const p = postav(m); p.skupina.rotation.y = -0.28; s.add(p.skupina);
    renderer.render(s, cam);
    const url = c.toDataURL("image/png");
    s.remove(p.skupina); p.zahod();
    return url;
  });
  env.dispose(); renderer.dispose(); renderer.forceContextLoss();
  return out;
}
