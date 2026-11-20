/**
 * Domov „Perníková chaloupka“ (adventní sada z kalendáře): zasněžená paseka v noci s perníkovou
 * chaloupkou, pecí na perníčky, obřími lízátky, marshmallow sněhulákem, zamrzlým rybníčkem,
 * lucerničkami, sáňkami a schránkou na dopis Ježíškovi. Hexík všechna kouzla dělá sám (diorama.ts).
 * Prototyp ke schválení (Karel 20. 11. 2026: každý domov nejdřív jako prototyp).
 */
import * as THREE from "three";
import { vytvorDiorama, rnd, tex, plast, zaobleny, stin, smerK, zvedni, jePotomek, type Diorama, type MoznostiDioramatu, type Ukol } from "./diorama";

export const KOUZLA_CHALOUPKY: Record<string, string> = {
  hexik: "Pohlaď Hexíka", domek: "Hexík zaklepe na chaloupku", pec: "Hexík upeče perníček", lizatko: "Hexík olízne lízátko",
  stromek: "Hexík setřese sníh ze stromku", snehulak: "Hexík nasadí sněhulákovi klobouk", rybnik: "Hexík se projede po ledě",
  lucerny: "Hexík rozsvítí lucerničky", sane: "Hexík roztlačí sáňky", schranka: "Hexík pošle dopis Ježíškovi", tabule: "Podívej se na dnešní plán",
};

const CUKR = ["#FF5A7A", "#FFD45A", "#6FD3FF", "#8CF08A", "#FF9AE6", "#FFFFFF"].map((c) => new THREE.Color(c));

/** Obrys perníčku (panáček) pro vytlačení. */
function pernicekShape(s = 1) {
  const sh = new THREE.Shape();
  const b: [number, number][] = [[0, 1.0], [0.22, 0.95], [0.3, 0.75], [0.22, 0.58], [0.55, 0.52], [0.62, 0.38], [0.5, 0.3], [0.26, 0.32], [0.3, 0], [0.48, -0.5], [0.4, -0.62], [0.22, -0.58], [0, -0.22]];
  const pts = [...b, ...b.slice(1, -1).reverse().map(([x, y]) => [-x, y] as [number, number])].map(([x, y]) => new THREE.Vector2(x * s, y * s));
  sh.moveTo(pts[0].x, pts[0].y); sh.splineThru(pts.slice(1).concat([pts[0]]));
  return sh;
}

