/**
 * Domov „Vánoční pokojíček“ v kvalitě Hexíka (Karel 19. 11. 2026: domovy musí být na úrovni
 * 3D Hexíka, doplňků a truhel, s animacemi a interakcemi, ať si s tím děti vyhrají). Převedeno
 * z prototypu docs/gamifikace-2026-11/domov-prototyp (schválil Karel 20. 11. 2026).
 * V kartě se kolečkem myši nepřibližuje (stránka se musí dát posouvat) a svislý tah prstem posouvá
 * stránku; na celé obrazovce funguje obojí. Slabé zařízení: bez záře a stínů, menší rozlišení, 30 snímků.
 *
 * Hračkový diorama ostrůvek: zaoblené tvary, měkké stíny, záře světel (bloom), krb se shaderovými
 * plameny, stromeček s řetězem světýlek, okno se sněhem a měsícem, dárky, křeslo, lampa, hodiny,
 * sněžítko, hrnek s kakaem. Hexík se prochází, ťuknutím kamkoli na podlahu přijde, na věci reaguje.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { postavHexika, type HexikModel, type SlotyHexika } from "./model";
import { animujOblicej, type Vyraz3D } from "./oblicej";

export type Kouzlo = "skrin" | "hexik" | "stromecek" | "krb" | "darek" | "snezitko" | "okno" | "lampa" | "kreslo" | "hodiny" | "hrnek" | "vlacek" | "tabule";
/** Kouzla, která se počítají (standard pokojíčku 20. 11.: méně věcí, ale lepších). */
export const KOUZLA: Partial<Record<Kouzlo, string>> = {
  hexik: "Pohlaď Hexíka", stromecek: "Hexík rozsvítí stromeček", krb: "Hexík přiloží do krbu", darek: "Hexík rozbalí dárek",
  okno: "Hexík uvidí padající hvězdu", kreslo: "Hexík si sedne do křesla", hrnek: "Hexík si dá kakao", vlacek: "Hexík zamává vláčku",
};
/** Průchody z pokojíčku: tabule vede do tréninku, skříň do šatníku. */
export type Pruchod = "trenink" | "satnik";

export interface Pokojicek {
  /** Přestaví Hexíka (jiná podoba, etapa, doplňky nebo efekt sady). */
  nastav: (podoba: string, etapa: number, sloty?: SlotyHexika) => void;
  /** Celá obrazovka: přiblížení kolečkem a svislý tah mění pohled. */
  rezim: (celaObrazovka: boolean) => void;
  oslava: () => void;
  /** Vrátí kameru po průchodu (když se stránka nepřepne). */
  zpet: () => void;
  znic: () => void;
}

export interface MoznostiPokojicku {
  podoba: string;
  etapa: number;
  sloty?: SlotyHexika;
  /** Řádky na tabuli (první = nadpis). */
  tabule?: string[];
  /** Slabé zařízení: bez záře a stínů, menší rozlišení. */
  lehce?: boolean;
  /** Tabule svítí, dokud dnešní trénink není hotový. */
  tabuleSviti?: boolean;
  onKouzlo: (k: Kouzlo) => void;
  /** Hexík prochází tabulí nebo skříní, kamera letí za ním (stránka se má přepnout). */
  onPruchod?: (k: Pruchod) => void;
}

// ───────────────────────── pomůcky ─────────────────────────
const tex = (w: number, h: number, kresli: (x: CanvasRenderingContext2D) => void, opak?: [number, number]) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; kresli(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (opak) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opak); }
  return t;
};
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const plast = (color: string, o: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.25, sheenColor: new THREE.Color("#FFF3E0"), ...o });
const zaobleny = (w: number, h: number, d: number, r = 0.08, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
function stin(m: THREE.Object3D, vrha = true, prijima = true) { m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = vrha; o.receiveShadow = prijima; } }); return m; }

const FLAME_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const FLAME_FRAG = /* glsl */ `
uniform float uCas; uniform float uSila; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
void main(){
  vec2 uv = vUv; float y = uv.y;
  float n = fbm(vec2(uv.x*3.0, y*3.0 - uCas*2.6));
  float sirka = (1.0 - y) * (0.55 + 0.25*uSila);
  float d = abs(uv.x - 0.5 + (n-0.5)*0.35*y) / max(sirka, 0.001);
  float tvar = smoothstep(1.0, 0.25, d) * smoothstep(1.02, 0.55 - 0.2*n, y + n*0.25);
  vec3 c = mix(vec3(1.0,0.95,0.6), vec3(1.0,0.45,0.08), smoothstep(0.0,0.6,y));
  c = mix(c, vec3(0.9,0.12,0.05), smoothstep(0.55,1.0,y));
  float a = tvar * (0.85 + 0.15*uSila);
  if (a < 0.02) discard;
  gl_FragColor = vec4(c * (1.15 + uSila * 0.6), a);
}`;

