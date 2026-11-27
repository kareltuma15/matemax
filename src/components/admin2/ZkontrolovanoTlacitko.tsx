"use client";

import { useTransition } from "react";
import { useToast } from "./Toast";
import { zkontrolujUlohu } from "@/app/(admin)/admin/novy/uceni/akce";

/** „Zkontrolováno“ u úlohy: příznak zmizí do 10 nových pokusů. Vratné, proto „Zpět“ místo potvrzení. */
export default function ZkontrolovanoTlacitko({ id, zkontrolovano, demo }: { id: string; zkontrolovano: string | null; demo: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button type="button" className={`a2-btn a2-male${zkontrolovano ? " a2-sek" : ""}`} disabled={pending || demo} data-testid="a2-zkontrolovano"
      title={demo ? "V demu se nic neukládá" : undefined}
      onClick={() => start(async () => {
        const novy = !zkontrolovano;
        await zkontrolujUlohu(id, novy);
        toast({ text: novy ? "Označeno jako zkontrolované" : "Kontrola zrušena", zpet: async () => { await zkontrolujUlohu(id, !novy); } });
      })}>
      {zkontrolovano ? "Zkontrolováno ✓" : "Zkontrolováno"}
    </button>
  );
}
