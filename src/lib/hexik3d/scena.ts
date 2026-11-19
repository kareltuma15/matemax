/**
 * Scéna 3D Hexíka: renderer, světla, odlesky, konfety a smyčka animace.
 * Šetří baterii: mimo obrazovku a ve skryté záložce se nekreslí, v klidu jen ~30 snímků za sekundu,
 * a s `setrne` (Hexík u příkladu) se v klidu nekreslí vůbec, jen při reakci.
 */
import * as THREE from "three";
import { postavHexika, type HexikModel, type SlotyHexika } from "./model";
export type { SlotyHexika };
import { klid, reakce, DELKA, jeReakce3D, type Reakce3D } from "./animace";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { animujOblicej, type Vyraz3D } from "./oblicej";
export type { Vyraz3D };

export interface Hexik3DMoznosti {
  /** Otáčení tažením prstem/myší (Sbírka, šatník). */
  otacet?: boolean;
  /** V klidu nekreslit (u příkladů, ať trénink nebere baterii). */
  setrne?: boolean;
  /** Ťuknutí rozesměje, tažení (bez otáčení) pohladí a letí srdíčka. */
  mazlit?: boolean;
}

export interface Hexik3D {
  nastav: (podoba: string, etapa: number, sloty?: SlotyHexika) => void;
  reaguj: (animace: string) => void;
  /** Trvalá nálada (Domov: ospalý, stýská se mu); neutral = běžný obličej. */
  nalada: (v: Vyraz3D) => void;
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

export function vytvorHexika3D(canvas: HTMLCanvasElement, podoba: string, etapa: number, mozn: Hexik3DMoznosti = {}, sloty: SlotyHexika = {}): Hexik3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  // Stejné studiové světlo jako nová truhla, s neutrálním vyvážením (drží syté barvy Hexíka)
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  const pm = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pm.fromScene(room, 0.035);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.55;
  room.dispose(); pm.dispose();

