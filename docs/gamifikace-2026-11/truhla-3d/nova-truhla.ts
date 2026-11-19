/**
 * MOCKUP: nové 3D otevírání truhly (návrh 19. 11. 2026).
 * Používá skutečného Hexíka (lib/hexik3d/model) a skutečné doplňky (lib/hexik3d/doplnky).
 *
 * Průběh:
 *  1) čekání: truhla dýchá a občas poskočí, zámek pulzuje
 *  2) 3 klepnutí: zmáčknutí a pružení, škvíra svítí silněji, barva se může „vylepšit“ (bílá → modrá → fialová)
 *  3) otevření: nádech (truhla se přikrčí), víko odletí, sloup světla, paprsky, rázová vlna, výbuch jiskřiček
 *     u legendy navíc „upgrade“ na zlatou v okamžiku otevření
 *  4) odměna vyletí z truhly jako 3D předmět, otáčí se nad truhlou se svatozáří
 *  5) Nasadit: předmět přiletí Hexíkovi na hlavu, Hexík ho má hned na sobě a zajásá
 */
import * as THREE from "three";
import { postavTruhlu } from "./truhla-model";
import { vytvorStudio } from "./scena-sdilena";
import { postavHexika, type HexikModel } from "../../../src/lib/hexik3d/model";
import { doplnekNaSlot, type Doplnek, type Sklad } from "../../../src/lib/hexik3d/doplnky";
import { klid, reakce, DELKA, type Reakce3D } from "../../../src/lib/hexik3d/animace";
import { vytvorCastice, type Castice } from "../../../src/lib/hexik3d/castice";

export type Vz = "bezna" | "neobvykla" | "vzacna" | "legenda";
export type Druh = "denni" | "mistrovska" | "legendarni" | "krystalova";
const PORADI: Vz[] = ["bezna", "neobvykla", "vzacna", "legenda"];
export const BARVA: Record<Vz, string> = { bezna: "#E6EDF8", neobvykla: "#4DA3FF", vzacna: "#B07CFF", legenda: "#FFC93C" };
const POZADI: Record<Vz, [string, string]> = { bezna: ["#33399A", "#121A4C"], neobvykla: ["#2A55B8", "#0F1F55"], vzacna: ["#5233B0", "#1B1352"], legenda: ["#8A6326", "#2A1A3E"] };

export interface Udalosti {
  klepnuti?: (n: number, vz: Vz) => void;
  otevreno?: (vz: Vz) => void;
  odmena?: () => void;
  nasazeno?: () => void;
}

export interface NovaTruhla { klepni(): void; preskoc(): void; nasad(): void; znic(): void }

const cl = (v: number) => Math.max(0, Math.min(1, v));
const easeOut = (x: number) => 1 - Math.pow(1 - cl(x), 3);
const easeInOut = (x: number) => { x = cl(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const pruzina = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x) * Math.cos(x * Math.PI * 3));

// ── Textury ──────────────────────────────────────────────────────────────────
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

