// Sdílené pomocné funkce pro generátory vlastních SVG obrázků k úlohám (scripts/gen-*-svg.mjs).
// Obrázky jsou statické soubory v public/obrazky/ a vykreslují se v <img>, proto mají pevný font
// (stránkový font se do <img> nedostane) a jen pevné barvy (rámeček s bílým pozadím dělá TaskImageView).
import fs from "node:fs";
import path from "node:path";

export const NAVY = "#0D1B3E";
export const BLUE = "#2E6DA4";
export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const f = (n) => Math.round(n * 100) / 100;

export function svgWrap(w, h, body, title) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONT}">
  <title>${title}</title>
${body}
</svg>
`;
}

export function text(x, y, s, o = {}) {
  const { size = 13, weight = 600, anchor = "middle", fill = BLUE, rotate, italic } = o;
  const tr = rotate !== undefined ? ` transform="rotate(${rotate} ${f(x)} ${f(y)})"` : "";
  return `  <text x="${f(x)}" y="${f(y)}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}"${italic ? ' font-style="italic"' : ""}${tr}>${s}</text>`;
}

export function line(x1, y1, x2, y2, o = {}) {
  const { stroke = NAVY, w = 1.5, dash } = o;
  return `  <line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${w}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`;
}

/** Vrátí funkci write(name, w, h, body, title), která zapíše SVG do public/obrazky/<podadresář>/. */
export function makeWriter(subdir) {
  const OUT = path.join(process.cwd(), "public", "obrazky", subdir);
  fs.mkdirSync(OUT, { recursive: true });
  const written = [];
  const write = (name, w, h, body, title) => {
    fs.writeFileSync(path.join(OUT, name), svgWrap(w, h, body, title), "utf8");
    written.push({ name, w, h });
  };
  return { write, written };
}
