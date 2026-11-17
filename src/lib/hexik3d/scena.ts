/**
 * Scéna 3D Hexíka: renderer, světla, odlesky, konfety a smyčka animace.
 * Šetří baterii: mimo obrazovku a ve skryté záložce se nekreslí, v klidu jen ~30 snímků za sekundu,
 * a s `setrne` (Hexík u příkladu) se v klidu nekreslí vůbec, jen při reakci.
 */
import * as THREE from "three";
import { postavHexika, type HexikModel } from "./model";
import { klid, reakce, DELKA, jeReakce3D, type Reakce3D } from "./animace";

export interface Hexik3DMoznosti {
  /** Otáčení tažením prstem/myší (Sbírka, šatník). */
  otacet?: boolean;
  /** V klidu nekreslit (u příkladů, ať trénink nebere baterii). */
  setrne?: boolean;
}

export interface Hexik3D {
  nastav: (podoba: string, etapa: number) => void;
  reaguj: (animace: string) => void;
  velikost: () => void;
  znic: () => void;
}

const KONFETY_BARVY = ["#F5A623", "#5B55D6", "#3DF5FF", "#F27BA5", "#5FD0AA", "#FFFFFF"];

/** Umí zařízení WebGL? (bez něj zůstane 2D Hexík) */
let umi: boolean | null = null;
export function umi3D(): boolean {
  if (umi !== null) return umi;
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null;
    umi = !!gl;
    // Zkušební spojení hned uvolnit (prohlížeč jich drží jen pár najednou)
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch { umi = false; }
  return umi;
}

