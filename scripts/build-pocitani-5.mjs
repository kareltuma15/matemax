// 5. třída, Počítání s čísly: hvězdičky (doplň číslici), řetězec operací se šipkami, číselná osa.
// Typy úloh z testů nanečisto / CERMAT 5, které v databázi chyběly. Vygeneruje obrázky do public/obrazky/p5/
// a dávku do src/data/nahled-batch.json (k Karlovu schválení na /nahled).   node scripts/build-pocitani-5.mjs
import fs from "fs";

const NAVY = "#0D1B3E";
const RED = "#c0392b";
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const DIR = "public/obrazky/p5/";

function svg(w, h, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="${FONT}">
  <title>${title}</title>
  <rect x="0" y="0" width="${w}" height="${h}" fill="#ffffff"/>
${body}
</svg>
`;
}

/** Písemné sčítání / odčítání pod sebou s hvězdičkami. */
function sloupec(soubor, a, op, b, r, alt) {
  const w = 220, h = 150, x = 170, step = 24;
  const radek = (s, y) => [...s].reverse().map((c, i) =>
    `  <text x="${x - i * step}" y="${y}" font-size="26" font-weight="600" fill="${c === "*" ? RED : NAVY}" text-anchor="middle">${c === "*" ? "∗" : c}</text>`).join("\n");
  const body = [
    radek(a, 40),
    `  <text x="${x - 4 * step - 22}" y="76" font-size="26" font-weight="600" fill="${NAVY}" text-anchor="middle">${op}</text>`,
    radek(b, 76),
    `  <line x1="${x - 4 * step - 36}" y1="90" x2="${x + 16}" y2="90" stroke="${NAVY}" stroke-width="2.5"/>`,
    radek(r, 122),
  ].join("\n");
  fs.writeFileSync(DIR + soubor, svg(w, h, alt, body));
}

/** Řetězec rámečků se šipkami (první rámeček x, poslední výsledek). */
function retezec(soubor, ops, konec, alt, zacatek = "x") {
  const box = 54, gap = 54, h = 92, y = 32;
  const n = ops.length + 1;
  const w = n * box + ops.length * gap + 20;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const bx = 10 + i * (box + gap);
    parts.push(`  <rect x="${bx}" y="${y}" width="${box}" height="46" fill="#fff" stroke="${NAVY}" stroke-width="2.5"/>`);
    const text = i === 0 ? zacatek : i === n - 1 ? konec : "";
    if (text) parts.push(`  <text x="${bx + box / 2}" y="${y + 32}" font-size="${i === 0 ? 28 : 26}" font-weight="700" ${i === 0 ? 'font-style="italic"' : ""} fill="${NAVY}" text-anchor="middle">${text}</text>`);
    if (i < ops.length) {
      const ax = bx + box + 6, bx2 = bx + box + gap - 6;
      parts.push(`  <line x1="${ax}" y1="${y + 24}" x2="${bx2 - 10}" y2="${y + 24}" stroke="${NAVY}" stroke-width="2.5"/>`);
      parts.push(`  <polygon points="${bx2},${y + 24} ${bx2 - 12},${y + 18} ${bx2 - 12},${y + 30}" fill="${NAVY}"/>`);
      parts.push(`  <text x="${(ax + bx2) / 2}" y="${y + 14}" font-size="22" font-weight="700" fill="${NAVY}" text-anchor="middle">${ops[i]}</text>`);
    }
  }
  fs.writeFileSync(DIR + soubor, svg(w, h, alt, parts.join("\n")));
}

/** Číselná osa s 10 shodnými úseky; `cisla` = {index dílku: číslo}, `pismena` = {index: písmeno}. */
function osa(soubor, cisla, pismena, alt) {
  const w = 400, h = 100, x0 = 30, x1 = 370, y = 46, krok = (x1 - x0) / 10;
  const parts = [`  <line x1="12" y1="${y}" x2="388" y2="${y}" stroke="${NAVY}" stroke-width="2.5"/>`];
  for (let i = 0; i <= 10; i++) parts.push(`  <line x1="${x0 + i * krok}" y1="${y - 9}" x2="${x0 + i * krok}" y2="${y + 9}" stroke="${NAVY}" stroke-width="2"/>`);
  for (const [i, c] of Object.entries(cisla)) parts.push(`  <text x="${x0 + i * krok}" y="${y + 36}" font-size="21" font-weight="700" fill="${NAVY}" text-anchor="middle">${c}</text>`);
  for (const [i, p] of Object.entries(pismena)) parts.push(`  <text x="${x0 + i * krok}" y="${y + 36}" font-size="22" font-weight="800" fill="${RED}" text-anchor="middle">${p}</text>`);
  fs.writeFileSync(DIR + soubor, svg(w, h, alt, parts.join("\n")));
}

const img = (url, width, height, alt) => ({ kind: "static", url: "/obrazky/p5/" + url, width, height, alt });
const ulohy = [];
let cislo = 43;
const pridej = (u) => { const e = { id: `P5_POC_${cislo++}`, tema: "p5_pocitani", ...u, sm2_interval: 1 }; if (e.obtiznost === 3) e.dovednost = "testove"; ulohy.push(e); };

// ── Hvězdičky ────────────────────────────────────────────────────────────────
const HV = "Najdi jednu číslici, kterou můžeš dosadit za všechny hvězdičky tak, aby byl výpočet správný.";
const hvezdicky = [
  { s: "poc-hvezdy1.svg", a: "4*2", op: "+", b: "3*5", r: "787", d: 4, o: 1, kroky: [
    "Jednotky: 2 + 5 = 7, to sedí a nic se nepřenáší.",
    "Desítky: hvězdička + hvězdička = 8. Stejné číslo dvakrát dá 8, takže hvězdička je 4.",
    "Zkouška: 442 + 345 = 787 ✓",
  ] },
  { s: "poc-hvezdy2.svg", a: "*86", op: "−", b: "3*2", r: "504", d: 8, o: 1, kroky: [
    "Jednotky: 6 − 2 = 4, to sedí.",
    "Desítky: 8 − hvězdička = 0, takže hvězdička je 8.",
    "Zkouška: 886 − 382 = 504 ✓",
  ] },
  { s: "poc-hvezdy3.svg", a: "*3*5", op: "+", b: "2*4*", r: "9011", d: 6, o: 2, kroky: [
    "Začni jednotkami: 5 + hvězdička musí končit číslicí 1. To platí jen pro 5 + 6 = 11, takže hvězdička je 6.",
    "Zkouška: 6365 + 2646 = 9011 ✓",
  ] },
  { s: "poc-hvezdy4.svg", a: "7*0*", op: "−", b: "*58*", r: "4620", d: 2, o: 2, kroky: [
    "Tisíce: 7 − hvězdička = 4 dá hvězdičku 3. Když se z vedlejšího místa půjčuje, je to 7 − 1 − hvězdička = 4 a hvězdička je 2. Vyzkoušíme obě.",
    "Zkus 3: 7303 − 3583 = 3720, to nesedí.",
    "Zkus 2: 7202 − 2582 = 4620 ✓ Hvězdička je 2.",
  ] },
  { s: "poc-hvezdy5.svg", a: "*5*3", op: "−", b: "2**8", r: "4*95", d: 7, o: 3, kroky: [
    "Podívej se na tisíce: hvězdička − 2 = 4 dá hvězdičku 6. Když se z vedlejšího místa půjčuje, je to hvězdička − 1 − 2 = 4 a hvězdička je 7. Vyzkoušíme obě.",
    "Zkus 6: 6563 − 2668 = 3895, výsledek nezačíná 4, nesedí.",
    "Zkus 7: 7573 − 2778 = 4795. Výsledek má tvar 4∗95 a na místě hvězdičky je opravdu 7 ✓",
  ] },
  { s: "poc-hvezdy6.svg", a: "*664", op: "−", b: "1*56", r: "6*0*", d: 8, o: 3, kroky: [
    "Tisíce: hvězdička − 1 = 6 dá hvězdičku 7. Když se z vedlejšího místa půjčuje, je to hvězdička − 1 − 1 = 6 a hvězdička je 8. Vyzkoušíme obě.",
    "Zkus 7: 7664 − 1756 = 5908, výsledek nezačíná 6, nesedí.",
    "Zkus 8: 8664 − 1856 = 6808. Výsledek má tvar 6∗0∗ a za obě hvězdičky je 8 ✓",
  ] },
];
for (const h of hvezdicky) {
  const alt = `Písemné ${h.op === "+" ? "sčítání" : "odčítání"} pod sebou: ${h.a} ${h.op} ${h.b} = ${h.r}, hvězdičky zastupují stejnou číslici`;
  sloupec(h.s, h.a, h.op, h.b, h.r, alt);
  pridej({ podtema: "p5_hvezdicky", obtiznost: h.o, image: img(h.s, 220, 150, alt), zadani: HV, odpoved: String(h.d), reseni_kroky: h.kroky, cas_sekund: [0, 90, 150, 210][h.o] });
}

// ── Řetězec operací ──────────────────────────────────────────────────────────
const retezce = [
  { s: "poc-sipky1.svg", ops: ["+ 8", "· 2"], konec: "30", x: 7, o: 1, kroky: [
    "Počítej pozpátku od konce a dělej opačné operace.",
    "Místo · 2 vyděl dvěma: 30 : 2 = 15.",
    "Místo + 8 odečti 8: 15 − 8 = 7. Zkouška: (7 + 8) · 2 = 30 ✓",
  ] },
  { s: "poc-sipky2.svg", ops: ["− 6", ": 3"], konec: "9", x: 33, o: 1, kroky: [
    "Počítej pozpátku od konce a dělej opačné operace.",
    "Místo : 3 vynásob třemi: 9 · 3 = 27.",
    "Místo − 6 přičti 6: 27 + 6 = 33. Zkouška: (33 − 6) : 3 = 9 ✓",
  ] },
  { s: "poc-sipky3.svg", ops: ["· 3", "+ 15", ": 6"], konec: "10", x: 15, o: 2, kroky: [
    "Pozpátku: místo : 6 násob šesti: 10 · 6 = 60.",
    "Místo + 15 odečti 15: 60 − 15 = 45.",
    "Místo · 3 vyděl třemi: 45 : 3 = 15. Zkouška: 15 · 3 = 45, 45 + 15 = 60, 60 : 6 = 10 ✓",
  ] },
  { s: "poc-sipky4.svg", ops: [": 4", "+ 9", "· 5"], konec: "80", x: 28, o: 2, kroky: [
    "Pozpátku: místo · 5 vyděl pěti: 80 : 5 = 16.",
    "Místo + 9 odečti 9: 16 − 9 = 7.",
    "Místo : 4 násob čtyřmi: 7 · 4 = 28. Zkouška: 28 : 4 = 7, 7 + 9 = 16, 16 · 5 = 80 ✓",
  ] },
  { s: "poc-sipky5.svg", ops: ["+ 12", "· 4", "− 20", ": 8"], konec: "15", x: 23, o: 3, kroky: [
    "Počítej pozpátku od konce a dělej opačné operace. Místo : 8 násob osmi: 15 · 8 = 120.",
    "Místo − 20 přičti 20: 120 + 20 = 140.",
    "Místo · 4 vyděl čtyřmi: 140 : 4 = 35.",
    "Místo + 12 odečti 12: 35 − 12 = 23. Zkouška: 23 + 12 = 35, 35 · 4 = 140, 140 − 20 = 120, 120 : 8 = 15 ✓",
  ] },
];
for (const r of retezce) {
  const alt = `Řetězec rámečků: x, pak postupně ${r.ops.join(", ")}, na konci ${r.konec}`;
  retezec(r.s, r.ops, r.konec, alt);
  pridej({ podtema: "p5_retezec", obtiznost: r.o, image: img(r.s, (r.ops.length + 1) * 54 + r.ops.length * 54 + 20, 92, alt),
    zadani: `Když provedeme postupně všechny početní operace nad šipkami, dostaneme číslo ${r.konec}. Vypočítej neznámé číslo x v prvním rámečku.`,
    odpoved: String(r.x), reseni_kroky: r.kroky, cas_sekund: [0, 90, 150, 210][r.o] });
}
// Stejné číslo na začátku i na konci — úvaha / zkoušení.
{
  const alt = "Řetězec rámečků: x, pak postupně · 3, − 20, : 2, na konci zase x";
  retezec("poc-sipky6.svg", ["· 3", "− 20", ": 2"], "x", alt);
  pridej({ podtema: "p5_retezec", obtiznost: 3, image: img("poc-sipky6.svg", 4 * 54 + 3 * 54 + 20, 92, alt),
    zadani: "V prvním i v posledním rámečku je stejné číslo x. Které číslo to je?",
    odpoved: "20",
    reseni_kroky: [
      "Zkoušej: pro x = 10 vyjde 10 · 3 = 30, 30 − 20 = 10, 10 : 2 = 5. To je málo, x musí být větší.",
      "Pro x = 20 vyjde 20 · 3 = 60, 60 − 20 = 40, 40 : 2 = 20. Na konci je zase 20 ✓",
      "Hledané číslo je 20.",
    ], cas_sekund: 210 });
}

// ── Číselná osa ──────────────────────────────────────────────────────────────
const OSA = "Na číselné ose je vyznačeno 10 shodných úseků.";
const osy = [
  { s: "poc-osa1.svg", cisla: { 0: 0, 5: 50 }, pismena: { 8: "A" }, o: 1, ot: "Jaké číslo je v místě A?", odp: "80", kroky: [
    "Mezi 0 a 50 je 5 úseků, jeden úsek je 50 : 5 = 10.",
    "A je 8 úseků od nuly: 8 · 10 = 80.",
  ] },
  { s: "poc-osa2.svg", cisla: { 0: 100, 10: 200 }, pismena: { 3: "A" }, o: 1, ot: "Jaké číslo je v místě A?", odp: "130", kroky: [
    "Mezi 100 a 200 je 10 úseků, jeden úsek je 100 : 10 = 10.",
    "A je 3 úseky za číslem 100: 100 + 3 · 10 = 130.",
  ] },
  { s: "poc-osa3.svg", cisla: { 0: 40, 5: 70 }, pismena: { 8: "A" }, o: 2, ot: "Jaké číslo je v místě A?", odp: "88", kroky: [
    "Mezi 40 a 70 je rozdíl 30 a 5 úseků, jeden úsek je 30 : 5 = 6.",
    "A je 3 úseky za číslem 70: 70 + 3 · 6 = 88.",
  ] },
  { s: "poc-osa4.svg", cisla: { 1: 300, 5: 500 }, pismena: { 9: "A" }, o: 2, ot: "Jaké číslo je v místě A?", odp: "700", kroky: [
    "Mezi 300 a 500 je rozdíl 200 a 4 úseky, jeden úsek je 200 : 4 = 50.",
    "A je 4 úseky za číslem 500: 500 + 4 · 50 = 700.",
  ] },
  { s: "poc-osa5.svg", cisla: { 3: 26, 7: 62 }, pismena: { 1: "A", 10: "B" }, o: 3, ot: "Jaký je součet čísel A a B?", odp: "97", kroky: [
    "Mezi 26 a 62 je rozdíl 36 a 4 úseky, jeden úsek je 36 : 4 = 9.",
    "A je 2 úseky před číslem 26: 26 − 2 · 9 = 8.",
    "B je 3 úseky za číslem 62: 62 + 3 · 9 = 89.",
    "Součet: 8 + 89 = 97.",
  ] },
  { s: "poc-osa6.svg", cisla: { 2: 1200, 8: 1500 }, pismena: { 0: "A", 5: "B" }, o: 3, ot: "O kolik je číslo B větší než číslo A?", odp: "250", kroky: [
    "Mezi 1200 a 1500 je rozdíl 300 a 6 úseků, jeden úsek je 300 : 6 = 50.",
    "Mezi A a B je 5 úseků, takže B je o 5 · 50 = 250 větší než A.",
    "(Pro kontrolu: A = 1100, B = 1350, 1350 − 1100 = 250.)",
  ] },
];
for (const o of osy) {
  const zname = Object.entries(o.cisla).map(([i, c]) => `${c} u ${i}. dílku`).join(" a ");
  const alt = `Číselná osa s 10 shodnými úseky, čísla ${zname}, písmena ${Object.entries(o.pismena).map(([i, p]) => `${p} u ${i}. dílku`).join(" a ")}`;
  osa(o.s, o.cisla, o.pismena, alt);
  const pis = Object.values(o.pismena);
  pridej({ podtema: "p5_ciselna_osa", obtiznost: o.o, image: img(o.s, 400, 100, alt),
    zadani: `${OSA} Jsou na ní čísla ${Object.values(o.cisla).join(" a ")} a ${pis.length > 1 ? "neznámá čísla " + pis.join(" a ") : "neznámé číslo " + pis[0]}. ${o.ot}`,
    odpoved: o.odp, reseni_kroky: o.kroky, cas_sekund: [0, 75, 120, 180][o.o] });
}

fs.writeFileSync("src/data/nahled-batch.json", JSON.stringify({ nazev: "5. třída — Počítání: hvězdičky, řetězec operací, číselná osa (18 úloh)", examples: ulohy }, null, 2));
console.log(`${ulohy.length} úloh, id ${ulohy[0].id}–${ulohy.at(-1).id}`);
