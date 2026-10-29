import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
const [, , sub, ...only] = process.argv;
const dir = path.resolve("public/obrazky", sub);
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".svg") && (only.length === 0 || only.some((o) => f.includes(o)))).sort();
const html = `<body style="margin:0;background:#fff;font-family:sans-serif"><div style="display:flex;flex-wrap:wrap;gap:10px;padding:10px;width:1180px">${files
  .map((f) => `<figure style="margin:0;border:1px solid #ccc;padding:4px"><img src="${f}" style="display:block;max-width:420px"><figcaption style="font-size:10px">${f}</figcaption></figure>`)
  .join("")}</div>`;
fs.writeFileSync(path.join(dir, "_sheet.html"), html);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
await p.goto("file:///" + path.join(dir, "_sheet.html").replace(/\\/g, "/"));
fs.mkdirSync(".shots", { recursive: true });
await p.screenshot({ path: ".shots/sheet.png", fullPage: true });
await b.close();
fs.unlinkSync(path.join(dir, "_sheet.html"));
console.log("ok");
