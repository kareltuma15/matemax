/**
 * Doplňky 3D Hexíka ve vyšší kvalitě (Karel 18. 11. 2026: „doplňky musí být stejně krásné jako Hexík“).
 *
 * Tři věci, díky kterým nevypadají jako kužely a koule:
 *  1) Látky: samet (sheen), pletení (reliéf z textury), chlupaté bambulky a lemy (zvlněná geometrie).
 *  2) Pružiny: čepice, bambulky, hříva, tykadla, šála a medaile se zhoupnou, když Hexík skočí nebo se otočí.
 *  3) Efekty: sníh, jiskry, uhlíky a živý plamen (castice.ts, shader plamene níže).
 *
 * Všechno je z kódu, textury se kreslí do <canvas>, nic se nestahuje.
 */
import * as THREE from "three";

// ── Pomocné geometrie a textury ─────────────────────────────────────────────

/** Hladký „šum“ z několika sinusovek (stačí na chlupy a látku, je rychlý a deterministický). */
function sum3(x: number, y: number, z: number, s = 0): number {
  return 0.5 * Math.sin(7.1 * x + 1.3 + s) * Math.sin(6.7 * y + 2.1 + s) * Math.sin(7.3 * z + 0.7)
    + 0.3 * Math.sin(13.7 * x + 4.1) * Math.sin(12.9 * y + 0.4 + s) * Math.sin(14.3 * z + 2.9)
    + 0.2 * Math.sin(27.1 * x + 2.2 + s) * Math.sin(25.3 * y + 1.7) * Math.sin(26.9 * z + 0.3);
}

/** Chlupatá koule (bambulka, chomáček): ikosaedr se zvlněným povrchem. */
export function chlupataKoule(r: number, sila = 0.22, detail = 4): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    const k = 1 + sila * sum3(v.x * 2, v.y * 2, v.z * 2) + sila * 0.35 * Math.sin(v.x * 41 + v.y * 37 + v.z * 29);
    v.multiplyScalar(r * k);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Chlupatý lem (vánoční čepice): torus, jehož trubka je zvlněná. */
export function chlupatyLem(R: number, tube: number, sila = 0.35): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(R, tube, 18, 72);
  const p = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(v.x, v.y, 0).setLength(R);
    const d = v.clone().sub(c);
    const k = 1 + sila * sum3(v.x * 1.6, v.y * 1.6, v.z * 3, 1.1);
    d.multiplyScalar(k);
    p.setXYZ(i, c.x + d.x, c.y + d.y, c.z + d.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Trubka s proměnnou tloušťkou podél křivky (rohy, tykadla, prsty křídel, prameny hřívy). */
export function trubka(krivka: THREE.Curve<THREE.Vector3>, r: (t: number) => number, delka = 24, obvod = 12): THREE.BufferGeometry {
  const fr = krivka.computeFrenetFrames(delka, false);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= delka; i++) {
    const t = i / delka, P = krivka.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], rr = Math.max(0.0005, r(t));
    for (let j = 0; j <= obvod; j++) {
      const u = (j / obvod) * Math.PI * 2, cs = Math.cos(u), sn = Math.sin(u);
      const nx = cs * N.x + sn * B.x, ny = cs * N.y + sn * B.y, nz = cs * N.z + sn * B.z;
      pos.push(P.x + rr * nx, P.y + rr * ny, P.z + rr * nz); nor.push(nx, ny, nz); uv.push(t, j / obvod);
    }
  }
  for (let i = 0; i < delka; i++) for (let j = 0; j < obvod; j++) {
    const a = i * (obvod + 1) + j, b = a + obvod + 1;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

function platno(w: number, h: number, kresli: (x: CanvasRenderingContext2D) => void, barevna = true, opakovat: [number, number] = [1, 1]): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  kresli(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  if (barevna) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(opakovat[0], opakovat[1]);
  t.anisotropy = 4;
  return t;
}

/** Reliéf pleteniny (řady „véček“) pro bumpMap. */
export function texturaPleteni(opakovat: [number, number]): THREE.CanvasTexture {
  return platno(64, 64, (x) => {
    x.fillStyle = "#808080"; x.fillRect(0, 0, 64, 64);
    for (let r = 0; r < 4; r++) for (let s = 0; s < 4; s++) {
      const ox = s * 16, oy = r * 16;
      const g = x.createLinearGradient(ox, oy, ox + 8, oy + 16);
      g.addColorStop(0, "#d8d8d8"); g.addColorStop(1, "#404040");
      x.fillStyle = g;
      x.beginPath(); x.moveTo(ox, oy); x.quadraticCurveTo(ox + 4, oy + 10, ox + 8, oy + 16); x.lineTo(ox + 8, oy + 10); x.quadraticCurveTo(ox + 5, oy + 5, ox + 2, oy); x.fill();
      x.beginPath(); x.moveTo(ox + 16, oy); x.quadraticCurveTo(ox + 12, oy + 10, ox + 8, oy + 16); x.lineTo(ox + 8, oy + 10); x.quadraticCurveTo(ox + 11, oy + 5, ox + 14, oy); x.fill();
    }
  }, false, opakovat);
}

/** Svislé žebrování (lem kulicha, šála). */
export function texturaZebra(opakovat: [number, number]): THREE.CanvasTexture {
  return platno(32, 8, (x) => {
    const g = x.createLinearGradient(0, 0, 32, 0);
    for (let i = 0; i <= 4; i++) { g.addColorStop(i / 4, i % 2 ? "#303030" : "#e0e0e0"); }
    x.fillStyle = g; x.fillRect(0, 0, 32, 8);
  }, false, opakovat);
}

/** Severský vzor kulicha (pruhy, vločky, zubatý pás). */
function texturaKulich(zaklad: string, pruh: string, bila: string): THREE.CanvasTexture {
  return platno(512, 256, (x) => {
    x.fillStyle = zaklad; x.fillRect(0, 0, 512, 256);
    x.fillStyle = bila; x.fillRect(0, 150, 512, 10); x.fillRect(0, 214, 512, 10);
    x.fillStyle = pruh; x.fillRect(0, 164, 512, 46);
    x.fillStyle = bila;
    for (let i = 0; i < 16; i++) {
      const cx = i * 32 + 16, cy = 187;
      x.fillRect(cx - 2, cy - 14, 4, 28); x.fillRect(cx - 14, cy - 2, 28, 4);
      x.save(); x.translate(cx, cy); x.rotate(Math.PI / 4); x.fillRect(-2, -10, 4, 20); x.fillRect(-10, -2, 20, 4); x.restore();
    }
    for (let i = 0; i < 32; i++) { x.beginPath(); x.moveTo(i * 16, 150); x.lineTo(i * 16 + 8, 138); x.lineTo(i * 16 + 16, 150); x.fill(); }
    for (let i = 0; i < 64; i++) { x.fillRect(i * 8 + 2, 100 + (i % 2) * 8, 4, 4); }
  }, true, [1, 1]);
}

/** Maskáčový vzor. */
function texturaMaskac(): THREE.CanvasTexture {
  return platno(256, 256, (x) => {
    x.fillStyle = "#5E7148"; x.fillRect(0, 0, 256, 256);
    const barvy = ["#3F4D2E", "#8A7A52", "#2C3520", "#71865A"];
    let s = 7;
    const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < 70; i++) {
      x.fillStyle = barvy[i % barvy.length];
      x.beginPath();
      const cx = r() * 256, cy = r() * 256, rr = 10 + r() * 22;
      for (let k = 0; k < 9; k++) { const u = (k / 9) * Math.PI * 2, q = rr * (0.6 + r() * 0.6); x.lineTo(cx + Math.cos(u) * q, cy + Math.sin(u) * q); }
      x.fill();
    }
  }, true, [2, 1]);
}

