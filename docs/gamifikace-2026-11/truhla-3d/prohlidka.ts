/** Prohlídka truhly: pomalu se otáčí, tažením ji otočíš, víko se dá pootevřít. */
import * as THREE from "three";
import { postavTruhlu, type DruhModelu } from "./truhla-model";
import { vytvorStudio } from "./scena-sdilena";
import type { Sklad } from "../../../src/lib/hexik3d/doplnky";

export interface Prohlidka { druh(d: DruhModelu): void; otevri(ano: boolean): void; znic(): void }

export function vytvorProhlidku(canvas: HTMLCanvasElement, druh: DruhModelu, barva = "#B07CFF"): Prohlidka {
  const st = vytvorStudio(canvas); const { scene, camera } = st;
  st.bloom.strength = 0.35;
  let geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [], texs: THREE.Texture[] = [];
  const sklad: Sklad = { g: (x) => { geos.push(x); return x; }, m: (x) => { mats.push(x); return x; }, t: (x) => { texs.push(x); return x; } };
  const otocna = new THREE.Group(); otocna.position.y = -0.75; scene.add(otocna);
  // podstavec: měkký svit a stín
  const sc = document.createElement("canvas"); sc.width = sc.height = 128; const sx = sc.getContext("2d")!;
  const sg = sx.createRadialGradient(64, 64, 0, 64, 64, 64); sg.addColorStop(0, "rgba(3,6,22,.75)"); sg.addColorStop(0.6, "rgba(3,6,22,.25)"); sg.addColorStop(1, "rgba(3,6,22,0)"); sx.fillStyle = sg; sx.fillRect(0, 0, 128, 128);
  const stinT = new THREE.CanvasTexture(sc);
  const stin = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.6), new THREE.MeshBasicMaterial({ map: stinT, transparent: true, depthWrite: false })); stin.rotation.x = -Math.PI / 2; stin.position.y = -0.745; scene.add(stin);
  let m = postavTruhlu(sklad, druh, new THREE.Color(barva)); otocna.add(m.root);
  let cil = 0, uhel = 0, auto = true, otev = 0, cilOtev = 0;
  const posun = new THREE.Vector3(0, 0, 0);
  function stavej(d: DruhModelu) {
    otocna.remove(m.root); geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); texs.forEach((x) => x.dispose()); geos = []; mats = []; texs = [];
    m = postavTruhlu(sklad, d, new THREE.Color(barva)); otocna.add(m.root);
  }
  let tah: number | null = null, tahUhel = 0;
  canvas.addEventListener("pointerdown", (e) => { tah = e.clientX; tahUhel = cil; auto = false; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => { if (tah !== null) cil = tahUhel + (e.clientX - tah) * 0.012; });
  canvas.addEventListener("pointerup", () => { tah = null; });
  const ro = new ResizeObserver(st.velikost); ro.observe(canvas); st.velikost();
  let raf = 0, cas = 0, minule = performance.now();
  const klidne = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  function snimek() {
    const ted = performance.now(), dt = Math.min(0.05, (ted - minule) / 1000); minule = ted; cas += dt;
    if (auto && !klidne) cil += dt * 0.35;
    uhel += (cil - uhel) * Math.min(1, dt * 6); otocna.rotation.y = uhel - 0.95;
    otev += (cilOtev - otev) * Math.min(1, dt * 5); m.vikoCep.rotation.x = -1.75 * otev;
    m.sametMat.emissiveIntensity = otev * 0.06; m.kamen.rotation.z = Math.sin(cas) * 0.05;
    m.kamenMat.emissiveIntensity = 0.45 + 0.15 * Math.sin(cas * 2.2); m.krok?.(cas);
    const z = camera.aspect < 1 ? 5.6 / Math.max(0.55, camera.aspect) : 5.6;
    camera.position.set(0, 1.9 + otev * 0.9, z); camera.lookAt(posun.x, -0.2 + otev * 0.05, 0);
    st.render(); raf = requestAnimationFrame(snimek);
  }
  raf = requestAnimationFrame(snimek);
  return {
    druh: stavej,
    otevri(ano) { cilOtev = ano ? 1 : 0; },
    znic() { cancelAnimationFrame(raf); ro.disconnect(); geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); texs.forEach((x) => x.dispose()); stinT.dispose(); st.znic(); },
  };
}
