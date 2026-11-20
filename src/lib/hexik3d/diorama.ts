/**
 * Společný základ domovů Hexíka (diorama ostrůvky v kvalitě Hexíka, Karel 19.–20. 11. 2026).
 * Jádro z Vánočního pokojíčku: renderer se stíny a září, kamera (tah, štípnutí, kolečko jen na celé
 * obrazovce), Hexík, který se prochází a sám dělá kouzla (ťuknutí mu zadá úkol: dojde, natočí se,
 * udělá pohyb a efekt přijde až jeho akcí), konfety, úklid paměti. Každý domov dodá jen svůj obsah.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { pomerPixelu, ostryComposer, ostreTextury, hlidacPlynulosti } from "./kvalita";
import { postavHexika, type HexikModel, type SlotyHexika } from "./model";
import { animujOblicej, type Vyraz3D } from "./oblicej";

// ───────────────────────── pomůcky pro obsah domovů ─────────────────────────
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const tex = (w: number, h: number, kresli: (x: CanvasRenderingContext2D) => void, opak?: [number, number]) => {
  const c = document.createElement("canvas"); c.width = w; c.height = h; kresli(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (opak) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...opak); }
  return t;
};
export const plast = (color: string, o: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
  new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35, sheen: 0.25, sheenColor: new THREE.Color("#FFF3E0"), ...o });
export const zaobleny = (w: number, h: number, d: number, r = 0.08, seg = 4) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
export function stin<T extends THREE.Object3D>(m: T, vrha = true, prijima = true): T { m.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = vrha; o.receiveShadow = prijima; } }); return m; }
export const jePotomek = (o: THREE.Object3D, rodic: THREE.Object3D) => { let p: THREE.Object3D | null = o; while (p) { if (p === rodic) return true; p = p.parent; } return false; };
export const smerK = (bod: THREE.Vector3, cil: THREE.Vector3) => Math.atan2(cil.x - bod.x, cil.z - bod.z);
/** Ruce nahoru a zase dolů (sáhnout na něco). */
export const zvedni = (u: number, kdy = 0.5) => (u < kdy ? 2.3 * Math.sin((u / kdy) * Math.PI * 0.5) : 2.3 * (1 - (u - kdy) / (1 - kdy)) + 0.12);
export const BARVY_KONFET = ["#FF4D5E", "#FFD45A", "#4DD8FF", "#7CFF8A", "#FF8AE0"].map((c) => new THREE.Color(c));

/** Úkol Hexíka: dojde na `bod`, natočí se na `smer`, `trvani` s pohybem rukou, v `efektPo` (0–1) spustí efekt. */
export interface Ukol {
  bod: THREE.Vector3; smer: number; trvani: number; efektPo: number;
  efekt: () => void; ruce: (u: number) => number; prubeh?: (u: number) => void; konec?: () => void;
}

/** Co domov dostane od základu. */
export interface Kontext {
  scene: THREE.Scene; svet: THREE.Group; camera: THREE.PerspectiveCamera;
  /** Výška podlahy (nohy Hexíka). */
  Y0: number;
  lehce: boolean;
  /** Ťuknutelná věc: klíč kouzla, nebo "podlaha" (Hexík tam dojde). */
  reg: (obj: THREE.Object3D, klic: string) => THREE.Object3D;
  krok: (f: (t: number, dt: number) => void) => void;
  konfety: (kde: THREE.Vector3, sila?: number, barvy?: THREE.Color[]) => void;
  hexik: {
    pos: THREE.Vector3;
    /** Bod v prostoru vzhledem k Hexíkovi (pro věci v rukou). */
    vRuce: (lok: THREE.Vector3) => THREE.Vector3;
    root: () => THREE.Object3D;
    skoc: () => void;
    vyraz: (v: Vyraz3D, sekund: number) => void;
    /** Výška nad podlahou navíc (sezení, plavání…), dokud ji domov nevrátí na 0. */
    nadPodlahou: { value: number };
    cas: () => number;
    /** Natočení Hexíka během úkolu (jízda po ledě, tanec…). */
    otoc: (smer: number) => void;
  };
  tabule: string[];
}

