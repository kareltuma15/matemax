/**
 * Domov „Polární záře“ (sada Zima) jako srub podle standardu pokojíčků (Karel 20. 11. 2026):
 * roubené stěny, světlá prkna, velké panoramatické okno na levé stěně s živou polární září,
 * litinová kamna, dalekohled, houpací křeslo, lucerna a plyšový tuleň na pleteném koberci.
 * Polární záře je i v okně na zadní stěně. Tabule (trénink) a skříň (šatník) dodává pokoj.ts.
 */
import * as THREE from "three";
import { rnd, tex, plast, zaobleny, stin, smerK, zvedni } from "./diorama";
import { vytvorPokoj, type MoznostiPokoje, type Pokoj3D, type UkolPokoje } from "./pokoj";

export const KOUZLA_POLARNI: Record<string, string> = {
  hexik: "Pohlaď Hexíka", zare: "Hexík roztančí polární záři", kamna: "Hexík přiloží do kamen", dalekohled: "Hexík se podívá dalekohledem",
  kreslo: "Hexík se pohoupe v křesle", lucerna: "Hexík rozsvítí lucernu", tulen: "Hexík pohladí tuleně", okno: "Hexík uvidí padající hvězdu",
};

const ZARE_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const ZARE_FRAG = /* glsl */ `
uniform float uCas; uniform float uSila; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x), u.y); }
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5; } return v; }
void main(){
  vec2 uv = vUv;
  float n = fbm(vec2(uv.x*2.2 + uCas*0.12, uCas*0.08));
  float n2 = fbm(vec2(uv.x*4.0 - uCas*0.2, 3.0 + uCas*0.05));
  float stred = 0.55 + (n - 0.5) * 0.45;
  float pas = smoothstep(stred - 0.32, stred, uv.y) * smoothstep(stred + 0.35, stred, uv.y);
  float zavesy = 0.55 + 0.45 * sin(uv.x * 38.0 + n2 * 14.0 + uCas * 1.6);
  vec3 c = mix(vec3(0.15, 1.0, 0.55), vec3(0.55, 0.35, 1.0), smoothstep(stred - 0.1, stred + 0.35, uv.y));
  c = mix(c, vec3(1.0, 0.45, 0.8), uSila * 0.25 * n2);
  float a = pas * zavesy * (0.62 + 0.55 * uSila) * smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.85, uv.y);
  gl_FragColor = vec4(c * (1.2 + uSila * 0.8), a);
}`;

