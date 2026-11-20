// Dočasné: sestaví prototyp domova do jednoho HTML (node scripts/_postav-prototyp.tmp.mjs <slozka> <vystup.html>)
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const [, , slozka, vystup] = process.argv;
const js = path.join(slozka, "domov.js");
execSync(`npx esbuild ${path.join(slozka, "entry.ts")} --bundle --minify --format=iife --tsconfig=tsconfig.json --alias:three=./node_modules/three --outfile=${js} --log-level=error`, { stdio: "inherit" });
const kod = fs.readFileSync(js, "utf8").replace(/<\/script/gi, "<\\/script");
fs.writeFileSync(vystup, fs.readFileSync(path.join(slozka, "sablona.html"), "utf8").replace("__DOMOV_JS__", () => kod));
fs.rmSync(js);
console.log(`${vystup}: ${Math.round(fs.statSync(vystup).size / 1024)} kB`);
