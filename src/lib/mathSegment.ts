/**
 * Rozdělení „latex řetězce bez $" na prózu a matematiku.
 *
 * Původní MathDisplay posílal takový řetězec CELÝ do KaTeXu. To fungovalo, jen
 * když v něm nebyla žádná próza — jenže stovky kroků řešení mají tvar
 * „Výsledek: \frac{2}{3}" nebo „Převedeme: \frac{1}{3} = … a \frac{1}{4} = …".
 * KaTeX z „Výsledek" udělal „Vy´sledek" a z „a" kurzívní proměnnou.
 *
 * Segmentace pracuje po slovech (dělených mezerami): sousední matematická slova
 * se spojí do jednoho $…$ ostrova, próza zůstane textem. Je konzervativní —
 * když si slovem není jistá, nechá ho jako text, takže do KaTeXu nikdy
 * neproteče věta. Ověřeno na všech 338 krocích databáze (scripts/audit-katex).
 */

// České jednopísmenné spojky a předložky. Samostatné „a" mezi dvěma zlomky je
// „a" (spojka), ne proměnná — a právě to KaTeX lámal. Ostatní osamocená písmena
// (b, x, y…) bereme jako proměnné, ať algebra „$a = 4$" zůstane matematikou.
const JEDNOPISMENNE_SLOVO = new Set(["a", "i", "o", "u", "k", "s", "v", "z"]);

// Znaky, které samy o sobě dělají ze slova matematiku.
const MATEMATICKE_ZNAKY = /[\\^_{}√]/;
// Lone operátory a symboly, které patří do matematiky (renderují se v $…$).
const OPERATORY = new Set([
  "=", "+", "-", "−", "±", "×", "·", "*", "/", "÷",
  "(", ")", "[", "]", "<", ">", "≤", "≥", "≠", "≈",
  ":", ",", ";",
]);
// Neutrální znaky: nezaloží matematiku, ale ani ji nepřeruší. Díky tomu
// „\frac{…} = ?" zůstane jedním ostrovem a otazník se neodtrhne.
const NEUTRALNI = new Set(["?", "!", "→", "↔", "⇒", "…", "..."]);

type Druh = "mat" | "text" | "neutral";

/**
 * Výraz z proměnných a operátorů bez \příkazu — třeba „(x+y)(x−y)" nebo
 * „(a−b)(a+b)". Poznáme ho tak, že má operátor/závorku a každý běh písmen je
 * jen jedno písmeno (proměnná). Věta jako „menší" sem nespadne.
 */
function jeVyrazPromenych(slovo: string): boolean {
  if (!/[()+\-−×·/=<>]/.test(slovo)) return false;
  const behy = slovo.match(/[a-zA-Zá-žÁ-Ž]+/g) ?? [];
  return behy.every((b) => b.length === 1);
}

/** Rozhodne, zda je jedno slovo (bez mezer) matematika, próza, nebo neutrální. */
function druhSlova(slovo: string): Druh {
  if (NEUTRALNI.has(slovo)) return "neutral";
  // Osamocené operátory a symboly → matematika.
  if (OPERATORY.has(slovo)) return "mat";
  // Backslash, exponenty, závorky ve zlomcích, odmocnina → matematika.
  if (MATEMATICKE_ZNAKY.test(slovo)) return "mat";
  // Slovo obsahující číslici → matematika („169", „2,5", „(2,4)", „60").
  if (/\d/.test(slovo)) return "mat";
  // Osamocené písmeno: česká spojka je próza, jinak proměnná.
  if (/^[a-zA-Zá-žÁ-Ž]$/.test(slovo)) {
    return JEDNOPISMENNE_SLOVO.has(slovo.toLowerCase()) ? "text" : "mat";
  }
  // Výraz jen z proměnných a operátorů („(x+y)(x−y)") → matematika.
  if (jeVyrazPromenych(slovo)) return "mat";
  // Cokoli víc písmen (Výsledek, nebo, jmenovatel) → próza.
  return "text";
}

/**
 * Vrátí řetězec, kde jsou matematické úseky obalené v $…$ a próza je text.
 * Řetězce, které už $ obsahují, vrací beze změny (autor si je rozdělil sám).
 */
export function obalMatiku(text: string): string {
  if (text.includes("$")) return text;
  // Bez matematické notace není co obalovat — vrátíme text tak, jak je.
  if (!MATEMATICKE_ZNAKY.test(text)) return text;

  // Dělíme tak, aby mezery zůstaly jako samostatné části (pro věrnou rekonstrukci).
  const casti = text.split(/(\s+)/);
  const out: string[] = [];
  let matBuffer: string[] = [];   // rozdělaný matematický ostrov (slova + mezery)

  const zavriMat = () => {
    if (matBuffer.length === 0) return;
    // Odřízneme koncové mezery z ostrova ven (ať $…$ neobsahuje mezery na kraji).
    let konec = matBuffer.length;
    while (konec > 0 && /^\s+$/.test(matBuffer[konec - 1])) konec--;
    const vnitrek = matBuffer.slice(0, konec).join("");
    const zbytek = matBuffer.slice(konec).join("");
    if (vnitrek) out.push(`$${vnitrek}$`);
    if (zbytek) out.push(zbytek);
    matBuffer = [];
  };

  for (const cast of casti) {
    if (/^\s+$/.test(cast)) {
      // Mezera: uvnitř matematiky ji ponecháme jako součást ostrova (spojí
      // sousední atomy); jinak jde rovnou do výstupu.
      if (matBuffer.length > 0) matBuffer.push(cast);
      else out.push(cast);
      continue;
    }
    // Koncová dvojtečka/středník („x:", „C:") patří ven z $…$ — jinak by
    // dvojznakové „x:" spadlo do prózy a proměnnou odtrhlo od výrazu. Čárku a
    // tečku necháváme uvnitř (desetinná čísla, seznamy „(4, 3)").
    const m = cast.match(/^(.*?)([:;]+)$/);
    const jadro = m ? m[1] : cast;
    const interpunkce = m ? m[2] : "";
    const druh = jadro ? druhSlova(jadro) : "text";

    if (druh === "mat") {
      matBuffer.push(jadro);
      if (interpunkce) { zavriMat(); out.push(interpunkce); }
    } else if (druh === "neutral" && matBuffer.length > 0) {
      // Otazník za výrazem zůstane uvnitř ostrova.
      matBuffer.push(jadro);
      if (interpunkce) { zavriMat(); out.push(interpunkce); }
    } else {
      zavriMat();
      out.push(cast);
    }
  }
  zavriMat();

  return out.join("");
}

/**
 * True, když je celý řetězec jedna matematika (po segmentaci vznikl jediný
 * $…$ ostrov přes celý obsah). Renderer pak zachová display režim (velké
 * sázení celého zadání), místo aby ho zdrobnil na inline.
 */
export function jeCelaMatematika(text: string): boolean {
  if (text.includes("$")) return false;
  const obaleno = obalMatiku(text).trim();
  return obaleno.startsWith("$") && obaleno.endsWith("$") && obaleno.indexOf("$", 1) === obaleno.length - 1;
}
