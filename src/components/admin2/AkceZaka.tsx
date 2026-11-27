"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "./Toast";
import * as A from "@/app/(admin)/admin/novy/akce";
import type { EmailZaka } from "@/lib/emaily/katalog";

/**
 * Rychlé akce na kartě žáka (ZA-07). Každá akce se zapíše do auditu.
 * E-maily v testovacím režimu (výchozí) chodí na adresu admina. Nevratné akce chtějí potvrzení.
 */
type Okno = null | "email" | "premium" | "poznamka" | "ucet" | "smazat";
const SABLONY: [EmailZaka, string][] = [["nezacal", "Připomínka: ještě nezačal"], ["plan", "Plán po diagnostice"], ["styska", "Stýská se mi (3 dny)"], ["spi", "Poslední připomínka"], ["uvitani", "Uvítání"]];

export default function AkceZaka({ id, jmeno, trida, premium, premiumDo, naostro, testovaci, deaktivovan, zebricekSkryty, prezdivka, demo, otevrit }: {
  id: string; jmeno: string; trida: 5 | 9; premium: string; premiumDo: string | null; naostro: boolean; testovaci: boolean; deaktivovan: boolean; zebricekSkryty: boolean; prezdivka: string; demo: boolean; otevrit?: Okno;
}) {
  const toast = useToast();
  const router = useRouter();
  const [okno, setOkno] = useState<Okno>(otevrit ?? null);
  const [pending, start] = useTransition();
  const [druh, setDruh] = useState<"sablona" | "vlastni">("sablona");
  const [sablona, setSablona] = useState<EmailZaka>("nezacal");
  const [predmet, setPredmet] = useState("");
  const [text, setText] = useState("");
  const [potvrzeno, setPotvrzeno] = useState(false);
  const [doKdy, setDoKdy] = useState(premiumDo?.slice(0, 10) ?? "");
  const [poznamka, setPoznamka] = useState("");
  const [prez, setPrez] = useState(prezdivka);
  const [smazat, setSmazat] = useState("");
  const [resetPotvrd, setResetPotvrd] = useState(false);

  const proved = (fn: () => Promise<unknown>, ok: string, zpet?: () => Promise<unknown>) => start(async () => {
    try { await fn(); toast({ text: ok, zpet: zpet ? async () => { await zpet(); } : undefined }); setOkno(null); }
    catch (e) { toast({ text: e instanceof Error ? e.message : "Akce se nepovedla" }); }
  });
  const zavrit = () => { setOkno(null); setPotvrzeno(false); };
  if (demo) return <p className="a2-s">V demu jsou akce vypnuté.</p>;

  return (
    <>
      <div className="a2-radek" data-testid="a2-akce-zaka">
        <button type="button" className="a2-btn" onClick={() => setOkno("email")}>E-mail</button>
        <button type="button" className="a2-btn a2-sek" disabled title="Push zatím nikdo nepovolil (0 odběrů)">Push</button>
        <button type="button" className="a2-btn a2-sek" onClick={() => setOkno("premium")}>Premium</button>
        <button type="button" className="a2-btn a2-sek" onClick={() => setOkno("poznamka")}>Poznámka</button>
        <button type="button" className="a2-btn a2-sek" onClick={() => setOkno("ucet")} aria-label="Další akce">⋯</button>
      </div>

      {okno && <div className="a2-okno-zavoj" onClick={zavrit} />}
      {okno === "email" && (
        <form className="a2-okno" role="dialog" aria-modal="true" onSubmit={(e) => { e.preventDefault(); proved(async () => { const r = druh === "sablona" ? await A.posliSablonu([id], sablona, potvrzeno) : await A.posliVlastni(id, predmet, text, potvrzeno); toast({ text: r.zprava }); }, naostro ? "Odesláno" : "Test odeslán na tvou adresu"); }}>
          <b>E-mail pro {jmeno}</b>
          <div className="a2-cipy"><button type="button" className="a2-cip" aria-pressed={druh === "sablona"} onClick={() => setDruh("sablona")}>Šablona</button><button type="button" className="a2-cip" aria-pressed={druh === "vlastni"} onClick={() => setDruh("vlastni")}>Vlastní text</button></div>
          {druh === "sablona" ? (
            <label className="a2-pole">Šablona<select id="karta-sablona" value={sablona} onChange={(e) => setSablona(e.target.value as EmailZaka)}>{SABLONY.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></label>
          ) : (
            <>
              <label className="a2-pole">Předmět<input type="text" id="karta-predmet" value={predmet} onChange={(e) => setPredmet(e.target.value)} maxLength={120} required /></label>
              <label className="a2-pole">Text (žákovi tykej)<textarea id="karta-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} required /></label>
            </>
          )}
          {naostro ? <label className="a2-check"><input type="checkbox" checked={potvrzeno} onChange={(e) => setPotvrzeno(e.target.checked)} /><span><b>Ostrý režim:</b> odeslat žákovi. Nejde vzít zpět.</span></label>
            : <span className="a2-s">Testovací režim: přijde na tvou adresu s „TEST“ v předmětu, žákovi nic. Ostrý režim zapneš v Systému → Nastavení.</span>}
          <div className="a2-radek"><button type="submit" className="a2-btn" disabled={pending || (naostro && !potvrzeno)}>{naostro ? "Odeslat" : "Poslat test"}</button><button type="button" className="a2-btn a2-sek" onClick={zavrit}>Zrušit</button></div>
        </form>
      )}
      {okno === "premium" && (
        <div className="a2-okno" role="dialog" aria-modal="true">
          <b>Premium: {jmeno}</b>
          <span className="a2-s">Teď: {premium === "stripe" ? "platí přes Stripe (měň ve Stripe)" : premium === "rucne" ? "ručně udělené" : premium === "zkusebni" ? "zkušební období" : "zdarma"}{premiumDo ? ` do ${new Date(premiumDo).toLocaleDateString("cs-CZ")}` : ""}</span>
          {premium !== "stripe" && (
            <>
              <label className="a2-pole">Do kdy (prázdné = bez omezení)<input type="date" id="karta-premium-do" value={doKdy} onChange={(e) => setDoKdy(e.target.value)} /></label>
              <div className="a2-radek">
                <button type="button" className="a2-btn" disabled={pending} onClick={() => proved(() => A.nastavPremium(id, true, doKdy || null), "Premium uděleno", () => A.nastavPremium(id, false, null))}>Udělit Premium</button>
                {premium !== "zdarma" && <button type="button" className="a2-btn a2-sek" disabled={pending} onClick={() => proved(() => A.nastavPremium(id, false, null), "Premium odebráno", () => A.nastavPremium(id, true, premiumDo?.slice(0, 10) ?? null))}>Odebrat</button>}
              </div>
            </>
          )}
          <button type="button" className="a2-btn a2-sek" onClick={zavrit}>Zavřít</button>
        </div>
      )}
      {okno === "poznamka" && (
        <form className="a2-okno" role="dialog" aria-modal="true" onSubmit={(e) => { e.preventDefault(); proved(() => A.pridejPoznamku(id, poznamka), "Poznámka uložena"); setPoznamka(""); }}>
          <b>Poznámka k žákovi {jmeno}</b>
          <textarea id="karta-poznamka" value={poznamka} onChange={(e) => setPoznamka(e.target.value)} maxLength={2000} required placeholder="Vidí ji jen admin." />
          <div className="a2-radek"><button type="submit" className="a2-btn" disabled={pending}>Uložit</button><button type="button" className="a2-btn a2-sek" onClick={() => proved(() => A.pridejUkol({ nazev: poznamka || `Ozvat se: ${jmeno}`, zaci: [id] }), "Úkol přidán do plánu")} disabled={pending}>Uložit jako úkol</button><button type="button" className="a2-btn a2-sek" onClick={zavrit}>Zrušit</button></div>
        </form>
      )}
      {okno === "ucet" && (
        <div className="a2-okno" role="dialog" aria-modal="true">
          <b>Správa účtu: {jmeno}</b>
          <div className="a2-radek"><span className="a2-s" style={{ flex: 1 }}>Třída: {trida}.</span><button type="button" className="a2-btn a2-sek a2-male" disabled={pending} onClick={() => proved(() => A.zmenTridu(id, trida === 5 ? 9 : 5), `Změněno na ${trida === 5 ? 9 : 5}. třídu`, () => A.zmenTridu(id, trida))}>Změnit na {trida === 5 ? 9 : 5}. třídu</button></div>
          <form className="a2-radek" onSubmit={(e) => { e.preventDefault(); proved(() => A.zmenPrezdivku(id, prez), "Přezdívka změněna"); }}>
            <label className="a2-pole" style={{ flex: 1 }}>Přezdívka v žebříčku<input type="text" id="karta-prezdivka" value={prez} onChange={(e) => setPrez(e.target.value)} maxLength={20} /></label>
            <button type="submit" className="a2-btn a2-sek a2-male" style={{ alignSelf: "flex-end" }} disabled={pending}>Uložit</button>
          </form>
          <div className="a2-radek"><span className="a2-s" style={{ flex: 1 }}>Žebříček výzvy: {zebricekSkryty ? "skrytý ostatním" : "viditelný"}</span><button type="button" className="a2-btn a2-sek a2-male" disabled={pending} onClick={() => proved(() => A.skrytZebricek(id, !zebricekSkryty), zebricekSkryty ? "Zase v žebříčku" : "Vyřazen ze žebříčku", () => A.skrytZebricek(id, zebricekSkryty))}>{zebricekSkryty ? "Vrátit do žebříčku" : "Vyřadit ze žebříčku"}</button></div>
          <div className="a2-radek"><span className="a2-s" style={{ flex: 1 }}>Diagnostika</span><button type="button" className="a2-btn a2-sek a2-male" disabled={pending} onClick={() => proved(() => A.resetDiagnostiky(id), "Diagnostika resetována")}>Reset diagnostiky</button></div>
          <div className="a2-radek"><span className="a2-s" style={{ flex: 1 }}>Testovací účet se nikde nepočítá</span><button type="button" className="a2-btn a2-sek a2-male" disabled={pending} onClick={() => proved(() => A.oznacTestovaci(id, !testovaci), testovaci ? "Už není testovací" : "Označen jako testovací", () => A.oznacTestovaci(id, testovaci))}>{testovaci ? "Zrušit testovací" : "Označit jako testovací"}</button></div>
          <div className="a2-radek"><span className="a2-s" style={{ flex: 1 }}>Odkaz na nové heslo (odejde žákovi)</span>{resetPotvrd
            ? <button type="button" className="a2-btn a2-cervene a2-male" disabled={pending} onClick={() => { setResetPotvrd(false); proved(() => A.posliResetHesla(id, true), "Odkaz odešel žákovi"); }}>Opravdu poslat žákovi</button>
            : <button type="button" className="a2-btn a2-sek a2-male" disabled={pending} onClick={() => setResetPotvrd(true)}>Poslat odkaz…</button>}</div>
          <div className="a2-radek"><span className="a2-s" style={{ flex: 1 }}>{deaktivovan ? "Účet je deaktivovaný" : "Deaktivovat (nepřihlásí se)"}</span><button type="button" className="a2-btn a2-sek a2-male" disabled={pending} onClick={() => proved(() => A.deaktivujUcet(id, !deaktivovan), deaktivovan ? "Účet aktivován" : "Účet deaktivován", () => A.deaktivujUcet(id, deaktivovan))}>{deaktivovan ? "Aktivovat" : "Deaktivovat"}</button></div>
          <div className="a2-radek"><span className="a2-s" style={{ flex: 1 }}>Export dat žáka (JSON)</span><button type="button" className="a2-btn a2-sek a2-male" disabled={pending} onClick={() => start(async () => { const json = await A.exportDatZaka(id); const url = URL.createObjectURL(new Blob([json], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = `zak-${id.slice(0, 8)}.json`; a.click(); URL.revokeObjectURL(url); toast({ text: "Export stažen" }); })}>Stáhnout</button></div>
          <div className="a2-radek"><span className="a2-s" style={{ flex: 1 }}>Sloučení duplicitních účtů přijde ve fázi B</span></div>
          <button type="button" className="a2-btn a2-cervene" onClick={() => setOkno("smazat")}>Smazat účet…</button>
          <button type="button" className="a2-btn a2-sek" onClick={zavrit}>Zavřít</button>
        </div>
      )}
      {okno === "smazat" && (
        <form className="a2-okno" role="dialog" aria-modal="true" onSubmit={(e) => { e.preventDefault(); start(async () => { try { await A.smazUcet(id, smazat); toast({ text: "Účet smazán" }); router.push("/admin/novy/zaci"); } catch (er) { toast({ text: er instanceof Error ? er.message : "Nepovedlo se" }); } }); }}>
          <b>Smazat účet {jmeno}?</b>
          <span className="a2-s">Smaže účet i všechna data žáka (tréninky, odpovědi, Premium, souhlasy). Nejde vzít zpět. Před smazáním si případně stáhni export.</span>
          <label className="a2-pole">Pro potvrzení napiš SMAZAT<input type="text" id="karta-smazat" value={smazat} onChange={(e) => setSmazat(e.target.value)} autoComplete="off" /></label>
          <div className="a2-radek"><button type="submit" className="a2-btn a2-cervene" disabled={pending || smazat !== "SMAZAT"}>Smazat natrvalo</button><button type="button" className="a2-btn a2-sek" onClick={zavrit}>Zrušit</button></div>
        </form>
      )}
    </>
  );
}
