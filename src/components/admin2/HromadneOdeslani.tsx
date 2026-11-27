"use client";

import { useState, useTransition } from "react";
import { useToast } from "./Toast";
import { odesliHromadne, posliTestHromadne } from "@/app/(admin)/admin/novy/zpravy/akce";
import type { EmailZaka } from "@/lib/emaily/katalog";

/**
 * Poslední kroky hromadného odeslání (ZP-12): test na adresu admina → potvrzení → odeslání.
 * Ostré odeslání jde jen se zapnutým ostrým režimem a až po testu. Tlačítko se během odesílání zamkne.
 */
export default function HromadneOdeslani({ ids, sablona, trida, naostro, zbyva }: { ids: string[]; sablona: EmailZaka; trida: 5 | 9; naostro: boolean; zbyva: number }) {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [test, setTest] = useState(false);
  const [potvrdit, setPotvrdit] = useState(false);
  const [hotovo, setHotovo] = useState<string | null>(null);
  const pocet = Math.min(ids.length, 50, zbyva);

  return (
    <div className="a2-kroky">
      <div className="a2-krok"><i className={test ? "ok" : "akt"}>{test ? "✓" : "4"}</i><div className="a2-sekce">
        <b>Test na tvou adresu</b>
        <span className="a2-s">Přijde jedna ukázka s TEST v předmětu. Žákům nic.</span>
        <button type="button" className="a2-btn a2-sek" style={{ alignSelf: "flex-start" }} disabled={pending || !ids.length} data-testid="a2-hromadne-test"
          onClick={() => start(async () => { const r = await posliTestHromadne(sablona, trida, ids.length); toast({ text: r.zprava }); if (r.ok) setTest(true); })}>Poslat test</button>
      </div></div>
      <div className="a2-krok"><i className={hotovo ? "ok" : test ? "akt" : ""}>{hotovo ? "✓" : "5"}</i><div className="a2-sekce">
        <b>Potvrdit a odeslat {pocet} {pocet === 1 ? "žákovi" : "žákům"}</b>
        {!naostro ? <span className="a2-s">Ostrý režim e-mailů je vypnutý (Systém → Nastavení), proto jde poslat jen test.</span>
          : <span className="a2-s">Za posledních 24 h zbývá {zbyva} ze 100 e-mailů Resendu. Přes 50 lidí pošli zbytek další den.</span>}
        {hotovo && <span className="a2-zaver">{hotovo}</span>}
        <button type="button" className="a2-btn a2-akc" style={{ alignSelf: "flex-start" }} disabled={pending || !naostro || !test || !pocet || !!hotovo} onClick={() => setPotvrdit(true)} data-testid="a2-hromadne-odeslat">Odeslat</button>
      </div></div>
      {potvrdit && (
        <>
          <div className="a2-okno-zavoj" onClick={() => setPotvrdit(false)} />
          <div className="a2-okno" role="dialog" aria-modal="true" aria-label="Potvrdit hromadné odeslání">
            <b>Odeslat e-mail naostro {pocet} {pocet === 1 ? "žákovi" : "žákům"}?</b>
            <span className="a2-s">Přeskočí se odhlášení, vrácené adresy a kdo stejnou šablonu dostal za posledních 7 dní. Odeslání nejde vzít zpět.</span>
            <div className="a2-radek">
              <button type="button" className="a2-btn a2-cervene" disabled={pending} onClick={() => start(async () => { setPotvrdit(false); try { const r = await odesliHromadne(ids, sablona, true); setHotovo(r.zprava); toast({ text: r.zprava }); } catch (e) { toast({ text: e instanceof Error ? e.message : "Odeslání selhalo." }); } })}>Odeslat</button>
              <button type="button" className="a2-btn a2-sek" onClick={() => setPotvrdit(false)}>Zrušit</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