/** Pruhovaná stuha (medaile). */
function texturaStuha(a: string, b: string): THREE.CanvasTexture {
  return platno(64, 8, (x) => {
    x.fillStyle = a; x.fillRect(0, 0, 64, 8);
    x.fillStyle = b; x.fillRect(22, 0, 20, 8);
    x.fillStyle = "rgba(255,255,255,.7)"; x.fillRect(29, 0, 6, 8);
  }, true, [1, 1]);
}

/** Pruhy šály. */
function texturaSala(a: string, b: string): THREE.CanvasTexture {
  return platno(16, 64, (x) => {
    x.fillStyle = a; x.fillRect(0, 0, 16, 64);
    x.fillStyle = b; x.fillRect(0, 10, 16, 8); x.fillRect(0, 40, 16, 8);
  }, true, [6, 1]);
}

// ── Pružiny ─────────────────────────────────────────────────────────────────

/** Pohyb těla, na který doplňky reagují (počítá scéna z pózy). */
export interface Pohyb { ay: number; wx: number; wy: number; wz: number; cas: number; dt: number }

export class Pruzina {
  ax = 0; az = 0; vx = 0; vz = 0;
  /** Jednorázový „ťuk“ (cuknutí uchem, cinknutí rolničky). */
  kopni(x: number, z: number) { this.vx += x; this.vz += z; }
  constructor(
    public obj: THREE.Object3D,
    /** Síla reakce na pohyb (konec řetězu víc než začátek). */
    public vliv = 1,
    public tuhost = 55,
    public tlumeni = 6,
    /** Směr ohybu (čepice ohnutá doprava = 1): dopad těla ji ohne víc. */
    public ohyb = 0,
    public faze = Math.random() * 6,
  ) { this.zx = obj.rotation.x; this.zz = obj.rotation.z; }
  zx: number; zz: number;
  krok(p: Pohyb) {
    const tx = Math.max(-0.9, Math.min(0.9, (-p.ay * 0.012 - p.wx * 0.05) * this.vliv + 0.03 * Math.sin(p.cas * 1.3 + this.faze) * this.vliv));
    const tz = Math.max(-0.9, Math.min(0.9, (-p.wy * 0.07 - p.wz * 0.5 - this.ohyb * p.ay * 0.014) * this.vliv + 0.04 * Math.sin(p.cas * 1.1 + this.faze * 1.7) * this.vliv));
    const kroky = p.dt > 0.025 ? 2 : 1, h = p.dt / kroky;
    for (let i = 0; i < kroky; i++) {
      this.vx += (-(this.ax - tx) * this.tuhost - this.vx * this.tlumeni) * h; this.ax += this.vx * h;
      this.vz += (-(this.az - tz) * this.tuhost - this.vz * this.tlumeni) * h; this.az += this.vz * h;
    }
    this.obj.rotation.x = this.zx + this.ax;
    this.obj.rotation.z = this.zz + this.az;
  }
}

// ── Materiály ───────────────────────────────────────────────────────────────

export interface Sklad { g: <T extends THREE.BufferGeometry>(x: T) => T; m: <T extends THREE.Material>(x: T) => T; t: (x: THREE.Texture) => THREE.Texture }

