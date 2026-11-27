"use client";

import { useState, useTransition } from "react";
import { useToast } from "./Toast";
import { pridejUkol, zmenUkol } from "@/app/(admin)/admin/novy/akce";

/** Úkol se zaškrtnutím (DN-08, PL-03): hotovo se dá 10 s vrátit. */
export function UkolRadek({ id, nazev, popis, stav, termin }: { id: number; nazev: string; popis?: string | null; stav: string; termin?: string | null }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const hotovo = stav === "hotovo";
  return (
    <label className="a2-check" id={`ukol-${id}`} style={{ opacity: pending ? 0.6 : 1 }} data-testid="a2-ukol">
      <input type="checkbox" checked={hotovo} disabled={pending} onChange={() => start(async () => {
        const puvodni = await zmenUkol(id, { stav: hotovo ? "novy" : "hotovo" });
        if (!hotovo) toast({ text: "Úkol hotový", zpet: async () => { await zmenUkol(id, { stav: (puvodni?.stav as "novy") ?? "novy" }); } });
      })} />
      <span style={{ textDecoration: hotovo ? "line-through" : undefined, color: hotovo ? "var(--a-slaby)" : undefined }}>
        {nazev}
        {termin && <span className="a2-s"> · do {new Date(termin + "T12:00:00").toLocaleDateString("cs-CZ")}</span>}
        {popis && <span className="a2-s" style={{ display: "block" }}>{popis}</span>}
      </span>
    </label>
  );
}

export function NovyUkol({ zaci, otevrit = false }: { zaci?: string[]; otevrit?: boolean }) {
  const toast = useToast();
  const [otevreno, setOtevreno] = useState(otevrit);
  const [nazev, setNazev] = useState("");
  const [termin, setTermin] = useState("");
  const [pending, start] = useTransition();
  if (!otevreno) return <button type="button" className="a2-btn a2-sek a2-male" onClick={() => setOtevreno(true)} data-testid="a2-novy-ukol">+ Úkol</button>;
  return (
    <form className="a2-sekce" onSubmit={(e) => { e.preventDefault(); start(async () => { await pridejUkol({ nazev, zaci, termin: termin || null }); setNazev(""); setTermin(""); setOtevreno(false); toast({ text: "Úkol přidán" }); }); }}>
      <label className="a2-pole">Úkol<input type="text" id="novy-ukol-nazev" value={nazev} onChange={(e) => setNazev(e.target.value)} required maxLength={200} placeholder="Co udělat" autoFocus /></label>
      <label className="a2-pole">Termín (nepovinné)<input type="date" id="novy-ukol-termin" value={termin} onChange={(e) => setTermin(e.target.value)} /></label>
      <div className="a2-radek"><button type="submit" className="a2-btn a2-male" disabled={pending}>Přidat</button><button type="button" className="a2-btn a2-sek a2-male" onClick={() => setOtevreno(false)}>Zrušit</button></div>
    </form>
  );
}
