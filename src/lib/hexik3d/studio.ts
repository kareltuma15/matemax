/**
 * Studio pro 3D truhlu: odlesky kovu (RoomEnvironment), pozadí kreslené ve scéně a jemná záře (bloom).
 * Na slabých zařízeních a s omezeným pohybem je záře vypnutá a rozlišení nižší, ať otevírání běží plynule.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { slabeZarizeni, ostryComposer } from "./kvalita";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

export interface Studio {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Přebarví pozadí (střed a kraj radiálního přechodu). */
  pozadi: (stred: string, kraj: string) => void;
  velikost: () => void;
  render: () => void;
  /** Je zapnutá záře? (vypíná se na slabých zařízeních) */
  zare: boolean;
  znic: () => void;
}

/** Slabé zařízení: přesunuto do kvalita.ts (Safari na iPhonu hlásí málo jader a padal do rozmazaného režimu). */
export { slabeZarizeni };

/** Vykresluje se bez grafické karty (SwiftShader, llvmpipe)? Pak jen nejlehčí varianta. */
export function softwarove(renderer: THREE.WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|software|basic render/i.test(r);
  } catch { return false; }
}

export function vytvorStudio(canvas: HTMLCanvasElement, mozn: { zare?: boolean } = {}): Studio {
  let slabe = slabeZarizeni();
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: slabe ? "low-power" : "high-performance" });
  const soft = softwarove(renderer);
  if (soft) slabe = true;
  const zare = mozn.zare ?? !slabe;
  renderer.setPixelRatio(soft ? 1 : Math.min(window.devicePixelRatio || 1, slabe ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);

  const pm = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const env = pm.fromScene(room, 0.035); scene.environment = env.texture; scene.environmentIntensity = 0.32;
  room.dispose(); pm.dispose();
  scene.add(new THREE.HemisphereLight("#FFFFFF", "#26296A", 0.45));
  const key = new THREE.DirectionalLight("#FFF1DE", 1.5); key.position.set(3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight("#A898FF", 1.6); rim.position.set(-4, 3, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight("#9FC4FF", 0.6); fill.position.set(-5, 1, 3); scene.add(fill);

  const bc = document.createElement("canvas"); bc.width = 64; bc.height = 256;
  const bt = new THREE.CanvasTexture(bc); bt.colorSpace = THREE.SRGBColorSpace; scene.background = bt;
  function pozadi(stred: string, kraj: string) {
    const x = bc.getContext("2d"); if (!x) return;
    const g = x.createRadialGradient(32, 95, 4, 32, 110, 190);
    g.addColorStop(0, stred); g.addColorStop(0.55, kraj); g.addColorStop(1, "#070B24");
    x.fillStyle = g; x.fillRect(0, 0, 64, 256); bt.needsUpdate = true;
  }
  pozadi("#33399A", "#121A4C");

  let composer: EffectComposer | null = null;
  if (zare) {
    composer = ostryComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.5, 1.15));
    composer.addPass(new OutputPass());
  }

  function velikost() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); }
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  return {
    renderer, scene, camera, pozadi, velikost, zare,
    render: () => { if (composer) composer.render(); else renderer.render(scene, camera); },
    znic() { env.dispose(); bt.dispose(); composer?.dispose(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}
