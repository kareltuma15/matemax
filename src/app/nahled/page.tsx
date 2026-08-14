"use client";

// Náhled dávky obsahu — renderuje úlohy PŘESNĚ jako v tréninku (karta s obrázkem,
// možnostmi, řešením). Karel odsouhlasí, pak se dávka zapíše skriptem do databáze.
// Zdroj: src/data/nahled-batch.json. Po dokončení tématu stránku smazat.
import { useState } from "react";
import type { DBExample } from "@/types";
import PracticeCard from "@/components/PracticeCard";
import ComparisonCard from "@/components/ComparisonCard";
import ConstructionCard from "@/components/ConstructionCard";
import MoznostiCard from "@/components/MoznostiCard";
import batch from "@/data/nahled-batch.json";

const examples = (batch.examples as unknown as DBExample[]);

function Karta({ ex, i, total }: { ex: DBExample; i: number; total: number }) {
  const noop = () => {};
  const common = { example: ex, cardNumber: i + 1, total, onResult: noop, onSkip: noop };
  if (ex.moznosti && ex.moznosti.length > 0) return <MoznostiCard {...common} />;
  if (ex.porovnani) return <ComparisonCard {...common} />;
  if (ex.kroky_volby && ex.kroky_volby.length > 0) return <ConstructionCard {...common} />;
  return <PracticeCard {...common} consecutiveCorrect={0} />;
}

export default function NahledPage() {
  const [reseni, setReseni] = useState(false);
  return (
    <div style={{ padding: 20, maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontWeight: 800, color: "var(--text-primary)" }}>{batch.nazev}</h1>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
          Náhled jako v tréninku. Klikni na odpověď / vyplň a uvidíš vyhodnocení i postup.
        </p>
        <label style={{ fontSize: 12, color: "#64748b", display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
          <input type="checkbox" checked={reseni} onChange={(e) => setReseni(e.target.checked)} />
          Vypsat správné odpovědi ke kontrole
        </label>
      </div>
      {examples.map((ex, i) => (
        <div key={ex.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Karta ex={ex} i={i} total={examples.length} />
          {reseni && (
            <p style={{ fontSize: 12, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "6px 10px" }}>
              ✓ {ex.id} · {ex.podtema} · správně: <strong>{ex.odpoved}</strong>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
