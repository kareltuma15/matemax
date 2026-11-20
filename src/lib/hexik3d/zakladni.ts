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

type Kreslic = (x: CanvasRenderingContext2D) => void;
const sestiuhelnik = (x: CanvasRenderingContext2D, cx: number, cy: number, r: number) => { x.beginPath(); for (let i = 0; i <= 6; i++) { const a = Math.PI / 3 * i + Math.PI / 6; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; if (i) x.lineTo(px, py); else x.moveTo(px, py); } };

// ── Vybavení z Obchůdku: výhled z okna (256×256) ──
const VYHLEDY: Record<string, Kreslic> = {
  mesto: (x) => {
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#3B2E7A"); g.addColorStop(0.45, "#C86FA8"); g.addColorStop(0.8, "#FFB37A"); g.addColorStop(1, "#FFD9A0"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 25; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0.4, 1)})`; x.beginPath(); x.arc(rnd(0, 256), rnd(0, 90), rnd(0.5, 1.3), 0, 7); x.fill(); }
    x.fillStyle = "#FFF1C9"; x.beginPath(); x.arc(70, 60, 12, 0, 7); x.fill();
    x.fillStyle = "#6A5AA8"; x.beginPath(); x.moveTo(0, 256); x.bezierCurveTo(60, 180, 120, 200, 170, 190); x.bezierCurveTo(210, 182, 240, 196, 256, 190); x.lineTo(256, 256); x.fill();
    x.fillStyle = "#4A3E86"; for (let i = 0; i < 9; i++) { const bx = 12 + i * 28, bh = 30 + (i * 37) % 40; x.fillRect(bx, 236 - bh, 20, bh + 20); x.fillStyle = "#FFD27A"; for (let k = 0; k < 3; k++) if ((i + k) % 2) x.fillRect(bx + 5, 236 - bh + 8 + k * 11, 4, 4); x.fillStyle = "#4A3E86"; }
  },
  hory: (x) => {
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#6FB6FF"); g.addColorStop(1, "#DDF0FF"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.fillStyle = "#FFFFFF"; for (const [cx, cy] of [[60, 50], [180, 70]]) { x.beginPath(); x.arc(cx, cy, 16, 0, 7); x.arc(cx + 18, cy - 6, 20, 0, 7); x.arc(cx + 38, cy, 14, 0, 7); x.fill(); }
    x.fillStyle = "#6C7FA8"; x.beginPath(); x.moveTo(0, 200); x.lineTo(70, 90); x.lineTo(130, 170); x.lineTo(190, 80); x.lineTo(256, 180); x.lineTo(256, 256); x.lineTo(0, 256); x.fill();
    x.fillStyle = "#FFFFFF"; for (const [vx, vy] of [[70, 90], [190, 80]]) { x.beginPath(); x.moveTo(vx, vy); x.lineTo(vx - 18, vy + 26); x.lineTo(vx + 18, vy + 26); x.fill(); }
    x.fillStyle = "#4CB873"; x.fillRect(0, 222, 256, 34);
  },
  more: (x) => {
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, "#FFB37A"); g.addColorStop(0.5, "#FFD9A0"); g.addColorStop(0.52, "#3D8BD8"); g.addColorStop(1, "#1E5AA0"); x.fillStyle = g; x.fillRect(0, 0, 256, 256);
    x.fillStyle = "#FFE08A"; x.beginPath(); x.arc(128, 128, 30, Math.PI, 0); x.fill();
    x.strokeStyle = "rgba(255,255,255,.6)"; x.lineWidth = 2; for (let r = 0; r < 6; r++) { x.beginPath(); for (let i = 0; i <= 256; i += 16) x.lineTo(i, 150 + r * 18 + Math.sin(i * 0.1 + r) * 3); x.stroke(); }
    x.fillStyle = "#FFFFFF"; x.beginPath(); x.moveTo(190, 150); x.lineTo(206, 118); x.lineTo(206, 150); x.fill(); x.fillStyle = "#8A5A3B"; x.fillRect(184, 150, 30, 6);
  },
  vesmir: (x) => {
    x.fillStyle = "#0A0826"; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0.3, 1)})`; x.beginPath(); x.arc(rnd(0, 256), rnd(0, 256), rnd(0.4, 1.6), 0, 7); x.fill(); }
    x.fillStyle = "#FF9F5A"; x.beginPath(); x.arc(170, 90, 34, 0, 7); x.fill(); x.strokeStyle = "#FFD45A"; x.lineWidth = 6; x.beginPath(); x.ellipse(170, 90, 56, 14, -0.3, 0, 7); x.stroke();
    x.fillStyle = "#AFACFB"; x.beginPath(); x.arc(60, 180, 18, 0, 7); x.fill();
  },
};

// ── koberec (512×512) ──
const KOBERCE: Record<string, Kreslic> = {
  hexik: (x) => {
    x.fillStyle = "#AFACFB"; x.beginPath(); x.arc(256, 256, 256, 0, 7); x.fill(); x.fillStyle = "#C9C6FF"; x.beginPath(); x.arc(256, 256, 200, 0, 7); x.fill();
    x.fillStyle = "#FFFFFF"; sestiuhelnik(x, 256, 256, 120); x.fill();
    x.fillStyle = "#AFACFB"; x.beginPath(); x.arc(220, 240, 14, 0, 7); x.arc(292, 240, 14, 0, 7); x.fill(); x.strokeStyle = "#AFACFB"; x.lineWidth = 10; x.beginPath(); x.arc(256, 268, 34, 0.25, Math.PI - 0.25); x.stroke();
  },
  duha: (x) => { BAREVNE.forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(256, 256, 256 - i * 40, 0, 7); x.fill(); }); x.fillStyle = "#FFFFFF"; x.beginPath(); x.arc(256, 256, 30, 0, 7); x.fill(); },
  sachy: (x) => { for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { x.fillStyle = (r + c) % 2 ? "#3A3550" : "#F4F0FF"; x.fillRect(c * 64, r * 64, 64, 64); } },
  mraky: (x) => { x.fillStyle = "#BFE4FF"; x.fillRect(0, 0, 512, 512); x.fillStyle = "#FFFFFF"; for (const [cx, cy, r] of [[180, 220, 90], [300, 200, 110], [380, 280, 80], [240, 320, 90], [130, 310, 70]]) { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); } },
};

// ── obraz (384×270) ──
const OBRAZY: Record<string, Kreslic> = {
  plaz: (x) => {
    x.fillStyle = "#FFF6E8"; x.fillRect(0, 0, 384, 270); x.fillStyle = "#5BC0FF"; x.fillRect(0, 170, 384, 100);
    x.fillStyle = "#FFD45A"; x.beginPath(); x.arc(300, 70, 34, 0, 7); x.fill();
    x.fillStyle = "#7CDB8A"; x.beginPath(); x.moveTo(0, 180); x.bezierCurveTo(90, 120, 160, 150, 230, 175); x.lineTo(0, 200); x.fill();
    x.fillStyle = "#AFACFB"; sestiuhelnik(x, 140, 140, 38); x.fill();
    x.fillStyle = "#0D1B3E"; x.beginPath(); x.arc(128, 136, 5, 0, 7); x.arc(152, 136, 5, 0, 7); x.fill();
    x.font = "bold 30px 'DM Sans', sans-serif"; x.fillText("Hexík na pláži", 20, 250);
  },
  mapa: (x) => {
    x.fillStyle = "#F2DDA8"; x.fillRect(0, 0, 384, 270); x.fillStyle = "#7CC8F0"; x.fillRect(0, 0, 384, 40); x.fillRect(0, 230, 384, 40);
    x.fillStyle = "#8CCB6A"; x.beginPath(); x.ellipse(190, 140, 140, 80, 0.1, 0, 7); x.fill();
    x.setLineDash([10, 8]); x.strokeStyle = "#8A3B1A"; x.lineWidth = 5; x.beginPath(); x.moveTo(80, 170); x.bezierCurveTo(140, 90, 220, 200, 280, 110); x.stroke(); x.setLineDash([]);
    x.strokeStyle = "#D0312D"; x.lineWidth = 9; x.beginPath(); x.moveTo(266, 96); x.lineTo(294, 124); x.moveTo(294, 96); x.lineTo(266, 124); x.stroke();
  },
  diplom: (x) => {
    x.fillStyle = "#FFFDF4"; x.fillRect(0, 0, 384, 270); x.strokeStyle = "#D9B26A"; x.lineWidth = 10; x.strokeRect(14, 14, 356, 242);
    x.fillStyle = "#0D1B3E"; x.textAlign = "center"; x.font = "bold 36px 'DM Sans', sans-serif"; x.fillText("DIPLOM", 192, 80); x.font = "24px 'DM Sans', sans-serif"; x.fillText("za odvahu u příkladů", 192, 120);
    x.fillStyle = "#AFACFB"; sestiuhelnik(x, 192, 185, 34); x.fill(); x.fillStyle = "#F5A623"; x.beginPath(); x.arc(300, 200, 26, 0, 7); x.fill(); x.textAlign = "left";
  },
  hvezdy: (x) => {
    x.fillStyle = "#0E0B2E"; x.fillRect(0, 0, 384, 270);
    const b: [number, number][] = [[60, 200], [110, 120], [170, 150], [230, 80], [300, 110], [330, 190]];
    x.strokeStyle = "rgba(175,172,251,.8)"; x.lineWidth = 3; x.beginPath(); b.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke();
    x.fillStyle = "#FFE8A0"; for (const [px, py] of b) { x.beginPath(); x.arc(px, py, 9, 0, 7); x.fill(); }
    for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0.2, 0.8)})`; x.fillRect(rnd(0, 384), rnd(0, 270), 2, 2); }
  },
};

