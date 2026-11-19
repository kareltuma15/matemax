/**
 * 3D otevírání truhly přes celou obrazovku (Karel schválil 19. 11. 2026, mockup docs/gamifikace-2026-11/truhla-3d.html).
 *
 * Průběh:
 *  1) čekání: truhla dýchá a občas poskočí, drahokam v zámku pulzuje
 *  2) 3 klepnutí: zmáčknutí a pružení, škvíra svítí silněji, barva se může „vylepšit“ (bílá → modrá → fialová)
 *  3) otevření: nádech, víko odletí, sloup světla, paprsky, rázová vlna, výbuch jiskřiček; u legendy přepnutí na zlatou
 *  4) odměna vyletí z truhly ve 3D (doplněk, malý Hexík v nové podobě, nebo medailon u ostatních typů)
 *     a vznáší se se svatozáří; věc, kterou už dítě má, se rozpadne na krystaly
 *  5) nasazení: doplněk přiletí Hexíkovi na hlavu/oči/krk, nová podoba vletí do Hexíka
 *
 * Výsledek se losuje předem v lib/sbirka.ts, scéna ho jen ukazuje. Když dítě neklepe, truhla se otevře sama.
 */
import * as THREE from "three";
import { postavTruhlu, SEZONNI_MODEL, type DruhModelu } from "./truhla-model";
import { vytvorStudio } from "./studio";
import { postavHexika, type HexikModel, type SlotyHexika } from "./model";
import { doplnekNaSlot, type Doplnek, type Sklad } from "./doplnky";
import { klid, reakce, DELKA, type Reakce3D } from "./animace";
import { vytvorCastice, type Castice } from "./castice";

export type DruhTruhly = "denni" | "doporuceni" | "generalka" | "legendarni" | "sezonni" | "krystalova" | "velka" | "mistrovska" | "zlata";
export type VzacnostTruhly = "bezna" | "neobvykla" | "vzacna" | "legenda";
export type SezonaTruhly = "vanoce" | "zima" | "finis";

const PORADI: VzacnostTruhly[] = ["bezna", "neobvykla", "vzacna", "legenda"];
export const BARVA_VZACNOSTI: Record<VzacnostTruhly, string> = { bezna: "#E6EDF8", neobvykla: "#4DA3FF", vzacna: "#B07CFF", legenda: "#FFC93C" };
const POZADI: Record<VzacnostTruhly, [string, string]> = { bezna: ["#33399A", "#121A4C"], neobvykla: ["#2A55B8", "#0F1F55"], vzacna: ["#5233B0", "#1B1352"], legenda: ["#8A6326", "#2A1A3E"] };
const SLOTY = ["hlava", "oci", "krk"] as const;
type Slot = (typeof SLOTY)[number];
const jeSlot = (t: string): t is Slot => (SLOTY as readonly string[]).includes(t);

export interface OdmenaVTruhle { typ: string; klic: string; ikona?: string }

export interface MoznostiTruhly {
  druh: DruhTruhly;
  /** Aktuální sezóna (Sezónní truhla podle ní mění vzhled). */
  sezona?: SezonaTruhly | null;
  vz: VzacnostTruhly;
  podoba: string;
  etapa: number;
  sloty?: SlotyHexika;
  /** Co padlo (null = jen krystaly). */
  odmena: OdmenaVTruhle | null;
  /** Je to nová věc? (jinak se rozpadne na krystaly) */
  nova: boolean;
  onKlepnuti?: (n: number, vz: VzacnostTruhly) => void;
  /** Víko se otevřelo (barva je už ta konečná). */
  onOtevreno?: (vz: VzacnostTruhly) => void;
  /** Odměna je vidět (ukázat kartu s názvem). */
  onOdhaleno: () => void;
  /** Nasazení doletělo (Hexík má věc na sobě). */
  onNasazeno?: () => void;
  /** Po kolika sekundách bez klepnutí se truhla otevře sama. */
  samaPo?: number;
}

export interface Truhla3D {
  klepni: () => void;
  /** Otevřít hned (tlačítko „Přeskočit“). */
  otevri: () => void;
  /** Spustí let věci na Hexíka; vrátí false, když se u tohoto typu odměny nic neanimuje. */
  nasad: () => boolean;
  znic: () => void;
}