const samet = (s: Sklad, barva: string, lesk = "#FFFFFF") => s.m(new THREE.MeshPhysicalMaterial({ color: barva, roughness: 0.78, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(lesk).lerp(new THREE.Color(barva), 0.4) }));
const chlupy = (s: Sklad, barva = "#FFFFFF") => s.m(new THREE.MeshPhysicalMaterial({ color: barva, roughness: 1, sheen: 1, sheenRoughness: 0.8, sheenColor: new THREE.Color("#FFFFFF") }));
export const zlatoMat = (s: Sklad) => s.m(new THREE.MeshPhysicalMaterial({ color: "#FFC93C", metalness: 0.7, roughness: 0.26, clearcoat: 0.8, clearcoatRoughness: 0.15, emissive: "#A86E00", emissiveIntensity: 0.55 }));
const drahokam = (s: Sklad, barva: string) => s.m(new THREE.MeshPhysicalMaterial({ color: barva, roughness: 0.04, metalness: 0.1, clearcoat: 1, iridescence: 0.4, emissive: barva, emissiveIntensity: 0.25 }));

// ── Doplňky ─────────────────────────────────────────────────────────────────

export interface Doplnek {
  obj: THREE.Object3D;
  pruziny: Pruzina[];
  /** Co se má hýbat samo (rolnička, cukání uší, žárovka…). */
  krok?: (p: Pohyb) => void;
  /** Efekt kolem (sníh u čepice…), přidá se do scény mimo Hexíka. */
  okoli?: "snih";
  jiskry?: string[];
}

/** Vánoční čepice: měkká, ohnutá a pružná (6 dílů), chlupatý lem a bambulka; skřítek má rolničku. */
export function vanocniCepice(s: Sklad, barva: string, rolnicka: boolean): Doplnek {
  const zaklad = new THREE.Group(); zaklad.position.set(0.02, 0.98, 0); zaklad.rotation.z = -0.12;
  const pruziny: Pruzina[] = [];
  const latka = samet(s, barva);
  const N = 7, H = 1.2, h = H / N;
  const r = (t: number) => 0.44 * Math.pow(1 - t, 0.85) + 0.035;
  let rodic: THREE.Object3D = zaklad;
  for (let i = 0; i < N; i++) {
    const seg = new THREE.Group();
    seg.position.y = i === 0 ? 0.04 : h;
    seg.rotation.z = i === 0 ? 0 : -0.06 - i * 0.045; // čím výš, tím víc padá na stranu
    seg.rotation.x = i === 0 ? 0 : 0.04;
    const geo = s.g(new THREE.CylinderGeometry(r((i + 1) / N), r(i / N), h * 1.04, 28, 2, true));
    // jemné záhyby látky
    const p = geo.attributes.position, v = new THREE.Vector3();
    for (let k = 0; k < p.count; k++) {
      v.fromBufferAttribute(p, k);
      const u = Math.atan2(v.z, v.x), q = 1 + 0.05 * Math.sin(u * 5 + i * 0.9) * (1 - i / N);
      p.setXYZ(k, v.x * q, v.y, v.z * q);
    }
    geo.computeVertexNormals(); geo.translate(0, h / 2, 0);
    const m = new THREE.Mesh(geo, latka); seg.add(m);
    // kloub mezi díly: při ohybu nejsou vidět mezery
    if (i > 0) { const kl = new THREE.Mesh(s.g(new THREE.SphereGeometry(r(i / N) * 1.0, 24, 12)), latka); kl.scale.y = 0.55; seg.add(kl); }
    // vnitřek (čepice je dutá, zespodu je vidět podšívka)
    if (i === 0) { const pod = new THREE.Mesh(s.g(new THREE.CircleGeometry(r(0), 28)), samet(s, "#7A1A1A")); pod.rotation.x = Math.PI / 2; seg.add(pod); }
    rodic.add(seg); rodic = seg;
    pruziny.push(new Pruzina(seg, 0.18 + i * 0.09, 75 - i * 5, 5.5 + i * 0.3, 1, i * 0.4));
  }
  const spicka = new THREE.Group(); spicka.position.y = h; rodic.add(spicka);
  let krok: Doplnek["krok"];
  if (rolnicka) {
    const zav = new THREE.Group(); spicka.add(zav);
    const prof = [new THREE.Vector2(0.001, -0.1), new THREE.Vector2(0.11, -0.1), new THREE.Vector2(0.095, -0.07), new THREE.Vector2(0.085, 0.0), new THREE.Vector2(0.05, 0.05), new THREE.Vector2(0.001, 0.06)];
    const zvon = new THREE.Mesh(s.g(new THREE.LatheGeometry(prof, 24)), zlatoMat(s)); zvon.position.y = -0.1; zav.add(zvon);
    const srdce = new THREE.Mesh(s.g(new THREE.SphereGeometry(0.035, 12, 8)), zlatoMat(s)); srdce.position.y = -0.21; zav.add(srdce);
    const pz = new Pruzina(zav, 1.6, 40, 3.5, 0, 1); pruziny.push(pz);
    let dalsi = 2;
    krok = (p) => { if (p.cas > dalsi) { pz.kopni(0, 3 * (Math.random() - 0.5)); dalsi = p.cas + 2.5 + Math.random() * 3; } };
  } else {
    const bam = new THREE.Mesh(s.g(chlupataKoule(0.14, 0.28)), chlupy(s)); bam.position.y = 0.06; spicka.add(bam);
  }
  const lem = new THREE.Mesh(s.g(chlupatyLem(0.45, 0.13)), chlupy(s)); lem.rotation.x = Math.PI / 2; lem.position.y = 0.04; zaklad.add(lem);
  return { obj: zaklad, pruziny, krok, okoli: "snih", jiskry: rolnicka ? ["#FFE08A", "#FFFFFF"] : undefined };
}

