/**
 * Scéna videa s Hexíkem (1080×1920): pokojíček s velkou tabulí, 3D Hexík ze stejného modelu jako v appce
 * (src/lib/hexik3d), titulky a logo MateMax. Běží v prohlížeči pod Playwrightem; render.mjs volá
 * window.snimek(t) snímek po snímku (deterministicky, bez náhody a bez skutečného času).
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { postavHexika, type HexikModel } from "../../../src/lib/hexik3d/model";
import { klid, reakce, DELKA, jeReakce3D, type Poza } from "../../../src/lib/hexik3d/animace";
import { animujOblicej, type Vyraz3D } from "../../../src/lib/hexik3d/oblicej";

// ── Scénář (stejný tvar jako scenare/*.json) ──
interface RadekTabule { t: number; radek: number; text?: string; styl?: "zvyrazni" | "zlaty"; preskrtni?: boolean }
interface Blok {
  od: number; do: number; rika?: string; titulky?: string[]; vyraz?: Vyraz3D;
  tabule?: RadekTabule[]; gesta?: { t: number; gesto: "kyv" | "vrteni" | "premysli" | "krida" }[];
  reakce?: { t: number; id: string }[]; pohledNaTabuli?: boolean; zaver?: boolean; zaverT?: number; bezReci?: boolean; reciOd?: number; reciDo?: number;
  odpocet?: { od: number; do: number; z: number };
}
export interface Scenar { id: string; nazev: string; podoba?: string; delka: number; bloky: Blok[] }

const W = 1080, H = 1920, FPS_VYCHOZI = 30;
const NAVY = "#0D1B3E";

// ── Vzhled (CSS) ──
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#E6E4FF}
body{font-family:'DM Sans',Arial,sans-serif;position:relative}
#stena{position:absolute;inset:0;background:radial-gradient(ellipse 900px 700px at 50% 38%,#F4F3FF 0%,#E7E5FF 55%,#D9D6FB 100%)}
#tapeta{position:absolute;left:0;right:0;top:0;height:1430px;opacity:.5;background-image:radial-gradient(circle at 20px 20px,#CFCBF7 2.2px,transparent 2.6px);background-size:64px 64px}
#podlaha{position:absolute;left:0;right:0;top:1430px;bottom:0;background:linear-gradient(#E8C9A1,#D7AE80);overflow:hidden}
#podlaha i{position:absolute;top:0;bottom:0;width:3px;background:rgba(150,100,55,.18)}
#lista{position:absolute;left:0;right:0;top:1410px;height:24px;background:linear-gradient(#FFFFFF,#E9E6FA);box-shadow:0 3px 6px rgba(13,27,62,.12)}
#koberec{position:absolute;left:250px;width:580px;top:1545px;height:130px;border-radius:50%;background:radial-gradient(ellipse at center,#B9B4F7 0%,#A7A2F0 60%,#9C96EA 100%);box-shadow:inset 0 0 0 12px rgba(255,255,255,.35)}
#kytka{position:absolute;left:44px;top:1170px;width:150px;height:270px}
#lampa{position:absolute;right:50px;top:1080px;width:120px;height:360px}
#tabule{position:absolute;left:54px;top:150px;width:972px;height:640px;border-radius:26px;background:linear-gradient(145deg,#C99A62,#A87443);padding:22px;box-shadow:0 18px 40px rgba(13,27,62,.25)}
#tabule canvas{display:block;width:928px;height:596px;border-radius:12px}
#zlab{position:absolute;left:150px;right:150px;bottom:-26px;height:30px;border-radius:0 0 14px 14px;background:linear-gradient(#B98552,#956236);box-shadow:0 8px 14px rgba(13,27,62,.2)}
#zlab b{position:absolute;top:4px;height:12px;border-radius:6px}
#titulky{position:absolute;left:70px;right:70px;top:840px;display:flex;justify-content:center;pointer-events:none}
#titulky span{display:inline-block;max-width:940px;text-align:center;background:${NAVY};color:#fff;font-weight:800;font-size:52px;line-height:1.22;padding:18px 34px 20px;border-radius:24px;box-shadow:0 10px 24px rgba(13,27,62,.28);transition:none}
#hexik{position:absolute;left:0;top:735px;width:${W}px;height:1000px}
#logo{position:absolute;right:44px;bottom:150px;display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.88);padding:12px 22px 12px 12px;border-radius:22px;box-shadow:0 6px 16px rgba(13,27,62,.15)}
#logo .ctv{width:64px;height:64px;border-radius:16px;background:${NAVY};color:#fff;font-weight:800;font-size:30px;display:flex;align-items:center;justify-content:center}
#logo .txt{font-weight:800;font-size:38px;color:${NAVY}}
`;

const HTML = `
<div id="stena"></div><div id="tapeta"></div>
<div id="podlaha">${Array.from({ length: 9 }, (_, i) => `<i style="left:${i * 132 + 40}px"></i>`).join("")}</div>
<div id="lista"></div>
<div id="koberec"></div>
<svg id="kytka" viewBox="0 0 150 270"><path d="M75 150 C40 120 20 70 38 30 C60 60 70 100 75 150Z" fill="#5FD0AA"/><path d="M75 150 C100 110 120 70 112 22 C88 55 80 100 75 150Z" fill="#3FB58E"/><path d="M75 155 C50 130 8 120 4 88 C40 92 62 118 75 155Z" fill="#7ADDB9"/><path d="M75 155 C102 132 140 126 146 96 C108 96 88 122 75 155Z" fill="#4CC39C"/><path d="M38 160 H112 L102 262 Q75 270 48 262Z" fill="#F27BA5"/><rect x="32" y="150" width="86" height="20" rx="8" fill="#E25E8E"/></svg>
<svg id="lampa" viewBox="0 0 120 360"><ellipse cx="60" cy="350" rx="40" ry="9" fill="#C9A06E"/><rect x="56" y="110" width="8" height="240" rx="4" fill="#9E7BB8"/><path d="M14 112 L36 30 H84 L106 112Z" fill="#F5A623"/><path d="M14 112 L36 30 H84 L106 112Z" fill="url(#zar)" opacity=".5"/><defs><linearGradient id="zar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#F5A623"/></linearGradient></defs></svg>
<div id="tabule"><canvas id="krida" width="928" height="596"></canvas><div id="zlab"><b style="left:120px;width:70px;background:#FFFFFF"></b><b style="left:230px;width:54px;background:#FFE066"></b><b style="left:310px;width:62px;background:#9FD9FF"></b></div></div>
<div id="titulky"><span id="titulek" style="visibility:hidden"></span></div>
<canvas id="hexik" width="${W}" height="1000"></canvas>
<div id="logo"><div class="ctv">M²</div><div class="txt">MateMax</div></div>
`;

// ── Pomocné ──
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
function seeded(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

let scenar: Scenar;
let obalka: number[] | null = null; // hlasitost hlasu po snímcích (0–1), null = bez hlasu
let fps = FPS_VYCHOZI;

// ── Tabule (2D kreslení křídou) ──
const KR_W = 928, KR_H = 596;
let kr: CanvasRenderingContext2D;
let podkladTabule: HTMLCanvasElement;

function pripravPodkladTabule() {
  podkladTabule = document.createElement("canvas"); podkladTabule.width = KR_W; podkladTabule.height = KR_H;
  const x = podkladTabule.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, KR_W, KR_H); g.addColorStop(0, "#285E4D"); g.addColorStop(1, "#1C4A3C");
  x.fillStyle = g; x.fillRect(0, 0, KR_W, KR_H);
  const r = seeded(7);
  // šmouhy po smazané křídě
  for (let i = 0; i < 70; i++) {
    x.strokeStyle = `rgba(255,255,255,${0.012 + r() * 0.03})`; x.lineWidth = 20 + r() * 60; x.lineCap = "round";
    const px = r() * KR_W, py = r() * KR_H; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + 80 * (r() - 0.5), py + 40 * (r() - 0.5), px + 220 * (r() - 0.3), py + 30 * (r() - 0.5)); x.stroke();
  }
  for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(255,255,255,${r() * 0.05})`; x.fillRect(r() * KR_W, r() * KR_H, 1.5, 1.5); }
}

/** Absolutní časy (scénář má časy v bloku relativně). */
interface RadekAbs extends RadekTabule { ta: number }
let radky: RadekAbs[] = [];
let pocetRadku = 5;
const radekY = (i: number) => (pocetRadku <= 5 ? [92, 200, 300, 400, 505][i] : 72 + (i * (KR_H - 140)) / (pocetRadku - 1));
const velikostPisma = (i: number) => (pocetRadku <= 5 ? (i === 0 ? 84 : 76) : Math.min(74, ((KR_H - 140) / (pocetRadku - 1)) * 0.78));

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

