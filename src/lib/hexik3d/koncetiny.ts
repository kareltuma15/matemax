/**
 * Ručičky a botičky 3D Hexíka + doplňky pro sloty Ruce a Nohy (Karel schválil 19. 11. 2026).
 * Ruce: palcaky (Zima), naramek, boxerske, superhrdina, kouzelnicke.
 * Nohy: tenisky, zimni (Zima), kopacky, brusle (Zima), raketove.
 */
import * as THREE from "three";
import { chlupatyLem, type Sklad, type Pohyb } from "./doplnky";

export const RUCE_KLICE = ["palcaky", "naramek", "boxerske", "superhrdina", "kouzelnicke"] as const;
export const NOHY_KLICE = ["tenisky", "zimni", "kopacky", "brusle", "raketove"] as const;

/** Pletený palčák: červené pletení, bílý norský pruh s vločkami. */
function texturaPalcaku(pruh: boolean): THREE.CanvasTexture {
  const c = document.createElement("canvas"); c.width = 512; c.height = 256; const x = c.getContext("2d")!;
  x.fillStyle = "#D2303C"; x.fillRect(0, 0, 512, 256);
  for (let r = 0; r < 32; r++) for (let k = 0; k < 64; k++) { const cx = k * 8 + 4, cy = r * 8 + 4; x.strokeStyle = (r + k) % 2 ? "rgba(120,10,20,.35)" : "rgba(255,170,170,.22)"; x.lineWidth = 1.6; x.beginPath(); x.moveTo(cx - 3, cy - 3); x.lineTo(cx, cy + 3); x.lineTo(cx + 3, cy - 3); x.stroke(); }
  if (pruh) {
    x.fillStyle = "#F7F3EE"; x.fillRect(0, 70, 512, 70);
    x.fillStyle = "#D2303C"; for (let k = 0; k < 16; k++) { const cx = k * 32 + 16; x.beginPath(); x.moveTo(cx - 16, 140); x.lineTo(cx, 124); x.lineTo(cx + 16, 140); x.fill(); x.beginPath(); x.moveTo(cx - 16, 70); x.lineTo(cx, 86); x.lineTo(cx + 16, 70); x.fill(); }
    x.strokeStyle = "#D2303C"; x.lineWidth = 3; for (let k = 0; k < 8; k++) { const cx = k * 64 + 32, cy = 105; for (let a = 0; a < 6; a++) { const u = a * Math.PI / 3; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(u) * 12, cy + Math.sin(u) * 12); x.stroke(); } }
    x.fillStyle = "#F7F3EE"; for (let k = 0; k < 32; k++) x.fillRect(k * 16 + 6, 200, 5, 5);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

function hexTvar(R: number): THREE.Shape {
  const s = new THREE.Shape(); for (let i = 0; i < 6; i++) { const a = Math.PI / 2 + i * Math.PI / 3, px = R * Math.cos(a), py = R * Math.sin(a); if (i === 0) s.moveTo(px, py); else s.lineTo(px, py); } s.closePath(); return s;
}
function hvezdaTvar(r1: number, r2: number): THREE.Shape {
  const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const r = i % 2 ? r2 : r1, a = Math.PI / 2 + (i * Math.PI) / 5; if (i === 0) s.moveTo(r * Math.cos(a), r * Math.sin(a)); else s.lineTo(r * Math.cos(a), r * Math.sin(a)); } s.closePath(); return s;
}

const v2 = (pts: number[][]) => pts.map(([x, y]) => new THREE.Vector2(x, y));

export interface Koncetiny { krok?: (p: Pohyb) => void }

/**
 * Ručička s palcem (místo elipsoidu) a doplněk na ruce. `arm` je pivot ramene z model.ts (sx = −1 levá, 1 pravá).
 */
