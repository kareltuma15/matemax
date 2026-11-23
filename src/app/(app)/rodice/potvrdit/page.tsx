"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

/** Rodič potvrdí odběr týdenního reportu z pozvánky, kterou poslalo dítě (schválený mockup, 23. 11.). */
export default function RodicePotvrdit() {
  return <Suspense fallback={null}><Obsah /></Suspense>;
}

function Obsah() {
  const t = useSearchParams().get("t") ?? "";
  const [stav, setStav] = useState<"ceka" | "posila" | "hotovo" | "chyba">("ceka");
  const [chyba, setChyba] = useState("");

  async function potvrdit() {
    setStav("posila");
    try {
      const res = await fetch("/api/parent-link/potvrdit", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) { setChyba(j.error ?? "Odběr se nepodařilo potvrdit. Zkuste to znovu."); setStav("chyba"); return; }
      setStav("hotovo");
    } catch {
      setChyba("Odběr se nepodařilo potvrdit. Zkontrolujte připojení a zkuste to znovu.");
      setStav("chyba");
    }
  }

  return (
    <div className="max-w-sm mx-auto flex flex-col gap-5 pt-6" data-testid="rodice-potvrdit">
      <span className="self-start text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: "#0D1B3E", color: "#fff" }}>Pro rodiče</span>
      <h1 className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>Týdenní report MateMax</h1>
      {stav === "hotovo" ? (
        <div className="rounded-2xl p-4 text-sm leading-relaxed" style={{ background: "#ecfdf3", border: "1px solid #bbf0cf", color: "#166534" }} data-testid="rodice-potvrdit-hotovo">
          Odběr je potvrzený. Každé pondělí ráno vám přijde přehled tréninku vašeho dítěte. Týdenní report je součástí MateMax Premium.
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Vaše dítě v MateMaxu zadalo tento e-mail, aby vám každé pondělí ráno chodil přehled jeho tréninku: kolik příkladů vyřešilo, s jakou úspěšností a co procvičit dál.
          </p>
          {stav === "chyba" && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#fff4f2", border: "1px solid #f7cdc6", color: "#9a2b1c" }}>{chyba}</div>
          )}
          <button
            type="button"
            onClick={potvrdit}
            disabled={!t || stav === "posila"}
            className="w-full py-3.5 rounded-xl text-white font-extrabold text-base disabled:opacity-50"
            style={{ background: "#0D1B3E" }}
            data-testid="rodice-potvrdit-tlacitko"
          >
            {stav === "posila" ? "Potvrzuji…" : "Potvrdit odběr"}
          </button>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Pokud nic neznáte, stránku zavřete. Bez potvrzení vám nic dalšího nepošleme.</p>
        </>
      )}
      <Link href="/rodice" className="text-sm underline" style={{ color: "#2E6DA4" }}>Co je MateMax pro rodiče</Link>
    </div>
  );
}
