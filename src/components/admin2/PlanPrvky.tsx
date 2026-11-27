"use client";

import { useState, useTransition } from "react";
import { useToast } from "./Toast";
import { pridejUkol } from "@/app/(admin)/admin/novy/akce";
import { ulozExperiment } from "@/app/(admin)/admin/novy/plan/akce";
import type { Experiment } from "@/lib/admin2/plan";

/** Přidání navrženého úkolu z týdne v kostce jedním klepnutím (PL-06). */
export function PridatUkol({ nazev, popis, zaci, zdroj, demo }: { nazev: string; popis: string; zaci: string[]; zdroj: string; demo: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [hotovo, setHotovo] = useState(false);
  return (
    <button type="button" className="a2-btn a2-male" disabled={pending || hotovo || demo} title={demo ? "V demu se nic neukládá" : undefined} data-testid="a2-pridat-ukol"
      onClick={() => start(async () => { await pridejUkol({ nazev, popis, zaci, zdroj }); setHotovo(true); toast({ text: "Úkol přidán do plánu týdne" }); })}>
      {hotovo ? "Přidáno ✓" : "Přidat"}
    </button>
  );
}

/** Zápis k novince v kronice: proč vznikla, co sledovat a kdy vyhodnotit (PL-05). */
export function ExperimentForm({ klic, vychozi, datum, demo }: { klic: string; vychozi: Experiment | null; datum: string; demo: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [otevreno, setOtevreno] = useState(false);
  const [proc, setProc] = useState(vychozi?.proc ?? "");
  const [sledovat, setSledovat] = useState<Experiment["sledovat"]>(vychozi?.sledovat ?? "dny_tydne");
  const [vyhodnotit, setVyhodnotit] = useState(vychozi?.vyhodnotit ?? datum);
  if (!otevreno) return <button type="button" className="a2-btn a2-sek a2-male" style={{ alignSelf: "flex-start" }} onClick={() => setOtevreno(true)} disabled={demo}>{vychozi ? "Upravit sledování" : "Sledovat dopad"}</button>;
  const id = klic.replace(/[^a-z0-9]/gi, "").slice(0, 20);
  return (
    <form className="a2-sekce" onSubmit={(e) => { e.preventDefault(); start(async () => { await ulozExperiment(klic, { proc, sledovat, vyhodnotit }); setOtevreno(false); toast({ text: "Uloženo" }); }); }}>
      <label className="a2-pole">Proč změna vznikla<input type="text" id={`proc-${id}`} value={proc} onChange={(e) => setProc(e.target.value)} maxLength={300} placeholder="Např. žáci se po prvním tréninku nevracejí" /></label>
      <label className="a2-pole">Co sledovat
        <select id={`sled-${id}`} value={sledovat} onChange={(e) => setSledovat(e.target.value as Experiment["sledovat"])}>
          <option value="dny_tydne">Dny tréninku za týden (stejní žáci)</option>
          <option value="aktivace">Aktivace nových žáků</option>
          <option value="navrat">Návrat druhý den</option>
        </select>
      </label>
      <label className="a2-pole">Kdy vyhodnotit<input type="date" id={`kdy-${id}`} value={vyhodnotit} onChange={(e) => setVyhodnotit(e.target.value)} /></label>
      <div className="a2-radek">
        <button type="submit" className="a2-btn a2-male" disabled={pending}>Uložit</button>
        <button type="button" className="a2-btn a2-sek a2-male" onClick={() => setOtevreno(false)}>Zrušit</button>
        {vychozi && <button type="button" className="a2-btn a2-sek a2-male" disabled={pending} onClick={() => start(async () => { await ulozExperiment(klic, null); setOtevreno(false); toast({ text: "Sledování zrušeno" }); })}>Přestat sledovat</button>}
      </div>
    </form>
  );
}
