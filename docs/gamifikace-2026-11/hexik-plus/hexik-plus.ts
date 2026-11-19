/**
 * MOCKUP: vylepšený 3D Hexík (návrh 19. 11. 2026).
 * Staví na skutečném modelu z appky (lib/hexik3d/model) a přidává:
 *  - obličej s hloubkou (měkký polštářek se švem místo ploché desky), tvářičky jako ruměnec
 *  - živé oči (duhovka, dva odlesky), víčka a obočí
 *  - výrazy: radost, překvapení, povzbuzení, ospalý, stýská se mu (+ mrknutí)
 *  - reakce na ťuknutí a pohlazení (srdíčka), oči a hlava sledují prst/kurzor
 *  - koruna a uši se nesrážejí (koruna výš, uši se rozevřou)
 *  - stejné studiové světlo jako nová truhla
 */
import * as THREE from "three";
import { postavHexika, type HexikModel } from "../../../src/lib/hexik3d/model";
import { doplnekNaSlot, type Doplnek, type Sklad } from "../../../src/lib/hexik3d/doplnky";
import { podobaHexika } from "../../../src/lib/hexik-svg";
import { klid, reakce, DELKA, type Reakce3D } from "../../../src/lib/hexik3d/animace";
import { vytvorCastice, type Castice } from "../../../src/lib/hexik3d/castice";
import { vytvorStudio } from "../../../src/lib/hexik3d/studio";

export type Vyraz = "neutral" | "radost" | "prekvapeni" | "povzbuzeni" | "ospaly" | "smutny";
export interface HexikPlus { nastav(podoba: string, koruna: boolean): void; vyraz(v: Vyraz): void; mrkni(): void; znic(): void }
export interface MoznostiPlus { podoba: string; etapa: number; koruna: boolean; interaktivni: boolean; zoom?: number; onVyraz?: (v: Vyraz) => void }

const N = "#0D1B3E";
const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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

function kruhovaTextura(stopy: [number, string][]): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); for (const [o, b] of stopy) g.addColorStop(o, b);
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function textoveSprite(znak: string, barva: string, font = "900 96px 'DM Sans', system-ui, sans-serif"): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!;
  x.font = font; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 10; x.strokeStyle = "rgba(13,27,62,.55)"; x.strokeText(znak, 64, 70); x.fillStyle = barva; x.fillText(znak, 64, 70);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function srdceTextura(): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = c.height = 128; const x = c.getContext("2d")!;
  x.translate(64, 70); x.beginPath(); x.moveTo(0, 30); x.bezierCurveTo(-60, -10, -30, -55, 0, -25); x.bezierCurveTo(30, -55, 60, -10, 0, 30); x.closePath();
  const g = x.createLinearGradient(0, -50, 0, 30); g.addColorStop(0, "#FF8FB8"); g.addColorStop(1, "#F0457E"); x.fillStyle = g; x.fill();
  x.lineWidth = 6; x.strokeStyle = "rgba(255,255,255,.7)"; x.stroke();
  x.fillStyle = "rgba(255,255,255,.8)"; x.beginPath(); x.ellipse(-16, -22, 9, 6, -0.5, 0, Math.PI * 2); x.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

interface Oko { g: THREE.Group; koule: THREE.Object3D[]; oblouk: THREE.Mesh; vicko: THREE.Group; vickoMesh: THREE.Mesh; obocí: THREE.Mesh; sx: number }