export interface ObsahDomova {
  /** Barva pozadí a mlhy. */
  pozadi: string;
  /** Kde Hexík začíná a kam smí chodit. */
  start: THREE.Vector3;
  meze: { x: [number, number]; z: [number, number] };
  /** Ťuknutí na věc: úkol pro Hexíka, nebo null (stačí efekt hned / nic). */
  ukol: (klic: string, zasah: THREE.Intersection) => Ukol | null;
  /** Kamera: počáteční natočení, náklon, vzdálenost a bod, kam se dívá. */
  kamera?: { azim?: number; elev?: number; vzd?: number; cil?: THREE.Vector3; azimMez?: [number, number] };
  /** Světla (výchozí: měsíční noc s teplým hlavním světlem). */
  svetla?: { obloha?: [string, string, number]; hlavni?: [string, number]; mesic?: [string, number] };
  zare?: number;
}

export interface Diorama {
  nastav: (podoba: string, etapa: number, sloty?: SlotyHexika) => void;
  rezim: (celaObrazovka: boolean) => void;
  oslava: () => void;
  znic: () => void;
}

export interface MoznostiDioramatu {
  podoba: string; etapa: number; sloty?: SlotyHexika; tabule?: string[]; lehce?: boolean;
  onKouzlo: (k: string) => void;
}

const HX_S = 0.62; // Hexík v měřítku domova (model má nohy v −1,4 při měřítku 1)

