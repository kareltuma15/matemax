// Spolehlivý screenshot stránky přes Playwright (vlastní headless Chromium, žádné zastaralé snímky).
// Použití:
//   node scripts/shot.mjs /nahled                       # desktop, viditelná část
//   node scripts/shot.mjs /nahled --mobile --full       # mobil (Pixel 7), celá stránka
//   node scripts/shot.mjs /nahled --sel "img[src*=krychle]" --scale 3   # jen prvek, 3× zvětšeně
//   node scripts/shot.mjs / --dark --out .shots/home.png
//   node scripts/shot.mjs https://matemax.matematika-snadno.cz/cenik   # i plná URL
// Volby: --mobile --full --dark --sel <css> --scale <n> --wait <ms> --out <soubor> --base <url>
// Výstup: cesta k PNG (default .shots/, ignorováno gitem) — soubor pak stačí otevřít/přečíst.
import { chromium, devices } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
// Git Bash (MSYS) přepisuje argument "/nahled" na "C:/Program Files/Git/nahled" — vrať zpět.
const target = argv[0]?.replace(/^[a-z]:[\\/]Program Files[\\/]Git[\\/]/i, "/");
if (!target || target.startsWith("--")) {
  console.error("Použití: node scripts/shot.mjs <cesta|url> [--mobile] [--full] [--dark] [--sel css] [--scale n] [--wait ms] [--out soubor] [--base url]");
  process.exit(1);
}
const has = (n) => argv.includes(n);
const val = (n, d) => { const i = argv.indexOf(n); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };

const base = val("--base", process.env.E2E_BASE_URL ?? "http://localhost:3000");
const url = /^https?:\/\//.test(target) ? target : new URL(target, base).toString();
const scale = Number(val("--scale", has("--mobile") ? undefined : 1)) || undefined;

const slug = url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60);
const out = path.resolve(val("--out", `.shots/${slug}${has("--mobile") ? "-mobile" : ""}${has("--dark") ? "-dark" : ""}.png`));
fs.mkdirSync(path.dirname(out), { recursive: true });

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({
    ...(has("--mobile") ? devices["Pixel 7"] : { viewport: { width: 1280, height: 800 } }),
    ...(scale ? { deviceScaleFactor: scale } : {}),
    colorScheme: has("--dark") ? "dark" : "light",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(url, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});

  // lazy obrázky se jinak nenačtou, dokud nejsou vidět
  await page.evaluate(async () => {
    const imgs = Array.from(document.images);
    imgs.forEach((i) => { i.loading = "eager"; });
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; }))));
    await document.fonts?.ready;
  });
  await page.waitForTimeout(Number(val("--wait", 300)));

  const sel = val("--sel");
  if (sel) {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await el.screenshot({ path: out });
  } else {
    await page.screenshot({ path: out, fullPage: has("--full") });
  }
  console.log(out);
  if (errors.length) console.warn("Pozor, chyby na stránce:\n - " + errors.join("\n - "));
} finally {
  await browser.close();
}
