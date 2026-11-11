/**
 * Jakou klávesnici a které klávesy navíc ukázat u příkladu s psanou odpovědí.
 *
 * Většina odpovědí je jen číslo, takže telefon dostane číselnou klávesnici a žádné tlačítko navíc.
 * Speciální klávesa se objeví, jen když ji úloha potřebuje (zlomková čára, mínus, dvojtečka, stupně).
 * Aby sada kláves neprozradila tvar výsledku, dostanou zlomková čára a mínus všechny úlohy
 * témat, kde se zlomky a záporná čísla běžně objevují, i když konkrétní výsledek je celé číslo.
 *
 * Soubor je bez importů, aby ho mohly použít i skripty v Node (kontrola databáze).
 */

export interface Klavesa {
  name: string;
  label: string;
  insert: string;
  aria: string;
}

export interface Klavesnice {
  /** „decimal“ = číselná klávesnice telefonu, „text“ = celá klávesnice (výrazy, slovní odpovědi). */
  inputMode: "decimal" | "text";
  klavesy: Klavesa[];
}

const K = {
  zlomek: { name: "slash", label: "/", insert: "/", aria: "Zlomková čára" },
  minus: { name: "minus", label: "−", insert: "-", aria: "Mínus" },
  dvojtecka: { name: "colon", label: ":", insert: ":", aria: "Dvojtečka" },
  stupen: { name: "degree", label: "°", insert: "°", aria: "Stupně" },
  minuta: { name: "minute", label: "′", insert: "′", aria: "Minuty" },
  na2: { name: "square", label: "²", insert: "²", aria: "Druhá mocnina" },
  na3: { name: "cube", label: "³", insert: "³", aria: "Třetí mocnina" },
  odmocnina: { name: "sqrt", label: "√", insert: "√", aria: "Odmocnina" },
} satisfies Record<string, Klavesa>;

/** Témata, kde výsledek bývá zlomek: zlomková čára je tam vždycky. */
const TEMATA_ZLOMKY = new Set(["zlomky", "p5_zlomky", "rovnice", "vyrazy", "mocniny"]);
/** Témata 9. třídy se zápornými čísly: mínus je tam vždycky. */
const TEMATA_MINUS = new Set(["zlomky", "rovnice", "vyrazy", "mocniny", "cisselne_rady"]);

/** Číslo, jak ho žák napíše: celé, desetinné, zlomek, smíšené číslo, s jednotkou nebo „x = …“ na začátku. */
const CISLO = /^(?:[a-z]\s*=\s*)?-?\d+(?:[ \u00a0]\d{3})*(?:[.,]\d+)?(?:\s+\d+\s*\/\s*\d+|\s*\/\s*-?\d+)?\s*(?:%|°c?|[a-záčďéěíňóřšťúůýž]+(?:\/[a-záčďéěíňóřšťúůýž]+)?[²³]?|kč)?$/i;
const CAS = /^\d{1,2}:\d{2}$/;
const POMER = /^\d+\s*:\s*\d+$/;
const UHEL_MINUTY = /\d\s*°\s*\d+\s*['′]/;

export function klavesnice(odpoved: string, tema: string): Klavesnice {
  const a = odpoved.trim().replace(/[−–—]/g, "-");

  if (UHEL_MINUTY.test(a)) return { inputMode: "decimal", klavesy: [K.stupen, K.minuta] };
  if (CAS.test(a) || POMER.test(a)) return { inputMode: "decimal", klavesy: [K.dvojtecka] };

  if (CISLO.test(a)) {
    const klavesy: Klavesa[] = [];
    if (/\d\s*\/\s*-?\d/.test(a) || TEMATA_ZLOMKY.has(tema)) klavesy.push(K.zlomek);
    if (a.startsWith("-") || /=\s*-/.test(a) || TEMATA_MINUS.has(tema)) klavesy.push(K.minus);
    return { inputMode: "decimal", klavesy };
  }

  // Výrazy a slovní odpovědi: celá klávesnice, navíc jen znaky, které na ní nejsou.
  const klavesy: Klavesa[] = [];
  if (a.includes("²")) klavesy.push(K.na2);
  if (a.includes("³")) klavesy.push(K.na3);
  if (a.includes("√")) klavesy.push(K.odmocnina);
  if (/\d\s*°/.test(a)) klavesy.push(K.stupen);
  return { inputMode: "text", klavesy };
}
