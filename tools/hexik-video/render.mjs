/**
 * Výroba videa s Hexíkem: node render.mjs hexik-01 [--bez-hlasu] [--nahled] [--snimek 12.5]
 *
 * 1) zabalí scénu (src/scena.ts + 3D Hexík z appky) přes esbuild,
 * 2) když je nahrávka hlasu (scénář → "hlas", z Disku 04 Videolekce/Hexík videa/hlas), vyčistí ji, posune výš,
 *    srovná hlasitost a spočítá z ní pohyb pusy a časy bloků (podle pauz v řeči),
 * 3) v Chromiu (Playwright) vykreslí snímek po snímku a pošle je do ffmpeg → vystup/<id>.mp4 (H.264, 1080×1920).
 * Bez hlasu: titulky + jemné zvuky (křída, odpočet, závěr), pusa se hýbe podle titulků.
 */
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";
import ffmpegPath from "ffmpeg-static";
import { chromium } from "@playwright/test";

const ADR = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--")) ?? "hexik-01";
const volba = (n) => args.includes(`--${n}`);
const hodnota = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const BEZ_HLASU = volba("bez-hlasu");
const NAHLED = volba("nahled");
const FPS = NAHLED ? 15 : 30;
const W = 1080, H = 1920, SR = 48000;

const scenar = JSON.parse(fs.readFileSync(path.join(ADR, "scenare", `${id}.json`), "utf8"));
fs.mkdirSync(path.join(ADR, "vystup"), { recursive: true });
fs.mkdirSync(path.join(ADR, "dist"), { recursive: true });
const log = (...x) => console.log(`[${id}]`, ...x);

// ── 1) Zabalit scénu ──
await esbuild.build({
  entryPoints: [path.join(ADR, "src", "scena.ts")],
  bundle: true, format: "iife", platform: "browser", target: "es2020",
  outfile: path.join(ADR, "dist", "scena.js"), logLevel: "warning",
  nodePaths: [path.join(ADR, "..", "..", "node_modules")],
});