export function vytvorNovouTruhlu(canvas: HTMLCanvasElement, o: { druh: Druh; vz: Vz; odmena: string; podoba?: string }, u: Udalosti): NovaTruhla {
  const studio = vytvorStudio(canvas);
  const { renderer, scene, camera } = studio;
  const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [], texs: THREE.Texture[] = [];
  const g = <T extends THREE.BufferGeometry>(x: T) => { geos.push(x); return x; };
  const mt = <T extends THREE.Material>(x: T) => { mats.push(x); return x; };
  const tx = <T extends THREE.Texture>(x: T) => { texs.push(x); return x; };
  const sklad: Sklad = { g, m: mt, t: tx };

  const meritko = { value: 400 };
  let tier: Vz = "bezna";
  const barvaTier = new THREE.Color(BARVA.bezna);

  // ── model truhly (nový, truhla-model.ts) ──
  const truhla = new THREE.Group(); truhla.position.set(0.45, -1.25, 0); truhla.rotation.y = -0.42; scene.add(truhla);
  const model = postavTruhlu(sklad, o.druh, barvaTier); truhla.add(model.root);
  const { pruzne, vikoCep, kamen, kamenMat, skviraMat, H } = model;
  const podVikoMat = model.sametMat;
  const zareTex = tx(texturaZare());
  const zareVnitrMat = mt(new THREE.MeshBasicMaterial({ map: zareTex, color: barvaTier, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const zareVnitr = new THREE.Mesh(g(new THREE.PlaneGeometry(model.W * 1.1, model.D * 1.3)), zareVnitrMat); zareVnitr.rotation.x = -Math.PI / 2; zareVnitr.position.y = H + 0.07; pruzne.add(zareVnitr);
  const svetlo = new THREE.PointLight(barvaTier, 0, 7, 1.6); svetlo.position.set(0, H + 0.5, 0.2); pruzne.add(svetlo);

  // ── světelné efekty ──
  const sloupTex = tx(texturaSloupu());
  const sloupMat = mt(new THREE.MeshBasicMaterial({ map: sloupTex, color: barvaTier, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const sloup = new THREE.Group(); sloup.position.y = H; pruzne.add(sloup);
  { const pg = g(new THREE.PlaneGeometry(1.25, 4.4)); pg.translate(0, 2.2, 0); const a = new THREE.Mesh(pg, sloupMat); sloup.add(a);
    const pg2 = g(new THREE.PlaneGeometry(0.6, 3.6)); pg2.translate(0, 1.8, 0.01); const b = new THREE.Mesh(pg2, sloupMat); sloup.add(b); }
  const paprskyMat = mt(new THREE.ShaderMaterial({ vertexShader: PAPRSKY_VERT, fragmentShader: PAPRSKY_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uCas: { value: 0 }, uSila: { value: 0 }, uBarva: { value: barvaTier.clone() } } }));
  const paprsky = new THREE.Mesh(g(new THREE.PlaneGeometry(9, 9)), paprskyMat); paprsky.position.set(0.2, 0.55, -2.2); scene.add(paprsky);
  // rázová vlna na zemi
  const vlnaMat = mt(new THREE.MeshBasicMaterial({ color: barvaTier, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  const vlna = new THREE.Mesh(g(new THREE.RingGeometry(0.95, 1, 72)), vlnaMat); vlna.rotation.x = -Math.PI / 2; vlna.position.y = 0.02; truhla.add(vlna);
  // svítící podlaha pod truhlou
  const podlahaMat = mt(new THREE.MeshBasicMaterial({ map: zareTex, color: "#6E76D8", transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  const podlaha = new THREE.Mesh(g(new THREE.PlaneGeometry(4.4, 3)), podlahaMat); podlaha.rotation.x = -Math.PI / 2; podlaha.position.y = 0.004; truhla.add(podlaha);
  // stín
  const stinC = document.createElement("canvas"); stinC.width = stinC.height = 64;
  { const s = stinC.getContext("2d")!, gr = s.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(4,8,26,.6)"); gr.addColorStop(1, "rgba(4,8,26,0)"); s.fillStyle = gr; s.fillRect(0, 0, 64, 64); }
  const stinMat = mt(new THREE.MeshBasicMaterial({ map: tx(new THREE.CanvasTexture(stinC)), transparent: true, depthWrite: false }));
  const stin = new THREE.Mesh(g(new THREE.PlaneGeometry(2.6, 1.9)), stinMat); stin.rotation.x = -Math.PI / 2; stin.position.y = 0.006; truhla.add(stin);

  // částice (skutečný modul z appky)
  const castice: Castice[] = [];
  const barvyVybuchu = () => (tier === "legenda" ? ["#FFC93C", "#FFFFFF", "#FFE08A", "#B07CFF"] : [BARVA[tier], "#FFFFFF"]);
  let vybuch = vytvorCastice("vybuch", meritko, barvyVybuchu(), 120); vybuch.obj.position.set(0, H + 0.15, 0); pruzne.add(vybuch.obj); castice.push(vybuch);
  const trpyt = vytvorCastice("aura", meritko, ["#FFFFFF", "#C9C7F5"], 16); trpyt.obj.position.set(0, H * 0.7, 0); trpyt.obj.scale.setScalar(1.2); pruzne.add(trpyt.obj); castice.push(trpyt);

  // ── odměna (skutečný doplněk z appky) ──
  const odmenaObal = new THREE.Group(); odmenaObal.visible = false; scene.add(odmenaObal);
  const odmenaRot = new THREE.Group(); odmenaObal.add(odmenaRot);
  const d: Doplnek | null = doplnekNaSlot(sklad, "hlava", o.odmena);
  if (d) {
    d.obj.position.set(0, 0, 0); odmenaRot.add(d.obj);
    const box = new THREE.Box3().setFromObject(d.obj), c = box.getCenter(new THREE.Vector3());
    d.obj.position.sub(c);
  }
  const svatozarMat = mt(new THREE.MeshBasicMaterial({ map: zareTex, color: barvaTier, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const svatozar = new THREE.Mesh(g(new THREE.PlaneGeometry(2.6, 2.6)), svatozarMat); svatozar.position.z = -0.6; odmenaObal.add(svatozar);
  const prstenMat = mt(new THREE.MeshBasicMaterial({ color: barvaTier, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const prsten = new THREE.Mesh(g(new THREE.TorusGeometry(0.95, 0.012, 8, 96)), prstenMat); prsten.position.z = -0.3; odmenaObal.add(prsten);
  const prsten2 = new THREE.Mesh(g(new THREE.TorusGeometry(1.12, 0.006, 8, 96)), prstenMat); prsten2.position.z = -0.35; odmenaObal.add(prsten2);
  const odmenaJiskry = vytvorCastice("aura", meritko, [BARVA[o.vz], "#FFFFFF"], 26); odmenaObal.add(odmenaJiskry.obj); castice.push(odmenaJiskry);

  // ── Hexík ──
  const HX_S = 0.56;
  const hxObal = new THREE.Group(); hxObal.position.set(-1.75, -1.25 + 1.4 * HX_S, 0.35); hxObal.scale.setScalar(HX_S); hxObal.rotation.y = 0.55; scene.add(hxObal);
  let hx: HexikModel = postavHexika(o.podoba ?? "klasik", 3, meritko, {});
  hxObal.add(hx.root); hxObal.add(hx.stin); hx.okoli.visible = false;
  const hlavaJiskry = vytvorCastice("vybuch", meritko, [BARVA[o.vz], "#FFFFFF"], 60); hxObal.add(hlavaJiskry.obj); hlavaJiskry.obj.position.set(0, 1.0, 0); castice.push(hlavaJiskry);

  // ── stav ──
  const klidne = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  let cas = 0, klepnuti = 0, tOtevreni = -1, tNadech = -1, tOdmena = -1, tNasad = -1, tKlep = -10, tTier = -10;
  let vypusteno = false, ohlasenoOdmena = false, nasazeno = false, kameraTres = 0;
  let akce: { id: Reakce3D; start: number } | null = null;
  const minula = { y: 0, vy: 0, rY: 0, rX: 0 };
  const hexikReaguj = (id: Reakce3D) => { akce = { id, start: cas }; };
  const tierPoKlepnuti = (n: number): Vz => PORADI[Math.min(PORADI.indexOf(o.vz), Math.min(n - 1, 2))];

  function nastavTier(t: Vz) {
    tier = t; barvaTier.set(BARVA[t]);
    for (const m of [zareVnitrMat, skviraMat, sloupMat, vlnaMat, svatozarMat, prstenMat]) m.color.copy(barvaTier);
    kamenMat.color.copy(barvaTier); kamenMat.emissive.copy(barvaTier); podVikoMat.emissive.copy(barvaTier);
    svetlo.color.copy(barvaTier); (paprskyMat.uniforms.uBarva.value as THREE.Color).copy(barvaTier);
    studio.pozadi(POZADI[t][0], POZADI[t][1]);
    tTier = cas;
  }

  function klepni() {
    if (tNadech >= 0) return;
    klepnuti++; tKlep = cas;
    const novy = tierPoKlepnuti(klepnuti);
    if (novy !== tier) nastavTier(novy);
    u.klepnuti?.(klepnuti, tier);
    hexikReaguj(klepnuti === 1 ? "jasot" : klepnuti === 2 ? "radost" : "poskok");
    if (klepnuti >= 3) tNadech = cas + 0.12;
  }
  function preskoc() {
    if (tNadech < 0) { klepnuti = 3; nastavTier(tierPoKlepnuti(3)); tNadech = cas; }
  }
  function nasad() {
    if (tOdmena < 0 || tNasad >= 0) return;
    tNasad = cas;
  }

  function velikost() {
    studio.velikost();
    meritko.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }

  const vec = new THREE.Vector3();
  let lookY = -0.55;
  const aspekt0 = () => camera.aspect;
  let raf = 0, minule = performance.now();
  function snimek() {
    const ted = performance.now(), dt = Math.min(0.05, (ted - minule) / 1000); minule = ted; cas += dt;

    // otevření: nádech (0,35 s) → víko
    if (tNadech >= 0 && tOtevreni < 0 && cas >= tNadech + (klidne ? 0 : 0.38)) {
      tOtevreni = cas;
      if (tier !== o.vz) nastavTier(o.vz);
      u.otevreno?.(tier);
    }

    // ── truhla: dýchání, poskoky, zmáčknutí ──
    let sy = 1, sxz = 1, rz = 0, yy = 0;
    if (tNadech < 0) {
      sy = 1 + 0.012 * Math.sin(cas * 2.4);
      const hop = (cas % 3.2) / 3.2; if (hop > 0.85) { const q = (hop - 0.85) / 0.15; yy = Math.sin(q * Math.PI) * 0.09; sy += Math.sin(q * Math.PI * 2) * 0.04; }
      const k = cas - tKlep;
      if (k < 0.6) { const sila = 0.08 + klepnuti * 0.03; sy -= Math.exp(-k * 9) * Math.cos(k * 28) * sila; rz = Math.exp(-k * 8) * Math.sin(k * 46) * 0.06 * klepnuti; }
      sxz = 1 / Math.sqrt(Math.max(0.6, sy));
    } else if (tOtevreni < 0) {
      const q = cl((cas - tNadech) / 0.38); sy = 1 - easeInOut(q) * 0.16; sxz = 1 + easeInOut(q) * 0.08; rz = Math.sin(cas * 70) * 0.02 * q;
    } else {
      const k = cas - tOtevreni; sy = 1 + Math.exp(-k * 6) * Math.sin(k * 22) * 0.14; sxz = 1 / Math.sqrt(sy);
      // po vyletění odměny truhla ustoupí do pozadí
      if (tOdmena >= 0) yy = -easeOut((cas - tOdmena) / 0.8) * 0.15;
    }
    pruzne.scale.set(sxz, sy, sxz); pruzne.rotation.z = rz; truhla.position.y = -1.25 + yy;

    // škvíra a záře před otevřením
    const tk = cas - tTier;
    const zaklad = tNadech >= 0 ? 1 : Math.min(1, klepnuti * 0.38);
    skviraMat.opacity = tOtevreni >= 0 ? 0 : zaklad * (0.65 + 0.35 * Math.sin(cas * 9)) + Math.max(0, 1 - tk * 2.5) * 0.8;
    kamenMat.emissiveIntensity = 0.35 + zaklad * 0.9 + Math.max(0, 1 - tk * 2) * 1.5;
    kamen.rotation.z = Math.sin(cas * 1.5) * 0.08;
    svetlo.intensity = tOtevreni >= 0 ? 0 : zaklad * 2.5;

    // víko a světlo
    if (tOtevreni >= 0) {
      const k = cas - tOtevreni;
      const t = cl(k / 0.85);
      vikoCep.rotation.x = -1.72 * pruzina(t);
      if (!vypusteno) {
        vypusteno = true;
        pruzne.remove(vybuch.obj); castice.splice(castice.indexOf(vybuch), 1); vybuch.dispose();
        vybuch = vytvorCastice("vybuch", meritko, barvyVybuchu(), tier === "legenda" ? 170 : tier === "vzacna" ? 140 : 110);
        vybuch.obj.position.set(0, H + 0.15, 0); pruzne.add(vybuch.obj); castice.push(vybuch);
        vybuch.vystrel?.(tier === "legenda" ? 1.5 : 1.15);
        kameraTres = tier === "legenda" ? 0.6 : tier === "vzacna" ? 0.35 : 0.15;
        hexikReaguj(tier === "legenda" ? "salto" : "radost");
        if (tier === "legenda") window.setTimeout(() => vybuch.vystrel?.(1.2), 450);
      }
      const silaSvetla = tOdmena >= 0 ? 1 - easeOut((cas - tOdmena) / 1.2) * 0.55 : 1;
      sloupMat.opacity = Math.min(0.75, k * 3) * (0.8 + 0.2 * Math.sin(cas * 6)) * silaSvetla;
      sloup.scale.set(1 + Math.max(0, 0.5 - k) * 1.2, Math.min(1, k * 2.4), 1);
      truhla.updateMatrixWorld(); sloup.getWorldPosition(vec); sloup.rotation.y = Math.atan2(camera.position.x - vec.x, camera.position.z - vec.z) - truhla.rotation.y;
      paprskyMat.uniforms.uSila.value = Math.min(1, k * 1.6) * (tier === "legenda" ? 1.25 : tier === "vzacna" ? 1.0 : tier === "neobvykla" ? 0.8 : 0.6) * (0.6 + 0.4 * silaSvetla);
      zareVnitrMat.opacity = Math.min(1, k * 3) * silaSvetla;
      podVikoMat.emissiveIntensity = Math.min(1, k * 3) * 0.22;
      podlahaMat.color.copy(barvaTier); podlahaMat.opacity = 0.35 + Math.min(1, k * 2) * 0.45 * silaSvetla;
      const v = cl(k / 0.9); vlna.scale.setScalar(1 + easeOut(v) * 1.9); vlnaMat.opacity = (1 - v) * (1 - v) * 0.8;
      if (tOdmena < 0 && k > (klidne ? 0 : 0.55)) { tOdmena = cas; odmenaObal.visible = true; }
    } else {
      paprskyMat.uniforms.uSila.value = Math.max(0, zaklad * 0.12 - 0.02);
    }
    paprskyMat.uniforms.uCas.value = cas;

    // ── odměna: vyletí z truhly, vznáší se a otáčí ──
    if (tOdmena >= 0 && tNasad < 0) {
      const k = cas - tOdmena, q = easeOut(k / 0.9);
      truhla.updateMatrixWorld(); vec.set(0, H, 0); pruzne.localToWorld(vec);
      const cil = new THREE.Vector3(0.25, aspekt0() < 1 ? 0.8 : 1.05, 0.9);
      odmenaObal.position.lerpVectors(vec, cil, q); odmenaObal.position.y += Math.sin(q * Math.PI) * 0.5 + (q >= 1 ? Math.sin(cas * 2) * 0.06 : 0);
      odmenaObal.scale.setScalar(0.2 + pruzina(cl(k / 0.9)) * 1.05);
      odmenaRot.rotation.y = cas * 1.1 + (1 - q) * 6; odmenaRot.rotation.x = 0.25;
      svatozarMat.opacity = q * (0.55 + 0.15 * Math.sin(cas * 3)); prstenMat.opacity = q * 0.7;
      prsten.rotation.z = cas * 0.6; prsten2.rotation.z = -cas * 0.4; prsten.scale.setScalar(1 + 0.04 * Math.sin(cas * 3));
      svatozar.lookAt(camera.position); prsten.lookAt(camera.position); prsten2.lookAt(camera.position);
      if (!ohlasenoOdmena && k > 0.7) { ohlasenoOdmena = true; u.odmena?.(); }
    }

    // ── nasazení: předmět přiletí Hexíkovi na hlavu ──
    if (tNasad >= 0 && !nasazeno) {
      const q = easeInOut((cas - tNasad) / 0.75);
      const start = new THREE.Vector3(0.25, (aspekt0() < 1 ? 0.8 : 1.05) + Math.sin(cas * 2) * 0.06, 0.9);
      hx.body.updateMatrixWorld(); vec.set(0, 1.0, 0); hx.body.localToWorld(vec);
      odmenaObal.position.lerpVectors(start, vec, q); odmenaObal.position.y += Math.sin(q * Math.PI) * 0.9;
      odmenaObal.scale.setScalar(1.25 + (HX_S - 1.25) * q);
      odmenaRot.rotation.y = (1 - q) * cas * 1.1 + q * hxObal.rotation.y * 0; odmenaRot.rotation.x = 0.25 * (1 - q);
      svatozarMat.opacity = (1 - q) * 0.6; prstenMat.opacity = (1 - q) * 0.7;
      if (q >= 1) {
        nasazeno = true; odmenaObal.visible = false;
        hxObal.remove(hx.root); hxObal.remove(hx.stin); hx.dispose();
        hx = postavHexika(o.podoba ?? "klasik", 3, meritko, { hlava: o.odmena }); hxObal.add(hx.root); hxObal.add(hx.stin); hx.okoli.visible = false;
        hlavaJiskry.vystrel?.(0.8); hexikReaguj(o.vz === "legenda" ? "salto" : "radost");
        u.nasazeno?.();
      }
    }

    // ── Hexík: při klepání se přibližuje, po nasazení se otočí ke kameře ──
    const cilX = tNasad >= 0 ? -1.05 : tOtevreni >= 0 ? -1.4 : -1.75 + klepnuti * 0.08;
    hxObal.position.x += (cilX - hxObal.position.x) * Math.min(1, dt * 6);
    const cilR = tNasad >= 0 ? 0.2 : 0.55;
    hxObal.rotation.y += (cilR - hxObal.rotation.y) * Math.min(1, dt * 4);
    let P = klid(cas, true);
    if (akce) { const p = Math.min(1, (cas - akce.start) / DELKA[akce.id]); P = reakce(akce.id, p, cas, P, true); if (p >= 1) akce = null; }
    hx.root.position.y = P.y; hx.root.rotation.set(P.rX, P.rY, 0); hx.root.scale.setScalar(P.s);
    const sk = 1 / Math.sqrt(P.sy); hx.hips.scale.set(sk, P.sy, sk); hx.body.rotation.z = P.rZ;
    hx.armL.rotation.z = -P.aL; hx.armR.rotation.z = P.aR;
    // oči sledují truhlu, potom odměnu
    for (const e of hx.eyes) e.position.x = (e.userData.bx as number) + (tOdmena >= 0 && tNasad < 0 ? 0.05 : 0.035);
    if (dt > 0) {
      const vy = (P.y - minula.y) / dt;
      hx.aktualizuj({ ay: Math.max(-40, Math.min(40, (vy - minula.vy) / dt)), wy: (P.rY - minula.rY) / dt, wx: (P.rX - minula.rX) / dt, wz: 0, cas, dt });
      minula.y = P.y; minula.vy = vy; minula.rY = P.rY; minula.rX = P.rX;
    }
    if (d && odmenaObal.visible) d.krok?.({ ay: 0, wx: 0, wy: 1.1, wz: 0, cas, dt });
    for (const c of castice) c.aktualizuj(dt, cas);

    // ── kamera: při klepání se přibližuje, po otevření zpět a nahoru, u vzácných otřes ──
    const priblizeni = tOtevreni >= 0 ? (tOdmena >= 0 ? -0.2 : 0.4) : Math.min(3, klepnuti) * 0.35 + (tNadech >= 0 ? 0.25 : 0);
    const aspekt = camera.aspect, zaklZ = aspekt < 1 ? 8.6 / Math.max(0.5, aspekt) : 8.6;
    const cz = zaklZ - priblizeni;
    camera.position.z += (cz - camera.position.z) * Math.min(1, dt * 5);
    const cy = tOdmena >= 0 ? 1.0 : 0.6;
    camera.position.y += (cy - camera.position.y) * Math.min(1, dt * 4);
    kameraTres = Math.max(0, kameraTres - dt);
    camera.position.x = Math.sin(cas * 55) * kameraTres * 0.07 - 0.3;
    lookY += ((tOdmena >= 0 ? (aspekt < 1 ? -0.6 : 0.05) : -0.55) - lookY) * Math.min(1, dt * 3.5);
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
  if (klidne) preskoc();

  return {
    klepni, preskoc, nasad,
    znic() {
      cancelAnimationFrame(raf); ro?.disconnect(); canvas.removeEventListener("pointerdown", klepni);
      hx.dispose(); castice.forEach((c) => c.dispose());
      geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); texs.forEach((x) => x.dispose());
      studio.znic();
    },
  };
}
