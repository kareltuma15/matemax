/**
 * 3D Hexík složený z kódu (bez grafika a bez modelů ke stažení). Schválil Karel 17. 11. 2026.
 *
 * Podoby se berou ze stejného nastavení jako 2D kresba (lib/hexik-svg.ts → podobaHexika):
 * barvy, typ očí, pusa a příznaky doplňků (uši, čepice, křídla…). Každý příznak má tady svůj 3D díl,
 * takže nová 2D podoba se ve 3D objeví sama; jen nový příznak potřebuje nový díl.
 *
 * Etapy podle odhadu bodů (stejně jako ve 2D): 2 hvězdička, 3 šála, 4 zlatá aura, 5 koruna.
 */
import * as THREE from "three";
import { podobaHexika, type Podoba } from "../hexik-svg";
import { vytvorCastice, type Castice, type MeritkoCastic } from "./castice";
import {
  usi, vousky, antena, rohy, kridla, rohJednorozce, hriva, ksiltovka, plamen, vanocniCepice, kulich, medaile, tykadla, vceliKridla, sala, koruna,
  zlatoMat, doplnekNaSlot, type Doplnek, type Sklad, type Pohyb,
} from "./doplnky";

/** Doplňky na sloty (klíče z katalogu sbirka.ts). */
export type SlotyHexika = Partial<Record<"hlava" | "oci" | "krk", string>>;

const N = "#0D1B3E";

export interface HexikModel {
  root: THREE.Group;
  /** Kyčle (pivot u země) → tělo: na kyčlích je zmáčknutí, na těle náklon. */
  hips: THREE.Group;
  body: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  eyes: THREE.Group[];
  mouth: THREE.Object3D;
  stin: THREE.Mesh;
  /** Efekty mimo Hexíka (sníh kolem čepice), scéna je přidá zvlášť. */
  okoli: THREE.Object3D;
  /** Pružiny, efekty a samostatné pohyby doplňků; volá scéna každý snímek. */
  aktualizuj: (p: Pohyb) => void;
  /** Barva svitu (neon, diamant) pro bodové světlo; null = bez svitu. */
  svit: string | null;
  dispose: () => void;
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
  s.closePath();
  return s;
}

function hvezdaShape(r1: number, r2: number): THREE.Shape {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? r2 : r1, a = Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) s.moveTo(r * Math.cos(a), r * Math.sin(a)); else s.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  s.closePath();
  return s;
}

/** Duhová textura pro Duhového Hexíka (gradient přes tělo). */
function duhaTextura(): THREE.Texture {
  const c = document.createElement("canvas"); c.width = 256; c.height = 256;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 256, 256);
  ["#FF7AB8", "#FFC94D", "#6EE7A8", "#6FB6FF", "#B07CFF"].forEach((b, i) => g.addColorStop(i / 4, b));
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Materiál těla podle barvy z 2D kresby (gradienty = zlato, chrom, diamant, duha). */
function materialTela(P: Podoba): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: P.o.startsWith("url") ? "#FFFFFF" : P.o, roughness: 0.42, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  if (P.o === "url(#hxZlato)") { m.color.set("#FFC93C"); m.metalness = 0.7; m.roughness = 0.26; m.emissive.set("#A86E00"); m.emissiveIntensity = 0.45; }
  if (P.o === "url(#hxChrom)") { m.color.set("#C9D3DF"); m.metalness = 1; m.roughness = 0.12; }
  if (P.o === "url(#hxDiamant)") {
    m.color.set("#9FEAFF"); m.roughness = 0.05; m.clearcoat = 1; m.transparent = true; m.opacity = 0.7;
    m.iridescence = 1; m.iridescenceIOR = 1.6;
  }
  if (P.o === "url(#hxDuha)") { m.map = duhaTextura(); m.roughness = 0.35; m.clearcoat = 0.6; }
  if (P.svit === "hx-svit-cyan") m.emissive.set(P.o.startsWith("#") ? P.o : "#000000").multiplyScalar(0.15);
  return m;
}

