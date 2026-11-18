/**
 * Částice kolem 3D Hexíka: sníh, jiskry (třpyt), uhlíky z plamene a zlatá aura.
 * Jeden malý shader pro body s vlastní velikostí, průhledností a barvou každé částice.
 */
import * as THREE from "three";

export type DruhCastic = "snih" | "jiskry" | "uhliky" | "aura";

export interface Castice {
  obj: THREE.Points;
  aktualizuj: (dt: number, cas: number) => void;
  dispose: () => void;
}

/** Společné měřítko velikosti bodů (nastavuje scéna podle výšky plátna). */
export type MeritkoCastic = { value: number };

const VERTEX = /* glsl */ `
attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
varying float vAlpha; varying vec3 vColor; uniform float uScale;
void main() {
  vAlpha = aAlpha; vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;

const FRAGMENT = /* glsl */ `
uniform float uTvar; varying float vAlpha; varying vec3 vColor;
void main() {
  vec2 p = gl_PointCoord - 0.5; float d = length(p); float a;
  if (uTvar < 0.5) {
    a = smoothstep(0.5, 0.12, d);
  } else {
    float jadro = smoothstep(0.24, 0.0, d);
    float paprsky = max(0.0, 1.0 - abs(p.x) * 9.0) * max(0.0, 1.0 - abs(p.y) * 2.1)
                  + max(0.0, 1.0 - abs(p.y) * 9.0) * max(0.0, 1.0 - abs(p.x) * 2.1);
    a = clamp(jadro + paprsky * 0.85, 0.0, 1.0);
  }
  a *= vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
  #include <colorspace_fragment>
}`;

const rnd = (a: number, b: number) => a + Math.random() * (b - a);

export function vytvorCastice(druh: DruhCastic, meritko: MeritkoCastic, barvy: string[], pocet?: number): Castice {
  const n = pocet ?? (druh === "snih" ? 70 : druh === "uhliky" ? 26 : druh === "aura" ? 22 : 10);
  const pos = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n), col = new Float32Array(n * 3);
  // Stav každé částice: rychlost, fáze, život
  const v = new Float32Array(n * 3), faze = new Float32Array(n), zivot = new Float32Array(n), zakladVel = new Float32Array(n);
  const barvyC = barvy.map((b) => new THREE.Color(b));

  const zrod = (i: number, prvni: boolean) => {
    const c = barvyC[i % barvyC.length];
    col.set([c.r, c.g, c.b], i * 3);
    faze[i] = Math.random() * Math.PI * 2;
    if (druh === "snih") {
      const u = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 1.9;
      pos.set([Math.cos(u) * r, prvni ? rnd(-1.4, 2.6) : 2.6, Math.sin(u) * r * 0.8 - 0.1], i * 3);
      v.set([0, -rnd(0.25, 0.5), 0], i * 3);
      zakladVel[i] = rnd(0.04, 0.085); alpha[i] = rnd(0.7, 1);
    } else if (druh === "jiskry") {
      const u = Math.random() * Math.PI * 2, r = rnd(1.05, 1.45);
      pos.set([Math.cos(u) * r, Math.sin(u) * r * 1.05 + 0.05, rnd(-0.1, 0.6)], i * 3);
      zakladVel[i] = rnd(0.07, 0.14);
    } else if (druh === "uhliky") {
      pos.set([rnd(-0.18, 0.18), rnd(0, 0.15), rnd(-0.12, 0.12)], i * 3);
      v.set([rnd(-0.12, 0.12), rnd(0.5, 0.9), rnd(-0.08, 0.08)], i * 3);
      zivot[i] = prvni ? Math.random() * 1.4 : 0;
      zakladVel[i] = rnd(0.035, 0.06);
    } else {
      const u = (i / n) * Math.PI * 2;
      pos.set([Math.cos(u) * 1.55, Math.sin(u) * 1.55, 0], i * 3);
      zakladVel[i] = i % 3 === 0 ? 0.13 : 0.08;
    }
    size[i] = zakladVel[i];
  };
  for (let i = 0; i < n; i++) zrod(i, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
  geo.setAttribute("aAlpha", new THREE.BufferAttribute(alpha, 1));
  geo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false,
    blending: druh === "snih" ? THREE.NormalBlending : THREE.AdditiveBlending,
    uniforms: { uScale: meritko, uTvar: { value: druh === "snih" || druh === "uhliky" ? 0 : 1 } },
  });
  const obj = new THREE.Points(geo, mat);
  obj.frustumCulled = false;
  obj.renderOrder = 5;

  return {
    obj,
    aktualizuj(dt, cas) {
      for (let i = 0; i < n; i++) {
        const k = i * 3;
        if (druh === "snih") {
          pos[k] += Math.sin(cas * 0.9 + faze[i]) * 0.12 * dt;
          pos[k + 1] += v[k + 1] * dt;
          pos[k + 2] += Math.cos(cas * 0.7 + faze[i]) * 0.05 * dt;
          if (pos[k + 1] < -1.45) zrod(i, false);
          // Mírné zeslabení u horního okraje, ať vločky nevznikají „z ničeho“
          alpha[i] = Math.min(1, (2.6 - pos[k + 1]) * 1.5) * 0.9;
        } else if (druh === "jiskry" || druh === "aura") {
          const f = 0.5 + 0.5 * Math.sin(cas * (druh === "aura" ? 2.2 : 3.1) + faze[i] * 3);
          size[i] = zakladVel[i] * (0.25 + f * f);
          alpha[i] = 0.25 + 0.75 * f;
        } else {
          zivot[i] += dt;
          pos[k] += v[k] * dt; pos[k + 1] += v[k + 1] * dt; pos[k + 2] += v[k + 2] * dt;
          const t = zivot[i] / 1.4;
          alpha[i] = Math.max(0, 1 - t) * (t < 0.1 ? t * 10 : 1);
          size[i] = zakladVel[i] * (1 - t * 0.6);
          if (t >= 1) zrod(i, false);
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aSize.needsUpdate = true;
      geo.attributes.aAlpha.needsUpdate = true;
      geo.attributes.aColor.needsUpdate = true;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}