function delkaPsani(znaku: number) { return 0.25 + 0.045 * znaku; }

/** Píše se právě něco na tabuli? (Hexík se pak dívá na tabuli a ukazuje) */
function piseSe(t: number) {
  return stavTabule(t).some((s) => t - s.t0 < delkaPsani(s.text.length - s.predchozi.length) + 0.2);
}

function kresliTabuli(t: number, zaverOd: number | null) {
  kr.drawImage(podkladTabule, 0, 0);
  // závěr: staré psaní zmizí (0,35 s), pak se objeví logo a odkaz (0,45 s), nepřekrývá se
  const pryc = zaverOd !== null ? cl((t - zaverOd) / 0.35) : 0;
  const zaver = zaverOd !== null ? ease(cl((t - zaverOd - 0.35) / 0.45)) : 0;
  if (pryc < 1) {
    kr.save(); kr.globalAlpha = 1 - pryc;
    for (const s of stavTabule(t)) {
      const y = radekY(s.radek);
      kr.font = `700 ${velikostPisma(s.radek)}px Caveat, 'DM Sans', sans-serif`;
      kr.textBaseline = "middle"; kr.textAlign = "left";
      const sirka = kr.measureText(s.text).width, x0 = (KR_W - sirka) / 2;
      const zSirka = kr.measureText(s.predchozi).width;
      const novych = s.text.length - s.predchozi.length;
      const p = cl((t - s.t0) / delkaPsani(novych));
      const vidno = zSirka + (sirka - zSirka) * p;
      if (s.styl === "zvyrazni" && p > 0.95) {
        const q = ease(cl((t - s.t0 - delkaPsani(novych)) / 0.5));
        kr.fillStyle = `rgba(255,224,102,${0.28 * q})`;
        const pad = 22; kr.beginPath(); kr.roundRect(x0 - pad, y - 52, (sirka + 2 * pad) * q, 104, 20); kr.fill();
      }
      if (s.styl === "zlaty" && p > 0.95) {
        const q = ease(cl((t - s.t0 - delkaPsani(novych)) / 0.5));
        kr.strokeStyle = `rgba(245,190,60,${q})`; kr.lineWidth = 8; kr.beginPath(); kr.roundRect(x0 - 28, y - 58, sirka + 56, 116, 22); kr.stroke();
      }
      kr.save(); kr.beginPath(); kr.rect(x0 - 10, y - 80, p >= 1 ? sirka + 60 : vidno + 10, 160); kr.clip();
      kr.shadowColor = "rgba(255,255,255,.35)"; kr.shadowBlur = 6;
      kr.fillStyle = s.styl === "zvyrazni" ? "#FFF1A8" : s.styl === "zlaty" ? "#FFD66B" : "rgba(255,255,255,.95)";
      kr.fillText(s.text, x0, y);
      kr.restore();
      if (s.preskrtnout !== undefined && t >= s.preskrtnout) {
        const q = ease(cl((t - s.preskrtnout) / 0.4));
        kr.strokeStyle = "#FF7A8A"; kr.lineWidth = 9; kr.lineCap = "round";
        kr.beginPath(); kr.moveTo(x0 - 12, y + 6); kr.lineTo(x0 - 12 + (sirka + 24) * q, y - 4); kr.stroke();
      }
    }
    kr.restore();
  }
  // odpočet: velké kolo s číslem vpravo dole na tabuli
  for (const b of scenar.bloky) {
    if (!b.odpocet) continue;
    const z = b.od + b.odpocet.od, k = b.od + b.odpocet.do, krok = (k - z) / b.odpocet.z;
    if (t < z - 0.2 || t > k + 0.6) continue;
    const zb = Math.max(0, k - t), cislo = Math.ceil(zb / krok - 1e-6);
    const q = ease(cl((t - z + 0.2) / 0.3)) * (1 - cl((t - k) / 0.6));
    const cx = KR_W - 120, cy = KR_H - 120, rr = 86;
    kr.save(); kr.globalAlpha = q;
    kr.fillStyle = "rgba(13,27,62,.55)"; kr.beginPath(); kr.arc(cx, cy, rr, 0, Math.PI * 2); kr.fill();
    kr.strokeStyle = cislo <= 3 ? "#FF7A8A" : "#FFE066"; kr.lineWidth = 12; kr.lineCap = "round";
    kr.beginPath(); kr.arc(cx, cy, rr - 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (zb / (k - z))); kr.stroke();
    const vTiku = ((k - t) % krok + krok) % krok, puls = 1 + 0.12 * Math.max(0, 1 - (krok - vTiku) / 0.25);
    kr.fillStyle = "#FFFFFF"; kr.font = `800 ${Math.round(84 * puls)}px 'DM Sans', sans-serif`; kr.textAlign = "center"; kr.textBaseline = "middle";
    kr.fillText(String(Math.max(0, cislo)), cx, cy + 4);
    kr.restore();
  }
  if (zaver > 0) {
    kr.save(); kr.globalAlpha = zaver; kr.textAlign = "center"; kr.textBaseline = "middle";
    kr.fillStyle = "#FFFFFF"; kr.font = "800 150px 'DM Sans', sans-serif";
    // logo MateMax na tabuli: čtverec M² + nápis
    const sq = 150, cx = KR_W / 2, cy = 225;
    kr.fillStyle = "#FFFFFF"; kr.beginPath(); kr.roundRect(cx - 290, cy - sq / 2, sq, sq, 34); kr.fill();
    kr.fillStyle = NAVY; kr.font = "800 72px 'DM Sans', sans-serif"; kr.fillText("M²", cx - 290 + sq / 2, cy + 4);
    kr.fillStyle = "#FFFFFF"; kr.font = "800 96px 'DM Sans', sans-serif"; kr.textAlign = "left"; kr.fillText("MateMax", cx - 110, cy + 6);
    kr.textAlign = "center"; kr.font = "700 52px 'DM Sans', sans-serif"; kr.fillStyle = "#FFE066";
    kr.fillText("matemax.matematika-snadno.cz", cx, 420);
    kr.restore();
  }
}

