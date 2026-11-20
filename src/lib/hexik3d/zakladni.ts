/**
 * Základní pokojíček Hexíka, zdarma pro všechny (Karel 20. 11. 2026). Útulný dětský pokoj podle
 * standardu: levandulová tapeta se šestiúhelníky, postel, psací stůl s glóbusem a lampou, plakát,
 * nízká knihovnička, velká květina, kulatý koberec a míč. Věci stojí na místech, kam později půjde
 * vybavení z Obchůdku (obraz, koberec, lampa, květina, polička, výhled z okna).
 * Tabule (trénink), skříň (šatník) a okno dodává pokoj.ts.
 */
import * as THREE from "three";
import { rnd, tex, plast, zaobleny, stin, smerK, zvedni } from "./diorama";
import { vytvorPokoj, type MoznostiPokoje, type Pokoj3D, type UkolPokoje } from "./pokoj";

export const KOUZLA_ZAKLADNI: Record<string, string> = {
  hexik: "Pohlaď Hexíka", postel: "Hexík si zdřímne", globus: "Hexík roztočí glóbus", lampa: "Hexík rozsvítí lampu",
  kytka: "Hexík zalije květinu", knihovna: "Hexík vytáhne knížku", mic: "Hexík kopne do míče", okno: "Hexík uvidí padající hvězdu",
};

const BAREVNE = ["#FF6B8A", "#FFD45A", "#5BC0FF", "#7CDB8A", "#AFACFB", "#FF9F5A"];