const LAMPY: Record<string, [string, string]> = { zluta: ["#FFD45A", "#FFB347"], mata: ["#7CDB8A", "#5BD08A"], lava: ["#FF6B8A", "#FF3D7A"], hvezda: ["#AFACFB", "#9F8CFF"] };

export function vytvorZakladniPokojicek(canvas: HTMLCanvasElement, o: MoznostiPokoje): Pokoj3D {
  // Vybavení z Obchůdku (výchozí věci, když žák nic nekoupil)
  const vy = { obraz: "plaz", koberec: "hexik", lampa: "zluta", kvetina: "monstera", policka: "knihy", okno: "mesto", ...(o.vybaveni ?? {}) } as Record<string, string>;
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
    vyhled: VYHLEDY[vy.okno] ?? VYHLEDY.mesto,
    snih: false, ramOkna: "#FFFFFF", zaves: "#AFACFB",
    tabule: { deska: ["#2C5A47", "#1C3D30"] as [string, string], ram: "#C08A55", text: "#F7F3E8", zvyrazneni: "#A6F0C0", tlacitko: "#FFD45A" },
    skrin: { drevo: "#E8DCCB", dvirka: "#F4ECE0", vyplet: "#AFACFB", knofliky: "#F5A623", cedule: ["#FFFFFF", "#5B55D6"] as [string, string] },
    svetla: { obloha: ["#FFD9C2", "#3A2E5A", 0.32] as [string, string, number], hlavni: ["#FFE2C0", 0.95] as [string, number], mesic: ["#C9B8FF", 0.4] as [string, number] },
  };

  return vytvorPokoj(canvas, o, vzhled, (k) => {
    const { svet, Y0, reg, krok, konfety, hexik } = k;
    const cas = hexik.cas;

    // ── kulatý koberec se šestiúhelníkem (místo na vybavení: koberec) ──
    const kob = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.95, 0.06, 64), new THREE.MeshPhysicalMaterial({ map: tex(512, 512, KOBERCE[vy.koberec] ?? KOBERCE.hexik), roughness: 1, sheen: 1, sheenColor: new THREE.Color("#FFFFFF") }));
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
    const [lBarva, lZare] = LAMPY[vy.lampa] ?? LAMPY.zluta;
    const stinitkoMat = new THREE.MeshStandardMaterial({ color: lBarva, emissive: lZare, emissiveIntensity: 0.1, side: THREE.DoubleSide });
    const stinitko = new THREE.Mesh(vy.lampa === "lava" ? new THREE.CapsuleGeometry(0.09, 0.22, 6, 14) : new THREE.ConeGeometry(0.16, 0.2, 20, 1, true), stinitkoMat); stinitko.position.set(-0.08, 0.56, 0); lampa.add(stinitko);
    const lampaSvetlo = new THREE.PointLight(lZare, 0, 5, 1.7); lampaSvetlo.position.set(-0.08, 0.45, 0); lampa.add(lampaSvetlo);
    const lampaHvezda = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), new THREE.MeshStandardMaterial({ color: "#FFE08A", emissive: "#FFD45A", emissiveIntensity: 1.6 })); lampaHvezda.position.set(-0.08, 0.76, 0); lampaHvezda.visible = vy.lampa === "hvezda"; lampa.add(lampaHvezda);
    krok((t) => { lampaHvezda.rotation.y = t * 1.5; if (vy.lampa === "lava") stinitko.scale.set(1, 1 + Math.sin(t * 1.3) * 0.08, 1); });
    // židle
    const zidle = new THREE.Group(); zidle.position.set(0, 0, 0.75); stul.add(zidle);
    const sed = new THREE.Mesh(zaobleny(0.55, 0.08, 0.5, 0.03), plast("#5B55D6", { clearcoat: 0.6 })); sed.position.y = 0.55; zidle.add(sed);
    const opr = new THREE.Mesh(zaobleny(0.55, 0.5, 0.06, 0.03), plast("#5B55D6", { clearcoat: 0.6 })); opr.position.set(0, 0.85, 0.24); zidle.add(opr);
    for (const sx of [-0.22, 0.22]) for (const z of [-0.2, 0.2]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8), plast("#FFFFFF")); n.position.set(sx, 0.27, z); zidle.add(n); }
    stin(stul); reg(globus, "globus"); reg(lampa, "lampa"); reg(stul, "globus");
    let globusOd = -10, lampaZap = false;
    krok((t) => { const u = t - globusOd; zeme.rotation.y += u < 3 ? (3 - u) * 0.08 : 0.004; stinitkoMat.emissiveIntensity += ((lampaZap ? 1.4 : 0.1) - stinitkoMat.emissiveIntensity) * 0.15; lampaSvetlo.intensity += ((lampaZap ? 3 : 0) - lampaSvetlo.intensity) * 0.15; });

    // ── plakát nad stolem (místo na vybavení: obraz) ──
    const obrazTex = tex(384, 270, OBRAZY[vy.obraz] ?? OBRAZY.plaz);
    const plakat = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.05), new THREE.MeshStandardMaterial(vy.obraz === "hvezdy" ? { map: obrazTex, emissive: "#FFFFFF", emissiveMap: obrazTex, emissiveIntensity: 0.9 } : { map: obrazTex }));
    plakat.position.set(-4.99, Y0 + 3.15, 1.0); plakat.rotation.y = Math.PI / 2; svet.add(plakat);
    const ramPlakatu = new THREE.Mesh(zaobleny(1.62, 1.17, 0.06, 0.03), plast("#FFFFFF")); ramPlakatu.position.set(-5.03, Y0 + 3.15, 1.0); ramPlakatu.rotation.y = Math.PI / 2; svet.add(ramPlakatu);

    // ── velká květina mezi tabulí a oknem (místo na vybavení: květina) ──
    const kytka = new THREE.Group(); kytka.position.set(0.72, Y0, -3.45); svet.add(kytka);
    const kvetinac = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.24, 0.55, 20), plast("#FF9F5A", { clearcoat: 0.8 })); kvetinac.position.y = 0.28; kytka.add(kvetinac);
    const listy: THREE.Mesh[] = [];
    let kvety: THREE.Mesh[] = [];
    if (vy.kvetina === "kaktus") {
      const telo = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.7, 6, 14), plast("#3FAE6A", { roughness: 0.6 })); telo.position.y = 1.05; kytka.add(telo); listy.push(telo);
      for (const [sx, y] of [[-1, 0.95], [1, 1.15]] as const) { const ruka = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.25, 6, 10), plast("#3FAE6A")); ruka.position.set(sx * 0.24, y, 0); ruka.rotation.z = sx * -0.5; kytka.add(ruka); listy.push(ruka); }
      kvety = [new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), new THREE.MeshStandardMaterial({ color: "#FF6B8A", emissive: "#FF6B8A", emissiveIntensity: 0.3 }))]; kvety[0].position.y = 1.62;
    } else if (vy.kvetina === "slunecnice") {
      const stonek = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.1, 8), plast("#4CB873")); stonek.position.y = 1.0; kytka.add(stonek);
      for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), plast("#4CB873")); l.scale.set(1, 0.3, 0.5); l.position.set(sx * 0.14, 0.95, 0); kytka.add(l); listy.push(l); }
      const hlava = new THREE.Group(); hlava.position.set(0, 1.6, 0.05); hlava.rotation.x = 0.3; kytka.add(hlava);
      for (let i = 0; i < 14; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), plast("#FFD45A", { clearcoat: 0.5 })); const a = (i / 14) * Math.PI * 2; p.scale.set(0.5, 1, 0.2); p.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0); p.rotation.z = a - Math.PI / 2; hlava.add(p); }
      const stred = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), plast("#7A4A2A")); stred.position.z = 0.02; hlava.add(stred);
      kvety = [stred];
    } else if (vy.kvetina === "houby") {
      kvety = [[-0.1, 0.62, 0.22], [0.12, 0.75, 0.28], [0.02, 0.9, 0.18]].map(([x0, y, r]) => {
        const nozka = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, y - 0.5, 8), plast("#FFF6E8")); nozka.position.set(x0, 0.5 + (y - 0.5) / 2, 0); kytka.add(nozka);
        const klobouk = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#7CE8FF", emissive: "#4FD8FF", emissiveIntensity: 1.2 })); klobouk.position.set(x0, y, 0); kytka.add(klobouk); return klobouk;
      });
    } else {
      for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), plast("#4CB873", { roughness: 0.5, clearcoat: 0.5 })); l.scale.set(0.45, 1.1, 0.2); l.position.set(Math.cos(a) * 0.18, 0.95 + (i % 3) * 0.18, Math.sin(a) * 0.18); l.rotation.set(Math.sin(a) * 0.6, a, Math.cos(a) * 0.6); kytka.add(l); listy.push(l); }
      kvety = [0, 1, 2].map((i) => { const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshStandardMaterial({ color: BAREVNE[i], emissive: BAREVNE[i], emissiveIntensity: 0.3 })); f.position.set(Math.cos(i * 2.1) * 0.22, 1.45 + i * 0.08, Math.sin(i * 2.1) * 0.22); f.scale.setScalar(0.01); kytka.add(f); return f; });
    }
    const rozkvetVar = vy.kvetina === "monstera" || vy.kvetina === "kaktus";
    if (vy.kvetina === "kaktus") kytka.add(kvety[0]);
    const konev = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 16), plast("#5BC0FF", { clearcoat: 1 })); konev.visible = false; svet.add(konev);
    stin(kytka); reg(kytka, "kytka");
    let kytkaOd = -10, rozkvet = 0;
    if (rozkvetVar) kvety.forEach((f) => f.scale.setScalar(0.01));
    krok((t, dt) => {
      const u = t - kytkaOd; if (u > 0.5 && u < 3) rozkvet = Math.min(1, rozkvet + dt * 0.6);
      if (rozkvetVar) kvety.forEach((f) => f.scale.setScalar(Math.max(0.01, rozkvet)));
      else kvety.forEach((f, i) => { const m = f.material as THREE.MeshStandardMaterial; if ("emissiveIntensity" in m) m.emissiveIntensity = (vy.kvetina === "houby" ? 1.0 + Math.sin(t * 2 + i) * 0.3 : 0.2) + (u < 3 ? (3 - u) * 0.6 : 0); });
      listy.forEach((l, i) => { l.rotation.y += u < 2 ? Math.sin(u * 10 + i) * 0.01 : 0; });
      kytka.scale.setScalar(1 + (u < 0.5 ? Math.sin((u / 0.5) * Math.PI) * 0.05 : 0));
    });

    // ── nízká knihovnička vpravo (místo na vybavení: polička) ──
    const knihovna = new THREE.Group(); knihovna.position.set(4.15, Y0, 0.1); knihovna.rotation.y = -0.6; svet.add(knihovna);
    const korpus = plast("#FFFFFF", { clearcoat: 0.5, roughness: 0.35 });
    for (const [w, h, d, x, y] of [[1.7, 0.08, 0.6, 0, 0.04], [1.7, 0.08, 0.6, 0, 0.6], [1.7, 0.08, 0.6, 0, 1.16], [0.08, 1.2, 0.6, -0.81, 0.6], [0.08, 1.2, 0.6, 0.81, 0.6], [1.7, 1.2, 0.04, 0, 0.6]] as const) { const p = new THREE.Mesh(zaobleny(w, h, d, 0.02), korpus); p.position.set(x, y, d === 0.04 ? -0.28 : 0); knihovna.add(p); }
    const knizky: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) { const kn = new THREE.Mesh(zaobleny(0.11, 0.38 + (i % 3) * 0.04, 0.4, 0.02), plast(BAREVNE[i % 6])); kn.position.set(-0.7 + i * 0.13, 0.28 + (i % 3) * 0.02, 0); knihovna.add(kn); knizky.push(kn); }
    // horní police (místo na vybavení: polička)
    const ryby: THREE.Mesh[] = [];
    if (vy.policka === "letadla") {
      for (const [x0, c] of [[-0.4, "#5BC0FF"], [0.35, "#FF6B8A"]] as const) { const tr = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.32, 6, 10), plast(c, { clearcoat: 1 })); tr.rotation.z = Math.PI / 2; tr.position.set(x0, 0.95, 0); knihovna.add(tr); const kr = new THREE.Mesh(zaobleny(0.08, 0.02, 0.42, 0.01), plast("#FFFFFF")); kr.position.set(x0, 0.95, 0); knihovna.add(kr); const podst = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.3, 6), plast("#AAAAAA")); podst.position.set(x0, 0.78, 0); knihovna.add(podst); }
    } else if (vy.policka === "trofeje") {
      for (const [x0, s] of [[-0.35, 1], [0.1, 1.25], [0.5, 0.9]] as const) { const pohar = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.05 * s, 0.22 * s, 16), plast("#FFD45A", { metalness: 0.85, roughness: 0.2 })); pohar.position.set(x0, 0.82 + 0.11 * s, 0); knihovna.add(pohar); const zaklad = new THREE.Mesh(zaobleny(0.16 * s, 0.07, 0.16 * s, 0.02), plast("#7A4A2A")); zaklad.position.set(x0, 0.68, 0); knihovna.add(zaklad); }
    } else if (vy.policka === "akvarium") {
      const voda = new THREE.Mesh(zaobleny(1.1, 0.42, 0.42, 0.03), new THREE.MeshPhysicalMaterial({ color: "#7CC8FF", transparent: true, opacity: 0.45, roughness: 0.05, clearcoat: 1 })); voda.position.set(0, 0.87, 0); knihovna.add(voda);
      for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: BAREVNE[i * 2], emissive: BAREVNE[i * 2], emissiveIntensity: 0.6 })); r.scale.set(1.4, 0.8, 0.6); knihovna.add(r); ryby.push(r); }
    } else {
      const krabice = new THREE.Mesh(zaobleny(0.55, 0.4, 0.45, 0.05), plast("#FFD45A", { clearcoat: 0.8 })); krabice.position.set(-0.35, 0.84, 0); knihovna.add(krabice);
      const raketa = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.4, 12), plast("#FF6B8A", { clearcoat: 1 })); raketa.position.set(0.45, 0.88, 0); knihovna.add(raketa);
    }
    krok((t) => { ryby.forEach((r, i) => { const a = t * (0.8 + i * 0.3) + i * 2; r.position.set(Math.sin(a) * 0.4, 0.82 + i * 0.1, Math.cos(a * 0.7) * 0.1); r.rotation.y = Math.cos(a) > 0 ? 0 : Math.PI; }); });
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
