"use client";

import { useState } from "react";
import Link from "next/link";
import { useRodiceDitete } from "@/lib/rodice-ditete";

/**
 * Profil žáka: komu chodí týdenní report (schválený mockup 23. 11., obrazovky 1 a 2).
 * Mluví k dítěti, bez ceny a bez Premium (reklama dětem). Společný e-mail = report hned na tenhle e-mail,
 * jiný e-mail = pozvánka, kterou rodič potvrdí. Nejvýš 3 rodiče.
 */
export default function ReportRodicum() {
  const { rodice, email, akce } = useRodiceDitete();
  const [volba, setVolba] = useState<"stejny" | "jiny">("stejny");
  const [jinyEmail, setJinyEmail] = useState("");
  const [pridavam, setPridavam] = useState(false);
  const [posila, setPosila] = useState(false);
  const [chyba, setChyba] = useState<string | null>(null);

  if (rodice === null) return null;
  const aktivni = rodice.filter((r) => r.stav === "aktivni");
  const cekaNaRodice = rodice.filter((r) => r.stav === "ceka_na_rodice");
  const nekdo = aktivni.length + cekaNaRodice.length > 0;
  const formular = !nekdo || pridavam;
  const plno = rodice.length >= 3;

  async function zapnout() {
    setChyba(null);
    setPosila(true);
    const err = await akce(volba === "stejny" ? { akce: "stejny" } : { akce: "pozvat", email: jinyEmail });
    setPosila(false);
    if (err) { setChyba(err); return; }
    setPridavam(false);
    setJinyEmail("");
  }

  async function odebrat(id: string) {
    const err = await akce({ akce: "zrusit", id });
    if (err) setChyba(err);
  }

  return (
    <div id="rodice" className="px-4 py-4 flex flex-col gap-3" data-testid="report-rodicum">
      <div className="flex items-start gap-3">
        <span className="text-xl" aria-hidden="true">👨‍👩‍👧</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">Týdenní report pro rodiče</p>
          <p className="text-xs text-slate-500 leading-relaxed">Každé pondělí ráno přijde rodiči přehled: kolik příkladů jsi vyřešil(a), jak ti to jde a co procvičit dál.</p>
        </div>
      </div>

      {aktivni.map((r) => (
        <div key={r.id} className="rounded-xl px-3 py-2.5 text-[13px] flex items-start justify-between gap-2" style={{ background: "#ecfdf3", border: "1px solid #bbf0cf", color: "#166534" }} data-testid="report-rodicum-aktivni">
          <span className="min-w-0 break-words">✓ Report chodí na <b>{r.email}</b>{r.stejny ? " (tvůj e-mail)" : ""}.</span>
          <button type="button" onClick={() => odebrat(r.id)} className="shrink-0 text-xs font-bold underline">Vypnout</button>
        </div>
      ))}
      {cekaNaRodice.map((r) => (
        <div key={r.id} className="rounded-xl px-3 py-2.5 text-[13px] flex items-start justify-between gap-2" style={{ background: "#fff8eb", border: "1px solid #f6dfb0", color: "#8a4b0a" }} data-testid="report-rodicum-ceka">
          <span className="min-w-0 break-words">Čeká na potvrzení: <b>{r.email}</b>. Jakmile rodič klikne na odkaz v e-mailu, report mu začne chodit.</span>
          <button type="button" onClick={() => odebrat(r.id)} className="shrink-0 text-xs font-bold underline">Zrušit</button>
        </div>
      ))}

      {formular ? (
        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => setVolba("stejny")} className="text-left rounded-xl px-3 py-2.5 flex gap-2.5 items-start" style={{ border: `1.5px solid ${volba === "stejny" ? "#2E6DA4" : "#e2e8f0"}`, background: volba === "stejny" ? "#f0f6fc" : "#fff" }} aria-pressed={volba === "stejny"} data-testid="report-rodicum-stejny">
            <span className="w-4 h-4 mt-0.5 rounded-full shrink-0 box-border" style={{ border: volba === "stejny" ? "5px solid #2E6DA4" : "2px solid #94a3b8" }} aria-hidden="true" />
            <span className="min-w-0"><b className="block text-sm text-slate-800">Na tento e-mail</b><span className="text-xs text-slate-500 break-words">Používáte s rodičem stejný e-mail ({email})</span></span>
          </button>
          <button type="button" onClick={() => setVolba("jiny")} className="text-left rounded-xl px-3 py-2.5 flex gap-2.5 items-start" style={{ border: `1.5px solid ${volba === "jiny" ? "#2E6DA4" : "#e2e8f0"}`, background: volba === "jiny" ? "#f0f6fc" : "#fff" }} aria-pressed={volba === "jiny"} data-testid="report-rodicum-jiny">
            <span className="w-4 h-4 mt-0.5 rounded-full shrink-0 box-border" style={{ border: volba === "jiny" ? "5px solid #2E6DA4" : "2px solid #94a3b8" }} aria-hidden="true" />
            <span className="min-w-0"><b className="block text-sm text-slate-800">Rodič má jiný e-mail</b><span className="text-xs text-slate-500">Pošleme mu e-mail, odběr si potvrdí sám</span></span>
          </button>
          {volba === "jiny" && (
            <input
              id="report-rodicum-email"
              type="email"
              inputMode="email"
              value={jinyEmail}
              onChange={(e) => setJinyEmail(e.target.value)}
              placeholder="e-mail rodiče"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-blue-400"
              data-testid="report-rodicum-input"
            />
          )}
          {chyba && <p className="text-[13px] rounded-xl px-3 py-2" style={{ background: "#fff4f2", border: "1px solid #f7cdc6", color: "#9a2b1c" }}>{chyba}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={zapnout} disabled={posila || (volba === "jiny" && !jinyEmail)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50" style={{ background: "#0D1B3E" }} data-testid="report-rodicum-zapnout">
              {posila ? "Ukládám…" : volba === "stejny" ? "Zapnout report" : "Poslat rodiči e-mail"}
            </button>
            {pridavam && <button type="button" onClick={() => { setPridavam(false); setChyba(null); }} className="px-4 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-700">Zpět</button>}
          </div>
        </div>
      ) : (
        <div className="flex gap-2 flex-wrap">
          {!plno && <button type="button" onClick={() => setPridavam(true)} className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 text-slate-700" data-testid="report-rodicum-pridat">Přidat rodiče</button>}
          <Link href="/rodice/dashboard" className="px-4 py-2 rounded-xl text-sm font-bold border border-slate-200 text-slate-700">Rodičovský přehled</Link>
        </div>
      )}
    </div>
  );
}