export function vytvorDiorama(canvas: HTMLCanvasElement, o: MoznostiDioramatu, postav: (k: Kontext) => ObsahDomova): Diorama {
  const lehce = !!o.lehce;
  // Hrany vyhlazuje MSAA v composeru (ostryComposer), antialias plátna by se nepoužil.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(pomerPixelu(lehce));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = !lehce; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04); scene.environment = env.texture; scene.environmentIntensity = 0.22; pm.dispose();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const meritko = { value: 400 };
  const svet = new THREE.Group(); scene.add(svet);
  const Y0 = -1.4;
  let cela = false;
  const klikaci: { obj: THREE.Object3D; klic: string }[] = [];
  const reg = (obj: THREE.Object3D, klic: string) => { klikaci.push({ obj, klic }); return obj; };
  const krokFn: ((t: number, dt: number) => void)[] = [];
  let cas = 0;

  // ── konfety ──
  const nK = 120, kP = new Float32Array(nK * 3), kV = new Float32Array(nK * 3), kC = new Float32Array(nK * 3); let kZ = 99;
  const kG = new THREE.BufferGeometry(); kG.setAttribute("position", new THREE.BufferAttribute(kP, 3)); kG.setAttribute("color", new THREE.BufferAttribute(kC, 3));
  const konfetyBody = new THREE.Points(kG, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0, depthWrite: false })); svet.add(konfetyBody);
  const konfety = (kde: THREE.Vector3, sila = 1, barvy = BARVY_KONFET) => { kZ = 0; for (let i = 0; i < nK; i++) { kP.set([kde.x, kde.y, kde.z], i * 3); kV.set([rnd(-1.6, 1.6) * sila, rnd(2, 4.5) * sila, rnd(-1.6, 1.6) * sila], i * 3); const c = barvy[i % barvy.length]; kC.set([c.r, c.g, c.b], i * 3); } kG.attributes.color.needsUpdate = true; };
  krokFn.push((_t, dt) => {
    kZ += dt; const m = konfetyBody.material as THREE.PointsMaterial; m.opacity = kZ < 2.2 ? Math.min(1, (2.2 - kZ) * 1.5) : 0;
    if (kZ < 2.2) { for (let i = 0; i < nK; i++) { kV[i * 3 + 1] -= 6 * dt; kP[i * 3] += kV[i * 3] * dt; kP[i * 3 + 1] = Math.max(Y0 + 0.02, kP[i * 3 + 1] + kV[i * 3 + 1] * dt); kP[i * 3 + 2] += kV[i * 3 + 2] * dt; } kG.attributes.position.needsUpdate = true; }
  });

  // ── Hexík ──
  let hx: HexikModel = postavHexika(o.podoba, o.etapa, meritko, o.sloty ?? {});
  stin(hx.root); hx.stin.visible = false; scene.add(hx.root, hx.okoli); reg(hx.root, "hexik");
  let skok = -10, oslavaOd = -10, vyraz: Vyraz3D = "neutral", vyrazDo = 0, mrk = 2, mrkStart = -1;
  const nadPodlahou = { value: 0 };
  let hxRot = 0;
  const hxPos = new THREE.Vector3();
  const vRuce = (lok: THREE.Vector3) => { hx.root.updateMatrixWorld(true); return hx.root.localToWorld(lok.clone()); };
  const kontext: Kontext = {
    scene, svet, camera, Y0, lehce, reg, krok: (f) => krokFn.push(f), konfety,
    hexik: { pos: hxPos, vRuce, root: () => hx.root, skoc: () => { skok = cas; }, vyraz: (v, s) => { vyraz = v; vyrazDo = cas + s; }, nadPodlahou, cas: () => cas, otoc: (r) => { hxRot = r; } },
    tabule: o.tabule?.length ? o.tabule : ["Dnešní plán", "Ťukni a jdeme", "trénovat"],
  };
  const obsah = postav(kontext);
  scene.background = new THREE.Color(obsah.pozadi);
  scene.fog = new THREE.Fog(obsah.pozadi, 22, 40);
  hxPos.copy(obsah.start);

  // ── světla ──
  const sv = obsah.svetla ?? {};
  const [obH, obZ, obI] = sv.obloha ?? ["#9C86E8", "#1E1430", 0.22];
  scene.add(new THREE.HemisphereLight(obH, obZ, obI));
  const [meB, meI] = sv.mesic ?? ["#9DB8FF", 0.55];
  const mesic = new THREE.DirectionalLight(meB, meI); mesic.position.set(4, 9, -6); scene.add(mesic);
  const [hlB, hlI] = sv.hlavni ?? ["#FFD8A8", 0.85];
  const klic = new THREE.DirectionalLight(hlB, hlI); klic.position.set(6, 10, 7); klic.castShadow = !lehce;
  klic.shadow.mapSize.set(2048, 2048); klic.shadow.camera.left = -9; klic.shadow.camera.right = 9; klic.shadow.camera.top = 9; klic.shadow.camera.bottom = -9; klic.shadow.bias = -0.0004; klic.shadow.radius = 4;
  scene.add(klic);

  // ── záře ──
  const composer = ostryComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), obsah.zare ?? 0.38, 0.5, 0.9); if (!lehce) composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ── kamera ──
  const k0 = obsah.kamera ?? {};
  let azim = k0.azim ?? 0.42, cilAzim = azim, elev = k0.elev ?? 0.36, cilElev = elev, vzd = k0.vzd ?? 17, cilVzd = vzd;
  const azimMez = k0.azimMez ?? [-0.25, 1.05];
  const cilBod = k0.cil ?? new THREE.Vector3(0, 0.6, -0.6);
  function velikost() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
    meritko.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }

  // ── úkoly a chůze ──
  let hxCil: THREE.Vector3 | null = null, dalsiProchazka = 6;
  let ukol: (Ukol & { k: string }) | null = null, ukolOd = -1, efektHotov = false;
  const jdiNa = (v: THREE.Vector3) => { hxCil = new THREE.Vector3(THREE.MathUtils.clamp(v.x, ...obsah.meze.x), 0, THREE.MathUtils.clamp(v.z, ...obsah.meze.z)); };

  // ── interakce ──
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  // Pára, jiskry a sníh jsou body: bez malé tolerance by „chytaly“ ťuknutí i na věci za nimi
  ray.params.Points = { threshold: 0.02 };
  let tah: { x: number; y: number; ujeto: number; id: number } | null = null;
  const prsty = new Map<number, { x: number; y: number }>(); let stipnuti = 0;
  function tuk(e: PointerEvent) {
    const r = canvas.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const zasahy = ray.intersectObjects(klikaci.map((k) => k.obj), true);
    if (!zasahy.length) return;
    let ob: THREE.Object3D | null = zasahy[0].object; let co: string | null = null;
    while (ob && !co) { const k = klikaci.find((x) => x.obj === ob); if (k) co = k.klic; ob = ob.parent; }
    if (!co) return;
    if (co === "podlaha") { ukol = null; nadPodlahou.value = 0; jdiNa(zasahy[0].point); return; }
    if (co === "hexik") { skok = cas; vyraz = "radost"; vyrazDo = cas + 1.4; konfety(hxPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0.5); o.onKouzlo("hexik"); return; }
    const u = obsah.ukol(co, zasahy[0]);
    if (!u) return;
    nadPodlahou.value = 0;
    ukol = { ...u, k: co }; ukolOd = -1; efektHotov = false; jdiNa(u.bod);
  }
  const dolu = (e: PointerEvent) => { prsty.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (prsty.size === 2) { const [a, b] = [...prsty.values()]; stipnuti = Math.hypot(a.x - b.x, a.y - b.y); tah = null; } else tah = { x: e.clientX, y: e.clientY, ujeto: 0, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch { /* starší prohlížeč */ } };
  const pohyb = (e: PointerEvent) => {
    if (prsty.has(e.pointerId)) prsty.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (prsty.size === 2) { const [a, b] = [...prsty.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); cilVzd = THREE.MathUtils.clamp(cilVzd * (stipnuti / Math.max(1, d)), 10, 22); stipnuti = d; return; }
    if (!tah || tah.id !== e.pointerId) return;
    const dx = e.clientX - tah.x, dy = e.clientY - tah.y; tah.x = e.clientX; tah.y = e.clientY; tah.ujeto += Math.abs(dx) + Math.abs(dy);
    cilAzim = THREE.MathUtils.clamp(cilAzim - dx * 0.005, azimMez[0], azimMez[1]);
    if (cela || e.pointerType === "mouse") cilElev = THREE.MathUtils.clamp(cilElev + dy * 0.003, 0.16, 0.7);
  };
  const nahoru = (e: PointerEvent) => { if (tah && tah.id === e.pointerId && tah.ujeto < 8) tuk(e); prsty.delete(e.pointerId); if (!prsty.size) tah = null; };
  const kolecko = (e: WheelEvent) => { if (!cela) return; e.preventDefault(); cilVzd = THREE.MathUtils.clamp(cilVzd + e.deltaY * 0.01, 10, 22); };
  canvas.addEventListener("pointerdown", dolu); canvas.addEventListener("pointermove", pohyb); window.addEventListener("pointerup", nahoru); canvas.addEventListener("wheel", kolecko, { passive: false });

  // ── smyčka ──
  let minule = performance.now(), raf = 0, videt = true;
  function snimek() {
    const ted = performance.now(); const dt = Math.min(0.05, (ted - minule) / 1000); minule = ted; cas += dt;
    azim += (cilAzim - azim) * 0.08; elev += (cilElev - elev) * 0.08; vzd += (cilVzd - vzd) * 0.08;
    const dych = Math.sin(cas * 0.4) * 0.02;
    const asp = camera.aspect, d = vzd * (asp < 1 ? Math.min(2.1, 0.95 / asp) : 1);
    camera.position.set(Math.sin(azim + dych) * Math.cos(elev) * d, Math.sin(elev) * d + 1, Math.cos(azim + dych) * Math.cos(elev) * d);
    camera.lookAt(cilBod);
    // Mlha podle vzdálenosti kamery (na výšku je kamera dál a pevná mlha by scénu ztmavila)
    if (scene.fog instanceof THREE.Fog) { scene.fog.near = d + 5; scene.fog.far = d + 23; }
    for (const f of krokFn) f(cas, dt);
    let hop = 0, jde = false;
    if (hxCil) {
      const v = hxCil.clone().sub(hxPos); v.y = 0; const l = v.length();
      if (l > 0.08) { jde = true; hxPos.add(v.normalize().multiplyScalar(Math.min(l, dt * 1.7))); hxRot = Math.atan2(v.x, v.z); hop = Math.abs(Math.sin(cas * 11)) * 0.16; }
      else hxCil = null;
    } else if (!ukol && nadPodlahou.value === 0 && cas > dalsiProchazka) { dalsiProchazka = cas + rnd(7, 13); jdiNa(new THREE.Vector3(rnd(...obsah.meze.x) * 0.7, 0, rnd(...obsah.meze.z) * 0.7)); }
    let rukyUkol: number | null = null;
    const u0 = ukol as (Ukol & { k: string }) | null;
    if (u0 && !hxCil) {
      if (ukolOd < 0) { ukolOd = cas; hxRot = u0.smer; }
      const otoceno = Math.abs(Math.atan2(Math.sin(u0.smer - hx.root.rotation.y), Math.cos(u0.smer - hx.root.rotation.y))) < 0.35;
      if (!otoceno && cas - ukolOd < 0.6) ukolOd = cas;
      const u = Math.min(1, (cas - ukolOd) / u0.trvani);
      rukyUkol = u0.ruce(u); u0.prubeh?.(u);
      if (!efektHotov && u >= u0.efektPo) { efektHotov = true; u0.efekt(); o.onKouzlo(u0.k); }
      if (u >= 1) { u0.konec?.(); ukol = null; dalsiProchazka = cas + rnd(6, 10); }
    }
    const ts = cas - skok, to = cas - oslavaOd;
    let y = nadPodlahou.value + (Math.sin(cas * 2) * 0.03 + hop) * HX_S;
    if (ts < 0.7) y += Math.sin((ts / 0.7) * Math.PI) * 0.55;
    if (to < 2.2) y += Math.abs(Math.sin(to * 5)) * 0.4 * (1 - to / 2.2);
    hx.root.position.set(hxPos.x, Y0 + 1.4 * HX_S + y, hxPos.z);
    const kKamere = Math.atan2(camera.position.x - hxPos.x, camera.position.z - hxPos.z);
    const cilR = jde || ukol ? hxRot : kKamere;
    let rozdil = cilR - hx.root.rotation.y; rozdil = Math.atan2(Math.sin(rozdil), Math.cos(rozdil));
    hx.root.rotation.y += rozdil * 0.12 + (to < 1.1 ? 0.35 : 0);
    hx.root.scale.setScalar(HX_S);
    if (cas > mrk) { mrkStart = cas; mrk = cas + rnd(2.4, 4.8); }
    const bl = mrkStart > 0 && cas - mrkStart < 0.16 ? 1 - 0.9 * Math.sin(((cas - mrkStart) / 0.16) * Math.PI) : 1;
    if (cas > vyrazDo) vyraz = "neutral";
    animujOblicej(hx.oblicej, { vyraz, lookX: Math.sin(cas * 0.5) * 0.3, lookY: 0.05, mrk: bl, tVyraz: cas }, dt);
    const ruka = to < 2.2 ? 1.6 + Math.sin(cas * 10) * 0.3 : rukyUkol !== null ? rukyUkol : jde ? 0.25 + Math.sin(cas * 11) * 0.25 : 0.12 + Math.sin(cas * 2) * 0.04;
    hx.armL.rotation.z = -(ruka + (hx.rucePlne ? 0.25 : 0)); hx.armR.rotation.z = ruka + (hx.rucePlne ? 0.25 : 0);
    hx.aktualizuj({ ay: 0, wx: 0, wy: 0, wz: 0, cas, dt });
    hx.okoli.position.copy(hx.root.position);
    composer.render();
  }
  let posledniSnimek = 0;
  function smycka(t: number) {
    if (!videt || document.hidden) { raf = 0; return; }
    if (!lehce || t - posledniSnimek >= 32) { posledniSnimek = t; snimek(); hlidac(t); }
    raf = requestAnimationFrame(smycka);
  }
  const spust = () => { if (!raf) { minule = performance.now(); raf = requestAnimationFrame(smycka); } };
  const io = new IntersectionObserver((z) => { videt = z.some((x) => x.isIntersecting); if (videt) spust(); }); io.observe(canvas);
  ostreTextury(scene, renderer);
  const hlidac = hlidacPlynulosti(renderer, velikost);
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
    oslava: () => { oslavaOd = cas; vyraz = "radost"; vyrazDo = cas + 2.4; konfety(hxPos.clone().add(new THREE.Vector3(0, 1.5, 0)), 1.2); },
    znic: () => {
      cancelAnimationFrame(raf); raf = 0; io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", vis);
      canvas.removeEventListener("pointerdown", dolu); canvas.removeEventListener("pointermove", pohyb); window.removeEventListener("pointerup", nahoru); canvas.removeEventListener("wheel", kolecko);
      hx.dispose();
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
