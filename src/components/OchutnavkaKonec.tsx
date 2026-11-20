"use client";

import Link from "next/link";
import ProRodice from "@/components/ProRodice";
import { zbyva, DAREK_NA_TEMA } from "@/lib/ochutnavka";
import { TEMA_LABELS, type Trida } from "@/types";
import type { DarekSezeni } from "@/components/DoporuceniPoTestu";

/**
 * Konec dárkového tréninku po testu nanečisto: kolik z dárku zbývá, nebo že je dárek z tématu hotový.
 * Dítěti jen věcně (žádné „kup si“), cena a Premium v rámečku Pro rodiče.
 */
export default function OchutnavkaKonec({ darek, trida }: { darek: DarekSezeni; trida: Trida }) {
  const hotova = darek.temata.filter((k) => zbyva(darek.pouzito, k) === 0);
  const zbyvajici = darek.temata.filter((k) => zbyva(darek.pouzito, k) > 0);
  const nazvy = (ks: string[]) => ks.map((k) => TEMA_LABELS[k] ?? k).join(", ");

  return (
    <div className="flex flex-col gap-3 mb-4" data-testid="ochutnavka-konec">
      <div className="mm-karta p-5 flex flex-col gap-2.5 items-center text-center" style={{ border: "2px solid #F8D9A0" }}>
        <span className="text-[44px] leading-none" aria-hidden>🎁</span>
        {hotova.length > 0 ? (
          <>
            <b className="text-[19px] leading-tight" style={{ color: "#0D1B3E" }}>
              Dárek {hotova.length === 1 ? `z tématu ${nazvy(hotova)}` : `z témat ${nazvy(hotova)}`} je za tebou
            </b>
            <p className="text-sm max-w-sm" style={{ color: "#5F6982" }}>
              Všech {DAREK_NA_TEMA} dárkových příkladů máš vyřešených. Další příklady z {hotova.length === 1 ? "tohoto tématu" : "těchto témat"} jsou v Premium. Témata zdarma můžeš trénovat dál.
            </p>
            {zbyvajici.length > 0 && (
              <p className="text-sm font-bold" style={{ color: "#9A5B00" }}>
                Z dárku ti ještě zbývá: {zbyvajici.map((k) => `${TEMA_LABELS[k] ?? k} ${zbyva(darek.pouzito, k)} z ${DAREK_NA_TEMA}`).join(", ")}
              </p>
            )}
          </>
        ) : (
          <>
            <b className="text-[18px] leading-tight" style={{ color: "#0D1B3E" }}>Z dárku po testu ti zbývá</b>
            <p className="text-sm font-bold" style={{ color: "#9A5B00" }}>
              {zbyvajici.map((k) => `${TEMA_LABELS[k] ?? k}: ${zbyva(darek.pouzito, k)} z ${DAREK_NA_TEMA}`).join(" · ")}
            </p>
          </>
        )}
        <Link href={darek.navrat} className="mt-1 px-5 py-2.5 rounded-xl text-sm font-extrabold mm-tlacitko" style={{ background: "#F5A623", color: "#0D1B3E" }} data-testid="ochutnavka-zpet">
          {zbyvajici.length > 0 ? "🎁 Pokračovat v dárku" : "Zpět na doporučení"}
        </Link>
      </div>
      {hotova.length > 0 && <ProRodice trida={trida} />}
    </div>
  );
}