// ── Titulky ──
interface Titulek { od: number; do: number; text: string }
let titulky: Titulek[] = [];
function pripravTitulky() {
  titulky = [];
  for (const b of scenar.bloky) {
    const ch = b.titulky ?? [];
    if (!ch.length) continue;
    const z = b.od + (b.reciOd ?? 0.1), k = b.od + (b.reciDo ?? b.do - b.od - 0.2), vahy = ch.map((c) => c.length + 8), sum = vahy.reduce((a, x) => a + x, 0);
    let t = z;
    ch.forEach((c, i) => { const d = ((k - z) * vahy[i]) / sum; titulky.push({ od: t, do: t + d, text: c }); t += d; });
  }
}
const titEl = () => document.getElementById("titulek")!;
let posledniTitulek = "";
function nastavTitulek(t: number) {
  const tit = titulky.find((x) => t >= x.od && t < x.do);
  const text = tit?.text ?? "";
  if (text !== posledniTitulek) { titEl().textContent = text; titEl().style.visibility = text ? "visible" : "hidden"; posledniTitulek = text; }
  // jemné „naskočení“ titulku
  if (tit) { const q = ease(cl((t - tit.od) / 0.18)); titEl().style.transform = `translateY(${(1 - q) * 14}px) scale(${0.96 + 0.04 * q})`; titEl().style.opacity = String(0.4 + 0.6 * q); }
}

