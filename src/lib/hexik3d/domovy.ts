/**
 * Domovy Hexíka: 3D místa, kam se Hexík nastěhuje za dokončenou sadu (pravidla sad 19. 11. 2026).
 * Vánoční pokojíček (krb, stromeček se světýlky, okno se sněhem, dárky, koberec, křeslo), Synthwave (Ulice), Podmořský svět (Pod mořem) a Polární záře (Zima).
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

export type DruhDomova = "vanocni-pokojicek" | "synthwave" | "podmorsky-svet" | "polarni-zare";

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
  mlha?: THREE.Fog;
  svetlo?: (s: ReturnType<typeof svetla>) => void;
  dispose: () => void;
}

function hvezdy(n: number, r: number, vel: number, barva = "#FFFFFF", hore = true) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * Math.PI * 2, v = hore ? Math.random() * 0.9 + 0.08 : Math.random() * 2 - 1;
    const rr = r * (0.8 + Math.random() * 0.2);
    pos.set([Math.cos(u) * Math.cos(v * Math.PI / 2) * rr, Math.sin(v * Math.PI / 2) * rr, Math.sin(u) * Math.cos(v * Math.PI / 2) * rr], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: barva, size: vel, sizeAttenuation: true, transparent: true, opacity: 0.9, depthWrite: false }));
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

// Synthwave, Podmoří a Polární záře: scény z mockupu revize odměn (docs/gamifikace-2026-11/revize-odmen/odmeny3d.ts)
function stavSynthwave(): Prostredi {
  const g = new THREE.Group(); const veci: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  const pozadi = nebe([[0, "#0B0326"], [0.45, "#3B0B5E"], [0.62, "#B3226E"], [0.66, "#FF7A59"], [1, "#12001F"]]); veci.push(pozadi);
  // slunce s pruhy
  const sl = cTex(256, 256, (x) => { const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, "#FFE36E"); gr.addColorStop(0.6, "#FF6F91"); gr.addColorStop(1, "#C2187A"); x.fillStyle = gr; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill(); x.globalCompositeOperation = "destination-out"; for (let i = 0; i < 7; i++) x.fillRect(0, 150 + i * 16, 256, 3 + i * 1.6); });
  veci.push(sl);
  const slunce = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), new THREE.MeshBasicMaterial({ map: sl, transparent: true, fog: false })); slunce.position.set(0, 2.2, -24); g.add(slunce);
  veci.push(slunce.geometry, slunce.material as THREE.Material);
  // hory
  const horyMat = new THREE.MeshBasicMaterial({ color: "#2A0A45", fog: false }); veci.push(horyMat);
  const horyDrat = new THREE.MeshBasicMaterial({ color: "#FF3FD0", wireframe: true, transparent: true, opacity: 0.55, fog: false }); veci.push(horyDrat);
  for (let i = 0; i < 9; i++) { const h = 2 + Math.random() * 3; const geo = new THREE.ConeGeometry(2 + Math.random() * 2, h, 4); veci.push(geo); const x = -16 + i * 4 + Math.random(); const m1 = new THREE.Mesh(geo, horyMat); m1.position.set(x, -1.2 + h / 2, -20); const m2 = new THREE.Mesh(geo, horyDrat); m2.position.copy(m1.position); m2.scale.setScalar(1.01); g.add(m1, m2); }
  // mřížka podlahy, posouvá se k nám
  const mriz = cTex(128, 128, (x) => { x.fillStyle = "#14002A"; x.fillRect(0, 0, 128, 128); x.strokeStyle = "#FF2BD6"; x.lineWidth = 4; x.shadowColor = "#FF2BD6"; x.shadowBlur = 8; x.strokeRect(0, 0, 128, 128); }, [24, 24]);
  veci.push(mriz);
  const podl = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ map: mriz })); podl.rotation.x = -Math.PI / 2; podl.position.y = -1.21; g.add(podl);
  veci.push(podl.geometry, podl.material as THREE.Material);
  // palmy (siluety)
  const palMat = new THREE.MeshBasicMaterial({ color: "#12001F", fog: false }); veci.push(palMat);
  for (const sx of [-1, 1]) {
    const p = new THREE.Group(); p.position.set(sx * 5.5, -1.2, -7); g.add(p);
    const kmen = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 4.2, 6), palMat); kmen.position.y = 2.1; kmen.rotation.z = sx * 0.12; p.add(kmen); veci.push(kmen.geometry);
    for (let i = 0; i < 7; i++) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.3), palMat); veci.push(l.geometry); const a = (i / 7) * Math.PI * 2; l.position.set(Math.cos(a) * 0.8 + sx * 0.25, 4.15 - Math.abs(Math.sin(a)) * 0.1, Math.sin(a) * 0.8); l.rotation.set(0, -a, -0.45); p.add(l); }
  }
  const hv = hvezdy(220, 40, 0.18, "#FFD6FF"); veci.push(hv.geometry, hv.material as THREE.Material); g.add(hv);
  return {
    g, pozadi, mlha: new THREE.Fog("#3B0B5E", 8, 30), kamera: { z: 11, y: 1.1, look: 0.9 },
    svetlo: (s) => { s.rim.color.set("#FF3FD0"); s.rim.intensity = 2.6; s.fill.color.set("#3DF5FF"); s.fill.intensity = 1.2; },
    krok: (cas) => { mriz.offset.y = (cas * 0.9) % 1; },
    dispose: () => veci.forEach((v) => v.dispose()),
  };
}

function stavPodmori(): Prostredi {
  const g = new THREE.Group(); const veci: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  const pozadi = nebe([[0, "#5ED3F3"], [0.35, "#1A8DC9"], [1, "#062A57"]]); veci.push(pozadi);
  const pisek = cTex(256, 256, (x) => { x.fillStyle = "#E9CF97"; x.fillRect(0, 0, 256, 256); for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${150 + Math.random() * 80},${120 + Math.random() * 60},70,.35)`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); } }, [6, 6]);
  veci.push(pisek);
  const pg = new THREE.PlaneGeometry(40, 40, 60, 60); const pp = pg.attributes.position;
  for (let i = 0; i < pp.count; i++) pp.setZ(i, Math.sin(pp.getX(i) * 0.6) * 0.12 + Math.cos(pp.getY(i) * 0.5) * 0.12 + (Math.abs(pp.getY(i)) > 6 ? (Math.abs(pp.getY(i)) - 6) * 0.25 : 0));
  pg.computeVertexNormals(); veci.push(pg);
  const dno = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ map: pisek, roughness: 1 })); dno.rotation.x = -Math.PI / 2; dno.position.y = -1.25; g.add(dno); veci.push(dno.material as THREE.Material);
  // řasy (segmenty, kývají se)
  const rasy: { g: THREE.Group; f: number }[] = [];
  const rasaMat = new THREE.MeshStandardMaterial({ color: "#2FB36B", roughness: 0.7, side: THREE.DoubleSide }); veci.push(rasaMat);
  const segG = new THREE.CapsuleGeometry(0.07, 0.34, 3, 6); veci.push(segG);
  for (let i = 0; i < 16; i++) {
    const a = Math.PI + (i / 15) * Math.PI + (Math.random() - 0.5) * 0.2, r = 3 + Math.random() * 3;
    let rodic: THREE.Object3D = new THREE.Group(); (rodic as THREE.Group).position.set(Math.cos(a) * r * 1.4, -1.25, Math.sin(a) * r - 0.5); g.add(rodic);
    const zaklad = rodic as THREE.Group;
    const n = 5 + Math.floor(Math.random() * 5);
    for (let k = 0; k < n; k++) { const s = new THREE.Group(); s.position.y = k === 0 ? 0 : 0.38; const m = new THREE.Mesh(segG, rasaMat); m.position.y = 0.19; s.add(m); rodic.add(s); rodic = s; }
    rasy.push({ g: zaklad, f: Math.random() * 6 });
  }
  // korály a kameny
  const KOR = ["#FF6F91", "#FF9F45", "#B07CFF", "#FFD45A"];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.MeshStandardMaterial({ color: KOR[i % 4], roughness: 0.6 }); veci.push(m);
    const k = new THREE.Group(); const a = Math.PI + Math.random() * Math.PI, r = 2.6 + Math.random() * 3; k.position.set(Math.cos(a) * r * 1.3, -1.25, Math.sin(a) * r - 0.5); g.add(k);
    for (let j = 0; j < 6; j++) { const geo = new THREE.SphereGeometry(0.12 + Math.random() * 0.12, 10, 8); veci.push(geo); const b = new THREE.Mesh(geo, m); b.position.set((Math.random() - 0.5) * 0.5, Math.random() * 0.5, (Math.random() - 0.5) * 0.5); k.add(b); }
  }
  const kamMat = new THREE.MeshStandardMaterial({ color: "#7D8A99", roughness: 0.9, flatShading: true }); veci.push(kamMat);
  for (let i = 0; i < 6; i++) { const geo = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.4); veci.push(geo); const k = new THREE.Mesh(geo, kamMat); const a = Math.random() * Math.PI * 2; k.position.set((i % 2 ? 1 : -1) * (2.4 + Math.random() * 3), -1.15, -1.5 - Math.random() * 3); k.scale.y = 0.6; g.add(k); }
  // rybky
  const ryby: { m: THREE.Group; r: number; v: number; y: number; f: number }[] = [];
  const RB = ["#FFB020", "#FF5E7E", "#4DE0FF"];
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: RB[i % 3], roughness: 0.4 }); veci.push(mat);
    const t = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), mat); t.scale.set(1.5, 1, 0.6); m.add(t); veci.push(t.geometry);
    const ocas = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 4), mat); ocas.rotation.z = Math.PI / 2; ocas.position.x = -0.3; m.add(ocas); veci.push(ocas.geometry);
    g.add(m); ryby.push({ m, r: 2.2 + Math.random() * 2.5, v: 0.25 + Math.random() * 0.3, y: Math.random() * 2.4 - 0.2, f: Math.random() * 6 });
  }
  // paprsky světla
  const papMat = new THREE.MeshBasicMaterial({ color: "#BFF4FF", transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }); veci.push(papMat);
  const paprsky: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) { const geo = new THREE.ConeGeometry(0.9, 9, 12, 1, true); veci.push(geo); const p = new THREE.Mesh(geo, papMat); p.position.set(-4 + i * 2, 3.2, -3 - (i % 2)); p.rotation.z = 0.25; g.add(p); paprsky.push(p); }
  // bubliny
  const nB = 60, bPos = new Float32Array(nB * 3);
  for (let i = 0; i < nB; i++) bPos.set([(Math.random() - 0.5) * 8, Math.random() * 6 - 1.2, (Math.random() - 0.5) * 6 - 1], i * 3);
  const bG = new THREE.BufferGeometry(); bG.setAttribute("position", new THREE.BufferAttribute(bPos, 3)); veci.push(bG);
  const bub = cTex(64, 64, (x) => { x.strokeStyle = "rgba(255,255,255,.95)"; x.lineWidth = 4; x.beginPath(); x.arc(32, 32, 26, 0, Math.PI * 2); x.stroke(); x.fillStyle = "rgba(255,255,255,.8)"; x.beginPath(); x.arc(22, 22, 6, 0, Math.PI * 2); x.fill(); }); veci.push(bub);
  const bubMat = new THREE.PointsMaterial({ map: bub, size: 0.16, transparent: true, depthWrite: false }); veci.push(bubMat);
  g.add(new THREE.Points(bG, bubMat));
  return {
    g, pozadi, mlha: new THREE.Fog("#0F5E95", 7, 20), kamera: { z: 10.5, y: 1.0, look: 0.7 },
    svetlo: (s) => { s.key.color.set("#CFF6FF"); s.rim.color.set("#4DE0FF"); s.rim.intensity = 2; },
    krok: (cas, dt) => {
      rasy.forEach((r) => { let s: THREE.Object3D | undefined = r.g.children[0]; let k = 0; while (s) { s.rotation.z = Math.sin(cas * 1.3 + r.f + k * 0.5) * 0.16; s.rotation.x = Math.cos(cas * 1.1 + r.f + k * 0.4) * 0.1; s = s.children.find((c) => c instanceof THREE.Group); k++; } });
      ryby.forEach((f) => { const a = cas * f.v + f.f; f.m.position.set(Math.cos(a) * f.r, f.y + Math.sin(cas * 1.4 + f.f) * 0.15, Math.sin(a) * f.r * 0.6 - 1.5); f.m.rotation.y = -a - Math.PI / 2; });
      for (let i = 0; i < nB; i++) { let y = bPos[i * 3 + 1] + dt * (0.4 + (i % 4) * 0.12); if (y > 5) y = -1.2; bPos[i * 3 + 1] = y; bPos[i * 3] += Math.sin(cas * 2 + i) * 0.002; }
      bG.attributes.position.needsUpdate = true;
      paprsky.forEach((p, i) => { (p.material as THREE.MeshBasicMaterial).opacity = 0.06 + 0.03 * Math.sin(cas * 0.8 + i); });
    },
    dispose: () => veci.forEach((v) => v.dispose()),
  };
}

function stavPolarni(): Prostredi {
  const g = new THREE.Group(); const veci: (THREE.BufferGeometry | THREE.Material | THREE.Texture)[] = [];
  const pozadi = nebe([[0, "#020617"], [0.55, "#0B1E3F"], [0.8, "#123C5C"], [1, "#0B1A2C"]]); veci.push(pozadi);
  const hv = hvezdy(400, 40, 0.14); veci.push(hv.geometry, hv.material as THREE.Material); g.add(hv);
  // sněhové kopce
  const kg = new THREE.PlaneGeometry(60, 40, 80, 50); const kp = kg.attributes.position;
  for (let i = 0; i < kp.count; i++) { const x = kp.getX(i), y = kp.getY(i); kp.setZ(i, Math.max(0, -y - 4) * 0.25 * (1 + Math.sin(x * 0.3) * 0.6) + Math.sin(x * 0.7 + y) * 0.06); }
  kg.computeVertexNormals(); veci.push(kg);
  const snihMat = new THREE.MeshStandardMaterial({ color: "#EAF4FF", roughness: 0.85 }); veci.push(snihMat);
  const kopce = new THREE.Mesh(kg, snihMat); kopce.rotation.x = -Math.PI / 2; kopce.position.y = -1.22; g.add(kopce);
  // smrky
  const smrkMat = new THREE.MeshStandardMaterial({ color: "#123A34", roughness: 0.9, flatShading: true }); veci.push(smrkMat);
  const snehCap = new THREE.MeshStandardMaterial({ color: "#F4FAFF", roughness: 0.8, flatShading: true }); veci.push(snehCap);
  for (let i = 0; i < 14; i++) {
    const t = new THREE.Group(); const sx = i % 2 ? 1 : -1; t.position.set(sx * (3 + Math.random() * 6), -1.2, -3 - Math.random() * 10); const s = 0.7 + Math.random() * 0.9; t.scale.setScalar(s); g.add(t);
    [[0.9, 1.3, 0.8], [0.7, 1.1, 1.5], [0.45, 0.9, 2.1]].forEach(([r, h, y]) => { const geo = new THREE.ConeGeometry(r, h, 7); veci.push(geo); const c = new THREE.Mesh(geo, smrkMat); c.position.y = y; t.add(c); const cap = new THREE.Mesh(geo, snehCap); cap.scale.set(0.75, 0.35, 0.75); cap.position.y = y + h * 0.3; t.add(cap); });
  }
  // polární záře: pruhy se shaderem
  const zare: THREE.ShaderMaterial[] = [];
  for (let i = 0; i < 3; i++) {
    const geo = new THREE.PlaneGeometry(36, 7, 120, 1); veci.push(geo);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uCas: { value: 0 }, uF: { value: i * 1.7 }, uA: { value: new THREE.Color(["#3DFFB4", "#47E6FF", "#B07CFF"][i]) }, uB: { value: new THREE.Color(["#B07CFF", "#3DFFB4", "#FF6FD8"][i]) } },
      vertexShader: `uniform float uCas; uniform float uF; varying vec2 vUv; void main(){ vUv=uv; vec3 p=position; p.z += sin(p.x*0.25+uCas*0.5+uF)*2.0; p.y += sin(p.x*0.4+uCas*0.7+uF)*0.6; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
      fragmentShader: `uniform float uCas; uniform float uF; uniform vec3 uA; uniform vec3 uB; varying vec2 vUv; void main(){ float sv = smoothstep(0.0,0.25,vUv.y)*smoothstep(1.0,0.35,vUv.y); float zav = 0.55+0.45*sin(vUv.x*40.0+uCas*1.5+uF*3.0)*sin(vUv.x*9.0-uCas*0.6); vec3 c = mix(uA,uB,vUv.y); float a = sv*zav*1.1*smoothstep(0.0,0.15,vUv.x)*smoothstep(1.0,0.85,vUv.x); gl_FragColor=vec4(c*a,a); }`,
    });
    zare.push(mat); veci.push(mat);
    const m = new THREE.Mesh(geo, mat); m.position.set(0, 5.5 + i * 0.9, -15 - i * 2); m.rotation.x = 0.2; g.add(m);
  }
  // padající sníh
  const nS = 140, sPos = new Float32Array(nS * 3);
  for (let i = 0; i < nS; i++) sPos.set([(Math.random() - 0.5) * 14, Math.random() * 7 - 1.2, (Math.random() - 0.5) * 10], i * 3);
  const sG = new THREE.BufferGeometry(); sG.setAttribute("position", new THREE.BufferAttribute(sPos, 3)); veci.push(sG);
  const sMat = new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.05, transparent: true, opacity: 0.85, depthWrite: false }); veci.push(sMat);
  g.add(new THREE.Points(sG, sMat));
  return {
    g, pozadi, mlha: new THREE.Fog("#0B1E3F", 12, 32), kamera: { z: 11, y: 1.0, look: 1.4 },
    svetlo: (s) => { s.key.color.set("#BFE8FF"); s.key.intensity = 1.1; s.rim.color.set("#3DFFB4"); s.rim.intensity = 2.4; },
    krok: (cas, dt) => {
      zare.forEach((z) => { z.uniforms.uCas.value = cas; });
      for (let i = 0; i < nS; i++) { let y = sPos[i * 3 + 1] - dt * (0.35 + (i % 5) * 0.08); if (y < -1.2) y = 5.8; sPos[i * 3 + 1] = y; sPos[i * 3] += Math.sin(cas * 0.8 + i) * 0.003; }
      sG.attributes.position.needsUpdate = true;
    },
    dispose: () => veci.forEach((v) => v.dispose()),
  };
}

const STAVITELE: Record<DruhDomova, () => Prostredi> = { "vanocni-pokojicek": stavPokojicek, synthwave: stavSynthwave, "podmorsky-svet": stavPodmori, "polarni-zare": stavPolarni };

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
  scene.add(prost.g); scene.background = prost.pozadi; scene.fog = prost.mlha ?? null; prost.svetlo?.(sv);
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
