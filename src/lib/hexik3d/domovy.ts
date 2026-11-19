/**
 * Domovy Hexíka: 3D místa, kam se Hexík nastěhuje za dokončenou sadu (pravidla sad 19. 11. 2026).
 * Zatím Vánoční pokojíček (krb, stromeček se světýlky, okno se sněhem, dárky, koberec, křeslo).
 * Scéna je převzatá z mockupu docs/gamifikace-2026-11/revize-odmen/odmeny3d.ts; další domovy (Synthwave,
 * Podmoří, Polární záře…) přijdou v lednu stejným způsobem do STAVITELE.
 *
 * Kreslí se jen, když je plátno vidět. Na slabém zařízení nebo bez grafické karty jeden statický snímek.
 * Ťuknutí na Hexíka = poskok s radostí, na stromeček = rozblikají se světýlka.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { postavHexika, type HexikModel, type SlotyHexika } from "./model";
import { animujOblicej, type Vyraz3D } from "./oblicej";
import { slabeZarizeni, softwarove } from "./studio";

export type DruhDomova = "vanocni-pokojicek";

export interface Domov3D {
  /** Přestaví Hexíka (jiná podoba, etapa nebo doplňky a efekt sady). */
  nastav: (podoba: string, etapa: number, sloty?: SlotyHexika) => void;
  /** Hexík se raduje (po dokončení sady). */
  oslava: () => void;
  znic: () => void;
}

function svetla(scene: THREE.Scene, renderer: THREE.WebGLRenderer, env = 0.55) {
  const pm = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const rt = pm.fromScene(room, 0.035);
  scene.environment = rt.texture; scene.environmentIntensity = env;
  room.dispose(); pm.dispose();
  scene.add(new THREE.HemisphereLight("#FFFFFF", "#26296A", 0.45));
  const key = new THREE.DirectionalLight("#FFF1DE", 1.5); key.position.set(3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight("#A898FF", 1.6); rim.position.set(-4, 3, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight("#9FC4FF", 0.6); fill.position.set(-5, 1, 3); scene.add(fill);
  return { key, rim, fill, rt };
}

const cTex = (w: number, h: number, kresli: (x: CanvasRenderingContext2D) => void, opak?: [number, number]) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; kresli(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  if (opak) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opak); }
  t.anisotropy = 4; return t;
};

const nebe = (barvy: [number, string][]) => cTex(16, 256, (x) => {
  const g = x.createLinearGradient(0, 0, 0, 256); barvy.forEach(([o, b]) => g.addColorStop(o, b)); x.fillStyle = g; x.fillRect(0, 0, 16, 256);
});

interface Prostredi {
  g: THREE.Group;
  krok: (cas: number, dt: number) => void;
  kamera: { z: number; y: number; look: number };
  klik?: (o: THREE.Object3D, cas: number) => boolean;
  pozadi: THREE.Texture | THREE.Color;
  svetlo?: (s: ReturnType<typeof svetla>) => void;
  dispose: () => void;
}

