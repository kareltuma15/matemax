"use client";

import { useEffect, useState } from "react";
import { nactiSbirku, vychoziStav, SBIRKA_EVENT, type SbirkaStav } from "./sbirka";

/** Aktuální stav Sbírky v komponentě (překreslí se po každé změně, i z jiné karty prohlížeče). */
export function useSbirka(): { stav: SbirkaStav; nacteno: boolean } {
  const [stav, setStav] = useState<SbirkaStav>(vychoziStav);
  const [nacteno, setNacteno] = useState(false);
  useEffect(() => {
    const obnov = () => { setStav(nactiSbirku()); setNacteno(true); };
    obnov();
    window.addEventListener(SBIRKA_EVENT, obnov);
    window.addEventListener("storage", obnov);
    return () => {
      window.removeEventListener(SBIRKA_EVENT, obnov);
      window.removeEventListener("storage", obnov);
    };
  }, []);
  return { stav, nacteno };
}