export function postavRuku(s: Sklad, arm: THREE.Group, sx: number, bodyMat: THREE.Material, klic?: string): Koncetiny {
  arm.position.set(sx * 0.98, -0.1, 0.2);
  const rucka = new THREE.Mesh(s.g(new THREE.LatheGeometry(v2([[0, 0.03], [0.075, 0.02], [0.105, -0.05], [0.118, -0.17], [0.142, -0.3], [0.152, -0.39], [0.13, -0.47], [0.075, -0.515], [0, -0.525]].reverse()), 28)), bodyMat);
  rucka.scale.set(1.08, 1.05, 0.9); arm.add(rucka);
  const palecGeo = s.g(new THREE.SphereGeometry(0.056, 16, 12));
  const palec = new THREE.Mesh(palecGeo, bodyMat); palec.scale.set(0.9, 1.25, 0.9); palec.position.set(-sx * 0.06, -0.33, 0.1); palec.rotation.z = sx * 0.5; arm.add(palec);
  const out: Koncetiny = {};
  if (klic === "palcaky") {
    const pm = s.m(new THREE.MeshPhysicalMaterial({ map: s.t(texturaPalcaku(true)), roughness: 0.95, sheen: 0.8, sheenColor: new THREE.Color("#FFC2C8") }));
    const pg = new THREE.Mesh(s.g(new THREE.LatheGeometry(v2([[0.15, -0.17], [0.178, -0.26], [0.196, -0.36], [0.19, -0.46], [0.155, -0.54], [0.085, -0.585], [0, -0.596]].reverse()), 36)), pm); pg.scale.set(1, 1, 0.84); arm.add(pg);
    const pal = new THREE.Mesh(s.g(new THREE.CapsuleGeometry(0.058, 0.1, 6, 14)), s.m(new THREE.MeshPhysicalMaterial({ map: s.t(texturaPalcaku(false)), roughness: 0.95, sheen: 0.8, sheenColor: new THREE.Color("#FFC2C8") })));
    pal.position.set(-sx * 0.07, -0.33, 0.15); pal.rotation.set(0.95, 0, sx * 0.35); arm.add(pal);
    const zg = s.g(new THREE.CylinderGeometry(0.165, 0.158, 0.13, 64, 2, false));
    { const pp = zg.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i), r = Math.hypot(x, z); if (r > 0.1) { const a = Math.atan2(z, x), k = 1 + 0.06 * Math.max(0, Math.cos(a * 22)); pp.setX(i, x * k); pp.setZ(i, z * k); } } zg.computeVertexNormals(); }
    const manz = new THREE.Mesh(zg, s.m(new THREE.MeshPhysicalMaterial({ color: "#F7F3EE", roughness: 0.95, sheen: 1, sheenColor: new THREE.Color("#FFFFFF") }))); manz.position.y = -0.15; manz.scale.z = 0.86; arm.add(manz);
    const pr = new THREE.Mesh(s.g(new THREE.TorusGeometry(0.168, 0.012, 8, 48)), pm); pr.rotation.x = Math.PI / 2; pr.position.y = -0.15; pr.scale.set(1, 0.86, 1); arm.add(pr);
  }
  if (klic === "naramek") {
    // přátelský náramek: barevné korálky kolem zápěstí a srdíčko
    const barvy = ["#FF7AB8", "#FFD24D", "#5FD0AA", "#5AB8FF", "#B07CFF"];
    const kor = s.g(new THREE.SphereGeometry(0.03, 14, 10));
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const m = new THREE.Mesh(kor, s.m(new THREE.MeshPhysicalMaterial({ color: barvy[i % 5], roughness: 0.15, clearcoat: 1 }))); m.position.set(Math.cos(a) * 0.15, -0.2, Math.sin(a) * 0.13); arm.add(m); }
    const sr = new THREE.Shape(); sr.moveTo(0, -0.04); sr.bezierCurveTo(-0.06, 0, -0.03, 0.05, 0, 0.02); sr.bezierCurveTo(0.03, 0.05, 0.06, 0, 0, -0.04);
    const srm = new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(sr, { depth: 0.015, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2 })), s.m(new THREE.MeshPhysicalMaterial({ color: "#FF3D7F", roughness: 0.2, clearcoat: 1 })));
    srm.position.set(0, -0.26, 0.15); arm.add(srm);
  }
  if (klic === "boxerske") {
    const bm = s.m(new THREE.MeshPhysicalMaterial({ color: "#E5303C", roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }));
    const rk = new THREE.Mesh(s.g(new THREE.SphereGeometry(0.19, 28, 20)), bm); rk.scale.set(1, 1.08, 1.12); rk.position.set(0, -0.4, 0.02); arm.add(rk);
    const pp = new THREE.Mesh(palecGeo, bm); pp.scale.set(1.3, 1.6, 1.2); pp.position.set(-sx * 0.1, -0.34, 0.13); pp.rotation.z = sx * 0.6; arm.add(pp);
    const man = new THREE.Mesh(s.g(new THREE.CylinderGeometry(0.135, 0.15, 0.12, 24)), s.m(new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", roughness: 0.4, clearcoat: 0.6 }))); man.position.y = -0.2; arm.add(man);
    const pr = new THREE.Mesh(s.g(new THREE.TorusGeometry(0.143, 0.012, 8, 32)), s.m(new THREE.MeshStandardMaterial({ color: "#F5C542", metalness: 0.6, roughness: 0.3 }))); pr.rotation.x = Math.PI / 2; pr.position.y = -0.2; arm.add(pr);
  }
  if (klic === "superhrdina" || klic === "kouzelnicke") {
    // rukavice s rozšířenou manžetou; superhrdina červeno-žlutá s bleskem, kouzelnické fialové se zlatými hvězdičkami
    const sup = klic === "superhrdina";
    const gm = s.m(new THREE.MeshPhysicalMaterial({ color: sup ? "#E5303C" : "#5B2DB8", roughness: 0.3, clearcoat: 0.8, sheen: sup ? 0 : 0.6, sheenColor: new THREE.Color("#C9B6FF") }));
    const gl = new THREE.Mesh(s.g(new THREE.LatheGeometry(v2([[0.13, -0.2], [0.15, -0.3], [0.16, -0.39], [0.138, -0.475], [0.08, -0.525], [0, -0.535]].reverse()), 32)), gm); gl.scale.set(1.04, 1, 0.88); arm.add(gl);
    const pp = new THREE.Mesh(palecGeo, gm); pp.scale.set(1.0, 1.35, 1.0); pp.position.set(-sx * 0.065, -0.33, 0.105); pp.rotation.z = sx * 0.5; arm.add(pp);
    const manzeta = new THREE.Mesh(s.g(new THREE.CylinderGeometry(0.2, 0.135, 0.17, 32, 1, true)), s.m(new THREE.MeshPhysicalMaterial({ color: sup ? "#FFD24D" : "#2A0F55", roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide })));
    manzeta.position.y = -0.14; manzeta.scale.z = 0.9; arm.add(manzeta);
    const lem = new THREE.Mesh(s.g(new THREE.TorusGeometry(0.2, 0.014, 8, 40)), s.m(new THREE.MeshPhysicalMaterial({ color: "#FFC24A", metalness: 1, roughness: 0.2 }))); lem.rotation.x = Math.PI / 2; lem.position.y = -0.055; lem.scale.set(1, 0.9, 1); arm.add(lem);
    if (sup) {
      const bl = new THREE.Shape(); bl.moveTo(0.02, 0.07); bl.lineTo(-0.035, 0.0); bl.lineTo(0.0, 0.0); bl.lineTo(-0.02, -0.07); bl.lineTo(0.04, 0.012); bl.lineTo(0.005, 0.012); bl.closePath();
      const blm = new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(bl, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.004, bevelSegments: 1 })), s.m(new THREE.MeshStandardMaterial({ color: "#FFD24D", emissive: "#FFB000", emissiveIntensity: 0.3 })));
      blm.position.set(0, -0.15, 0.17); blm.scale.setScalar(1.3); arm.add(blm);
    } else {
      const hm = s.m(new THREE.MeshStandardMaterial({ color: "#FFE08A", emissive: "#FFC24A", emissiveIntensity: 0.9 }));
      const hg = s.g(new THREE.ExtrudeGeometry(hvezdaTvar(0.028, 0.012), { depth: 0.006, bevelEnabled: false }));
      const hvezdy: THREE.Mesh[] = [];
      for (const [x, y, z, sc] of [[0.0, -0.36, 0.14, 1.3], [0.08, -0.44, 0.1, 0.9], [-0.07, -0.29, 0.12, 0.8], [0.05, -0.15, 0.17, 1.0]] as const) { const h = new THREE.Mesh(hg, hm); h.position.set(x * sx, y, z); h.scale.setScalar(sc); arm.add(h); hvezdy.push(h); }
      out.krok = (p) => { hm.emissiveIntensity = 0.6 + 0.4 * Math.sin(p.cas * 3); hvezdy.forEach((h, i) => (h.rotation.z = p.cas * (0.6 + i * 0.2))); };
    }
  }
  return out;
}

