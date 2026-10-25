"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useTrida } from "@/lib/trida";

/**
 * Stránky, které jsou zatím jen pro 9. třídu (diagnostika, CERMAT test, rychlý mód, výzva, plán).
 * Žák 5. třídy místo nich uvidí přátelské vysvětlení a odkaz na trénink; ostatní se nic nemění.
 */
export function Pro5Pripravujeme({ co }: { co: string }) {
  return (
    <div className="flex flex-col gap-4" data-testid="pro-5-pripravujeme">
      <div className="bg-white rounded-2xl border border-slate-200 p-7 text-center flex flex-col items-center gap-3">
        <span className="text-4xl">🚧</span>
        <h1 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{co} pro 5. třídu připravujeme</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          Teď se na tebe nejvíc hodí procvičování po okruzích. Tahle část přibude, až budou hotové úlohy a testy pro 5. třídu.
        </p>
        <Link href="/trenink" className="mt-1 px-5 py-3 rounded-xl text-white font-bold text-sm" style={{ background: "#0D1B3E" }}>
          Jít procvičovat →
        </Link>
      </div>
    </div>
  );
}

/** Obalí stránku: pro 9. třídu ji vykreslí beze změny, pro 5. třídu ukáže zprávu „připravujeme". */
export function jenPro9<P extends object>(Stranka: ComponentType<P>, co: string): ComponentType<P> {
  function Obal(props: P) {
    const { trida, ready } = useTrida();
    if (!ready) return null;
    if (trida === 5) return <Pro5Pripravujeme co={co} />;
    return <Stranka {...props} />;
  }
  Obal.displayName = `jenPro9(${Stranka.displayName ?? Stranka.name ?? "Stranka"})`;
  return Obal;
}
