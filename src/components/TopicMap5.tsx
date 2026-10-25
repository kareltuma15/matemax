"use client";

import Link from "next/link";
import { TEMATA_ORDER_5, TEMA_LABELS } from "@/types";
import { examples5 } from "@/data/examples";
import { FREE_TOPICS_5 } from "@/lib/subscription";

/**
 * Mapa témat pro 5. třídu (osm okruhů podle oficiálních testů CERMAT, viz docs/CERMAT-5-ROZBOR.md).
 * Okruh bez úloh se ukazuje jako „Připravujeme"; první tři okruhy jsou zdarma, další v Premium.
 */

const OKRUHY: Record<string, { emoji: string; popis: string }> = {
  p5_pocitani: { emoji: "🔢", popis: "pořadí operací, násobilka, dělení" },
  p5_jednotky: { emoji: "⏱️", popis: "převody, hodiny, mince a ceny" },
  p5_slovni:   { emoji: "🧩", popis: "tempo, hmotnosti, úvaha" },
  p5_zlomky:   { emoji: "½",  popis: "polovina, třetina, čtvrtina" },
  p5_obsah:    { emoji: "▦",  popis: "čtvercová síť, obrazce" },
  p5_telesa:   { emoji: "🧊", popis: "krychličky, stavby, souměrnost" },
  p5_rysovani: { emoji: "📐", popis: "střed, kolmice, čtverec" },
  p5_grafy:    { emoji: "📊", popis: "čtení grafů, vzory, tabulky" },
};

interface Props {
  isPremium: boolean;
  onSelectTopic: (tema: string) => void;
}

export default function TopicMap5({ isPremium, onSelectTopic }: Props) {
  const pocet = (tema: string) => examples5.filter((e) => e.tema === tema).length;
  const celkem = examples5.length;

  return (
    <div className="flex flex-col gap-4" data-testid="mapa-temat-5">
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #0D1B3E 0%, #1c3a6e 100%)", color: "#fff" }}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-black">🗺️ Mapa témat</h1>
          <span className="text-xs font-bold rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.15)" }}>
            {FREE_TOPICS_5.size} / {TEMATA_ORDER_5.length} zdarma
          </span>
        </div>
        <p className="text-sm mt-1" style={{ color: "#bfdbfe" }}>
          Příprava na přijímačky z 5. třídy. {celkem > 0 ? "Vyber okruh a trénuj." : "Úlohy právě přibývají, první okruhy otevíráme postupně."}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {TEMATA_ORDER_5.map((tema) => {
          const o = OKRUHY[tema];
          const n = pocet(tema);
          const zamceno = !isPremium && !FREE_TOPICS_5.has(tema);
          const pripravuje = n === 0;
          const obsah = (
            <>
              <span className="w-10 h-10 rounded-xl grid place-items-center text-xl shrink-0" style={{ background: "#eff6ff" }}>{o.emoji}</span>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{TEMA_LABELS[tema]}</span>
                <span className="block text-xs text-slate-400">{o.popis}</span>
              </span>
              <span
                className="text-xs font-black px-3 py-1.5 rounded-lg whitespace-nowrap"
                style={pripravuje ? { background: "#f1f5f9", color: "#94a3b8" } : zamceno ? { background: "#f1f5f9", color: "#64748b" } : { background: "#eff6ff", color: "#2E6DA4" }}
              >
                {pripravuje ? "Připravujeme" : zamceno ? "🔒 Premium" : `Procvičit · ${n}`}
              </span>
            </>
          );
          const trida = "flex items-center gap-3 rounded-2xl border bg-white px-3 py-3";
          if (pripravuje) {
            return <div key={tema} className={`${trida} opacity-70`} style={{ borderColor: "#e2e8f0" }} data-tema={tema}>{obsah}</div>;
          }
          if (zamceno) {
            return <Link key={tema} href="/cenik" className={trida} style={{ borderColor: "#e2e8f0" }} data-tema={tema}>{obsah}</Link>;
          }
          return (
            <button key={tema} type="button" onClick={() => onSelectTopic(tema)} className={`${trida} w-full`} style={{ borderColor: "#bfdbfe" }} data-tema={tema}>
              {obsah}
            </button>
          );
        })}
      </div>
    </div>
  );
}
