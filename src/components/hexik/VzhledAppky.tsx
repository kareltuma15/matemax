"use client";

import { useEffect } from "react";
import { useTrida } from "@/lib/trida";
import { useSbirka } from "@/lib/use-sbirka";
import { nasazena, TMAVE_VZHLEDY } from "@/lib/sbirka";

/**
 * Nastavený vzhled appky ze Sbírky: <html data-vzhled="…"> (a data-vzhled-tmavy u tmavých scén).
 * Styly jsou v globals.css. Klasik = žádný atribut, appka vypadá jako dřív.
 * Při načtení stránky to nastaví už VZHLED_SCRIPT (lib/vzhled-script.ts) v hlavičce, tahle komponenta hlídá změny.
 */
export default function VzhledAppky() {
  const { trida, ready } = useTrida();
  const { stav, nacteno } = useSbirka();
  const klic = ready && nacteno ? nasazena(stav, trida, "vzhled").klic : null;

  useEffect(() => {
    if (klic === null) return;
    const d = document.documentElement;
    if (klic === "klasik") {
      d.removeAttribute("data-vzhled");
      d.removeAttribute("data-vzhled-tmavy");
      return;
    }
    d.setAttribute("data-vzhled", klic);
    if (TMAVE_VZHLEDY.has(klic)) d.setAttribute("data-vzhled-tmavy", "");
    else d.removeAttribute("data-vzhled-tmavy");
  }, [klic]);

  return null;
}

