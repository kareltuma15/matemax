"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTrida } from "@/lib/trida";

type Stitek = "Zdarma" | "Zvlášť";

interface Polozka {
  nazev: string;
  popis: string;
  stitek: Stitek;
  href?: string;
  tlacitko?: string;
  testid: string;
}

/**
 * Testy = ověř se. Jedno místo pro obě třídy: diagnostika, cvičný test a test nanečisto.
 * U každé možnosti je napsané, jestli je zdarma, nebo se platí zvlášť.
 */
export default function TestyPage() {
  const { trida, ready } = useTrida();
  const [diagHotova, setDiagHotova] = useState(false);
  useEffect(() => {
    try { setDiagHotova(localStorage.getItem("matemax-diag-done") === "1"); } catch { /* soukromé okno */ }
  }, []);

  if (!ready) return null;

  const diagnostika: Polozka = {
    nazev: "Krátká diagnostika",
    popis: trida === 5
      ? "Krátký test ze všech osmi okruhů, asi 15 minut. Ukáže, čím začít."
      : "Pár příkladů z každého tématu. Zjistí, kde máš mezery.",
    stitek: "Zdarma",
    href: "/diagnostika",
    tlacitko: diagHotova ? "Udělat znovu" : "Spustit diagnostiku",
    testid: "testy-diagnostika",
  };
  const polozky: Polozka[] = trida === 5
    ? [
        diagnostika,
        {
          nazev: "Test nanečisto",
          popis: "Celý test jako u přijímaček na víceleté gymnázium: 70 minut, 14 úloh, 50 bodů. Píše se naostro v učebně.",
          stitek: "Zvlášť",
          testid: "testy-nanecisto",
        },
      ]
    : [
        diagnostika,
        {
          nazev: "Cvičný test CERMAT",
          popis: "15 úloh ze všech témat na čas, 25 minut. Na konci uvidíš, jak bys dopadl.",
          stitek: "Zdarma",
          href: "/cermat-test",
          tlacitko: "Spustit cvičný test",
          testid: "testy-cermat",
        },
        {
          nazev: "Test nanečisto",
          popis: "Celý test jako u přijímaček: 70 minut, 16 úloh, 50 bodů. Píše se naostro v učebně.",
          stitek: "Zvlášť",
          href: "/testy-nanecisto",
          tlacitko: "Termíny a přihláška",
          testid: "testy-nanecisto",
        },
      ];

  return (
    <div className="flex flex-col gap-4 max-w-xl mx-auto w-full" data-testid="testy">
      <div>
        <h1 className="text-[26px] font-extrabold leading-tight" style={{ color: "#0D1B3E" }}>Testy</h1>
        <p className="text-sm mt-1" style={{ color: "#5F6982" }}>Ověř si, jak bys dopadl u přijímaček.</p>
      </div>
      {polozky.map((p, i) => (
        <div
          key={p.nazev}
          className="bg-white rounded-[18px] p-4 flex flex-col gap-2.5"
          style={{ border: i === 0 && !diagHotova ? "2px solid #5B55D6" : "1px solid #E4E6EF" }}
          data-testid={p.testid}
        >
          <div className="flex items-center justify-between gap-2">
            <b className="text-base" style={{ color: "#0D1B3E" }}>{p.nazev}</b>
            <span
              className="shrink-0 text-[13px] font-extrabold px-2.5 py-1 rounded-lg"
              style={p.stitek === "Zdarma" ? { background: "#E2F4E9", color: "#14753A" } : { background: "#EEF0F6", color: "#5F6982" }}
            >
              {p.stitek}
            </span>
          </div>
          <p className="text-sm" style={{ color: "#5F6982" }}>{p.popis}</p>
          {p.href && p.tlacitko && (
            <Link
              href={p.href}
              className="w-full py-3 rounded-2xl text-center font-extrabold press-scale"
              style={i === 0 && !diagHotova ? { background: "#0D1B3E", color: "#fff" } : { color: "#0D1B3E", border: "1.5px solid #E4E6EF" }}
            >
              {p.tlacitko}
            </Link>
          )}
        </div>
      ))}
    </div>
  );
}