function stavPokojicek(): Prostredi {
  const g = new THREE.Group(); const veci: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  const M = <T extends THREE.Material>(m: T) => { veci.push(m); return m; };
  const G = <T extends THREE.BufferGeometry>(x: T) => { veci.push(x); return x; };
  // Podlaha z prken
  const prkna = cTex(256, 256, (x) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? "#B9814E" : "#C68D58"; x.fillRect(0, i * 32, 256, 32); x.fillStyle = "rgba(60,30,10,.35)"; x.fillRect(0, i * 32, 256, 2); x.fillRect((i * 97) % 256, i * 32, 2, 32); } }, [2, 2]);
  veci.push(prkna);
  const podlaha = new THREE.Mesh(G(new THREE.PlaneGeometry(16, 10)), M(new THREE.MeshStandardMaterial({ map: prkna, roughness: 0.75 })));
  podlaha.rotation.x = -Math.PI / 2; podlaha.position.set(2.5, -1.2, 1); g.add(podlaha);
  // Tapeta s vánočním vzorem
  const tapeta = cTex(256, 256, (x) => { x.fillStyle = "#8E2F3C"; x.fillRect(0, 0, 256, 256); x.fillStyle = "#A63A48"; for (let i = 0; i < 256; i += 32) x.fillRect(i, 0, 14, 256); x.fillStyle = "rgba(255,230,180,.55)"; x.font = "22px serif"; for (let y = 16; y < 256; y += 64) for (let xx = 8; xx < 256; xx += 64) x.fillText("✦", xx + ((y / 64) % 2) * 32, y + 12); }, [3, 1.6]);
  veci.push(tapeta);
  const stenaMat = M(new THREE.MeshStandardMaterial({ map: tapeta, roughness: 0.9 }));
  const zadni = new THREE.Mesh(G(new THREE.PlaneGeometry(16, 4.6)), stenaMat); zadni.position.set(2.5, 1.1, -4); g.add(zadni);
  const leva = new THREE.Mesh(G(new THREE.PlaneGeometry(7, 4.6)), stenaMat); leva.rotation.y = Math.PI / 2; leva.position.set(-4.5, 1.1, -0.5); g.add(leva);
  const lista = M(new THREE.MeshStandardMaterial({ color: "#F4E6D0", roughness: 0.6 }));
  const l1 = new THREE.Mesh(G(new THREE.BoxGeometry(16, 0.22, 0.08)), lista); l1.position.set(2.5, -1.09, -3.96); g.add(l1);
  // Okno se sněhem venku
  const okno = new THREE.Group(); okno.position.set(1.6, 1.1, -3.98); g.add(okno);
  const nebeTex = nebe([[0, "#0B1640"], [0.7, "#24407A"], [1, "#DDE8FF"]]); veci.push(nebeTex);
  okno.add(new THREE.Mesh(G(new THREE.PlaneGeometry(1.8, 1.5)), M(new THREE.MeshBasicMaterial({ map: nebeTex }))));
  const ram = M(new THREE.MeshStandardMaterial({ color: "#F7F1E6", roughness: 0.5 }));
  for (const [w, h, x, y] of [[1.96, 0.1, 0, 0.8], [1.96, 0.14, 0, -0.8], [0.1, 1.7, -0.93, 0], [0.1, 1.7, 0.93, 0], [0.06, 1.5, 0, 0], [1.8, 0.06, 0, 0]] as const) {
    const b = new THREE.Mesh(G(new THREE.BoxGeometry(w, h, 0.1)), ram); b.position.set(x, y, 0.04); okno.add(b);
  }
  const parapet = new THREE.Mesh(G(new THREE.BoxGeometry(2.2, 0.08, 0.36)), ram); parapet.position.set(0, -0.86, 0.16); okno.add(parapet);
  const nSn = 90, snPos = new Float32Array(nSn * 3);
  for (let i = 0; i < nSn; i++) snPos.set([(Math.random() - 0.5) * 1.7, (Math.random() - 0.5) * 1.4, -0.05], i * 3);
  const snG = G(new THREE.BufferGeometry()); snG.setAttribute("position", new THREE.BufferAttribute(snPos, 3));
  const snih = new THREE.Points(snG, M(new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.035, transparent: true, opacity: 0.9 }))); snih.position.z = 0.02; okno.add(snih);
  // Krb vlevo
  const krb = new THREE.Group(); krb.position.set(-4.4, -1.2, -1.2); krb.rotation.y = Math.PI / 2; g.add(krb);
  const cihly = cTex(128, 128, (x) => { x.fillStyle = "#7A3B2A"; x.fillRect(0, 0, 128, 128); x.fillStyle = "#9A4E36"; for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) x.fillRect(c * 32 + (r % 2) * 16 + 2, r * 16 + 2, 28, 12); }, [2, 2]);
  veci.push(cihly);
  const krbMat = M(new THREE.MeshStandardMaterial({ map: cihly, roughness: 0.9 }));
  const telo = new THREE.Mesh(G(new THREE.BoxGeometry(2.2, 1.9, 0.6)), krbMat); telo.position.set(0, 0.95, 0.3); krb.add(telo);
  const rimsa = new THREE.Mesh(G(new THREE.BoxGeometry(2.5, 0.14, 0.8)), M(new THREE.MeshStandardMaterial({ color: "#5B3A26", roughness: 0.6 }))); rimsa.position.set(0, 1.95, 0.35); krb.add(rimsa);
  const otvor = new THREE.Mesh(G(new THREE.PlaneGeometry(1.1, 0.9)), M(new THREE.MeshBasicMaterial({ color: "#1A0A05" }))); otvor.position.set(0, 0.55, 0.61); krb.add(otvor);
  const ohenMat = M(new THREE.MeshBasicMaterial({ color: "#FFB040", transparent: true, opacity: 0.95 }));
  const ohenMat2 = M(new THREE.MeshBasicMaterial({ color: "#FF6A1A", transparent: true, opacity: 0.9 }));
  const plameny: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(G(new THREE.ConeGeometry(0.13 + (i % 2) * 0.05, 0.5, 8)), i % 2 ? ohenMat : ohenMat2); f.position.set(-0.27 + i * 0.18, 0.4, 0.66); krb.add(f); plameny.push(f); }
  const ohen = new THREE.PointLight("#FF8A3D", 6, 6, 1.6); ohen.position.set(0, 0.6, 1.1); krb.add(ohen);
  // Punčochy na římse
  for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(G(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8)), M(new THREE.MeshStandardMaterial({ color: ["#D8343F", "#2E8B57", "#F4F0E8"][i], roughness: 0.8 }))); p.position.set(-0.6 + i * 0.6, 1.62, 0.8); krb.add(p); }
  // Stromeček se světýlky
  const strom = new THREE.Group(); strom.position.set(-2.6, -1.2, -2.9); g.add(strom);
  const jehl = M(new THREE.MeshStandardMaterial({ color: "#1F7A4A", roughness: 0.75, flatShading: true }));
  [[1.25, 1.2, 0.9], [1.0, 1.0, 1.6], [0.72, 0.9, 2.25], [0.42, 0.7, 2.8]].forEach(([r, h, y]) => { const c = new THREE.Mesh(G(new THREE.ConeGeometry(r, h, 9)), jehl); c.position.y = y; strom.add(c); });
  const kmen = new THREE.Mesh(G(new THREE.CylinderGeometry(0.14, 0.18, 0.5, 8)), M(new THREE.MeshStandardMaterial({ color: "#6B4423" }))); kmen.position.y = 0.25; strom.add(kmen);
  const hvezda = new THREE.Mesh(G(new THREE.OctahedronGeometry(0.2)), M(new THREE.MeshStandardMaterial({ color: "#FFD45A", emissive: "#FFB000", emissiveIntensity: 1.2, metalness: 0.4, roughness: 0.3 }))); hvezda.position.y = 3.25; strom.add(hvezda);
  const svetylka: THREE.Mesh[] = []; const BARVY = ["#FF4D5E", "#FFD45A", "#4DD8FF", "#7CFF8A", "#FF8AE0"];
  const kulicka = G(new THREE.SphereGeometry(0.055, 8, 6));
  for (let i = 0; i < 34; i++) {
    const t = i / 34, y = 0.75 + t * 2.2, r = (1 - t) * 1.05 + 0.12, a = i * 2.4;
    const mat = M(new THREE.MeshStandardMaterial({ color: BARVY[i % 5], emissive: BARVY[i % 5], emissiveIntensity: 1.5 }));
    const b = new THREE.Mesh(kulicka, mat); b.position.set(Math.cos(a) * r, y, Math.sin(a) * r); strom.add(b); svetylka.push(b);
  }
  // Dárky
  const darky = new THREE.Group(); darky.position.set(-1.9, -1.2, -2.1); g.add(darky);
  ([["#3D7BFF", "#FFD45A", 0.5, 0, 0], ["#E0465B", "#FFFFFF", 0.38, 0.6, 0.3], ["#2FA36B", "#E0465B", 0.32, -0.3, 0.6]] as const).forEach(([b, s, v, x, z]) => {
    const box = new THREE.Mesh(G(new THREE.BoxGeometry(v, v, v)), M(new THREE.MeshStandardMaterial({ color: b, roughness: 0.5 }))); box.position.set(x, v / 2, z); box.rotation.y = x * 0.8; darky.add(box);
    const st = M(new THREE.MeshStandardMaterial({ color: s, roughness: 0.35, metalness: 0.2 }));
    box.add(new THREE.Mesh(G(new THREE.BoxGeometry(v * 1.02, v * 1.02, 0.06)), st));
    box.add(new THREE.Mesh(G(new THREE.BoxGeometry(0.06, v * 1.02, v * 1.02)), st));
  });
  // Koberec
  const koberecTex = cTex(256, 256, (x) => { for (let r = 128; r > 0; r -= 16) { x.fillStyle = (r / 16) % 2 ? "#E8DCC4" : "#C94C4C"; x.beginPath(); x.arc(128, 128, r, 0, Math.PI * 2); x.fill(); } }); veci.push(koberecTex);
  const koberec = new THREE.Mesh(G(new THREE.CircleGeometry(1.6, 40)), M(new THREE.MeshStandardMaterial({ map: koberecTex, roughness: 1 })));
  koberec.rotation.x = -Math.PI / 2; koberec.position.set(0, -1.19, 0); g.add(koberec);
  // Křeslo s dekou
  const kreslo = new THREE.Group(); kreslo.position.set(2.7, -1.2, -1.6); kreslo.rotation.y = -0.6; g.add(kreslo);
  const cal = M(new THREE.MeshStandardMaterial({ color: "#3C5BA9", roughness: 0.85 }));
  const sed = new THREE.Mesh(G(new THREE.BoxGeometry(1.3, 0.5, 1.2)), cal); sed.position.y = 0.45; kreslo.add(sed);
  const opera = new THREE.Mesh(G(new THREE.BoxGeometry(1.3, 1.1, 0.3)), cal); opera.position.set(0, 1.0, -0.45); kreslo.add(opera);
  const deka = new THREE.Mesh(G(new THREE.BoxGeometry(1.32, 0.06, 0.6)), M(new THREE.MeshStandardMaterial({ color: "#E8DCC4", roughness: 1 }))); deka.position.set(0, 0.72, 0.1); kreslo.add(deka);

  let blik = 0;
  return {
    g, pozadi: new THREE.Color("#2A0F17"),
    kamera: { z: 10.5, y: 1.4, look: 0.5 },
    svetlo: (s) => { s.key.intensity = 0.9; s.key.color.set("#FFE2BE"); s.rim.intensity = 0.8; s.rim.color.set("#FFB37A"); },
    krok: (cas, dt) => {
      for (let i = 0; i < nSn; i++) { let y = snPos[i * 3 + 1] - dt * (0.18 + (i % 5) * 0.04); if (y < -0.7) y = 0.7; snPos[i * 3 + 1] = y; snPos[i * 3] += Math.sin(cas + i) * 0.0008; }
      snG.attributes.position.needsUpdate = true;
      ohen.intensity = 5 + Math.sin(cas * 13) * 0.8 + Math.sin(cas * 7.3) * 0.6;
      plameny.forEach((f, i) => { f.scale.y = 0.85 + Math.sin(cas * 11 + i * 2) * 0.18; });
      svetylka.forEach((b, i) => { (b.material as THREE.MeshStandardMaterial).emissiveIntensity = blik > cas ? (Math.sin(cas * 18 + i) > 0 ? 2.4 : 0.2) : 1.1 + 0.6 * Math.sin(cas * 2.2 + i * 1.3); });
      hvezda.rotation.y += dt * 0.8;
    },
    klik: (o, cas) => { let p: THREE.Object3D | null = o; while (p) { if (p === strom) { blik = cas + 2.5; return true; } p = p.parent; } return false; },
    dispose: () => veci.forEach((v) => v.dispose()),
  };
}

