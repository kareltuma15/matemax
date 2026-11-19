"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { nactiTestyZVysledku } from "@/lib/sbirka-test";

/**
 * Domov po osobním QR (krok 3, Karel 19. 11. 2026):
 *  • ?z=qr&propojeno=1 → potvrzení „Propojeno s Testy nanečisto“,
 *  • výsledky z Vyhodnocení se načtou rovnou na Domově, takže Truhla Generálka (a za zlepšení Legendární)
 *    přijde bez kódu hned po propojení, ne až při otevření Sbírky.
 */
export default function PropojenoKarta() {
  const [propojeno, setPropojeno] = useState(false);
  const [truhel, setTruhel] = useState(0);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("propojeno") === "1") {
      setPropojeno(true); // eslint-disable-line react-hooks/set-state-in-effect
      p.delete("propojeno"); p.delete("z");
      const zbytek = p.toString();
      window.history.replaceState(null, "", window.location.pathname + (zbytek ? `?${zbytek}` : ""));
    }
    nactiTestyZVysledku().then((r) => setTruhel(r.nove + r.zlepseni)).catch(() => {});
  }, []);

  if (!propojeno && truhel === 0) return null;
  return (
    <div className="rounded-[20px] p-4 flex flex-col gap-2" style={{ background: "#E9F8EF", border: "1.5px solid #A8E0BE" }} data-testid="propojeno-karta">
      {propojeno && (
        <>
          <b className="text-[16px]" style={{ color: "#14663D" }}>✓ Propojeno s Testy nanečisto</b>
          <p className="text-[14px]" style={{ color: "#2C5A40" }}>Po každém testu ti sem přijdou body po tématech a plán, co trénovat do dalšího testu.</p>
        </>
      )}
      {truhel > 0 && (
        <Link href="/sbirka" className="flex items-center gap-3 rounded-2xl px-3 py-2.5 mm-klik" style={{ background: "#FFFFFF", border: "1px solid #CFEBDA" }} data-testid="propojeno-truhla">
          <span className="text-2xl" aria-hidden="true">🎁</span>
          <span className="min-w-0">
            <b className="block text-[15px]" style={{ color: "#0D1B3E" }}>{truhel === 1 ? "Truhla za test nanečisto je tvoje" : `Za testy nanečisto na tebe čekají ${truhel} truhly`}</b>
            <span className="block text-[13px]" style={{ color: "#5F6982" }}>Otevři ji ve Sbírce.</span>
          </span>
        </Link>
      )}
    </div>
  );
}
