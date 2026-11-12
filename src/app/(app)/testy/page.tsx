"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTrida } from "@/lib/trida";

type Stitek = "Zdarma" | "Zvlášť";

interface Polozka {
  krok: string;
  ikona: string;
  nazev: string;
  popis: string;
  fakta: string[];
  stitek: Stitek;
  barva: string;
  tint: string;
  href?: string;
  tlacitko?: string;
  stav?: string;
  testid: string;
}

interface CvicnyVysledek { date: string; score: number; total: number; pct: number }

/**
 * Testy = ověř se. Tři kroky (u 5. třídy dva), každý jinou barvou a s tím, co obnáší:
 * 1. diagnostika (kde jsem), 2. cvičný test na čas, 3. test nanečisto jako generálka.
 * Krok, který je pro žáka teď na řadě, má štítek „Doporučujeme teď“ a plné tlačítko.
 * U každé možnosti je napsané, jestli je zdarma, nebo se platí zvlášť (cena testu nanečisto jen na jeho stránce).
 */
export default function TestyPage() {
  const { trida, ready } = useTrida();
  const [diagHotova, setDiagHotova] = useState(false);
  const [cvicny, setCvicny] = useState<CvicnyVysledek | null>(null);
  useEffect(() => {
    try {
      setDiagHotova(localStorage.getItem("matemax-diag-done") === "1");
      const h = JSON.parse(localStorage.getItem("cermat-test-history") ?? "[]") as CvicnyVysledek[];
      if (Array.isArray(h) && h[0]) setCvicny(h[0]);
    } catch { /* soukromé okno */ }
  }, []);

  if (!ready) return null;
  const g5 = trida === 5;

  const diagnostika: Polozka = {
    krok: "Zjisti, kde jsi",
    ikona: "🧭",
    nazev: "Krátká diagnostika",
    popis: g5
      ? "Krátký test ze všech osmi okruhů. Ukáže, čím začít."
      : "Pár příkladů z každého tématu. Zjistí, kde máš mezery, a appka podle toho vybere trénink.",
    fakta: g5 ? ["asi 15 minut", "všech 8 okruhů", "výsledek: čím začít"] : ["16 příkladů", "všech 8 témat", "výsledek: kde máš mezery"],
    stitek: "Zdarma",
    barva: "#5B55D6",
    tint: "#EBEAFE",
    href: "/diagnostika",
    tlacitko: diagHotova ? "Udělat znovu" : "Spustit diagnostiku",
    stav: diagHotova ? "✓ Hotovo" : undefined,
    testid: "testy-diagnostika",
  };
  const nanecisto: Polozka = {
    krok: "Generálka",
    ikona: "🏫",
    nazev: "Test nanečisto",
    popis: g5
      ? "Celý test jako u přijímaček na víceleté gymnázium. Píše se naostro v učebně."
      : "Celý test jako u přijímaček. Píše se naostro v učebně.",
    fakta: g5 ? ["14 úloh", "70 minut", "50 bodů"] : ["16 úloh", "70 minut", "50 bodů"],
    stitek: "Zvlášť",
    barva: "#A66300",
    tint: "#FDF0DA",
    href: g5 ? undefined : "/testy-nanecisto",
    tlacitko: g5 ? undefined : "Termíny a přihláška",
    testid: "testy-nanecisto",
  };
  const polozky: Polozka[] = g5
    ? [diagnostika, nanecisto]
    : [
        diagnostika,
        {
          krok: "Zkoušej na čas",
          ikona: "⏱️",
          nazev: "Cvičný test CERMAT",
          popis: "Úlohy ze všech témat na čas. Na konci uvidíš, jak bys dopadl.",
          fakta: ["15 úloh", "25 minut", "výsledek: kolik máš správně"],
          stitek: "Zdarma",
          barva: "#2E6DA4",
          tint: "#E4EEF7",
          href: "/cermat-test",
          tlacitko: cvicny ? "Zkusit znovu" : "Spustit cvičný test",
          stav: cvicny ? `Naposledy ${cvicny.score} z ${cvicny.total} (${cvicny.pct} %)` : undefined,
          testid: "testy-cermat",
        },
        nanecisto,
      ];

  // Co je teď na řadě: bez diagnostiky diagnostika, potom cvičný test (u 5. třídy po diagnostice nic nevnucujeme)
  const doporuceno = !diagHotova ? "testy-diagnostika" : g5 ? null : "testy-cermat";

  return (
    <div className="flex flex-col gap-5 max-w-xl lg:max-w-5xl mx-auto w-full" data-testid="testy">
      <div>
        <h1 className="text-[26px] lg:text-[32px] font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>Testy</h1>
        <p className="text-sm lg:text-base mt-1" style={{ color: "#5F6982" }}>
          {g5
            ? "Dva kroky: zjisti, kde jsi, a před přijímačkami si napiš celý test nanečisto."
            : "Tři kroky k přijímačkám: zjisti, kde jsi, zkoušej na čas a nakonec si napiš celý test nanečisto."}
        </p>
      </div>

      <div className={`grid gap-4 ${g5 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {polozky.map((p, i) => {
          const doporucena = p.testid === doporuceno;
          return (
            <div
              key={p.nazev}
              className="mm-karta overflow-hidden flex flex-col"
              style={{ ["--tema-barva" as string]: p.barva, ...(doporucena ? { border: `2px solid ${p.barva}`, boxShadow: `0 14px 34px -16px ${p.barva}` } : {}) }}
              data-testid={p.testid}
            >
              <div className="px-4 py-3 flex items-center gap-3" style={{ background: p.tint }}>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0" style={{ background: p.barva }}>{i + 1}</span>
                <span className="text-xs font-extrabold uppercase tracking-wider" style={{ color: p.barva }}>{p.krok}</span>
                <span className="ml-auto text-2xl" aria-hidden>{p.ikona}</span>
              </div>
              <div className="p-4 lg:p-5 flex flex-col gap-3 flex-1">
                {doporucena && (
                  <span className="self-start text-[11px] font-extrabold px-2.5 py-1 rounded-full text-white" style={{ background: p.barva }} data-testid="testy-doporuceno">
                    ★ Doporučujeme teď
                  </span>
                )}
                <div className="flex items-start justify-between gap-2">
                  <b className="text-lg leading-tight" style={{ color: "#0D1B3E" }}>{p.nazev}</b>
                  <span
                    className="shrink-0 text-[12px] font-extrabold px-2.5 py-1 rounded-lg"
                    style={p.stitek === "Zdarma" ? { background: "#E2F4E9", color: "#14753A" } : { background: "#EEF0F6", color: "#5F6982" }}
                  >
                    {p.stitek}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "#5F6982" }}>{p.popis}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {p.fakta.map((f) => (
                    <li key={f} className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#F3F4F9", color: "#0D1B3E" }}>{f}</li>
                  ))}
                </ul>
                {p.stav && <p className="text-sm font-bold" style={{ color: p.stav.startsWith("✓") ? "#14753A" : p.barva }}>{p.stav}</p>}
                <div className="flex-1" />
                {p.href && p.tlacitko ? (
                  <Link
                    href={p.href}
                    className={`w-full py-3 rounded-2xl text-center font-extrabold ${doporucena ? "mm-tlacitko text-white" : "mm-obrys"}`}
                    style={doporucena ? { background: p.barva } : { color: "#0D1B3E", border: "1.5px solid #E4E6EF" }}
                  >
                    {p.tlacitko} →
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