const nocniNebe = (x: CanvasRenderingContext2D, w: number, h: number) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "#050A24"); g.addColorStop(0.7, "#10204A"); g.addColorStop(1, "#24406E"); x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w * h / 700; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0.3, 1)})`; x.beginPath(); x.arc(rnd(0, w), rnd(0, h * 0.75), rnd(0.4, 1.5), 0, 7); x.fill(); }
  // vzdálené hory (tmavé, s bílými vrcholky) a vpředu oblé zasněžené kopce se smrčky
  x.fillStyle = "#2A3E66"; x.beginPath(); x.moveTo(0, h * 0.8); x.lineTo(w * 0.18, h * 0.62); x.lineTo(w * 0.32, h * 0.74); x.lineTo(w * 0.5, h * 0.56); x.lineTo(w * 0.7, h * 0.72); x.lineTo(w * 0.86, h * 0.6); x.lineTo(w, h * 0.7); x.lineTo(w, h); x.lineTo(0, h); x.fill();
  x.fillStyle = "#E8F0FF"; for (const [vx, vy] of [[0.18, 0.62], [0.5, 0.56], [0.86, 0.6]]) { x.beginPath(); x.moveTo(w * vx, h * vy); x.lineTo(w * (vx - 0.05), h * (vy + 0.06)); x.lineTo(w * (vx + 0.05), h * (vy + 0.06)); x.fill(); }
  x.fillStyle = "#12263A"; for (let i = 0; i < 9; i++) { const px = (i + 0.5) * (w / 9), s = h * (0.06 + (i % 3) * 0.02); x.beginPath(); x.moveTo(px, h * 0.84 - s * 1.7); x.lineTo(px - s * 0.6, h * 0.86); x.lineTo(px + s * 0.6, h * 0.86); x.fill(); }
  x.fillStyle = "#EAF2FF"; x.beginPath(); x.moveTo(0, h * 0.86); x.bezierCurveTo(w * 0.25, h * 0.8, w * 0.45, h * 0.92, w * 0.65, h * 0.85); x.bezierCurveTo(w * 0.8, h * 0.8, w * 0.9, h * 0.84, w, h * 0.83); x.lineTo(w, h); x.lineTo(0, h); x.fill();
};

export function vytvorPolarniZari(canvas: HTMLCanvasElement, o: MoznostiPokoje): Pokoj3D {
  const tapeta = tex(512, 512, (x) => {
    for (let r = 0; r < 8; r++) {
      const g = x.createLinearGradient(0, r * 64, 0, r * 64 + 64); g.addColorStop(0, "#7A4A28"); g.addColorStop(0.35, "#B0763F"); g.addColorStop(0.7, "#9A6236"); g.addColorStop(1, "#5E361C");
      x.fillStyle = g; x.fillRect(0, r * 64, 512, 64);
      for (let k = 0; k < 5; k++) { x.strokeStyle = "rgba(60,30,10,.18)"; x.beginPath(); x.moveTo(0, r * 64 + 14 + k * 9); x.bezierCurveTo(170, r * 64 + 8 + k * 10, 340, r * 64 + 20 + k * 8, 512, r * 64 + 12 + k * 9); x.stroke(); }
      x.fillStyle = "rgba(240,248,255,.55)"; x.fillRect(0, r * 64 + 60, 512, 4); // sníh/mech ve spárách
    }
  }, [2.2, 1.3]);
  const podlaha = tex(512, 512, (x) => {
    for (let i = 0; i < 6; i++) { const g = x.createLinearGradient(0, i * 86, 512, i * 86 + 86); g.addColorStop(0, i % 2 ? "#D8B486" : "#E2C092"); g.addColorStop(1, i % 2 ? "#C9A273" : "#D4B080"); x.fillStyle = g; x.fillRect(0, i * 86, 512, 86);
      x.fillStyle = "rgba(90,55,25,.3)"; x.fillRect(0, i * 86, 512, 3); x.fillRect((i * 211) % 512, i * 86, 3, 86); }
  }, [2, 2]);
  const vzhled = {
    pozadi: "#0B1430", tapeta, podlaha, bokPodlahy: "#6B4428", spodek: "#3A4A6A", lista: "#5E361C", okrajSten: "#EAF2FF",
    vyhled: (x: CanvasRenderingContext2D) => nocniNebe(x, 256, 256),
    snih: true, ramOkna: "#F4F8FF", zaves: "#3D6FD8",
    tabule: { deska: ["#2E4A5E", "#1C2E3C"] as [string, string], ram: "#8A5A3B", text: "#F2F7FF", zvyrazneni: "#9DFFD8", tlacitko: "#FFD45A" },
    skrin: { drevo: "#9A6236", dvirka: "#B07444", vyplet: "#7A4A2A", knofliky: "#E8EEF5", cedule: ["#F2F7FF", "#2E4A5E"] as [string, string] },
    svetla: { obloha: ["#9FC9FF", "#1A1430", 0.26] as [string, string, number], hlavni: ["#FFD8A8", 0.75] as [string, number], mesic: ["#9DFFD8", 0.5] as [string, number] },
  };

  return vytvorPokoj(canvas, o, vzhled, (k) => {
    const { svet, Y0, reg, krok, konfety, hexik, okno } = k;
    const cas = hexik.cas;
    let silaZare = 0;
    const zareMaterialy: THREE.ShaderMaterial[] = [];
    const zare = (w: number, h: number) => { const u = { uCas: { value: rnd(0, 20) }, uSila: { value: 0 } }; const m = new THREE.ShaderMaterial({ vertexShader: ZARE_VERT, fragmentShader: ZARE_FRAG, uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); zareMaterialy.push(m); return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); };

    // polární záře i v okně na zadní stěně
    const zareZadni = zare(2.3, 2.0); zareZadni.position.z = 0.012; okno.add(zareZadni);

    // ── panoramatické okno na levé stěně s polární září ──
    const pano = new THREE.Group(); pano.position.set(-5.05, Y0 + 2.55, 0.4); pano.rotation.y = Math.PI / 2; svet.add(pano);
    const nebe = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2), new THREE.MeshBasicMaterial({ map: tex(512, 332, (x) => nocniNebe(x, 512, 332)) })); pano.add(nebe);
    const zarePano = zare(3.4, 2.2); zarePano.position.z = 0.01; pano.add(zarePano);
    const ramP = plast("#F4F8FF", { roughness: 0.3, clearcoat: 0.8 });
    for (const [w, h, x, y] of [[3.7, 0.18, 0, 1.18], [3.7, 0.24, 0, -1.2], [0.18, 2.6, -1.78, 0], [0.18, 2.6, 1.78, 0], [0.09, 2.2, -0.57, 0], [0.09, 2.2, 0.57, 0]] as const) { const b = new THREE.Mesh(zaobleny(w, h, 0.22, 0.05), ramP); b.position.set(x, y, 0.08); stin(b); pano.add(b); }
    const lavice = new THREE.Mesh(zaobleny(3.6, 0.16, 0.7, 0.06), plast("#B0763F", { clearcoat: 0.5 })); lavice.position.set(0, -1.35, 0.42); pano.add(lavice);
    for (const sx of [-1.3, 0, 1.3]) { const polstar = new THREE.Mesh(zaobleny(0.9, 0.2, 0.55, 0.1), plast(["#3D6FD8", "#E8EEF5", "#9DFFD8"][(sx + 1.3) / 1.3 | 0], { sheen: 1, roughness: 0.9 })); polstar.position.set(sx, -1.18, 0.45); pano.add(polstar); }
    const zareSvetlo = new THREE.PointLight("#7CFFC4", 2.5, 7, 1.6); zareSvetlo.position.set(1.2, 0, 1.5); pano.add(zareSvetlo);
    stin(lavice); reg(pano, "zare");
    krok((t, dt) => {
      silaZare = Math.max(0, silaZare - dt * 0.25);
      for (const m of zareMaterialy) { m.uniforms.uCas.value += dt * (1 + silaZare * 1.5); m.uniforms.uSila.value = silaZare; }
      zareSvetlo.intensity = 2.2 + Math.sin(t * 0.7) * 0.5 + silaZare * 4;
      zareSvetlo.color.setHSL(0.42 + Math.sin(t * 0.2) * 0.06 + silaZare * 0.15, 1, 0.65);
    });

    // ── pletený koberec uprostřed ──
    const kob = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.95, 0.06, 64), new THREE.MeshPhysicalMaterial({ map: tex(512, 512, (x) => {
      for (let r = 256; r > 0; r -= 32) { x.fillStyle = (r / 32 | 0) % 2 ? "#E8EEF5" : "#3D6FD8"; x.beginPath(); x.arc(256, 256, r, 0, 7); x.fill(); }
      x.fillStyle = "#FFFFFF"; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; x.save(); x.translate(256 + Math.cos(a) * 176, 256 + Math.sin(a) * 176); x.rotate(a); x.fillRect(-10, -3, 20, 6); x.fillRect(-3, -10, 6, 20); x.restore(); }
    }), roughness: 1, sheen: 1, sheenColor: new THREE.Color("#FFFFFF") }));
    kob.position.set(0.2, Y0 + 0.03, 0.4); stin(kob, false, true); svet.add(kob); reg(kob, "podlaha");

    // ── litinová kamna v levém zadním rohu ──
    const kamna = new THREE.Group(); kamna.position.set(-3.5, Y0, -3.0); kamna.rotation.y = 0.6; svet.add(kamna);
    const podstavec = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.05, 0.12, 6), plast("#7E8796", { roughness: 0.9 })); podstavec.position.y = 0.06; kamna.add(podstavec);
    const telo = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 1.3, 28), plast("#2A2E38", { metalness: 0.6, roughness: 0.45 })); telo.position.y = 0.85; kamna.add(telo);
    for (const y of [0.25, 1.5]) { const obruc = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.05, 8, 28), plast("#4A505E", { metalness: 0.8 })); obruc.rotation.x = Math.PI / 2; obruc.position.y = y; kamna.add(obruc); }
    const okenko = new THREE.Mesh(new THREE.CircleGeometry(0.26, 24), new THREE.MeshStandardMaterial({ color: "#FF8A3D", emissive: "#FF6A1A", emissiveIntensity: 1.6, toneMapped: false })); okenko.position.set(0, 0.8, 0.64); kamna.add(okenko);
    const roura = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 3.4, 14), plast("#2A2E38", { metalness: 0.6, roughness: 0.4 })); roura.position.y = 3.2; kamna.add(roura);
    const konvice = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), plast("#3D6FD8", { clearcoat: 1 })); konvice.scale.y = 0.8; konvice.position.y = 1.65; kamna.add(konvice);
    const polena = new THREE.Group(); polena.position.set(1.0, 0, 0.5); kamna.add(polena);
    for (let i = 0; i < 5; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.7, 10), plast("#8A5A3B", { roughness: 0.9 })); p.rotation.z = Math.PI / 2; p.position.set(0, 0.1 + (i > 2 ? 0.2 : 0), (i % 3) * 0.22 - 0.22 + (i > 2 ? 0.11 : 0)); polena.add(p); }
    const kamnaSvetlo = new THREE.PointLight("#FF7A2E", 4, 6, 1.6); kamnaSvetlo.position.set(0, 0.9, 1.2); kamna.add(kamnaSvetlo);
    const nP = 14, pP = new Float32Array(nP * 3), pZ = new Float32Array(nP); for (let i = 0; i < nP; i++) pZ[i] = rnd(0, 2);
    const pG = new THREE.BufferGeometry(); pG.setAttribute("position", new THREE.BufferAttribute(pP, 3));
    const para = new THREE.Points(pG, new THREE.PointsMaterial({ color: "#FFFFFF", size: 0.14, transparent: true, opacity: 0.3, depthWrite: false })); kamna.add(para);
    stin(kamna); reg(kamna, "kamna");
    let kamnaOd = -10;
    krok((t, dt) => {
      const u = t - kamnaOd, flare = u < 2 ? (2 - u) : 0;
      (okenko.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.5 + Math.sin(t * 9) * 0.25 + flare;
      kamnaSvetlo.intensity = 3.5 + Math.sin(t * 11) * 0.6 + flare * 3;
      for (let i = 0; i < nP; i++) { pZ[i] += dt * (1 + flare); if (pZ[i] > 2) pZ[i] = 0; pP.set([Math.sin(t + i) * 0.05 * pZ[i], 1.85 + pZ[i] * 0.3, Math.cos(t * 0.8 + i) * 0.04 * pZ[i]], i * 3); }
      pG.attributes.position.needsUpdate = true;
    });

    // ── dalekohled u zadního okna ──
    const dalekohled = new THREE.Group(); dalekohled.position.set(1.05, Y0, -2.75); svet.add(dalekohled);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const n = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.5, 8), plast("#8A5A3B")); n.position.set(Math.cos(a) * 0.25, 0.7, Math.sin(a) * 0.25); n.rotation.set(Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2); dalekohled.add(n); }
    const hlavaD = new THREE.Group(); hlavaD.position.y = 1.45; dalekohled.add(hlavaD);
    const tubus = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 1.1, 18), plast("#D9B26A", { metalness: 0.8, roughness: 0.25 })); tubus.rotation.x = -Math.PI / 2 + 0.6; tubus.position.z = -0.15; hlavaD.add(tubus);
    const cocka = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshStandardMaterial({ color: "#9DD8FF", emissive: "#7CC8FF", emissiveIntensity: 0.4 })); cocka.position.set(0, 0.32, -0.6); cocka.rotation.x = -Math.PI / 2 + 0.6 - Math.PI / 2; hlavaD.add(cocka);
    stin(dalekohled); reg(dalekohled, "dalekohled");
    let dalekoOd = -10;
    krok((t) => { const u = t - dalekoOd; hlavaD.rotation.y = u < 2.5 ? Math.sin(u * 2.5) * 0.35 : Math.sin(t * 0.3) * 0.08; (cocka.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + (u < 2.5 ? Math.sin(u * 6) * 0.6 + 0.6 : 0); });

    // ── houpací křeslo vpravo ──
    const KRESLO = new THREE.Vector3(3.95, 0, -0.1), K_YAW = -0.95, vpred = new THREE.Vector3(Math.sin(K_YAW), 0, Math.cos(K_YAW));
    const kreslo = new THREE.Group(); kreslo.position.set(KRESLO.x, Y0, KRESLO.z); kreslo.rotation.y = K_YAW; svet.add(kreslo);
    const houpe = new THREE.Group(); kreslo.add(houpe);
    const dr = plast("#B0763F", { clearcoat: 0.5, roughness: 0.4 });
    for (const sx of [-0.55, 0.55]) { const ozub = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.045, 8, 32, 1.2), dr); ozub.rotation.set(0, Math.PI / 2, Math.PI + 0.97); ozub.position.set(sx, 0.98, 0); houpe.add(ozub); }
    const sedak = new THREE.Mesh(zaobleny(1.2, 0.14, 0.95, 0.05), dr); sedak.position.y = 0.6; houpe.add(sedak);
    const operadlo = new THREE.Mesh(zaobleny(1.2, 1.2, 0.12, 0.05), dr); operadlo.position.set(0, 1.2, -0.5); operadlo.rotation.x = -0.18; houpe.add(operadlo);
    const deka = new THREE.Mesh(zaobleny(1.0, 0.07, 0.8, 0.03), new THREE.MeshPhysicalMaterial({ map: tex(128, 128, (x) => { x.fillStyle = "#E8EEF5"; x.fillRect(0, 0, 128, 128); x.fillStyle = "#3D6FD8"; for (let i = 0; i < 128; i += 16) { x.fillRect(i, 0, 4, 128); x.fillRect(0, i, 128, 4); } }, [2, 2]), roughness: 1, sheen: 1 })); deka.position.set(0, 0.7, 0.05); houpe.add(deka);
    for (const sx of [-0.5, 0.5]) for (const z of [-0.35, 0.35]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 8), dr); n.position.set(sx, 0.3, z); houpe.add(n); }
    stin(kreslo); reg(kreslo, "kreslo");
    const K_PRED = KRESLO.clone().addScaledVector(vpred, 1.25);
    let houpaniOd = -10;
    krok((t) => { const u = t - houpaniOd; houpe.rotation.x = u < 6 ? Math.sin(u * 2.2) * 0.12 * Math.max(0.2, 1 - u / 6) : Math.sin(t * 0.8) * 0.02; });

    // ── stolek s lucernou vpravo vepředu ──
    const stolek = new THREE.Group(); stolek.position.set(4.7, Y0, 1.55); svet.add(stolek);
    const deska = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 6), plast("#9A6236", { clearcoat: 0.6 })); deska.position.y = 0.95; stolek.add(deska);
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.95, 10), plast("#7A4A2A", { roughness: 0.9 })); pen.position.y = 0.47; stolek.add(pen);
    const lucerna = new THREE.Group(); lucerna.position.y = 1.0; stolek.add(lucerna);
    const sklo = new THREE.MeshStandardMaterial({ color: "#FFE9B0", emissive: "#FFB347", emissiveIntensity: 0.05, transparent: true, opacity: 0.85, toneMapped: false });
    const box = new THREE.Mesh(zaobleny(0.32, 0.42, 0.32, 0.04), sklo); box.position.y = 0.25; lucerna.add(box);
    const strisk = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.2, 4), plast("#2A2E38", { metalness: 0.5 })); strisk.rotation.y = Math.PI / 4; strisk.position.y = 0.56; lucerna.add(strisk);
    const ucho = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.015, 6, 16), plast("#2A2E38")); ucho.position.y = 0.72; lucerna.add(ucho);
    const lucSvetlo = new THREE.PointLight("#FFC98A", 0, 5, 1.7); lucSvetlo.position.y = 0.3; lucerna.add(lucSvetlo);
    stin(stolek); reg(stolek, "lucerna");
    let lucernaZap = false;
    krok((t) => { const cil = lucernaZap ? 1 : 0; sklo.emissiveIntensity += ((0.05 + cil * (1.6 + Math.sin(t * 7) * 0.12)) - sklo.emissiveIntensity) * 0.15; lucSvetlo.intensity += (cil * 3.5 - lucSvetlo.intensity) * 0.15; });

    // ── plyšový tuleň na koberci ──
    const tulen = new THREE.Group(); tulen.position.set(-0.95, Y0, 1.55); tulen.rotation.y = 0.9; svet.add(tulen);
    const pl = plast("#F2F6FC", { roughness: 0.95, sheen: 1, sheenColor: new THREE.Color("#DDEBFF") });
    const tel = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.45, 8, 16), pl); tel.rotation.z = Math.PI / 2; tel.position.y = 0.24; tulen.add(tel);
    const hlava = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 16), pl); hlava.position.set(0.42, 0.46, 0); tulen.add(hlava);
    for (const z of [-0.1, 0.1]) { const oko = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), plast("#1A1A24", { clearcoat: 1 })); oko.position.set(0.62, 0.53, z); tulen.add(oko); const lesk = new THREE.Mesh(new THREE.SphereGeometry(0.015, 8, 6), plast("#FFFFFF")); lesk.position.set(0.66, 0.55, z + 0.015); tulen.add(lesk); }
    for (const z of [-0.15, 0.15]) { const tvar = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), plast("#FFB3CF")); tvar.scale.set(0.4, 0.6, 1); tvar.position.set(0.6, 0.42, z); tulen.add(tvar); }
    const cumak = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), plast("#3A2A30")); cumak.position.set(0.68, 0.45, 0); tulen.add(cumak);
    for (const z of [-0.18, 0.18]) { const ploutev = new THREE.Mesh(zaobleny(0.2, 0.04, 0.12, 0.02), pl); ploutev.position.set(0.1, 0.06, z); tulen.add(ploutev); }
    const ocas = new THREE.Mesh(zaobleny(0.16, 0.04, 0.24, 0.02), pl); ocas.position.set(-0.5, 0.08, 0); tulen.add(ocas);
    stin(tulen); reg(tulen, "tulen");
    let tulenOd = -10;
    krok((t) => { const u = t - tulenOd; tulen.rotation.z = u < 2 ? Math.sin(u * 14) * 0.15 * (1 - u / 2) : 0; hlava.position.y = 0.42 + (u < 2 ? Math.abs(Math.sin(u * 7)) * 0.06 : Math.sin(t * 1.5) * 0.01); });

    // ── úkoly pro Hexíka ──
    const ukol = (klic: string): UkolPokoje | null => {
      if (klic === "zare") { const bod = new THREE.Vector3(-3.55, 0, 0.4); return { bod, smer: -Math.PI / 2, trvani: 3.0, efektPo: 0.2, ruce: (u) => 1.5 + Math.sin(u * 30) * 0.4,
        efekt: () => { silaZare = 1.6; hexik.vyraz("prekvapeni", 1.2); hexik.skoc(); } }; }
      if (klic === "kamna") { const bod = new THREE.Vector3(-2.35, 0, -2.0); return { bod, smer: smerK(bod, kamna.position), trvani: 2.0, efektPo: 0.45, ruce: (u) => (u < 0.45 ? 0.6 + u * 3 : 1.0),
        efekt: () => { kamnaOd = cas(); hexik.vyraz("radost", 1.6); konfety(kamna.localToWorld(new THREE.Vector3(0, 1.0, 0.8)), 0.35, [new THREE.Color("#FFB347"), new THREE.Color("#FF6A1A")]); } }; }
      if (klic === "dalekohled") { const bod = new THREE.Vector3(1.05, 0, -1.95); return { bod, smer: Math.PI, trvani: 2.6, efektPo: 0.3, ruce: (u) => (u < 0.3 ? u * 5 : 1.5),
        efekt: () => { dalekoOd = cas(); hexik.vyraz("prekvapeni", 2); konfety(new THREE.Vector3(2.2, Y0 + 3.4, -3.9), 0.4, [new THREE.Color("#FFFFFF"), new THREE.Color("#9DFFD8")]); } }; }
      if (klic === "kreslo") return { bod: K_PRED, smer: K_YAW, trvani: 0.7, efektPo: 0.99, ruce: (u) => 0.3 + u * 0.6, sedni: 0.6,
        prubeh: (u) => { hexik.pos.lerpVectors(K_PRED, KRESLO, Math.min(1, u * 1.3)); }, efekt: () => { houpaniOd = cas(); hexik.vyraz("ospaly", 0.1); } };
      if (klic === "lucerna") { const bod = new THREE.Vector3(3.85, 0, 2.4); return { bod, smer: smerK(bod, stolek.position), trvani: 1.4, efektPo: 0.5, ruce: (u) => zvedni(u, 0.5),
        efekt: () => { lucernaZap = !lucernaZap; hexik.vyraz("radost", 1.2); } }; }
      if (klic === "tulen") { const bod = new THREE.Vector3(-0.1, 0, 2.3); return { bod, smer: smerK(bod, tulen.position), trvani: 2.0, efektPo: 0.35, ruce: (u) => zvedni(u, 0.35),
        efekt: () => { tulenOd = cas(); hexik.vyraz("radost", 2); konfety(tulen.localToWorld(new THREE.Vector3(0, 0.7, 0)), 0.3, [new THREE.Color("#FF8AE0"), new THREE.Color("#FFFFFF")]); } }; }
      return null;
    };

    return {
      kouzla: KOUZLA_POLARNI,
      prekazky: [[-3.5, -3.0, 1.15], [1.05, -2.75, 0.5], [3.95, -0.1, 0.95], [4.7, 1.55, 0.65], [-0.95, 1.55, 0.45]],
      ukol,
    };
  });
}
