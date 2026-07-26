// Celoplošný audit KaTeX napříč živou databází.
//
// Hledá třídu chyb, kterou Karel viděl třikrát ve třech screenshotech:
//   • česká diakritika poslaná do KaTeXu — „Společný" vysází jako „Spolecˇnyˊ"
//     (láme se i uvnitř \text{}, ověřeno rendrem),
//   • holá próza v matematice — „3 a \frac{1}{2}" nebo „\frac{5}{8} nebo …"
//     KaTeX vysází jednotlivá písmena jako kurzívní proměnné (a, n·e·b·o),
//   • rozbitý LaTeX, který spadne při sázení.
//
// Kontroluje JEN to, co appka opravdu pošle do KaTeXu — mirror
// MathDisplay.renderMixed: řetězec bez „$" jde celý do KaTeXu jen když
// obsahuje \ ^ _ { nebo }; jinak se escapuje jako prostý text. S „$" se sází
// jen obsah mezi dolary. Pole bez latex:true jdou přes MathText (bez KaTeXu),
// takže se nekontrolují.
//
// Spustit: node scripts/audit-katex.mjs
import fs from "fs";
import katex from "katex";
import { obalMatiku } from "../src/lib/mathSegment.ts";

const FILES = [
  "src/data/databaze.json",
  "src/data/cermat-200.json",
  "src/data/konstrukce-interaktivni.json",
  "src/data/doplnky-uhly-souhrnne.json",
];

const DIAKRITIKA = /[áčďéěíňóřšťúůýž]/i;
// Běhy ≥3 písmen jsou próza. Jednopísmenné proměnné (a, b, x) a dvojice
// jednotek/funkcí sem nespadají, takže legitimní algebra „$3a − 2$" neproleze.
// Známé matematické tokeny odfiltrujeme, aby „sin", „cos" apod. nehlásily prózu.
// Známé zkratky a jednotky, které se v matematice sázejí kurzívou, ale nejsou
// próza (GCD, LSJ = zkratka autora pro společný jmenovatel).
const MAT_TOKEN = /\b(cm|mm|km|dm|kg|ml|dl|hod|min|max|sin|cos|tg|cotg|log|ln|mod|NSD|NSN|GCD|LSJ)\b/gi;

const BS = String.fromCharCode(92);
const TEXT_BLOK = new RegExp(`${BS}${BS}text\\{[^}]*\\}`, "g");
const PRIKAZ = new RegExp(`${BS}${BS}[a-zA-Z]+`, "g");

/** Mirror MathDisplay.renderMixed — vrátí kusy, které appka pošle do KaTeXu. */
function katexKusy(text) {
  if (!text.includes("$")) {
    if (!/[\\^_{}]/.test(text)) return [];   // escapuje se jako prostý text
    // Renderer nejdřív obalí matematické ostrovy a prózu nechá venku.
    text = obalMatiku(text);
    if (!text.includes("$")) return [];
  }
  const kusy = [];
  for (const cast of text.split(/(\$[^$]+\$)/g)) {
    if (cast.startsWith("$") && cast.endsWith("$")) kusy.push({ tex: cast.slice(1, -1), cely: false });
  }
  return kusy;
}

/** Zbytek po odstranění \text{} bloků a \příkazů — tam už nemá být žádná próza. */
function zbytekMimoPrikazy(tex) {
  return tex.replace(TEXT_BLOK, " ").replace(PRIKAZ, " ");
}

const nalezy = [];

for (const file of FILES) {
  const d = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const ex of d.examples) {
    if (!ex.latex) continue;   // bez latex:true jde vše přes MathText, ne KaTeX

    const pole = [];
    if (typeof ex.zadani === "string") pole.push(["zadání", ex.zadani]);
    if (typeof ex.odpoved === "string") pole.push(["odpověď", ex.odpoved]);
    if (Array.isArray(ex.reseni_kroky))
      ex.reseni_kroky.forEach((k, i) => typeof k === "string" && pole.push([`krok ${i + 1}`, k]));
    if (typeof ex.kontext === "string") pole.push(["kontext", ex.kontext]);
    if (ex.porovnani) {
      // levá/pravá strana jdou do KaTeXu celé (ComparisonCard je nebalí do $)
      pole.push(["porovnání-levý", "$" + ex.porovnani.levy + "$"]);
      pole.push(["porovnání-pravý", "$" + ex.porovnani.pravy + "$"]);
    }

    for (const [kde, text] of pole) {
      for (const { tex } of katexKusy(text)) {
        const problemy = [];
        // 1) parse
        try { katex.renderToString(tex, { throwOnError: true, strict: false }); }
        catch (e) { problemy.push(`nevysází se: ${e.message.split("\n")[0].slice(0, 50)}`); }
        // 2) diakritika kdekoli v KaTeXu (láme se i v \text{})
        if (DIAKRITIKA.test(tex)) problemy.push("česká diakritika v KaTeXu");
        // 3) holá próza mimo \text{} a \příkazy — běh ≥3 písmen
        const zbytek = zbytekMimoPrikazy(tex).replace(MAT_TOKEN, " ");
        if (/[a-zA-Zá-ž]{3,}/i.test(zbytek)) problemy.push("próza v matematice");
        if (problemy.length)
          nalezy.push({ file: file.split("/").pop(), id: ex.id, kde, text: text.slice(0, 70), problemy });
      }
    }
  }
}

if (nalezy.length === 0) {
  console.log("✅ Žádné KaTeX chyby napříč databází.");
} else {
  // Seskup podle typu problému
  const podle = {};
  for (const n of nalezy) for (const p of n.problemy) (podle[p] ??= []).push(n);
  for (const [typ, seznam] of Object.entries(podle)) {
    const unik = [...new Map(seznam.map((n) => [n.id + n.kde, n])).values()];
    console.log(`\n━━ ${typ} — ${unik.length}×`);
    for (const n of unik) console.log(`  ${n.id} · ${n.kde} · ${n.file}\n      ${n.text}`);
  }
  const ids = [...new Set(nalezy.map((n) => n.id))];
  console.log(`\n❌ ${nalezy.length} nálezů v ${ids.length} příkladech.`);
}

// — Rozpad podle pole (kolik je vždy vidět) —
const podlePole = {};
for (const n of nalezy) (podlePole[n.kde.replace(/ \d+$/, " N")] ??= new Set()).add(n.id);
console.log("\n── podle pole ──");
for (const [pole, ids] of Object.entries(podlePole).sort((a,b)=>b[1].size-a[1].size))
  console.log(`  ${pole.padEnd(16)} ${ids.size} příkladů`);