/** Mluví Hexík? 0–1. Z hlasu (obálka hlasitosti), jinak umělé slabiky během titulků. */
function hlasitost(t: number): number {
  if (obalka) { const i = Math.round(t * fps); return obalka[Math.min(obalka.length - 1, Math.max(0, i))] ?? 0; }
  const tit = titulky.find((x) => t >= x.od + 0.05 && t < x.do - 0.12);
  if (!tit) return 0;
  const u = t - tit.od;
  const slab = Math.max(0, Math.sin(u * Math.PI * 2 * 4.6)) ** 0.7;
  const fraze = 0.75 + 0.25 * Math.sin(u * 1.7 + tit.od);
  return cl(slab * fraze);
}

// ── 3D Hexík ──
let renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, model: HexikModel;
const konfety: THREE.Mesh[] = [];
const KONFETY_BARVY = ["#F5A623", "#5B55D6", "#3DF5FF", "#F27BA5", "#5FD0AA", "#FFFFFF"];
let nahoda = seeded(42);

function pripravHexika() {
  const canvas = document.getElementById("hexik") as HTMLCanvasElement;
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(W, 1000, false);
  renderer.toneMapping = THREE.NeutralToneMapping;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, W / 1000, 0.1, 60);
  camera.position.set(0, 0.45, 9.2); camera.lookAt(0, 0.35, 0); camera.updateProjectionMatrix();
  const pm = new THREE.PMREMGenerator(renderer); const room = new RoomEnvironment();
  scene.environment = pm.fromScene(room, 0.035).texture; scene.environmentIntensity = 0.55; room.dispose(); pm.dispose();
  scene.add(new THREE.HemisphereLight("#FFFFFF", "#26296A", 0.45));
  const key = new THREE.DirectionalLight("#FFF1DE", 1.5); key.position.set(3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight("#A898FF", 1.6); rim.position.set(-4, 3, -4); scene.add(rim);
  const fill = new THREE.DirectionalLight("#9FC4FF", 0.6); fill.position.set(-5, 1, 3); scene.add(fill);
  const meritko = { value: 1000 / (2 * Math.tan((30 * Math.PI) / 360)) };
  model = postavHexika(scenar.podoba ?? "klasik", 1, meritko, {});
  scene.add(model.root); scene.add(model.stin); scene.add(model.okoli);
  const kGeo = new THREE.PlaneGeometry(0.07, 0.12);
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Mesh(kGeo, new THREE.MeshBasicMaterial({ color: KONFETY_BARVY[i % KONFETY_BARVY.length], side: THREE.DoubleSide, transparent: true }));
    m.visible = false; m.userData = { v: new THREE.Vector3(), s: new THREE.Vector3(), life: 0 }; scene.add(m); konfety.push(m);
  }
}

