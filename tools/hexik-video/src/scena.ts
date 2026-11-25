/**
 * Scéna videa s Hexíkem (1080×1920), verze 2 (Karel 25. 11.: „lépe animované prostředí a celé video“).
 * Skutečný 3D pokoj ze stejných dílů jako pokojíčky v appce (diorama.ts: zaoblené díly, plastové materiály,
 * stíny, záře), velká tabule s křídou (2D plátno jako textura), okno se sněžením, světýlka, lampa, kytka,
 * prach ve světle, pohyblivá kamera (najetí, přiblížení k tabuli, k Hexíkovi při tanci), 3D Hexík z appky
 * (postavHexika, výrazy, tanečky), bubliny nad hlavou, titulky po slovech a logo MateMax.
 * render.mjs volá window.snimek(t) snímek po snímku, bez náhody a bez skutečného času.
 * První verze (kreslené pozadí) je v scena-v1.ts.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { postavHexika, type HexikModel } from "../../../src/lib/hexik3d/model";
import { klid, reakce, DELKA, jeReakce3D, type Poza } from "../../../src/lib/hexik3d/animace";
import { animujOblicej, type Vyraz3D } from "../../../src/lib/hexik3d/oblicej";
import { tex, plast, zaobleny, stin } from "../../../src/lib/hexik3d/diorama";

// ── Scénář (stejný tvar jako scenare/*.json) ──
interface RadekTabule { t: number; radek: number; text?: string; styl?: "zvyrazni" | "zlaty"; preskrtni?: boolean }
interface Blok {
  od: number; do: number; rika?: string; titulky?: string[]; vyraz?: Vyraz3D;
  tabule?: RadekTabule[]; gesta?: { t: number; gesto: "kyv" | "vrteni" | "premysli" | "krida" }[];
  reakce?: { t: number; id: string }[]; pohledNaTabuli?: boolean; zaver?: boolean; zaverT?: number; bezReci?: boolean; reciOd?: number; reciDo?: number;
  odpocet?: { od: number; do: number; z: number };
  bubliny?: { t: number; co: string }[];
}
export interface Scenar { id: string; nazev: string; podoba?: string; delka: number; bloky: Blok[] }

const W = 1080, H = 1920;
const NAVY = "#0D1B3E";
const Y0 = -1.4;

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#1B1640}
body{font-family:'DM Sans',Arial,sans-serif;position:relative}
#scena{position:absolute;inset:0;width:${W}px;height:${H}px}
#titulky{position:absolute;left:60px;right:60px;top:990px;display:flex;justify-content:center;pointer-events:none}
#titulek{display:inline-block;max-width:960px;text-align:center;background:${NAVY};color:#fff;font-weight:800;font-size:56px;line-height:1.2;padding:18px 34px 22px;border-radius:26px;box-shadow:0 12px 30px rgba(8,10,40,.45)}
#titulek b{font-weight:800;color:#fff}
#titulek b.ted{color:#FFE066}
#logo{position:absolute;right:40px;bottom:150px;display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.92);padding:12px 22px 12px 12px;border-radius:22px;box-shadow:0 8px 20px rgba(8,10,40,.3)}
#logo .ctv{width:62px;height:62px;border-radius:16px;background:${NAVY};color:#fff;font-weight:800;font-size:29px;display:flex;align-items:center;justify-content:center}
#logo .txt{font-weight:800;font-size:37px;color:${NAVY}}
#bublina{position:absolute;left:0;top:0;width:150px;height:150px;margin:-75px 0 0 -75px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:84px;font-weight:800;color:${NAVY};box-shadow:0 12px 26px rgba(8,10,40,.35);visibility:hidden}
#bublina:after{content:"";position:absolute;left:30px;bottom:-14px;width:34px;height:34px;background:#fff;border-radius:50%;box-shadow:0 6px 12px rgba(8,10,40,.2)}
#zaclona{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none}
`;
const HTML = `
<canvas id="scena" width="${W}" height="${H}"></canvas>
<div id="bublina"><span id="bublinaText">?</span></div>
<div id="titulky"><span id="titulek" style="visibility:hidden"></span></div>
<div id="logo"><div class="ctv">M²</div><div class="txt">MateMax</div></div>
<div id="zaclona"></div>
`;

const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3);
function seeded(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

let scenar: Scenar;
let obalka: number[] | null = null;
let fps = 30;

// ───────────────────────── Tabule (2D plátno → textura) ─────────────────────────
const KR_W = 928, KR_H = 596, KR_S = 1.6;
let krCanvas: HTMLCanvasElement, kr: CanvasRenderingContext2D, podkladTabule: HTMLCanvasElement, tabuleTex: THREE.CanvasTexture;

function pripravPodkladTabule() {
  podkladTabule = document.createElement("canvas"); podkladTabule.width = KR_W * KR_S; podkladTabule.height = KR_H * KR_S;
  const x = podkladTabule.getContext("2d")!; x.scale(KR_S, KR_S);
  const g = x.createLinearGradient(0, 0, KR_W, KR_H); g.addColorStop(0, "#2A6150"); g.addColorStop(1, "#1B473A");
  x.fillStyle = g; x.fillRect(0, 0, KR_W, KR_H);
  const r = seeded(7);
  for (let i = 0; i < 70; i++) {
    x.strokeStyle = `rgba(255,255,255,${0.012 + r() * 0.03})`; x.lineWidth = 20 + r() * 60; x.lineCap = "round";
    const px = r() * KR_W, py = r() * KR_H; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 80 * (r() - 0.5), py + 40 * (r() - 0.5), px + 220 * (r() - 0.3), py + 30 * (r() - 0.5)); x.stroke();
  }
  for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.05})`; x.fillRect(r() * KR_W, r() * KR_H, 1.5, 1.5); }
}

interface RadekAbs extends RadekTabule { ta: number }
let radky: RadekAbs[] = [];
let pocetRadku = 5;
const radekY = (i: number) => (pocetRadku <= 5 ? [92, 200, 300, 400, 505][i] : 72 + (i * (KR_H - 140)) / (pocetRadku - 1));
const velikostPisma = (i: number) => (pocetRadku <= 5 ? (i === 0 ? 84 : 76) : Math.min(74, ((KR_H - 140) / (pocetRadku - 1)) * 0.78));
const delkaPsani = (znaku: number) => 0.25 + 0.05 * znaku;

function stavTabule(t: number) {
  const out: { radek: number; text: string; predchozi: string; t0: number; styl?: string; preskrtnout?: number }[] = [];
  const skrty = new Map<number, number>();
  for (const r of radky) if (r.preskrtni && r.ta <= t) skrty.set(r.radek, r.ta);
  const podleRadku = new Map<number, RadekAbs[]>();
  for (const r of radky) { if (r.text === undefined) continue; if (!podleRadku.has(r.radek)) podleRadku.set(r.radek, []); podleRadku.get(r.radek)!.push(r); }
  for (const [radek, seznam] of podleRadku) {
    const hotove = seznam.filter((r) => r.ta <= t).sort((a, b) => a.ta - b.ta);
    if (!hotove.length) continue;
    const posl = hotove[hotove.length - 1], pred = hotove.length > 1 ? hotove[hotove.length - 2].text! : "";
    out.push({ radek, text: posl.text!, predchozi: posl.text!.startsWith(pred) ? pred : "", t0: posl.ta, styl: posl.styl, preskrtnout: skrty.get(radek) });
  }
  return out;
}
let kridaBod: { x: number; y: number } | null = null;
function piseSe(t: number) { return stavTabule(t).some((s) => t - s.t0 < delkaPsani(s.text.length - s.predchozi.length) + 0.15); }
function psaniKonci(t: number): number { let k = -1; for (const s of stavTabule(t)) k = Math.max(k, s.t0 + delkaPsani(s.text.length - s.predchozi.length)); return k; }

function kresliTabuli(t: number, zaverOd: number | null) {
  kr.setTransform(1, 0, 0, 1, 0, 0); kr.drawImage(podkladTabule, 0, 0); kr.setTransform(KR_S, 0, 0, KR_S, 0, 0);
  const pryc = zaverOd !== null ? cl((t - zaverOd) / 0.45) : 0;
  const zaver = zaverOd !== null ? ease(cl((t - zaverOd - 0.4) / 0.5)) : 0;
  kridaBod = null;
  if (pryc < 1) {
    kr.save();
    if (pryc > 0) { kr.beginPath(); kr.rect(0, 0, KR_W * (1 - pryc), KR_H); kr.clip(); }
    for (const s of stavTabule(t)) {
      const y = radekY(s.radek);
      kr.font = `700 ${velikostPisma(s.radek)}px Caveat, 'DM Sans', sans-serif`;
      kr.textBaseline = "middle"; kr.textAlign = "left";
      const sirka = kr.measureText(s.text).width, x0 = (KR_W - sirka) / 2;
      const zSirka = kr.measureText(s.predchozi).width, novych = s.text.length - s.predchozi.length;
      const p = cl((t - s.t0) / delkaPsani(novych));
      const vidno = zSirka + (sirka - zSirka) * p;
      if (p < 1 && novych > 0) kridaBod = { x: (x0 + vidno) / KR_W, y: (y + 18) / KR_H };
      if (s.styl === "zvyrazni" && p >= 1) {
        const q = easeOut(cl((t - s.t0 - delkaPsani(novych)) / 0.45));
        kr.fillStyle = `rgba(255,224,102,${0.3 * q})`; kr.beginPath(); kr.roundRect(x0 - 22, y - 52, (sirka + 44) * q, 104, 20); kr.fill();
      }
      if (s.styl === "zlaty" && p >= 1) {
        const q = easeOut(cl((t - s.t0 - delkaPsani(novych)) / 0.45));
        kr.save(); kr.shadowColor = "rgba(255,200,60,.8)"; kr.shadowBlur = 18 * q;
        kr.strokeStyle = `rgba(255,205,70,${q})`; kr.lineWidth = 8; kr.beginPath(); kr.roundRect(x0 - 28, y - 58, sirka + 56, 116, 22); kr.stroke(); kr.restore();
      }
      kr.save(); kr.beginPath(); kr.rect(x0 - 10, y - 80, p >= 1 ? sirka + 60 : vidno + 10, 160); kr.clip();
      kr.shadowColor = "rgba(255,255,255,.4)"; kr.shadowBlur = 5;
      kr.fillStyle = s.styl === "zvyrazni" ? "#FFF1A8" : s.styl === "zlaty" ? "#FFD66B" : "rgba(255,255,255,.96)";
      kr.fillText(s.text, x0, y); kr.restore();
      if (s.preskrtnout !== undefined && t >= s.preskrtnout) {
        const q = ease(cl((t - s.preskrtnout) / 0.4));
        kr.strokeStyle = "#FF7A8A"; kr.lineWidth = 9; kr.lineCap = "round";
        kr.beginPath(); kr.moveTo(x0 - 12, y + 6); kr.lineTo(x0 - 12 + (sirka + 24) * q, y - 4); kr.stroke();
        if (q < 1) kridaBod = { x: (x0 - 12 + (sirka + 24) * q) / KR_W, y: (y + 2) / KR_H };
      }
    }
    kr.restore();
  }
  for (const b of scenar.bloky) {
    if (!b.odpocet) continue;
    const z = b.od + b.odpocet.od, k = b.od + b.odpocet.do, krok = (k - z) / b.odpocet.z;
    if (t < z - 0.2 || t > k + 0.6) continue;
    const zb = Math.max(0, k - t), cislo = Math.ceil(zb / krok - 1e-6);
    const q = ease(cl((t - z + 0.2) / 0.3)) * (1 - cl((t - k) / 0.6));
    const cx = KR_W - 120, cy = KR_H - 120, rr = 86;
    kr.save(); kr.globalAlpha = q;
    kr.fillStyle = "rgba(13,27,62,.6)"; kr.beginPath(); kr.arc(cx, cy, rr, 0, Math.PI * 2); kr.fill();
    kr.strokeStyle = cislo <= 3 ? "#FF7A8A" : "#FFE066"; kr.lineWidth = 12; kr.lineCap = "round";
    kr.beginPath(); kr.arc(cx, cy, rr - 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (zb / (k - z))); kr.stroke();
    const vTiku = ((k - t) % krok + krok) % krok, puls = 1 + 0.14 * Math.max(0, 1 - (krok - vTiku) / 0.25);
    kr.fillStyle = "#FFFFFF"; kr.font = `800 ${Math.round(84 * puls)}px 'DM Sans', sans-serif`; kr.textAlign = "center"; kr.textBaseline = "middle";
    kr.fillText(String(Math.max(0, cislo)), cx, cy + 4); kr.restore();
  }
  if (zaver > 0) {
    kr.save(); kr.globalAlpha = zaver; kr.textBaseline = "middle";
    const sq = 150, cx = KR_W / 2, cy = 230, sk = 0.85 + 0.15 * easeOut(zaver);
    kr.translate(cx, cy); kr.scale(sk, sk); kr.translate(-cx, -cy);
    kr.fillStyle = "#FFFFFF"; kr.beginPath(); kr.roundRect(cx - 290, cy - sq / 2, sq, sq, 34); kr.fill();
    kr.fillStyle = NAVY; kr.textAlign = "center"; kr.font = "800 72px 'DM Sans', sans-serif"; kr.fillText("M²", cx - 290 + sq / 2, cy + 4);
    kr.fillStyle = "#FFFFFF"; kr.font = "800 96px 'DM Sans', sans-serif"; kr.textAlign = "left"; kr.fillText("MateMax", cx - 110, cy + 6);
    kr.textAlign = "center"; kr.font = "700 50px 'DM Sans', sans-serif"; kr.fillStyle = "#FFE066";
    kr.fillText("matemax.matematika-snadno.cz", cx, 420);
    kr.restore();
  }
  if (kridaBod) {
    const r = seeded(Math.floor(t * 60));
    for (let i = 0; i < 10; i++) {
      kr.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.4})`;
      kr.beginPath(); kr.arc(kridaBod.x * KR_W + (r() - 0.3) * 30, kridaBod.y * KR_H + r() * 34, 1.5 + r() * 2.5, 0, Math.PI * 2); kr.fill();
    }
  }
  tabuleTex.needsUpdate = true;
}

// ───────────────────────── Titulky po slovech ─────────────────────────
interface Titulek { od: number; do: number; text: string; slova: { s: string; od: number }[] }
let titulky: Titulek[] = [];
function pripravTitulky() {
  titulky = [];
  for (const b of scenar.bloky) {
    const ch = b.titulky ?? [];
    if (!ch.length) continue;
    const z = b.od + (b.reciOd ?? 0.1), k = b.od + (b.reciDo ?? b.do - b.od - 0.2);
    const vahy = ch.map((c) => c.length + 8), sum = vahy.reduce((a, x) => a + x, 0);
    let t = z;
    ch.forEach((c, i) => {
      const d = ((k - z) * vahy[i]) / sum;
      // nezlomitelná mezera mezi číslem a jednotkou (20 %, 1000 Kč, 54 cm²) a po jednopísmenných předložkách
      const slova = c.replace(/(\d) (%|Kč|cm²|cm|s)(?=$|[\s.,?!])/g, "$1 $2").replace(/(^| )([kvszouaiKVSZOUAI]) /g, "$1$2 ").split(" "); const delky = slova.map((s) => s.length + 2), sd = delky.reduce((a, x) => a + x, 0);
      let ts = t; const sl = slova.map((s, j) => { const o = { s, od: ts }; ts += (d * 0.92 * delky[j]) / sd; return o; });
      titulky.push({ od: t, do: t + d, text: c, slova: sl }); t += d;
    });
  }
}
let posledniTitulek = "";
function nastavTitulek(t: number) {
  const el = document.getElementById("titulek")!;
  const tit = titulky.find((x) => t >= x.od && t < x.do);
  const n = tit ? tit.slova.filter((s) => s.od <= t).length : 0;
  const klic = tit ? `${tit.text}|${n}` : "";
  if (klic !== posledniTitulek) {
    posledniTitulek = klic;
    if (!tit) { el.style.visibility = "hidden"; el.innerHTML = ""; }
    else {
      el.innerHTML = tit.slova.map((s, i) => `<b class="${i === n - 1 ? "ted" : ""}">${s.s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</b>`).join(" ");
      el.style.visibility = "visible";
    }
  }
  if (tit) { const q = easeOut(cl((t - tit.od) / 0.2)); el.style.transform = `translateY(${(1 - q) * 22}px) scale(${0.9 + 0.1 * q})`; el.style.opacity = String(0.3 + 0.7 * q); }
}

function hlasitost(t: number): number {
  if (obalka) { const i = Math.round(t * fps); return obalka[Math.min(obalka.length - 1, Math.max(0, i))] ?? 0; }
  const tit = titulky.find((x) => t >= x.od + 0.05 && t < x.do - 0.12);
  if (!tit) return 0;
  const u = t - tit.od;
  return cl(Math.max(0, Math.sin(u * Math.PI * 2 * 4.6)) ** 0.7 * (0.75 + 0.25 * Math.sin(u * 1.7 + tit.od)));
}

// ───────────────────────── 3D pokoj ─────────────────────────
let renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, composer: EffectComposer;
let model: HexikModel;
const animace: ((t: number, dt: number) => void)[] = [];
const konfety: THREE.Mesh[] = [];
let nahoda = seeded(42);
const HEX_POS = new THREE.Vector3(0.12, 0, 1.3);
const HEX_S = 0.86;
const TABULE_POS = new THREE.Vector3(-0.05, Y0 + 3.85, -3.22);
let tabuleSvetlo: THREE.PointLight;

function postavPokoj() {
  const r = seeded(11);
  scene.background = tex(512, 1024, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 1024); g.addColorStop(0, "#2B2463"); g.addColorStop(0.55, "#4B3F9A"); g.addColorStop(1, "#8F7FD8");
    x.fillStyle = g; x.fillRect(0, 0, 512, 1024);
    for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.6})`; x.beginPath(); x.arc(r() * 512, r() * 700, r() * 1.6 + 0.3, 0, Math.PI * 2); x.fill(); }
  });
  const svet = new THREE.Group(); scene.add(svet);
  const prkna = tex(512, 512, (x) => {
    x.fillStyle = "#DDB27F"; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8; i++) { const c = ["#E2B886", "#D8AB76", "#DFB47F", "#D3A570"][i % 4]; x.fillStyle = c; x.fillRect(0, i * 64 + 1, 512, 62); }
    x.strokeStyle = "rgba(120,75,35,.35)"; x.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(0, i * 64); x.lineTo(512, i * 64); x.stroke(); const o = (i * 157) % 512; x.beginPath(); x.moveTo(o, i * 64); x.lineTo(o, i * 64 + 64); x.stroke(); }
  }, [2, 2]);
  const podlaha = new THREE.Mesh(zaobleny(7.4, 0.6, 7, 0.28, 6), [plast("#C99668"), plast("#C99668"), new THREE.MeshPhysicalMaterial({ map: prkna, roughness: 0.6, clearcoat: 0.3 }), plast("#C99668"), plast("#C99668"), plast("#C99668")]);
  podlaha.position.set(0, Y0 - 0.3, -0.2); stin(podlaha, false, true); svet.add(podlaha);
  const spodek = new THREE.Mesh(zaobleny(7.1, 1.2, 6.7, 0.45, 6), plast("#7A6AC8", { roughness: 0.8 })); spodek.position.set(0, Y0 - 1.1, -0.2); svet.add(spodek);
  const tapeta = tex(512, 512, (x) => {
    x.fillStyle = "#ECE9FF"; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = "rgba(175,172,251,.55)"; x.beginPath(); x.arc(32 + i * 64 + (j % 2) * 32, 32 + j * 64, 5, 0, Math.PI * 2); x.fill(); }
  }, [3, 2.4]);
  const stenaMat = new THREE.MeshPhysicalMaterial({ map: tapeta, roughness: 0.85, sheen: 0.4, sheenColor: new THREE.Color("#FFE7D6") });
  const okraj = plast("#FFFFFF", { roughness: 0.4 });
  const zadni = new THREE.Mesh(zaobleny(7.4, 7.0, 0.4, 0.18, 5), [okraj, okraj, okraj, okraj, stenaMat, okraj]);
  zadni.position.set(0, Y0 + 3.5, -3.5); stin(zadni, false, true); svet.add(zadni);
  const leva = new THREE.Mesh(zaobleny(0.4, 7.0, 7, 0.18, 5), [stenaMat, okraj, okraj, okraj, okraj, okraj]);
  leva.position.set(-3.5, Y0 + 3.5, -0.2); stin(leva, false, true); svet.add(leva);
  for (const [w, d, x, z] of [[7.4, 0.16, 0, -3.25], [0.16, 6.7, -3.25, -0.2]] as const) { const l = new THREE.Mesh(zaobleny(w, 0.3, d, 0.06), plast("#FFFFFF", { roughness: 0.35 })); l.position.set(x, Y0 + 0.15, z); stin(l); svet.add(l); }

  // velká tabule
  const tab = new THREE.Group(); tab.position.copy(TABULE_POS); svet.add(tab);
  const ram = new THREE.Mesh(zaobleny(4.3, 2.95, 0.14, 0.1), plast("#B8834E", { clearcoat: 0.7, roughness: 0.38 })); tab.add(ram);
  tabuleTex = new THREE.CanvasTexture(krCanvas); tabuleTex.colorSpace = THREE.SRGBColorSpace; tabuleTex.anisotropy = 8;
  const deska = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0 * (KR_H / KR_W)), new THREE.MeshStandardMaterial({ map: tabuleTex, roughness: 0.9, emissive: "#FFFFFF", emissiveMap: tabuleTex, emissiveIntensity: 0.07 }));
  deska.position.z = 0.075; tab.add(deska);
  const zlab = new THREE.Mesh(zaobleny(3.2, 0.1, 0.26, 0.04), plast("#9C6A3B")); zlab.position.set(0, -1.52, 0.16); tab.add(zlab);
  for (const [x, c] of [[-0.9, "#FFFFFF"], [-0.6, "#FFE066"], [-0.35, "#9FD9FF"]] as const) { const k = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.18, 4, 8), plast(c)); k.rotation.z = Math.PI / 2; k.position.set(x, -1.43, 0.2); tab.add(k); }
  stin(tab);
  tabuleSvetlo = new THREE.PointLight("#FFF1C8", 0, 6, 1.6); tabuleSvetlo.position.set(0, 0.3, 1.5); tab.add(tabuleSvetlo);

  // světýlka nad tabulí (girlanda) – blikají
  const kabel: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) { const u = i / 40; kabel.push(new THREE.Vector3(-3.3 + u * 6.6, Y0 + 6.2 - Math.sin(u * Math.PI * 3) ** 2 * 0.3, -3.22)); }
  svet.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(kabel), 80, 0.012, 6, false), new THREE.MeshStandardMaterial({ color: "#2E2A4A" })));
  const barvy = ["#FF5E7A", "#FFD45A", "#5EE3A6", "#5EB8FF", "#FF8AE0"];
  for (let i = 0; i < 16; i++) {
    const u = (i + 0.5) / 16, p = new THREE.Vector3(-3.3 + u * 6.6, Y0 + 6.2 - Math.sin(u * Math.PI * 3) ** 2 * 0.3 - 0.08, -3.18);
    const mat = new THREE.MeshStandardMaterial({ color: barvy[i % 5], emissive: barvy[i % 5], emissiveIntensity: 2, toneMapped: false });
    const z = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), mat); z.scale.y = 1.3; z.position.copy(p); svet.add(z);
    const faze = i * 1.37;
    animace.push((t) => { mat.emissiveIntensity = 1.2 + 1.6 * (0.5 + 0.5 * Math.sin(t * 2.2 + faze)); });
  }

  // okno na levé stěně se sněžením
  const okno = new THREE.Group(); okno.position.set(-2.88, Y0 + 3.95, -3.28); okno.scale.setScalar(0.7); svet.add(okno);
  const vyhled = tex(256, 320, (x) => {
    const g = x.createLinearGradient(0, 0, 0, 320); g.addColorStop(0, "#1F2A6B"); g.addColorStop(1, "#5A6FC9"); x.fillStyle = g; x.fillRect(0, 0, 256, 320);
    x.fillStyle = "#FFF6D8"; x.beginPath(); x.arc(185, 70, 26, 0, Math.PI * 2); x.fill();
    x.fillStyle = "#E9F1FF"; x.beginPath(); x.moveTo(0, 270); x.quadraticCurveTo(70, 225, 140, 260); x.quadraticCurveTo(200, 235, 256, 255); x.lineTo(256, 320); x.lineTo(0, 320); x.fill();
    x.fillStyle = "#2D5A55"; for (const [px, s] of [[45, 1], [95, 0.7], [210, 0.9]] as const) { x.beginPath(); x.moveTo(px, 270 - 80 * s); x.lineTo(px - 26 * s, 270); x.lineTo(px + 26 * s, 270); x.fill(); }
  });
  const sklo = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.9), new THREE.MeshBasicMaterial({ map: vyhled, toneMapped: false })); sklo.position.z = 0.01; okno.add(sklo);
  for (const [w, h, x, y] of [[1.7, 0.1, 0, 1], [1.7, 0.1, 0, -1], [0.1, 2.1, -0.8, 0], [0.1, 2.1, 0.8, 0], [0.06, 1.9, 0, 0], [1.5, 0.06, 0, 0.1]] as const) {
    const m = new THREE.Mesh(zaobleny(w, h, 0.1, 0.03), plast("#FFFFFF")); m.position.set(x, y, 0.05); okno.add(m);
  }
  const parapet = new THREE.Mesh(zaobleny(1.9, 0.08, 0.3, 0.03), plast("#FFFFFF")); parapet.position.set(0, -1.08, 0.12); okno.add(parapet); stin(okno);
  const vlocky: THREE.Mesh[] = [];
  const vlMat = new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.9, toneMapped: false });
  for (let i = 0; i < 46; i++) { const v = new THREE.Mesh(new THREE.CircleGeometry(0.018 + r() * 0.02, 8), vlMat); v.userData = { x: (r() - 0.5) * 1.4, y: r() * 1.8 - 0.9, s: 0.18 + r() * 0.22, f: r() * 6 }; v.position.z = 0.02; okno.add(v); vlocky.push(v); }
  animace.push((t) => { for (const v of vlocky) { const u = v.userData; const y = ((u.y - t * u.s + 0.9) % 1.8 + 1.8) % 1.8 - 0.9; v.position.set(u.x + Math.sin(t * 1.3 + u.f) * 0.05, y, 0.02); } });

  // police s knihami
  const police = new THREE.Group(); police.position.set(-3.2, Y0 + 1.1, -1.9); svet.add(police);
  police.add(new THREE.Mesh(zaobleny(0.45, 0.08, 1.4, 0.03), plast("#C48B55")));
  ["#5B55D6", "#F27BA5", "#5FD0AA", "#F5A623", "#2E6DA4"].forEach((c, i) => { const k = new THREE.Mesh(zaobleny(0.3, 0.42 + (i % 2) * 0.08, 0.13, 0.02), plast(c)); k.position.set(0.02, 0.26 + (i % 2) * 0.04, -0.5 + i * 0.16); k.rotation.x = i === 4 ? -0.25 : 0; police.add(k); });
  stin(police);

  // kytka
  const kytka = new THREE.Group(); kytka.position.set(-2.55, Y0, 1.6); svet.add(kytka);
  const kvet = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.62, 24), plast("#F27BA5")); kvet.position.y = 0.31; kytka.add(kvet);
  const lem = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 10, 30), plast("#E25E8E")); lem.rotation.x = Math.PI / 2; lem.position.y = 0.62; kytka.add(lem);
  const listy: THREE.Group[] = [];
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(); g.position.y = 0.6; g.rotation.y = (i / 7) * Math.PI * 2; kytka.add(g);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), plast(i % 2 ? "#3FB58E" : "#5FD0AA")); l.scale.set(0.45, 2.4, 0.18); l.position.set(0, 0.36, 0.12); l.rotation.x = 0.45; g.add(l);
    listy.push(g);
  }
  stin(kytka);
  animace.push((t) => { listy.forEach((g, i) => { g.rotation.z = Math.sin(t * 1.6 + i) * 0.07; g.rotation.x = Math.cos(t * 1.3 + i * 0.7) * 0.05; }); });

  // stojací lampa
  const lampa = new THREE.Group(); lampa.position.set(2.65, Y0, -2.2); svet.add(lampa);
  const noha = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 10), plast("#9E7BB8")); noha.position.y = 1.2; lampa.add(noha);
  const podst = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.08, 24), plast("#9E7BB8")); podst.position.y = 0.04; lampa.add(podst);
  const stinidloMat = new THREE.MeshStandardMaterial({ color: "#FFC46B", emissive: "#FFB347", emissiveIntensity: 1.2, side: THREE.DoubleSide });
  const stinidlo = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, 0.55, 28, 1, true), stinidloMat); stinidlo.position.y = 2.5; lampa.add(stinidlo);
  const lampSvetlo = new THREE.PointLight("#FFC680", 3.2, 7, 1.7); lampSvetlo.position.set(0, 2.35, 0.2); lampa.add(lampSvetlo);
  stin(lampa, true, true);
  animace.push((t) => { const d = 0.92 + 0.08 * Math.sin(t * 1.1) + 0.03 * Math.sin(t * 7.3); lampSvetlo.intensity = 3.2 * d; stinidloMat.emissiveIntensity = 1.2 * d; });

  // koberec
  const koberec = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.55, 0.04, 48), new THREE.MeshStandardMaterial({ color: "#A7A2F0", roughness: 0.95 }));
  koberec.position.set(HEX_POS.x, Y0 + 0.02, HEX_POS.z); koberec.scale.z = 0.8; koberec.receiveShadow = true; svet.add(koberec);
  const lemK = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.035, 8, 60), new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.9 })); lemK.rotation.x = Math.PI / 2; lemK.position.set(HEX_POS.x, Y0 + 0.05, HEX_POS.z); lemK.scale.y = 0.8; svet.add(lemK);

  // prach ve světle lampy
  const prach: THREE.Mesh[] = [];
  const prMat = new THREE.MeshBasicMaterial({ color: "#FFE9C4", transparent: true, opacity: 0.55, toneMapped: false, depthWrite: false });
  for (let i = 0; i < 34; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.012 + r() * 0.014, 6, 4), prMat); p.userData = { x: 1.9 + r() * 1.4, y: Y0 + 0.6 + r() * 2.6, z: -2.4 + r() * 1.6, f: r() * 10, s: 0.05 + r() * 0.08 }; svet.add(p); prach.push(p); }
  animace.push((t) => { for (const p of prach) { const u = p.userData; p.position.set(u.x + Math.sin(t * 0.4 + u.f) * 0.25, u.y + Math.sin(t * u.s * 6 + u.f) * 0.2, u.z + Math.cos(t * 0.3 + u.f) * 0.15); } });
}

function pripravRenderer() {
  const canvas = document.getElementById("scena") as HTMLCanvasElement;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.88;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene = new THREE.Scene();
  scene.fog = new THREE.Fog("#3A3080", 26, 44);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3; pm.dispose();
  camera = new THREE.PerspectiveCamera(34, W / H, 0.1, 100);
  scene.add(new THREE.HemisphereLight("#B9AEFF", "#2A1F48", 0.5));
  const mesic = new THREE.DirectionalLight("#AFC4FF", 0.5); mesic.position.set(-6, 8, 4); scene.add(mesic);
  const klicS = new THREE.DirectionalLight("#FFE2BE", 1.0); klicS.position.set(5, 9, 8); klicS.castShadow = true;
  klicS.shadow.mapSize.set(2048, 2048); Object.assign(klicS.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 }); klicS.shadow.bias = -0.0004; klicS.shadow.radius = 5;
  scene.add(klicS);
  const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, type: THREE.HalfFloatType });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(W / 2, H / 2), 0.32, 0.55, 0.92));
  composer.addPass(new OutputPass());
}

// ───────────────────────── Hexík ─────────────────────────
let hexObal: THREE.Group;
function pripravHexika() {
  const meritko = { value: H / (2 * Math.tan((34 * Math.PI) / 360)) };
  model = postavHexika(scenar.podoba ?? "klasik", 1, meritko, {});
  hexObal = new THREE.Group(); hexObal.position.set(HEX_POS.x, Y0 + 1.4 * HEX_S, HEX_POS.z); hexObal.scale.setScalar(HEX_S);
  hexObal.add(model.root); hexObal.add(model.okoli); scene.add(hexObal);
  model.stin.visible = false;
  stin(model.root, true, false);
  const kGeo = new THREE.PlaneGeometry(0.07, 0.12);
  const KB = ["#F5A623", "#5B55D6", "#3DF5FF", "#F27BA5", "#5FD0AA", "#FFFFFF"];
  for (let i = 0; i < 70; i++) {
    const m = new THREE.Mesh(kGeo, new THREE.MeshBasicMaterial({ color: KB[i % KB.length], side: THREE.DoubleSide, transparent: true, toneMapped: false }));
    m.visible = false; m.userData = { v: new THREE.Vector3(), s: new THREE.Vector3(), life: 0 }; hexObal.add(m); konfety.push(m);
  }
}

function vypustKonfety(n: number) {
  let u = 0;
  for (const k of konfety) {
    if (u >= n) break; if (k.visible) continue;
    u++; k.visible = true; k.userData.life = 0;
    k.position.set((nahoda() - 0.5) * 0.6, model.root.position.y + 0.9, (nahoda() - 0.5) * 0.4);
    const a = nahoda() * Math.PI * 2, rr = 0.6 + nahoda();
    (k.userData.v as THREE.Vector3).set(Math.cos(a) * rr, 2.4 + nahoda() * 1.8, Math.sin(a) * rr * 0.6);
    (k.userData.s as THREE.Vector3).set(nahoda() * 8, nahoda() * 8, nahoda() * 8);
  }
}

let minuleT = -1;
const minulaPoza = { y: 0, vy: 0, rY: 0, rX: 0, rZ: 0 };
const look = { x: 0, y: 0 }, otoc = { v: 0 }, ukaz = { v: 0 };
const vyhozeneReakce = new Set<string>();
const MRKY = Array.from({ length: 40 }, (_, i) => 1.6 + i * 3.3 + ((i * 7) % 5) * 0.31);
const blokV = (t: number) => scenar.bloky.find((b) => t >= b.od && t < b.do) ?? scenar.bloky[scenar.bloky.length - 1];

function pozaHexika(t: number): { P: Poza; vyraz: Vyraz3D; tabule: number } {
  let P = klid(t, true);
  const b = blokV(t);
  let vyraz: Vyraz3D = b.vyraz ?? "neutral";
  const mluvi = hlasitost(t);
  P = { ...P, rZ: P.rZ + 0.04 * Math.sin(t * 2.4) * (mluvi > 0 ? 1 : 0.3), y: P.y + 0.025 * mluvi, aR: P.aR + (mluvi > 0 ? 0.25 + 0.2 * Math.sin(t * 3.1) : 0) };
  if (t < 0.9) { const u = t / 0.9; P = { ...P, y: P.y + (1 - easeOut(u)) * 2.2, sy: P.sy * (u > 0.75 ? 1 - Math.sin(((u - 0.75) / 0.25) * Math.PI) * 0.18 : 1) }; }
  for (const g of b.gesta ?? []) {
    const p = (t - (b.od + g.t)) / 1.2;
    if (p < 0 || p > 1) continue;
    const obal = Math.sin(p * Math.PI);
    if (g.gesto === "kyv") P = { ...P, rX: P.rX + 0.22 * Math.sin(p * Math.PI * 4) * obal };
    if (g.gesto === "vrteni") P = { ...P, rY: P.rY + 0.55 * Math.sin(p * Math.PI * 4) * obal };
    if (g.gesto === "premysli") { P = { ...P, aR: P.aR + 1.9 * obal, rZ: P.rZ + 0.09 * obal }; vyraz = "povzbuzeni"; }
    if (g.gesto === "krida") P = { ...P, aL: P.aL + 2.0 * obal, y: P.y + 0.15 * Math.sin(p * Math.PI * 2) * obal };
  }
  for (const r of b.reakce ?? []) {
    if (!jeReakce3D(r.id)) continue;
    const start = b.od + r.t, p = (t - start) / DELKA[r.id];
    if (p < 0) continue;
    const klicR = `${r.id}@${start}#${Math.floor(p)}`;
    P = reakce(r.id, p % 1, t, P, vyhozeneReakce.has(klicR));
    if (P.konfety && !vyhozeneReakce.has(klicR)) { vypustKonfety(P.konfety); vyhozeneReakce.add(klicR); }
    vyraz = "radost";
  }
  return { P, vyraz, tabule: piseSe(t) ? 1 : 0 };
}

function kresliHexika(t: number, dt: number) {
  const { P, vyraz, tabule } = pozaHexika(t);
  const m = model;
  otoc.v += (tabule - otoc.v) * Math.min(1, dt * 4);
  ukaz.v += (tabule - ukaz.v) * Math.min(1, dt * 6);
  look.x += ((tabule ? -0.35 : 0) - look.x) * Math.min(1, dt * 5);
  look.y += ((tabule ? 0.9 : 0) - look.y) * Math.min(1, dt * 5);
  m.root.position.y = P.y; m.root.scale.setScalar(P.s);
  const sx = 1 / Math.sqrt(P.sy); m.hips.scale.set(sx, P.sy, sx);
  const mrkT = MRKY.find((x) => t >= x && t < x + 0.16);
  const bl = mrkT !== undefined ? 1 - 0.9 * Math.sin(((t - mrkT) / 0.16) * Math.PI) : 1;
  const ob = animujOblicej(m.oblicej, { vyraz, lookX: P.lx + look.x * 0.8, lookY: P.ly + look.y * 0.7, mrk: bl, tVyraz: t }, dt);
  m.body.rotation.z = P.rZ + ob.naklon;
  m.armL.rotation.z = -(P.aL + 0.08 + ukaz.v * 1.7);
  m.armR.rotation.z = P.aR + 0.08;
  m.root.rotation.set(P.rX - look.y * 0.1, P.rY - 0.12 - otoc.v * 0.55, 0);
  const a = hlasitost(t), u = m.oblicej.usta;
  if (u.otevrena && a > 0.08) {
    for (const [k, o] of Object.entries(u)) o.visible = k === "otevrena";
    u.otevrena.scale.set(0.82 + 0.18 * a, vyraz === "radost" ? 0.55 + 0.45 * a : 0.25 + 0.75 * a, 1);
  } else if (u.otevrena) u.otevrena.scale.set(1, 1, 1);
  const vy = (P.y - minulaPoza.y) / dt;
  m.aktualizuj({ ay: cl((vy - minulaPoza.vy) / dt, -40, 40), wy: cl((P.rY - minulaPoza.rY) / dt, -14, 14), wx: cl((P.rX - minulaPoza.rX) / dt, -14, 14), wz: cl((P.rZ - minulaPoza.rZ) / dt, -6, 6), cas: t, dt });
  Object.assign(minulaPoza, { y: P.y, vy, rY: P.rY, rX: P.rX, rZ: P.rZ });
  for (const k of konfety) {
    if (!k.visible) continue;
    const ud = k.userData; ud.life += dt; (ud.v as THREE.Vector3).y -= 6 * dt;
    k.position.addScaledVector(ud.v as THREE.Vector3, dt); k.rotation.x += (ud.s as THREE.Vector3).x * dt; k.rotation.y += (ud.s as THREE.Vector3).y * dt;
    (k.material as THREE.MeshBasicMaterial).opacity = cl(1.8 - ud.life);
    if (ud.life > 1.8 || k.position.y < -1.6) k.visible = false;
  }
}

// ───────────────────────── Kamera ─────────────────────────
const KAM_CELEK = { pos: new THREE.Vector3(2.2, 1.7, 14.6), cil: new THREE.Vector3(-0.15, 1.15, -0.8) };
const KAM_TABULE = { pos: new THREE.Vector3(1.3, 2.6, 12.4), cil: new THREE.Vector3(-0.3, 1.75, -2.0) };
const KAM_HEXIK = { pos: new THREE.Vector3(1.6, 0.9, 11.4), cil: new THREE.Vector3(0.35, 0.55, 0.6) };
const kamPos = new THREE.Vector3(), kamCil = new THREE.Vector3();
let blizkoTabule = 0, blizkoHexika = 0;

function kamera(t: number, dt: number) {
  const pk = psaniKonci(t);
  const pise = piseSe(t) || (pk > 0 && t - pk < 0.5) ? 1 : 0;
  const zb = scenar.bloky.find((b) => b.zaver);
  const tanecOd = zb ? zb.od + (zb.reakce?.[0]?.t ?? 99) - 0.3 : Infinity, zt = zb ? zb.od + (zb.zaverT ?? 3.2) : Infinity;
  const tanec = t >= tanecOd && t < zt ? 1 : 0, zaverTabule = t >= zt ? 1 : 0;
  blizkoTabule += ((zaverTabule ? 0.75 : pise * 0.55) - blizkoTabule) * Math.min(1, dt * 2.2);
  blizkoHexika += (tanec * 0.6 - blizkoHexika) * Math.min(1, dt * 2.2);
  kamPos.copy(KAM_CELEK.pos).lerp(KAM_TABULE.pos, blizkoTabule).lerp(KAM_HEXIK.pos, blizkoHexika);
  kamCil.copy(KAM_CELEK.cil).lerp(KAM_TABULE.cil, blizkoTabule).lerp(KAM_HEXIK.cil, blizkoHexika);
  const uvod = 1 - easeOut(cl(t / 1.4));
  kamPos.z += uvod * 3.2; kamPos.y += uvod * 0.8;
  kamPos.x += Math.sin(t * 0.37) * 0.18 + Math.sin(t * 1.9) * 0.012;
  kamPos.y += Math.sin(t * 0.53) * 0.08 + Math.sin(t * 2.3) * 0.01;
  camera.position.copy(kamPos); camera.lookAt(kamCil);
  camera.fov = 34 - blizkoTabule * 2; camera.updateProjectionMatrix();
}

// ───────────────────────── Bubliny nad Hexíkem ─────────────────────────
function bubliny(t: number) {
  const el = document.getElementById("bublina")!, txt = document.getElementById("bublinaText")!;
  const vsechny: { t: number; co: string }[] = [];
  for (const b of scenar.bloky) for (const x of b.bubliny ?? []) vsechny.push({ t: b.od + x.t, co: x.co });
  const akt = vsechny.filter((x) => t >= x.t && t < x.t + 1.8).pop();
  if (!akt) { el.style.visibility = "hidden"; return; }
  const p = (t - akt.t) / 1.8;
  // vedle hlavy vpravo (nad hlavou jsou titulky)
  const hlava = new THREE.Vector3(1.55, 0.95, 0); model.root.localToWorld(hlava);
  const v = hlava.project(camera);
  const sk = p < 0.15 ? easeOut(p / 0.15) * 1.1 : p > 0.85 ? 1 - (p - 0.85) / 0.15 : 1 + 0.03 * Math.sin(t * 6);
  el.style.left = `${((v.x + 1) / 2) * W}px`; el.style.top = `${((1 - v.y) / 2) * H - 40 * p}px`;
  el.style.transform = `scale(${Math.max(0, sk)}) rotate(${Math.sin(t * 3) * 6}deg)`;
  if (txt.textContent !== akt.co) txt.textContent = akt.co;
  el.style.visibility = "visible";
}

// ───────────────────────── Veřejné rozhraní pro render.mjs ─────────────────────────
declare global {
  interface Window { pripravit: (s: Scenar, o: number[] | null, f: number) => Promise<void>; snimek: (t: number) => void; hotovo?: boolean }
}

window.pripravit = async (s, o, f) => {
  scenar = s; obalka = o; fps = f || 30; nahoda = seeded(42);
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  document.body.innerHTML = HTML;
  await Promise.all([document.fonts.load("800 56px 'DM Sans'"), document.fonts.load("700 52px 'DM Sans'"), document.fonts.load("700 80px Caveat")]);
  await document.fonts.ready;
  krCanvas = document.createElement("canvas"); krCanvas.width = KR_W * KR_S; krCanvas.height = KR_H * KR_S; kr = krCanvas.getContext("2d")!;
  pripravPodkladTabule();
  radky = [];
  for (const b of scenar.bloky) for (const r of b.tabule ?? []) radky.push({ ...r, ta: b.od + r.t });
  pocetRadku = Math.max(5, ...radky.map((r) => r.radek + 1));
  pripravTitulky();
  pripravRenderer();
  postavPokoj();
  pripravHexika();
  window.hotovo = true;
};

window.snimek = (t: number) => {
  const dt = minuleT < 0 ? 1 / fps : Math.max(1 / fps, t - minuleT); minuleT = t;
  const zb = scenar.bloky.find((b) => b.zaver);
  const zt = zb ? zb.od + (zb.zaverT ?? 3.2) : Infinity;
  kresliTabuli(t, t >= zt ? zt : null);
  tabuleSvetlo.intensity = (piseSe(t) ? 1.4 : 0.6) + (t >= zt ? 0.3 : 0);
  for (const a of animace) a(t, dt);
  kresliHexika(t, dt);
  kamera(t, dt);
  nastavTitulek(t);
  bubliny(t);
  const z = document.getElementById("zaclona")!;
  z.style.opacity = String(Math.max(1 - cl(t / 0.35), cl((t - (scenar.delka - 0.35)) / 0.35)));
  composer.render();
};