/** Pomocník: standardní materiál. */
function std(barva: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) {
  return new THREE.MeshStandardMaterial({ color: barva, roughness: 0.5, ...o });
}

/**
 * Postaví Hexíka pro danou podobu a etapu. Vrací skupinu a díly pro animace.
 * Rozměry: tělo má poloměr 1 (s obrubou ~1,12), stojí nohama na y ≈ −1,4.
 */
export function postavHexika(klic: string, etapa = 1, meritko: MeritkoCastic = { value: 400 }, sloty: SlotyHexika = {}): HexikModel {
  const P = podobaHexika(klic);
  const geometrie: THREE.BufferGeometry[] = [];
  const materialy: THREE.Material[] = [];
  const textury: THREE.Texture[] = [];
  const castice: Castice[] = [];
  const g = <T extends THREE.BufferGeometry>(x: T) => { geometrie.push(x); return x; };
  const mt = <T extends THREE.Material>(x: T) => { materialy.push(x); return x; };
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material) => new THREE.Mesh(g(geo), mt(mat));

  const tmave = /^#(0|1|2)/.test(P.o) && P.o.length === 7 && parseInt(P.o.slice(1, 3), 16) < 0x40;
  const bodyMat = mt(materialTela(P));
  const innerMat = mt(std(P.i, { roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  if (P.o === "url(#hxZlato)") { innerMat.metalness = 0.25; innerMat.roughness = 0.35; innerMat.emissive.set("#5A4300"); innerMat.emissiveIntensity = 0.35; }
  if (P.o === "url(#hxChrom)") { innerMat.metalness = 0.6; innerMat.roughness = 0.25; }
  if (P.o === "url(#hxDiamant)") { innerMat.transparent = true; innerMat.opacity = 0.6; }
  if (tmave) innerMat.emissive.set(P.i).multiplyScalar(0.25);

  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = -1.22; root.add(hips);
  const body = new THREE.Group(); body.position.y = 1.22; hips.add(body);

  const telo = g(new THREE.ExtrudeGeometry(hexShape(1, 0.2), { depth: 0.55, bevelEnabled: true, bevelThickness: 0.18, bevelSize: 0.12, bevelSegments: 5, curveSegments: 10 }));
  telo.translate(0, 0, -0.275);
  body.add(new THREE.Mesh(telo, bodyMat));
  const inner = new THREE.Mesh(g(new THREE.ShapeGeometry(hexShape(0.83, 0.2), 10)), innerMat);
  inner.position.z = 0.462; body.add(inner);

  // Svítící lem (Neon, Ledový, Toxic, Diamant…)
  if (P.obrys) {
    const pts = hexShape(1.01, 0.2).getSpacedPoints(90).map((p) => new THREE.Vector3(p.x, p.y, 0.45));
    const lem = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, 0.04, 8, true), new THREE.MeshBasicMaterial({ color: P.obrys }));
    body.add(lem);
  }

  // Oči
  const eyeColor = P.oci === "neon" ? "#3DF5FF" : N;
  const eyeMat = mt(std(eyeColor, { roughness: 0.18, emissive: P.oci === "neon" ? "#3DF5FF" : "#000000", emissiveIntensity: P.oci === "neon" ? 1.2 : 0 }));
  const white = mt(new THREE.MeshBasicMaterial({ color: "#FFFFFF" }));
  const eyes: THREE.Group[] = [];
  if (P.oci === "visor") {
    const g1 = new THREE.Group(); g1.position.set(0, 0.1, 0.47); g1.userData.bx = 0;
    const v = mesh(new THREE.CapsuleGeometry(0.15, 0.62, 6, 16), std("#FF3D8B", { emissive: "#FF3D8B", emissiveIntensity: 0.6, roughness: 0.2 }));
    v.rotation.z = Math.PI / 2; v.scale.z = 0.35; g1.add(v);
    const lesk = new THREE.Mesh(g(new THREE.PlaneGeometry(0.3, 0.05)), mt(new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.6 })));
    lesk.position.set(-0.12, 0.05, 0.06); g1.add(lesk);
    body.add(g1); eyes.push(g1);
  } else {
    for (const sx of [-1, 1]) {
      const eg = new THREE.Group(); eg.position.set(sx * 0.27, 0.1, 0.45); eg.userData.bx = sx * 0.27;
      if (P.oci === "ctverec") {
        const b = mesh(new THREE.BoxGeometry(0.26, 0.26, 0.08), eyeMat); eg.add(b);
        const h = mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), new THREE.MeshBasicMaterial({ color: "#7FE3FF" })); h.position.set(-0.05, 0.05, 0.05); eg.add(h);
      } else {
        const e = new THREE.Mesh(g(new THREE.SphereGeometry(0.13, 24, 16)), eyeMat); e.scale.set(1, P.oci === "lidi" ? 1.05 : 1.25, 0.45); eg.add(e);
        if (P.oci === "neon") {
          const z = mesh(new THREE.SphereGeometry(0.055, 12, 10), std("#1A1446")); z.scale.set(1, 1.5, 0.5); z.position.z = 0.04; eg.add(z);
        } else {
          const h = new THREE.Mesh(g(new THREE.SphereGeometry(0.04, 12, 8)), white); h.position.set(0.045, P.oci === "lidi" ? 0.0 : 0.065, 0.055); eg.add(h);
        }
        if (P.oci === "lidi") {
          // „Cool“ přivřené oči: víčko v barvě obličeje a linka
          const vicko = mesh(new THREE.BoxGeometry(0.32, 0.14, 0.1), std(P.i, { roughness: 0.6 })); vicko.position.set(0, 0.1, 0.01); eg.add(vicko);
          const linka = mesh(new THREE.BoxGeometry(0.34, 0.035, 0.06), std(N)); linka.position.set(0, 0.035, 0.04); linka.rotation.z = sx * -0.08; eg.add(linka);
        }
      }
      body.add(eg); eyes.push(eg);
    }
  }

  // Pusa
  const mouthMat = mt(std(P.usta ?? N, { roughness: 0.4, emissive: P.usta && P.usta !== N ? P.usta : "#000000", emissiveIntensity: P.usta && P.usta !== N ? 0.8 : 0 }));
  let mouth: THREE.Object3D;
  if (P.rovna) {
    mouth = new THREE.Mesh(g(new THREE.CapsuleGeometry(0.03, 0.28, 4, 8)), mouthMat);
    mouth.rotation.z = Math.PI / 2; mouth.position.set(0, -0.32, 0.47);
  } else {
    mouth = new THREE.Mesh(g(new THREE.TorusGeometry(0.16, 0.034, 10, 28, Math.PI)), mouthMat);
    mouth.rotation.z = Math.PI; mouth.position.set(0, -0.24, 0.47);
  }
  mouth.userData.rovna = !!P.rovna;
  body.add(mouth);

  if (P.tvare) {
    const cm = mt(new THREE.MeshBasicMaterial({ color: "#F7A3C0", transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    for (const sx of [-1, 1]) { const c = new THREE.Mesh(g(new THREE.CircleGeometry(0.085, 20)), cm); c.position.set(sx * 0.5, -0.14, 0.466); body.add(c); }
  }

  // Ruce a nohy
  const ruka = (sx: number) => {
    const pivot = new THREE.Group(); pivot.position.set(sx * 1.0, -0.12, 0);
    const a = new THREE.Mesh(g(new THREE.SphereGeometry(0.17, 20, 14)), bodyMat); a.scale.set(0.8, 1.7, 0.8); a.position.y = -0.26; pivot.add(a);
    body.add(pivot); return pivot;
  };
  const armL = ruka(-1), armR = ruka(1);
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(g(new THREE.SphereGeometry(0.22, 20, 14)), bodyMat); f.scale.set(1.15, 0.55, 1.35); f.position.set(sx * 0.4, -1.27, 0.08); root.add(f);
  }

  // ── Doplňky podle příznaků (doplnky.ts: látky, pružiny, efekty) ───────────
  const sklad: Sklad = { g, m: mt, t: (x) => { textury.push(x); return x; } };
  const zlato = zlatoMat(sklad);
  const doplnky: Doplnek[] = [];
  const pridej = (d: Doplnek) => { body.add(d.obj); doplnky.push(d); return d; };
  let kridlaObj: THREE.Object3D[] = [];
  let plamenU: { uCas: { value: number } } | null = null;
  const jiskryBarvy: string[] = [];

  if (P.usi) pridej(usi(sklad, bodyMat, P.o === "#F08C3A" ? "#FFE3C7" : "#F7A3C0", P.o === "#F08C3A" ? "#3B2416" : undefined));
  if (P.vousy) pridej(vousky(sklad));
  if (P.antena) pridej(antena(sklad));
  if (P.srouby) {
    for (const sx of [-1, 1]) { const b = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 6), std("#6F8299", { metalness: 0.8, roughness: 0.3 })); b.rotation.x = Math.PI / 2; b.position.set(sx * 0.7, 0.0, 0.47); body.add(b); }
  }
  if (P.rohy) pridej(rohy(sklad));
  if (P.kridla) { const k = kridla(sklad, P.o.startsWith("#") ? P.o : "#5FC489"); pridej(k); kridlaObj = k.kridla; }
  if (P.roh) pridej(rohJednorozce(sklad));
  if (P.hriva) pridej(hriva(sklad));
  if (P.ksiltovka && !sloty.hlava) pridej(ksiltovka(sklad, P.o === "#5B55D6" ? "#232F55" : "#1E2A55", P.o === "#5E7148"));
  if (P.plamen && !sloty.hlava) { const pl = plamen(sklad); pridej(pl); plamenU = pl.uniforms; }
  if (P.trpyt) jiskryBarvy.push("#FFFFFF", P.o === "url(#hxDiamant)" ? "#BFF4FF" : "#FFE08A");
  if (P.cepice && !sloty.hlava) pridej(vanocniCepice(sklad, P.o === "#3FA45B" ? "#2F8F4E" : "#C8202A", P.o === "#3FA45B"));
  if (P.kulich && !sloty.hlava) pridej(kulich(sklad, P.o === "#B9D6F2" ? "#4A7FB5" : "#2E6DA4", "#E5383B"));
  if (P.medaile && !sloty.krk) pridej(medaile(sklad));
  // Doplňky ze slotů (hlava, oči, krk) na jakoukoli podobu
  for (const sl of ["hlava", "oci", "krk"] as const) { const k = sloty[sl]; if (k) { const d = doplnekNaSlot(sklad, sl, k); if (d) pridej(d); } }
  if (P.tykadla) pridej(tykadla(sklad));
  if (P.tykadla && P.pruhy) pridej(vceliKridla(sklad));
  if (P.pruhy) {
    const hw = (y: number) => 0.72 * (0.83 - Math.abs(y)) / 0.415;
    const pm = mt(new THREE.MeshBasicMaterial({ color: N, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    for (const [y1, y2] of [[-0.47, -0.55], [-0.63, -0.69]]) {
      const sh = new THREE.Shape([new THREE.Vector2(-hw(y1), y1), new THREE.Vector2(hw(y1), y1), new THREE.Vector2(hw(y2), y2), new THREE.Vector2(-hw(y2), y2)]);
      const m = new THREE.Mesh(g(new THREE.ShapeGeometry(sh)), pm); m.position.z = 0.467; body.add(m);
    }
  }

  // ── Etapy podle odhadu bodů ───────────────────────────────────────────────
  let aura: THREE.Object3D | null = null;
  if (etapa >= 2 && !P.medaile && !sloty.krk) {
    const h = new THREE.Mesh(g(new THREE.ExtrudeGeometry(hvezdaShape(0.16, 0.07), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.02, bevelSegments: 3 })), zlato);
    h.position.set(0.52, -0.42, 0.47); body.add(h);
  }
  if (etapa >= 3 && !P.medaile && !sloty.krk) pridej(sala(sklad));
  if (etapa >= 4) {
    const a = new THREE.Group(); a.position.set(0, 0.05, -0.6); body.add(a); aura = a;
    const prsten = new THREE.Mesh(g(new THREE.TorusGeometry(1.55, 0.012, 8, 96)), mt(new THREE.MeshBasicMaterial({ color: "#FFD36E", transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false })));
    a.add(prsten);
    const c = vytvorCastice("aura", meritko, ["#FFD36E", "#FFFFFF", "#F5A623"]); a.add(c.obj); castice.push(c);
  }
  // Bodové světlo jen pro studený svit (neon, led); zlatou záři dělá CSS stín kolem plátna (Hexik.tsx)
  const svit: string | null = P.svit === "hx-svit-cyan" ? (P.obrys ?? "#3DF5FF") : null;
  if (etapa >= 5 && !P.hlava && !sloty.hlava) pridej(koruna(sklad));

  // Efekty kolem: jiskry (třpyt, koruna, rolnička, medaile), sníh (zimní čepice), uhlíky (plamen)
  for (const d of doplnky) if (d.jiskry) jiskryBarvy.push(...d.jiskry);
  if (jiskryBarvy.length) { const c = vytvorCastice("jiskry", meritko, [...new Set(jiskryBarvy)], 12); body.add(c.obj); castice.push(c); }
  const okoli = new THREE.Group();
  if (doplnky.some((d) => d.okoli === "snih") || P.o === "#7CC9F0") { const c = vytvorCastice("snih", meritko, ["#FFFFFF", "#EAF6FF"]); okoli.add(c.obj); castice.push(c); }
  if (plamenU) { const c = vytvorCastice("uhliky", meritko, ["#FFB000", "#FF7A3D", "#FFE066"]); c.obj.position.set(0, 1.0, 0); body.add(c.obj); castice.push(c); }
  const pruziny = doplnky.flatMap((d) => d.pruziny);

  // Měkký stín pod Hexíkem
  const cv = document.createElement("canvas"); cv.width = cv.height = 128;
  const cx = cv.getContext("2d")!, gr = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, "rgba(13,27,62,.35)"); gr.addColorStop(0.5, "rgba(13,27,62,.15)"); gr.addColorStop(1, "rgba(13,27,62,0)");
  cx.fillStyle = gr; cx.fillRect(0, 0, 128, 128);
  const stinTex = new THREE.CanvasTexture(cv);
  const stinMat = mt(new THREE.MeshBasicMaterial({ map: stinTex, transparent: true, depthWrite: false }));
  const stin = new THREE.Mesh(g(new THREE.PlaneGeometry(2.4, 2.4)), stinMat);
  stin.rotation.x = -Math.PI / 2; stin.position.y = -1.4;

  return {
    root, hips, body, armL, armR, eyes, mouth, stin, svit, okoli,
    aktualizuj: (p) => {
      for (const z of pruziny) z.krok(p);
      for (const d of doplnky) d.krok?.(p);
      for (const c of castice) c.aktualizuj(p.dt, p.cas);
      for (const k of kridlaObj) k.rotation.y = (k.userData.sx as number) * (0.25 + 0.3 * Math.sin(p.cas * (Math.abs(p.wy) > 1 || Math.abs(p.ay) > 3 ? 14 : 3)));
      if (plamenU) plamenU.uCas.value = p.cas;
      if (aura) aura.rotation.z = p.cas * 0.4;
    },
    dispose: () => {
      castice.forEach((c) => c.dispose());
      textury.forEach((t) => t.dispose());
      geometrie.forEach((x) => x.dispose());
      materialy.forEach((x) => { const mm = x as THREE.MeshStandardMaterial; mm.map?.dispose(); x.dispose(); });
      stinTex.dispose();
    },
  };
}