  scene.add(new THREE.HemisphereLight("#FFFFFF", "#26296A", 0.45));
  const key = new THREE.DirectionalLight("#FFF1DE", 1.5); key.position.set(3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight("#A898FF", 1.6); rim.position.set(-4, 3, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight("#9FC4FF", 0.6); fill.position.set(-5, 1, 3); scene.add(fill);
  const svit = new THREE.PointLight("#3DF5FF", 0, 6, 2); svit.position.set(0, 0.4, 2.6); scene.add(svit);

  // Velikost částic (sníh, jiskry) podle výšky plátna v pixelech
  const meritko = { value: 400 };
  let model: HexikModel = postavHexika(podoba, etapa, meritko, sloty);
  scene.add(model.root); scene.add(model.stin); scene.add(model.okoli);
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
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  // Výrazy: trvalá nálada (Domov) a krátký výraz z reakce (radost po správné odpovědi, povzbuzení po chybě)
  let nalada: Vyraz3D = "neutral", naladaOd = 0;
  let docasny: { v: Vyraz3D; do: number } | null = null;
  let chichot = -10;
  const RADOSTNE = new Set(["jasot", "radost", "poskok", "tanec", "salto", "pirueta", "disco", "breakdance", "hvezdne", "robot", "vlnka", "teleport", "rolnicky", "mavani"]);
  // Srdíčka při pohlazení
  const srdceTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d")!; x.translate(32, 35); x.beginPath(); x.moveTo(0, 15); x.bezierCurveTo(-30, -5, -15, -27, 0, -12); x.bezierCurveTo(15, -27, 30, -5, 0, 15); const gr = x.createLinearGradient(0, -25, 0, 15); gr.addColorStop(0, "#FF8FB8"); gr.addColorStop(1, "#F0457E"); x.fillStyle = gr; x.fill(); x.lineWidth = 3; x.strokeStyle = "rgba(255,255,255,.75)"; x.stroke(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const srdce: { s: THREE.Sprite; vx: number; zivot: number }[] = [];
  const pustSrdce = () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: srdceTex, transparent: true, depthWrite: false }));
    s.position.set((Math.random() - 0.5) * 0.6, model.root.position.y + 1.0, 0.6); s.scale.setScalar(0.001); scene.add(s);
    srdce.push({ s, vx: (Math.random() - 0.5) * 0.4, zivot: 0 });
  };
  let videt = true, bezi = false, raf = 0;
  // Pohyb těla z minulého snímku (pro pružiny doplňků)
  const minulaPoza = { y: 0, vy: 0, rY: 0, rX: 0, rZ: 0 };
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
    meritko.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan((camera.fov * Math.PI) / 360));
    vykresli(true);
  }

  function vykresli(vynutit = false) {
    const dt = Math.min(0.05, delta()); cas += dt;
    const klidne = !akce && !drag && Math.abs(vel) < 0.0005 && konfety.every((k) => !k.visible) && !docasny && srdce.length === 0 && cas - chichot > 0.7;
    if (!vynutit && klidne && mozn.setrne) return false;
    if (!vynutit && klidne && cas - posledniKresba < 1 / 30) return true;
    // Čas od minulého vykreslení (v klidu se kreslí jen 30× za sekundu)
    const dtK = posledniKresba < 0 ? dt : Math.min(0.05, cas - posledniKresba);
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
    if (cas > mrk) { mrkStart = cas; mrk = cas + 2.5 + Math.random() * 2.5; }
    const bl = mrkStart > 0 && cas - mrkStart < 0.16 ? 1 - 0.9 * Math.sin(((cas - mrkStart) / 0.16) * Math.PI) : 1;
    if (docasny && cas > docasny.do) docasny = null;
    const vyraz: Vyraz3D = cas - chichot < 0.8 ? "radost" : docasny ? docasny.v : nalada;
    look.x += (look.tx - look.x) * Math.min(1, dtK * 6); look.y += (look.ty - look.y) * Math.min(1, dtK * 6);
    const smutne = vyraz === "smutny", ospale = vyraz === "ospaly";
    const ob = animujOblicej(m.oblicej, { vyraz, lookX: smutne ? -0.1 : P.lx + look.x * 0.8, lookY: smutne ? -0.6 : ospale ? -0.3 : P.ly + look.y * 0.7, mrk: bl, tVyraz: cas - naladaOd }, dtK || 0.016);
    // ťuknutí: zmáčknutí; nálada: náklon a kolébání (ospalý)
    const tc = cas - chichot, zm = tc < 0.6 ? Math.exp(-tc * 7) * Math.cos(tc * 26) * 0.14 : 0;
    const sy2 = P.sy - zm, sx2 = 1 / Math.sqrt(sy2); m.hips.scale.set(sx2, sy2, sx2);
    m.body.rotation.z = P.rZ + ob.naklon + ob.kyv * Math.sin(cas * 1.1) * 0.08;
    const odTela = m.rucePlne ? 0.32 : 0.08;
    m.armL.rotation.z = -(P.aL + odTela); m.armR.rotation.z = P.aR + odTela + (vyraz === "povzbuzeni" && !akce ? 1.4 + Math.sin(cas * 6) * 0.25 : 0);
    if (!m.mouth.userData.rovna && m.mouth.visible) { m.mouth.scale.y = P.usta; m.mouth.position.y = -0.24 - (1 - P.usta) * 0.05; }
    m.root.rotation.x = P.rX - look.y * 0.1; m.root.rotation.y = userRot + P.rY + look.x * 0.3;
    for (let i = srdce.length - 1; i >= 0; i--) {
      const h = srdce[i]; h.zivot += dt; h.s.position.x += h.vx * dt; h.s.position.y += 0.8 * dt;
      const q = h.zivot / 1.5; h.s.scale.setScalar(0.28 * Math.min(1, q * 6)); (h.s.material as THREE.SpriteMaterial).opacity = 1 - Math.max(0, (q - 0.6) / 0.4);
      if (h.zivot > 1.5) { scene.remove(h.s); h.s.material.dispose(); srdce.splice(i, 1); }
    }
    // Doplňky: pružiny reagují na zrychlení a otáčení těla
    if (dtK > 0) {
      const rYted = userRot + P.rY, vy = (P.y - minulaPoza.y) / dtK;
      m.aktualizuj({
        ay: Math.max(-40, Math.min(40, (vy - minulaPoza.vy) / dtK)),
        wy: Math.max(-14, Math.min(14, (rYted - minulaPoza.rY) / dtK)),
        wx: Math.max(-14, Math.min(14, (P.rX - minulaPoza.rX) / dtK)),
        wz: Math.max(-6, Math.min(6, (P.rZ - minulaPoza.rZ) / dtK)),
        cas, dt: dtK,
      });
      minulaPoza.y = P.y; minulaPoza.vy = vy; minulaPoza.rY = rYted; minulaPoza.rX = P.rX; minulaPoza.rZ = P.rZ;
    }
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

  // Otáčení tažením (svislý posun stránky zůstává, viz touch-action v CSS); bez otáčení tažení pohladí
  let ujeto = 0, dolX = 0, dolY = 0, posledniSrdce = 0;
  const dolu = (e: PointerEvent) => { drag = true; lastX = e.clientX; dolX = e.clientX; dolY = e.clientY; ujeto = 0; posledni = cas; try { canvas.setPointerCapture(e.pointerId); } catch { /* */ } spust(); };
  const pohybUkazatele = (e: PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - lastX; lastX = e.clientX;
    ujeto += Math.hypot(e.clientX - dolX, e.clientY - dolY); dolX = e.clientX; dolY = e.clientY;
    if (mozn.otacet) { userRot += dx * 0.012; vel = dx * 0.012; posledni = cas; }
    else if (mozn.mazlit && ujeto > 40 && cas - posledniSrdce > 0.22) { posledniSrdce = cas; chichot = cas - 0.3; pustSrdce(); spust(); }
  };
  const nahoru = () => {
    if (drag && ujeto < 12 && (mozn.mazlit || mozn.otacet)) {
      chichot = cas; const r = (["poskok", "pirueta", "jasot"] as const)[Math.floor(Math.random() * 3)]; akce = { id: r, start: cas, vyhozeno: true }; spust();
    }
    drag = false;
  };
  if (mozn.otacet || mozn.mazlit) {
    canvas.addEventListener("pointerdown", dolu);
    canvas.addEventListener("pointermove", pohybUkazatele);
    canvas.addEventListener("pointerup", nahoru);
    canvas.addEventListener("pointercancel", nahoru);
  }
  // Oči a hlava sledují kurzor nebo prst kdekoli na stránce
  const sleduj = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect(); if (!r.width) return;
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.42, d = Math.max(240, r.width * 1.4);
    look.tx = Math.max(-1, Math.min(1, (e.clientX - cx) / d)); look.ty = Math.max(-1, Math.min(1, -(e.clientY - cy) / d));
    if (!mozn.setrne && Math.abs(e.clientY - cy) < window.innerHeight) spust();
  };
  window.addEventListener("pointermove", sleduj, { passive: true });

  velikost();
  spust();

  return {
    nastav(p, e, sl = {}) {
      scene.remove(model.root); scene.remove(model.stin); scene.remove(model.okoli); model.dispose();
      model = postavHexika(p, e, meritko, sl);
      scene.add(model.root); scene.add(model.stin); scene.add(model.okoli);
      nastavSvit(); vykresli(true); spust();
    },
    reaguj(animace) {
      if (!jeReakce3D(animace)) return;
      akce = { id: animace, start: cas, vyhozeno: false };
      if (RADOSTNE.has(animace)) docasny = { v: "radost", do: cas + Math.min(2.4, DELKA[animace] + 0.4) };
      if (animace === "povzbud") docasny = { v: "povzbuzeni", do: cas + 2.4 };
      spust();
    },
    nalada(v) { if (v !== nalada) { nalada = v; naladaOd = cas; spust(); } },
    velikost,
    znic() {
      cancelAnimationFrame(raf); io?.disconnect(); ro?.disconnect();
      document.removeEventListener("visibilitychange", naViditelnost);
      canvas.removeEventListener("pointerdown", dolu); canvas.removeEventListener("pointermove", pohybUkazatele);
      canvas.removeEventListener("pointerup", nahoru); canvas.removeEventListener("pointercancel", nahoru);
      window.removeEventListener("pointermove", sleduj);
      srdce.forEach((h) => { scene.remove(h.s); h.s.material.dispose(); }); srdceTex.dispose();
      model.dispose(); kGeo.dispose(); konfety.forEach((k) => (k.material as THREE.Material).dispose());
      envRT.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