export function vytvorHexikaPlus(canvas: HTMLCanvasElement, o: MoznostiPlus): HexikPlus {
  const studio = vytvorStudio(canvas, { zare: false });
  const { renderer, scene, camera } = studio;
  // Hexík si drží sytou barvu: neutrální vyvážení místo filmového (ACES barvy vybledí)
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 1.0; scene.environmentIntensity = 0.55;
  studio.pozadi("#2B3A86", "#141E52");
  const geos: THREE.BufferGeometry[] = [], mats: THREE.Material[] = [], texs: THREE.Texture[] = [];
  const g = <T extends THREE.BufferGeometry>(x: T) => { geos.push(x); return x; };
  const mt = <T extends THREE.Material>(x: T) => { mats.push(x); return x; };
  const tx = <T extends THREE.Texture>(x: T) => { texs.push(x); return x; };
  const sklad: Sklad = { g, m: mt, t: tx };
  const meritko = { value: 400 };

  const obal = new THREE.Group(); scene.add(obal);
  let hx: HexikModel; let oci: Oko[] = []; let usta: Record<string, THREE.Object3D> = {}; let koruna: Doplnek | null = null; let tvare: THREE.Mesh[] = [];
  let podoba = o.podoba, maKorunu = o.koruna;

  const blushTex = tx(kruhovaTextura([[0, "rgba(255,120,160,.85)"], [0.45, "rgba(255,130,170,.45)"], [1, "rgba(255,140,180,0)"]]));
  const durhovkaTex = tx(kruhovaTextura([[0, "rgba(120,160,255,0)"], [0.6, "rgba(80,115,235,.18)"], [0.86, "rgba(120,160,255,.55)"], [1, "rgba(150,185,255,0)"]]));

  function postav() {
    if (hx) { obal.remove(hx.root); obal.remove(hx.stin); hx.dispose(); }
    hx = postavHexika(podoba, o.etapa, meritko, {});
    obal.add(hx.root); obal.add(hx.stin); hx.okoli.visible = false;
    const P = podobaHexika(podoba);
    const barvaObliceje = new THREE.Color(P.i);
    // 1) obličej: polštářek se švem
    tvare = [];
    for (const ch of [...hx.body.children]) {
      const m = ch as THREE.Mesh;
      if (m.isMesh && m.geometry instanceof THREE.ShapeGeometry && Math.abs(m.position.z - 0.462) < 0.01) {
        const pol = g(new THREE.ExtrudeGeometry(hexShape(0.8, 0.2), { depth: 0.006, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.04, bevelSegments: 6, curveSegments: 10 }));
        m.geometry = pol; m.position.z = 0.436;
        const mat = (m.material as THREE.MeshStandardMaterial); mat.roughness = 0.55; mat.polygonOffset = false;
        // šev kolem obličeje (tmavší rýha = obličej je zapuštěný)
        const pts = hexShape(0.86, 0.2).getSpacedPoints(120).map((p) => new THREE.Vector3(p.x, p.y, 0.46));
        const sev = new THREE.Mesh(g(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 160, 0.016, 8, true)), mt(new THREE.MeshStandardMaterial({ color: barvaObliceje.clone().multiplyScalar(0.62), roughness: 0.8 })));
        hx.body.add(sev);
      }
      if (m.isMesh && m.geometry instanceof THREE.CircleGeometry && Math.abs(m.position.z - 0.466) < 0.01) {
        m.material = mt(new THREE.MeshBasicMaterial({ map: blushTex, transparent: true, depthWrite: false, opacity: 0.85 }));
        m.scale.setScalar(1.9); m.position.z = 0.482; m.position.y = -0.12; tvare.push(m);
      }
    }
    // 2) oči: duhovka, druhý odlesk, oblouček (^^), víčko, obočí
    oci = [];
    for (const eg of hx.eyes) {
      const sx = Math.sign(eg.userData.bx as number) || 1;
      const koule = [...eg.children];
      const hlavni = koule.find((c) => (c as THREE.Mesh).isMesh && ((c as THREE.Mesh).geometry as THREE.SphereGeometry).parameters?.radius === 0.13) as THREE.Mesh | undefined;
      if (!hlavni) continue;
      hlavni.material = mt(new THREE.MeshPhysicalMaterial({ color: "#131C45", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
      const duh = new THREE.Mesh(g(new THREE.CircleGeometry(0.11, 32)), mt(new THREE.MeshBasicMaterial({ map: durhovkaTex, transparent: true, depthWrite: false })));
      duh.scale.set(0.95, 1.2, 1); duh.position.set(0, -0.02, 0.062); eg.add(duh); koule.push(duh);
      const odl2 = new THREE.Mesh(g(new THREE.SphereGeometry(0.02, 12, 8)), mt(new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.85 })));
      odl2.position.set(-0.04, -0.055, 0.06); eg.add(odl2); koule.push(odl2);
      const velky = koule.find((c) => c !== hlavni && (c as THREE.Mesh).isMesh && ((c as THREE.Mesh).geometry as THREE.SphereGeometry).parameters?.radius === 0.04);
      if (velky) { velky.scale.set(1.25, 1.4, 1); velky.position.set(0.05, 0.06, 0.06); }
      const oblouk = new THREE.Mesh(g(new THREE.TorusGeometry(0.085, 0.026, 10, 28, Math.PI)), mt(new THREE.MeshStandardMaterial({ color: N, roughness: 0.3 })));
      oblouk.position.set(0, -0.03, 0.04); oblouk.scale.set(1, 1.05, 0.6); oblouk.visible = false; eg.add(oblouk);
      const vicko = new THREE.Group(); eg.add(vicko);
      const vm = new THREE.Mesh(g(new THREE.SphereGeometry(0.142, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), mt(new THREE.MeshStandardMaterial({ color: barvaObliceje.clone().multiplyScalar(0.96), roughness: 0.5 })));
      vm.scale.set(1.05, 1.3, 0.5); vicko.add(vm);
      const ob = new THREE.Mesh(g(new THREE.CapsuleGeometry(0.018, 0.13, 4, 10)), mt(new THREE.MeshStandardMaterial({ color: N, roughness: 0.4 })));
      ob.rotation.z = Math.PI / 2; ob.position.set(sx * 0.27, 0.36, 0.47); ob.scale.setScalar(0.001); hx.body.add(ob);
      oci.push({ g: eg, koule, oblouk, vicko, vickoMesh: vm, obocí: ob, sx });
    }
    // 3) ústa: úsměv (původní), otevřený úsměv, „o“, čárka, smutná
    const puvodni = hx.mouth;
    const otevrena = new THREE.Group();
    { const s = new THREE.Shape(); s.moveTo(-0.17, 0); s.absarc(0, 0, 0.17, Math.PI, 0, false); s.lineTo(-0.17, 0);
      const d = new THREE.Mesh(g(new THREE.ExtrudeGeometry(s, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3 })), mt(new THREE.MeshStandardMaterial({ color: "#2A1030", roughness: 0.4 })));
      otevrena.add(d);
      const jaz = new THREE.Mesh(g(new THREE.SphereGeometry(0.075, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2)), mt(new THREE.MeshStandardMaterial({ color: "#FF7A9C", roughness: 0.5 })));
      jaz.scale.set(1.25, 0.75, 0.35); jaz.position.set(0, -0.15, 0.02); otevrena.add(jaz); }
    otevrena.position.set(0, -0.19, 0.47);
    const ocko = new THREE.Mesh(g(new THREE.TorusGeometry(0.06, 0.03, 10, 28)), mt(new THREE.MeshStandardMaterial({ color: N, roughness: 0.35 }))); ocko.scale.set(0.9, 1.15, 0.6); ocko.position.set(0, -0.27, 0.48);
    const carka = new THREE.Mesh(g(new THREE.CapsuleGeometry(0.026, 0.12, 4, 8)), mt(new THREE.MeshStandardMaterial({ color: N, roughness: 0.35 }))); carka.rotation.z = Math.PI / 2; carka.position.set(0, -0.27, 0.48);
    const smutna = new THREE.Mesh(g(new THREE.TorusGeometry(0.12, 0.032, 10, 28, Math.PI)), mt(new THREE.MeshStandardMaterial({ color: N, roughness: 0.35 }))); smutna.position.set(0, -0.32, 0.48); smutna.scale.set(1, 0.7, 0.6);
    for (const m of [otevrena, ocko, carka, smutna]) { m.visible = false; hx.body.add(m); }
    puvodni.position.z = 0.49;
    usta = { smich: puvodni, otevrena, o: ocko, carka, smutna };
    // 4) koruna a uši: uši se rozevřou, koruna sedí výš mezi nimi
    if (koruna) koruna = null;
    if (maKorunu) {
      const maUsi = !!(P.usi || P.rohy || P.antena || P.roh || P.tykadla);
      if (maUsi) {
        hx.body.traverse((ch) => {
          if (ch.type === "Group" && Math.abs(Math.abs(ch.position.x) - 0.5) < 0.02 && Math.abs(ch.position.y - 0.82) < 0.02 && ch.parent) {
            const sx = Math.sign(ch.position.x); const drzak = new THREE.Group(); drzak.position.copy(ch.position); drzak.rotation.z = -sx * 0.32; drzak.scale.setScalar(0.92);
            const rodic = ch.parent; rodic.add(drzak); drzak.add(ch); ch.position.set(0, 0, 0);
          }
        });
      }
      koruna = doplnekNaSlot(sklad, "hlava", "koruna");
      if (koruna) { hx.body.add(koruna.obj); if (maUsi) { koruna.obj.position.y = 1.1; koruna.obj.scale.setScalar(0.88); } }
    }
  }
  postav();

  // ── efekty: srdíčka, Zzz, hvězdičky, mráček ──
  const srdceTex = tx(srdceTextura()), zTex = tx(textoveSprite("Z", "#CFE0FF")), hiTex = tx(textoveSprite("hi", "#FFE08A", "900 70px 'DM Sans', system-ui, sans-serif"));
  interface Letec { s: THREE.Sprite; v: THREE.Vector3; zivot: number; max: number; vel: number }
  const letci: Letec[] = [];
  function vypust(tex: THREE.Texture, kolik: number, vel: number, max: number, rozptyl = 0.6) {
    for (let i = 0; i < kolik; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      hx.root.updateMatrixWorld(); const p = new THREE.Vector3(0, 0.95, 0.3); hx.body.localToWorld(p);
      s.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * rozptyl, Math.random() * 0.2, 0.2)); s.scale.setScalar(0.001); scene.add(s);
      letci.push({ s, v: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.7 + Math.random() * 0.4, 0), zivot: 0, max, vel });
    }
  }
  const jiskry: Castice = vytvorCastice("vybuch", meritko, ["#FFE08A", "#FFFFFF", "#FF9AC2"], 50); scene.add(jiskry.obj);
  const mracek = new THREE.Group(); mracek.visible = false; mracek.scale.setScalar(0.62); scene.add(mracek);
  { const mm = mt(new THREE.MeshPhysicalMaterial({ color: "#C9D3E6", roughness: 0.9, sheen: 1, sheenColor: new THREE.Color("#FFFFFF") }));
    for (const [x, y, r] of [[-0.22, 0, 0.17], [0, 0.07, 0.22], [0.23, 0, 0.16], [0.08, -0.06, 0.15], [-0.1, -0.06, 0.14]] as const) { const k = new THREE.Mesh(g(new THREE.SphereGeometry(r, 20, 14)), mm); k.position.set(x, y, 0); mracek.add(k); }
    const km = mt(new THREE.MeshPhysicalMaterial({ color: "#7FB8FF", roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.85 }));
    for (let i = 0; i < 5; i++) { const k = new THREE.Mesh(g(new THREE.SphereGeometry(0.025, 10, 8)), km); k.scale.y = 1.8; k.position.set(-0.2 + i * 0.1, -0.2, 0); k.userData.f = i * 0.37; mracek.add(k); } }

  // ── stav ──
  let vyraz: Vyraz = "neutral", vyrazOd = 0;
  const c = { oci: 1, skvir: 1, vicko: 0, naklonVicka: 0, oblouk: 0, obociY: 0, obociNaklon: 0, obociVid: 0, tvare: 0.85, naklon: 0, kyv: 0 };
  let cas = 0, mrk = 2.5, mrkStart = -1;
  let akce: { id: Reakce3D; start: number } | null = null;
  let chichot = -10, hladi = -10;
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  const minula = { y: 0, vy: 0, rY: 0, rX: 0 };
  const reaguj = (id: Reakce3D) => { akce = { id, start: cas }; };

  function nastavVyraz(v: Vyraz) {
    vyraz = v; vyrazOd = cas; o.onVyraz?.(v);
    if (v === "radost") { reaguj("radost"); jiskry.obj.position.set(0, 0.9, 0.4); jiskry.vystrel?.(0.8); }
    if (v === "prekvapeni") reaguj("jasot");
    if (v === "povzbuzeni") reaguj("povzbud");
  }

  // ── ovládání: pohled, ťuknutí, pohlazení ──
  let dole = false, dx = 0, dy = 0, ujeto = 0, posledniSrdce = 0;
  const naPohyb = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.45;
    look.tx = cl((e.clientX - cx) / (r.width * 0.9), -1, 1); look.ty = cl(-(e.clientY - cy) / (r.height * 0.9), -1, 1);
    if (dole && o.interaktivni) {
      ujeto += Math.hypot(e.clientX - dx, e.clientY - dy); dx = e.clientX; dy = e.clientY;
      if (ujeto > 40 && cas - posledniSrdce > 0.22) { posledniSrdce = cas; hladi = cas; vypust(srdceTex, 1, 0.28, 1.6, 0.5); }
    }
  };
  const naDolu = (e: PointerEvent) => { if (!o.interaktivni) return; dole = true; dx = e.clientX; dy = e.clientY; ujeto = 0; };
  const naNahoru = () => {
    if (!o.interaktivni || !dole) return; dole = false;
    if (ujeto < 12) {
      chichot = cas; const r = ["poskok", "pirueta", "jasot"][Math.floor(Math.random() * 3)] as Reakce3D; reaguj(r);
      vypust(hiTex, 2, 0.26, 1.1, 0.8); jiskry.obj.position.set(0, 0.6, 0.4); jiskry.vystrel?.(0.5);
    }
  };
  window.addEventListener("pointermove", naPohyb);
  canvas.addEventListener("pointerdown", naDolu);
  window.addEventListener("pointerup", naNahoru);

  function velikost() {
    studio.velikost();
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    const z = (w / h < 0.9 ? 7.6 / (w / h) * 0.9 : 7.6) / (o.zoom ?? 1);
    camera.position.set(0, 0.45, z); camera.lookAt(0, 0.35, 0); camera.updateProjectionMatrix();
    meritko.value = renderer.getDrawingBufferSize(new THREE.Vector2()).y / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }

  let raf = 0, minule = performance.now(), dalsiZ = 0;
  function snimek() {
    const ted = performance.now(), dt = Math.min(0.05, (ted - minule) / 1000); minule = ted; cas += dt;
    const k = Math.min(1, dt * 9);
    const tVyraz = cas - vyrazOd;
    const radujeSe = vyraz === "radost" || cas - chichot < 0.8 || cas - hladi < 0.5;
    // cílové hodnoty podle výrazu
    let t = { oci: 1, skvir: 1, vicko: 0, naklonVicka: 0, oblouk: 0, obociY: 0, obociNaklon: 0, obociVid: 0, tvare: 0.85, naklon: 0, kyv: 0 };
    let ust = "smich";
    if (vyraz === "prekvapeni") { t = { ...t, oci: 1.28, obociY: 0.05, obociVid: 1 }; ust = "o"; }
    if (vyraz === "povzbuzeni") { t = { ...t, skvir: 0.86, obociY: 0.035, obociNaklon: 0, obociVid: 1, naklon: 0.05 }; ust = "smich"; }
    if (vyraz === "ospaly") { t = { ...t, vicko: 0.72, tvare: 0.5, kyv: 1 }; ust = Math.sin(tVyraz * 0.9) > 0.85 ? "o" : "carka"; }
    if (vyraz === "smutny") { t = { ...t, vicko: 0.34, naklonVicka: -0.3, obociY: 0.0, obociNaklon: -0.36, obociVid: 1, tvare: 0.45, naklon: -0.04 }; ust = "smutna"; }
    if (radujeSe) { t = { ...t, oblouk: 1, vicko: 0, tvare: 1.25, obociVid: 0 }; ust = "otevrena"; }
    for (const key of Object.keys(c) as (keyof typeof c)[]) c[key] = lerp(c[key], t[key], k);
    // mrkání (ne ve spánku a v radosti)
    if (cas > mrk) { mrkStart = cas; mrk = cas + 2.5 + Math.random() * 2.5; }
    const bl = vyraz !== "ospaly" && !radujeSe && mrkStart > 0 && cas - mrkStart < 0.16 ? 1 - 0.9 * Math.sin(((cas - mrkStart) / 0.16) * Math.PI) : 1;
    // pohled
    look.x = lerp(look.x, vyraz === "smutny" ? -0.1 : look.tx, Math.min(1, dt * 6)); look.y = lerp(look.y, vyraz === "smutny" ? -0.6 : vyraz === "ospaly" ? -0.3 : look.ty, Math.min(1, dt * 6));

    let P = klid(cas, true);
    if (akce) { const a: { id: Reakce3D; start: number } = akce; const p = Math.min(1, (cas - a.start) / DELKA[a.id]); P = reakce(a.id, p, cas, P, true); if (p >= 1) akce = null; }
    const kyv = c.kyv * Math.sin(cas * 1.1) * 0.08;
    hx.root.position.y = P.y - c.kyv * 0.03; hx.root.rotation.set(P.rX - look.y * 0.12 + c.kyv * 0.05, P.rY + look.x * 0.38, 0); hx.root.scale.setScalar(P.s);
    // ťuknutí: zmáčknutí
    const tc = cas - chichot; const zm = tc < 0.6 ? Math.exp(-tc * 7) * Math.cos(tc * 26) * 0.14 : 0;
    const sy = P.sy - zm, sk = 1 / Math.sqrt(sy); hx.hips.scale.set(sk, sy, sk);
    hx.body.rotation.z = P.rZ + c.naklon + kyv;
    hx.armL.rotation.z = -P.aL; hx.armR.rotation.z = P.aR + (vyraz === "povzbuzeni" ? 1.4 + Math.sin(cas * 6) * 0.25 : 0);
    for (const ok of oci) {
      ok.g.scale.set(c.oci, c.oci * c.skvir * bl, 1);
      ok.g.position.x = (ok.g.userData.bx as number) + look.x * 0.055; ok.g.position.y = 0.1 + look.y * 0.04;
      const kul = c.oblouk < 0.5;
      for (const kk of ok.koule) kk.visible = kul;
      ok.oblouk.visible = !kul;
      ok.vicko.visible = c.vicko > 0.02 && kul;
      ok.vicko.rotation.x = lerp(-1.4, 0.6, c.vicko); ok.vicko.rotation.z = -ok.sx * c.naklonVicka;
      ok.obocí.scale.setScalar(Math.max(0.001, c.obociVid)); ok.obocí.position.y = 0.33 + c.obociY + look.y * 0.03; ok.obocí.rotation.z = Math.PI / 2 + ok.sx * c.obociNaklon;
    }
    for (const tv of tvare) (tv.material as THREE.MeshBasicMaterial).opacity = cl(c.tvare, 0, 1);
    for (const [klic, m] of Object.entries(usta)) m.visible = klic === ust;
    // Zzz a mráček
    if (vyraz === "ospaly" && cas > dalsiZ) { dalsiZ = cas + 0.9; vypust(zTex, 1, 0.34 + Math.random() * 0.12, 2.4, 0.3); }
    mracek.visible = vyraz === "smutny";
    if (mracek.visible) { hx.body.updateMatrixWorld(); const p = new THREE.Vector3(0.45, 1.3, 0.3); hx.body.localToWorld(p); mracek.position.lerp(p, 0.2); mracek.position.x += Math.sin(cas) * 0.002;
      for (const ch of mracek.children) if (ch.userData.f !== undefined) { const f = ((cas * 0.9 + (ch.userData.f as number)) % 1); ch.position.y = -0.2 - f * 0.5; (ch as THREE.Mesh).visible = f < 0.9; } }
    for (let i = letci.length - 1; i >= 0; i--) {
      const l = letci[i]; l.zivot += dt; l.s.position.addScaledVector(l.v, dt); l.v.x *= 0.98;
      const q = l.zivot / l.max; l.s.scale.setScalar(l.vel * Math.min(1, q * 6)); (l.s.material as THREE.SpriteMaterial).opacity = 1 - Math.max(0, (q - 0.6) / 0.4);
      if (l.zivot > l.max) { scene.remove(l.s); l.s.material.dispose(); letci.splice(i, 1); }
    }
    if (dt > 0) {
      const vy = (P.y - minula.y) / dt;
      hx.aktualizuj({ ay: Math.max(-40, Math.min(40, (vy - minula.vy) / dt)), wy: (P.rY - minula.rY) / dt, wx: (P.rX - minula.rX) / dt, wz: 0, cas, dt });
      minula.y = P.y; minula.vy = vy; minula.rY = P.rY; minula.rX = P.rX;
    }
    jiskry.aktualizuj(dt, cas);
    studio.render();
    raf = requestAnimationFrame(snimek);
  }
  const ro = new ResizeObserver(velikost); ro.observe(canvas); velikost();
  raf = requestAnimationFrame(snimek);

  return {
    nastav(p, kor) { podoba = p; maKorunu = kor; postav(); },
    vyraz: nastavVyraz,
    mrkni() { mrkStart = cas; },
    znic() {
      cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("pointermove", naPohyb); window.removeEventListener("pointerup", naNahoru); canvas.removeEventListener("pointerdown", naDolu);
      hx.dispose(); jiskry.dispose(); geos.forEach((x) => x.dispose()); mats.forEach((x) => x.dispose()); texs.forEach((x) => x.dispose()); studio.znic();
    },
  };
}
