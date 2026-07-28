"use client";

// DOČASNÁ testovací stránka pro vykreslovač diagramů — po ověření smazat.
import DiagramView from "@/components/DiagramView";
import type { Diagram } from "@/types";

const UKAZKY: { nadpis: string; d: Diagram }[] = [
  { nadpis: "Úhly u rovnoběžek — střídavé", d: { typ: "uhel_pricka", danyUhel: 65, hledany: "stridavy" } },
  { nadpis: "Úhly u rovnoběžek — souhlasné", d: { typ: "uhel_pricka", danyUhel: 110, hledany: "souhlasny" } },
  { nadpis: "Trojúhelník — hledaný úhel γ", d: { typ: "trojuhelnik", alfa: 55, beta: 40, hledany: "gama" } },
  { nadpis: "Trojúhelník se stranami", d: { typ: "trojuhelnik", strany: { a: "5 cm", b: "4 cm", c: "6 cm" } } },
  { nadpis: "Obdélník", d: { typ: "obdelnik", sirka: "6 cm", vyska: "4 cm" } },
];

export default function DiagramTest() {
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, maxWidth: 420, margin: "0 auto", color: "var(--text-primary)" }}>
      <h1 style={{ fontWeight: 800 }}>Diagram test</h1>
      {UKAZKY.map((u, i) => (
        <div key={i} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{u.nadpis}</p>
          <DiagramView diagram={u.d} />
        </div>
      ))}
    </div>
  );
}