export function vytvorChaloupku(canvas: HTMLCanvasElement, o: MoznostiDioramatu): Diorama {
  return vytvorDiorama(canvas, o, (k) => {
    const { svet, Y0, reg, krok, konfety, hexik, camera } = k;
    const cas = hexik.cas;

    // ── ostrůvek: sněhová pokrývka na perníkovém těstě s polevou ──
    const snihTex = tex(512, 512, (x) => {
      const g = x.createRadialGradient(256, 256, 40, 256, 256, 360); g.addColorStop(0, "#FFFFFF"); g.addColorStop(1, "#DCE8FF"); x.fillStyle = g; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${rnd(170, 210)},${rnd(195, 225)},255,${rnd(0.08, 0.25)})`; x.beginPath(); x.arc(rnd(0, 512), rnd(0, 512), rnd(1, 4), 0, 7); x.fill(); }
      x.fillStyle = "rgba(196,150,110,.18)"; // vyšlapaná cestička
      for (let t = 0; t < 1; t += 0.01) { x.beginPath(); x.arc(250 + Math.sin(t * 5) * 40, 200 + t * 300, 26, 0, 7); x.fill(); }
    });
    const bokTex = tex(512, 128, (x) => {
      x.fillStyle = "#A8642F"; x.fillRect(0, 0, 512, 128);
      for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(90,45,15,${rnd(0.1, 0.3)})`; x.fillRect(rnd(0, 512), rnd(30, 128), 2, 2); }
      x.fillStyle = "#FFFFFF"; x.fillRect(0, 0, 512, 20);
      for (let i = 0; i < 512; i += 32) { x.beginPath(); x.ellipse(i + 16, 20, 12, 10 + (i % 64 ? 8 : 16), 0, 0, Math.PI); x.fill(); }
    }, [3, 1]);
    const bokMat = new THREE.MeshPhysicalMaterial({ map: bokTex, roughness: 0.7, clearcoat: 0.2 });
    const zem = new THREE.Mesh(zaobleny(11, 0.8, 8.6, 0.35, 6), [bokMat, bokMat, new THREE.MeshPhysicalMaterial({ map: snihTex, roughness: 0.9, sheen: 1, sheenColor: new THREE.Color("#FFFFFF") }), plast("#7A4520"), bokMat, bokMat]);
    zem.position.set(0, Y0 - 0.4, -0.3); stin(zem, false, true); svet.add(zem); reg(zem, "podlaha");
    const spodek = new THREE.Mesh(zaobleny(10.5, 1.3, 8.1, 0.5, 6), plast("#8A4E24", { roughness: 0.8 })); spodek.position.set(0, Y0 - 1.3, -0.3); svet.add(spodek);
    // sněhové závěje na okrajích
    for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; const z = new THREE.Mesh(new THREE.SphereGeometry(rnd(0.25, 0.42), 18, 12), plast("#FFFFFF", { roughness: 0.95, sheen: 1 }));
      z.scale.y = 0.35; z.position.set(Math.cos(a) * 5.1, Y0 + 0.02, -0.3 + Math.sin(a) * 3.9); stin(z, false, true); svet.add(z); }

    // ── pozadí: kopce, měsíc, hvězdy ──
    for (const [x, z, r, h] of [[-7, -12, 3.6, 2.6], [-1.5, -14, 4.6, 3.4], [5, -13, 4, 2.8], [10, -11, 3, 2]] as const) {
      const kopec = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#5E70A8", roughness: 1 })); kopec.scale.y = h / r; kopec.position.set(x, Y0 - 2.4, z); svet.add(kopec);
    }
    const mesic = new THREE.Mesh(new THREE.SphereGeometry(0.7, 32, 16), new THREE.MeshBasicMaterial({ color: "#FFF4D6" })); mesic.position.set(5.5, 6.5, -10); svet.add(mesic);
    const hvP = new Float32Array(160 * 3); for (let i = 0; i < 160; i++) hvP.set([rnd(-14, 14), rnd(3, 10), rnd(-14, -10)], i * 3);
    const hvG = new THREE.BufferGeometry(); hvG.setAttribute("position", new THREE.BufferAttribute(hvP, 3));
    const hvezdy = new THREE.Points(hvG, new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.06, transparent: true, opacity: 0.85 })); svet.add(hvezdy);
    krok((t) => { (hvezdy.material as THREE.PointsMaterial).opacity = 0.7 + Math.sin(t * 1.7) * 0.15; });

    // ── padající sníh ──
    const nS = k.lehce ? 140 : 320, sP = new Float32Array(nS * 3); for (let i = 0; i < nS; i++) sP.set([rnd(-6, 6), rnd(Y0, 7), rnd(-5, 4)], i * 3);
    const sG = new THREE.BufferGeometry(); sG.setAttribute("position", new THREE.BufferAttribute(sP, 3));
    const snih = new THREE.Points(sG, new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.07, transparent: true, opacity: 0.9, depthWrite: false })); svet.add(snih);
    krok((t, dt) => { for (let i = 0; i < nS; i++) { let y = sP[i * 3 + 1] - dt * (0.35 + (i % 7) * 0.05); if (y < Y0) y = 7; sP[i * 3 + 1] = y; sP[i * 3] += Math.sin(t + i) * 0.002; } sG.attributes.position.needsUpdate = true; });

    // ── perníková chaloupka ──
    const pernik = tex(512, 512, (x) => {
      x.fillStyle = "#B8712F"; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(${rnd(80, 120)},${rnd(40, 60)},15,${rnd(0.1, 0.35)})`; x.beginPath(); x.arc(rnd(0, 512), rnd(0, 512), rnd(0.8, 2.4), 0, 7); x.fill(); }
      x.strokeStyle = "#FFFFFF"; x.lineWidth = 9; x.lineCap = "round";
      x.beginPath(); for (let i = 0; i <= 512; i += 32) x.lineTo(i, 40 + (i / 32) % 2 * 18); x.stroke(); // cik-cak poleva nahoře
      x.lineWidth = 6; for (let i = 0; i < 512; i += 64) { x.beginPath(); x.arc(i + 32, 470, 16, Math.PI, 0); x.stroke(); }
      x.fillStyle = "#FFFFFF"; for (let i = 0; i < 512; i += 64) { x.beginPath(); x.arc(i + 32, 430, 6, 0, 7); x.fill(); }
    });
    const pernikMat = new THREE.MeshPhysicalMaterial({ map: pernik, roughness: 0.65, clearcoat: 0.25 });
    const domek = new THREE.Group(); domek.position.set(-1.2, Y0, -2.7); svet.add(domek);
    const steny = new THREE.Mesh(zaobleny(3.2, 2.1, 2.4, 0.18, 4), pernikMat); steny.position.y = 1.05; domek.add(steny);
    // štíty a střecha s polevou
    const stit = new THREE.Shape(); stit.moveTo(-1.6, 0); stit.lineTo(1.6, 0); stit.lineTo(0, 1.35); stit.lineTo(-1.6, 0);
    for (const z of [1.2, -1.2]) { const s = new THREE.Mesh(new THREE.ExtrudeGeometry(stit, { depth: 0.12, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2 }), pernikMat); s.position.set(0, 2.08, z - 0.06); domek.add(s); }
    const strechaMat = plast("#7A3E1A", { roughness: 0.6, clearcoat: 0.4 });
    for (const sx of [-1, 1]) {
      const deska = new THREE.Group(); deska.position.set(sx * 0.85, 2.75, 0); deska.rotation.z = -sx * 0.69; domek.add(deska);
      const d = new THREE.Mesh(zaobleny(2.25, 0.18, 2.9, 0.08), strechaMat); deska.add(d);
      // poleva po okraji (kapky) a cukrové knoflíky
      for (let i = 0; i < 11; i++) { const kap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), plast("#FFFFFF", { roughness: 0.25, clearcoat: 1 })); kap.scale.set(1, 1.5, 1); kap.position.set(sx * 1.1, -0.12, -1.35 + i * 0.27); deska.add(kap); }
      const poleva = new THREE.Mesh(zaobleny(2.3, 0.08, 2.95, 0.04), plast("#FFFFFF", { roughness: 0.3, clearcoat: 1 })); poleva.position.y = 0.1; poleva.scale.set(1, 1, 1); deska.add(poleva);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { const kn = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), plast(`#${CUKR[(r + c) % 5].getHexString()}`, { roughness: 0.2, clearcoat: 1 })); kn.scale.y = 0.6; kn.position.set(-0.7 + r * 0.6, 0.17, -1.1 + c * 0.55); deska.add(kn); }
    }
    const hreben = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.0, 12), plast("#FFFFFF", { clearcoat: 1, roughness: 0.25 })); hreben.rotation.x = Math.PI / 2; hreben.position.y = 3.45; domek.add(hreben);
    // komín s kouřem
    const komin = new THREE.Mesh(zaobleny(0.5, 0.9, 0.5, 0.06), pernikMat); komin.position.set(0.85, 3.6, -0.6); domek.add(komin);
    const kouř: { m: THREE.Mesh; f: number }[] = [];
    for (let i = 0; i < 10; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), new THREE.MeshBasicMaterial({ color: "#E9E6FA", transparent: true, opacity: 0.3, depthWrite: false })); domek.add(m); kouř.push({ m, f: i / 10 }); }
    let koureNavic = 0;
    // okna se světlem
    const oknaMat = new THREE.MeshStandardMaterial({ color: "#FFE2A0", emissive: "#FFB347", emissiveIntensity: 1.3, toneMapped: false });
    for (const x of [-1.0, 1.0]) {
      const okno = new THREE.Mesh(zaobleny(0.62, 0.62, 0.06, 0.08), oknaMat); okno.position.set(x, 1.25, 1.22); domek.add(okno);
      for (const [w, h] of [[0.7, 0.06], [0.06, 0.7]] as const) { const kriz = new THREE.Mesh(zaobleny(w, h, 0.08, 0.02), plast("#FFFFFF", { clearcoat: 1 })); kriz.position.set(x, 1.25, 1.26); domek.add(kriz); }
      const ramek = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 4), plast("#FF5A7A", { clearcoat: 1 })); ramek.rotation.z = Math.PI / 4; ramek.position.set(x, 1.25, 1.24); domek.add(ramek);
    }
    // dveře na pantu
    const pant = new THREE.Group(); pant.position.set(-0.36, 0, 1.24); domek.add(pant);
    const dvere = new THREE.Mesh(zaobleny(0.72, 1.25, 0.1, 0.1), plast("#5E2E12", { clearcoat: 0.6 })); dvere.position.set(0.36, 0.63, 0); pant.add(dvere);
    const klika = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), plast("#FFD45A", { metalness: 0.8, roughness: 0.2 })); klika.position.set(0.62, 0.62, 0.07); pant.add(klika);
    const srdce = new THREE.Shape(); srdce.moveTo(0, -0.12); srdce.bezierCurveTo(-0.2, 0.02, -0.12, 0.18, 0, 0.08); srdce.bezierCurveTo(0.12, 0.18, 0.2, 0.02, 0, -0.12);
    const srdceM = new THREE.Mesh(new THREE.ExtrudeGeometry(srdce, { depth: 0.03, bevelEnabled: false }), plast("#FF5A7A", { clearcoat: 1 })); srdceM.position.set(0.36, 0.95, 0.05); pant.add(srdceM);
    const svetloDveri = new THREE.PointLight("#FFB866", 0, 4, 1.6); svetloDveri.position.set(0, 0.8, 1.8); domek.add(svetloDveri);
    const svetloDomu = new THREE.PointLight("#FFB866", 3, 5, 1.6); svetloDomu.position.set(0, 1.3, 2.0); domek.add(svetloDomu);
    stin(domek); reg(domek, "domek");
    let klepOd = -10;
    krok((t, dt) => {
      const u = t - klepOd; const otevreni = u < 0 ? 0 : u < 0.5 ? u / 0.5 : u < 3.2 ? 1 : u < 3.8 ? 1 - (u - 3.2) / 0.6 : 0;
      pant.rotation.y = -otevreni * 1.25; svetloDveri.intensity = otevreni * 6;
      oknaMat.emissiveIntensity = 1.3 + Math.sin(t * 2.2) * 0.1 + otevreni * 0.8;
      koureNavic = Math.max(0, koureNavic - dt * 0.3);
      for (const c of kouř) { c.f = (c.f + dt * (0.12 + koureNavic * 0.2)) % 1; c.m.position.set(0.85 + Math.sin(c.f * 6 + t) * 0.15, 4.1 + c.f * 2.4, -0.6 + c.f * 0.4); c.m.scale.setScalar(0.3 + c.f * (0.9 + koureNavic)); (c.m.material as THREE.MeshBasicMaterial).opacity = (1 - c.f) * 0.28; }
    });

    // ── pec na perníčky a talíř ──
    const pec = new THREE.Group(); pec.position.set(3.5, Y0, -2.4); pec.rotation.y = -0.5; svet.add(pec);
    const kopule = new THREE.Mesh(new THREE.SphereGeometry(0.95, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2), plast("#C9673C", { roughness: 0.8 })); kopule.position.y = 0.55; pec.add(kopule);
    const podstava = new THREE.Mesh(zaobleny(2.0, 0.55, 2.0, 0.12), plast("#E8D9C4", { roughness: 0.7 })); podstava.position.y = 0.28; pec.add(podstava);
    const ustí = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24, 0, Math.PI), new THREE.MeshStandardMaterial({ color: "#FF8A3D", emissive: "#FF6A1A", emissiveIntensity: 1.6, toneMapped: false })); ustí.position.set(0, 0.56, 0.94); pec.add(ustí);
    const pecSvetlo = new THREE.PointLight("#FF7A2E", 3, 4, 1.6); pecSvetlo.position.set(0, 0.8, 1.5); pec.add(pecSvetlo);
    const trubka = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.7, 12), plast("#7A7F8C", { metalness: 0.6, roughness: 0.4 })); trubka.position.set(0.3, 1.65, -0.2); pec.add(trubka);
    const stul = new THREE.Group(); stul.position.set(4.3, Y0, -0.9); svet.add(stul);
    const deskaStolu = new THREE.Mesh(zaobleny(1.2, 0.1, 0.9, 0.04), plast("#C08A55")); deskaStolu.position.y = 0.8; stul.add(deskaStolu);
    for (const [x, z] of [[-0.5, -0.35], [0.5, -0.35], [-0.5, 0.35], [0.5, 0.35]] as const) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), plast("#9A6A42")); n.position.set(x, 0.4, z); stul.add(n); }
    const talir = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.05, 32), plast("#FFFFFF", { clearcoat: 1 })); talir.position.y = 0.88; stul.add(talir);
    const pernGeo = new THREE.ExtrudeGeometry(pernicekShape(0.32), { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 2 });
    const pernMat = new THREE.MeshPhysicalMaterial({ map: pernik, roughness: 0.6, clearcoat: 0.3 });
    const upeceno: THREE.Mesh[] = [];
    const vRuce = new THREE.Mesh(pernGeo, pernMat); vRuce.visible = false; svet.add(vRuce);
    stin(pec); stin(stul); reg(pec, "pec"); reg(stul, "pec");
    krok((t) => { (ustí.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(t * 9) * 0.2; pecSvetlo.intensity = 3 + Math.sin(t * 11) * 0.5; });

    // ── obří lízátka ──
    const lizatka: { g: THREE.Group; tocit: number }[] = [];
    const spirala = (a: string, b: string) => tex(256, 256, (x) => { x.fillStyle = a; x.fillRect(0, 0, 256, 256); x.strokeStyle = b; x.lineWidth = 18; x.beginPath(); for (let t = 0; t < 40; t += 0.05) { const r = t * 3.1; x.lineTo(128 + Math.cos(t) * r, 128 + Math.sin(t) * r); } x.stroke(); });
    for (const [x, z, a, b, v] of [[-4.4, -1.4, "#FF5A7A", "#FFFFFF", 1.0], [2.7, -3.0, "#6FD3FF", "#FFD45A", 0.85]] as const) {
      const g = new THREE.Group(); g.position.set(x, Y0, z); svet.add(g);
      const tyc = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2 * v, 10), plast("#FFFFFF", { clearcoat: 1 })); tyc.position.y = 1.1 * v; g.add(tyc);
      const hlava = new THREE.Group(); hlava.position.y = 2.3 * v; g.add(hlava);
      const t2 = spirala(a, b); const kruh = new THREE.MeshPhysicalMaterial({ map: t2, roughness: 0.15, clearcoat: 1 });
      const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.75 * v, 0.75 * v, 0.2, 40), [plast(a, { clearcoat: 1 }), kruh, kruh]); disk.rotation.x = Math.PI / 2; hlava.add(disk);
      const masle = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 20), plast("#FF9AE6", { clearcoat: 1 })); masle.position.y = -0.82 * v; hlava.add(masle);
      stin(g); reg(g, "lizatko"); lizatka.push({ g, tocit: -10 });
    }
    krok((t) => { for (const l of lizatka) { const u = t - l.tocit; const h = l.g.children[1]; h.rotation.z = u < 1.6 ? u * u * 6 : Math.sin(t * 0.8) * 0.06; l.g.rotation.y = Math.sin(t * 0.5 + l.g.position.x) * 0.25; } });

    // ── zasněžené stromky ──
    const stromky: { g: THREE.Group; tres: number }[] = [];
    for (const [x, z, s] of [[-4.1, -3.3, 1.1], [1.9, -3.6, 0.9], [4.5, -3.3, 0.8], [-3.6, 2.9, 0.75]] as const) {
      const g = new THREE.Group(); g.position.set(x, Y0, z); g.scale.setScalar(s); svet.add(g);
      const kmen = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.5, 10), plast("#6B4428")); kmen.position.y = 0.25; g.add(kmen);
      for (const [r, h, y] of [[1.1, 1.1, 0.95], [0.85, 0.95, 1.6], [0.6, 0.85, 2.2]] as const) {
        const jehl = new THREE.Mesh(new THREE.ConeGeometry(r, h, 18), plast("#2E7D57", { roughness: 0.75, sheen: 0.5 })); jehl.position.y = y; g.add(jehl);
        const cep = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, h * 0.38, 18), plast("#FFFFFF", { roughness: 0.9, sheen: 1 })); cep.position.y = y + h * 0.33; g.add(cep);
      }
      const hv = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshStandardMaterial({ color: "#FFD45A", emissive: "#FFB000", emissiveIntensity: 1.4 })); hv.position.y = 2.75; g.add(hv);
      stin(g); reg(g, "stromek"); stromky.push({ g, tres: -10 });
    }
    krok((t) => { for (const st of stromky) { const u = t - st.tres; st.g.rotation.z = u < 1.2 ? Math.sin(u * 28) * 0.08 * (1 - u / 1.2) : 0; st.g.children[st.g.children.length - 1].rotation.y = t; } });

    // ── marshmallow sněhulák ──
    const snehulak = new THREE.Group(); snehulak.position.set(3.0, Y0, 1.9); snehulak.rotation.y = -0.5; svet.add(snehulak);
    const mm = plast("#FFF8F0", { roughness: 0.85, sheen: 1, sheenColor: new THREE.Color("#FFE0EC") });
    for (const [r, h, y] of [[0.55, 0.7, 0.35], [0.45, 0.6, 1.0], [0.36, 0.5, 1.55]] as const) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 28), mm); c.position.y = y; snehulak.add(c); const v = new THREE.Mesh(new THREE.TorusGeometry(r - 0.06, 0.06, 8, 28), mm); v.rotation.x = Math.PI / 2; v.position.y = y + h / 2 - 0.04; snehulak.add(v); }
    for (const x of [-0.13, 0.13]) { const oko = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), plast("#3A2214", { clearcoat: 1 })); oko.position.set(x, 1.65, 0.34); snehulak.add(oko); }
    const nos = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 10), plast("#FF8A2A")); nos.rotation.x = Math.PI / 2; nos.position.set(0, 1.55, 0.48); snehulak.add(nos);
    for (const y of [0.9, 1.1]) { const knof = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), plast("#3A2214")); knof.position.set(0, y, 0.45); snehulak.add(knof); }
    const ruceS: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.8, 8), plast("#8A5A2E")); r.position.set(sx * 0.7, 1.15, 0); r.rotation.z = sx * 1.0; snehulak.add(r); ruceS.push(r); }
    const sala = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 10, 28), plast("#E63946", { sheen: 1, roughness: 0.9 })); sala.rotation.x = Math.PI / 2; sala.position.y = 1.32; snehulak.add(sala);
    const klobouk = new THREE.Group(); klobouk.position.y = 1.82; snehulak.add(klobouk);
    const kr = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24), plast("#2A1B3D", { clearcoat: 0.8 })); klobouk.add(kr);
    const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.45, 24), kr.material); tl.position.y = 0.24; klobouk.add(tl);
    const pasek = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.08, 24), plast("#FFD45A")); pasek.position.y = 0.06; klobouk.add(pasek);
    klobouk.visible = false;
    stin(snehulak); reg(snehulak, "snehulak");
    let kloboukOd = -10;
    krok((t) => {
      const u = t - kloboukOd; ruceS[1].rotation.z = u < 2 ? 1.0 - 0.9 * Math.abs(Math.sin(u * 8)) : 1.0;
      klobouk.position.y = 1.82 + (u < 0.4 ? (1 - u / 0.4) * 0.8 : 0);
      snehulak.rotation.y = -0.5 + Math.sin(t * 0.7) * 0.05;
    });

    // ── zamrzlý rybníček ──
    const RYB = new THREE.Vector3(-2.3, 0, 1.6);
    const ledTex = tex(256, 256, (x) => { const g = x.createRadialGradient(128, 128, 10, 128, 128, 128); g.addColorStop(0, "#DDF4FF"); g.addColorStop(1, "#8CC8EE"); x.fillStyle = g; x.fillRect(0, 0, 256, 256); x.strokeStyle = "rgba(255,255,255,.7)"; x.lineWidth = 2; for (let i = 0; i < 14; i++) { x.beginPath(); x.moveTo(rnd(0, 256), rnd(0, 256)); x.lineTo(rnd(0, 256), rnd(0, 256)); x.stroke(); } });
    const led = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 0.06, 48), new THREE.MeshPhysicalMaterial({ map: ledTex, roughness: 0.05, clearcoat: 1, metalness: 0.1 }));
    led.position.set(RYB.x, Y0 + 0.03, RYB.z); led.receiveShadow = true; svet.add(led); reg(led, "rybnik");
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const kam = new THREE.Mesh(new THREE.SphereGeometry(rnd(0.14, 0.24), 12, 10), plast("#FFFFFF", { roughness: 0.9 })); kam.scale.y = 0.5; kam.position.set(RYB.x + Math.cos(a) * 1.42, Y0 + 0.06, RYB.z + Math.sin(a) * 1.42); svet.add(kam); }
    // stopa bruslí
    const stopa = new THREE.Mesh(new THREE.RingGeometry(0.85, 0.9, 48), new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0 })); stopa.rotation.x = -Math.PI / 2; stopa.position.set(RYB.x, Y0 + 0.07, RYB.z); svet.add(stopa);
    let bruslenOd = -10;
    krok((t) => { const u = t - bruslenOd; (stopa.material as THREE.MeshBasicMaterial).opacity = u < 5 ? Math.min(0.6, u) * Math.max(0, 1 - (u - 3) / 2) : 0; });

    // ── lucerničky podél cestičky ──
    const lucerny: { sklo: THREE.MeshStandardMaterial; svetlo: THREE.PointLight }[] = [];
    const LUC: [number, number][] = [[-0.7, -0.6], [0.5, 0.4], [-0.4, 1.6], [0.7, 2.8]];
    for (const [x, z] of LUC) {
      const g = new THREE.Group(); g.position.set(x, Y0, z); svet.add(g);
      const sloup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.2, 8), plast("#2A2238", { metalness: 0.4 })); sloup.position.y = 0.6; g.add(sloup);
      const sklo = new THREE.MeshStandardMaterial({ color: "#FFE9B0", emissive: "#FFB347", emissiveIntensity: 0.05, transparent: true, opacity: 0.9, toneMapped: false });
      const box = new THREE.Mesh(zaobleny(0.28, 0.34, 0.28, 0.04), sklo); box.position.y = 1.35; g.add(box);
      const strisk = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.18, 4), plast("#2A2238")); strisk.rotation.y = Math.PI / 4; strisk.position.y = 1.6; g.add(strisk);
      const sv = new THREE.PointLight("#FFB866", 0, 3, 1.8); sv.position.y = 1.35; g.add(sv);
      stin(g); reg(g, "lucerny"); lucerny.push({ sklo, svetlo: sv });
    }
    let lucernyZap = false, lucernyOd = -10;
    krok((t) => { lucerny.forEach((l, i) => { const u = t - lucernyOd - i * 0.35; const cil = lucernyZap ? (u > 0 ? 1 : 0) : (u > 0 ? 0 : 1); const jas = lucernyOd < 0 ? 0 : cil; l.sklo.emissiveIntensity = 0.05 + jas * (1.6 + Math.sin(t * 7 + i) * 0.15); l.svetlo.intensity = jas * 2.2; }); });

    // ── sáňky s dárkem a zvonkem ──
    const sane = new THREE.Group(); sane.position.set(1.4, Y0, 2.4); sane.rotation.y = 0.4; svet.add(sane);
    const sedak = new THREE.Mesh(zaobleny(0.8, 0.12, 1.4, 0.05), plast("#C0392B", { clearcoat: 0.8 })); sedak.position.y = 0.32; sane.add(sedak);
    for (const sx of [-1, 1]) {
      const krivka = new THREE.CatmullRomCurve3([new THREE.Vector3(sx * 0.35, 0.05, -0.75), new THREE.Vector3(sx * 0.35, 0.03, 0.55), new THREE.Vector3(sx * 0.35, 0.2, 0.85), new THREE.Vector3(sx * 0.35, 0.42, 0.78)]);
      sane.add(new THREE.Mesh(new THREE.TubeGeometry(krivka, 30, 0.035, 8), plast("#FFD45A", { metalness: 0.7, roughness: 0.25 })));
      for (const z of [-0.5, 0.3]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.28, 6), plast("#FFD45A", { metalness: 0.7 })); n.position.set(sx * 0.35, 0.18, z); sane.add(n); }
    }
    const darek = new THREE.Mesh(zaobleny(0.5, 0.45, 0.5, 0.05), plast("#3D7BFF", { clearcoat: 0.9 })); darek.position.set(0, 0.6, -0.2); sane.add(darek);
    const stuha = new THREE.Mesh(zaobleny(0.52, 0.47, 0.1, 0.02), plast("#FFD45A")); stuha.position.copy(darek.position); sane.add(stuha);
    const zvonek = new THREE.Group(); zvonek.position.set(0, 0.5, 0.8); sane.add(zvonek);
    const zv = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), plast("#FFD45A", { metalness: 0.9, roughness: 0.15, side: THREE.DoubleSide })); zv.rotation.x = Math.PI; zv.position.y = -0.08; zvonek.add(zv);
    stin(sane); reg(sane, "sane");
    const saneStart = sane.position.clone(); let saneOd = -10;
    krok((t) => {
      const u = t - saneOd; const s = u < 0 ? 0 : u < 1.2 ? Math.sin((u / 1.2) * Math.PI * 0.5) : u < 4 ? 1 - (u - 1.2) / 2.8 : 0;
      sane.position.set(saneStart.x + Math.sin(0.4) * s * 1.3, Y0, saneStart.z + Math.cos(0.4) * s * 1.3);
      zvonek.rotation.x = u < 2.5 ? Math.sin(u * 16) * 0.6 * (1 - u / 2.5) : Math.sin(t * 2) * 0.05;
    });

    // ── schránka na dopis Ježíškovi ──
    const schranka = new THREE.Group(); schranka.position.set(1.15, Y0, -1.15); schranka.rotation.y = -0.35; svet.add(schranka);
    const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.0, 8), plast("#6B4428")); sl.position.y = 0.5; schranka.add(sl);
    const skr = new THREE.Mesh(zaobleny(0.5, 0.4, 0.62, 0.1), plast("#E63946", { clearcoat: 0.9 })); skr.position.y = 1.15; schranka.add(skr);
    const vrch = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.62, 20, 1, false, 0, Math.PI), plast("#E63946", { clearcoat: 0.9 })); vrch.rotation.set(0, 0, Math.PI / 2); vrch.rotation.order = "ZXY"; vrch.rotation.x = Math.PI / 2; vrch.position.y = 1.35; schranka.add(vrch);
    const sterbina = new THREE.Mesh(zaobleny(0.3, 0.04, 0.02, 0.01), plast("#2A1010")); sterbina.position.set(0, 1.22, 0.32); schranka.add(sterbina);
    const praporek = new THREE.Group(); praporek.position.set(0.27, 1.15, -0.1); schranka.add(praporek);
    const pr = new THREE.Mesh(zaobleny(0.03, 0.35, 0.03, 0.01), plast("#FFD45A")); pr.position.y = 0.17; praporek.add(pr);
    const prV = new THREE.Mesh(zaobleny(0.03, 0.12, 0.18, 0.01), plast("#FFD45A")); prV.position.set(0, 0.3, 0.08); praporek.add(prV);
    praporek.rotation.x = -Math.PI / 2;
    const dopis = new THREE.Mesh(zaobleny(0.26, 0.18, 0.02, 0.01), new THREE.MeshStandardMaterial({ color: "#FFFFFF", emissive: "#FFF2C0", emissiveIntensity: 0.6 })); dopis.visible = false; svet.add(dopis);
    stin(schranka); reg(schranka, "schranka");
    let dopisOd = -10;
    const zaTrpyt = new THREE.Vector3();
    krok((t) => {
      const u = t - dopisOd; praporek.rotation.x = u > 0 && u < 6 ? -Math.PI / 2 + Math.min(1, u * 3) * Math.PI / 2 : -Math.PI / 2;
      if (u > 0.4 && u < 3.4) { // dopis vyletí ze schránky ke hvězdám
        const s = (u - 0.4) / 3; dopis.visible = true;
        schranka.localToWorld(zaTrpyt.set(0, 1.4, 0)); dopis.position.set(zaTrpyt.x + Math.sin(s * 6) * 0.6 * s, zaTrpyt.y + s * 7, zaTrpyt.z - s * 3);
        dopis.rotation.set(s * 3, s * 5, 0); dopis.scale.setScalar(1 - s * 0.6);
      } else if (u >= 3.4 && u < 3.5) dopis.visible = false;
    });

    // ── dřevěná cedule s dnešním plánem ──
    const cedule = new THREE.Group(); cedule.position.set(-4.4, Y0, 0.9); cedule.rotation.y = 0.75; svet.add(cedule);
    const [nadpis, ...radky] = k.tabule;
    const cedTex = tex(512, 340, (x) => {
      x.fillStyle = "#C08A55"; x.fillRect(0, 0, 512, 340);
      for (let i = 0; i < 340; i += 68) { x.fillStyle = "rgba(90,50,20,.25)"; x.fillRect(0, i, 512, 4); }
      const napis = (t: string, y: number, vel: number, barva: string, tucne = false) => { let v = vel; const f = () => `${tucne ? "bold " : ""}${v}px 'Comic Sans MS', 'DM Sans', sans-serif`; x.font = f(); while (v > 16 && x.measureText(t).width > 444) { v -= 2; x.font = f(); } x.fillStyle = barva; x.fillText(t, 34, y); };
      napis(nadpis, 62, 40, "#3A1E0A", true);
      ["#1F6B3A", "#3A1E0A", "#8A3B00", "rgba(58,30,10,.8)"].forEach((b, i) => radky[i] && napis(radky[i], 128 + i * 54, i === 3 ? 24 : 30, b));
    });
    const deska = new THREE.Mesh(zaobleny(1.9, 1.3, 0.1, 0.06), [plast("#9A6A42"), plast("#9A6A42"), plast("#9A6A42"), plast("#9A6A42"), new THREE.MeshStandardMaterial({ map: cedTex, roughness: 0.9, emissive: "#FFFFFF", emissiveMap: cedTex, emissiveIntensity: 0 }), plast("#9A6A42")]);
    deska.position.y = 1.55; cedule.add(deska);
    for (const sx of [-0.75, 0.75]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.6, 8), plast("#7A4A2A")); n.position.set(sx, 0.8, -0.06); cedule.add(n); }
    const cepicka = new THREE.Mesh(zaobleny(2.1, 0.14, 0.3, 0.06), plast("#FFFFFF", { roughness: 0.9, sheen: 1 })); cepicka.position.y = 2.25; cedule.add(cepicka);
    stin(cedule); reg(cedule, "tabule");
    let ceduleOd = -10;
    krok((t) => { const u = t - ceduleOd; ((deska.material as THREE.Material[])[4] as THREE.MeshStandardMaterial).emissiveIntensity = u < 2 ? Math.sin((u / 2) * Math.PI) * 0.3 : 0; });

    // ── plotek z cukrových hůlek vpředu (ozdoba) ──
    const pruhy = tex(64, 256, (x) => { x.fillStyle = "#FFFFFF"; x.fillRect(0, 0, 64, 256); x.fillStyle = "#E63946"; for (let i = -64; i < 256; i += 40) { x.save(); x.translate(0, i); x.transform(1, 0.6, 0, 1, 0, 0); x.fillRect(0, 0, 64, 18); x.restore(); } });
    const hulMat = new THREE.MeshPhysicalMaterial({ map: pruhy, roughness: 0.25, clearcoat: 1 });
    for (let i = 0; i < 7; i++) {
      const x = -3.6 + i * 1.2; if (Math.abs(x) < 0.7) continue;
      const krivka = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(0.08, 0.9, 0), new THREE.Vector3(0.25, 0.92, 0), new THREE.Vector3(0.33, 0.78, 0)]);
      const hul = new THREE.Mesh(new THREE.TubeGeometry(krivka, 24, 0.06, 10), hulMat); hul.position.set(x, Y0, 3.55); hul.rotation.y = i % 2 ? Math.PI : 0; stin(hul); svet.add(hul);
    }

    // ── úkoly pro Hexíka ──
    const pernUkol = (): Ukol => {
      const bod = new THREE.Vector3(3.0, 0, -1.4);
      return { bod, smer: smerK(bod, pec.position), trvani: 3.0, efektPo: 0.55,
        ruce: (u) => (u < 0.3 ? u * 5 : 1.5),
        prubeh: (u) => { vRuce.visible = u > 0.3 && u < 0.92; if (vRuce.visible) { vRuce.position.copy(hexik.vRuce(new THREE.Vector3(0, 0.6, 1.0))); vRuce.rotation.set(0, hexik.root().rotation.y, 0); } if (u > 0.6 && u < 0.92) hexik.otoc(smerK(hexik.pos, stul.position)); },
        efekt: () => { hexik.vyraz("radost", 1.6); konfety(pec.localToWorld(new THREE.Vector3(0, 1.0, 1.0)), 0.4, [new THREE.Color("#FFD45A"), new THREE.Color("#FFFFFF")]); },
        konec: () => {
          vRuce.visible = false;
          const n = upeceno.length < 7 ? new THREE.Mesh(pernGeo, pernMat) : upeceno.shift()!;
          n.rotation.set(-Math.PI / 2, 0, rnd(-0.6, 0.6)); n.position.set(rnd(-0.14, 0.14), 0.93 + upeceno.length * 0.045, rnd(-0.12, 0.12)); n.castShadow = true;
          stul.add(n); upeceno.push(n);
        } };
    };

    return {
      pozadi: "#16204A",
      start: new THREE.Vector3(0.2, 0, 0.9),
      meze: { x: [-4.3, 4.4], z: [-1.2, 3.2] },
      kamera: { azim: 0.3, elev: 0.34, vzd: 17.5, cil: new THREE.Vector3(0, 0.7, -0.4) },
      svetla: { obloha: ["#9DB2FF", "#2A2446", 0.32], mesic: ["#BFD0FF", 0.7], hlavni: ["#FFE0B8", 0.8] },
      zare: 0.42,
      ukol: (klic, zasah) => {
        const t = cas();
        if (klic === "domek") { const bod = new THREE.Vector3(-1.2, 0, -0.7); return { bod, smer: Math.PI, trvani: 2.2, efektPo: 0.35, ruce: (u) => (u < 0.35 ? 1.2 + Math.sin(u * 60) * 0.5 : 0.4),
          efekt: () => { klepOd = cas(); koureNavic = 1.5; hexik.vyraz("prekvapeni", 1.4); konfety(new THREE.Vector3(-1.2, Y0 + 1.8, -1.3), 0.5, [new THREE.Color("#FF5A7A"), new THREE.Color("#FFD45A"), new THREE.Color("#FFFFFF")]); } }; }
        if (klic === "pec") return pernUkol();
        if (klic === "lizatko") { const l = lizatka.find((x) => jePotomek(zasah.object, x.g)) ?? lizatka[0]; const p = l.g.position; const bod = new THREE.Vector3(p.x + (p.x < 0 ? 0.9 : -0.9), 0, Math.max(-1.2, p.z + 0.5));
          return { bod, smer: smerK(bod, p), trvani: 1.8, efektPo: 0.4, ruce: (u) => zvedni(u, 0.4), efekt: () => { l.tocit = cas(); hexik.skoc(); hexik.vyraz("radost", 1.6); konfety(l.g.localToWorld(new THREE.Vector3(0, 2.2, 0)), 0.5); } }; }
        if (klic === "stromek") { const st = stromky.find((x) => jePotomek(zasah.object, x.g)) ?? stromky[0]; const p = st.g.position; const bod = new THREE.Vector3(THREE.MathUtils.clamp(p.x, -4.2, 4.3), 0, Math.max(-1.2, p.z + 1.4));
          return { bod, smer: smerK(bod, p), trvani: 1.8, efektPo: 0.35, ruce: (u) => (u < 0.35 ? u * 5 : 1.6 + Math.sin(cas() * 20) * 0.3),
            efekt: () => { st.tres = cas(); konfety(st.g.localToWorld(new THREE.Vector3(0, 2.2, 0)), 0.6, [new THREE.Color("#FFFFFF"), new THREE.Color("#DDEBFF")]); hexik.vyraz("prekvapeni", 1.2); } }; }
        if (klic === "snehulak") { const bod = new THREE.Vector3(2.4, 0, 2.7); return { bod, smer: smerK(bod, snehulak.position), trvani: 1.8, efektPo: 0.5, ruce: (u) => zvedni(u, 0.5),
          efekt: () => { klobouk.visible = !klobouk.visible; kloboukOd = cas(); hexik.vyraz("radost", 1.6); konfety(snehulak.localToWorld(new THREE.Vector3(0, 2.0, 0)), 0.4); } }; }
        if (klic === "rybnik") { const bod = RYB.clone().add(new THREE.Vector3(0.9, 0, 0)); return { bod, smer: 0, trvani: 4.2, efektPo: 0.1, ruce: () => 1.3 + Math.sin(cas() * 3) * 0.2,
          prubeh: (u) => { if (u > 0.05 && u < 0.95) { const a = ((u - 0.05) / 0.9) * Math.PI * 4; hexik.pos.set(RYB.x + Math.cos(a) * 0.88, 0, RYB.z + Math.sin(a) * 0.88); hexik.otoc(-a); } },
          efekt: () => { bruslenOd = cas(); hexik.vyraz("radost", 4); } }; }
        if (klic === "lucerny") { const [x, z] = LUC[0]; const bod = new THREE.Vector3(x + 0.6, 0, z + 0.3); return { bod, smer: smerK(bod, new THREE.Vector3(x, 0, z)), trvani: 1.6, efektPo: 0.45, ruce: (u) => zvedni(u, 0.45),
          efekt: () => { lucernyZap = !lucernyZap; lucernyOd = cas(); hexik.vyraz("radost", 1.4); } }; }
        if (klic === "sane") { const bod = saneStart.clone().add(new THREE.Vector3(-Math.sin(0.4) * 1.0, 0, -Math.cos(0.4) * 1.0)); bod.y = 0; return { bod, smer: 0.4, trvani: 1.8, efektPo: 0.25, ruce: () => 1.0,
          prubeh: (u) => { if (u > 0.25 && u < 0.8) hexik.pos.add(new THREE.Vector3(Math.sin(0.4), 0, Math.cos(0.4)).multiplyScalar(0.012)); },
          efekt: () => { saneOd = cas(); hexik.vyraz("radost", 1.6); } }; }
        if (klic === "schranka") { const bod = new THREE.Vector3(1.4, 0, -0.35); return { bod, smer: smerK(bod, schranka.position), trvani: 2.0, efektPo: 0.45, ruce: (u) => zvedni(u, 0.45),
          prubeh: (u) => { dopis.visible = u < 0.45; if (u < 0.45) { dopis.position.copy(hexik.vRuce(new THREE.Vector3(0, 0.8, 0.9))); dopis.rotation.set(0, hexik.root().rotation.y, 0); dopis.scale.setScalar(1); } },
          efekt: () => { dopisOd = cas(); hexik.vyraz("radost", 2); konfety(schranka.localToWorld(new THREE.Vector3(0, 1.6, 0)), 0.4, [new THREE.Color("#FFD45A"), new THREE.Color("#FFFFFF")]); } }; }
        if (klic === "tabule") { const bod = new THREE.Vector3(-3.4, 0, 1.6); return { bod, smer: smerK(bod, cedule.position), trvani: 2.2, efektPo: 0.4, ruce: (u) => (u < 0.4 ? u * 4 : 1.6),
          efekt: () => { ceduleOd = cas(); hexik.vyraz("radost", 1.6); } }; }
        void t; void camera;
        return null;
      },
    };
  });
}
