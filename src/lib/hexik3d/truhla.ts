/**
 * 3D otevírání truhly (Karel 18. 11. 2026: „ať je vidět, jak Hexík truhlu otevírá, hezky ve 3D“).
 *
 * Průběh: truhla čeká a poskakuje → dítě na ni klepe (1. klepnutí zatřese, 2. ze škvíry prosvítá barva
 * vzácnosti, 3. Hexík skočí a víko se rozletí) → paprsky světla, výbuch jiskřiček a odměna.
 * Když dítě neklepe, truhla se otevře sama (kvůli plynulosti i testům). Výsledek se losuje předem
 * v lib/sbirka.ts, scéna ho jen ukazuje (barva podle vzácnosti).
 */
import * as THREE from "three";
import { postavHexika, type HexikModel, type SlotyHexika } from "./model";
import { klid, reakce, DELKA, type Reakce3D } from "./animace";
import { vytvorCastice, type Castice } from "./castice";

export type DruhTruhly = "denni" | "doporuceni" | "generalka" | "legendarni" | "sezonni" | "krystalova" | "velka" | "mistrovska" | "zlata";
export type VzacnostTruhly = "bezna" | "neobvykla" | "vzacna" | "legenda";

export const BARVA_VZACNOSTI: Record<VzacnostTruhly, string> = { bezna: "#DDE6F5", neobvykla: "#4DA3FF", vzacna: "#B07CFF", legenda: "#FFC93C" };

interface Vzhled { barva: string; kovani: string; drevo?: boolean; krystal?: boolean; zlato?: boolean }
const VZHLED: Record<DruhTruhly, Vzhled> = {
  denni: { barva: "#A86A34", kovani: "#7D8896", drevo: true },
  krystalova: { barva: "#5CC8F0", kovani: "#E4ECF5", krystal: true },
  velka: { barva: "#6B4FD6", kovani: "#F5C542", drevo: true },
  mistrovska: { barva: "#24305E", kovani: "#F5C542", drevo: true },
  zlata: { barva: "#FFC93C", kovani: "#FFF1C2", zlato: true },
  doporuceni: { barva: "#2FA36B", kovani: "#F5C542", drevo: true },
  generalka: { barva: "#22305E", kovani: "#F5C542", drevo: true },
  legendarni: { barva: "#FFC93C", kovani: "#B07CFF", zlato: true },
  sezonni: { barva: "#C8202A", kovani: "#F5F5F5", drevo: true },
};

export interface MoznostiTruhly {
  druh: DruhTruhly;
  vz: VzacnostTruhly;
  podoba: string;
  etapa: number;
  sloty?: SlotyHexika;
  /** Víko se otevřelo (ukázat odměnu). */
  onOtevreno: () => void;
  /** Kolikrát už dítě klepnulo (pro nápovědu pod truhlou). */
  onKlepnuti?: (n: number) => void;
  /** Po kolika sekundách bez klepnutí se truhla otevře sama. */
  samaPo?: number;
}

export interface Truhla3D { klepni: () => void; otevri: () => void; znic: () => void }

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const pruzneOtevreni = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -9 * x) * Math.cos(x * Math.PI * 2.4));