const cl = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (x: number) => 1 - Math.pow(1 - cl(x), 3);
const easeInOut = (x: number) => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const pruzina = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x) * Math.cos(x * Math.PI * 3));

function texturaZare(): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const x = c.getContext("2d")!, g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function texturaSloupu(): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 64; c.height = 256;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 256, 0, 0); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.35, "rgba(255,255,255,.5)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 256);
  const h = x.createLinearGradient(0, 0, 64, 0); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.5, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)");
  x.globalCompositeOperation = "destination-out"; x.fillStyle = h; x.fillRect(0, 0, 64, 256);
  return new THREE.CanvasTexture(c);
}

/** Líc medailonu: tmavý šestiúhelník s ikonou odměny (oslavy, efekty, pozadí, vzhledy, krystaly). */
function texturaMedailonu(ikona: string): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 256; const x = c.getContext("2d")!;
  const g = x.createRadialGradient(128, 110, 10, 128, 128, 140); g.addColorStop(0, "#2B3A86"); g.addColorStop(1, "#0D1B3E");
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.font = "150px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
  x.fillText(ikona, 128, 140);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function hexShape(R: number, rr: number): THREE.Shape {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + i * Math.PI / 3; pts.push(new THREE.Vector2(R * Math.cos(a), R * Math.sin(a))); }
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const p = pts[i], a1 = p.clone().lerp(pts[(i + 5) % 6], rr), a2 = p.clone().lerp(pts[(i + 1) % 6], rr);
    if (i === 0) s.moveTo(a1.x, a1.y); else s.lineTo(a1.x, a1.y);
    s.quadraticCurveTo(p.x, p.y, a2.x, a2.y);
  }
  s.closePath(); return s;
}

// Paprsky za truhlou: shader s otáčejícími se klíny světla
const PAPRSKY_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const PAPRSKY_FRAG = `
uniform float uCas; uniform float uSila; uniform vec3 uBarva; varying vec2 vUv;
void main(){
  vec2 p = vUv - 0.5; float r = length(p); float a = atan(p.y, p.x);
  float k1 = pow(max(0.0, sin(a * 9.0 + uCas * 0.6)), 6.0);
  float k2 = pow(max(0.0, sin(a * 14.0 - uCas * 0.9 + 1.3)), 10.0) * 0.6;
  float pad = smoothstep(0.5, 0.05, r) * smoothstep(0.0, 0.08, r);
  float jadro = smoothstep(0.22, 0.0, r) * 0.9;
  float s = ((k1 + k2) * pad + jadro) * uSila;
  gl_FragColor = vec4(uBarva * s, s);
}`;