function vypustKonfety(n: number) {
  let u = 0;
  for (const k of konfety) {
    if (u >= n) break; if (k.visible) continue;
    u++; k.visible = true; k.userData.life = 0;
    k.position.set((nahoda() - 0.5) * 0.6, model.root.position.y + 0.9, (nahoda() - 0.5) * 0.4);
    const a = nahoda() * Math.PI * 2, r = 0.6 + nahoda();
    (k.userData.v as THREE.Vector3).set(Math.cos(a) * r, 2.2 + nahoda() * 1.6, Math.sin(a) * r * 0.6);
    (k.userData.s as THREE.Vector3).set(nahoda() * 8, nahoda() * 8, nahoda() * 8);
  }
}

// stav mezi snímky (snímky jdou popořadě)
let minuleT = -1;
const minulaPoza = { y: 0, vy: 0, rY: 0, rX: 0, rZ: 0 };
const look = { x: 0, y: 0 };
const vyhozeneReakce = new Set<string>();
const MRKY = Array.from({ length: 40 }, (_, i) => 1.6 + i * 3.3 + ((i * 7) % 5) * 0.31);

function blokV(t: number) { return scenar.bloky.find((b) => t >= b.od && t < b.do) ?? scenar.bloky[scenar.bloky.length - 1]; }