/** Zimní kulich se severským vzorem, žebrovaným lemem a pružnou chlupatou bambulkou. */
export function kulich(s: Sklad, zaklad: string, pruh: string): Doplnek {
  const c = new THREE.Group(); c.position.set(0, 0.86, 0);
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) { const a = (i / 16) * (Math.PI / 2); prof.push(new THREE.Vector2(Math.cos(a) * 0.54 + 0.001, 0.06 + Math.sin(a) * 0.62)); }
  const mapa = s.t(texturaKulich(zaklad, pruh, "#FFFFFF")) as THREE.CanvasTexture;
  const bump = s.t(texturaPleteni([18, 6]));
  const vrch = new THREE.Mesh(s.g(new THREE.LatheGeometry(prof, 48)), s.m(new THREE.MeshPhysicalMaterial({ map: mapa, bumpMap: bump, bumpScale: 2.2, roughness: 0.9, sheen: 0.35, sheenRoughness: 0.7, sheenColor: new THREE.Color("#CFE3FF") })));
  vrch.scale.z = 0.94; c.add(vrch);
  // Ohrnutý lem
  const lemProf = [new THREE.Vector2(0.53, -0.1), new THREE.Vector2(0.58, -0.08), new THREE.Vector2(0.6, 0.0), new THREE.Vector2(0.6, 0.1), new THREE.Vector2(0.58, 0.16), new THREE.Vector2(0.54, 0.17)];
  const lem = new THREE.Mesh(s.g(new THREE.LatheGeometry(lemProf, 48)), s.m(new THREE.MeshPhysicalMaterial({ color: pruh, bumpMap: s.t(texturaZebra([24, 1])), bumpScale: 3, roughness: 0.95, sheen: 0.6, sheenColor: new THREE.Color("#FFFFFF") })));
  lem.scale.z = 0.94; c.add(lem);
  const drzak = new THREE.Group(); drzak.position.y = 0.66; c.add(drzak);
  const bam = new THREE.Mesh(s.g(chlupataKoule(0.17, 0.3)), chlupy(s)); bam.position.y = 0.1; drzak.add(bam);
  return { obj: c, pruziny: [new Pruzina(drzak, 1.3, 45, 4)], okoli: "snih" };
}

/** Kšiltovka: šité díly, prohnutý kšilt, knoflík a vyšité logo (maskáč má maskovací vzor). */
export function ksiltovka(s: Sklad, barva: string, maskac: boolean): Doplnek {
  const c = new THREE.Group(); c.position.set(0, 0.8, 0); c.rotation.x = -0.08;
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 14; i++) { const a = (i / 14) * (Math.PI / 2); prof.push(new THREE.Vector2(Math.cos(a) * 0.63 + 0.001, Math.sin(a) * 0.56)); }
  const svy = s.t(platno(256, 64, (x) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, 256, 64);
    x.fillStyle = "#9a9a9a"; for (let i = 0; i < 6; i++) x.fillRect(i * 42.6, 0, 3, 64);
    x.fillStyle = "#c8c8c8"; for (let i = 0; i < 6; i++) for (let k = 0; k < 16; k++) { x.fillRect(i * 42.6 + 6, k * 4, 1, 2); x.fillRect(i * 42.6 - 4, k * 4, 1, 2); }
  }, false));
  const mat = maskac
    ? s.m(new THREE.MeshPhysicalMaterial({ map: s.t(texturaMaskac()), bumpMap: svy, bumpScale: 1.5, roughness: 0.85, sheen: 0.5, sheenColor: new THREE.Color("#BFD0A0") }))
    : s.m(new THREE.MeshPhysicalMaterial({ color: barva, bumpMap: svy, bumpScale: 1.5, roughness: 0.75, sheen: 1, sheenRoughness: 0.4, sheenColor: new THREE.Color("#9C98FF") }));
  const vrch = new THREE.Mesh(s.g(new THREE.LatheGeometry(prof, 48)), mat); c.add(vrch);
  // Prohnutý kšilt
  const ks = new THREE.Shape();
  ks.moveTo(-0.5, 0); ks.quadraticCurveTo(-0.52, 0.42, 0, 0.5); ks.quadraticCurveTo(0.52, 0.42, 0.5, 0); ks.quadraticCurveTo(0, 0.12, -0.5, 0);
  const kg = s.g(new THREE.ExtrudeGeometry(ks, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 16 }));
  const p = kg.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, p.getZ(i) - 0.22 * x * x - 0.05 * y); }
  kg.computeVertexNormals();
  const kstilt = new THREE.Mesh(kg, maskac ? s.m(new THREE.MeshPhysicalMaterial({ color: "#2C3520", roughness: 0.8, sheen: 0.4, sheenColor: new THREE.Color("#8A9A70") })) : s.m(new THREE.MeshPhysicalMaterial({ color: "#F5A623", roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color("#FFE0A0") })));
  kstilt.rotation.x = -Math.PI / 2 + 0.42; kstilt.position.set(0, 0.06, 0.5); kstilt.scale.set(1.1, 1, 1); c.add(kstilt);
  const knof = new THREE.Mesh(s.g(new THREE.SphereGeometry(0.06, 16, 10)), maskac ? mat : s.m(new THREE.MeshStandardMaterial({ color: "#F5A623", roughness: 0.4 }))); knof.position.y = 0.55; knof.scale.y = 0.6; c.add(knof);
  // Vyšité zlaté logo (šestiúhelník)
  const hs = new THREE.Shape();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + (i * Math.PI) / 3; if (i === 0) hs.moveTo(Math.cos(a) * 0.09, Math.sin(a) * 0.09); else hs.lineTo(Math.cos(a) * 0.09, Math.sin(a) * 0.09); }
  const logo = new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(hs, { depth: 0.015, bevelEnabled: false })), zlatoMat(s));
  logo.position.set(0, 0.27, 0.56); logo.rotation.x = -0.5; c.add(logo);
  return { obj: c, pruziny: [] };
}