export function vytvorHexika3D(canvas: HTMLCanvasElement, podoba: string, etapa: number, mozn: Hexik3DMoznosti = {}): Hexik3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  // Jednoduché prostředí pro odlesky (zlato, chrom, diamant)
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  const eg = new THREE.SphereGeometry(10, 32, 16);
  const pos = eg.attributes.position, cols: number[] = [];
  const dol = new THREE.Color("#262B5A"), nah = new THREE.Color("#FFFFFF");
  for (let i = 0; i < pos.count; i++) {
    const k = Math.max(0, pos.getY(i) / 10) * 0.85 + 0.12;
    const c = dol.clone().lerp(nah, k); cols.push(c.r, c.g, c.b);
  }
  eg.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  const em = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  es.add(new THREE.Mesh(eg, em));
  const pg = new THREE.PlaneGeometry(7, 3), pmat = new THREE.MeshBasicMaterial({ color: "#FFFFFF", side: THREE.DoubleSide });
  const pl = new THREE.Mesh(pg, pmat); pl.position.set(4, 6, 5); pl.lookAt(0, 0, 0); es.add(pl);
  const envRT = pm.fromScene(es, 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.9;
  eg.dispose(); em.dispose(); pg.dispose(); pmat.dispose(); pm.dispose();

  scene.add(new THREE.HemisphereLight("#FFFFFF", "#3A3F6B", 1.4));
  const key = new THREE.DirectionalLight("#FFFFFF", 2.2); key.position.set(2.5, 4, 4); scene.add(key);
  const rim = new THREE.DirectionalLight("#B9A8FF", 2.0); rim.position.set(-3, 2.5, -3); scene.add(rim);
  const svit = new THREE.PointLight("#3DF5FF", 0, 6, 2); svit.position.set(0, 0.4, 2.6); scene.add(svit);

  let model: HexikModel = postavHexika(podoba, etapa);
  scene.add(model.root); scene.add(model.stin);
  const nastavSvit = () => { svit.color.set(model.svit ?? "#FFFFFF"); svit.intensity = model.svit ? 2.5 : 0; };
  nastavSvit();

  // Konfety
  const kGeo = new THREE.PlaneGeometry(0.07, 0.12);
  const konfety = Array.from({ length: 50 }, (_, i) => {
    const m = new THREE.Mesh(kGeo, new THREE.MeshBasicMaterial({ color: KONFETY_BARVY[i % KONFETY_BARVY.length], side: THREE.DoubleSide, transparent: true }));
    m.visible = false; m.userData = { v: new THREE.Vector3(), s: new THREE.Vector3(), life: 0 }; scene.add(m); return m;
  });
  const vypust = (n: number) => {
    let u = 0;
    for (const k of konfety) {
      if (u >= n) break;
      if (k.visible) continue;
      u++; k.visible = true; k.userData.life = 0;
      k.position.set((Math.random() - 0.5) * 0.6, model.root.position.y + 0.9, (Math.random() - 0.5) * 0.4);
      const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random();
      (k.userData.v as THREE.Vector3).set(Math.cos(a) * r, 2.2 + Math.random() * 1.6, Math.sin(a) * r * 0.6);
      (k.userData.s as THREE.Vector3).set(Math.random() * 8, Math.random() * 8, Math.random() * 8);
    }
  };

  const pohyb = !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let akce: { id: Reakce3D; start: number; vyhozeno: boolean } | null = null;
  let cas = 0, mrk = 2.5, mrkStart = -1, posledniKresba = -1;
  let userRot = 0, vel = 0, drag = false, lastX = 0, posledni = -10;
  const look = { x: 0, y: 0 };
  let videt = true, bezi = false, raf = 0;
  let minule = performance.now();
  const delta = () => { const ted = performance.now(); const d = (ted - minule) / 1000; minule = ted; return d; };

  function velikost() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Hexík i s doplňky (čepice, aura) se vejde: vzdálenost podle užšího rozměru
    const z = w / h < 0.9 ? 7.6 / (w / h) * 0.9 : 7.6;
    camera.position.set(0, 0.45, z); camera.lookAt(0, 0.35, 0);
    camera.updateProjectionMatrix();
    vykresli(true);
  }

  function vykresli(vynutit = false) {
    const dt = Math.min(0.05, delta()); cas += dt;
    const klidne = !akce && !drag && Math.abs(vel) < 0.0005 && konfety.every((k) => !k.visible);
    if (!vynutit && klidne && mozn.setrne) return false;
    if (!vynutit && klidne && cas - posledniKresba < 1 / 30) return true;
    posledniKresba = cas;

    let P = klid(cas, pohyb && !mozn.setrne);
    if (akce) {
      const p = Math.min(1, (cas - akce.start) / DELKA[akce.id]);
      P = reakce(akce.id, p, cas, P, akce.vyhozeno);
      if (P.konfety) { vypust(P.konfety); akce.vyhozeno = true; }
      if (p >= 1) akce = null;
    }
    if (!drag) {
      userRot += vel; vel *= 0.9;
      if (cas - posledni > 3.5) { const cil = Math.round(userRot / (Math.PI * 2)) * Math.PI * 2; userRot += (cil - userRot) * 0.05; }
    }
    const m = model;
    m.root.position.y = P.y; m.root.rotation.set(P.rX, userRot + P.rY, 0); m.root.scale.setScalar(P.s);
    const sx = 1 / Math.sqrt(P.sy); m.hips.scale.set(sx, P.sy, sx);
    m.body.rotation.z = P.rZ;
    m.armL.rotation.z = -P.aL; m.armR.rotation.z = P.aR;
    m.mouth.scale.y = m.mouth.userData.rovna ? 1 : P.usta;
    if (!m.mouth.userData.rovna) m.mouth.position.y = -0.24 - (1 - P.usta) * 0.05;
    if (cas > mrk) { mrkStart = cas; mrk = cas + 2.5 + Math.random() * 2.5; }
    const bl = mrkStart > 0 && cas - mrkStart < 0.16 ? 1 - 0.9 * Math.sin(((cas - mrkStart) / 0.16) * Math.PI) : 1;
    for (const g of m.eyes) { g.scale.y = bl; g.position.x = (g.userData.bx as number) + (P.lx + look.x * 0.6) * 0.05; g.position.y = 0.1 + (P.ly + look.y * 0.5) * 0.05; }
    for (const k of m.kridla) k.rotation.y = (k.userData.sx as number) * (0.25 + 0.25 * Math.sin(cas * (akce ? 14 : 3)));
    if (m.plamen) m.plamen.scale.y = 1 + 0.12 * Math.sin(cas * 11) + 0.06 * Math.sin(cas * 23);
    for (const s of m.trpyt) { const f = 0.5 + 0.5 * Math.sin(cas * 3 + (s.userData.faze as number)); s.scale.setScalar(0.4 + f); s.rotation.z = cas; }
    if (m.aura) m.aura.rotation.z = cas * 0.4;
    if (m.svit) svit.intensity = 2.2 + 0.6 * Math.sin(cas * 3);
    const ss = Math.max(0.45, 1 - P.y * 0.35); m.stin.scale.setScalar(ss * P.s);
    for (const k of konfety) {
      if (!k.visible) continue;
      const u = k.userData; u.life += dt; (u.v as THREE.Vector3).y -= 6 * dt;
      k.position.addScaledVector(u.v as THREE.Vector3, dt); k.rotation.x += (u.s as THREE.Vector3).x * dt; k.rotation.y += (u.s as THREE.Vector3).y * dt;
      (k.material as THREE.MeshBasicMaterial).opacity = Math.max(0, Math.min(1, 1.6 - u.life));
      if (u.life > 1.6 || k.position.y < -1.6) k.visible = false;
    }
    renderer.render(scene, camera);
    return true;
  }

  function smycka() {
    if (!videt || document.hidden) { bezi = false; return; }
    const dal = vykresli();
    if (dal === false) { bezi = false; return; }
    raf = requestAnimationFrame(smycka);
  }
  function spust() { if (!bezi && videt && !document.hidden) { bezi = true; delta(); raf = requestAnimationFrame(smycka); } }

  const io = typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver((z) => { videt = z.some((x) => x.isIntersecting); if (videt) spust(); })
    : null;
  io?.observe(canvas);
  const naViditelnost = () => { if (!document.hidden) spust(); };
  document.addEventListener("visibilitychange", naViditelnost);
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(velikost) : null;
  ro?.observe(canvas);

  // Otáčení tažením (svislý posun stránky zůstává, viz touch-action v CSS)
  const dolu = (e: PointerEvent) => { drag = true; lastX = e.clientX; posledni = cas; try { canvas.setPointerCapture(e.pointerId); } catch { /* */ } spust(); };
  const pohybUkazatele = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    look.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    look.y = -Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    if (!drag) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    userRot += dx * 0.012; vel = dx * 0.012; posledni = cas;
  };
  const nahoru = () => { drag = false; };
  if (mozn.otacet) {
    canvas.addEventListener("pointerdown", dolu);
    canvas.addEventListener("pointermove", pohybUkazatele);
    canvas.addEventListener("pointerup", nahoru);
    canvas.addEventListener("pointercancel", nahoru);
  }

  velikost();
  spust();

  return {
    nastav(p, e) {
      scene.remove(model.root); scene.remove(model.stin); model.dispose();
      model = postavHexika(p, e);
      scene.add(model.root); scene.add(model.stin);
      nastavSvit(); vykresli(true); spust();
    },
    reaguj(animace) {
      if (!jeReakce3D(animace)) return;
      akce = { id: animace, start: cas, vyhozeno: false };
      spust();
    },
    velikost,
    znic() {
      cancelAnimationFrame(raf); io?.disconnect(); ro?.disconnect();
      document.removeEventListener("visibilitychange", naViditelnost);
      canvas.removeEventListener("pointerdown", dolu); canvas.removeEventListener("pointermove", pohybUkazatele);
      canvas.removeEventListener("pointerup", nahoru); canvas.removeEventListener("pointercancel", nahoru);
      model.dispose(); kGeo.dispose(); konfety.forEach((k) => (k.material as THREE.Material).dispose());
      envRT.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
