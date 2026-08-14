"use client";

// DOČASNÁ testovací stránka pro režim výběru A–E (MoznostiCard) — po ověření smazat.
import MoznostiCard from "@/components/MoznostiCard";
import type { DBExample } from "@/types";

const base = { cas_sekund: 60, sm2_interval: 1 } as const;

const UKAZKY: DBExample[] = [
  {
    ...base, id: "T1", tema: "grafy_logika", podtema: "cteni_grafu", obtiznost: 2,
    image: { kind: "parametric", diagram: { typ: "kolac", nazev: "Denní činnosti (24 h)", casti: [
      { label: "zaměstnání", procenta: 25 }, { label: "spánek", procenta: 35 },
      { label: "denní povinnosti", procenta: 30 }, { label: "volný čas", procenta: 10 },
    ] } },
    zadani: "Kolik hodin denně tvoří spánek?",
    moznosti: ["6 hodin", "7,5 hodiny", "8,4 hodiny", "9,6 hodiny"], spravna: 2,
    odpoved: "8,4 hodiny",
    reseni_kroky: ["Spánek = 35 % z 24 hodin.", "24 · 0,35 = 8,4.", "Správně je C) 8,4 hodiny."],
  },
  {
    ...base, id: "T2", tema: "geometrie", podtema: "rovinne", obtiznost: 3,
    image: { kind: "static", url: "/obrazky/geometrie/lichobeznik-slozeny.svg", width: 320, height: 210,
      alt: "Lichoběžník ABCD rozdělený na čtverec a trojúhelník" },
    zadani: "Lichoběžník ABCD je úsečkou DP rozdělen na čtverec PBCD (strana 6 cm) a trojúhelník APD (AP = 3 cm). Jaký je obsah celého lichoběžníku?",
    moznosti: ["42 cm²", "45 cm²", "48 cm²", "51 cm²"], spravna: 1,
    odpoved: "45 cm²",
    reseni_kroky: ["Čtverec = 6 · 6 = 36 cm².", "Trojúhelník = (3 · 6) / 2 = 9 cm².", "Celkem 45 cm². Správně B)."],
  },
  {
    ...base, id: "T3", tema: "geometrie", podtema: "rovinne", obtiznost: 2,
    zadani: "Obdélník má obvod 24 cm a jednu stranu 5 cm. Jaký je jeho obsah?",
    moznosti: ["30 cm²", "35 cm²", "40 cm²", "45 cm²"], spravna: 1,
    odpoved: "35 cm²",
    reseni_kroky: ["Součet dvou stran = 12 cm.", "Druhá strana = 7 cm.", "Obsah = 35 cm². Správně B)."],
  },
];

export default function MoznostiTest() {
  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20, maxWidth: 460, margin: "0 auto" }}>
      <h1 style={{ fontWeight: 800, color: "var(--text-primary)" }}>Výběr A–E — test</h1>
      {UKAZKY.map((ex) => (
        <MoznostiCard key={ex.id} example={ex} cardNumber={1} total={1} onResult={() => {}} />
      ))}
    </div>
  );
}