export function vytvorTruhlu3D(canvas: HTMLCanvasElement, o: MoznostiTruhly): Truhla3D {
  const studio = vytvorStudio(canvas);
  const { renderer, scene, camera } = studio;
  const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [], texs: THREE.Texture[] = [];
  const g = <T extends THREE.BufferGeometry>(x: T) => { geos.push(x); return x; };
  const mt = <T extends THREE.Material>(x: T) => { mats.push(x); return x; };
  const tx = <T extends THREE.Texture>(x: T) => { texs.push(x); return x; };
  const sklad: Sklad = { g, m: mt, t: tx };
  const sloty: SlotyHexika = { ...(o.sloty ?? {}) };

  const meritko = { value: 400 };
  let tier: VzacnostTruhly = "bezna";
  const barvaTier = new THREE.Color(BARVA_VZACNOSTI.bezna);

  // ── truhla ──
  const druhModelu: DruhModelu = o.druh === "sezonni" ? SEZONNI_MODEL[o.sezona ?? "vanoce"] : o.druh;
  const truhla = new THREE.Group(); truhla.position.set(0.45, -1.25, 0); truhla.rotation.y = -0.42; scene.add(truhla);
  const model = postavTruhlu(sklad, druhModelu, barvaTier); truhla.add(model.root);
  const { pruzne, vikoCep, kamen, kamenMat, skviraMat, H } = model;
  const sametMat = model.sametMat;
  const zareTex = tx(texturaZare());
  const zareVnitrMat = mt(new THREE.MeshBasicMaterial({ map: zareTex, color: barvaTier, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const zareVnitr = new THREE.Mesh(g(new THREE.PlaneGeometry(model.W * 1.1, model.D * 1.3)), zareVnitrMat); zareVnitr.rotation.x = -Math.PI / 2; zareVnitr.position.y = model.dnoY + 0.06; pruzne.add(zareVnitr);
  const svetlo = new THREE.PointLight(barvaTier, 0, 7, 1.6); svetlo.position.set(0, model.dnoY + 0.25, 0.1); pruzne.add(svetlo);

  // ── světelné efekty ──
  const sloupMat = mt(new THREE.MeshBasicMaterial({ map: tx(texturaSloupu()), color: barvaTier, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const sloup = new THREE.Group(); sloup.position.y = H; pruzne.add(sloup);
  { const pg = g(new THREE.PlaneGeometry(1.25, 4.4)); pg.translate(0, 2.2, 0); sloup.add(new THREE.Mesh(pg, sloupMat));
    const pg2 = g(new THREE.PlaneGeometry(0.6, 3.6)); pg2.translate(0, 1.8, 0.01); sloup.add(new THREE.Mesh(pg2, sloupMat)); }
  const paprskyMat = mt(new THREE.ShaderMaterial({ vertexShader: PAPRSKY_VERT, fragmentShader: PAPRSKY_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uCas: { value: 0 }, uSila: { value: 0 }, uBarva: { value: barvaTier.clone() } } }));
  const paprsky = new THREE.Mesh(g(new THREE.PlaneGeometry(9, 9)), paprskyMat); paprsky.position.set(0.2, 0.55, -2.2); scene.add(paprsky);
  const vlnaMat = mt(new THREE.MeshBasicMaterial({ color: barvaTier, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const vlna = new THREE.Mesh(g(new THREE.RingGeometry(0.95, 1, 72)), vlnaMat); vlna.rotation.x = -Math.PI / 2; vlna.position.y = 0.02; truhla.add(vlna);
  const podlahaMat = mt(new THREE.MeshBasicMaterial({ map: zareTex, color: "#6E76D8", transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  const podlaha = new THREE.Mesh(g(new THREE.PlaneGeometry(4.4, 3)), podlahaMat); podlaha.rotation.x = -Math.PI / 2; podlaha.position.y = 0.004; truhla.add(podlaha);
  const stinC = document.createElement("canvas"); stinC.width = stinC.height = 64;
  { const s = stinC.getContext("2d")!, gr = s.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(4,8,26,.6)"); gr.addColorStop(1, "rgba(4,8,26,0)"); s.fillStyle = gr; s.fillRect(0, 0, 64, 64); }
  const stin = new THREE.Mesh(g(new THREE.PlaneGeometry(2.6, 1.9)), mt(new THREE.MeshBasicMaterial({ map: tx(new THREE.CanvasTexture(stinC)), transparent: true, depthWrite: false })));
  stin.rotation.x = -Math.PI / 2; stin.position.y = 0.006; truhla.add(stin);

  const castice: Castice[] = [];
  const barvyVybuchu = () => (tier === "legenda" ? ["#FFC93C", "#FFFFFF", "#FFE08A", "#B07CFF"] : [BARVA_VZACNOSTI[tier], "#FFFFFF"]);
  let vybuch = vytvorCastice("vybuch", meritko, barvyVybuchu(), 120); vybuch.obj.position.set(0, H + 0.15, 0); pruzne.add(vybuch.obj); castice.push(vybuch);
  const trpyt = vytvorCastice("aura", meritko, ["#FFFFFF", "#C9C7F5"], 16); trpyt.obj.position.set(0, H * 0.7, 0); trpyt.obj.scale.setScalar(1.2); pruzne.add(trpyt.obj); castice.push(trpyt);

  // ── odměna ve 3D ──
  const odmenaObal = new THREE.Group(); odmenaObal.visible = false; scene.add(odmenaObal);
  const odmenaRot = new THREE.Group(); odmenaObal.add(odmenaRot);
  let doplnek: Doplnek | null = null, miniHexik: HexikModel | null = null;
  let letiNa: "slot" | "podoba" | null = null;
  const vycentruj = (obj: THREE.Object3D, velikost: number) => {
    const box = new THREE.Box3().setFromObject(obj), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const k = velikost / Math.max(0.001, s.x, s.y, s.z); obj.scale.multiplyScalar(k); obj.position.sub(c.multiplyScalar(k));
  };
  if (o.odmena && jeSlot(o.odmena.typ)) {
    doplnek = doplnekNaSlot(sklad, o.odmena.typ, o.odmena.klic);
    if (doplnek) { doplnek.obj.position.set(0, 0, 0); odmenaRot.add(doplnek.obj); vycentruj(doplnek.obj, 0.95); letiNa = "slot"; }
  } else if (o.odmena?.typ === "podoba") {
    miniHexik = postavHexika(o.odmena.klic, o.etapa, meritko, sloty);
    const obal = new THREE.Group(); obal.add(miniHexik.root); miniHexik.okoli.visible = false; odmenaRot.add(obal); vycentruj(obal, 1.1); letiNa = "podoba";
  }
  const medailon = !doplnek && !miniHexik;
  if (medailon) {
    // medailon: zlatý šestiúhelník s ikonou
    const zl = mt(new THREE.MeshPhysicalMaterial({ color: "#FFC24A", metalness: 1, roughness: 0.2, clearcoat: 0.7, envMapIntensity: 2 }));
    const m = new THREE.Group(); odmenaRot.add(m);
    m.add(new THREE.Mesh(g(new THREE.ExtrudeGeometry(hexShape(0.48, 0.24), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 5, curveSegments: 8 })), zl));
    const lg = g(new THREE.ShapeGeometry(hexShape(0.38, 0.24), 8)); const uv = lg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 0.76 + 0.5, uv.getY(i) / 0.76 + 0.5);
    const lic = new THREE.Mesh(lg, mt(new THREE.MeshPhysicalMaterial({ map: tx(texturaMedailonu(o.odmena?.ikona ?? "💎")), roughness: 0.3, clearcoat: 1 }))); lic.position.z = 0.121; m.add(lic);
    m.position.z = -0.06;
  }
  letiNa = o.nova ? letiNa : null;
  const svatozarMat = mt(new THREE.MeshBasicMaterial({ map: zareTex, color: barvaTier, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const svatozar = new THREE.Mesh(g(new THREE.PlaneGeometry(2.6, 2.6)), svatozarMat); svatozar.position.z = -0.6; odmenaObal.add(svatozar);
  const prstenMat = mt(new THREE.MeshBasicMaterial({ color: barvaTier, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const prsten = new THREE.Mesh(g(new THREE.TorusGeometry(0.95, 0.012, 8, 96)), prstenMat); prsten.position.z = -0.3; odmenaObal.add(prsten);
  const prsten2 = new THREE.Mesh(g(new THREE.TorusGeometry(1.12, 0.006, 8, 96)), prstenMat); prsten2.position.z = -0.35; odmenaObal.add(prsten2);
  const odmenaJiskry = vytvorCastice("aura", meritko, [BARVA_VZACNOSTI[o.vz], "#FFFFFF"], 26); odmenaObal.add(odmenaJiskry.obj); castice.push(odmenaJiskry);
  // rozpad na krystaly (věc, kterou už dítě má)
  const krystalyVybuch = vytvorCastice("vybuch", meritko, ["#BFF4FF", "#4DA3FF", "#FFFFFF"], 90); scene.add(krystalyVybuch.obj); castice.push(krystalyVybuch);

  // ── Hexík ──
  const HX_S = 0.56;
  const hxObal = new THREE.Group(); hxObal.position.set(-1.75, -1.25 + 1.4 * HX_S, 0.35); hxObal.scale.setScalar(HX_S); hxObal.rotation.y = 0.55; scene.add(hxObal);
  let podobaHexika = o.podoba;
  let hx: HexikModel = postavHexika(podobaHexika, o.etapa, meritko, sloty);
  hxObal.add(hx.root); hxObal.add(hx.stin); hx.okoli.visible = false;
  const hlavaJiskry = vytvorCastice("vybuch", meritko, [BARVA_VZACNOSTI[o.vz], "#FFFFFF"], 60); hxObal.add(hlavaJiskry.obj); hlavaJiskry.obj.position.set(0, 1.0, 0); castice.push(hlavaJiskry);

  // ── stav ──
  const klidne = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const samaPo = o.samaPo ?? 2.6;
  let cas = 0, klepnuti = 0, tOtevreni = -1, tNadech = -1, tOdmena = -1, tNasad = -1, tKlep = -10, tTier = -10, tRozpad = -1;
  let vypusteno = false, ohlaseno = false, nasazeno = false, kameraTres = 0;
  let posledniAkceMs = performance.now();
  let akce: { id: Reakce3D; start: number } | null = null;
  const minula = { y: 0, vy: 0, rY: 0, rX: 0 };
  const hexikReaguj = (id: Reakce3D) => { akce = { id, start: cas }; };
  const tierPoKlepnuti = (n: number): VzacnostTruhly => PORADI[Math.min(PORADI.indexOf(o.vz), Math.min(n - 1, 2))];
  // Ohlášení běží i ve skutečném čase (na pomalém zařízení se snímky zpožďují, testy čekají na kartu)
  let pojistka = 0;
  const ohlas = () => { if (!ohlaseno) { ohlaseno = true; o.onOdhaleno(); } };

  function nastavTier(t: VzacnostTruhly) {
    tier = t; barvaTier.set(BARVA_VZACNOSTI[t]);
    for (const m of [zareVnitrMat, skviraMat, sloupMat, vlnaMat, svatozarMat, prstenMat]) m.color.copy(barvaTier);
    kamenMat.color.copy(barvaTier); kamenMat.emissive.copy(barvaTier); sametMat.emissive.copy(barvaTier);
    svetlo.color.copy(barvaTier); (paprskyMat.uniforms.uBarva.value as THREE.Color).copy(barvaTier);
    studio.pozadi(POZADI[t][0], POZADI[t][1]);
    tTier = cas;
  }

  function klepni() {
    if (tNadech >= 0) return;
    klepnuti++; tKlep = cas; posledniAkceMs = performance.now();
    const novy = tierPoKlepnuti(klepnuti);
    if (novy !== tier) nastavTier(novy);
    o.onKlepnuti?.(klepnuti, tier);
    hexikReaguj(klepnuti === 1 ? "jasot" : klepnuti === 2 ? "radost" : "poskok");
    if (klepnuti >= 3) { tNadech = cas + 0.12; pojistka = window.setTimeout(ohlas, klidne ? 50 : 2700); }
  }
  function otevri() {
    if (tNadech >= 0) return;
    klepnuti = 3; nastavTier(tierPoKlepnuti(3)); tNadech = cas;
    o.onKlepnuti?.(3, tier);
    pojistka = window.setTimeout(ohlas, klidne ? 50 : 2600);
  }
  function nasad(): boolean {
    if (!letiNa || tOdmena < 0 || tNasad >= 0) return false;
    tNasad = cas; return true;
  }

  function velikost() {
    studio.velikost();
    meritko.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }

  const vec = new THREE.Vector3(), cilOdmeny = new THREE.Vector3();
  let lookY = -0.55;
  let raf = 0, minule = performance.now();
  function snimek() {
    // Čas scény jde podle skutečného času (na pomalém zařízení se jen přeskočí snímky), fyzika doplňků po malých krocích
    const ted = performance.now(), krok = Math.min(0.3, (ted - minule) / 1000), dt = Math.min(0.05, krok); minule = ted; cas += krok;
    if (tNadech < 0 && ted - posledniAkceMs > samaPo * 1000) otevri();
    const nasirku = camera.aspect >= 1;
    cilOdmeny.set(0.25, nasirku ? 1.05 : 0.8, 0.9);

    if (tNadech >= 0 && tOtevreni < 0 && cas >= tNadech + (klidne ? 0 : 0.38)) {
      tOtevreni = cas;
      if (tier !== o.vz) nastavTier(o.vz);
      o.onOtevreno?.(tier);
    }

    // ── truhla: dýchání, poskoky, zmáčknutí ──
    let sy = 1, sxz = 1, rz = 0, yy = 0;
    if (tNadech < 0) {
      sy = 1 + 0.012 * Math.sin(cas * 2.4);
      const hop = (cas % 3.2) / 3.2; if (hop > 0.85 && !klidne) { const q = (hop - 0.85) / 0.15; yy = Math.sin(q * Math.PI) * 0.09; sy += Math.sin(q * Math.PI * 2) * 0.04; }
      const k = cas - tKlep;
      if (k < 0.6) { const sila = 0.08 + klepnuti * 0.03; sy -= Math.exp(-k * 9) * Math.cos(k * 28) * sila; rz = Math.exp(-k * 8) * Math.sin(k * 46) * 0.06 * klepnuti; }
      sxz = 1 / Math.sqrt(Math.max(0.6, sy));
    } else if (tOtevreni < 0) {
      const q = cl((cas - tNadech) / 0.38); sy = 1 - easeInOut(q) * 0.16; sxz = 1 + easeInOut(q) * 0.08; rz = Math.sin(cas * 70) * 0.02 * q;
    } else {
      const k = cas - tOtevreni; sy = 1 + Math.exp(-k * 6) * Math.sin(k * 22) * 0.14; sxz = 1 / Math.sqrt(sy);
      if (tOdmena >= 0) yy = -easeOut((cas - tOdmena) / 0.8) * 0.15;
    }
    pruzne.scale.set(sxz, sy, sxz); pruzne.rotation.z = rz; truhla.position.y = -1.25 + yy;

    const tk = cas - tTier;
    const zaklad = tNadech >= 0 ? 1 : Math.min(1, klepnuti * 0.38);
    skviraMat.opacity = tOtevreni >= 0 ? 0 : zaklad * (0.65 + 0.35 * Math.sin(cas * 9)) + Math.max(0, 1 - tk * 2.5) * 0.8;
    kamenMat.emissiveIntensity = 0.35 + zaklad * 0.9 + Math.max(0, 1 - tk * 2) * 1.5;
    kamen.rotation.z = Math.sin(cas * 1.5) * 0.08;
    svetlo.intensity = tOtevreni >= 0 ? 0 : zaklad * 2.5;

    // ── víko a světlo ──
    if (tOtevreni >= 0) {
      const k = cas - tOtevreni, t = cl(k / 0.85);
      vikoCep.rotation.x = -1.72 * pruzina(t);
      if (!vypusteno) {
        vypusteno = true;
        pruzne.remove(vybuch.obj); castice.splice(castice.indexOf(vybuch), 1); vybuch.dispose();
        vybuch = vytvorCastice("vybuch", meritko, barvyVybuchu(), tier === "legenda" ? 170 : tier === "vzacna" ? 140 : 110);
        vybuch.obj.position.set(0, H + 0.15, 0); pruzne.add(vybuch.obj); castice.push(vybuch);
        vybuch.vystrel?.(tier === "legenda" ? 1.5 : 1.15);
        kameraTres = klidne ? 0 : tier === "legenda" ? 0.6 : tier === "vzacna" ? 0.35 : 0.15;
        hexikReaguj(tier === "legenda" ? "salto" : "radost");
        if (tier === "legenda") window.setTimeout(() => vybuch.vystrel?.(1.2), 450);
      }
      const silaSvetla = tOdmena >= 0 ? 1 - easeOut((cas - tOdmena) / 1.2) * 0.55 : 1;
      sloupMat.opacity = Math.min(0.75, k * 3) * (0.8 + 0.2 * Math.sin(cas * 6)) * silaSvetla;
      sloup.scale.set(1 + Math.max(0, 0.5 - k) * 1.2, Math.min(1, k * 2.4), 1);
      truhla.updateMatrixWorld(); sloup.getWorldPosition(vec); sloup.rotation.y = Math.atan2(camera.position.x - vec.x, camera.position.z - vec.z) - truhla.rotation.y;
      paprskyMat.uniforms.uSila.value = Math.min(1, k * 1.6) * (tier === "legenda" ? 1.25 : tier === "vzacna" ? 1.0 : tier === "neobvykla" ? 0.8 : 0.6) * (0.6 + 0.4 * silaSvetla);
      zareVnitrMat.opacity = Math.min(1, k * 3) * silaSvetla;
      sametMat.emissiveIntensity = Math.min(1, k * 3) * 0.22;
      podlahaMat.color.copy(barvaTier); podlahaMat.opacity = 0.35 + Math.min(1, k * 2) * 0.45 * silaSvetla;
      const v = cl(k / 0.9); vlna.scale.setScalar(1 + easeOut(v) * 1.9); vlnaMat.opacity = (1 - v) * (1 - v) * 0.8;
      if (tOdmena < 0 && k > (klidne ? 0 : 0.55)) { tOdmena = cas; odmenaObal.visible = true; }
    } else {
      paprskyMat.uniforms.uSila.value = Math.max(0, zaklad * 0.12 - 0.02);
    }
    paprskyMat.uniforms.uCas.value = cas;

    // ── odměna: vyletí z truhly, vznáší se, otáčí se ──
    if (tOdmena >= 0 && tNasad < 0) {
      const k = cas - tOdmena, q = easeOut(k / 0.9);
      truhla.updateMatrixWorld(); vec.set(0, H, 0); pruzne.localToWorld(vec);
      odmenaObal.position.lerpVectors(vec, cilOdmeny, q); odmenaObal.position.y += Math.sin(q * Math.PI) * 0.5 + (q >= 1 ? Math.sin(cas * 2) * 0.06 : 0);
      let s = 0.2 + pruzina(cl(k / 0.9)) * 1.05;
      // věc, kterou už dítě má: po chvilce se rozpadne na krystaly
      if (!o.nova && k > 1.5) {
        if (tRozpad < 0) { tRozpad = cas; krystalyVybuch.obj.position.copy(odmenaObal.position); krystalyVybuch.vystrel?.(1); }
        s *= 1 - easeInOut((cas - tRozpad) / 0.35);
      }
      odmenaObal.scale.setScalar(Math.max(0.0001, s));
      // medailon se jen pohupuje čelem k dítěti (ikona musí být vidět), 3D věci se otáčejí dokola
      odmenaRot.rotation.y = (medailon ? Math.sin(cas * 1.3) * 0.45 : cas * 1.1) + (1 - q) * 6.283; odmenaRot.rotation.x = miniHexik || medailon ? 0 : 0.25;
      const fade = tRozpad >= 0 ? 1 - cl((cas - tRozpad) / 0.35) : 1;
      svatozarMat.opacity = q * (0.55 + 0.15 * Math.sin(cas * 3)) * fade; prstenMat.opacity = q * 0.7 * fade;
      prsten.rotation.z = cas * 0.6; prsten2.rotation.z = -cas * 0.4; prsten.scale.setScalar(1 + 0.04 * Math.sin(cas * 3));
      svatozar.lookAt(camera.position); prsten.lookAt(camera.position); prsten2.lookAt(camera.position);
      if (k > (klidne ? 0 : 0.7)) ohlas();
    }

    // ── nasazení: věc přiletí na Hexíka ──
    if (tNasad >= 0 && !nasazeno) {
      const q = easeInOut((cas - tNasad) / 0.75);
      hx.body.updateMatrixWorld();
      if (letiNa === "slot") { vec.set(0, o.odmena!.typ === "hlava" ? 1.0 : o.odmena!.typ === "oci" ? 0.1 : -0.5, 0.3); }
      else vec.set(0, 0, 0);
      hx.body.localToWorld(vec);
      odmenaObal.position.lerpVectors(cilOdmeny, vec, q); odmenaObal.position.y += Math.sin(q * Math.PI) * 0.9;
      odmenaObal.scale.setScalar(1.25 + (HX_S * (letiNa === "podoba" ? 0.4 : 1) - 1.25) * q);
      odmenaRot.rotation.y = (1 - q) * cas * 1.1; odmenaRot.rotation.x = (miniHexik ? 0 : 0.25) * (1 - q);
      svatozarMat.opacity = (1 - q) * 0.6; prstenMat.opacity = (1 - q) * 0.7;
      if (q >= 1) {
        nasazeno = true; odmenaObal.visible = false;
        if (letiNa === "slot" && o.odmena && jeSlot(o.odmena.typ)) sloty[o.odmena.typ] = o.odmena.klic;
        if (letiNa === "podoba" && o.odmena) podobaHexika = o.odmena.klic;
        hxObal.remove(hx.root); hxObal.remove(hx.stin); hx.dispose();
        hx = postavHexika(podobaHexika, o.etapa, meritko, sloty); hxObal.add(hx.root); hxObal.add(hx.stin); hx.okoli.visible = false;
        hlavaJiskry.obj.position.set(0, letiNa === "podoba" ? 0 : 1.0, 0);
        hlavaJiskry.vystrel?.(letiNa === "podoba" ? 1.2 : 0.8); hexikReaguj(o.vz === "legenda" ? "salto" : "radost");
        o.onNasazeno?.();
      }
    }

    // ── Hexík ──
    const cilX = tNasad >= 0 ? -1.05 : tOtevreni >= 0 ? -1.4 : -1.75 + klepnuti * 0.08;
    hxObal.position.x += (cilX - hxObal.position.x) * Math.min(1, dt * 6);
    const cilR = tNasad >= 0 ? 0.2 : 0.55;
    hxObal.rotation.y += (cilR - hxObal.rotation.y) * Math.min(1, dt * 4);
    let P = klid(cas, true);
    if (akce) { const a: { id: Reakce3D; start: number } = akce; const p = Math.min(1, (cas - a.start) / DELKA[a.id]); P = reakce(a.id, p, cas, P, true); if (p >= 1) akce = null; }
    hx.root.position.y = P.y; hx.root.rotation.set(P.rX, P.rY, 0); hx.root.scale.setScalar(P.s);
    const sk = 1 / Math.sqrt(P.sy); hx.hips.scale.set(sk, P.sy, sk); hx.body.rotation.z = P.rZ;
    hx.armL.rotation.z = -P.aL; hx.armR.rotation.z = P.aR;
    for (const e of hx.eyes) e.position.x = (e.userData.bx as number) + (tOdmena >= 0 && tNasad < 0 ? 0.05 : 0.035);
    if (dt > 0) {
      const vy = (P.y - minula.y) / dt;
      hx.aktualizuj({ ay: Math.max(-40, Math.min(40, (vy - minula.vy) / dt)), wy: (P.rY - minula.rY) / dt, wx: (P.rX - minula.rX) / dt, wz: 0, cas, dt });
      minula.y = P.y; minula.vy = vy; minula.rY = P.rY; minula.rX = P.rX;
      if (odmenaObal.visible) {
        doplnek?.krok?.({ ay: 0, wx: 0, wy: 1.1, wz: 0, cas, dt });
        miniHexik?.aktualizuj({ ay: 0, wx: 0, wy: 1.1, wz: 0, cas, dt });
      }
    }
    for (const c of castice) c.aktualizuj(krok, cas);
    model.krok?.(cas);

    // ── kamera ──
    const priblizeni = tOtevreni >= 0 ? (tOdmena >= 0 ? -0.2 : 0.4) : Math.min(3, klepnuti) * 0.35 + (tNadech >= 0 ? 0.25 : 0);
    const aspekt = camera.aspect, zaklZ = aspekt < 1 ? 8.6 / Math.max(0.5, aspekt) : 8.6;
    camera.position.z += (zaklZ - priblizeni - camera.position.z) * Math.min(1, dt * 5);
    camera.position.y += ((tOdmena >= 0 ? 1.0 : 0.6) - camera.position.y) * Math.min(1, dt * 4);
    kameraTres = Math.max(0, kameraTres - dt);
    camera.position.x = Math.sin(cas * 55) * kameraTres * 0.07 - 0.3;
    lookY += ((tOdmena >= 0 ? (nasirku ? 0.05 : -0.6) : -0.55) - lookY) * Math.min(1, dt * 3.5);
    camera.lookAt(-0.3, lookY, 0);
    studio.render();
    raf = requestAnimationFrame(snimek);
  }

  camera.position.set(-0.3, 0.75, 8.6);
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(velikost) : null; ro?.observe(canvas);
  canvas.addEventListener("pointerdown", klepni);
  velikost();
  nastavTier("bezna");
  raf = requestAnimationFrame(snimek);
  if (klidne) otevri();
  // Samootevření hlídá i skutečný čas (na pomalém zařízení se snímky zpožďují)
  const hlidac = window.setInterval(() => { if (tNadech < 0 && performance.now() - posledniAkceMs > samaPo * 1000) otevri(); }, 400);

  return {
    klepni, otevri, nasad,
    znic() {
      cancelAnimationFrame(raf); window.clearTimeout(pojistka); window.clearInterval(hlidac); ro?.disconnect(); canvas.removeEventListener("pointerdown", klepni);
      hx.dispose(); miniHexik?.dispose(); castice.forEach((c) => c.dispose());
      geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); texs.forEach((x) => x.dispose());
      studio.znic();
    },
  };
}