function pozaHexika(t: number): { P: Poza; vyraz: Vyraz3D; lx: number; ly: number; ukazuje: number } {
  let P = klid(t, true);
  const b = blokV(t);
  let vyraz: Vyraz3D = b.vyraz ?? "neutral";
  const mluvi = hlasitost(t);
  // při řeči jemné pohupování
  P = { ...P, rZ: P.rZ + 0.035 * Math.sin(t * 2.4) * (mluvi > 0 ? 1 : 0.3), y: P.y + 0.02 * mluvi };
  for (const g of b.gesta ?? []) {
    const p = (t - (b.od + g.t)) / 1.1;
    if (p < 0 || p > 1) continue;
    const obal = Math.sin(p * Math.PI);
    if (g.gesto === "kyv") P = { ...P, rX: P.rX + 0.2 * Math.sin(p * Math.PI * 4) * obal };
    if (g.gesto === "vrteni") { P = { ...P, rY: P.rY + 0.5 * Math.sin(p * Math.PI * 4) * obal }; }
    if (g.gesto === "premysli") { P = { ...P, aR: P.aR + 1.9 * obal, rZ: P.rZ + 0.08 * obal }; vyraz = "povzbuzeni"; }
    if (g.gesto === "krida") P = { ...P, aR: P.aR + 2.2 * obal };
  }
  for (const r of b.reakce ?? []) {
    if (!jeReakce3D(r.id)) continue;
    const start = b.od + r.t, p = (t - start) / DELKA[r.id];
    if (p < 0) continue;
    // taneček na konci se opakuje až do konce videa
    const pp = p % 1;
    const klicR = `${r.id}@${start}#${Math.floor(p)}`;
    P = reakce(r.id, pp, t, P, vyhozeneReakce.has(klicR));
    if (P.konfety && !vyhozeneReakce.has(klicR)) { vypustKonfety(P.konfety); vyhozeneReakce.add(klicR); }
    vyraz = "radost";
  }
  let lx = 0, ly = 0, ukazuje = 0;
  if (piseSe(t) && (b.pohledNaTabuli || true)) { ly = 0.85; lx = -0.15; ukazuje = 1; }
  return { P, vyraz, lx, ly, ukazuje };
}

