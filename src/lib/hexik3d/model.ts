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
  /** Díly, které se hýbou samy (křídla, plamen, třpyt, aura). */
  kridla: THREE.Object3D[];
  plamen: THREE.Object3D | null;
  trpyt: THREE.Object3D[];
  aura: THREE.Object3D | null;
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
  if (P.o === "url(#hxZlato)") { m.color.set("#F7BE35"); m.metalness = 0.85; m.roughness = 0.28; m.emissive.set("#7A5200"); m.emissiveIntensity = 0.45; }
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
export function postavHexika(klic: string, etapa = 1): HexikModel {
  const P = podobaHexika(klic);
  const geometrie: THREE.BufferGeometry[] = [];
  const materialy: THREE.Material[] = [];
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

  // ── Doplňky podle příznaků ────────────────────────────────────────────────
  const zlato = mt(std("#F5B623", { metalness: 0.6, roughness: 0.3, emissive: "#9A6A00", emissiveIntensity: 0.55 }));
  const kridla: THREE.Object3D[] = [];
  let plamen: THREE.Object3D | null = null;
  const trpyt: THREE.Object3D[] = [];

  if (P.usi) {
    const ruzova = mt(std("#F7A3C0", { roughness: 0.6 }));
    for (const sx of [-1, 1]) {
      const u = new THREE.Group(); u.position.set(sx * 0.52, 0.88, 0); u.rotation.z = -sx * 0.42;
      u.add(new THREE.Mesh(g(new THREE.ConeGeometry(0.24, 0.56, 20)), bodyMat));
      const vn = new THREE.Mesh(g(new THREE.ConeGeometry(0.13, 0.36, 16)), ruzova); vn.position.set(0, -0.04, 0.12); u.add(vn);
      body.add(u);
    }
  }
  if (P.vousy) {
    const vm = mt(std(N));
    for (const sx of [-1, 1]) for (const k of [-1, 1]) {
      const v = new THREE.Mesh(g(new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6)), vm);
      v.rotation.z = Math.PI / 2 + k * 0.12 * sx; v.position.set(sx * 0.78, -0.2 + k * 0.05, 0.42); body.add(v);
    }
  }
  if (P.antena) {
    const t = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), std("#6F8299", { metalness: 0.6, roughness: 0.3 })); t.position.y = 1.28; body.add(t);
    const k = mesh(new THREE.SphereGeometry(0.1, 16, 12), std("#FF5A5F", { emissive: "#FF5A5F", emissiveIntensity: 0.5 })); k.position.y = 1.52; body.add(k);
  }
  if (P.srouby) {
    for (const sx of [-1, 1]) { const b = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 6), std("#6F8299", { metalness: 0.7, roughness: 0.3 })); b.rotation.x = Math.PI / 2; b.position.set(sx * 0.7, 0.0, 0.47); body.add(b); }
  }
  if (P.rohy) {
    for (const sx of [-1, 1]) { const r = new THREE.Mesh(g(new THREE.ConeGeometry(0.11, 0.42, 14)), zlato); r.position.set(sx * 0.3, 1.12, 0); r.rotation.z = -sx * 0.35; body.add(r); }
  }
  if (P.kridla) {
    const ks = new THREE.Shape(); ks.moveTo(0, 0); ks.lineTo(0.75, 0.45); ks.lineTo(0.62, 0.05); ks.lineTo(0.8, -0.2); ks.lineTo(0, -0.3); ks.closePath();
    for (const sx of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(sx * 0.7, 0.2, -0.3);
      const w = new THREE.Mesh(g(new THREE.ExtrudeGeometry(ks, { depth: 0.04, bevelEnabled: false })), bodyMat);
      w.scale.x = sx; pivot.add(w); pivot.userData.sx = sx;
      body.add(pivot); kridla.push(pivot);
    }
  }
  if (P.roh) {
    const r = new THREE.Mesh(g(new THREE.ConeGeometry(0.1, 0.6, 20)), zlato); r.position.set(0, 1.35, 0.05); body.add(r);
  }
  if (P.hriva) {
    [["#FF9AC8", -0.45, 0.95, 0.17], ["#B79CFF", -0.7, 0.7, 0.15], ["#8ED1FF", -0.85, 0.4, 0.13], ["#FFD36E", -0.2, 1.1, 0.14]].forEach(([b, x, y, r]) => {
      const s = mesh(new THREE.SphereGeometry(r as number, 16, 12), std(b as string, { roughness: 0.55 })); s.position.set(x as number, y as number, -0.15); body.add(s);
    });
  }
  if (P.ksiltovka) {
    const c = new THREE.Group(); c.position.set(0, 0.86, 0);
    const top = mesh(new THREE.SphereGeometry(0.56, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), std(P.o === "#5E7148" ? "#3F4D2E" : N)); top.scale.set(1, 0.72, 0.95); c.add(top);
    const brim = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.045, 28, 1, false, -Math.PI / 2, Math.PI), std("#232F55")); brim.scale.set(1.2, 1, 1.5); brim.position.set(0, 0.02, 0.42); c.add(brim);
    const btn = mesh(new THREE.SphereGeometry(0.06, 12, 8), std("#F5A623")); btn.position.y = 0.41; c.add(btn);
    body.add(c);
  }
  if (P.plamen) {
    const pg = new THREE.Group(); pg.position.set(0, 1.0, 0);
    [["#FFB000", 0, 0.32, 0.6], ["#FF7A3D", -0.22, 0.24, 0.42], ["#FF7A3D", 0.22, 0.24, 0.45], ["#FFE066", 0, 0.18, 0.36]].forEach(([b, x, r, h]) => {
      const f = mesh(new THREE.ConeGeometry(r as number, h as number, 16), std(b as string, { emissive: b as string, emissiveIntensity: 0.6 })); f.position.set(x as number, (h as number) / 2, 0); pg.add(f);
    });
    body.add(pg); plamen = pg;
  }
  if (P.trpyt) {
    const sm = mt(new THREE.MeshBasicMaterial({ color: "#FFFFFF" }));
    [[-1.05, 0.75, 0.3], [1.05, 0.35, 0.3], [0.85, -0.85, 0.4]].forEach(([x, y, z], i) => {
      const s = new THREE.Mesh(g(new THREE.OctahedronGeometry(0.08)), sm); s.position.set(x, y, z); s.userData.faze = i * 1.3; body.add(s); trpyt.push(s);
    });
  }
  if (P.cepice) {
    const c = new THREE.Group(); c.position.set(0.05, 1.02, 0); c.rotation.z = -0.28;
    const k = mesh(new THREE.ConeGeometry(0.44, 0.95, 28), std(P.o === "#3FA45B" ? "#2F8F4E" : "#D93A3A")); k.position.y = 0.48; c.add(k);
    const lem = mesh(new THREE.TorusGeometry(0.43, 0.11, 12, 32), std("#FFFFFF", { roughness: 0.9 })); lem.rotation.x = Math.PI / 2; lem.position.y = 0.02; c.add(lem);
    const bam = mesh(new THREE.SphereGeometry(0.12, 16, 12), std("#FFFFFF", { roughness: 0.9 })); bam.position.y = 0.98; c.add(bam);
    body.add(c);
  }
  if (P.kulich) {
    const c = new THREE.Group(); c.position.set(0, 0.92, 0);
    const k = mesh(new THREE.SphereGeometry(0.52, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), std("#2E6DA4", { roughness: 0.85 })); k.scale.set(1, 1.05, 0.95); c.add(k);
    const pas = mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.16, 28), std("#E5383B", { roughness: 0.85 })); pas.scale.z = 0.95; c.add(pas);
    const bam = mesh(new THREE.SphereGeometry(0.15, 16, 12), std("#FFFFFF", { roughness: 0.95 })); bam.position.y = 0.6; c.add(bam);
    body.add(c);
  }
  if (P.medaile) {
    const c = new THREE.Group(); c.position.set(0, -0.05, 0.47);
    const stuha = mesh(new THREE.TorusGeometry(0.46, 0.04, 8, 36, Math.PI), std("#2E6DA4")); stuha.rotation.z = Math.PI; c.add(stuha);
    const disk = new THREE.Mesh(g(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 32)), zlato); disk.rotation.x = Math.PI / 2; disk.position.set(0, -0.56, 0.02); c.add(disk);
    body.add(c);
  }
  if (P.tykadla) {
    for (const sx of [-1, 1]) {
      const t = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), std(N)); t.position.set(sx * 0.3, 1.25, 0); t.rotation.z = -sx * 0.45; body.add(t);
      const k = mesh(new THREE.SphereGeometry(0.1, 14, 10), std(N)); k.position.set(sx * 0.52, 1.47, 0); body.add(k);
    }
  }
  if (P.pruhy) {
    const hw = (y: number) => 0.72 * (0.83 - Math.abs(y)) / 0.415;
    const pm = mt(new THREE.MeshBasicMaterial({ color: N, transparent: true, opacity: 0.85, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    for (const [y1, y2] of [[-0.47, -0.55], [-0.63, -0.69]]) {
      const s = new THREE.Shape([new THREE.Vector2(-hw(y1), y1), new THREE.Vector2(hw(y1), y1), new THREE.Vector2(hw(y2), y2), new THREE.Vector2(-hw(y2), y2)]);
      const m = new THREE.Mesh(g(new THREE.ShapeGeometry(s)), pm); m.position.z = 0.467; body.add(m);
    }
  }

  // ── Etapy podle odhadu bodů ───────────────────────────────────────────────
  let aura: THREE.Object3D | null = null;
  if (etapa >= 2) {
    const h = new THREE.Mesh(g(new THREE.ExtrudeGeometry(hvezdaShape(0.16, 0.07), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 2 })), zlato);
    h.position.set(0.52, -0.42, 0.47); body.add(h);
  }
  if (etapa >= 3) {
    const sala = mt(std("#E0565B", { roughness: 0.8 }));
    const t = new THREE.Mesh(g(new THREE.TorusGeometry(0.56, 0.085, 12, 40)), sala); t.rotation.x = Math.PI / 2; t.scale.set(1.12, 0.92, 1); t.position.y = -0.74; body.add(t);
    const konec = new THREE.Mesh(g(new THREE.BoxGeometry(0.16, 0.42, 0.08)), sala); konec.position.set(0.32, -0.95, 0.52); konec.rotation.z = 0.15; body.add(konec);
  }
  if (etapa >= 4) {
    const a = new THREE.Group();
    const km = mt(new THREE.MeshBasicMaterial({ color: "#F5A623", transparent: true, opacity: 0.8 }));
    for (let i = 0; i < 18; i++) { const k = new THREE.Mesh(g(new THREE.SphereGeometry(0.045, 8, 6)), km); const u = (i / 18) * Math.PI * 2; k.position.set(Math.cos(u) * 1.55, Math.sin(u) * 1.55, 0); a.add(k); }
    a.position.set(0, 0.05, -0.6); body.add(a); aura = a;
  }
  // Bodové světlo jen pro studený svit (neon, led); zlatou záři dělá CSS stín kolem plátna (Hexik.tsx)
  const svit: string | null = P.svit === "hx-svit-cyan" ? (P.obrys ?? "#3DF5FF") : null;
  if (etapa >= 5) {
    if (!P.hlava) {
      const k = new THREE.Group(); k.position.set(0, 1.02, 0);
      const ring = new THREE.Mesh(g(new THREE.CylinderGeometry(0.36, 0.4, 0.2, 32, 1, true)), zlato); (ring.material as THREE.Material).side = THREE.DoubleSide; k.add(ring);
      for (let i = 0; i < 6; i++) {
        const u = (i / 6) * Math.PI * 2;
        const sp = new THREE.Mesh(g(new THREE.ConeGeometry(0.08, 0.24, 10)), zlato); sp.position.set(Math.sin(u) * 0.37, 0.2, Math.cos(u) * 0.37); k.add(sp);
      }
      const drahokam = mesh(new THREE.SphereGeometry(0.06, 12, 8), std("#E5484D", { roughness: 0.1 })); drahokam.position.set(0, 0, 0.41); k.add(drahokam);
      body.add(k);
    }
  }

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
    root, hips, body, armL, armR, eyes, mouth, stin, kridla, plamen, trpyt, aura, svit,
    dispose: () => {
      geometrie.forEach((x) => x.dispose());
      materialy.forEach((x) => { const mm = x as THREE.MeshStandardMaterial; mm.map?.dispose(); x.dispose(); });
      stinTex.dispose();
    },
  };
}
