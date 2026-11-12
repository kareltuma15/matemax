"use client";

// Náhled dávky obsahu — renderuje úlohy PŘESNĚ jako v tréninku (karta s obrázkem,
// možnostmi, řešením). Karel odsouhlasí, pak se dávka zapíše skriptem do databáze.
// Zdroj: src/data/nahled-batch.json. Po dokončení tématu stránku smazat.
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { DBExample } from "@/types";
import { allExamples, maVicOdpovedi } from "@/data/examples";
import PracticeCard from "@/components/PracticeCard";
import ComparisonCard from "@/components/ComparisonCard";
import ConstructionCard from "@/components/ConstructionCard";
import ConstructionMarkCard from "@/components/ConstructionMarkCard";
import MoznostiCard from "@/components/MoznostiCard";
import VicOdpovediCard from "@/components/VicOdpovediCard";
import TreninkTemata from "@/components/TreninkTemata";
import PostupPrehled from "@/components/PostupPrehled";
import OdhadRodic from "@/components/OdhadRodic";
import TemaDovednosti from "@/components/TemaDovednosti";
import batch from "@/data/nahled-batch.json";

const batchExamples = (batch.examples as unknown as DBExample[]);

function Karta({ ex, i, total }: { ex: DBExample; i: number; total: number }) {
  const noop = () => {};
  const common = { example: ex, cardNumber: i + 1, total, onResult: noop, onSkip: noop };
  if (ex.konstrukce_scena) return <ConstructionMarkCard {...common} />;
  if (maVicOdpovedi(ex)) return <VicOdpovediCard {...common} />;
  if (ex.moznosti && ex.moznosti.length > 0) return <MoznostiCard {...common} />;
  if (ex.porovnani) return <ComparisonCard {...common} />;
  if (ex.kroky_volby && ex.kroky_volby.length > 0) return <ConstructionCard {...common} />;
  return <PracticeCard {...common} consecutiveCorrect={0} />;
}

/**
 * `/nahled?ids=P5_VIC_01,P5_VIC_02` ukáže úlohy z databáze podle id (kontrola hotových úloh, e2e testy karet); bez `ids` dávka k schválení.
 * `/nahled?vyber=zlomky` ukáže výběr dovedností tématu (jako po kliknutí na téma v tréninku).
 * `/nahled?postup=5` nebo `?postup=9` ukáže přehled postupu z profilu (odhad bodů, vývoj, témata) z dat v prohlížeči.
 * `/nahled?mapa=5` nebo `?mapa=9` ukáže výběr témat v Tréninku pro danou třídu bez přihlášení, `&premium=1` s odemčenými okruhy (kontrola vzhledu, e2e testy).
 */
function NahledPage() {
  const params = useSearchParams();
  const ids = params.get("ids");
  const mapa = params.get("mapa");
  const premium = params.get("premium") === "1";
  const examples = ids
    ? ids.split(",").map((id) => allExamples.find((e) => e.id === id.trim()) ?? batchExamples.find((e) => e.id === id.trim())).filter((e): e is DBExample => !!e)
    : batchExamples;
  const [reseni, setReseni] = useState(false);
  const noop = () => {};
  const vyber = params.get("vyber");
  if (vyber) return <div className="mx-auto max-w-lg p-4"><TemaDovednosti tema={vyber} onStart={noop} onBack={noop} /></div>;
  // ?rodic=1: odhad bodů, jak ho vidí rodič v rodičovském přehledu (ukázková data)
  if (params.get("rodic") === "1") {
    const t = [["zlomky", "Zlomky", 4.9, 6], ["vyrazy", "Výrazy", 3.6, 6], ["rovnice", "Rovnice", 2.9, 6], ["geometrie", "Geometrie", 3.2, 9], ["slovni_ulohy", "Slovní úlohy", 3, 10], ["grafy_logika", "Grafy a logika", 3.5, 5], ["konstrukce", "Konstrukční úlohy", 0.4, 4], ["uhly", "Úhly", 1.8, 4]] as const;
    return (
      <div className="mx-auto max-w-2xl p-4">
        <OdhadRodic jmeno="Tomáš" odhad={{ trida: 9, celkem: 23, max: 50, bezDat: false, cil: 32, temata: t.map(([tema, label, body, max]) => ({ tema, label, body, max })), nejvicBodu: { label: "Slovní úlohy", chybi: 7 }, tydny: [{ d: "2026-10-19", b: 15 }, { d: "2026-10-26", b: 17 }, { d: "2026-11-02", b: 19 }, { d: "2026-11-09", b: 21 }], zmena: 2 }} />
      </div>
    );
  }
  const postup = params.get("postup");
  if (postup === "5" || postup === "9") {
    return <div className="mx-auto max-w-3xl p-4"><PostupPrehled trida={postup === "5" ? 5 : 9} isPremium={premium} /></div>;
  }
  if (mapa === "5" || mapa === "9") {
    return <div className="mx-auto max-w-lg p-4"><TreninkTemata trida={mapa === "5" ? 5 : 9} isPremium={premium} onOpenTopic={noop} onStartMix={noop} onStartMistakes={noop} /></div>;
  }
  return (
    <div style={{ padding: 20, maxWidth: 480, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontWeight: 800, color: "var(--text-primary)" }}>{ids ? "Úlohy podle id" : batch.nazev}</h1>
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

export default function NahledStranka() {
  return (
    <Suspense fallback={null}>
      <NahledPage />
    </Suspense>
  );
}
