/**
 * Domov „Perníková chaloupka“ (adventní sada z kalendáře) jako interiér podle standardu pokojíčků
 * (Karel 20. 11. 2026): perníkové stěny s polevou, čokoládová podlaha, pec na perníčky, bonbónový
 * stromek, kotlík s horkou čokoládou, marshmallow pufík, perníček panáček a hodiny s kukačkou.
 * Tabule (trénink), skříň (šatník) a okno dodává společný základ pokoj.ts.
 */
import * as THREE from "three";
import { rnd, tex, plast, zaobleny, stin, smerK, zvedni } from "./diorama";
import { vytvorPokoj, type MoznostiPokoje, type Pokoj3D, type UkolPokoje } from "./pokoj";

export const KOUZLA_CHALOUPKY: Record<string, string> = {
  hexik: "Pohlaď Hexíka", pec: "Hexík upeče perníček", stromek: "Hexík rozsvítí bonbónový stromek", kotlik: "Hexík zamíchá horkou čokoládu",
  pufik: "Hexík si sedne na pufík", panacek: "Hexík roztančí perníčka", kukacka: "Hexík vyláká kukačku", okno: "Hexík uvidí padající hvězdu",
};

const CUKR = ["#FF5A7A", "#FFD45A", "#6FD3FF", "#8CF08A", "#FF9AE6"];

/** Obrys perníčku (panáček) pro vytlačení. */
function pernicekShape(s = 1) {
  const sh = new THREE.Shape();
  const b: [number, number][] = [[0, 1.0], [0.22, 0.95], [0.3, 0.75], [0.22, 0.58], [0.55, 0.52], [0.62, 0.38], [0.5, 0.3], [0.26, 0.32], [0.3, 0], [0.48, -0.5], [0.4, -0.62], [0.22, -0.58], [0, -0.22]];
  const pts = [...b, ...b.slice(1, -1).reverse().map(([x, y]) => [-x, y] as [number, number])].map(([x, y]) => new THREE.Vector2(x * s, y * s));
  sh.moveTo(pts[0].x, pts[0].y); sh.splineThru(pts.slice(1).concat([pts[0]]));
  return sh;
}

const pernikTex = (w: number, h: number, poleva = true, opak?: [number, number]) => tex(w, h, (x) => {
  x.fillStyle = "#B8712F"; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 160; i++) { x.fillStyle = `rgba(${rnd(80, 120)},${rnd(40, 60)},15,${rnd(0.1, 0.35)})`; x.beginPath(); x.arc(rnd(0, w), rnd(0, h), rnd(0.8, 2.4), 0, 7); x.fill(); }
  if (!poleva) return;
  x.strokeStyle = "#FFFFFF"; x.lineWidth = 7; x.lineCap = "round";
  for (let r = 0; r < h; r += 128) { x.beginPath(); for (let i = 0; i <= w; i += 32) x.lineTo(i, r + 40 + ((i / 32) % 2) * 16); x.stroke(); }
  x.lineWidth = 5; for (let r = 90; r < h; r += 128) for (let i = 0; i < w; i += 64) { x.beginPath(); x.arc(i + 32, r, 12, Math.PI, 0); x.stroke(); }
  for (let r = 0; r < h; r += 128) for (let i = 0; i < w; i += 64) { x.fillStyle = CUKR[((i + r) / 64) % 5 | 0]; x.beginPath(); x.arc(i + 32, r + 110, 7, 0, 7); x.fill(); }
}, opak);

