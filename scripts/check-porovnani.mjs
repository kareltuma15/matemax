// Kontrola porovnávacích úloh (klikání na < = >).
//
// Hlídá tři věci, na kterých se to už jednou rozbilo:
//   1. znaménko v datech opravdu odpovídá matematice,
//   2. každý kus LaTeXu se dá vysázet,
//   3. próza je MIMO $...$ a nikde není `\text{}` s diakritikou — KaTeX z prózy
//      dělá kurzívní proměnné („nebo" → n·e·b·o) a v \text{} rozbíjí háčky
//      („Společný" → „Spolecˇnyˊ"), obojí ověřeno v prohlížeči.
//
// Spustit: node scripts/check-porovnani.mjs
import fs from "fs";
import katex from "katex";

const FILES = ["src/data/databaze.json", "src/data/cermat-200.json"];

const BS = String.fromCharCode(92);
const FRAC = new RegExp(`^(-?)${BS}${BS}frac\\{(-?\\d+)\\}\\{(\\d+)\\}$`);
const TEXT_S_DIAKRITIKOU = new RegExp(`${BS}${BS}text\\{[^}]*[áčďéěíňóřšťúůýž]`, "i");
// Příkaz LaTeXu ve větě mimo $...$ znamená, že se próza poslala do KaTeXu
const LATEX_V_PROZE = new RegExp(`${BS}${BS}[a-zA-Z]`);

function hodnota(s) {
  const m = s.trim().match(FRAC);
  if (m) return (m[1] === "-" ? -1 : 1) * (Number(m[2]) / Number(m[3]));
  const dec = s.trim().replace("{,}", ".");
  return /^-?\d+(\.\d+)?$/.test(dec) ? Number(dec) : NaN;
}

/** Stejné dělení jako MathDisplay.renderMixed */
function zkontrolujSmiseny(text, kde, nahlas) {
  if (TEXT_S_DIAKRITIKOU.test(text)) nahlas(`\\text{} s diakritikou v ${kde}`);
  for (const cast of text.split(/(\$[^$]+\$)/g)) {
    if (cast.startsWith("$") && cast.endsWith("$")) {
      try { katex.renderToString(cast.slice(1, -1), { throwOnError: true }); }
      catch (e) { nahlas(`KaTeX v ${kde}: ${e.message.slice(0, 60)}`); }
    } else if (LATEX_V_PROZE.test(cast)) {
      nahlas(`LaTeX mimo $...$ v ${kde}: ${cast.trim().slice(0, 40)}`);
    }
  }
}

let chyb = 0, pocet = 0;
const dle = {};

for (const f of FILES) {
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const ex of d.examples.filter((e) => e.porovnani)) {
    pocet++;
    dle[ex.obtiznost] = (dle[ex.obtiznost] ?? 0) + 1;
    const nahlas = (m) => { chyb++; console.log("  ✗", ex.id, m); };
    const { levy, pravy, znak } = ex.porovnani;

    // Strany jdou do KaTeXu celé (bez $), próza tam nemá co dělat
    for (const [s, jmeno] of [[levy, "levé straně"], [pravy, "pravé straně"]]) {
      try { katex.renderToString(s, { throwOnError: true }); }
      catch (e) { nahlas(`KaTeX v ${jmeno}: ${e.message.slice(0, 60)}`); }
    }
    zkontrolujSmiseny(ex.zadani, "zadání", nahlas);
    ex.reseni_kroky.forEach((k, i) => zkontrolujSmiseny(k, `kroku ${i + 1}`, nahlas));

    if (!["<", "=", ">"].includes(znak)) nahlas(`neplatné znaménko „${znak}"`);
    if (!ex.odpoved.includes(znak)) nahlas(`odpověď „${ex.odpoved}" neodpovídá znaménku`);

    const a = hodnota(levy), b = hodnota(pravy);
    if (Number.isNaN(a) || Number.isNaN(b)) { nahlas("stranu nelze spočítat"); continue; }
    const skutecny = Math.abs(a - b) < 1e-9 ? "=" : a < b ? "<" : ">";
    if (skutecny !== znak) nahlas(`znaménko má být ${skutecny}, ne ${znak}`);
    else console.log("  ✓", ex.id, `L${ex.obtiznost}`, `${levy} ${znak} ${pravy}`);
  }
}

console.log("obtížnosti:", dle);
console.log(chyb === 0 ? `✅ ${pocet} porovnávacích úloh v pořádku` : `❌ chyb: ${chyb}`);
process.exit(chyb === 0 ? 0 : 1);