// ── 2) Hlas ──
function ffmpeg(argv, vstup) {
  const r = spawnSync(ffmpegPath, ["-hide_banner", "-loglevel", "error", ...argv], { input: vstup, maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`ffmpeg selhal: ${r.stderr?.toString()}`);
  return r.stdout;
}

/** Hlasitost po snímcích (0–1) z WAV souboru, vyhlazená (pusa nemá kmitat po snímcích). */
function obalkaZ(wav) {
  const pcm = ffmpeg(["-i", wav, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"]);
  const vz = new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
  const naSnimek = Math.round(16000 / FPS), rms = [];
  for (let i = 0; i < vz.length; i += naSnimek) {
    let s = 0; const k = Math.min(vz.length, i + naSnimek);
    for (let j = i; j < k; j++) s += (vz[j] / 32768) ** 2;
    rms.push(Math.sqrt(s / Math.max(1, k - i)));
  }
  const nenul = rms.filter((r) => r > 1e-4).sort((a, b) => a - b), p95 = nenul[Math.floor(nenul.length * 0.95)] || 1;
  const ob = rms.map((r) => Math.min(1, Math.max(0, (r / p95 - 0.12) / 0.88)));
  return ob.map((_, i) => (ob[Math.max(0, i - 1)] + 2 * ob[i] + ob[Math.min(ob.length - 1, i + 1)]) / 4);
}

let hlasWav = null, obalka = null;
const hlasZdroj = hodnota("hlas") ? path.resolve(hodnota("hlas")) : scenar.hlas ? path.join(ADR, scenar.hlas) : null;
if (!BEZ_HLASU && hlasZdroj && fs.existsSync(hlasZdroj)) {
  const cisty = path.join(ADR, "vystup", `${id}-hlas-cisty.wav`);
  const vyska = scenar.vyskaHlasu ?? 1.32; // o kolik výš (1.32 ≈ +5 půltónů); rubberband drží srozumitelnost
  log(`hlas: ${path.basename(hlasZdroj)} → čištění, posun výšky ×${vyska}, srovnání hlasitosti`);
  ffmpeg(["-y", "-i", hlasZdroj, "-ac", "1", "-ar", String(SR), "-af",
    `highpass=f=90,afftdn=nf=-28,rubberband=pitch=${vyska}:formant=preserved,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,loudnorm=I=-15:TP=-1.5:LRA=7,silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse`,
    cisty]);
  hlasWav = path.join(ADR, "vystup", `${id}-hlas.wav`);
  rozmistiHlas(cisty, obalkaZ(cisty), hlasWav);
  obalka = obalkaZ(hlasWav);
} else if (!BEZ_HLASU && hlasZdroj) {
  log(`nahrávka ${scenar.hlas} zatím není, video bude bez hlasu (titulky + zvuky)`);
}

/**
 * Časy bloků podle skutečné nahrávky. Najde pauzy v řeči a rozdělí ji na tolik úseků, kolik má scénář bloků
 * s řečí (nejdelší pauzy = hranice). Bloky bez řeči ("bezReci": odpočet ve videu 3) se vloží jako ticho
 * v délce ze scénáře. Události uvnitř bloků (tabule, gesta, taneček, závěr) se přepočtou poměrem délky.
 * Výsledný hlas se poskládá s mezerami do `ven`.
 */
function rozmistiHlas(cisty, ob, ven) {
  const delkaAudia = ob.length / FPS;
  const ticho = ob.map((v) => v < 0.06);
  const pauzy = []; let z = -1;
  for (let i = 0; i <= ticho.length; i++) {
    if (i < ticho.length && ticho[i]) { if (z < 0) z = i; }
    else if (z >= 0) { if (z > 0 && i < ticho.length) pauzy.push({ z, k: i, d: i - z }); z = -1; }
  }
  const mluvici = scenar.bloky.filter((b) => !b.bezReci);
  const m = mluvici.length;
  const hranice = pauzy.sort((a, b) => b.d - a.d).slice(0, m - 1).sort((a, b) => a.z - b.z).map((p) => (p.z + p.k) / 2 / FPS);
  let useky;
  if (hranice.length === m - 1) {
    const h = [0, ...hranice, delkaAudia];
    useky = mluvici.map((_, i) => ({ a: h[i], b: h[i + 1] }));
  } else {
    log("varování: v nahrávce je méně pauz než bloků, rozděluji ji podle délek ze scénáře");
    const celkem = mluvici.reduce((s, b) => s + (b.do - b.od), 0); let a = 0;
    useky = mluvici.map((b) => { const d = ((b.do - b.od) / celkem) * delkaAudia; const u = { a, b: a + d }; a += d; return u; });
  }
  let t = 0, j = 0; const umisteni = [];
  scenar.bloky.forEach((b, i) => {
    const posledni = i === scenar.bloky.length - 1;
    let nova;
    if (b.bezReci) nova = b.do - b.od;
    else { const u = useky[j++]; nova = u.b - u.a + 0.25 + (posledni ? scenar.dozvuk ?? 3.6 : 0); umisteni.push({ ...u, od: t + 0.1 }); b.reciOd = 0.1; b.reciDo = 0.1 + (u.b - u.a); }
    const pomer = nova / (b.do - b.od);
    for (const r of b.tabule ?? []) r.t *= pomer;
    for (const g of b.gesta ?? []) g.t *= pomer;
    if (!b.bezReci && b.odpocet) { b.odpocet.od *= pomer; b.odpocet.do *= pomer; }
    if (posledni) {
      // taneček a závěr až po doznění řeči
      const reci = umisteni[umisteni.length - 1].b - umisteni[umisteni.length - 1].a;
      for (const r of b.reakce ?? []) r.t = reci + 0.2;
      b.zaverT = reci + 0.5;
    } else for (const r of b.reakce ?? []) r.t *= pomer;
    b.od = t; b.do = t + nova; t += nova;
  });
  scenar.delka = t;
  const vstupy = umisteni.map((u, i) => `[0:a]atrim=${u.a.toFixed(3)}:${u.b.toFixed(3)},asetpts=PTS-STARTPTS,adelay=${Math.round(u.od * 1000)}|${Math.round(u.od * 1000)}[s${i}]`);
  ffmpeg(["-y", "-i", cisty, "-filter_complex", `${vstupy.join(";")};${umisteni.map((_, i) => `[s${i}]`).join("")}amix=inputs=${umisteni.length}:normalize=0,apad=whole_dur=${t.toFixed(3)}[a]`, "-map", "[a]", "-ar", String(SR), ven]);
  log(`bloky podle nahrávky: ${scenar.bloky.map((b) => `${b.od.toFixed(1)}–${b.do.toFixed(1)} s`).join(", ")}, celkem ${t.toFixed(1)} s`);
}

// ── Zvuky (bez knihoven): křída při psaní, tikání odpočtu, zvonek na závěr ──
function zvuky() {
  const n = Math.ceil(scenar.delka * SR), buf = new Float32Array(n);
  const pridej = (t0, delka, f) => { const s0 = Math.floor(t0 * SR); for (let i = 0; i < delka * SR && s0 + i < n; i++) buf[s0 + i] += f(i / SR); };
  let sem = 12345; const sum = () => { sem = (sem * 1103515245 + 12345) & 0x7fffffff; return sem / 0x7fffffff * 2 - 1; };
  for (const b of scenar.bloky) {
    for (const r of b.tabule ?? []) {
      if (!r.text) continue;
      const t0 = b.od + r.t, d = 0.25 + 0.045 * Math.max(4, r.text.length * 0.6);
      // křída: krátké šustivé tahy
      for (let k = 0; k < Math.max(2, Math.round(d * 6)); k++) pridej(t0 + k * (d / Math.max(2, Math.round(d * 6))), 0.09, (t) => sum() * 0.05 * Math.sin(Math.PI * t / 0.09));
      pridej(t0, 0.12, (t) => Math.sin(2 * Math.PI * (660 + 400 * t) * t) * 0.07 * Math.exp(-t * 30));
    }
    if (b.odpocet) for (let s = 0; s < b.odpocet.z; s++) pridej(b.od + b.odpocet.od + s * ((b.odpocet.do - b.odpocet.od) / b.odpocet.z), 0.04, (t) => Math.sin(2 * Math.PI * 1500 * t) * 0.18 * Math.exp(-t * 90));
    if (b.zaver) for (const [dt, f] of [[0, 784], [0.14, 1047], [0.28, 1319]]) pridej(b.od + (b.zaverT ?? 3.2) + dt, 0.6, (t) => Math.sin(2 * Math.PI * f * t) * 0.09 * Math.exp(-t * 6));
  }
  const wav = Buffer.alloc(44 + n * 2);
  wav.write("RIFF", 0); wav.writeUInt32LE(36 + n * 2, 4); wav.write("WAVEfmt ", 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write("data", 36); wav.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2);
  const f = path.join(ADR, "vystup", `${id}-zvuky.wav`); fs.writeFileSync(f, wav); return f;
}
const zvukyWav = zvuky();

// ── 3) Vykreslení ──
const prohlizec = await chromium.launch({ args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"] });
const page = await prohlizec.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("chyba ve scéně:", e.message));
await page.setContent(`<!doctype html><html lang="cs"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700;800&family=Caveat:wght@700&display=block"></head><body></body></html>`, { waitUntil: "networkidle" });
await page.addScriptTag({ path: path.join(ADR, "dist", "scena.js") });
await page.evaluate(([s, o, f]) => window.pripravit(s, o, f), [scenar, obalka, FPS]);

const snimekT = hodnota("snimek");
if (snimekT !== undefined) {
  // rychlá kontrola jednoho okamžiku: vykreslí snímky až do času T (kvůli plynulým pohybům) a uloží PNG
  const T = Number(snimekT);
  for (let i = 0; i <= Math.round(T * FPS); i++) await page.evaluate((t) => window.snimek(t), i / FPS);
  const ven = path.join(ADR, "vystup", `${id}-snimek-${T}.png`);
  await page.screenshot({ path: ven });
  log(`snímek: ${ven}`);
  await prohlizec.close();
  process.exit(0);
}

const ven = path.join(ADR, "vystup", `${id}${NAHLED ? "-nahled" : ""}.mp4`);
const vstupyZvuku = hlasWav ? ["-i", hlasWav, "-i", zvukyWav] : ["-i", zvukyWav];
const mix = hlasWav
  ? ["-filter_complex", "[2:a]volume=0.55[z];[1:a][z]amix=inputs=2:duration=longest:normalize=0[a]", "-map", "0:v", "-map", "[a]"]
  : ["-map", "0:v", "-map", "1:a"];
const ff = spawn(ffmpegPath, ["-hide_banner", "-loglevel", "error", "-y",
  "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
  ...vstupyZvuku, ...mix,
  "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
  "-c:a", "aac", "-b:a", "160k", "-t", String(scenar.delka), "-movflags", "+faststart", ven], { stdio: ["pipe", "inherit", "inherit"] });

const pocet = Math.ceil(scenar.delka * FPS), start = Date.now();
for (let i = 0; i < pocet; i++) {
  await page.evaluate((t) => window.snimek(t), i / FPS);
  const jpg = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(jpg)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % FPS === 0) process.stdout.write(`\r[${id}] ${Math.round((i / pocet) * 100)} %  (${((Date.now() - start) / 1000).toFixed(0)} s)`);
}
ff.stdin.end();
await new Promise((r) => ff.on("close", r));
await prohlizec.close();
console.log(`\n[${id}] hotovo: ${ven} (${((Date.now() - start) / 1000).toFixed(0)} s)`);