const STAVITELE: Record<DruhDomova, () => Prostredi> = { "vanocni-pokojicek": stavPokojicek };

export function jeHotovyDomov(id: string): id is DruhDomova {
  return id in STAVITELE;
}

export function vytvorDomov(canvas: HTMLCanvasElement, druh: DruhDomova, podoba: string, etapa: number, sloty: SlotyHexika = {}): Domov3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  // Slabé zařízení nebo bez grafické karty: jeden statický snímek a menší rozlišení
  const staticky = slabeZarizeni() || softwarove(renderer);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, staticky ? 1 : 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  const sv = svetla(scene, renderer);
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 120);
  const meritko = { value: 400 };
  const prost = STAVITELE[druh]();
  scene.add(prost.g); scene.background = prost.pozadi; prost.svetlo?.(sv);
  let hx: HexikModel = postavHexika(podoba, etapa, meritko, sloty);
  const svit = new THREE.PointLight("#FFFFFF", 0, 6, 2); svit.position.set(0, 0.4, 2.4); scene.add(svit);
  const nasadHexika = () => { scene.add(hx.root, hx.stin, hx.okoli); svit.color.set(hx.svit ?? "#FFFFFF"); svit.intensity = hx.svit ? 2.5 : 0; };
  nasadHexika();
  // Zlatý kruh pod Hexíkem, když má efekt sady
  const kruhMat = new THREE.MeshBasicMaterial({ color: "#FFD45A", transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const kruhGeo = new THREE.RingGeometry(0.95, 1.12, 64);
  const kruh = new THREE.Mesh(kruhGeo, kruhMat); kruh.rotation.x = -Math.PI / 2; kruh.position.y = -1.17; scene.add(kruh);
  let maEfekt = !!sloty.okoli;

  let cas = 0, raf = 0, minule = performance.now(), videt = true;
  let rot = 0, cilRot = 0, drag = false, lastX = 0, ujeto = 0;
  let skok = -10, oslavaOd = -10, vyraz: Vyraz3D = "neutral", vyrazDo = 0;
  let mrk = 2, mrkStart = -1;
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();

  function velikost() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    meritko.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan((camera.fov * Math.PI) / 360));
    if (staticky) snimek(0);
  }
  function snimek(dtVynutit?: number) {
    const ted = performance.now(); const dt = dtVynutit ?? Math.min(0.05, (ted - minule) / 1000); minule = ted; cas += dt;
    if (!drag) cilRot *= 0.97;
    rot += (cilRot - rot) * 0.12;
    const k = prost.kamera, w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    // Úzké plátno: kamera dál, ať se pokoj vejde; hodně široké (počítač): blíž, ať není vidět za stěny
    const z = w / h < 1 ? k.z / Math.max(0.62, w / h) : w / h > 1.9 ? k.z * Math.max(0.62, 1.9 / (w / h)) : k.z;
    camera.position.set(Math.sin(rot) * z, k.y, Math.cos(rot) * z); camera.lookAt(0, k.look, 0);
    prost.krok(cas, dt);
    // Hexík: dýchání, poskok po ťuknutí, oslava
    const ts = cas - skok, to = cas - oslavaOd;
    let y = Math.sin(cas * 2) * 0.03, ry = Math.sin(cas * 0.6) * 0.15;
    if (ts < 0.7) y += Math.sin((ts / 0.7) * Math.PI) * 0.55;
    if (to < 2.2) { y += Math.abs(Math.sin(to * 5)) * 0.4 * (1 - to / 2.2); ry += to * 6.28 / 1.1 * Math.max(0, 1 - to / 1.1); }
    hx.root.position.y = y; hx.root.rotation.y = ry;
    hx.stin.scale.setScalar(Math.max(0.5, 1 - y * 0.4));
    if (cas > mrk) { mrkStart = cas; mrk = cas + 2.4 + Math.random() * 2.5; }
    const bl = mrkStart > 0 && cas - mrkStart < 0.16 ? 1 - 0.9 * Math.sin(((cas - mrkStart) / 0.16) * Math.PI) : 1;
    if (cas > vyrazDo) vyraz = "neutral";
    animujOblicej(hx.oblicej, { vyraz, lookX: Math.sin(cas * 0.5) * 0.3 - rot * 0.5, lookY: 0.05, mrk: bl, tVyraz: cas }, dt);
    const ruka = to < 2.2 ? 1.6 + Math.sin(cas * 10) * 0.3 : 0.12 + Math.sin(cas * 2) * 0.04;
    hx.armL.rotation.z = -(ruka + (hx.rucePlne ? 0.25 : 0)); hx.armR.rotation.z = ruka + (hx.rucePlne ? 0.25 : 0);
    hx.aktualizuj({ ay: 0, wx: 0, wy: 0, wz: 0, cas, dt });
    kruhMat.opacity = maEfekt ? 0.35 + 0.2 * Math.sin(cas * 3) : 0; kruh.scale.setScalar(1 + (to < 1.2 ? to * 0.6 : 0));
    renderer.render(scene, camera);
  }
  // Na slabém zařízení se smyčka spustí jen na chvíli po ťuknutí (poskok, světýlka), pak zase stojí
  let doKdy = Infinity;
  function smycka() {
    if (!videt || document.hidden || performance.now() > doKdy) { raf = 0; return; }
    snimek(); raf = requestAnimationFrame(smycka);
  }
  const spust = (naChvili = 0) => {
    if (staticky) { if (!naChvili) return; doKdy = performance.now() + naChvili; }
    if (!raf) { minule = performance.now(); raf = requestAnimationFrame(smycka); }
  };
  const io = new IntersectionObserver((z) => { videt = z.some((x) => x.isIntersecting); if (videt) spust(); }); io.observe(canvas);
  const ro = new ResizeObserver(velikost); ro.observe(canvas); velikost();
  const vis = () => { if (!document.hidden) spust(); }; document.addEventListener("visibilitychange", vis);

  const dolu = (e: PointerEvent) => { drag = true; lastX = e.clientX; ujeto = 0; try { canvas.setPointerCapture(e.pointerId); } catch { /* starší prohlížeč */ } };
  const pohyb = (e: PointerEvent) => { if (!drag) return; const dx = e.clientX - lastX; lastX = e.clientX; ujeto += Math.abs(dx); cilRot = Math.max(-0.7, Math.min(0.7, cilRot - dx * 0.006)); spust(1500); };
  const nahoru = (e: PointerEvent) => {
    if (drag && ujeto < 8) {
      const r = canvas.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ptr, camera);
      const zasah = ray.intersectObjects([hx.root, prost.g], true)[0];
      let jeHexik = false; let p: THREE.Object3D | null = zasah?.object ?? null; while (p) { if (p === hx.root) { jeHexik = true; break; } p = p.parent; }
      if (jeHexik) { skok = cas; vyraz = "radost"; vyrazDo = cas + 1.2; spust(1500); }
      else if (zasah && prost.klik?.(zasah.object, cas)) { vyraz = "prekvapeni"; vyrazDo = cas + 1; spust(3000); }
    }
    drag = false;
  };
  canvas.addEventListener("pointerdown", dolu); canvas.addEventListener("pointermove", pohyb); window.addEventListener("pointerup", nahoru);
  if (staticky) snimek(0); else spust();

  return {
    nastav(p, e, sl = {}) {
      scene.remove(hx.root, hx.stin, hx.okoli); hx.dispose();
      hx = postavHexika(p, e, meritko, sl); maEfekt = !!sl.okoli; nasadHexika();
      if (staticky) snimek(0); else spust();
    },
    oslava: () => { oslavaOd = cas; vyraz = "radost"; vyrazDo = cas + 2.4; spust(2600); },
    znic: () => {
      cancelAnimationFrame(raf); raf = 0; io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", vis);
      canvas.removeEventListener("pointerdown", dolu); canvas.removeEventListener("pointermove", pohyb); window.removeEventListener("pointerup", nahoru);
      prost.dispose(); hx.dispose(); sv.rt.dispose(); kruhGeo.dispose(); kruhMat.dispose(); renderer.dispose();
    },
  };
}