// ───────────────────────── scéna ─────────────────────────
export function vytvorPokojicek(canvas: HTMLCanvasElement, o: MoznostiPokojicku): Pokojicek {
  const lehce = !!o.lehce;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lehce, powerPreference: lehce ? "low-power" : "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lehce ? 1 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = !lehce; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let cela = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#1B1236");
  scene.fog = new THREE.Fog("#1B1236", 22, 40);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04); scene.environment = env.texture; scene.environmentIntensity = 0.22; pm.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const meritko = { value: 400 };
  const svet = new THREE.Group(); scene.add(svet);
  const klikaci: { obj: THREE.Object3D; kouzlo: Kouzlo | "podlaha" }[] = [];
  const reg = (obj: THREE.Object3D, k: Kouzlo | "podlaha") => { klikaci.push({ obj, kouzlo: k }); return obj; };
  const krokFn: ((t: number, dt: number) => void)[] = [];

  // ── světla ──
  scene.add(new THREE.HemisphereLight("#9C86E8", "#1E1430", 0.22));
  const mesic = new THREE.DirectionalLight("#9DB8FF", 0.55); mesic.position.set(4, 9, -6); scene.add(mesic);
  const klic = new THREE.DirectionalLight("#FFD8A8", 0.85); klic.position.set(6, 10, 7); klic.castShadow = true;
  klic.shadow.mapSize.set(2048, 2048); klic.shadow.camera.left = -9; klic.shadow.camera.right = 9; klic.shadow.camera.top = 9; klic.shadow.camera.bottom = -9; klic.shadow.bias = -0.0004; klic.shadow.radius = 4;
  scene.add(klic);

  // ── ostrůvek (podlaha, stěny) ──
  const Y0 = -1.4; // podlaha = nohy Hexíka
  const HX_S = 0.62; // Hexík v měřítku pokoje (model má nohy v −1,4 při měřítku 1)
  const prkna = tex(512, 512, (x) => {
    for (let i = 0; i < 8; i++) { const g = x.createLinearGradient(0, i * 64, 512, i * 64 + 64); g.addColorStop(0, i % 2 ? "#C98F5E" : "#D49B68"); g.addColorStop(1, i % 2 ? "#BC8152" : "#C78E5B"); x.fillStyle = g; x.fillRect(0, i * 64, 512, 64);
      x.fillStyle = "rgba(90,45,20,.35)"; x.fillRect(0, i * 64, 512, 3); x.fillRect(((i * 173) % 512), i * 64, 3, 64);
      for (let k = 0; k < 6; k++) { x.strokeStyle = "rgba(120,60,25,.12)"; x.beginPath(); x.moveTo(0, i * 64 + 10 + k * 8); x.bezierCurveTo(170, i * 64 + 4 + k * 9, 340, i * 64 + 16 + k * 7, 512, i * 64 + 8 + k * 8); x.stroke(); } }
  }, [2, 2]);
  const podlaha = new THREE.Mesh(zaobleny(11, 0.7, 8.6, 0.3, 6), [plast("#7A4A2E"), plast("#7A4A2E"), new THREE.MeshPhysicalMaterial({ map: prkna, roughness: 0.6, clearcoat: 0.25 }), plast("#6B3F27"), plast("#7A4A2E"), plast("#7A4A2E")]);
  podlaha.position.set(0, Y0 - 0.35, -0.3); stin(podlaha, false, true); svet.add(podlaha); reg(podlaha, "podlaha");
  // spodek ostrůvku s „hlínou“ a sněhem na okraji
  const spodek = new THREE.Mesh(zaobleny(10.6, 1.4, 8.2, 0.5, 6), plast("#4A2C4F", { roughness: 0.8 })); spodek.position.set(0, Y0 - 1.25, -0.3); svet.add(spodek);
  const tapeta = tex(512, 512, (x) => {
    x.fillStyle = "#B8484F"; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 512; i += 64) { x.fillStyle = "rgba(120,20,35,.35)"; x.fillRect(i + 26, 0, 12, 512); }
    x.fillStyle = "rgba(255,226,180,.6)"; x.font = "26px serif";
    for (let y = 30; y < 512; y += 86) for (let xx = 0; xx < 512; xx += 64) x.fillText(((y / 86) | 0) % 2 ? "❄" : "✦", xx + ((y / 86 | 0) % 2) * 32 + 4, y);
  }, [2.5, 1.4]);
  const stenaMat = new THREE.MeshPhysicalMaterial({ map: tapeta, roughness: 0.85, sheen: 0.4, sheenColor: new THREE.Color("#FFE7D6") });
  const okrajMat = plast("#FFF3E4", { roughness: 0.4 });
  const zadni = new THREE.Mesh(zaobleny(11, 5.2, 0.45, 0.2, 5), [okrajMat, okrajMat, okrajMat, okrajMat, stenaMat, okrajMat]);
  zadni.position.set(0, Y0 + 2.6, -4.4); stin(zadni, false, true); svet.add(zadni);
  const leva = new THREE.Mesh(zaobleny(0.45, 5.2, 8.6, 0.2, 5), [stenaMat, okrajMat, okrajMat, okrajMat, okrajMat, okrajMat]);
  leva.position.set(-5.3, Y0 + 2.6, -0.3); stin(leva, false, true); svet.add(leva);
  for (const [w, d, x, z] of [[11, 0.16, 0, -4.12], [0.16, 8.3, -5.02, -0.3]] as const) { const l = new THREE.Mesh(zaobleny(w, 0.3, d, 0.06), plast("#FFFFFF", { roughness: 0.35 })); l.position.set(x, Y0 + 0.15, z); stin(l); svet.add(l); }

  // ── okno se zimní nocí ──
  const okno = new THREE.Group(); okno.position.set(2.05, Y0 + 2.9, -4.15); svet.add(okno);
  const nebe = tex(256, 256, (x) => { const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#0E1240"); g.addColorStop(0.65, "#2B3D8A"); g.addColorStop(1, "#8FB2E8"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0.3, 1)})`; x.beginPath(); x.arc(rnd(0, 256), rnd(0, 170), rnd(0.4, 1.4), 0, 7); x.fill(); }
    x.fillStyle = "#F1F6FF"; x.beginPath(); x.moveTo(0, 256); for (let i = 0; i <= 256; i += 32) x.lineTo(i, 222 + Math.sin(i * 0.05) * 10); x.lineTo(256, 256); x.fill();
    x.fillStyle = "#1E3A30"; for (const [px, s] of [[40, 34], [92, 24], [190, 40], [232, 26]]) { x.beginPath(); x.moveTo(px, 222 - s * 1.7); x.lineTo(px - s * 0.6, 230); x.lineTo(px + s * 0.6, 230); x.fill(); } });
  const sklo = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.0), new THREE.MeshBasicMaterial({ map: nebe })); okno.add(sklo);
  const mesicSprite = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), new THREE.MeshBasicMaterial({ color: "#FFF6D8" })); mesicSprite.position.set(0.65, 0.55, 0.01); okno.add(mesicSprite);
  const ramMat = plast("#FFFFFF", { roughness: 0.3, clearcoat: 0.8 });
  for (const [w, h, x, y] of [[2.6, 0.18, 0, 1.08], [2.6, 0.22, 0, -1.1], [0.18, 2.4, -1.22, 0], [0.18, 2.4, 1.22, 0], [0.1, 2.0, 0, 0], [2.3, 0.1, 0, 0.1]] as const) { const b = new THREE.Mesh(zaobleny(w, h, 0.22, 0.05), ramMat); b.position.set(x, y, 0.08); stin(b); okno.add(b); }
  const parapet = new THREE.Mesh(zaobleny(2.9, 0.14, 0.55, 0.06), ramMat); parapet.position.set(0, -1.22, 0.28); stin(parapet); okno.add(parapet);
  // závěsy, které se jemně vlní
  const zaves: THREE.Mesh[] = [];
  for (const sx of [-1, 1]) { const z = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 2.7, 16, 6, true, 0, Math.PI), plast("#C73E4E", { side: THREE.DoubleSide, sheen: 0.8, sheenColor: new THREE.Color("#FF9AA6"), roughness: 0.85 }));
    z.position.set(sx * 1.55, -0.05, 0.25); z.rotation.y = sx > 0 ? Math.PI : 0; stin(z); okno.add(z); zaves.push(z); }
  // sníh za oknem
  const nSn = 120, snP = new Float32Array(nSn * 3); for (let i = 0; i < nSn; i++) snP.set([rnd(-1.1, 1.1), rnd(-0.95, 0.95), -0.02], i * 3);
  const snG = new THREE.BufferGeometry(); snG.setAttribute("position", new THREE.BufferAttribute(snP, 3));
  const snih = new THREE.Points(snG, new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.045, transparent: true, opacity: 0.95 })); snih.position.z = 0.03; okno.add(snih);
  let narazSnehu = 0;
  // padající hvězda
  const hvezdaPad = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.03), new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0, blending: THREE.AdditiveBlending })); hvezdaPad.position.z = 0.02; okno.add(hvezdaPad);
  let hvezdaCas = -10;
  reg(sklo, "okno");
  krokFn.push((t, dt) => {
    const rych = 0.25 + narazSnehu * 1.6;
    for (let i = 0; i < nSn; i++) { let y = snP[i * 3 + 1] - dt * (rych + (i % 5) * 0.05); let x = snP[i * 3] + Math.sin(t * 1.2 + i) * 0.0012 + narazSnehu * dt * 0.8; if (y < -0.95) y = 0.95; if (x > 1.1) x = -1.1; snP[i * 3 + 1] = y; snP[i * 3] = x; }
    snG.attributes.position.needsUpdate = true; narazSnehu = Math.max(0, narazSnehu - dt * 0.4);
    zaves.forEach((z, i) => { z.rotation.z = Math.sin(t * 0.9 + i) * 0.025; z.scale.x = 1 + Math.sin(t * 1.3 + i * 2) * 0.03; });
    const ht = t - hvezdaCas; const m = hvezdaPad.material as THREE.MeshBasicMaterial;
    if (ht < 1.1) { hvezdaPad.position.set(0.9 - ht * 2.0, 0.85 - ht * 0.8, 0.02); hvezdaPad.rotation.z = 0.38; m.opacity = Math.sin((ht / 1.1) * Math.PI); } else m.opacity = 0;
  });

  // ── krb ──
  const krb = new THREE.Group(); krb.position.set(-4.85, Y0, -1.0); krb.rotation.y = Math.PI / 2; svet.add(krb);
  const cihlaG = zaobleny(0.46, 0.22, 0.32, 0.05, 2);
  const cihly = new THREE.InstancedMesh(cihlaG, plast("#B65A43", { roughness: 0.8, clearcoat: 0.1 }), 200); let ci = 0;
  const mat4 = new THREE.Matrix4(), barva = new THREE.Color();
  for (let r = 0; r < 10; r++) for (let c = 0; c < 6; c++) {
    const x = -1.25 + c * 0.5 + (r % 2) * 0.25, y = 0.12 + r * 0.235;
    if (x > -0.62 && x < 0.62 && y < 1.35) continue; // otvor
    if (x > 1.35) continue;
    mat4.makeTranslation(x, y, 0.16); cihly.setMatrixAt(ci, mat4); barva.setHSL(0.03 + rnd(-0.01, 0.015), 0.5, rnd(0.42, 0.55)); cihly.setColorAt(ci, barva); ci++;
  }
  cihly.count = ci; stin(cihly); krb.add(cihly);
  const otvor = new THREE.Mesh(zaobleny(1.25, 1.3, 0.5, 0.15), plast("#2A130E", { roughness: 1 })); otvor.position.set(0, 0.7, 0.05); krb.add(otvor);
  const rimsa = new THREE.Mesh(zaobleny(3.1, 0.22, 0.75, 0.08), plast("#6E3E25", { roughness: 0.45, clearcoat: 0.6 })); rimsa.position.set(0.05, 2.47, 0.32); stin(rimsa); krb.add(rimsa);
  // polena
  for (const [x, rz] of [[-0.2, 0.25], [0.18, -0.2], [0, 0]] as const) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.8, 10), plast("#6B4428", { roughness: 0.9 })); p.rotation.set(Math.PI / 2, 0, Math.PI / 2 + rz); p.position.set(x, 0.17 + (x === 0 ? 0.12 : 0), 0.32); krb.add(p); }
  // plameny (shader, natočené ke kameře)
  const plameny: { m: THREE.Mesh; u: { uCas: { value: number }; uSila: { value: number } } }[] = [];
  for (const [x, s] of [[0, 1.25], [-0.25, 0.95], [0.25, 1.0]] as const) {
    const u = { uCas: { value: rnd(0, 10) }, uSila: { value: 0 } };
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.75 * s, 1.0 * s), new THREE.ShaderMaterial({ vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(x, 0.22 + 0.5 * s, 0.4); krb.add(m); plameny.push({ m, u });
  }
  const ohen = new THREE.PointLight("#FF7A2E", 10, 8, 1.5); ohen.position.set(0, 0.8, 0.9); krb.add(ohen);
  // jiskry
  const nJ = 40, jP = new Float32Array(nJ * 3), jV = new Float32Array(nJ * 3), jZ = new Float32Array(nJ);
  const jG = new THREE.BufferGeometry(); jG.setAttribute("position", new THREE.BufferAttribute(jP, 3));
  const jiskry = new THREE.Points(jG, new THREE.PointsMaterial({ color: "#FFB347", size: 0.06, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })); krb.add(jiskry);
  const zrodJiskru = (i: number, sila = 1) => { jP.set([rnd(-0.3, 0.3), 0.35, 0.4], i * 3); jV.set([rnd(-0.25, 0.25) * sila, rnd(0.5, 1.2) * sila, rnd(0, 0.35) * sila], i * 3); jZ[i] = rnd(0, 1.2); };
  for (let i = 0; i < nJ; i++) zrodJiskru(i);
  let ohenFlare = 0;
  // punčochy
  const BAR = ["#D8343F", "#2E8B57", "#3D6FD8"];
  for (let i = 0; i < 3; i++) { const g = new THREE.Group(); g.position.set(-0.8 + i * 0.8, 2.15, 0.62); krb.add(g);
    const noha = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.32, 6, 12), plast(BAR[i], { sheen: 0.9, sheenColor: new THREE.Color("#FFFFFF"), roughness: 0.9 })); noha.position.y = -0.2; g.add(noha);
    const spicka = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), noha.material); spicka.scale.set(1.4, 0.9, 1); spicka.position.set(0.1, -0.42, 0); g.add(spicka);
    const lem = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 16), plast("#FFFFFF", { sheen: 1, roughness: 1 })); lem.position.y = 0.02; g.add(lem); stin(g);
    krokFn.push((t) => { g.rotation.z = Math.sin(t * 1.4 + i) * 0.04; }); }
  reg(otvor, "krb"); plameny.forEach((p) => reg(p.m, "krb"));
  krokFn.push((t, dt) => {
    ohenFlare = Math.max(0, ohenFlare - dt * 0.6);
    for (const p of plameny) { p.u.uCas.value += dt; p.u.uSila.value = ohenFlare; p.m.lookAt(camera.position.x, p.m.getWorldPosition(new THREE.Vector3()).y, camera.position.z); p.m.scale.setScalar(1 + ohenFlare * 0.5); }
    ohen.intensity = (7 + Math.sin(t * 13) * 1.2 + Math.sin(t * 7.1) * 0.9) * (1 + ohenFlare * 0.9) * (lampaZap ? 1 : 1.25);
    for (let i = 0; i < nJ; i++) { jZ[i] += dt; if (jZ[i] > 1.4) { zrodJiskru(i, 1 + ohenFlare); jZ[i] = 0; } jP[i * 3] += jV[i * 3] * dt; jP[i * 3 + 1] += jV[i * 3 + 1] * dt; jP[i * 3 + 2] += jV[i * 3 + 2] * dt; }
    jG.attributes.position.needsUpdate = true;
  });

  // ── stromeček ──
  const strom = new THREE.Group(); strom.position.set(-3.2, Y0, -3.0); svet.add(strom);
  const jehl = plast("#2E8B57", { roughness: 0.7, sheen: 0.6, sheenColor: new THREE.Color("#9FE3B5"), clearcoat: 0.1 });
  for (const [r, h, y] of [[1.35, 1.2, 0.95], [1.1, 1.05, 1.65], [0.82, 0.95, 2.3], [0.5, 0.8, 2.85]] as const) {
    // vlnitý okraj patra (lathe s „zuby“)
    const body: THREE.Vector2[] = []; for (let i = 0; i <= 12; i++) { const t = i / 12; body.push(new THREE.Vector2(r * (1 - t) + Math.sin(t * Math.PI) * 0.05, -h / 2 + h * t)); }
    const c = new THREE.Mesh(new THREE.LatheGeometry(body, 28), jehl); c.position.y = y; stin(c); strom.add(c);
  }
  const kmen = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 12), plast("#7A4A2A")); kmen.position.y = 0.25; stin(kmen); strom.add(kmen);
  const kvetinac = new THREE.Mesh(zaobleny(0.8, 0.45, 0.8, 0.12), plast("#C0392B", { clearcoat: 0.8 })); kvetinac.position.y = 0.22; stin(kvetinac); strom.add(kvetinac);
  // řetěz světýlek po spirále
  const nS = 46; const bulby = new THREE.InstancedMesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: "#FFFFFF", emissive: "#FFFFFF", emissiveIntensity: 2, toneMapped: false }), nS);
  const BARVY_S = ["#FF4D5E", "#FFD45A", "#4DD8FF", "#7CFF8A", "#FF8AE0"].map((c) => new THREE.Color(c));
  const spirala: THREE.Vector3[] = [];
  for (let i = 0; i < nS; i++) { const t = i / nS, y = 0.55 + t * 2.55, r = (1 - t) * 1.25 + 0.14, a = t * Math.PI * 9; const v = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r); spirala.push(v); mat4.makeTranslation(v.x, v.y, v.z); bulby.setMatrixAt(i, mat4); bulby.setColorAt(i, BARVY_S[i % 5]); }
  strom.add(bulby);
  const drat = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spirala), 200, 0.012, 6), new THREE.MeshStandardMaterial({ color: "#1F3A2A" })); strom.add(drat);
  // ozdoby (koule)
  for (let i = 0; i < 14; i++) { const t = rnd(0.05, 0.85), y = 0.6 + t * 2.4, r = (1 - t) * 1.3 + 0.05, a = rnd(0, Math.PI * 2);
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshPhysicalMaterial({ color: ["#E63946", "#F4C430", "#5B8CFF", "#F0F0F0"][i % 4], metalness: 0.7, roughness: 0.15, clearcoat: 1 }));
    k.position.set(Math.cos(a) * r, y - 0.1, Math.sin(a) * r); strom.add(k); krokFn.push((tt) => { k.position.y = y - 0.1 + Math.sin(tt * 1.6 + i) * 0.012; }); }
  // hvězda
  const hvShape = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? 0.13 : 0.3; const p = new THREE.Vector2(Math.cos(a) * rr, Math.sin(a) * rr); if (i) hvShape.lineTo(p.x, p.y); else hvShape.moveTo(p.x, p.y); }
  const hvezda = new THREE.Mesh(new THREE.ExtrudeGeometry(hvShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 }), new THREE.MeshStandardMaterial({ color: "#FFD45A", emissive: "#FFB000", emissiveIntensity: 1.6, metalness: 0.5, roughness: 0.25 }));
  hvezda.position.set(0, 3.45, 0); hvezda.geometry.center(); strom.add(hvezda);
  const stromSvetlo = new THREE.PointLight("#FFD9A0", 2.2, 5, 1.8); stromSvetlo.position.set(0.5, 1.8, 1); strom.add(stromSvetlo);
  let vzorek = 0, vzorekOd = -10;
  reg(strom, "stromecek");
  krokFn.push((t) => {
    hvezda.rotation.y = t * 0.8; (hvezda.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(t * 3) * 0.4 + (t - vzorekOd < 0.8 ? 2 : 0);
    for (let i = 0; i < nS; i++) {
      let jas: number;
      if (vzorek === 0) jas = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.3);
      else if (vzorek === 1) jas = ((Math.floor(t * 10) - i) % 6 + 6) % 6 === 0 ? 1.6 : 0.25; // běžící světlo
      else jas = 0.7 + 0.3 * Math.sin(t * 6 + i);
      const c = vzorek === 2 ? new THREE.Color().setHSL(((t * 0.25 + i / nS) % 1), 1, 0.6) : BARVY_S[i % 5].clone();
      bulby.setColorAt(i, c.multiplyScalar(jas));
    }
    bulby.instanceColor!.needsUpdate = true;
  });

  // ── dárky ──
  const darky: { vika: THREE.Group; otevreno: number; vylet: THREE.Mesh }[] = [];
  const DARKY: [string, string, number, number, number, number][] = [["#3D7BFF", "#FFD45A", 0.62, -2.1, -2.2, 0.3], ["#E0465B", "#FFFFFF", 0.46, -1.45, -2.65, -0.4], ["#2FA36B", "#E0465B", 0.4, -2.55, -1.75, 0.9]];
  for (const [b, s, v, x, z, ry] of DARKY) {
    const g = new THREE.Group(); g.position.set(x, Y0, z); g.rotation.y = ry; svet.add(g);
    const telo = new THREE.Mesh(zaobleny(v, v * 0.82, v, 0.06), plast(b, { clearcoat: 0.9 })); telo.position.y = v * 0.41; g.add(telo);
    const stuha = plast(s, { metalness: 0.2, roughness: 0.3, clearcoat: 1 });
    const s1 = new THREE.Mesh(zaobleny(v * 1.02, v * 0.84, 0.08, 0.02), stuha); s1.position.y = v * 0.41; g.add(s1);
    const vika = new THREE.Group(); vika.position.set(0, v * 0.82, -v / 2); g.add(vika);
    const viko = new THREE.Mesh(zaobleny(v * 1.08, v * 0.18, v * 1.08, 0.05), plast(b, { clearcoat: 0.9 })); viko.position.set(0, v * 0.09, v / 2); vika.add(viko);
    const s2 = new THREE.Mesh(zaobleny(0.08, v * 0.2, v * 1.1, 0.02), stuha); s2.position.set(0, v * 0.09, v / 2); vika.add(s2);
    for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.TorusGeometry(v * 0.13, v * 0.045, 10, 20), stuha); m.position.set(sx * v * 0.12, v * 0.26, v / 2); m.rotation.set(0, Math.PI / 2, sx * 0.6); vika.add(m); }
    const vylet = new THREE.Mesh(new THREE.OctahedronGeometry(v * 0.22), new THREE.MeshStandardMaterial({ color: "#9BE6FF", emissive: "#4DC3FF", emissiveIntensity: 1.5, metalness: 0.2, roughness: 0.1 }));
    vylet.position.y = v * 0.5; vylet.visible = false; g.add(vylet);
    stin(g); reg(g, "darek"); darky.push({ vika, otevreno: -10, vylet });
  }
  // konfety pro dárky a oslavy
  const nK = 120, kP = new Float32Array(nK * 3), kV = new Float32Array(nK * 3), kC = new Float32Array(nK * 3); let kZ = 99;
  const kG = new THREE.BufferGeometry(); kG.setAttribute("position", new THREE.BufferAttribute(kP, 3)); kG.setAttribute("color", new THREE.BufferAttribute(kC, 3));
  const konfety = new THREE.Points(kG, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0, depthWrite: false })); svet.add(konfety);
  const vystrelKonfety = (kde: THREE.Vector3, sila = 1) => { kZ = 0; for (let i = 0; i < nK; i++) { kP.set([kde.x, kde.y, kde.z], i * 3); kV.set([rnd(-1.6, 1.6) * sila, rnd(2, 4.5) * sila, rnd(-1.6, 1.6) * sila], i * 3); const c = BARVY_S[i % 5]; kC.set([c.r, c.g, c.b], i * 3); } kG.attributes.color.needsUpdate = true; };
  krokFn.push((t, dt) => {
    kZ += dt; const m = konfety.material as THREE.PointsMaterial; m.opacity = kZ < 2.2 ? Math.min(1, (2.2 - kZ) * 1.5) : 0;
    if (kZ < 2.2) { for (let i = 0; i < nK; i++) { kV[i * 3 + 1] -= 6 * dt; kP[i * 3] += kV[i * 3] * dt; kP[i * 3 + 1] = Math.max(Y0 + 0.02, kP[i * 3 + 1] + kV[i * 3 + 1] * dt); kP[i * 3 + 2] += kV[i * 3 + 2] * dt; } kG.attributes.position.needsUpdate = true; }
    for (const d of darky) {
      const dtv = t - d.otevreno;
      const ot = dtv < 0.35 ? dtv / 0.35 : dtv < 3 ? 1 : dtv < 3.5 ? 1 - (dtv - 3) / 0.5 : 0;
      d.vika.rotation.x = -ot * 1.9 * (1 + Math.sin(dtv * 18) * 0.04 * (dtv < 0.6 ? 1 : 0));
      d.vylet.visible = dtv < 3.2 && dtv > 0.1; d.vylet.position.y = 0.3 + Math.min(1, dtv * 2) * 0.9 + Math.sin(t * 3) * 0.05; d.vylet.rotation.y = t * 3;
    }
  });

  // ── koberec ──
  const koberec = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.95, 0.06, 64), new THREE.MeshPhysicalMaterial({ map: tex(512, 512, (x) => { for (let r = 256; r > 0; r -= 24) { x.fillStyle = (r / 24 | 0) % 2 ? "#F6E7D2" : "#C94C5C"; x.beginPath(); x.arc(256, 256, r, 0, 7); x.fill(); } x.strokeStyle = "rgba(255,255,255,.4)"; x.setLineDash([6, 8]); for (let r = 240; r > 20; r -= 24) { x.beginPath(); x.arc(256, 256, r, 0, 7); x.stroke(); } }), roughness: 1, sheen: 1, sheenColor: new THREE.Color("#FFFFFF") }));
  koberec.position.set(0.2, Y0 + 0.03, 0.2); stin(koberec, false, true); svet.add(koberec); reg(koberec, "podlaha");

  // ── vláček kolem koberce (ťuknutí = zahouká a zrychlí, z komína pára) ──
  const kolej = new THREE.Mesh(new THREE.TorusGeometry(2.25, 0.035, 8, 96), plast("#8A8F9C", { metalness: 0.7, roughness: 0.3 })); kolej.rotation.x = Math.PI / 2; kolej.position.set(0.2, Y0 + 0.07, 0.2); svet.add(kolej);
  const kolej2 = kolej.clone(); kolej2.scale.setScalar(1.09); svet.add(kolej2);
  const vlak = new THREE.Group(); svet.add(vlak);
  const vagony: THREE.Group[] = [];
  const VB = ["#E63946", "#3D7BFF", "#F4C430", "#2E8B57"];
  for (let i = 0; i < 4; i++) {
    const v = new THREE.Group(); vlak.add(v); vagony.push(v);
    const t = new THREE.Mesh(zaobleny(0.42, 0.26, 0.26, 0.07), plast(VB[i], { clearcoat: 1, roughness: 0.25 })); t.position.y = 0.2; v.add(t);
    if (i === 0) { const kab = new THREE.Mesh(zaobleny(0.2, 0.22, 0.24, 0.05), plast("#1D3557", { clearcoat: 1 })); kab.position.set(-0.11, 0.42, 0); v.add(kab);
      const kom = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.16, 12), plast("#222")); kom.position.set(0.13, 0.4, 0); v.add(kom); }
    else { const n = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshStandardMaterial({ color: ["#FFD45A", "#9BE6FF", "#FF8AE0"][i - 1], emissive: ["#FFB000", "#4DC3FF", "#FF5CC8"][i - 1], emissiveIntensity: 0.8 })); n.position.y = 0.4; v.add(n); }
    for (const sx of [-0.13, 0.13]) for (const sz of [-0.14, 0.14]) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 14), plast("#222", { roughness: 0.4 })); k.rotation.x = Math.PI / 2; k.position.set(sx, 0.06, sz); v.add(k); }
    stin(v); reg(v, "vlacek");
  }
  const nV = 20, vP = new Float32Array(nV * 3), vZ = new Float32Array(nV); for (let i = 0; i < nV; i++) vZ[i] = rnd(0, 1.2);
  const vG = new THREE.BufferGeometry(); vG.setAttribute("position", new THREE.BufferAttribute(vP, 3));
  const paraVlak = new THREE.Points(vG, new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.14, transparent: true, opacity: 0.5, depthWrite: false })); svet.add(paraVlak);
  let vlakU = 0, vlakRych = 0.25, vlakHouk = -10;
  krokFn.push((t, dt) => {
    vlakRych += ((t - vlakHouk < 3 ? 1.1 : 0.25) - vlakRych) * 0.03; vlakU += dt * vlakRych;
    vagony.forEach((v, i) => { const a = vlakU - i * 0.2, R = 2.36; v.position.set(0.2 + Math.cos(a) * R, Y0 + 0.08, 0.2 + Math.sin(a) * R); v.rotation.y = -a; });
    const kom = vagony[0].localToWorld(new THREE.Vector3(0.13, 0.5, 0));
    for (let i = 0; i < nV; i++) { vZ[i] += dt * (t - vlakHouk < 1.5 ? 2.2 : 1); if (vZ[i] > 1.2) { vZ[i] = 0; vP.set([kom.x, kom.y, kom.z], i * 3); } else vP[i * 3 + 1] += dt * 0.5; }
    vG.attributes.position.needsUpdate = true; (paraVlak.material as THREE.PointsMaterial).opacity = t - vlakHouk < 1.5 ? 0.75 : 0.35;
  });

  // ── křeslo s dekou ──
  const kreslo = new THREE.Group(); kreslo.position.set(2.9, Y0, -2.3); kreslo.rotation.y = -0.55; svet.add(kreslo);
  const cal = plast("#4A63C8", { roughness: 0.85, sheen: 0.9, sheenColor: new THREE.Color("#A9B8FF"), clearcoat: 0 });
  const sedak = new THREE.Mesh(zaobleny(1.6, 0.55, 1.4, 0.25), cal); sedak.position.y = 0.5; kreslo.add(sedak);
  const operadlo = new THREE.Mesh(zaobleny(1.6, 1.4, 0.4, 0.2), cal); operadlo.position.set(0, 1.1, -0.55); kreslo.add(operadlo);
  for (const sx of [-1, 1]) { const op = new THREE.Mesh(zaobleny(0.32, 0.8, 1.4, 0.15), cal); op.position.set(sx * 0.82, 0.75, 0); kreslo.add(op); }
  const deka = new THREE.Mesh(zaobleny(1.2, 0.08, 0.9, 0.04), new THREE.MeshPhysicalMaterial({ map: tex(128, 128, (x) => { x.fillStyle = "#F4E6C8"; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 128; i += 16) { x.fillStyle = i % 32 ? "#C94C5C" : "#2E8B57"; x.fillRect(i, 0, 5, 128); x.fillRect(0, i, 128, 5); } }, [2, 2]), roughness: 1, sheen: 1 }));
  deka.position.set(0.15, 0.82, 0.2); deka.rotation.z = 0.08; kreslo.add(deka);
  stin(kreslo); reg(kreslo, "kreslo");

  // ── stolek, lampa, hrnek ──
  const stolek = new THREE.Group(); stolek.position.set(4.1, Y0, -0.7); svet.add(stolek);
  const deska = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 32), plast("#8A5A3B", { clearcoat: 0.8, roughness: 0.3 })); deska.position.y = 1.0; stolek.add(deska);
  const noha = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 1.0, 12), deska.material); noha.position.y = 0.5; stolek.add(noha);
  const lampa = new THREE.Group(); lampa.position.set(-0.15, 1.05, -0.1); stolek.add(lampa);
  const tyc = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 0.8, 10), plast("#D9B26A", { metalness: 0.6, roughness: 0.3 })); tyc.position.y = 0.4; lampa.add(tyc);
  const stinitkoMat = new THREE.MeshStandardMaterial({ color: "#FFE9B8", emissive: "#FFB15C", emissiveIntensity: 1.2, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
  const stinitko = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 0.4, 24, 1, true), stinitkoMat); stinitko.position.y = 0.92; lampa.add(stinitko);
  const lampaSvetlo = new THREE.PointLight("#FFC98A", 4, 6, 1.7); lampaSvetlo.position.y = 0.85; lampa.add(lampaSvetlo);
  let lampaZap = true; // lampa je teď jen ozdoba (méně věcí na ťukání)
  const hrnek = new THREE.Group(); hrnek.position.set(0.25, 1.05, 0.15); stolek.add(hrnek);
  const hTelo = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.24, 20), plast("#E63946", { clearcoat: 1, roughness: 0.2 })); hTelo.position.y = 0.12; hrnek.add(hTelo);
  const ucho = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.022, 8, 16), hTelo.material); ucho.position.set(0.15, 0.13, 0); hrnek.add(ucho);
  const kakao = new THREE.Mesh(new THREE.CircleGeometry(0.115, 20), plast("#5A3218", { roughness: 0.3 })); kakao.rotation.x = -Math.PI / 2; kakao.position.y = 0.23; hrnek.add(kakao);
  const nP = 14, pP = new Float32Array(nP * 3), pZ = new Float32Array(nP); for (let i = 0; i < nP; i++) { pZ[i] = rnd(0, 2); }
  const pG = new THREE.BufferGeometry(); pG.setAttribute("position", new THREE.BufferAttribute(pP, 3));
  const para = new THREE.Points(pG, new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.16, transparent: true, opacity: 0.35, depthWrite: false })); hrnek.add(para);
  let paraPuf = 0; stin(stolek); reg(hrnek, "hrnek");
  krokFn.push((t, dt) => {
    paraPuf = Math.max(0, paraPuf - dt * 0.5);
    for (let i = 0; i < nP; i++) { pZ[i] += dt * (1 + paraPuf * 2); if (pZ[i] > 2) pZ[i] = 0; pP.set([Math.sin(t + i) * 0.05 * pZ[i], 0.25 + pZ[i] * 0.35, Math.cos(t * 0.8 + i) * 0.04 * pZ[i]], i * 3); }
    pG.attributes.position.needsUpdate = true; (para.material as THREE.PointsMaterial).opacity = 0.3 + paraPuf * 0.4;
    const cil = lampaZap ? 4 : 0; lampaSvetlo.intensity += (cil - lampaSvetlo.intensity) * 0.12; stinitkoMat.emissiveIntensity += ((lampaZap ? 1.2 : 0.05) - stinitkoMat.emissiveIntensity) * 0.12;
    klic.intensity += ((lampaZap ? 0.85 : 0.35) - klic.intensity) * 0.08;
  });

  // ── nástěnné hodiny s kyvadlem ──
  const hodiny = new THREE.Group(); hodiny.position.set(-5.02, Y0 + 4.05, -1.0); hodiny.rotation.y = Math.PI / 2; svet.add(hodiny);
  const ciferMat = new THREE.MeshPhysicalMaterial({ map: tex(256, 256, (x) => { x.fillStyle = "#FFF8EC"; x.beginPath(); x.arc(128, 128, 124, 0, 7); x.fill(); x.fillStyle = "#3A2A20"; x.font = "bold 34px sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; for (let i = 1; i <= 12; i++) { const a = (i / 12) * Math.PI * 2 - Math.PI / 2; x.fillText(String(i), 128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); } }), roughness: 0.4, clearcoat: 1 });
  const telh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.16, 40), [plast("#8A5A3B"), ciferMat, plast("#8A5A3B")]); telh.rotation.x = Math.PI / 2; hodiny.add(telh);
  const rucicka = new THREE.Mesh(zaobleny(0.04, 0.32, 0.02, 0.01), plast("#2A1A10")); rucicka.position.z = 0.1; rucicka.geometry.translate(0, 0.14, 0); hodiny.add(rucicka);
  const kyvadlo = new THREE.Group(); kyvadlo.position.y = -0.45; hodiny.add(kyvadlo);
  const tycK = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), plast("#D9B26A", { metalness: 0.8, roughness: 0.25 })); tycK.position.y = -0.35; kyvadlo.add(tycK);
  const zavazi = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 24), tycK.material); zavazi.rotation.x = Math.PI / 2; zavazi.position.y = -0.72; kyvadlo.add(zavazi);
  stin(hodiny); let hodinyNat = -10;
  krokFn.push((t) => { const n = t - hodinyNat < 2 ? 1 + (2 - (t - hodinyNat)) : 1; kyvadlo.rotation.z = Math.sin(t * 3.1) * 0.28 * n; rucicka.rotation.z = -t * (t - hodinyNat < 2 ? 6 : 0.12); hodiny.scale.setScalar(1 + (t - hodinyNat < 0.4 ? Math.sin((t - hodinyNat) / 0.4 * Math.PI) * 0.08 : 0)); });

  // ── police se sněžítkem ──
  const police = new THREE.Mesh(zaobleny(1.6, 0.12, 0.45, 0.05), plast("#8A5A3B", { clearcoat: 0.6 })); police.position.set(-0.65, Y0 + 3.72, -4.0); stin(police); svet.add(police);
  for (let i = 0; i < 4; i++) { const k = new THREE.Mesh(zaobleny(0.16, rnd(0.35, 0.48), 0.32, 0.03), plast(["#5B8CFF", "#F4C430", "#2E8B57", "#E63946"][i])); k.position.set(-1.25 + i * 0.19, Y0 + 3.98, -4.0); k.rotation.z = i === 3 ? -0.18 : 0; stin(k); svet.add(k); }
  const globe = new THREE.Group(); globe.position.set(-0.2, Y0 + 3.78, -3.95); svet.add(globe);
  const podstavec = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.14, 24), plast("#6E3E25", { clearcoat: 0.8 })); podstavec.position.y = 0.07; globe.add(podstavec);
  const koule = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 24), new THREE.MeshPhysicalMaterial({ color: "#DFF3FF", transparent: true, opacity: 0.22, roughness: 0.02, clearcoat: 1, metalness: 0 })); koule.position.y = 0.42; globe.add(koule);
  const mini = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 10), plast("#2E8B57")); mini.position.y = 0.3; globe.add(mini);
  const nG = 50, gP = new Float32Array(nG * 3), gV = new Float32Array(nG * 3); for (let i = 0; i < nG; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(rnd(0, 0.24)); gP.set([v.x, 0.42 + v.y, v.z], i * 3); }
  const gG = new THREE.BufferGeometry(); gG.setAttribute("position", new THREE.BufferAttribute(gP, 3));
  globe.add(new THREE.Points(gG, new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.03 })));
  let globeTres = -10;
  krokFn.push((t, dt) => {
    const tr = t - globeTres; globe.rotation.z = tr < 0.6 ? Math.sin(tr * 30) * 0.2 * (1 - tr / 0.6) : 0;
    for (let i = 0; i < nG; i++) {
      if (tr < 0.6) gV.set([rnd(-1, 1), rnd(0.5, 2), rnd(-1, 1)], i * 3);
      gV[i * 3] *= 0.97; gV[i * 3 + 2] *= 0.97; gV[i * 3 + 1] = gV[i * 3 + 1] * 0.95 - 0.08;
      const x = gP[i * 3] + gV[i * 3] * dt, y = gP[i * 3 + 1] + gV[i * 3 + 1] * dt * 0.5, z = gP[i * 3 + 2] + gV[i * 3 + 2] * dt;
      const d = Math.hypot(x, y - 0.42, z); if (d < 0.26) gP.set([x, Math.max(0.18, y), z], i * 3);
    }
    gG.attributes.position.needsUpdate = true;
  });

  // ── girlanda světýlek pod stropem ──
  const nG2 = 30; const girl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: "#FFF", emissive: "#FFF", emissiveIntensity: 2, toneMapped: false }), nG2);
  const bodyG: THREE.Vector3[] = [];
  for (let i = 0; i < nG2; i++) { const t = i / (nG2 - 1); const x = -5 + t * 10; const v = new THREE.Vector3(x, Y0 + 4.85 - Math.abs(Math.sin(t * Math.PI * 4)) * 0.35, -4.05); bodyG.push(v); mat4.makeTranslation(v.x, v.y, v.z); girl.setMatrixAt(i, mat4); girl.setColorAt(i, new THREE.Color("#FFD9A0")); }
  svet.add(girl); svet.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bodyG), 160, 0.012, 6), new THREE.MeshStandardMaterial({ color: "#2A3A2A" })));
  krokFn.push((t) => { for (let i = 0; i < nG2; i++) girl.setColorAt(i, new THREE.Color("#FFD29A").multiplyScalar(0.6 + 0.5 * Math.max(0, Math.sin(t * 2.5 + i * 0.9)))); girl.instanceColor!.needsUpdate = true; });

  // ── velká tabule s dnešním plánem na zadní stěně, čelem ke kameře (průchod do tréninku) ──
  // Mezi stromečkem a oknem, ve výšce očí. Svítí, dokud dnešní trénink není hotový.
  const tabule = new THREE.Group(); tabule.position.set(-0.62, Y0 + 2.15, -4.12); svet.add(tabule);
  const tabTex = tex(768, 512, (x) => {
    const g = x.createRadialGradient(384, 256, 60, 384, 256, 460); g.addColorStop(0, "#2C5A47"); g.addColorStop(1, "#1C3D30"); x.fillStyle = g; x.fillRect(0, 0, 768, 512);
    for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0, 0.035)})`; x.fillRect(rnd(0, 768), rnd(0, 512), rnd(2, 20), 2); }
    const [nadpis, ...radky] = o.tabule?.length ? o.tabule : ["Dnešní plán", "○ Trénink podle tebe", "🔥 začni sérii ještě dnes", "Hexík: „Jdeme na to?“"];
    const pismo = (vel: number, tucne = false) => `${tucne ? "bold " : ""}${vel}px 'Comic Sans MS', 'Chalkboard SE', 'DM Sans', sans-serif`;
    const napis = (t: string, xx: number, y: number, vel: number, barva: string, tucne = false, max = 690) => {
      let v = vel; x.font = pismo(v, tucne);
      while (v > 18 && x.measureText(t).width > max) { v -= 2; x.font = pismo(v, tucne); }
      x.fillStyle = barva; x.shadowColor = barva; x.shadowBlur = 6; x.fillText(t, xx, y); x.shadowBlur = 0;
    };
    napis(nadpis, 40, 78, 58, "#F7F3E8", true);
    x.strokeStyle = "rgba(247,243,232,.6)"; x.lineWidth = 4; x.beginPath(); x.moveTo(40, 98); x.bezierCurveTo(200, 92, 420, 104, 560, 96); x.stroke();
    const BARVY_TAB = ["#A6F0C0", "#FFD45A", "rgba(247,243,232,.82)"];
    radky.slice(0, 3).forEach((r, i) => napis(r, 44, 168 + i * 66, i === 2 ? 34 : 42, BARVY_TAB[i]));
    // křídou nakreslené tlačítko
    x.strokeStyle = "#FFD45A"; x.lineWidth = 6; x.shadowColor = "#FFD45A"; x.shadowBlur = 10;
    x.beginPath(); x.roundRect(40, 392, 420, 82, 26); x.stroke(); x.shadowBlur = 0;
    napis("Jdeme trénovat →", 70, 448, 42, "#FFD45A", true, 370);
    // Hexík křídou v rohu
    x.strokeStyle = "rgba(247,243,232,.85)"; x.lineWidth = 5; x.beginPath();
    for (let i = 0; i <= 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; const px = 640 + Math.cos(a) * 62, py = 400 + Math.sin(a) * 62; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke();
    x.fillStyle = "rgba(247,243,232,.9)"; x.beginPath(); x.arc(620, 392, 7, 0, 7); x.arc(660, 392, 7, 0, 7); x.fill();
    x.beginPath(); x.arc(640, 410, 18, 0.2, Math.PI - 0.2); x.stroke();
  });
  const deskaTab = new THREE.Mesh(new THREE.PlaneGeometry(2.85, 1.9), new THREE.MeshStandardMaterial({ map: tabTex, roughness: 0.95, emissive: "#FFFFFF", emissiveMap: tabTex, emissiveIntensity: 0.12 }));
  deskaTab.position.z = 0.08; tabule.add(deskaTab);
  const ramTab = new THREE.Mesh(zaobleny(3.1, 2.15, 0.1, 0.06), plast("#A06C40", { clearcoat: 0.7, roughness: 0.4 })); tabule.add(ramTab);
  // Zlatá záře kolem rámu (deska o kus větší za rámem): pulzuje, dokud dnešní trénink není hotový
  const zlatyRam = new THREE.Mesh(zaobleny(3.32, 2.37, 0.04, 0.1), new THREE.MeshStandardMaterial({ color: "#FFD45A", emissive: "#FFB000", emissiveIntensity: 0, toneMapped: false }));
  zlatyRam.position.z = -0.02; tabule.add(zlatyRam);
  const kridy = new THREE.Mesh(zaobleny(1.5, 0.07, 0.2, 0.02), ramTab.material); kridy.position.set(0, -1.12, 0.1); tabule.add(kridy);
  for (const [cx, c] of [[-0.3, "#FFFFFF"], [0.0, "#FFD45A"], [0.3, "#FF8AE0"]] as const) { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8), plast(c)); k.rotation.z = Math.PI / 2; k.position.set(cx, -1.06, 0.15); tabule.add(k); }
  const tabSvetlo = new THREE.PointLight("#FFE3A0", 0, 3.5, 1.8); tabSvetlo.position.set(0, 0.4, 1.2); tabule.add(tabSvetlo);
  stin(tabule); reg(tabule, "tabule");
  let tabuleOd = -10;
  const sviti = o.tabuleSviti !== false;
  krokFn.push((t) => {
    const u = t - tabuleOd; const puls = sviti ? 0.5 + 0.5 * Math.sin(t * 2.4) : 0;
    (deskaTab.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.12 + puls * 0.08 + (u < 2 ? Math.sin((u / 2) * Math.PI) * 0.3 : 0);
    (zlatyRam.material as THREE.MeshStandardMaterial).emissiveIntensity = puls * 1.6; zlatyRam.visible = sviti;
    tabSvetlo.intensity = 0.6 + puls * 1.2;
    tabule.scale.setScalar(1 + (u < 0.35 ? Math.sin((u / 0.35) * Math.PI) * 0.04 : 0));
  });

  // ── šatní skříň u boční stěny (průchod do šatníku) ──
  const skrin = new THREE.Group(); skrin.position.set(4.45, Y0, -3.75); skrin.rotation.y = 0; svet.add(skrin);
  const drevo = plast("#C0835A", { clearcoat: 0.6, roughness: 0.4 });
  // dutá skříň: záda + boky + strop a dno, ať je po otevření vidět dovnitř
  const zada = new THREE.Mesh(zaobleny(1.75, 2.75, 0.3, 0.08), drevo); zada.position.set(0, 1.375, -0.25); skrin.add(zada);
  for (const sx of [-1, 1]) { const bok = new THREE.Mesh(zaobleny(0.1, 2.75, 0.84, 0.04), drevo); bok.position.set(sx * 0.83, 1.375, 0); skrin.add(bok); }
  for (const y of [0.05, 2.7]) { const deska = new THREE.Mesh(zaobleny(1.75, 0.1, 0.84, 0.04), drevo); deska.position.set(0, y, 0); skrin.add(deska); }
  const korunka = new THREE.Mesh(zaobleny(1.95, 0.16, 0.9, 0.06), plast("#9A6340", { clearcoat: 0.8 })); korunka.position.y = 2.82; skrin.add(korunka);
  // uvnitř: světlo a ramínka s oblečením Hexíka (vidět po otevření)
  const vnitrek = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 2.4), new THREE.MeshStandardMaterial({ color: "#FFE9C8", emissive: "#FFD39A", emissiveIntensity: 0.6 })); vnitrek.position.set(0, 1.4, -0.09); skrin.add(vnitrek);
  const tycS = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 8), plast("#D9B26A", { metalness: 0.8, roughness: 0.25 })); tycS.rotation.z = Math.PI / 2; tycS.position.set(0, 2.3, 0.1); skrin.add(tycS);
  ["#E63946", "#3D7BFF", "#FFD45A", "#7CFF8A", "#FF8AE0"].forEach((c, i) => { const sal = new THREE.Mesh(zaobleny(0.22, 0.7, 0.05, 0.05), plast(c, { sheen: 1, roughness: 0.9 })); sal.position.set(-0.56 + i * 0.28, 1.9, 0.12); skrin.add(sal); });
  const svetloSkrine = new THREE.PointLight("#FFD39A", 0, 3.5, 1.8); svetloSkrine.position.set(0, 1.6, 1.0); skrin.add(svetloSkrine);
  const dvirka: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const pant = new THREE.Group(); pant.position.set(sx * 0.86, 0, 0.42); skrin.add(pant);
    const d = new THREE.Mesh(zaobleny(0.84, 2.5, 0.07, 0.06), plast("#D4976A", { clearcoat: 0.7, roughness: 0.35 })); d.position.set(-sx * 0.42, 1.38, 0); pant.add(d);
    const vyplet = new THREE.Mesh(zaobleny(0.6, 1.0, 0.03, 0.05), plast("#C0835A")); vyplet.position.set(-sx * 0.42, 1.9, 0.045); pant.add(vyplet);
    const vyplet2 = vyplet.clone(); vyplet2.position.y = 0.75; pant.add(vyplet2);
    const knof = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), plast("#FFD45A", { metalness: 0.85, roughness: 0.2 })); knof.position.set(-sx * 0.76, 1.35, 0.07); pant.add(knof);
    dvirka.push(pant);
  }
  // cedulka s ramínkem a šestiúhelníkem nad dvířky
  const cedTex = tex(256, 96, (x) => { x.fillStyle = "#FFF4E2"; x.beginPath(); x.roundRect(4, 4, 248, 88, 22); x.fill(); x.fillStyle = "#6B3F1F"; x.font = "bold 44px 'DM Sans', sans-serif"; x.textAlign = "center"; x.fillText("Šatník", 128, 64); });
  const cedulka = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), new THREE.MeshStandardMaterial({ map: cedTex, transparent: true, emissive: "#FFFFFF", emissiveMap: cedTex, emissiveIntensity: 0.15 })); cedulka.position.set(0, 2.98, 0.47); skrin.add(cedulka);
  stin(skrin); reg(skrin, "skrin");
  let skrinOd = -10;
  krokFn.push((t) => {
    const u = t - skrinOd; const ot = u < 0 ? 0 : u < 0.6 ? Math.sin((u / 0.6) * Math.PI / 2) : skrinOd > 0 ? 1 : 0;
    dvirka[0].rotation.y = -ot * 1.7; dvirka[1].rotation.y = ot * 1.7; svetloSkrine.intensity = ot * 3;
  });

  // ── Hexík ──
  let hx: HexikModel = postavHexika(o.podoba, o.etapa, meritko, o.sloty ?? {});
  stin(hx.root); scene.add(hx.root, hx.okoli); hx.stin.visible = false; // stín řeší světlo
  const hxPos = new THREE.Vector3(0.6, 0, 0.6); let hxCil: THREE.Vector3 | null = null; let hxSedi = false; let hxRot = 0;
  let skok = -10, oslavaOd = -10, vyraz: Vyraz3D = "neutral", vyrazDo = 0, mrk = 2, mrkStart = -1;
  let hrejeRuce = 0;
  // Nábytek na podlaze jako kruhy (x, z, poloměr): Hexík ho obchází, cíl uvnitř posune na okraj
  const PREKAZKY: [number, number, number][] = [[-3.2, -3.0, 1.55], [-2.05, -2.25, 0.72], [-4.55, -1.8, 0.8], [-4.55, -0.2, 0.8], [2.9, -2.3, 1.05], [4.1, -0.7, 0.72], [4.45, -3.45, 0.95]];
  const vMistnosti = (v: THREE.Vector3) => new THREE.Vector3(THREE.MathUtils.clamp(v.x, -4.2, 4.6), 0, THREE.MathUtils.clamp(v.z, -3.2, 3.4));
  const venZPrekazek = (v: THREE.Vector3) => { for (const [x, z, r] of PREKAZKY) { const d = new THREE.Vector3(v.x - x, 0, v.z - z); if (d.length() < r) { if (d.lengthSq() < 1e-4) d.set(0, 0, 1); v.set(x, 0, z).addScaledVector(d.normalize(), r + 0.05); } } return vMistnosti(v); };
  const naplanuj = (a: THREE.Vector3, b: THREE.Vector3, hloubka = 0): THREE.Vector3[] => {
    if (hloubka > 3) return [b];
    const ab = b.clone().sub(a); const l2 = ab.lengthSq(); if (l2 < 1e-4) return [b];
    for (const [x, z, r] of PREKAZKY) {
      const c = new THREE.Vector3(x, 0, z); const t = THREE.MathUtils.clamp(c.clone().sub(a).dot(ab) / l2, 0, 1);
      const q = a.clone().addScaledVector(ab, t);
      if (t > 0.02 && t < 0.98 && q.distanceTo(c) < r + 0.1) {
        const bok = q.clone().sub(c); if (bok.lengthSq() < 1e-4) bok.set(-ab.z, 0, ab.x);
        const obchvat = venZPrekazek(c.clone().addScaledVector(bok.normalize(), r + 0.45));
        return [...naplanuj(a, obchvat, hloubka + 1), ...naplanuj(obchvat, b, hloubka + 1)];
      }
    }
    return [b];
  };
  let trasa: THREE.Vector3[] = [];
  const jdiNa = (v: THREE.Vector3, presne = false) => { hxSedi = false; const cil = presne ? vMistnosti(v.clone()) : venZPrekazek(v.clone()); trasa = naplanuj(hxPos.clone(), cil); hxCil = trasa.shift() ?? null; };
  reg(hx.root, "hexik");
  let dalsiProchazka = 6;

  // ── Hexík dělá kouzla sám (Karel 19. 11.): ťuknutí mu zadá úkol, dojde k věci, natočí se,
  //    udělá pohyb a efekt se spustí až jeho akcí (hodí poleno, otevře víko, napije se…) ──
  interface Ukol { k: Kouzlo | Pruchod; bod: THREE.Vector3; smer: number; trvani: number; efektPo: number; efekt: () => void; ruce: (u: number) => number; prubeh?: (u: number) => void; konec?: () => void }
  let ukol: Ukol | null = null, ukolOd = -1, efektHotov = false;
  const zadej = (u: Ukol) => { ukol = u; ukolOd = -1; efektHotov = false; jdiNa(u.bod, true); };
  // Průchod: kamera po efektu letí k tabuli / do skříně, appka mezitím přepne stránku
  let letOd = -1; const letKam = new THREE.Vector3(), letNa = new THREE.Vector3();
  const prolet = (k: Pruchod, objekt: THREE.Object3D, predem: THREE.Vector3) => {
    objekt.updateMatrixWorld(true); letNa.copy(objekt.localToWorld(new THREE.Vector3(0, objekt === tabule ? 0 : 1.4, 0)));
    letKam.copy(objekt.localToWorld(predem)); letOd = cas; o.onPruchod?.(k);
  };
  // Křeslo: Hexík dojde před něj, otočí se zády k opěradlu a vyskočí na sedák
  const KRESLO = new THREE.Vector3(2.9, 0, -2.3), KRESLO_YAW = -0.55, vpred = new THREE.Vector3(Math.sin(KRESLO_YAW), 0, Math.cos(KRESLO_YAW));
  const KRESLO_PRED = KRESLO.clone().addScaledVector(vpred, 1.35), KRESLO_SEDAK = KRESLO.clone().addScaledVector(vpred, 0.12);
  // Poleno, které Hexík hodí do krbu, a hrnek, který si vezme do ruky
  const poleno = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.42, 10), plast("#7A4A2A", { roughness: 0.9 })); poleno.visible = false; stin(poleno); svet.add(poleno);
  const hrnekVRuce = hrnek.clone(true); hrnekVRuce.visible = false; svet.add(hrnekVRuce);
  const vRuce = (lok: THREE.Vector3) => { hx.root.updateMatrixWorld(true); return hx.root.localToWorld(lok.clone()); };

  // ── postprocessing (záře světel) ──
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.38, 0.5, 0.9); if (!lehce) composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ── kamera: otáčení tažením, přiblížení kolečkem/štípnutím, jemné dýchání ──
  let azim = 0.28, cilAzim = 0.28, elev = 0.38, cilElev = 0.38, vzd = 17, cilVzd = 17;
  const cilBod = new THREE.Vector3(0.25, 0.7, -0.9);
  function velikost() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    meritko.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }

  // ── interakce ──
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  let tah: { x: number; y: number; ujeto: number; id: number } | null = null;
  const prsty = new Map<number, { x: number; y: number }>(); let stipnuti = 0;
  const kouzlo = (k: Kouzlo) => o.onKouzlo(k);
  function tuk(e: PointerEvent) {
    const r = canvas.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const zasahy = ray.intersectObjects(klikaci.map((k) => k.obj), true);
    if (!zasahy.length) return;
    let ob: THREE.Object3D | null = zasahy[0].object; let co: Kouzlo | "podlaha" | null = null;
    while (ob && !co) { const k = klikaci.find((x) => x.obj === ob); if (k) co = k.kouzlo; ob = ob.parent; }
    if (!co) return;
    if (co === "podlaha") { ukol = null; jdiNa(zasahy[0].point); return; }
    if (co === "hexik") { skok = cas; vyraz = "radost"; vyrazDo = cas + 1.4; vystrelKonfety(hxPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0.5); kouzlo("hexik"); return; }
    const smerK = (bod: THREE.Vector3, cil: THREE.Vector3) => Math.atan2(cil.x - bod.x, cil.z - bod.z);
    const zvedni = (u: number, kdy = 0.5) => (u < kdy ? 2.3 * Math.sin((u / kdy) * Math.PI * 0.5) : 2.3 * (1 - (u - kdy) / (1 - kdy)) + 0.12);
    if (co === "krb") zadej({ k: "krb", bod: new THREE.Vector3(-3.5, 0, -1.0), smer: -Math.PI / 2, trvani: 2.6, efektPo: 0.42,
      ruce: (u) => (u < 0.42 ? 0.6 + u * 3.2 : 1.05 + Math.sin(cas * 6) * 0.1),
      prubeh: (u) => { // poleno z rukou obloukem do krbu
        poleno.visible = u < 0.45;
        const z = vRuce(new THREE.Vector3(0, 0.2, 1.0)), k = new THREE.Vector3(-4.45, Y0 + 0.5, -1.0), s = Math.min(1, Math.max(0, (u - 0.2) / 0.22));
        poleno.position.lerpVectors(z, k, s); poleno.position.y += Math.sin(s * Math.PI) * 0.5; poleno.rotation.set(s * 4, 0, Math.PI / 2);
      },
      efekt: () => { ohenFlare = 1.5; hrejeRuce = cas + 1.6; vyraz = "radost"; vyrazDo = cas + 1.6; } });
    if (co === "darek") {
      const i = klikaci.filter((x) => x.kouzlo === "darek").findIndex((x) => isPotomek(zasahy[0].object, x.obj));
      const d = darky[i]; const [, , , x, z] = DARKY[i] ?? DARKY[0];
      const bod = new THREE.Vector3(x + 0.15, 0, z + 0.85);
      zadej({ k: "darek", bod, smer: smerK(bod, new THREE.Vector3(x, 0, z)), trvani: 2.4, efektPo: 0.3,
        ruce: (u) => (u < 0.3 ? 0.4 + u * 2.4 : 1.7 + Math.sin(cas * 9) * 0.2),
        efekt: () => { if (d) { d.otevreno = cas; vystrelKonfety(d.vika.getWorldPosition(new THREE.Vector3()), 0.8); } skok = cas + 0.15; vyraz = "prekvapeni"; vyrazDo = cas + 1.4; } });
    }
    if (co === "stromecek") { const bod = new THREE.Vector3(-1.55, 0, -1.45); zadej({ k: "stromecek", bod, smer: smerK(bod, new THREE.Vector3(-3.2, 0, -3.0)), trvani: 1.8, efektPo: 0.45, ruce: (u) => zvedni(u, 0.45),
      efekt: () => { vzorek = (vzorek + 1) % 3; vzorekOd = cas; vystrelKonfety(new THREE.Vector3(-3.2, Y0 + 3.4, -3.0), 0.6); vyraz = "radost"; vyrazDo = cas + 1.4; } }); }
    if (co === "snezitko") zadej({ k: "snezitko", bod: new THREE.Vector3(3.65, 0, -3.1), smer: Math.PI, trvani: 1.8, efektPo: 0.4, ruce: (u) => zvedni(u, 0.4),
      prubeh: (u) => { if (u > 0.05 && u < 0.1 && cas - skok > 0.7) skok = cas; }, efekt: () => { globeTres = cas; vyraz = "radost"; vyrazDo = cas + 1.2; } });
    if (co === "okno") zadej({ k: "okno", bod: new THREE.Vector3(2.05, 0, -3.2), smer: Math.PI, trvani: 2.8, efektPo: 0.3, ruce: (u) => (u < 0.3 ? u * 4 : 1.2 + Math.sin(cas * 3) * 0.1),
      efekt: () => { hvezdaCas = cas; narazSnehu = 1; vyraz = "prekvapeni"; vyrazDo = cas + 1.8; } });
    if (co === "lampa" || co === "hrnek") {
      const bod = new THREE.Vector3(3.3, 0, -0.3), smer = smerK(bod, new THREE.Vector3(4.1, 0, -0.7));
      if (co === "lampa") zadej({ k: "lampa", bod, smer, trvani: 1.3, efektPo: 0.5, ruce: (u) => zvedni(u, 0.5), efekt: () => { lampaZap = !lampaZap; } });
      else zadej({ k: "hrnek", bod, smer, trvani: 3.2, efektPo: 0.25,
        ruce: (u) => (u < 0.2 ? u * 7 : u < 0.85 ? 1.45 : 1.45 - (u - 0.85) * 8),
        prubeh: (u) => { // vezme hrnek, napije se (náklon) a vrátí ho
          const nese = u > 0.2 && u < 0.88; hrnek.visible = !nese; hrnekVRuce.visible = nese;
          if (nese) { hrnekVRuce.position.copy(vRuce(new THREE.Vector3(0, 0.75, 0.85))); hrnekVRuce.rotation.set(u > 0.35 && u < 0.7 ? -0.9 : 0, hx.root.rotation.y, 0); }
        },
        efekt: () => { paraPuf = 1.5; vyraz = "radost"; vyrazDo = cas + 2.4; }, konec: () => { hrnek.visible = true; hrnekVRuce.visible = false; } });
    }
    if (co === "hodiny") zadej({ k: "hodiny", bod: new THREE.Vector3(-1.6, 0, -3.2), smer: Math.PI, trvani: 1.8, efektPo: 0.45, ruce: (u) => zvedni(u, 0.45),
      prubeh: (u) => { if (u > 0.3 && u < 0.36 && cas - skok > 0.7) skok = cas; }, efekt: () => { hodinyNat = cas; } });
    if (co === "vlacek") { const a = vlakU, bod = new THREE.Vector3(0.2 + Math.cos(a + 0.4) * 1.5, 0, 0.2 + Math.sin(a + 0.4) * 1.5);
      zadej({ k: "vlacek", bod, smer: smerK(bod, new THREE.Vector3(0.2 + Math.cos(a + 0.4) * 2.36, 0, 0.2 + Math.sin(a + 0.4) * 2.36)), trvani: 2.2, efektPo: 0.15,
        ruce: () => 1.6 + Math.sin(cas * 12) * 0.5, efekt: () => { vlakHouk = cas; vyraz = "radost"; vyrazDo = cas + 1.8; } }); }
    // Tabule: Hexík k ní dojde, ukáže na „Jdeme trénovat“ a kamera vletí do tabule (průchod do tréninku)
    if (co === "tabule") { const bod = new THREE.Vector3(-0.75, 0, -2.75); zadej({ k: "trenink", bod, smer: Math.PI, trvani: 1.4, efektPo: 0.45, ruce: (u) => (u < 0.45 ? u * 4 : 1.8),
      efekt: () => { tabuleOd = cas; skok = cas; vyraz = "radost"; vyrazDo = cas + 2; prolet("trenink", tabule, new THREE.Vector3(0, -0.1, 1.6)); } }); }
    // Skříň: Hexík otevře dvířka, vleze dovnitř a kamera za ním (průchod do šatníku)
    if (co === "skrin") { const PRED = new THREE.Vector3(4.3, 0, -2.25), UVNITR = new THREE.Vector3(4.4, 0, -3.3);
      zadej({ k: "satnik", bod: PRED, smer: Math.PI, trvani: 1.8, efektPo: 0.3, ruce: (u) => (u < 0.3 ? 0.4 + u * 4 : 1.6),
        prubeh: (u) => { if (u > 0.4) hxPos.lerpVectors(PRED, UVNITR, Math.min(1, (u - 0.4) / 0.5)); },
        efekt: () => { skrinOd = cas; vyraz = "radost"; vyrazDo = cas + 2; prolet("satnik", skrin, new THREE.Vector3(0, 1.5, 1.7)); } }); }
    if (co === "kreslo") zadej({ k: "kreslo", bod: KRESLO_PRED, smer: KRESLO_YAW, trvani: 0.7, efektPo: 0.99, ruce: (u) => 0.3 + u * 0.6,
      prubeh: (u) => { hxPos.lerpVectors(KRESLO_PRED, KRESLO_SEDAK, Math.min(1, u * 1.3)); },
      efekt: () => { hxSedi = true; hxRot = KRESLO_YAW; vyraz = "ospaly"; vyrazDo = cas + 0.1; } });
  }
  const isPotomek = (o2: THREE.Object3D, rodic: THREE.Object3D) => { let p: THREE.Object3D | null = o2; while (p) { if (p === rodic) return true; p = p.parent; } return false; };
  const dolu = (e: PointerEvent) => { prsty.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (prsty.size === 2) { const [a, b] = [...prsty.values()]; stipnuti = Math.hypot(a.x - b.x, a.y - b.y); tah = null; } else tah = { x: e.clientX, y: e.clientY, ujeto: 0, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch { /* */ } };
  const pohyb = (e: PointerEvent) => {
    if (prsty.has(e.pointerId)) prsty.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (prsty.size === 2) { const [a, b] = [...prsty.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); cilVzd = THREE.MathUtils.clamp(cilVzd * (stipnuti / Math.max(1, d)), 10, 22); stipnuti = d; return; }
    if (!tah || tah.id !== e.pointerId) return;
    const dx = e.clientX - tah.x, dy = e.clientY - tah.y; tah.x = e.clientX; tah.y = e.clientY; tah.ujeto += Math.abs(dx) + Math.abs(dy);
    cilAzim = THREE.MathUtils.clamp(cilAzim - dx * 0.005, -0.25, 1.05);
    // Svislý tah prstem v kartě posouvá stránku; náklon pohledu jen myší nebo na celé obrazovce
    if (cela || e.pointerType === "mouse") cilElev = THREE.MathUtils.clamp(cilElev + dy * 0.003, 0.16, 0.7);
  };
  const nahoru = (e: PointerEvent) => { if (tah && tah.id === e.pointerId && tah.ujeto < 8) tuk(e); prsty.delete(e.pointerId); if (!prsty.size) tah = null; };
  const kolecko = (e: WheelEvent) => { if (!cela) return; e.preventDefault(); cilVzd = THREE.MathUtils.clamp(cilVzd + e.deltaY * 0.01, 10, 22); };
  canvas.addEventListener("pointerdown", dolu); canvas.addEventListener("pointermove", pohyb); window.addEventListener("pointerup", nahoru); canvas.addEventListener("wheel", kolecko, { passive: false });

  // ── smyčka ──
  let cas = 0, minule = performance.now(), raf = 0, videt = true;
  function snimek() {
    const ted = performance.now(); const dt = Math.min(0.05, (ted - minule) / 1000); minule = ted; cas += dt;
    azim += (cilAzim - azim) * 0.08; elev += (cilElev - elev) * 0.08; vzd += (cilVzd - vzd) * 0.08;
    const dych = Math.sin(cas * 0.4) * 0.02;
    // Na výšku (telefon) kamera dál, ať se celý pokojíček vejde
    const asp = camera.aspect, d = vzd * (asp < 1 ? Math.min(2.3, 1.12 / asp) : 1);
    camera.position.set(Math.sin(azim + dych) * Math.cos(elev) * d, Math.sin(elev) * d + 1, Math.cos(azim + dych) * Math.cos(elev) * d);
    camera.lookAt(cilBod);
    // Průchod: kamera plynule doletí k tabuli / do skříně
    if (letOd >= 0) {
      const s = Math.min(1, (cas - letOd) / 1.15), e = s * s * (3 - 2 * s);
      camera.position.lerp(letKam, e); camera.lookAt(cilBod.clone().lerp(letNa, e));
    }
    // Mlha podle vzdálenosti kamery (na výšku je kamera dál a pevná mlha by scénu ztmavila)
    if (scene.fog instanceof THREE.Fog) { scene.fog.near = d + 5; scene.fog.far = d + 23; }
    for (const f of krokFn) f(cas, dt);
    // Hexík: chůze k cíli s poskakováním, občas se sám projde
    let hop = 0, jde = false;
    if (hxCil) {
      const d = hxCil.clone().sub(hxPos); d.y = 0; const l = d.length();
      if (l > 0.08) { jde = true; const krok = Math.min(l, dt * 1.7); hxPos.add(d.normalize().multiplyScalar(krok)); hxRot = Math.atan2(d.x, d.z); hop = Math.abs(Math.sin(cas * 11)) * 0.16; }
      else hxCil = trasa.shift() ?? null;
    } else if (!ukol && !hxSedi && letOd < 0 && cas > dalsiProchazka) { dalsiProchazka = cas + rnd(7, 13); jdiNa(new THREE.Vector3(rnd(-2.5, 3.5), 0, rnd(-1.5, 2.5))); }
    // Úkol: po příchodu se natočí, provede pohyb a v pravou chvíli spustí efekt
    let rukyUkol: number | null = null;
    const u0 = ukol as Ukol | null;
    if (u0 && !hxCil) {
      if (ukolOd < 0) { ukolOd = cas; hxRot = u0.smer; }
      const otoceno = Math.abs(Math.atan2(Math.sin(u0.smer - hx.root.rotation.y), Math.cos(u0.smer - hx.root.rotation.y))) < 0.35;
      if (!otoceno && cas - ukolOd < 0.6) ukolOd = cas; // nejdřív se otočí, pak začne
      const u = Math.min(1, (cas - ukolOd) / u0.trvani);
      rukyUkol = u0.ruce(u); u0.prubeh?.(u);
      if (!efektHotov && u >= u0.efektPo) { efektHotov = true; u0.efekt(); if (u0.k in KOUZLA) kouzlo(u0.k as Kouzlo); }
      if (u >= 1) { u0.konec?.(); poleno.visible = false; ukol = null; dalsiProchazka = cas + rnd(6, 10); }
    }
    const sed = hxSedi && !hxCil;
    const ts = cas - skok, to = cas - oslavaOd;
    // Hexík stojí nohama na podlaze, když je jeho kořen v y = 0 (model má nohy v −1,4 = Y0)
    const sedVyska = ukol && (ukol as Ukol).k === "kreslo" && ukolOd >= 0 ? Math.min(1, (cas - ukolOd) / 0.7) * 0.55 + Math.sin(Math.min(1, (cas - ukolOd) / 0.7) * Math.PI) * 0.35 : 0;
    let y = (sed ? 0.55 : sedVyska) + (Math.sin(cas * 2) * 0.03 + hop) * HX_S;
    if (ts < 0.7) y += Math.sin((ts / 0.7) * Math.PI) * 0.55;
    if (to < 2.2) y += Math.abs(Math.sin(to * 5)) * 0.4 * (1 - to / 2.2);
    hx.root.position.set(hxPos.x, Y0 + 1.4 * HX_S + y, hxPos.z);
    // Natočení: při chůzi po směru, v klidu napůl ke kameře; při oslavě se zatočí dokola
    const kKamere = Math.atan2(camera.position.x - hxPos.x, camera.position.z - hxPos.z);
    const cilR = jde || sed || ukol ? hxRot : kKamere;
    let rozdil = cilR - hx.root.rotation.y; rozdil = Math.atan2(Math.sin(rozdil), Math.cos(rozdil));
    hx.root.rotation.y += rozdil * 0.12 + (to < 1.1 ? 0.35 : 0);
    hx.root.scale.setScalar(HX_S * (sed ? 0.95 : 1));
    if (cas > mrk) { mrkStart = cas; mrk = cas + rnd(2.4, 4.8); }
    const bl = mrkStart > 0 && cas - mrkStart < 0.16 ? 1 - 0.9 * Math.sin(((cas - mrkStart) / 0.16) * Math.PI) : 1;
    if (cas > vyrazDo) vyraz = hrejeRuce > cas ? "radost" : sed ? "ospaly" : "neutral";
    animujOblicej(hx.oblicej, { vyraz, lookX: Math.sin(cas * 0.5) * 0.3, lookY: 0.05, mrk: bl, tVyraz: cas }, dt);
    const ruka = to < 2.2 ? 1.6 + Math.sin(cas * 10) * 0.3 : rukyUkol !== null ? rukyUkol : hrejeRuce > cas ? 1.1 + Math.sin(cas * 6) * 0.1 : jde ? 0.25 + Math.sin(cas * 11) * 0.25 : 0.12 + Math.sin(cas * 2) * 0.04;
    hx.armL.rotation.z = -(ruka + (hx.rucePlne ? 0.25 : 0)); hx.armR.rotation.z = ruka + (hx.rucePlne ? 0.25 : 0);
    hx.aktualizuj({ ay: 0, wx: 0, wy: 0, wz: 0, cas, dt });
    hx.okoli.position.copy(hx.root.position);
    composer.render();
  }
  // Slabé zařízení: nejvýš 30 snímků za sekundu
  let posledniSnimek = 0;
  function smycka(t: number) {
    if (!videt || document.hidden) { raf = 0; return; }
    if (!lehce || t - posledniSnimek >= 32) { posledniSnimek = t; snimek(); }
    raf = requestAnimationFrame(smycka);
  }
  const spust = () => { if (!raf) { minule = performance.now(); raf = requestAnimationFrame(smycka); } };
  const io = new IntersectionObserver((z) => { videt = z.some((x) => x.isIntersecting); if (videt) spust(); }); io.observe(canvas);
  const ro = new ResizeObserver(velikost); ro.observe(canvas); velikost();
  const vis = () => { if (!document.hidden) spust(); }; document.addEventListener("visibilitychange", vis);
  spust();

  return {
    nastav(podoba, etapa, sloty = {}) {
      scene.remove(hx.root, hx.okoli);
      const i = klikaci.findIndex((k) => k.obj === hx.root); if (i >= 0) klikaci.splice(i, 1);
      hx.dispose();
      hx = postavHexika(podoba, etapa, meritko, sloty);
      stin(hx.root); hx.stin.visible = false; scene.add(hx.root, hx.okoli); reg(hx.root, "hexik");
    },
    rezim(c) { cela = c; },
    oslava: () => { oslavaOd = cas; vyraz = "radost"; vyrazDo = cas + 2.4; vystrelKonfety(hxPos.clone().add(new THREE.Vector3(0, 1.5, 0)), 1.2); },
    zpet: () => { letOd = -1; skrinOd = -10; ukol = null; hxPos.set(0.6, 0, 0.6); hxCil = null; trasa = []; },
    znic: () => {
      cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", vis);
      canvas.removeEventListener("pointerdown", dolu); canvas.removeEventListener("pointermove", pohyb); window.removeEventListener("pointerup", nahoru); canvas.removeEventListener("wheel", kolecko);
      hx.dispose();
      // Uklidit geometrie, materiály a textury celé scény (jinak by zůstaly v paměti grafiky)
      const hotovo = new Set<{ dispose: () => void }>();
      const pryc = (x: { dispose: () => void } | null | undefined) => { if (x && !hotovo.has(x)) { hotovo.add(x); x.dispose(); } };
      scene.traverse((ob) => {
        const m = ob as THREE.Mesh;
        pryc(m.geometry);
        for (const mat of (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) as THREE.Material[]) {
          for (const v of Object.values(mat)) if (v instanceof THREE.Texture) pryc(v);
          pryc(mat);
        }
      });
      env.dispose(); bloom.dispose(); composer.dispose(); renderer.dispose();
    },
  };
}