export function vytvorZakladniPokojicek(canvas: HTMLCanvasElement, o: MoznostiPokoje): Pokoj3D {
  const tapeta = tex(512, 512, (x) => {
    x.fillStyle = "#D9D4FF"; x.fillRect(0, 0, 512, 512);
    x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 3;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      const cx = c * 64 + (r % 2) * 32, cy = r * 56; x.beginPath();
      for (let i = 0; i <= 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; const px = cx + Math.cos(a) * 18, py = cy + Math.sin(a) * 18; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.stroke();
    }
  }, [2.4, 1.4]);
  const podlaha = tex(512, 512, (x) => {
    for (let i = 0; i < 8; i++) { const g = x.createLinearGradient(0, i * 64, 512, i * 64 + 64); g.addColorStop(0, i % 2 ? "#E3C49A" : "#EDD0A6"); g.addColorStop(1, i % 2 ? "#D6B48A" : "#E1C296"); x.fillStyle = g; x.fillRect(0, i * 64, 512, 64);
      x.fillStyle = "rgba(120,80,40,.25)"; x.fillRect(0, i * 64, 512, 2); x.fillRect((i * 173) % 512, i * 64, 2, 64); }
  }, [2, 2]);
  const vzhled = {
    pozadi: "#2A2550", tapeta, podlaha, bokPodlahy: "#B08A5E", spodek: "#8F86D8", lista: "#FFFFFF", okrajSten: "#FFFFFF",
    vyhled: (x: CanvasRenderingContext2D) => {
      const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#3B2E7A"); g.addColorStop(0.45, "#C86FA8"); g.addColorStop(0.8, "#FFB37A"); g.addColorStop(1, "#FFD9A0"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 25; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0.4, 1)})`; x.beginPath(); x.arc(rnd(0, 256), rnd(0, 90), rnd(0.5, 1.3), 0, 7); x.fill(); }
      x.fillStyle = "#FFF1C9"; x.beginPath(); x.arc(70, 60, 12, 0, 7); x.fill();
      x.fillStyle = "#6A5AA8"; x.beginPath(); x.moveTo(0, 256); x.bezierCurveTo(60, 180, 120, 200, 170, 190); x.bezierCurveTo(210, 182, 240, 196, 256, 190); x.lineTo(256, 256); x.fill();
      x.fillStyle = "#4A3E86"; for (let i = 0; i < 9; i++) { const bx = 12 + i * 28, bh = 30 + (i * 37) % 40; x.fillRect(bx, 236 - bh, 20, bh + 20); x.fillStyle = "#FFD27A"; for (let k = 0; k < 3; k++) if ((i + k) % 2) x.fillRect(bx + 5, 236 - bh + 8 + k * 11, 4, 4); x.fillStyle = "#4A3E86"; }
    },
    snih: false, ramOkna: "#FFFFFF", zaves: "#AFACFB",
    tabule: { deska: ["#2C5A47", "#1C3D30"] as [string, string], ram: "#C08A55", text: "#F7F3E8", zvyrazneni: "#A6F0C0", tlacitko: "#FFD45A" },
    skrin: { drevo: "#E8DCCB", dvirka: "#F4ECE0", vyplet: "#AFACFB", knofliky: "#F5A623", cedule: ["#FFFFFF", "#5B55D6"] as [string, string] },
    svetla: { obloha: ["#FFD9C2", "#3A2E5A", 0.32] as [string, string, number], hlavni: ["#FFE2C0", 0.95] as [string, number], mesic: ["#C9B8FF", 0.4] as [string, number] },
  };

  return vytvorPokoj(canvas, o, vzhled, (k) => {
    const { svet, Y0, reg, krok, konfety, hexik } = k;
    const cas = hexik.cas;

    // ── kulatý koberec se šestiúhelníkem (místo na vybavení: koberec) ──
    const kob = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.95, 0.06, 64), new THREE.MeshPhysicalMaterial({ map: tex(512, 512, (x) => {
      x.fillStyle = "#AFACFB"; x.beginPath(); x.arc(256, 256, 256, 0, 7); x.fill();
      x.fillStyle = "#C9C6FF"; x.beginPath(); x.arc(256, 256, 200, 0, 7); x.fill();
      x.fillStyle = "#FFFFFF"; x.beginPath(); for (let i = 0; i <= 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; const px = 256 + Math.cos(a) * 120, py = 256 + Math.sin(a) * 120; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.fill();
      x.fillStyle = "#AFACFB"; x.beginPath(); x.arc(220, 240, 14, 0, 7); x.arc(292, 240, 14, 0, 7); x.fill(); x.strokeStyle = "#AFACFB"; x.lineWidth = 10; x.beginPath(); x.arc(256, 268, 34, 0.25, Math.PI - 0.25); x.stroke();
    }), roughness: 1, sheen: 1, sheenColor: new THREE.Color("#FFFFFF") }));
    kob.position.set(0.2, Y0 + 0.03, 0.4); stin(kob, false, true); svet.add(kob); reg(kob, "podlaha");

    // ── postel u levé stěny vzadu ──
    const postel = new THREE.Group(); postel.position.set(-4.0, Y0, -2.45); svet.add(postel);
    const ram = plast("#FFFFFF", { clearcoat: 0.6, roughness: 0.35 });
    const ramPostele = new THREE.Mesh(zaobleny(2.3, 0.4, 1.35, 0.1), ram); ramPostele.position.y = 0.35; postel.add(ramPostele);
    const matrace = new THREE.Mesh(zaobleny(2.2, 0.28, 1.25, 0.12), plast("#F4F6FF", { roughness: 0.8, sheen: 1 })); matrace.position.y = 0.66; postel.add(matrace);
    const peřina = new THREE.Mesh(zaobleny(1.5, 0.18, 1.3, 0.1), new THREE.MeshPhysicalMaterial({ map: tex(128, 128, (x) => { x.fillStyle = "#5B55D6"; x.fillRect(0, 0, 128, 128); x.fillStyle = "#FFD45A"; for (let i = 0; i < 18; i++) { x.beginPath(); x.arc(rnd(0, 128), rnd(0, 128), 3, 0, 7); x.fill(); } }, [2, 2]), roughness: 0.9, sheen: 1 }));
    peřina.position.set(0.32, 0.82, 0); postel.add(peřina);
    const polstar = new THREE.Mesh(zaobleny(0.55, 0.2, 0.9, 0.1), plast("#FFFFFF", { roughness: 0.9, sheen: 1 })); polstar.position.set(-0.72, 0.86, 0); postel.add(polstar);
    const celo = new THREE.Mesh(zaobleny(0.14, 1.3, 1.35, 0.07), ram); celo.position.set(-1.12, 0.65, 0); postel.add(celo);
    const hvezdaCelo = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshStandardMaterial({ color: "#FFD45A", emissive: "#FFB000", emissiveIntensity: 0.8 })); hvezdaCelo.position.set(-1.05, 1.42, 0); postel.add(hvezdaCelo);
    stin(postel); reg(postel, "postel");
    // písmena Z nad spícím Hexíkem
    const zTex = tex(64, 64, (x) => { x.fillStyle = "#FFFFFF"; x.font = "bold 52px 'DM Sans', sans-serif"; x.textAlign = "center"; x.fillText("Z", 32, 50); });
    const zetka = [0, 1, 2].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: zTex, transparent: true, opacity: 0, depthWrite: false })); s.scale.setScalar(0.3); svet.add(s); return s; });
    let spankOd = -10;
    krok((t) => { const u = t - spankOd; zetka.forEach((s, i) => { const f = ((u * 0.5 + i / 3) % 1); const vid = u > 0.6 && u < 9; (s.material as THREE.SpriteMaterial).opacity = vid ? Math.sin(f * Math.PI) : 0; s.position.set(-3.7 + f * 0.6, Y0 + 1.6 + f * 1.1, -2.45 + Math.sin(f * 6) * 0.1); s.scale.setScalar(0.18 + f * 0.25); }); hvezdaCelo.rotation.y = t; });

    // ── psací stůl u levé stěny vpředu: glóbus, lampa, knížky ──
    const stul = new THREE.Group(); stul.position.set(-4.5, Y0, 1.0); stul.rotation.y = Math.PI / 2; svet.add(stul);
    const drevo = plast("#E8C89A", { clearcoat: 0.5, roughness: 0.4 });
    const deska = new THREE.Mesh(zaobleny(1.9, 0.1, 0.85, 0.04), drevo); deska.position.y = 1.0; stul.add(deska);
    for (const sx of [-0.85, 0.85]) for (const z of [-0.33, 0.33]) { const n = new THREE.Mesh(zaobleny(0.08, 1.0, 0.08, 0.02), drevo); n.position.set(sx, 0.5, z); stul.add(n); }
    const zasuvky = new THREE.Mesh(zaobleny(0.6, 0.55, 0.75, 0.05), plast("#AFACFB", { clearcoat: 0.6 })); zasuvky.position.set(0.55, 0.65, 0); stul.add(zasuvky);
    for (const y of [0.5, 0.78]) { const k = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), plast("#F5A623")); k.position.set(0.55, y, 0.39); stul.add(k); }
    for (let i = 0; i < 4; i++) { const kn = new THREE.Mesh(zaobleny(0.32, 0.07, 0.45, 0.02), plast(BAREVNE[i])); kn.position.set(-0.6, 1.09 + i * 0.07, -0.1); kn.rotation.y = (i - 1.5) * 0.12; stul.add(kn); }
    // glóbus
    const globus = new THREE.Group(); globus.position.set(-0.05, 1.05, -0.1); stul.add(globus);
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.06, 16), plast("#5B55D6")); noz.position.y = 0.03; globus.add(noz);
    const osaG = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), plast("#D9B26A", { metalness: 0.7 })); osaG.position.y = 0.32; globus.add(osaG);
    const zeme = new THREE.Mesh(new THREE.SphereGeometry(0.2, 32, 20), new THREE.MeshPhysicalMaterial({ map: tex(256, 128, (x) => { x.fillStyle = "#4FA7F0"; x.fillRect(0, 0, 256, 128); x.fillStyle = "#7CDB8A"; for (const [cx, cy, rx, ry] of [[50, 50, 30, 22], [110, 70, 18, 30], [170, 45, 40, 20], [210, 85, 22, 14], [80, 100, 14, 8]]) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0.3, 0, 7); x.fill(); } }), roughness: 0.4, clearcoat: 0.6 }));
    zeme.position.y = 0.34; zeme.rotation.z = 0.4; globus.add(zeme);
    // lampa na stole (místo na vybavení: lampa)
    const lampa = new THREE.Group(); lampa.position.set(0.6, 1.05, -0.2); stul.add(lampa);
    const lNoha = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 16), plast("#FFFFFF")); lampa.add(lNoha);
    const lRameno = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 8), plast("#FFFFFF")); lRameno.position.set(0, 0.27, 0); lRameno.rotation.z = 0.25; lampa.add(lRameno);
    const stinitkoMat = new THREE.MeshStandardMaterial({ color: "#FFD45A", emissive: "#FFB347", emissiveIntensity: 0.1, side: THREE.DoubleSide });
    const stinitko = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.2, 20, 1, true), stinitkoMat); stinitko.position.set(-0.08, 0.56, 0); lampa.add(stinitko);
    const lampaSvetlo = new THREE.PointLight("#FFD39A", 0, 5, 1.7); lampaSvetlo.position.set(-0.08, 0.45, 0); lampa.add(lampaSvetlo);
    // židle
    const zidle = new THREE.Group(); zidle.position.set(0, 0, 0.75); stul.add(zidle);
    const sed = new THREE.Mesh(zaobleny(0.55, 0.08, 0.5, 0.03), plast("#5B55D6", { clearcoat: 0.6 })); sed.position.y = 0.55; zidle.add(sed);
    const opr = new THREE.Mesh(zaobleny(0.55, 0.5, 0.06, 0.03), plast("#5B55D6", { clearcoat: 0.6 })); opr.position.set(0, 0.85, 0.24); zidle.add(opr);
    for (const sx of [-0.22, 0.22]) for (const z of [-0.2, 0.2]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), plast("#FFFFFF")); n.position.set(sx, 0.27, z); zidle.add(n); }
    stin(stul); reg(globus, "globus"); reg(lampa, "lampa"); reg(stul, "globus");
    let globusOd = -10, lampaZap = false;
    krok((t) => { const u = t - globusOd; zeme.rotation.y += u < 3 ? (3 - u) * 0.08 : 0.004; stinitkoMat.emissiveIntensity += ((lampaZap ? 1.4 : 0.1) - stinitkoMat.emissiveIntensity) * 0.15; lampaSvetlo.intensity += ((lampaZap ? 3 : 0) - lampaSvetlo.intensity) * 0.15; });

    // ── plakát nad stolem (místo na vybavení: obraz) ──
    const plakat = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), new THREE.MeshStandardMaterial({ map: tex(384, 270, (x) => {
      x.fillStyle = "#FFF6E8"; x.fillRect(0, 0, 384, 270); x.fillStyle = "#5BC0FF"; x.fillRect(0, 170, 384, 100);
      x.fillStyle = "#FFD45A"; x.beginPath(); x.arc(300, 70, 34, 0, 7); x.fill();
      x.fillStyle = "#7CDB8A"; x.beginPath(); x.moveTo(0, 180); x.bezierCurveTo(90, 120, 160, 150, 230, 175); x.lineTo(0, 200); x.fill();
      x.fillStyle = "#AFACFB"; x.beginPath(); for (let i = 0; i <= 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; const px = 140 + Math.cos(a) * 38, py = 140 + Math.sin(a) * 38; if (i) x.lineTo(px, py); else x.moveTo(px, py); } x.fill();
      x.fillStyle = "#0D1B3E"; x.beginPath(); x.arc(128, 136, 5, 0, 7); x.arc(152, 136, 5, 0, 7); x.fill();
      x.fillStyle = "#0D1B3E"; x.font = "bold 30px 'DM Sans', sans-serif"; x.fillText("Hexík na pláži", 20, 250);
    }) }));
    plakat.position.set(-4.99, Y0 + 3.15, 1.0); plakat.rotation.y = Math.PI / 2; svet.add(plakat);
    const ramPlakatu = new THREE.Mesh(zaobleny(1.62, 1.17, 0.06, 0.03), plast("#FFFFFF")); ramPlakatu.position.set(-5.03, Y0 + 3.15, 1.0); ramPlakatu.rotation.y = Math.PI / 2; svet.add(ramPlakatu);

    // ── velká květina mezi tabulí a oknem (místo na vybavení: květina) ──
    const kytka = new THREE.Group(); kytka.position.set(0.72, Y0, -3.45); svet.add(kytka);
    const kvetinac = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.55, 20), plast("#FF9F5A", { clearcoat: 0.8 })); kvetinac.position.y = 0.28; kytka.add(kvetinac);
    const listy: THREE.Mesh[] = [];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), plast("#4CB873", { roughness: 0.5, clearcoat: 0.5 })); l.scale.set(0.45, 1.1, 0.2); l.position.set(Math.cos(a) * 0.18, 0.95 + (i % 3) * 0.18, Math.sin(a) * 0.18); l.rotation.set(Math.sin(a) * 0.6, a, Math.cos(a) * 0.6); kytka.add(l); listy.push(l); }
    const kvety = [0, 1, 2].map((i) => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshStandardMaterial({ color: BAREVNE[i], emissive: BAREVNE[i], emissiveIntensity: 0.3 })); f.position.set(Math.cos(i * 2.1) * 0.22, 1.45 + i * 0.08, Math.sin(i * 2.1) * 0.22); f.scale.setScalar(0.01); kytka.add(f); return f; });
    const konev = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 16), plast("#5BC0FF", { clearcoat: 1 })); konev.visible = false; svet.add(konev);
    stin(kytka); reg(kytka, "kytka");
    let kytkaOd = -10, rozkvet = 0;
    krok((t, dt) => { const u = t - kytkaOd; if (u > 0.5 && u < 3) rozkvet = Math.min(1, rozkvet + dt * 0.6); kvety.forEach((f) => f.scale.setScalar(Math.max(0.01, rozkvet))); listy.forEach((l, i) => { l.rotation.y += u < 2 ? Math.sin(u * 10 + i) * 0.01 : 0; }); kytka.scale.setScalar(1 + (u < 0.5 ? Math.sin((u / 0.5) * Math.PI) * 0.05 : 0)); });

    // ── nízká knihovnička vpravo (místo na vybavení: polička) ──
    const knihovna = new THREE.Group(); knihovna.position.set(4.15, Y0, 0.1); knihovna.rotation.y = -0.6; svet.add(knihovna);
    const korpus = plast("#FFFFFF", { clearcoat: 0.5, roughness: 0.35 });
    for (const [w, h, d, x, y] of [[1.7, 0.08, 0.6, 0, 0.04], [1.7, 0.08, 0.6, 0, 0.6], [1.7, 0.08, 0.6, 0, 1.16], [0.08, 1.2, 0.6, -0.81, 0.6], [0.08, 1.2, 0.6, 0.81, 0.6], [1.7, 1.2, 0.04, 0, 0.6]] as const) { const p = new THREE.Mesh(zaobleny(w, h, d, 0.02), korpus); p.position.set(x, y, d === 0.04 ? -0.28 : 0); knihovna.add(p); }
    const knizky: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) { const kn = new THREE.Mesh(zaobleny(0.11, 0.38 + (i % 3) * 0.04, 0.4, 0.02), plast(BAREVNE[i % 6])); kn.position.set(-0.7 + i * 0.13, 0.28 + (i % 3) * 0.02, 0); knihovna.add(kn); knizky.push(kn); }
    const krabice = new THREE.Mesh(zaobleny(0.55, 0.4, 0.45, 0.05), plast("#FFD45A", { clearcoat: 0.8 })); krabice.position.set(-0.35, 0.84, 0); knihovna.add(krabice);
    const raketa = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 12), plast("#FF6B8A", { clearcoat: 1 })); raketa.position.set(0.45, 0.88, 0); knihovna.add(raketa);
    const letici = new THREE.Mesh(zaobleny(0.36, 0.06, 0.48, 0.02), plast("#5BC0FF")); letici.visible = false; svet.add(letici);
    stin(knihovna); reg(knihovna, "knihovna");
    let knihaOd = -10;
    krok((t) => { const u = t - knihaOd; letici.visible = u > 0 && u < 2.6; if (letici.visible) { const s = Math.min(1, u / 0.6); knihovna.updateMatrixWorld(true); const z = knihovna.localToWorld(new THREE.Vector3(-0.2, 0.3, 0.2)); letici.position.set(z.x - s * 0.8, z.y + s * 1.1 + Math.sin(u * 3) * 0.05, z.z); letici.rotation.set(0, u * 2, 0.3); } knizky[4].position.z = u > 0 && u < 2.6 ? 0.25 : 0; });

    // ── míč na koberci ──
    const MIC0 = new THREE.Vector3(1.4, 0, 1.3);
    const mic = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), new THREE.MeshPhysicalMaterial({ map: tex(128, 64, (x) => { BAREVNE.slice(0, 4).forEach((c, i) => { x.fillStyle = c; x.fillRect(i * 32, 0, 32, 64); }); }), roughness: 0.3, clearcoat: 1 }));
    mic.position.set(MIC0.x, Y0 + 0.22, MIC0.z); stin(mic); svet.add(mic); reg(mic, "mic");
    let kopOd = -10; const kam = new THREE.Vector3(-1.2, 0, 2.6);
    krok((t, dt) => { const u = t - kopOd; if (u >= 0 && u < 3) { const s = u < 1.2 ? u / 1.2 : 1 - (u - 1.2) / 1.8; const e = s * s * (3 - 2 * s); mic.position.set(MIC0.x + (kam.x - MIC0.x) * e, Y0 + 0.22 + Math.abs(Math.sin(u * 7)) * 0.35 * (1 - u / 3), MIC0.z + (kam.z - MIC0.z) * e); mic.rotation.z += dt * 8; } });

    // ── úkoly pro Hexíka ──
    const POSTEL_PRED = new THREE.Vector3(-3.6, 0, -1.25), POSTEL_SED = new THREE.Vector3(-3.6, 0, -2.4);
    const ukol = (klic: string): UkolPokoje | null => {
      if (klic === "postel") return { bod: POSTEL_PRED, smer: 0, trvani: 0.8, efektPo: 0.99, ruce: (u) => 0.3 + u * 0.4, sedni: 0.62,
        prubeh: (u) => { hexik.pos.lerpVectors(POSTEL_PRED, POSTEL_SED, Math.min(1, u * 1.3)); }, efekt: () => { spankOd = cas(); hexik.vyraz("ospaly", 9); } };
      if (klic === "globus") { const bod = new THREE.Vector3(-3.3, 0, 0.4); return { bod, smer: smerK(bod, new THREE.Vector3(-4.6, 0, 1.05)), trvani: 1.8, efektPo: 0.4, ruce: (u) => zvedni(u, 0.4),
        efekt: () => { globusOd = cas(); hexik.vyraz("radost", 1.6); konfety(new THREE.Vector3(-4.6, Y0 + 1.6, 1.05), 0.3, [new THREE.Color("#4FA7F0"), new THREE.Color("#7CDB8A")]); } }; }
      if (klic === "lampa") { const bod = new THREE.Vector3(-3.3, 0, 1.6); return { bod, smer: smerK(bod, new THREE.Vector3(-4.7, 0, 1.6)), trvani: 1.3, efektPo: 0.5, ruce: (u) => zvedni(u, 0.5),
        efekt: () => { lampaZap = !lampaZap; hexik.vyraz("radost", 1.2); } }; }
      if (klic === "kytka") { const bod = new THREE.Vector3(0.75, 0, -2.4); return { bod, smer: Math.PI, trvani: 2.6, efektPo: 0.3, ruce: (u) => (u < 0.25 ? u * 5 : 1.3),
        prubeh: (u) => { konev.visible = u > 0.15 && u < 0.9; if (konev.visible) { konev.position.copy(hexik.vRuce(new THREE.Vector3(0.3, 0.7, 0.9))); konev.rotation.set(u > 0.3 && u < 0.8 ? 0.9 : 0, 0, 0); } },
        efekt: () => { kytkaOd = cas(); hexik.vyraz("radost", 2); konfety(kytka.localToWorld(new THREE.Vector3(0, 1.4, 0)), 0.3, [new THREE.Color("#5BC0FF"), new THREE.Color("#9FE3FF")]); }, konec: () => { konev.visible = false; } }; }
      if (klic === "knihovna") { const bod = new THREE.Vector3(3.5, 0, 1.15); return { bod, smer: smerK(bod, knihovna.position), trvani: 2.4, efektPo: 0.35, ruce: (u) => (u < 0.35 ? u * 4 : 1.5),
        efekt: () => { knihaOd = cas(); hexik.vyraz("prekvapeni", 1.6); konfety(new THREE.Vector3(3.9, Y0 + 1.8, 0.5), 0.45); } }; }
      if (klic === "mic") { const bod = MIC0.clone().add(new THREE.Vector3(0.75, 0, -0.5)); return { bod, smer: smerK(bod, MIC0), trvani: 1.2, efektPo: 0.35, ruce: () => 0.5,
        prubeh: (u) => { if (u > 0.25 && u < 0.32) hexik.skoc(); }, efekt: () => { kopOd = cas(); hexik.vyraz("radost", 1.6); } }; }
      return null;
    };

    return {
      kouzla: KOUZLA_ZAKLADNI,
      prekazky: [[-4.3, -2.45, 0.95], [-3.4, -2.45, 0.75], [-4.4, 1.0, 1.0], [0.72, -3.45, 0.45], [4.15, 0.1, 0.9]],
      ukol,
    };
  });
}