const ukaz = { v: 0 };
function kresliHexika(t: number) {
  const dt = minuleT < 0 ? 1 / fps : Math.max(1 / fps, t - minuleT); minuleT = t;
  const { P, vyraz, lx, ly, ukazuje } = pozaHexika(t);
  const m = model;
  m.root.position.y = P.y; m.root.scale.setScalar(P.s);
  const sx = 1 / Math.sqrt(P.sy); m.hips.scale.set(sx, P.sy, sx);
  look.x += (lx - look.x) * Math.min(1, dt * 5); look.y += (ly - look.y) * Math.min(1, dt * 5);
  ukaz.v += (ukazuje - ukaz.v) * Math.min(1, dt * 6);
  const mrkT = MRKY.find((x) => t >= x && t < x + 0.16);
  const bl = mrkT !== undefined ? 1 - 0.9 * Math.sin(((t - mrkT) / 0.16) * Math.PI) : 1;
  const ob = animujOblicej(m.oblicej, { vyraz, lookX: P.lx + look.x * 0.8, lookY: P.ly + look.y * 0.7, mrk: bl, tVyraz: t }, dt);
  m.body.rotation.z = P.rZ + ob.naklon;
  m.armL.rotation.z = -(P.aL + 0.08 + ukaz.v * 1.6);
  m.armR.rotation.z = P.aR + 0.08;
  m.root.rotation.set(P.rX - look.y * 0.12, P.rY + look.x * 0.3 - ukaz.v * 0.18, 0);
  // Pusa podle hlasitosti: otevřená pusa s jazykem, výška podle síly hlasu
  const a = hlasitost(t);
  const u = m.oblicej.usta;
  if (u.otevrena && a > 0.08) {
    for (const [k, o] of Object.entries(u)) o.visible = k === "otevrena";
    const s = vyraz === "radost" ? 0.55 + 0.45 * a : 0.25 + 0.75 * a;
    u.otevrena.scale.set(0.82 + 0.18 * a, s, 1);
  } else if (u.otevrena) u.otevrena.scale.set(1, 1, 1);
  if (!m.mouth.userData.rovna && m.mouth.visible) { m.mouth.scale.y = P.usta; }
  // doplňky a stín
  const vy = (P.y - minulaPoza.y) / dt;
  m.aktualizuj({ ay: cl((vy - minulaPoza.vy) / dt, -40, 40), wy: cl((P.rY - minulaPoza.rY) / dt, -14, 14), wx: cl((P.rX - minulaPoza.rX) / dt, -14, 14), wz: cl((P.rZ - minulaPoza.rZ) / dt, -6, 6), cas: t, dt });
  Object.assign(minulaPoza, { y: P.y, vy, rY: P.rY, rX: P.rX, rZ: P.rZ });
  m.stin.scale.setScalar(Math.max(0.45, 1 - P.y * 0.35) * P.s);
  for (const k of konfety) {
    if (!k.visible) continue;
    const ud = k.userData; ud.life += dt; (ud.v as THREE.Vector3).y -= 6 * dt;
    k.position.addScaledVector(ud.v as THREE.Vector3, dt); k.rotation.x += (ud.s as THREE.Vector3).x * dt; k.rotation.y += (ud.s as THREE.Vector3).y * dt;
    (k.material as THREE.MeshBasicMaterial).opacity = cl(1.6 - ud.life);
    if (ud.life > 1.6 || k.position.y < -1.6) k.visible = false;
  }
  renderer.render(scene, camera);
}

// ── Veřejné rozhraní pro render.mjs ──
declare global {
  interface Window {
    pripravit: (s: Scenar, o: number[] | null, f: number) => Promise<void>;
    snimek: (t: number) => void;
    hotovo?: boolean;
  }
}

window.pripravit = async (s, o, f) => {
  scenar = s; obalka = o; fps = f || FPS_VYCHOZI; nahoda = seeded(42);
  const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  document.body.innerHTML = HTML;
  await Promise.all([
    document.fonts.load("800 52px 'DM Sans'"), document.fonts.load("700 52px 'DM Sans'"),
    document.fonts.load("700 80px Caveat"),
  ]);
  await document.fonts.ready;
  kr = (document.getElementById("krida") as HTMLCanvasElement).getContext("2d")!;
  pripravPodkladTabule();
  radky = [];
  for (const b of scenar.bloky) for (const r of b.tabule ?? []) radky.push({ ...r, ta: b.od + r.t });
  pocetRadku = Math.max(5, ...radky.map((r) => r.radek + 1));
  pripravTitulky();
  pripravHexika();
  window.hotovo = true;
};

window.snimek = (t: number) => {
  const zaverBlok = scenar.bloky.find((b) => b.zaver);
  const zt = zaverBlok ? zaverBlok.od + (zaverBlok.zaverT ?? 3.2) : Infinity;
  const zaverOd = t >= zt ? zt : null;
  kresliTabuli(t, zaverOd);
  nastavTitulek(t);
  kresliHexika(t);
};
