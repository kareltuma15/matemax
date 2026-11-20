/**
 * Ostrost 3D scén (Karel 20. 11. 2026: pokojíček na iPhonu v Safari rozmazaný a se zubatými hranami).
 *
 * Proč to bylo rozmazané:
 *  1) Safari na iPhonu hlásí málo jader (WebKit číslo schválně snižuje), takže iPhone spadl do „lehkého“
 *     režimu – kreslil se v rozlišení 1× na displeji 3× a bez vyhlazení.
 *  2) Scéna jde přes EffectComposer (záře). Ten kreslí do vlastního bufferu, kde `antialias` rendereru
 *     neplatí – bez MSAA v render targetu byly hrany zubaté i v plném režimu.
 *
 * Tady je jedno místo pro: poměr pixelů, composer s MSAA, ostré textury a hlídač plynulosti, který
 * rozlišení sníží jen tehdy, když telefon opravdu nestíhá.
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";

/** Slabé zařízení podle toho, co prohlížeč hlásí. Na Applu se počtu jader nevěří (Safari ho snižuje). */
export function slabeZarizeni(): boolean {
  if (typeof window === "undefined") return true;
  const n = navigator as Navigator & { deviceMemory?: number };
  const jadra = n.hardwareConcurrency ?? 8;
  const pamet = n.deviceMemory ?? 8;
  const apple = /iPhone|iPad|iPod|Macintosh/.test(n.userAgent) && !/Android/.test(n.userAgent);
  if (pamet <= 2 || jadra <= 2) return true;
  return !apple && jadra <= 4 && pamet <= 3;
}

/** Poměr pixelů: ostře podle displeje, nejvýš 2× (na 3× displeji už rozdíl není vidět, výkon ano). */
export function pomerPixelu(lehce: boolean): number {
  return Math.min(window.devicePixelRatio || 1, lehce ? 1.5 : 2);
}

/** Composer s vyhlazením hran (MSAA) i přes postprocessing. */
export function ostryComposer(renderer: THREE.WebGLRenderer): EffectComposer {
  const v = renderer.getDrawingBufferSize(new THREE.Vector2());
  const rt = new THREE.WebGLRenderTarget(Math.max(1, v.x), Math.max(1, v.y), { type: THREE.HalfFloatType, samples: 4 });
  rt.texture.name = "EffectComposer.rt1";
  return new EffectComposer(renderer, rt);
}

/** Textury (tabule, podlaha, plakáty) ostré i při pohledu ze šikma. Volat po postavení scény. */
export function ostreTextury(scene: THREE.Object3D, renderer: THREE.WebGLRenderer): void {
  const a = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const klice = ["map", "emissiveMap", "roughnessMap", "normalMap", "alphaMap"] as const;
  scene.traverse((o) => {
    const m = (o as THREE.Mesh).material;
    for (const mat of Array.isArray(m) ? m : m ? [m] : []) {
      for (const k of klice) {
        const t = (mat as unknown as Record<string, THREE.Texture | null | undefined>)[k];
        if (t && t.anisotropy !== a) { t.anisotropy = a; t.needsUpdate = true; }
      }
    }
  });
}

/**
 * Hlídač plynulosti: když telefon dlouhodobě nestíhá (pod ~24 snímků za vteřinu), sníží rozlišení
 * o kus (2 → 1,5 → 1). Ostrost se tak obětuje jen tam, kde by se jinak scéna sekala.
 * Vrací funkci, kterou je potřeba volat každý vykreslený snímek s časem z requestAnimationFrame.
 */
export function hlidacPlynulosti(renderer: THREE.WebGLRenderer, prepocitej: () => void, cilovyInterval = 42): (t: number) => void {
  let start = 0, posledni = 0, n = 0, soucet = 0;
  return (t: number) => {
    if (!start) { start = t; posledni = t; return; }
    const dt = t - posledni; posledni = t;
    if (t - start < 1500 || dt > 250) return;   // první chvíli se kompilují shadery; dlouhá pauza = skrytá karta
    n++; soucet += dt;
    if (n < 60) return;
    const prumer = soucet / n; n = 0; soucet = 0;
    const pr = renderer.getPixelRatio();
    if (prumer > cilovyInterval && pr > 1) { renderer.setPixelRatio(Math.max(1, pr - 0.5)); prepocitej(); }
  };
}