/** Koruna (5. etapa): zlatá obruč s hroty, sametová výplň a broušené drahokamy, které se třpytí. */
export function koruna(s: Sklad): Doplnek {
  const k = new THREE.Group(); k.position.set(0, 1.0, 0);
  const zl = zlatoMat(s);
  const prof = [new THREE.Vector2(0.37, 0), new THREE.Vector2(0.4, 0.0), new THREE.Vector2(0.43, 0.22), new THREE.Vector2(0.4, 0.24), new THREE.Vector2(0.37, 0.02)];
  k.add(new THREE.Mesh(s.g(new THREE.LatheGeometry(prof, 48)), zl));
  const vypln = new THREE.Mesh(s.g(new THREE.SphereGeometry(0.39, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), samet(s, "#B3123A", "#FF8FB0"));
  vypln.scale.y = 0.75; vypln.position.y = 0.06; k.add(vypln);
  const barvy = ["#E5484D", "#3DA5FF", "#2FD27A", "#B07CFF", "#FFD24D"];
  for (let i = 0; i < 5; i++) {
    const u = (i / 5) * Math.PI * 2;
    const hrot = new THREE.Group(); hrot.position.set(Math.sin(u) * 0.41, 0.22, Math.cos(u) * 0.41); hrot.rotation.set(Math.cos(u) * 0.12, 0, -Math.sin(u) * 0.12);
    const kz = new THREE.Mesh(s.g(new THREE.ConeGeometry(0.075, 0.26, 16)), zl); kz.position.y = 0.12; hrot.add(kz);
    const kul = new THREE.Mesh(s.g(new THREE.SphereGeometry(0.045, 14, 10)), zl); kul.position.y = 0.27; hrot.add(kul);
    k.add(hrot);
    const gem = new THREE.Mesh(s.g(new THREE.OctahedronGeometry(0.055, 0)), drahokam(s, barvy[i])); gem.position.set(Math.sin(u) * 0.425, 0.11, Math.cos(u) * 0.425); gem.lookAt(Math.sin(u) * 2, 0.11, Math.cos(u) * 2); gem.scale.set(1, 1.2, 0.6); k.add(gem);
  }
  return { obj: k, pruziny: [], jiskry: ["#FFFFFF", "#FFE08A"] };
}

/** Uši (kočička, lišák): oblé, s chlupatým vnitřkem; občas cuknou. */
export function usi(s: Sklad, telo: THREE.Material, vnitrek: string, spicky?: string): Doplnek {
  const g = new THREE.Group();
  const pruziny: Pruzina[] = [];
  const tvar = new THREE.Shape(); tvar.moveTo(-0.21, 0); tvar.quadraticCurveTo(-0.24, 0.36, -0.02, 0.56); tvar.quadraticCurveTo(0.04, 0.58, 0.07, 0.5); tvar.quadraticCurveTo(0.24, 0.3, 0.21, 0); tvar.closePath();
  const vn = new THREE.Shape(); vn.moveTo(-0.12, 0.05); vn.quadraticCurveTo(-0.14, 0.3, -0.01, 0.43); vn.quadraticCurveTo(0.13, 0.27, 0.12, 0.05); vn.closePath();
  const ext = { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.035, bevelSegments: 4, curveSegments: 14 };
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.5, 0.82, -0.05); pivot.rotation.z = -sx * 0.38;
    const u = new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(tvar, ext)), telo); u.position.z = -0.04; pivot.add(u);
    const v = new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(vn, { ...ext, depth: 0.02, bevelThickness: 0.02 })), chlupy(s, vnitrek)); v.position.z = 0.06; pivot.add(v);
    if (spicky) { const sp = new THREE.Mesh(s.g(chlupataKoule(0.07, 0.25, 2)), chlupy(s, spicky)); sp.position.set(0.0, 0.5, 0.02); sp.scale.set(1, 0.8, 0.8); pivot.add(sp); }
    g.add(pivot);
    pruziny.push(new Pruzina(pivot, 0.35, 120, 9));
  }
  let dalsi = 2.5;
  const krok = (p: Pohyb) => { if (p.cas > dalsi) { const z = pruziny[Math.random() < 0.5 ? 0 : 1]; z.kopni(-2.5, 0); dalsi = p.cas + 3 + Math.random() * 4; } };
  return { obj: g, pruziny, krok };
}

/** Kočičí vousky: tenké, mírně prohnuté, pružné. */
export function vousky(s: Sklad): Doplnek {
  const g = new THREE.Group(); const pruziny: Pruzina[] = [];
  const mat = s.m(new THREE.MeshStandardMaterial({ color: "#0D1B3E", roughness: 0.5 }));
  for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.62, -0.18 + k * 0.05, 0.46);
    const kr = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(sx * 0.2, 0.02 + k * 0.03, 0.02), new THREE.Vector3(sx * 0.42, -0.01 + k * 0.08, 0));
    pivot.add(new THREE.Mesh(s.g(trubka(kr, (t) => 0.012 * (1 - t) + 0.003, 12, 6)), mat));
    g.add(pivot); pruziny.push(new Pruzina(pivot, 0.5, 90, 6));
  }
  return { obj: g, pruziny };
}

