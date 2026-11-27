"use client";

import { useState, useTransition } from "react";
import { useToast } from "./Toast";
import { ulozDlazdice } from "@/app/(admin)/admin/novy/akce-dlazdice";

/** Přizpůsobení čísel na Dnes (DN-06): pořadí šipkami a připnutí / odepnutí. Ukládá se do nastavení adminu. */
export default function UpravitDlazdice({ vsechny, poradi, skryte, demo }: { vsechny: { id: string; nazev: string }[]; poradi: string[]; skryte: string[]; demo: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [otevreno, setOtevreno] = useState(false);
  const serad = (ids: string[]) => [...ids.filter((id) => vsechny.some((v) => v.id === id)), ...vsechny.map((v) => v.id).filter((id) => !ids.includes(id))];
  const [p, setP] = useState(serad(poradi));
  const [s, setS] = useState(new Set(skryte));
  if (!otevreno) return <button type="button" className="a2-btn a2-sek a2-male" style={{ alignSelf: "flex-start" }} onClick={() => setOtevreno(true)} data-testid="a2-upravit-dlazdice">Upravit čísla</button>;
  const posun = (i: number, o: number) => { const x = [...p]; const j = i + o; if (j < 0 || j >= x.length) return; [x[i], x[j]] = [x[j], x[i]]; setP(x); };
  return (
    <div className="a2-karta" data-testid="a2-dlazdice-editor">
      <b>Která čísla a v jakém pořadí</b>
      {p.map((id, i) => {
        const nazev = vsechny.find((v) => v.id === id)?.nazev ?? id;
        return (
          <span key={id} className="a2-radek a2-mezi" style={{ flexWrap: "nowrap" }}>
            <label className="a2-check" style={{ flex: 1 }}><input type="checkbox" id={`dl-${id}`} checked={!s.has(id)} onChange={(e) => { const n = new Set(s); if (e.target.checked) n.delete(id); else n.add(id); setS(n); }} /><span>{nazev}</span></label>
            <span className="a2-radek" style={{ gap: 4, flexWrap: "nowrap" }}>
              <button type="button" className="a2-ikbtn" aria-label={`${nazev} výš`} disabled={i === 0} onClick={() => posun(i, -1)}>↑</button>
              <button type="button" className="a2-ikbtn" aria-label={`${nazev} níž`} disabled={i === p.length - 1} onClick={() => posun(i, 1)}>↓</button>
            </span>
          </span>
        );
      })}
      <div className="a2-radek">
        <button type="button" className="a2-btn a2-male" disabled={pending || demo || s.size === p.length} title={demo ? "V demu se nic neukládá" : undefined} onClick={() => start(async () => { await ulozDlazdice(p, [...s]); setOtevreno(false); toast({ text: "Čísla upravena" }); })}>Uložit</button>
        <button type="button" className="a2-btn a2-sek a2-male" onClick={() => setOtevreno(false)}>Zrušit</button>
      </div>
    </div>
  );
}
