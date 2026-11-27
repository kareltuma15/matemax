"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useToast } from "./Toast";
import { odpovez, polozkaNaUkol, vyridPolozku } from "@/app/(admin)/admin/novy/zpravy/akce";

/**
 * Schránka (ZP-07): odpovědi na e-maily, zpětná vazba a nahlášené chyby. Vyřízení má „Zpět“ na 10 s,
 * odpověď jde v testovacím režimu na adresu admina. V režimu sdílení jsou jména a adresy nahrazené pseudonymy už na serveru.
 */
export interface PolozkaKarty {
  id: number; druh: string; druhNazev: string; kdo: string; zakId: string | null; trida: 5 | 9 | null; kdy: string; text: string | null;
  kontext: string | null; ulohaId: string | null; nove: boolean; mohuOdpovedet: boolean;
}

export default function Schranka({ polozky, naostro }: { polozky: PolozkaKarty[]; naostro: boolean }) {
  return (
    <div className="a2-sekce" data-testid="a2-schranka">
      {polozky.map((p) => <Polozka key={p.id} p={p} naostro={naostro} />)}
    </div>
  );
}

function Polozka({ p, naostro }: { p: PolozkaKarty; naostro: boolean }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [psat, setPsat] = useState(false);
  const [text, setText] = useState("");
  const [potvrdit, setPotvrdit] = useState(false);

  const vyrid = (stav: "nove" | "vyrizeno") => start(async () => {
    const puvodni = await vyridPolozku(p.id, stav);
    toast({ text: stav === "vyrizeno" ? "Vyřízeno" : "Vráceno mezi nové", zpet: puvodni && puvodni !== stav ? async () => { await vyridPolozku(p.id, puvodni); } : undefined });
  });
  const odeslat = () => start(async () => {
    setPotvrdit(false);
    try { const r = await odpovez(p.id, text, naostro); toast({ text: r.zprava }); if (r.ok) { setPsat(false); setText(""); } }
    catch (e) { toast({ text: e instanceof Error ? e.message : "Odpověď se nepodařilo odeslat." }); }
  });

  return (
    <div className={`a2-karta${p.nove ? " a2-nova" : ""}`} data-testid="a2-polozka" data-druh={p.druh} style={{ opacity: pending ? 0.6 : 1 }}>
      <div className="a2-radek a2-mezi">
        <span className="a2-t">{p.druhNazev}: {p.zakId ? <Link href={`/admin/novy/zaci/${p.zakId}`} style={{ color: "var(--a-modra)" }}>{p.kdo}</Link> : p.kdo}{p.trida && <> <span className={`a2-tr t${p.trida}`}>{p.trida}.</span></>}</span>
        <span className="a2-s">{p.kdy}</span>
      </div>
      {p.kontext && <span className="a2-s">{p.kontext}</span>}
      {p.text ? <div className="a2-bublina">{p.text}</div> : <span className="a2-s">Bez textu.</span>}
      <div className="a2-radek">
        {p.mohuOdpovedet && !psat && <button type="button" className="a2-btn a2-male" onClick={() => setPsat(true)}>Odpovědět</button>}
        {p.ulohaId && <a className="a2-btn a2-male" href={`/nahled?ids=${encodeURIComponent(p.ulohaId)}`} target="_blank" rel="noopener">Zobrazit úlohu</a>}
        {p.zakId && <Link className="a2-btn a2-sek a2-male" href={`/admin/novy/zaci/${p.zakId}`}>Otevřít žáka</Link>}
        <button type="button" className="a2-btn a2-sek a2-male" disabled={pending} onClick={() => start(async () => { await polozkaNaUkol(p.id); toast({ text: "Úkol přidán do plánu týdne" }); })}>Na úkol</button>
        {p.nove ? <button type="button" className="a2-btn a2-sek a2-male" disabled={pending} onClick={() => vyrid("vyrizeno")} data-testid="a2-vyridit">Vyřízeno</button>
          : <button type="button" className="a2-btn a2-sek a2-male" disabled={pending} onClick={() => vyrid("nove")}>Vrátit mezi nové</button>}
      </div>
      {psat && (
        <form className="a2-sekce" onSubmit={(e) => { e.preventDefault(); if (naostro) setPotvrdit(true); else odeslat(); }}>
          <label className="a2-pole">Odpověď
            <textarea id={`odpoved-${p.id}`} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} placeholder="Žákům tykej, rodičům vykej." />
          </label>
          {!naostro && <span className="a2-s" style={{ fontSize: 12 }}>Testovací režim: odpověď přijde na tvou adresu s TEST v předmětu, nikomu jinému nic neodejde.</span>}
          <div className="a2-radek"><button type="submit" className="a2-btn" disabled={pending || !text.trim()}>Odeslat</button><button type="button" className="a2-btn a2-sek" onClick={() => setPsat(false)}>Zrušit</button></div>
        </form>
      )}
      {potvrdit && (
        <>
          <div className="a2-okno-zavoj" onClick={() => setPotvrdit(false)} />
          <div className="a2-okno" role="dialog" aria-modal="true" aria-label="Potvrdit odeslání">
            <b>Odeslat odpověď naostro?</b>
            <span className="a2-s">Ostrý režim je zapnutý v nastavení. E-mail odejde {p.kdo} a nejde vzít zpět.</span>
            <div className="a2-radek"><button type="button" className="a2-btn a2-cervene" onClick={odeslat}>Odeslat</button><button type="button" className="a2-btn a2-sek" onClick={() => setPotvrdit(false)}>Zrušit</button></div>
          </div>
        </>
      )}
    </div>
  );
}
