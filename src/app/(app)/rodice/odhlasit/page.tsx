"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

/** Odhlášení týdenního reportu z odkazu v patičce (bez přihlášení, odkaz je podepsaný). Potvrzuje se tlačítkem. */
export default function RodiceOdhlasit() {
  return <Suspense fallback={null}><Obsah /></Suspense>;
}

function Obsah() {
  const q = useSearchParams();
  const l = q.get("l") ?? "";
  const t = q.get("t") ?? "";
  const [stav, setStav] = useState<"vyber" | "posila" | "odhlaseno" | "zapnuto" | "chyba">("vyber");
  const [chyba, setChyba] = useState("");

  async function nastav(odhlaseno: boolean) {
    setStav("posila");
    try {
      const res = await fetch(`/api/rodice/odhlasit?l=${encodeURIComponent(l)}&t=${encodeURIComponent(t)}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ odhlaseno }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setChyba(j.error ?? "Nepodařilo se uložit. Zkuste to znovu."); setStav("chyba"); return; }
      setStav(odhlaseno ? "odhlaseno" : "zapnuto");
    } catch {
      setChyba("Nepodařilo se uložit. Zkontrolujte připojení a zkuste to znovu.");
      setStav("chyba");
    }
  }

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-4 pt-6" data-testid="rodice-odhlasit">
      <span className="self-start text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: "#0D1B3E", color: "#fff" }}>Pro rodiče</span>
      <h1 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>Týdenní report MateMax</h1>
      {stav === "odhlaseno" ? (
        <>
          <p className="text-sm rounded-2xl p-4" style={{ background: "#ecfdf3", border: "1px solid #bbf0cf", color: "#166534" }} data-testid="rodice-odhlaseno">
            Hotovo, týdenní report vám už chodit nebude. Rodičovský přehled v MateMaxu můžete používat dál.
          </p>
          <button type="button" onClick={() => nastav(false)} className="text-sm font-bold underline self-start" style={{ color: "#5B55D6" }}>Chci report zase dostávat</button>
        </>
      ) : stav === "zapnuto" ? (
        <p className="text-sm rounded-2xl p-4" style={{ background: "#ecfdf3", border: "1px solid #bbf0cf", color: "#166534" }}>
          Hotovo, report vám zase přijde každé pondělí ráno.
        </p>
      ) : (
        <>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Každé pondělí ráno vám chodí přehled tréninku vašeho dítěte. Pokud ho dostávat nechcete, odhlaste se tady. Propojení s dítětem a rodičovský přehled zůstanou.
          </p>
          {stav === "chyba" && <p className="text-sm rounded-xl px-3 py-2" style={{ background: "#fff4f2", border: "1px solid #f7cdc6", color: "#9a2b1c" }}>{chyba}</p>}
          <button type="button" onClick={() => nastav(true)} disabled={!l || !t || stav === "posila"} className="w-full py-3.5 rounded-xl text-white font-extrabold disabled:opacity-50" style={{ background: "#0D1B3E" }} data-testid="rodice-odhlasit-tlacitko">
            {stav === "posila" ? "Ukládám…" : "Odhlásit týdenní report"}
          </button>
        </>
      )}
    </div>
  );
}
