// Generátor vlastních SVG obrázků pro těžké (CERMAT-styl) úlohy ze zlomků.
// Spuštění: node scripts/gen-zlomky-svg.mjs  → zapíše do public/obrazky/zlomky/
// Obrázky jsou ILUSTRAČNÍ; hodnoty nese popisek/zadání. Nekopírují žádný CERMAT obrázek.
import { NAVY, BLUE, f, text, line, makeWriter } from "./lib/svg.mjs";

const { write, written } = makeWriter("zlomky");

// ── 1) Nádrž: hladina 3/5, po odebrání 35 l hladina 1/4 ──
{
  const x0 = 120, x1 = 220, yTop = 34, yBot = 194, H = yBot - yTop;
  const yOf = (frac) => yBot - frac * H;
  const y35 = yOf(3 / 5), y14 = yOf(1 / 4);
  const body = [
    // voda, která zůstala (do 1/4)
    `  <rect x="${x0}" y="${f(y14)}" width="${x1 - x0}" height="${f(yBot - y14)}" fill="#93c5fd"/>`,
    // odebraná voda (mezi 1/4 a 3/5), světlejší a šrafovaná
    `  <rect x="${x0}" y="${f(y35)}" width="${x1 - x0}" height="${f(y14 - y35)}" fill="#dbeafe"/>`,
    `  <rect x="${x0}" y="${f(y35)}" width="${x1 - x0}" height="${f(y14 - y35)}" fill="none" stroke="${BLUE}" stroke-width="1" stroke-dasharray="4 3"/>`,
    // nádrž (bez horní hrany)
    `  <path d="M${x0} ${yTop} L${x0} ${yBot} L${x1} ${yBot} L${x1} ${yTop}" fill="none" stroke="${NAVY}" stroke-width="2.4" stroke-linejoin="round"/>`,
    // hladiny
    line(x0 - 14, y35, x1, y35, { stroke: BLUE, w: 1.4, dash: "5 3" }),
    line(x0 - 14, y14, x1, y14, { stroke: BLUE, w: 1.4, dash: "5 3" }),
    text(x0 - 20, y35 + 5, "3/5", { anchor: "end", size: 15, fill: NAVY, weight: 700 }),
    text(x0 - 20, y14 + 5, "1/4", { anchor: "end", size: 15, fill: NAVY, weight: 700 }),
    // odebráno 35 l
    line(x1 + 22, y35 + 2, x1 + 22, y14 - 2, { stroke: BLUE, w: 1.6 }),
    `  <polygon points="${x1 + 22},${f(y35)} ${x1 + 18},${f(y35 + 8)} ${x1 + 26},${f(y35 + 8)}" fill="${BLUE}"/>`,
    `  <polygon points="${x1 + 22},${f(y14)} ${x1 + 18},${f(y14 - 8)} ${x1 + 26},${f(y14 - 8)}" fill="${BLUE}"/>`,
    line(x1, y35, x1 + 22, y35, { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    line(x1, y14, x1 + 22, y14, { stroke: "#94a3b8", w: 1, dash: "3 3" }),
    text(x1 + 32, (y35 + y14) / 2 + 5, "35 l", { anchor: "start", size: 15 }),
  ].join("\n");
  write("nadrz.svg", 320, 214, body, "Nádrž s vyznačenými hladinami 3/5 a 1/4; rozdíl hladin odpovídá 35 litrům vody");
}

// ── 2) Vnořené čtverce: šedé rohy + šedý vnitřní čtverec, bílý mezikruží (střední čtverec z půlících bodů) ──
{
  const a = 220, o = 20; // strana a odsazení
  const P = (x, y) => `${x},${y}`;
  const m = a / 2;
  const S0 = [[o, o], [o + a, o], [o + a, o + a], [o, o + a]];
  const S1 = [[o + m, o], [o + a, o + m], [o + m, o + a], [o, o + m]]; // středy stran S0
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const S2 = S1.map((p, i) => mid(p, S1[(i + 1) % 4])); // středy stran S1
  const poly = (pts, fill, sw = 2) =>
    `  <polygon points="${pts.map((p) => P(f(p[0]), f(p[1]))).join(" ")}" fill="${fill}" stroke="${NAVY}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  const body = [
    poly(S0, "#c9ced6"),  // šedé rohy
    poly(S1, "#ffffff"),  // bílý čtverec ze středů stran
    poly(S2, "#c9ced6"),  // šedý čtverec ze středů stran bílého čtverce
  ].join("\n");
  write("ctverce-vnorene.svg", 260, 260, body, "Čtverec, do něj vepsaný čtverec ze středů stran a do něj další čtverec ze středů stran; rohy a nejmenší čtverec jsou šedé");
}

// ── 3) Číselná osa: 0 a 2/3 jsou dané, bod K je na devátém dílku ──
{
  const x0 = 28, step = 26, y = 62, n = 12; // 12 dílků
  const X = (i) => x0 + i * step;
  const parts = [
    line(x0 - 10, y, X(n) + 22, y, { w: 2 }),
    `  <polygon points="${X(n) + 26},${y} ${X(n) + 16},${y - 5} ${X(n) + 16},${y + 5}" fill="${NAVY}"/>`,
  ];
  for (let i = 0; i <= n; i++) {
    const major = i === 0 || i === 4;
    parts.push(line(X(i), y - (major ? 10 : 6), X(i), y + (major ? 10 : 6), { w: major ? 2 : 1.4 }));
  }
  parts.push(
    text(X(0), y + 30, "0", { fill: NAVY, size: 15, weight: 700 }),
    text(X(4), y + 30, "2/3", { fill: NAVY, size: 15, weight: 700 }),
    // bod K
    `  <circle cx="${X(9)}" cy="${y}" r="5.5" fill="${BLUE}" stroke="#ffffff" stroke-width="1.5"/>`,
    text(X(9), y - 18, "K", { fill: BLUE, size: 17, weight: 800 }),
  );
  write("ciselna-osa.svg", 380, 106, parts.join("\n"), "Číselná osa s vyznačenými čísly 0 a 2/3 a bodem K; dílky jsou stejně dlouhé");
}

// ── 4) Kruhový diagram: 1/3 sport, 1/4 hudba, 1/9 výtvarný kroužek, zbytek = žádný (?) ──
{
  const cx = 112, cy = 116, R = 92;
  const parts0 = [
    { label: "1/3", frac: 1 / 3, fill: "#93c5fd", name: "sportovní" },
    { label: "1/4", frac: 1 / 4, fill: "#fcd34d", name: "hudební" },
    { label: "1/9", frac: 1 / 9, fill: "#86efac", name: "výtvarný" },
    { label: "?", frac: 1 - 1 / 3 - 1 / 4 - 1 / 9, fill: "#ffffff", name: "žádný kroužek" },
  ];
  const pt = (deg, r = R) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  let a0 = -90;
  const secs = [], labels = [], legend = [];
  parts0.forEach((p, i) => {
    const a1 = a0 + p.frac * 360;
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    const large = a1 - a0 > 180 ? 1 : 0;
    secs.push(`  <path d="M${cx} ${cy} L${f(x0)} ${f(y0)} A${R} ${R} 0 ${large} 1 ${f(x1)} ${f(y1)} Z" fill="${p.fill}" stroke="${NAVY}" stroke-width="1.8" stroke-linejoin="round"/>`);
    const [lx, ly] = pt((a0 + a1) / 2, R * 0.62);
    labels.push(text(lx, ly + 6, p.label, { fill: NAVY, size: p.label === "?" ? 22 : 16, weight: 800 }));
    const ly2 = 62 + i * 30;
    legend.push(`  <rect x="222" y="${ly2 - 12}" width="16" height="16" rx="3" fill="${p.fill}" stroke="${NAVY}" stroke-width="1.4"/>`);
    legend.push(text(244, ly2 + 1, p.name, { anchor: "start", fill: NAVY, size: 13 }));
    a0 = a1;
  });
  write("kolac-zlomky.svg", 350, 232, [...secs, ...labels, ...legend].join("\n"), "Kruhový diagram tříd: sportovní kroužek 1/3, hudební 1/4, výtvarný 1/9 a část žáků bez kroužku označená otazníkem");
}

console.log("Zapsáno:");
for (const w of written) console.log(`  ${w.name}  ${w.w}×${w.h}`);
