/**
 * Společný základ pokojíčků Hexíka podle schváleného standardu (Karel 20. 11. 2026):
 * skutečný pokoj (podlaha, zadní a levá stěna), okno vpravo na zadní stěně, velká svítící tabule
 * mezi rohem a oknem (průchod do tréninku), šatní skříň v pravém zadním rohu (průchod do šatníku),
 * volný střed, Hexík obchází nábytek a kouzla dělá sám. Každý pokoj dodá vzhled (tapeta, podlaha,
 * výhled z okna, styl tabule a skříně) a vlastní vybavení s kouzly. Vánoční pokojíček zatím žije
 * ve vlastním souboru (pokojicek.ts), další pokoje staví na tomhle.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { pomerPixelu, ostryComposer, ostreTextury, hlidacPlynulosti } from "./kvalita";
import { postavHexika, type HexikModel, type SlotyHexika } from "./model";
import { animujOblicej, type Vyraz3D } from "./oblicej";
import { rnd, tex, plast, zaobleny, stin, BARVY_KONFET } from "./diorama";

export type Pruchod = "trenink" | "satnik";

/** Úkol Hexíka: dojde na `bod`, natočí se na `smer`, `trvani` s pohybem rukou, v `efektPo` (0–1) spustí efekt. */
export interface UkolPokoje {
  bod: THREE.Vector3; smer: number; trvani: number; efektPo: number;
  efekt: () => void; ruce: (u: number) => number; prubeh?: (u: number) => void; konec?: () => void;
  /** Po úkolu Hexík sedí (výška sedáku nad podlahou), dokud ho nepošleš jinam. */
  sedni?: number;
}

export interface KontextPokoje {
  scene: THREE.Scene; svet: THREE.Group; camera: THREE.PerspectiveCamera; Y0: number; lehce: boolean;
  /** Okno na zadní stěně (pokoj do něj může přidat třeba polární záři). */
  okno: THREE.Group;
  reg: (obj: THREE.Object3D, klic: string) => THREE.Object3D;
  krok: (f: (t: number, dt: number) => void) => void;
  konfety: (kde: THREE.Vector3, sila?: number, barvy?: THREE.Color[]) => void;
  hexik: {
    pos: THREE.Vector3; root: () => THREE.Object3D; vRuce: (lok: THREE.Vector3) => THREE.Vector3;
    skoc: () => void; vyraz: (v: Vyraz3D, s: number) => void; otoc: (smer: number) => void; cas: () => number;
  };
}

export interface VzhledPokoje {
  pozadi: string;
  tapeta: THREE.Texture; podlaha: THREE.Texture;
  bokPodlahy: string; spodek: string; lista: string; okrajSten: string;
  /** Výhled z okna (canvas 256×256) a jestli za oknem sněží. */
  vyhled: (x: CanvasRenderingContext2D) => void; snih?: boolean; ramOkna?: string; zaves?: string;
  tabule: { deska: [string, string]; ram: string; text: string; zvyrazneni: string; tlacitko: string };
  skrin: { drevo: string; dvirka: string; vyplet: string; knofliky: string; cedule: [string, string] };
  svetla?: { obloha?: [string, string, number]; hlavni?: [string, number]; mesic?: [string, number] };
}

export interface ObsahPokoje {
  kouzla: Record<string, string>;
  /** Nábytek na podlaze jako kruhy (x, z, poloměr). */
  prekazky: [number, number, number][];
  ukol: (klic: string, zasah: THREE.Intersection) => UkolPokoje | null;
}

export interface Pokoj3D {
  nastav: (podoba: string, etapa: number, sloty?: SlotyHexika) => void;
  rezim: (celaObrazovka: boolean) => void;
  oslava: () => void;
  zpet: () => void;
  znic: () => void;
}

export interface MoznostiPokoje {
  podoba: string; etapa: number; sloty?: SlotyHexika; tabule?: string[]; lehce?: boolean; tabuleSviti?: boolean;
  /** Vybavení z Obchůdku (místo → klíč věci); používá ho základní pokojíček. */
  vybaveni?: Partial<Record<string, string>>;
  onKouzlo: (k: string) => void;
  onPruchod?: (k: Pruchod) => void;
}

const HX_S = 0.62;
const Y0 = -1.4;

