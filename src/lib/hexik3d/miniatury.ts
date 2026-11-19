/**
 * 3D miniatury odměn (šatník, sady, cesta úrovní, kalendář).
 * Jeden sdílený renderer vykreslí Hexíka s odměnou do malého obrázku a uloží ho do paměti.
 * Mřížka pak ukazuje obyčejné obrázky (rychlé jako dřív). Renderer se po chvíli nečinnosti uvolní,
 * aby nedržel spojení s grafikou (prohlížeč jich dovolí jen pár najednou).
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { postavHexika } from "./model";
import { animujOblicej } from "./oblicej";
import { umi3D } from "./scena";
import { postavTruhlu, type DruhModelu } from "./truhla-model";
import type { Sklad } from "./doplnky";

/** „truhla“ = 3D model truhly (klíč = druh modelu z truhla-model.ts) pro obchod a kartu testu. */
export type DruhMiniatury = "podoba" | "hlava" | "oci" | "krk" | "ruce" | "nohy" | "truhla";

/** Záběr kamery pro každé místo na těle (cíl, vzdálenost, výška, natočení Hexíka). */
const RAMCE: Record<DruhMiniatury, { cil: [number, number, number]; z: number; y: number; rotY: number }> = {
  podoba: { cil: [0, 0.3, 0], z: 6.6, y: 0.5, rotY: -0.25 },
  hlava: { cil: [0, 1.22, 0], z: 4.9, y: 1.9, rotY: -0.35 },
  oci: { cil: [0, 0.42, 0], z: 3.3, y: 0.6, rotY: -0.3 },
  krk: { cil: [0, -0.1, 0], z: 3.8, y: 0.5, rotY: -0.3 },
  ruce: { cil: [0.85, -0.12, 0], z: 3.4, y: 0.3, rotY: -0.7 },
  nohy: { cil: [0, -0.9, 0], z: 3.6, y: 0.2, rotY: -0.3 },
  truhla: { cil: [0, 0.95, 0], z: 5.6, y: 2.2, rotY: -0.5 },
};

interface Pozadavek { druh: DruhMiniatury; klic: string; etapa: number; px: number; klicCache: string }

const hotove = new Map<string, string>();
const cekaji = new Map<string, ((url: string | null) => void)[]>();
const fronta: Pozadavek[] = [];

let studio: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; env: THREE.WebGLRenderTarget } | null = null;
let bezi = false;
let uvolnit: ReturnType<typeof setTimeout> | null = null;