function texturaDreva(barva: string): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = barva; x.fillRect(0, 0, 256, 256);
  for (let p = 0; p < 4; p++) {
    x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(0, p * 64, 256, 3);
    for (let k = 0; k < 9; k++) {
      x.strokeStyle = `rgba(${k % 2 ? "255,240,220" : "40,20,0"},${0.06 + (k % 3) * 0.03})`; x.lineWidth = 1 + (k % 2);
      x.beginPath(); const y = p * 64 + 8 + k * 6;
      x.moveTo(0, y); for (let i = 0; i <= 8; i++) x.lineTo(i * 32, y + Math.sin(i * 1.3 + k + p) * 2.5); x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

function texturaPaprsku(): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 16; c.height = 128;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 128, 0, 0); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.5, "rgba(255,255,255,.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 16, 128);
  const h = x.createLinearGradient(0, 0, 16, 0); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(0.5, "rgba(0,0,0,0)"); h.addColorStop(1, "rgba(0,0,0,1)");
  x.globalCompositeOperation = "destination-out"; x.fillStyle = h; x.fillRect(0, 0, 16, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function vytvorTruhlu3D(canvas: HTMLCanvasElement, m: MoznostiTruhly): Truhla3D {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [], texs: THREE.Texture[] = [];
  const g = <T extends THREE.BufferGeometry>(x: T) => { geos.push(x); return x; };
  const mt = <T extends THREE.Material>(x: T) => { mats.push(x); return x; };

  // Prostředí pro odlesky a světla (stejně jako u Hexíka)
  const pm = new THREE.PMREMGenerator(renderer);
  const es = new THREE.Scene();
  const eg = new THREE.SphereGeometry(10, 32, 16), pos = eg.attributes.position, cols: number[] = [];
  const dol = new THREE.Color("#6E74A8"), nah = new THREE.Color("#FFFFFF");
  for (let i = 0; i < pos.count; i++) { const k = Math.max(0, pos.getY(i) / 10) * 0.85 + 0.12; const c = dol.clone().lerp(nah, k); cols.push(c.r, c.g, c.b); }
  eg.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  const em = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }); es.add(new THREE.Mesh(eg, em));
  const envRT = pm.fromScene(es, 0.04); scene.environment = envRT.texture; scene.environmentIntensity = 0.9;
  eg.dispose(); em.dispose(); pm.dispose();
  scene.add(new THREE.HemisphereLight("#FFFFFF", "#3A3F6B", 1.3));
  const key = new THREE.DirectionalLight("#FFFFFF", 2.2); key.position.set(2.5, 4, 4); scene.add(key);
  const rim = new THREE.DirectionalLight("#B9A8FF", 1.8); rim.position.set(-3, 2.5, -3); scene.add(rim);

  const barvaVz = new THREE.Color(BARVA_VZACNOSTI[m.vz]);
  const meritko = { value: 400 };
  const vz = VZHLED[m.druh];

  // ── Truhla ────────────────────────────────────────────────────────────────
  const truhla = new THREE.Group(); truhla.position.set(0.75, -0.9, 0); truhla.rotation.y = -0.38; scene.add(truhla);
  const telo = new THREE.Group(); truhla.add(telo);
  let teloMat: THREE.Material;
  if (vz.drevo) { const t = texturaDreva(vz.barva); texs.push(t); teloMat = mt(new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.65, clearcoat: 0.25 })); }
  else if (vz.krystal) teloMat = mt(new THREE.MeshPhysicalMaterial({ color: vz.barva, roughness: 0.05, transparent: true, opacity: 0.82, clearcoat: 1, iridescence: 0.8, iridescenceIOR: 1.5 }));
  else teloMat = mt(new THREE.MeshPhysicalMaterial({ color: vz.barva, metalness: 0.75, roughness: 0.25, clearcoat: 0.8, emissive: "#A86E00", emissiveIntensity: 0.4 }));
  const kovMat = mt(new THREE.MeshPhysicalMaterial({ color: vz.kovani, metalness: 0.85, roughness: 0.25, clearcoat: 0.6, emissive: vz.kovani === "#F5C542" ? "#7A5200" : "#000000", emissiveIntensity: 0.35 }));

  const W = 1.5, H = 0.8, D = 1.0;
  const tvar = new THREE.Shape(); const rr = 0.08;
  tvar.moveTo(-W / 2 + rr, 0); tvar.lineTo(W / 2 - rr, 0); tvar.quadraticCurveTo(W / 2, 0, W / 2, rr); tvar.lineTo(W / 2, H); tvar.lineTo(-W / 2, H); tvar.lineTo(-W / 2, rr); tvar.quadraticCurveTo(-W / 2, 0, -W / 2 + rr, 0);
  const teloGeo = g(new THREE.ExtrudeGeometry(tvar, { depth: D, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 }));
  teloGeo.translate(0, 0, -D / 2);
  telo.add(new THREE.Mesh(teloGeo, teloMat));
  // vnitřek (tmavý) a světlo uvnitř
  const vnitrek = new THREE.Mesh(g(new THREE.PlaneGeometry(W - 0.08, D - 0.08)), mt(new THREE.MeshBasicMaterial({ color: barvaVz.clone().multiplyScalar(0.25) })));
  vnitrek.rotation.x = -Math.PI / 2; vnitrek.position.y = H - 0.02; telo.add(vnitrek);
  const zareMat = mt(new THREE.MeshBasicMaterial({ color: barvaVz, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const zare = new THREE.Mesh(g(new THREE.PlaneGeometry(W - 0.1, D - 0.1)), zareMat); zare.rotation.x = -Math.PI / 2; zare.position.y = H + 0.005; telo.add(zare);
  const svetlo = new THREE.PointLight(barvaVz, 0, 6, 1.5); svetlo.position.set(0, H + 0.4, 0); telo.add(svetlo);
  // kování na těle
  for (const sx of [-1, 1]) {
    const pas = new THREE.Mesh(g(new THREE.BoxGeometry(0.12, H + 0.02, D + 0.08)), kovMat); pas.position.set(sx * W * 0.32, H / 2, 0); telo.add(pas);
    const roh = new THREE.Mesh(g(new THREE.BoxGeometry(0.1, H + 0.04, 0.1)), kovMat); roh.position.set(sx * (W / 2 + 0.01), H / 2, D / 2 + 0.01); telo.add(roh);
  }
  const lem = new THREE.Mesh(g(new THREE.BoxGeometry(W + 0.08, 0.07, D + 0.08)), kovMat); lem.position.y = 0.035; telo.add(lem);
  // zámek
  const zamek = new THREE.Group(); zamek.position.set(0, H - 0.08, D / 2 + 0.05); telo.add(zamek);
  zamek.add(new THREE.Mesh(g(new THREE.BoxGeometry(0.26, 0.3, 0.06)), kovMat));
  const dirka = new THREE.Mesh(g(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 12)), mt(new THREE.MeshBasicMaterial({ color: "#10131F" }))); dirka.rotation.x = Math.PI / 2; dirka.position.set(0, 0.03, 0.035); zamek.add(dirka);
  const dirka2 = new THREE.Mesh(g(new THREE.BoxGeometry(0.025, 0.07, 0.02)), mt(new THREE.MeshBasicMaterial({ color: "#10131F" }))); dirka2.position.set(0, -0.025, 0.035); zamek.add(dirka2);
  // škvíra pod víkem, ze které prosvítá barva vzácnosti
  const skviraMat = mt(new THREE.MeshBasicMaterial({ color: barvaVz, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  const skvira = new THREE.Mesh(g(new THREE.BoxGeometry(W + 0.02, 0.025, D + 0.02)), skviraMat); skvira.position.y = H + 0.012; telo.add(skvira);

  // víko (půlválec) s čepem na zadní hraně
  const vikoCep = new THREE.Group(); vikoCep.position.set(0, H + 0.02, -D / 2); telo.add(vikoCep);
  const viko = new THREE.Group(); viko.position.z = D / 2; vikoCep.add(viko);
  const vikoGeo = g(new THREE.CylinderGeometry(D / 2, D / 2, W, 40, 1, false, 0, Math.PI)); vikoGeo.rotateZ(Math.PI / 2);
  viko.add(new THREE.Mesh(vikoGeo, teloMat));
  // vnitřek víka (po otevření je vidět zespodu, nasvícený barvou vzácnosti)
  const vnitrekVikaMat = mt(new THREE.MeshStandardMaterial({ color: "#2A1A10", roughness: 0.8, side: THREE.BackSide, emissive: barvaVz, emissiveIntensity: 0 }));
  viko.add(new THREE.Mesh(vikoGeo, vnitrekVikaMat));
  for (const sx of [-1, 1]) {
    const pasGeo = g(new THREE.CylinderGeometry(D / 2 + 0.03, D / 2 + 0.03, 0.12, 40, 1, true, 0, Math.PI)); pasGeo.rotateZ(Math.PI / 2);
    const p = new THREE.Mesh(pasGeo, kovMat); p.position.x = sx * W * 0.32; viko.add(p);
  }
  if (vz.zlato || m.druh === "mistrovska" || m.druh === "legendarni") {
    const kamen = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.09)), mt(new THREE.MeshPhysicalMaterial({ color: m.druh === "legendarni" ? "#B07CFF" : "#E5484D", roughness: 0.05, clearcoat: 1, emissive: m.druh === "legendarni" ? "#B07CFF" : "#E5484D", emissiveIntensity: 0.5 })));
    kamen.position.set(0, D / 2 * 0.72, D / 2 * 0.72); kamen.rotation.x = Math.PI / 4; viko.add(kamen);
  }
  if (m.druh === "sezonni") {
    const snih = new THREE.Mesh(g(new THREE.SphereGeometry(0.52, 24, 10, 0, Math.PI * 2, 0, Math.PI / 3.2)), mt(new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", roughness: 1, sheen: 1, sheenColor: new THREE.Color("#FFFFFF") })));
    snih.scale.set(1.45, 0.5, 1); snih.position.y = 0.32; viko.add(snih);
  }

  // paprsky světla z otevřené truhly
  const paprskyTex = texturaPaprsku(); texs.push(paprskyTex);
  const paprsky = new THREE.Group(); paprsky.position.set(0, H, 0); paprsky.visible = false; telo.add(paprsky);
  const paprskyMat = mt(new THREE.MeshBasicMaterial({ map: paprskyTex, color: barvaVz, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(g(new THREE.PlaneGeometry(0.32, 3.2)), paprskyMat);
    const u = (i / 7) * Math.PI; p.position.y = 1.6; p.rotation.y = u; p.rotation.z = (i % 2 ? 1 : -1) * 0.18; paprsky.add(p);
  }
  // stín pod truhlou
  const stinC = document.createElement("canvas"); stinC.width = stinC.height = 64;
  const sx2 = stinC.getContext("2d")!, sg = sx2.createRadialGradient(32, 32, 0, 32, 32, 32); sg.addColorStop(0, "rgba(5,10,30,.5)"); sg.addColorStop(1, "rgba(5,10,30,0)"); sx2.fillStyle = sg; sx2.fillRect(0, 0, 64, 64);
  const stinT = new THREE.CanvasTexture(stinC); texs.push(stinT);
  const stin = new THREE.Mesh(g(new THREE.PlaneGeometry(2.6, 1.8)), mt(new THREE.MeshBasicMaterial({ map: stinT, transparent: true, depthWrite: false })));
  stin.rotation.x = -Math.PI / 2; stin.position.y = 0.005; truhla.add(stin);

  // částice: výbuch jiskřiček a třpyt kolem
  const castice: Castice[] = [];
  const barvyVybuchu = m.vz === "legenda" ? ["#FFC93C", "#FFFFFF", "#FFE08A", "#B07CFF"] : [BARVA_VZACNOSTI[m.vz], "#FFFFFF"];
  const vybuch = vytvorCastice("vybuch", meritko, barvyVybuchu, m.vz === "legenda" ? 140 : m.vz === "vzacna" ? 110 : 80);
  vybuch.obj.position.set(0, H + 0.1, 0); telo.add(vybuch.obj); castice.push(vybuch);
  const trpyt = vytvorCastice("jiskry", meritko, [BARVA_VZACNOSTI[m.vz], "#FFFFFF"], 10);
  trpyt.obj.position.set(0, H * 0.6, 0); trpyt.obj.scale.setScalar(0.9); telo.add(trpyt.obj); castice.push(trpyt);

  // ── Hexík vedle truhly ────────────────────────────────────────────────────
  const hx: HexikModel = postavHexika(m.podoba, m.etapa, meritko, m.sloty ?? {});
  const hxObal = new THREE.Group(); hxObal.position.set(-1.45, -0.9 + 1.4 * 0.62, 0.2); hxObal.scale.setScalar(0.62); hxObal.rotation.y = 0.5;
  hxObal.add(hx.root); hxObal.add(hx.stin); scene.add(hxObal); scene.add(hx.okoli);
  hx.okoli.visible = false; // sníh kolem čepice by tu rušil

  // ── Stav a animace ────────────────────────────────────────────────────────
  // Automatické otevření a ohlášení běží ve skutečném čase (na pomalém zařízení se snímky zpožďují)
  let posledniAkceMs = performance.now(), ohlaseno = false;
  const ohlas = () => { if (!ohlaseno) { ohlaseno = true; m.onOtevreno(); } };
  let cas = 0, klepnuti = 0, otevreno = -1, oznameno = false, otrasy = 0, otrasSila = 0, kameraTres = 0;
  let akce: { id: Reakce3D; start: number; vyhozeno: boolean } | null = null;
  const minula = { y: 0, vy: 0, rY: 0, rX: 0 };
  const samaPo = m.samaPo ?? 2.6;
  const klidne = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const hexikReaguj = (id: Reakce3D) => { akce = { id, start: cas, vyhozeno: false }; };

  function otevri() {
    if (otevreno >= 0) return;
    otevreno = cas + (klidne ? 0 : 0.45);
    window.setTimeout(ohlas, klidne ? 0 : 1400);
    hexikReaguj("poskok");
  }
  function klepni() {
    if (otevreno >= 0) return;
    klepnuti++; posledniAkceMs = performance.now();
    m.onKlepnuti?.(klepnuti);
    otrasy = cas; otrasSila = klepnuti === 1 ? 0.05 : 0.09;
    if (klepnuti === 1) hexikReaguj("jasot");
    if (klepnuti === 2) hexikReaguj("radost");
    if (klepnuti >= 3) otevri();
  }

  function velikost() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    const z = w / h < 1 ? 7.4 / (w / h) : 7.4;
    camera.position.set(0, 1.5, z); camera.lookAt(0, 0.05, 0); camera.updateProjectionMatrix();
    meritko.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }

  let raf = 0, minule = performance.now();
  function snimek() {
    const ted = performance.now(), dt = Math.min(0.05, (ted - minule) / 1000); minule = ted; cas += dt;
    if (otevreno < 0 && performance.now() - posledniAkceMs > samaPo * 1000) otevri();

    // truhla: čekání (poskoky), otřesy po klepnutí
    const cekani = otevreno < 0 ? Math.max(0, Math.sin(cas * 4)) * (Math.sin(cas * 1.3) > 0.6 ? 0.06 : 0) : 0;
    const tres = Math.max(0, 1 - (cas - otrasy) / 0.45) * otrasSila;
    truhla.position.y = -0.9 + cekani + tres * 0.6 * Math.abs(Math.sin(cas * 40));
    truhla.rotation.z = tres * Math.sin(cas * 50);
    skviraMat.opacity = otevreno >= 0 ? 0 : Math.min(1, klepnuti * 0.45) * (0.7 + 0.3 * Math.sin(cas * 8));
    (zamek.children[0] as THREE.Mesh).rotation.z = 0;

    // víko
    if (otevreno >= 0 && cas >= otevreno) {
      const t = Math.min(1, (cas - otevreno) / 0.9);
      vikoCep.rotation.x = -1.7 * pruzneOtevreni(t);
      zamek.rotation.x = Math.min(1, t * 3) * 0.9; zamek.position.y = H - 0.08 - Math.min(1, t * 3) * 0.05;
      paprsky.visible = true; paprskyMat.opacity = Math.min(0.85, t * 1.5) * (0.8 + 0.2 * Math.sin(cas * 5));
      paprsky.rotation.y = cas * 0.5;
      zareMat.opacity = Math.min(1, t * 2);
      vnitrekVikaMat.emissiveIntensity = Math.min(1, t * 2) * 0.35;
      svetlo.intensity = Math.min(1, t * 2) * (m.vz === "legenda" ? 14 : 9);
      if (!oznameno) {
        oznameno = true;
        vybuch.vystrel?.(m.vz === "legenda" ? 1.3 : 1);
        kameraTres = m.vz === "legenda" ? 0.5 : m.vz === "vzacna" ? 0.25 : 0;
        hexikReaguj(m.vz === "legenda" ? "salto" : "radost");
        window.setTimeout(ohlas, klidne ? 0 : 450);
        if (m.vz === "legenda") window.setTimeout(() => vybuch.vystrel?.(1.1), 600);
      }
    }

    // Hexík: při otevírání poskočí k truhle
    const cilX = otevreno < 0 ? -1.45 : -1.02;
    hxObal.position.x += (cilX - hxObal.position.x) * Math.min(1, dt * 7);
    let P = klid(cas, true);
    if (akce) {
      const p = Math.min(1, (cas - akce.start) / DELKA[akce.id]);
      P = reakce(akce.id, p, cas, P, true);
      if (p >= 1) akce = null;
    }
    hx.root.position.y = P.y; hx.root.rotation.set(P.rX, P.rY, 0); hx.root.scale.setScalar(P.s);
    const sk = 1 / Math.sqrt(P.sy); hx.hips.scale.set(sk, P.sy, sk); hx.body.rotation.z = P.rZ;
    hx.armL.rotation.z = -P.aL; hx.armR.rotation.z = P.aR;
    for (const e of hx.eyes) { e.position.x = (e.userData.bx as number) + 0.03; }
    if (dt > 0) {
      const vy = (P.y - minula.y) / dt;
      hx.aktualizuj({ ay: Math.max(-40, Math.min(40, (vy - minula.vy) / dt)), wy: (P.rY - minula.rY) / dt, wx: (P.rX - minula.rX) / dt, wz: 0, cas, dt });
      minula.y = P.y; minula.vy = vy; minula.rY = P.rY; minula.rX = P.rX;
    }
    for (const c of castice) c.aktualizuj(dt, cas);

    // kamera: lehký přiblížení po otevření, u vzácných otřes
    const kt = Math.max(0, kameraTres); kameraTres = Math.max(0, kameraTres - dt);
    camera.position.x = Math.sin(cas * 60) * kt * 0.08;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(snimek);
  }

  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(velikost) : null; ro?.observe(canvas);
  canvas.addEventListener("pointerdown", klepni);
  velikost();
  raf = requestAnimationFrame(snimek);
  if (klidne) otevri();

  return {
    klepni, otevri,
    znic() {
      cancelAnimationFrame(raf); ro?.disconnect(); canvas.removeEventListener("pointerdown", klepni);
      hx.dispose(); castice.forEach((c) => c.dispose());
      geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); texs.forEach((x) => x.dispose());
      envRT.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