/** Botička (nebo bota z doplňku) na zemi pod Hexíkem. `root` je kořen modelu, nohy stojí na y ≈ −1,4. */
export function postavNohu(s: Sklad, root: THREE.Group, sx: number, bodyMat: THREE.Material, barvaObliceje: THREE.Color, klic?: string): Koncetiny {
  const bot = new THREE.Group(); bot.position.set(sx * 0.42, -1.29, 0.16); bot.rotation.y = -sx * 0.12; bot.scale.setScalar(1.14); root.add(bot);
  const out: Koncetiny = {};
  if (klic === "tenisky" || klic === "zimni" || klic === "kopacky") { bot.rotation.y = sx * 0.42; postavBotu(s, bot, klic, out); return out; }
  const botGeo = s.g(new THREE.SphereGeometry(0.22, 32, 20));
  { const p = botGeo.attributes.position; for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); if (z > 0) p.setY(i, y + Math.pow(z / 0.22, 3) * 0.06 * (y > -0.05 ? 1 : 0.4)); if (y < -0.1) p.setY(i, -0.1 - (y + 0.1) * 0.35); } botGeo.computeVertexNormals(); }
  const podrGeo = s.g(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 32)); podrGeo.scale(1, 1, 1.35);
  let horniMat: THREE.Material = bodyMat, podrMat: THREE.Material = s.m(new THREE.MeshStandardMaterial({ color: barvaObliceje.clone().lerp(new THREE.Color("#FFFFFF"), 0.35), roughness: 0.6 }));
  let vys = 0.62;
  if (klic === "brusle") { horniMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#FFFFFF", roughness: 0.35, clearcoat: 0.6 })); podrMat = s.m(new THREE.MeshStandardMaterial({ color: "#2B3A86", roughness: 0.5 })); vys = 1.05; }
  if (klic === "raketove") { horniMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#D3DBE6", metalness: 1, roughness: 0.22, clearcoat: 0.5, envMapIntensity: 1.6 })); podrMat = s.m(new THREE.MeshPhysicalMaterial({ color: "#E5303C", roughness: 0.3, clearcoat: 1 })); vys = 0.85; }
  const horni = new THREE.Mesh(botGeo, horniMat); horni.scale.set(1.08, vys, 1.32); horni.position.y = 0.03 + (vys - 0.62) * 0.08; bot.add(horni);
  const podr = new THREE.Mesh(podrGeo, podrMat); podr.position.y = -0.05; podr.scale.set(1.06, 1, 1); bot.add(podr);
  if (klic === "brusle") {
    const ocel = s.m(new THREE.MeshPhysicalMaterial({ color: "#DDE6F2", metalness: 1, roughness: 0.15, envMapIntensity: 2 }));
    const nuz = new THREE.Mesh(s.g(new THREE.BoxGeometry(0.018, 0.035, 0.58)), ocel); nuz.position.set(0, -0.16, 0.03); bot.add(nuz);
    const spicka = new THREE.Mesh(s.g(new THREE.TorusGeometry(0.05, 0.009, 6, 16, Math.PI)), ocel); spicka.rotation.y = Math.PI / 2; spicka.position.set(0, -0.12, 0.32); bot.add(spicka);
    for (const z of [-0.14, 0.18]) { const st = new THREE.Mesh(s.g(new THREE.CylinderGeometry(0.02, 0.025, 0.1, 10)), ocel); st.position.set(0, -0.11, z); bot.add(st); }
    const tk = s.m(new THREE.MeshStandardMaterial({ color: "#D9343F", roughness: 0.5 }));
    for (const y of [0.12, 0.2]) { const t = new THREE.Mesh(s.g(new THREE.CapsuleGeometry(0.011, 0.12, 4, 8)), tk); t.rotation.z = Math.PI / 2; t.position.set(0, y, 0.16); bot.add(t); }
  }
  if (klic === "raketove") {
    // trysky na patě s plamínky, které blikají
    const tryska = new THREE.Mesh(s.g(new THREE.CylinderGeometry(0.05, 0.07, 0.1, 20)), s.m(new THREE.MeshPhysicalMaterial({ color: "#5A6478", metalness: 1, roughness: 0.3 })));
    tryska.rotation.x = Math.PI / 2; tryska.position.set(0, 0.02, -0.3); bot.add(tryska);
    const plMat = s.m(new THREE.MeshBasicMaterial({ color: "#FFB000", transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    const plMat2 = s.m(new THREE.MeshBasicMaterial({ color: "#FF5A1F", transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    const pl = new THREE.Mesh(s.g(new THREE.ConeGeometry(0.055, 0.22, 16)), plMat); pl.rotation.x = -Math.PI / 2; pl.position.set(0, 0.02, -0.44); bot.add(pl);
    const pl2 = new THREE.Mesh(s.g(new THREE.ConeGeometry(0.075, 0.3, 16)), plMat2); pl2.rotation.x = -Math.PI / 2; pl2.position.set(0, 0.02, -0.47); bot.add(pl2);
    const pruh = new THREE.Mesh(s.g(new THREE.TorusGeometry(0.2, 0.014, 8, 40, Math.PI)), s.m(new THREE.MeshStandardMaterial({ color: "#E5303C", roughness: 0.3 }))); pruh.rotation.set(Math.PI / 2, 0, 0); pruh.position.y = 0.05; pruh.scale.set(1.08, 1.32, 1); bot.add(pruh);
    out.krok = (p) => { const f = 0.8 + 0.25 * Math.sin(p.cas * 40 + sx) + 0.15 * Math.sin(p.cas * 23); pl.scale.set(1, f, 1); pl2.scale.set(1, f * 1.1, 1); plMat.opacity = 0.75 + 0.2 * Math.sin(p.cas * 31); };
  }
  return out;
}

/** Tenisky, zimní boty a kopačky: podrážka podle obrysu chodidla, svršek nižší u špičky, tkaničky, jazyk, poutko. */
function postavBotu(s: Sklad, bot: THREE.Group, druh: string, out: Koncetiny) {
  void out;
  const obrys = new THREE.Shape(); obrys.absellipse(0, 0.02, 0.165, 0.3, 0, Math.PI * 2, false);
  const vyt = (hl: number, bev: number) => { const ge = s.g(new THREE.ExtrudeGeometry(obrys, { depth: hl, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 40 })); ge.rotateX(Math.PI / 2); return ge; };
  const zimni = druh === "zimni", kop = druh === "kopacky";
  const podrBarva = zimni ? "#3A2618" : kop ? "#1C2230" : "#FAFBFF";
  const bilaMat = s.m(new THREE.MeshPhysicalMaterial({ color: podrBarva, roughness: zimni ? 0.85 : 0.35, clearcoat: zimni ? 0 : 0.5 }));
  bot.add(new THREE.Mesh(vyt(zimni ? 0.06 : kop ? 0.04 : 0.07, 0.022), bilaMat));
  const dno = new THREE.Mesh(vyt(0.018, 0.01), s.m(new THREE.MeshStandardMaterial({ color: zimni ? "#1F140C" : kop ? "#5FD0AA" : "#7C86A6", roughness: 0.9 }))); dno.position.y = kop ? -0.07 : -0.095; dno.scale.set(1.02, 1, 1.02); bot.add(dno);
  if (zimni) for (let i = 0; i < 6; i++) { const z = -0.24 + i * 0.095; const zub = new THREE.Mesh(s.g(new THREE.BoxGeometry(0.26 * Math.sqrt(Math.max(0.1, 1 - ((z - 0.02) / 0.3) ** 2)), 0.02, 0.03)), s.m(new THREE.MeshStandardMaterial({ color: "#1F140C", roughness: 0.9 }))); zub.position.set(0, -0.115, z); bot.add(zub); }
  if (kop) { const kolMat = s.m(new THREE.MeshStandardMaterial({ color: "#E8ECF4", roughness: 0.4 })); for (const [x, z] of [[-0.08, 0.2], [0.08, 0.2], [-0.1, 0.06], [0.1, 0.06], [-0.07, -0.18], [0.07, -0.18]] as const) { const k = new THREE.Mesh(s.g(new THREE.ConeGeometry(0.022, 0.05, 10)), kolMat); k.rotation.x = Math.PI; k.position.set(x, -0.1, z); bot.add(k); } }
  const vys = zimni ? 0.3 : 0.17;
  const sg = s.g(new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2));
  { const pp = sg.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i) * 0.152, z = pp.getZ(i) * 0.285 + 0.02; let y = pp.getY(i) * vys; const zn = (z - 0.02) / 0.285; y *= zn > 0 ? 1 - 0.58 * Math.pow(zn, 1.3) : 1; pp.setXYZ(i, x, y, z); } sg.computeVertexNormals(); }
  const barva = zimni ? "#8A5A35" : kop ? "#1E2230" : "#5B55D6";
  const svrsek = new THREE.Mesh(sg, s.m(new THREE.MeshPhysicalMaterial({ color: barva, roughness: zimni ? 0.7 : 0.45, clearcoat: zimni ? 0.1 : 0.3, sheen: zimni ? 0.6 : 0, sheenColor: new THREE.Color("#E7C49A") }))); svrsek.position.y = 0.012; bot.add(svrsek);
  if (!zimni) {
    if (!kop) { const sp = new THREE.Mesh(s.g(new THREE.SphereGeometry(1, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2)), bilaMat); sp.scale.set(0.156, 0.075, 0.12); sp.position.set(0, 0.012, 0.19); bot.add(sp); }
    const logoMat = s.m(new THREE.MeshStandardMaterial({ color: kop ? "#5FD0AA" : "#F5A623", roughness: 0.35, metalness: 0.2 }));
    for (const strana of [-1, 1]) {
      if (kop) { for (const dz of [-0.06, 0, 0.06]) { const p = new THREE.Mesh(s.g(new THREE.BoxGeometry(0.008, 0.11, 0.025)), logoMat); p.position.set(strana * 0.15, 0.06, dz - 0.02); p.rotation.x = 0.35; bot.add(p); } }
      else { const lg = new THREE.Mesh(s.g(new THREE.ExtrudeGeometry(hexTvar(0.045), { depth: 0.008, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1 })), logoMat); lg.position.set(strana * 0.148, 0.065, -0.03); lg.rotation.y = strana * Math.PI / 2; bot.add(lg); }
    }
    const pout = new THREE.Mesh(s.g(new THREE.BoxGeometry(0.05, 0.07, 0.02)), logoMat); pout.position.set(0, 0.16, -0.255); pout.rotation.x = -0.25; bot.add(pout);
  }
  const jaz = new THREE.Mesh(s.g(new THREE.CapsuleGeometry(0.045, 0.08, 4, 10)), s.m(new THREE.MeshPhysicalMaterial({ color: zimni ? "#6E4527" : kop ? "#2E3446" : "#7C77EA", roughness: 0.6 }))); jaz.scale.set(1, 1, 0.35); jaz.rotation.x = -0.9; jaz.position.set(0, vys - 0.005, -0.03); bot.add(jaz);
  const lemK = new THREE.Mesh(zimni ? s.g(chlupatyLem(0.11, 0.045, 0.35)) : s.g(new THREE.TorusGeometry(0.1, 0.026, 10, 32)), s.m(new THREE.MeshPhysicalMaterial({ color: zimni ? "#FFF8EE" : kop ? "#5FD0AA" : "#3F39B5", roughness: zimni ? 1 : 0.5, sheen: zimni ? 1 : 0, sheenColor: new THREE.Color("#FFFFFF") })));
  lemK.rotation.x = Math.PI / 2; lemK.scale.set(1.15, 1.2, 1); lemK.position.set(0, vys + (zimni ? 0.0 : -0.01), -0.11); bot.add(lemK);
  const tkMat = s.m(new THREE.MeshStandardMaterial({ color: zimni ? "#E8C07A" : "#FFFFFF", roughness: 0.5 }));
  const tkGeo = s.g(new THREE.CapsuleGeometry(0.011, 0.1, 4, 8));
  for (let i = 0; i < 3; i++) {
    const z = i * 0.06, zn = (z - 0.02) / 0.285, y = 0.012 + vys * (zn > 0 ? 1 - 0.58 * Math.pow(zn, 1.3) : 1) * Math.sqrt(Math.max(0, 1 - zn * zn)) + 0.008;
    for (const d of [-1, 1]) { const tk = new THREE.Mesh(tkGeo, tkMat); tk.position.set(0, y, z); tk.rotation.set(-0.5, 0, Math.PI / 2 + d * 0.55); bot.add(tk); }
  }
  if (zimni) { const tk = new THREE.Mesh(s.g(new THREE.TorusGeometry(0.03, 0.009, 6, 16)), tkMat); tk.position.set(0.05, vys + 0.02, 0.0); tk.rotation.y = 0.5; bot.add(tk); }
}