/** Anténa robůtka: pérko, které se houpe, a žárovka, která bliká. */
export function antena(s: Sklad): Doplnek {
  const pivot = new THREE.Group(); pivot.position.y = 1.08;
  const body: THREE.Vector3[] = [];
  for (let i = 0; i <= 80; i++) { const t = i / 80, u = t * Math.PI * 2 * 5; body.push(new THREE.Vector3(Math.cos(u) * 0.045, t * 0.38, Math.sin(u) * 0.045)); }
  const pero = new THREE.Mesh(s.g(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(body), 200, 0.012, 6)), s.m(new THREE.MeshStandardMaterial({ color: "#9FB3C8", metalness: 0.9, roughness: 0.25 })));
  pivot.add(pero);
  const pat = new THREE.Mesh(s.g(new THREE.CylinderGeometry(0.08, 0.1, 0.06, 20)), s.m(new THREE.MeshStandardMaterial({ color: "#6F8299", metalness: 0.8, roughness: 0.3 }))); pivot.add(pat);
  const zarMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#FF5A5F", emissive: "#FF2A30", emissiveIntensity: 1, roughness: 0.1, clearcoat: 1, transparent: true, opacity: 0.92 }));
  const zar = new THREE.Mesh(s.g(new THREE.SphereGeometry(0.1, 20, 14)), zarMat); zar.position.y = 0.46; pivot.add(zar);
  const pz = new Pruzina(pivot, 1.2, 35, 3);
  return { obj: pivot, pruziny: [pz], krok: (p) => { zarMat.emissiveIntensity = 0.5 + 0.9 * (0.5 + 0.5 * Math.sin(p.cas * 4)); } };
}

/** Dračí rohy: prohnuté, zužující se, s rýhami. */
export function rohy(s: Sklad): Doplnek {
  const g = new THREE.Group();
  const mat = s.m(new THREE.MeshPhysicalMaterial({ color: "#F7DC8A", roughness: 0.38, metalness: 0, clearcoat: 0.8, sheen: 0.4, sheenColor: new THREE.Color("#FFFFFF") }));
  for (const sx of [-1, 1]) {
    const kr = new THREE.CubicBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(sx * 0.05, 0.22, -0.02), new THREE.Vector3(sx * 0.2, 0.36, -0.1), new THREE.Vector3(sx * 0.34, 0.42, -0.2));
    const geo = s.g(trubka(kr, (t) => 0.1 * Math.pow(1 - t, 0.8) * (1 + 0.08 * Math.sin(t * 40)) + 0.004, 32, 14));
    const r = new THREE.Mesh(geo, mat); r.position.set(sx * 0.3, 1.0, 0); g.add(r);
  }
  return { obj: g, pruziny: [] };
}

/** Dračí křídla: prsty a blána se zubatým okrajem, mávají. */
export function kridla(s: Sklad, barva: string): Doplnek & { kridla: THREE.Object3D[] } {
  const g = new THREE.Group(); const kr: THREE.Object3D[] = [];
  const blana = s.m(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(barva).lerp(new THREE.Color("#FFFFFF"), 0.25), roughness: 0.55, side: THREE.DoubleSide, sheen: 0.6, sheenColor: new THREE.Color("#FFFFFF"), transparent: true, opacity: 0.92 }));
  const kost = s.m(new THREE.MeshStandardMaterial({ color: new THREE.Color(barva).multiplyScalar(0.7), roughness: 0.5 }));
  const konce = [new THREE.Vector2(0.55, 0.62), new THREE.Vector2(0.9, 0.28), new THREE.Vector2(0.78, -0.12)];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.62, 0.25, -0.32); pivot.userData.sx = sx;
    const tvar = new THREE.Shape(); tvar.moveTo(0, 0);
    tvar.lineTo(konce[0].x, konce[0].y);
    tvar.quadraticCurveTo(0.6, 0.38, konce[1].x, konce[1].y);
    tvar.quadraticCurveTo(0.68, 0.1, konce[2].x, konce[2].y);
    tvar.quadraticCurveTo(0.4, -0.08, 0.05, -0.28);
    tvar.closePath();
    const m = new THREE.Mesh(s.g(new THREE.ShapeGeometry(tvar, 16)), blana); m.scale.x = sx; pivot.add(m);
    for (const k of konce) {
      const krv = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(sx * k.x * 0.5, k.y * 0.55 + 0.05, 0.01), new THREE.Vector3(sx * k.x, k.y, 0.01));
      pivot.add(new THREE.Mesh(s.g(trubka(krv, (t) => 0.035 * (1 - t) + 0.008, 14, 8)), kost));
    }
    g.add(pivot); kr.push(pivot);
  }
  return { obj: g, pruziny: [], kridla: kr };
}

/** Roh jednorožce: točený, perleťový, s duhovými jiskrami. */
export function rohJednorozce(s: Sklad): Doplnek {
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 30; i++) { const t = i / 30; prof.push(new THREE.Vector2(0.11 * Math.pow(1 - t, 0.9) + 0.002, t * 0.68)); }
  const geo = s.g(new THREE.LatheGeometry(prof, 40));
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), u = Math.atan2(z, x), r = Math.hypot(x, z);
    const q = r * (1 - 0.18 * Math.max(0, Math.sin(u * 2 + y * 22)));
    const uu = u + y * 1.2;
    p.setXYZ(i, Math.cos(uu) * q, y, Math.sin(uu) * q);
  }
  geo.computeVertexNormals();
  const roh = new THREE.Mesh(geo, s.m(new THREE.MeshPhysicalMaterial({ color: "#FFF1C9", roughness: 0.2, metalness: 0.2, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.5, sheen: 0.5, sheenColor: new THREE.Color("#FFB3E6") })));
  roh.position.set(0, 1.0, 0.08); roh.rotation.x = 0.12;
  return { obj: roh, pruziny: [], jiskry: ["#FF9AC8", "#B79CFF", "#8ED1FF", "#FFD36E"] };
}