export function vytvorChaloupku(canvas: HTMLCanvasElement, o: MoznostiPokoje): Pokoj3D {
  const tapeta = pernikTex(512, 512, true, [2.5, 1.4]);
  const podlaha = tex(512, 512, (x) => {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const g = x.createLinearGradient(c * 128, r * 128, c * 128 + 128, r * 128 + 128); g.addColorStop(0, "#6E3E1E"); g.addColorStop(1, "#4E2A12");
      x.fillStyle = g; x.fillRect(c * 128 + 4, r * 128 + 4, 120, 120);
      x.fillStyle = "rgba(255,220,180,.12)"; x.fillRect(c * 128 + 10, r * 128 + 10, 108, 8);
    }
  }, [3, 2.4]);
  const vzhled = {
    pozadi: "#2A1630", tapeta, podlaha, bokPodlahy: "#4A2810", spodek: "#8A4E24", lista: "#FFFFFF", okrajSten: "#FFF6EA",
    vyhled: (x: CanvasRenderingContext2D) => {
      const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#0E1240"); g.addColorStop(0.65, "#2B3D8A"); g.addColorStop(1, "#8FB2E8"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0.3, 1)})`; x.beginPath(); x.arc(rnd(0, 256), rnd(0, 160), rnd(0.4, 1.4), 0, 7); x.fill(); }
      x.fillStyle = "#FFF6D8"; x.beginPath(); x.arc(196, 52, 18, 0, 7); x.fill();
      x.fillStyle = "#F1F6FF"; x.beginPath(); x.moveTo(0, 256); for (let i = 0; i <= 256; i += 32) x.lineTo(i, 214 + Math.sin(i * 0.05) * 10); x.lineTo(256, 256); x.fill();
      x.fillStyle = "#1E3A30"; for (const [px, s] of [[30, 30], [80, 22], [150, 36], [224, 26]]) { x.beginPath(); x.moveTo(px, 214 - s * 1.7); x.lineTo(px - s * 0.6, 222); x.lineTo(px + s * 0.6, 222); x.fill(); }
      x.fillStyle = "#FFC56B"; x.fillRect(110, 196, 8, 8); x.fillRect(122, 196, 8, 8); // okénka sousední chaloupky
    },
    snih: true, ramOkna: "#FFFFFF", zaves: "#FF7FA6",
    tabule: { deska: ["#4A2A18", "#2E1A0E"] as [string, string], ram: "#C98A4E", text: "#FFF6E8", zvyrazneni: "#FFB3D6", tlacitko: "#FFD45A" },
    skrin: { drevo: "#C98A4E", dvirka: "#D99A5C", vyplet: "#FFF3E2", knofliky: "#FF5A7A", cedule: ["#FFF6E8", "#7A3E1A"] as [string, string] },
    svetla: { obloha: ["#FFC9A8", "#2A1630", 0.28] as [string, string, number], hlavni: ["#FFD8A8", 0.9] as [string, number], mesic: ["#BFD0FF", 0.45] as [string, number] },
  };

  return vytvorPokoj(canvas, o, vzhled, (k) => {
    const { svet, Y0, reg, krok, konfety, hexik } = k;
    const cas = hexik.cas;

    // ── kulatý perníkový koberec uprostřed (volný střed) ──
    const kob = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.95, 0.06, 64), new THREE.MeshPhysicalMaterial({ map: tex(512, 512, (x) => {
      x.fillStyle = "#C98A4E"; x.beginPath(); x.arc(256, 256, 256, 0, 7); x.fill();
      x.strokeStyle = "#FFFFFF"; x.lineWidth = 10; for (const r of [236, 170, 100]) { x.beginPath(); for (let a = 0; a <= 64; a++) { const t = (a / 64) * Math.PI * 2, rr = r + Math.sin(t * 12) * 8; x.lineTo(256 + Math.cos(t) * rr, 256 + Math.sin(t) * rr); } x.stroke(); }
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.fillStyle = CUKR[i % 5]; x.beginPath(); x.arc(256 + Math.cos(a) * 205, 256 + Math.sin(a) * 205, 12, 0, 7); x.fill(); }
    }), roughness: 0.7, sheen: 0.6 }));
    kob.position.set(0.2, Y0 + 0.03, 0.4); stin(kob, false, true); svet.add(kob); reg(kob, "podlaha");

    // ── pec na perníčky u levé stěny ──
    const pec = new THREE.Group(); pec.position.set(-4.6, Y0, -1.0); pec.rotation.y = Math.PI / 2; svet.add(pec);
    const telo = new THREE.Mesh(zaobleny(2.4, 1.9, 1.1, 0.3), plast("#D0794A", { roughness: 0.7 })); telo.position.set(0, 0.95, 0.15); pec.add(telo);
    const cihly = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.8), new THREE.MeshStandardMaterial({ map: tex(256, 192, (x) => { x.fillStyle = "#C46A3E"; x.fillRect(0, 0, 256, 192); x.strokeStyle = "rgba(255,240,220,.6)"; x.lineWidth = 3; for (let r = 0; r < 8; r++) { x.beginPath(); x.moveTo(0, r * 24); x.lineTo(256, r * 24); x.stroke(); for (let c = 0; c < 6; c++) { const xx = c * 48 + (r % 2) * 24; x.beginPath(); x.moveTo(xx, r * 24); x.lineTo(xx, r * 24 + 24); x.stroke(); } } }), roughness: 0.85, transparent: true, opacity: 0.55 }));
    cihly.position.set(0, 0.95, 0.71); pec.add(cihly);
    const usti = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32, 0, Math.PI), new THREE.MeshStandardMaterial({ color: "#FF8A3D", emissive: "#FF6A1A", emissiveIntensity: 1.6, toneMapped: false })); usti.position.set(0, 0.55, 0.72); pec.add(usti);
    const oblouk = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.07, 10, 32, Math.PI), plast("#FFFFFF", { clearcoat: 1 })); oblouk.position.set(0, 0.55, 0.74); pec.add(oblouk);
    const rimsa = new THREE.Mesh(zaobleny(2.7, 0.18, 1.25, 0.08), plast("#7A3E1A", { clearcoat: 0.6 })); rimsa.position.set(0, 1.98, 0.15); pec.add(rimsa);
    for (let i = 0; i < 9; i++) { const kap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), plast("#FFFFFF", { clearcoat: 1, roughness: 0.25 })); kap.scale.y = 1.5; kap.position.set(-1.2 + i * 0.3, 1.88, 0.78); pec.add(kap); }
    for (let i = 0; i < 4; i++) { const sklenice = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.36, 16), new THREE.MeshPhysicalMaterial({ color: CUKR[i], transparent: true, opacity: 0.7, roughness: 0.05, clearcoat: 1 })); sklenice.position.set(-0.9 + i * 0.6, 2.25, 0.2); pec.add(sklenice); }
    const roura = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 14), plast("#7A7F8C", { metalness: 0.6, roughness: 0.35 })); roura.position.set(0.85, 3.1, -0.15); pec.add(roura);
    const pecSvetlo = new THREE.PointLight("#FF7A2E", 5, 6, 1.6); pecSvetlo.position.set(0, 0.7, 1.4); pec.add(pecSvetlo);
    stin(pec); reg(pec, "pec");
    let pecOd = -10;
    krok((t) => { const u = t - pecOd; (usti.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(t * 9) * 0.2 + (u < 1.5 ? (1.5 - u) : 0); pecSvetlo.intensity = 4.5 + Math.sin(t * 11) * 0.6 + (u < 1.5 ? (1.5 - u) * 4 : 0); });

    // stolek s talířem perníčků vpravo vepředu
    const stul = new THREE.Group(); stul.position.set(4.7, Y0, 1.55); svet.add(stul);
    const deska = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.1, 32), plast("#C98A4E", { clearcoat: 0.7 })); deska.position.y = 1.0; stul.add(deska);
    const noha = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 1.0, 12), plast("#9A6A42")); noha.position.y = 0.5; stul.add(noha);
    const talir = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.05, 32), plast("#FFFFFF", { clearcoat: 1 })); talir.position.y = 1.08; stul.add(talir);
    const pernGeo = new THREE.ExtrudeGeometry(pernicekShape(0.3), { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
    const pernMat = new THREE.MeshPhysicalMaterial({ map: pernikTex(128, 128, false), roughness: 0.6, clearcoat: 0.3 });
    const upeceno: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) { const n = new THREE.Mesh(pernGeo, pernMat); n.rotation.set(-Math.PI / 2, 0, rnd(-0.6, 0.6)); n.position.set(rnd(-0.12, 0.12), 1.13 + i * 0.045, rnd(-0.1, 0.1)); stul.add(n); upeceno.push(n); }
    const vRuce = new THREE.Mesh(pernGeo, pernMat); vRuce.visible = false; svet.add(vRuce);
    stin(stul); reg(stul, "pec");

    // ── bonbónový stromek v levém zadním rohu ──
    const strom = new THREE.Group(); strom.position.set(-3.2, Y0, -3.0); svet.add(strom);
    const kmen = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.5, 12), plast("#7A4A2A")); kmen.position.y = 0.25; strom.add(kmen);
    const kvet = new THREE.Mesh(zaobleny(0.8, 0.45, 0.8, 0.12), plast("#FF5A7A", { clearcoat: 0.9 })); kvet.position.y = 0.22; strom.add(kvet);
    const zele = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.9, 24), plast("#3FAE6A", { roughness: 0.5, clearcoat: 0.6 })); zele.position.y = 1.9; strom.add(zele);
    const bonbony: { m: THREE.MeshStandardMaterial; i: number }[] = [];
    for (let i = 0; i < 46; i++) { const t = i / 46, y = 0.6 + t * 2.5, r = (1 - t) * 1.2 + 0.08, a = t * Math.PI * 9;
      const mat = new THREE.MeshStandardMaterial({ color: CUKR[i % 5], emissive: CUKR[i % 5], emissiveIntensity: 0.6, roughness: 0.3 });
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat); b.scale.y = 0.75; b.position.set(Math.cos(a) * r, y, Math.sin(a) * r); strom.add(b); bonbony.push({ m: mat, i }); }
    const hvezda = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), new THREE.MeshStandardMaterial({ color: "#FFD45A", emissive: "#FFB000", emissiveIntensity: 1.8 })); hvezda.position.y = 3.5; strom.add(hvezda);
    const stromSvetlo = new THREE.PointLight("#FFD9A0", 2, 5, 1.8); stromSvetlo.position.set(0.5, 1.8, 1); strom.add(stromSvetlo);
    stin(strom); reg(strom, "stromek");
    let stromOd = -10;
    krok((t) => { const u = t - stromOd; hvezda.rotation.y = t; for (const b of bonbony) b.m.emissiveIntensity = u < 3 ? 0.4 + 1.4 * Math.max(0, Math.sin(u * 8 - b.i * 0.35)) : 0.5 + 0.3 * Math.sin(t * 2 + b.i); });

    // ── kotlík s horkou čokoládou vlevo vepředu ──
    const kotlik = new THREE.Group(); kotlik.position.set(-3.8, Y0, 1.3); svet.add(kotlik);
    const body: THREE.Vector2[] = []; for (let i = 0; i <= 10; i++) { const t = i / 10; body.push(new THREE.Vector2(0.15 + Math.sin(t * Math.PI * 0.9) * 0.45, t * 0.75)); }
    const hrnec = new THREE.Mesh(new THREE.LatheGeometry(body, 32), plast("#3A3A46", { metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide })); hrnec.position.y = 0.2; kotlik.add(hrnec);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const n = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 8), plast("#3A3A46", { metalness: 0.7 })); n.position.set(Math.cos(a) * 0.35, 0.12, Math.sin(a) * 0.35); kotlik.add(n); }
    const cokoMat = new THREE.MeshPhysicalMaterial({ color: "#5A2E14", roughness: 0.2, clearcoat: 1 });
    const coko = new THREE.Mesh(new THREE.CircleGeometry(0.5, 32), cokoMat); coko.rotation.x = -Math.PI / 2; coko.position.y = 0.88; kotlik.add(coko);
    const vareska = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), plast("#C98A4E")); vareska.position.set(0.15, 1.1, 0); vareska.rotation.z = 0.4; kotlik.add(vareska);
    const nP = 16, pP = new Float32Array(nP * 3), pZ = new Float32Array(nP); for (let i = 0; i < nP; i++) pZ[i] = rnd(0, 2);
    const pG = new THREE.BufferGeometry(); pG.setAttribute("position", new THREE.BufferAttribute(pP, 3));
    const para = new THREE.Points(pG, new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.2, transparent: true, opacity: 0.35, depthWrite: false })); kotlik.add(para);
    stin(kotlik); reg(kotlik, "kotlik");
    let micha = -10, paraPuf = 0;
    krok((t, dt) => {
      paraPuf = Math.max(0, paraPuf - dt * 0.4); const u = t - micha;
      for (let i = 0; i < nP; i++) { pZ[i] += dt * (1 + paraPuf * 2); if (pZ[i] > 2) pZ[i] = 0; pP.set([Math.sin(t + i) * 0.08 * pZ[i], 0.95 + pZ[i] * 0.4, Math.cos(t * 0.8 + i) * 0.06 * pZ[i]], i * 3); }
      pG.attributes.position.needsUpdate = true; (para.material as THREE.PointsMaterial).opacity = 0.3 + paraPuf * 0.4;
      vareska.position.set(u < 2.5 ? Math.cos(u * 6) * 0.22 : 0.15, 1.1, u < 2.5 ? Math.sin(u * 6) * 0.22 : 0);
      if (u < 2.5) coko.rotation.z = u * 4;
    });

    // ── marshmallow pufík vpravo (Hexík si na něj sedne) ──
    const PUFIK = new THREE.Vector3(3.95, 0, -0.1), PUF_YAW = -0.95, vpred = new THREE.Vector3(Math.sin(PUF_YAW), 0, Math.cos(PUF_YAW));
    const pufik = new THREE.Group(); pufik.position.set(PUFIK.x, Y0, PUFIK.z); pufik.rotation.y = PUF_YAW; svet.add(pufik);
    const mm = (c: string) => plast(c, { roughness: 0.85, sheen: 1, sheenColor: new THREE.Color("#FFFFFF") });
    const spodni = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.32, 32), mm("#FFFFFF")); spodni.position.y = 0.16; pufik.add(spodni);
    const horni = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.28, 32), mm("#FFB3CF")); horni.position.y = 0.46; pufik.add(horni);
    for (const y of [0.32, 0.6]) { const v = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.06, 8, 32), mm(y > 0.5 ? "#FFB3CF" : "#FFFFFF")); v.rotation.x = Math.PI / 2; v.position.y = y; pufik.add(v); }
    stin(pufik); reg(pufik, "pufik");
    const PUF_PRED = PUFIK.clone().addScaledVector(vpred, 1.2);

    // ── perníček panáček u stromku ──
    const panacek = new THREE.Group(); panacek.position.set(-1.4, Y0, -2.4); svet.add(panacek);
    const pTelo = new THREE.Mesh(new THREE.ExtrudeGeometry(pernicekShape(0.55), { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 }), pernMat);
    pTelo.position.set(0, 0.62, -0.06); panacek.add(pTelo);
    for (const [x, y] of [[-0.09, 1.1], [0.09, 1.1]] as const) { const oko = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), plast("#FFFFFF")); oko.position.set(x, y, 0.12); panacek.add(oko); }
    const usm = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 16, Math.PI), plast("#FFFFFF")); usm.rotation.z = Math.PI; usm.position.set(0, 1.0, 0.12); panacek.add(usm);
    for (let i = 0; i < 3; i++) { const kn = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), plast(CUKR[i], { clearcoat: 1 })); kn.position.set(0, 0.78 - i * 0.14, 0.12); panacek.add(kn); }
    stin(panacek); reg(panacek, "panacek");
    let tanecOd = -10;
    krok((t) => { const u = t - tanecOd; if (u < 3) { panacek.position.y = Y0 + Math.abs(Math.sin(u * 8)) * 0.3; panacek.rotation.y = u * 4.2; panacek.rotation.z = Math.sin(u * 8) * 0.25; } else { panacek.position.y = Y0; panacek.rotation.set(0, Math.sin(t * 0.8) * 0.15 + 0.3, 0); } });

    // ── hodiny s kukačkou nad pecí ──
    const hodiny = new THREE.Group(); hodiny.position.set(-5.02, Y0 + 3.5, 0.85); hodiny.rotation.y = Math.PI / 2; svet.add(hodiny);
    const domek = new THREE.Mesh(zaobleny(0.8, 0.8, 0.3, 0.06), plast("#8A5A3B", { clearcoat: 0.6 })); hodiny.add(domek);
    const stit = new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.38, 4), plast("#FFFFFF", { clearcoat: 1 })); stit.rotation.y = Math.PI / 4; stit.scale.z = 0.4; stit.position.y = 0.58; hodiny.add(stit);
    const cifernik = new THREE.Mesh(new THREE.CircleGeometry(0.26, 32), new THREE.MeshStandardMaterial({ map: tex(128, 128, (x) => { x.fillStyle = "#FFF8EC"; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.fillStyle = "#3A2A20"; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.beginPath(); x.arc(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50, 4, 0, 7); x.fill(); } }) }));
    cifernik.position.set(0, -0.08, 0.16); hodiny.add(cifernik);
    const dvirkaK = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), plast("#5E2E12")); dvirkaK.position.set(0, 0.26, 0.16); hodiny.add(dvirkaK);
    const ptacek = new THREE.Group(); ptacek.position.set(0, 0.26, 0.05); hodiny.add(ptacek);
    const ptTelo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), plast("#6FD3FF", { clearcoat: 1 })); ptTelo.scale.set(1, 0.85, 1.2); ptacek.add(ptTelo);
    const zobak = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 8), plast("#FFD45A")); zobak.rotation.x = Math.PI / 2; zobak.position.z = 0.12; ptacek.add(zobak);
    for (const [y, c] of [[-0.55, "#FFD45A"], [-0.75, "#FF5A7A"]] as const) { const zav = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 10), plast(c, { metalness: 0.4 })); zav.position.set(y === -0.55 ? -0.12 : 0.12, y, 0.08); hodiny.add(zav); }
    stin(hodiny); reg(hodiny, "kukacka");
    let kukOd = -10;
    krok((t) => { const u = t - kukOd; const ven = u < 0 ? 0 : u < 0.25 ? u / 0.25 : u < 1.6 ? 1 : u < 1.9 ? 1 - (u - 1.6) / 0.3 : 0; ptacek.position.z = 0.05 + ven * 0.32; ptacek.rotation.x = ven > 0.9 ? Math.sin(u * 22) * 0.3 : 0; dvirkaK.rotation.y = ven * 1.4; });

    // ── úkoly pro Hexíka ──
    const ukol = (klic: string): UkolPokoje | null => {
      if (klic === "pec") { const bod = new THREE.Vector3(-3.4, 0, -1.0); return { bod, smer: -Math.PI / 2, trvani: 3.2, efektPo: 0.4,
        ruce: (u) => (u < 0.3 ? u * 5 : 1.5),
        prubeh: (u) => { vRuce.visible = u > 0.4 && u < 0.95; if (vRuce.visible) { vRuce.position.copy(hexik.vRuce(new THREE.Vector3(0, 0.6, 1.0))); vRuce.rotation.set(0, hexik.root().rotation.y, 0); } },
        efekt: () => { pecOd = cas(); hexik.vyraz("radost", 1.6); konfety(pec.localToWorld(new THREE.Vector3(0, 1.0, 1.0)), 0.4, [new THREE.Color("#FFD45A"), new THREE.Color("#FFFFFF")]); },
        konec: () => { vRuce.visible = false; const n = upeceno.length < 7 ? new THREE.Mesh(pernGeo, pernMat) : upeceno.shift()!; n.rotation.set(-Math.PI / 2, 0, rnd(-0.6, 0.6)); n.position.set(rnd(-0.12, 0.12), 1.13 + upeceno.length * 0.045, rnd(-0.1, 0.1)); n.castShadow = true; stul.add(n); upeceno.push(n); konfety(stul.localToWorld(new THREE.Vector3(0, 1.3, 0)), 0.3); } }; }
      if (klic === "stromek") { const bod = new THREE.Vector3(-1.75, 0, -1.35); return { bod, smer: smerK(bod, strom.position), trvani: 1.8, efektPo: 0.45, ruce: (u) => zvedni(u, 0.45),
        efekt: () => { stromOd = cas(); konfety(new THREE.Vector3(-3.2, Y0 + 3.4, -3.0), 0.6); hexik.vyraz("radost", 1.4); } }; }
      if (klic === "kotlik") { const bod = new THREE.Vector3(-2.85, 0, 1.7); return { bod, smer: smerK(bod, kotlik.position), trvani: 2.8, efektPo: 0.15, ruce: () => 1.0 + Math.sin(cas() * 6) * 0.25,
        efekt: () => { micha = cas(); paraPuf = 1.5; hexik.vyraz("radost", 2.6); } }; }
      if (klic === "pufik") return { bod: PUF_PRED, smer: PUF_YAW, trvani: 0.7, efektPo: 0.99, ruce: (u) => 0.3 + u * 0.6, sedni: 0.62,
        prubeh: (u) => { hexik.pos.lerpVectors(PUF_PRED, PUFIK, Math.min(1, u * 1.3)); }, efekt: () => { hexik.vyraz("ospaly", 0.1); } };
      if (klic === "panacek") { const bod = new THREE.Vector3(-0.75, 0, -1.6); return { bod, smer: smerK(bod, panacek.position), trvani: 2.2, efektPo: 0.25, ruce: (u) => 1.4 + Math.abs(Math.sin(u * 18)) * 0.5,
        efekt: () => { tanecOd = cas(); hexik.vyraz("radost", 2.4); konfety(panacek.localToWorld(new THREE.Vector3(0, 1.2, 0)), 0.4); } }; }
      if (klic === "kukacka") { const bod = new THREE.Vector3(-3.3, 0, 0.3); return { bod, smer: smerK(bod, new THREE.Vector3(-5, 0, 0.85)), trvani: 2.0, efektPo: 0.35, ruce: (u) => zvedni(u, 0.35),
        prubeh: (u) => { if (u > 0.1 && u < 0.16) hexik.skoc(); }, efekt: () => { kukOd = cas(); hexik.vyraz("prekvapeni", 1.6); } }; }
      return null;
    };

    return {
      kouzla: KOUZLA_CHALOUPKY,
      prekazky: [[-3.2, -3.0, 1.45], [-4.55, -1.8, 0.8], [-4.55, -0.2, 0.8], [-3.8, 1.3, 0.65], [3.95, -0.1, 0.85], [4.7, 1.55, 0.7], [-1.4, -2.4, 0.4]],
      ukol,
    };
  });
}
