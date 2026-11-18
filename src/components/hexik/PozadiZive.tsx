"use client";

import { useEffect, useRef } from "react";
import { spustZivePozadi } from "@/lib/pozadi-zive";

/** Živá vrstva pozadí (sníh, hvězdy, bublinky…) uvnitř .mm-banner; CSS základ pod ní zůstává. */
export default function PozadiZive({ klic }: { klic: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return spustZivePozadi(ref.current, klic);
  }, [klic]);
  return <canvas ref={ref} className="mm-pozadi-zive" aria-hidden="true" data-pozadi-zive={klic} />;
}