/** Hříva jednorožce: pastelové prameny, které vlají (řetězy pružin). */
export function hriva(s: Sklad): Doplnek {
  const g = new THREE.Group(); const pruziny: Pruzina[] = [];
  const barvy = ["#FF9AC8", "#B79CFF", "#8ED1FF", "#FFD36E", "#9BE8C5", "#FFB38A"];
  const kotvy: [number, number, number, number][] = [[0.05, 1.06, -0.16, 1.2], [-0.22, 0.98, -0.2, 1.75], [-0.46, 0.86, -0.2, 2.1], [-0.68, 0.68, -0.18, 2.35], [-0.86, 0.45, -0.16, 2.55], [-0.95, 0.18, -0.14, 2.75]];
  kotvy.forEach(([x, y, z, nakl], i) => {
    const mat = s.m(new THREE.MeshPhysicalMaterial({ color: barvy[i], roughness: 0.45, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color("#FFFFFF") }));
    let rodic: THREE.Object3D = g;
    const zac = new THREE.Group(); zac.position.set(x, y, z); zac.rotation.z = nakl; rodic.add(zac); rodic = zac;
    for (let k = 0; k < 3; k++) {
      const seg = new THREE.Group(); if (k > 0) seg.position.y = 0.24; seg.rotation.z = k === 0 ? 0 : (k % 2 ? -0.32 : 0.28);
      const rr = (t: number) => 0.125 * Math.pow(1 - t, 0.7) + 0.012;
      const t0 = k / 3, t1 = (k + 1) / 3;
      const kr = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03 * (k % 2 ? 1 : -1), 0.12, 0.01), new THREE.Vector3(0, 0.24, 0));
      seg.add(new THREE.Mesh(s.g(trubka(kr, (t) => rr(t0 + (t1 - t0) * t), 10, 14)), mat));
      const kloub = new THREE.Mesh(s.g(new THREE.SphereGeometry(rr(t1), 14, 10)), mat); kloub.position.y = 0.24; seg.add(kloub);
      rodic.add(seg); rodic = seg;
      pruziny.push(new Pruzina(seg, 0.5 + k * 0.45, 50 - k * 8, 4.5, -1, i + k));
    }
  });
  return { obj: g, pruziny };
}

/** Tykadla (včelka): pružné, s chlupatými kuličkami. */
export function tykadla(s: Sklad): Doplnek {
  const g = new THREE.Group(); const pruziny: Pruzina[] = [];
  const mat = s.m(new THREE.MeshStandardMaterial({ color: "#0D1B3E", roughness: 0.5 }));
  for (const sx of [-1, 1]) {
    let rodic: THREE.Object3D = g;
    const zac = new THREE.Group(); zac.position.set(sx * 0.28, 1.0, 0); zac.rotation.z = -sx * 0.4; rodic.add(zac); rodic = zac;
    for (let k = 0; k < 3; k++) {
      const seg = new THREE.Group(); if (k > 0) seg.position.y = 0.17; seg.rotation.z = k ? -sx * 0.12 : 0;
      seg.add(new THREE.Mesh(s.g(trubka(new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.18, 0)), () => 0.025, 4, 8)), mat));
      rodic.add(seg); rodic = seg;
      pruziny.push(new Pruzina(seg, 0.6 + k * 0.5, 60 - k * 10, 4, 0, sx + k));
    }
    const kul = new THREE.Mesh(s.g(chlupataKoule(0.1, 0.2, 3)), mat); kul.position.y = 0.2; rodic.add(kul);
  }
  return { obj: g, pruziny };
}

/** Včelí křidélka: průsvitná, duhová, bzučí. */
export function vceliKridla(s: Sklad): Doplnek {
  const g = new THREE.Group(); const kr: THREE.Object3D[] = [];
  const mat = s.m(new THREE.MeshPhysicalMaterial({ color: "#E8F6FF", roughness: 0.05, transparent: true, opacity: 0.45, side: THREE.DoubleSide, iridescence: 1, iridescenceIOR: 1.4, depthWrite: false }));
  for (const sx of [-1, 1]) for (const [sz, y, rot] of [[1, 0.35, 0.5], [0.7, 0.12, 0.15]] as const) {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.55, y + 0.15, -0.3);
    const w = new THREE.Mesh(s.g(new THREE.CircleGeometry(0.3, 28)), mat); w.scale.set(sz * 1.3, sz * 0.62, 1); w.position.x = sx * 0.3 * sz; w.rotation.z = sx * rot; pivot.add(w);
    g.add(pivot); kr.push(pivot); pivot.userData.sx = sx;
  }
  return { obj: g, pruziny: [], krok: (p) => { kr.forEach((k, i) => { k.rotation.y = (k.userData.sx as number) * (0.45 + 0.35 * Math.sin(p.cas * 38 + i)); }); } };
}

