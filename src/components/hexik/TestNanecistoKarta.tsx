"use client";

import { useState } from "react";
import { uplatniKodGeneralky } from "@/lib/sbirka-test";
import type { Trida } from "@/types";

function datum(den: string): string {
  const [y, m, d] = den.split("-").map(Number);
  return `${d}. ${m}. ${y}`;
}

/**
 * Kód Generálka: žák ho dostane na testu nanečisto v učebně (nebo u výsledků) a tady uplatní.
 * Za každý test Truhla Generálka, za první test i legendární pozadí Generálka.
 */
export default function TestNanecistoKarta({ trida }: { trida: Trida }) {
  const [kod, setKod] = useState("");
  const [stav, setStav] = useState<{ typ: "ok" | "chyba" | "ceka"; text: string } | null>(null);

  async function odeslat(e: React.FormEvent) {
    e.preventDefault();
    if (!kod.trim() || stav?.typ === "ceka") return;
    setStav({ typ: "ceka", text: "Ověřuji…" });
    const r = await uplatniKodGeneralky(kod, trida);
    if (!r.ok) {
      setStav({ typ: "chyba", text: r.duvod === "limit" ? "Moc pokusů, zkus to za minutu." : r.duvod === "sit" ? "Nepodařilo se spojit, zkus to znovu." : "Tenhle kód neznám. Zkontroluj ho, platí 45 dní po testu." });
      return;
    }
    setKod("");
    setStav({
      typ: "ok",
      text: r.odmena.novy
        ? `Test z ${datum(r.den)} započítán: Truhla Generálka čeká${r.odmena.pozadi ? " a máš legendární pozadí Generálka" : ""}!`
        : `Test z ${datum(r.den)} už máš započítaný.`,
    });
  }

  return (
    <section className="mm-karta p-4 lg:p-5 flex flex-col gap-3" data-testid="test-nanecisto-karta">
      <div className="flex items-center gap-3">
        <span className="hx-truhla hx-mala shrink-0" data-druh="generalka"><span className="hx-vika" /><span className="hx-telo" /><span className="hx-zamek" /></span>
        <div className="min-w-0">
          <p className="font-black text-lg leading-tight" style={{ color: "#0D1B3E" }}>Byl jsi na testu nanečisto?</p>
          <p className="text-xs" style={{ color: "#5F6982" }}>
            Zadej kód Generálka z učebny. Dostaneš Truhlu Generálka, za první test i legendární pozadí. Když se v dalším testu zlepšíš, čeká tě Legendární truhla.
          </p>
        </div>
      </div>
      <form onSubmit={odeslat} className="flex gap-2">
        <input
          value={kod}
          onChange={(e) => setKod(e.target.value)}
          placeholder="GEN-XXXXXX"
          maxLength={14}
          autoCapitalize="characters"
          autoComplete="off"
          className="flex-1 min-w-0 rounded-xl px-3 py-2.5 text-base font-bold tracking-widest uppercase border outline-none"
          style={{ borderColor: "#CBD2E1", color: "#0D1B3E" }}
          aria-label="Kód z testu nanečisto"
          data-testid="kod-generalka"
        />
        <button type="submit" disabled={!kod.trim() || stav?.typ === "ceka"} className="mm-tlacitko shrink-0 rounded-xl px-4 py-2.5 font-extrabold text-white disabled:opacity-50" style={{ background: "#0D1B3E" }} data-testid="kod-uplatnit">
          Uplatnit
        </button>
      </form>
      {stav && (
        <p className="text-sm font-bold" style={{ color: stav.typ === "ok" ? "#14753A" : stav.typ === "chyba" ? "#B4232F" : "#5F6982" }} aria-live="polite" data-testid="kod-vysledek">
          {stav.text}
        </p>
      )}
    </section>
  );
}