function zalozStudio() {
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
  renderer.setPixelRatio(1);
  // Stejné světlo jako Hexík v appce (scena.ts), ať miniatura odpovídá náhledu
  renderer.toneMapping = THREE.NeutralToneMapping;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pm.fromScene(room, 0.035);
  scene.environment = env.texture;
  scene.environmentIntensity = 0.55;
  room.dispose(); pm.dispose();
  scene.add(new THREE.HemisphereLight("#FFFFFF", "#26296A", 0.45));
  const key = new THREE.DirectionalLight("#FFF1DE", 1.5); key.position.set(3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight("#A898FF", 1.6); rim.position.set(-4, 3, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight("#9FC4FF", 0.6); fill.position.set(-5, 1, 3); scene.add(fill);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  studio = { renderer, scene, camera, env };
}

function zrusStudio() {
  if (!studio) return;
  studio.env.dispose();
  studio.renderer.dispose();
  studio.renderer.forceContextLoss();
  studio = null;
}

/** Miniatura truhly: zavřená truhla daného druhu, mírně z boku a shora. */
function vykresliTruhlu(p: Pozadavek): Promise<string | null> {
  const { renderer, scene, camera } = studio!;
  const veci: { dispose: () => void }[] = [];
  const sklad: Sklad = { g: (x) => { veci.push(x); return x; }, m: (x) => { veci.push(x); return x; }, t: (x) => { veci.push(x); return x; } };
  const model = postavTruhlu(sklad, p.klic as DruhModelu, new THREE.Color("#FFFFFF"));
  const r = RAMCE.truhla;
  model.root.rotation.y = r.rotY;
  model.krok?.(0);
  scene.add(model.root);
  camera.position.set(0.2, r.y, r.z);
  camera.lookAt(new THREE.Vector3(...r.cil));
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return new Promise((hotovo) => {
    const konec = (url: string | null) => { scene.remove(model.root); for (const v of veci) v.dispose(); hotovo(url); };
    try {
      renderer.domElement.toBlob((b) => konec(b ? URL.createObjectURL(b) : null), "image/webp", 0.9);
    } catch { konec(null); }
  });
}

function vykresli(p: Pozadavek): Promise<string | null> {
  if (!studio) zalozStudio();
  const { renderer, scene, camera } = studio!;
  renderer.setSize(p.px, p.px, false);
  if (p.druh === "truhla") return vykresliTruhlu(p);
  const meritko = { value: p.px / (2 * Math.tan((camera.fov * Math.PI) / 360)) };
  const r = RAMCE[p.druh];
  const naTele = p.druh !== "podoba";
  const m = postavHexika(naTele ? "klasik" : p.klic, naTele ? 1 : p.etapa, meritko, naTele ? { [p.druh]: p.klic } : {});
  m.root.rotation.y = r.rotY;
  m.armR.rotation.z = m.rucePlne ? 0.4 : 0.1; m.armL.rotation.z = -(m.rucePlne ? 0.4 : 0.1);
  animujOblicej(m.oblicej, { vyraz: "radost", lookX: 0.2, lookY: 0.1, mrk: 1, tVyraz: 1 }, 1);
  // Pružiny doplňků (bambule, šála) nechat ustálit
  for (let i = 0; i < 20; i++) m.aktualizuj({ ay: 0, wx: 0, wy: 0, wz: 0, cas: i * 0.05, dt: 0.05 });
  scene.add(m.root);
  if (!naTele) scene.add(m.stin);
  let cil = new THREE.Vector3(...r.cil), z = r.z, y = r.y;
  if (p.druh === "ruce") {
    // Ruka visí u těla: záběr podle skutečné velikosti ruky s rukavicí
    m.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m.armR);
    const v = box.getSize(new THREE.Vector3());
    cil = box.getCenter(new THREE.Vector3());
    z = cil.z + (Math.max(v.x, v.y) * 1.25) / Math.tan((camera.fov * Math.PI) / 360) / 2 + 0.4;
    y = cil.y + 0.25;
  }
  camera.position.set(cil.x + 0.15, y, z);
  camera.lookAt(cil);
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
  return new Promise((hotovo) => {
    const konec = (url: string | null) => { scene.remove(m.root); scene.remove(m.stin); m.dispose(); hotovo(url); };
    try {
      renderer.domElement.toBlob((b) => konec(b ? URL.createObjectURL(b) : null), "image/webp", 0.9);
    } catch { konec(null); }
  });
}

async function zpracuj() {
  if (bezi) return;
  bezi = true;
  if (uvolnit) { clearTimeout(uvolnit); uvolnit = null; }
  while (fronta.length > 0) {
    const p = fronta.shift()!;
    let url: string | null = null;
    try { url = await vykresli(p); } catch { url = null; }
    if (url) hotove.set(p.klicCache, url);
    for (const f of cekaji.get(p.klicCache) ?? []) f(url);
    cekaji.delete(p.klicCache);
    // Mezi miniaturami pustit prohlížeč ke slovu (posun stránky zůstane plynulý)
    await new Promise((r) => setTimeout(r, 0));
  }
  bezi = false;
  uvolnit = setTimeout(zrusStudio, 4000);
}

/** Hotová miniatura z paměti (bez čekání), nebo null. */
export function miniaturaZPameti(druh: DruhMiniatury, klic: string, etapa = 1, px = 192): string | null {
  return hotove.get(`${druh}:${klic}:${druh === "podoba" ? etapa : 1}:${px}`) ?? null;
}

/** Vrátí adresu obrázku s 3D miniaturou, nebo null (bez WebGL nebo při chybě, pak zůstane 2D). */
export function miniatura(druh: DruhMiniatury, klic: string, etapa = 1, px = 192): Promise<string | null> {
  const klicCache = `${druh}:${klic}:${druh === "podoba" ? etapa : 1}:${px}`;
  const hotova = hotove.get(klicCache);
  if (hotova) return Promise.resolve(hotova);
  if (typeof window === "undefined" || !umi3D()) return Promise.resolve(null);
  return new Promise((hotovo) => {
    const seznam = cekaji.get(klicCache);
    if (seznam) { seznam.push(hotovo); return; }
    cekaji.set(klicCache, [hotovo]);
    fronta.push({ druh, klic, etapa, px, klicCache });
    void zpracuj();
  });
}