/** Plamen ohnivého Hexíka: tři zkřížené plochy s živým shaderem + uhlíky. */
const PLAMEN_FRAG = /* glsl */ `
varying vec2 vUv; uniform float uCas; uniform float uFaze;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a*noise(p); p *= 2.0; a *= 0.5; } return v; }
void main(){
  vec2 uv = vUv;
  float n = fbm(vec2(uv.x*3.0 + uFaze, uv.y*2.6 - uCas*2.4));
  float w = (1.0 - uv.y) * 0.78 + 0.08;
  float d = abs(uv.x - 0.5 + (n - 0.5) * 0.25 * uv.y) / w;
  float tvar = 1.0 - d - uv.y * 1.05 + (n - 0.5) * 0.8 * uv.y;
  float a = smoothstep(0.0, 0.3, tvar) * smoothstep(0.0, 0.15, uv.y)
          * smoothstep(0.0, 0.12, uv.x) * smoothstep(1.0, 0.88, uv.x) * smoothstep(1.0, 0.85, uv.y);
  vec3 c = mix(vec3(1.0, 0.25, 0.03), vec3(1.0, 0.85, 0.35), smoothstep(0.15, 0.85, tvar));
  c = mix(c, vec3(1.0, 1.0, 0.85), smoothstep(0.75, 1.0, tvar) * (1.0 - uv.y));
  gl_FragColor = vec4(c * a * 1.3, a);
  #include <colorspace_fragment>
}`;
export function plamen(s: Sklad): Doplnek & { uniforms: { uCas: { value: number } } } {
  const g = new THREE.Group(); g.position.set(0, 0.92, 0);
  const uCas = { value: 0 };
  for (let i = 0; i < 3; i++) {
    const mat = s.m(new THREE.ShaderMaterial({
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: PLAMEN_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uCas, uFaze: { value: i * 2.7 } },
    }));
    const pl = new THREE.Mesh(s.g(new THREE.PlaneGeometry(1.25, 1.4)), mat); pl.position.y = 0.55; pl.rotation.y = (i * Math.PI) / 3; g.add(pl);
  }
  return { obj: g, pruziny: [], uniforms: { uCas } };
}

/** Medaile na stuze: houpe se jako kyvadlo a odlesk na ní přejede. */
export function medaile(s: Sklad): Doplnek {
  const pivot = new THREE.Group(); pivot.position.set(0, -0.36, 0.48);
  const stuhaMat = s.m(new THREE.MeshPhysicalMaterial({ map: s.t(texturaStuha("#2E6DA4", "#E5383B")), roughness: 0.5, sheen: 1, sheenColor: new THREE.Color("#FFFFFF"), side: THREE.DoubleSide }));
  for (const sx of [-1, 1]) {
    const pas = new THREE.Mesh(s.g(new THREE.PlaneGeometry(0.11, 0.3)), stuhaMat);
    pas.position.set(sx * 0.06, -0.12, 0.01); pas.rotation.z = sx * 0.3; pivot.add(pas);
  }
  const zl = zlatoMat(s);
  const disk = new THREE.Group(); disk.position.set(0, -0.34, 0.04); disk.scale.setScalar(0.9); pivot.add(disk);
  const d = new THREE.Mesh(s.g(new THREE.CylinderGeometry(0.17, 0.17, 0.045, 40)), zl); d.rotation.x = Math.PI / 2; disk.add(d);
  const lem = new THREE.Mesh(s.g(new THREE.TorusGeometry(0.17, 0.022, 10, 40)), zl); disk.add(lem);
  const hv = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.045 : 0.11, a = Math.PI / 2 + (i * Math.PI) / 5; if (i === 0) hv.moveTo(Math.cos(a) * r, Math.sin(a) * r); else hv.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  const h = new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(hv, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2 })), zl); h.position.z = 0.025; disk.add(h);
  return { obj: pivot, pruziny: [new Pruzina(pivot, 0.9, 30, 2.8)], jiskry: ["#FFE08A"] };
}

/** Pletená šála (3. etapa): pruhovaná, se dvěma vlajícími konci a třásněmi. */
export function sala(s: Sklad, a = "#E0565B", b = "#FFFFFF"): Doplnek {
  const g = new THREE.Group(); const pruziny: Pruzina[] = [];
  const bump = s.t(texturaPleteni([24, 3]));
  const mat = s.m(new THREE.MeshPhysicalMaterial({ map: s.t(texturaSala(a, b)), bumpMap: bump, bumpScale: 2, roughness: 0.95, sheen: 0.7, sheenColor: new THREE.Color("#FFFFFF") }));
  const kruh = new THREE.Mesh(s.g(chlupatyLem(0.56, 0.1, 0.12)), mat); kruh.rotation.x = Math.PI / 2; kruh.scale.set(1.12, 0.92, 1); kruh.position.y = -0.74; g.add(kruh);
  const matKonec = s.m(new THREE.MeshPhysicalMaterial({ map: s.t(platno(16, 64, (x) => { x.fillStyle = a; x.fillRect(0, 0, 16, 64); x.fillStyle = b; x.fillRect(0, 14, 16, 8); x.fillRect(0, 38, 16, 8); })), bumpMap: bump, bumpScale: 2, roughness: 0.95, sheen: 0.7, sheenColor: new THREE.Color("#FFFFFF") }));
  const trasne = s.m(new THREE.MeshStandardMaterial({ color: a, roughness: 0.9 }));
  for (const [x, nakl] of [[0.28, 0.12], [0.42, -0.05]] as const) {
    let rodic: THREE.Object3D = g;
    const zac = new THREE.Group(); zac.position.set(x, -0.8, 0.5); zac.rotation.z = Math.PI + nakl; rodic.add(zac); rodic = zac;
    for (let k = 0; k < 2; k++) {
      const seg = new THREE.Group(); if (k > 0) seg.position.y = 0.2;
      const kus = new THREE.Mesh(s.g(new THREE.BoxGeometry(0.16, 0.2, 0.05)), matKonec); kus.position.y = 0.1; seg.add(kus);
      rodic.add(seg); rodic = seg;
      pruziny.push(new Pruzina(seg, 0.6 + k * 0.6, 50, 4, 0, x * 10 + k));
    }
    for (let t = 0; t < 5; t++) { const tr = new THREE.Mesh(s.g(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 4)), trasne); tr.position.set(-0.064 + t * 0.032, 0.235, 0); rodic.add(tr); }
  }
  return { obj: g, pruziny };
}