export function vytvorPokoj(canvas: HTMLCanvasElement, o: MoznostiPokoje, vzhled: VzhledPokoje, vybav: (k: KontextPokoje) => ObsahPokoje): Pokoj3D {
  const lehce = !!o.lehce;
  // Hrany vyhlazuje MSAA v composeru (ostryComposer), antialias plátna by se nepoužil.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(pomerPixelu(lehce));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.92;
  renderer.shadowMap.enabled = !lehce; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(vzhled.pozadi); scene.fog = new THREE.Fog(vzhled.pozadi, 22, 40);
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04); scene.environment = env.texture; scene.environmentIntensity = 0.22; pm.dispose();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const meritko = { value: 400 };
  const svet = new THREE.Group(); scene.add(svet);
  const klikaci: { obj: THREE.Object3D; klic: string }[] = [];
  const reg = (obj: THREE.Object3D, klic: string) => { klikaci.push({ obj, klic }); return obj; };
  const krokFn: ((t: number, dt: number) => void)[] = [];
  let cas = 0, cela = false;

  // ── světla ──
  const sv = vzhled.svetla ?? {};
  const [obH, obZ, obI] = sv.obloha ?? ["#9C86E8", "#1E1430", 0.22];
  scene.add(new THREE.HemisphereLight(obH, obZ, obI));
  const [meB, meI] = sv.mesic ?? ["#9DB8FF", 0.55];
  const mesic = new THREE.DirectionalLight(meB, meI); mesic.position.set(4, 9, -6); scene.add(mesic);
  const [hlB, hlI] = sv.hlavni ?? ["#FFD8A8", 0.85];
  const klic = new THREE.DirectionalLight(hlB, hlI); klic.position.set(6, 10, 7); klic.castShadow = !lehce;
  klic.shadow.mapSize.set(2048, 2048); Object.assign(klic.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9 }); klic.shadow.bias = -0.0004; klic.shadow.radius = 4;
  scene.add(klic);

  // ── ostrůvek: podlaha a dvě stěny ──
  const podlaha = new THREE.Mesh(zaobleny(11, 0.7, 8.6, 0.3, 6), [plast(vzhled.bokPodlahy), plast(vzhled.bokPodlahy), new THREE.MeshPhysicalMaterial({ map: vzhled.podlaha, roughness: 0.6, clearcoat: 0.25 }), plast(vzhled.bokPodlahy), plast(vzhled.bokPodlahy), plast(vzhled.bokPodlahy)]);
  podlaha.position.set(0, Y0 - 0.35, -0.3); stin(podlaha, false, true); svet.add(podlaha); reg(podlaha, "podlaha");
  const spodek = new THREE.Mesh(zaobleny(10.6, 1.4, 8.2, 0.5, 6), plast(vzhled.spodek, { roughness: 0.8 })); spodek.position.set(0, Y0 - 1.25, -0.3); svet.add(spodek);
  const stenaMat = new THREE.MeshPhysicalMaterial({ map: vzhled.tapeta, roughness: 0.85, sheen: 0.4, sheenColor: new THREE.Color("#FFE7D6") });
  const okrajMat = plast(vzhled.okrajSten, { roughness: 0.4 });
  const zadni = new THREE.Mesh(zaobleny(11, 5.2, 0.45, 0.2, 5), [okrajMat, okrajMat, okrajMat, okrajMat, stenaMat, okrajMat]);
  zadni.position.set(0, Y0 + 2.6, -4.4); stin(zadni, false, true); svet.add(zadni);
  const leva = new THREE.Mesh(zaobleny(0.45, 5.2, 8.6, 0.2, 5), [stenaMat, okrajMat, okrajMat, okrajMat, okrajMat, okrajMat]);
  leva.position.set(-5.3, Y0 + 2.6, -0.3); stin(leva, false, true); svet.add(leva);
  for (const [w, d, x, z] of [[11, 0.16, 0, -4.12], [0.16, 8.3, -5.02, -0.3]] as const) { const l = new THREE.Mesh(zaobleny(w, 0.3, d, 0.06), plast(vzhled.lista, { roughness: 0.35 })); l.position.set(x, Y0 + 0.15, z); stin(l); svet.add(l); }

  // ── okno vpravo na zadní stěně ──
  const okno = new THREE.Group(); okno.position.set(2.2, Y0 + 2.9, -4.15); okno.scale.setScalar(0.85); svet.add(okno);
  const sklo = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.0), new THREE.MeshBasicMaterial({ map: tex(256, 256, vzhled.vyhled) })); okno.add(sklo);
  const ramMat = plast(vzhled.ramOkna ?? "#FFFFFF", { roughness: 0.3, clearcoat: 0.8 });
  for (const [w, h, x, y] of [[2.6, 0.18, 0, 1.08], [2.6, 0.22, 0, -1.1], [0.18, 2.4, -1.22, 0], [0.18, 2.4, 1.22, 0], [0.1, 2.0, 0, 0], [2.3, 0.1, 0, 0.1]] as const) { const b = new THREE.Mesh(zaobleny(w, h, 0.22, 0.05), ramMat); b.position.set(x, y, 0.08); stin(b); okno.add(b); }
  const parapet = new THREE.Mesh(zaobleny(2.9, 0.14, 0.55, 0.06), ramMat); parapet.position.set(0, -1.22, 0.28); stin(parapet); okno.add(parapet);
  if (vzhled.zaves) for (const sx of [-1, 1]) { const z = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 2.7, 16, 6, true, 0, Math.PI), plast(vzhled.zaves, { side: THREE.DoubleSide, sheen: 0.8, roughness: 0.85 })); z.position.set(sx * 1.55, -0.05, 0.25); z.rotation.y = sx > 0 ? Math.PI : 0; stin(z); okno.add(z); krokFn.push((t) => { z.rotation.z = Math.sin(t * 0.9 + sx) * 0.025; }); }
  let narazSnehu = 0, hvezdaCas = -10;
  const nSn = vzhled.snih ? 120 : 0, snP = new Float32Array(Math.max(1, nSn) * 3);
  for (let i = 0; i < nSn; i++) snP.set([rnd(-1.1, 1.1), rnd(-0.95, 0.95), -0.02], i * 3);
  const snG = new THREE.BufferGeometry(); snG.setAttribute("position", new THREE.BufferAttribute(snP, 3));
  if (nSn) { const snih = new THREE.Points(snG, new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.045, transparent: true, opacity: 0.95 })); snih.position.z = 0.03; okno.add(snih); }
  const hvezdaPad = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.03), new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0, blending: THREE.AdditiveBlending })); hvezdaPad.position.z = 0.02; okno.add(hvezdaPad);
  reg(sklo, "okno");
  krokFn.push((t, dt) => {
    for (let i = 0; i < nSn; i++) { let y = snP[i * 3 + 1] - dt * (0.25 + narazSnehu * 1.6 + (i % 5) * 0.05); let x = snP[i * 3] + Math.sin(t * 1.2 + i) * 0.0012 + narazSnehu * dt * 0.8; if (y < -0.95) y = 0.95; if (x > 1.1) x = -1.1; snP[i * 3 + 1] = y; snP[i * 3] = x; }
    if (nSn) snG.attributes.position.needsUpdate = true; narazSnehu = Math.max(0, narazSnehu - dt * 0.4);
    const ht = t - hvezdaCas; const m = hvezdaPad.material as THREE.MeshBasicMaterial;
    if (ht < 1.1) { hvezdaPad.position.set(0.9 - ht * 2.0, 0.85 - ht * 0.8, 0.02); hvezdaPad.rotation.z = 0.38; m.opacity = Math.sin((ht / 1.1) * Math.PI); } else m.opacity = 0;
  });

  // ── velká tabule s dnešním plánem (průchod do tréninku) ──
  const st = vzhled.tabule;
  const tabule = new THREE.Group(); tabule.position.set(-1.0, Y0 + 2.15, -4.12); svet.add(tabule);
  // Na telefonu je tabule malá: málo textu, velké písmo, bez záře kolem písmen (jinak se rozmaže)
  const tabTex = tex(1024, 680, (x) => {
    const g = x.createRadialGradient(512, 340, 80, 512, 340, 620); g.addColorStop(0, st.deska[0]); g.addColorStop(1, st.deska[1]); x.fillStyle = g; x.fillRect(0, 0, 1024, 680);
    for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0, 0.025)})`; x.fillRect(rnd(0, 1024), rnd(0, 680), rnd(2, 22), 2); }
    const [nadpis, ...radky] = o.tabule?.length ? o.tabule : ["Dnešní plán", "○ Trénink podle tebe", "🔥 začni sérii ještě dnes"];
    const pismo = (vel: number, tucne = false) => `${tucne ? "bold " : ""}${vel}px 'Comic Sans MS', 'Chalkboard SE', 'DM Sans', sans-serif`;
    const napis = (t: string, xx: number, y: number, vel: number, barva: string, tucne = true, max = 930) => {
      let v = vel; x.font = pismo(v, tucne); while (v > 24 && x.measureText(t).width > max) { v -= 2; x.font = pismo(v, tucne); }
      x.fillStyle = barva; x.fillText(t, xx, y);
    };
    napis(nadpis, 52, 108, 88, st.text);
    x.strokeStyle = st.text; x.globalAlpha = 0.55; x.lineWidth = 6; x.beginPath(); x.moveTo(52, 134); x.bezierCurveTo(260, 126, 540, 140, 720, 130); x.stroke(); x.globalAlpha = 1;
    radky.slice(0, 2).forEach((r, i) => napis(r.replace(/^○\s*/, ""), 56, 250 + i * 104, i === 0 ? 76 : 64, i === 0 ? st.zvyrazneni : st.tlacitko));
    x.strokeStyle = st.tlacitko; x.lineWidth = 9; x.beginPath(); x.roundRect(52, 486, 640, 128, 40); x.stroke();
    napis("Jdeme trénovat →", 92, 572, 66, st.tlacitko, true, 570);
    x.strokeStyle = st.text; x.lineWidth = 7; x.beginPath();
    for (let i = 0; i <= 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; const px = 860 + Math.cos(a) * 82, py = 548 + Math.sin(a) * 82; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke();
    x.fillStyle = st.text; x.beginPath(); x.arc(834, 538, 9, 0, 7); x.arc(886, 538, 9, 0, 7); x.fill(); x.beginPath(); x.arc(860, 562, 24, 0.2, Math.PI - 0.2); x.stroke();
  });
  const deskaTab = new THREE.Mesh(new THREE.PlaneGeometry(2.62, 1.76), new THREE.MeshStandardMaterial({ map: tabTex, roughness: 0.95, emissive: "#FFFFFF", emissiveMap: tabTex, emissiveIntensity: 0.05 }));
  deskaTab.position.z = 0.08; tabule.add(deskaTab);
  const ramTab = new THREE.Mesh(zaobleny(2.86, 2.0, 0.1, 0.06), plast(st.ram, { clearcoat: 0.7, roughness: 0.4 })); tabule.add(ramTab);
  const zlatyRam = new THREE.Mesh(zaobleny(3.08, 2.22, 0.04, 0.1), new THREE.MeshStandardMaterial({ color: "#FFD45A", emissive: "#FFB000", emissiveIntensity: 0, toneMapped: false })); zlatyRam.position.z = -0.02; tabule.add(zlatyRam);
  const tabSvetlo = new THREE.PointLight("#FFE3A0", 0, 3.5, 1.8); tabSvetlo.position.set(0, 0.4, 1.2); tabule.add(tabSvetlo);
  stin(tabule); reg(tabule, "tabule");
  let tabuleOd = -10; const sviti = o.tabuleSviti !== false;
  krokFn.push((t) => {
    const u = t - tabuleOd, puls = sviti ? 0.5 + 0.5 * Math.sin(t * 2.4) : 0;
    (deskaTab.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.05 + puls * 0.04 + (u < 2 ? Math.sin((u / 2) * Math.PI) * 0.2 : 0);
    (zlatyRam.material as THREE.MeshStandardMaterial).emissiveIntensity = puls * 1.6; zlatyRam.visible = sviti; tabSvetlo.intensity = 0.6 + puls * 1.2;
    tabule.scale.setScalar(1 + (u < 0.35 ? Math.sin((u / 0.35) * Math.PI) * 0.04 : 0));
  });

  // ── šatní skříň v pravém zadním rohu (průchod do šatníku) ──
  const ss = vzhled.skrin;
  const skrin = new THREE.Group(); skrin.position.set(4.6, Y0, -3.75); svet.add(skrin);
  const drevo = plast(ss.drevo, { clearcoat: 0.6, roughness: 0.4 });
  const zada = new THREE.Mesh(zaobleny(1.75, 2.75, 0.3, 0.08), drevo); zada.position.set(0, 1.375, -0.25); skrin.add(zada);
  for (const sx of [-1, 1]) { const bok = new THREE.Mesh(zaobleny(0.1, 2.75, 0.84, 0.04), drevo); bok.position.set(sx * 0.83, 1.375, 0); skrin.add(bok); }
  for (const y of [0.05, 2.7]) { const d = new THREE.Mesh(zaobleny(1.75, 0.1, 0.84, 0.04), drevo); d.position.set(0, y, 0); skrin.add(d); }
  const korunka = new THREE.Mesh(zaobleny(1.95, 0.16, 0.9, 0.06), plast(ss.vyplet, { clearcoat: 0.8 })); korunka.position.y = 2.82; skrin.add(korunka);
  const vnitrek = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 2.4), new THREE.MeshStandardMaterial({ color: "#FFE9C8", emissive: "#FFD39A", emissiveIntensity: 0.6 })); vnitrek.position.set(0, 1.4, -0.09); skrin.add(vnitrek);
  const tycS = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.45, 8), plast("#D9B26A", { metalness: 0.8, roughness: 0.25 })); tycS.rotation.z = Math.PI / 2; tycS.position.set(0, 2.3, 0.1); skrin.add(tycS);
  ["#E63946", "#3D7BFF", "#FFD45A", "#7CFF8A", "#FF8AE0"].forEach((c, i) => { const sal = new THREE.Mesh(zaobleny(0.22, 0.7, 0.05, 0.05), plast(c, { sheen: 1, roughness: 0.9 })); sal.position.set(-0.56 + i * 0.28, 1.9, 0.12); skrin.add(sal); });
  const svetloSkrine = new THREE.PointLight("#FFD39A", 0, 3.5, 1.8); svetloSkrine.position.set(0, 1.6, 1.0); skrin.add(svetloSkrine);
  const dvirka: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const pant = new THREE.Group(); pant.position.set(sx * 0.86, 0, 0.42); skrin.add(pant);
    const d = new THREE.Mesh(zaobleny(0.84, 2.5, 0.07, 0.06), plast(ss.dvirka, { clearcoat: 0.7, roughness: 0.35 })); d.position.set(-sx * 0.42, 1.38, 0); pant.add(d);
    const v1 = new THREE.Mesh(zaobleny(0.6, 1.0, 0.03, 0.05), plast(ss.vyplet)); v1.position.set(-sx * 0.42, 1.9, 0.045); pant.add(v1);
    const v2 = v1.clone(); v2.position.y = 0.75; pant.add(v2);
    const knof = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), plast(ss.knofliky, { metalness: 0.4, roughness: 0.2, clearcoat: 1 })); knof.position.set(-sx * 0.76, 1.35, 0.07); pant.add(knof);
    dvirka.push(pant);
  }
  const cedTex = tex(256, 96, (x) => { x.fillStyle = ss.cedule[0]; x.beginPath(); x.roundRect(4, 4, 248, 88, 22); x.fill(); x.fillStyle = ss.cedule[1]; x.font = "bold 44px 'DM Sans', sans-serif"; x.textAlign = "center"; x.fillText("Šatník", 128, 64); });
  const cedulka = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), new THREE.MeshStandardMaterial({ map: cedTex, transparent: true, emissive: "#FFFFFF", emissiveMap: cedTex, emissiveIntensity: 0.15 })); cedulka.position.set(0, 2.98, 0.47); skrin.add(cedulka);
  stin(skrin); reg(skrin, "skrin");
  let skrinOd = -10;
  krokFn.push((t) => { const u = t - skrinOd; const ot = skrinOd < 0 ? 0 : u < 0.6 ? Math.sin((u / 0.6) * Math.PI / 2) : 1; dvirka[0].rotation.y = -ot * 1.7; dvirka[1].rotation.y = ot * 1.7; svetloSkrine.intensity = ot * 3; });

  // ── konfety ──
  const nK = 120, kP = new Float32Array(nK * 3), kV = new Float32Array(nK * 3), kC = new Float32Array(nK * 3); let kZ = 99;
  const kG = new THREE.BufferGeometry(); kG.setAttribute("position", new THREE.BufferAttribute(kP, 3)); kG.setAttribute("color", new THREE.BufferAttribute(kC, 3));
  const konfetyBody = new THREE.Points(kG, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 0, depthWrite: false })); svet.add(konfetyBody);
  const konfety = (kde: THREE.Vector3, sila = 1, barvy = BARVY_KONFET) => { kZ = 0; for (let i = 0; i < nK; i++) { kP.set([kde.x, kde.y, kde.z], i * 3); kV.set([rnd(-1.6, 1.6) * sila, rnd(2, 4.5) * sila, rnd(-1.6, 1.6) * sila], i * 3); const c = barvy[i % barvy.length]; kC.set([c.r, c.g, c.b], i * 3); } kG.attributes.color.needsUpdate = true; };
  krokFn.push((_t, dt) => { kZ += dt; (konfetyBody.material as THREE.PointsMaterial).opacity = kZ < 2.2 ? Math.min(1, (2.2 - kZ) * 1.5) : 0; if (kZ < 2.2) { for (let i = 0; i < nK; i++) { kV[i * 3 + 1] -= 6 * dt; kP[i * 3] += kV[i * 3] * dt; kP[i * 3 + 1] = Math.max(Y0 + 0.02, kP[i * 3 + 1] + kV[i * 3 + 1] * dt); kP[i * 3 + 2] += kV[i * 3 + 2] * dt; } kG.attributes.position.needsUpdate = true; } });

  // ── Hexík ──
  let hx: HexikModel = postavHexika(o.podoba, o.etapa, meritko, o.sloty ?? {});
  stin(hx.root); hx.stin.visible = false; scene.add(hx.root, hx.okoli); reg(hx.root, "hexik");
  const hxPos = new THREE.Vector3(0.6, 0, 0.6); let hxCil: THREE.Vector3 | null = null, hxRot = 0, sedi = 0;
  let skok = -10, oslavaOd = -10, vyraz: Vyraz3D = "neutral", vyrazDo = 0, mrk = 2, mrkStart = -1, dalsiProchazka = 6;
  const vRuce = (lok: THREE.Vector3) => { hx.root.updateMatrixWorld(true); return hx.root.localToWorld(lok.clone()); };
  const kontext: KontextPokoje = {
    scene, svet, camera, Y0, lehce, okno, reg, krok: (f) => krokFn.push(f), konfety,
    hexik: { pos: hxPos, root: () => hx.root, vRuce, skoc: () => { skok = cas; }, vyraz: (v, s) => { vyraz = v; vyrazDo = cas + s; }, otoc: (r) => { hxRot = r; }, cas: () => cas },
  };
  const obsah = vybav(kontext);
  const PREKAZKY: [number, number, number][] = [...obsah.prekazky, [4.6, -3.45, 0.95]];

  // ── chůze kolem nábytku ──
  const vMistnosti = (v: THREE.Vector3) => new THREE.Vector3(THREE.MathUtils.clamp(v.x, -4.2, 4.6), 0, THREE.MathUtils.clamp(v.z, -3.2, 3.4));
  const venZPrekazek = (v: THREE.Vector3) => { for (const [x, z, r] of PREKAZKY) { const d = new THREE.Vector3(v.x - x, 0, v.z - z); if (d.length() < r) { if (d.lengthSq() < 1e-4) d.set(0, 0, 1); v.set(x, 0, z).addScaledVector(d.normalize(), r + 0.05); } } return vMistnosti(v); };
  const naplanuj = (a: THREE.Vector3, b: THREE.Vector3, hloubka = 0): THREE.Vector3[] => {
    if (hloubka > 3) return [b];
    const ab = b.clone().sub(a); const l2 = ab.lengthSq(); if (l2 < 1e-4) return [b];
    for (const [x, z, r] of PREKAZKY) {
      const c = new THREE.Vector3(x, 0, z); const t = THREE.MathUtils.clamp(c.clone().sub(a).dot(ab) / l2, 0, 1); const q = a.clone().addScaledVector(ab, t);
      if (t > 0.02 && t < 0.98 && q.distanceTo(c) < r + 0.1) {
        const bok = q.clone().sub(c); if (bok.lengthSq() < 1e-4) bok.set(-ab.z, 0, ab.x);
        const obchvat = venZPrekazek(c.clone().addScaledVector(bok.normalize(), r + 0.45));
        return [...naplanuj(a, obchvat, hloubka + 1), ...naplanuj(obchvat, b, hloubka + 1)];
      }
    }
    return [b];
  };
  let trasa: THREE.Vector3[] = [];
  const jdiNa = (v: THREE.Vector3, presne = false) => { sedi = 0; const cil = presne ? vMistnosti(v.clone()) : venZPrekazek(v.clone()); trasa = naplanuj(hxPos.clone(), cil); hxCil = trasa.shift() ?? null; };

  // ── úkoly a průchody ──
  let ukol: (UkolPokoje & { k: string }) | null = null, ukolOd = -1, efektHotov = false;
  const zadej = (u: UkolPokoje, k: string) => { ukol = { ...u, k }; ukolOd = -1; efektHotov = false; jdiNa(u.bod, true); };
  let letOd = -1; const letKam = new THREE.Vector3(), letNa = new THREE.Vector3();
  const prolet = (k: Pruchod, objekt: THREE.Object3D, predem: THREE.Vector3, stred: THREE.Vector3) => {
    objekt.updateMatrixWorld(true); letNa.copy(objekt.localToWorld(stred.clone())); letKam.copy(objekt.localToWorld(predem.clone())); letOd = cas; o.onPruchod?.(k);
  };
  const ukolPruchodu = (co: string): UkolPokoje | null => {
    if (co === "tabule") return { bod: new THREE.Vector3(-1.0, 0, -2.75), smer: Math.PI, trvani: 1.4, efektPo: 0.45, ruce: (u) => (u < 0.45 ? u * 4 : 1.8),
      efekt: () => { tabuleOd = cas; skok = cas; vyraz = "radost"; vyrazDo = cas + 2; prolet("trenink", tabule, new THREE.Vector3(0, -0.1, 1.6), new THREE.Vector3()); } };
    if (co === "skrin") { const PRED = new THREE.Vector3(4.5, 0, -2.3), UVNITR = new THREE.Vector3(4.55, 0, -3.3);
      return { bod: PRED, smer: Math.PI, trvani: 1.8, efektPo: 0.3, ruce: (u) => (u < 0.3 ? 0.4 + u * 4 : 1.6), prubeh: (u) => { if (u > 0.4) hxPos.lerpVectors(PRED, UVNITR, Math.min(1, (u - 0.4) / 0.5)); },
        efekt: () => { skrinOd = cas; vyraz = "radost"; vyrazDo = cas + 2; prolet("satnik", skrin, new THREE.Vector3(0, 1.5, 1.7), new THREE.Vector3(0, 1.4, 0)); } }; }
    if (co === "okno") return { bod: new THREE.Vector3(2.2, 0, -3.2), smer: Math.PI, trvani: 2.8, efektPo: 0.3, ruce: (u) => (u < 0.3 ? u * 4 : 1.2 + Math.sin(cas * 3) * 0.1),
      efekt: () => { hvezdaCas = cas; narazSnehu = 1; vyraz = "prekvapeni"; vyrazDo = cas + 1.8; } };
    return null;
  };

  // ── záře a kamera ──
  const composer = ostryComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.38, 0.5, 0.9); if (!lehce) composer.addPass(bloom); composer.addPass(new OutputPass());
  let azim = 0.28, cilAzim = 0.28, elev = 0.38, cilElev = 0.38, vzd = 17, cilVzd = 17;
  const cilBod = new THREE.Vector3(0.25, 0.7, -0.9);
  const velikost = () => { const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1; renderer.setSize(w, h, false); composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); meritko.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan((camera.fov * Math.PI) / 360)); };

  // ── interakce ──
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
  // Pára, jiskry a sníh jsou body: bez malé tolerance by „chytaly“ ťuknutí i na věci za nimi
  ray.params.Points = { threshold: 0.02 };
  let tah: { x: number; y: number; ujeto: number; id: number } | null = null;
  const prsty = new Map<number, { x: number; y: number }>(); let stipnuti = 0;
  const tuk = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const zasahy = ray.intersectObjects(klikaci.map((k) => k.obj), true); if (!zasahy.length) return;
    let ob: THREE.Object3D | null = zasahy[0].object; let co: string | null = null;
    while (ob && !co) { const k = klikaci.find((x) => x.obj === ob); if (k) co = k.klic; ob = ob.parent; }
    if (!co || letOd >= 0) return;
    if (co === "podlaha") { ukol = null; jdiNa(zasahy[0].point); return; }
    if (co === "hexik") { skok = cas; vyraz = "radost"; vyrazDo = cas + 1.4; konfety(hxPos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0.5); o.onKouzlo("hexik"); return; }
    // Tabule a skříň patří základu; okno může pokoj nahradit vlastním kouzlem
    const u = co === "tabule" || co === "skrin" ? ukolPruchodu(co) : obsah.ukol(co, zasahy[0]) ?? ukolPruchodu(co); if (u) zadej(u, co);
  };
  const dolu = (e: PointerEvent) => { prsty.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (prsty.size === 2) { const [a, b] = [...prsty.values()]; stipnuti = Math.hypot(a.x - b.x, a.y - b.y); tah = null; } else tah = { x: e.clientX, y: e.clientY, ujeto: 0, id: e.pointerId }; try { canvas.setPointerCapture(e.pointerId); } catch { /* starší prohlížeč */ } };
  const pohyb = (e: PointerEvent) => {
    if (prsty.has(e.pointerId)) prsty.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (prsty.size === 2) { const [a, b] = [...prsty.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); cilVzd = THREE.MathUtils.clamp(cilVzd * (stipnuti / Math.max(1, d)), 10, 22); stipnuti = d; return; }
    if (!tah || tah.id !== e.pointerId) return;
    const dx = e.clientX - tah.x, dy = e.clientY - tah.y; tah.x = e.clientX; tah.y = e.clientY; tah.ujeto += Math.abs(dx) + Math.abs(dy);
    cilAzim = THREE.MathUtils.clamp(cilAzim - dx * 0.005, -0.25, 1.05);
    if (cela || e.pointerType === "mouse") cilElev = THREE.MathUtils.clamp(cilElev + dy * 0.003, 0.16, 0.7);
  };
  const nahoru = (e: PointerEvent) => { if (tah && tah.id === e.pointerId && tah.ujeto < 8) tuk(e); prsty.delete(e.pointerId); if (!prsty.size) tah = null; };
  const kolecko = (e: WheelEvent) => { if (!cela) return; e.preventDefault(); cilVzd = THREE.MathUtils.clamp(cilVzd + e.deltaY * 0.01, 10, 22); };
  canvas.addEventListener("pointerdown", dolu); canvas.addEventListener("pointermove", pohyb); window.addEventListener("pointerup", nahoru); canvas.addEventListener("wheel", kolecko, { passive: false });

  // ── smyčka ──
  let minule = performance.now(), raf = 0, videt = true, posledniSnimek = 0;
  function snimek() {
    const ted = performance.now(); const dt = Math.min(0.05, (ted - minule) / 1000); minule = ted; cas += dt;
    azim += (cilAzim - azim) * 0.08; elev += (cilElev - elev) * 0.08; vzd += (cilVzd - vzd) * 0.08;
    const dych = Math.sin(cas * 0.4) * 0.02, asp = camera.aspect, d = vzd * (asp < 1 ? Math.min(2.3, 1.12 / asp) : 1);
    camera.position.set(Math.sin(azim + dych) * Math.cos(elev) * d, Math.sin(elev) * d + 1, Math.cos(azim + dych) * Math.cos(elev) * d);
    camera.lookAt(cilBod);
    if (letOd >= 0) { const s = Math.min(1, (cas - letOd) / 1.15), e = s * s * (3 - 2 * s); camera.position.lerp(letKam, e); camera.lookAt(cilBod.clone().lerp(letNa, e)); }
    if (scene.fog instanceof THREE.Fog) { scene.fog.near = d + 5; scene.fog.far = d + 23; }
    for (const f of krokFn) f(cas, dt);
    let hop = 0, jde = false;
    if (hxCil) {
      const v = hxCil.clone().sub(hxPos); v.y = 0; const l = v.length();
      if (l > 0.08) { jde = true; hxPos.add(v.normalize().multiplyScalar(Math.min(l, dt * 1.7))); hxRot = Math.atan2(v.x, v.z); hop = Math.abs(Math.sin(cas * 11)) * 0.16; }
      else hxCil = trasa.shift() ?? null;
    } else if (!ukol && !sedi && letOd < 0 && cas > dalsiProchazka) { dalsiProchazka = cas + rnd(7, 13); jdiNa(new THREE.Vector3(rnd(-2.5, 3.0), 0, rnd(-1.5, 2.5))); }
    let rukyUkol: number | null = null, vyskaUkolu = 0;
    const u0 = ukol as (UkolPokoje & { k: string }) | null;
    if (u0 && !hxCil) {
      if (ukolOd < 0) { ukolOd = cas; hxRot = u0.smer; }
      const otoceno = Math.abs(Math.atan2(Math.sin(u0.smer - hx.root.rotation.y), Math.cos(u0.smer - hx.root.rotation.y))) < 0.35;
      if (!otoceno && cas - ukolOd < 0.6) ukolOd = cas;
      const u = Math.min(1, (cas - ukolOd) / u0.trvani);
      rukyUkol = u0.ruce(u); u0.prubeh?.(u);
      if (u0.sedni) vyskaUkolu = Math.min(1, u * 1.3) * u0.sedni + Math.sin(Math.min(1, u * 1.3) * Math.PI) * 0.35;
      if (!efektHotov && u >= u0.efektPo) { efektHotov = true; u0.efekt(); if (u0.k in obsah.kouzla) o.onKouzlo(u0.k); }
      if (u >= 1) { u0.konec?.(); if (u0.sedni) sedi = u0.sedni; ukol = null; dalsiProchazka = cas + rnd(6, 10); }
    }
    const ts = cas - skok, to = cas - oslavaOd;
    let y = (sedi || vyskaUkolu) + (Math.sin(cas * 2) * 0.03 + hop) * HX_S;
    if (ts < 0.7) y += Math.sin((ts / 0.7) * Math.PI) * 0.55;
    if (to < 2.2) y += Math.abs(Math.sin(to * 5)) * 0.4 * (1 - to / 2.2);
    hx.root.position.set(hxPos.x, Y0 + 1.4 * HX_S + y, hxPos.z);
    const kKamere = Math.atan2(camera.position.x - hxPos.x, camera.position.z - hxPos.z);
    let rozdil = (jde || ukol || sedi ? hxRot : kKamere) - hx.root.rotation.y; rozdil = Math.atan2(Math.sin(rozdil), Math.cos(rozdil));
    hx.root.rotation.y += rozdil * 0.12 + (to < 1.1 ? 0.35 : 0);
    hx.root.scale.setScalar(HX_S * (sedi ? 0.95 : 1));
    if (cas > mrk) { mrkStart = cas; mrk = cas + rnd(2.4, 4.8); }
    const bl = mrkStart > 0 && cas - mrkStart < 0.16 ? 1 - 0.9 * Math.sin(((cas - mrkStart) / 0.16) * Math.PI) : 1;
    if (cas > vyrazDo) vyraz = sedi ? "ospaly" : "neutral";
    animujOblicej(hx.oblicej, { vyraz, lookX: Math.sin(cas * 0.5) * 0.3, lookY: 0.05, mrk: bl, tVyraz: cas }, dt);
    const ruka = to < 2.2 ? 1.6 + Math.sin(cas * 10) * 0.3 : rukyUkol !== null ? rukyUkol : jde ? 0.25 + Math.sin(cas * 11) * 0.25 : 0.12 + Math.sin(cas * 2) * 0.04;
    hx.armL.rotation.z = -(ruka + (hx.rucePlne ? 0.25 : 0)); hx.armR.rotation.z = ruka + (hx.rucePlne ? 0.25 : 0);
    hx.aktualizuj({ ay: 0, wx: 0, wy: 0, wz: 0, cas, dt }); hx.okoli.position.copy(hx.root.position);
    composer.render();
  }
  function smycka(t: number) { if (!videt || document.hidden) { raf = 0; return; } if (!lehce || t - posledniSnimek >= 32) { posledniSnimek = t; snimek(); hlidac(t); } raf = requestAnimationFrame(smycka); }
  const spust = () => { if (!raf) { minule = performance.now(); raf = requestAnimationFrame(smycka); } };
  const io = new IntersectionObserver((z) => { videt = z.some((x) => x.isIntersecting); if (videt) spust(); }); io.observe(canvas);
  ostreTextury(scene, renderer);
  const hlidac = hlidacPlynulosti(renderer, velikost);
  const ro = new ResizeObserver(velikost); ro.observe(canvas); velikost();
  const vis = () => { if (!document.hidden) spust(); }; document.addEventListener("visibilitychange", vis);
  spust();

  return {
    nastav(podoba, etapa, sloty = {}) {
      scene.remove(hx.root, hx.okoli); const i = klikaci.findIndex((k) => k.obj === hx.root); if (i >= 0) klikaci.splice(i, 1);
      hx.dispose(); hx = postavHexika(podoba, etapa, meritko, sloty); stin(hx.root); hx.stin.visible = false; scene.add(hx.root, hx.okoli); reg(hx.root, "hexik");
    },
    rezim(c) { cela = c; },
    oslava: () => { oslavaOd = cas; vyraz = "radost"; vyrazDo = cas + 2.4; konfety(hxPos.clone().add(new THREE.Vector3(0, 1.5, 0)), 1.2); },
    zpet: () => { letOd = -1; skrinOd = -10; ukol = null; sedi = 0; hxPos.set(0.6, 0, 0.6); hxCil = null; trasa = []; },
    znic: () => {
      cancelAnimationFrame(raf); raf = 0; io.disconnect(); ro.disconnect(); document.removeEventListener("visibilitychange", vis);
      canvas.removeEventListener("pointerdown", dolu); canvas.removeEventListener("pointermove", pohyb); window.removeEventListener("pointerup", nahoru); canvas.removeEventListener("wheel", kolecko);
      hx.dispose();
      const hotovo = new Set<{ dispose: () => void }>(); const pryc = (x: { dispose: () => void } | null | undefined) => { if (x && !hotovo.has(x)) { hotovo.add(x); x.dispose(); } };
      scene.traverse((ob) => { const m = ob as THREE.Mesh; pryc(m.geometry); for (const mat of (Array.isArray(m.material) ? m.material : m.material ? [m.material] : []) as THREE.Material[]) { for (const v of Object.values(mat)) if (v instanceof THREE.Texture) pryc(v); pryc(mat); } });
      env.dispose(); bloom.dispose(); composer.dispose(); renderer.dispose();
    },
  };
}
