"use client";

import { usePathname } from "next/navigation";

/**
 * Obsahový rám aplikace s šířkou podle stránky.
 *
 * Layout dřív vnucoval všem stránkám úzkých max-w-2xl (672 px). Domovská
 * obrazovka působila líp jen proto, že běží mimo tenhle layout a má vlastní
 * dva sloupce. Stránky, které si o desktop řeknou (profil, trénink,
 * rodičovský portál), teď dostanou širší rám; zbytek zůstává úzký beze změny.
 *
 * Vlastní dvousloupcové rozvržení si každá široká stránka řeší uvnitř —
 * tady jde jen o strop šířky.
 *
 * Trénink tu ZÁMĚRNĚ není: má dvojí povahu (úzká herní karta vs. široké
 * tréninkové centrum), takže si šířku řídí sám — centrum se rozšíří přes
 * celou plochu, session zůstane úzká.
 */
const WIDE_PREFIXES = ["/profil", "/rodice/dashboard"];

export default function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const wide = WIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  return (
    <main className={`flex-1 w-full mx-auto px-4 py-8 pb-24 ${wide ? "max-w-6xl" : "max-w-2xl"}`}>
      {children}
    </main>
  );
}
